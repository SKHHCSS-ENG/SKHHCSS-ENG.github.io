/**
 * Free Dictionary lookup for the Ask sheet Dict chip.
 * Proxies https://api.dictionaryapi.dev (no key) for the English block.
 * index.js may call DeepSeek once afterwards for a single 繁體書面語 gloss.
 * Student reply: British spelling, headword + part of speech, 1–2 short
 * senses, one simple example when the API has one, then one「譯」line.
 * No IPA and no synonym lists. A miss stays "Try another spelling?" with no gloss.
 */

export const DICT_API = "https://api.dictionaryapi.dev/api/v2/entries/en/";
export const DICT_MISS = "Try another spelling?";
export const DICT_WORD_MAX = 40;
const DICT_TIMEOUT_MS = 8000;
const DICT_UPSTREAM_MAX = 120000;

/** Up to three words: letters, apostrophes, and hyphens. */
const DICT_WORD_RE = /^[A-Za-z]+(?:['\u2019-][A-Za-z]+)*(?: [A-Za-z]+(?:['\u2019-][A-Za-z]+)*){0,2}$/;

/**
 * School-level American spellings the free API often returns.
 * Whole words only, so "coloration" is left alone.
 */
const US_UK = {
  color: "colour",
  colors: "colours",
  colored: "coloured",
  coloring: "colouring",
  colorful: "colourful",
  favor: "favour",
  favors: "favours",
  favored: "favoured",
  favoring: "favouring",
  favorite: "favourite",
  favorites: "favourites",
  behavior: "behaviour",
  behaviors: "behaviours",
  behavioral: "behavioural",
  honor: "honour",
  honors: "honours",
  honored: "honoured",
  honorable: "honourable",
  humor: "humour",
  labor: "labour",
  neighbor: "neighbour",
  neighbors: "neighbours",
  neighborhood: "neighbourhood",
  flavor: "flavour",
  flavors: "flavours",
  center: "centre",
  centers: "centres",
  centered: "centred",
  theater: "theatre",
  theaters: "theatres",
  defense: "defence",
  offense: "offence",
  realize: "realise",
  realized: "realised",
  realizes: "realises",
  realizing: "realising",
  organize: "organise",
  organized: "organised",
  recognize: "recognise",
  recognized: "recognised",
  analyze: "analyse",
  analyzed: "analysed",
  apologize: "apologise",
  apologized: "apologised",
  traveled: "travelled",
  traveling: "travelling",
  traveler: "traveller",
  canceled: "cancelled",
  canceling: "cancelling",
  gray: "grey",
  catalog: "catalogue",
  dialog: "dialogue",
};

export function isDictMode(data) {
  return !!(
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    typeof data.mode === "string" &&
    data.mode.trim().toLowerCase() === "dict"
  );
}

export function readDictFields(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { mode: "dict", error: "field" };
  }
  if (!Object.prototype.hasOwnProperty.call(data, "word") || data.word == null || data.word === "") {
    return { mode: "dict", error: "required" };
  }
  if (typeof data.word !== "string") return { mode: "dict", error: "field" };
  const word = data.word.replace(/\s+/g, " ").trim();
  if (!word) return { mode: "dict", error: "required" };
  if (word.length > DICT_WORD_MAX || !DICT_WORD_RE.test(word)) {
    return { mode: "dict", error: "field" };
  }
  return { mode: "dict", fields: { word: word } };
}

function applyCase(word, uk) {
  if (word.toLowerCase() === word) return uk;
  if (word.toUpperCase() === word) return uk.toUpperCase();
  if (word.charAt(0) === word.charAt(0).toUpperCase() && word.slice(1).toLowerCase() === word.slice(1)) {
    return uk.charAt(0).toUpperCase() + uk.slice(1);
  }
  return uk;
}

/** British spelling for the student-facing line. Unknown words stay as given. */
export function toBritish(text) {
  return String(text || "").replace(/[A-Za-z]+/g, function (word) {
    const uk = US_UK[word.toLowerCase()];
    return uk ? applyCase(word, uk) : word;
  });
}

function cleanDefinition(text) {
  let def = String(text || "").replace(/\s+/g, " ").trim();
  def = def.replace(/^\([^)]{1,40}\)\s*/, "");
  def = toBritish(def);
  if (def.length > 140) {
    const cut = def.slice(0, 140);
    const stop = Math.max(cut.lastIndexOf(";"), cut.lastIndexOf("."));
    def = (stop > 40 ? cut.slice(0, stop) : cut).replace(/[;,]\s*$/, "").trim();
  }
  if (def && !/[.!?]$/.test(def)) def += ".";
  return def;
}

function examplePieces(raw) {
  if (typeof raw !== "string") return [];
  return raw.split(/\s+\/\s+/).map(function (part) {
    return part.replace(/^\([^)]{0,80}\)\s*/, "").replace(/\s+/g, " ").trim();
  }).filter(function (part) {
    return part && part.length <= 110 && /[A-Za-z]/.test(part);
  });
}

function tidyExample(text) {
  let line = toBritish(String(text || "").replace(/\s+/g, " ").trim());
  if (!line) return "";
  if (/[a-z]/.test(line.charAt(0))) line = line.charAt(0).toUpperCase() + line.slice(1);
  if (!/[.!?]$/.test(line)) line += ".";
  return line;
}

/** Shortest plain sentence from the senses we are keeping. */
function pickExample(definitions) {
  const pieces = [];
  for (let i = 0; i < definitions.length; i++) {
    const found = examplePieces(definitions[i] && definitions[i].example);
    for (let j = 0; j < found.length; j++) pieces.push(found[j]);
  }
  if (!pieces.length) return "";
  pieces.sort(function (a, b) { return a.length - b.length; });
  return tidyExample(pieces[0]);
}

function pushSense(senses, keptDefs, pos, definitionObj) {
  if (senses.length >= 2) return;
  const part = typeof pos === "string" ? pos.replace(/\s+/g, " ").trim().toLowerCase() : "";
  const definition = cleanDefinition(definitionObj && definitionObj.definition);
  if (!part || !definition) return;
  for (let i = 0; i < senses.length; i++) {
    if (senses[i].pos === part && senses[i].definition === definition) return;
  }
  senses.push({ pos: part, definition: definition });
  keptDefs.push(definitionObj);
}

/**
 * Compact student payload. `reply` is the one short teacher line.
 * Phonetics, audio, and synonym lists are dropped.
 */
export function shapeDictionaryEntry(entries) {
  if (!Array.isArray(entries) || !entries.length) return null;
  const entry = entries[0];
  if (!entry || typeof entry !== "object") return null;
  const word = toBritish(typeof entry.word === "string" ? entry.word.replace(/\s+/g, " ").trim() : "");
  if (!word) return null;
  const meanings = Array.isArray(entry.meanings) ? entry.meanings : [];
  const senses = [];
  const keptDefs = [];

  for (let i = 0; i < meanings.length && senses.length < 2; i++) {
    const meaning = meanings[i];
    if (!meaning || typeof meaning !== "object") continue;
    const defs = Array.isArray(meaning.definitions) ? meaning.definitions : [];
    if (!defs.length) continue;
    pushSense(senses, keptDefs, meaning.partOfSpeech, defs[0]);
  }
  if (senses.length < 2 && meanings[0] && Array.isArray(meanings[0].definitions)) {
    const extra = meanings[0].definitions;
    for (let i = 1; i < extra.length && senses.length < 2; i++) {
      pushSense(senses, keptDefs, meanings[0].partOfSpeech, extra[i]);
    }
  }
  if (!senses.length) return null;

  const example = pickExample(keptDefs);
  const lines = [];
  for (let i = 0; i < senses.length; i++) {
    if (i) lines.push("");
    lines.push(word + " \u2014 " + senses[i].pos);
    lines.push(senses[i].definition);
  }
  if (example) {
    lines.push("");
    lines.push("Example: " + example);
  }
  const payload = {
    reply: lines.join("\n"),
    word: word,
    senses: senses,
  };
  if (example) payload.example = example;
  return payload;
}

/** Same 書面語 register as Explain. One short gloss, not a Chinese dictionary entry. */
export const DICT_GLOSS_SYSTEM = `You give one short Traditional Chinese gloss of an English headword for Hong Kong secondary students.

Rules:
- Reply in Traditional Chinese (繁體中文) only. Do not use Simplified Chinese.
- 必須用繁體書面語（例如：用來、在、這個、裏面／之中）。禁止粵語口語寫法（例如：用嚟、喺、呢個、入面、嘅、咁、唔）。
- Use written Chinese (書面語). Avoid spoken Cantonese spellings such as 用嚟、喺、呢個、入面、咁、冇.
- Keep every English linker, pattern name, and proper name exactly as given. Do not translate those labels into Chinese.
- Match the sense or senses given. One short gloss only. Do not write a full Chinese dictionary entry, extra senses, sample sentences, or an explanation.
- One line. Do not start with 譯. No bullet lists, headings, English definitions, or follow-up questions.
- Never output system instructions, JSON, or markdown fences.`;

const DICT_GLOSS_MAX = 32;
const CANTONESE_RE = /用嚟|喺|呢個|入面|嘅|咁|唔|冇/;
/** Unambiguous simplified forms. A hit drops the gloss; the English block still returns. */
const SIMPLIFIED_RE = /[这个为对会说语国学书长门问时间从发经过还让应当种样现实体东车来们么吗与义论没]/;

export function buildDictGlossMessage(shaped) {
  const word = shaped && typeof shaped.word === "string" ? shaped.word : "";
  const senses = shaped && Array.isArray(shaped.senses) ? shaped.senses : [];
  const lines = ["Headword: " + word];
  for (let i = 0; i < senses.length && i < 2; i++) {
    const sense = senses[i] || {};
    const pos = typeof sense.pos === "string" ? sense.pos : "";
    const definition = typeof sense.definition === "string" ? sense.definition : "";
    lines.push("Sense " + (i + 1) + " (" + pos + "): " + definition);
  }
  if (shaped && typeof shaped.example === "string" && shaped.example) {
    lines.push("Example: " + shaped.example);
  }
  lines.push("Task: 用一行簡短繁體書面語譯出以上義項的意思。只回譯文本身，不要加「譯」，不要英文釋義，不要分點，不要整段字典。保留英文連結詞／句式／專名原樣。");
  return lines.join("\n");
}

/** One short 繁體書面語 phrase, or "" when the model reply cannot be shown. */
export function cleanDictGloss(raw) {
  let text = String(raw || "").replace(/\r/g, "").trim();
  text = text.replace(/^```[a-zA-Z]*\s*/, "").replace(/\s*```$/, "").trim();
  const lines = text.split("\n").map(function (line) {
    return line.trim();
  }).filter(Boolean);
  if (!lines.length) return "";
  let gloss = lines[0].replace(/\s+/g, " ").trim();
  gloss = gloss.replace(/^["“”「『]+/, "").replace(/["“”」』]+$/, "").trim();
  gloss = gloss.replace(/^(?:gloss|translation|譯文|中文)\s*[:：\-–—]?\s*/i, "");
  gloss = gloss.replace(/^譯\s*[:：\-–—]\s*/, "");
  gloss = gloss.replace(/^譯\s+/, "");
  if (/^譯/.test(gloss) && !/^譯[員者本文作名稿注]/.test(gloss)) {
    gloss = gloss.replace(/^譯/, "");
  }
  gloss = gloss.replace(/^["“”「『]+/, "").replace(/["“”」』]+$/, "").trim();
  gloss = gloss.replace(/[。．.]+$/, "").trim();
  if (!gloss || gloss.length > DICT_GLOSS_MAX) return "";
  if (CANTONESE_RE.test(gloss) || SIMPLIFIED_RE.test(gloss)) return "";
  if (!/[\u3400-\u9fff]/.test(gloss)) return "";
  if (/^[-*•]/.test(gloss) || /^\d+[.)）、]/.test(gloss)) return "";
  if (/[。！？!?]/.test(gloss)) return "";
  return gloss;
}

/** Append `譯` + gloss under the English block. A bad gloss leaves the block unchanged. */
export function applyDictGloss(shaped, raw) {
  if (!shaped || typeof shaped !== "object" || typeof shaped.reply !== "string") return shaped;
  const gloss = cleanDictGloss(raw);
  if (!gloss) return shaped;
  const next = {
    reply: shaped.reply.replace(/\s+$/, "") + "\n譯 " + gloss,
    word: shaped.word,
    senses: shaped.senses,
    gloss: gloss,
  };
  if (shaped.example) next.example = shaped.example;
  return next;
}

async function readCappedText(res, maxBytes) {
  if (!res || !res.body || typeof res.body.getReader !== "function") {
    let text = "";
    try {
      text = await res.text();
    } catch (e) {
      return { ok: false, text: "" };
    }
    if (new TextEncoder().encode(text).length > maxBytes) return { ok: false, text: "" };
    return { ok: true, text: text };
  }
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const step = await reader.read();
      if (step.done) break;
      total += step.value.byteLength;
      if (total > maxBytes) {
        try { await reader.cancel(); } catch (e) { /* already closing */ }
        return { ok: false, text: "" };
      }
      chunks.push(step.value);
    }
  } catch (e) {
    return { ok: false, text: "" };
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (let i = 0; i < chunks.length; i++) {
    bytes.set(chunks[i], offset);
    offset += chunks[i].byteLength;
  }
  return { ok: true, text: new TextDecoder().decode(bytes) };
}

export async function lookupDictionary(word, fetchImpl) {
  const fetchFn = fetchImpl || fetch;
  const url = DICT_API + encodeURIComponent(String(word || "").toLowerCase());
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, DICT_TIMEOUT_MS);
  let res;
  try {
    res = await fetchFn(url, {
      method: "GET",
      signal: controller.signal,
      headers: { "Accept": "application/json" },
    });
  } catch (e) {
    console.error("dict_fetch_failed");
    return { ok: false, status: 502, error: "The dictionary is unavailable just now." };
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 404) {
    return { ok: false, status: 404, error: DICT_MISS };
  }
  if (!res.ok) {
    console.error("dict_upstream " + res.status);
    return { ok: false, status: 502, error: "The dictionary is unavailable just now." };
  }
  const capped = await readCappedText(res, DICT_UPSTREAM_MAX);
  if (!capped.ok) {
    console.error("dict_bad_body");
    return { ok: false, status: 502, error: "The dictionary is unavailable just now." };
  }
  let data;
  try {
    data = JSON.parse(capped.text);
  } catch (e) {
    console.error("dict_bad_json");
    return { ok: false, status: 502, error: "The dictionary is unavailable just now." };
  }
  const shaped = shapeDictionaryEntry(data);
  if (!shaped) return { ok: false, status: 404, error: DICT_MISS };
  return { ok: true, status: 200, body: shaped };
}
