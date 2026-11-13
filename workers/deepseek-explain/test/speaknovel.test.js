import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ASK_SYSTEM_PROMPT,
  LIVE_ORIGINS,
  MAX_BODY_BYTES,
  MAX_SPEAKNOVEL_BODY_BYTES,
  SPEAKNOVEL_RATE_LIMIT,
  SYSTEM_PROMPT,
  handleRequest,
} from "../src/index.js";
import {
  SPEAKNOVEL_SYSTEM_PROMPT,
  buildSpeakNovelUserMessage,
  judgeSpeakNovel,
  usedTargetGrammar,
} from "../src/speakNovel.js";

const KEY = "unit-test-key-do-not-log";

const startGrammar = {
  item: "Polite Modals & Offers",
  patterns: [
    "I am terribly sorry! Allow me to ___ right away.",
    "Would you mind waiting a moment while I ___?",
  ],
  keywords: ["allow me", "let me", "would you mind", "could i", "right away", "terribly sorry", "i'm sorry", "i am sorry"],
};

const orderGrammar = {
  item: "Quantity & Custom Orders",
  patterns: ["One taro milk tea, half sugar and less ice, please."],
  keywords: ["half sugar", "50%", "less ice", "little ice", "taro", "milk tea"],
};

const startBranches = [
  { condition: "Polite offer", targetNode: "node_remake", label: "Polite & helpful offer", kind: "success" },
  { condition: "Vague apology", targetNode: "node_manager", label: "Vague / unhelpful apology", kind: "retry" },
  { condition: "Rude", targetNode: "ending_viral_fail", label: "Rude / blaming (fail)", kind: "fail" },
  { condition: "Joke", targetNode: "ending_meme_fashion", label: "Silly / creative (meme)", kind: "meme" },
];

const goldenBranches = [
  { condition: "Both half sugar and less ice", targetNode: "ending_golden", label: "Accurate custom order (golden)", kind: "golden" },
  { condition: "Missed half sugar or less ice", targetNode: "ending_brainfreeze", label: "Messed-up order", kind: "fail" },
];

function post(body, ip, origin) {
  return new Request("https://deepseek-explain.example.workers.dev/", {
    method: "POST",
    headers: {
      Origin: origin || "https://skhhcss-eng.github.io",
      "Content-Type": "application/json",
      "CF-Connecting-IP": ip || "203.0.113.10",
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function sceneBody(transcript, extra) {
  const body = {
    mode: "speaknovel",
    episode: "ep1_boba",
    nodeKey: "node_start",
    transcript: transcript,
    node: {
      speaker: "Angry Customer (Ken)",
      defaultLine: "Hey!! The lid popped off! What are you going to do about this?!",
      goalHint: "Apologise politely and offer a concrete fix.",
      targetGrammar: startGrammar,
      branches: startBranches,
    },
  };
  if (extra) {
    Object.keys(extra).forEach(function (key) {
      if (key === "node") body.node = Object.assign({}, body.node, extra.node);
      else body[key] = extra[key];
    });
  }
  return body;
}

function modelJson(fields) {
  return JSON.stringify({
    choices: [{ message: { content: JSON.stringify(fields) } }],
  });
}

const goodLine = "I am terribly sorry! Allow me to remake your drink right away.";
const goodModel = {
  chosen_target_node: "node_remake",
  used_target_grammar: true,
  grammar_score: 5,
  character_reaction: "Alright… thank you. That helps.",
  teacher_tip: "Nice work — practise Allow me to… and name the fix you will make.",
};

test("target grammar heuristic rejects a vague line and accepts a real pattern", () => {
  assert.equal(usedTargetGrammar("sorry", startGrammar), false);
  assert.equal(usedTargetGrammar("I'm sorry", startGrammar), false);
  assert.equal(usedTargetGrammar("I’m terribly sorry about your hoodie", startGrammar), false);
  assert.equal(usedTargetGrammar("Allow me", startGrammar), false);
  assert.equal(usedTargetGrammar(goodLine, startGrammar), true);
  assert.equal(usedTargetGrammar("Allow me to wipe the table.", startGrammar), true);
  assert.equal(usedTargetGrammar("Would you mind waiting while I fetch napkins?", startGrammar), true);
  assert.equal(usedTargetGrammar("half sugar", orderGrammar), false);
  assert.equal(usedTargetGrammar("One taro milk tea, half sugar and less ice, please.", orderGrammar), true);
  assert.equal(usedTargetGrammar("Could you make it with oat milk?", {
    item: "Requests",
    patterns: ["Could you make it with ___?"],
    keywords: [],
  }), true);
  assert.equal(usedTargetGrammar("hello", {
    item: "Requests",
    patterns: ["Could you make it with ___?"],
    keywords: [],
  }), false);
});

test("judge keeps a success branch only when the line used the grammar", () => {
  const fields = sceneBody(goodLine);
  const kept = judgeSpeakNovel(JSON.stringify(goodModel), {
    transcript: goodLine,
    targetGrammar: startGrammar,
    branches: startBranches,
  });
  assert.equal(kept.chosen_target_node, "node_remake");
  assert.equal(kept.used_target_grammar, true);
  assert.equal(kept.grammar_score, 5);
  assert.equal(kept.character_reaction, goodModel.character_reaction);
  assert.equal(kept.teacher_tip, goodModel.teacher_tip);

  const vague = judgeSpeakNovel(JSON.stringify({
    chosen_target_node: "node_remake",
    used_target_grammar: true,
    grammar_score: 5,
    character_reaction: "Just sorry? That is not enough! Call the manager.",
    teacher_tip: "Add Allow me to and name one fix you will make.",
  }), {
    transcript: "sorry",
    targetGrammar: startGrammar,
    branches: startBranches,
  });
  assert.equal(vague.used_target_grammar, false);
  assert.equal(vague.chosen_target_node, "node_manager");
  assert.equal(vague.grammar_score <= 2, true);
  assert.equal(vague.grammar_score >= 1, true);

  const golden = judgeSpeakNovel(JSON.stringify({
    chosen_target_node: "ending_golden",
    used_target_grammar: true,
    grammar_score: 4,
    character_reaction: "Perfect — half sugar, less ice. Thank you!",
    teacher_tip: "Say both half sugar and less ice in one order.",
  }), {
    transcript: "half sugar",
    targetGrammar: orderGrammar,
    branches: goldenBranches,
  });
  assert.equal(golden.used_target_grammar, false);
  assert.equal(golden.chosen_target_node, "ending_brainfreeze");

  const labelled = judgeSpeakNovel(JSON.stringify({
    chosen_target_node: "node_ok",
    used_target_grammar: true,
    grammar_score: 4,
    character_reaction: "That still is not a real offer.",
    teacher_tip: "Practise Allow me to and name the fix.",
  }), {
    transcript: "sorry",
    targetGrammar: startGrammar,
    branches: [
      { targetNode: "node_ok", label: "Success path" },
      { targetNode: "node_again", label: "Please try again", kind: "clarification" },
    ],
  });
  assert.equal(labelled.used_target_grammar, false);
  assert.equal(labelled.chosen_target_node, "node_again");

  const meme = judgeSpeakNovel(JSON.stringify({
    chosen_target_node: "ending_meme_fashion",
    used_target_grammar: false,
    grammar_score: 1,
    character_reaction: "Wait… fashion? You might be onto something.",
    teacher_tip: "For the helpful path, practise Allow me to and offer a fix.",
  }), {
    transcript: "the stain looks like streetwear",
    targetGrammar: startGrammar,
    branches: startBranches,
  });
  assert.equal(meme.chosen_target_node, "ending_meme_fashion");
  assert.equal(meme.used_target_grammar, false);

  const fenced = judgeSpeakNovel("```json\n" + JSON.stringify(Object.assign({}, goodModel, {
    character_reaction: "Thank you. I needed that. Here is a third sentence.",
    teacher_tip: "Practise Allow me to. Then name the fix.",
    grammar_score: 0,
  })) + "\n```", {
    transcript: goodLine,
    targetGrammar: startGrammar,
    branches: startBranches,
  });
  assert.equal(fenced.character_reaction, "Thank you. I needed that.");
  assert.equal(fenced.teacher_tip, "Practise Allow me to.");
  assert.equal(fenced.grammar_score, 1);
  assert.equal(judgeSpeakNovel("nope", fields), null);
});

test("SpeakNovel returns the game schema and does not replace Ask or Explain", async () => {
  assert.deepEqual(LIVE_ORIGINS, [
    "https://skhhcss-eng.github.io",
    "https://learning.hcs.edu.hk",
  ]);
  assert.equal(MAX_BODY_BYTES, 4096);
  assert.equal(MAX_SPEAKNOVEL_BODY_BYTES, 24576);
  assert.equal(SPEAKNOVEL_RATE_LIMIT, 20);
  assert.match(SPEAKNOVEL_SYSTEM_PROMPT, /British English/);
  assert.match(SPEAKNOVEL_SYSTEM_PROMPT, /encouraging/);
  assert.match(SPEAKNOVEL_SYSTEM_PROMPT, /apologise/);
  assert.match(SPEAKNOVEL_SYSTEM_PROMPT, /practise/);
  assert.equal(SPEAKNOVEL_SYSTEM_PROMPT.includes("繁體中文"), false);
  assert.equal(SPEAKNOVEL_SYSTEM_PROMPT.includes("hardware_action"), false);
  assert.equal(SYSTEM_PROMPT.includes("British English"), false);

  const indexSrc = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
  assert.equal(indexSrc.includes("coachPrompt"), false);
  assert.equal(indexSrc.includes('page.value === "Say It Louder"'), false);
  assert.equal(indexSrc.includes("hardware_action"), false);

  const userMessage = buildSpeakNovelUserMessage({
    episode: "ep1_boba",
    nodeKey: "node_start",
    speaker: "Angry Customer (Ken)",
    defaultLine: "What are you going to do about this?!",
    goalHint: "Apologise and offer a fix.",
    targetGrammar: startGrammar,
    branches: startBranches,
    transcript: goodLine,
  });
  assert.match(userMessage, /Student: I am terribly sorry!/);
  assert.match(userMessage, /node_remake/);
  assert.match(userMessage, /node_manager/);

  const originalFetch = globalThis.fetch;
  let calls = 0;
  let lastInit = null;
  globalThis.fetch = async function (url, init) {
    calls += 1;
    lastInit = { url: String(url), init: init };
    const sent = JSON.parse(init.body);
    const student = sent.messages[1].content;
    if (student.indexOf("Page: Cohesion") === 0) {
      return new Response(JSON.stringify({
        choices: [{ message: { content: "Furthermore 用來補充同一方向的論點。" } }],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (student.indexOf("Page context:") === 0) {
      return new Response(JSON.stringify({
        choices: [{ message: { content: "Letter to the Editor 在寫作格式頁。" } }],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(modelJson(goodModel), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    const blocked = await handleRequest(post(sceneBody(goodLine), "203.0.113.120", "https://evil.example"), { DEEPSEEK_API_KEY: KEY });
    assert.equal(blocked.status, 403);
    assert.equal(calls, 0);

    const oldCoach = await handleRequest(post({
      page: "Say It Louder",
      itemLabel: "lost bag",
      sampleText: "Pick up the navy bag.",
      transcript: goodLine,
      scenarioId: "level_1_lost_bag",
    }, "203.0.113.121"), { DEEPSEEK_API_KEY: KEY });
    assert.equal(oldCoach.status, 400);
    assert.equal((await oldCoach.json()).error, "This explain service only covers Cohesion, Aspects, and Sentence Patterns.");
    assert.equal(calls, 0);

    const missing = await handleRequest(post({ mode: "speaknovel", episode: "ep1_boba" }, "203.0.113.122"), { DEEPSEEK_API_KEY: KEY });
    assert.equal(missing.status, 400);
    assert.equal((await missing.json()).error, "Episode, scene, line, and branches are required.");
    assert.equal(calls, 0);

    const ok = await handleRequest(post(sceneBody(goodLine), "203.0.113.123"), { DEEPSEEK_API_KEY: KEY });
    const okJson = await ok.json();
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get("Access-Control-Allow-Origin"), "https://skhhcss-eng.github.io");
    assert.deepEqual(Object.keys(okJson).sort(), [
      "character_reaction",
      "chosen_target_node",
      "grammar_score",
      "teacher_tip",
      "used_target_grammar",
    ]);
    assert.equal(okJson.chosen_target_node, "node_remake");
    assert.equal(okJson.used_target_grammar, true);
    assert.equal(okJson.grammar_score, 5);
    assert.equal(typeof okJson.character_reaction, "string");
    assert.equal(typeof okJson.teacher_tip, "string");
    assert.equal(calls, 1);
    const sent = JSON.parse(lastInit.init.body);
    assert.equal(sent.model, "deepseek-chat");
    assert.equal(sent.messages[0].content, SPEAKNOVEL_SYSTEM_PROMPT);
    assert.equal(sent.messages[0].content === SYSTEM_PROMPT, false);
    assert.equal(sent.messages[0].content === ASK_SYSTEM_PROMPT, false);
    assert.equal(sent.max_tokens, 500);
    assert.deepEqual(sent.response_format, { type: "json_object" });
    assert.match(sent.messages[1].content, /Student: I am terribly sorry!/);
    assert.equal(lastInit.init.headers.Authorization, "Bearer " + KEY);
    assert.equal(JSON.stringify(okJson).includes(KEY), false);

    const explain = await handleRequest(post({
      page: "Cohesion",
      itemLabel: "furthermore",
      sampleText: "Furthermore, recycling bins should be placed near every classroom.",
    }, "203.0.113.124"), { DEEPSEEK_API_KEY: KEY });
    const explainJson = await explain.json();
    assert.equal(explain.status, 200);
    assert.equal(typeof explainJson.explanation, "string");
    assert.equal(explainJson.chosen_target_node, undefined);
    const explainSent = JSON.parse(lastInit.init.body);
    assert.equal(explainSent.messages[0].content, SYSTEM_PROMPT);
    assert.equal(explainSent.max_tokens, 220);
    assert.equal(explainSent.response_format, undefined);

    const ask = await handleRequest(post({
      page: "Ask",
      pagePath: "site",
      turn: 1,
      message: "讀者來函在哪",
    }, "203.0.113.125"), { DEEPSEEK_API_KEY: KEY });
    assert.equal(ask.status, 200);
    assert.equal(typeof (await ask.json()).reply, "string");
    const askSent = JSON.parse(lastInit.init.body);
    assert.equal(askSent.messages[0].content, ASK_SYSTEM_PROMPT);
    assert.equal(askSent.max_tokens, 360);

    const lms = await handleRequest(post(sceneBody(goodLine), "203.0.113.126", "https://learning.hcs.edu.hk"), { DEEPSEEK_API_KEY: KEY });
    assert.equal(lms.status, 200);
    assert.equal(lms.headers.get("Access-Control-Allow-Origin"), "https://learning.hcs.edu.hk");

    const local = await handleRequest(post(sceneBody(goodLine), "203.0.113.127", "http://localhost:8765"), { DEEPSEEK_API_KEY: KEY });
    assert.equal(local.status, 200);
    assert.equal(local.headers.get("Access-Control-Allow-Origin"), "http://localhost:8765");

    const bare = await handleRequest(post(sceneBody(goodLine), "203.0.113.128"), {});
    assert.equal(bare.status, 503);
    assert.equal((await bare.json()).error, "SpeakNovel is not available yet.");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a vague line is not routed to a success branch", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async function () {
    return new Response(modelJson({
      chosen_target_node: "node_remake",
      used_target_grammar: true,
      grammar_score: 5,
      character_reaction: "Just sorry?! That's not enough!",
      teacher_tip: "Apology alone is thin — add Allow me to and a real fix.",
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const res = await handleRequest(post(sceneBody("sorry"), "203.0.113.140"), { DEEPSEEK_API_KEY: KEY });
    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.used_target_grammar, false);
    assert.equal(json.chosen_target_node, "node_manager");
    assert.equal(json.grammar_score <= 2, true);
    assert.equal(startBranches.some(function (branch) { return branch.targetNode === json.chosen_target_node; }), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Ask and Explain stay on the 4 KB cap while SpeakNovel may send its branches", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async function () {
    calls += 1;
    return new Response(modelJson(goodModel), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const ask = {
      page: "Ask",
      turn: 1,
      message: "hello",
      pad: "x".repeat(5000),
    };
    const askBytes = new TextEncoder().encode(JSON.stringify(ask)).length;
    assert.equal(askBytes > MAX_BODY_BYTES, true);
    const askRes = await handleRequest(post(ask, "203.0.113.150"), { DEEPSEEK_API_KEY: KEY });
    assert.equal(askRes.status, 413);
    assert.equal(calls, 0);

    const explain = {
      page: "Cohesion",
      itemLabel: "furthermore",
      sampleText: "x".repeat(5000),
    };
    const explainRes = await handleRequest(post(explain, "203.0.113.151"), { DEEPSEEK_API_KEY: KEY });
    assert.equal(explainRes.status, 413);
    assert.equal(calls, 0);

    const branches = [];
    for (let i = 0; i < 11; i++) {
      branches.push({
        condition: "Branch condition " + "detail ".repeat(60),
        targetNode: i === 0 ? "node_remake" : "node_extra_" + i,
        label: i === 0 ? "Polite offer" : "Other " + i,
        kind: i === 0 ? "success" : "fail",
      });
    }
    branches.push({
      condition: "Vague apology " + "detail ".repeat(60),
      targetNode: "node_manager",
      label: "Try again",
      kind: "retry",
    });
    const novel = sceneBody(goodLine, { node: { branches: branches } });
    const novelBytes = new TextEncoder().encode(JSON.stringify(novel)).length;
    assert.equal(novelBytes > MAX_BODY_BYTES, true);
    assert.equal(novelBytes < MAX_SPEAKNOVEL_BODY_BYTES, true);
    assert.equal(novelBytes <= 4096, false);
    const novelRes = await handleRequest(post(novel, "203.0.113.152"), { DEEPSEEK_API_KEY: KEY });
    assert.equal(novelRes.status, 200);
    assert.equal((await novelRes.json()).chosen_target_node, "node_remake");
    assert.equal(calls, 1);

    const tooBig = { mode: "speaknovel", pad: "y".repeat(MAX_SPEAKNOVEL_BODY_BYTES) };
    const tooBigRes = await handleRequest(post(tooBig, "203.0.113.153"), { DEEPSEEK_API_KEY: KEY });
    assert.equal(tooBigRes.status, 413);
    assert.equal(calls, 1);

    const encoded = new TextEncoder().encode("{" + "\"mode\":\"speaknovel\",\"pad\":\"" + "z".repeat(MAX_SPEAKNOVEL_BODY_BYTES) + "\"}");
    let sent = 0;
    const stream = new ReadableStream({
      pull: function (controller) {
        if (sent >= encoded.length) {
          controller.close();
          return;
        }
        const end = Math.min(sent + 1024, encoded.length);
        controller.enqueue(encoded.slice(sent, end));
        sent = end;
      },
    });
    const streamed = await handleRequest(new Request("https://deepseek-explain.example.workers.dev/", {
      method: "POST",
      headers: {
        Origin: "https://skhhcss-eng.github.io",
        "Content-Type": "application/json",
        "CF-Connecting-IP": "203.0.113.154",
      },
      body: stream,
      duplex: "half",
    }), { DEEPSEEK_API_KEY: KEY });
    assert.equal(streamed.status, 413);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("SpeakNovel rate limit does not consume the Ask and Explain allowance", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async function () {
    return new Response(modelJson(goodModel), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const explainBody = {
    page: "Cohesion",
    itemLabel: "furthermore",
    sampleText: "Furthermore, recycling bins should be placed near every classroom.",
  };
  try {
    const novelIp = "203.0.113.160";
    const novelStatuses = [];
    for (let i = 0; i < SPEAKNOVEL_RATE_LIMIT + 1; i++) {
      const res = await handleRequest(post(sceneBody(goodLine), novelIp), { DEEPSEEK_API_KEY: KEY });
      novelStatuses.push(res.status);
    }
    assert.equal(novelStatuses[SPEAKNOVEL_RATE_LIMIT - 1], 200);
    assert.equal(novelStatuses[SPEAKNOVEL_RATE_LIMIT], 429);
    const novelLimited = await handleRequest(post(sceneBody("sorry"), novelIp), { DEEPSEEK_API_KEY: KEY });
    assert.equal(novelLimited.status, 429);
    assert.equal((await novelLimited.json()).error, "Too many SpeakNovel turns. Wait a minute and try again.");
    assert.equal(novelLimited.headers.get("Retry-After"), "60");

    const explainStill = await handleRequest(post(explainBody, novelIp), { DEEPSEEK_API_KEY: KEY });
    assert.equal(explainStill.status, 200);
    assert.equal(typeof (await explainStill.json()).explanation, "string");

    const studyIp = "203.0.113.161";
    const studyStatuses = [];
    for (let i = 0; i < 31; i++) {
      const res = await handleRequest(post(explainBody, studyIp), { DEEPSEEK_API_KEY: KEY });
      studyStatuses.push(res.status);
    }
    assert.equal(studyStatuses[29] === 429, false);
    assert.equal(studyStatuses[30], 429);
    assert.equal((await handleRequest(post(explainBody, studyIp), { DEEPSEEK_API_KEY: KEY }).then(function (res) { return res.json(); })).error, "Too many explanations. Wait a minute and try again.");
    const novelStill = await handleRequest(post(sceneBody(goodLine), studyIp), { DEEPSEEK_API_KEY: KEY });
    assert.equal(novelStill.status, 200);
    assert.equal((await novelStill.json()).chosen_target_node, "node_remake");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a bad model payload does not leak the key", async () => {
  const logs = [];
  const originalError = console.error;
  console.error = function () {
    logs.push(Array.from(arguments).join(" "));
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async function () {
    return new Response(modelJson({ chosen_target_node: "node_remake" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    const res = await handleRequest(post(sceneBody(goodLine), "203.0.113.170"), { DEEPSEEK_API_KEY: KEY });
    const json = await res.json();
    assert.equal(res.status, 502);
    assert.equal(json.error, "SpeakNovel is unavailable just now.");
    assert.equal(json.chosen_target_node, undefined);
    assert.equal(JSON.stringify(json).includes(KEY), false);
    assert.equal(logs.join("\n").includes(KEY), false);
    assert.match(logs.join("\n"), /speaknovel_bad_json/);
  } finally {
    console.error = originalError;
    globalThis.fetch = originalFetch;
  }
});
