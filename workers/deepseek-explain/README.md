# DeepSeek Explain worker

Short explanations for the Cohesion sheet and Sentence Patterns samples, a short Ask chat (`page: "Ask"`), a free dictionary lookup (`mode: "dict"`), Say It Louder SpeakNovel (`mode: "speaknovel"`), and neural speech (`mode: "tts"`). The browser calls this Worker. Explain, Ask, SpeakNovel, and the Dict gloss call DeepSeek. The API key stays here as the secret `DEEPSEEK_API_KEY`. Those calls share that binding. The Dict English block calls the Free Dictionary API and does not use that key. Voice uses optional secrets `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION`; without them, `tts` falls back to a zero-key en-GB MP3.

Live site origins: `https://skhhcss-eng.github.io` and `https://learning.hcs.edu.hk` (the school LMS; pages live under `/english/`, which is not part of the Origin header).  
This repo has no GitHub Pages preview origin. The org site is served from `main` on `skhhcss-eng.github.io` only.  
Soft local origins: `http://localhost`, `http://127.0.0.1` (any port), and `https` on those hosts.

Preflight responses include `Access-Control-Allow-Private-Network: true` so Chrome can call `wrangler dev` on loopback from a page served on localhost. The public site calls a public `workers.dev` host, where that header is unused.

## Secret and deploy

From this directory:

```bash
npx wrangler login
npx wrangler secret put DEEPSEEK_API_KEY
npx wrangler deploy
```

`wrangler secret put` prompts for the key. Do not pass the key on the command line, do not commit it, and do not put it in `wrangler.toml`.

For a local Worker (`npx wrangler dev`), create a gitignored `.dev.vars` file in this directory:

```
DEEPSEEK_API_KEY=paste-key-here
```

Deploy prints a `*.workers.dev` URL. That URL is the only value the site needs.

## URL Nest must fill

Leave the constant empty until this Worker is deployed. Then set the same URL in both files (no API key, no path required):

- `learning-materials/useful-vocabulary/index.html`
- `learning-materials/sentence-patterns/index.html`

```html
<script>
window.__EXPLAIN_WORKER__ = "https://deepseek-explain.<account>.workers.dev";
</script>
```

An empty string keeps the control quiet (`Explain soon`, not tappable). The client posts to that URL only. It never sends a key.

## Request

`POST` JSON, `Content-Type: application/json`. Ask and Explain bodies are at most 4 KB. A SpeakNovel body may be up to 24 KB because the scene includes its branches. A larger Ask or Explain body is still rejected.

```json
{
  "page": "Cohesion",
  "itemLabel": "furthermore",
  "category": "Sequence / Add Ideas",
  "sampleText": "Furthermore, recycling bins should be placed near every classroom.",
  "highlight": "Furthermore",
  "gloss": "此外",
  "locale": "en-GB"
}
```

`page` must be `Cohesion` or `Sentence Patterns`. `itemLabel` and `sampleText` are required. `label` and `sample` are accepted as aliases. `category`, `highlight` (string or short list), `gloss`, and `locale` are optional. `locale` does not switch the reply language. Explain replies are Traditional Chinese 書面語 (Howard lock 2026-10-29). English linker names, pattern names, aspect names, and quoted sample words stay as given.

The user message is built from Tess’s template. The Task line asks for 2–4 short Traditional Chinese sentences and tells the model to keep English linker, pattern, and Aspects names. `gloss` is added only when the page sent one. Soft sample replies in the prompt pack are not stored here. Every accepted request calls `https://api.deepseek.com/chat/completions` (`deepseek-chat`).

Explain stays a separate path: `page` must be `Cohesion` or `Sentence Patterns`, and the reply is `{ "explanation": "…" }` in Traditional Chinese 書面語. The system prompt includes the Aspects rule from the pack; this Worker still rejects an Aspects page.

Success:

```json
{ "explanation": "…" }
```

## Ask

Same URL, same secret, same origin allowlist (`https://skhhcss-eng.github.io`, `https://learning.hcs.edu.hk`, plus loopback for local dev). `page` must be `Ask`. Find itself does not call this Worker.

```json
{
  "page": "Ask",
  "pagePath": "/learning-materials/useful-vocabulary/",
  "findHits": "Letter to the Editor — learning-materials/paper-2-writing-formats/letter-to-the-editor/",
  "message": "讀者來函在哪"
}
```

`message` is required. `pagePath` defaults to `site`. `findHits` is optional, up to three `title — path` lines. `turn` may be sent by an older page and is ignored. There is no 5-turn close and no per-IP cap on Ask. The Ask system prompt is Tess’s 2026-10-29 text (Traditional Chinese 書面語) without the old turn-limit line. Soft sample replies are not stored here.

Success:

```json
{ "reply": "…" }
```

Find stays in the browser. Ask and Dict do not draw on the Explain allowance. SpeakNovel and TTS keep their own limits.

## Dict

Same URL and the same origin allowlist. `mode` must be `dict`. There is no student lookup cap and no per-IP cap. The sheet does not show a usage counter.

```json
{ "mode": "dict", "word": "however" }
```

`word` is one word or a short phrase (up to three words, letters, apostrophes, and hyphens, at most 40 characters). The Worker looks up `https://api.dictionaryapi.dev/api/v2/entries/en/{word}` (no key). That API stays English-only.

On a hit, the Worker calls DeepSeek once, with the same `DEEPSEEK_API_KEY` as Explain, for a single Traditional Chinese 書面語 gloss of the kept sense or senses. The gloss is one short line, not a Chinese dictionary entry. English linker, pattern, and proper names stay as given.

The student reply starts with that gloss as one line, `譯` plus the short gloss. The English block follows: headword and British part of speech, one or two short senses, and one simple example when the API has one. IPA, audio, and synonym lists are left out.

Success (`200`):

```json
{
  "reply": "譯 然而；不論以何種方式\nhowever — adverb\nNevertheless; yet, still; in spite of (that).\n\nhowever — conjunction\nIn whatever way or manner.\n\nExample: I did it anyway, however.",
  "word": "however",
  "senses": [
    { "pos": "adverb", "definition": "Nevertheless; yet, still; in spite of (that)." },
    { "pos": "conjunction", "definition": "In whatever way or manner." }
  ],
  "example": "I did it anyway, however.",
  "gloss": "然而；不論以何種方式"
}
```

`gloss` is a string on a hit. The reply starts with `譯` and that gloss, then the English block. A simplified character in the model line is rewritten to traditional (for example 过 becomes 過). A full stop keeps the first clause instead of dropping the line. If that line is still unusable, or DeepSeek errors, the gloss call is tried once more. A missing `DEEPSEEK_API_KEY` is not retried. `gloss` is omitted only when the key is missing or both attempts fail. The English `reply`, `word`, `senses`, and `example` are still returned in that case.

A missing word is `404` with `{ "error": "Try another spelling?" }` and no gloss line. An empty word is `400` (`Type a word.`). A word that is too long or not a short phrase is `400` (`Type one word or a short phrase.`). If the dictionary host is down, the error is `502` (`The dictionary is unavailable just now.`). A gloss failure is not a `502`.

Smoke (does not deploy). Run this after Nest deploys, or run `scripts/smoke-dict.sh`:

```bash
curl -sS -D - \
  -X POST "https://deepseek-explain.skhhcss-eng.workers.dev" \
  -H "Origin: https://skhhcss-eng.github.io" \
  -H "Content-Type: application/json" \
  --data '{"mode":"dict","word":"however"}'
```

Expect `200` and one or two `senses`. Do not run `wrangler deploy` from this change; Nest deploys after a soft green.

Ask, Explain, and SpeakNovel use one allowlist in `src/index.js` (`LIVE_ORIGINS`): `https://skhhcss-eng.github.io`, `https://learning.hcs.edu.hk`, and loopback. Paths are not part of Origin, so `https://skhhcss-eng.github.io` already covers `/say-it-louder/`. There is no Pages preview origin in this repo. `wrangler.toml` does not list origins.

## SpeakNovel

Same URL, same secret, same origin allowlist. Say It Louder posts from `https://skhhcss-eng.github.io` (the `/say-it-louder/` path is not part of Origin). `mode` must be `speaknovel`. This is not the old Mission coach (`page: "Say It Louder"` is still rejected).

```json
{
  "mode": "speaknovel",
  "episode": "ep1_boba",
  "nodeKey": "node_start",
  "transcript": "Allow me to remake your drink right away.",
  "node": {
    "speaker": "Angry Customer (Ken)",
    "defaultLine": "What are you going to do about this?!",
    "goalHint": "Apologise politely and offer a concrete fix.",
    "targetGrammar": {
      "item": "Polite Modals & Offers",
      "patterns": ["Allow me to ___ right away."],
      "keywords": ["allow me", "right away"]
    },
    "branches": [
      { "condition": "Polite offer", "targetNode": "node_remake", "label": "Polite offer", "kind": "success" },
      { "condition": "Vague apology", "targetNode": "node_manager", "label": "Try again", "kind": "retry" }
    ]
  }
}
```

`episode`, `nodeKey`, `transcript`, `node.speaker`, `node.defaultLine`, `node.targetGrammar`, and at least one `node.branches[].targetNode` are required. Branch ids use letters, digits, `_`, `.`, and `-`.

The worker asks DeepSeek for JSON, then checks the line against the node's keywords. A bare apology or a line that misses the pattern is `used_target_grammar: false`. That result is not sent to a `golden` or `success` branch (or any branch whose id or label contains "golden"). The worker prefers `retry` / `clarification`, then `fail` / `chaos`. `grammar_score` is an integer from 1 to 5, and at most 2 when the grammar was missed. `character_reaction` is one or two in-character sentences. `teacher_tip` is one encouraging British English sentence about the target grammar.

Success:

```json
{
  "chosen_target_node": "node_remake",
  "used_target_grammar": true,
  "grammar_score": 5,
  "character_reaction": "Alright… thank you. That helps.",
  "teacher_tip": "Nice work — practise Allow me to… and name the fix you will make."
}
```

SpeakNovel has its own limit of 20 requests per minute per IP, so a game session cannot use up the Ask and Explain allowance. A 429 includes `Retry-After: 60`.

Deploy is unchanged for Ask, Explain, and SpeakNovel: `npx wrangler secret put DEEPSEEK_API_KEY` if the secret is not already set, then `npx wrangler deploy`. Do not commit keys. Optional voice secrets, only if Azure neural TTS should run:

```bash
npx wrangler secret put AZURE_SPEECH_KEY
npx wrangler secret put AZURE_SPEECH_REGION
```

`AZURE_SPEECH_REGION` defaults to `eastasia` when the key is set and the region secret is empty. Omit both secrets and `mode: "tts"` still returns audio from the zero-key en-GB fallback.

## TTS

Same URL and the same origin allowlist. `mode` must be `tts`. This does not call DeepSeek and does not draw on the Explain or SpeakNovel rate limits. Ask and Dict are not rate limited. The voice limit is 30 requests per minute per IP. A 429 includes `Retry-After: 60`.

```json
{
  "mode": "tts",
  "text": "Allow me to remake your drink right away.",
  "voice": "en-GB-RyanNeural",
  "style": "general",
  "rate": "0%",
  "pitch": "0%"
}
```

`text` is required and at most 500 characters. `voice` is one of `en-GB-RyanNeural`, `en-GB-SoniaNeural`, `en-GB-LibbyNeural`, `en-GB-ThomasNeural`, `en-HK-YanNeural`, `en-HK-SamNeural` (anything else uses Ryan). `style` is `general`, `cheerful`, `sad`, `angry`, `friendly`, `excited`, or `customerservice`. `rate` and `pitch` are optional signed percentages of one or two digits, such as `+10%` or `-5%`.

Success is `audio/mpeg`, not JSON. `X-TTS-Engine` is `azure-neural` when Azure accepts the SSML, or `cloud-en-gb-free` for the fallback (en-HK voices use that same en-GB stream). The body stays under the 4 KB Ask/Explain cap.

Errors are JSON `{ "error": "…" }` with 400, 403, 404, 405, 413, 415, 429, 502, or 503.

Explain: 30 requests per minute per IP (`CF-Connecting-IP`) on each isolate. A 429 includes `Retry-After: 60`. Ask and Dict are not counted. SpeakNovel: 20 requests per minute per IP, counted separately. TTS: 30 requests per minute per IP, counted separately.
