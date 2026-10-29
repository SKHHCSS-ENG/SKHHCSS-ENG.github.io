/**
 * DeepSeek Explain proxy for the Eng subject site.
 * The API key lives only in the Worker secret DEEPSEEK_API_KEY.
 * Do not hardcode it, and do not log it.
 *
 * System prompt: Tess 2026-10-29 (verbatim). Soft samples in the prompt pack
 * are tone reference only — this worker always calls the API.
 */

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

const LIVE_ORIGIN = "https://skhhcss-eng.github.io";
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
};

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
  if (origin === LIVE_ORIGIN) return true;
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

function capExplanation(text) {
  if (text.length <= MAX_EXPLANATION_CHARS) return text;
  return text.slice(0, MAX_EXPLANATION_CHARS).trim();
}

async function callDeepSeek(env, userMessage) {
  const key = env && env.DEEPSEEK_API_KEY;
  if (!key || typeof key !== "string" || !key.trim()) {
    return { ok: false, status: 503, error: "Explain is not available yet." };
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
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 220,
        stream: false,
      }),
    });
  } catch (e) {
    console.error("deepseek_fetch_failed");
    return { ok: false, status: 502, error: "Explain is unavailable just now." };
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    console.error("deepseek_upstream " + res.status);
    return { ok: false, status: 502, error: "Explain is unavailable just now." };
  }
  let data;
  try {
    data = await res.json();
  } catch (e) {
    console.error("deepseek_bad_json");
    return { ok: false, status: 502, error: "Explain is unavailable just now." };
  }
  const choice = data && data.choices && data.choices[0] && data.choices[0].message;
  const text = capExplanation(messageText(choice && choice.content));
  if (!text) {
    console.error("deepseek_empty");
    return { ok: false, status: 502, error: "Explain is unavailable just now." };
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
