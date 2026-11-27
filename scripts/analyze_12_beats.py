"""
Real Audio Beat-Tracker & Beatmap Extractor for Rhythm Stick Dash (12 Lyria OGG Tracks)
Decodes each .ogg via ffmpeg, computes low-band (kick) + full-band spectral onset flux,
finds the exact beat phase offset & snaps every beat/half-beat to the real percussive transient,
and writes `js/beatmaps.js` so 3D note boxes land on the EXACT millisecond of every real beat!
"""
import json
import os
import subprocess
import numpy as np

TRACKS_DIR = r"C:\Users\seo44\.gemini\antigravity\scratch\rhythm-stick-dash\assets\audio\tracks"
OUT_JS = r"C:\Users\seo44\.gemini\antigravity\scratch\rhythm-stick-dash\js\beatmaps.js"

SONGS = [
    ("seoul_neon_pulse",      "01_seoul_neon_pulse.ogg",      132, 80.0),
    ("hyperpop_overdrive",    "02_hyperpop_overdrive.ogg",    150, 76.8),
    ("gangnam_midnight",      "03_gangnam_midnight.ogg",      128, 75.0),
    ("jersey_club_rush",      "04_jersey_club_rush.ogg",      142, 74.4),
    ("cyber_phonk_drift",     "05_cyber_phonk_drift.ogg",     148, 77.8),
    ("starlight_future_bass", "06_starlight_future_bass.ogg", 136, 77.6),
    ("retro_synth_highway",   "07_retro_synth_highway.ogg",   126, 76.2),
    ("festival_bigroom_drop", "08_festival_bigroom_drop.ogg", 130, 73.8),
    ("velocity_dnb",          "09_velocity_dnb.ogg",          172, 78.1),
    ("velvet_nu_disco",       "10_velvet_nu_disco.ogg",       124, 77.4),
    ("hardstyle_inferno",     "11_hardstyle_inferno.ogg",     155, 80.5),
    ("vip_trap_anthem",       "12_vip_trap_anthem.ogg",       140, 75.4),
]


def decode_mono_pcm(ogg_path: str, sr: int = 22050) -> np.ndarray:
    cmd = [
        "ffmpeg", "-v", "error", "-i", ogg_path,
        "-ac", "1", "-ar", str(sr), "-f", "f32le", "pipe:1",
    ]
    raw = subprocess.check_output(cmd)
    return np.frombuffer(raw, dtype=np.float32)


def compute_onset_envelope(y: np.ndarray, sr: int = 22050, hop: int = 256):
    # STFT magnitude -> weighted spectral flux (extra weight on kick 40-180Hz & snare 1-5kHz)
    n_fft = 1024
    n_frames = 1 + (len(y) - n_fft) // hop
    window = np.hanning(n_fft).astype(np.float32)
    freqs = np.fft.rfftfreq(n_fft, 1.0 / sr)
    weights = np.ones_like(freqs, dtype=np.float32)
    weights[(freqs >= 40) & (freqs <= 180)] = 3.2   # Kick drum punch
    weights[(freqs >= 1000) & (freqs <= 5000)] = 1.6  # Snare / clap / synth attack

    # Vectorized framing
    idx = np.arange(n_fft)[None, :] + np.arange(n_frames)[:, None] * hop
    frames = y[idx] * window[None, :]
    spec = np.abs(np.fft.rfft(frames, axis=1))
    log_spec = np.log1p(spec * 10.0)
    diff = np.maximum(0.0, np.diff(log_spec, axis=0, prepend=log_spec[:1]))
    flux = (diff * weights[None, :]).mean(axis=1)

    # Local adaptive normalization
    rms = np.sqrt(np.mean(frames * frames, axis=1) + 1e-8)
    rms_norm = rms / (np.percentile(rms, 92) + 1e-6)
    flux_norm = flux / (np.percentile(flux, 95) + 1e-6)
    return flux_norm, np.clip(rms_norm, 0.0, 1.5), hop / sr


def analyze_song(song_id: str, filename: str, nominal_bpm: float, duration: float):
    path = os.path.join(TRACKS_DIR, filename)
    y = decode_mono_pcm(path, sr=22050)
    flux, rms, frame_dt = compute_onset_envelope(y, sr=22050, hop=256)
    n_frames = len(flux)
    actual_dur = len(y) / 22050.0

    # 1. Search BPM within +-2.5 BPM of nominal (0.05 BPM steps) & phase offset (0..beatSec)
    best_score = -1.0
    best_bpm = nominal_bpm
    best_offset = 0.0

    for bpm in np.arange(nominal_bpm - 2.0, nominal_bpm + 2.05, 0.1):
        beat_sec = 60.0 / bpm
        # Coarse phase search (40 steps across one beat)
        phases = np.linspace(0.0, beat_sec, 40, endpoint=False)
        for ph in phases:
            t_grid = np.arange(ph + beat_sec * 2, actual_dur - 1.5, beat_sec)
            f_idx = np.round(t_grid / frame_dt).astype(int)
            f_idx = f_idx[(f_idx >= 1) & (f_idx < n_frames - 1)]
            # Allow +-1 frame (~11ms) tolerance around each beat
            local_peak = np.maximum(flux[f_idx], np.maximum(flux[f_idx - 1], flux[f_idx + 1]))
            score = float(local_peak.mean())
            if score > best_score:
                best_score = score
                best_bpm = float(bpm)
                best_offset = float(ph)

    # Fine phase refinement around best_offset (+-30ms in 2ms steps)
    beat_sec = 60.0 / best_bpm
    for dph in np.arange(-0.030, 0.031, 0.002):
        ph = (best_offset + dph) % beat_sec
        t_grid = np.arange(ph + beat_sec * 2, actual_dur - 1.5, beat_sec)
        f_idx = np.round(t_grid / frame_dt).astype(int)
        f_idx = f_idx[(f_idx >= 0) & (f_idx < n_frames)]
        score = float(flux[f_idx].mean())
        if score > best_score:
            best_score = score
            best_offset = float(ph)

    # 2. Extract exact beat & half-beat events snapped within +-28ms to the real drum peak!
    half_sec = beat_sec * 0.5
    snap_frames = max(1, int(round(0.028 / frame_dt)))
    beats = []
    start_t = best_offset + beat_sec * 2.0
    end_t = min(duration, actual_dur) - 1.8

    step_idx = 0
    t = start_t
    while t <= end_t:
        fi = int(round(t / frame_dt))
        lo = max(0, fi - snap_frames)
        hi = min(n_frames - 1, fi + snap_frames)
        win_flux = flux[lo:hi + 1]
        best_rel = int(np.argmax(win_flux))
        peak_flux = float(win_flux[best_rel])
        snapped_t = (lo + best_rel) * frame_dt if peak_flux > 0.35 else t
        # Energy at this beat (0..1)
        e_lo = max(0, fi - 4)
        e_hi = min(n_frames - 1, fi + 4)
        energy = float(np.clip(rms[e_lo:e_hi + 1].mean(), 0.0, 1.0))
        beats.append([
            round(float(snapped_t), 3),
            1 if (step_idx % 2 == 0) else 0,   # isMainBeat
            round(min(1.5, peak_flux), 2),     # onsetStrength
            round(energy, 2),                  # energy
        ])
        t += half_sec
        step_idx += 1

    # Detect highest-energy 8-beat drop window for Rush Barrage
    drop_start = round(duration * 0.52, 2)
    best_drop_e = -1.0
    for i in range(len(beats) - 16):
        bt = beats[i][0]
        if bt < duration * 0.35 or bt > duration - 10.0:
            continue
        avg_e = sum(beats[j][3] for j in range(i, i + 16)) / 16.0
        if avg_e > best_drop_e:
            best_drop_e = avg_e
            drop_start = beats[i][0]

    print(
        f"[BEAT] {song_id:22s} | nom={nominal_bpm:5.1f} -> det={best_bpm:5.1f} BPM | "
        f"offset={best_offset*1000:5.1f}ms | beats={len(beats)} | drop={drop_start:.1f}s | fluxScore={best_score:.2f}",
        flush=True,
    )
    return {
        "bpm": round(best_bpm, 2),
        "offset": round(best_offset, 4),
        "dropStart": round(drop_start, 3),
        "beats": beats,  # [timeSec, isMainBeat, onsetStrength, energy]
    }


def main():
    out = {}
    for sid, fname, bpm, dur in SONGS:
        out[sid] = analyze_song(sid, fname, bpm, dur)
    with open(OUT_JS, "w", encoding="utf-8") as f:
        f.write("// Auto-generated Real Audio Beatmap Data (Kick/Snare Onset-Synced for all 12 Lyria Tracks)\n")
        f.write("window.SONG_BEATMAPS = ")
        json.dump(out, f, separators=(",", ":"))
        f.write(";\n")
    print(f"\n[OK] Wrote {OUT_JS} ({os.path.getsize(OUT_JS) / 1024:.1f} KB)", flush=True)


if __name__ == "__main__":
    main()
