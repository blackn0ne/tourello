/* Pre-generates every audio-guide clip with OpenAI TTS so visitors never wait for an API.
   Usage:  OPENAI_API_KEY=sk-... npm run audio                 English  → public/assets/audio/<id>.mp3
           OPENAI_API_KEY=sk-... npm run audio -- --lang ru    Russian  → public/assets/audio/ru/<id>.mp3
           add --force to regenerate, --all for every language that has a script.<lang>.txt */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) { console.error("Set OPENAI_API_KEY first."); process.exit(1); }
const VOICE = process.env.TTS_VOICE || "onyx", MODEL = process.env.TTS_MODEL || "gpt-4o-mini-tts";
const force = process.argv.includes("--force");
const root = resolve("public/assets/audio");
const langs = process.argv.includes("--all") ? ["en", ...readdirSync(root).filter(f => /^script\.\w+\.txt$/.test(f)).map(f => f.split(".")[1])]
  : [process.argv.includes("--lang") ? process.argv[process.argv.indexOf("--lang") + 1] : "en"];
const STYLE = { en: "British", ru: "Russian", kk: "Kazakh", ar: "Arabic", es: "Spanish", zh: "Mandarin Chinese", uz: "Uzbek" };

for (const lang of langs) {
  const dir = lang === "en" ? root : resolve(root, lang); mkdirSync(dir, { recursive: true });
  const scriptFile = resolve(root, lang === "en" ? "script.txt" : `script.${lang}.txt`);
  if (!existsSync(scriptFile)) { console.log("no script for", lang); continue; }
  const blocks = readFileSync(scriptFile, "utf8").trim().split(/\n\s*\n/);
  console.log(`== ${lang}: ${blocks.length} clips`);
  for (const block of blocks) {
    const [head, ...rest] = block.split("\n"); const text = rest.join("\n").trim();
    const id = head.split("—")[0].trim().toLowerCase(); const file = resolve(dir, id + ".mp3");
    if (existsSync(file) && !force) { continue; }
    const r = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST", headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, voice: VOICE, input: text, response_format: "mp3",
        instructions: `You are a calm, warm, intelligent ${STYLE[lang] || ""} travel narrator, like a refined AI assistant. Speak natural ${STYLE[lang] || "English"} with native pronunciation. Unhurried pace, gentle intonation, clear diction, a hint of wonder when describing monuments.` })
    });
    if (!r.ok) { console.log("FAIL ", lang, id, r.status, (await r.text()).slice(0, 200)); continue; }
    const buf = Buffer.from(await r.arrayBuffer());
    if (!buf.length) { console.log("FAIL ", lang, id, "empty response"); continue; }
    writeFileSync(file, buf); console.log("ok   ", lang, id, Math.round(buf.length / 1024) + " kB");
  }
}
console.log("done");
