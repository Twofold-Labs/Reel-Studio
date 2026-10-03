# Formats and safe zones

| Key | Canvas | Use | Safe zone (keep key content inside) | `hyperframes init` preset |
|---|---|---|---|---|
| `feed_4x5` (default) | 1080x1350 | Instagram feed + grid | top 110, bottom 110, sides 60 | `square`, then patched to 1350 tall by `reel scaffold` |
| `reel_9x16` | 1080x1920 | Reels / Stories (UI covers the top and bottom) | top 250, bottom 340, sides 60 | `portrait` |
| `square_1x1` | 1080x1080 | square posts | 80 / 80 / 60 | `square` |

`reel scaffold` sets the canvas in `index.html` (`data-width/height`, viewport meta, html/body CSS) and writes the matching `--safe-*` variables into `assets/brand/tokens.css`. A canvas that differs from the brief is a lint **error**.
Layouts are easiest to author at 1080 px wide; for 9:16 scale vertical positions rather than redesigning.
