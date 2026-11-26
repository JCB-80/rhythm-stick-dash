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

  const SABER_SKINS = {
    neon_plasma:   { id: 'neon_plasma',   name: '네온 플라즈마',   cost: 0,    primary: 0x00f2ff, secondary: 0xff2bd6, rainbow: false },
    gold_dragon:   { id: 'gold_dragon',   name: '골드 드래곤',     cost: 400,  primary: 0xffd84d, secondary: 0xff7b00, rainbow: false },
    rainbow_prism: { id: 'rainbow_prism', name: '레인보우 프리즘', cost: 600,  primary: 0x00ffcc, secondary: 0xff33cc, rainbow: true  },
    cyber_katana:  { id: 'cyber_katana',  name: '사이버 카타나',   cost: 800,  primary: 0x38bdf8, secondary: 0xe0f2fe, rainbow: false },
    blood_ruby:    { id: 'blood_ruby',    name: '블러드 루비',     cost: 1000, primary: 0xff1e42, secondary: 0xff758f, rainbow: false },
    ice_crystal:   { id: 'ice_crystal',   name: '아이스 크리스탈', cost: 1200, primary: 0x7dd3fc, secondary: 0xffffff, rainbow: false }
  };
  window.SABER_SKINS = SABER_SKINS;

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
    const isLeft = dir === 'left';
    const grad = g.createLinearGradient(0, 0, 256, 0);
    if (isLeft) {
      grad.addColorStop(0, 'rgba(0, 242, 255, 0.95)');
      grad.addColorStop(1, 'rgba(8, 36, 72, 0.92)');
    } else {
      grad.addColorStop(0, 'rgba(72, 14, 48, 0.92)');
      grad.addColorStop(1, 'rgba(255, 74, 150, 0.96)');
    }
    g.fillStyle = grad;
    g.fillRect(10, 14, 236, 100);
    g.strokeStyle = colorHex;
    g.lineWidth = 10;
    g.strokeRect(10, 14, 236, 100);
    g.strokeStyle = '#070b14';
    g.lineWidth = 12;
    g.font = '900 66px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const label = isLeft ? '<<<' : '>>>';
    g.strokeText(label, 128, 66);
    g.fillStyle = '#ffffff';
    g.fillText(label, 128, 66);
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
      this.missRecoilTimer = 0;
      this.runnerAfterimages = [];
      this.afterimageTrail = [];
      this.noteSpeedMult = 1.0;

      this.counts = { perfect: 0, great: 0, miss: 0 };
      this.approachSpeed = 31;    // units per second (dynamically computed per song BPM & difficulty)

      this._onResize = this._onResize.bind(this);
      this._animate = this._animate.bind(this);
    }

    static computeNoteSpeed(song, difficulty, userMult = 1.0, speed125Mod = false) {
      const baseMap = { EASY: 24, NORMAL: 31, HARD: 39, EXTREME: 47 };
      const styleMap = {
        dnb: 1.04,
        hardstyle: 1.03,
        hyperpop: 1.02,
        phonk: 1.01,
        disco: 0.96,
        synthwave: 0.97,
        bounce: 0.98
      };
      const base = baseMap[difficulty] || 31;
      const bpm = Number(song && song.bpm) || 135;
      const bpmFactor = Math.max(0.88, Math.min(1.24, Math.pow(bpm / 135, 0.72)));
      const styleFactor = (song && styleMap[song.style]) || 1.0;
      const safeUserMult = Math.max(0.75, Math.min(1.6, Number(userMult) || 1.0));
      const modMult = speed125Mod ? 1.25 : 1.0;
      const approachSpeed = Number((base * bpmFactor * styleFactor * safeUserMult * modMult).toFixed(2));
      const reactionSec = Number((82 / approachSpeed).toFixed(2));
      return { approachSpeed, reactionSec, bpmFactor, styleFactor };
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

      // High-Contrast Beat Saber 3D Cube Front-Face Textures (Tap ▼ / SwipeL ◀ / SwipeR ▶)
      const makeBeatCubeFaceTex = (kind) => {
        const c = document.createElement('canvas');
        c.width = 256; c.height = 256;
        const g = c.getContext('2d');
        const isTap = kind === 'tap';
        const isL = kind === 'swipeL';
        const neon = isTap ? '#ffd84d' : (isL ? '#00f2ff' : '#ff2bd6');
        const bgGrad = g.createLinearGradient(0, 0, 256, 256);
        bgGrad.addColorStop(0, isTap ? '#13274a' : (isL ? '#082c46' : '#3d0b36'));
        bgGrad.addColorStop(1, '#070b1a');
        g.fillStyle = bgGrad;
        g.fillRect(0, 0, 256, 256);

        // Glowing Neon Frame
        g.strokeStyle = neon;
        g.lineWidth = 14;
        g.shadowColor = neon;
        g.shadowBlur = 22;
        g.strokeRect(14, 14, 228, 228);

        // Inner Core Emblem / Directional Chevron Arrow
        g.fillStyle = '#ffffff';
        g.shadowColor = neon;
        g.shadowBlur = 26;
        g.beginPath();
        if (isTap) {
          // Crisp Glowing Diamond + Downward Strike Chevron
          g.moveTo(128, 48); g.lineTo(202, 128); g.lineTo(128, 208); g.lineTo(54, 128);
          g.closePath();
          g.fillStyle = neon;
          g.fill();
          g.beginPath();
          g.moveTo(128, 78); g.lineTo(170, 128); g.lineTo(128, 178); g.lineTo(86, 128);
          g.closePath();
          g.fillStyle = '#ffffff';
          g.fill();
        } else if (isL) {
          g.moveTo(56, 128); g.lineTo(186, 56); g.lineTo(156, 128); g.lineTo(186, 200);
          g.closePath();
          g.fill();
        } else {
          g.moveTo(200, 128); g.lineTo(70, 56); g.lineTo(100, 128); g.lineTo(70, 200);
          g.closePath();
          g.fill();
        }
        const tex = new THREE.CanvasTexture(c);
        tex.needsUpdate = true;
        return tex;
      };

      this.texOrb = makeBeatCubeFaceTex('tap');
      this.texSwipeL = makeBeatCubeFaceTex('swipeL');
      this.texSwipeR = makeBeatCubeFaceTex('swipeR');

      // Shared Beat Saber 3D Volumetric Note Geometries & Materials
      this.sharedTapBoxGeo = new THREE.BoxGeometry(1.08, 1.08, 1.08);
      this.sharedTapEdgeGeo = new THREE.EdgesGeometry(this.sharedTapBoxGeo);
      this.sharedTapCoreGeo = new THREE.OctahedronGeometry(0.44, 0);
      this.sharedTapFaceGeo = new THREE.PlaneGeometry(1.04, 1.04);
      this.sharedSwipeBoxGeo = new THREE.BoxGeometry(1.36, 1.02, 0.86);
      this.sharedSwipeEdgeGeo = new THREE.EdgesGeometry(this.sharedSwipeBoxGeo);
      this.sharedSwipeFaceGeo = new THREE.PlaneGeometry(1.32, 0.98);
      this.sharedDebrisGeo = new THREE.BoxGeometry(0.52, 0.92, 0.78);
      this.sharedBurstGeo = new THREE.RingGeometry(0.38, 1.38, 24);

      this.matTapBody = new THREE.MeshStandardMaterial({ color: 0x162447, metalness: 0.78, roughness: 0.2, emissive: 0x124c78, emissiveIntensity: 0.9 });
      this.matTapEdge = new THREE.LineBasicMaterial({ color: 0xffd84d });
      this.matTapCore = new THREE.MeshBasicMaterial({ color: 0xffd84d, transparent: true, opacity: 0.92 });
      this.matTapFace = new THREE.MeshBasicMaterial({ map: this.texOrb, transparent: true, depthWrite: false, side: THREE.DoubleSide });

      this.matSwipeLBody = new THREE.MeshStandardMaterial({ color: 0x09243a, metalness: 0.8, roughness: 0.22, emissive: 0x006e8c, emissiveIntensity: 0.8 });
      this.matSwipeLEdge = new THREE.LineBasicMaterial({ color: 0x00f2ff });
      this.matSwipeL = new THREE.MeshBasicMaterial({ map: this.texSwipeL, transparent: true, depthWrite: false, side: THREE.DoubleSide });

      this.matSwipeRBody = new THREE.MeshStandardMaterial({ color: 0x360a2e, metalness: 0.8, roughness: 0.22, emissive: 0x8f0d66, emissiveIntensity: 0.8 });
      this.matSwipeREdge = new THREE.LineBasicMaterial({ color: 0xff2bd6 });
      this.matSwipeR = new THREE.MeshBasicMaterial({ map: this.texSwipeR, transparent: true, depthWrite: false, side: THREE.DoubleSide });
      this.splitDebris = [];
      this.camShake = 0;
      this.fovPunchTimer = 0;
      this.baseFov = 60;

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

      // Neon Hologram Receiver Pads (Hexagonal Outer Ring + Inner Glowing Core + Vertical Holo-Ring)
      const outerPadGeo = new THREE.RingGeometry(0.56, 0.76, 6);
      const innerPadGeo = new THREE.CircleGeometry(0.46, 6);
      const socketMat = new THREE.MeshBasicMaterial({
        color: 0x00f2ff, side: THREE.DoubleSide, transparent: true, opacity: 0.92, depthWrite: false
      });
      const innerMat = new THREE.MeshBasicMaterial({
        color: 0x70f8ff, side: THREE.DoubleSide, transparent: true, opacity: 0.28, depthWrite: false
      });
      this.laneSockets = [];
      this.lanePulse = [0, 0, 0];
      for (const laneX of [-2.15, 0, 2.15]) {
        const padGroup = new THREE.Group();
        const outer = new THREE.Mesh(outerPadGeo, socketMat);
        outer.rotation.x = -Math.PI / 2;
        outer.renderOrder = 4;
        const inner = new THREE.Mesh(innerPadGeo, innerMat);
        inner.rotation.x = -Math.PI / 2;
        inner.position.y = 0.01;
        inner.renderOrder = 4;
        padGroup.add(outer, inner);
        padGroup.material = socketMat;
        padGroup.position.set(laneX, 0.11, 0);
        this.scene.add(padGroup);
        this.laneSockets.push(padGroup);
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

      // Ground Reflection Shadow + Neon Hover-Skate Ring under Runner
      const shadowDisc = new THREE.Mesh(
        new THREE.CircleGeometry(0.92, 24),
        new THREE.MeshBasicMaterial({ color: 0x020410, transparent: true, opacity: 0.62, depthWrite: false })
      );
      shadowDisc.rotation.x = -Math.PI * 0.5;
      shadowDisc.position.y = 0.02;
      this.runnerHoverMat = new THREE.MeshBasicMaterial({ color: 0x00f2ff, transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide });
      const groundDisc = new THREE.Mesh(
        new THREE.RingGeometry(0.58, 0.96, 32),
        this.runnerHoverMat
      );
      groundDisc.rotation.x = -Math.PI * 0.5;
      groundDisc.position.y = 0.035;
      groundDisc.renderOrder = 3;
      this.runnerGroup.add(shadowDisc, groundDisc);

      // High-Res 5-Pose Transparent RGBA Runner Sprites (Luna / Kai / Aria: run1, run2, slash_l, slash_r, slash_x)
      const loader = new THREE.TextureLoader();
      this.runnerPoseTextures = {};
      for (const cid of ['luna', 'kai', 'aria']) {
        this.runnerPoseTextures[cid] = {
          run1:    loader.load(`./assets/characters/runner_${cid}_run1.png`),
          run2:    loader.load(`./assets/characters/runner_${cid}_run2.png`),
          slash_l: loader.load(`./assets/characters/runner_${cid}_slash_l.png`),
          slash_r: loader.load(`./assets/characters/runner_${cid}_slash_r.png`),
          slash_x: loader.load(`./assets/characters/runner_${cid}_slash_x.png`)
        };
      }
      this.currentRunnerPose = 'run1';
      this.lastSlashPose = 'slash_l';
      this.saberSkinSpec = SABER_SKINS.neon_plasma;

      this.runnerSpriteMat = new THREE.SpriteMaterial({
        map: this.runnerPoseTextures.luna.run1,
        transparent: true,
        alphaTest: 0.04,
        depthWrite: false
      });
      this.runnerSprite = new THREE.Sprite(this.runnerSpriteMat);
      this.runnerSprite.scale.set(3.35, 3.35, 1);
      this.runnerSprite.position.set(0, 1.62, 0);
      this.runnerSprite.renderOrder = 8;
      this.runnerGroup.add(this.runnerSprite);

      // 2 Neon Afterimage Ghost Sprites for dash / slash / fever motion trails
      this.runnerAfterimages = [];
      this.afterimageTrail = [];
      for (let g = 0; g < 2; g++) {
        const gMat = new THREE.SpriteMaterial({
          map: this.runnerPoseTextures.luna.run1,
          color: 0x00f2ff,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const gSprite = new THREE.Sprite(gMat);
        gSprite.scale.set(3.25 - g * 0.14, 3.25 - g * 0.14, 1);
        gSprite.position.set(0, 1.62, 0.65 + (g + 1) * 0.45);
        gSprite.renderOrder = 6 - g;
        this.scene.add(gSprite);
        this.runnerAfterimages.push({ sprite: gSprite, mat: gMat });
      }

      // Dual-Layer 3D Neon Crescent Slash Arc VFX (Outer Colored Glow + Inner White-Hot Core)
      const arcGeo = new THREE.RingGeometry(1.12, 1.98, 28, 1, -Math.PI * 0.44, Math.PI * 0.88);
      this.slashArcMat = new THREE.MeshBasicMaterial({
        color: 0x00f2ff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      this.slashArcMesh = new THREE.Mesh(arcGeo, this.slashArcMat);
      this.slashArcMesh.position.set(0, 1.35, -0.55);
      this.slashArcMesh.renderOrder = 9;
      const coreArcGeo = new THREE.RingGeometry(1.38, 1.64, 24, 1, -Math.PI * 0.36, Math.PI * 0.72);
      this.slashCoreMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      this.slashCoreMesh = new THREE.Mesh(coreArcGeo, this.slashCoreMat);
      this.slashCoreMesh.position.z = -0.02;
      this.slashCoreMesh.renderOrder = 10;
      this.slashArcMesh.add(this.slashCoreMesh);
      this.runnerGroup.add(this.slashArcMesh);

      // Dummy animation pivots kept for API parity with tests/swing hooks
      this.leftLeg = new THREE.Group();
      this.rightLeg = new THREE.Group();
      this.leftArmPivot = new THREE.Group();
      this.rightArmPivot = new THREE.Group();
      this.stickMat = new THREE.MeshBasicMaterial({ color: 0xff2bd6 });
      this.stickGlowMat = new THREE.MeshBasicMaterial({ color: 0xff2bd6, transparent: true, opacity: 0.45, depthWrite: false });

      // Kai Sound Shield Ring / Fever Aura Ring around Runner
      const ringGeo = new THREE.TorusGeometry(1.12, 0.045, 10, 32);
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
    startSession({ song, difficulty, charId, autoFever = true, audioOffset = 0, vip = false, saberSkin = 'neon_plasma', noteSpeedMult = 1.0 }) {
      this.initThree();
      this._clearNotes();

      this.sessionId = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : `${Date.now()}_${Math.random()}`;
      this.audioOffset = audioOffset;
      this.vipAura = vip;
      this.song = song;
      this.difficulty = difficulty;
      this.charSpec = CHAR_SPECS[charId] || CHAR_SPECS.luna;
      this.saberSkinSpec = SABER_SKINS[saberSkin] || SABER_SKINS.neon_plasma;
      this.autoFever = autoFever;
      this.noteSpeedMult = Math.max(0.75, Math.min(1.6, Number(noteSpeedMult) || 1.0));
      this.missRecoilTimer = 0;
      this.afterimageTrail = [];

      const mods = (window.Wave2LiveOps && window.Wave2LiveOps.state.activeModifiers) || {};
      const speedProfile = RhythmGame3D.computeNoteSpeed(song, difficulty, this.noteSpeedMult, !!mods.SPEED_125);
      this.approachSpeed = speedProfile.approachSpeed;
      this.hiddenMode = !!mods.HIDDEN;

      this.chart = window.AudioEngine.generateChart(song, difficulty);
      if (mods.MIRROR && this.chart && Array.isArray(this.chart.notes)) {
        this.chart.notes = this.chart.notes.map(n => ({
          ...n,
          lane: 2 - n.lane,
          type: n.type === 'swipeL' ? 'swipeR' : (n.type === 'swipeR' ? 'swipeL' : n.type)
        }));
      }
      this.nextMissIndex = 0;
      this.visibleStartIndex = 0;
      this.currentLane = 1;
      this.visualLaneX = 0;
      this.lanePulse = [0, 0, 0];
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

      // Bind 5-pose transparent RGBA sprites & equipped saber skin colors
      const activeStickHex = this.saberSkinSpec ? this.saberSkinSpec.primary : this.charSpec.stickColor;
      if (this.stickMat) this.stickMat.color.setHex(activeStickHex);
      if (this.stickGlowMat) this.stickGlowMat.color.setHex(activeStickHex);
      if (this.slashArcMat) {
        this.slashArcMat.color.setHex(activeStickHex);
        this.slashArcMat.opacity = 0;
      }
      this.shieldRing.material.color.setHex(this.saberSkinSpec ? this.saberSkinSpec.secondary : this.charSpec.auraColor);
      this.shieldRing.material.opacity = this.shieldLeft > 0 ? 0.55 : 0.0;
      if (this.runnerHoverMat) this.runnerHoverMat.color.setHex(activeStickHex);
      this.currentRunnerPose = 'run1';
      if (this.runnerSpriteMat && this.runnerPoseTextures) {
        const set = this.runnerPoseTextures[this.charSpec.id] || this.runnerPoseTextures.luna;
        this.runnerSpriteMat.map = set.run1;
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
        const group = new THREE.Group();
        if (note.type === 'tap') {
          const box = new THREE.Mesh(this.sharedTapBoxGeo, this.matTapBody);
          const edges = new THREE.LineSegments(this.sharedTapEdgeGeo, this.matTapEdge);
          const face = new THREE.Mesh(this.sharedTapFaceGeo, this.matTapFace);
          face.position.z = 0.56;
          group.add(box, edges, face);
        } else {
          const isLeft = note.type === 'swipeL';
          const box = new THREE.Mesh(this.sharedSwipeBoxGeo, isLeft ? this.matSwipeLBody : this.matSwipeRBody);
          const edges = new THREE.LineSegments(this.sharedSwipeEdgeGeo, isLeft ? this.matSwipeLEdge : this.matSwipeREdge);
          const face = new THREE.Mesh(this.sharedSwipeFaceGeo, isLeft ? this.matSwipeL : this.matSwipeR);
          face.position.z = 0.45;
          group.add(box, edges, face);
        }
        group.visible = false;
        group.renderOrder = 4;
        group.userData = { note };
        this.scene.add(group);
        return group;
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
      if (struck) {
        this._swingSticks(true);
      }

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
      if (window.Haptics) window.Haptics.trigger('fever');
      this.fovPunchTimer = 0.22;
      this.camShake = 0.24;
      this._spawnHitBurst(this.visualLaneX, 0xffd84d, true);
      if (this.callbacks.onFeverState) this.callbacks.onFeverState(true);
    }

    _swingSticks(isBigSwipe = false, preferredPose = null) {
      this.swingToggle = 1 - this.swingToggle;
      this.slashAnimTimer = 0.16; // Exact 160ms multi-frame slash pose hold
      if (preferredPose) {
        this.lastSlashPose = preferredPose;
      } else if (this.isFever || isBigSwipe) {
        this.lastSlashPose = this.isFever ? 'slash_x' : (this.swingToggle === 0 ? 'slash_l' : 'slash_r');
      } else {
        this.lastSlashPose = (this.swingToggle === 0) ? 'slash_l' : 'slash_r';
      }
      if (isBigSwipe) {
        this.leftArmPivot.rotation.x = -1.2;
        this.rightArmPivot.rotation.x = -1.2;
      } else if (this.swingToggle === 0) {
        this.leftArmPivot.rotation.x = -1.05;
      } else {
        this.rightArmPivot.rotation.x = -1.05;
      }
      if (this.slashArcMesh && this.slashArcMat) {
        const skin = this.saberSkinSpec || SABER_SKINS.neon_plasma;
        const hex = (this.lastSlashPose === 'slash_r') ? skin.secondary : skin.primary;
        this.slashArcMat.color.setHex(hex);
        this.slashArcMat.opacity = 0.92;
        this.slashArcMesh.rotation.z = this.lastSlashPose === 'slash_l' ? 0.65 : (this.lastSlashPose === 'slash_r' ? -0.65 : 0);
        this.slashArcMesh.scale.setScalar(this.lastSlashPose === 'slash_x' ? 1.38 : 1.05);
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
      if (this.lanePulse && candidate.lane >= 0 && candidate.lane <= 2) {
        this.lanePulse[candidate.lane] = 1.0;
      }
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
          this.missRecoilTimer = 0.22;
          window.AudioEngine.playMissSfx();
          if (window.Haptics) window.Haptics.trigger('miss');
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
      if (window.Haptics) {
        if (this.combo === 10 || this.combo === 25 || this.combo === 50 || this.combo === 100) {
          window.Haptics.trigger('combo');
        } else {
          window.Haptics.trigger(note.type === 'tap' ? 'tap' : 'swipe');
        }
      }
      if (grade === 'PERFECT') {
        this.fovPunchTimer = 0.12;
      }
      const isMilestone = (this.combo === 10 || this.combo === 25 || this.combo === 50 || this.combo === 100);
      const hitPose = (this.isFever || isMilestone || note.isRushBarrage)
        ? 'slash_x'
        : (note.type === 'swipeL' ? 'slash_l' : (note.type === 'swipeR' ? 'slash_r' : (this.swingToggle === 0 ? 'slash_l' : 'slash_r')));
      this._swingSticks(note.type !== 'tap' || hitPose === 'slash_x', hitPose);

      const skin = this.saberSkinSpec || SABER_SKINS.neon_plasma;
      const burstHex = (this.isFever || isMilestone) ? 0xffd84d : (hitPose === 'slash_r' ? skin.secondary : skin.primary);
      if (isMilestone) {
        this.fovPunchTimer = 0.24;
      }
      this._spawnHitBurst(this.visualLaneX, burstHex, isMilestone || hitPose === 'slash_x');

      if (this.callbacks.onJudgment) {
        this.callbacks.onJudgment({
          grade,
          combo: this.combo,
          score: this.score,
          hp: this.hp / this.charSpec.maxHp,
          feverGauge: this.feverGauge,
          isFever: this.isFever,
          totalMult: routeMult * feverMult,
          milestone: isMilestone ? this.combo : 0
        });
      }
    }

    _spawnHitBurst(x, hexColor, isBig = false) {
      this.camShake = isBig ? 0.22 : 0.14;
      if (typeof THREE === 'undefined' || !this.scene) return;
      const mat = new THREE.MeshBasicMaterial({ color: hexColor, transparent: true, opacity: 0.94, depthWrite: false, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(this.sharedBurstGeo, mat);
      ring.rotation.x = -Math.PI * 0.45;
      ring.position.set(x, 0.25, 0);
      ring.scale.setScalar(isBig ? 1.65 : 1.0);
      ring.renderOrder = 5;
      ring.userData = { life: isBig ? 0.36 : 0.28 };
      this.scene.add(ring);
      this.hitBursts.push(ring);

      // Escalating Beat Saber Split Cube Shatter Debris (2 -> 4 -> 6 pieces with combo) + Camera Shake
      this.camShake = isBig ? 0.22 : 0.14;
      const pairs = this.combo >= 25 ? 3 : (this.combo >= 10 ? 2 : 1);
      if (this.sharedDebrisGeo && this.splitDebris) {
        for (let p = 0; p < pairs; p++) {
          for (const side of [-1, 1]) {
            const dMat = new THREE.MeshStandardMaterial({ color: hexColor, emissive: hexColor, emissiveIntensity: 0.95, metalness: 0.6, roughness: 0.2, transparent: true, opacity: 0.95 });
            const piece = new THREE.Mesh(this.sharedDebrisGeo, dMat);
            piece.position.set(x + side * (0.28 + p * 0.14), 0.85 + p * 0.18, 0);
            piece.scale.setScalar(1.0 - p * 0.18);
            piece.userData = { vx: side * (4.6 + p * 1.4 + Math.random() * 2.4), vy: 4.0 + p * 1.1 + Math.random() * 2.2, vz: 2.5, life: 0.42 };
            this.scene.add(piece);
            this.splitDebris.push(piece);
          }
        }
      }
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

      // 3. Runner smooth lane dash, elastic squash-stretch stride, slash lunge & neon afterimages
      const laneWidth = 2.15;
      const targetX = (this.currentLane - 1) * laneWidth;
      const prevVisualX = this.visualLaneX;
      this.visualLaneX += (targetX - this.visualLaneX) * Math.min(1, dt * 16);
      const laneVel = Math.abs(this.visualLaneX - prevVisualX) / Math.max(0.001, dt);
      this.runnerGroup.position.x = this.visualLaneX;
      this.runnerGroup.rotation.z *= Math.pow(0.08, dt);

      const stridePhase = songTime * (this.song.bpm / 60) * Math.PI * 2;
      const strideHop = Math.abs(Math.sin(stridePhase));
      this.runnerGroup.position.y = 0.05 + strideHop * 0.13;
      this.leftLeg.rotation.x = Math.sin(stridePhase) * 0.65;
      this.rightLeg.rotation.x = -Math.sin(stridePhase) * 0.65;

      if (this.slashAnimTimer > 0) {
        this.slashAnimTimer = Math.max(0, this.slashAnimTimer - dt);
      }
      if (this.missRecoilTimer > 0) {
        this.missRecoilTimer = Math.max(0, this.missRecoilTimer - dt);
      }
      const slashProg = this.slashAnimTimer > 0 ? (1 - this.slashAnimTimer / 0.16) : 0;
      const slashPunch = this.slashAnimTimer > 0 ? Math.sin(slashProg * Math.PI) : 0;
      const recoilRatio = this.missRecoilTimer > 0 ? (this.missRecoilTimer / 0.22) : 0;

      // 5-Pose Multi-Frame State Machine + Elastic Squash-Stretch + Z-Lunge + Miss Recoil
      if (this.runnerSprite && this.runnerSpriteMat && this.runnerPoseTextures) {
        const poseSet = this.runnerPoseTextures[this.charSpec.id] || this.runnerPoseTextures.luna;
        const beatHalf = Math.floor(songTime * (this.song.bpm / 60) * 2) % 2;
        const desiredPose = this.slashAnimTimer > 0
          ? (this.lastSlashPose || 'slash_l')
          : (beatHalf === 0 ? 'run1' : 'run2');
        if (desiredPose !== this.currentRunnerPose && poseSet[desiredPose]) {
          this.currentRunnerPose = desiredPose;
          this.runnerSpriteMat.map = poseSet[desiredPose];
          this.runnerSpriteMat.needsUpdate = true;
        }
        const strideSquash = Math.cos(stridePhase * 2) * 0.055;
        const baseScale = 3.35 + slashPunch * 0.24;
        const sx = baseScale * (1 + strideSquash + recoilRatio * 0.09);
        const sy = baseScale * (1 - strideSquash - recoilRatio * 0.08);
        this.runnerSprite.scale.set(sx, sy, 1);
        this.runnerSprite.position.z = -slashPunch * 0.42 + recoilRatio * 0.34;
        const slashTilt = this.slashAnimTimer > 0
          ? (this.lastSlashPose === 'slash_l' ? 0.12 : (this.lastSlashPose === 'slash_r' ? -0.12 : 0)) * slashPunch
          : Math.sin(stridePhase) * 0.032;
        this.runnerSpriteMat.rotation = this.runnerGroup.rotation.z * 0.5 + slashTilt + recoilRatio * 0.16;
        if (recoilRatio > 0) {
          this.runnerSpriteMat.color.setHex(0xff7a90);
        } else if (this.isFever) {
          this.runnerSpriteMat.color.setHex(0xfff4cc);
        } else {
          this.runnerSpriteMat.color.setHex(0xffffff);
        }

        // Update 2 Neon Afterimage Ghosts during lane dash, slash, or Fever Overdrive
        if (this.runnerAfterimages && this.runnerAfterimages.length) {
          this.afterimageTrail.unshift({
            x: this.visualLaneX,
            y: this.runnerGroup.position.y + 1.62,
            pose: this.currentRunnerPose,
            rot: this.runnerSpriteMat.rotation
          });
          if (this.afterimageTrail.length > 8) this.afterimageTrail.length = 8;
          const showAfterimage = this.isFever || laneVel > 3.2 || this.slashAnimTimer > 0;
          const skin = this.saberSkinSpec || SABER_SKINS.neon_plasma;
          for (let g = 0; g < this.runnerAfterimages.length; g++) {
            const ghost = this.runnerAfterimages[g];
            const sample = this.afterimageTrail[Math.min(this.afterimageTrail.length - 1, (g + 1) * 3)];
            if (sample && showAfterimage) {
              const gTex = poseSet[sample.pose] || poseSet.run1;
              if (ghost.mat.map !== gTex) {
                ghost.mat.map = gTex;
                ghost.mat.needsUpdate = true;
              }
              ghost.sprite.position.set(sample.x, sample.y, 0.65 + (g + 1) * 0.46);
              ghost.mat.rotation = sample.rot;
              ghost.mat.color.setHex(this.isFever ? 0xffd84d : (g === 0 ? skin.primary : skin.secondary));
              ghost.mat.opacity = (this.isFever ? 0.46 : 0.34) * (1 - g * 0.38);
            } else {
              ghost.mat.opacity *= Math.pow(0.005, dt);
            }
          }
        }
      }
      // Animate Dual-Layer 3D Crescent Slash Arc VFX (with live rainbow cycling for rainbow_prism skin)
      if (this.slashArcMesh && this.slashArcMat) {
        if (this.saberSkinSpec && this.saberSkinSpec.rainbow) {
          this.slashArcMat.color.setHSL((songTime * 1.4) % 1, 1.0, 0.58);
          if (this.runnerHoverMat) this.runnerHoverMat.color.setHSL((songTime * 1.4) % 1, 1.0, 0.58);
        }
        if (this.slashAnimTimer > 0) {
          const p = 1 - (this.slashAnimTimer / 0.16);
          this.slashArcMat.opacity = Math.max(0, (1 - p) * 0.96);
          if (this.slashCoreMat) this.slashCoreMat.opacity = Math.max(0, (1 - p) * 0.92);
          this.slashArcMesh.rotation.z += dt * (this.lastSlashPose === 'slash_l' ? -15 : 15);
          this.slashArcMesh.scale.setScalar(1.0 + p * 0.62);
        } else {
          this.slashArcMat.opacity = 0;
          if (this.slashCoreMat) this.slashCoreMat.opacity = 0;
        }
      }

      // Subtle dynamic camera follow + micro hit-shake + PERFECT FOV zoom punch + Climax Finish Zoom
      let shakeX = 0, shakeY = 0;
      if (this.camShake > 0) {
        this.camShake = Math.max(0, this.camShake - dt);
        shakeX = (Math.random() - 0.5) * 0.22 * (this.camShake / 0.14);
        shakeY = (Math.random() - 0.5) * 0.16 * (this.camShake / 0.14);
      }
      const inSlowMoClimax = !!(this.chart && this.chart.slowMoStart && songTime >= this.chart.slowMoStart);
      if (this.camera) {
        let targetFov = (this.baseFov || 60) - (inSlowMoClimax ? 3.2 : 0);
        if (this.fovPunchTimer > 0) {
          this.fovPunchTimer = Math.max(0, this.fovPunchTimer - dt);
          targetFov -= 2.8 * Math.sin((this.fovPunchTimer / 0.12) * Math.PI * 0.5);
        }
        if (Math.abs(this.camera.fov - targetFov) > 0.05) {
          this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 24);
          this.camera.updateProjectionMatrix();
        }
      }
      this.camera.position.x = this.visualLaneX * 0.35 + shakeX;
      this.camera.position.y = 4.9 + shakeY;
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
        const worldY = base.y + (note.type === 'tap' ? 0.85 : 0.72);
        const worldZ = -zAhead;

        // Immediately cull & shrink missed notes past hit line (z > 1.35) so NO giant cube blocks bottom screen!
        if (worldZ > 1.35) {
          mesh.visible = false;
          continue;
        }
        // HIDDEN modifier: smoothly shrink & cloak notes as they enter the final 16 units before hit line
        if (this.hiddenMode && zAhead < 9.5 && worldZ <= 0.1) {
          mesh.visible = false;
          continue;
        }
        const hiddenScale = (this.hiddenMode && zAhead < 19) ? Math.max(0.15, (zAhead - 9.5) / 9.5) : 1.0;
        const passFade = (worldZ > 0.25 ? Math.max(0.05, 1.0 - (worldZ - 0.25) / 1.1) : 1.0) * hiddenScale;

        mesh.position.set(worldX, worldY, worldZ);
        if (note.type === 'tap') {
          const pulse = (1.0 + Math.sin(songTime * 10 + i) * 0.06) * passFade;
          mesh.scale.set(pulse, pulse, pulse);
          // Keep glowing Beat Saber front face oriented toward player with gentle hover tilt
          mesh.rotation.y = Math.sin(songTime * 2.4 + i) * 0.16;
          mesh.rotation.x = Math.sin(songTime * 2.0 + i) * 0.1;
        } else {
          mesh.scale.set(passFade, passFade, passFade);
        }
        mesh.visible = true;
      }

      // 5. Animate Hit Bursts, 2-Piece Split Cube Debris & Equalizer Skyline Towers
      if (this.splitDebris && this.splitDebris.length) {
        for (let i = this.splitDebris.length - 1; i >= 0; i--) {
          const p = this.splitDebris[i];
          p.userData.life -= dt;
          if (p.userData.life <= 0) {
            this.scene.remove(p);
            if (p.material) p.material.dispose();
            this.splitDebris.splice(i, 1);
          } else {
            p.position.x += p.userData.vx * dt;
            p.position.y += p.userData.vy * dt;
            p.position.z += p.userData.vz * dt;
            p.userData.vy -= 14 * dt;
            p.rotation.x += dt * 9;
            p.rotation.z += dt * 7;
            p.material.opacity = Math.max(0, p.userData.life / 0.42);
          }
        }
      }
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
      if (this.laneSockets && this.laneSockets.length) {
        this.laneSockets[0].material.color.setHex(this.isFever ? 0xffd84d : 0xf1faff);
        for (let i = 0; i < this.laneSockets.length; i++) {
          if (this.lanePulse && this.lanePulse[i] > 0) {
            this.lanePulse[i] = Math.max(0, this.lanePulse[i] - dt * 6.5);
          }
          const p = this.lanePulse ? this.lanePulse[i] : 0;
          const sc = 1 + 0.35 * p;
          this.laneSockets[i].scale.set(sc, sc, 1);
        }
      }

      if (this.callbacks.onFrameUpdate) {
        const activeRouteMult = (this.chosenBranch === 'rush' && songTime <= this.chart.branchEnd) ? this.charSpec.rushBranchMult : 1.0;
        const inRushBarrage = !!(this.chart.rushStart && songTime >= this.chart.rushStart && songTime <= this.chart.rushEnd);
        const inSlowMoFinish = !!(this.chart.slowMoStart && songTime >= this.chart.slowMoStart);
        this.callbacks.onFrameUpdate({
          songTime,
          duration: this.song.duration,
          score: this.score,
          feverGauge: this.feverGauge,
          isFever: this.isFever,
          showBranchPrompt,
          previewRushSelected,
          rushMult: this.charSpec.rushBranchMult,
          totalMult: activeRouteMult * (this.isFever ? 2.0 : 1.0) * (inRushBarrage ? 1.5 : 1.0),
          inRushBarrage,
          inSlowMoFinish
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
