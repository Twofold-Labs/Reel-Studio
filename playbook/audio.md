# Audio

| Need | How |
|---|---|
| Voiceover (free, local) | **Kokoro** through HyperFrames: write `audio/vo.yaml`, run `node tools/reel.mjs voice <project>` -> `audio/vo_N.wav` + `audio/vo.json` (start, duration, word timestamps). Voices: af_heart, af_nova, af_sky, am_adam, am_michael, bf_emma, bf_isabella, bm_george. Voice only, not music. Needs `pip install kokoro-onnx soundfile`. |
| Captions | Word timestamps come from `hyperframes transcribe` (whisper.cpp, or Parakeet via `hyperframes models install parakeet`). If unavailable, `vo.json` has no words: time captions evenly by character count and say so. Burned-in, pill background, spoken word in accent. |
| Music (library / generated) | HyperFrames' `/media-use` skill resolves or generates a bed (needs network or a local music model: `pip install transformers torch soundfile numpy` for MusicGen). |
| Music + SFX offline | `node tools/reel.mjs synth <project>`: pad + pluck + kick/hat (by energy) + SFX at times from `audio/cues.json` -> `audio/bed.wav` (python3 + numpy). Cue names: tick chime thud whoosh riser pop slam kick hat. Simple, clean, never licensed-music-risky. |
| Own track | Put it in `assets/` or `audio/` and cite it in BRIEF.md § Assets. Must be licensed for this use. |
| Mixing | `<audio src data-start data-duration data-volume>` clips in the composition; HyperFrames mixes them. For voice-over-music ducking and effects use its `/hyperframes-audio` skill. Aim for the bed around 0.5-0.9 `data-volume`. |

Timing rule: **cue every key visual beat** (slam, pop, link-up, reveal, CTA). Derive cue times from the same constants the animation uses so they cannot drift.
`cues.json`: `[{"at": 0.1, "sfx": "slam", "gain": 0.9}, ...]`. Add the printed `<audio>` tag inside `#root`.
