# Asset policy: generate only when necessary, only with consent

Most reels need **no** external assets: brand colours, brand fonts, text, shapes, SVG diagrams and procedural motion are enough.

| Need | Handling |
|---|---|
| Logo missing | Ask (`assets.logo`). If `generate`: `node tools/reel.mjs gen-asset <brand> wordmark|monogram` writes a labelled **placeholder SVG**. Say it's a placeholder. |
| Icons, shapes, diagrams, counters, networks, charts | Build in HTML/SVG/GSAP (or the HyperFrames catalog). No files needed. |
| Real photos, people, product shots, screenshots, client logos, footage | **Never fabricate.** Ask the user to provide them (`assets.other=provided`). If none exist, redesign the idea without them. |
| Website visuals for a promo | Only via HyperFrames' `/product-launch-video` capture of the brand's *own* site, with the user's OK. |
| Statistics, quotes, testimonials, client names | Only exact text the user/brand supplied. Never invent or "round up". |
| Music / voice | See `audio.md`. Never clone a real person's voice without confirmed consent. |
| Anything else | Ask first; prefer a procedural graphic over generated imagery. |
