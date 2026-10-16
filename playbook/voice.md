# Voice: sound human, not read-out (applies to EVERY project and brand)

The user's standing rule: voiceovers must sound like a person talking, with pauses and feeling, never a robotic continuous read.
Kokoro (our local TTS) has **no emotion parameter**. Its delivery comes from the text and the speed. So naturalness is built in
three places: **the script, the line structure in `audio/vo.yaml`, and the timing in the edit.**

## 1. Write for the ear
- One thought per line, 3-12 words. Spoken sentences, contractions ("here's", "you'll", "don't").
- Questions where a person would ask one ("A large box, full of books?"): Kokoro lifts the intonation on `?`.
- Commas where a speaker would breathe; they give a small lift, not a pause.
- No ALL CAPS (read as letters), no symbols (write "per cent", "inches", "eighteen by eighteen" when it must be heard).
- Emotion comes from word choice and rhythm: short punchy line for surprise, a longer warm line for reassurance.

## 2. Structure the delivery in `audio/vo.yaml` (`reel voice` reads per-line `pause` and `speed`)
```yaml
start: 0.6
gap: 0.35                 # default pause after a line
lines:
  - {text: "Moving house?", pause: short}
  - {text: "Here's the box mistake... almost everyone makes.", speed: 1.04, pause: long}   # hook lands, then silence
  - {text: "A large box, full of books?", speed: 0.98, pause: short}
  - {text: "Too heavy to lift safely.", speed: 0.92, pause: normal}                          # the warning: slower
  - {text: "So, pack heavy things small,", speed: 0.96, pause: none}                         # comma: flows into the next line
  - {text: "and save the big boxes for bedding."}
```
| `pause` | seconds | use |
|---|---|---|
| `none` | 0.08 | a comma that continues the sentence across two lines |
| `short` | 0.28 | between quick thoughts, after a question |
| `normal` | 0.5 | between sentences |
| `long` | 0.85 | after the hook, before the payoff, at a scene change |
| `beat` | 1.2 | a deliberate dramatic hold (once per reel at most) |
A number works too (`pause: 0.6`).

**Speed (per line):** 0.92-0.96 for the line that matters (warnings, the rule, the payoff); 1.0 neutral; 1.02-1.06 for
asides and set-up. Never vary more than about ±8% or it sounds edited. Keep the brand's base speed in `brand.yaml`.

**Never make a clip shorter than a full sentence of ~1.5 s.** One- or two-word clips ("tape," / "Pack it." / "Protect it.")
sound wrong: Kokoro has no sentence context, so the intonation and articulation collapse ("Pack it." came out close to
"packet"). The user rejected these on Reel 001. For pauses *inside* a sentence or list, keep it one line and add `breaths`:
```yaml
  - {text: "Moving boxes, bubble wrap, tape, and handy moving kits.", breaths: [0.32, 0.32, 0.26], pause: long}
  - {text: "Pack it. Protect it. Get moving.", speed: 0.98, breaths: [0.36, 0.46]}
```
`reel voice` generates the whole sentence, then inserts each breath (seconds) at the script's punctuated word boundaries, in
order (`0` skips one), cutting at the quietest point between the two words with micro-fades, and shifts the word timestamps.
Each word still has its own timestamp, so visuals can land on every list item without separate clips.

**Measured on Kokoro (2026-10-12):** an ellipsis inside a line gives only ~0.15 s; a full stop mid-line gives almost none.
**Real pauses come from splitting lines**, not punctuation.

## 3. Edit for performance
- Let pictures breathe in the pauses: a visual beat (slam, reveal, sound hit) often sits *in* a `long` pause, not under words.
- Music lifts slightly in long pauses and ducks under speech (mix.mjs sidechain / volume keys).
- Never stack two `long` pauses back to back; never run more than ~3 lines without a `short` or longer pause.
- Listen to the whole read before building the picture. If a line sounds flat, rewrite it (shorter, a question, a contraction)
  before touching speed.

## Limits and upgrade path
Kokoro can't do laughter, whisper, real emphasis on one word, or emotional colour beyond what the text implies. If a project needs
more, the upgrade is an expressive TTS (e.g. a local model with an emotion/exaggeration control, or a cloud voice service). That
is a new tool and a download: ask the user before installing anything, and never clone a real person's voice without consent.
