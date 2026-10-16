# reel-studio: operating manual for Claude

You produce short branded motion-graphics reels (Instagram 4:5 feed, 9:16 reel, 1:1). **HyperFrames** (HTML -> MP4, installed in `node_modules`, pinned) renders and
supplies the authoring skills. **This repo is our layer on top of it:** folder structure, brand packs, the intake, an approval gate, house rules and an engagement lint.

**Ask -> record -> propose -> get approval -> scaffold -> build -> check -> render -> deliver.** Never improvise a decision the user owns (brand, idea, length, format, style,
audio, CTA, assets). The tooling enforces it: `render` refuses to run until `brief.yaml` is complete, `PROPOSAL.md` exists and `approved: true`.

Run everything from the repo root: `node tools/reel.mjs help` (alias: `npm run reel -- <cmd>`).

## Precedence (important)
1. The user's current message → 2. **our `brief.yaml` + approved `PROPOSAL.md`** (what to make) → 3. `frame.md` (the look) → 4. HyperFrames skills (how to author it).
HyperFrames' router (`/hyperframes`) normally interviews the user; **in our projects it must not**: `BRIEF.md` (generated from our intake) is its no-repeat token ("if `BRIEF.md` exists, ask no brief questions").
Never ask the user a question that `questions.yaml` / `brief.yaml` already covers.

## 0. First time on a machine
`npm install` → `node tools/reel.mjs setup` (Chrome Headless Shell + HyperFrames core skills) → `node tools/reel.mjs doctor`. If Chrome is missing nothing can render; say so plainly instead of improvising.

## 1. Intake (mandatory for every new video)
1. **Extract** what the user already said (brand, idea, length, format, style, audio, CTA…). Don't re-ask it.
2. Brand unknown? Ask it first (`node tools/reel.mjs list`). New brand → §2.
3. `node tools/reel.mjs new <brand> <name> [--recipe=<recipe>]` → creates `projects/<brand>/<name>/brief.yaml`.
4. Record only what the user **actually said**: `node tools/reel.mjs answer projects/<brand>/<name> idea="…" duration=12 …` (ids are in `questions.yaml`; quote values).
5. `node tools/reel.mjs intake projects/<brand>/<name>` → JSON of **pending** questions with options and brand defaults.
6. **Ask them.** Use the interactive question tool if you have one (`ask_user_input_v0` in claude.ai, `AskUserQuestion` in Claude Code); else a short numbered list. ≤ 4 questions per round, ≤ 3 rounds,
   show each option's label + note, mark the recommended one, free text only for idea/CTA/custom. Order: idea → format & length → style & energy → audio → CTA & assets → storyboard.
7. Record each answer with `answer`; repeat `intake` until `pending` is empty.
8. "Use defaults / you decide" → `intake --use-defaults` (fills non-core answers from `brand.yaml: defaults` or the recommended option). **Brand and idea are never defaulted.** Tell the user which defaults you applied.
9. If `audio.voiceover=kokoro` and `audio.script=draft`: write the lines (hook ≤ 7 words, ≤ 14 words/line), show them, get a yes.

## 2. Brand: reuse or create
- Exists → read `brands/<slug>/brand.yaml` and **reuse it; don't re-research.**
- New → `node tools/reel.mjs new-brand <slug>`, then fill it from the brand's own site/socials: name, positioning, tagline, services/descriptor, beliefs, process, handle, URL; colours (theme-color meta, CSS variables, logo → `bg`, `surface`, `accent`, `text`, `muted`);
  `style.motion`, `style.visual_language`, `music.style`, `voice.tone`, `defaults`. Keep it factual: never invent claims, clients, numbers or testimonials.
- Logo: list URLs under `assets:` and run `fetch-assets`. If blocked, ask the user to drop the file in `brands/<slug>/assets/` and set `logo:`. Fonts: Poppins ships in `shared/fonts/`; for another brand font add the `.ttf` there and point `fonts:` at it.

## 3. Assets: generate only when necessary, only with consent → `playbook/assets-policy.md`
Most reels need none (shapes, text, SVG, GSAP). Placeholder logo only if the user chose `generate` (`gen-asset`). **Never fabricate** photos, people, screenshots, client logos or statistics.

## 4. Proposal & approval (mandatory, before building)
Write `projects/<brand>/<name>/PROPOSAL.md` and show the same content in chat: **logline**, a **beat sheet** (`time | on screen | sound`), format/length/style/energy, audio plan (music source + mood, SFX, voiceover/voice/captions), assets plan, CTA.
Start from `playbook/recipes/<recipe>.md`. Ask "Approve, or change anything?". On yes: `node tools/reel.mjs answer <project> approved=true`. A material change later (idea, length, style, audio) → update brief.yaml + PROPOSAL.md and re-confirm.

## 5. Scaffold and hand over to HyperFrames
`node tools/reel.mjs scaffold projects/<brand>/<name>` creates the HyperFrames project (canvas incl. 4:5, vendored GSAP, `assets/brand/` tokens + fonts + logo, **`BRIEF.md`**, **`frame.md`**).
Then author the composition by following the HyperFrames skills (`/hyperframes` → the workflow named in `BRIEF.md`, `/hyperframes-core`, `/hyperframes-animation`…), **building exactly to PROPOSAL.md** and obeying `frame.md` + `playbook/engagement.md`.
Use the tested GSAP patterns in `playbook/engagement.md` (slam, camera path, loop-safe fade). After changing the brief or brand: `node tools/reel.mjs sync <project>`.
Worked example to copy from: `projects/twofold-labs/example-problem-solution/`.

## 6. Audio → `playbook/audio.md`, `playbook/voice.md`
**Every voiceover must sound human: phrase-by-phrase lines with designed pauses and per-line pace (`pause`/`speed` in `audio/vo.yaml`), never one continuous read** (`playbook/voice.md`; applies to all brands). Pick the voice per brand.yaml (some brands set a different voice per video type).
Kokoro voiceover: `audio/vo.yaml` → `node tools/reel.mjs voice <project>` (real durations + word timestamps) → time scenes and captions from `audio/vo.json`. Music/SFX: HyperFrames `/media-use`, or offline `reel synth` with `audio/cues.json`. Cue every key visual beat. If a model/tool isn't installed, say so, use the offline path for drafts, and tell the user what to install. Never clone a real person's voice without confirmed consent.

## 7. Verify (all before the final render)
- `node tools/reel.mjs check <project>` → fix every ERROR/BLOCK; address or justify warnings. It runs `hyperframes lint` **and** our engagement lint on the composition's real GSAP timeline (hook, dead air, density, type size, CTA, audio, captions, brand tokens, seek-safety, canvas = brief).
- `node tools/reel.mjs validate <project>` (headless Chrome: catches runtime errors) and review frames with HyperFrames' snapshot/inspect tools (`/hyperframes-cli`); **look at them** at the hook, mid, payoff and CTA.
- Voiceover: re-run `voice` after any script edit and re-time.

## 8. Render and deliver
`node tools/reel.mjs render <project>` (`--draft` for a fast preview, `--quality=delivery` for the final) → `projects/<brand>/<name>/renders/<name>.mp4`. Report: file path, what happens when (3 lines), audio sources used, anything placeholder, and 1-2 concrete variations to offer.
The Studio (`reel studio`) is **optional** and not needed to render; it starts a long-lived server, so stop it when done.

## Brand vs Content Mode

A brand defines the persistent visual and editorial identity. A project defines the content mode.

Supported content modes:
- short
- long

Do not create separate brands for long-form and short-form content of the same channel.

- Short and long content must **not** share identical pacing rules (see `playbook/content-modes.md`). Tooling currently models short reels only.
- Brand logo colours may differ from the brand's video colours: use `colors`/`palette` for video and never recolour the logo.

## Conventions
- Never hardcode brand colours/fonts/names/URLs in compositions: use the CSS variables in `assets/brand/tokens.css`. Fonts only from `assets/brand/fonts/`.
- Compositions are seek-safe: paused GSAP timeline registered on `window.__timelines`, local GSAP, no randomness/timers/`onUpdate`/infinite repeats.
- `renders/`, `node_modules/` and generated audio are disposable; `brief.yaml`, `PROPOSAL.md`, `index.html`, `compositions/` are the source of truth.
- The generated `BRIEF.md`, `frame.md` and `assets/brand/*` come from `reel sync`: edit brand.yaml / brief.yaml, not the generated files.
