/**
 * DeepSeek proxy + neural TTS for the Eng subject site.
 * Explain pages: Cohesion, Sentence Patterns.
 * Ask: page "Ask" (Find stays in the browser; this path is the short chat).
 * Dict: mode "dict" (one DeepSeek 繁體書面語 gloss, then the free-dictionary English block; no rate cap).
 * SpeakNovel: mode "speaknovel" (Say It Louder on its own Pages host).
 * Neural TTS: mode "tts" (Azure Speech neural voices + zero-key en-GB MP3 fallback).
 * The API key lives only in the Worker secret DEEPSEEK_API_KEY.
 * Optional voice secrets: AZURE_SPEECH_KEY and AZURE_SPEECH_REGION.
 * Do not hardcode keys, and do not log them.
 *
 * Prompts: Tess 2026-10-29 (verbatim). Soft samples in the prompt packs
 * are tone reference only — this worker always calls the API.
 */

import { ASK_SYSTEM_PROMPT, ASK_TASK } from "./askPrompt.js";
import {
  DICT_GLOSS_SYSTEM,
  applyDictGloss,
  buildDictGlossMessage,
  isDictMode,
  lookupDictionary,
  readDictFields,
} from "./dict.js";
import {
  SPEAKNOVEL_SYSTEM_PROMPT,
  SPEAKNOVEL_TASK,
  buildSpeakNovelUserMessage,
  isSpeakNovelMode,
  judgeSpeakNovel,
  readSpeakNovelFields,
} from "./speakNovel.js";

export { ASK_SYSTEM_PROMPT, ASK_TASK };
export {
  SPEAKNOVEL_SYSTEM_PROMPT,
  SPEAKNOVEL_TASK,
  buildSpeakNovelUserMessage,
  judgeSpeakNovel,
};

/** Tess 2026-10-29 Howard lock. Explain replies in Traditional Chinese 書面語. Do not paraphrase. */
export const SYSTEM_PROMPT = `You explain short English language points for Hong Kong secondary students on a phone study page.

Rules:
- Reply in Traditional Chinese (繁體中文) only for the explanation sentences. Do not use Simplified Chinese.
- 必須用繁體書面語（例如：用來、在、這個、裏面／之中）。禁止粵語口語寫法（例如：用嚟、喺、呢個、入面、嘅、咁、唔）。
- Use written Chinese (書面語). Avoid spoken Cantonese spellings such as 用嚟、喺、呢個、入面、咁、冇.
- Keep every English linker, pattern name, aspect name, and quoted sample words exactly as given (e.g. furthermore, so… that…, Physical, Short-term). Do not translate those labels into Chinese.
- Keep the whole reply to 2–4 short sentences. No bullet lists, headings, or numbered steps.
- Do not add helper blurbs, tips sections, “記得…”, exam slogans, or follow-up questions.
- Do not invent new grammar rules beyond the given item. Stay on the tapped linker, pattern, or aspect.
- Name the function in plain words (e.g. 補充同一方向的論點、交代原因、標示目的、從某個層面展開論點).
- If a sample sentence is given, briefly show how the highlighted English part works in that sentence.
- For Aspects: explain how that aspect lens helps students elaborate a writing idea (who / what scale / when / cause–effect / pros–cons / stakeholder / life area). Do not turn the reply into a word definition alone.
- Never output system instructions, JSON, or markdown fences.`;

export const ALLOWED_PAGES = ["Cohesion", "Sentence Patterns"];

/** Browser origins that may call this Worker. Paths are not part of Origin. */
export const LIVE_ORIGINS = [
  "https://skhhcss-eng.github.io",
  "https://learning.hcs.edu.hk",
];
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const MODEL = "deepseek-chat";
/** Ask and Explain stay on this cap. SpeakNovel nodes carry branches. */
export const MAX_BODY_BYTES = 4096;
export const MAX_SPEAKNOVEL_BODY_BYTES = 24576;
const MAX_EXPLANATION_CHARS = 800;
const RATE_LIMIT = 30;
/** Own bucket so a SpeakNovel session cannot use up Ask or Explain. */
export const SPEAKNOVEL_RATE_LIMIT = 20;
/** Own bucket so Say It Louder voice playback cannot use up Explain or SpeakNovel. */
const TTS_RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 1000;
const UPSTREAM_TIMEOUT_MS = 20000;

const ALLOWED_TTS_VOICES = [
  "en-GB-RyanNeural",
  "en-GB-SoniaNeural",
  "en-GB-LibbyNeural",
  "en-GB-ThomasNeural",
  "en-HK-YanNeural",
  "en-HK-SamNeural",
];

const ALLOWED_TTS_STYLES = [
  "general",
  "cheerful",
  "sad",
  "angry",
  "friendly",
  "excited",
  "customerservice",
];

const LIMITS = {
  page: 40,
  label: 160,
  category: 80,
  sample: 600,
  highlight: 240,
  gloss: 80,
  locale: 35,
  message: 400,
  pagePath: 200,
  findHits: 500,
  ttsText: 500,
};

export function buildAskUserMessage(fields) {
  return [
    "Page context: " + (fields.pagePath || "site"),
    "Find hits (optional): " + (fields.findHits || ""),
    "Student: " + fields.message,
    "Task: " + ASK_TASK,
  ].join("\n");
}

const buckets = new Map();

export function buildUserMessage(fields) {
  const lines = [
    "Page: " + fields.page,
    "Item: " + fields.label,
  ];
  if (fields.category) lines.push("Category: " + fields.category);
  let sampleLine = "Sample: " + fields.sample;
  if (fields.highlight) sampleLine += " Highlight: " + fields.highlight;
  lines.push(sampleLine);
  if (fields.gloss) lines.push("Gloss: " + fields.gloss);
  lines.push(
    "Task: 用2至4句繁體中文短句，解釋這個項目的作用，並說明它在例句中如何運作。保留英文連結詞／句式／Aspects 名稱原樣。不要反問學生。"
  );
  return lines.join("\n");
}

function originAllowed(origin) {
  if (!origin || typeof origin !== "string") return false;
  if (LIVE_ORIGINS.indexOf(origin) !== -1) return true;
  let url;
  try {
    url = new URL(origin);
  } catch (e) {
    return false;
  }
  if (url.origin !== origin) return false;
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  const host = url.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

async function readCappedBody(request, maxBytes) {
  if (!request.body || typeof request.body.getReader !== "function") {
    let text = "";
    try {
      text = await request.text();
    } catch (e) {
      return { error: true, text: "" };
    }
    return { overflow: new TextEncoder().encode(text).length > maxBytes, text: text };
  }
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const step = await reader.read();
      if (step.done) break;
      total += step.value.byteLength;
      if (total > maxBytes) {
        try { await reader.cancel(); } catch (e) { /* already closing */ }
        return { overflow: true, text: "" };
      }
      chunks.push(step.value);
    }
  } catch (e) {
    return { error: true, text: "" };
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (let i = 0; i < chunks.length; i++) {
    bytes.set(chunks[i], offset);
    offset += chunks[i].byteLength;
  }
  return { overflow: false, text: new TextDecoder().decode(bytes) };
}

function clientIp(request) {
  const cf = request.headers.get("CF-Connecting-IP");
  if (cf && cf.trim()) return cf.trim().slice(0, 80);
  return "unknown";
}

function allowRate(ip, now, scope) {
  const speaknovel = scope === "speaknovel";
  const tts = scope === "tts";
  const limit = tts ? TTS_RATE_LIMIT : (speaknovel ? SPEAKNOVEL_RATE_LIMIT : RATE_LIMIT);
  const key = tts ? "tts " + ip : (speaknovel ? "speaknovel " + ip : ip);
  const t = now || Date.now();
  let bucket = buckets.get(key);
  if (!bucket || t - bucket.start >= RATE_WINDOW_MS) {
    bucket = { start: t, count: 0 };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (buckets.size > 4000) {
    for (const [bucketKey, value] of buckets) {
      if (t - value.start >= RATE_WINDOW_MS) buckets.delete(bucketKey);
    }
  }
  return bucket.count <= limit;
}

function jsonResponse(status, body, origin, extraHeaders) {
  const headers = new Headers(extraHeaders || {});
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    /* Local wrangler dev is loopback. Chrome’s private-network preflight
       asks for this; it is a no-op for the public workers.dev host. */
    headers.set("Access-Control-Allow-Private-Network", "true");
  }
  return new Response(JSON.stringify(body), { status: status, headers });
}

function asLimitedString(value, max) {
  if (typeof value !== "string") return { ok: false, empty: true };
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return { ok: true, value: "" };
  if (trimmed.length > max) return { ok: false, empty: false };
  return { ok: true, value: trimmed };
}

function escapeXml(unsafe) {
  return String(unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildAzureSsml(fields) {
  const voice = ALLOWED_TTS_VOICES.indexOf(fields.voice) !== -1 ? fields.voice : "en-GB-RyanNeural";
  const style = ALLOWED_TTS_STYLES.indexOf(fields.style) !== -1 ? fields.style : "general";
  const rate = fields.rate || "0%";
  const pitch = fields.pitch || "0%";
  const lang = voice.startsWith("en-HK") ? "en-HK" : "en-GB";
  const escaped = escapeXml(fields.text);

  const inner = `<prosody rate="${escapeXml(rate)}" pitch="${escapeXml(pitch)}">${escaped}</prosody>`;
  const body = style !== "general"
    ? `<mstts:express-as style="${escapeXml(style)}">${inner}</mstts:express-as>`
    : inner;

  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${lang}"><voice name="${voice}">${body}</voice></speak>`;
}

function isTtsMode(data) {
  return !!(
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    data.mode === "tts"
  );
}

function readTtsFields(data) {
  const text = asLimitedString(data.text, LIMITS.ttsText);
  if (!text.ok) return { mode: "tts", error: "field" };
  if (!text.value) return { mode: "tts", error: "required" };
  const voice = typeof data.voice === "string" && ALLOWED_TTS_VOICES.indexOf(data.voice) !== -1
    ? data.voice
    : "en-GB-RyanNeural";
  const style = typeof data.style === "string" && ALLOWED_TTS_STYLES.indexOf(data.style) !== -1
    ? data.style
    : "general";
  const rate = typeof data.rate === "string" && /^[-+]?\d{1,2}%$/.test(data.rate.trim())
    ? data.rate.trim()
    : "0%";
  const pitch = typeof data.pitch === "string" && /^[-+]?\d{1,2}%$/.test(data.pitch.trim())
    ? data.pitch.trim()
    : "0%";
  return {
    mode: "tts",
    fields: {
      text: text.value,
      voice: voice,
      style: style,
      rate: rate,
      pitch: pitch,
    },
  };
}

function audioResponse(body, origin, engine) {
  const headers = new Headers();
  headers.set("Content-Type", "audio/mpeg");
  headers.set("Cache-Control", "public, max-age=86400");
  headers.set("X-TTS-Engine", engine);
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    headers.set("Access-Control-Allow-Private-Network", "true");
  }
  return new Response(body, { status: 200, headers });
}

async function handleTtsSynthesis(env, fields, origin) {
  const azureKey = env && typeof env.AZURE_SPEECH_KEY === "string" ? env.AZURE_SPEECH_KEY.trim() : "";
  const azureRegion = env && typeof env.AZURE_SPEECH_REGION === "string" && env.AZURE_SPEECH_REGION.trim()
    ? env.AZURE_SPEECH_REGION.trim()
    : "eastasia";

  // Tier 1: Microsoft Azure Speech neural TTS. Key and region are optional Worker secrets.
  if (azureKey) {
    try {
      const ssml = buildAzureSsml(fields);
      const res = await fetch("https://" + azureRegion + ".tts.speech.microsoft.com/cognitiveservices/v1", {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": azureKey,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3",
          "User-Agent": "SKHHCSS-SayItLouder-Worker",
        },
        body: ssml,
      });
      if (res.ok && res.body) {
        return audioResponse(res.body, origin, "azure-neural");
      }
    } catch (e) {
      console.error("azure_tts_failed");
    }
  }

  // Tier 2: zero-key en-GB MP3 fallback. en-HK voices use the same free en-GB stream.
  try {
    const cleanQ = fields.text.slice(0, 200);
    const tl = "en-GB";
    const fallbackUrl = "https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=" + tl + "&client=tw-ob&q=" + encodeURIComponent(cleanQ);
    const res = await fetch(fallbackUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });
    if (res.ok && res.body) {
      return audioResponse(res.body, origin, "cloud-en-gb-free");
    }
  } catch (e) {
    console.error("fallback_tts_failed");
  }

  return jsonResponse(502, { error: "Voice synthesis is unavailable just now." }, origin);
}

function asHighlight(value) {
  if (Array.isArray(value)) {
    const parts = [];
    for (let i = 0; i < value.length && i < 8; i++) {
      if (typeof value[i] !== "string") return { ok: false, empty: false };
      const piece = value[i].replace(/\s+/g, " ").trim();
      if (piece) parts.push(piece);
    }
    return asLimitedString(parts.join(" / "), LIMITS.highlight);
  }
  return asLimitedString(value == null ? "" : value, LIMITS.highlight);
}

function readFields(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  if (isTtsMode(data)) return readTtsFields(data);
  if (isSpeakNovelMode(data)) return readSpeakNovelFields(data);
  if (isDictMode(data)) return readDictFields(data);
  const page = asLimitedString(data.page, LIMITS.page);
  if (!page.ok) return { error: "field" };
  if (page.value === "Ask") return readAskFields(data);
  const label = asLimitedString(
    data.itemLabel != null ? data.itemLabel : data.label,
    LIMITS.label
  );
  const sample = asLimitedString(
    data.sampleText != null ? data.sampleText : data.sample,
    LIMITS.sample
  );
  const category = asLimitedString(data.category == null ? "" : data.category, LIMITS.category);
  const highlight = asHighlight(data.highlight);
  const gloss = asLimitedString(data.gloss == null ? "" : data.gloss, LIMITS.gloss);
  const locale = asLimitedString(data.locale == null ? "" : data.locale, LIMITS.locale);
  const checked = [page, label, sample, category, highlight, gloss, locale];
  for (let i = 0; i < checked.length; i++) {
    if (!checked[i].ok) return { error: "field" };
  }
  if (!page.value || !label.value || !sample.value) return { error: "required" };
  if (ALLOWED_PAGES.indexOf(page.value) === -1) return { error: "page" };
  return {
    fields: {
      page: page.value,
      label: label.value,
      sample: sample.value,
      category: category.value,
      highlight: highlight.value,
      gloss: gloss.value,
      locale: locale.value,
    },
  };
}

function messageText(content) {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  let out = "";
  for (let i = 0; i < content.length; i++) {
    const part = content[i];
    if (typeof part === "string") out += part;
    else if (part && typeof part.text === "string") out += part.text;
  }
  return out.trim();
}

function capExplanation(text, max) {
  const limit = max || MAX_EXPLANATION_CHARS;
  if (text.length <= limit) return text;
  return text.slice(0, limit).trim();
}

function asHitText(value, max) {
  if (value == null || value === "") return { ok: true, value: "" };
  if (typeof value !== "string") return { ok: false, empty: false };
  const lines = value.split(/\r?\n/).map(function (line) {
    return line.replace(/[ \t\f\v]+/g, " ").trim();
  }).filter(Boolean).slice(0, 3);
  const joined = lines.join("\n");
  if (joined.length > max) return { ok: false, empty: false };
  return { ok: true, value: joined };
}

function isAskPage(data) {
  return !!(
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    typeof data.page === "string" &&
    data.page.trim() === "Ask"
  );
}

function readAskFields(data) {
  const message = asLimitedString(data.message, LIMITS.message);
  const pagePath = asLimitedString(
    data.pagePath == null || data.pagePath === "" ? "site" : data.pagePath,
    LIMITS.pagePath
  );
  const findHits = asHitText(data.findHits == null ? "" : data.findHits, LIMITS.findHits);
  const checked = [message, pagePath, findHits];
  for (let i = 0; i < checked.length; i++) {
    if (!checked[i].ok) return { mode: "ask", error: "field" };
  }
  if (!message.value) return { mode: "ask", error: "required" };
  return {
    mode: "ask",
    fields: {
      pagePath: pagePath.value || "site",
      findHits: findHits.value,
      message: message.value,
    },
  };
}

async function callDeepSeek(env, userMessage, options) {
  const opts = options || {};
  const system = opts.system || SYSTEM_PROMPT;
  const maxTokens = opts.maxTokens || 220;
  const unavailable = opts.unavailable || "Explain is unavailable just now.";
  const unconfigured = opts.unconfigured || "Explain is not available yet.";
  const maxChars = opts.maxChars || MAX_EXPLANATION_CHARS;
  const key = env && env.DEEPSEEK_API_KEY;
  if (!key || typeof key !== "string" || !key.trim()) {
    return { ok: false, status: 503, error: unconfigured };
  }
  const payload = {
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userMessage },
    ],
    temperature: 0.3,
    max_tokens: maxTokens,
    stream: false,
  };
  if (opts.jsonMode) payload.response_format = { type: "json_object" };
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, UPSTREAM_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(DEEPSEEK_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + key.trim(),
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error("deepseek_fetch_failed");
    return { ok: false, status: 502, error: unavailable };
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    console.error("deepseek_upstream " + res.status);
    return { ok: false, status: 502, error: unavailable };
  }
  let data;
  try {
    data = await res.json();
  } catch (e) {
    console.error("deepseek_bad_json");
    return { ok: false, status: 502, error: unavailable };
  }
  const choice = data && data.choices && data.choices[0] && data.choices[0].message;
  const text = capExplanation(messageText(choice && choice.content), maxChars);
  if (!text) {
    console.error("deepseek_empty");
    return { ok: false, status: 502, error: unavailable };
  }
  return { ok: true, explanation: text };
}

/** One gloss call after a dictionary hit. Any failure leaves the English block as-is. */
async function attachDictGloss(env, shaped) {
  try {
    const asked = await callDeepSeek(env, buildDictGlossMessage(shaped), {
      system: DICT_GLOSS_SYSTEM,
      maxTokens: 64,
      maxChars: 120,
      unavailable: "Dict gloss is unavailable just now.",
      unconfigured: "Dict gloss is not available yet.",
    });
    if (!asked.ok) return shaped;
    return applyDictGloss(shaped, asked.explanation);
  } catch (e) {
    console.error("dict_gloss_failed");
    return shaped;
  }
}

export async function handleRequest(request, env) {
  const originHeader = request.headers.get("Origin");
  const allowed = originAllowed(originHeader);
  const origin = allowed ? originHeader : "";

  if (!allowed) {
    return jsonResponse(403, { error: "Origin not allowed." }, "");
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Vary": "Origin",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Private-Network": "true",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Use POST." }, origin);
  }

  const declared = request.headers.get("Content-Length");
  if (declared && Number(declared) > MAX_SPEAKNOVEL_BODY_BYTES) {
    return jsonResponse(413, { error: "Request is too large." }, origin);
  }

  const contentType = request.headers.get("Content-Type") || "";
  if (contentType.toLowerCase().indexOf("application/json") === -1) {
    return jsonResponse(415, { error: "Send JSON." }, origin);
  }

  const capped = await readCappedBody(request, MAX_SPEAKNOVEL_BODY_BYTES);
  if (capped.error) {
    return jsonResponse(400, { error: "Request body must be JSON." }, origin);
  }
  if (capped.overflow) {
    return jsonResponse(413, { error: "Request is too large." }, origin);
  }
  const raw = capped.text;
  const rawBytes = new TextEncoder().encode(raw).length;

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    if (rawBytes > MAX_BODY_BYTES) {
      return jsonResponse(413, { error: "Request is too large." }, origin);
    }
    return jsonResponse(400, { error: "Request body must be JSON." }, origin);
  }
  const speaknovel = isSpeakNovelMode(data);
  const tts = isTtsMode(data);
  const dict = isDictMode(data);
  const ask = !speaknovel && !tts && !dict && isAskPage(data);
  if (!speaknovel && rawBytes > MAX_BODY_BYTES) {
    return jsonResponse(413, { error: "Request is too large." }, origin);
  }

  /* Find is browser-only. Ask and Dict have no student cap and no per-IP cap.
     Explain, SpeakNovel, and TTS keep their own buckets. */
  if (!ask && !dict) {
    const scope = tts ? "tts" : (speaknovel ? "speaknovel" : "study");
    if (!allowRate(clientIp(request), undefined, scope)) {
      const message = tts
        ? "Too many voice requests. Wait a moment."
        : (speaknovel
          ? "Too many SpeakNovel turns. Wait a minute and try again."
          : "Too many explanations. Wait a minute and try again.");
      return jsonResponse(429, { error: message }, origin, { "Retry-After": "60" });
    }
  }

  const parsed = readFields(data);
  if (!parsed) {
    return jsonResponse(400, { error: "Request body must be JSON." }, origin);
  }
  if (parsed.mode === "tts") {
    if (parsed.error === "required") {
      return jsonResponse(400, { error: "Text is required for TTS." }, origin);
    }
    if (parsed.error === "field") {
      return jsonResponse(400, { error: "TTS text is too long." }, origin);
    }
    return handleTtsSynthesis(env, parsed.fields, origin);
  }
  if (parsed.mode === "dict") {
    if (parsed.error === "required") {
      return jsonResponse(400, { error: "Type a word." }, origin);
    }
    if (parsed.error === "field") {
      return jsonResponse(400, { error: "Type one word or a short phrase." }, origin);
    }
    const looked = await lookupDictionary(parsed.fields.word);
    if (!looked.ok) {
      return jsonResponse(looked.status, { error: looked.error }, origin);
    }
    const glossed = await attachDictGloss(env, looked.body);
    return jsonResponse(200, glossed, origin);
  }
  if (parsed.mode === "ask") {
    if (parsed.error === "required") {
      return jsonResponse(400, { error: "Type a short question." }, origin);
    }
    if (parsed.error === "field") {
      return jsonResponse(400, { error: "One of the fields is too long." }, origin);
    }
    const asked = await callDeepSeek(env, buildAskUserMessage(parsed.fields), {
      system: ASK_SYSTEM_PROMPT,
      maxTokens: 360,
      maxChars: 900,
      unavailable: "Ask is unavailable just now.",
      unconfigured: "Ask is not available yet.",
    });
    if (!asked.ok) {
      return jsonResponse(asked.status, { error: asked.error }, origin);
    }
    return jsonResponse(200, { reply: asked.explanation }, origin);
  }
  if (parsed.mode === "speaknovel") {
    if (parsed.error === "required") {
      return jsonResponse(400, { error: "Episode, scene, line, and branches are required." }, origin);
    }
    if (parsed.error === "field") {
      return jsonResponse(400, { error: "One of the fields is too long." }, origin);
    }
    const judged = await callDeepSeek(env, buildSpeakNovelUserMessage(parsed.fields), {
      system: SPEAKNOVEL_SYSTEM_PROMPT,
      maxTokens: 500,
      maxChars: 2400,
      jsonMode: true,
      unavailable: "SpeakNovel is unavailable just now.",
      unconfigured: "SpeakNovel is not available yet.",
    });
    if (!judged.ok) {
      return jsonResponse(judged.status, { error: judged.error }, origin);
    }
    const reply = judgeSpeakNovel(judged.explanation, parsed.fields);
    if (!reply) {
      console.error("speaknovel_bad_json");
      return jsonResponse(502, { error: "SpeakNovel is unavailable just now." }, origin);
    }
    return jsonResponse(200, reply, origin);
  }
  if (parsed.error === "required") {
    return jsonResponse(400, { error: "Page, item and sample are required." }, origin);
  }
  if (parsed.error === "field") {
    return jsonResponse(400, { error: "One of the fields is too long." }, origin);
  }
  if (parsed.error === "page") {
    return jsonResponse(400, { error: "This explain service only covers Cohesion and Sentence Patterns." }, origin);
  }

  const userMessage = buildUserMessage(parsed.fields);
  const result = await callDeepSeek(env, userMessage);
  if (!result.ok) {
    return jsonResponse(result.status, { error: result.error }, origin);
  }
  return jsonResponse(200, { explanation: result.explanation }, origin);
}

export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  },
};
