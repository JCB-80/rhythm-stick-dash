// Web Audio API Synthesizer, Custom MP3 Beat Analyzer & Synced Beatmap Generator
(function () {
  window.SONGS = [
    {
      id: 'galaxy_chase',
      title: 'Galaxy Chase',
      bpm: 132,
      duration: 64,
      lengthText: '01:04',
      artist: 'LUNA · SYNDICATE',
      descKey: 'song_1_desc',
      colors: ['#00f2ff', '#ff2bd6'],
      icon: '🌌',
      rootFreq: 220.0, // A3 minor
      scale: [0, 3, 5, 7, 10, 12, 15],
      melodyPattern: [0, 2, 3, 5, 3, 2, 1, 0, 2, 4, 5, 6, 5, 3, 2, 3]
    },
    {
      id: 'neon_pulse',
      title: 'Neon Pulse',
      bpm: 124,
      duration: 62,
      lengthText: '01:02',
      artist: 'KAI · CYBER BASS',
      descKey: 'song_2_desc',
      colors: ['#00ffaa', '#00b8ff'],
      icon: '⚡',
      rootFreq: 196.0, // G3 minor
      scale: [0, 3, 5, 7, 10, 12, 15],
      melodyPattern: [0, 0, 3, 2, 0, 4, 3, 1, 0, 2, 5, 4, 3, 2, 1, 0]
    },
    {
      id: 'silent_city',
      title: 'Silent City Break',
      bpm: 142,
      duration: 66,
      lengthText: '01:06',
      artist: 'ARIA · NIGHTWAVE',
      descKey: 'song_3_desc',
      colors: ['#8a5cff', '#00f2ff'],
      icon: '🌃',
      rootFreq: 246.94, // B3 minor
      scale: [0, 2, 3, 7, 10, 12, 14],
      melodyPattern: [5, 3, 2, 0, 2, 3, 5, 6, 5, 3, 4, 2, 3, 1, 2, 0]
    },
    {
      id: 'cyber_overdrive',
      title: 'Cyber Overdrive',
      bpm: 156,
      duration: 68,
      lengthText: '01:08',
      artist: 'NEO CORE',
      descKey: 'song_4_desc',
      colors: ['#ff2bd6', '#ffd84d'],
      icon: '🔥',
      rootFreq: 261.63, // C4 minor
      scale: [0, 3, 5, 6, 7, 10, 12],
      melodyPattern: [0, 4, 3, 6, 5, 4, 3, 2, 0, 5, 4, 6, 5, 3, 4, 6]
    }
  ];

  function midiOffsetToFreq(baseFreq, semitones) {
    return baseFreq * Math.pow(2, semitones / 12);
  }

  // Deterministic pseudo-random helper for consistent song charts
  function seededRandom(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  class AudioSynthEngine {
    constructor() {
      this.ctx = null;
      this.bgmGain = null;
      this.sfxGain = null;
      this.bgmVolume = 0.75;
      this.sfxVolume = 0.85;

      // Active song state
      this.isPlaying = false;
      this.isPaused = false;
      this.currentSong = null;
      this.songStartCtxTime = 0;
      this.pausedElapsed = 0;
      this.schedulerTimer = null;
      this.nextStepIndex = 0;
      this.customSourceNode = null;
      this.voices = new Set();

      // Lobby preview state
      this.previewTimer = null;
      this.previewStep = 0;
      this.previewRequest = 0;
    }

    ensureContext() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
        this.bgmGain = this.ctx.createGain();
        this.previewGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.bgmGain.gain.value = this.bgmVolume;
        this.previewGain.gain.value = this.bgmVolume * 0.28;
        this.sfxGain.gain.value = this.sfxVolume;
        this.bgmGain.connect(this.ctx.destination);
        this.previewGain.connect(this.ctx.destination);
        this.sfxGain.connect(this.ctx.destination);
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
        voice.node.onended();
      }
    }

    setVolumes(bgm, sfx) {
      this.bgmVolume = Number.isFinite(bgm) ? Math.max(0, Math.min(1, bgm)) : .75;
      this.sfxVolume = Number.isFinite(sfx) ? Math.max(0, Math.min(1, sfx)) : .85;
      if (this.bgmGain && this.ctx) {
        this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
      }
      if (this.previewGain && this.ctx) {
        this.previewGain.gain.setValueAtTime(this.bgmVolume * 0.28, this.ctx.currentTime);
      }
      if (this.sfxGain && this.ctx) {
        this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      }
    }

    // ==================== SYNTH INSTRUMENTS ====================
    triggerKick(time, dest, punch = 1.0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(155 * punch, time);
      osc.frequency.exponentialRampToValueAtTime(38, time + 0.14);
      gain.gain.setValueAtTime(0.65, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
      osc.connect(gain);
      gain.connect(dest);
      this._trackVoice(osc, dest, [gain]);
      osc.start(time);
      osc.stop(time + 0.23);
    }

    triggerSnare(time, dest) {
      // Crisp noise burst + body tone
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.14);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.32));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(950, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.36, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      this._trackVoice(noise, dest, [filter, gain]);
      noise.start(time);
    }

    triggerHiHat(time, dest, open = false) {
      const dur = open ? 0.12 : 0.045;
      const bufferSize = Math.floor(this.ctx.sampleRate * dur);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(6200, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(open ? 0.16 : 0.11, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      this._trackVoice(noise, dest, [filter, gain]);
      noise.start(time);
    }

    triggerBass(time, freq, dur, dest) {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq * 0.5, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(680, time);
      filter.frequency.exponentialRampToValueAtTime(180, time + dur);

      gain.gain.setValueAtTime(0.28, time);
      gain.gain.exponentialRampToValueAtTime(0.008, time + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      this._trackVoice(osc, dest, [gain, filter]);
      osc.start(time);
      osc.stop(time + dur + 0.01);
    }

    triggerLead(time, freq, dur, dest, bright = false) {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'square';
      osc1.frequency.setValueAtTime(freq, time);
      osc2.frequency.setValueAtTime(freq * 1.005, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(bright ? 3600 : 2200, time);
      filter.frequency.exponentialRampToValueAtTime(700, time + dur);

      gain.gain.setValueAtTime(0.14, time);
      gain.gain.exponentialRampToValueAtTime(0.005, time + dur);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      this._trackVoice(osc1, dest);
      this._trackVoice(osc2, dest, [filter, gain]);
      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + dur + 0.01);
      osc2.stop(time + dur + 0.01);
    }

    // ==================== LOBBY PREVIEW ====================
    async startLobbyPreview(song) {
      this.stopLobbyPreview();
      const request = this.previewRequest;
      if (!song) return;
      try { await this.prepare(); } catch (_) { return; }
      if (request !== this.previewRequest || this.isPlaying) return;
      if (song.isCustom && song.audioBuffer) {
        if (this.ctx.state !== 'running') return;
        const src = this.ctx.createBufferSource();
        src.buffer = song.audioBuffer;
        src.loop = true;
        src.loopStart = 0;
        src.loopEnd = Math.min(15, song.audioBuffer.duration);
        src.connect(this.previewGain);
        src.start(0);
        this.previewCustomNode = src;
        return;
      }
      const stepMs = (60 / song.bpm / 2) * 1000;
      this.previewStep = 0;
      this.previewTimer = setInterval(() => {
        if (!this.ctx || this.ctx.state !== 'running' || this.isPlaying) return;
        const now = this.ctx.currentTime + 0.02;
        const s = this.previewStep++;

        if (s % 2 === 0) this.triggerKick(now, this.previewGain, 0.85);
        if (s % 4 === 2) this.triggerHiHat(now, this.previewGain, false);
        const noteIdx = song.melodyPattern[s % song.melodyPattern.length];
        const semi = song.scale[noteIdx % song.scale.length];
        this.triggerLead(now, midiOffsetToFreq(song.rootFreq, semi), 0.18, this.previewGain, false);
      }, stepMs);
    }

    stopLobbyPreview() {
      this.previewRequest++;
      this._stopVoices(this.previewGain);
      if (this.previewTimer) {
        clearInterval(this.previewTimer);
        this.previewTimer = null;
      }
      if (this.previewCustomNode) {
        try { this.previewCustomNode.stop(); } catch (_) {}
        this.previewCustomNode.disconnect();
        this.previewCustomNode = null;
      }
    }

    // ==================== GAMEPLAY PLAYBACK & SEQUENCER ====================
    startSong(song) {
      this.stopLobbyPreview();
      this.stopSong();
      this.ensureContext();

      this.currentSong = song;
      this.isPlaying = true;
      this.isPaused = false;
      this.pausedElapsed = 0;
      this.nextStepIndex = 0;
      this.songStartCtxTime = this.ctx.currentTime + 0.08;

      if (song.isCustom && song.audioBuffer) {
        this._startCustomBuffer(0);
      } else {
        this._startSynthScheduler();
      }
    }

    _startCustomBuffer(offsetSec) {
      if (!this.currentSong || !this.currentSong.audioBuffer) return;
      this._stopVoices(this.bgmGain);
      const src = this.ctx.createBufferSource();
      src.buffer = this.currentSong.audioBuffer;
      src.connect(this.bgmGain);
      const startAt = this.ctx.currentTime + 0.04;
      this.songStartCtxTime = startAt - offsetSec;
      this._trackVoice(src, this.bgmGain);
      src.start(startAt, Math.min(offsetSec, src.buffer.duration));
      this.customSourceNode = src;
    }

    _startSynthScheduler() {
      const song = this.currentSong;
      const sixteenthDur = 60 / song.bpm / 4;

      const scheduleTick = () => {
        if (!this.isPlaying || this.isPaused || !this.currentSong) return;
        const lookAhead = 0.16;
        // Skip expired beats after timer throttling instead of emitting a backlog.
        const minStep = Math.max(0, Math.ceil((this.ctx.currentTime - this.songStartCtxTime - .015) / sixteenthDur));
        this.nextStepIndex = Math.max(this.nextStepIndex, minStep);
        while (this.songStartCtxTime + this.nextStepIndex * sixteenthDur < this.ctx.currentTime + lookAhead) {
          const stepTime = this.songStartCtxTime + this.nextStepIndex * sixteenthDur;
          const elapsed = this.nextStepIndex * sixteenthDur;
          if (elapsed <= song.duration) {
            this._scheduleSynthStep(song, this.nextStepIndex, stepTime, sixteenthDur);
          }
          this.nextStepIndex++;
        }
      };

      scheduleTick();
      this.schedulerTimer = setInterval(scheduleTick, 40);
    }

    _scheduleSynthStep(song, step, time, sixteenthDur) {
      const barStep = step % 16;
      const barNum = Math.floor(step / 16);
      const isClimax = barNum >= 8;
      const progRoots = [0, -4, 3, -2];
      const barRootOffset = progRoots[barNum % progRoots.length];
      const rootFreq = midiOffsetToFreq(song.rootFreq, barRootOffset);

      // Four-on-the-floor Kick + energetic syncopation in climax
      if (barStep % 4 === 0 || (isClimax && barStep === 14)) {
        this.triggerKick(time, this.bgmGain, isClimax ? 1.12 : 1.0);
      }
      // Snare on 4 & 12
      if (barStep === 4 || barStep === 12) {
        this.triggerSnare(time, this.bgmGain);
      }
      // Off-beat Hi-hats
      if (barStep % 4 === 2) {
        this.triggerHiHat(time, this.bgmGain, barStep === 10);
      } else if (isClimax && barStep % 2 === 1) {
        this.triggerHiHat(time, this.bgmGain, false);
      }
      // Rolling Cyber Bass on 8ths
      if (barStep % 2 === 0) {
        const octave = (barStep % 4 === 2) ? 12 : 0;
        this.triggerBass(time, midiOffsetToFreq(rootFreq, octave), sixteenthDur * 1.8, this.bgmGain);
      }
      // Synth Lead Melody
      if (barStep % 2 === 0 || (isClimax && barStep === 7)) {
        const patIdx = Math.floor((step / 2) % song.melodyPattern.length);
        const scaleDeg = song.melodyPattern[patIdx];
        const semi = song.scale[scaleDeg % song.scale.length] + (isClimax ? 12 : 0);
        this.triggerLead(time, midiOffsetToFreq(rootFreq, semi), sixteenthDur * 1.9, this.bgmGain, isClimax);
      }
    }

    getSongTime() {
      if (!this.isPlaying || !this.ctx) return 0;
      if (this.isPaused) return this.pausedElapsed;
      return Math.max(this.pausedElapsed, this.ctx.currentTime - this.songStartCtxTime);
    }

    pauseSong() {
      if (!this.isPlaying || this.isPaused) return;
      this.pausedElapsed = this.getSongTime();
      this.isPaused = true;
      this._stopVoices(this.bgmGain);
      if (this.schedulerTimer) {
        clearInterval(this.schedulerTimer);
        this.schedulerTimer = null;
      }
      if (this.customSourceNode) {
        try { this.customSourceNode.stop(); } catch (_) {}
        this.customSourceNode = null;
      }
    }

    resumeSong() {
      if (!this.isPlaying || !this.isPaused) return;
      this.ensureContext();
      this.isPaused = false;
      if (this.currentSong && this.currentSong.isCustom && this.currentSong.audioBuffer) {
        this._startCustomBuffer(this.pausedElapsed);
      } else {
        const sixteenthDur = 60 / this.currentSong.bpm / 4;
        this.songStartCtxTime = this.ctx.currentTime + .04 - this.pausedElapsed;
        this.nextStepIndex = Math.ceil(this.pausedElapsed / sixteenthDur);
        this._startSynthScheduler();
      }
    }

    stopSong() {
      this._stopVoices(this.bgmGain);
      this.isPlaying = false;
      this.isPaused = false;
      if (this.schedulerTimer) {
        clearInterval(this.schedulerTimer);
        this.schedulerTimer = null;
      }
      if (this.customSourceNode) {
        try { this.customSourceNode.stop(); } catch (_) {}
        this.customSourceNode = null;
      }
    }

    // ==================== CUSTOM MP3 UPLOAD & ONSET BEAT DETECTOR ====================
    async _readDuration(file) {
      const url = URL.createObjectURL(file);
      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      try {
        return await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('mp3_error')), 8000);
          audio.onloadedmetadata = () => { clearTimeout(timer); resolve(audio.duration); };
          audio.onerror = () => { clearTimeout(timer); reject(new Error('mp3_error')); };
          audio.src = url;
        });
      } finally {
        audio.onloadedmetadata = audio.onerror = null;
        audio.removeAttribute('src'); audio.load(); URL.revokeObjectURL(url);
      }
    }

    async loadCustomMp3(file) {
      if (!file || file.size > 25 * 1024 * 1024 || !file.size) throw new Error('mp3_size');
      const metadataDuration = await this._readDuration(file);
      if (!Number.isFinite(metadataDuration) || metadataDuration < 8 || metadataDuration > 180) throw new Error('mp3_length');
      await this.prepare();
      const arrayBuf = await file.arrayBuffer();
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuf);
      if (!Number.isFinite(audioBuffer.duration) || audioBuffer.duration < 8 || audioBuffer.duration > 180.1) throw new Error('mp3_length');
      const duration = Math.min(audioBuffer.duration, 180); // Cap at 3 mins for snappy play
      const mins = Math.floor(duration / 60);
      const secs = Math.floor(duration % 60);
      const lengthText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      // Extract onset peaks from channel 0 energy envelope
      const raw = audioBuffer.getChannelData(0);
      const sr = audioBuffer.sampleRate;
      const winSamples = Math.floor(sr * 0.05); // 50ms window
      const energies = [];
      for (let i = 0; i < Math.min(raw.length, Math.floor(duration * sr)); i += winSamples) {
        let sum = 0;
        const end = Math.min(raw.length, i + winSamples);
        for (let j = i; j < end; j++) sum += raw[j] * raw[j];
        energies.push(Math.sqrt(sum / (end - i)));
        if (energies.length % 400 === 0) await new Promise(resolve => setTimeout(resolve, 0));
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

      const cleanTitle = file.name.replace(/\.[^/.]+$/, '').slice(0, 26) || 'Custom Track';
      const customSong = {
        id: 'custom_' + Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()))).map(n => n.toString(16).padStart(2, '0')).join('').slice(0, 24),
        title: cleanTitle,
        bpm: 135, // Fallback grid, explicitly labelled as an estimate in the UI.
        duration: Number(duration.toFixed(1)),
        lengthText,
        artist: I18n.t('custom_track_badge'),
        descKey: 'upload_mp3',
        colors: ['#ffd84d', '#00f2ff'],
        icon: '🎧',
        isCustom: true,
        audioBuffer,
        customPeaks
      };

      // Replace existing custom track or append
      const existingIdx = window.SONGS.findIndex(s => s.isCustom);
      if (existingIdx >= 0) {
        window.SONGS[existingIdx] = customSong;
      } else {
        window.SONGS.push(customSong);
      }
      return customSong;
    }

    // ==================== BEATMAP / CHART GENERATOR ====================
    generateChart(song, difficulty) {
      const rand = seededRandom(song.title.length * 997 + difficulty.charCodeAt(0) * 131);
      const beatSec = 60 / song.bpm;
      const hasBranch = difficulty !== 'EASY' && song.duration >= 24;
      const branchStart = hasBranch ? Math.min(22, song.duration * 0.34) : 9999;
      const branchDecision = hasBranch ? branchStart + 3.2 : 9999;
      const branchEnd = hasBranch ? Math.min(song.duration - 10, branchDecision + 18) : 9999;

      const notes = [];
      let currentLane = 1; // 0: Left, 1: Center, 2: Right

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
            id: notes.length,
            time: t,
            lane: currentLane,
            type,
            branch: inBranch ? 'both' : 'main',
            hit: false
          });
        });
      } else {
        // Musical grid synced directly to song BPM
        const stepDiv = (difficulty === 'EASY') ? 1 : (difficulty === 'NORMAL' ? 2 : 2);
        const stepSec = beatSec / stepDiv;
        const startT = beatSec * 4;
        const endT = song.duration - 2.2;
        let stepIdx = 0;

        for (let t = startT; t <= endT; t += stepSec, stepIdx++) {
          // Leave a clean 0.8s breathing window right at the Y-fork split point
          if (hasBranch && Math.abs(t - branchDecision) < 0.65) continue;

          const onMainBeat = (stepIdx % stepDiv === 0);
          let shouldPlace = false;
          if (difficulty === 'EASY') {
            shouldPlace = (stepIdx % 1 === 0) && (stepIdx % 8 !== 7);
          } else if (difficulty === 'NORMAL') {
            shouldPlace = onMainBeat || (stepIdx % 8 === 5);
          } else if (difficulty === 'HARD') {
            shouldPlace = onMainBeat || (stepIdx % 4 === 3) || (stepIdx % 8 === 1);
          } else {
            // EXTREME: dense rhythm stream + occasional 16th double tap
            shouldPlace = true;
          }

          if (!shouldPlace) continue;

          if (rand() < (difficulty === 'EASY' ? 0.35 : 0.55)) {
            const delta = rand() < 0.5 ? -1 : 1;
            currentLane = Math.max(0, Math.min(2, currentLane + delta));
          }

          let type = 'tap';
          const swipeChance = difficulty === 'EASY' ? 0.06 : (difficulty === 'NORMAL' ? 0.2 : (difficulty === 'HARD' ? 0.3 : 0.36));
          if (onMainBeat && rand() < swipeChance) {
            type = (currentLane === 0) ? 'swipeR' : (currentLane === 2 ? 'swipeL' : (rand() < 0.5 ? 'swipeL' : 'swipeR'));
          }

          const inBranch = hasBranch && t > branchDecision && t < branchEnd;
          notes.push({
            id: notes.length,
            time: Number(t.toFixed(3)),
            lane: currentLane,
            type,
            branch: inBranch ? 'both' : 'main',
            hit: false
          });

          // Extra rush-only bonus orbs on the RUSH 2x route!
          if (inBranch && onMainBeat && difficulty !== 'EASY') {
            notes.push({
              id: notes.length,
              time: Number((t + stepSec * 0.5).toFixed(3)),
              lane: (currentLane + 1) % 3,
              type: 'tap',
              branch: 'rush_only',
              hit: false
            });
          } else if (difficulty === 'EXTREME' && onMainBeat && stepIdx % 4 === 2) {
            notes.push({
              id: notes.length,
              time: Number((t + beatSec * 0.25).toFixed(3)),
              lane: currentLane,
              type: 'tap',
              branch: inBranch ? 'both' : 'main',
              hit: false
            });
          }
        }
      }

      notes.sort((a, b) => a.time - b.time);
      notes.forEach((n, index) => { n.id = index; });
      return {
        notes,
        hasBranch,
        branchStart,
        branchDecision,
        branchEnd
      };
    }

    // ==================== GAMEPLAY & UI SFX ====================
    playHitSfx(type = 'tap', isFever = false) {
      try {
        this.ensureContext();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        if (type === 'tap') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(isFever ? 880 : 660, now);
          osc.frequency.exponentialRampToValueAtTime(isFever ? 1320 : 990, now + 0.07);
        } else {
          // Neon sword slash whoosh-chime
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(520, now);
          osc.frequency.exponentialRampToValueAtTime(1480, now + 0.11);
        }

        gain.gain.setValueAtTime(0.26, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        this._trackVoice(osc, this.sfxGain, [gain]);
        osc.start(now);
        osc.stop(now + 0.12);
      } catch (_) {}
    }

    playMissSfx() {
      try {
        this.ensureContext();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(170, now);
        osc.frequency.linearRampToValueAtTime(95, now + 0.14);
        gain.gain.setValueAtTime(0.18, now);
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
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + idx * 0.045);
          gain.gain.setValueAtTime(0.18, now + idx * 0.045);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.28);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          this._trackVoice(osc, this.sfxGain, [gain]);
          osc.start(now + idx * 0.045);
          osc.stop(now + idx * 0.045 + 0.29);
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
        osc.frequency.setValueAtTime(740, now);
        osc.frequency.exponentialRampToValueAtTime(1120, now + 0.05);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        this._trackVoice(osc, this.sfxGain, [gain]);
        osc.start(now);
        osc.stop(now + 0.06);
      } catch (_) {}
    }

    dispose() {
      this.stopSong(); this.stopLobbyPreview(); this._stopVoices(this.sfxGain);
      if (this.ctx) this.ctx.close().catch(() => {});
      this.ctx = null;
    }

    playClearFanfare() {
      try {
        this.ensureContext();
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
        notes.forEach((f, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now + i * 0.08);
          gain.gain.setValueAtTime(0.22, now + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.45);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          this._trackVoice(osc, this.sfxGain, [gain]);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.46);
        });
      } catch (_) {}
    }
  }

  window.AudioEngine = new AudioSynthEngine();
})();
