// Optional browser smoke tests: install Playwright and its Chromium before running.
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + (new URL(req.url, 'http://localhost').pathname === '/' ? '/index.html' : decodeURIComponent(new URL(req.url, 'http://localhost').pathname)));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, body) => { res.writeHead(err ? 404 : 200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); res.end(err ? '' : body); });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, executablePath: process.env.RSD_BROWSER_EXECUTABLE || undefined, args: process.env.RSD_BROWSER_ARGS ? JSON.parse(process.env.RSD_BROWSER_ARGS) : ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const base = `http://127.0.0.1:${server.address().port}`;
    await page.goto(base + '/privacy-policy.html');
    await page.evaluate(async () => {
      const legacy = await caches.open('rhythm-stick-dash-v6');
      await legacy.put('./style.css', new Response('old game style'));
      await legacy.put('./neighbor/style.css', new Response('neighbor style'));
      await caches.open('neighbor-cache');
    });
    const errors = []; page.on('pageerror', err => errors.push(err.message));
    // Intentionally block the CDN: this verifies the checked-in r128 fallback.
    await page.route('https://cdnjs.cloudflare.com/**', route => route.abort());
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(() => window.ThreeReady);
    assert.equal(await page.evaluate(() => THREE.REVISION), '128');
    await page.locator('.provider-guest').click(); await page.waitForSelector('#scene-character.active');
    for (const width of [320, 360, 390, 430, 768, 1366]) {
      await page.setViewportSize({ width, height: 844 });
      const bounds = await page.locator('.runner-card').evaluateAll(cards => cards.map(c => ({ left: c.getBoundingClientRect().left, right: c.getBoundingClientRect().right })));
      assert.ok(bounds.every(b => b.left >= -1 && b.right <= width + 1), `character cards overflow at ${width}: ${JSON.stringify(bounds)}`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#btn-confirm-character').click(); await page.waitForSelector('#scene-lobby.active');
    for (const lang of ['es', 'ja', 'zh-TW', 'en', 'ko']) {
      await page.evaluate(lang => I18n.setLang(lang), lang);
      const overflow = await page.locator('.lobby-main-grid').evaluate(el => el.scrollWidth > el.clientWidth + 2);
      assert.equal(overflow, false, `lobby overflows in ${lang}`);
    }
    await page.evaluate(() => {
      const start = RhythmGame3D.prototype.startSession;
      RhythmGame3D.prototype.startSession = function (options) { window.testGame = this; return start.call(this, options); };
    });
    await page.locator('#btn-start-run').click(); await page.waitForSelector('#scene-game.active canvas');
    await page.waitForTimeout(150);
    const hudBounds = await page.locator('.hud-score-box').boundingBox(); assert.ok(hudBounds.x + hudBounds.width <= 391);
    await page.locator('#btn-game-pause').click();
    const pausedAt = await page.evaluate(() => AudioEngine.getSongTime());
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => AudioEngine.getSongTime()), pausedAt);
    assert.equal(await page.evaluate(() => [...AudioEngine.voices].filter(v => v.bus === AudioEngine.bgmGain).length), 0);
    await page.locator('#settings-language').selectOption('ja');
    assert.equal(await page.getAttribute('html', 'lang'), 'ja');
    await page.locator('#input-auto-fever').uncheck();
    await page.locator('#btn-pause-resume').click(); await page.locator('#modal-settings').waitFor({ state: 'hidden' });
    assert.ok(await page.evaluate(t => AudioEngine.getSongTime() >= t, pausedAt));
    const fever = await page.evaluate(() => { testGame.feverGauge = 100; return document.getElementById('btn-manual-fever').disabled; });
    await page.waitForTimeout(60); await page.locator('#btn-manual-fever').click();
    assert.equal(await page.evaluate(() => testGame.isFever), true);
    // A gesture may steer+assist OR slash, but never judge twice.
    assert.ok(await page.evaluate(() => {
      const g = testGame, saved = AudioEngine.getSongTime;
      AudioEngine.getSongTime = () => 10; g.chart.notes.forEach(n => { n.hit = true; });
      const a = g.chart.notes[0], b = g.chart.notes[1];
      Object.assign(a, { time: 10, type: 'swipeR', lane: 1, branch: 'main', hit: false });
      Object.assign(b, { time: 10.01, type: 'swipeL', lane: 1, branch: 'main', hit: false });
      g.nextMissIndex = 0; g.currentLane = 1;
      const count = g.counts.perfect + g.counts.great;
      const hit = g.moveLane(1); if (!hit) g.triggerSwipe();
      const delta = g.counts.perfect + g.counts.great - count;
      AudioEngine.getSongTime = saved; return delta === 1;
    }));
    const memory = await page.evaluate(() => {
      const g = testGame, options = { song: SONGS[0], difficulty: 'EXTREME', charId: 'luna' };
      const render = () => { AudioEngine.songStartCtxTime = AudioEngine.ctx.currentTime - 5; g._animate(performance.now()); };
      g.startSession(options); render(); const before = { ...g.renderer.info.memory };
      for (let i = 0; i < 20; i++) { g.stop(); g.startSession(options); render(); }
      const after = { ...g.renderer.info.memory }; g.pause(); return { before, after };
    });
    assert.ok(memory.after.geometries <= memory.before.geometries + 1, JSON.stringify(memory));
    assert.ok(memory.after.textures <= memory.before.textures + 1, JSON.stringify(memory));
    await page.evaluate(() => { const g = testGame; g.counts = { perfect: 80, great: 10, miss: 5 }; g.score = 250000; g.maxCombo = 60; g.hp = 80; g.finishStage(); });
    await page.waitForSelector('#scene-result.active');
    await page.evaluate(() => I18n.setLang('es'));
    assert.match(await page.locator('#result-diff-runner').textContent(), /LUNA/);
    const coins = await page.locator('#result-coins-earned').textContent(); assert.notEqual(coins, '+0');
    await page.locator('#btn-result-ranking').click(); await page.locator('#ranking-scope').selectOption('song');
    assert.equal(await page.locator('#ranking-tbody tr').count(), 30);
    await page.locator('#modal-ranking [data-close-modal]').click();
    await page.locator('#btn-result-retry').click(); await page.waitForSelector('#scene-game.active canvas');
    assert.equal(await page.evaluate(() => testGame.score), 0);
    await page.locator('#btn-game-pause').click();
    await page.locator('#btn-pause-lobby').click();
    await page.locator('#mp3-file-input').setInputFiles({ name: 'broken.mp3', mimeType: 'audio/mpeg', buffer: Buffer.from('invalid audio') });
    await page.waitForFunction(() => document.getElementById('toast-banner').textContent === I18n.t('mp3_error'));
    // Decode a real eight-second PCM WAV through browser metadata + Web Audio.
    const frames = 8000 * 8, wav = Buffer.alloc(44 + frames * 2);
    wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
    wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
    wav.write('data', 36); wav.writeUInt32LE(frames * 2, 40);
    for (let i = 0; i < frames; i++) wav.writeInt16LE(Math.round(Math.sin(i * Math.PI * 2 * 440 / 8000) * 5000), 44 + i * 2);
    await page.locator('#mp3-file-input').setInputFiles({ name: 'practice.wav', mimeType: 'audio/wav', buffer: wav });
    await page.waitForFunction(() => SONGS.some(song => song.isCustom));
    assert.equal(await page.evaluate(() => AudioEngine.generateChart(SONGS.find(song => song.isCustom), 'NORMAL').hasBranch), false);
    assert.equal(await page.locator('#selected-song-bpm').textContent(), '135*');
    assert.deepEqual(errors, []);
    // Storage denied at boot is tested with real browser Storage methods as well.
    const denied = await browser.newPage(); const deniedErrors = []; denied.on('pageerror', e => deniedErrors.push(e.message));
    await denied.route('https://cdnjs.cloudflare.com/**', r => r.abort());
    await denied.addInitScript(() => { Storage.prototype.getItem = () => { throw new DOMException('Denied', 'SecurityError'); }; Storage.prototype.setItem = () => { throw new DOMException('Denied', 'SecurityError'); }; });
    await denied.goto(`http://127.0.0.1:${server.address().port}`); await denied.locator('.provider-guest').click(); await denied.waitForSelector('#scene-character.active');
    assert.deepEqual(deniedErrors, []); assert.equal(await denied.evaluate(() => GameStorage.persistent), false);
    console.log('PASS: CDN fallback; six viewport widths; five locales; pause/resume; mobile fever; single gesture judgment; 20 retries; result/ranking/retry; corrupt audio + real WAV decoding; blocked storage.');
    console.log('Renderer resources:', JSON.stringify(memory));
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    const migration = await page.evaluate(async () => {
      const legacy = await caches.open('rhythm-stick-dash-v6');
      return {
        oldStyle: Boolean(await legacy.match('./style.css')),
        neighborStyle: await (await legacy.match('./neighbor/style.css')).text(),
        neighborCache: await caches.has('neighbor-cache')
      };
    });
    assert.deepEqual(migration, { oldStyle: false, neighborStyle: 'neighbor style', neighborCache: true });
    await page.context().setOffline(true);
    const offlineStyle = await page.evaluate(() => fetch('./style.css').then(r => r.text()));
    assert.equal(offlineStyle, fs.readFileSync(path.join(root, 'style.css'), 'utf8'));
    await page.close(); await denied.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
