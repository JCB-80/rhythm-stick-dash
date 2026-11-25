// Studio-Grade Web Audio K-Pop / Slap House / Jersey Club / Liquid DnB / Drift Phonk Synthesizer
// Preserves 100% of API, deterministic 16 beatmaps, voice tracking, pause/resume & MP3 decoder
(function () {
  window.SONGS = [
    {
      id: 'galaxy_chase',
      title: 'Galaxy Chase',
      bpm: 132,
      duration: 64,
      lengthText: '01:04',
      artist: 'LUNA · K-ELECTRO HOUSE',
      descKey: 'song_1_desc',
      colors: ['#00f2ff', '#ff2bd6'],
      icon: '🌌',
      style: 'kpop_house',
      rootFreq: 185.0, // F#3 minor (Modern K-Pop Supernova/Anthem key!)
      chords: [
        [0, 3, 7, 10],     // F#m7
        [-4, 0, 3, 8],     // Dmaj7
        [3, 7, 10, 15],    // Aadd9
        [-2, 2, 5, 7]      // E6
      ],
      scale: [0, 2, 3, 5, 7, 10, 12, 15],
      melodyPattern: [7, 6, 5, 3, 5, 6, 7, 5, 4, 3, 2, 0, 2, 3, 5, 4]
    },
    {
      id: 'neon_pulse',
      title: 'Neon Pulse',
      bpm: 124,
      duration: 62,
      lengthText: '01:02',
      artist: 'KAI · JERSEY CLUB & UKG',
      descKey: 'song_2_desc',
      colors: ['#00ffaa', '#00b8ff'],
      icon: '⚡',
      style: 'jersey_ukg',
      rootFreq: 196.0, // G3 minor9 (Trendy NewJeans / ILLIT / UKG Pluggnb vibe)
      chords: [
        [0, 3, 7, 10, 14], // Gm9
        [5, 9, 12, 15],    // C13
        [-2, 2, 5, 9],     // Fmaj7
        [-5, -2, 2, 5]     // Dm7
      ],
      scale: [0, 2, 3, 5, 7, 10, 12, 14],
      melodyPattern: [5, 7, 6, 4, 5, 3, 2, 4, 5, 7, 6, 5, 3, 2, 1, 0]
    },
    {
      id: 'silent_city',
      title: 'Silent City Break',
      bpm: 142,
      duration: 66,
      lengthText: '01:06',
      artist: 'ARIA · LIQUID DNB',
      descKey: 'song_3_desc',
      colors: ['#8a5cff', '#00f2ff'],
      icon: '🌃',
      style: 'liquid_dnb',
      rootFreq: 246.94, // B3 minor7 (Viral Liquid Drum & Bass / Hyperpop)
      chords: [
        [0, 3, 7, 10],     // Bm7
        [-4, 0, 3, 7],     // Gmaj7
        [3, 7, 10, 14],    // Dmaj7
        [-5, -1, 2, 5]     // F#m7
      ],
      scale: [0, 2, 3, 5, 7, 10, 12, 14],
      melodyPattern: [7, 5, 4, 2, 4, 5, 7, 6, 5, 4, 3, 2, 3, 5, 4, 2]
    },
    {
      id: 'cyber_overdrive',
      title: 'Cyber Overdrive',
      bpm: 156,
      duration: 68,
      lengthText: '01:08',
      artist: 'NEO CORE · DRIFT PHONK',
      descKey: 'song_4_desc',
      colors: ['#ff2bd6', '#ffd84d'],
      icon: '🔥',
      style: 'drift_phonk',
      rootFreq: 164.81, // E3 Phrygian/Minor (Viral Drift Phonk Cowbell + Festival Rave)
      chords: [
        [0, 3, 7, 12],
        [1, 5, 8, 13],
        [0, 3, 7, 12],
        [-2, 2, 5, 10]
      ],
      scale: [0, 1, 3, 5, 7, 8, 10, 12],
      melodyPattern: [0, 4, 3, 4, 6, 4, 3, 1, 0, 4, 7, 6, 4, 3, 1, 0]
    }
  ];

  function midiOffsetToFreq(baseFreq, semitones) {
    return baseFreq * Math.pow(2, semitones / 12);
  }

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

  class AudioSynthEngine {
    constructor() {
      this.ctx = null;
      this.bgmGain = null;
      this.previewGain = null;
      this.sfxGain = null;
      this.reverbSend = null;
      this.bgmVolume = 0.75;
      this.sfxVolume = 0.85;

      this.isPlaying = false;
      this.isPaused = false;
      this.currentSong = null;
      this.songStartCtxTime = 0;
      this.pausedElapsed = 0;
      this.schedulerTimer = null;
      this.nextStepIndex = 0;
      this.customSourceNode = null;
      this.voices = new Set();

      this.previewTimer = null;
      this.previewStep = 0;
      this.previewRequest = 0;
      this.previewCustomNode = null;
    }

    ensureContext() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();

        this.bgmGain = this.ctx.createGain();
        this.previewGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();

        this.bgmGain.gain.value = this.bgmVolume;
        this.previewGain.gain.value = this.bgmVolume * 0.34;
        this.sfxGain.gain.value = this.sfxVolume;

        // Master Studio Polish: Compressor + Lush Stereo Reverb Send (gracefully skipped in minimal test mocks)
        let masterOut = this.ctx.destination;
        if (typeof this.ctx.createDynamicsCompressor === 'function') {
          const comp = this.ctx.createDynamicsCompressor();
          comp.threshold.setValueAtTime(-14, this.ctx.currentTime);
          comp.ratio.setValueAtTime(3.5, this.ctx.currentTime);
          comp.connect(this.ctx.destination);
          masterOut = comp;
        }

        this.bgmGain.connect(masterOut);
        this.previewGain.connect(masterOut);
        this.sfxGain.connect(masterOut);

        if (typeof this.ctx.createConvolver === 'function' && this.ctx.sampleRate >= 22050) {
          try {
            const len = Math.floor(this.ctx.sampleRate * 1.1);
            const ir = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
            for (let ch = 0; ch < 2; ch++) {
              const d = ir.getChannelData(ch);
              for (let i = 0; i < len; i++) {
                d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8);
              }
            }
            const conv = this.ctx.createConvolver();
            conv.buffer = ir;
            const revGain = this.ctx.createGain();
            revGain.gain.value = 0.22;
            conv.connect(revGain);
            revGain.connect(masterOut);
            this.reverbSend = conv;
          } catch (_) {}
        }
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
        this.previewGain.gain.setValueAtTime(this.bgmVolume * 0.34, this.ctx.currentTime);
      }
      if (this.sfxGain && this.ctx) {
        this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      }
    }

    // ==================== MODERN STUDIO INSTRUMENTS ====================
    triggerKick(time, dest, punch = 1.0) {
      // Sub-punch kick + transient click
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(168 * punch, time);
      osc.frequency.exponentialRampToValueAtTime(42, time + 0.09);
      osc.frequency.exponentialRampToValueAtTime(31, time + 0.21);

      gain.gain.setValueAtTime(0.78, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

      osc.connect(gain);
      gain.connect(dest);
      this._trackVoice(osc, dest, [gain]);
      osc.start(time);
      osc.stop(time + 0.23);
    }

    triggerSnare(time, dest) {
      // Layered modern K-Pop / EDM Clap-Snare
      const bufferSize = Math.max(16, Math.floor(this.ctx.sampleRate * 0.16));
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        // Double clap pre-transient envelope
        const env = (i < bufferSize * 0.08) ? 0.75 : Math.exp(-i / (bufferSize * 0.3));
        data[i] = (Math.random() * 2 - 1) * env;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1850, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.42, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      if (this.reverbSend && dest === this.bgmGain) gain.connect(this.reverbSend);
      this._trackVoice(noise, dest, [filter, gain]);
      noise.start(time);

      // Punchy 200Hz snare body pop
      const body = this.ctx.createOscillator();
      const bGain = this.ctx.createGain();
      body.type = 'triangle';
      body.frequency.setValueAtTime(220, time);
      body.frequency.exponentialRampToValueAtTime(110, time + 0.07);
      bGain.gain.setValueAtTime(0.24, time);
      bGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
      body.connect(bGain);
      bGain.connect(dest);
      this._trackVoice(body, dest, [bGain]);
      body.start(time);
      body.stop(time + 0.09);
    }

    triggerHiHat(time, dest, open = false) {
      const dur = open ? 0.13 : 0.042;
      const bufferSize = Math.max(16, Math.floor(this.ctx.sampleRate * dur));
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(7500, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(open ? 0.17 : 0.11, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      this._trackVoice(noise, dest, [filter, gain]);
      noise.start(time);
    }

    triggerBass(time, freq, dur, dest, style = 'kpop_house') {
      // Deep 808 Sub + Slap House / Reese harmonic layer
      const sub = this.ctx.createOscillator();
      const top = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      sub.type = 'sine';
      sub.frequency.setValueAtTime(freq * 0.5, time);

      top.type = style === 'jersey_ukg' ? 'triangle' : 'sawtooth';
      top.frequency.setValueAtTime(freq * (style === 'liquid_dnb' ? 0.503 : 1.0), time);

      filter.type = 'lowpass';
      const startCut = style === 'kpop_house' ? 1450 : (style === 'drift_phonk' ? 1800 : 720);
      filter.frequency.setValueAtTime(startCut, time);
      filter.frequency.exponentialRampToValueAtTime(160, time + dur);

      gain.gain.setValueAtTime(0.32, time);
      gain.gain.exponentialRampToValueAtTime(0.008, time + dur);

      top.connect(filter);
      filter.connect(gain);
      sub.connect(gain);
      gain.connect(dest);

      this._trackVoice(sub, dest);
      this._trackVoice(top, dest, [filter, gain]);
      sub.start(time);
      top.start(time);
      sub.stop(time + dur + 0.01);
      top.stop(time + dur + 0.01);
    }

    triggerChordPad(time, baseFreq, chordOffsets, dur, dest, style = 'kpop_house') {
      // Lush Sidechained Supersaw / Rhodes 9th Chords (The heart of modern K-Pop & UKG!)
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(style === 'jersey_ukg' ? 1900 : 2800, time);

      // Sidechain pumping envelope (ducks on the beat, swells up right after!)
      gain.gain.setValueAtTime(0.015, time);
      if (typeof gain.gain.linearRampToValueAtTime === 'function') {
        gain.gain.linearRampToValueAtTime(0.11, time + Math.min(0.09, dur * 0.4));
      } else {
        gain.gain.setValueAtTime(0.10, time + 0.05);
      }
      gain.gain.exponentialRampToValueAtTime(0.006, time + dur);

      filter.connect(gain);
      gain.connect(dest);
      if (this.reverbSend && dest === this.bgmGain) gain.connect(this.reverbSend);

      chordOffsets.forEach((semi, idx) => {
        const osc = this.ctx.createOscillator();
        osc.type = style === 'jersey_ukg' ? 'triangle' : 'sawtooth';
        const f = midiOffsetToFreq(baseFreq, semi + 12);
        osc.frequency.setValueAtTime(f * (1 + (idx - 1.5) * 0.0035), time);
        osc.connect(filter);
        this._trackVoice(osc, dest, idx === 0 ? [filter, gain] : []);
        osc.start(time);
        osc.stop(time + dur + 0.01);
      });
    }

    triggerLead(time, freq, dur, dest, bright = false, style = 'kpop_house') {
      if (style === 'drift_phonk') {
        // Authentic Viral Drift Phonk 808 Cowbell Lead (540Hz/800Hz ratio metallic dual-square!)
        const o1 = this.ctx.createOscillator();
        const o2 = this.ctx.createOscillator();
        const bp = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        o1.type = 'square';
        o2.type = 'square';
        o1.frequency.setValueAtTime(freq * 2, time);
        o2.frequency.setValueAtTime(freq * 2 * 1.481, time);

        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(bright ? 2400 : 1750, time);

        gain.gain.setValueAtTime(0.18, time);
        gain.gain.exponentialRampToValueAtTime(0.003, time + dur * 0.85);

        o1.connect(bp);
        o2.connect(bp);
        bp.connect(gain);
        gain.connect(dest);
        if (this.reverbSend && dest === this.bgmGain) gain.connect(this.reverbSend);

        this._trackVoice(o1, dest);
        this._trackVoice(o2, dest, [bp, gain]);
        o1.start(time);
        o2.start(time);
        o1.stop(time + dur);
        o2.stop(time + dur);
        return;
      }

      // Modern Formant Vocal-Chop / Glossy K-Pop Synth Pluck Lead
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc1.type = style === 'jersey_ukg' ? 'sine' : 'sawtooth';
      osc2.type = 'triangle';

      // Subtle pitch-glide pop ornament at note attack
      osc1.frequency.setValueAtTime(freq * 0.985, time);
      osc1.frequency.exponentialRampToValueAtTime(freq * 2, time + 0.025);
      osc2.frequency.setValueAtTime(freq * 2.006, time);

      filter.type = bright ? 'bandpass' : 'lowpass';
      filter.frequency.setValueAtTime(bright ? 2600 : 3200, time);
      filter.frequency.exponentialRampToValueAtTime(950, time + dur);

      gain.gain.setValueAtTime(0.16, time);
      gain.gain.exponentialRampToValueAtTime(0.004, time + dur);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      if (this.reverbSend && dest === this.bgmGain) gain.connect(this.reverbSend);

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
        this._trackVoice(src, this.previewGain);
        src.start(0);
        this.previewCustomNode = src;
        return;
      }

      const stepMs = (60 / song.bpm / 2) * 1000;
      const eighthDur = 60 / song.bpm / 2;
      this.previewStep = 0;
      this.previewTimer = setInterval(() => {
        if (!this.ctx || this.ctx.state !== 'running' || this.isPlaying) return;
        const now = this.ctx.currentTime + 0.02;
        const s = this.previewStep++;
        const barIdx = Math.floor(s / 8) % (song.chords ? song.chords.length : 4);
        const chord = song.chords ? song.chords[barIdx] : [0, 3, 7, 10];
        const rootSemi = chord[0];
        const barRoot = midiOffsetToFreq(song.rootFreq, rootSemi);

        if (s % 2 === 0) {
          this.triggerKick(now, this.previewGain, 0.9);
          this.triggerChordPad(now, song.rootFreq, chord, eighthDur * 1.9, this.previewGain, song.style);
        }
        if (s % 2 === 1) this.triggerHiHat(now, this.previewGain, false);
        if (s % 4 === 2) this.triggerSnare(now, this.previewGain);

        const noteIdx = song.melodyPattern[s % song.melodyPattern.length];
        const semi = song.scale[noteIdx % song.scale.length];
        this.triggerLead(now, midiOffsetToFreq(barRoot, semi), eighthDur * 0.92, this.previewGain, true, song.style);
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
      this.resumeBaseElapsed = 0;
      this.resumeAnchorCtxTime = this.ctx.currentTime + 0.08;
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
        const minStep = Math.max(0, Math.ceil((this.ctx.currentTime - this.songStartCtxTime - 0.015) / sixteenthDur));
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
      const isClimax = barNum >= 6;
      const style = song.style || 'kpop_house';
      const chords = song.chords || [[0, 3, 7, 10], [-4, 0, 3, 8], [3, 7, 10, 15], [-2, 2, 5, 7]];
      const chord = chords[barNum % chords.length];
      const rootFreq = midiOffsetToFreq(song.rootFreq, chord[0]);

      // 1. Genre-Authentic Modern Drum Grooves
      if (style === 'jersey_ukg') {
        // Trendy Jersey Club 5-kick bounce: 0, 4, 8, 11, 14!
        if (barStep === 0 || barStep === 4 || barStep === 8 || barStep === 11 || barStep === 14) {
          this.triggerKick(time, this.bgmGain, 1.08);
        }
        if (barStep === 4 || barStep === 12) this.triggerSnare(time, this.bgmGain);
      } else if (style === 'liquid_dnb') {
        // Authentic Liquid Drum & Bass Two-Step Breakbeat: Kick on 0 & 10, Snare on 4 & 12!
        if (barStep === 0 || barStep === 10) {
          this.triggerKick(time, this.bgmGain, 1.1);
        }
        if (barStep === 4 || barStep === 12 || (isClimax && barStep === 15)) {
          this.triggerSnare(time, this.bgmGain);
        }
      } else {
        // K-Pop Slap House & Drift Phonk punchy 4-on-the-floor + syncopated drop kicks
        if (barStep % 4 === 0 || (isClimax && barStep === 14)) {
          this.triggerKick(time, this.bgmGain, isClimax ? 1.15 : 1.02);
        }
        if (barStep === 4 || barStep === 12) {
          this.triggerSnare(time, this.bgmGain);
        }
      }

      // 2. Crisp Off-Beat Hi-Hats & Trap 16th Stutter Rolls (keeps step 2 -> triggerHiHat contract!)
      if (barStep % 4 === 2) {
        this.triggerHiHat(time, this.bgmGain, barStep === 10);
      } else if (isClimax && (barStep % 2 === 1 || barStep === 6 || barStep === 14)) {
        this.triggerHiHat(time, this.bgmGain, false);
      }

      // 3. Lush Sidechained Chords on Quarter Beats
      if (barStep % 4 === 0) {
        this.triggerChordPad(time, song.rootFreq, chord, sixteenthDur * 3.8, this.bgmGain, style);
      }

      // 4. Modern Bouncy Bassline (Offbeat Slap / 808 Glide / Reese)
      if (barStep === 0 || barStep === 3 || barStep === 6 || barStep === 8 || barStep === 10 || barStep === 14) {
        const oct = (barStep === 6 || barStep === 14) ? 12 : 0;
        this.triggerBass(time, midiOffsetToFreq(rootFreq, oct), sixteenthDur * 2.1, this.bgmGain, style);
      }

      // 5. Catchy Vocal-Chop / Pluck / Phonk Cowbell Hook Melody
      if (barStep % 2 === 0 || barStep === 3 || (isClimax && barStep === 11)) {
        const patIdx = Math.floor((step / 2) % song.melodyPattern.length);
        const scaleDeg = song.melodyPattern[patIdx];
        const semi = song.scale[scaleDeg % song.scale.length];
        this.triggerLead(time, midiOffsetToFreq(rootFreq, semi), sixteenthDur * 1.85, this.bgmGain, isClimax, style);
      }
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
      if (this.schedulerTimer) {
        clearInterval(this.schedulerTimer);
        this.schedulerTimer = null;
      }
      this._stopVoices(this.bgmGain);
      this.customSourceNode = null;
    }

    resumeSong() {
      if (!this.isPlaying || !this.isPaused) return;
      this.ensureContext();
      this.isPaused = false;
      this.resumeBaseElapsed = this.pausedElapsed;
      if (this.currentSong && this.currentSong.isCustom && this.currentSong.audioBuffer) {
        this.resumeAnchorCtxTime = this.ctx.currentTime + 0.04;
        this._startCustomBuffer(this.pausedElapsed);
      } else {
        this.resumeAnchorCtxTime = this.ctx.currentTime;
        const sixteenthDur = 60 / this.currentSong.bpm / 4;
        this.songStartCtxTime = this.ctx.currentTime - this.pausedElapsed;
        this.nextStepIndex = Math.ceil(this.pausedElapsed / sixteenthDur);
        this._startSynthScheduler();
      }
    }

    stopSong() {
      this.isPlaying = false;
      this.isPaused = false;
      this.pausedElapsed = 0;
      if (this.schedulerTimer) {
        clearInterval(this.schedulerTimer);
        this.schedulerTimer = null;
      }
      this._stopVoices(this.bgmGain);
      this.customSourceNode = null;
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
        colors: ['#ffd84d', '#00f2ff'],
        icon: '🎧',
        isCustom: true,
        audioBuffer,
        customPeaks
      };

      const existingIdx = window.SONGS.findIndex(s => s.isCustom);
      if (existingIdx >= 0) window.SONGS[existingIdx] = customSong;
      else window.SONGS.push(customSong);
      return customSong;
    }

    // ==================== BEATMAP / CHART GENERATOR ====================
    generateChart(song, difficulty) {
      const rand = seededRandom(song.title.length * 997 + difficulty.charCodeAt(0) * 131);
      const beatSec = 60 / song.bpm;
      const branchStart = Math.min(22, song.duration * 0.34);
      const branchDecision = branchStart + 3.2;
      const branchEnd = Math.min(song.duration - 10, branchDecision + 18);
      const hasBranch = difficulty !== 'EASY' && song.duration >= 36 && branchEnd > branchDecision + 4;

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
            hit: false
          });
        });
      } else {
        const stepDiv = (difficulty === 'EASY') ? 1 : 2;
        const stepSec = beatSec / stepDiv;
        const startT = beatSec * 4;
        const endT = song.duration - 2.2;
        let stepIdx = 0;

        for (let t = startT; t <= endT; t += stepSec, stepIdx++) {
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
            id: 0,
            time: Number(t.toFixed(3)),
            lane: currentLane,
            type,
            branch: inBranch ? 'both' : 'main',
            hit: false
          });

          if (inBranch && onMainBeat && difficulty !== 'EASY') {
            notes.push({
              id: 0,
              time: Number((t + stepSec * 0.5).toFixed(3)),
              lane: (currentLane + 1) % 3,
              type: 'tap',
              branch: 'rush_only',
              hit: false
            });
          } else if (difficulty === 'EXTREME' && onMainBeat && stepIdx % 4 === 2) {
            notes.push({
              id: 0,
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
      notes.forEach((n, idx) => { n.id = idx; });
      return {
        notes,
        hasBranch,
        branchStart: hasBranch ? branchStart : 9999,
        branchDecision: hasBranch ? branchDecision : 9999,
        branchEnd: hasBranch ? branchEnd : 9999
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
          osc.frequency.setValueAtTime(isFever ? 987.77 : 783.99, now);
          osc.frequency.exponentialRampToValueAtTime(isFever ? 1567.98 : 1174.66, now + 0.065);
        } else {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(587.33, now);
          osc.frequency.exponentialRampToValueAtTime(1760, now + 0.11);
        }

        gain.gain.setValueAtTime(0.24, now);
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

  window.AudioEngine = new AudioSynthEngine();
})();
