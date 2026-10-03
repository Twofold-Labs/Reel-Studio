# reel-studio (HyperFrames edition)

Brand-driven Instagram reels. **HyperFrames** does the rendering (HTML + GSAP → MP4 in headless Chrome + FFmpeg) and provides the authoring skills;
**this repo adds our layer on top**: a fixed folder structure, brand packs, a question-first intake, an approval gate, house rules and an engagement lint.

```
CLAUDE.md                  operating manual (read first)           questions.yaml   the intake question bank
brands/<slug>/brand.yaml   colours, fonts, copy, music/voice, defaults (one file per brand)
projects/<brand>/<name>/   a HyperFrames project:
   brief.yaml  PROPOSAL.md       OUR intake answers + the approved beat sheet
   BRIEF.md  frame.md            generated for HyperFrames (its no-repeat brief + design spec)
   index.html  compositions/     the video itself          assets/brand/  tokens.css, fonts, logo
   audio/  renders/              voiceover + sound bed     final mp4s
playbook/                  engagement rules, styles, assets policy, formats, audio, 6 recipes
tools/reel.mjs             the CLI          tools/synth/  optional offline music/SFX (python + numpy)
```

## Setup (once)
```bash
npm install                       # pins hyperframes@0.8.111, gsap, jsdom, yaml  (Node 22+, ffmpeg required)
node tools/reel.mjs setup         # Chrome Headless Shell + HyperFrames core skills
node tools/reel.mjs doctor
```

## Each session
Open the folder in Claude Code and describe the reel. Claude asks only what you haven't said (brand, idea, format, length, style, energy, music/SFX, Kokoro voiceover, CTA, assets), shows a beat sheet for approval, builds the composition with the HyperFrames skills, runs the checks and renders.
Manual: `new → intake/answer → (write PROPOSAL.md, answer approved=true) → scaffold → build → check → render`. `node tools/reel.mjs help` lists everything.

**Video only, no Studio:** `render` is headless. The Studio (`reel studio`) is opt-in and never required.

## Status and known limits (be aware)
- Authored and tested in a sandbox **without Chrome**: the CLI, intake, gate, scaffolding (real `hyperframes init`), brief/frame/token generation, `hyperframes lint` and our engagement lint (which executes the composition's real GSAP timeline in jsdom) all ran. **A real `hyperframes render` was not run.** First thing to do on your machine: `node tools/reel.mjs setup`, then `render --draft` the worked example.
- The example composition (`projects/twofold-labs/example-problem-solution`) passes both lints but has not been visually reviewed. Treat it as a pattern, and review its frames.
- Kokoro (`hyperframes tts`), transcription, MusicGen and `/media-use` need their optional models/network; the offline synth path needs only python3 + numpy.
- HyperFrames moves fast: the version is pinned in `package.json`; upgrade deliberately and re-run `check`.
