# Recipe: voiceover-explainer (20 s)
**Use for:** educate. Kokoro narration + captions + a supporting visual. **Workflow:** faceless-explainer or general-video.

Workflow order matters: **script -> voice -> timing -> visuals**.
1. Write `audio/vo.yaml` (hook <= 7 words; <= 14 words/line; one idea per line). Show the lines to the user for approval.
2. `node tools/reel.mjs voice <project>` -> real durations and word timestamps in `audio/vo.json`.
3. Set every scene's start time from those timings so visuals land **on** the words. Re-run after any script edit.
4. Captions: burned-in, <= 4 words per chunk, pill background, spoken word highlighted in accent (timed from the word timestamps).

| Time | Beat |
|---|---|
| 0-3.4 | hook slams while the first line plays |
| 3.4-16 | a supporting visual builds in step with the narration; key phrases as on-screen text |
| 16-20 | CTA |

Duck the bed under the voice (`/hyperframes-audio` voice carve). If no transcription engine is installed, time captions evenly by character count and tell the user.
