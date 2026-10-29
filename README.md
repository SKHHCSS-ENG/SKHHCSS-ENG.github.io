# SKH Holy Carpenter Secondary School — English materials

Public GitHub Pages site for the English panel.

- **Home:** https://skhhcss-eng.github.io/
- **Learning materials:** https://skhhcss-eng.github.io/learning-materials/
- **Classroom:** https://skhhcss-eng.github.io/classroom/
- **What's New:** https://skhhcss-eng.github.io/whats-new/
- **Class Activity Studio:** https://skhhcss-eng.github.io/classroom/class-activity-studio/
- **Speech Festival:** https://skhhcss-eng.github.io/speech-festival/
- **Paper 2 - Exam Skills:** https://skhhcss-eng.github.io/learning-materials/paper-2-exam-skills/

## Contents

| Path | What |
|------|------|
| `/` | English Department home (Learning Materials · Classroom · What's New) |
| `/learning-materials/` | Student practice hub (Speech Festival, Paper 2 - Writing) |
| `/classroom/` | Teacher tools hub |
| `/classroom/class-activity-studio/` | Class Activity Studio (live scoreboard / desks / points) |
| `/whats-new/` | Site updates (newest first) |
| `/speech-festival/` | Speech Festival hub |
| `/speech-festival/u41/` | U41 *Last Day* (Clare Bevan) — S3 Girls |
| `/speech-festival/u47/` | U47 *One Moment in Summer* (David Harmer) — S5 Girls |
| `/speech-festival/u66/` | U66 *Late Home* (Gervase Phinn) — S3 Boys |
| `/learning-materials/paper-1-exam-skills/` | Paper 1 - Exam Skills |
| `/learning-materials/paper-1-exam-practice/` | Paper 1 - Exam Practice |
| `/learning-materials/paper-2-exam-skills/` | Paper 2 - Exam Skills |
| `/learning-materials/paper-2-writing-formats/` | Paper 2 - Writing Formats |
| `/learning-materials/paper-4-speaking-expressions/` | Paper 4 - Speaking Expressions |
| `/learning-materials/grammar/` | Grammar |

## For teachers

Edit and push to the `main` branch of this repository. Pages builds from `/` on `main`.

British spelling. School use only.

Safety tag before hub split: `pre-scoreboard-hub-2026-10-19`.

## Class Activity Studio — Save online

Teachers sign in with a school Google account and keep a named seating plan in one shared Drive folder. Another computer (or a browser with empty storage) can open that same plan: desks, groups, live scores, and the local Save Default snapshot. Local **Save** / **Load** on the History band, and **Backup File** / **Load File** in Classes, stay as they are.

No Cloudflare Worker. The page talks to Drive from the browser with Google Identity Services. A Worker would only be needed if the school cannot create an Internal OAuth client (there is no per-folder Drive scope, and `drive.file` cannot list a plan another teacher saved).

### What Howard sets up once

1. In the school’s Google Workspace, open Google Cloud Console and create a project (or use one the school already owns).
2. Enable **Google Drive API**.
3. OAuth consent screen: **Internal** (same Workspace as the teachers). App name: `Class Activity Studio`. The scope the page requests is `https://www.googleapis.com/auth/drive`. Google will describe that as access to all Drive files. Internal apps can use this restricted scope without a public security review. The page itself only lists a folder named `Studio plans`, then reads and writes `.json` plans inside the folder the teacher picked. `drive.file` is the narrower scope, and it cannot show colleagues’ files in a shared folder, so it does not fit Save → Open across teachers.
4. Create an OAuth client ID of type **Web application**.
   - Authorised JavaScript origins: `https://skhhcss-eng.github.io`
   - No client secret. Do not put a secret in this repository.
   - Optional, for a local check: `http://localhost:8080` and `http://127.0.0.1:8080`
5. Paste the client id into `classroom/class-activity-studio/drive-config.js` (`clientId`). The id is public. The origin list is what keeps other websites from using it.
6. In Drive, create a folder named exactly **Studio plans**. A sensible place is `School → Site → Studio plans`. Share that folder with Eng colleagues as **Editor**.
7. Each browser remembers the folder id in `localStorage` under `skhhcss_eng_studio_drive_folder_v1`. The first **Save online** or **Open plan** uses the only folder with that name, or asks once if there are several. **Create** makes a new `Studio plans` folder in that teacher’s My Drive — use it only when the shared folder is not there yet. To pick again, remove that localStorage key.

The school network must allow `https://accounts.google.com` and `https://www.googleapis.com`.

### Scout — Save on one browser, Open on another

After the client id is in `drive-config.js` and Pages has rebuilt:

1. Browser A, school account with Editor on the folder: open Class Activity Studio, set a class seating and a score, **Save online**. The name starts as the current class. If that name is already in the folder, confirm **Overwrite**.
2. Browser B (or a private window with site storage cleared), second Editor account: **Open plan**, **Sign in with Google**, tap the same name. Desks, groups, and scores match A. The row shows the last save in 24-hour Hong Kong time, and the Drive display name when Google sends it.
3. On A, local **Save**, move a desk, local **Load**: the desk returns without Drive. **Backup File** still downloads JSON. **Load File** still replaces presets from that file.
4. Last save wins when two people overwrite the same name. A simultaneous first save of a new name can leave two files; overwrite updates the newest match.
