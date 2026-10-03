# Engagement playbook: what "engaging" means here

`reel check` enforces most of this by running the composition's real GSAP timeline. Warnings are advice; fix them or justify them.

1. **Hook in <= 1 s.** Motion immediately, hook text on screen by ~1 s. Never open with a logo. Make it a pain, a question, a surprising claim or a bold promise, <= 4 words per slam.
2. **A new beat every ~1-2 s** (energy: calm ~3 s, medium ~2 s, high ~1 s): text change, element pop, scene cut, camera punch. No dead air (the CTA hold at the end is exempt).
3. **One idea per reel.** Escalate: hook -> tension -> payoff -> CTA. Payoff before the CTA, never after.
4. **Pattern interrupts** at the reveal (wipe / flash / punch / shake + a sound hit). Use 2-4 per reel, not more.
5. **Big type:** headlines >= 56 px (hero slams 140+), secondary >= 26 px, <= ~100 characters on screen at once.
6. **Safe zones** (`.safe` wrapper + `--safe-*` variables in tokens.css): 4:5 top/bottom 110 px, 9:16 top 250 / bottom 340, square 80.
7. **Sound design is half the feel:** a cue on every key visual beat; music with a pulse at medium/high energy.
8. **Muted viewers:** with voiceover always add captions (timed from `hyperframes transcribe`); without voiceover the on-screen text carries the story.
9. **CTA on screen for the last 2-3 s.** Start and end on the plain background (fade in/out) so the reel loops cleanly.
10. **6-15 s is the sweet spot.** Up to 30 s only with voiceover + captions and a re-hook around the middle.

## Seek-safe GSAP patterns (these exact snippets passed `reel check` + `hyperframes lint`)

HyperFrames renders by seeking a **paused** timeline frame by frame: no randomness, timers, `onUpdate`, or infinite repeats. Animate transforms and opacity.

**Slam cut** (hook word, replaces the previous one):
```js
const slam = (id, t, hold) => {
  tl.fromTo(id, { opacity: 0, scale: 1.55 }, { opacity: 1, scale: 1, duration: 0.16, ease: "power4.out" }, t);
  tl.to(id, { opacity: 0, duration: 0.08, ease: "none" }, t + hold - 0.08);
};
```
**Camera path on ONE wrapper** (slow push-in + punches on the beat; a plain wrapper `<div id="cam">`, NOT a `class="clip"`; several `fromTo` on one element trigger a HyperFrames lint warning):
```js
const DUR = 12, drift = (t) => 1 + (0.035 * t) / DUR;          // 3.5% push-in over the piece
const punches = [0.1, 1.3, 2.4, 8.3].map((t) => ({ t, amp: 0.025 }));
let cur = 0;
tl.set("#cam", { scale: 1 }, 0);
punches.forEach(({ t, amp }) => {
  if (t > cur) tl.to("#cam", { scale: drift(t), duration: t - cur, ease: "none" }, cur);
  tl.set("#cam", { scale: drift(t) + amp }, t);                  // jump above the drift line...
  tl.to("#cam", { scale: drift(t + 0.4), duration: 0.4, ease: "power3.out" }, t); // ...settle back
  cur = t + 0.4;
});
tl.to("#cam", { scale: drift(DUR), duration: DUR - cur, ease: "none" }, cur);
```
**Loop-safe fade** (full-bleed overlay in the background colour): `tl.fromTo("#fade",{opacity:1},{opacity:0,duration:0.25},0); tl.to("#fade",{opacity:1,duration:0.45},DUR-0.45);`

**Other rules that bit us:** full-bleed background goes on its own `class="clip"` layer, never `#root`; fonts only via `assets/brand/tokens.css` (they ship as files); never a CDN script (use `assets/vendor/gsap.min.js`); build repeated SVG elements in JS once and animate them with `x/y/scale/opacity`.

For anything fancier (shader transitions, 3D, Lottie, charts, maps) use the HyperFrames catalog and skills (`npx hyperframes add <block>`, `/hyperframes-animation`, `/hyperframes-registry`).
