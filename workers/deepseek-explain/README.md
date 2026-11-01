# DeepSeek Explain worker

Short explanations for the Cohesion sheet and Sentence Patterns samples, a short Ask chat (`page: "Ask"`), and the Say It Louder carriage coach (`page: "Say It Louder"`). The browser calls this Worker. The Worker calls DeepSeek. The API key stays here as the secret `DEEPSEEK_API_KEY`. Explain, Ask, and Say It Louder share that binding. There is no second key.

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

`POST` JSON, `Content-Type: application/json`, body at most 4 KB.

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

`page` must be `Cohesion` or `Sentence Patterns`. `itemLabel` and `sampleText` are required. `label` and `sample` are accepted as aliases. `category`, `highlight` (string or short list), `gloss`, and `locale` are optional. `locale` does not change the language: replies stay British English.

The user message is built from that body (Tess’s template). `gloss` is added only when the page sent one, so a Chinese gloss in the input can be used once. Soft sample replies in the prompt pack are not stored here. Every accepted request calls `https://api.deepseek.com/chat/completions` (`deepseek-chat`).

Explain pages are unchanged: `page` must still be `Cohesion` or `Sentence Patterns`, and the reply is still `{ "explanation": "…" }` in British English.

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
  "turn": 1,
  "findHits": "Letter to the Editor — learning-materials/paper-2-exam-skills/letter-to-the-editor/",
  "message": "讀者來函在哪"
}
```

`turn` is 1, 2, or 3 for this open. `message` is required. `pagePath` defaults to `site`. `findHits` is optional, up to three `title — path` lines. The Ask system prompt is Tess’s 2026-10-29 text (Traditional Chinese 書面語). Soft sample replies are not stored here.

Success:

```json
{ "reply": "…" }
```

A 4th turn is rejected with 400 before any API call. The browser also stops at 3 replies per open. There is no daily cap. Ask shares the Explain rate limit (about 10 requests per minute per IP).

## Say It Louder

Same URL, same secret, same origin allowlist (`https://skhhcss-eng.github.io`, `https://learning.hcs.edu.hk`, plus loopback for local dev). No new host and no second key. The page posts `page: "Say It Louder"`. Find and Explain are unchanged. The coach URL in the page script is absolute (`https://deepseek-explain.skhhcss-eng.workers.dev`), so a copy of the page under `/english/say-it-louder/` on the LMS still calls this Worker and does not prefix `/english/`.

```json
{
  "page": "Say It Louder",
  "scenarioId": "level_1_lost_bag",
  "state": "BAG_NAVY_SMALL=UNDER_SEAT; NAME_TAG=HIDDEN; SEAT_NEAR_DOOR=IDLE",
  "transcript": "Look under the seats near the door."
}
```

`transcript` is required. `scenarioId` is `level_1_lost_bag` or `mission_1_lost_bag` for the lost bag, and `mission_2_school_map_walk` or `level_2_map_walk` for the school map walk. `state` is optional. The browser keeps the API key off the page. It reads `window.__EXPLAIN_WORKER__` when that page sets one, otherwise `https://deepseek-explain.skhhcss-eng.workers.dev`.

Success is the carriage contract (British English). `scene_action` from the model is returned as `hardware_action`.

```json
{
  "spoken_reply": "Okay… near the door? I'm looking.",
  "mood": "PANICKED",
  "hardware_action": "SEAT_NEAR_DOOR",
  "teacher_tip": "Nice start. Add a colour or size so Leo knows which bag."
}
```

`mood` is `PANICKED`, `CONFUSED`, `RELIEVED`, or `HOPEFUL`. Lost-bag `hardware_action` values are `NONE`, `HOVER_CONFUSED`, `BAG_BLACK_SPORTS`, `BAG_NAVY_SMALL`, `BAG_GREY_BIG`, `LUNCHBOX_YELLOW`, `SHOW_NAME_TAG`, `SEAT_NEAR_DOOR`, `SEAT_LEFT`, `SEAT_MIDDLE`. The map walk uses move, turn, and arrive tokens, including `GO_THROUGH_GATE`, `WALK_PAST_CANTEEN`, `ARRIVE_LIBRARY`, `HOVER_CONFUSED`, and `STEP_BACK`. A rubric tip (`Prompt:`, `Stretch:`, `Win:`, soft fail) or an unknown action is a 502, and the page uses its mock coach so the scene still moves.

Say It Louder shares the Explain rate limit (about 10 requests per minute per IP).

Ask, Explain, and Say It Louder use one allowlist in `src/index.js` (`LIVE_ORIGINS`): `https://skhhcss-eng.github.io`, `https://learning.hcs.edu.hk`, and loopback. There is no Pages preview origin in this repo. `wrangler.toml` does not list origins, so it does not change. The coach route is new on this same Worker. Deploy once from this directory so the live host serves it:

```bash
npx wrangler deploy
```

Same Worker name `deepseek-explain`. Same secret `DEEPSEEK_API_KEY`. No second Worker and no new key.

Errors are JSON `{ "error": "…" }` with 400, 403, 405, 413, 415, 429, 502, or 503.

About 10 requests per minute per IP (`CF-Connecting-IP`) on each isolate. A 429 includes `Retry-After: 60`.
