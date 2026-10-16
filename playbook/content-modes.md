# Content modes: short vs long

A **brand** is a persistent identity (colour, type, tone, motion personality). A **project** chooses a **content mode**:

| | `short` | `long` |
|---|---|---|
| Platforms | Shorts, Reels, TikTok | YouTube |
| Format | `reel_9x16` (1080x1920) | `wide_16x9` (1920x1080) |
| Length | ~45-90 s | ~4-10 min |
| Structure | hook, setup, explanation, surprise, payoff | hook, premise, context, explanation, examples, insight, payoff; organised in chapters and nested scenes |
| Pacing | hook in ~2 s; visual beat every ~1.5-3 s | hook in ~5 s; beat every ~4-8 s; pauses and long camera moves are intentional |
| Rules | `playbook/engagement.md` applies in full | engagement.md numbers (dead air, density, beat gaps) are **not** pass/fail; keep the hook, clarity, type-size and brand-token rules |

Rules for future sessions:
- Never create a second brand for long vs short content of the same channel. Read the brand's `content_modes` block in `brand.yaml`.
- Never apply short-form pacing mechanically to a long project, or the reverse.
- Long-form support (added for UTW-LF-001): set `content_mode: long` and `format.preset: wide_16x9` in the brief. `scaffold` builds a
  1920x1080 HyperFrames project; `check` keeps canvas, hook (text by ~5 s), legibility (>= 24 px), brand and determinism checks and
  skips the short-form pacing numbers (dead air, event rate, 30 s re-hook). Long projects use sentence-level subtitles, not karaoke.
  Brand-level long-form building blocks live in `brands/unfold-the-why/kit/longform/`.
- Brands may define `palette:` (extra colours, emitted as `--c-<name>` in `tokens.css`) and extra creative blocks. Only the keys listed at the top of the brand's `brand.yaml` are read by tooling; the rest is direction to follow.
