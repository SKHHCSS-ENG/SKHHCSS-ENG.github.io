import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ASK_SYSTEM_PROMPT, ASK_TASK, LIVE_ORIGINS, SYSTEM_PROMPT, buildAskUserMessage, buildUserMessage, handleRequest } from "../src/index.js";

const TESS_PROMPT = `You explain short English language points for Hong Kong secondary students on a phone study page.

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

const KEY = "unit-test-key-do-not-log";

function post(body, ip, origin) {
  return new Request("https://deepseek-explain.example.workers.dev/", {
    method: "POST",
    headers: {
      "Origin": origin || "https://skhhcss-eng.github.io",
      "Content-Type": "application/json",
      "CF-Connecting-IP": ip || "203.0.113.10",
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const cohesionBody = {
  page: "Cohesion",
  itemLabel: "furthermore",
  category: "Sequence / Add Ideas",
  sampleText: "Furthermore, recycling bins should be placed near every classroom.",
  highlight: "Furthermore",
  gloss: "此外",
  locale: "en-GB",
};

test("system prompt is Tess’s text, verbatim", () => {
  assert.equal(SYSTEM_PROMPT, TESS_PROMPT);
});

test("user message fills the template and does not invent a reply", () => {
  const message = buildUserMessage({
    page: "Sentence Patterns",
    label: "so… that…",
    category: "Building",
    sample: "The hall was so full that some students had to stand.",
    highlight: "so / that",
    gloss: "",
  });
  assert.equal(
    message,
    [
      "Page: Sentence Patterns",
      "Item: so… that…",
      "Category: Building",
      "Sample: The hall was so full that some students had to stand. Highlight: so / that",
      "Task: 用2至4句繁體中文短句，解釋這個項目的作用，並說明它在例句中如何運作。保留英文連結詞／句式／Aspects 名稱原樣。不要反問學生。",
    ].join("\n")
  );
  assert.equal(message.includes("links a degree"), false);
});

test("source has no key and no canned soft-sample replies", () => {
  const src = [
    readFileSync(new URL("../src/index.js", import.meta.url), "utf8"),
    readFileSync(new URL("../src/askPrompt.js", import.meta.url), "utf8"),
    readFileSync(new URL("../src/speakNovel.js", import.meta.url), "utf8"),
  ].join("\n");
  assert.equal(src.includes("PLACEHOLDER_SYSTEM_PROMPT"), false);
  assert.equal(src.includes(KEY), false);
  assert.equal(src.includes("sk-"), false);
  assert.equal(src.includes("adds another supporting point"), false);
  assert.equal(src.includes("introduces a reason and is followed"), false);
  assert.equal(src.includes("links a degree to a result"), false);
  assert.equal(src.includes("在 Paper 2 - Writing Formats 下的書信區"), false);
  assert.equal(src.includes("今晚吃什麼"), false);
});

test("requests: cors, validation, rate limit, and a live API call", async () => {
  const logs = [];
  const originalError = console.error;
  console.error = function () {
    logs.push(Array.from(arguments).join(" "));
  };
  const originalFetch = globalThis.fetch;
  let calls = 0;
  let lastInit = null;
  globalThis.fetch = async function (url, init) {
    calls += 1;
    lastInit = { url: String(url), init: init };
    return new Response(JSON.stringify({
      choices: [{ message: { content: "  Furthermore adds another idea in the same direction.  " } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    const preflight = await handleRequest(new Request("https://deepseek-explain.example.workers.dev/", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:8765",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
      },
    }), { DEEPSEEK_API_KEY: KEY });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), "http://localhost:8765");
    assert.equal(preflight.headers.get("Access-Control-Allow-Private-Network"), "true");
    assert.equal(calls, 0);

    const blocked = await handleRequest(post(cohesionBody, "203.0.113.20", "https://evil.example"), { DEEPSEEK_API_KEY: KEY });
    assert.equal(blocked.status, 403);
    assert.equal(blocked.headers.get("Access-Control-Allow-Origin"), null);

    const missingOrigin = await handleRequest(new Request("https://deepseek-explain.example.workers.dev/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cohesionBody),
    }), { DEEPSEEK_API_KEY: KEY });
    assert.equal(missingOrigin.status, 403);

    const get = await handleRequest(new Request("https://deepseek-explain.example.workers.dev/", {
      method: "GET",
      headers: { Origin: "https://skhhcss-eng.github.io" },
    }), { DEEPSEEK_API_KEY: KEY });
    assert.equal(get.status, 405);

    const empty = await handleRequest(post({ page: "Cohesion", itemLabel: "  ", sampleText: "" }, "203.0.113.21"), { DEEPSEEK_API_KEY: KEY });
    const emptyJson = await empty.json();
    assert.equal(empty.status, 400);
    assert.equal(emptyJson.error, "Page, item and sample are required.");

    const badPage = await handleRequest(post({
      page: "Free chat",
      itemLabel: "hello",
      sampleText: "Hello there.",
    }, "203.0.113.22"), { DEEPSEEK_API_KEY: KEY });
    assert.equal(badPage.status, 400);

    const huge = "x".repeat(5000);
    const oversized = await handleRequest(post(huge, "203.0.113.23"), { DEEPSEEK_API_KEY: KEY });
    assert.equal(oversized.status, 413);

    const ok = await handleRequest(post(cohesionBody, "203.0.113.24"), { DEEPSEEK_API_KEY: KEY });
    const okJson = await ok.json();
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get("Access-Control-Allow-Origin"), "https://skhhcss-eng.github.io");
    assert.equal(okJson.explanation, "Furthermore adds another idea in the same direction.");
    assert.equal(calls, 1);
    assert.equal(lastInit.url, "https://api.deepseek.com/chat/completions");
    const sent = JSON.parse(lastInit.init.body);
    assert.equal(sent.model, "deepseek-chat");
    assert.equal(sent.messages[0].role, "system");
    assert.equal(sent.messages[0].content, TESS_PROMPT);
    assert.equal(sent.messages[1].role, "user");
    assert.match(sent.messages[1].content, /^Page: Cohesion\nItem: furthermore\n/);
    assert.match(sent.messages[1].content, /Highlight: Furthermore/);
    assert.match(sent.messages[1].content, /Gloss: 此外/);
    assert.equal(sent.messages[1].content.includes("en-GB"), false);
    assert.equal(sent.max_tokens, 220);
    assert.match(sent.messages[0].content, /繁體中文/);
    assert.match(sent.messages[1].content, /Task: 用2至4句繁體中文短句/);
    assert.equal(sent.messages[0].content.includes("British English"), false);
    assert.equal(lastInit.init.headers.Authorization, "Bearer " + KEY);
    assert.equal(JSON.stringify(okJson).includes(KEY), false);

    const listed = await handleRequest(post({
      page: "Sentence Patterns",
      itemLabel: "so… that…",
      category: "Building",
      sampleText: "The hall was so full that some students had to stand.",
      highlight: ["so", "that"],
    }, "203.0.113.27"), { DEEPSEEK_API_KEY: KEY });
    assert.equal(listed.status, 200);
    const listedSent = JSON.parse(lastInit.init.body);
    assert.match(listedSent.messages[1].content, /Highlight: so \/ that/);
    assert.equal(listedSent.messages[1].content.includes("Gloss:"), false);

    globalThis.fetch = async function () {
      throw new Error("network down " + KEY);
    };
    const down = await handleRequest(post(cohesionBody, "203.0.113.25"), { DEEPSEEK_API_KEY: KEY });
    const downJson = await down.json();
    assert.equal(down.status, 502);
    assert.equal(downJson.explanation, undefined);
    assert.equal(JSON.stringify(downJson).includes("recycling bins"), false);
    assert.equal(JSON.stringify(downJson).includes(KEY), false);

    const unconfigured = await handleRequest(post({
      page: "Sentence Patterns",
      label: "because / when",
      sample: "We stayed after school because we had a rehearsal.",
      highlight: ["because"],
    }, "203.0.113.26"), {});
    assert.equal(unconfigured.status, 503);

    const limited = [];
    for (let i = 0; i < 31; i++) {
      const res = await handleRequest(post(cohesionBody, "203.0.113.50"), { DEEPSEEK_API_KEY: KEY });
      limited.push(res.status);
    }
    assert.equal(limited[29] === 429, false);
    assert.equal(limited[30], 429);

    const logText = logs.join("\n");
    assert.equal(logText.includes(KEY), false);
    assert.match(logText, /deepseek_fetch_failed/);
  } finally {
    console.error = originalError;
    globalThis.fetch = originalFetch;
  }
});

test("Ask user message follows Tess’s template", () => {
  const message = buildAskUserMessage({
    pagePath: "/learning-materials/useful-vocabulary/",
    turn: 1,
    findHits: "Letter to the Editor — learning-materials/paper-2-exam-skills/letter-to-the-editor/\nCohesion (Linking Words) — learning-materials/useful-vocabulary/#coh-h",
    message: "讀者來函在哪",
  });
  assert.equal(
    message,
    [
      "Page context: /learning-materials/useful-vocabulary/",
      "Turn: 1 / 5",
      "Find hits (optional): Letter to the Editor — learning-materials/paper-2-exam-skills/letter-to-the-editor/",
      "Cohesion (Linking Words) — learning-materials/useful-vocabulary/#coh-h",
      "Student: 讀者來函在哪",
      "Task: " + ASK_TASK,
    ].join("\n")
  );
  assert.match(ASK_SYSTEM_PROMPT, /繁體中文/);
  assert.match(ASK_SYSTEM_PROMPT, /After the \*\*5th\*\* assistant reply in this open, end with: 這次 Ask 已達 5 輪。請改用上方 Find 找頁面，或到樣本下的 Explain 查看該項目。/);
  assert.equal(ASK_SYSTEM_PROMPT.includes("已達 3 輪"), false);
  assert.equal(ASK_SYSTEM_PROMPT.includes("3rd"), false);
  assert.match(ASK_TASK, /用2至4句/);
  assert.match(ASK_TASK, /若 Turn 已是 5，結尾加上五輪提示。/);
  assert.match(SYSTEM_PROMPT, /繁體中文/);
  assert.match(SYSTEM_PROMPT, /書面語/);
  assert.equal(SYSTEM_PROMPT.includes("British English"), false);
  assert.equal(ASK_SYSTEM_PROMPT === SYSTEM_PROMPT, false);
});

test("Ask is a page mode on the same worker and does not replace Explain", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  let lastInit = null;
  globalThis.fetch = async function (url, init) {
    calls += 1;
    lastInit = { url: String(url), init: init };
    return new Response(JSON.stringify({
      choices: [{ message: { content: "Letter to the Editor 在寫作格式頁。可開啟 learning-materials/paper-2-exam-skills/letter-to-the-editor/ 。" } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const askBody = {
      page: "Ask",
      pagePath: "site",
      turn: 1,
      findHits: "",
      message: "讀者來函在哪",
    };
    const missing = await handleRequest(post({ page: "Ask", turn: 1, message: "  " }, "203.0.113.60"), { DEEPSEEK_API_KEY: KEY });
    assert.equal(missing.status, 400);
    assert.equal((await missing.json()).error, "Type a short question.");
    assert.equal(calls, 0);

    const sixth = await handleRequest(post({ page: "Ask", turn: 6, message: "hello" }, "203.0.113.61"), { DEEPSEEK_API_KEY: KEY });
    assert.equal(sixth.status, 400);
    assert.equal((await sixth.json()).error, "Ask allows 5 turns in this open.");
    assert.equal(calls, 0);

    const fifth = await handleRequest(post({ page: "Ask", turn: 5, message: "第五輪" }, "203.0.113.66"), { DEEPSEEK_API_KEY: KEY });
    assert.equal(fifth.status, 200);
    assert.equal(typeof (await fifth.json()).reply, "string");
    assert.equal(calls, 1);
    assert.match(JSON.parse(lastInit.init.body).messages[1].content, /Turn: 5 \/ 5\n/);

    const fifthText = await handleRequest(post({ page: "Ask", turn: "5", message: "第五輪文字" }, "203.0.113.67"), { DEEPSEEK_API_KEY: KEY });
    assert.equal(fifthText.status, 200);
    assert.equal(calls, 2);

    const ok = await handleRequest(post(askBody, "203.0.113.62"), { DEEPSEEK_API_KEY: KEY });
    const okJson = await ok.json();
    assert.equal(ok.status, 200);
    assert.equal(typeof okJson.reply, "string");
    assert.equal(okJson.explanation, undefined);
    assert.equal(calls, 3);
    const sent = JSON.parse(lastInit.init.body);
    assert.equal(sent.messages[0].content, ASK_SYSTEM_PROMPT);
    assert.equal(sent.max_tokens, 360);
    assert.match(sent.messages[1].content, /^Page context: site\nTurn: 1 \/ 5\n/);
    assert.equal(sent.messages[0].content === SYSTEM_PROMPT, false);

    const explain = await handleRequest(post(cohesionBody, "203.0.113.63"), { DEEPSEEK_API_KEY: KEY });
    const explainJson = await explain.json();
    assert.equal(explain.status, 200);
    assert.equal(typeof explainJson.explanation, "string");
    assert.equal(explainJson.reply, undefined);
    const explainSent = JSON.parse(lastInit.init.body);
    assert.equal(explainSent.messages[0].content, SYSTEM_PROMPT);
    assert.equal(explainSent.max_tokens, 220);

    const bare = await handleRequest(post(askBody, "203.0.113.64"), {});
    assert.equal(bare.status, 503);
    assert.equal((await bare.json()).error, "Ask is not available yet.");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GitHub Pages and the school LMS share one allowlist", async () => {
  assert.deepEqual(LIVE_ORIGINS, [
    "https://skhhcss-eng.github.io",
    "https://learning.hcs.edu.hk",
  ]);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async function () {
    return new Response(JSON.stringify({
      choices: [{ message: { content: "Furthermore adds another idea in the same direction." } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const lms = "https://learning.hcs.edu.hk";
  try {
    const preflight = await handleRequest(new Request("https://deepseek-explain.example.workers.dev/", {
      method: "OPTIONS",
      headers: {
        Origin: lms,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
      },
    }), { DEEPSEEK_API_KEY: KEY });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), lms);

    const ok = await handleRequest(post(cohesionBody, "203.0.113.90", lms), { DEEPSEEK_API_KEY: KEY });
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get("Access-Control-Allow-Origin"), lms);
    assert.equal(typeof (await ok.json()).explanation, "string");

    const pages = await handleRequest(post(cohesionBody, "203.0.113.91", "https://skhhcss-eng.github.io"), { DEEPSEEK_API_KEY: KEY });
    assert.equal(pages.status, 200);
    assert.equal(pages.headers.get("Access-Control-Allow-Origin"), "https://skhhcss-eng.github.io");

    const ask = await handleRequest(post({
      page: "Ask",
      pagePath: "site",
      turn: 1,
      message: "Where is cohesion?",
    }, "203.0.113.94", lms), { DEEPSEEK_API_KEY: KEY });
    assert.equal(ask.status, 200);
    assert.equal(typeof (await ask.json()).reply, "string");

    const sp = await handleRequest(post({
      page: "Sentence Patterns",
      itemLabel: "so… that…",
      sampleText: "The hall was so full that some students had to stand.",
    }, "203.0.113.95", lms), { DEEPSEEK_API_KEY: KEY });
    assert.equal(sp.status, 200);
    assert.equal(typeof (await sp.json()).explanation, "string");

    const lookalike = await handleRequest(post(cohesionBody, "203.0.113.92", "https://learning.hcs.edu.hk.evil.example"), { DEEPSEEK_API_KEY: KEY });
    assert.equal(lookalike.status, 403);

    const withPath = await handleRequest(post(cohesionBody, "203.0.113.93", "https://learning.hcs.edu.hk/english/"), { DEEPSEEK_API_KEY: KEY });
    assert.equal(withPath.status, 403);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
