#!/usr/bin/env python3
"""
Studio-Grade 44.1kHz Stereo Multi-Track EDM / Dance BGM Generator for Rhythm Stick Dash
Generates 12 original royalty-free tracks (75-88s each) with:
- Punchy layered 808/EDM kicks with transient click
- Layered claps/snares + crisp hi-hats + crash risers
- Sidechain-pumped 7-voice detuned supersaw chords / Rhodes / stabs
- Sub + slap/reese/acid/808 basslines
- Catchy lead hooks (formant vocal-chop, pluck, phonk cowbell, supersaw anthem)
- Full arrangement: Intro -> Groove -> Snare-Roll Buildup + Riser -> Massive Drop -> Breakdown -> Final Climax Drop
- Stereo ping-pong delay + algorithmic reverb + mastering soft-clip limiter
"""
import os
import sys
import math
import subprocess
import tempfile
import wave
import numpy as np

SR = 44100
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "audio", "tracks")
os.makedirs(OUT_DIR, exist_ok=True)


def midi_to_hz(m):
    return 440.0 * (2.0 ** ((m - 69) / 12.0))


def make_kick(sr=SR, style="house"):
    dur = 0.34 if style in ("bigroom", "hardstyle", "trap") else 0.24
    n = int(sr * dur)
    t = np.linspace(0, dur, n, endpoint=False)
    if style == "hardstyle":
        f = 48.0 + 260.0 * np.exp(-t * 36.0)
        phase = 2 * np.pi * np.cumsum(f) / sr
        body = np.tanh(np.sin(phase) * 3.8) * np.exp(-t * 6.5)
    elif style == "bigroom":
        f = 45.0 + 180.0 * np.exp(-t * 28.0)
        phase = 2 * np.pi * np.cumsum(f) / sr
        body = np.tanh(np.sin(phase) * 2.1) * np.exp(-t * 5.2)
    else:
        f = 46.0 + 150.0 * np.exp(-t * 42.0)
        phase = 2 * np.pi * np.cumsum(f) / sr
        body = np.tanh(np.sin(phase) * 1.65) * np.exp(-t * 10.5)
    click = np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 240.0) * 0.45
    return (body + click).astype(np.float32)


def make_snare(sr=SR, rng=None, style="house"):
    dur = 0.22
    n = int(sr * dur)
    t = np.linspace(0, dur, n, endpoint=False)
    noise = rng.standard_normal(n)
    # Multi-tap clap transient + snappy tail
    env = np.exp(-t * 22.0)
    if style in ("house", "disco", "bounce", "bigroom"):
        clap = np.exp(-np.abs(t - 0.008) * 180.0) + np.exp(-np.abs(t - 0.017) * 160.0)
        env = np.clip(env + 0.5 * clap, 0, 1.4)
    # Simple high-pass via diff
    hp = np.concatenate([[0.0], np.diff(noise)]) * env * 0.55
    body_f = 215.0 * np.exp(-t * 14.0) + 120.0
    body = np.sin(2 * np.pi * np.cumsum(body_f) / sr) * np.exp(-t * 28.0) * 0.45
    return np.tanh((hp + body) * 1.3).astype(np.float32)


def make_hat(sr=SR, rng=None, open_hat=False):
    dur = 0.19 if open_hat else 0.048
    n = int(sr * dur)
    t = np.linspace(0, dur, n, endpoint=False)
    noise = rng.standard_normal(n)
    hp = np.diff(np.diff(noise, prepend=0.0), prepend=0.0)
    env = np.exp(-t * (14.0 if open_hat else 65.0))
    return (hp * env * (0.20 if open_hat else 0.14)).astype(np.float32)


def make_supersaw_chord(freqs, dur, sr=SR, detune=0.006, bright=1.0):
    n = int(sr * dur)
    t = np.linspace(0, dur, n, endpoint=False)
    L = np.zeros(n, dtype=np.float32)
    R = np.zeros(n, dtype=np.float32)
    detunes = [-1.5, -0.8, -0.3, 0.0, 0.3, 0.8, 1.5]
    for f0 in freqs:
        for i, d in enumerate(detunes):
            f = f0 * (1.0 + d * detune)
            ph = (t * f + i * 0.137) % 1.0
            saw = 2.0 * ph - 1.0
            # Soft warm harmonic shaping
            if bright < 0.7:
                saw = np.sin(2 * np.pi * ph) * 0.65 + saw * 0.35
            pan = (i / (len(detunes) - 1))  # 0..1
            L += saw * (1.0 - pan * 0.65)
            R += saw * (0.35 + pan * 0.65)
    norm = 1.0 / max(1.0, len(freqs) * len(detunes) * 0.48)
    # Envelope
    atk = min(int(sr * 0.015), n // 4)
    rel = min(int(sr * 0.06), n // 3)
    env = np.ones(n, dtype=np.float32)
    if atk > 0:
        env[:atk] = np.linspace(0, 1, atk)
    if rel > 0:
        env[-rel:] = np.linspace(1, 0, rel)
    return (L * norm * env), (R * norm * env)


def make_bass_note(freq, dur, sr=SR, style="house"):
    n = int(sr * dur)
    t = np.linspace(0, dur, n, endpoint=False)
    sub = np.sin(2 * np.pi * freq * 0.5 * t) * 0.68
    ph1 = (t * freq) % 1.0
    ph2 = (t * freq * 1.006) % 1.0
    saw = ((2 * ph1 - 1) + (2 * ph2 - 1)) * 0.25
    # Low-pass pluck decay
    pluck = np.exp(-t * (8.0 if style in ("house", "bounce", "disco") else 4.0))
    sig = sub + saw * (0.35 + 0.65 * pluck)
    if style in ("phonk", "hardstyle", "trap"):
        sig = np.tanh(sig * 2.2)
    env = np.minimum(1.0, t / 0.008) * np.exp(-t * (2.6 if style != "dnb" else 1.8))
    return (sig * env * 0.52).astype(np.float32)


def make_lead_note(freq, dur, sr=SR, style="house"):
    n = int(sr * dur)
    t = np.linspace(0, dur, n, endpoint=False)
    if style == "phonk":
        # Authentic 808 metallic cowbell lead (dual square 1 : 1.481)
        s1 = np.sign(np.sin(2 * np.pi * freq * t))
        s2 = np.sign(np.sin(2 * np.pi * freq * 1.481 * t))
        sig = (s1 + s2) * 0.26 * np.exp(-t * 11.0)
        return np.tanh(sig * 1.5).astype(np.float32)
    # Glossy formant pluck / synth lead with subtle pitch bend
    f_curve = freq * (1.0 - 0.025 * np.exp(-t * 55.0))
    ph = np.cumsum(f_curve) / sr
    saw = 2.0 * (ph % 1.0) - 1.0
    tri = 2.0 * np.abs(2.0 * ((ph * 1.004) % 1.0) - 1.0) - 1.0
    fm = np.sin(2 * np.pi * ph + 1.4 * np.exp(-t * 14.0) * np.sin(2 * np.pi * ph * 2.0))
    if style in ("hyperpop", "future_bass"):
        sig = fm * 0.55 + saw * 0.45
    elif style == "disco":
        sig = fm * 0.65 + tri * 0.35
    else:
        sig = saw * 0.5 + tri * 0.3 + fm * 0.2
    env = np.minimum(1.0, t / 0.006) * np.exp(-t * 5.2)
    return (sig * env * 0.30).astype(np.float32)


def add_stereo(buf_l, buf_r, idx, sig_l, sig_r=None, gain=1.0):
    if sig_r is None:
        sig_r = sig_l
    end = min(len(buf_l), idx + len(sig_l))
    if idx >= len(buf_l) or end <= idx:
        return
    ln = end - idx
    buf_l[idx:end] += sig_l[:ln] * gain
    buf_r[idx:end] += sig_r[:ln] * gain


def apply_stereo_fx(L, R, bpm, sr=SR):
    # Ping-pong stereo delay (dotted 8th / 8th)
    d_samples = int(sr * (60.0 / bpm) * 0.75)
    d2_samples = int(sr * (60.0 / bpm) * 0.5)
    out_l = L.copy()
    out_r = R.copy()
    if d_samples < len(L):
        out_l[d_samples:] += R[:-d_samples] * 0.16
        out_r[d_samples:] += L[:-d_samples] * 0.16
    if d2_samples < len(L):
        out_l[d2_samples:] += L[:-d2_samples] * 0.10
        out_r[d2_samples:] += R[:-d2_samples] * 0.10
    # Soft lush multi-tap reverb tail
    for tap_ms, g in [(31, 0.11), (67, 0.08), (113, 0.06), (179, 0.045)]:
        s = int(sr * tap_ms / 1000.0)
        if s < len(L):
            out_l[s:] += R[:-s] * g
            out_r[s:] += L[:-s] * g
    # Mastering limiter / warm saturation
    peak = max(float(np.max(np.abs(out_l))), float(np.max(np.abs(out_r))), 1e-6)
    scale = 0.92 / peak if peak > 0.92 else 1.0
    out_l = np.tanh(out_l * scale * 1.15) * 0.90
    out_r = np.tanh(out_r * scale * 1.15) * 0.90
    # Smooth 0.05s fade in / 0.8s fade out
    fi = int(sr * 0.05)
    fo = int(sr * 0.8)
    out_l[:fi] *= np.linspace(0, 1, fi)
    out_r[:fi] *= np.linspace(0, 1, fi)
    out_l[-fo:] *= np.linspace(1, 0, fo)
    out_r[-fo:] *= np.linspace(1, 0, fo)
    return out_l, out_r


TRACKS = [
    # (filename, bpm, style, root_midi, chords, scale, melody, seed)
    ("01_seoul_neon_pulse.ogg", 132, "house", 54, [[0,3,7,10],[-4,0,3,7],[3,7,10,14],[-2,2,5,7]], [0,2,3,5,7,10,12,15], [7,6,5,3,5,6,7,5,4,3,2,0,2,3,5,4], 101),
    ("02_hyperpop_overdrive.ogg", 150, "hyperpop", 59, [[0,4,7,11],[5,9,12,16],[7,11,14,17],[2,5,9,12]], [0,2,4,7,9,12,14,16], [5,7,6,5,4,5,7,6,3,4,5,7,6,5,4,2], 102),
    ("03_gangnam_midnight.ogg", 128, "bounce", 52, [[0,3,7,10],[-2,2,5,9],[3,7,10,14],[5,8,12,15]], [0,2,3,5,7,10,12,14], [0,3,5,7,5,3,2,3,7,6,5,3,5,3,2,0], 103),
    ("04_jersey_club_rush.ogg", 142, "jersey", 55, [[0,3,7,10,14],[5,9,12,15],[-2,2,5,9],[-5,-2,2,5]], [0,2,3,5,7,10,12,14], [5,7,6,4,5,3,2,4,5,7,6,5,3,2,1,0], 104),
    ("05_cyber_phonk_drift.ogg", 148, "phonk", 52, [[0,3,7,12],[1,5,8,13],[0,3,7,12],[-2,2,5,10]], [0,1,3,5,7,8,10,12], [0,4,3,4,6,4,3,1,0,4,7,6,4,3,1,0], 105),
    ("06_starlight_future_bass.ogg", 136, "future_bass", 57, [[0,4,7,11,14],[-3,0,4,7,11],[2,5,9,12,16],[4,7,11,14,16]], [0,2,4,5,7,9,11,12], [4,5,7,6,4,2,0,2,4,7,6,5,4,2,1,0], 106),
    ("07_retro_synth_highway.ogg", 126, "synthwave", 50, [[0,3,7,10],[8,12,15,19],[3,7,10,14],[10,14,17,21]], [0,2,3,5,7,8,10,12], [0,2,3,7,5,3,2,0,3,5,7,8,7,5,3,2], 107),
    ("08_festival_bigroom_drop.ogg", 130, "bigroom", 53, [[0,3,7,12],[-4,0,3,8],[-2,2,5,10],[0,3,7,12]], [0,2,3,5,7,10,12,15], [7,7,5,7,6,5,3,5,7,7,5,3,2,3,5,0], 108),
    ("09_velocity_dnb.ogg", 172, "dnb", 59, [[0,3,7,10],[-4,0,3,7],[3,7,10,14],[-5,-1,2,5]], [0,2,3,5,7,10,12,14], [7,5,4,2,4,5,7,6,5,4,3,2,3,5,4,2], 109),
    ("10_velvet_nu_disco.ogg", 124, "disco", 56, [[0,3,7,10,14],[5,8,12,15],[3,7,10,14],[-2,2,5,9]], [0,2,3,5,7,9,10,12], [2,4,5,7,5,4,2,0,4,5,7,6,5,4,2,4], 110),
    ("11_hardstyle_inferno.ogg", 155, "hardstyle", 50, [[0,3,7,12],[8,12,15,19],[3,7,10,14],[10,14,17,21]], [0,2,3,5,7,8,10,12], [7,6,7,5,3,5,7,6,5,3,2,3,5,7,6,4], 111),
    ("12_vip_trap_anthem.ogg", 140, "trap", 51, [[0,3,7,10],[1,4,8,11],[0,3,7,10],[-2,1,5,8]], [0,1,3,5,7,8,10,12], [0,3,5,6,5,3,1,0,7,6,5,3,1,3,5,0], 112),
]


def render_track(spec):
    fname, bpm, style, root_midi, chords, scale, melody, seed = spec
    rng = np.random.default_rng(seed)
    beat_sec = 60.0 / bpm
    sixteenth = beat_sec / 4.0
    # Aim for ~78-84 seconds (44-56 bars depending on BPM)
    bars = max(40, min(60, int(round(80.0 / (beat_sec * 4.0)))))
    bars = (bars // 4) * 4
    total_sec = bars * 4.0 * beat_sec
    total_samples = int(total_sec * SR)

    L = np.zeros(total_samples, dtype=np.float32)
    R = np.zeros(total_samples, dtype=np.float32)

    kick = make_kick(SR, style)
    snare = make_snare(SR, rng, style)
    hat_c = make_hat(SR, rng, False)
    hat_o = make_hat(SR, rng, True)

    # Pre-render 4 chord pads for fast assembly
    chord_pads = []
    for ch in chords:
        freqs = [midi_to_hz(root_midi + 12 + s) for s in ch]
        cL, cR = make_supersaw_chord(freqs, beat_sec * 1.92, SR, bright=0.6 if style in ("jersey", "disco") else 1.0)
        chord_pads.append((cL, cR))

    # Arrangement sections (by bar index):
    # 0..3: Intro | 4..11: Verse/Groove | 12..15: Buildup | 16..27: DROP 1
    # 28..31: Breakdown/Buildup 2 | 32..bars-1: FINAL CLIMAX DROP
    for bar in range(bars):
        ch_idx = bar % len(chords)
        chord = chords[ch_idx]
        bar_root_midi = root_midi + chord[0]
        is_intro = bar < 4
        is_buildup = (12 <= bar < 16) or (28 <= bar < 32)
        is_drop = (16 <= bar < 28) or (bar >= 32)
        is_climax = (bar >= 32)

        for step in range(16):
            g_step = bar * 16 + step
            t_sec = g_step * sixteenth
            idx = int(t_sec * SR)

            # 1. DRUMS
            if is_buildup:
                # Rising snare roll!
                roll_div = 4 if bar % 4 < 2 else (2 if bar % 4 == 2 else 1)
                if step % roll_div == 0:
                    add_stereo(L, R, idx, snare, snare, 0.42 + 0.04 * (bar % 4))
                # Noise riser sweep
                if step == 0:
                    rn = int(SR * beat_sec * 4.0)
                    rt = np.linspace(0, 1, rn, dtype=np.float32)
                    riser = rng.standard_normal(rn).astype(np.float32) * (rt ** 2.2) * 0.14
                    add_stereo(L, R, idx, riser, riser, 1.0)
            else:
                if style == "jersey":
                    if step in (0, 4, 8, 11, 14):
                        add_stereo(L, R, idx, kick, kick, 0.92 if is_drop else 0.72)
                    if not is_intro and step in (4, 12):
                        add_stereo(L, R, idx, snare, snare, 0.72)
                elif style == "dnb":
                    if step in (0, 10):
                        add_stereo(L, R, idx, kick, kick, 0.95 if is_drop else 0.75)
                    if not is_intro and (step in (4, 12) or (is_drop and step == 15)):
                        add_stereo(L, R, idx, snare, snare, 0.80)
                elif style == "trap":
                    if step in (0, 6, 10) or (is_climax and step == 14):
                        add_stereo(L, R, idx, kick, kick, 0.98 if is_drop else 0.72)
                    if not is_intro and step == 8:
                        add_stereo(L, R, idx, snare, snare, 0.88)
                else:
                    if step % 4 == 0 or (is_climax and step == 14):
                        add_stereo(L, R, idx, kick, kick, 0.95 if is_drop else 0.75)
                    if not is_intro and step in (4, 12):
                        add_stereo(L, R, idx, snare, snare, 0.76)

                # Hi-hats
                if step % 4 == 2:
                    add_stereo(L, R, idx, hat_o if (is_drop and step == 10) else hat_c, None, 0.75)
                elif is_drop and step % 2 == 1:
                    add_stereo(L, R, idx, hat_c, None, 0.55)

            # 2. SIDECHAINED SUPERSAW CHORD PADS
            if step in (0, 8):
                cL, cR = chord_pads[ch_idx]
                # Sidechain duck curve on beat
                sc = np.minimum(1.0, np.linspace(0.08, 1.0, len(cL), dtype=np.float32) * 3.8)
                g_pad = 0.42 if is_drop else (0.30 if not is_intro else 0.24)
                add_stereo(L, R, idx, cL * sc, cR * sc, g_pad)

            # 3. BASSLINE
            if not is_buildup and (step in (0, 3, 6, 8, 10, 14) or (style == "disco" and step in (2, 12))):
                oct_up = 12 if step in (6, 14) else 0
                b_freq = midi_to_hz(bar_root_midi - 12 + oct_up)
                b_sig = make_bass_note(b_freq, sixteenth * 2.1, SR, style)
                add_stereo(L, R, idx, b_sig, b_sig, 0.82 if is_drop else 0.58)

            # 4. CATCHY LEAD HOOK MELODY
            if not is_intro and (step % 2 == 0 or (is_drop and step in (3, 11))):
                m_deg = melody[(g_step // 2) % len(melody)]
                m_semi = scale[m_deg % len(scale)]
                l_freq = midi_to_hz(bar_root_midi + 12 + m_semi)
                l_sig = make_lead_note(l_freq, sixteenth * (1.9 if is_drop else 1.4), SR, style)
                # Gentle stereo width alternating
                pan_l = 0.85 if (g_step % 4 < 2) else 0.65
                pan_r = 0.65 if (g_step % 4 < 2) else 0.85
                add_stereo(L, R, idx, l_sig * pan_l, l_sig * pan_r, 0.78 if is_drop else 0.50)

    out_l, out_r = apply_stereo_fx(L, R, bpm, SR)
    stereo = np.stack([out_l, out_r], axis=1)
    pcm = np.clip(stereo * 32767.0, -32768, 32767).astype(np.int16)

    out_path = os.path.join(OUT_DIR, fname)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
        wav_path = tf.name
    try:
        with wave.open(wav_path, "wb") as wf:
            wf.setnchannels(2)
            wf.setsampwidth(2)
            wf.setframerate(SR)
            wf.writeframes(pcm.tobytes())
        subprocess.run(
            ["ffmpeg", "-y", "-v", "error", "-i", wav_path, "-c:a", "libvorbis", "-q:a", "4", out_path],
            check=True
        )
    finally:
        if os.path.exists(wav_path):
            os.remove(wav_path)
    kb = os.path.getsize(out_path) / 1024.0
    print(f"Generated {fname} ({bpm} BPM, {total_sec:.1f}s, {kb:.1f} KB)")


if __name__ == "__main__":
    for sp in TRACKS:
        render_track(sp)
    print("ALL 12 TRACKS GENERATED SUCCESSFULLY.")
