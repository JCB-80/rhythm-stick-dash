// Full Virtual Gameplay Simulation Suite (16 Stages x 3 Characters x 60FPS Frame Loop + Stress Tests)
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { webcrypto } = require('node:crypto');

const root = path.resolve(__dirname, '..');

function createFullSimEnvironment() {
  const db = new Map();
  let wallClock = Date.parse('2026-11-25T12:00:00Z');
  let perfNow = 0;
  let timerId = 0;
  const intervals = new Map();

  const param = () => ({
    value: 0,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {}
  });

  class MockAudioNode {
    constructor() {
      this.frequency = param();
      this.gain = param();
      this.onended = null;
    }
    connect() {}
    disconnect() {}
    start() {}
    stop() {
      if (typeof this.onended === 'function') this.onended();
    }
  }

  class MockAudioContext {
    constructor() {
      this.currentTime = 0;
      this.state = 'running';
      this.sampleRate = 8000;
      this.destination = {};
    }
    createGain() { return new MockAudioNode(); }
    createOscillator() { return new MockAudioNode(); }
    createBufferSource() { return new MockAudioNode(); }
    createBiquadFilter() { return new MockAudioNode(); }
    createBuffer(_ch, len, sr) {
      return { duration: len / sr, getChannelData: () => new Float32Array(len) };
    }
    async resume() { this.state = 'running'; }
    async decodeAudioData() {
      const arr = new Float32Array(8000 * 12);
      for (let i = 16000; i < arr.length - 16000; i += 4000) arr[i] = 0.9;
      return { duration: 12, sampleRate: 8000, getChannelData: () => arr };
    }
  }

  // Minimal Three.js mock to run full 60fps RhythmGame3D.startSession -> _animate -> finishStage
  function makeMockVec3() {
    return { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
  }
  class MockObject3D {
    constructor(geo, mat) {
      this.geometry = geo || null;
      this.material = mat || null;
      this.position = makeMockVec3();
      this.rotation = makeMockVec3();
      this.scale = { x: 1, y: 1, z: 1, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
      this.children = [];
      this.userData = {};
      this.visible = true;
      this.renderOrder = 0;
    }
    add(...objs) { this.children.push(...objs); }
    remove(obj) {
      const idx = this.children.indexOf(obj);
      if (idx >= 0) this.children.splice(idx, 1);
    }
    clone() { return new MockObject3D(this.geometry, this.material); }
    traverse(fn) {
      fn(this);
      this.children.forEach(c => c.traverse && c.traverse(fn));
    }
  }

  class MockBufferGeo {
    constructor() {
      this.attributes = {};
      this.disposed = false;
    }
    setAttribute(name, attr) { this.attributes[name] = attr; }
    setIndex() {}
    dispose() { this.disposed = true; }
  }

  class MockMaterial {
    constructor(opts = {}) {
      Object.assign(this, opts);
      this.color = { hex: opts.color || 0, setHex(h) { this.hex = h; } };
      this.disposed = false;
    }
    dispose() { this.disposed = true; }
  }

  const THREE = {
    Scene: MockObject3D,
    Group: MockObject3D,
    Mesh: MockObject3D,
    Sprite: MockObject3D,
    Line: MockObject3D,
    FogExp2: class {},
    PerspectiveCamera: class {
      constructor() { this.position = makeMockVec3(); this.aspect = 1.6; }
      lookAt() {}
      updateProjectionMatrix() {}
    },
    WebGLRenderer: class {
      constructor() {
        this.domElement = { remove() {} };
        this.info = { memory: { geometries: 12, textures: 3 } };
      }
      setSize() {}
      setPixelRatio() {}
      render() {}
      dispose() {}
    },
    AmbientLight: class extends MockObject3D { constructor() { super(); } },
    DirectionalLight: class extends MockObject3D { constructor() { super(); } },
    PointLight: class extends MockObject3D { constructor() { super(); } },
    BufferGeometry: MockBufferGeo,
    BufferAttribute: class { constructor(arr) { this.array = arr; this.needsUpdate = false; } },
    PlaneGeometry: MockBufferGeo,
    BoxGeometry: MockBufferGeo,
    SphereGeometry: MockBufferGeo,
    CylinderGeometry: MockBufferGeo,
    ConeGeometry: MockBufferGeo,
    RingGeometry: MockBufferGeo,
    TorusGeometry: MockBufferGeo,
    OctahedronGeometry: MockBufferGeo,
    MeshBasicMaterial: MockMaterial,
    MeshStandardMaterial: MockMaterial,
    SpriteMaterial: MockMaterial,
    LineBasicMaterial: MockMaterial,
    CanvasTexture: class { constructor() { this.needsUpdate = false; } dispose() {} },
    TextureLoader: class { load() {} },
    DoubleSide: 2,
    AdditiveBlending: 2
  };

  const make2dCtx = () => ({
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '', textBaseline: '',
    createRadialGradient: () => ({ addColorStop() {} }),
    beginPath() {}, arc() {}, fill() {}, strokeRect() {}, fillRect() {}, fillText() {},
    drawImage() {}, clearRect() {}, save() {}, restore() {}, clip() {}
  });

  const ctx = {
    console, Math, Uint8Array, Float32Array, ArrayBuffer, crypto: webcrypto,
    AudioContext: MockAudioContext,
    THREE,
    Date: class extends Date {
      constructor(...a) { super(...(a.length ? a : [wallClock])); }
      static now() { return wallClock; }
    },
    performance: { now: () => perfNow },
    localStorage: {
      getItem: k => db.get(k) ?? null,
      setItem: (k, v) => db.set(k, String(v))
    },
    navigator: { language: 'ko-KR' },
    location: { protocol: 'file:' },
    innerWidth: 1280,
    innerHeight: 720,
    devicePixelRatio: 1,
    document: {
      documentElement: { lang: 'ko' },
      title: '',
      querySelectorAll: () => [],
      createElement: (tag) => {
        if (tag === 'canvas') return { width: 128, height: 128, getContext: make2dCtx };
        return { style: {}, appendChild() {}, innerHTML: '', clientWidth: 1280, clientHeight: 720 };
      }
    },
    Image: class {},
    CustomEvent: class { constructor(name, detail) { this.name = name; this.detail = detail; } },
    dispatchEvent() {},
    addEventListener() {},
    removeEventListener() {},
    setTimeout(fn) { fn(); return ++timerId; },
    clearTimeout() {},
    setInterval(fn) { const id = ++timerId; intervals.set(id, fn); return id; },
    clearInterval(id) { intervals.delete(id); },
    requestAnimationFrame() { return ++timerId; },
    cancelAnimationFrame() {}
  };

  ctx.window = ctx;
  vm.createContext(ctx);

  const scripts = [
    'js/storage.js',
    'locales/i18n.js',
    'js/i18n-ext.js',
    'js/auth-ranking.js',
    'js/audio-synth.js',
    'js/game3d.js'
  ];
  for (const s of scripts) {
    vm.runInContext(fs.readFileSync(path.join(root, s), 'utf8'), ctx, { filename: s });
  }

  return {
    ctx,
    intervals,
    advanceClock(sec) {
      perfNow += sec * 1000;
      if (ctx.AudioEngine.ctx) ctx.AudioEngine.ctx.currentTime += sec;
    },
    setWallDate(iso) { wallClock = Date.parse(iso); }
  };
}

(async () => {
  console.log('=== [1/4] 5대 소셜 로그인 & 5개 국어 가상 시뮬레이션 ===');
  const env = createFullSimEnvironment();
  const { ctx } = env;

  for (const provider of ['kakao', 'naver', 'google', 'apple', 'guest']) {
    const user = await ctx.AuthService.signIn(provider);
    assert.ok(user.uid && user.provider === provider, `Login failed for ${provider}`);
  }

  for (const lang of ['ko', 'en', 'ja', 'zh-TW', 'es']) {
    ctx.I18n.setLang(lang);
    assert.equal(ctx.I18n.current, lang);
    assert.ok(ctx.I18n.t('game_title').length > 0);
  }
  console.log('  ✔ 5종 소셜 로그인 & 5개 국어 전환 이상 없음');

  console.log('=== [2/4] 전 스테이지 (4곡 × 4난이도 = 16개 채보) × 3캐릭터 60FPS 완주 시뮬레이션 ===');
  const container = ctx.document.createElement('div');
  let clearedCount = 0;
  const chars = ['kai', 'luna', 'aria'];

  const game = new ctx.RhythmGame3D(container, {
    onStageClear(stats) {
      const rankRes = ctx.RankingEngine.recordStageClear({
        songId: stats.song.id,
        diff: stats.difficulty,
        score: stats.score,
        maxCombo: stats.maxCombo,
        rankGrade: stats.rankGrade,
        sessionId: stats.sessionId,
        cleared: stats.cleared,
        accuracy: stats.accuracy
      });
      assert.equal(stats.cleared, true, `Stage ${stats.song.id} ${stats.difficulty} did not clear`);
      assert.equal(stats.rankGrade, 'S+', `Expected S+ on bot perfect run, got ${stats.rankGrade}`);
      assert.ok(stats.score > 50000, `Unexpected low score: ${stats.score}`);
      assert.ok(!rankRes.duplicate, 'Unexpected duplicate session flag');
      clearedCount++;
    }
  });

  let stageIdx = 0;
  for (const song of ctx.SONGS) {
    for (const diff of ['EASY', 'NORMAL', 'HARD', 'EXTREME']) {
      const charId = chars[stageIdx % chars.length];
      const useRushBranch = (stageIdx % 2 === 0);
      stageIdx++;

      game.startSession({ song, difficulty: diff, charId, autoFever: true });

      //Verify depthWrite: false on transparent note materials!
      assert.equal(game.matOrb.depthWrite, false, 'matOrb depthWrite must be false');
      assert.equal(game.matSwipeL.depthWrite, false, 'matSwipeL depthWrite must be false');
      assert.equal(game.matSwipeR.depthWrite, false, 'matSwipeR depthWrite must be false');

      // Step 60FPS from t=0 to song.duration + 0.2s
      const dt = 1 / 60;
      while (game.active) {
        env.advanceClock(dt);
        const t = ctx.AudioEngine.getSongTime();

        // Steer into RUSH (lane 2) or STANDARD (lane 0) during Y-branch prompt
        if (game.chart.hasBranch && t >= game.chart.branchStart && t < game.chart.branchDecision) {
          const desiredLane = useRushBranch ? 2 : 0;
          while (game.currentLane < desiredLane) game.moveLane(1);
          while (game.currentLane > desiredLane) game.moveLane(-1);
        }

        // Bot strikes any active due note within ±12ms
        for (const n of game.chart.notes) {
          if (n.hit) continue;
          if (n.branch === 'rush_only' && game.chosenBranch === 'std') continue;
          if (Math.abs(n.time - t) <= 0.015) {
            while (game.currentLane < n.lane) game.moveLane(1);
            while (game.currentLane > n.lane) game.moveLane(-1);
            if (!n.hit) {
              if (n.type === 'tap') game.triggerTap();
              else game.triggerSwipe();
            }
          }
          if (n.time - t > 0.05) break;
        }

        game._animate(ctx.performance.now());
      }
    }
  }

  assert.equal(clearedCount, 16, `Expected 16 cleared stages, got ${clearedCount}`);
  assert.equal(ctx.RankingEngine.getMyRank(), 1, 'After S+ on all songs, player should reach Rank #1');
  console.log('  ✔ 16개 전 스테이지 60FPS 완주 · S+ 달성 · Y자 갈림길(일반/러시) · 주간 리그 1위 등극 통과');

  console.log('=== [3/4] 카이 실드 방어 · 일시정지/재개 · 50회 연속 재도전 스트레스 테스트 ===');
  game.startSession({ song: ctx.SONGS[0], difficulty: 'HARD', charId: 'kai', autoFever: false });
  assert.equal(game.shieldLeft, 2);
  // Let 2 notes miss intentionally -> Kai's 2 shields should absorb both without HP loss!
  const startHp = game.hp;
  while (game.active && game.shieldLeft > 0) {
    env.advanceClock(1 / 30);
    game._animate(ctx.performance.now());
  }
  assert.equal(game.shieldLeft, 0);
  assert.equal(game.counts.miss, 0, 'Kai shield should convert first 2 misses to GREAT');
  assert.ok(game.hp >= startHp, 'Kai HP should not drop while shield absorbs misses');

  // Pause & Resume verification
  game.pause();
  const pausedSongTime = ctx.AudioEngine.getSongTime();
  env.advanceClock(5.0);
  assert.equal(ctx.AudioEngine.getSongTime(), pausedSongTime);
  assert.equal(ctx.AudioEngine.voices.size, 0);
  game.resume();
  game.stop();

  // 50 rapid retries
  for (let r = 0; r < 50; r++) {
    game.startSession({ song: ctx.SONGS[r % 4], difficulty: 'EXTREME', charId: 'aria', autoFever: true });
    env.advanceClock(0.5);
    game._animate(ctx.performance.now());
    game.stop();
  }
  assert.equal(ctx.AudioEngine.voices.size, 0, 'Zero lingering WebAudio voices after 50 retries');
  assert.equal(env.intervals.size, 0, 'Zero lingering intervals after stop');
  game.dispose();
  console.log('  ✔ 카이 실드 · 일시정지/재개 · 50회 연속 재도전 리소스 누수 0건 통과');

  console.log('=== [4/4] 주간 시즌 정산 & 승급 보상 시뮬레이션 ===');
  env.setWallDate('2026-12-03T01:00:00Z');
  const claim = ctx.RankingEngine.claimWeeklyReward();
  assert.equal(claim.ok, true);
  assert.equal(claim.coinsAdded, 500);
  assert.equal(ctx.AuthService.getCurrentUser().league, 1);
  console.log('  ✔ 주간 리그 다이아/실버 승급 및 +500 코인 정산 통과');
  console.log('\n🎉 ALL VIRTUAL SIMULATIONS PASSED WITH ZERO ERRORS!');
})();
