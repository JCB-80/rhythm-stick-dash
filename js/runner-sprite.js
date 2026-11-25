// High-Resolution 10-Frame Illustrated Anime Cyberpunk Runner Sprite Generator (Luna / Kai / Aria)
// Draws smooth Bezier cel-shaded 3/4 rear sprinting animations + Left/Right twin neon stick slash poses
(function () {
  const THEMES = {
    luna: {
      hairDark: '#231344',
      hairMain: '#d929b8',
      hairStreak: '#00f2ff',
      jacketDark: '#131029',
      jacketMid: '#261e4b',
      jacketTrim: '#ff2bd6',
      emblemColor: '#ff3ce6',
      pantsDark: '#100e24',
      pantsHighlight: '#38306b',
      stickCore: '#ffffff',
      stickGlow: '#ff2bd6',
      jetCore: '#ffffff',
      jetOuter: '#00f2ff',
      style: 'luna'
    },
    kai: {
      hairDark: '#0b2239',
      hairMain: '#1ad9ff',
      hairStreak: '#9cf6ff',
      jacketDark: '#0e162b',
      jacketMid: '#1c2d52',
      jacketTrim: '#00f2ff',
      emblemColor: '#00f2ff',
      pantsDark: '#0d1324',
      pantsHighlight: '#273c69',
      stickCore: '#ffffff',
      stickGlow: '#00f2ff',
      jetCore: '#ffffff',
      jetOuter: '#2affb2',
      style: 'kai'
    },
    aria: {
      hairDark: '#241242',
      hairMain: '#7c3aed',
      hairStreak: '#ffd84d',
      jacketDark: '#242038',
      jacketMid: '#e6e1f7',
      jacketTrim: '#ffd84d',
      emblemColor: '#ffd84d',
      pantsDark: '#171329',
      pantsHighlight: '#4a3d75',
      stickCore: '#ffffff',
      stickGlow: '#ffd84d',
      jetCore: '#ffffff',
      jetOuter: '#ffae00',
      style: 'aria'
    }
  };

  function drawGlowingStick(g, hx, hy, tipX, tipY, glowColor, isSlash) {
    g.save();
    g.lineCap = 'round';

    // Outer neon bloom
    g.shadowColor = glowColor;
    g.shadowBlur = isSlash ? 34 : 22;
    g.strokeStyle = glowColor;
    g.lineWidth = isSlash ? 18 : 13;
    g.beginPath();
    g.moveTo(hx, hy);
    g.lineTo(tipX, tipY);
    g.stroke();

    // Mid plasma sheath
    g.shadowBlur = 10;
    g.strokeStyle = glowColor;
    g.lineWidth = isSlash ? 10 : 7.5;
    g.beginPath();
    g.moveTo(hx, hy);
    g.lineTo(tipX, tipY);
    g.stroke();

    // White-hot inner core
    g.shadowBlur = 0;
    g.strokeStyle = '#ffffff';
    g.lineWidth = isSlash ? 5 : 3.6;
    g.beginPath();
    g.moveTo(hx, hy);
    g.lineTo(tipX, tipY);
    g.stroke();

    // Hilt & cyber guard
    const dx = tipX - hx, dy = tipY - hy;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    g.strokeStyle = '#1b1936';
    g.lineWidth = 8.5;
    g.beginPath();
    g.moveTo(hx - ux * 20, hy - uy * 20);
    g.lineTo(hx + ux * 6, hy + uy * 6);
    g.stroke();

    // Sparks around blade tip
    g.fillStyle = '#fff6b8';
    for (let i = 0; i < (isSlash ? 7 : 3); i++) {
      const t = 0.55 + (i * 0.13) % 0.45;
      const ox = ((i % 2 === 0) ? 1 : -1) * (6 + (i * 3));
      const oy = ((i % 3 === 0) ? -1 : 1) * (5 + i * 2);
      g.beginPath();
      g.arc(hx + dx * t + ox, hy + dy * t + oy, isSlash ? 2.8 : 2.0, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }

  function drawJetSneaker(g, ankleX, ankleY, scale, theme, thrustPower) {
    g.save();
    g.translate(ankleX, ankleY);
    g.scale(scale, scale);

    // Neon Jet Thruster Plume shooting downward-back
    const grad = g.createLinearGradient(0, 8, -10, 78 * thrustPower);
    grad.addColorStop(0, theme.jetCore);
    grad.addColorStop(0.35, theme.jetOuter);
    grad.addColorStop(0.75, theme.jacketTrim + '88');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(-13, 12);
    g.quadraticCurveTo(-22, 42 * thrustPower, -6, 82 * thrustPower);
    g.quadraticCurveTo(16, 46 * thrustPower, 14, 12);
    g.closePath();
    g.fill();

    // Chunky Cyber High-Top Sneaker Body
    g.fillStyle = '#16132e';
    g.strokeStyle = theme.jetOuter;
    g.lineWidth = 2.6;
    g.beginPath();
    g.moveTo(-14, -12);
    g.lineTo(14, -12);
    g.quadraticCurveTo(22, 6, 18, 18);
    g.lineTo(-16, 18);
    g.quadraticCurveTo(-20, 4, -14, -12);
    g.closePath();
    g.fill();
    g.stroke();

    // Glowing Neon Sole Bar
    g.fillStyle = theme.jacketTrim;
    g.shadowColor = theme.jacketTrim;
    g.shadowBlur = 10;
    g.fillRect(-16, 13, 34, 6);
    g.restore();
  }

  function drawLegLimb(g, hipX, hipY, kneeX, kneeY, ankleX, ankleY, footScale, theme, isFront) {
    g.save();
    // Thigh -> Calf tapered silhouette
    g.lineCap = 'round';
    g.lineJoin = 'round';

    // Outer dark outline
    g.strokeStyle = '#070514';
    g.lineWidth = isFront ? 34 : 30;
    g.beginPath();
    g.moveTo(hipX, hipY);
    g.lineTo(kneeX, kneeY);
    g.stroke();

    g.lineWidth = isFront ? 25 : 22;
    g.beginPath();
    g.moveTo(kneeX, kneeY);
    g.lineTo(ankleX, ankleY);
    g.stroke();

    // Pants base fill
    g.strokeStyle = theme.pantsDark;
    g.lineWidth = isFront ? 29 : 25;
    g.beginPath();
    g.moveTo(hipX, hipY);
    g.lineTo(kneeX, kneeY);
    g.stroke();

    g.lineWidth = isFront ? 20 : 17;
    g.beginPath();
    g.moveTo(kneeX, kneeY);
    g.lineTo(ankleX, ankleY);
    g.stroke();

    // Cel-shaded athletic highlight along outer leg
    g.strokeStyle = theme.pantsHighlight;
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(hipX + (isFront ? 5 : -4), hipY + 6);
    g.lineTo(kneeX + (isFront ? 4 : -3), kneeY);
    g.lineTo(ankleX + (isFront ? 3 : -2), ankleY - 6);
    g.stroke();

    // Glowing cyber neon circuit piping down leg
    g.strokeStyle = theme.jetOuter;
    g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(hipX, hipY + 8);
    g.lineTo(kneeX, kneeY);
    g.lineTo(ankleX, ankleY - 8);
    g.stroke();

    drawJetSneaker(g, ankleX, ankleY, footScale, theme, isFront ? 1.15 : 0.85);
    g.restore();
  }

  function drawArmSleeve(g, shX, shY, elX, elY, handX, handY, theme) {
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';

    g.strokeStyle = '#080618';
    g.lineWidth = 22;
    g.beginPath();
    g.moveTo(shX, shY);
    g.lineTo(elX, elY);
    g.lineTo(handX, handY);
    g.stroke();

    g.strokeStyle = theme.jacketMid;
    g.lineWidth = 17;
    g.beginPath();
    g.moveTo(shX, shY);
    g.lineTo(elX, elY);
    g.stroke();

    // Forearm cyber gauntlet / fingerless glove
    g.strokeStyle = theme.jacketDark;
    g.lineWidth = 14;
    g.beginPath();
    g.moveTo(elX, elY);
    g.lineTo(handX, handY);
    g.stroke();

    // Neon cuff ring
    g.strokeStyle = theme.jacketTrim;
    g.lineWidth = 3;
    g.beginPath();
    g.arc(handX, handY, 6, 0, Math.PI * 2);
    g.stroke();
    g.restore();
  }

  function drawAnimeHair(g, cx, cy, phaseSin, phaseCos, theme) {
    g.save();
    g.translate(cx, cy);

    // Base cranial volume
    const headGrad = g.createLinearGradient(-34, -42, 34, 38);
    headGrad.addColorStop(0, theme.hairStreak);
    headGrad.addColorStop(0.38, theme.hairMain);
    headGrad.addColorStop(1, theme.hairDark);

    g.fillStyle = headGrad;
    g.strokeStyle = '#09061a';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(0, -4, 34, 0, Math.PI * 2);
    g.fill();
    g.stroke();

    if (theme.style === 'kai') {
      // Spiky dynamic anime boy hair + glowing cyan headphones on neck
      const spikes = [
        [-30, -14, -52, -26, -24, -32],
        [-18, -32, -34, -58, -4, -38],
        [0, -36, 8, -64, 18, -34],
        [18, -28, 48, -46, 30, -12],
        [-28, 4, -54, 16 + phaseSin * 6, -16, 22],
        [26, 4, 52, 18 - phaseSin * 6, 16, 22]
      ];
      g.fillStyle = headGrad;
      spikes.forEach(([x1, y1, tx, ty, x2, y2]) => {
        g.beginPath();
        g.moveTo(x1, y1);
        g.quadraticCurveTo((x1 + tx) * 0.5, ty, tx, ty);
        g.quadraticCurveTo((x2 + tx) * 0.5, ty + 8, x2, y2);
        g.closePath();
        g.fill();
        g.stroke();
      });
      // Glowing Cyan Headphones resting on collar
      g.strokeStyle = '#00f2ff';
      g.lineWidth = 4;
      g.beginPath();
      g.arc(-28, 28, 11, 0, Math.PI * 2);
      g.arc(28, 28, 11, 0, Math.PI * 2);
      g.stroke();
    } else {
      // Flowing layered anime girl hair strands (Luna pink+cyan / Aria violet+gold)
      const strandCount = 9;
      for (let i = 0; i < strandCount; i++) {
        const t = (i / (strandCount - 1)) - 0.5; // -0.5 .. 0.5
        const startX = t * 52;
        const startY = -10 + Math.abs(t) * 14;
        const sway = phaseSin * (12 + Math.abs(t) * 10) + (i % 2 === 0 ? 4 : -4);
        const endX = t * 82 + sway - 10; // Swept slightly left like reference sprint!
        const endY = 44 + (1 - Math.abs(t)) * 22 + phaseCos * 5;

        g.fillStyle = (i === 2 || i === 6) ? theme.hairStreak : (i % 2 === 0 ? theme.hairMain : theme.hairDark);
        g.beginPath();
        g.moveTo(startX - 9, startY);
        g.quadraticCurveTo(startX - 14 + sway * 0.4, (startY + endY) * 0.5, endX, endY);
        g.quadraticCurveTo(startX + 10 + sway * 0.4, (startY + endY) * 0.5, startX + 9, startY);
        g.closePath();
        g.fill();
        g.stroke();
      }

      // Glossy anime hair halo highlight arc
      g.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      g.lineWidth = 4;
      g.beginPath();
      g.arc(-4, -10, 22, Math.PI * 1.15, Math.PI * 1.82);
      g.stroke();
    }

    g.restore();
  }

  function renderFrameCanvas(charId, frameIndex, slashMode) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 640;
    const g = c.getContext('2d');
    const theme = THEMES[charId] || THEMES.luna;

    const phase = (frameIndex / 8) * Math.PI * 2;
    const s = Math.sin(phase);
    const co = Math.cos(phase);

    // Dynamic forward-leaning athletic torso center
    const bobY = Math.abs(s) * -14;
    const cx = 256;
    const shoulderY = 238 + bobY;
    const hipY = 362 + bobY;

    // 1. Swing Sticks BEHIND or IN FRONT depending on slash/stride
    let lHandX = cx - 98 - s * 18;
    let lHandY = shoulderY + 46 + s * 22;
    let lTipX = cx - 210 - s * 16;
    let lTipY = shoulderY + 108 + s * 18;

    let rHandX = cx + 96 + s * 18;
    let rHandY = shoulderY + 34 - s * 22;
    let rTipX = cx + 195 + s * 16;
    let rTipY = shoulderY - 62 - s * 18;

    if (slashMode === 'left') {
      lHandX = cx - 125; lHandY = shoulderY - 12;
      lTipX = cx - 238; lTipY = shoulderY - 118;
    } else if (slashMode === 'right') {
      rHandX = cx + 128; rHandY = shoulderY - 16;
      rTipX = cx + 240; rTipY = shoulderY - 124;
    }

    // Optional neon slash crescent arc during active strike
    if (slashMode) {
      g.save();
      g.strokeStyle = theme.stickGlow;
      g.shadowColor = theme.stickGlow;
      g.shadowBlur = 28;
      g.lineWidth = 10;
      g.beginPath();
      if (slashMode === 'left') {
        g.arc(cx - 30, shoulderY + 10, 175, Math.PI * 0.92, Math.PI * 1.48);
      } else {
        g.arc(cx + 30, shoulderY + 10, 175, Math.PI * 1.52, Math.PI * 2.08);
      }
      g.stroke();
      g.restore();
    }

    drawGlowingStick(g, lHandX, lHandY, lTipX, lTipY, theme.stickGlow, slashMode === 'left');
    drawGlowingStick(g, rHandX, rHandY, rTipX, rTipY, theme.stickGlow, slashMode === 'right');

    // 2. Sprinting Legs (True alternating foreshortened depth!)
    // Left leg vs Right leg stride cycle
    const lStride = s;       // -1 (extended back/down) .. +1 (knee lifted forward/up)
    const rStride = -s;

    const makeLegCoords = (side, strideVal) => {
      const hx = cx + side * 24;
      const hy = hipY;
      // When strideVal > 0, leg is driving forward into screen (higher Y, smaller scale); when < 0, pushing off close to camera!
      const kx = hx + side * (10 + strideVal * 6);
      const ky = hy + 68 - strideVal * 26;
      const ax = hx + side * (16 - strideVal * 4);
      const ay = hy + 148 - strideVal * 54;
      const fScale = 0.92 - strideVal * 0.14;
      return { hx, hy, kx, ky, ax, ay, fScale, depth: -strideVal };
    };

    const legL = makeLegCoords(-1, lStride);
    const legR = makeLegCoords(1, rStride);

    // Draw farther leg first, closer leg second for proper overlap!
    if (legL.depth < legR.depth) {
      drawLegLimb(g, legL.hx, legL.hy, legL.kx, legL.ky, legL.ax, legL.ay, legL.fScale, theme, false);
      drawLegLimb(g, legR.hx, legR.hy, legR.kx, legR.ky, legR.ax, legR.ay, legR.fScale, theme, true);
    } else {
      drawLegLimb(g, legR.hx, legR.hy, legR.kx, legR.ky, legR.ax, legR.ay, legR.fScale, theme, false);
      drawLegLimb(g, legL.hx, legL.hy, legL.kx, legL.ky, legL.ax, legL.ay, legL.fScale, theme, true);
    }

    // 3. Arms & Sleeves
    drawArmSleeve(g, cx - 44, shoulderY + 10, cx - 76, shoulderY + 32, lHandX, lHandY, theme);
    drawArmSleeve(g, cx + 44, shoulderY + 10, cx + 76, shoulderY + 24, rHandX, rHandY, theme);

    // 4. Sculpted Pelvis / Hip & Dangling Cyber Belt Strap (matches gameplay_01_easy.png!)
    g.save();
    g.fillStyle = theme.pantsDark;
    g.strokeStyle = '#070514';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(cx - 32, hipY - 22);
    g.lineTo(cx + 32, hipY - 22);
    g.quadraticCurveTo(cx + 42, hipY + 8, cx + 30, hipY + 22);
    g.lineTo(cx - 30, hipY + 22);
    g.quadraticCurveTo(cx - 42, hipY + 8, cx - 32, hipY - 22);
    g.closePath();
    g.fill();
    g.stroke();

    // Cyber Belt + Dangling Hip Loop Strap
    g.strokeStyle = theme.jacketTrim;
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(cx - 34, hipY - 16);
    g.lineTo(cx + 34, hipY - 16);
    g.stroke();

    g.strokeStyle = theme.hairStreak;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(cx - 32, hipY - 14);
    g.quadraticCurveTo(cx - 64 - co * 8, hipY + 26, cx - 38, hipY + 42);
    g.stroke();

    // 5. Cropped Cyber-Leather Jacket with Popped Neon Collar & Glowing Back Crest
    const jGrad = g.createLinearGradient(cx - 50, shoulderY - 18, cx + 50, hipY - 20);
    jGrad.addColorStop(0, theme.jacketMid);
    jGrad.addColorStop(1, theme.jacketDark);
    g.fillStyle = jGrad;
    g.strokeStyle = '#070514';
    g.lineWidth = 3.5;

    g.beginPath();
    // Popped collar top -> wide shoulders -> tapered waist
    g.moveTo(cx - 26, shoulderY - 24);
    g.lineTo(cx + 26, shoulderY - 24);
    g.lineTo(cx + 52, shoulderY + 6);
    g.lineTo(cx + 36, hipY - 24);
    g.lineTo(cx - 36, hipY - 24);
    g.lineTo(cx - 52, shoulderY + 6);
    g.closePath();
    g.fill();
    g.stroke();

    // Neon Collar Trim & Jacket Hem
    g.strokeStyle = theme.jacketTrim;
    g.shadowColor = theme.jacketTrim;
    g.shadowBlur = 12;
    g.lineWidth = 3.5;
    g.beginPath();
    g.moveTo(cx - 28, shoulderY - 23);
    g.lineTo(cx + 28, shoulderY - 23);
    g.moveTo(cx - 35, hipY - 24);
    g.lineTo(cx + 35, hipY - 24);
    g.stroke();

    // Glowing Cyber Heart / Sound-Crest Emblem on Back of Jacket!
    g.strokeStyle = theme.emblemColor;
    g.shadowColor = theme.emblemColor;
    g.shadowBlur = 16;
    g.lineWidth = 3.2;
    const ey = shoulderY + 34;
    g.beginPath();
    if (theme.style === 'luna') {
      // Neon Cyber Heart-Diamond Crest (exact match to Luna's back in gameplay_01_easy.png!)
      g.moveTo(cx, ey + 18);
      g.lineTo(cx - 18, ey - 2);
      g.lineTo(cx - 9, ey - 12);
      g.lineTo(cx, ey - 4);
      g.lineTo(cx + 9, ey - 12);
      g.lineTo(cx + 18, ey - 2);
      g.closePath();
    } else if (theme.style === 'kai') {
      // Cyan Sound-Shield Hex Crest
      g.moveTo(cx, ey - 16);
      g.lineTo(cx + 18, ey - 5);
      g.lineTo(cx + 14, ey + 15);
      g.lineTo(cx, ey + 22);
      g.lineTo(cx - 14, ey + 15);
      g.lineTo(cx - 18, ey - 5);
      g.closePath();
    } else {
      // Aria Golden Valkyrie Wings Crest
      g.moveTo(cx, ey + 16);
      g.lineTo(cx - 24, ey - 12);
      g.lineTo(cx - 6, ey - 4);
      g.lineTo(cx, ey - 18);
      g.lineTo(cx + 6, ey - 4);
      g.lineTo(cx + 24, ey - 12);
      g.closePath();
    }
    g.stroke();
    g.restore();

    // 6. Layered Anime Hair with Stride Wind Sway
    drawAnimeHair(g, cx, shoulderY - 38, s, co, theme);

    return c;
  }

  const cache = {};

  window.RunnerSpriteBank = {
    getFrames(charId) {
      const key = THEMES[charId] ? charId : 'luna';
      if (!cache[key]) {
        const run = [];
        for (let i = 0; i < 8; i++) {
          run.push(new THREE.CanvasTexture(renderFrameCanvas(key, i, null)));
        }
        cache[key] = {
          run,
          slashL: new THREE.CanvasTexture(renderFrameCanvas(key, 2, 'left')),
          slashR: new THREE.CanvasTexture(renderFrameCanvas(key, 6, 'right'))
        };
      }
      return cache[key];
    }
  };
})();
