# Handing over to HyperFrames

Our intake writes `BRIEF.md` in HyperFrames' own format, so its router (`/hyperframes`) finds it, reads `workflow`/`flow`, and **asks no brief questions**.

| Our brief says | `workflow` written to BRIEF.md | Notes |
|---|---|---|
| a website to promote (`source.url`) + objective promote | `product-launch-video` | uses the brand's own site capture |
| voiceover + objective educate | `faceless-explainer` | explainer with narration |
| voiceover, other objectives | `general-video` | |
| no voiceover, length <= 10 s | `motion-graphics` | short, unnarrated, design-led |
| everything else | `general-video` | |

Override by recording `workflow=<slug>` in brief.yaml (`reel answer <project> workflow=general-video`), then `reel sync`.
`storyboard: yes` in BRIEF.md (from the intake question) makes HyperFrames sketch frames for review before building; our PROPOSAL.md approval always happens first.

## Precedence
1. The user's current message. 2. **Our intake, brief.yaml and the approved PROPOSAL.md** (they decide *what*). 3. `frame.md` (the look). 4. HyperFrames skills (they decide *how to author it*). If a HyperFrames skill wants to re-interview the user, point it at `BRIEF.md`.

## First-time setup (once per machine)
`npm install` -> `node tools/reel.mjs setup` (Chrome Headless Shell + HyperFrames core skills) -> `node tools/reel.mjs doctor`.
Claude Code users may instead install the HyperFrames plugin (`claude plugin marketplace add heygen-com/hyperframes`, `claude plugin install hyperframes@hyperframes`). Either way the skills are what teach composition authoring.
