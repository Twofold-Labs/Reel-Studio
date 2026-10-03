#!/usr/bin/env python3
"""Offline sound bed: music (pad + pluck + optional kick/hat) + sound effects at given times -> one stereo WAV.
Needs only numpy. Usage:
  python3 make_audio.py --out audio/bed.wav --duration 8 --bpm 90 --energy medium --cues audio/cues.json
cues.json: [{"at": 0.1, "sfx": "slam", "gain": 0.8}, ...]   sfx: tick chime thud whoosh riser pop slam kick hat
"""
import argparse, json, sys, wave
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).parent))
import synth
SR = synth.SR


def place(buf, arr, t, gain=1.0):
    s = int(max(t, 0) * SR)
    if s >= len(buf):
        return
    seg = arr[: len(buf) - s] * gain
    buf[s : s + len(seg)] += seg


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--duration", type=float, required=True)
    ap.add_argument("--bpm", type=float, default=90)
    ap.add_argument("--energy", default="medium", choices=["calm", "medium", "high"])
    ap.add_argument("--start", type=float, default=1.5, help="beat-grid origin (seconds)")
    ap.add_argument("--cues")
    ap.add_argument("--no-music", action="store_true")
    ap.add_argument("--music-gain", type=float, default=0.55)
    ap.add_argument("--sfx-gain", type=float, default=0.8)
    a = ap.parse_args()
    n = int(a.duration * SR)
    music, sfx = np.zeros(n, np.float32), np.zeros(n, np.float32)
    if not a.no_music:
        m = synth.music(a.duration, bpm=a.bpm, energy=a.energy, start=a.start)
        place(music, m, 0, a.music_gain)
    if a.cues:
        for c in json.loads(Path(a.cues).read_text()):
            place(sfx, synth.sfx(c["sfx"]), float(c["at"]), float(c.get("gain", 1.0)) * a.sfx_gain)
    mix = music + sfx
    mix *= 0.9 / (np.abs(mix).max() + 1e-9)
    fo = int(0.4 * SR)
    mix[-fo:] *= np.linspace(1, 0, fo)
    pcm = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    with wave.open(a.out, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(np.repeat(pcm[:, None], 2, axis=1).tobytes())
    print(f"wrote {a.out} ({a.duration:.1f}s)")


if __name__ == "__main__":
    main()
