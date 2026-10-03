import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ROOT, exists, hf, copyDir, getPath, readYaml } from "./util.mjs";
import { FORMATS } from "./formats.mjs";
import { Brand, buildTokens, fontFiles } from "./brand.mjs";
import { loadBrief } from "./intake.mjs";
import { workflowFor, writeBriefFiles } from "./brief.mjs";

const PROJECT_NOTE = (rel) => `

---

## reel-studio layer (added by \`reel scaffold\`)

This HyperFrames project is managed by **reel-studio**. The user's intake is **complete**: read \`BRIEF.md\` and **ask no brief questions**
(that is HyperFrames' own no-repeat rule). Order of truth: \`PROPOSAL.md\` (approved beat sheet) -> \`BRIEF.md\` -> \`frame.md\` -> \`compositions/\`.

- House rules (engagement playbook, safe zones, asset policy, audio): repo root \`CLAUDE.md\` and \`playbook/\` (from here: \`${rel}\`).
- Brand tokens: link \`assets/brand/tokens.css\` and use its CSS variables. Fonts ship in \`assets/brand/fonts/\`.
- GSAP: use \`assets/vendor/gsap.min.js\` (local, deterministic). Do not use a CDN.
- Before rendering run \`node ${path.join(rel, "tools/reel.mjs")} check .\`; render with \`... render .\` (it enforces the brief + approval gate).
- Never fabricate photos, people, screenshots, client logos or statistics.
`;

function patchCanvas(html, w, h) {
  return html
    .replace(/width=\d+,\s*height=\d+/g, `width=${w}, height=${h}`)
    .replace(/data-width="\d+"/g, `data-width="${w}"`)
    .replace(/data-height="\d+"/g, `data-height="${h}"`)
    .replace(/(html,\s*body\s*\{[^}]*?)width:\s*\d+px;/s, `$1width: ${w}px;`)
    .replace(/(html,\s*body\s*\{[^}]*?)height:\s*\d+px;/s, `$1height: ${h}px;`);
}

export function syncBrandAssets(projectDir, brand, formatKey) {
  const dst = path.join(projectDir, "assets", "brand");
  fs.mkdirSync(path.join(dst, "fonts"), { recursive: true });
  for (const f of fontFiles(brand)) fs.copyFileSync(f, path.join(dst, "fonts", path.basename(f)));
  fs.writeFileSync(path.join(dst, "tokens.css"), buildTokens(brand, formatKey));
  const logo = brand.resolve(brand.get("logo"));
  if (logo) fs.copyFileSync(logo, path.join(dst, `logo${path.extname(logo)}`));
}

function vendorGsap(projectDir) {
  const src = path.join(ROOT, "node_modules", "gsap", "dist", "gsap.min.js");
  if (!exists(src)) throw new Error("gsap not installed. Run: npm install");
  fs.mkdirSync(path.join(projectDir, "assets", "vendor"), { recursive: true });
  fs.copyFileSync(src, path.join(projectDir, "assets", "vendor", "gsap.min.js"));
}

export function scaffold(projectDir, { force = false } = {}) {
  const brief = loadBrief(projectDir);
  const fk = getPath(brief, "format.preset");
  if (!brief.brand || !fk || brief.duration === undefined) throw new Error("Intake must at least have brand, format.preset and duration before scaffolding.");
  const brand = new Brand(brief.brand), F = FORMATS[fk];
  const log = [];

  const alreadyInit = exists(path.join(projectDir, "hyperframes.json"));
  if (!alreadyInit) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reel-init-"));
    const args = ["init", "p", "--non-interactive", "--resolution", F.initPreset, "--skill", workflowFor(brief)];
    let r = hf(args, { cwd: tmp });
    if (r.code !== 0 && /skill/i.test(r.out + r.err)) r = hf(args.slice(0, -2), { cwd: tmp }); // older CLIs without --skill
    if (r.code !== 0) throw new Error(`hyperframes init failed:\n${r.out}${r.err}`);
    const made = path.join(tmp, "p");
    fs.mkdirSync(projectDir, { recursive: true });
    copyDir(made, projectDir, { overwrite: false });
    fs.rmSync(tmp, { recursive: true, force: true });
    log.push(`initialised HyperFrames project (${F.initPreset} preset)`);
  } else log.push("HyperFrames project already initialised, kept");

  const idx = path.join(projectDir, "index.html");
  if (exists(idx)) {
    let html = fs.readFileSync(idx, "utf8");
    html = patchCanvas(html, F.w, F.h).replace(/data-duration="10"/g, `data-duration="${brief.duration}"`);
    html = html.replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/gsap@[^"']+\/dist\/gsap(\.min)?\.js/g, "assets/vendor/gsap.min.js");
    if (!html.includes("assets/brand/tokens.css")) html = html.replace("</head>", `    <link rel="stylesheet" href="assets/brand/tokens.css" />\n  </head>`);
    fs.writeFileSync(idx, html);
    log.push(`canvas set to ${F.w}x${F.h}; GSAP vendored locally; brand tokens linked`);
  }
  vendorGsap(projectDir);
  syncBrandAssets(projectDir, brand, fk);
  for (const d of ["renders", "audio"]) fs.mkdirSync(path.join(projectDir, d), { recursive: true });
  writeBriefFiles(projectDir);
  log.push("wrote BRIEF.md and frame.md from brief.yaml + brand");

  for (const f of ["CLAUDE.md", "AGENTS.md"]) {
    const p = path.join(projectDir, f);
    if (exists(p) && !fs.readFileSync(p, "utf8").includes("reel-studio layer")) fs.appendFileSync(p, PROJECT_NOTE(path.relative(projectDir, ROOT)));
  }
  return log;
}

/** Re-generate BRIEF.md, frame.md, tokens.css and brand assets after a brief or brand change. */
export function sync(projectDir) {
  const { brief, brand } = writeBriefFiles(projectDir);
  syncBrandAssets(projectDir, brand, getPath(brief, "format.preset", "feed_4x5"));
  return "synced BRIEF.md, frame.md and assets/brand/";
}
