/* Pre-generates every audio-guide clip with OpenAI TTS so visitors never wait for an API.
   Usage:  OPENAI_API_KEY=sk-... npm run audio          (add -- --force to regenerate)
   Reads public/assets/audio/script.txt and writes public/assets/audio/<id>.mp3 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) { console.error("Set OPENAI_API_KEY first."); process.exit(1); }
const VOICE = process.env.TTS_VOICE || "onyx", MODEL = process.env.TTS_MODEL || "gpt-4o-mini-tts";
const force = process.argv.includes("--force");
const dir = resolve("public/assets/audio"); mkdirSync(dir, { recursive: true });
const blocks = readFileSync(resolve(dir, "script.txt"), "utf8").trim().split(/\n\s*\n/);

for (const block of blocks) {
  const [head, ...rest] = block.split("\n"); const text = rest.join("\n").trim();
  const id = head.split("—")[0].trim().toLowerCase(); const file = resolve(dir, id + ".mp3");
  if (existsSync(file) && !force) { console.log("skip ", id); continue; }
  const r = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST", headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, voice: VOICE, input: text, response_format: "mp3",
      instructions: "You are a calm, warm, intelligent British travel narrator, like a refined AI assistant. Unhurried pace, gentle intonation, clear diction, a hint of wonder when describing monuments." })
  });
  if (!r.ok) { console.log("FAIL ", id, r.status, (await r.text()).slice(0, 200)); continue; }
  const buf = Buffer.from(await r.arrayBuffer());
  if (!buf.length) { console.log("FAIL ", id, "empty response"); continue; }
  writeFileSync(file, buf); console.log("ok   ", id, Math.round(buf.length / 1024) + " kB");
}
console.log("done");
