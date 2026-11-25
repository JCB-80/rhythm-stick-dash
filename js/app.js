// Main Application Controller — 5 Scenes, Live i18n, Social Login, 30-Player Ranking & 3D Game Wiring
(function () {
  const state = {
    currentScene: 'scene-login',
    selectedChar: 'luna',
    selectedSongId: 'galaxy_chase',
    selectedDiff: 'NORMAL',
    game3D: null,
    ghostRivals: [],
    judgeTimer: null,
    slashTimer: null,
    feverPopupTimer: null,
    toastTimer: null,
    starting: false,
    uploading: false,
    lastStats: null
  };

  const CHARACTER_LIST = [
    {
      id: 'kai',
      theme: 'theme-cyan',
      img: './assets/characters/char_kai.png',
      nameKey: 'kai_name',
      roleKey: 'kai_role',
      skill1Key: 'kai_skill1',
      skill2Key: 'kai_skill2',
      quoteKey: 'kai_quote',
      stats: { speed: 68, power: 75, fever: 72, diff: 40 }
    },
    {
      id: 'luna',
      theme: 'theme-magenta',
      img: './assets/characters/char_luna.png',
      nameKey: 'luna_name',
      roleKey: 'luna_role',
      skill1Key: 'luna_skill1',
      skill2Key: 'luna_skill2',
      quoteKey: 'luna_quote',
      stats: { speed: 82, power: 80, fever: 95, diff: 60 }
    },
    {
      id: 'aria',
      theme: 'theme-gold',
      img: './assets/characters/char_aria.png',
      nameKey: 'aria_name',
      roleKey: 'aria_role',
      skill1Key: 'aria_skill1',
      skill2Key: 'aria_skill2',
      quoteKey: 'aria_quote',
      stats: { speed: 96, power: 95, fever: 84, diff: 88 }
    }
  ];

  // ==================== HELPERS ====================
  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Preload core sprites (including sprites_login, sprites_i18n_frames, sprites_transparent, characters)
  function preloadCoreAssets() {
    const urls = [
      './assets/screens/bg_neo_syndicate_stage.png',
      './assets/characters/char_kai.png',
      './assets/characters/char_luna.png',
      './assets/characters/char_aria.png',
      './assets/sprites_login/login_01_kakao.png',
      './assets/sprites_login/login_02_naver.png',
      './assets/sprites_login/login_03_google.png',
      './assets/sprites_login/login_04_apple.png',
      './assets/sprites_login/login_05_guest.png',
      './assets/sprites_i18n_frames/icon_lang_globe.png',
      './assets/sprites_i18n_frames/btn_frame_primary.png',
      './assets/sprites_i18n_frames/btn_frame_secondary.png',
      './assets/sprites_i18n_frames/btn_frame_reward_ad.png',
      './assets/sprites_i18n_frames/social_bar_kakao_blank.png',
      './assets/sprites_i18n_frames/social_bar_naver_blank.png',
      './assets/sprites_i18n_frames/social_bar_google_blank.png',
      './assets/sprites_i18n_frames/social_bar_apple_blank.png',
      './assets/sprites_i18n_frames/social_bar_guest_blank.png',
      './assets/sprites_transparent/note_tap_orb.png',
      './assets/sprites_transparent/note_swipe_cyan.png',
      './assets/sprites_transparent/note_swipe_magenta.png',
      './assets/sprites_transparent/btn_left.png',
      './assets/sprites_transparent/btn_right.png',
      './assets/sprites_transparent/btn_tap.png',
      './assets/sprites_transparent/btn_swipe.png',
      './assets/sprites_transparent/judge_perfect.png',
      './assets/sprites_transparent/judge_great.png',
      './assets/sprites_transparent/judge_miss.png',
      './assets/sprites_transparent/judge_fever.png',
      './assets/sprites_transparent/rank_s_plus.png',
      './assets/sprites_transparent/rank_a.png',
      './assets/sprites_transparent/vfx_stick_slash.png'
    ];
    urls.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }

  function showToast(msg) {
    const el = $('toast-banner');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => el.classList.add('hidden'), 2600);
  }

  function switchScene(sceneId) {
    document.querySelectorAll('.scene').forEach(s => s.classList.remove('active'));
    const target = $(sceneId);
    if (target) target.classList.add('active');
    state.currentScene = sceneId;

    // Hide global language switcher only during active 3D gameplay? Keep it visible in Login/Char/Lobby/Result, hide during Scene 4 so top-right HUD stays clean (still accessible via Pause/Settings!)
    const langWrap = $('lang-switcher-wrap');
    if (langWrap) {
      langWrap.classList.toggle('hidden', sceneId === 'scene-game');
    }

    if (sceneId === 'scene-lobby') {
      renderLobby();
      const song = getSelectedSong();
      window.AudioEngine.startLobbyPreview(song);
    } else {
      window.AudioEngine.stopLobbyPreview();
    }

    if (sceneId === 'scene-character') {
      renderCharacterSelect();
    }
  }

  function getSelectedSong() {
    return window.SONGS.find(s => s.id === state.selectedSongId) || window.SONGS[0];
  }

  // ==================== 0-B. GLOBAL 5-LANGUAGE LIVE SWITCHER & SMART LOGIN SORT ====================
  function renderLoginButtons() {
    const container = $('social-buttons-list');
    if (!container) return;
    container.innerHTML = '';

    const isKorean = (window.I18n.current === 'ko');
    // SPEC 0-B.3: KO -> Kakao, Naver, Google, Apple, Guest | Global -> Google, Apple, Guest (top) + Kakao, Naver (sub)
    const primaryOrder = isKorean
      ? ['kakao', 'naver', 'google', 'apple', 'guest']
      : ['google', 'apple', 'guest'];
    const secondaryRegional = isKorean ? [] : ['kakao', 'naver'];

    const keyMap = {
      kakao: 'login_kakao',
      naver: 'login_naver',
      google: 'login_google',
      apple: 'login_apple',
      guest: 'login_guest'
    };

    const appendBtn = (provider) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `social-blank-btn provider-${provider}`;
      const span = document.createElement('span');
      span.setAttribute('data-i18n', keyMap[provider]);
      span.textContent = window.I18n.t(keyMap[provider]);
      btn.appendChild(span);
      btn.addEventListener('click', () => handleSocialSignIn(provider));
      container.appendChild(btn);
    };

    primaryOrder.forEach(appendBtn);

    if (secondaryRegional.length > 0) {
      const div = document.createElement('div');
      div.className = 'regional-divider';
      div.setAttribute('data-i18n', 'global_more_logins');
      div.textContent = window.I18n.t('global_more_logins');
      container.appendChild(div);
      secondaryRegional.forEach(appendBtn);
    }
  }

  function initLanguageSwitcher() {
    const toggleBtn = $('btn-lang-toggle');
    const dropdown = $('lang-dropdown');

    const syncActiveOption = () => {
      document.querySelectorAll('.lang-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.lang === window.I18n.current);
      });
    };

    toggleBtn.addEventListener('click', e => {
      e.stopPropagation();
      window.AudioEngine.playUiClick();
      dropdown.classList.toggle('hidden');
      syncActiveOption();
      $('settings-language').value = window.I18n.current;
    });

    document.querySelectorAll('.lang-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const lang = opt.dataset.lang;
        window.AudioEngine.playUiClick();
        window.I18n.setLang(lang);
        dropdown.classList.add('hidden');
      });
    });

    document.addEventListener('click', () => dropdown.classList.add('hidden'));

    window.addEventListener('languageChanged', () => {
      window.I18n.applyAll();
      renderLoginButtons();
      if (state.currentScene === 'scene-character') renderCharacterSelect();
      if (state.currentScene === 'scene-lobby') renderLobby();
      if (state.currentScene === 'scene-result' && state.lastStats) renderResultMeta(state.lastStats);
      if (!$('modal-ranking').classList.contains('hidden')) renderRankingModal();
      syncActiveOption();
      $('settings-language').value = window.I18n.current;
    });

    window.I18n.applyAll();
    syncActiveOption();
  }

  // ==================== SCENE 1: ONE-TOUCH SOCIAL LOGIN ====================
  async function handleSocialSignIn(provider) {
    window.AudioEngine.playUiClick();
    $('auth-loading-overlay').classList.remove('hidden');
    try {
      const user = await window.AuthService.signIn(provider);
      window.AuthService.updateUser({ loggedOut: false });
      $('auth-loading-overlay').classList.add('hidden');

      state.selectedChar = user.selectedChar || 'luna';
      window.AudioEngine.setVolumes(user.settings.bgmVol, user.settings.sfxVol);
      switchScene('scene-character');
      if (!window.GameStorage.persistent) showToast(window.I18n.t('storage_warning'));
    } catch (error) { showToast(window.I18n.t('auth_error')); console.error(error); }
    finally { $('auth-loading-overlay').classList.add('hidden'); }
  }

  // ==================== SCENE 2: CHARACTER SELECT ====================
  function renderCharacterSelect() {
    const user = window.AuthService.getCurrentUser();
    if (user) {
      const pMeta = window.AuthService.PROVIDER_META[user.provider] || window.AuthService.PROVIDER_META.guest;
      $('char-user-badge').textContent = pMeta.badge;
      $('char-user-nick').textContent = user.nickname;
      $('char-user-coins').textContent = (user.coins || 0).toLocaleString();
    }

    const grid = $('character-cards-grid');
    grid.innerHTML = '';

    CHARACTER_LIST.forEach(c => {
      const isSelected = (c.id === state.selectedChar);
      const card = document.createElement('div');
      card.className = `runner-card ${c.theme} ${isSelected ? 'active' : ''}`;
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-pressed', String(isSelected));
      card.innerHTML = `
        <div class="runner-art-wrap">
          <img src="${c.img}" alt="${c.id}" />
          ${isSelected ? `<span class="runner-selected-tag" data-i18n="selected_badge">${window.I18n.t('selected_badge')}</span>` : ''}
        </div>
        <div class="runner-info-body">
          <div class="runner-title-row">
            <span class="runner-name">${window.I18n.t(c.nameKey)}</span>
            <span class="runner-role">${window.I18n.t(c.roleKey)}</span>
          </div>
          <div class="runner-stat-bars">
            <div class="stat-line"><span>${window.I18n.t('stat_speed')}</span><div class="stat-seg-track"><div class="stat-seg-fill" style="width:${c.stats.speed}%"></div></div></div>
            <div class="stat-line"><span>${window.I18n.t('stat_power')}</span><div class="stat-seg-track"><div class="stat-seg-fill" style="width:${c.stats.power}%"></div></div></div>
            <div class="stat-line"><span>${window.I18n.t('stat_fever')}</span><div class="stat-seg-track"><div class="stat-seg-fill" style="width:${c.stats.fever}%"></div></div></div>
            <div class="stat-line"><span>${window.I18n.t('stat_diff')}</span><div class="stat-seg-track"><div class="stat-seg-fill" style="width:${c.stats.diff}%"></div></div></div>
          </div>
          <div class="runner-skills-list">
            <div class="runner-skill-item">✦ ${window.I18n.t(c.skill1Key)}</div>
            <div class="runner-skill-item">✦ ${window.I18n.t(c.skill2Key)}</div>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        window.AudioEngine.playUiClick();
        state.selectedChar = c.id;
        window.AuthService.updateUser({ selectedChar: c.id });
        renderCharacterSelect();
      });
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          card.click();
          grid.children[CHARACTER_LIST.findIndex(item => item.id === c.id)]?.focus();
        }
      });

      grid.appendChild(card);
    });

    const activeMeta = CHARACTER_LIST.find(x => x.id === state.selectedChar) || CHARACTER_LIST[1];
    $('selected-char-quote').textContent = `"${window.I18n.t(activeMeta.quoteKey)}"`;
  }

  // ==================== SCENE 3: SONG & DIFFICULTY LOBBY ====================
  function renderLobby() {
    const user = window.AuthService.getCurrentUser();
    const charMeta = CHARACTER_LIST.find(c => c.id === state.selectedChar) || CHARACTER_LIST[1];
    $('lobby-runner-avatar').src = charMeta.img;
    $('lobby-runner-name').textContent = window.I18n.t(charMeta.nameKey);
    $('lobby-user-coins').textContent = (user ? user.coins : 1000).toLocaleString();
    $('lobby-my-rank-pill').textContent = `#${window.RankingEngine.getMyRank()}`;

    // Render Song List
    const listEl = $('song-list-container');
    listEl.innerHTML = '';
    window.SONGS.forEach(song => {
      const active = (song.id === state.selectedSongId);
      const item = document.createElement('div');
      item.className = `song-item-card ${active ? 'active' : ''}`;
      item.innerHTML = `
        <div class="song-thumb" style="background: linear-gradient(135deg, ${song.colors[0]}, ${song.colors[1]})">${escapeHtml(song.icon)}</div>
        <div class="song-item-meta">
          <div class="song-item-title">${escapeHtml(song.title)}</div>
          <div class="song-item-sub">
            <span>BPM ${escapeHtml(song.bpm)}</span>
            <span>⏱ ${escapeHtml(song.lengthText)}</span>
          </div>
        </div>
      `;
      item.addEventListener('click', () => {
        window.AudioEngine.playUiClick();
        state.selectedSongId = song.id;
        renderLobby();
        window.AudioEngine.startLobbyPreview(song);
      });
      listEl.appendChild(item);
    });

    // Update Selected Song Hologram Deck
    const curSong = getSelectedSong();
    $('selected-song-title').textContent = curSong.title.toUpperCase();
    $('selected-song-desc').textContent = window.I18n.t(curSong.isCustom ? 'custom_grid_hint' : curSong.descKey);
    $('selected-song-bpm').textContent = curSong.isCustom ? `${curSong.bpm}*` : curSong.bpm;
    $('selected-song-len').textContent = curSong.lengthText;
    $('selected-song-artist').textContent = curSong.isCustom ? window.I18n.t('custom_track_badge') : curSong.artist;

    const coverEl = $('song-cover-visual');
    coverEl.style.backgroundImage = `
      radial-gradient(circle at 30% 30%, ${curSong.colors[0]}66, transparent 60%),
      linear-gradient(135deg, ${curSong.colors[0]}44, ${curSong.colors[1]}55),
      url('./assets/screens/bg_neo_syndicate_stage.png')
    `;

    // Difficulty Tabs
    document.querySelectorAll('.diff-pill').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.diff === state.selectedDiff);
    });

    // Best Score & Rank Emblem
    const best = window.RankingEngine.getSongBest(curSong.id, state.selectedDiff);
    $('lobby-high-score').textContent = (best.score || 0).toLocaleString();
    $('lobby-best-rank-img').classList.toggle('hidden', !['S+', 'A'].includes(best.rank));
    $('lobby-best-rank-img').src = (best.rank === 'S+')
      ? './assets/sprites_transparent/rank_s_plus.png'
      : './assets/sprites_transparent/rank_a.png';
  }

  // ==================== SCENE 4: 3D GAMEPLAY & LIVE HUD ====================
  async function startGameplay() {
    if (state.starting || state.uploading) return;
    state.starting = true;
    try {
      if (state.game3D?.contextLost) { state.game3D.dispose(); state.game3D = null; }
      await window.ThreeReady;
      if (!window.THREE) throw new Error('WebGL library unavailable');
      await window.AudioEngine.prepare();
      if (document.hidden) throw new Error('audio_unavailable');
      const song = getSelectedSong();
      const user = window.AuthService.getCurrentUser();
      const autoFever = user && user.settings ? user.settings.autoFever : true;

      switchScene('scene-game');

      ['judgeTimer', 'slashTimer', 'feverPopupTimer'].forEach(key => clearTimeout(state[key]));
      ['judge-popup-img', 'vfx-slash-img', 'fever-popup-img'].forEach(id => $(id).classList.add('hidden'));
      state._lastGhostTick = -1;
      $('hud-diff-badge').textContent = state.selectedDiff;
      $('hud-combo-num').textContent = '0';
      $('hud-score-num').textContent = '0';
      $('hud-song-name').textContent = song.title;
      $('hud-fever-fill').style.width = '0%';
      $('hud-hp-fill').style.width = '100%';
      $('hud-time-fill').style.width = '0%';
      $('hud-route-mult').textContent = '1.0x';
      $('hud-fever-banner').classList.add('hidden');
      $('fever-screen-fx').classList.add('hidden');
      $('branch-choice-overlay').classList.add('hidden');

      // Initialize 4 Ghost Rivals on Left & Right HUD
      state.ghostRivals = window.RankingEngine.getLiveGhostRivals(250000);
      updateGhostHud(0, 0);

      if (!state.game3D) {
        state.game3D = new window.RhythmGame3D($('three-canvas-container'), {
          onJudgment: handleJudgmentHud,
          onFeverState: handleFeverHud,
          onFrameUpdate: handleFrameHud,
          onStageClear: handleStageClear
        });
      }

      state.game3D.startSession({
        song,
        difficulty: state.selectedDiff,
        charId: state.selectedChar,
        autoFever,
        audioOffset: user?.settings.audioOffset || 0,
        vip: !!user?.vip
      });
      if (!state.game3D._contextEventsBound) {
        state.game3D._contextEventsBound = true;
        state.game3D.renderer.domElement.addEventListener('webglcontextlost', event => {
          event.preventDefault(); state.game3D.pause(); openSettingsModal(true);
          state.game3D.contextLost = true; showToast(window.I18n.t('game_error'));
        });
        state.game3D.renderer.domElement.addEventListener('webglcontextrestored', () => { state.game3D.contextLost = false; });
      }
    } catch (error) {
      console.error('Game initialization failed:', error);
      if (state.game3D) { state.game3D.dispose(); state.game3D = null; }
      switchScene('scene-lobby');
      showToast(window.I18n.t('game_error'));
    } finally { state.starting = false; }
  }

  function updateGhostHud(myScore, progressFrac) {
    const leftEl = $('hud-ghost-left');
    const rightEl = $('hud-ghost-right');
    if (!leftEl || !rightEl) return;

    const renderCard = (g) => {
      const liveGhostScore = Math.round(g.targetScore * progressFrac);
      const isAhead = liveGhostScore > myScore;
      return `
        <div class="ghost-mini-card ${isAhead ? 'ahead' : ''}">
          <span class="social-tag ${escapeHtml(g.provider)}">${escapeHtml(g.badge)}</span>
          <div>
            <span>${escapeHtml(g.nickname)}</span>
            <b>${liveGhostScore.toLocaleString()}</b>
          </div>
        </div>
      `;
    };

    leftEl.innerHTML = state.ghostRivals.slice(0, 2).map(renderCard).join('');
    rightEl.innerHTML = state.ghostRivals.slice(2, 4).map(renderCard).join('');
  }

  function handleJudgmentHud({ grade, combo, score, hp, feverGauge, totalMult }) {
    $('hud-combo-num').textContent = combo;
    $('hud-score-num').textContent = score.toLocaleString();
    $('hud-hp-fill').style.width = `${Math.round(hp * 100)}%`;
    if (typeof feverGauge === 'number') {
      $('hud-fever-fill').style.width = `${Math.round(feverGauge)}%`;
    }
    if (totalMult) {
      $('hud-route-mult').textContent = `${totalMult.toFixed(1)}x`;
    }

    // Judgment PNG Sprite Popup
    const judgeImg = $('judge-popup-img');
    const spriteMap = {
      PERFECT: './assets/sprites_transparent/judge_perfect.png',
      GREAT: './assets/sprites_transparent/judge_great.png',
      MISS: './assets/sprites_transparent/judge_miss.png'
    };
    judgeImg.src = spriteMap[grade] || spriteMap.MISS;
    judgeImg.classList.remove('hidden');
    // Retrigger CSS animation cleanly
    judgeImg.getAnimations().forEach(animation => animation.cancel());
    judgeImg.animate([{ transform: 'scale(.65)', opacity: 0 }, { transform: 'scale(1.05)', opacity: 1 }, { transform: 'scale(1)', opacity: 1 }], { duration: 320, fill: 'forwards' });

    clearTimeout(state.judgeTimer);
    state.judgeTimer = setTimeout(() => judgeImg.classList.add('hidden'), 420);

    // Stick Slash VFX Sprite on PERFECT / GREAT
    if (grade !== 'MISS') {
      const slashImg = $('vfx-slash-img');
      slashImg.classList.remove('hidden');
      slashImg.getAnimations().forEach(animation => animation.cancel());
      slashImg.animate([{ transform: 'scale(.65) rotate(-18deg)', opacity: 1 }, { transform: 'scale(1.3) rotate(16deg)', opacity: 0 }], { duration: 240, fill: 'forwards' });
      clearTimeout(state.slashTimer);
      state.slashTimer = setTimeout(() => slashImg.classList.add('hidden'), 240);
    }
  }

  function handleFeverHud(isActive) {
    $('fever-screen-fx').classList.toggle('hidden', !isActive);
    $('hud-fever-banner').classList.toggle('hidden', !isActive);
    $('hud-diff-badge').textContent = isActive
      ? `${state.selectedDiff} · FEVER!`
      : state.selectedDiff;

    if (isActive) {
      const fp = $('fever-popup-img');
      fp.classList.remove('hidden');
      clearTimeout(state.feverPopupTimer);
      state.feverPopupTimer = setTimeout(() => fp.classList.add('hidden'), 950);
    }
  }

  function handleFrameHud(frame) {
    const pct = Math.min(100, (frame.songTime / Math.max(1, frame.duration)) * 100);
    $('hud-time-fill').style.width = `${pct.toFixed(1)}%`;
    $('hud-fever-fill').style.width = `${Math.round(frame.feverGauge)}%`;
    $('hud-route-mult').textContent = `${frame.totalMult.toFixed(1)}x`;
    $('hud-fever-banner').textContent = window.I18n.t('fever_overdrive') + ` ×${frame.totalMult.toFixed(1)}`;
    $('btn-manual-fever').disabled = frame.isFever || frame.feverGauge < 100;

    // Y-Branch choice overlay
    const branchOverlay = $('branch-choice-overlay');
    if (frame.showBranchPrompt) {
      branchOverlay.classList.remove('hidden');
      $('branch-rush-mult-label').textContent = `${frame.rushMult}x`;
      $('branch-card-std').classList.toggle('active', !frame.previewRushSelected);
      $('branch-card-rush').classList.toggle('active', frame.previewRushSelected);
    } else {
      branchOverlay.classList.add('hidden');
    }

    // Throttle ghost score updates slightly (~4 times/sec)
    if (Math.floor(frame.songTime * 4) !== state._lastGhostTick) {
      state._lastGhostTick = Math.floor(frame.songTime * 4);
      updateGhostHud(frame.score, pct / 100);
    }
  }

  // ==================== SCENE 5: STAGE CLEAR & RANKING UPDATE ====================
  function renderResultMeta(stats) {
    const charMeta = CHARACTER_LIST.find(c => c.id === stats.charId) || CHARACTER_LIST[1];
    $('result-diff-runner').textContent = `${stats.difficulty} · ${window.I18n.t(charMeta.nameKey)}`;
    $('result-grade-text').textContent = stats.rankGrade;
    $('result-stage-title').textContent = window.I18n.t(stats.cleared ? 'stage_clear' : 'stage_complete');
  }

  function handleStageClear(stats) {
    state.lastStats = stats;
    window.AudioEngine.playClearFanfare();

    let rankRes;
    try {
      rankRes = window.RankingEngine.recordStageClear({
        songId: stats.song.id, diff: stats.difficulty, score: stats.score, maxCombo: stats.maxCombo,
        rankGrade: stats.rankGrade, sessionId: stats.sessionId, cleared: stats.cleared, accuracy: stats.accuracy
      });
    } catch (error) {
      console.error(error);
      rankRes = { earnedCoins: 0, xp: 0, cores: 0, isNewBest: false, rankDelta: 0, newRank: '--' };
      showToast(window.I18n.t('save_error'));
    }
    const earnedCoins = rankRes.earnedCoins;
    if (!window.GameStorage.persistent) showToast(window.I18n.t('storage_warning'));

    const charMeta = CHARACTER_LIST.find(c => c.id === stats.charId) || CHARACTER_LIST[1];
    renderResultMeta(stats);
    $('result-char-img').src = charMeta.img;
    $('result-rank-img').classList.toggle('hidden', !['S+', 'A'].includes(stats.rankGrade));
    $('result-rank-img').src = stats.rankGrade === 'S+'
      ? './assets/sprites_transparent/rank_s_plus.png'
      : './assets/sprites_transparent/rank_a.png';
    $('result-song-title').textContent = stats.song.title;
    $('result-diff-runner').textContent = `${stats.difficulty} · ${window.I18n.t(charMeta.nameKey)}`;
    $('result-new-best').classList.toggle('hidden', !rankRes.isNewBest);

    $('res-cnt-perfect').textContent = stats.perfect;
    $('res-cnt-great').textContent = stats.great;
    $('res-cnt-miss').textContent = stats.miss;
    $('result-combo-val').textContent = stats.maxCombo;
    $('result-coins-earned').textContent = `+${earnedCoins}`;
    $('result-xp-earned').textContent = `EXP +${rankRes.xp}`;
    $('result-cores-earned').textContent = `BEAT CORE +${rankRes.cores}`;

    if (rankRes.rankDelta > 0) {
      $('result-rank-promo-label').setAttribute('data-i18n', 'res_rank_up');
      $('result-rank-promo-label').textContent = window.I18n.t('res_rank_up');
      $('result-rank-delta').textContent = `#${rankRes.prevRank} → #${rankRes.newRank} (▲${rankRes.rankDelta})`;
    } else {
      $('result-rank-promo-label').setAttribute('data-i18n', 'res_rank_keep');
      $('result-rank-promo-label').textContent = window.I18n.t('res_rank_keep');
      $('result-rank-delta').textContent = `#${rankRes.newRank} / 30`;
    }

    switchScene('scene-result');

    // Smooth animated score count-up
    const scoreEl = $('result-score-val');
    const target = stats.score;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / 800);
      const eased = 1 - Math.pow(1 - p, 3);
      if (state.currentScene !== 'scene-result' || state.lastStats !== stats) return;
      scoreEl.textContent = Math.round(target * eased).toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ==================== MODALS: 30-PLAYER RANKING, VIP, SETTINGS ====================
  function renderRankingModal() {
    const songMode = $('ranking-scope').value === 'song';
    const song = getSelectedSong();
    const entries = window.RankingEngine.getGroupLeaderboard(songMode ? song.id : undefined, state.selectedDiff);
    $('ranking-group-id').textContent = `${window.RankingEngine.getSeasonInfo().week} · ${window.I18n.t('league_' + window.RankingEngine.getSeasonInfo().league)} · ${songMode ? song.title + ' / ' + state.selectedDiff : window.RankingEngine.groupId}`;
    const tbody = $('ranking-tbody');
    tbody.innerHTML = '';

    entries.forEach(item => {
      const tr = document.createElement('tr');
      if (item.isMe) tr.classList.add('me-row');
      if (item.rank <= 10) tr.classList.add('promo-zone');

      const medal = item.rank === 1 ? '🥇 ' : (item.rank === 2 ? '🥈 ' : (item.rank === 3 ? '🥉 ' : ''));
      const meTag = item.isMe ? ` <small style="color:#ffd84d">[${escapeHtml(window.I18n.t('you_badge'))}]</small>` : '';
      tr.innerHTML = `
        <td>${medal}#${item.rank}</td>
        <td><span class="social-tag ${escapeHtml(item.provider)}">${escapeHtml(item.provider_badge)}</span>${escapeHtml(item.nickname)}${meTag}</td>
        <td>${item.score.toLocaleString()}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function openSettingsModal(fromGameplayPause = false) {
    const user = window.AuthService.getCurrentUser();
    if (user) {
      $('input-bgm-vol').value = Math.round((user.settings.bgmVol ?? 0.75) * 100);
      $('input-sfx-vol').value = Math.round((user.settings.sfxVol ?? 0.85) * 100);
      $('input-auto-fever').checked = !!user.settings.autoFever;
      $('input-nickname').value = user.nickname || '';
      $('input-audio-offset').value = Math.round(user.settings.audioOffset * 1000);
    }

    $('settings-language').value = window.I18n.current;
    const titleEl = $('settings-modal-title');
    titleEl.setAttribute('data-i18n', fromGameplayPause ? 'pause_title' : 'settings_title');
    titleEl.textContent = window.I18n.t(fromGameplayPause ? 'pause_title' : 'settings_title');

    $('pause-extra-actions').classList.toggle('hidden', !fromGameplayPause);
    $('settings-normal-actions').classList.toggle('hidden', fromGameplayPause);
    $('modal-settings').classList.remove('hidden');
  }

  function saveSettingsFromModal() {
    const bgmVol = Number($('input-bgm-vol').value) / 100;
    const sfxVol = Number($('input-sfx-vol').value) / 100;
    const autoFever = $('input-auto-fever').checked;
    const nick = $('input-nickname').value.trim();

    window.AudioEngine.setVolumes(bgmVol, sfxVol);
    const offsetValue = Number($('input-audio-offset').value);
    const audioOffset = Number.isFinite(offsetValue) ? Math.max(-250, Math.min(250, offsetValue)) / 1000 : 0;
    const patch = { settings: { bgmVol, sfxVol, autoFever, audioOffset } };
    if (nick.length >= 2) patch.nickname = nick;
    window.AuthService.updateUser(patch);

    if (state.game3D) { state.game3D.autoFever = autoFever; state.game3D.audioOffset = audioOffset; }
    if (state.currentScene === 'scene-lobby') renderLobby();
    if (state.currentScene === 'scene-character') renderCharacterSelect();
  }

  async function resumeGameplay() {
    try {
      if (state.game3D?.contextLost) throw new Error('WebGL context lost');
      await window.AudioEngine.prepare();
      if (document.hidden || state.currentScene !== 'scene-game' || !state.game3D?.active) return;
      saveSettingsFromModal();
      state.game3D.resume(); $('modal-settings').classList.add('hidden');
    } catch (error) { console.error(error); showToast(window.I18n.t('game_error')); }
  }

  // ==================== EVENT BINDINGS & KEYBOARD / TOUCH CONTROLS ====================
  function bindEvents() {
    // Character Select actions
    $('btn-char-logout').addEventListener('click', () => {
      window.AudioEngine.playUiClick();
      window.AuthService.signOut();
      switchScene('scene-login');
    });

    $('btn-confirm-character').addEventListener('click', () => {
      window.AudioEngine.playUiClick();
      window.AuthService.updateUser({ selectedChar: state.selectedChar });
      switchScene('scene-lobby');
    });

    // Lobby actions
    $('btn-lobby-back').addEventListener('click', () => {
      window.AudioEngine.playUiClick();
      switchScene('scene-character');
    });
    $('lobby-runner-chip').addEventListener('click', () => {
      window.AudioEngine.playUiClick();
      switchScene('scene-character');
    });

    document.querySelectorAll('.diff-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        window.AudioEngine.playUiClick();
        state.selectedDiff = btn.dataset.diff;
        renderLobby();
      });
    });

    $('btn-start-run').addEventListener('click', () => {
      window.AudioEngine.playUiClick();
      startGameplay();
    });

    // Custom MP3 upload
    $('mp3-file-input').addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file || state.uploading) return;
      state.uploading = true;
      $('btn-start-run').disabled = true;
      showToast(window.I18n.t('mp3_loading'));
      try {
        const customSong = await window.AudioEngine.loadCustomMp3(file);
        state.selectedSongId = customSong.id;
        if (state.currentScene === 'scene-lobby') { renderLobby(); window.AudioEngine.startLobbyPreview(customSong); }
        showToast(`🎵 ${customSong.title}`);
      } catch (err) {
        console.error('MP3 decode error:', err);
        showToast(window.I18n.t(['mp3_size', 'mp3_length'].includes(err.message) ? err.message : 'mp3_error'));
      } finally { state.uploading = false; $('btn-start-run').disabled = false; e.target.value = ''; }
    });

    // Modals open/close
    $('btn-open-ranking').addEventListener('click', () => {
      window.AudioEngine.playUiClick();
      renderRankingModal();
      $('modal-ranking').classList.remove('hidden');
    });

    $('btn-claim-weekly').addEventListener('click', () => {
      window.AudioEngine.playUiClick();
      const res = window.RankingEngine.claimWeeklyReward();
      showToast(res.ok ? `${window.I18n.t('reward_received')} +${res.coinsAdded}` : window.I18n.t(res.reason || 'reward_already'));
      if (state.currentScene === 'scene-lobby') renderLobby();
    });

    $('btn-open-vip').addEventListener('click', () => {
      window.AudioEngine.playUiClick();
      const user = window.AuthService.getCurrentUser();
      const lbl = $('vip-btn-label');
      const key = (user && user.vip) ? 'vip_active' : 'shop_vip';
      lbl.setAttribute('data-i18n', key);
      lbl.textContent = window.I18n.t(key);
      $('modal-vip').classList.remove('hidden');
    });

    $('btn-activate-vip').addEventListener('click', () => {
      window.AudioEngine.playClearFanfare();
      window.AuthService.updateUser({ vip: true });
      $('vip-btn-label').setAttribute('data-i18n', 'vip_active');
      $('vip-btn-label').textContent = window.I18n.t('vip_active');
      showToast('👑 ' + window.I18n.t('vip_active'));
    });

    $('btn-free-ad-coins').addEventListener('click', () => {
      window.AudioEngine.playUiClick();
      const res = window.RankingEngine.claimDemoReward();
      if (res.ok && state.currentScene === 'scene-lobby') renderLobby();
      showToast(res.ok ? window.I18n.t('reward_received') + ' +300' : window.I18n.t(res.reason));
    });

    const syncCosmeticShopUI = () => {
      const u = window.AuthService.getCurrentUser();
      if (!u) return;
      if ($('music-pass-tier-lbl')) $('music-pass-tier-lbl').textContent = `PASS TIER ${u.musicPassTier || 1}/30`;
    };
    const buyCosmetic = (id, currency, cost, label) => {
      const u = window.AuthService.getCurrentUser();
      if (!u) return;
      const owned = Array.isArray(u.ownedCosmetics) ? u.ownedCosmetics : [];
      if (owned.includes(id)) {
        window.AuthService.updateUser({ equippedSkin: id });
        showToast(`✅ Equipped ${label}`);
        return;
      }
      if ((u[currency] || 0) < cost) {
        showToast(currency === 'cores' ? `BEAT CORE < ${cost}!` : `Coins < ${cost}!`);
        return;
      }
      window.AudioEngine.playClearFanfare();
      window.AuthService.updateUser({
        [currency]: (u[currency] || 0) - cost,
        ownedCosmetics: [...owned, id],
        equippedSkin: id
      });
      if (state.currentScene === 'scene-lobby') renderLobby();
      syncCosmeticShopUI();
      showToast(`✨ Unlocked & Equipped ${label}!`);
    };
    if ($('btn-buy-skin-prism')) $('btn-buy-skin-prism').addEventListener('click', () => buyCosmetic('prism_stick', 'coins', 400, 'Prism Stick'));
    if ($('btn-buy-track-nova')) $('btn-buy-track-nova').addEventListener('click', () => buyCosmetic('nova_track', 'cores', 15, 'Nova Track'));
    if ($('btn-buy-aura-valk')) $('btn-buy-aura-valk').addEventListener('click', () => buyCosmetic('valk_aura', 'coins', 600, 'Valk Aura'));
    if ($('btn-claim-music-pass')) {
      $('btn-claim-music-pass').addEventListener('click', () => {
        const u = window.AuthService.getCurrentUser();
        if (!u) return;
        const nextTier = Math.min(30, (u.musicPassTier || 1) + 1);
        window.AudioEngine.playClearFanfare();
        window.AuthService.updateUser({
          musicPassTier: nextTier,
          coins: (u.coins || 0) + 250,
          cores: (u.cores || 0) + 5
        });
        if (state.currentScene === 'scene-lobby') renderLobby();
        syncCosmeticShopUI();
        showToast(`🎵 Music Pass Tier ${nextTier}/30 (+250 🪙 / +5 ⚡CORE)`);
      });
    }

    // Wave 2: Challenge Modifiers (MIRROR / HIDDEN / SPEED 1.25x) & Live-Ops
    const lo = window.Wave2LiveOps;
    if (lo) {
      const grantRsd = (r) => {
        const u = window.AuthService.getCurrentUser();
        if (!u) return;
        window.AuthService.updateUser({ coins: (u.coins || 0) + (r.coins || 0), cores: (u.cores || 0) + (r.cores || 0) });
        if (state.currentScene === 'scene-lobby') renderLobby();
      };
      const syncModButtons = () => {
        document.querySelectorAll('#w2-modifiers-bar [data-mod]').forEach(btn => {
          const on = !!lo.state.activeModifiers[btn.dataset.mod];
          btn.style.boxShadow = on ? '0 0 12px rgba(56,189,248,0.75)' : 'none';
          btn.style.borderWidth = on ? '2px' : '1px';
        });
      };
      syncModButtons();
      document.querySelectorAll('#w2-modifiers-bar [data-mod]').forEach(btn => {
        btn.addEventListener('click', () => {
          window.AudioEngine.playUiClick();
          const on = lo.toggleModifier(btn.dataset.mod);
          syncModButtons();
          const b = lo.getModifierBonus();
          showToast(`${btn.dataset.mod} ${on ? 'ON' : 'OFF'} (점수 +${b.scorePct}% · 코인 +${b.coinPct}%)`);
        });
      });
      if ($('btn-rsd-checkin')) $('btn-rsd-checkin').addEventListener('click', () => {
        const r = lo.claimAttendance(grantRsd);
        showToast(r.ok ? `📅 DAY ${r.day} 출석 완료! (${r.reward.label})` : '오늘 출석 보상을 이미 수령했습니다.');
      });
      if ($('btn-rsd-missions')) $('btn-rsd-missions').addEventListener('click', () => {
        const r = lo.claimAllMissions(grantRsd);
        showToast(r.ok ? `📋 일일 미션 ${r.count}건 수령 (+${r.coins}🪙 / +${r.cores}⚡)` : '수령 가능한 완료 미션이 없습니다.');
      });
      if ($('btn-rsd-starter2x')) $('btn-rsd-starter2x').addEventListener('click', () => {
        const r = lo.claimFirstPurchaseStarter(grantRsd);
        showToast(r.ok ? '⚡ ₩1,200 첫 결제 2배 스타터 지급 (+2,400🪙 / +40⚡)!' : '이미 1회 한정 스타터 팩을 수령했습니다.');
      });
    }

    $('btn-open-settings').addEventListener('click', () => {
      window.AudioEngine.playUiClick();
      openSettingsModal(false);
    });

    $('btn-save-settings').addEventListener('click', () => {
      window.AudioEngine.playUiClick();
      saveSettingsFromModal();
      $('modal-settings').classList.add('hidden');
      showToast('✓ ' + window.I18n.t('save_btn'));
    });

    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        window.AudioEngine.playUiClick();
        const modalId = btn.getAttribute('data-close-modal');
        $(modalId).classList.add('hidden');
        if (modalId === 'modal-settings' && state.currentScene === 'scene-game' && state.game3D) {
          $('modal-settings').classList.remove('hidden');
          resumeGameplay();
        }
      });
    });

    // Gameplay Pause & Resume
    $('btn-game-pause').addEventListener('click', () => {
      if (!state.game3D) return;
      state.game3D.pause();
      openSettingsModal(true);
    });

    $('btn-pause-resume').addEventListener('click', () => {
      resumeGameplay();
    });

    $('btn-pause-retry').addEventListener('click', () => {
      saveSettingsFromModal();
      $('modal-settings').classList.add('hidden');
      if (state.game3D) state.game3D.stop();
      startGameplay();
    });

    $('btn-pause-lobby').addEventListener('click', () => {
      saveSettingsFromModal();
      $('modal-settings').classList.add('hidden');
      if (state.game3D) state.game3D.stop();
      switchScene('scene-lobby');
    });

    // In-Game Touch / Click Sprite Buttons
    const bindActionBtn = (id, fn) => {
      const el = $(id);
      const handler = (e) => {
        e.preventDefault();
        el.classList.add('pressed');
        setTimeout(() => el.classList.remove('pressed'), 100);
        fn();
      };
      el.addEventListener('pointerdown', handler);
    };

    bindActionBtn('btn-ctrl-left', () => state.game3D && state.game3D.moveLane(-1));
    bindActionBtn('btn-ctrl-right', () => state.game3D && state.game3D.moveLane(1));
    bindActionBtn('btn-ctrl-tap', () => state.game3D && state.game3D.triggerTap());
    bindActionBtn('btn-ctrl-swipe', () => state.game3D && state.game3D.triggerSwipe());

    // Direct touch/mouse swipe gesture on 3D canvas
    const drags = new Map();
    const canvasWrap = $('three-canvas-container');
    canvasWrap.addEventListener('pointerdown', e => {
      if (!state.game3D?.active || state.game3D.paused) return;
      drags.set(e.pointerId, e.clientX);
      canvasWrap.setPointerCapture(e.pointerId);
    });
    canvasWrap.addEventListener('pointerup', e => {
      const start = drags.get(e.pointerId); drags.delete(e.pointerId);
      if (start === undefined || !state.game3D) return;
      const dx = e.clientX - start;
      if (Math.abs(dx) > 42) {
        // Strict directional swipe: dragging left only hits swipeL, dragging right only hits swipeR
        const dir = dx < 0 ? -1 : 1;
        state.game3D.moveLane(dir);
      } else state.game3D.triggerTap();
    });
    canvasWrap.addEventListener('pointercancel', e => drags.delete(e.pointerId));
    canvasWrap.addEventListener('lostpointercapture', e => drags.delete(e.pointerId));
    $('btn-manual-fever').addEventListener('click', () => state.game3D?.activateFever());
    $('settings-language').addEventListener('change', e => window.I18n.setLang(e.target.value));
    $('ranking-scope').addEventListener('change', renderRankingModal);
    document.addEventListener('visibilitychange', () => {
      drags.clear();
      if (document.hidden && state.currentScene === 'scene-game' && state.game3D?.active && !state.game3D.paused) {
        state.game3D.pause(); openSettingsModal(true);
      }
    });
    window.addEventListener('pagehide', () => { if (state.game3D?.active) { state.game3D.pause(); openSettingsModal(true); } window.AudioEngine.stopLobbyPreview(); });

    // Keyboard Controls
    window.addEventListener('keydown', e => {
      if (state.currentScene !== 'scene-game' || !state.game3D) return;
      if (e.repeat) return;
      const k = e.key.toLowerCase();

      if (k === 'escape') {
        if (state.game3D.paused) {
          resumeGameplay();
        } else {
          state.game3D.pause();
          openSettingsModal(true);
        }
        return;
      }

      if (state.game3D.paused || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;

      if (k === 'arrowleft' || k === 'a') {
        e.preventDefault();
        state.game3D.moveLane(-1);
      } else if (k === 'arrowright' || k === 'd') {
        e.preventDefault();
        state.game3D.moveLane(1);
      } else if (k === ' ' || k === 'j' || k === 'k' || k === 'f') {
        e.preventDefault();
        state.game3D.triggerTap();
      } else if (k === 'q') {
        e.preventDefault();
        state.game3D.triggerSwipe(-1);
      } else if (k === 'e') {
        e.preventDefault();
        state.game3D.triggerSwipe(1);
      } else if (k === 'shift' || k === 's' || k === 'l' || k === 'arrowup') {
        e.preventDefault();
        state.game3D.triggerSwipe();
      } else if (k === 'enter' || k === 'v') {
        e.preventDefault();
        state.game3D.activateFever();
      }
    });

    // Result Screen Buttons
    $('btn-result-retry').addEventListener('click', () => {
      window.AudioEngine.playUiClick();
      startGameplay();
    });
    $('btn-result-ranking').addEventListener('click', () => {
      window.AudioEngine.playUiClick();
      renderRankingModal();
      $('modal-ranking').classList.remove('hidden');
    });
    $('btn-result-lobby').addEventListener('click', () => {
      window.AudioEngine.playUiClick();
      switchScene('scene-lobby');
    });
  }

  // ==================== BOOTSTRAP ====================
  window.addEventListener('DOMContentLoaded', () => {
    preloadCoreAssets();
    initLanguageSwitcher();
    renderLoginButtons();
    bindEvents();

    // Restore user volume preferences if returning user
    const savedUser = window.AuthService.getCurrentUser();
    if (savedUser && savedUser.settings) {
      state.selectedChar = savedUser.selectedChar || 'luna';
      window.AudioEngine.setVolumes(savedUser.settings.bgmVol ?? 0.75, savedUser.settings.sfxVol ?? 0.85);
    }
    // Start at Scene 1 Login screen so user experiences the 5-button social login showcase immediately
    switchScene('scene-login');
  });
})();
