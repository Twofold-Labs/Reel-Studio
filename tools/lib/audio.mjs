import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { spawnSync } from "node:child_process";
import { ROOT, exists, hf, getPath } from "./util.mjs";
import { Brand } from "./brand.mjs";
import { loadBrief } from "./intake.mjs";

/** Find a Python that has numpy: python3 (mac/linux), python or `py -3` (Windows). Returns [cmd, ...prefixArgs] or null. */
export function findPython() {
  for (const c of [["python3"], ["python"], ["py", "-3"]]) {
    const r = spawnSync(c[0], [...c.slice(1), "-c", "import numpy"], { encoding: "utf8" });
    if (r.status === 0) return c;
  }
  return null;
}

export function probeDuration(file) {
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" });
  const d = parseFloat(r.stdout); return Number.isFinite(d) ? d : null;
}

/** Normalise any transcript shape HyperFrames/whisper/Parakeet may give us to [{text, start, end}] in seconds,
 *  dropping music-note / punctuation-only tokens (the documented cleaning step before captions). */
export function normalizeWords(raw) {
  let arr = Array.isArray(raw) ? raw : (raw?.words ?? raw?.segments ?? raw?.transcription ?? []);
  if (!Array.isArray(arr)) arr = [];
  const out = [];
  for (const w of arr) {
    const text = String(w.text ?? w.word ?? "").trim();
    if (!/[\p{L}\p{N}]/u.test(text)) continue;
    let start = w.start ?? w.from ?? w.offsets?.from, end = w.end ?? w.to ?? w.offsets?.to;
    if (start == null || end == null) continue;
    if (w.offsets) { start /= 1000; end /= 1000; } // whisper.cpp raw offsets are milliseconds
    out.push({ text, start: +Number(start).toFixed(3), end: +Number(end).toFixed(3) });
  }
  return out;
}

/** `hyperframes transcribe -d <dir>` writes <dir>/transcript.json. Read it, then remove it so the next line starts clean. */
export function readTranscript(projectDir, { remove = true } = {}) {
  const f = path.join(projectDir, "transcript.json");
  if (!exists(f)) return null;
  try { return normalizeWords(JSON.parse(fs.readFileSync(f, "utf8"))); }
  catch { return null; }
  finally { if (remove) try { fs.rmSync(f); } catch { /* ignore */ } }
}

/** Kokoro voiceover via `hyperframes tts`, then word timestamps via `hyperframes transcribe` (Parakeet or whisper-cpp).
 *  Writes audio/vo_N.wav, audio/vo_N.words.json and audio/vo.json. Words are relative to each clip's start. */
export function voice(projectDir) {
  const brief = loadBrief(projectDir), brand = new Brand(brief.brand);
  const f = path.join(projectDir, "audio", "vo.yaml");
  if (!exists(f)) throw new Error("audio/vo.yaml missing. Format:\n  start: 0.8\n  gap: 0.35\n  lines:\n    - text: \"First line\"");
  const spec = YAML.parse(fs.readFileSync(f, "utf8")) ?? {};
  const voiceId = spec.voice ?? getPath(brief, "audio.voice") ?? brand.get("voice", "kokoro", "voice") ?? "af_heart";
  const speed = spec.speed ?? brand.get("voice", "kokoro", "speed") ?? 1;
  const english = /^[ab][fm]_/.test(voiceId);
  let cursor = spec.start ?? 0.8, transcriptionNote = null; const out = [];
  (spec.lines ?? []).forEach((ln, i) => {
    const text = brand.fmt(ln.text), file = path.join("audio", `vo_${i + 1}.wav`);
    const r = hf(["tts", text, "-o", file, "-v", voiceId, "-s", String(speed)], { cwd: projectDir });
    if (r.code !== 0) throw new Error(`hyperframes tts failed for line ${i + 1}:\n${r.out}${r.err}\nInstall the local voice model: pip install kokoro-onnx soundfile`);
    const dur = probeDuration(path.join(projectDir, file));
    const entry = { n: i + 1, text, file, start: +cursor.toFixed(2), duration: dur ? +dur.toFixed(2) : null, end: dur ? +(cursor + dur).toFixed(2) : null, words: [] };

    readTranscript(projectDir); // clear any stale transcript.json
    const t = hf(["transcribe", file, "-d", projectDir, ...(english ? ["-l", "en"] : [])], { cwd: projectDir });
    if (t.code === 0) {
      entry.words = readTranscript(projectDir) ?? [];
      if (!entry.words.length) transcriptionNote ??= "transcribe ran but returned no words";
    } else {
      transcriptionNote ??= (t.err || t.out).split("\n").map((x) => x.trim()).filter(Boolean).slice(-2).join(" | ").slice(0, 220) || `exit ${t.code}`;
    }
    fs.writeFileSync(path.join(projectDir, "audio", `vo_${i + 1}.words.json`), JSON.stringify(entry.words, null, 2));
    out.push(entry);
    cursor += (dur ?? 2) + (spec.gap ?? 0.35);
  });
  const withWords = out.filter((l) => l.words.length).length;
  fs.writeFileSync(path.join(projectDir, "audio", "vo.json"),
    JSON.stringify({ voice: voiceId, speed, words_available: withWords === out.length && out.length > 0, lines: out }, null, 2));
  if (withWords < out.length) {
    console.warn(`\nWARNING: no word timestamps for ${out.length - withWords} of ${out.length} line(s): ${transcriptionNote}\n` +
      `Captions will have to be timed evenly by character count. To enable real timing, install a transcription engine:\n` +
      `  npx hyperframes models install parakeet     (recommended on Windows, ~640 MB, no compiler)\n`);
  }
  return out;
}

/** Offline synth bed (Python + numpy). cues from audio/cues.json. */
export function synth(projectDir) {
  const brief = loadBrief(projectDir), brand = new Brand(brief.brand);
  const cues = path.join(projectDir, "audio", "cues.json");
  const dur = Number(brief.duration), energy = getPath(brief, "style.energy", "medium");
  const args = [path.join(ROOT, "tools", "synth", "make_audio.py"), "--out", path.join(projectDir, "audio", "bed.wav"),
    "--duration", String(dur), "--bpm", String(brand.get("music", "bpm") ?? 90), "--energy", energy];
  if (exists(cues) && getPath(brief, "audio.sfx") === "yes") args.push("--cues", cues);
  if (getPath(brief, "audio.music") === "none") args.push("--no-music");
  const py = findPython();
  if (!py) throw new Error("synth needs Python 3 with numpy (python -m pip install numpy). Not found: python3 / python / py -3.");
  const r = spawnSync(py[0], [...py.slice(1), ...args], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`synth failed:\n${r.stdout}${r.stderr}`);
  return `${r.stdout.trim()}\n\nAdd to index.html inside #root:\n  <audio src="audio/bed.wav" data-start="0" data-duration="${dur}" data-track-index="90" data-volume="0.9"></audio>`;
}

export function doctor() {
  const rows = [];
  const maj = Number(process.versions.node.split(".")[0]);
  rows.push([maj >= 22, `Node ${process.versions.node}`, "HyperFrames needs Node 22+"]);
  for (const b of ["ffmpeg", "ffprobe"]) rows.push([spawnSync(b, ["-version"]).status === 0, b, `install ${b}`]);
  rows.push([!!findPython(), "Python 3 + numpy (optional: offline synth)", "only needed for `reel synth`"]);
  const d = hf(["doctor"]);
  for (const l of d.out.split("\n")) {
    const m = l.match(/^\s*([✓✗])\s+(Chrome|TTS \(Kokoro\)|BGM \(MusicGen\)|whisper-cpp|Docker)(?=\s)\s*(.*)$/);
    if (m) rows.push([m[1] === "✓", `${m[2]} ${m[3]}`.trim(), m[2] === "Chrome" ? "run: node tools/reel.mjs setup" : m[2] === "whisper-cpp" ? "optional: transcription also works via Parakeet: npx hyperframes models install parakeet" : "optional"]);
  }
  return rows;
}
