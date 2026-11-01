import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ASK_SYSTEM_PROMPT, ASK_TASK, COACH_SYSTEM_PROMPT, COACH_TASK, LIVE_ORIGINS, SYSTEM_PROMPT, buildAskUserMessage, buildCoachUserMessage, buildUserMessage, coachReplyFromModel, handleRequest } from "../src/index.js";

const TESS_PROMPT = `You explain short English language points for Hong Kong secondary students on a phone study page.

Rules:
- Reply in British English only.
- Keep the whole reply to 2–4 short sentences. No bullet lists, headings, or numbered steps.
- Do not add helper blurbs, tips sections, “remember to…”, exam slogans, or follow-up questions.
- Do not invent new grammar rules beyond the given item. Stay on the tapped linker or pattern.
- Name the function in plain words (e.g. adds an idea, shows a reason, marks purpose).
- If a sample sentence is given, briefly show how the highlighted part works in that sentence.
- If Chinese glosses appear in the input, you may use one short Traditional Chinese gloss in parentheses once; otherwise stay in English.
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
      "Task: In 2–4 short sentences, explain what this item does and how it works in the sample. Do not ask questions back.",
    ].join("\n")
  );
  assert.equal(message.includes("links a degree"), false);
});

test("source has no key and no canned soft-sample replies", () => {
  const src = [
    readFileSync(new URL("../src/index.js", import.meta.url), "utf8"),
    readFileSync(new URL("../src/askPrompt.js", import.meta.url), "utf8"),
    readFileSync(new URL("../src/coachPrompt.js", import.meta.url), "utf8"),
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
    assert.equal(sent.messages[0].content.includes("繁體中文"), false);
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

    let limitedStatus = 0;
    for (let i = 0; i < 11; i++) {
      const res = await handleRequest(post(cohesionBody, "203.0.113.50"), { DEEPSEEK_API_KEY: KEY });
      limitedStatus = res.status;
    }
    assert.equal(limitedStatus, 429);

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
      "Turn: 1 / 3",
      "Find hits (optional): Letter to the Editor — learning-materials/paper-2-exam-skills/letter-to-the-editor/",
      "Cohesion (Linking Words) — learning-materials/useful-vocabulary/#coh-h",
      "Student: 讀者來函在哪",
      "Task: " + ASK_TASK,
    ].join("\n")
  );
  assert.match(ASK_SYSTEM_PROMPT, /繁體中文/);
  assert.match(ASK_SYSTEM_PROMPT, /這次 Ask 已達 3 輪/);
  assert.equal(SYSTEM_PROMPT.includes("繁體中文"), false);
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

    const fourth = await handleRequest(post({ page: "Ask", turn: 4, message: "hello" }, "203.0.113.61"), { DEEPSEEK_API_KEY: KEY });
    assert.equal(fourth.status, 400);
    assert.equal((await fourth.json()).error, "Ask allows 3 turns in this open.");
    assert.equal(calls, 0);

    const ok = await handleRequest(post(askBody, "203.0.113.62"), { DEEPSEEK_API_KEY: KEY });
    const okJson = await ok.json();
    assert.equal(ok.status, 200);
    assert.equal(typeof okJson.reply, "string");
    assert.equal(okJson.explanation, undefined);
    assert.equal(calls, 1);
    const sent = JSON.parse(lastInit.init.body);
    assert.equal(sent.messages[0].content, ASK_SYSTEM_PROMPT);
    assert.equal(sent.max_tokens, 360);
    assert.match(sent.messages[1].content, /^Page context: site\nTurn: 1 \/ 3\n/);
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

test("Say It Louder is a page on the same worker and returns the coach contract", async () => {
  const message = buildCoachUserMessage({
    scenarioId: "level_1_lost_bag",
    state: "BAG_NAVY_SMALL=UNDER_SEAT; NAME_TAG=HIDDEN",
    transcript: "Look under the seats near the door.",
  });
  assert.match(message, /^Scenario: level_1_lost_bag\nState: BAG_NAVY_SMALL=UNDER_SEAT/);
  assert.match(message, /Student: Look under the seats near the door\./);
  assert.match(message, new RegExp(COACH_TASK.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(COACH_SYSTEM_PROMPT, /British English/);
  assert.match(COACH_SYSTEM_PROMPT, /hardware_action/);
  assert.equal(COACH_SYSTEM_PROMPT.includes("Prompt:"), false);
  assert.equal(COACH_SYSTEM_PROMPT.includes("sk-"), false);

  const fenced = coachReplyFromModel("```json\n{\"spoken_reply\":\"Near the door.\",\"mood\":\"PANICKED\",\"scene_action\":\"SEAT_NEAR_DOOR\",\"teacher_tip\":\"Add a colour.\"}\n```");
  assert.deepEqual(fenced, {
    spoken_reply: "Near the door.",
    mood: "PANICKED",
    hardware_action: "SEAT_NEAR_DOOR",
    teacher_tip: "Add a colour.",
  });
  assert.equal(coachReplyFromModel("{\"spoken_reply\":\"No.\",\"mood\":\"CONFUSED\",\"hardware_action\":\"HOVER_CONFUSED\",\"teacher_tip\":\"Prompt: navy vs black.\"}"), null);
  assert.equal(coachReplyFromModel("{\"spoken_reply\":\"No.\",\"mood\":\"ANGRY\",\"hardware_action\":\"NONE\",\"teacher_tip\":\"Try again.\"}"), null);

  const originalFetch = globalThis.fetch;
  let calls = 0;
  let lastInit = null;
  globalThis.fetch = async function (url, init) {
    calls += 1;
    lastInit = { url: String(url), init: init };
    return new Response(JSON.stringify({
      choices: [{ message: { content: "{\"spoken_reply\":\"Near the door? I'm looking.\",\"mood\":\"PANICKED\",\"scene_action\":\"SEAT_NEAR_DOOR\",\"teacher_tip\":\"Nice start. Add a colour or size so Leo knows which bag.\"}" } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const coachBody = {
      page: "Say It Louder",
      scenarioId: "level_1_lost_bag",
      state: "BAG_NAVY_SMALL=UNDER_SEAT",
      transcript: "Look under the seats near the door.",
    };
    const missing = await handleRequest(post({ page: "Say It Louder", transcript: "  " }, "203.0.113.70"), { DEEPSEEK_API_KEY: KEY });
    assert.equal(missing.status, 400);
    assert.equal((await missing.json()).error, "Say a short instruction.");
    assert.equal(calls, 0);

    const other = await handleRequest(post({
      page: "Say It Louder",
      scenarioId: "level_2_new",
      transcript: "Look near the door.",
    }, "203.0.113.71"), { DEEPSEEK_API_KEY: KEY });
    assert.equal(other.status, 400);
    assert.equal((await other.json()).error, "This coach only covers the lost bag.");
    assert.equal(calls, 0);

    const ok = await handleRequest(post(coachBody, "203.0.113.72"), { DEEPSEEK_API_KEY: KEY });
    const okJson = await ok.json();
    assert.equal(ok.status, 200);
    assert.deepEqual(Object.keys(okJson).sort(), ["hardware_action", "mood", "spoken_reply", "teacher_tip"]);
    assert.equal(okJson.hardware_action, "SEAT_NEAR_DOOR");
    assert.equal(okJson.scene_action, undefined);
    assert.equal(okJson.explanation, undefined);
    assert.equal(okJson.reply, undefined);
    assert.equal(calls, 1);
    const sent = JSON.parse(lastInit.init.body);
    assert.equal(sent.messages[0].content, COACH_SYSTEM_PROMPT);
    assert.equal(sent.max_tokens, 420);
    assert.match(sent.messages[1].content, /^Scenario: level_1_lost_bag\n/);
    assert.equal(sent.messages[0].content === SYSTEM_PROMPT, false);
    assert.equal(sent.messages[0].content === ASK_SYSTEM_PROMPT, false);
    assert.equal(lastInit.init.headers.Authorization, "Bearer " + KEY);
    assert.equal(JSON.stringify(okJson).includes(KEY), false);

    globalThis.fetch = async function () {
      return new Response(JSON.stringify({
        choices: [{ message: { content: "{\"spoken_reply\":\"Nope.\",\"mood\":\"CONFUSED\",\"hardware_action\":\"NOT_A_PROP\",\"teacher_tip\":\"Try again.\"}" } }],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    };
    const bad = await handleRequest(post(coachBody, "203.0.113.73"), { DEEPSEEK_API_KEY: KEY });
    assert.equal(bad.status, 502);
    assert.equal((await bad.json()).error, "Say It Louder is unavailable just now.");

    const bare = await handleRequest(post(coachBody, "203.0.113.74"), {});
    assert.equal(bare.status, 503);
    assert.equal((await bare.json()).error, "Say It Louder is not available yet.");

    const explain = await handleRequest(post(cohesionBody, "203.0.113.75"), { DEEPSEEK_API_KEY: KEY });
    assert.equal(explain.status, 200);
    assert.equal(typeof (await explain.json()).explanation, "string");
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
      choices: [{ message: { content: "{\"spoken_reply\":\"Near the door.\",\"mood\":\"PANICKED\",\"hardware_action\":\"SEAT_NEAR_DOOR\",\"teacher_tip\":\"Add a colour.\"}" } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const lms = "https://learning.hcs.edu.hk";
  const coachBody = {
    page: "Say It Louder",
    scenarioId: "level_1_lost_bag",
    transcript: "Look under the seats near the door.",
  };
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

    const ok = await handleRequest(post(coachBody, "203.0.113.90", lms), { DEEPSEEK_API_KEY: KEY });
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get("Access-Control-Allow-Origin"), lms);
    assert.equal((await ok.json()).hardware_action, "SEAT_NEAR_DOOR");

    const pages = await handleRequest(post(cohesionBody, "203.0.113.91", "https://skhhcss-eng.github.io"), { DEEPSEEK_API_KEY: KEY });
    assert.equal(pages.status, 200);
    assert.equal(pages.headers.get("Access-Control-Allow-Origin"), "https://skhhcss-eng.github.io");

    const lookalike = await handleRequest(post(coachBody, "203.0.113.92", "https://learning.hcs.edu.hk.evil.example"), { DEEPSEEK_API_KEY: KEY });
    assert.equal(lookalike.status, 403);

    const withPath = await handleRequest(post(coachBody, "203.0.113.93", "https://learning.hcs.edu.hk/english/"), { DEEPSEEK_API_KEY: KEY });
    assert.equal(withPath.status, 403);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Say It Louder coach accepts the school map walk", async () => {
  const originalFetch = globalThis.fetch;
  let lastInit = null;
  globalThis.fetch = async function (url, init) {
    lastInit = { url: String(url), init: init };
    return new Response(JSON.stringify({
      choices: [{ message: { content: "{\"spoken_reply\":\"Library doors — I'm in!\",\"mood\":\"RELIEVED\",\"hardware_action\":\"ARRIVE_LIBRARY\",\"teacher_tip\":\"Clear directions did it.\"}" } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const ok = await handleRequest(post({
      page: "Say It Louder",
      scenarioId: "level_2_map_walk",
      state: "LIBRARY=AHEAD",
      transcript: "Go into the library.",
    }, "203.0.113.94"), { DEEPSEEK_API_KEY: KEY });
    const body = await ok.json();
    assert.equal(ok.status, 200);
    assert.equal(body.hardware_action, "ARRIVE_LIBRARY");
    assert.equal(body.mood, "RELIEVED");
    const sent = JSON.parse(lastInit.init.body);
    assert.match(sent.messages[0].content, /ARRIVE_LIBRARY/);
    assert.match(sent.messages[0].content, /School Map Walk/);
    assert.equal(sent.messages[0].content === COACH_SYSTEM_PROMPT, false);

    const bagToken = coachReplyFromModel(
      "{\"spoken_reply\":\"No.\",\"mood\":\"CONFUSED\",\"hardware_action\":\"BAG_NAVY_SMALL\",\"teacher_tip\":\"That is the wrong mission.\"}",
      ["ARRIVE_LIBRARY", "NONE", "HOVER_CONFUSED"]
    );
    assert.equal(bagToken, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
