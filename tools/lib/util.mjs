import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import YAML from "yaml";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const HF_VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).dependencies.hyperframes;

export const readYaml = (f) => YAML.parse(fs.readFileSync(f, "utf8")) ?? {};
export const exists = (f) => fs.existsSync(f);
export const rel = (p) => path.relative(ROOT, p) || ".";

export function resolveProject(arg) {
  const p = path.isAbsolute(arg) ? arg : path.resolve(process.cwd(), arg);
  if (exists(p)) return p;
  const q = path.resolve(ROOT, arg);
  if (exists(q)) return q;
  return p; // may be created later
}

export function getPath(obj, dotted, dflt) {
  let cur = obj;
  for (const k of dotted.split(".")) {
    if (cur == null || typeof cur !== "object" || !(k in cur)) return dflt;
    cur = cur[k];
  }
  return cur;
}
export function setPath(obj, dotted, value) {
  const keys = dotted.split(".");
  let cur = obj;
  for (const k of keys.slice(0, -1)) {
    if (typeof cur[k] !== "object" || cur[k] == null) cur[k] = {};
    cur = cur[k];
  }
  cur[keys.at(-1)] = value;
}

export const strip = (s) => String(s).replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "");

/** Run the pinned HyperFrames CLI by launching its .mjs entry with Node itself (no shell, no .cmd shims: works on Windows, macOS, Linux). */
export function hf(args, { cwd = ROOT, capture = true, env = {} } = {}) {
  const binJs = path.join(ROOT, "node_modules", "hyperframes", "bin", "hyperframes.mjs");
  if (!exists(binJs)) throw new Error("HyperFrames is not installed. Run `npm install` in the repo root first.");
  const r = spawnSync(process.execPath, [binJs, ...args], {
    cwd, encoding: "utf8", env: { ...process.env, HYPERFRAMES_SKIP_SKILLS: "1", CI: "1", ...env },
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit", maxBuffer: 64 * 1024 * 1024,
  });
  return { code: r.status ?? 1, out: strip(r.stdout ?? ""), err: strip(r.stderr ?? "") };
}

export function color(code, s) { return process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s; }
export const red = (s) => color(31, s), yellow = (s) => color(33, s), green = (s) => color(32, s), dim = (s) => color(2, s);

export function copyDir(src, dst, { overwrite = false } = {}) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d, { overwrite });
    else if (overwrite || !exists(d)) fs.copyFileSync(s, d);
  }
}
