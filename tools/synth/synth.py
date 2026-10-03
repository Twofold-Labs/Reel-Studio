"""Offline procedural audio (numpy only). Always available: no models, no network, no licensing issues."""
import numpy as np

SR = 44100


def _t(d):
    return np.arange(int(SR * d)) / SR


def _sweep(d, f0, f1, env, q=0.35, seed=1):
    n = int(SR * d)
    noise = np.random.default_rng(seed).standard_normal(n)
    out, win, hop = np.zeros(n + 4096), 2048, 1024
    w, freqs = np.hanning(win), np.fft.rfftfreq(win, 1 / SR)
    lf = np.log2(freqs + 1)
    for s in range(0, n - win, hop):
        fc = f0 * (f1 / f0) ** (s / n)
        mask = np.exp(-0.5 * ((lf - np.log2(fc)) / q) ** 2)
        out[s:s + win] += np.fft.irfft(np.fft.rfft(noise[s:s + win] * w) * mask)
    out = out[:n]
    out /= np.abs(out).max() + 1e-9
    return out * env(np.arange(n) / n)


def tick():
    t = _t(0.14)
    return (np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 45) * 0.6
            + np.sin(2 * np.pi * 900 * t) * np.exp(-t * 60) * 0.3)


def chime():
    t = _t(2.0)
    out = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * (2 + f / 1500))
              for f, a in [(880, 1), (1320, .5), (1760, .35), (2637, .15)])
    return out * 0.32


def thud():
    t = _t(0.6)
    ph = 2 * np.pi * np.cumsum(45 + 80 * np.exp(-t * 18)) / SR
    return np.sin(ph) * np.exp(-t * 7) * 0.9


def whoosh():
    return _sweep(0.8, 300, 3200, lambda u: np.sin(np.pi * u) ** 2) * 0.5


def riser():
    d = 2.4
    t = _t(d)
    n = _sweep(d, 200, 5000, lambda u: u ** 2.2) * 0.45
    tone = np.sin(2 * np.pi * np.cumsum(220 + 660 * (t / d) ** 2) / SR) * (t / d) ** 3 * 0.12
    return n + tone


def pop():
    t = _t(0.18)
    f = 520 + 700 * np.exp(-t * 40)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 24) * 0.7


def slam():
    t = _t(0.7)
    ph = 2 * np.pi * np.cumsum(38 + 160 * np.exp(-t * 22)) / SR
    body = np.sin(ph) * np.exp(-t * 6)
    n = _sweep(0.7, 900, 5200, lambda u: np.exp(-u * 9), seed=3)
    return (body * 0.9 + n * 0.35)


def kick():
    t = _t(0.28)
    ph = 2 * np.pi * np.cumsum(48 + 110 * np.exp(-t * 28)) / SR
    return np.sin(ph) * np.exp(-t * 11) * 0.9


def hat():
    n = np.random.default_rng(5).standard_normal(int(SR * 0.06))
    n = np.diff(n, prepend=0)  # crude high-pass
    return n * np.exp(-np.arange(len(n)) / SR * 70) * 0.25


SFX = {"tick": tick, "chime": chime, "thud": thud, "whoosh": whoosh, "riser": riser,
       "pop": pop, "slam": slam, "kick": kick, "hat": hat}
_cache = {}


def sfx(name):
    if name not in _cache:
        _cache[name] = SFX[name]().astype(np.float32)
    return _cache[name]


def music(duration, bpm=90, energy="medium", start=1.5):
    """Warm minor pad + soft plucked arpeggio with echo; at medium/high energy a soft kick (and hats) lock to the
    same beat grid the camera punches use (grid origin = `start`). Deliberately understated."""
    t = _t(duration)
    pad = np.zeros_like(t)
    for k, f in enumerate([110.0, 164.81, 196.0, 246.94, 329.63]):
        lfo = 0.6 + 0.4 * np.sin(2 * np.pi * (0.07 + 0.03 * k) * t + k)
        for det in (-0.004, 0.0, 0.004):
            fr = f * (1 + det)
            pad += lfo * (np.sin(2 * np.pi * fr * t) + 0.25 * np.sin(2 * np.pi * 2 * fr * t)) * 0.035
    fi, fo = np.clip(t / 1.2, 0, 1), np.clip((duration - t) / 1.2, 0, 1)
    pad *= fi * fo
    beat = 60.0 / bpm
    arp = np.zeros_like(t)
    notes, step = [220.0, 261.63, 329.63, 392.0, 440.0, 392.0, 329.63, 261.63], beat / 2
    pl_t = _t(0.5)
    pluck = lambda f: (np.sin(2 * np.pi * f * pl_t) + 0.3 * np.sin(2 * np.pi * 2 * f * pl_t)) * np.exp(-pl_t * 8)
    k, s0 = 0, start
    ag = {"calm": 0.07, "medium": 0.08, "high": 0.10}.get(energy, 0.08)
    while s0 < duration - 0.5:
        s = int(s0 * SR)
        seg = pluck(notes[k % len(notes)]) * ag
        arp[s:s + len(seg)] += seg[:len(arp) - s]
        k, s0 = k + 1, s0 + step
    for dly, g in [(0.375, 0.4), (0.75, 0.2), (1.125, 0.1)]:
        sft = int(dly * SR)
        arp[sft:] += arp[:-sft] * g
    arp *= np.clip((t - start + 1) / 2.5, 0, 1) * fo
    drums = np.zeros_like(t)
    if energy in ("medium", "high"):
        kk, hh = kick(), hat()
        i, s0 = 0, start
        while s0 < duration - 0.6:
            s = int(s0 * SR)
            drums[s:s + len(kk)] += kk[:len(drums) - s] * (0.55 if energy == "medium" else 0.8)
            if energy == "high":
                h = int((s0 + beat / 2) * SR)
                if h < len(drums):
                    drums[h:h + len(hh)] += hh[:len(drums) - h]
            i, s0 = i + 1, s0 + beat
        drums *= fo
    return (pad + arp + drums * 0.5).astype(np.float32)
