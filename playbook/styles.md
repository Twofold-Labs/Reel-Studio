# Style presets (motion personality) and energy

Brand colours/fonts live in `brands/<slug>/brand.yaml`. The preset is *how things move*; it is written into each project's `frame.md § Motion`.

| Preset | Feel | Easing | Entrances | Camera | Transitions |
|---|---|---|---|---|---|
| **precise** | calm, mechanical, engineered | power2.out / expo.out, no overshoot | 0.5-0.7 s rise 40 px + fade | slow push-in +3.5% | clean cross-fade / 0.4 s slide; one accent flash at the reveal |
| **bold** | loud, high-contrast, slam-cut | back.out(1.7) pops, expo.out slams | slam: scale 1.55 -> 1 in 0.16 s, hard cut out | push-in +5%, punch +2-3% on every key beat | flash-through-white or wipe at each scene change |
| **playful** | springy, bouncy, friendly | back.out(1.4) / elastic.out(1, .5) | pop with overshoot, 0.45 s | sway +/-7 px, push-in +4% | bouncy slides, circle wipes |
| **cinematic** | slow, dramatic, moody | power3.inOut | 1.0-1.4 s fades, slow rises | long drift +7%, slight sway | slow dissolves; no flashes |

**Energy** sets the beat spacing: calm ~3 s (no camera pulse) | medium ~2 s (pulse once per bar = 4 beats) | high ~1 s (pulse on every beat, kick + hat in the bed).
Beat grid: `beat = 60 / bpm` seconds (bpm from `brand.yaml: music.bpm`, default 90). Start the grid at ~1.5 s so the hook lands before the first pulse.
