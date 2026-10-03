#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { ROOT, exists, rel, resolveProject, hf, red, yellow, green, dim, copyDir, getPath, readYaml } from "./lib/util.mjs";
import { FORMATS } from "./lib/formats.mjs";
import { Brand, listBrands, genAsset, fetchAssets, STYLE_PRESETS, ENERGY } from "./lib/brand.mjs";
import * as intake from "./lib/intake.mjs";
import { scaffold, sync } from "./lib/scaffold.mjs";
import { check, report } from "./lib/check.mjs";
import * as audio from "./lib/audio.mjs";

const [cmd, ...rest] = process.argv.slice(2);
const flags = Object.fromEntries(rest.filter((a) => a.startsWith("--")).map((a) => { const [k, v] = a.slice(2).split("="); return [k, v ?? true]; }));
const pos = rest.filter((a) => !a.startsWith("--"));
const die = (m) => { console.error(red(`error: ${m}`)); process.exit(1); };

const HELP = `reel: brand-driven reels on top of HyperFrames

 session   new <brand> <name> [--recipe=R]     create projects/<brand>/<name>/brief.yaml
           intake <project> [--use-defaults]   print unanswered intake questions (JSON)
           answer <project> key=value ...      record answers (approved=true after the user OKs PROPOSAL.md)
           scaffold <project>                  create the HyperFrames project (canvas, tokens, BRIEF.md, frame.md)
           sync <project>                      regenerate BRIEF.md, frame.md, brand assets after a change
           status <project>                    where is this project?
 build     check <project> [--no-approval]     gate + hyperframes lint + engagement lint
           render <project> [--draft] [--force] [--fps=30] [--quality=looks|delivery|draft]
           validate <project>                  run in headless Chrome to catch runtime errors (needs Chrome)
           studio <project>                    OPTIONAL live Studio preview (long-lived server; Ctrl+C to stop)
 audio     voice <project>                     Kokoro TTS + word timestamps from audio/vo.yaml
           synth <project>                     offline music/SFX bed from audio/cues.json (python3 + numpy)
 brands    new-brand <slug>   gen-asset <slug> wordmark|monogram   fetch-assets <slug>
 system    list   doctor   setup`;

async function main() {
  switch (cmd) {
    case undefined: case "help": case "--help": console.log(HELP); return;

    case "list": {
      console.log("brands:   ", listBrands().join(", "));
      for (const b of listBrands()) { const d = path.join(ROOT, "projects", b); if (exists(d)) { const ps = fs.readdirSync(d, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name); if (ps.length) console.log(`projects/${b}:`, ps.join(", ")); } }
      console.log("recipes:  ", fs.readdirSync(path.join(ROOT, "playbook/recipes")).map((f) => f.replace(".md", "")).join(", "));
      console.log("formats:  ", Object.entries(FORMATS).map(([k, v]) => `${k} (${v.w}x${v.h})`).join(", "));
      console.log("styles:   ", Object.entries(STYLE_PRESETS).map(([k, v]) => `${k} (${v.note})`).join(", "));
      console.log("energy:   ", Object.entries(ENERGY).map(([k, v]) => `${k} (${v.note})`).join("; "));
      return;
    }

    case "new-brand": {
      const slug = pos[0]; if (!slug) die("usage: new-brand <slug>");
      const dst = path.join(ROOT, "brands", slug); if (exists(dst)) die("brand already exists");
      copyDir(path.join(ROOT, "brands", "_template"), dst); fs.mkdirSync(path.join(dst, "assets"), { recursive: true });
      const f = path.join(dst, "brand.yaml"); fs.writeFileSync(f, fs.readFileSync(f, "utf8").replace("slug: brand-slug", `slug: ${slug}`));
      console.log(`created ${rel(dst)}/brand.yaml -> fill it from the brand's own site (CLAUDE.md §1)`); return;
    }

    case "new": {
      const [brand, name] = pos; if (!brand || !name) die("usage: new <brand> <name> [--recipe=R]");
      new Brand(brand);
      const dir = path.join(ROOT, "projects", brand, name); if (exists(path.join(dir, "brief.yaml"))) die("project already exists");
      const b = { brand }; if (flags.recipe) { if (!exists(path.join(ROOT, "playbook/recipes", `${flags.recipe}.md`))) die(`no recipe '${flags.recipe}'`); b.recipe = flags.recipe; }
      intake.saveBrief(dir, b);
      console.log(`created ${rel(dir)}/brief.yaml\nnext: node tools/reel.mjs intake ${rel(dir)}`); return;
    }

    case "intake": { const dir = resolveProject(pos[0]); intake.intake(dir, { useDefaults: !!flags["use-defaults"] }); return; }
    case "answer": { const dir = resolveProject(pos[0]); intake.answer(dir, pos.slice(1)); return; }

    case "scaffold": {
      const dir = resolveProject(pos[0]);
      for (const l of scaffold(dir, { force: !!flags.force })) console.log("  " + l);
      console.log(green("scaffolded.") + ` Next: hand over to /hyperframes (it finds BRIEF.md and builds without asking brief questions).`); return;
    }
    case "sync": { console.log(sync(resolveProject(pos[0]))); return; }

    case "status": {
      const dir = resolveProject(pos[0]), brief = intake.loadBrief(dir);
      const todo = intake.pending(structuredClone(brief));
      console.log(`project:    ${rel(dir)}\nbrand:      ${brief.brand ?? "-"}\nintake:     ${todo.length ? "incomplete: " + todo.map((q) => q.id).join(", ") : "complete"}`);
      console.log(`PROPOSAL:   ${exists(path.join(dir, "PROPOSAL.md")) ? "written" : "missing"}   approved: ${brief.approved ? "yes" : "no"}`);
      console.log(`scaffolded: ${exists(path.join(dir, "hyperframes.json")) ? "yes" : "no"}   composition: ${exists(path.join(dir, "index.html")) ? "index.html" : "-"}`);
      const rd = path.join(dir, "renders"); console.log(`renders:    ${exists(rd) ? fs.readdirSync(rd).filter((f) => !f.startsWith(".")).join(", ") || "-" : "-"}`); return;
    }

    case "check": {
      const dir = resolveProject(pos[0]); console.log(`check ${rel(dir)}:`);
      const { blocking } = report(await check(dir, { requireApproval: !flags["no-approval"] }));
      process.exit(blocking.length ? 1 : 0);
    }

    case "render": {
      const dir = resolveProject(pos[0]); const brief = intake.loadBrief(dir);
      if (!flags.force) {
        console.log("checks:");
        const { blocking } = report(await check(dir));
        if (blocking.length) die("Not rendering: fix the above (or pass --force).");
      }
      fs.mkdirSync(path.join(dir, "renders"), { recursive: true });
      const name = path.basename(dir) + (flags.draft ? ".draft" : "");
      const out = path.join("renders", `${name}.mp4`);
      const q = flags.quality ?? (flags.draft ? "draft" : "looks");
      console.log(`rendering ${rel(dir)} -> ${out} (quality ${q}, ${flags.fps ?? 30} fps)`);
      const r = hf(["render", "-o", out, "-f", String(flags.fps ?? 30), "-q", q, ...(flags.docker ? ["--docker"] : [])], { cwd: dir, capture: false });
      if (r.code !== 0) die("hyperframes render failed. Run `node tools/reel.mjs doctor` (Chrome Headless Shell is required: `node tools/reel.mjs setup`).");
      console.log(green(`done -> ${path.join(rel(dir), out)}`)); return;
    }

    case "validate": { const r = hf(["validate"], { cwd: resolveProject(pos[0]), capture: false }); process.exit(r.code); }
    case "studio": {
      console.log(yellow("Starting the Studio preview (long-lived server + Chrome workers). Ctrl+C when finished; it is NOT needed to render."));
      const r = hf(["preview"], { cwd: resolveProject(pos[0]), capture: false }); process.exit(r.code);
    }

    case "voice": {
      const out = audio.voice(resolveProject(pos[0]));
      for (const l of out) console.log(`  ${l.n}. ${l.start}s -> ${l.end ?? "?"}s  (${l.duration ?? "?"}s)  "${l.text.slice(0, 60)}"  words: ${Array.isArray(l.words) ? l.words.length : 0}`);
      console.log("wrote audio/vo.json. Set scene times to these, add <audio> tags, and build captions from the word timestamps."); return;
    }
    case "synth": { console.log(audio.synth(resolveProject(pos[0]))); return; }

    case "gen-asset": {
      const [slug, kind] = pos; if (!slug || !kind) die("usage: gen-asset <slug> wordmark|monogram");
      console.log("generated placeholder ->", rel(genAsset(new Brand(slug), kind))); return;
    }
    case "fetch-assets": { for (const l of await fetchAssets(new Brand(pos[0]))) console.log(l); return; }

    case "doctor": {
      let bad = 0;
      for (const [ok, label, hint] of audio.doctor()) { console.log(` ${ok ? green("✓") : red("✗")} ${label}${ok ? "" : dim("  (" + hint + ")")}`); if (!ok && !/optional|only needed/.test(hint)) bad++; }
      process.exit(bad ? 1 : 0);
    }
    case "setup": {
      console.log("1/2 Chrome Headless Shell (needed to render)…"); hf(["browser", "ensure"], { capture: false });
      console.log("2/2 HyperFrames agent skills (core set)…"); hf(["skills", "update"], { capture: false });
      console.log("done. Run: node tools/reel.mjs doctor"); return;
    }
    default: die(`unknown command '${cmd}'. Try: node tools/reel.mjs help`);
  }
}
main().catch((e) => die(e.message));
