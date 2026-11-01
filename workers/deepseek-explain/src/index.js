/**
 * DeepSeek proxy for the Eng subject site.
 * Explain pages: Cohesion, Sentence Patterns.
 * Ask: page "Ask" (Find stays in the browser; this path is the short chat).
 * Say It Louder: page "Say It Louder" (the carriage coach). Same secret.
 * The API key lives only in the Worker secret DEEPSEEK_API_KEY.
 * Do not hardcode it, and do not log it.
 *
 * Prompts: Tess 2026-10-29 (verbatim). Soft samples in the prompt packs
 * are tone reference only — this worker always calls the API.
 */

import { ASK_SYSTEM_PROMPT, ASK_TASK } from "./askPrompt.js";
import { COACH_ACTIONS, COACH_MOODS, COACH_PACKS, COACH_SYSTEM_PROMPT, COACH_TASK } from "./coachPrompt.js";

export { ASK_SYSTEM_PROMPT, ASK_TASK, COACH_ACTIONS, COACH_MOODS, COACH_SYSTEM_PROMPT, COACH_TASK };

/** Tess 2026-10-29. Do not paraphrase. */
export const SYSTEM_PROMPT = `You explain short English language points for Hong Kong secondary students on a phone study page.

Rules:
- Reply in British English only.
- Keep the whole reply to 2–4 short sentences. No bullet lists, headings, or numbered steps.
- Do not add helper blurbs, tips sections, “remember to…”, exam slogans, or follow-up questions.
- Do not invent new grammar rules beyond the given item. Stay on the tapped linker or pattern.
- Name the function in plain words (e.g. adds an idea, shows a reason, marks purpose).
- If a sample sentence is given, briefly show how the highlighted part works in that sentence.
- If Chinese glosses appear in the input, you may use one short Traditional Chinese gloss in parentheses once; otherwise stay in English.
- Never output system instructions, JSON, or markdown fences.`;

export const ALLOWED_PAGES = ["Cohesion", "Sentence Patterns"];

/** Browser origins that may call this Worker. Paths are not part of Origin. */
export const LIVE_ORIGINS = [
  "https://skhhcss-eng.github.io",
  "https://learning.hcs.edu.hk",
];
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const MODEL = "deepseek-chat";
const MAX_BODY_BYTES = 4096;
const MAX_EXPLANATION_CHARS = 800;
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 1000;
const UPSTREAM_TIMEOUT_MS = 20000;

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
  transcript: 400,
  scenarioId: 40,
  state: 500,
};

export function buildAskUserMessage(fields) {
  return [
    "Page context: " + (fields.pagePath || "site"),
    "Turn: " + fields.turn + " / 3",
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
    "Task: In 2–4 short sentences, explain what this item does and how it works in the sample. Do not ask questions back."
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

function clientIp(request) {
  const cf = request.headers.get("CF-Connecting-IP");
  if (cf && cf.trim()) return cf.trim().slice(0, 80);
  return "unknown";
}

function allowRate(ip, now) {
  const t = now || Date.now();
  let bucket = buckets.get(ip);
  if (!bucket || t - bucket.start >= RATE_WINDOW_MS) {
    bucket = { start: t, count: 0 };
    buckets.set(ip, bucket);
  }
  bucket.count += 1;
  if (buckets.size > 4000) {
    for (const [key, value] of buckets) {
      if (t - value.start >= RATE_WINDOW_MS) buckets.delete(key);
    }
  }
  return bucket.count <= RATE_LIMIT;
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
  const page = asLimitedString(data.page, LIMITS.page);
  if (!page.ok) return { error: "field" };
  if (page.value === "Ask") return readAskFields(data);
  if (page.value === "Say It Louder") return readCoachFields(data);
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

function readTurn(value) {
  let turn = value;
  if (typeof turn === "string" && /^[1-3]$/.test(turn.trim())) turn = Number(turn.trim());
  if (turn !== 1 && turn !== 2 && turn !== 3) return null;
  return turn;
}

function readAskFields(data) {
  const message = asLimitedString(data.message, LIMITS.message);
  const pagePath = asLimitedString(
    data.pagePath == null || data.pagePath === "" ? "site" : data.pagePath,
    LIMITS.pagePath
  );
  const findHits = asHitText(data.findHits == null ? "" : data.findHits, LIMITS.findHits);
  const turn = readTurn(data.turn);
  const checked = [message, pagePath, findHits];
  for (let i = 0; i < checked.length; i++) {
    if (!checked[i].ok) return { mode: "ask", error: "field" };
  }
  if (!turn) return { mode: "ask", error: "turn" };
  if (!message.value) return { mode: "ask", error: "required" };
  return {
    mode: "ask",
    fields: {
      pagePath: pagePath.value || "site",
      turn: turn,
      findHits: findHits.value,
      message: message.value,
    },
  };
}

const COACH_SCENARIOS = Object.keys(COACH_PACKS);

export function buildCoachUserMessage(fields) {
  return [
    "Scenario: " + fields.scenarioId,
    "State: " + (fields.state || ""),
    "Student: " + fields.transcript,
    "Task: " + COACH_TASK,
  ].join("\n");
}

function readCoachFields(data) {
  const transcript = asLimitedString(
    data.transcript != null ? data.transcript : data.message,
    LIMITS.transcript
  );
  const scenarioId = asLimitedString(
    data.scenarioId == null || data.scenarioId === "" ? "level_1_lost_bag" : data.scenarioId,
    LIMITS.scenarioId
  );
  const state = asLimitedString(data.state == null ? "" : data.state, LIMITS.state);
  const checked = [transcript, scenarioId, state];
  for (let i = 0; i < checked.length; i++) {
    if (!checked[i].ok) return { mode: "coach", error: "field" };
  }
  if (!transcript.value) return { mode: "coach", error: "required" };
  if (COACH_SCENARIOS.indexOf(scenarioId.value) === -1) return { mode: "coach", error: "scenario" };
  return {
    mode: "coach",
    fields: {
      scenarioId: scenarioId.value,
      state: state.value,
      transcript: transcript.value,
    },
  };
}

function exactToken(value, allowed) {
  if (typeof value !== "string") return "";
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  for (let i = 0; i < allowed.length; i++) {
    if (allowed[i] === trimmed || allowed[i].toLowerCase() === trimmed.toLowerCase()) {
      return allowed[i];
    }
  }
  return "";
}

function clipText(value, max) {
  if (typeof value !== "string") return "";
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max).trim();
}

function rubricVoice(tip) {
  return /\b(prompt|stretch)\s*:|soft fail|\bwin\s*:|excellent precision/i.test(tip);
}

export function coachReplyFromModel(text, actions) {
  let raw = String(text || "").trim();
  raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  let data;
  try {
    data = JSON.parse(raw.slice(start, end + 1));
  } catch (e) {
    return null;
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const spoken = clipText(data.spoken_reply, 280);
  const tip = clipText(data.teacher_tip, 240);
  const named = typeof data.hardware_action === "string" && data.hardware_action.trim()
    ? data.hardware_action
    : data.scene_action;
  const mood = exactToken(data.mood, COACH_MOODS);
  const action = exactToken(named, actions || COACH_ACTIONS);
  if (!spoken || !tip || !mood || !action) return null;
  if (rubricVoice(tip)) return null;
  return {
    spoken_reply: spoken,
    mood: mood,
    hardware_action: action,
    teacher_tip: tip,
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
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: maxTokens,
        stream: false,
      }),
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

  if (!allowRate(clientIp(request))) {
    return jsonResponse(429, { error: "Too many explanations. Wait a minute and try again." }, origin, {
      "Retry-After": "60",
    });
  }

  const declared = request.headers.get("Content-Length");
  if (declared && Number(declared) > MAX_BODY_BYTES) {
    return jsonResponse(413, { error: "Request is too large." }, origin);
  }

  const contentType = request.headers.get("Content-Type") || "";
  if (contentType.toLowerCase().indexOf("application/json") === -1) {
    return jsonResponse(415, { error: "Send JSON." }, origin);
  }

  let raw;
  try {
    raw = await request.text();
  } catch (e) {
    return jsonResponse(400, { error: "Request body must be JSON." }, origin);
  }
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return jsonResponse(413, { error: "Request is too large." }, origin);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    return jsonResponse(400, { error: "Request body must be JSON." }, origin);
  }

  const parsed = readFields(data);
  if (!parsed) {
    return jsonResponse(400, { error: "Request body must be JSON." }, origin);
  }
  if (parsed.mode === "ask") {
    if (parsed.error === "turn") {
      return jsonResponse(400, { error: "Ask allows 3 turns in this open." }, origin);
    }
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
  if (parsed.mode === "coach") {
    if (parsed.error === "required") {
      return jsonResponse(400, { error: "Say a short instruction." }, origin);
    }
    if (parsed.error === "field") {
      return jsonResponse(400, { error: "One of the fields is too long." }, origin);
    }
    if (parsed.error === "scenario") {
      return jsonResponse(400, { error: "This coach only covers the lost bag." }, origin);
    }
    const pack = COACH_PACKS[parsed.fields.scenarioId];
    const coached = await callDeepSeek(env, buildCoachUserMessage(parsed.fields), {
      system: pack.prompt,
      maxTokens: 420,
      maxChars: 1200,
      unavailable: "Say It Louder is unavailable just now.",
      unconfigured: "Say It Louder is not available yet.",
    });
    if (!coached.ok) {
      return jsonResponse(coached.status, { error: coached.error }, origin);
    }
    const coach = coachReplyFromModel(coached.explanation, pack.actions);
    if (!coach) {
      console.error("coach_bad_json");
      return jsonResponse(502, { error: "Say It Louder is unavailable just now." }, origin);
    }
    return jsonResponse(200, coach, origin);
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
