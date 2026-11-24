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

## Requirements
| Need | Why |
|---|---|
| Node.js 22+ | the CLI and HyperFrames |
| ffmpeg + ffprobe on `PATH` | rendering and audio |
| Chrome Headless Shell | installed for you by `reel setup`; nothing renders without it |
| Python 3 + `numpy` *(optional)* | offline music/SFX (`reel synth`) |
| Kokoro / MusicGen / Whisper models *(optional)* | voiceover, generated music, transcription (`reel doctor` shows what is missing) |

Works on Windows, macOS and Linux. [Claude Code](https://claude.com/claude-code) is the intended way to drive it (it reads [CLAUDE.md](./CLAUDE.md)), but every step is also a plain CLI command.

## Setup (once)
```bash
npm install                       # pins hyperframes@0.8.111, gsap, jsdom, yaml, three
node tools/reel.mjs setup         # Chrome Headless Shell + HyperFrames core skills
node tools/reel.mjs doctor        # shows what is installed and what is optional
pip install numpy                 # optional, only for `reel synth`
```

## Try it
Render the worked example to confirm your machine works:
```bash
node tools/reel.mjs check  projects/twofold-labs/example-problem-solution
node tools/reel.mjs render projects/twofold-labs/example-problem-solution --draft
```
The result lands in `projects/twofold-labs/example-problem-solution/renders/`.

## Each session
Open the folder in Claude Code and describe the reel. Claude asks only what you haven't said (brand, idea, format, length, style, energy, music/SFX, Kokoro voiceover, CTA, assets), shows a beat sheet for approval, builds the composition with the HyperFrames skills, runs the checks and renders.
Manual: `new -> intake/answer -> (write PROPOSAL.md, answer approved=true) -> scaffold -> build -> check -> render`. `node tools/reel.mjs help` lists everything.

**Video only, no Studio:** `render` is headless. The Studio (`reel studio`) is opt-in and never required.

## Your own brands and projects
`brands/<slug>/` and `projects/<brand>/<name>/` are **git-ignored** by default so client work never gets committed by accident. Only `brands/_template/` and the Twofold Labs example are tracked. To version your own, remove the matching lines from `.gitignore`.
Create a brand with `node tools/reel.mjs new-brand <slug>` (copy of `brands/_template/brand.yaml`).

## Known limits
- The example composition is a pattern, not a polished piece: review its frames before copying it.
- Kokoro (`hyperframes tts`), transcription, MusicGen and `/media-use` need their optional models and network access; the offline synth path needs only Python 3 + numpy.
- The tooling models short reels (4:5, 9:16, 1:1, plus 16:9 web loops and long-form); pacing rules for long-form are guidance only (`playbook/content-modes.md`).
- HyperFrames moves fast: the version is pinned in `package.json`; upgrade deliberately and re-run `check`.

## Licence
MIT, see [LICENSE](./LICENSE). The Twofold Labs name and logo in `brands/twofold-labs/` are trademarks of Twofold Labs and are included only as the worked example; they are not covered by the MIT licence.

## Credits
Rendering by [HyperFrames](https://www.npmjs.com/package/hyperframes); animation by [GSAP](https://gsap.com) (see its licence before commercial use). Fonts in `shared/fonts/` are SIL Open Font License (Archivo, Inter, Sora, Poppins).
