# HCS Live Class +

A copy of HCS Live Class with a classroom assistant. The original page at `classroom/hcs-live-class/` is not modified, and `/classroom/class-activity-studio/` still redirects there.

## Storage

Live Class stores seating in `localStorage` only (no IndexedDB). This page uses different keys, so scores and seating never mix:

| What | Live Class | Live Class + |
| --- | --- | --- |
| Seating and scores | `skhhcss_eng_classroom_v4` | `hcsLiveClassPlus_classroom_v1` |
| Skin | `skhhcss_eng_hcs_live_class_skin_v1` | `hcsLiveClassPlus_skin_v1` |
| Remembered Drive folder id | `skhhcss_eng_studio_drive_folder_v1` | `hcsLiveClassPlus_drive_folder_v1` |
| Assistant ball position | — | `hcsLiveClassPlus_ball_v1` |

## Drive

Same public OAuth client id as Live Class (`drive-config.js`). Folder search accepts **HCS Live Class**, **Class Activity Studio**, and **HCS Live Class +** when that folder is present. Create still makes **HCS Live Class**, so Open plan lists Live Class files in the shared folder.

Save online writes a title and filename that start with `Live Class + ` (`fenceSaveTitle` in `studio-drive.js`). A class called `3A` is saved as `Live Class + 3A.json` and does not overwrite `3A.json`.

## Assistant

`DEFAULT_WORKER_URL` in `assistant.js`, and `window.HCS_LIVE_CLASS_PLUS_WORKER` on the page, are:

`https://live-class-plus.skhhcss-eng.workers.dev`

Do not point either at deepseek-explain, say-it-louder, or ces-softspeak.

The page POSTs JSON `{ "text": "..." }`.

The Worker replies with:

```json
{
  "kind": "ask",
  "reply": "",
  "gloss_zh": "",
  "gloss_en": "",
  "action": null,
  "slots": { "student": "", "amount": null, "note": "" },
  "needs_confirm": false
}
```

`kind` is `ask`, `gloss`, `action`, `clarify`, or `off_list`.

Board-changing actions show a one-line confirm chip, then the page runs the Live Class function. The allowlist is:

`hide_names`, `show_names`, `zoom_in`, `zoom_out`, `zoom_reset`, `random_pick`, `open_seating`, `open_scores`, `score_plus`, `score_minus`, `tidy_snap`.

Hooks:

- **Hide / show names.** Live Class has no name switch. Plus cloaks desk labels, the pulse top name, the student leaderboard, and student lines in History.
- **Zoom reset** calls Fit (`btnZoomReset` / `fitZoomToViewport`), which is the only zoom-reset control on the page.
- **Open Seating / Scores** share one Tools band (`studioBandsOpen`). Each action opens that band and scrolls the named band into view.
- **Points** need a name, the last tapped desk (`plusSelectedId`), or the last randomly picked student. There is no separate selected-desk control on Live Class.
- **Tidy** calls `tidyCurrentLayout` (the Tidy button). Edit must be on, same as the button.

The cream ball is about 56px, with no label. The command strip sits under it. When the strip is open, placement and drag bounds use the whole unit (ball + strip + reply), so it stays clear of desk name chips and the floor zoom bar.
