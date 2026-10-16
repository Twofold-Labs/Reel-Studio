import fs from "node:fs";
import path from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";
import { exists, hf, getPath } from "./util.mjs";
import { FORMATS } from "./formats.mjs";
import { Brand, ENERGY } from "./brand.mjs";
import { loadBrief, gate } from "./intake.mjs";

const VISIBLE = ["opacity", "autoAlpha", "x", "y", "scale", "scaleX", "scaleY", "rotation", "width", "height", "visibility", "xPercent", "yPercent"];
const APPEARS = ["opacity", "autoAlpha", "visibility"]; // only these make text (dis)appear; camera scale/x/y do not

async function loadDom(projectDir) {
  const vc = new VirtualConsole();
  const dom = await JSDOM.fromFile(path.join(projectDir, "index.html"), {
    runScripts: "dangerously", resources: "usable", pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.__timelines = w.__timelines ?? {}; w.__hyperframes = { getVariables: () => ({}) };
      // jsdom has no SVG geometry; line-draw compositions call these while building the timeline.
      // Timing is all this lint reads, so a stub is enough.
      const proto = (w.SVGElement ?? w.Element).prototype;
      proto.getTotalLength ??= () => 100;
      proto.getPointAtLength ??= () => ({ x: 0, y: 0 });
    },
  });
  await new Promise((res) => {
    const d = dom.window.document;
    if (d.readyState === "complete") return res();
    dom.window.addEventListener("load", res); setTimeout(res, 5000);
  });
  return dom;
}

/** Execute the composition's scripts and read the real GSAP timeline: when things move, what text shows when. */
export async function analyze(projectDir) {
  const dom = await loadDom(projectDir), w = dom.window, doc = w.document;
  const root = doc.querySelector("[data-composition-id]");
  const tls = Object.values(w.__timelines ?? {});
  if (!tls.length) return { error: "no GSAP timeline registered on window.__timelines (composition scripts did not run or failed to load)" };
  const tweens = [];
  for (const tl of tls) for (const tw of tl.getChildren(true, true, false)) {
    const vars = tw.vars ?? {};
    const keys = Object.keys(vars);
    tweens.push({
      t0: typeof tw.globalTime === "function" ? tw.globalTime(0) : tw.startTime(), dur: tw.duration(),
      targets: (tw.targets?.() ?? []).filter((t) => t && t.nodeType === 1), vars, from: !!vars.runBackwards,
      visible: keys.some((k) => VISIBLE.includes(k)),
      appears: keys.some((k) => APPEARS.includes(k)),
    });
  }
  const rootDur = Number(root?.getAttribute("data-duration")) || 0;
  const duration = Math.max(...tls.map((t) => t.duration()), rootDur, 0);
  const covers = (tw, el) => tw.targets.some((t) => t === el || t.contains(el));
  const texts = [];
  for (const el of doc.body.querySelectorAll("*")) {
    if (["SCRIPT", "STYLE"].includes(el.tagName)) continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
    if (!own) continue;
    const mine = tweens.filter((tw) => tw.appears && covers(tw, el));
    const clip = el.closest("[data-start]");
    const cs = clip ? Number(clip.getAttribute("data-start")) : 0;
    const cd = clip && clip.getAttribute("data-duration") ? Number(clip.getAttribute("data-duration")) : duration;
    const appear = mine.length ? Math.min(...mine.map((m) => m.t0)) : cs;
    const gone = mine.filter((m) => !m.from && m.t0 > appear && (m.vars.opacity === 0 || m.vars.autoAlpha === 0 || m.vars.visibility === "hidden"));
    const end = gone.length ? Math.min(...gone.map((m) => m.t0)) : cs + cd;
    let size = NaN;
    for (let n = el; n && n !== doc.documentElement && Number.isNaN(size); n = n.parentElement) {
      const v = parseFloat(w.getComputedStyle(n).fontSize); if (!Number.isNaN(v)) size = v;
    }
    texts.push({ text: own, appear, end, size, cls: `${el.id} ${el.className}`.toLowerCase() });
  }
  const html = fs.readFileSync(path.join(projectDir, "index.html"), "utf8");
  return {
    duration, texts, root: { w: Number(root?.getAttribute("data-width")), h: Number(root?.getAttribute("data-height")) },
    eventTimes: [...new Set([...tweens.filter((t) => t.visible).map((t) => Math.round(t.t0 * 10) / 10), ...texts.map((t) => Math.round(t.appear * 10) / 10)])].sort((a, b) => a - b),
    firstMove: Math.min(...tweens.filter((t) => t.visible).map((t) => t.t0), Infinity), html,
    audioTags: (html.match(/<audio\b/g) ?? []).length,
  };
}

export async function check(projectDir, { requireApproval = true } = {}) {
  const items = []; const add = (level, msg) => items.push({ level, msg });
  for (const p of gate(projectDir, { requireApproval })) add("BLOCK", p);
  const brief = loadBrief(projectDir);
  if (!exists(path.join(projectDir, "index.html"))) { add("ERROR", "No index.html: run `reel scaffold` first."); return items; }

  // 1) HyperFrames' own structural lint
  const l = hf(["lint", "--json"], { cwd: projectDir });
  try {
    const j = JSON.parse(l.out.slice(l.out.indexOf("{")));
    for (const f of j.findings ?? []) {
      const sev = String(f.severity ?? f.level ?? "warning").toLowerCase();
      add(sev.startsWith("err") ? "ERROR" : sev.startsWith("info") ? "info" : "warn", `[hyperframes lint] ${f.message ?? f.code ?? JSON.stringify(f)}`);
    }
  } catch { add("warn", `could not parse \`hyperframes lint\` output: ${(l.out + l.err).slice(0, 160)}`); }

  // 2) Our engagement + brief-consistency lint (real timeline via jsdom)
  let A;
  try { A = await analyze(projectDir); } catch (e) { A = { error: e.message }; }
  if (A.error) { add("warn", `Engagement checks skipped: ${A.error}`); return items; }

  const fk = getPath(brief, "format.preset", "feed_4x5"), F = FORMATS[fk];
  const energy = getPath(brief, "style.energy", "medium"), E = ENERGY[energy];
  const brand = brief.brand ? new Brand(brief.brand) : null;
  const dur = A.duration;
  // content_mode: long -> keep canvas, hook, legibility, brand and determinism checks; short-form pacing numbers are not
  // pass/fail on long-form (playbook/content-modes.md). Short projects behave exactly as before.
  const LONG = getPath(brief, "content_mode") === "long" || F?.mode === "long";

  if (/TODO/.test(A.html)) add("ERROR", "index.html still contains TODO placeholders.");
  if (A.root.w !== F.w || A.root.h !== F.h) add("ERROR", `Canvas is ${A.root.w}x${A.root.h} but the brief's format ${fk} is ${F.w}x${F.h}.`);
  if (brief.duration && Math.abs(Number(brief.duration) - dur) > 1.5) add("warn", `Brief duration ${brief.duration}s vs timeline ${dur.toFixed(1)}s.`);
  if (dur < 5) add("warn", `Very short (${dur.toFixed(0)}s); under ~5 s rarely lands a message.`);
  if (!LONG && dur > 30) add("warn", `Long (${dur.toFixed(0)}s); over 30 s needs a strong mid-point re-hook.`);
  if (LONG && (dur < 180 || dur > 1200)) add("warn", `Long-form runtime ${(dur / 60).toFixed(1)} min is outside the 3-20 min long-form range.`);

  // hook
  if (A.firstMove > 0.9) add("warn", `Hook: nothing moves until ${A.firstMove === Infinity ? "never" : A.firstMove.toFixed(1) + "s"}; something should move within ~0.5 s.`);
  const firstText = Math.min(...A.texts.map((t) => t.appear), Infinity);
  if (firstText > (LONG ? 5 : 1.3)) add("warn", `Hook: first text appears at ${firstText === Infinity ? "never" : firstText.toFixed(1) + "s"}; put the hook line on screen by ~1 s.`);

  // pacing
  const ctaKey = typeof brief.cta === "string" && brand && brief.cta !== "none" ? brand.fmt(brief.cta).toLowerCase().split(/\s+/)[0] : null;
  const ctaAt = Math.min(...A.texts.filter((t) => t.appear >= dur - 4.5 && ((ctaKey && t.text.toLowerCase().includes(ctaKey)) || (brand?.get("url") && t.text.toLowerCase().includes(String(brand.get("url")).toLowerCase())))).map((t) => t.appear), Infinity);
  const gapMax = (1 / E.minEventsPerS) * 1.4, times = [...new Set([...A.eventTimes, 0, Math.max(dur - 1, 0)])].sort((a, b) => a - b);
  for (let i = 1; i < times.length && !LONG; i++) {
    const a = times[i - 1], b = times[i];
    if (b - a > gapMax && a < dur - 1.5 && a < ctaAt) add("warn", `Dead air ${a.toFixed(1)}s to ${b.toFixed(1)}s (${(b - a).toFixed(1)}s with nothing new). Energy '${energy}' wants a beat every ~${(1 / E.minEventsPerS).toFixed(1)}s.`);
  }
  const rate = A.eventTimes.filter((t) => t < dur - 1).length / Math.max(dur - 1, 1);
  if (!LONG && rate < E.minEventsPerS * 0.7) add("warn", `Low event rate (${rate.toFixed(2)}/s) for energy '${energy}' (target >= ${E.minEventsPerS}/s).`);

  // legibility + density
  const sized = A.texts.filter((t) => !Number.isNaN(t.size));
  const minPx = LONG ? 24 : 26;   // 24 px at 1080p still reads on phones in landscape and on TVs
  for (const t of sized) if (t.size < minPx) add("warn", `Text "${t.text.slice(0, 28)}" is ${t.size}px; minimum is ${minPx}px.`);
  if (!LONG && sized.length && Math.max(...sized.map((t) => t.size)) < 56) add("warn", "No headline reaches 56px; hero/headline text should be big for phones.");
  for (let t = 0; t < dur; t += 0.5) {
    const chars = A.texts.filter((x) => x.appear <= t && t < x.end).reduce((n, x) => n + x.text.length, 0);
    if (chars > (LONG ? 220 : 110)) { add("warn", `Too much text on screen at ${t.toFixed(1)}s (${chars} chars). Cut or stagger.`); break; }
  }

  // CTA
  const cta = typeof brief.cta === "string" && brand ? brand.fmt(brief.cta) : null;
  if (cta && cta !== "none") {
    const key = cta.toLowerCase().split(/\s+/)[0];
    const tail = A.texts.filter((t) => t.appear >= dur - 4.5 && t.end >= dur - 0.3);
    if (!tail.some((t) => t.text.toLowerCase().includes(key) || (brand?.get("url") && t.text.toLowerCase().includes(String(brand.get("url")).toLowerCase()))))
      add("warn", `Brief CTA "${cta}" is not on screen for the last ~3 s.`);
  }

  // audio + captions
  const audioRows = (() => { try { const j = JSON.parse(hf(["timeline", "--json"], { cwd: projectDir }).out); return j.timeline.tracks.filter((t) => t.kind === "audio").flatMap((t) => t.rows); } catch { return []; } })();
  const hasAudio = audioRows.length > 0 || A.audioTags > 0;
  const wantsMusic = getPath(brief, "audio.music", "none") !== "none", wantsVo = getPath(brief, "audio.voiceover") === "kokoro";
  if ((wantsMusic || getPath(brief, "audio.sfx") === "yes" || wantsVo) && !hasAudio) add("warn", "The brief asks for audio but the composition has no <audio> clips yet.");
  if (!wantsMusic && !wantsVo && getPath(brief, "audio.sfx") !== "yes") add("warn", "No audio at all: sound-on viewers get silence.");
  if (getPath(brief, "captions") === "yes" && !A.texts.some((t) => /caption|subtitle/.test(t.cls))) add("warn", "Captions requested but no element with 'caption' in its id/class was found.");
  if (wantsVo && getPath(brief, "captions") !== "yes") add("warn", "Voiceover without captions: most viewers watch muted.");

  // brand + determinism hygiene
  if (!A.html.includes("assets/brand/tokens.css")) add("warn", "Brand tokens not linked (assets/brand/tokens.css): fonts/colors may be off-brand.");
  const fams = [...A.html.matchAll(/font-family:\s*([^;}\n]+)/gi)].map((m) => m[1]);
  const off = fams.filter((f) => !/var\(--font-|BrandHeading|BrandBody|system-ui|inherit/.test(f));
  if (off.length) add("warn", `Off-brand font-family in use: ${[...new Set(off)].slice(0, 3).join(" | ")}`);
  if (/cdn\.jsdelivr|unpkg\.com|cdnjs/.test(A.html)) add("warn", "A CDN script is used. Prefer assets/vendor/gsap.min.js (offline, deterministic).");
  if (/Math\.random|Date\.now|setTimeout|setInterval|onUpdate|repeat:\s*-1/.test(A.html)) add("warn", "Non-seek-safe code found (random/timers/onUpdate/infinite repeat): renders may differ from the preview.");
  return items;
}

export function report(items) {
  const rank = { BLOCK: 0, ERROR: 1, warn: 2, info: 3 };
  for (const i of [...items].sort((a, b) => rank[a.level] - rank[b.level])) console.log(`  [${i.level}] ${i.msg}`);
  if (!items.length) console.log("  clean ✓");
  return { blocking: items.filter((i) => i.level === "BLOCK" || i.level === "ERROR") };
}
