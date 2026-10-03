import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { exists, getPath } from "./util.mjs";
import { Brand, buildFrame, ENERGY, STYLE_PRESETS } from "./brand.mjs";
import { FORMATS, aspect } from "./formats.mjs";
import { loadBrief } from "./intake.mjs";

/** Pick the HyperFrames workflow that will execute the build. An explicit `workflow` in brief.yaml always wins. */
export function workflowFor(brief) {
  if (brief.workflow) return brief.workflow;
  const dur = Number(brief.duration ?? 10), vo = getPath(brief, "audio.voiceover") === "kokoro";
  if (brief.source?.url && brief.objective === "promote") return "product-launch-video";
  if (vo) return brief.objective === "educate" ? "faceless-explainer" : "general-video";
  return dur <= 10 ? "motion-graphics" : "general-video";
}

const MUSIC_TEXT = {
  media_use: "Resolve background music through `/media-use` (library or generated)",
  synth: "Offline synth bed: generate with `node tools/reel.mjs synth <project>` (needs audio/cues.json)",
  musicgen: "Local MusicGen bed via `/media-use`",
  file: "User-supplied track (see Assets)",
  none: "No music",
};

export function buildBriefMd(brand, brief, projectRel = ".") {
  const fk = getPath(brief, "format.preset", "feed_4x5");
  const vo = getPath(brief, "audio.voiceover") === "kokoro";
  const cta = brand.fmt(brief.cta ?? "{url}");
  const fm = {
    workflow: workflowFor(brief),
    flow: "automation",
    storyboard: getPath(brief, "storyboard") === "yes" ? "yes" : "no",
    message: String(brief.idea ?? ""),
    destination: FORMATS[fk].destination,
    aspect: aspect(fk),
    language: "en",
    ...(brief.audience ? { audience: String(brief.audience) } : {}),
    length: `${brief.duration}s`,
    narration: vo ? "yes" : "no",
    ...(vo ? { voice: getPath(brief, "audio.voice", "am_michael") } : {}),
  };
  const logoRel = brand.hasLogo() ? `assets/brand/logo${path.extname(brand.resolve(brand.get("logo")))}` : null;
  const assets = [
    `assets/brand/tokens.css — brand colors, fonts, safe-zone variables (link it in every composition)`,
    `assets/brand/fonts/ — the brand fonts, shipped as files`,
    ...(logoRel ? [`${logoRel} — the brand logo${brand.get("logo")?.toString().includes("PLACEHOLDER") ? " (placeholder)" : ""}`] : []),
    ...(getPath(brief, "assets.other") === "provided" ? ["assets/ — user-provided material for this piece (see folder)"] : []),
    `frame.md — the design-truth file for this piece`,
  ];
  const sp = getPath(brief, "style.preset", "precise"), en = getPath(brief, "style.energy", "medium");
  const music = getPath(brief, "audio.music", "none");
  const custom = [
    `Style preset **${sp}** (${STYLE_PRESETS[sp].note}); energy **${en}** (${ENERGY[en].note}). Details in frame.md § Motion.`,
    `Music: ${MUSIC_TEXT[music] ?? music}${getPath(brief, "audio.music_mood") ? `. Mood: ${getPath(brief, "audio.music_mood")}` : ""}${brand.get("music", "bpm") ? `. BPM ${brand.get("music", "bpm")}` : ""}.`,
    `Sound effects: ${getPath(brief, "audio.sfx") === "yes" ? "yes, one on every key visual beat" : "no"}.`,
    ...(vo ? [`Voiceover: Kokoro (\`hyperframes tts\`), voice ${getPath(brief, "audio.voice", "am_michael")}. Captions: ${getPath(brief, "captions") === "yes" ? "yes, timed from \`hyperframes transcribe\` word timestamps" : "no"}.`] : []),
    cta === "none" ? "No call to action." : `Call to action: "${cta}", on screen for the last 2-3 seconds.`,
    `Brand motion personality: ${String(brand.get("style", "motion") ?? "(none given)").replace(/\.$/, "")}.`,
  ];
  const notes = [
    `Brand: ${brand.name} (${brand.get("website") ?? ""}). Positioning: ${brand.get("positioning") ?? ""}`,
    `**The intake is COMPLETE and confirmed by the user. Ask no brief questions.** Beat sheet approved by the user: see PROPOSAL.md (build to it).`,
    `House rules (hook in <= 1 s, a new beat every ~${ENERGY[en].gap} s, big type >= 56 px for headlines, safe zones, CTA in the last 3 s, asset policy) live in the repo root CLAUDE.md and playbook/*.md.`,
    `Use the vendored GSAP at \`assets/vendor/gsap.min.js\` (not a CDN). Stay seek-safe: paused timeline, no randomness/timers/onUpdate/infinite loops.`,
    `Never fabricate photos, people, screenshots, client logos or statistics. Use only material in Assets or text the user supplied.`,
  ];
  return `---\n${YAML.stringify(fm).trimEnd()}\n---\n\n## Intent\n\n${brief.idea}\n\nObjective: ${brief.objective}. Tone: ${brand.get("voice", "tone") ?? "on-brand"}.\n\n## Assets\n\n${assets.map((a) => `- ${a}`).join("\n")}\n\n## Customizations\n\n${custom.map((a) => `- ${a}`).join("\n")}\n\n## Notes\n\n${notes.map((a) => `- ${a}`).join("\n")}\n`;
}

export function writeBriefFiles(projectDir) {
  const brief = loadBrief(projectDir);
  const brand = new Brand(brief.brand);
  fs.writeFileSync(path.join(projectDir, "BRIEF.md"), buildBriefMd(brand, brief));
  fs.writeFileSync(path.join(projectDir, "frame.md"), buildFrame(brand, brief));
  return { brief, brand };
}
