// Local prototype account, atomic stage rewards, weekly seasons and earned rewards.
(function () {
  const ROOT_KEY = 'rsd_profile_v6';
  const store = window.GameStorage;
  const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const number = (v, fallback = 0, max = 1e12) => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, v)) : fallback;
  const PROVIDER_META = {
    kakao: { badge: 'K', label: 'Kakao' }, naver: { badge: 'N', label: 'NAVER' },
    google: { badge: 'G', label: 'Google' }, apple: { badge: 'A', label: 'Apple' }
  };
  const CLOUD_CONFIG = { enabled: false, groupId: 'NEO-SYNDICATE-G07' };
  const OFFICIAL_SONGS = [
    'seoul_neon_pulse', 'hyperpop_overdrive', 'gangnam_midnight', 'jersey_club_rush',
    'cyber_phonk_drift', 'starlight_future_bass', 'retro_synth_highway', 'festival_bigroom_drop',
    'velocity_dnb', 'velvet_nu_disco', 'hardstyle_inferno', 'vip_trap_anthem'
  ];
  const DIFFICULTIES = ['EASY', 'NORMAL', 'HARD', 'EXTREME'];
  function hash(text) { let n = 2166136261; for (const ch of text) n = Math.imul(n ^ ch.charCodeAt(0), 16777619); return n >>> 0; }
  // Season boundaries are UTC, identical in every locale.
  function getIsoWeekKey(date = new Date()) {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return `${d.getUTCFullYear()}_W${String(Math.ceil(((d - start) / 86400000 + 1) / 7)).padStart(2, '0')}`;
  }
  function cleanUser(raw) {
    if (!object(raw) || typeof raw.uid !== 'string' || !raw.uid) return null;
    const settings = object(raw.settings) ? raw.settings : {};
    return {
      uid: raw.uid.slice(0, 100), nickname: typeof raw.nickname === 'string' ? raw.nickname.slice(0, 16) : 'Runner',
      provider: Object.hasOwn(PROVIDER_META, raw.provider) ? raw.provider : 'google',
      coins: Math.floor(number(raw.coins, 1200)), selectedChar: ['kai', 'luna', 'aria'].includes(raw.selectedChar) ? raw.selectedChar : 'luna',
      // VIP is a free local demo, never a verified purchase entitlement.
      vip: raw.vip === true, loggedOut: !!raw.loggedOut, createdAt: raw.createdAt,
      xp: Math.floor(number(raw.xp)), cores: Math.floor(number(raw.cores)), league: Math.floor(number(raw.league, 0, 2)),
      ownedCosmetics: Array.isArray(raw.ownedCosmetics) ? raw.ownedCosmetics.filter(x => typeof x === 'string').slice(0, 32) : [],
      equippedSkin: typeof raw.equippedSkin === 'string' ? raw.equippedSkin.slice(0, 32) : 'default',
      musicPassTier: Math.max(1, Math.min(30, Math.floor(number(raw.musicPassTier, 1, 30)))),
      settings: { bgmVol: number(settings.bgmVol, .75, 1), sfxVol: number(settings.sfxVol, .85, 1), autoFever: settings.autoFever !== false,
        audioOffset: typeof settings.audioOffset === 'number' && Number.isFinite(settings.audioOffset) ? Math.max(-.25, Math.min(.25, settings.audioOffset)) : 0 }
    };
  }
  function cleanScores(raw) {
    const out = Object.create(null);
    if (!object(raw)) return out;
    for (const [key, value] of Object.entries(raw)) {
      if (!/^[\w-]+__(EASY|NORMAL|HARD|EXTREME)$/.test(key) || !object(value) || !Number.isFinite(value.score) || value.score < 0) continue;
      out[key] = { score: number(value.score), maxCombo: Math.floor(number(value.maxCombo)), rank: ['S+', 'A', 'B', 'C', 'D'].includes(value.rank) ? value.rank : 'D', version: 2 };
    }
    return out;
  }
  function readRoot() {
    const raw = store.read(ROOT_KEY, null);
    const root = object(raw) ? raw : {
      user: store.read('rsd_user_session_v5', null), scores: store.read('rsd_song_scores_v5', {}), weeks: {}, sessions: []
    };
    root.user = cleanUser(root.user); root.scores = cleanScores(root.scores);
    root.weeks = object(root.weeks) ? root.weeks : {};
    for (const key of Object.keys(root.weeks)) {
      const w = root.weeks[key];
      if (!/^\d{4}_W\d{2}$/.test(key) || !object(w)) { delete root.weeks[key]; continue; }
      w.scores = cleanScores(w.scores); w.plays = Math.floor(number(w.plays)); w.claimed = w.claimed === true; w.settled = w.settled === true;
    }
    root.sessions = Array.isArray(root.sessions) ? root.sessions.filter(s => typeof s === 'string').slice(-128) : [];
    return root;
  }
  function save(root) { store.write(ROOT_KEY, root); }
  function total(scores) {
    const max = Object.create(null);
    for (const [key, v] of Object.entries(scores)) {
      const id = key.split('__')[0];
      if (OFFICIAL_SONGS.includes(id) && v.version === 2) max[id] = Math.max(max[id] || 0, v.score);
    }
    return Object.values(max).reduce((a, b) => a + b, 0);
  }
  function rankFor(week, score) { return 1 + createSeededRivals(week).filter(r => r.score >= score).length; }
  function season(root) {
    const key = getIsoWeekKey();
    for (const [week, w] of Object.entries(root.weeks).sort(([a], [b]) => a.localeCompare(b))) {
      if (week < key && !w.settled && root.user) {
        w.finalRank = rankFor(week, total(w.scores));
        if (w.plays > 0) root.user.league = Math.max(0, Math.min(2, root.user.league + (w.finalRank <= 10 ? 1 : w.finalRank > 20 ? -1 : 0)));
        w.settled = true;
      }
    }
    if (!root.weeks[key]) root.weeks[key] = { scores: {}, plays: 0, settled: false, claimed: false };
    // Keep 12 seasons; already settled older data cannot inflate the current week.
    Object.keys(root.weeks).sort().slice(0, -12).forEach(k => delete root.weeks[k]);
    return root.weeks[key];
  }
  function current() { const root = readRoot(); season(root); save(root); return root; }
  const LocalAuthAdapter = {
    async signIn(provider, customNickname = '') {
      await new Promise(resolve => setTimeout(resolve, 400));
      const root = readRoot();
      const trimmed = typeof customNickname === 'string' ? customNickname.trim().slice(0, 16) : '';
      const defaultNick = (root.user && root.user.nickname) || `Runner_${Math.floor(100 + Math.random() * 900)}`;
      root.user = cleanUser({ uid: `uid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`, coins: 1200, ...(root.user || {}), nickname: trimmed || defaultNick, provider, loggedOut: false });
      season(root); save(root); return root.user;
    }
  };
  const CloudAuthAdapter = { async signIn() { throw new Error('Cloud authentication is not configured'); } };
  window.AuthService = {
    PROVIDER_META,
    signIn(provider, customNickname = '') { return (CLOUD_CONFIG.enabled ? CloudAuthAdapter : LocalAuthAdapter).signIn(provider, customNickname); },
    getCurrentUser() { return current().user; },
    updateUser(patch) {
      const root = current(); if (!root.user) return null;
      root.user = cleanUser({ ...root.user, ...patch, settings: { ...root.user.settings, ...(object(patch.settings) ? patch.settings : {}) } });
      save(root); return root.user;
    },
    signOut() { this.updateUser({ loggedOut: true }); }
  };
  function createSeededRivals(week = getIsoWeekKey()) {
    const names = [
      ['NeonValkyrie', 'google', 984200],
      ['서울비트장인', 'kakao', 942500],
      ['TokyoSlash_JP', 'apple', 915800],
      ['리듬왕루나', 'naver', 882400],
      ['Aria_Overdrive', 'kakao', 846100],
      ['Cyber Samurai', 'google', 812900],
      ['星夜音速TW', 'apple', 789300],
      ['스틱마스터99', 'kakao', 754000],
      ['SynthWave_ES', 'google', 721600],
      ['네온질주자', 'naver', 695400],
      ['PulseBreaker', 'apple', 661200],
      ['KaiShield_KR', 'kakao', 628500],
      ['ビート姫', 'google', 594800],
      ['Rush2X_Only', 'naver', 558300],
      ['LunarEclipse', 'apple', 521900],
      ['홍대사이버펑크', 'kakao', 489200],
      ['ElectroDash', 'google', 452700],
      ['極速音棍', 'google', 418600],
      ['VelozNeon', 'apple', 385400],
      ['밤하늘심포니', 'naver', 349000],
      ['BeatHunter77', 'google', 312500],
      ['GhostRunnerX', 'google', 276800],
      ['초보탈출중', 'kakao', 241300],
      ['MelodySlash', 'apple', 208900],
      ['네오루키', 'naver', 174200],
      ['StarDrifter', 'apple', 142600],
      ['PixelTempo', 'google', 112400],
      ['비트연습생', 'kakao', 84500],
      ['RookieStick', 'naver', 52800]
    ];

    return names.map(([nickname, provider, baseScore], idx) => ({
      uid: 'ai_rival_' + (idx + 1),
      nickname,
      provider,
      provider_badge: PROVIDER_META[provider].badge,
      score: baseScore + hash(week + nickname) % 4200,
      group_id: CLOUD_CONFIG.groupId,
      updated_at: new Date().toISOString(),
      isAI: true
    }));
  }


  window.RankingEngine = {
    groupId: CLOUD_CONFIG.groupId,
    getRivals() { return createSeededRivals(); },
    getAllSongScores() { return current().scores; },
    getSongBest(songId, diff) { const v = this.getAllSongScores()[`${songId}__${diff}`]; return v && v.version === 2 ? v : { score: 0, maxCombo: 0, rank: 'D' }; },
    getMyWeeklyTotalScore() { return total(season(current()).scores); },
    getGroupLeaderboard(songId, diff) {
      const root = current(), user = root.user || { uid: 'social_default', nickname: 'Runner', provider: 'google' };
      const week = season(root), songMode = OFFICIAL_SONGS.includes(songId) && DIFFICULTIES.includes(diff);
      const score = songMode ? (week.scores[`${songId}__${diff}`]?.score || 0) : total(week.scores);
      const rivals = this.getRivals().map(r => ({ ...r, score: songMode ? Math.round(r.score * ({ EASY: .22, NORMAL: .40, HARD: .60, EXTREME: .85 }[diff]) * (.9 + hash(songId + r.uid) % 20 / 100)) : r.score }));
      return [...rivals, { uid: user.uid, nickname: user.nickname, provider: user.provider, provider_badge: PROVIDER_META[user.provider].badge, score, isMe: true }]
        .sort((a, b) => b.score - a.score || Number(!!a.isMe) - Number(!!b.isMe))
        .map((r, i) => ({ ...r, rank: i + 1 }));
    },
    getMyRank() { return this.getGroupLeaderboard().find(e => e.isMe).rank; },
    recordStageClear(stats) {
      const { songId, diff, sessionId, rankGrade } = stats;
      const root = current(), week = season(root), prevRank = rankFor(getIsoWeekKey(), total(week.scores));
      if (!root.user || typeof sessionId !== 'string' || !sessionId || root.sessions.includes(sessionId)) return { duplicate: true, earnedCoins: 0, xp: 0, cores: 0, isNewBest: false, prevRank, newRank: prevRank, rankDelta: 0 };
      if (!DIFFICULTIES.includes(diff) || !Number.isFinite(stats.score) || stats.score < 0) throw new Error('Invalid stage result');
      const key = `${songId}__${diff}`, prev = root.scores[key];
      const isNewBest = !prev || prev.version !== 2 || stats.score > prev.score;
      const record = { score: number(stats.score), maxCombo: Math.floor(number(stats.maxCombo)), rank: rankGrade, version: 2 };
      // Only one custom chart record is retained; custom uploads never enter the official league.
      if (!OFFICIAL_SONGS.includes(songId)) Object.keys(root.scores).filter(k => k.startsWith('custom_')).forEach(k => delete root.scores[k]);
      if (isNewBest) root.scores[key] = record;
      const cleared = stats.cleared === true && number(stats.accuracy, 0, 1) >= .65;
      const official = OFFICIAL_SONGS.includes(songId);
      if (cleared && official) {
        if (!week.scores[key] || stats.score > week.scores[key].score) week.scores[key] = record;
        week.plays++;
      }
      const earnedCoins = cleared ? Math.round((180 + Math.floor(stats.score / 4500)) * (root.user.vip ? 2 : 1)) : 0;
      const xp = cleared ? 120 : 0, cores = cleared ? 3 : 0;
      root.user.coins += earnedCoins; root.user.xp += xp; root.user.cores += cores;
      root.sessions.push(sessionId); root.sessions = root.sessions.slice(-128);
      const newRank = rankFor(getIsoWeekKey(), total(week.scores));
      save(root);
      return { earnedCoins, xp, cores, isNewBest, prevRank, newRank, rankDelta: prevRank - newRank, weeklyTotal: total(week.scores), persistent: store.persistent };
    },
    getLiveGhostRivals(songTargetScore = 240000) {
      return [2, 8, 15, 22].map((idx, i) => { const r = this.getRivals()[idx]; return { nickname: r.nickname, provider: r.provider, badge: r.provider_badge, targetScore: Math.round(songTargetScore * [1.15, .92, .68, .45][i]) }; });
    },
    claimWeeklyReward() {
      const root = current(); if (!root.user) return { ok: false, reason: 'reward_wait' };
      const key = Object.keys(root.weeks).sort().find(k => k < getIsoWeekKey() && root.weeks[k].settled && root.weeks[k].plays > 0 && !root.weeks[k].claimed);
      if (!key) return { ok: false, reason: 'reward_wait' };
      const w = root.weeks[key], coinsAdded = w.finalRank <= 10 ? 500 : 200;
      w.claimed = true; root.user.coins += coinsAdded; save(root);
      return { ok: true, coinsAdded };
    },
    claimDemoReward() {
      const root = current(), today = new Date().toISOString().slice(0, 10);
      if (!root.user || root.demoClaimDay === today) return { ok: false, reason: 'reward_already' };
      root.demoClaimDay = today; root.user.coins += 300; save(root); return { ok: true, coinsAdded: 300 };
    },
    getSeasonInfo() {
      const root = current();
      return { week: getIsoWeekKey(), league: root.user?.league || 0 };
    }
  };
})();
