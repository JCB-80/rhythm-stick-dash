// Three.js 3D Rhythm Runner Engine — Curved Neon Highway, Live Y-Branch Fork, Stick Slash & Fever Overdrive
(function () {
  const CHAR_SPECS = {
    kai: {
      id: 'kai',
      maxHp: 130,
      judgeScale: 1.15,     // +15% relaxed timing window
      feverBonusSec: 0,
      feverHeal: 1.5,
      comboScoreMult: 1.0,
      rushBranchMult: 2.0,
      stickColor: 0x00f2ff,
      auraColor: 0x00b8ff,
      shieldCharges: 2
    },
    luna: {
      id: 'luna',
      maxHp: 100,
      judgeScale: 1.0,
      feverBonusSec: 3.0,   // +3s Fever duration
      feverHeal: 3.6,       // Enhanced HP recovery during Fever
      comboScoreMult: 1.05,
      rushBranchMult: 2.0,
      stickColor: 0xff2bd6,
      auraColor: 0xff66e5,
      shieldCharges: 0
    },
    aria: {
      id: 'aria',
      maxHp: 100,
      judgeScale: 1.0,
      feverBonusSec: 0,
      feverHeal: 1.4,
      comboScoreMult: 1.25, // +25% combo bonus score
      rushBranchMult: 2.5,  // 2.5x Rush branch multiplier
      stickColor: 0xffd84d,
      auraColor: 0xffae00,
      shieldCharges: 0
    }
  };

  window.CHAR_SPECS = CHAR_SPECS;

  // Procedural fallback canvas textures so WebGL works cleanly even on strict file:// protocol
  function makeOrbFallbackTexture() {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    const rad = g.createRadialGradient(54, 48, 8, 64, 64, 58);
    rad.addColorStop(0, '#ffffff');
    rad.addColorStop(0.35, '#ffe66d');
    rad.addColorStop(0.75, '#ffae00');
    rad.addColorStop(1, 'rgba(255,160,0,0)');
    g.fillStyle = rad;
    g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2); g.fill();
    return new THREE.CanvasTexture(c);
  }

  function makeSwipeFallbackTexture(dir, colorHex) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(14, 24, 48, 0.9)';
    g.strokeStyle = colorHex;
    g.lineWidth = 10;
    g.strokeRect(12, 16, 232, 96);
    g.fillRect(12, 16, 232, 96);
    g.fillStyle = '#ffffff';
    g.font = '900 56px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(dir === 'left' ? '<<<' : '>>>', 128, 66);
    return new THREE.CanvasTexture(c);
  }

  function loadSafeTexture(url, fallbackFn) {
    const tex = fallbackFn();
    if (window.location.protocol !== 'file:' || String(window.location.href || '').includes('android_asset')) {
      const loader = new THREE.TextureLoader();
      loader.load(url, loaded => {
        tex.image = loaded.image;
        tex.needsUpdate = true;
        loaded.dispose();
      }, undefined, () => {});
    }
    return tex;
  }

  class RhythmGame3D {
    constructor(containerEl, callbacks) {
      this.container = containerEl;
      this.callbacks = callbacks || {};

      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.rafId = null;

      // Assets / Textures
      this.texOrb = null;
      this.texSwipeL = null;
      this.texSwipeR = null;

      // 3D Groups
      this.mainTrackRibbon = null;
      this.stdBranchRibbon = null;
      this.rushBranchRibbon = null;
      this.hitLineMesh = null;
      this.runnerGroup = null;
      this.leftArmPivot = null;
      this.rightArmPivot = null;
      this.shieldRing = null;
      this.eqTowers = [];
      this.noteMeshes = [];
      this.hitBursts = [];

      // Gameplay State
      this.active = false;
      this.paused = false;
      this.song = null;
      this.difficulty = 'NORMAL';
      this.charSpec = CHAR_SPECS.luna;
      this.chart = null;

      this.currentLane = 1;       // 0, 1, 2
      this.visualLaneX = 0;
      this.chosenBranch = 'none'; // 'none' | 'std' | 'rush'
      this.visualBranchOffset = 0;

      this.score = 0;
      this.combo = 0;
      this.maxCombo = 0;
      this.hp = 100;
      this.shieldLeft = 0;
      this.feverGauge = 0;        // 0..100
      this.isFever = false;
      this.feverRemaining = 0;
      this.lastFrameTime = 0;
      this.audioOffset = 0; this.nextMissIndex = 0; this.visibleStartIndex = 0;
      this.swingToggle = 0;
      this.slashAnimTimer = 0;

      this.counts = { perfect: 0, great: 0, miss: 0 };
      this.approachSpeed = 30;    // units per second

      this._onResize = this._onResize.bind(this);
      this._animate = this._animate.bind(this);
    }

    initThree() {
      if (this.renderer) return;

      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;

      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0x090521, 0.011);

      this.camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 220);
      this.camera.position.set(0, 4.9, 7.6);
      this.camera.lookAt(0, 1.4, -18);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setSize(w, h);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.container.innerHTML = '';
      this.container.appendChild(this.renderer.domElement);

      // Lighting
      const amb = new THREE.AmbientLight(0x8899ff, 0.9);
      this.scene.add(amb);
      const dir = new THREE.DirectionalLight(0x00f2ff, 1.15);
      dir.position.set(6, 16, 10);
      this.scene.add(dir);
      const pinkPoint = new THREE.PointLight(0xff2bd6, 1.6, 38);
      pinkPoint.position.set(0, 4, -8);
      this.scene.add(pinkPoint);

      // Load PNG sprites with automatic fallback
      this.texOrb = loadSafeTexture('./assets/sprites_transparent/note_tap_orb.png', makeOrbFallbackTexture);
      this.texSwipeL = loadSafeTexture('./assets/sprites_transparent/note_swipe_cyan.png', () => makeSwipeFallbackTexture('left', '#00f2ff'));
      this.texSwipeR = loadSafeTexture('./assets/sprites_transparent/note_swipe_magenta.png', () => makeSwipeFallbackTexture('right', '#ff2bd6'));

      // Shared reusable geometries & materials to prevent WebGL GPU memory leaks across retries
      // depthWrite: false prevents transparent sprite quads from punching rectangular holes in translucent track ribbons!
      this.sharedSwipeGeo = new THREE.PlaneGeometry(2.05, 1.55);
      this.sharedBurstGeo = new THREE.RingGeometry(0.35, 1.25, 24);
      this.matOrb = new THREE.SpriteMaterial({ map: this.texOrb, transparent: true, depthWrite: false });
      this.matSwipeL = new THREE.MeshBasicMaterial({ map: this.texSwipeL, transparent: true, depthWrite: false, side: THREE.DoubleSide });
      this.matSwipeR = new THREE.MeshBasicMaterial({ map: this.texSwipeR, transparent: true, depthWrite: false, side: THREE.DoubleSide });

      this._buildTrackRibbons();
      this._buildCityEqualizers();
      this._buildRunnerModel();

      window.addEventListener('resize', this._onResize);
    }

    _onResize() {
      if (!this.renderer || !this.camera) return;
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      // Leave room for both outer targets even when the camera follows a side lane.
      const halfAngle = this.camera.fov * Math.PI / 360;
      this.camera.position.z = Math.max(7.6, 3.7 / (this.camera.aspect * Math.tan(halfAngle)));
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    }

    // Dynamic 64-segment ribbon geometry updated every frame for curved highway + Y-branch split!
    _createRibbonMesh(edgeColorHex, surfaceColorHex) {
      const segs = 64;
      const group = new THREE.Group();

      const surfGeo = new THREE.BufferGeometry();
      const positions = new Float32Array((segs + 1) * 2 * 3);
      const indices = [];
      for (let i = 0; i < segs; i++) {
        const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
        indices.push(a, b, c, b, d, c);
      }
      surfGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      surfGeo.setIndex(indices);

      const surfMat = new THREE.MeshBasicMaterial({
        color: surfaceColorHex,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const surfMesh = new THREE.Mesh(surfGeo, surfMat);
      surfMesh.frustumCulled = false;
      surfMesh.renderOrder = 1;
      group.add(surfMesh);

      // Left, Right & 2 Inner Lane Divider Neon Lines
      const lineRatios = [-0.5, -0.166, 0.166, 0.5];
      const lines = lineRatios.map((r, idx) => {
        const lg = new THREE.BufferGeometry();
        lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array((segs + 1) * 3), 3));
        const isOuter = (idx === 0 || idx === 3);
        const lm = new THREE.LineBasicMaterial({
          color: isOuter ? edgeColorHex : 0x5be8ff,
          transparent: true,
          opacity: isOuter ? 0.98 : 0.45,
          depthWrite: false
        });
        const line = new THREE.Line(lg, lm);
        line.frustumCulled = false;
        line.renderOrder = 2;
        line.userData.ratio = r;
        group.add(line);
        return line;
      });

      group.userData = { segs, surfGeo, surfMat, lines };
      return group;
    }

    _buildTrackRibbons() {
      this.mainTrackRibbon = this._createRibbonMesh(0x00f2ff, 0x0d1033);
      this.stdBranchRibbon = this._createRibbonMesh(0x00f2ff, 0x08223d);
      this.rushBranchRibbon = this._createRibbonMesh(0xff2bd6, 0x2c0938);

      this.scene.add(this.mainTrackRibbon);
      this.scene.add(this.stdBranchRibbon);
      this.scene.add(this.rushBranchRibbon);

      // Glowing Strike Receptor Bar at Z = 0
      const hitGeo = new THREE.BoxGeometry(6.9, 0.08, 0.36);
      const hitMat = new THREE.MeshBasicMaterial({ color: 0x00f2ff, transparent: true, opacity: 0.9, depthWrite: false });
      this.hitLineMesh = new THREE.Mesh(hitGeo, hitMat);
      this.hitLineMesh.renderOrder = 3;
      this.hitLineMesh.position.set(0, 0.05, 0);
      this.scene.add(this.hitLineMesh);

      // Give each lane its own strike target, visible against both route colors.
      const socketGeo = new THREE.RingGeometry(0.38, 0.57, 4);
      const socketMat = new THREE.MeshBasicMaterial({
        color: 0xf1faff, side: THREE.DoubleSide, transparent: true, depthWrite: false
      });
      for (const laneX of [-2.15, 0, 2.15]) {
        const socket = new THREE.Mesh(socketGeo, socketMat);
        socket.rotation.x = -Math.PI / 2;
        socket.position.set(laneX, 0.11, 0);
        socket.renderOrder = 4;
        this.scene.add(socket);
      }
    }

    _buildCityEqualizers() {
      this.eqTowers = [];
      const towerGeo = new THREE.BoxGeometry(1.6, 1, 1.6);
      for (let i = 0; i < 26; i++) {
        const isLeft = (i % 2 === 0);
        const z = -6 - i * 3.4;
        const x = (isLeft ? -1 : 1) * (11 + (i % 3) * 3.2);
        const mat = new THREE.MeshBasicMaterial({
          color: (i % 3 === 0) ? 0xff2bd6 : 0x00d8ff,
          transparent: true,
          opacity: 0.36
        });
        const mesh = new THREE.Mesh(towerGeo, mat);
        mesh.position.set(x, 2, z);
        mesh.userData = { baseX: x, baseZ: z, phase: i * 0.65 };
        this.scene.add(mesh);
        this.eqTowers.push(mesh);
      }
    }

    _buildRunnerModel() {
      this.runnerGroup = new THREE.Group();
      this.runnerGroup.position.set(0, 0.08, 0.65);
      this.runnerGroup.renderOrder = 6;

      this.runnerTrimMat = new THREE.MeshBasicMaterial({ color: 0xff2bd6 });
      this.stickMat = new THREE.MeshBasicMaterial({ color: 0xff2bd6, transparent: true, opacity: 0.72, depthWrite: false });

      // Ground Neon Hover-Skate Pulse Ring under Runner's Sneakers
      const groundDisc = new THREE.Mesh(
        new THREE.RingGeometry(0.32, 0.86, 28),
        new THREE.MeshBasicMaterial({ color: 0x00f2ff, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide })
      );
      groundDisc.rotation.x = -Math.PI * 0.5;
      groundDisc.position.y = 0.03;
      groundDisc.renderOrder = 3;
      this.runnerGroup.add(groundDisc);

      // Kinematic pivots preserved for compatibility & slash state
      this.leftLeg = new THREE.Group();
      this.rightLeg = new THREE.Group();
      this.leftArmPivot = new THREE.Group();
      this.rightArmPivot = new THREE.Group();
      this.runnerGroup.add(this.leftLeg, this.rightLeg, this.leftArmPivot, this.rightArmPivot);

      // High-Resolution 10-Frame Illustrated Anime Cyber-Runner Billboard Sprite
      this.charFrames = window.RunnerSpriteBank ? window.RunnerSpriteBank.getFrames('luna') : null;
      this.runnerSpriteMat = new THREE.SpriteMaterial({
        map: this.charFrames ? this.charFrames.run[0] : null,
        transparent: true,
        depthWrite: false
      });
      this.runnerSprite = new THREE.Sprite(this.runnerSpriteMat);
      this.runnerSprite.scale.set(3.25, 4.06, 1);
      this.runnerSprite.position.set(0, 1.88, 0);
      this.runnerSprite.renderOrder = 8;
      this.runnerGroup.add(this.runnerSprite);

      // Kai Sound Shield Ring / Fever Aura Ring around Runner
      const ringGeo = new THREE.TorusGeometry(1.05, 0.045, 10, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f2ff, transparent: true, opacity: 0.0, depthWrite: false });
      this.shieldRing = new THREE.Mesh(ringGeo, ringMat);
      this.shieldRing.rotation.x = Math.PI * 0.5;
      this.shieldRing.position.y = 1.05;
      this.shieldRing.renderOrder = 7;
      this.runnerGroup.add(this.shieldRing);

      this.scene.add(this.runnerGroup);
    }

    // ==================== CURVE & Y-BRANCH TRACK MATH ====================
    getBaseCurveCenter(songTime, zAhead) {
      // zAhead >= 0 (0 at hit line, 85 far ahead)
      const worldT = songTime + zAhead / this.approachSpeed;
      const amp = (this.difficulty === 'EASY') ? 1.6 : (this.difficulty === 'NORMAL' ? 2.9 : 4.2);
      const waveX = Math.sin(worldT * 0.65) * amp - Math.sin(songTime * 0.65) * amp;
      const hillY = (this.difficulty === 'HARD' || this.difficulty === 'EXTREME')
        ? (Math.cos(worldT * 0.85) - Math.cos(songTime * 0.85)) * 0.85
        : (Math.cos(worldT * 0.5) - Math.cos(songTime * 0.5)) * 0.32;
      return { x: waveX, y: hillY };
    }

    getBranchSeparation(noteOrWorldTime) {
      if (!this.chart || !this.chart.hasBranch) return 0;
      const { branchDecision, branchEnd } = this.chart;
      const splitLead = branchDecision - 2.6;
      if (noteOrWorldTime <= splitLead || noteOrWorldTime >= branchEnd + 2.0) return 0;
      if (noteOrWorldTime < branchDecision) {
        const p = (noteOrWorldTime - splitLead) / 2.6;
        return p * p * 4.4;
      }
      if (noteOrWorldTime > branchEnd) {
        const p = 1 - (noteOrWorldTime - branchEnd) / 2.0;
        return Math.max(0, p) * 4.4;
      }
      return 4.4;
    }

    _updateRibbonPositions(ribbon, songTime, branchSign) {
      const { segs, surfGeo, lines } = ribbon.userData;
      const maxDist = 86;
      const halfWidth = 3.35; // Total 3-lane width = 6.7 (each lane = 2.23)
      const posArr = surfGeo.attributes.position.array;

      const playerWorldShift = this.visualBranchOffset;

      for (let i = 0; i <= segs; i++) {
        const frac = i / segs;
        const zAhead = frac * maxDist;
        const zWorld = -zAhead + 1.5;
        const sampleTime = songTime + (zAhead - 1.5) / this.approachSpeed;
        const base = this.getBaseCurveCenter(songTime, Math.max(0, zAhead - 1.5));
        const sep = this.getBranchSeparation(sampleTime);
        const centerX = base.x + branchSign * sep - playerWorldShift;
        const centerY = base.y;

        const idx = i * 6;
        posArr[idx]     = centerX - halfWidth;
        posArr[idx + 1] = centerY;
        posArr[idx + 2] = zWorld;

        posArr[idx + 3] = centerX + halfWidth;
        posArr[idx + 4] = centerY;
        posArr[idx + 5] = zWorld;

        lines.forEach(line => {
          const lArr = line.geometry.attributes.position.array;
          const li = i * 3;
          lArr[li]     = centerX + line.userData.ratio * (halfWidth * 2);
          lArr[li + 1] = centerY + 0.03;
          lArr[li + 2] = zWorld;
        });
      }

      surfGeo.attributes.position.needsUpdate = true;
      lines.forEach(l => { l.geometry.attributes.position.needsUpdate = true; });
    }

    // ==================== START / CONTROL LIFECYCLE ====================
    startSession({ song, difficulty, charId, autoFever = true, audioOffset = 0, vip = false }) {
      this.initThree();
      this._clearNotes();

      this.sessionId = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : `${Date.now()}_${Math.random()}`;
      this.audioOffset = audioOffset;
      this.vipAura = vip;
      this.song = song;
      this.difficulty = difficulty;
      this.charSpec = CHAR_SPECS[charId] || CHAR_SPECS.luna;
      this.autoFever = autoFever;

      const speedMap = { EASY: 25, NORMAL: 31, HARD: 38, EXTREME: 45 };
      this.approachSpeed = speedMap[difficulty] || 31;

      this.chart = window.AudioEngine.generateChart(song, difficulty);
      this.nextMissIndex = 0;
      this.visibleStartIndex = 0;
      this.currentLane = 1;
      this.visualLaneX = 0;
      this.chosenBranch = 'none';
      this.visualBranchOffset = 0;

      this.score = 0;
      this.combo = 0;
      this.maxCombo = 0;
      this.hp = this.charSpec.maxHp;
      this.shieldLeft = this.charSpec.shieldCharges;
      this.feverGauge = 0;
      this.isFever = false;
      this.feverRemaining = 0;
      this.counts = { perfect: 0, great: 0, miss: 0 };

      // Style runner colors & HD animated character sprite by selected character
      this.stickMat.color.setHex(this.charSpec.stickColor);
      this.runnerTrimMat.color.setHex(this.charSpec.stickColor);
      this.shieldRing.material.color.setHex(this.charSpec.auraColor);
      this.shieldRing.material.opacity = this.shieldLeft > 0 ? 0.55 : 0.0;
      if (window.RunnerSpriteBank && this.runnerSpriteMat) {
        this.charFrames = window.RunnerSpriteBank.getFrames(this.charSpec.id);
        this.runnerSpriteMat.map = this.charFrames.run[0];
        this.runnerSpriteMat.needsUpdate = true;
      }

      this._spawnNoteMeshes();

      this.active = true;
      this.paused = false;
      this.lastFrameTime = performance.now();

      window.AudioEngine.startSong(song);
      this._onResize();
      if (this.rafId) cancelAnimationFrame(this.rafId);
      this.rafId = requestAnimationFrame(this._animate);
    }

    _spawnNoteMeshes() {
      this.noteMeshes = this.chart.notes.map(note => {
        let mesh;
        if (note.type === 'tap') {
          mesh = new THREE.Sprite(this.matOrb);
          mesh.scale.set(1.55, 1.55, 1);
        } else {
          mesh = new THREE.Mesh(
            this.sharedSwipeGeo,
            note.type === 'swipeL' ? this.matSwipeL : this.matSwipeR
          );
          mesh.rotation.x = -Math.PI * 0.42;
        }
        mesh.visible = false;
        mesh.renderOrder = 4;
        mesh.userData = { note };
        this.scene.add(mesh);
        return mesh;
      });
    }

    _clearNotes() {
      if (!this.scene) return;
      this.noteMeshes.forEach(m => this.scene.remove(m));
      this.noteMeshes = [];
      this.hitBursts.forEach(b => {
        this.scene.remove(b);
        if (b.material) b.material.dispose();
      });
      this.hitBursts = [];
    }

    moveLane(dir) {
      if (!this.active || this.paused) return;
      const prevLane = this.currentLane;
      this.currentLane = Math.max(0, Math.min(2, this.currentLane + dir));

      // Preserve the original assisted directional slash while steering.
      const struck = this._tryStrikeNote(dir < 0 ? 'swipeL' : 'swipeR', true);

      if (this.currentLane !== prevLane) {
        this.runnerGroup.rotation.z = -dir * 0.24;
      }
      return struck;
    }

    triggerTap() {
      if (!this.active || this.paused) return;
      this._swingSticks();
      this._tryStrikeNote('tap', false);
    }

    triggerSwipe(dir = 0) {
      if (!this.active || this.paused) return false;
      this._swingSticks(true);
      const action = dir < 0 ? 'swipeL' : dir > 0 ? 'swipeR' : 'swipeAny';
      return this._tryStrikeNote(action, false);
    }

    activateFever() {
      if (!this.active || this.paused || this.isFever || this.feverGauge < 100) return;
      this.isFever = true;
      this.feverGauge = 100;
      this.feverRemaining = 8.0 + this.charSpec.feverBonusSec;
      this.feverEndTime = window.AudioEngine.getSongTime() + this.feverRemaining;
      window.AudioEngine.playFeverTriggerSfx();
      if (this.callbacks.onFeverState) this.callbacks.onFeverState(true);
    }

    _swingSticks(isBigSwipe = false) {
      this.swingToggle = 1 - this.swingToggle;
      this.slashAnimTimer = isBigSwipe ? 0.22 : 0.16;
      if (isBigSwipe) {
        this.leftArmPivot.rotation.x = -1.2;
        this.rightArmPivot.rotation.x = -1.2;
      } else if (this.swingToggle === 0) {
        this.leftArmPivot.rotation.x = -1.05;
      } else {
        this.rightArmPivot.rotation.x = -1.05;
      }
    }

    _isNoteActiveOnCurrentBranch(note) {
      if (note.branch === 'main') return true;
      if (note.branch === 'rush_only') return this.chosenBranch === 'rush';
      return true;
    }

    _tryStrikeNote(actionType, silentIfNone = false) {
      const songTime = window.AudioEngine.getSongTime() + this.audioOffset;
      const perfWin = 0.095 * this.charSpec.judgeScale;
      const greatWin = 0.165 * this.charSpec.judgeScale;

      // Find earliest unhit note within hit window
      let candidate = null;
      let bestDelta = Infinity;

      for (let i = this.nextMissIndex; i < this.chart.notes.length; i++) {
        const n = this.chart.notes[i];
        if (n.hit) continue;
        if (!this._isNoteActiveOnCurrentBranch(n)) continue;

        const dt = Math.abs(n.time - songTime);
        if (dt > greatWin) {
          if (n.time - songTime > greatWin) break;
          continue;
        }

        // Strict Tap vs Swipe note differentiation
        const isSwipeNote = (n.type === 'swipeL' || n.type === 'swipeR');
        if (actionType === 'tap' && isSwipeNote) continue;
        if (actionType === 'swipeAny' && !isSwipeNote) continue;
        if (actionType === 'swipeL' && n.type !== 'swipeL') continue;
        if (actionType === 'swipeR' && n.type !== 'swipeR') continue;
        if (silentIfNone && !isSwipeNote) continue;

        // EASY/NORMAL retain adjacent-lane assistance; HARD/EXTREME enforce strict laneDist === 0.
        const maxLaneDist = (this.difficulty === 'HARD' || this.difficulty === 'EXTREME') ? 0 : 1;
        const laneDist = Math.abs(n.lane - this.currentLane);
        if (laneDist <= maxLaneDist) {
          const weighted = dt + laneDist * 0.035;
          if (weighted < bestDelta) {
            bestDelta = weighted;
            candidate = n;
          }
        }
      }

      if (!candidate) {
        if (!silentIfNone) {
          window.AudioEngine.playHitSfx(actionType === 'tap' ? 'tap' : 'swipe', this.isFever);
        }
        return;
      }

      // Mark exactly one matching note per input.
      this.currentLane = candidate.lane;
      candidate.hit = true;
      const mesh = this.noteMeshes[candidate.id];
      if (mesh) mesh.visible = false;

      const rawDt = Math.abs(candidate.time - songTime);
      const grade = (rawDt <= perfWin) ? 'PERFECT' : 'GREAT';
      this._registerJudgment(grade, candidate);
      return true;
    }

    _registerJudgment(grade, note) {
      if (grade === 'MISS') {
        if (this.shieldLeft > 0) {
          // Kai's Sound Gauntlet Shield absorbs the miss!
          this.shieldLeft--;
          this.shieldRing.material.opacity = this.shieldLeft > 0 ? 0.45 : 0.0;
          grade = 'GREAT';
        } else {
          this.counts.miss++;
          this.combo = 0;
          this.hp = Math.max(0, this.hp - 10);
          window.AudioEngine.playMissSfx();
          if (this.callbacks.onJudgment) {
            this.callbacks.onJudgment({ grade: 'MISS', combo: 0, score: this.score, hp: this.hp / this.charSpec.maxHp });
          }
          return;
        }
      }

      if (grade === 'PERFECT') this.counts.perfect++;
      else this.counts.great++;

      // Slowly recover HP on hits if shield was depleted; depleted HP halves base score until recovered
      const depletedPenalty = (this.hp <= 0) ? 0.5 : 1.0;
      if (!this.isFever && this.hp < this.charSpec.maxHp) {
        this.hp = Math.min(this.charSpec.maxHp, this.hp + 1.2);
      }

      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;

      // Multipliers: Route (1x vs Rush 2x / Aria 2.5x) * Fever (2x -> total 4x Overdrive!) * Combo
      const inRushActive = (this.chosenBranch === 'rush') && this.chart.hasBranch &&
        (note.time >= this.chart.branchDecision && note.time <= this.chart.branchEnd);
      const routeMult = inRushActive ? this.charSpec.rushBranchMult : 1.0;
      const feverMult = this.isFever ? 2.0 : 1.0;
      const comboFactor = (1 + Math.min(this.combo, 200) * 0.005) * this.charSpec.comboScoreMult;
      const basePts = (grade === 'PERFECT') ? 1500 : 1000;

      this.score += Math.round(basePts * routeMult * feverMult * comboFactor * depletedPenalty);

      // Fever Gauge & Healing
      if (!this.isFever) {
        this.feverGauge = Math.min(100, this.feverGauge + (grade === 'PERFECT' ? 6.5 : 4.2));
        if (this.feverGauge >= 100 && this.autoFever) {
          this.activateFever();
        }
      } else {
        this.hp = Math.min(this.charSpec.maxHp, this.hp + this.charSpec.feverHeal);
      }

      window.AudioEngine.playHitSfx(note.type === 'tap' ? 'tap' : 'swipe', this.isFever);
      this._spawnHitBurst(this.visualLaneX, this.isFever ? 0xffd84d : this.charSpec.stickColor);

      if (this.callbacks.onJudgment) {
        this.callbacks.onJudgment({
          grade,
          combo: this.combo,
          score: this.score,
          hp: this.hp / this.charSpec.maxHp,
          feverGauge: this.feverGauge,
          isFever: this.isFever,
          totalMult: routeMult * feverMult
        });
      }
    }

    _spawnHitBurst(x, hexColor) {
      const mat = new THREE.MeshBasicMaterial({ color: hexColor, transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(this.sharedBurstGeo, mat);
      ring.rotation.x = -Math.PI * 0.45;
      ring.position.set(x, 0.25, 0);
      ring.renderOrder = 5;
      ring.userData = { life: 0.28 };
      this.scene.add(ring);
      this.hitBursts.push(ring);
    }

    // ==================== MAIN 60FPS RENDER LOOP ====================
    _animate(now) {
      if (!this.active) return;
      this.rafId = requestAnimationFrame(this._animate);
      if (this.paused) {
        this.lastFrameTime = now;
        return;
      }

      const dt = Math.min(0.05, (now - this.lastFrameTime) / 1000);
      this.lastFrameTime = now;
      const songTime = window.AudioEngine.getSongTime();

      // 1. Check Fever countdown
      if (this.isFever) {
        this.feverRemaining = Math.max(0, this.feverEndTime - songTime);
        this.feverGauge = Math.max(0, (this.feverRemaining / (8.0 + this.charSpec.feverBonusSec)) * 100);
        this.shieldRing.material.opacity = 0.72;
        this.shieldRing.rotation.z += dt * 5;
        if (this.feverRemaining <= 0) {
          this.isFever = false;
          this.feverGauge = 0;
          this.shieldRing.material.opacity = this.shieldLeft > 0 ? 0.45 : 0.0;
          if (this.callbacks.onFeverState) this.callbacks.onFeverState(false);
        }
      }

      // 2. Real-time Y-Branch Fork Logic
      let showBranchPrompt = false;
      let previewRushSelected = (this.currentLane >= 2);
      if (this.chart.hasBranch) {
        const { branchStart, branchDecision, branchEnd } = this.chart;
        if (songTime >= branchStart && songTime < branchDecision) {
          showBranchPrompt = true;
          previewRushSelected = (this.currentLane >= 2);
        } else if (songTime >= branchDecision && songTime <= branchEnd) {
          if (this.chosenBranch === 'none') {
            this.chosenBranch = (this.currentLane >= 2) ? 'rush' : 'std';
          }
        } else if (songTime > branchEnd + 2.0 && this.chosenBranch !== 'none') {
          this.chosenBranch = 'none';
        }
      }

      const previewSign = this.chart.hasBranch && songTime < this.chart.branchDecision ? (previewRushSelected ? 1 : -1) : 0;
      const targetBranchSign = (this.chosenBranch === 'rush') ? 1 : (this.chosenBranch === 'std' ? -1 : previewSign);
      const currentSep = this.getBranchSeparation(songTime);
      const targetWorldBranchShift = targetBranchSign * currentSep;
      this.visualBranchOffset += (targetWorldBranchShift - this.visualBranchOffset) * Math.min(1, dt * 8);

      // Show/update main vs split branch ribbons
      const branchVisible = this.chart.hasBranch &&
        songTime >= (this.chart.branchDecision - 5.5) &&
        songTime <= (this.chart.branchEnd + 2.2);

      this.mainTrackRibbon.visible = !branchVisible || (songTime < this.chart.branchDecision - 2.6);
      this.stdBranchRibbon.visible = branchVisible;
      this.rushBranchRibbon.visible = branchVisible;

      if (this.mainTrackRibbon.visible) this._updateRibbonPositions(this.mainTrackRibbon, songTime, 0);
      if (branchVisible) {
        this._updateRibbonPositions(this.stdBranchRibbon, songTime, -1);
        this._updateRibbonPositions(this.rushBranchRibbon, songTime, 1);
      }

      // 3. Runner smooth lane dash & running animation
      const laneWidth = 2.15;
      const targetX = (this.currentLane - 1) * laneWidth;
      this.visualLaneX += (targetX - this.visualLaneX) * Math.min(1, dt * 15);
      this.runnerGroup.position.x = this.visualLaneX;
      this.runnerGroup.rotation.z *= Math.pow(0.08, dt);

      const stridePhase = songTime * (this.song.bpm / 60) * Math.PI * 2;
      this.runnerGroup.position.y = 0.05 + Math.abs(Math.sin(stridePhase)) * 0.08;
      this.leftLeg.rotation.x = Math.sin(stridePhase) * 0.65;
      this.rightLeg.rotation.x = -Math.sin(stridePhase) * 0.65;

      if (this.slashAnimTimer > 0) {
        this.slashAnimTimer -= dt;
        if (this.charFrames && this.runnerSpriteMat) {
          this.runnerSpriteMat.map = (this.swingToggle === 0) ? this.charFrames.slashL : this.charFrames.slashR;
        }
      } else {
        this.leftArmPivot.rotation.x += (Math.sin(stridePhase + Math.PI) * 0.25 - this.leftArmPivot.rotation.x) * Math.min(1, dt * 10);
        this.rightArmPivot.rotation.x += (Math.sin(stridePhase) * 0.25 - this.rightArmPivot.rotation.x) * Math.min(1, dt * 10);
        if (this.charFrames && this.runnerSpriteMat) {
          const frameIdx = Math.floor(((songTime * (this.song.bpm / 60) * 4) % 8 + 8) % 8);
          this.runnerSpriteMat.map = this.charFrames.run[frameIdx];
        }
      }
      if (this.runnerSpriteMat) {
        this.runnerSpriteMat.rotation = this.runnerGroup.rotation.z * 0.65;
      }

      // Subtle dynamic camera follow
      this.camera.position.x = this.visualLaneX * 0.35;
      this.camera.lookAt(this.visualLaneX * 0.25, 1.3, -18);

      // 4. Update Notes along 3D Curved Track & Detect Misses
      const missWindow = 0.18 * this.charSpec.judgeScale;
      const judgeTime = songTime + this.audioOffset;
      const visibleLeadSec = 82 / this.approachSpeed;

      for (let i = this.visibleStartIndex; i < this.chart.notes.length; i++) {
        const note = this.chart.notes[i];
        const mesh = this.noteMeshes[i];
        if (note.hit) {
          mesh.visible = false;
          continue;
        }

        const timeUntil = note.time - judgeTime;
        if (timeUntil < -missWindow) {
          note.hit = true;
          mesh.visible = false;
          if (this._isNoteActiveOnCurrentBranch(note)) {
            this._registerJudgment('MISS', note);
          }
          this.nextMissIndex = i + 1;
          this.visibleStartIndex = i + 1;
          continue;
        }

        if (timeUntil > visibleLeadSec) {
          mesh.visible = false;
          break;
        }

        if (note.branch === 'rush_only' && this.chosenBranch === 'std') {
          mesh.visible = false;
          continue;
        }

        const zAhead = timeUntil * this.approachSpeed;
        const base = this.getBaseCurveCenter(songTime, zAhead);
        const sep = this.getBranchSeparation(note.time);

        let noteBranchSign = 0;
        if (sep > 0.05) {
          if (note.branch === 'rush_only') noteBranchSign = 1;
          else if (this.chosenBranch === 'rush') noteBranchSign = 1;
          else if (this.chosenBranch === 'std') noteBranchSign = -1;
          else noteBranchSign = previewRushSelected ? 1 : -1;
        }

        const laneOffset = (note.lane - 1) * laneWidth;
        const worldX = base.x + noteBranchSign * sep - this.visualBranchOffset + laneOffset;
        const worldY = base.y + (note.type === 'tap' ? 0.78 : 0.16);
        const worldZ = -zAhead;

        mesh.position.set(worldX, worldY, worldZ);
        if (note.type === 'tap') {
          const pulse = 1.45 + Math.sin(songTime * 12 + i) * 0.12;
          mesh.scale.set(pulse, pulse, 1);
        }
        mesh.visible = true;
      }

      // 5. Animate Hit Bursts & Equalizer Skyline Towers
      for (let i = this.hitBursts.length - 1; i >= 0; i--) {
        const b = this.hitBursts[i];
        b.userData.life -= dt;
        if (b.userData.life <= 0) {
          this.scene.remove(b);
          if (b.material) b.material.dispose();
          this.hitBursts.splice(i, 1);
        } else {
          const s = 1 + (0.28 - b.userData.life) * 5.5;
          b.scale.set(s, s, 1);
          b.material.opacity = b.userData.life / 0.28;
        }
      }

      const beatPulse = Math.abs(Math.sin(stridePhase * 0.5));
      this.eqTowers.forEach(t => {
        const h = 3.5 + Math.sin(songTime * 5 + t.userData.phase) * 2.2 + beatPulse * (this.isFever ? 6.5 : 3.2);
        t.scale.y = Math.max(1, h);
        t.position.y = t.scale.y * 0.5 - 1.5;
      });

      this.hitLineMesh.material.color.setHex(this.isFever ? 0xffd84d : 0x00f2ff);

      if (this.callbacks.onFrameUpdate) {
        const activeRouteMult = (this.chosenBranch === 'rush' && songTime <= this.chart.branchEnd) ? this.charSpec.rushBranchMult : 1.0;
        this.callbacks.onFrameUpdate({
          songTime,
          duration: this.song.duration,
          score: this.score,
          feverGauge: this.feverGauge,
          isFever: this.isFever,
          showBranchPrompt,
          previewRushSelected,
          rushMult: this.charSpec.rushBranchMult,
          totalMult: activeRouteMult * (this.isFever ? 2.0 : 1.0)
        });
      }

      if (this.vipAura && !this.isFever && !this.shieldLeft) this.shieldRing.material.opacity = .25;
      this.renderer.render(this.scene, this.camera);

      // 6. Stage Clear Check
      if (songTime >= this.song.duration) {
        this.finishStage();
      }
    }

    pause() {
      if (!this.active || this.paused) return;
      this.paused = true;
      window.AudioEngine.pauseSong();
    }

    resume() {
      if (!this.active || !this.paused) return;
      this.paused = false;
      this.lastFrameTime = performance.now();
      window.AudioEngine.resumeSong();
    }

    stop() {
      this.active = false;
      this.paused = false;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      window.AudioEngine.stopSong();
      this._clearNotes();
    }

    dispose() {
      this.stop();
      window.removeEventListener('resize', this._onResize);
      const geometries = new Set(), materials = new Set(), textures = new Set();
      if (this.scene) this.scene.traverse(obj => {
        if (obj.geometry) geometries.add(obj.geometry);
        const list = Array.isArray(obj.material) ? obj.material : [obj.material];
        list.filter(Boolean).forEach(mat => { materials.add(mat); if (mat.map) textures.add(mat.map); });
      });
      [this.sharedSwipeGeo, this.sharedBurstGeo].filter(Boolean).forEach(g => geometries.add(g));
      [this.matOrb, this.matSwipeL, this.matSwipeR].filter(Boolean).forEach(m => materials.add(m));
      [this.texOrb, this.texSwipeL, this.texSwipeR].filter(Boolean).forEach(t => textures.add(t));
      geometries.forEach(g => { if (g && typeof g.dispose === 'function') g.dispose(); });
      materials.forEach(m => { if (m && typeof m.dispose === 'function') m.dispose(); });
      textures.forEach(t => { if (t && typeof t.dispose === 'function') t.dispose(); });
      if (this.renderer) { this.renderer.dispose(); this.renderer.domElement.remove(); }
      this.renderer = null; this.scene = null;
    }

    finishStage() {
      const stats = {
        sessionId: this.sessionId,
        song: this.song,
        difficulty: this.difficulty,
        charId: this.charSpec.id,
        score: this.score,
        maxCombo: this.maxCombo,
        perfect: this.counts.perfect,
        great: this.counts.great,
        miss: this.counts.miss
      };
      const totalNotes = Math.max(1, stats.perfect + stats.great + stats.miss);
      const accuracy = (stats.perfect + stats.great * 0.7) / totalNotes;
      stats.accuracy = accuracy;
      stats.cleared = this.hp > 0 && accuracy >= .65;
      stats.rankGrade = accuracy >= .85 && stats.miss <= Math.ceil(totalNotes * .08) ? 'S+' : accuracy >= .65 ? 'A' : accuracy >= .40 ? 'B' : accuracy > 0 ? 'C' : 'D';
      if (!stats.cleared && stats.rankGrade !== 'D') stats.rankGrade = 'C';

      this.stop();
      if (this.callbacks.onStageClear) {
        this.callbacks.onStageClear(stats);
      }
    }
  }

  window.RhythmGame3D = RhythmGame3D;
})();
