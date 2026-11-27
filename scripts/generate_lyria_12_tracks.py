"""
Google Lyria Studio Music Generator for Rhythm Stick Dash (12 BPM-Locked Tracks)
Generates commercial-grade 2026 K-Pop & Modern EDM tracks with exact BPM synchronization,
loudnorm (-12 LUFS) mastering, and stereo OGG Vorbis encoding via ffmpeg.

Usage:
  1. Set GEMINI_API_KEY env var OR save your key in:
       C:\\Users\\seo44\\.gemini\\antigravity\\scratch\\.gemini_api_key
  2. Run:
       python generate_lyria_12_tracks.py
     or test 1 track first:
       python generate_lyria_12_tracks.py --only 01_seoul_neon_pulse
"""
import asyncio
import os
import subprocess
import sys
import wave
from google import genai
from google.genai import types

OUT_DIR = r"C:\Users\seo44\.gemini\antigravity\scratch\rhythm-stick-dash\assets\audio\tracks"
KEY_FILE = r"C:\Users\seo44\.gemini\antigravity\scratch\.gemini_api_key"
TMP_DIR = r"D:\lyria_tmp"

TRACKS = [
    {
        "file": "01_seoul_neon_pulse.ogg",
        "bpm": 132,
        "duration": 80.0,
        "density": 0.78,
        "brightness": 0.82,
        "prompt": (
            "2026 trendy K-Pop girl group electro-pop dance anthem, crisp punchy four-on-the-floor kick, "
            "bouncy sidechained future-house synth bass, glittering glossy K-Pop synth brass stabs, "
            "catchy upbeat vocal-chop style lead melody, sparkling hi-hats, explosive pre-chorus riser into "
            "euphoric Seoul neon club chorus drop, ultra-clean modern commercial K-Pop studio mastering"
        ),
    },
    {
        "file": "02_hyperpop_overdrive.ogg",
        "bpm": 150,
        "duration": 76.8,
        "density": 0.86,
        "brightness": 0.90,
        "prompt": (
            "2026 futuristic K-Pop hyperpop cyberpunk dance track, bold metallic synth hooks, "
            "punchy distorted 808 sub bass, glittering arpeggiated hyperpop plucks, high-energy glitchy "
            "percussion fills, soaring euphoric supersaw chorus drop, razor-sharp commercial pop mastering"
        ),
    },
    {
        "file": "03_gangnam_midnight.ogg",
        "bpm": 128,
        "duration": 75.0,
        "density": 0.74,
        "brightness": 0.76,
        "prompt": (
            "Trendy 2026 K-Pop UK garage and club bounce dance instrumental, groovy syncopated 2-step "
            "and four-on-the-floor beat, silky Rhodes electric piano chords, warm bouncy sub-bassline, "
            "glossy Seoul midnight lounge pop synth leads, sleek stylish modern K-Pop production"
        ),
    },
    {
        "file": "04_jersey_club_rush.ogg",
        "bpm": 142,
        "duration": 74.4,
        "density": 0.84,
        "brightness": 0.84,
        "prompt": (
            "2026 viral K-Pop Jersey Club dance hit, signature bouncy triplet Jersey club kick pattern, "
            "sparkling dreamy Y2K pop synth pads, bright catchy bell-pluck hook, crisp claps and snaps, "
            "high-energy infectious Korean pop dance-challenge groove, punchy radio-ready studio mix"
        ),
    },
    {
        "file": "05_cyber_phonk_drift.ogg",
        "bpm": 148,
        "duration": 77.8,
        "density": 0.82,
        "brightness": 0.70,
        "prompt": (
            "Modern Tokyo cyber drift phonk EDM banger, aggressive distorted 808 cowbell melody, "
            "heavy slamming trap kick and crisp rolling hi-hats, dark cinematic cyberpunk brass stabs, "
            "intense street-racing adrenaline drop, wide stereo club mastering"
        ),
    },
    {
        "file": "06_starlight_future_bass.ogg",
        "bpm": 136,
        "duration": 77.6,
        "density": 0.76,
        "brightness": 0.85,
        "prompt": (
            "Emotional 2026 K-Pop future bass anthem, lush shimmering supersaw chord swells with LFO wobble, "
            "sparkling anime-pop piano and bell arpeggios, punchy festival snare, uplifting euphoric drop, "
            "crystal clear modern pop-EDM studio mix"
        ),
    },
    {
        "file": "07_retro_synth_highway.ogg",
        "bpm": 126,
        "duration": 76.2,
        "density": 0.72,
        "brightness": 0.74,
        "prompt": (
            "Modern 2026 K-Pop retro synthwave outrun anthem, lush analog Juno-106 pads, driving 16th-note "
            "arpeggiated neon bassline, punchy gated-reverb snare, nostalgic glowing synth lead melody, "
            "glossy midnight highway pop production"
        ),
    },
    {
        "file": "08_festival_bigroom_drop.ogg",
        "bpm": 130,
        "duration": 73.8,
        "density": 0.85,
        "brightness": 0.86,
        "prompt": (
            "Mainstage EDM festival big-room progressive house anthem, huge stadium kick drum, "
            "anthemic uplifting supersaw lead melody, dramatic snare build-up riser into massive "
            "festival drop with wide stereo synth chords, Ultra Music Festival mastering"
        ),
    },
    {
        "file": "09_velocity_dnb.ogg",
        "bpm": 172,
        "duration": 78.1,
        "density": 0.88,
        "brightness": 0.84,
        "prompt": (
            "High-speed 2026 liquid drum and bass K-Pop fusion track, crisp rolling breakbeat drums at 172 BPM, "
            "deep warm Reese sub-bass, shimmering ethereal synth pads, bright catchy melodic lead hook, "
            "futuristic orbital highway energy, ultra-tight studio drum and bass mastering"
        ),
    },
    {
        "file": "10_velvet_nu_disco.ogg",
        "bpm": 124,
        "duration": 77.4,
        "density": 0.74,
        "brightness": 0.80,
        "prompt": (
            "Stylish 2026 K-Pop nu-disco funk dance track, funky slap electric bass guitar, crisp rhythmic "
            "clean wah guitar chops, shimmering disco strings, glossy French-house filter sweeps, "
            "infectious feel-good groove, polished Billboard pop studio mix"
        ),
    },
    {
        "file": "11_hardstyle_inferno.ogg",
        "bpm": 155,
        "duration": 80.5,
        "density": 0.90,
        "brightness": 0.82,
        "prompt": (
            "Euphoric modern hardstyle rave rhythm-game boss track, massive punchy reverse-bass and "
            "distorted hardstyle kick, soaring emotional trance supersaw anthem lead melody, dramatic "
            "orchestral cinematic breakdown into explosive high-energy climax drop"
        ),
    },
    {
        "file": "12_vip_trap_anthem.ogg",
        "bpm": 140,
        "duration": 75.4,
        "density": 0.82,
        "brightness": 0.78,
        "prompt": (
            "2026 K-Pop girl-crush hip-hop trap anthem, bold brass horn stabs, "
            "earth-shaking 808 bass glides, razor-sharp rapid trap hi-hat rolls, swaggering catchy "
            "oriental-synth hook, explosive stadium dance-break drop, high-budget studio mastering"
        ),
    },
]


def load_api_key() -> str:
    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if key and key.strip():
        return key.strip()
    if os.path.exists(KEY_FILE):
        with open(KEY_FILE, "r", encoding="utf-8") as f:
            k = f.read().strip()
            if k:
                return k
    raise SystemExit(
        "GEMINI_API_KEY is not set. Set GEMINI_API_KEY env var or write your key to:\n"
        f"  {KEY_FILE}"
    )


async def generate_one_track(client: genai.Client, spec: dict):
    os.makedirs(TMP_DIR, exist_ok=True)
    os.makedirs(OUT_DIR, exist_ok=True)
    wav_path = os.path.join(TMP_DIR, spec["file"].replace(".ogg", ".wav"))
    ogg_path = os.path.join(OUT_DIR, spec["file"])

    sample_rate = 48000
    channels = 2
    bytes_per_sec = sample_rate * channels * 2  # 16-bit PCM stereo
    target_bytes = int((spec["duration"] + 1.0) * bytes_per_sec)
    pcm_buf = bytearray()

    print(f"[LYRIA] Generating {spec['file']} ({spec['bpm']} BPM, {spec['duration']}s)...", flush=True)
    async with client.aio.live.music.connect(model="models/lyria-realtime-exp") as session:
        await session.set_weighted_prompts(
            prompts=[types.WeightedPrompt(text=spec["prompt"], weight=1.0)]
        )
        await session.set_music_generation_config(
            config=types.LiveMusicGenerationConfig(
                bpm=spec["bpm"],
                density=spec["density"],
                brightness=spec["brightness"],
                guidance=4.5,
                temperature=1.0,
            )
        )
        await session.play()
        async for message in session.receive():
            sc = getattr(message, "server_content", None)
            if sc and getattr(sc, "audio_chunks", None):
                for chunk in sc.audio_chunks:
                    if chunk.data:
                        pcm_buf.extend(chunk.data)
            if len(pcm_buf) >= target_bytes:
                break
        await session.stop()

    with wave.open(wav_path, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_buf[:target_bytes])

    fade_out_start = max(0.0, spec["duration"] - 1.5)
    cmd = [
        "ffmpeg", "-y", "-i", wav_path,
        "-t", str(spec["duration"]),
        "-af", f"loudnorm=I=-12:TP=-1.0:LRA=7,afade=t=in:st=0:d=0.15,afade=t=out:st={fade_out_start:.2f}:d=1.5",
        "-ar", "44100", "-ac", "2", "-c:a", "libvorbis", "-q:a", "6",
        ogg_path,
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    mb = os.path.getsize(ogg_path) / (1024 * 1024)
    print(f"[OK] {spec['file']} mastered -> {ogg_path} ({mb:.2f} MB)", flush=True)


async def main():
    api_key = load_api_key()
    client = genai.Client(api_key=api_key, http_options={"api_version": "v1alpha"})

    only = None
    if "--only" in sys.argv:
        idx = sys.argv.index("--only")
        if idx + 1 < len(sys.argv):
            only = sys.argv[idx + 1]

    skip_existing = "--skip-existing" in sys.argv
    selected = []
    for spec in TRACKS:
        if only and only not in spec["file"]:
            continue
        if skip_existing:
            dst = os.path.join(OUT_DIR, spec["file"])
            if os.path.exists(dst) and os.path.getsize(dst) > 1_500_000:
                print(f"[SKIP] Already Lyria-mastered: {spec['file']}", flush=True)
                continue
        selected.append(spec)

    sem = asyncio.Semaphore(2)

    async def run_limited(spec):
        async with sem:
            for attempt in range(1, 4):
                try:
                    await generate_one_track(client, spec)
                    return
                except Exception as e:
                    print(f"[RETRY {attempt}/3] {spec['file']}: {e}", flush=True)
                    if attempt == 3:
                        raise
                    await asyncio.sleep(3 * attempt)

    await asyncio.gather(*(run_limited(s) for s in selected))
    print("\nALL_LYRIA_TRACKS_DONE", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
