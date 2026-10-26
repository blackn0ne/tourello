/* Translates the place content (src/places.js) into every language with OpenAI, writing
   src/i18n/content.<lang>.json and public/assets/audio/script.<lang>.txt.
   Usage: OPENAI_API_KEY=sk-... npm run translate            (-- --force to redo, -- --lang ru for one) */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const KEY = process.env.OPENAI_API_KEY; if (!KEY) { console.error("Set OPENAI_API_KEY first."); process.exit(1); }
const MODEL = process.env.TRANSLATE_MODEL || "gpt-4o-mini";
const force = process.argv.includes("--force"); const only = process.argv.includes("--lang") ? process.argv[process.argv.indexOf("--lang") + 1] : null;
const { CATS, PLACES, INFO } = await import(pathToFileURL(resolve("src/places.js")).href);
const { UI } = await import(pathToFileURL(resolve("src/i18n.js")).href);
const NAMES = { ru: "Russian", kk: "Kazakh (Cyrillic script)", ar: "Arabic (Modern Standard)", es: "Spanish", zh: "Simplified Chinese", uz: "Uzbek (Latin script)" };
mkdirSync(resolve("src/i18n"), { recursive: true });

async function translateBatch(lang, items) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST", headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, temperature: 0.2, response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `You are a professional travel-guide translator. Translate the JSON values from English into ${NAMES[lang]}. Keep the JSON structure and keys exactly; translate every string value (names, tags, body paragraphs, tips, fact labels and values). Keep proper names recognisable in the target language's usual spelling (e.g. Khoja Ahmed Yasawi, Turkestan, Karatau). Keep numbers, units and currency symbols. Natural, warm, concise tourist-guide tone.` },
        { role: "user", content: JSON.stringify(items) }
      ] })
  });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 300)}`);
  return JSON.parse((await r.json()).choices[0].message.content);
}

/* narration script for npm run audio -- --lang <code> */
function writeScript(lang, out) {
  let script = `WELCOME
${UI[lang].welcome}

`;
  for (const p of PLACES) { const q = out.places[p.id] || p; script += `${p.id.toUpperCase()} — ${q.name}
${q.name}. ${q.tag}. ${q.body.join(" ")} ${UI[lang].tip}: ${q.tips[0]}

`; }
  writeFileSync(resolve(`public/assets/audio/script.${lang}.txt`), script);
}

for (const lang of Object.keys(NAMES)) {
  if (only && only !== lang) continue;
  const file = resolve(`src/i18n/content.${lang}.json`);
  let out = { places: {}, cats: {}, info: [] };
  if (existsSync(file) && !force) { console.log("skip ", lang, "(regenerating script)"); out = JSON.parse(readFileSync(file, "utf8")); writeScript(lang, out); continue; }
  console.log("translating", lang, "...");
  const catsInfo = await translateBatch(lang, { cats: Object.fromEntries(CATS.map(c => [c.id, c.name])), info: INFO });
  out.cats = catsInfo.cats; out.info = catsInfo.info;
  for (let i = 0; i < PLACES.length; i += 4) {
    const chunk = PLACES.slice(i, i + 4);
    const src = Object.fromEntries(chunk.map(p => [p.id, { name: p.name, tag: p.tag, body: p.body, facts: p.facts, tips: p.tips }]));
    let res = await translateBatch(lang, src);
    /* the model occasionally drops or renames a key: retry those one by one, then fall back to English */
    for (const p of chunk) {
      if (!res[p.id] || !res[p.id].name) { try { const one = await translateBatch(lang, { [p.id]: src[p.id] }); res[p.id] = one[p.id] || Object.values(one)[0]; } catch (e) { /* fall through */ } }
      if (!res[p.id] || !res[p.id].name) { console.log("\nfallback to English for", p.id); res[p.id] = src[p.id]; }
      for (const k of ["body", "tips", "facts"]) if (!Array.isArray(res[p.id][k])) res[p.id][k] = src[p.id][k];
    }
    Object.assign(out.places, res); process.stdout.write(".");
  }
  writeFileSync(file, JSON.stringify(out, null, 1));
  /* narration script for npm run audio -- --lang <code> */
  let script = `WELCOME\n${UI[lang].welcome}\n\n`;
  for (const p of PLACES) { const q = out.places[p.id]; script += `${p.id.toUpperCase()} — ${q.name}\n${q.name}. ${q.tag}. ${q.body.join(" ")} ${UI[lang].tip}: ${q.tips[0]}\n\n`; }
  writeFileSync(resolve(`public/assets/audio/script.${lang}.txt`), script);
  console.log("\nok   ", lang, Object.keys(out.places).length, "places");
}
console.log("done");
