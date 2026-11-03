import assert from "node:assert/strict";
import test from "node:test";
import { buildAzureSsml, handleRequest } from "../src/index.js";

const AZURE = "azure-test-key-do-not-log";
const KEY = "unit-test-key-do-not-log";

function post(body, ip, origin) {
  return new Request("https://deepseek-explain.example.workers.dev/", {
    method: "POST",
    headers: {
      Origin: origin || "https://skhhcss-eng.github.io",
      "Content-Type": "application/json",
      "CF-Connecting-IP": ip || "198.51.100.10",
    },
    body: JSON.stringify(body),
  });
}

test("Azure SSML keeps the voice list and escapes the line", () => {
  const ssml = buildAzureSsml({
    text: "Tom & Jerry <say> \"hi\"",
    voice: "en-HK-YanNeural",
    style: "cheerful",
    rate: "+10%",
    pitch: "-5%",
  });
  assert.match(ssml, /xml:lang="en-HK"/);
  assert.match(ssml, /voice name="en-HK-YanNeural"/);
  assert.match(ssml, /style="cheerful"/);
  assert.match(ssml, /rate="\+10%"/);
  assert.match(ssml, /pitch="-5%"/);
  assert.match(ssml, /Tom &amp; Jerry &lt;say&gt; &quot;hi&quot;/);
  const plain = buildAzureSsml({ text: "Hi", voice: "nope", style: "general", rate: "fast", pitch: "x" });
  assert.match(plain, /voice name="en-GB-RyanNeural"/);
  assert.equal(plain.includes("express-as"), false);
  assert.equal(plain.includes(AZURE), false);
});

test("tts uses Azure when the secret is set and the free MP3 when it is not", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async function (url, init) {
    calls.push({ url: String(url), init: init });
    if (String(url).includes("speech.microsoft.com")) {
      return new Response(new Uint8Array([0x49, 0x44, 0x33]), { status: 200 });
    }
    if (String(url).includes("translate.googleapis.com")) {
      return new Response(new Uint8Array([0xff, 0xfb]), { status: 200 });
    }
    return new Response("no", { status: 500 });
  };
  try {
    const missing = await handleRequest(post({ mode: "tts", text: "  " }, "198.51.100.20"), {});
    assert.equal(missing.status, 400);
    assert.equal((await missing.json()).error, "Text is required for TTS.");
    assert.equal(calls.length, 0);

    const long = await handleRequest(post({ mode: "tts", text: "x".repeat(501) }, "198.51.100.21"), {});
    assert.equal(long.status, 400);
    assert.equal((await long.json()).error, "TTS text is too long.");
    assert.equal(calls.length, 0);

    const azure = await handleRequest(post({
      mode: "tts",
      text: "Allow me to remake that.",
      voice: "en-GB-SoniaNeural",
      style: "friendly",
      rate: "5%",
      pitch: "+2%",
    }, "198.51.100.22"), {
      DEEPSEEK_API_KEY: KEY,
      AZURE_SPEECH_KEY: AZURE,
      AZURE_SPEECH_REGION: "eastasia",
    });
    assert.equal(azure.status, 200);
    assert.equal(azure.headers.get("Content-Type"), "audio/mpeg");
    assert.equal(azure.headers.get("X-TTS-Engine"), "azure-neural");
    assert.equal(azure.headers.get("Access-Control-Allow-Origin"), "https://skhhcss-eng.github.io");
    assert.equal(azure.headers.get("Cache-Control"), "public, max-age=86400");
    assert.equal((new Uint8Array(await azure.arrayBuffer()))[0], 0x49);
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /^https:\/\/eastasia\.tts\.speech\.microsoft\.com\/cognitiveservices\/v1$/);
    assert.equal(calls[0].init.headers["Ocp-Apim-Subscription-Key"], AZURE);
    assert.match(calls[0].init.body, /en-GB-SoniaNeural/);
    assert.match(calls[0].init.body, /style="friendly"/);
    assert.equal(calls[0].init.body.includes(AZURE), false);
    assert.equal(calls[0].url.includes("api.deepseek.com"), false);

    const free = await handleRequest(post({
      mode: "tts",
      text: "Half sugar, please.",
      voice: "en-HK-SamNeural",
    }, "198.51.100.23"), {});
    assert.equal(free.status, 200);
    assert.equal(free.headers.get("X-TTS-Engine"), "cloud-en-gb-free");
    assert.equal(free.headers.get("Access-Control-Allow-Origin"), "https://skhhcss-eng.github.io");
    assert.match(calls[1].url, /translate\.googleapis\.com/);
    assert.match(calls[1].url, /tl=en-GB/);
    assert.match(calls[1].url, /q=Half%20sugar%2C%20please\./);
    assert.equal(calls.length, 2);

    calls.length = 0;
    globalThis.fetch = async function (url) {
      calls.push(String(url));
      if (String(url).includes("speech.microsoft.com")) return new Response("no", { status: 401 });
      if (String(url).includes("translate.googleapis.com")) return new Response(new Uint8Array([1]), { status: 200 });
      return new Response("no", { status: 500 });
    };
    const fell = await handleRequest(post({ mode: "tts", text: "Sorry about the lid." }, "198.51.100.24"), {
      AZURE_SPEECH_KEY: " " + AZURE + " ",
    });
    assert.equal(fell.status, 200);
    assert.equal(fell.headers.get("X-TTS-Engine"), "cloud-en-gb-free");
    assert.match(calls[0], /speech\.microsoft\.com/);
    assert.match(calls[1], /translate\.googleapis\.com/);
    assert.equal(calls[0].includes(AZURE), false);

    globalThis.fetch = async function () {
      return new Response("no", { status: 500 });
    };
    const down = await handleRequest(post({ mode: "tts", text: "Hello there." }, "198.51.100.25"), {
      AZURE_SPEECH_KEY: AZURE,
    });
    const downJson = await down.json();
    assert.equal(down.status, 502);
    assert.equal(downJson.error, "Voice synthesis is unavailable just now.");
    assert.equal(JSON.stringify(downJson).includes(AZURE), false);
    assert.equal(JSON.stringify(downJson).includes(KEY), false);

    const lms = await handleRequest(post({ mode: "tts", text: "Good morning." }, "198.51.100.26", "https://learning.hcs.edu.hk"), {});
    assert.equal(lms.status, 502);

    globalThis.fetch = async function (url) {
      if (String(url).includes("translate.googleapis.com")) return new Response(new Uint8Array([9]), { status: 200 });
      return new Response("no", { status: 500 });
    };
    const lmsOk = await handleRequest(post({ mode: "tts", text: "Good morning." }, "198.51.100.27", "https://learning.hcs.edu.hk"), {});
    assert.equal(lmsOk.status, 200);
    assert.equal(lmsOk.headers.get("Access-Control-Allow-Origin"), "https://learning.hcs.edu.hk");
    assert.equal(lmsOk.headers.get("X-TTS-Engine"), "cloud-en-gb-free");

    const evil = await handleRequest(post({ mode: "tts", text: "Hi" }, "198.51.100.28", "https://evil.example"), {
      AZURE_SPEECH_KEY: AZURE,
    });
    assert.equal(evil.status, 403);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("tts rate limit does not consume Ask or Explain", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async function (url) {
    if (String(url).includes("speech.microsoft.com")) {
      return new Response(new Uint8Array([1]), { status: 200 });
    }
    return new Response(JSON.stringify({
      choices: [{ message: { content: "Furthermore 用來補充同一方向的論點。" } }],
    }), { status: 200 });
  };
  const ip = "198.51.100.50";
  try {
    const statuses = [];
    for (let i = 0; i < 31; i++) {
      const res = await handleRequest(post({ mode: "tts", text: "Line " + i }, ip), { AZURE_SPEECH_KEY: AZURE });
      statuses.push(res.status);
    }
    assert.equal(statuses[29], 200);
    assert.equal(statuses[30], 429);
    const limited = await handleRequest(post({ mode: "tts", text: "one more" }, ip), { AZURE_SPEECH_KEY: AZURE });
    assert.equal(limited.status, 429);
    assert.equal((await limited.json()).error, "Too many voice requests. Wait a moment.");
    assert.equal(limited.headers.get("Retry-After"), "60");

    const explain = await handleRequest(post({
      page: "Cohesion",
      itemLabel: "furthermore",
      sampleText: "Furthermore, recycling bins should be placed near every classroom.",
    }, ip), { DEEPSEEK_API_KEY: KEY });
    assert.equal(explain.status, 200);
    assert.equal(typeof (await explain.json()).explanation, "string");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
