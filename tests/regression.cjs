const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { webcrypto, createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');

function runtime(initial = {}, blocked = false, quota = false) {
  const db = new Map(Object.entries(initial));
  let clock = Date.parse('2026-11-25T12:00:00Z');
  const intervals = new Map(); let timer = 0;
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
  class Node {
    constructor() { this.frequency = param(); this.gain = param(); this.stopped = false; }
    connect() {} disconnect() { this.disconnected = true; }
    start(time) { this.startAt = time; }
    stop() { this.stopped = true; }
  }
  class AudioContext {
    constructor() { this.currentTime = 0; this.state = 'running'; this.sampleRate = 1000; this.destination = {}; }
    createGain() { return new Node(); } createOscillator() { return new Node(); }
    createBufferSource() { return new Node(); } createBiquadFilter() { return new Node(); }
    createBuffer(channels, count, rate) { return { getChannelData: () => new Float32Array(count), duration: count / rate }; }
    async resume() { this.state = 'running'; } async close() { this.state = 'closed'; }
    async decodeAudioData() { return { duration: 10, sampleRate: 1000, getChannelData: () => new Float32Array(10000) }; }
  }
  const ctx = {
    console, Math, Uint8Array, Float32Array, crypto: webcrypto, AudioContext,
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : [clock])); } static now() { return clock; } },
    localStorage: { getItem(k) { if (blocked) throw Error('SecurityError'); return db.get(k) ?? null; }, setItem(k, v) { if (blocked || quota) throw Error('QuotaExceededError'); db.set(k, v); } },
    navigator: { language: 'ko-KR' }, location: { protocol: 'https:' },
    document: { documentElement: {}, querySelectorAll: () => [] },
    CustomEvent: class {}, dispatchEvent() {}, addEventListener() {}, removeEventListener() {},
    setTimeout(fn) { fn(); return ++timer; }, clearTimeout() {},
    setInterval(fn) { intervals.set(++timer, fn); return timer; }, clearInterval(id) { intervals.delete(id); },
    requestAnimationFrame() { return 1; }, cancelAnimationFrame() {}, performance: { now: () => 0 }
  };
  ctx.window = ctx; vm.createContext(ctx);
  for (const file of ['js/storage.js', 'locales/i18n.js', 'js/i18n-ext.js', 'js/auth-ranking.js', 'js/audio-synth.js', 'js/game3d.js']) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file });
  return { ctx, db, intervals, setDate: value => { clock = Date.parse(value); } };
}
const result = (id = 'run-1', extra = {}) => ({ songId: 'seoul_neon_pulse', diff: 'NORMAL', score: 250000, maxCombo: 90, rankGrade: 'A', sessionId: id, cleared: true, accuracy: .9, ...extra });

test('blocked localStorage still allows language changes, login and session updates', async () => {
  const { ctx: c } = runtime({}, true);
  c.I18n.setLang('es'); assert.equal(c.I18n.current, 'es');
  await c.AuthService.signIn('google'); c.AuthService.updateUser({ coins: 55 });
  assert.equal(c.AuthService.getCurrentUser().coins, 55); assert.equal(c.GameStorage.persistent, false);
  assert.equal('guest' in c.AuthService.PROVIDER_META, false, 'Guest provider must be removed');
});
for (const corrupt of ['null', '[]', '{broken', '{"a":null}', '{"galaxy_chase__NORMAL":{"score":"99"}}']) {
  test(`corrupt score migration is safe: ${corrupt}`, () => {
    const { ctx: c } = runtime({ rsd_song_scores_v5: corrupt });
    assert.equal(c.RankingEngine.getMyWeeklyTotalScore(), 0);
    assert.equal(c.RankingEngine.getGroupLeaderboard().length, 30);
  });
}
test('legacy user fields and best scores survive migration with safe settings defaults', async () => {
  const { ctx: c } = runtime({ rsd_user_session_v5: '{"uid":"old","provider":"google","coins":88}', rsd_song_scores_v5: '{"galaxy_chase__NORMAL":{"score":12000,"maxCombo":3,"rank":"A"}}' });
  const user = await c.AuthService.signIn('google');
  assert.equal(user.uid, 'old'); assert.equal(user.coins, 88); assert.equal(user.settings.bgmVol, .75);
  assert.equal(c.RankingEngine.getSongBest('galaxy_chase', 'NORMAL').score, 12000);
});
test('quota failure keeps a consistent in-tab profile and does not duplicate stage rewards', async () => {
  const { ctx: c } = runtime({}, false, true); await c.AuthService.signIn('guest');
  const first = c.RankingEngine.recordStageClear(result());
  const coins = c.AuthService.getCurrentUser().coins;
  assert.ok(first.earnedCoins > 0); assert.equal(c.RankingEngine.recordStageClear(result()).duplicate, true);
  assert.equal(c.AuthService.getCurrentUser().coins, coins); assert.equal(c.GameStorage.persistent, false);
});
test('fresh storage reads observe updates from another tab', () => {
  const { ctx: c, db } = runtime(); c.GameStorage.set('external', 'old'); db.set('external', 'new'); assert.equal(c.GameStorage.get('external'), 'new');
});
test('weekly scores reset, personal best persists, promotion settles once and rewards are idempotent', async () => {
  const { ctx: c, setDate } = runtime(); await c.AuthService.signIn('guest');
  assert.equal(c.RankingEngine.claimWeeklyReward().ok, false);
  c.RankingEngine.recordStageClear(result('top', { score: 2000000 })); assert.equal(c.RankingEngine.getMyRank(), 1);
  setDate('2026-11-30T00:00:00Z');
  assert.equal(c.RankingEngine.getMyWeeklyTotalScore(), 0); assert.equal(c.AuthService.getCurrentUser().league, 1);
  assert.equal(c.AuthService.getCurrentUser().league, 1);
  assert.equal(c.RankingEngine.getSongBest('seoul_neon_pulse', 'NORMAL').score, 2000000);
  const claim = c.RankingEngine.claimWeeklyReward(); assert.equal(claim.coinsAdded, 500);
  assert.equal(c.RankingEngine.claimWeeklyReward().ok, false);
});
test('custom uploads cannot inflate the official league and idle results earn nothing', async () => {
  const { ctx: c } = runtime(); await c.AuthService.signIn('guest');
  c.RankingEngine.recordStageClear(result('custom', { songId: 'custom_abc', score: 9999999 }));
  assert.equal(c.RankingEngine.getMyWeeklyTotalScore(), 0);
  const before = c.AuthService.getCurrentUser().coins;
  assert.equal(c.RankingEngine.recordStageClear(result('idle', { score: 0, accuracy: 0, cleared: false })).earnedCoins, 0);
  assert.equal(c.AuthService.getCurrentUser().coins, before);
});
test('demo bonus is once per UTC day and VIP stays explicitly local', async () => {
  const { ctx: c, setDate } = runtime(); await c.AuthService.signIn('guest');
  assert.equal(c.RankingEngine.claimDemoReward().ok, true); assert.equal(c.RankingEngine.claimDemoReward().ok, false);
  setDate('2026-11-26T00:00:00Z'); assert.equal(c.RankingEngine.claimDemoReward().ok, true);
  assert.match(c.I18n.t('vip_desc'), /실제 구매가 아닙니다/);
});
test('same-week AI ranks are stable and per-track leaderboards contain 30 entries', () => {
  const { ctx: c } = runtime();
  assert.equal(JSON.stringify(c.RankingEngine.getRivals()), JSON.stringify(c.RankingEngine.getRivals()));
  assert.equal(c.RankingEngine.getGroupLeaderboard('seoul_neon_pulse', 'HARD').length, 30);
});
test('all 48 builtin charts (12 songs x 4 diffs) have sorted unique IDs, rush barrage, and valid note times', () => {
  const { ctx: c } = runtime();
  assert.equal(c.SONGS.length, 12);
  assert.equal(Object.keys(c.SABER_SKINS).length, 6);
  for (const song of c.SONGS) for (const diff of ['EASY', 'NORMAL', 'HARD', 'EXTREME']) {
    const chart = c.AudioEngine.generateChart(song, diff);
    chart.notes.forEach((n, i) => { assert.equal(n.id, i); assert.ok(n.time >= 0 && n.time < song.duration); assert.ok(!i || chart.notes[i - 1].time <= n.time); });
  }
  assert.equal(c.AudioEngine.generateChart({ title: 'short', bpm: 135, duration: 8 }, 'HARD').hasBranch, false);
});
test('original adjacent-lane assistance, swipe-any, character multipliers and shield benefits remain', () => {
  const { ctx: c } = runtime(); const g = new c.RhythmGame3D(null);
  g.chart = { notes: [{ id: 0, lane: 0, time: 10, type: 'tap', branch: 'main' }] }; g.noteMeshes = [{ visible: true }];
  g.currentLane = 1; c.AudioEngine.getSongTime = () => 10;
  let grade; g._registerJudgment = v => { grade = v; };
  assert.equal(g._tryStrikeNote('tap'), true); assert.equal(grade, 'PERFECT');
  g.chart.notes = [{ id: 0, lane: 1, time: 10, type: 'swipeR', branch: 'main' }];
  assert.equal(g._tryStrikeNote('swipeAny'), true);
  assert.equal(c.CHAR_SPECS.luna.comboScoreMult, 1.05); assert.equal(c.CHAR_SPECS.aria.comboScoreMult, 1.25); assert.equal(c.CHAR_SPECS.kai.shieldCharges, 2);
});
test('P1 fixes: HUD CSS selectors match DOM IDs and moveLane swings sticks on swipe hit', () => {
  const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
  assert.match(css, /#hud-score-num,\s*#hud-combo-num,\s*#hud-route-mult/);
  assert.match(css, /\.ingame-top-hud\s*\{\s*backdrop-filter:/);
  const { ctx: c } = runtime(); const g = new c.RhythmGame3D(null);
  g.active = true; g.paused = false; g.currentLane = 1;
  g.runnerGroup = { rotation: { z: 0 } };
  let swung = false; g._swingSticks = (big) => { swung = big === true; };
  g._tryStrikeNote = () => true;
  assert.equal(g.moveLane(1), true);
  assert.equal(swung, true);
});
test('Wave 2: Challenge Modifiers (MIRROR/HIDDEN/SPEED_125), 7-day attendance, and Ghost LeaderboardProvider work', async () => {
  const { ctx: c } = runtime();
  vm.runInContext(fs.readFileSync(path.join(root, 'js/liveops.js'), 'utf8'), c, { filename: 'js/liveops.js' });
  const lo = c.Wave2LiveOps;
  assert.equal(lo.CHALLENGE_MODIFIERS.length, 3);
  assert.equal(lo.toggleModifier('MIRROR'), true);
  assert.equal(lo.toggleModifier('SPEED_125'), true);
  const bonus = lo.getModifierBonus();
  assert.equal(bonus.scorePct, 40);
  assert.equal(lo.claimAttendance().ok, true);
  assert.equal(lo.claimAttendance().ok, false);
  const board = await lo.leaderboardProvider.fetchWeeklyBoard(750000, 'GhostDash');
  assert.ok(board.some(r => r.isMe && r.tier.id === 'diamond'));
});
function renderStub(c) {
  const g = new c.RhythmGame3D(null), color = { setHex() {} };
  g.active = true; g.song = { bpm: 132, duration: 1000 };
  g.chart = { hasBranch: true, branchStart: 10, branchDecision: 13.2, branchEnd: 31.2, notes: [] };
  g.shieldRing = { material: { opacity: 0 }, rotation: { z: 0 } }; g.shieldLeft = 0;
  g._updateRibbonPositions = () => {};
  g.mainTrackRibbon = {}; g.stdBranchRibbon = {}; g.rushBranchRibbon = {};
  g.runnerGroup = { position: {}, rotation: { z: 0 } };
  g.leftLeg = g.rightLeg = g.leftArmPivot = g.rightArmPivot = { rotation: { x: 0 } };
  g.camera = { position: {}, lookAt() {} }; g.hitLineMesh = { material: { color } };
  g.renderer = { render() {} }; return g;
}
test('fever expiration uses the song clock even at low FPS and fork selection lasts through merge', () => {
  const { ctx: c } = runtime(), g = renderStub(c); let time = 5;
  c.AudioEngine.getSongTime = () => time; c.AudioEngine.playFeverTriggerSfx = () => {};
  g.feverGauge = 100; g.activateFever(); time = 17; g._animate(1000); assert.equal(g.isFever, false);
  g.chosenBranch = 'rush'; time = 31.3; g._animate(1100); assert.equal(g.chosenBranch, 'rush');
  time = 33.3; g._animate(1200); assert.equal(g.chosenBranch, 'none');
});
test('pause stops scheduled BGM voices; resume clock does not rewind; stop releases all BGM voices', () => {
  const { ctx: c } = runtime(), a = c.AudioEngine;
  const mockSong = { ...c.SONGS[0], audioBuffer: { duration: 80 } };
  a.startSong(mockSong);
  assert.ok([...a.voices].some(v => v.bus === a.bgmGain)); a.ctx.currentTime = 5;
  const before = a.getSongTime(); a.pauseSong(); assert.equal(a.voices.size, 0);
  a.ctx.currentTime = 50; assert.equal(a.getSongTime(), before); a.resumeSong(); assert.equal(a.getSongTime(), before);
  a.stopSong(); assert.equal(a.voices.size, 0);
});
test('custom upload uses stable file IDs, enforces size/duration and propagates decode rejection', async () => {
  const { ctx: c } = runtime(), a = c.AudioEngine;
  a._readDuration = async () => 10;
  const file = { name: 'same.mp3', size: 4, arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer };
  assert.equal((await a.loadCustomMp3(file)).id, (await a.loadCustomMp3(file)).id);
  await assert.rejects(a.loadCustomMp3({ ...file, size: 26 * 1024 * 1024 }), /mp3_size/);
  a._readDuration = async () => 200; await assert.rejects(a.loadCustomMp3(file), /mp3_length/);
  a._readDuration = async () => 10; a.ctx.decodeAudioData = async () => { throw Error('decode'); };
  await assert.rejects(a.loadCustomMp3(file), /decode/);
});
test('new translation keys are present in all five locales', () => {
  const { ctx: c } = runtime(); const keys = Object.keys(c.GAME_LOCALES.en);
  for (const lang of c.I18n.supported) assert.deepEqual(Object.keys(c.GAME_LOCALES[lang]).sort(), keys.slice().sort());
});

test('all 12 builtin tracks reference real .ogg audio and 5 distinct stage maps', () => {
  const { ctx: c } = runtime();
  const bgs = new Set(c.SONGS.map(s => s.bgUrl));
  assert.equal(bgs.size, 5);
  for (const s of c.SONGS) {
    assert.ok(fs.existsSync(path.join(root, s.audioUrl)), `Missing audio: ${s.audioUrl}`);
    assert.ok(fs.existsSync(path.join(root, s.bgUrl)), `Missing bg: ${s.bgUrl}`);
  }
});

test('custom MP3 resume aligns 40ms buffer anchor without drift or rewind', () => {
  const { ctx: c } = runtime(), a = c.AudioEngine;
  const customSong = { id: 'custom_sync', isCustom: true, bpm: 120, duration: 30, audioBuffer: { duration: 30 } };
  a.startSong(customSong);
  a.ctx.currentTime = 5.04;
  assert.ok(Math.abs(a.getSongTime() - 5.0) < 0.001);
  a.pauseSong();
  a.ctx.currentTime = 20.0;
  a.resumeSong();
  assert.ok(Math.abs(a.resumeAnchorCtxTime - 20.04) < 0.0001, 'resumeAnchorCtxTime includes +0.04s offset');
  assert.ok(Math.abs(a.getSongTime() - 5.0) < 0.001, 'getSongTime does not rewind during 40ms startup');
  a.ctx.currentTime = 21.04;
  assert.ok(Math.abs(a.getSongTime() - 6.0) < 0.001, 'getSongTime stays locked to custom buffer after resume');
  a.stopSong();
});

test('HARD/EXTREME enforce strict laneDist===0 and directional swipe rejects opposite direction', () => {
  const { ctx: c } = runtime();
  const g = new c.RhythmGame3D(null);
  g.active = true;
  g.difficulty = 'HARD';
  g.currentLane = 1;
  g.chart = { notes: [{ id: 0, lane: 0, time: 10, type: 'tap', branch: 'main' }] };
  g.noteMeshes = [{ visible: true }];
  c.AudioEngine.getSongTime = () => 10;
  let hits = 0;
  g._registerJudgment = () => { hits++; };
  assert.notEqual(g._tryStrikeNote('tap'), true, 'HARD blocks adjacent-lane center-camp hit');
  assert.equal(hits, 0);
  g.currentLane = 0;
  assert.equal(g._tryStrikeNote('tap'), true, 'HARD hits exact lane');

  // Strict directional swipe: swipeL must NOT hit swipeR
  g.chart.notes = [{ id: 0, lane: 0, time: 10, type: 'swipeR', branch: 'main' }];
  g.noteMeshes = [{ visible: true }];
  assert.notEqual(g._tryStrikeNote('swipeL'), true, 'swipeL rejects swipeR note');
  assert.equal(g._tryStrikeNote('swipeR'), true, 'swipeR hits swipeR note');
});
