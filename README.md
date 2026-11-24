# reel-studio

Make short, on-brand motion-graphics videos (Instagram reels, feed posts, website loops) from a plain-English idea.

You describe the video. reel-studio asks the few questions it needs, writes a beat sheet for you to approve, builds the video as HTML + GSAP, checks it, and renders an MP4.

It is a layer on top of [HyperFrames](https://www.npmjs.com/package/hyperframes), which does the actual rendering (HTML in headless Chrome, encoded with FFmpeg). reel-studio adds:

- **Brand packs**: one `brand.yaml` per brand (colours, fonts, tone, music, defaults).
- **A question-first intake**: nothing gets built until the brief is complete.
- **An approval gate**: `render` refuses to run until you have approved the beat sheet.
- **House rules and a lint**: a strong hook, no dead air, readable type, a CTA, on-brand tokens.

## How it works

```
idea  ->  intake  ->  PROPOSAL.md  ->  you approve  ->  scaffold  ->  build  ->  check  ->  render  ->  MP4
```

1. **Intake**: your idea, format, length, style, audio and call to action are recorded in `brief.yaml`. Anything you already said is not asked again.
2. **Proposal**: a logline and a beat sheet (`time | on screen | sound`) go in `PROPOSAL.md`. You say yes, or ask for changes.
3. **Build**: the composition (`index.html`) is written to match the approved proposal and the brand's look (`frame.md`).
4. **Check and render**: lint, a headless-Chrome run, then the MP4.

## Quick start

**Requirements**

| Need | Why |
|---|---|
| Node.js 22+ | the CLI and HyperFrames |
| ffmpeg and ffprobe on `PATH` | rendering and audio |
| Python 3 + `numpy` *(optional)* | offline music and sound effects (`reel synth`) |
| Kokoro, MusicGen, Whisper models *(optional)* | voiceover, generated music, transcription |

Works on Windows, macOS and Linux.

**Install**

```bash
npm install
node tools/reel.mjs setup     # downloads Chrome Headless Shell + HyperFrames skills
node tools/reel.mjs doctor    # shows what is installed and what is missing
```

**Check your machine by rendering the worked example**

```bash
node tools/reel.mjs check  projects/twofold-labs/example-problem-solution
node tools/reel.mjs render projects/twofold-labs/example-problem-solution --draft
```

The MP4 appears in `projects/twofold-labs/example-problem-solution/renders/`. If `render` fails, run `doctor`: the usual cause is Chrome or ffmpeg missing.

## Making your own reel

### Option A: with Claude Code (recommended)

Open this folder in [Claude Code](https://claude.com/claude-code) and describe the reel, for example *"a 12-second reel for my brand explaining why fragmented tools waste time"*. Claude reads [CLAUDE.md](./CLAUDE.md), asks only what you have not said, shows the beat sheet for approval, then builds, checks and renders.

### Option B: by hand

Every step is a CLI command (`node tools/reel.mjs help` lists them all):

```bash
node tools/reel.mjs new-brand my-brand                       # once per brand, then fill in brands/my-brand/brand.yaml
node tools/reel.mjs new my-brand my-first-reel               # creates projects/my-brand/my-first-reel/brief.yaml
node tools/reel.mjs answer projects/my-brand/my-first-reel idea="..." duration=12
node tools/reel.mjs intake projects/my-brand/my-first-reel   # prints the questions still unanswered
# write PROPOSAL.md, then:
node tools/reel.mjs answer projects/my-brand/my-first-reel approved=true
node tools/reel.mjs scaffold projects/my-brand/my-first-reel
# author index.html (see the example project and playbook/engagement.md), then:
node tools/reel.mjs check  projects/my-brand/my-first-reel
node tools/reel.mjs render projects/my-brand/my-first-reel --quality=delivery
```

Use `--draft` for a fast preview. After editing `brief.yaml` or `brand.yaml`, run `node tools/reel.mjs sync <project>` to regenerate the derived files.

`reel studio <project>` opens an optional live preview. It is never required to render.

## Repo layout

```
CLAUDE.md                  operating manual for Claude Code (AGENTS.md points to it)
questions.yaml             the intake question bank
brands/<slug>/brand.yaml   colours, fonts, copy, music, voice and defaults for one brand
brands/_template/          copy this to start a new brand
projects/<brand>/<name>/   one video:
   brief.yaml, PROPOSAL.md     your answers and the approved beat sheet (you own these)
   BRIEF.md, frame.md          generated for HyperFrames (do not edit; run `reel sync`)
   index.html, compositions/   the video itself
   assets/brand/               generated tokens.css, fonts, logo
   audio/                      voiceover and sound bed
   renders/                    output MP4s (disposable)
playbook/                  engagement rules, styles, formats, audio and voice guides, 6 recipes
shared/fonts/              fonts shipped with every project (all SIL OFL)
tools/                     the `reel` CLI, the lint, and optional offline audio synth
```

Start from a recipe in [playbook/recipes/](./playbook/recipes/): belief statement, problem/solution, process steps, proof stat, services rundown, voiceover explainer.

## Formats

| Key | Canvas | For |
|---|---|---|
| `reel_9x16` | 1080x1920 | Reels, Stories, Shorts |
| `feed_4x5` | 1080x1350 | Instagram feed |
| `square_1x1` | 1080x1080 | square posts |
| `web_720` | 1280x720 | muted website loops |
| `wide_16x9` | 1920x1080 | YouTube long-form |

Safe zones for each are in [playbook/formats.md](./playbook/formats.md).

## Your own brands and projects

`brands/<slug>/` and `projects/<brand>/<name>/` are **git-ignored** so client work is never committed by accident. Only `brands/_template/` and the Twofold Labs example are tracked. To version your own, edit `.gitignore`.

## Known limits

- The example composition is a pattern, not a polished piece. Review its frames before copying it.
- Voiceover, transcription and generated music need optional models (`doctor` shows what is missing). The offline synth path needs only Python 3 + numpy.
- The tooling is built around short videos. Long-form pacing is guidance only: see [playbook/content-modes.md](./playbook/content-modes.md).
- HyperFrames moves fast, so its version is pinned in `package.json`. Upgrade deliberately and re-run `check`.

## Licence and credits

MIT, see [LICENSE](./LICENSE). The Twofold Labs name and logo in `brands/twofold-labs/` are trademarks of Twofold Labs, included only as the worked example, and are not covered by the MIT licence.

Rendering by [HyperFrames](https://www.npmjs.com/package/hyperframes). Animation by [GSAP](https://gsap.com) (check its licence before commercial use). Fonts in `shared/fonts/` are SIL Open Font License.
