import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { ROOT, readYaml, exists, getPath, setPath } from "./util.mjs";
import { Brand, listBrands } from "./brand.mjs";

export const questions = () => readYaml(path.join(ROOT, "questions.yaml")).questions;
const briefFile = (dir) => path.join(dir, "brief.yaml");
export const loadBrief = (dir) => (exists(briefFile(dir)) ? readYaml(briefFile(dir)) : {});
export function saveBrief(dir, brief) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(briefFile(dir),
    "# OUR brief: the user's intake answers + approval. Edit via: node tools/reel.mjs answer <project> key=value ...\n" +
    "# BRIEF.md (for HyperFrames) is generated from this file by `reel sync`.\n" + YAML.stringify(brief));
}

function brandOf(brief) {
  const slug = getPath(brief, "brand");
  try { return slug && exists(path.join(ROOT, "brands", slug, "brand.yaml")) ? new Brand(slug) : null; } catch { return null; }
}

function applies(q, brief, brand) {
  for (const [key, want] of Object.entries(q.when ?? {})) {
    const have = key === "_brand_has_logo" ? !!brand?.hasLogo() : getPath(brief, key);
    const wants = Array.isArray(want) ? want : [want];
    if (!wants.includes(have)) return false;
  }
  return true;
}

export function defaultFor(q, brand) {
  if (brand) {
    const d = brand.get("defaults") ?? {};
    const v = d[q.id] ?? getPath(d, q.id);
    if (v !== undefined && v !== null) return v;
  }
  return (q.options ?? []).find((o) => o.recommended)?.value ?? null;
}

/** Questions still to ask. With useDefaults, non-core ones are filled from brand defaults / recommended options. */
export function pending(brief, { useDefaults = false } = {}) {
  const brand = brandOf(brief), out = [];
  for (const q of questions()) {
    if (!applies(q, brief, brand)) continue;
    if (getPath(brief, q.id) !== undefined) continue;
    if (q.optional) continue;
    if (useDefaults && !q.core) {
      const d = defaultFor(q, brand);
      if (d !== null && d !== undefined) { setPath(brief, q.id, d); setPath(brief, "_decided_by." + q.id.replaceAll(".", "_"), "defaults"); continue; }
    }
    out.push(q);
  }
  return out;
}

export function describe(q, brief) {
  const brand = brandOf(brief);
  const d = { id: q.id, question: q.q, free_text_allowed: !!q.free, brand_default: defaultFor(q, brand), options: q.options ?? [] };
  if (q.options_from === "brands") d.options = [...listBrands().map((s) => ({ value: s, label: s })), { value: "NEW", label: "New brand (send its website)" }];
  return d;
}

export function intake(dir, { useDefaults = false } = {}) {
  const brief = loadBrief(dir);
  const todo = pending(brief, { useDefaults });
  saveBrief(dir, brief);
  const answered = Object.fromEntries(Object.entries(brief).filter(([k]) => !k.startsWith("_")));
  console.log(JSON.stringify({ project: dir, answered, pending: todo.map((q) => describe(q, brief)), approved: !!brief.approved }, null, 2));
  return todo;
}

export function answer(dir, pairs) {
  const brief = loadBrief(dir), qmap = Object.fromEntries(questions().map((q) => [q.id, q]));
  for (const pair of pairs) {
    const i = pair.indexOf("=");
    if (i < 0) throw new Error(`expected key=value, got '${pair}'`);
    const k = pair.slice(0, i), raw = pair.slice(i + 1);
    let val = YAML.parse(raw);
    if (val !== null && typeof val === "object") val = raw; // '{url}' or 'Pain: x' must stay a plain string
    const q = qmap[k];
    if (q?.options && !q.free && !q.options.some((o) => o.value === val))
      console.log(`warning: '${val}' is not one of the options for ${k}: ${q.options.map((o) => o.value).join(", ")}`);
    setPath(brief, k, val);
    if (!["approved"].includes(k) && !k.startsWith("_")) setPath(brief, "_decided_by." + k.replaceAll(".", "_"), "user");
  }
  saveBrief(dir, brief);
  const todo = pending(brief);
  console.log(`saved. still pending: ${todo.length ? todo.map((q) => q.id).join(", ") : "nothing, brief complete"}`);
}

/** Blocking problems before a full render. */
export function gate(dir, { requireApproval = true } = {}) {
  const brief = loadBrief(dir);
  if (!Object.keys(brief).length) return [`No brief.yaml in ${dir}. Run: node tools/reel.mjs intake <project>`];
  const probs = [], todo = pending(structuredClone(brief));
  if (todo.length) probs.push("Brief incomplete, unanswered: " + todo.map((q) => q.id).join(", "));
  if (requireApproval) {
    if (!exists(path.join(dir, "PROPOSAL.md"))) probs.push("No PROPOSAL.md (the beat sheet shown to the user) in the project.");
    if (!brief.approved) probs.push("Proposal not approved by the user yet (node tools/reel.mjs answer <project> approved=true).");
  }
  return probs;
}
