// Multi-Track Stereo OGG Audio Engine + BPM-Synced Beatmap & Rush Barrage Generator
// Plays real 44.1kHz stereo .ogg tracks via AudioBuffer with crossfade, pause/resume & Custom MP3 upload
(function () {
  window.SONGS = [
    {
      id: 'seoul_neon_pulse',
      title: 'Seoul Neon Pulse',
      bpm: 132,
      duration: 80.0,
      lengthText: '01:20',
      artist: 'NEO SYNDICATE · K-ELECTRO HOUSE',
      descKey: 'song_1_desc',
      audioUrl: './assets/audio/tracks/01_seoul_neon_pulse.ogg',
      bgUrl: './assets/screens/bg_01_neo_seoul.png',
      colors: ['#00f2ff', '#ff2bd6'],
      badge: '01',
      style: 'house'
    },
    {
      id: 'hyperpop_overdrive',
      title: 'Hyperpop Overdrive',
      bpm: 150,
      duration: 76.8,
      lengthText: '01:17',
      artist: 'LUNA · HYPERPOP DANCE',
      descKey: 'song_2_desc',
      audioUrl: './assets/audio/tracks/02_hyperpop_overdrive.ogg',
      bgUrl: './assets/screens/bg_02_cyber_club.png',
      colors: ['#ff2bd6', '#7c3aed'],
      badge: '02',
      style: 'hyperpop'
    },
    {
      id: 'gangnam_midnight',
      title: 'Gangnam Midnight',
      bpm: 128,
      duration: 75.0,
      lengthText: '01:15',
      artist: 'K-PULSE · CLUB BOUNCE',
      descKey: 'song_1_desc',
      audioUrl: './assets/audio/tracks/03_gangnam_midnight.ogg',
      bgUrl: './assets/screens/bg_01_neo_seoul.png',
      colors: ['#38bdf8', '#f472b6'],
      badge: '03',
      style: 'bounce'
    },
    {
      id: 'jersey_club_rush',
      title: 'Jersey Club Rush',
      bpm: 142,
      duration: 74.4,
      lengthText: '01:14',
      artist: 'KAI · JERSEY CLUB',
      descKey: 'song_2_desc',
      audioUrl: './assets/audio/tracks/04_jersey_club_rush.ogg',
      bgUrl: './assets/screens/bg_02_cyber_club.png',
      colors: ['#00ffaa', '#00b8ff'],
      badge: '04',
      style: 'jersey'
    },
    {
      id: 'cyber_phonk_drift',
      title: 'Cyber Phonk Drift',
      bpm: 148,
      duration: 77.8,
      lengthText: '01:18',
      artist: 'NEO CORE · DRIFT PHONK',
      descKey: 'song_4_desc',
      audioUrl: './assets/audio/tracks/05_cyber_phonk_drift.ogg',
      bgUrl: './assets/screens/bg_04_sunset_tokyo.png',
      colors: ['#ff3d5a', '#ffd84d'],
      badge: '05',
      style: 'phonk'
    },
    {
      id: 'starlight_future_bass',
      title: 'Starlight Future Bass',
      bpm: 136,
      duration: 77.6,
      lengthText: '01:18',
      artist: 'ARIA · FUTURE BASS',
      descKey: 'song_3_desc',
      audioUrl: './assets/audio/tracks/06_starlight_future_bass.ogg',
      bgUrl: './assets/screens/bg_03_orbital_highway.png',
      colors: ['#8a5cff', '#00f2ff'],
      badge: '06',
      style: 'future_bass'
    },
    {
      id: 'retro_synth_highway',
      title: 'Retro Synth Highway',
      bpm: 126,
      duration: 76.2,
      lengthText: '01:16',
      artist: 'TOKYO 2099 · SYNTHWAVE',
      descKey: 'song_3_desc',
      audioUrl: './assets/audio/tracks/07_retro_synth_highway.ogg',
      bgUrl: './assets/screens/bg_04_sunset_tokyo.png',
      colors: ['#ff7b00', '#ff2bd6'],
      badge: '07',
      style: 'synthwave'
    },
    {
      id: 'festival_bigroom_drop',
      title: 'Festival Bigroom Drop',
      bpm: 130,
      duration: 73.8,
      lengthText: '01:14',
      artist: 'MAIN STAGE · BIG ROOM EDM',
      descKey: 'song_4_desc',
      audioUrl: './assets/audio/tracks/08_festival_bigroom_drop.ogg',
      bgUrl: './assets/screens/bg_05_quantum_arena.png',
      colors: ['#ffd84d', '#00f2ff'],
      badge: '08',
      style: 'bigroom'
    },
    {
      id: 'velocity_dnb',
      title: 'Velocity DnB',
      bpm: 172,
      duration: 78.1,
      lengthText: '01:18',
      artist: 'ARIA · LIQUID D&B',
      descKey: 'song_3_desc',
      audioUrl: './assets/audio/tracks/09_velocity_dnb.ogg',
      bgUrl: './assets/screens/bg_03_orbital_highway.png',
      colors: ['#22d3ee', '#a855f7'],
      badge: '09',
      style: 'dnb'
    },
    {
      id: 'velvet_nu_disco',
      title: 'Velvet Nu-Disco',
      bpm: 124,
      duration: 77.4,
      lengthText: '01:17',
      artist: 'VELVET CLUB · NU-DISCO FUNK',
      descKey: 'song_2_desc',
      audioUrl: './assets/audio/tracks/10_velvet_nu_disco.ogg',
      bgUrl: './assets/screens/bg_02_cyber_club.png',
      colors: ['#f59e0b', '#ec4899'],
      badge: '10',
      style: 'disco'
    },
    {
      id: 'hardstyle_inferno',
      title: 'Hardstyle Inferno',
      bpm: 155,
      duration: 80.5,
      lengthText: '01:21',
      artist: 'REDLINE · HARDSTYLE RAVE',
      descKey: 'song_4_desc',
      audioUrl: './assets/audio/tracks/11_hardstyle_inferno.ogg',
      bgUrl: './assets/screens/bg_05_quantum_arena.png',
      colors: ['#ff1e42', '#ff7b00'],
      badge: '11',
      style: 'hardstyle'
    },
    {
      id: 'vip_trap_anthem',
      title: 'VIP Trap Anthem',
      bpm: 140,
      duration: 75.4,
      lengthText: '01:15',
      artist: 'CROWN VIP · FESTIVAL TRAP',
      descKey: 'song_4_desc',
      audioUrl: './assets/audio/tracks/12_vip_trap_anthem.ogg',
      bgUrl: './assets/screens/bg_05_quantum_arena.png',
      colors: ['#10b981', '#fde047'],
      badge: '12',
      style: 'trap'
    }
  ];

  function seededRandom(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function hashBytes(bytes) {
    let h = 2166136261;
    const step = Math.max(1, Math.floor(bytes.length / 4096));
    for (let i = 0; i < bytes.length; i += step) {
      h = Math.imul(h ^ bytes[i], 16777619);
    }
    return (h >>> 0).toString(36);
  }

  class AudioTrackEngine {
    constructor() {
      this.ctx = null;
      this.bgmGain = null;
      this.previewGain = null;
      this.sfxGain = null;
      this.bgmVolume = 0.75;
      this.sfxVolume = 0.85;

      this.isPlaying = false;
      this.isPaused = false;
      this.currentSong = null;
      this.songStartCtxTime = 0;
      this.pausedElapsed = 0;
      this.resumeBaseElapsed = 0;
      this.resumeAnchorCtxTime = 0;
      this.activeSourceNode = null;
      this.voices = new Set();

      this.trackBufferCache = new Map();
      this.previewRequest = 0;
      this.previewNode = null;
      this.startRequest = 0;
    }

    ensureContext() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();

        this.bgmGain = this.ctx.createGain();
        this.previewGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();

        this.bgmGain.gain.value = this.bgmVolume;
        this.previewGain.gain.value = this.bgmVolume * 0.42;
        this.sfxGain.gain.value = this.sfxVolume;

        let masterOut = this.ctx.destination;
        if (typeof this.ctx.createDynamicsCompressor === 'function') {
          const comp = this.ctx.createDynamicsCompressor();
          comp.threshold.setValueAtTime(-12, this.ctx.currentTime);
          comp.ratio.setValueAtTime(3.0, this.ctx.currentTime);
          comp.connect(this.ctx.destination);
          masterOut = comp;
        }

        this.bgmGain.connect(masterOut);
        this.previewGain.connect(masterOut);
        this.sfxGain.connect(masterOut);
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }

    async prepare() {
      const ctx = this.ensureContext();
      if (ctx.state !== 'running') await ctx.resume();
      if (ctx.state !== 'running') throw new Error('audio_unavailable');
    }

    _trackVoice(node, bus, nodes = []) {
      const voice = { node, bus, nodes };
      this.voices.add(voice);
      node.onended = () => {
        this.voices.delete(voice);
        try { node.disconnect(); } catch (_) {}
        nodes.forEach(n => { try { n.disconnect(); } catch (_) {} });
      };
    }

    _stopVoices(bus) {
      for (const voice of [...this.voices]) {
        if (voice.bus !== bus) continue;
        try { voice.node.stop(); } catch (_) {}
        if (typeof voice.node.onended === 'function') voice.node.onended();
      }
    }

    setVolumes(bgm, sfx) {
      this.bgmVolume = Number.isFinite(bgm) ? Math.max(0, Math.min(1, bgm)) : 0.75;
      this.sfxVolume = Number.isFinite(sfx) ? Math.max(0, Math.min(1, sfx)) : 0.85;
      if (this.bgmGain && this.ctx) {
        this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
      }
      if (this.previewGain && this.ctx) {
        this.previewGain.gain.setValueAtTime(this.bgmVolume * 0.42, this.ctx.currentTime);
      }
      if (this.sfxGain && this.ctx) {
        this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      }
    }

    async loadTrackBuffer(song) {
      if (!song) return null;
      if (song.audioBuffer) return song.audioBuffer;
      if (!song.audioUrl || typeof fetch !== 'function') return null;
      if (this.trackBufferCache.has(song.id)) {
        return this.trackBufferCache.get(song.id);
      }
      const ctx = this.ensureContext();
      const res = await fetch(song.audioUrl);
      if (!res.ok) throw new Error(`Audio fetch failed: ${song.audioUrl}`);
      const arrBuf = await res.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrBuf.slice(0));
      song.audioBuffer = decoded;
      this.trackBufferCache.set(song.id, decoded);
      return decoded;
    }

    // ==================== LOBBY PREVIEW (CROSSFADE REAL OGG DROP) ====================
    async startLobbyPreview(song) {
      this.stopLobbyPreview();
      const req = ++this.previewRequest;
      if (!song) return;
      try { await this.prepare(); } catch (_) { return; }
      if (req !== this.previewRequest || this.isPlaying) return;

      let buf = null;
      try { buf = await this.loadTrackBuffer(song); } catch (_) { return; }
      if (!buf || req !== this.previewRequest || this.isPlaying || this.ctx.state !== 'running') return;

      const src = this.ctx.createBufferSource();
      const fade = this.ctx.createGain();
      src.buffer = buf;
      src.loop = true;
      // Preview starts right at the main drop (~28% into the track) for instant excitement
      const dropOffset = song.isCustom ? 0 : Math.min(Math.max(0, buf.duration * 0.28), Math.max(0, buf.duration - 16));
      src.loopStart = dropOffset;
      src.loopEnd = Math.min(buf.duration, dropOffset + 16);

      const now = this.ctx.currentTime;
      fade.gain.setValueAtTime(0.001, now);
      if (typeof fade.gain.linearRampToValueAtTime === 'function') {
        fade.gain.linearRampToValueAtTime(1.0, now + 0.35);
      } else {
        fade.gain.setValueAtTime(1.0, now);
      }

      src.connect(fade);
      fade.connect(this.previewGain);
      this._trackVoice(src, this.previewGain, [fade]);
      src.start(now, dropOffset);
      this.previewNode = src;
    }

    stopLobbyPreview() {
      this.previewRequest++;
      this._stopVoices(this.previewGain);
      if (this.previewNode) {
        try { this.previewNode.stop(); } catch (_) {}
        try { this.previewNode.disconnect(); } catch (_) {}
        this.previewNode = null;
      }
    }

    // ==================== GAMEPLAY PLAYBACK (REAL OGG / CUSTOM MP3) ====================
    startSong(song) {
      this.stopLobbyPreview();
      this.stopSong();
      this.ensureContext();

      this.currentSong = song;
      this.isPlaying = true;
      this.isPaused = false;
      this.pausedElapsed = 0;
      this.resumeBaseElapsed = 0;
      const req = ++this.startRequest;
      const startAt = this.ctx.currentTime + 0.04;
      this.resumeAnchorCtxTime = startAt;
      this.songStartCtxTime = startAt;

      if (song.audioBuffer) {
        this._startAudioBuffer(song.audioBuffer, 0);
      } else if (song.audioUrl && typeof fetch === 'function') {
        this.loadTrackBuffer(song).then(buf => {
          if (!buf || req !== this.startRequest || !this.isPlaying || this.isPaused) return;
          const elapsed = this.getSongTime();
          this._startAudioBuffer(buf, elapsed);
        }).catch(() => {});
      }
    }

    _startAudioBuffer(buffer, offsetSec) {
      if (!buffer || !this.ctx) return;
      this._stopVoices(this.bgmGain);
      const src = this.ctx.createBufferSource();
      const fade = this.ctx.createGain();
      src.buffer = buffer;

      const startAt = this.ctx.currentTime + 0.04;
      fade.gain.setValueAtTime(0.01, startAt);
      if (typeof fade.gain.linearRampToValueAtTime === 'function') {
        fade.gain.linearRampToValueAtTime(1.0, startAt + 0.08);
      } else {
        fade.gain.setValueAtTime(1.0, startAt);
      }

      src.connect(fade);
      fade.connect(this.bgmGain);
      this.songStartCtxTime = startAt - offsetSec;
      this._trackVoice(src, this.bgmGain, [fade]);
      src.start(startAt, Math.min(Math.max(0, offsetSec), Math.max(0, buffer.duration - 0.05)));
      this.activeSourceNode = src;
    }

    getSongTime() {
      if (!this.isPlaying || !this.ctx) return 0;
      if (this.isPaused) return this.pausedElapsed;
      if (typeof this.resumeAnchorCtxTime === 'number' && this.resumeBaseElapsed > 0) {
        return Math.max(0, this.resumeBaseElapsed + Math.max(0, this.ctx.currentTime - this.resumeAnchorCtxTime));
      }
      return Math.max(0, this.ctx.currentTime - this.songStartCtxTime);
    }

    pauseSong() {
      if (!this.isPlaying || this.isPaused) return;
      this.pausedElapsed = this.getSongTime();
      this.isPaused = true;
      this._stopVoices(this.bgmGain);
      this.activeSourceNode = null;
    }

    resumeSong() {
      if (!this.isPlaying || !this.isPaused) return;
      this.ensureContext();
      this.isPaused = false;
      this.resumeBaseElapsed = this.pausedElapsed;
      this.resumeAnchorCtxTime = this.ctx.currentTime + 0.04;
      if (this.currentSong && this.currentSong.audioBuffer) {
        this._startAudioBuffer(this.currentSong.audioBuffer, this.pausedElapsed);
      } else {
        this.songStartCtxTime = this.ctx.currentTime + 0.04 - this.pausedElapsed;
      }
    }

    stopSong() {
      this.startRequest++;
      this.isPlaying = false;
      this.isPaused = false;
      this.pausedElapsed = 0;
      this._stopVoices(this.bgmGain);
      this.activeSourceNode = null;
    }

    _readDuration(file) {
      if (typeof Audio === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) {
        return Promise.resolve(null);
      }
      return new Promise(resolve => {
        const url = URL.createObjectURL(file);
        const el = new Audio();
        const done = val => { URL.revokeObjectURL(url); el.src = ''; resolve(val); };
        el.preload = 'metadata';
        el.onloadedmetadata = () => done(Number.isFinite(el.duration) ? el.duration : null);
        el.onerror = () => done(null);
        setTimeout(() => done(null), 1500);
        el.src = url;
      });
    }

    async loadCustomMp3(file) {
      if (!file || file.size > 25 * 1024 * 1024) throw new Error('mp3_size');
      const metaDuration = await this._readDuration(file);
      if (metaDuration !== null && (metaDuration < 8 || metaDuration > 180)) {
        throw new Error('mp3_length');
      }

      this.ensureContext();
      const arrayBuf = await file.arrayBuffer();
      const fileHash = hashBytes(new Uint8Array(arrayBuf));
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuf.slice(0));
      const duration = audioBuffer.duration;
      if (!Number.isFinite(duration) || duration < 8 || duration > 180) {
        throw new Error('mp3_length');
      }

      const mins = Math.floor(duration / 60);
      const secs = Math.floor(duration % 60);
      const lengthText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      const raw = audioBuffer.getChannelData(0);
      const sr = audioBuffer.sampleRate;
      const winSamples = Math.max(1, Math.floor(sr * 0.05));
      const energies = [];
      for (let i = 0; i < Math.min(raw.length, Math.floor(duration * sr)); i += winSamples) {
        let sum = 0;
        const end = Math.min(raw.length, i + winSamples);
        for (let j = i; j < end; j++) sum += raw[j] * raw[j];
        energies.push(Math.sqrt(sum / (end - i)));
      }

      const customPeaks = [];
      for (let w = 4; w < energies.length - 4; w++) {
        const localAvg = (energies[w - 3] + energies[w - 2] + energies[w - 1] + energies[w + 1] + energies[w + 2]) / 5;
        if (energies[w] > localAvg * 1.32 && energies[w] > 0.03) {
          const t = w * 0.05;
          if (t > 1.8 && t < duration - 1.5) {
            if (!customPeaks.length || t - customPeaks[customPeaks.length - 1] >= 0.24) {
              customPeaks.push(Number(t.toFixed(3)));
            }
          }
        }
      }

      const cleanTitle = String(file.name || 'Custom').replace(/\.[^/.]+$/, '').slice(0, 26) || 'Custom Track';
      const usedFallbackGrid = customPeaks.length <= 12;
      const customSong = {
        id: `custom_${fileHash}_${file.size}`,
        title: cleanTitle,
        bpm: 135,
        bpmEstimated: usedFallbackGrid,
        duration: Number(duration.toFixed(1)),
        lengthText,
        artist: I18n.t('custom_track_badge'),
        descKey: usedFallbackGrid ? 'custom_grid_hint' : 'upload_mp3',
        bgUrl: './assets/screens/bg_05_quantum_arena.png',
        colors: ['#ffd84d', '#00f2ff'],
        badge: 'MP3',
        isCustom: true,
        audioBuffer,
        customPeaks
      };

      const existingIdx = window.SONGS.findIndex(s => s.isCustom);
      if (existingIdx >= 0) window.SONGS[existingIdx] = customSong;
      else window.SONGS.push(customSong);
      return customSong;
    }

    // ==================== REAL AUDIO-SYNCED BEATMAP + 8-BEAT RUSH BARRAGE ====================
    generateChart(song, difficulty) {
      const rand = seededRandom(song.title.length * 997 + difficulty.charCodeAt(0) * 131 + Math.round(song.bpm));
      const realMap = (!song.isCustom && window.SONG_BEATMAPS) ? window.SONG_BEATMAPS[song.id] : null;
      const effectiveBpm = (realMap && realMap.bpm) ? realMap.bpm : song.bpm;
      const beatSec = 60 / effectiveBpm;
      const branchStart = Math.min(24, song.duration * 0.34);
      const branchDecision = branchStart + 3.2;
      const branchEnd = Math.min(song.duration - 12, branchDecision + 18);
      const hasBranch = difficulty !== 'EASY' && song.duration >= 36 && branchEnd > branchDecision + 4;

      // Highlight Drop 8-beat RUSH BARRAGE window synced to the track's REAL loudest energy drop!
      const rushStart = (realMap && realMap.dropStart)
        ? realMap.dropStart
        : Math.min(song.duration - 8, Math.max(beatSec * 32, song.duration * 0.52));
      const rushEnd = Math.min(song.duration - 4, rushStart + beatSec * 8);
      const slowMoStart = Math.max(0, song.duration - 2.6);

      const notes = [];
      let currentLane = 1;

      if (song.isCustom && Array.isArray(song.customPeaks) && song.customPeaks.length > 12) {
        const stride = difficulty === 'EASY' ? 2 : 1;
        song.customPeaks.forEach((t, idx) => {
          if (idx % stride !== 0) return;
          if (hasBranch && Math.abs(t - branchDecision) < 0.7) return;
          if (rand() < 0.42) {
            currentLane = Math.max(0, Math.min(2, currentLane + (rand() < 0.5 ? -1 : 1)));
          }
          let type = 'tap';
          if (difficulty !== 'EASY' && idx % 5 === 4) {
            type = rand() < 0.5 ? 'swipeL' : 'swipeR';
          }
          const inBranch = hasBranch && t > branchDecision && t < branchEnd;
          notes.push({
            id: 0,
            time: t,
            lane: currentLane,
            type,
            branch: inBranch ? 'both' : 'main',
            isRushBarrage: t >= rushStart && t <= rushEnd,
            hit: false
          });
        });
      } else if (realMap && Array.isArray(realMap.beats) && realMap.beats.length > 16) {
        // EXACT REAL AUDIO KICK/SNARE ONSET-SYNCED BEATMAP!
        // Each entry: [timeSec, isMainBeat (1/0), onsetStrength (0..1.5), energy (0..1)]
        let lastNoteTime = -99;
        const minGap = difficulty === 'EASY' ? beatSec * 0.85 : (difficulty === 'NORMAL' ? beatSec * 0.45 : beatSec * 0.28);

        realMap.beats.forEach((ev, stepIdx) => {
          const t = ev[0];
          const onMainBeat = ev[1] === 1;
          const onset = ev[2];
          const energy = ev[3];

          if (hasBranch && Math.abs(t - branchDecision) < 0.65) return;
          if (t - lastNoteTime < minGap) return;

          const inRushBarrage = (t >= rushStart && t <= rushEnd);
          let shouldPlace = false;
          if (inRushBarrage) {
            shouldPlace = (difficulty === 'EASY') ? onMainBeat : (onMainBeat || onset >= 0.45);
          } else if (difficulty === 'EASY') {
            // Land cleanly on real main beats (skip quiet intro bars with very low energy/onset)
            shouldPlace = onMainBeat && (energy >= 0.22 || onset >= 0.55) && (stepIdx % 16 !== 14);
          } else if (difficulty === 'NORMAL') {
            // Real main beats + strong off-beat snare/synth hits during energetic sections
            shouldPlace = onMainBeat || (onset >= 0.72 && energy >= 0.45);
          } else if (difficulty === 'HARD') {
            shouldPlace = onMainBeat || (onset >= 0.48 && energy >= 0.35);
          } else {
            // EXTREME: dense musical stream following real drum & synth transients
            shouldPlace = onMainBeat || onset >= 0.30 || energy >= 0.55;
          }

          if (!shouldPlace) return;
          lastNoteTime = t;

          if (inRushBarrage) {
            currentLane = (stepIdx % 3);
          } else if (onset >= 0.85 || rand() < (difficulty === 'EASY' ? 0.38 : 0.58)) {
            const delta = rand() < 0.5 ? -1 : 1;
            currentLane = Math.max(0, Math.min(2, currentLane + delta));
          }

          // Place directional Swipe notes on big musical accents (high onset strength on main beats!)
          let type = 'tap';
          const isBigAccent = onMainBeat && onset >= 0.92;
          const swipeChance = difficulty === 'EASY' ? 0.08 : (difficulty === 'NORMAL' ? 0.22 : (difficulty === 'HARD' ? 0.32 : 0.38));
          if (inRushBarrage && onMainBeat && stepIdx % 4 === 0 && difficulty !== 'EASY') {
            type = (stepIdx % 8 === 0) ? 'swipeL' : 'swipeR';
          } else if ((isBigAccent && rand() < swipeChance * 1.45) || (onMainBeat && rand() < swipeChance * 0.65)) {
            type = (currentLane === 0) ? 'swipeR' : (currentLane === 2 ? 'swipeL' : (rand() < 0.5 ? 'swipeL' : 'swipeR'));
          }

          const inBranch = hasBranch && t > branchDecision && t < branchEnd;
          notes.push({
            id: 0,
            time: Number(t.toFixed(3)),
            lane: currentLane,
            type,
            branch: inBranch ? 'both' : 'main',
            isRushBarrage: inRushBarrage,
            hit: false
          });

          if (inBranch && onMainBeat && difficulty !== 'EASY' && !inRushBarrage && energy >= 0.4) {
            notes.push({
              id: 0,
              time: Number((t + beatSec * 0.5).toFixed(3)),
              lane: (currentLane + 1) % 3,
              type: 'tap',
              branch: 'rush_only',
              isRushBarrage: false,
              hit: false
            });
          }
        });
      } else {
        const stepDiv = (difficulty === 'EASY') ? 1 : 2;
        const stepSec = beatSec / stepDiv;
        const startT = beatSec * 4;
        const endT = song.duration - 2.2;
        let stepIdx = 0;

        for (let t = startT; t <= endT; t += stepSec, stepIdx++) {
          if (hasBranch && Math.abs(t - branchDecision) < 0.65) continue;

          const inRushBarrage = (t >= rushStart && t <= rushEnd);
          const onMainBeat = (stepIdx % stepDiv === 0);
          let shouldPlace = false;
          if (inRushBarrage) {
            // 8-beat highlight Rush Barrage: dense rhythmic stream!
            shouldPlace = (difficulty === 'EASY') ? onMainBeat : true;
          } else if (difficulty === 'EASY') {
            shouldPlace = (stepIdx % 1 === 0) && (stepIdx % 8 !== 7);
          } else if (difficulty === 'NORMAL') {
            shouldPlace = onMainBeat || (stepIdx % 8 === 5);
          } else if (difficulty === 'HARD') {
            shouldPlace = onMainBeat || (stepIdx % 4 === 3) || (stepIdx % 8 === 1);
          } else {
            shouldPlace = true;
          }

          if (!shouldPlace) continue;

          if (inRushBarrage) {
            // Alternating left-center-right fever sweep during Rush Barrage
            currentLane = (stepIdx % 3);
          } else if (rand() < (difficulty === 'EASY' ? 0.35 : 0.55)) {
            const delta = rand() < 0.5 ? -1 : 1;
            currentLane = Math.max(0, Math.min(2, currentLane + delta));
          }

          let type = 'tap';
          const swipeChance = difficulty === 'EASY' ? 0.06 : (difficulty === 'NORMAL' ? 0.2 : (difficulty === 'HARD' ? 0.3 : 0.36));
          if (inRushBarrage && stepIdx % 4 === 0 && difficulty !== 'EASY') {
            type = (stepIdx % 8 === 0) ? 'swipeL' : 'swipeR';
          } else if (onMainBeat && rand() < swipeChance) {
            type = (currentLane === 0) ? 'swipeR' : (currentLane === 2 ? 'swipeL' : (rand() < 0.5 ? 'swipeL' : 'swipeR'));
          }

          const inBranch = hasBranch && t > branchDecision && t < branchEnd;
          notes.push({
            id: 0,
            time: Number(t.toFixed(3)),
            lane: currentLane,
            type,
            branch: inBranch ? 'both' : 'main',
            isRushBarrage: inRushBarrage,
            hit: false
          });

          if (inBranch && onMainBeat && difficulty !== 'EASY' && !inRushBarrage) {
            notes.push({
              id: 0,
              time: Number((t + stepSec * 0.5).toFixed(3)),
              lane: (currentLane + 1) % 3,
              type: 'tap',
              branch: 'rush_only',
              isRushBarrage: false,
              hit: false
            });
          } else if (difficulty === 'EXTREME' && onMainBeat && stepIdx % 4 === 2 && !inRushBarrage) {
            notes.push({
              id: 0,
              time: Number((t + beatSec * 0.25).toFixed(3)),
              lane: currentLane,
              type: 'tap',
              branch: inBranch ? 'both' : 'main',
              isRushBarrage: false,
              hit: false
            });
          }
        }
      }

      notes.sort((a, b) => a.time - b.time);
      notes.forEach((n, idx) => { n.id = idx; });
      return {
        notes,
        hasBranch,
        branchStart: hasBranch ? branchStart : 9999,
        branchDecision: hasBranch ? branchDecision : 9999,
        branchEnd: hasBranch ? branchEnd : 9999,
        rushStart,
        rushEnd,
        slowMoStart
      };
    }

    // ==================== TACTILE BEAT SABER LAYERED HIT & SLICE SFX ====================
    playHitSfx(type = 'tap', isFever = false, combo = 0) {
      try {
        this.ensureContext();
        const now = this.ctx.currentTime;

        // Layer 1: Punchy Sub-Thump Kick Impact (145Hz -> 48Hz in 48ms)
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(type === 'tap' ? 148 : 175, now);
        sub.frequency.exponentialRampToValueAtTime(46, now + 0.052);
        subGain.gain.setValueAtTime(0.32, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
        sub.connect(subGain);
        subGain.connect(this.sfxGain);
        this._trackVoice(sub, this.sfxGain, [subGain]);
        sub.start(now);
        sub.stop(now + 0.07);

        // Layer 2: Crisp Plasma Saber Slice Noise Burst (filtered high-frequency snap)
        const nLen = Math.floor(this.ctx.sampleRate * (type === 'tap' ? 0.045 : 0.085));
        const nBuf = this.ctx.createBuffer(1, nLen, this.ctx.sampleRate);
        const data = nBuf.getChannelData(0);
        for (let i = 0; i < nLen; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / nLen, 1.8);
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = nBuf;
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'bandpass';
        hp.frequency.setValueAtTime(type === 'tap' ? 2800 : 4200, now);
        hp.Q.setValueAtTime(1.4, now);
        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(type === 'tap' ? 0.22 : 0.30, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + (type === 'tap' ? 0.045 : 0.085));
        noise.connect(hp);
        hp.connect(nGain);
        nGain.connect(this.sfxGain);
        this._trackVoice(noise, this.sfxGain, [hp, nGain]);
        noise.start(now);

        // Layer 3: Sparkling Harmonic Chime (subtle pitch lift with combo & Fever)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const comboPitch = 1 + Math.min(combo || 0, 40) * 0.004;
        if (type === 'tap') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime((isFever ? 1046.5 : 880) * comboPitch, now);
          osc.frequency.exponentialRampToValueAtTime((isFever ? 1567.98 : 1318.5) * comboPitch, now + 0.06);
        } else {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(659.25 * comboPitch, now);
          osc.frequency.exponentialRampToValueAtTime(1975.5 * comboPitch, now + 0.095);
        }
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        this._trackVoice(osc, this.sfxGain, [gain]);
        osc.start(now);
        osc.stop(now + 0.105);
      } catch (_) {}
    }

    playMissSfx() {
      try {
        this.ensureContext();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(165, now);
        if (typeof osc.frequency.linearRampToValueAtTime === 'function') {
          osc.frequency.linearRampToValueAtTime(92, now + 0.14);
        }
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        this._trackVoice(osc, this.sfxGain, [gain]);
        osc.start(now);
        osc.stop(now + 0.16);
      } catch (_) {}
    }

    playFeverTriggerSfx() {
      try {
        this.ensureContext();
        const now = this.ctx.currentTime;
        [587.33, 739.99, 880, 1174.66].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + idx * 0.04);
          gain.gain.setValueAtTime(0.18, now + idx * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.28);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          this._trackVoice(osc, this.sfxGain, [gain]);
          osc.start(now + idx * 0.04);
          osc.stop(now + idx * 0.04 + 0.29);
        });
      } catch (_) {}
    }

    playUiClick() {
      try {
        this.ensureContext();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.045);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        this._trackVoice(osc, this.sfxGain, [gain]);
        osc.start(now);
        osc.stop(now + 0.055);
      } catch (_) {}
    }

    playClearFanfare() {
      try {
        this.ensureContext();
        const now = this.ctx.currentTime;
        [587.33, 739.99, 880, 1174.66, 1479.98].forEach((f, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now + i * 0.075);
          gain.gain.setValueAtTime(0.22, now + i * 0.075);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.075 + 0.45);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          this._trackVoice(osc, this.sfxGain, [gain]);
          osc.start(now + i * 0.075);
          osc.stop(now + i * 0.075 + 0.46);
        });
      } catch (_) {}
    }
  }

  window.AudioEngine = new AudioTrackEngine();
})();
