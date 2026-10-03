---
workflow: general-video
flow: automation
storyboard: no
message: "Fragmented tools waste time: Twofold connects them"
destination: instagram-feed
aspect: 1080x1350
language: en
length: 12s
narration: no
---

## Intent

Fragmented tools waste time: Twofold connects them

Objective: promote. Tone: calm, confident, plain-spoken.

## Assets

- assets/brand/tokens.css — brand colors, fonts, safe-zone variables (link it in every composition)
- assets/brand/fonts/ — the brand fonts, shipped as files
- frame.md — the design-truth file for this piece

## Customizations

- Style preset **precise** (calm, mechanical, engineered); energy **medium** (a beat every ~2 s; camera pulses once per bar (4 beats)). Details in frame.md § Motion.
- Music: Offline synth bed: generate with `node tools/reel.mjs synth <project>` (needs audio/cues.json). BPM 90.
- Sound effects: yes, one on every key visual beat.
- Call to action: "twofold-labs.com", on screen for the last 2-3 seconds.
- Brand motion personality: precise, mechanical, calm. Amber is the only thing that comes alive. No neon, no sparkles..

## Notes

- Brand: Twofold Labs (https://twofold-labs.com). Positioning: Founder-led software and cloud engineering studio with in-house creative technology (3D, animation, AI art).
- **The intake is COMPLETE and confirmed by the user. Ask no brief questions.** Beat sheet approved by the user: see PROPOSAL.md (build to it).
- House rules (hook in <= 1 s, a new beat every ~2 s, big type >= 56 px for headlines, safe zones, CTA in the last 3 s, asset policy) live in the repo root CLAUDE.md and playbook/*.md.
- Use the vendored GSAP at `assets/vendor/gsap.min.js` (not a CDN). Stay seek-safe: paused timeline, no randomness/timers/onUpdate/infinite loops.
- Never fabricate photos, people, screenshots, client logos or statistics. Use only material in Assets or text the user supplied.
