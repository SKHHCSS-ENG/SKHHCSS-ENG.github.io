import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  DICT_GLOSS_SYSTEM,
  DICT_MISS,
  applyDictGloss,
  buildDictGlossMessage,
  cleanDictGloss,
  shapeDictionaryEntry,
  toBritish,
} from "../src/dict.js";
import { handleRequest } from "../src/index.js";

function post(body, ip, origin) {
  return new Request("https://deepseek-explain.example.workers.dev/", {
    method: "POST",
    headers: {
      Origin: origin || "https://skhhcss-eng.github.io",
      "Content-Type": "application/json",
      "CF-Connecting-IP": ip || "203.0.113.200",
    },
    body: JSON.stringify(body),
  });
}

const howeverEntry = [{
  word: "however",
  phonetic: "/hɑʊˈɛvə/",
  phonetics: [{ text: "/hɑʊˈɛvə/", audio: "" }, { text: "/haʊˈɛvɚ/", audio: "https://example.invalid/however.mp3" }],
  meanings: [
    {
      partOfSpeech: "adverb",
      definitions: [
        {
          definition: "Nevertheless; yet, still; in spite of (that).",
          synonyms: ["anyhow", "nonetheless"],
          antonyms: [],
          example: "He told me not to do it. I, however, did it anyway. / I did it anyway, however. / (sometimes proscribed:) However, I did it anyway.",
        },
        {
          definition: "(degree) To whatever degree or extent.",
          example: "However clear you think you've been, many questions will remain.",
        },
      ],
      synonyms: ["howsoever", "notwithstanding", "still and all"],
      antonyms: [],
    },
    {
      partOfSpeech: "conjunction",
      definitions: [
        {
          definition: "In whatever way or manner.",
          synonyms: [],
          example: "she offered to help however she could",
        },
      ],
      synonyms: ["although"],
      antonyms: [],
    },
  ],
  sourceUrls: ["https://en.wiktionary.org/wiki/however"],
}];

const colorEntry = [{
  word: "color",
  phonetic: "/ˈkʌl.ɚ/",
  meanings: [{
    partOfSpeech: "noun",
    definitions: [
      {
        definition: "The spectral composition of visible light. Humans perceive color.",
        synonyms: ["hue", "tint", "shade", "dye", "pigment"],
        example: "Humans and birds can perceive color.",
      },
      {
        definition: "A paint.",
        synonyms: ["pigment"],
        example: "She bought a new color for the classroom wall.",
      },
    ],
    synonyms: ["hue", "tint", "shade"],
  }],
}];

test("British spelling rewrites school-level American words only", () => {
  assert.equal(toBritish("color favorite behavior"), "colour favourite behaviour");
  assert.equal(toBritish("Color"), "Colour");
  assert.equal(toBritish("coloration"), "coloration");
  assert.equal(toBritish("however"), "however");
});

test("shapeDictionaryEntry keeps 1–2 senses, one example, and drops IPA and synonyms", () => {
  const shaped = shapeDictionaryEntry(howeverEntry);
  assert.equal(shaped.word, "however");
  assert.equal(shaped.senses.length, 2);
  assert.deepEqual(shaped.senses[0], {
    pos: "adverb",
    definition: "Nevertheless; yet, still; in spite of (that).",
  });
  assert.deepEqual(shaped.senses[1], {
    pos: "conjunction",
    definition: "In whatever way or manner.",
  });
  assert.equal(shaped.example, "I did it anyway, however.");
  assert.equal(shaped.reply, [
    "however — adverb",
    "Nevertheless; yet, still; in spite of (that).",
    "",
    "however — conjunction",
    "In whatever way or manner.",
    "",
    "Example: I did it anyway, however.",
  ].join("\n"));
  assert.equal("phonetic" in shaped, false);
  assert.equal("phonetics" in shaped, false);
  assert.equal("synonyms" in shaped, false);
  const packed = JSON.stringify(shaped);
  assert.equal(packed.includes("/hɑʊ"), false);
  assert.equal(packed.includes("howsoever"), false);
  assert.equal(packed.includes("notwithstanding"), false);
  assert.equal(packed.includes("audio"), false);
  assert.equal(packed.includes("wiktionary"), false);

  const colour = shapeDictionaryEntry(colorEntry);
  assert.equal(colour.word, "colour");
  assert.equal(colour.senses.length, 2);
  assert.equal(colour.senses[0].pos, "noun");
  assert.match(colour.senses[0].definition, /colour/);
  assert.equal(colour.senses[0].definition.includes("color"), false);
  assert.equal(colour.example, "Humans and birds can perceive colour.");
  assert.equal(JSON.stringify(colour).includes("hue"), false);
  assert.equal(JSON.stringify(colour).includes("/ˈkʌl"), false);

  assert.equal(shapeDictionaryEntry([]), null);
  assert.equal(shapeDictionaryEntry({ title: "No Definitions Found" }), null);
});

test("dict field validation rejects an empty, long, or odd word before any lookup", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async function () {
    calls += 1;
    return new Response("no", { status: 500 });
  };
  try {
    const missing = await handleRequest(post({ mode: "dict" }, "203.0.113.210"), {});
    assert.equal(missing.status, 400);
    assert.equal((await missing.json()).error, "Type a word.");

    const blank = await handleRequest(post({ mode: "dict", word: "   " }, "203.0.113.211"), {});
    assert.equal(blank.status, 400);
    assert.equal((await blank.json()).error, "Type a word.");

    const number = await handleRequest(post({ mode: "dict", word: 12 }, "203.0.113.212"), {});
    assert.equal(number.status, 400);
    assert.equal((await number.json()).error, "Type one word or a short phrase.");

    const long = await handleRequest(post({ mode: "dict", word: "a".repeat(41) }, "203.0.113.213"), {});
    assert.equal(long.status, 400);
    assert.equal((await long.json()).error, "Type one word or a short phrase.");

    const question = await handleRequest(post({ mode: "dict", word: "what does however mean?" }, "203.0.113.214"), {});
    assert.equal(question.status, 400);
    assert.equal((await question.json()).error, "Type one word or a short phrase.");
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("dict proxies the free dictionary and returns a short British reply", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async function (url, init) {
    calls.push({ url: String(url), init: init });
    if (String(url).includes("dictionaryapi.dev")) {
      return new Response(JSON.stringify(howeverEntry), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({
      choices: [{ message: { content: "should not be used" } }],
    }), { status: 200 });
  };
  try {
    const res = await handleRequest(post({ mode: "dict", word: " However " }, "203.0.113.220"), {});
    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("Access-Control-Allow-Origin"), "https://skhhcss-eng.github.io");
    assert.equal(res.headers.get("Access-Control-Allow-Methods"), "POST, OPTIONS");
    assert.equal(json.word, "however");
    assert.equal(json.senses.length >= 1 && json.senses.length <= 2, true);
    assert.equal(json.senses.length, 2);
    assert.equal(json.example, "I did it anyway, however.");
    assert.match(json.reply, /^however — adverb\n/);
    assert.equal(json.reply.includes("譯"), false);
    assert.equal(json.gloss, undefined);
    assert.equal(json.reply.includes("/hɑʊ"), false);
    assert.equal(json.explanation, undefined);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://api.dictionaryapi.dev/api/v2/entries/en/however");
    assert.equal(calls[0].init.method, "GET");
    assert.equal(calls[0].url.includes("api.deepseek.com"), false);
    assert.equal(JSON.stringify(calls[0].init.headers || {}).includes("Authorization"), false);
    assert.equal(JSON.stringify(json).includes("sk-"), false);

    const phrase = await handleRequest(post({ mode: " Dict ", word: "bus stop" }, "203.0.113.221"), {});
    assert.equal(phrase.status, 200);
    assert.equal(calls[1].url, "https://api.dictionaryapi.dev/api/v2/entries/en/bus%20stop");

    globalThis.fetch = async function (url) {
      calls.push({ url: String(url) });
      return new Response(JSON.stringify({
        title: "No Definitions Found",
        message: "Sorry pal, we couldn't find definitions for the word you were looking for.",
        resolution: "You can try the search again at later time or head to the web instead.",
      }), { status: 404 });
    };
    const miss = await handleRequest(post({ mode: "dict", word: "howeverr" }, "203.0.113.222"), {});
    const missJson = await miss.json();
    assert.equal(miss.status, 404);
    assert.equal(missJson.error, DICT_MISS);
    assert.equal(missJson.error, "Try another spelling?");
    assert.equal(JSON.stringify(missJson).includes("Sorry pal"), false);

    globalThis.fetch = async function () {
      return new Response("nope", { status: 500 });
    };
    const down = await handleRequest(post({ mode: "dict", word: "however" }, "203.0.113.223"), {});
    assert.equal(down.status, 502);
    assert.equal((await down.json()).error, "The dictionary is unavailable just now.");

    const lms = await handleRequest(post({
      mode: "dict",
      word: "however",
    }, "203.0.113.224", "https://learning.hcs.edu.hk"), {});
    assert.equal(lms.status, 502);
    assert.equal(lms.headers.get("Access-Control-Allow-Origin"), "https://learning.hcs.edu.hk");

    const blocked = await handleRequest(post({ mode: "dict", word: "however" }, "203.0.113.225", "https://evil.example"), {});
    assert.equal(blocked.status, 403);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Ask and Dict have no per-IP cap and do not burn Explain", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async function (url) {
    if (String(url).includes("dictionaryapi.dev")) {
      return new Response(JSON.stringify(howeverEntry), { status: 200 });
    }
    return new Response(JSON.stringify({
      choices: [{ message: { content: "Letter to the Editor 在寫作格式頁。" } }],
    }), { status: 200 });
  };
  const ip = "203.0.113.230";
  const explainBody = {
    page: "Cohesion",
    itemLabel: "furthermore",
    sampleText: "Furthermore, recycling bins should be placed near every classroom.",
  };
  try {
    for (let i = 0; i < 40; i++) {
      const res = await handleRequest(post({ mode: "dict", word: "however" }, ip), {});
      assert.equal(res.status, 200);
    }
    for (let i = 0; i < 8; i++) {
      const res = await handleRequest(post({
        page: "Ask",
        pagePath: "site",
        turn: i + 1,
        message: "Where is cohesion?",
      }, ip), { DEEPSEEK_API_KEY: "unit-test-key-do-not-log" });
      assert.equal(res.status, 200);
      assert.equal(typeof (await res.json()).reply, "string");
    }

    for (let i = 0; i < 30; i++) {
      const res = await handleRequest(post(explainBody, ip), { DEEPSEEK_API_KEY: "unit-test-key-do-not-log" });
      assert.equal(res.status, 200);
    }
    const explainLimited = await handleRequest(post(explainBody, ip), { DEEPSEEK_API_KEY: "unit-test-key-do-not-log" });
    assert.equal(explainLimited.status, 429);

    const dictStill = await handleRequest(post({ mode: "dict", word: "however" }, ip), {});
    assert.equal(dictStill.status, 200);
    assert.equal((await dictStill.json()).senses.length, 2);
    const askStill = await handleRequest(post({
      page: "Ask",
      message: "One more question",
    }, ip), { DEEPSEEK_API_KEY: "unit-test-key-do-not-log" });
    assert.equal(askStill.status, 200);
    assert.equal(typeof (await askStill.json()).reply, "string");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("dict source has no API key", () => {
  const src = readFileSync(new URL("../src/dict.js", import.meta.url), "utf8");
  assert.equal(src.includes("sk-"), false);
  assert.equal(src.includes("DEEPSEEK_API_KEY"), false);
  assert.equal(src.includes("api.dictionaryapi.dev"), true);
});

const EN_REPLY = [
  "however — adverb",
  "Nevertheless; yet, still; in spite of (that).",
  "",
  "however — conjunction",
  "In whatever way or manner.",
  "",
  "Example: I did it anyway, however.",
].join("\n");

test("cleanDictGloss keeps one short 繁體 phrase and drops a dump", () => {
  assert.equal(cleanDictGloss("然而；不論以何種方式"), "然而；不論以何種方式");
  assert.equal(cleanDictGloss("  譯：然而。 \n"), "然而");
  assert.equal(cleanDictGloss("「譯 然而」"), "然而");
  assert.equal(cleanDictGloss("```\n然而\n```"), "然而");
  assert.equal(cleanDictGloss("譯然而"), "然而");
  assert.equal(cleanDictGloss("譯員"), "譯員");
  assert.equal(cleanDictGloss("Physical 層面"), "Physical 層面");
  assert.equal(cleanDictGloss("然而\n這個詞用來表示轉折。"), "然而");
  assert.equal(cleanDictGloss("喺度"), "");
  assert.equal(cleanDictGloss("用嚟轉折"), "");
  assert.equal(cleanDictGloss("这个"), "");
  assert.equal(cleanDictGloss("however"), "");
  assert.equal(cleanDictGloss("1. 然而"), "");
  assert.equal(cleanDictGloss("然而！"), "");
  assert.equal(cleanDictGloss("然而".repeat(20)), "");
  assert.equal(cleanDictGloss(""), "");

  const shaped = shapeDictionaryEntry(howeverEntry);
  const glossed = applyDictGloss(shaped, "譯：然而；不論以何種方式");
  assert.equal(glossed.reply, EN_REPLY + "\n譯 然而；不論以何種方式");
  assert.equal(glossed.gloss, "然而；不論以何種方式");
  assert.equal(glossed.example, shaped.example);
  assert.deepEqual(glossed.senses, shaped.senses);
  assert.equal(shaped.gloss, undefined);
  assert.equal(shaped.reply, EN_REPLY);
  assert.equal(applyDictGloss(shaped, "喺度"), shaped);
  assert.match(DICT_GLOSS_SYSTEM, /繁體中文/);
  assert.match(DICT_GLOSS_SYSTEM, /書面語/);
  assert.match(DICT_GLOSS_SYSTEM, /用嚟、喺、呢個、入面/);
  const message = buildDictGlossMessage(shaped);
  assert.match(message, /Headword: however/);
  assert.match(message, /Sense 1 \(adverb\): Nevertheless/);
  assert.match(message, /Sense 2 \(conjunction\): In whatever way/);
  assert.match(message, /Example: I did it anyway, however\./);
  assert.match(message, /不要加「譯」/);
});

test("dict hit appends one 譯 gloss and a miss stays spelling-only", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  const key = "unit-test-key-do-not-log";
  globalThis.fetch = async function (url, init) {
    calls.push({ url: String(url), init: init });
    if (String(url).includes("dictionaryapi.dev")) {
      return new Response(JSON.stringify(howeverEntry), { status: 200 });
    }
    const body = JSON.parse(init.body);
    assert.equal(body.model, "deepseek-chat");
    assert.equal(body.messages[0].content, DICT_GLOSS_SYSTEM);
    assert.match(body.messages[1].content, /Headword: however/);
    assert.match(body.messages[1].content, /Sense 1 \(adverb\)/);
    assert.equal(body.messages[0].content.includes("sk-"), false);
    return new Response(JSON.stringify({
      choices: [{ message: { content: "然而；不論以何種方式" } }],
    }), { status: 200 });
  };
  try {
    const res = await handleRequest(
      post({ mode: "dict", word: "however" }, "203.0.113.240"),
      { DEEPSEEK_API_KEY: key }
    );
    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.reply, EN_REPLY + "\n譯 然而；不論以何種方式");
    assert.equal(json.gloss, "然而；不論以何種方式");
    assert.equal(json.word, "however");
    assert.equal(json.senses.length, 2);
    assert.equal(json.example, "I did it anyway, however.");
    assert.equal(json.explanation, undefined);
    assert.equal(JSON.stringify(json).includes(key), false);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].url, "https://api.dictionaryapi.dev/api/v2/entries/en/however");
    assert.equal(calls[1].url, "https://api.deepseek.com/chat/completions");
    assert.equal(calls[1].init.method, "POST");
    assert.equal(calls[1].init.headers.Authorization, "Bearer " + key);

    calls.length = 0;
    globalThis.fetch = async function (url) {
      calls.push({ url: String(url) });
      return new Response(JSON.stringify({ title: "No Definitions Found" }), { status: 404 });
    };
    const miss = await handleRequest(
      post({ mode: "dict", word: "howeverr" }, "203.0.113.241"),
      { DEEPSEEK_API_KEY: key }
    );
    const missJson = await miss.json();
    assert.equal(miss.status, 404);
    assert.deepEqual(missJson, { error: "Try another spelling?" });
    assert.equal(calls.length, 1);
    assert.equal(String(calls[0].url).includes("dictionaryapi.dev"), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("dict gloss failure still returns the English block", async () => {
  const originalFetch = globalThis.fetch;
  const key = "unit-test-key-do-not-log";
  const cases = [
    function () { return new Response("nope", { status: 500 }); },
    function () { return new Response(JSON.stringify({ choices: [{ message: { content: "" } }] }), { status: 200 }); },
    function () { return new Response(JSON.stringify({ choices: [{ message: { content: "喺度轉折" } }] }), { status: 200 }); },
    function () { throw new Error("network"); },
  ];
  try {
    for (let i = 0; i < cases.length; i++) {
      globalThis.fetch = async function (url) {
        if (String(url).includes("dictionaryapi.dev")) {
          return new Response(JSON.stringify(howeverEntry), { status: 200 });
        }
        return cases[i]();
      };
      const res = await handleRequest(
        post({ mode: "dict", word: "however" }, "203.0.113.25" + i),
        { DEEPSEEK_API_KEY: key }
      );
      const json = await res.json();
      assert.equal(res.status, 200);
      assert.equal(json.reply, EN_REPLY);
      assert.equal(json.gloss, undefined);
      assert.equal(json.reply.includes("譯"), false);
      assert.equal(json.senses.length, 2);
      assert.equal(json.example, "I did it anyway, however.");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
