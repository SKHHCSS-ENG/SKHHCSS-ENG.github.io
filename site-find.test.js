import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const SiteFind = require("./site-find.js");
const siteFindSource = fs.readFileSync(new URL("./site-find.js", import.meta.url), "utf8");

function loadSiteFind(document, location) {
  const sandbox = {
    document: document,
    location: location,
    module: { exports: {} },
    URL: URL,
    console
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(siteFindSource, sandbox, { filename: "site-find.js" });
  return sandbox.module.exports;
}

test("alias index is Tess’s list, and paths are unique", () => {
  assert.equal(SiteFind.entries.length, 40);
  const paths = SiteFind.entries.map((entry) => entry.path);
  assert.equal(new Set(paths).size, 40);
  assert.equal(SiteFind.entries[0].title, "English Home");
  assert.equal(SiteFind.entries[0].path, "/");
  assert.equal(SiteFind.entries[28].title, "Paper 1 - Meaning from Context");
  assert.equal(SiteFind.entries[28].path, "learning-materials/paper-1-meaning-from-context/");
  assert.equal(SiteFind.entries[32].title, "Site Notes");
  assert.equal(SiteFind.entries[32].path, "site-notes/");
  const siteNotes = SiteFind.search("site notes");
  assert.equal(siteNotes.length, 1);
  assert.equal(siteNotes[0].title, "Site Notes");
  assert.equal(siteNotes[0].path, "site-notes/");
  const oldName = SiteFind.search("whats new");
  assert.equal(oldName.length, 1);
  assert.equal(oldName[0].title, "Site Notes");
  assert.equal(oldName[0].path, "site-notes/");
  assert.equal(paths.includes("whats-new/"), false);
  assert.equal(fs.existsSync(new URL("./whats-new/", import.meta.url)), false);
  assert.equal(fs.existsSync(new URL("./site-notes/index.html", import.meta.url)), true);
  assert.equal(SiteFind.entries[33].title, "Practice");
  assert.equal(SiteFind.entries[33].path, "practice/");
  assert.equal(SiteFind.entries[34].title, "Fun Projects");
  assert.equal(SiteFind.entries[34].path, "fun-projects/");
  assert.equal(SiteFind.entries[35].title, "Activities & Competitions");
  assert.equal(SiteFind.entries[35].path, "activities-and-competitions/");
  const pastPaperVocab = SiteFind.search("past paper vocabulary");
  assert.equal(pastPaperVocab.length, 1);
  assert.equal(pastPaperVocab[0].title, "Paper 1 - Meaning from Context");
  assert.equal(pastPaperVocab[0].path, "learning-materials/paper-1-meaning-from-context/");
  const meaning = SiteFind.search("meaning from context");
  assert.equal(meaning.length, 1);
  assert.equal(meaning[0].title, "Paper 1 - Meaning from Context");
  assert.equal(meaning[0].path, "learning-materials/paper-1-meaning-from-context/");
  assert.equal(paths.includes("learning-materials/paper-1-exam-practice/"), false);
  assert.equal(paths.includes("speech-festival/"), false);
  assert.equal(paths.includes("say-it-louder/"), false);

  const practice = SiteFind.search("paper 1 exam practice");
  assert.equal(practice.length, 1);
  assert.equal(practice[0].title, "Practice");
  assert.equal(practice[0].path, "practice/");
  assert.equal(SiteFind.search("quest hub")[0].title, "Practice");
  assert.equal(SiteFind.search("say it louder")[0].path, "fun-projects/");
  assert.equal(SiteFind.search("朗誦節")[0].path, "activities-and-competitions/");
  assert.equal(SiteFind.search("roaming mic")[0].path, "activities-and-competitions/");
  assert.equal(SiteFind.search("speak up")[0].title, "Activities & Competitions");
  assert.equal(SiteFind.search("u41").length, 0);
  assert.equal(SiteFind.search("lost bag").length, 0);
  assert.equal(SiteFind.search("club fair").length, 0);

  assert.equal(SiteFind.entries[36].title, "Paper 3 - Exam Skills");
  assert.equal(SiteFind.entries[36].path, "learning-materials/paper-3-exam-skills/");
  assert.equal(SiteFind.entries[37].title, "Paper 4 - Exam Skills");
  assert.equal(SiteFind.entries[37].path, "learning-materials/paper-4-exam-skills/");
  assert.equal(SiteFind.entries[38].title, "Classroom");
  assert.equal(SiteFind.entries[38].path, "classroom/");
  assert.equal(SiteFind.entries[39].title, "HCS Live Class");
  assert.equal(SiteFind.entries[39].path, "classroom/hcs-live-class/");
  assert.equal(SiteFind.search("paper 3 exam skills")[0].path, "learning-materials/paper-3-exam-skills/");
  assert.equal(SiteFind.search("listening skills")[0].title, "Paper 3 - Exam Skills");
  assert.equal(SiteFind.search("paper 4 exam skills")[0].path, "learning-materials/paper-4-exam-skills/");
  assert.equal(SiteFind.search("paper 4")[0].title, "Paper 4 - Speaking Expressions");
  assert.equal(SiteFind.search("classroom")[0].path, "classroom/");
  assert.equal(SiteFind.search("課堂")[0].title, "Classroom");
  assert.equal(SiteFind.search("hcs live class")[0].path, "classroom/hcs-live-class/");
  assert.equal(SiteFind.search("live class")[0].title, "HCS Live Class");
  assert.equal(paths.includes("classroom/hcs-live-class-plus/"), false);
  assert.equal(paths.includes("learning-materials/paper-1-past-paper-vocabulary/"), false);
  assert.equal(paths.includes("last-minute-notes/"), false);
  for (const query of ["updates", "site updates", "更新", "最新消息", "網站更新", "whats new", "what's new"]) {
    const hit = SiteFind.search(query);
    assert.equal(hit[0].title, "Site Notes", query);
    assert.equal(hit[0].path, "site-notes/", query);
  }
  assert.equal(SiteFind.search("學習材料")[0].path, "learning-materials/");
  assert.equal(SiteFind.search("有趣專題")[0].path, "fun-projects/");
  assert.equal(SiteFind.search("活動與比賽")[0].path, "activities-and-competitions/");
});

test("Find uses the hub brain: norm, exact, prefix, substring, cap 3", () => {
  assert.equal(SiteFind.norm("  LTE \n "), "lte");
  assert.deepEqual(SiteFind.search("   "), []);
  assert.deepEqual(SiteFind.search(""), []);

  const lte = SiteFind.search("lte");
  assert.equal(lte.length, 1);
  assert.equal(lte[0].title, "Letter to the Editor");
  assert.equal(lte[0].path, "learning-materials/paper-2-writing-formats/letter-to-the-editor/");

  const zh = SiteFind.search("讀者來函");
  assert.equal(zh[0].title, "Letter to the Editor");

  const cohesion = SiteFind.search("cohesion");
  assert.equal(cohesion[0].title, "Cohesion (Linking Words)");
  assert.equal(cohesion[0].path, "learning-materials/useful-vocabulary/#coh-h");

  const speech = SiteFind.search("speech");
  assert.equal(speech[0].title, "Speech");
  assert.equal(speech.length <= 3, true);
  assert.equal(speech.some((hit) => hit.title === "Speech Festival"), false);

  const essay = SiteFind.search("essay");
  assert.equal(essay[0].title, "Essay");
  assert.equal(essay[0].path, "learning-materials/paper-2-writing-formats/essay/");
  assert.equal(SiteFind.search("論說文")[0].title, "Essay");
  assert.equal(SiteFind.search("argumentative essay")[0].title, "Essay");

  const oneSided = SiteFind.search("one-sided argumentative");
  assert.equal(oneSided[0].title, "One-sided Argumentative");
  assert.equal(oneSided[0].path, "learning-materials/paper-2-writing-formats/essay/#one-sided");
  assert.equal(SiteFind.search("one-side argumentative")[0].title, "One-sided Argumentative");
  assert.equal(SiteFind.search("單邊議論文")[0].title, "One-sided Argumentative");

  const twoSided = SiteFind.search("two-sided argumentative");
  assert.equal(twoSided[0].title, "Two-sided Argumentative");
  assert.equal(twoSided[0].path, "learning-materials/paper-2-writing-formats/essay/#two-sided");
  assert.equal(SiteFind.search("two-side argumentative")[0].title, "Two-sided Argumentative");
  assert.equal(SiteFind.search("雙邊議論文")[0].title, "Two-sided Argumentative");

  const discursive = SiteFind.search("discursive essay");
  assert.equal(discursive[0].title, "Discursive");
  assert.equal(discursive[0].path, "learning-materials/paper-2-writing-formats/essay/#discursive");
  assert.equal(SiteFind.search("discursive writing")[0].title, "Discursive");
  assert.equal(SiteFind.search("討論文")[0].title, "Discursive");

  const story = SiteFind.search("story");
  assert.equal(story[0].title, "Story");
  assert.equal(story[0].path, "learning-materials/paper-2-writing-formats/story/");
  assert.equal(SiteFind.search("故事")[0].title, "Story");

  const questionnaire = SiteFind.search("questionnaire");
  assert.equal(questionnaire[0].title, "Questionnaire");
  assert.equal(questionnaire[0].path, "learning-materials/paper-2-writing-formats/questionnaire/");
  assert.equal(SiteFind.search("問卷")[0].title, "Questionnaire");

  const sp = SiteFind.search("sp");
  assert.equal(sp[0].title, "Sentence Patterns");

  const paper = SiteFind.search("paper");
  assert.equal(paper.length, 3);

  assert.equal(SiteFind.matches("Letter to the Editor", "  letter  "), true);
  assert.equal(SiteFind.matches("Grammar", "lte"), false);
});

test("hub cards reuse this index and do not grow a second list", () => {
  const vocab = SiteFind.extraHaystack("useful-vocabulary/");
  assert.match(vocab, /cohesion/i);
  assert.match(vocab, /銜接/);
  assert.match(vocab, /aspects/i);
  assert.equal(vocab.includes("letter to the editor"), false);

  const formats = SiteFind.extraHaystack("paper-2-writing-formats/");
  assert.match(formats, /writing formats/i);
  assert.match(formats, /\blte\b/);
  assert.match(formats, /letter to the editor/i);

  const skills = SiteFind.extraHaystack("paper-2-exam-skills/");
  assert.match(skills, /paper 2 exam skills/i);
  assert.equal(skills.includes("lte"), false);

  const home = SiteFind.extraHaystack("../");
  assert.match(home, /english home/i);
  assert.equal(home.includes("u41"), false);

  assert.equal(SiteFind.extraHaystack("../speech-festival/"), "");
  assert.equal(SiteFind.extraHaystack("paper-1-exam-practice/"), "");
  assert.equal(SiteFind.extraHaystack("https://skhhcss-eng.github.io/speech-festival/"), "");
  assert.equal(SiteFind.extraHaystack("https://skhhcss-eng.github.io/paper-1-exam-practice/"), "");

  assert.equal(SiteFind.extraHaystack("https://example.com/"), "");
});

test("Find and Ask jump links stay at the origin root on GitHub Pages", () => {
  assert.equal(SiteFind.siteBase(), "");
  assert.equal(SiteFind.baseFromScriptSrc("https://skhhcss-eng.github.io/site-find.js?v=20261030a"), "");
  assert.equal(SiteFind.baseFromScriptSrc("https://skhhcss-eng.github.io/ask.js"), "");
  assert.equal(SiteFind.baseFromPathname("/"), "");
  assert.equal(SiteFind.baseFromPathname("/learning-materials/useful-vocabulary/"), "");

  assert.equal(SiteFind.hrefFor("/"), "/");
  assert.equal(SiteFind.hrefFor("/", ""), "/");
  assert.equal(
    SiteFind.hrefFor("learning-materials/paper-2-writing-formats/letter-to-the-editor/", ""),
    "/learning-materials/paper-2-writing-formats/letter-to-the-editor/"
  );
  assert.equal(
    SiteFind.hrefFor("learning-materials/useful-vocabulary/#coh-h", ""),
    "/learning-materials/useful-vocabulary/#coh-h"
  );
});

test("Find and Ask jump links prefix /english/ on the school LMS", () => {
  assert.equal(
    SiteFind.baseFromScriptSrc("https://learning.hcs.edu.hk/english/site-find.js?v=20261030a"),
    "/english"
  );
  assert.equal(
    SiteFind.baseFromScriptSrc("https://learning.hcs.edu.hk/english/ask.js?v=20261030a"),
    "/english"
  );
  assert.equal(SiteFind.baseFromPathname("/english"), "/english");
  assert.equal(SiteFind.baseFromPathname("/english/"), "/english");
  assert.equal(
    SiteFind.baseFromPathname("/english/learning-materials/useful-vocabulary/"),
    "/english"
  );
  assert.equal(SiteFind.baseFromPathname("/learning-materials/"), "");

  const base = "/english";
  assert.equal(SiteFind.hrefFor("/", base), "/english/");
  assert.equal(SiteFind.hrefFor("", base), "/english/");
  assert.equal(
    SiteFind.hrefFor("learning-materials/paper-2-writing-formats/letter-to-the-editor/", base),
    "/english/learning-materials/paper-2-writing-formats/letter-to-the-editor/"
  );
  assert.equal(
    SiteFind.hrefFor("learning-materials/useful-vocabulary/#coh-h", base),
    "/english/learning-materials/useful-vocabulary/#coh-h"
  );
  assert.equal(SiteFind.hrefFor("/english/site-notes/", base), "/english/site-notes/");
  assert.equal(SiteFind.hrefFor("site-notes/", "/english/"), "/english/site-notes/");
});

test("script URL sets the base used by Find and Ask jumps", () => {
  const pages = loadSiteFind(
    { currentScript: { src: "https://skhhcss-eng.github.io/site-find.js?v=20261030a" } },
    { pathname: "/english/learning-materials/" }
  );
  assert.equal(pages.siteBase(), "");
  assert.equal(
    pages.hrefFor("learning-materials/paper-2-writing-formats/letter-to-the-editor/"),
    "/learning-materials/paper-2-writing-formats/letter-to-the-editor/"
  );
  assert.equal(pages.hrefFor("/"), "/");

  const lms = loadSiteFind(
    { currentScript: { src: "https://learning.hcs.edu.hk/english/site-find.js?v=20261030a" } },
    { pathname: "/" }
  );
  assert.equal(lms.siteBase(), "/english");
  assert.equal(lms.hrefFor("/"), "/english/");
  assert.equal(
    lms.hrefFor("learning-materials/useful-vocabulary/#coh-h"),
    "/english/learning-materials/useful-vocabulary/#coh-h"
  );

  const fromPage = loadSiteFind(null, { pathname: "/english/learning-materials/grammar/" });
  assert.equal(fromPage.siteBase(), "/english");
  assert.equal(fromPage.hrefFor("learning-materials/grammar/"), "/english/learning-materials/grammar/");

  const rootPage = loadSiteFind(null, { pathname: "/learning-materials/" });
  assert.equal(rootPage.siteBase(), "");
  assert.equal(rootPage.hrefFor("site-notes/"), "/site-notes/");
});

test("Spelling Watchlist aliases jump to the new part names", () => {
  for (const query of [
    "spelling",
    "confusing pairs",
    "british vs american",
    "true misspellings",
    "confusable",
    "british forms",
    "true misspellings (correct forms)"
  ]) {
    const hit = SiteFind.search(query);
    assert.equal(hit[0].title, "Spelling Watchlist", query);
    assert.equal(hit[0].path, "learning-materials/useful-vocabulary/#spell-h");
  }
  const hub = SiteFind.extraHaystack("useful-vocabulary/");
  assert.match(hub, /confusing pairs/i);
  assert.match(hub, /british vs american/i);
  assert.match(hub, /true misspellings/i);
});

test("Paper 1 practice and Speech Festival hub cards open the project sites", () => {
  const notes = fs.readFileSync(new URL("./learning-materials/index.html", import.meta.url), "utf8");
  const practicePage = fs.readFileSync(new URL("./practice/index.html", import.meta.url), "utf8");
  const funPage = fs.readFileSync(new URL("./fun-projects/index.html", import.meta.url), "utf8");
  const activitiesPage = fs.readFileSync(new URL("./activities-and-competitions/index.html", import.meta.url), "utf8");

  assert.match(
    practicePage,
    /href="https:\/\/skhhcss-eng\.github\.io\/paper-1-exam-practice\/" target="_blank" rel="noopener noreferrer"/
  );
  assert.match(practicePage, /Paper 1 - Reading/);
  assert.match(practicePage, /Question types, topics and past papers\./);
  assert.equal(practicePage.includes('href="paper-1-exam-practice/"'), false);

  assert.match(
    funPage,
    /href="https:\/\/skhhcss-eng\.github\.io\/say-it-louder\/" target="_blank" rel="noopener noreferrer"/
  );
  assert.match(funPage, /<title>Fun Projects ·/);
  assert.match(funPage, /<h1>Fun Projects<\/h1>/);
  assert.match(funPage, /Practise speaking in a short interactive story\./);

  assert.match(
    activitiesPage,
    /href="https:\/\/skhhcss-eng\.github\.io\/speech-festival\/" target="_blank" rel="noopener noreferrer"/
  );
  assert.match(
    activitiesPage,
    /href="https:\/\/nets\.edb\.edcity\.hk\/page\.php\?p=339" target="_blank" rel="noopener noreferrer"/
  );
  assert.match(
    activitiesPage,
    /href="https:\/\/nets\.edb\.edcity\.hk\/page\.php\?p=671" target="_blank" rel="noopener noreferrer"/
  );
  const competitionsAt = activitiesPage.indexOf('id="sec-competitions"');
  const activitiesAt = activitiesPage.indexOf('id="sec-activities"');
  const roamingAt = activitiesPage.indexOf("Roaming Mic Challenge");
  assert.equal(competitionsAt !== -1 && activitiesAt > competitionsAt && roamingAt > activitiesAt, true);
  assert.equal(activitiesPage.slice(competitionsAt, activitiesAt).includes("Roaming Mic Challenge"), false);

  assert.equal(notes.includes("https://skhhcss-eng.github.io/paper-1-exam-practice/"), false);
  assert.equal(notes.includes("https://skhhcss-eng.github.io/say-it-louder/"), false);
  assert.equal(notes.includes("https://skhhcss-eng.github.io/speech-festival/"), false);
  assert.equal(notes.includes("nets.edb.edcity.hk"), false);
  assert.equal(notes.includes("Say It Louder"), false);
  assert.equal(notes.includes("Roaming Mic"), false);
  assert.match(notes, /href="\.\.\/practice\/"/);
  assert.equal(notes.includes('href="paper-1-exam-practice/"'), false);
  assert.equal(notes.includes('href="../speech-festival/"'), false);
  assert.equal(notes.includes('>Competition</button>'), false);
  assert.equal(notes.includes('>Activity</button>'), false);
  assert.equal(notes.includes('>Desktop</button>'), false);

  const practice = fs.readFileSync(
    new URL("./learning-materials/paper-1-exam-practice/index.html", import.meta.url),
    "utf8"
  );
  assert.match(practice, /HKDSE English Paper 1 Quest Hub/);
  assert.match(
    practice,
    /pathname\.indexOf\("\/learning-materials\/paper-1-exam-practice"\)!==-1\)location\.replace\("https:\/\/skhhcss-eng\.github\.io\/paper-1-exam-practice\/"/
  );
  const festival = fs.readFileSync(new URL("./speech-festival/index.html", import.meta.url), "utf8");
  assert.match(festival, /href="solo-verse\/"/);
  assert.match(festival, /href="u41\/"/);

  const removedRedirects = [
    "learning-materials/paper-1-exam-practice/redirect.html",
    "learning-materials/reading-paper-1/index.html",
    "speech-festival/redirect.html",
    "speech-festival/solo-verse/redirect.html",
    "speech-festival/u41/redirect.html",
    "speech-festival/u47/redirect.html",
    "speech-festival/u66/redirect.html"
  ];
  for (const file of removedRedirects) {
    assert.equal(fs.existsSync(new URL("./" + file, import.meta.url)), false, file);
  }
});

test("English home cards each have one job, in order", () => {
  const home = fs.readFileSync(new URL("./index.html", import.meta.url), "utf8");
  const titles = [...home.matchAll(/<h2>([^<]+)<\/h2>/g)].map((hit) => hit[1]);
  assert.deepEqual(titles, [
    "Learning Materials",
    "Practice",
    "Fun Projects",
    "Activities &amp; Competitions",
    "Classroom",
    "Site Notes"
  ]);
  assert.match(home, /Study notes, skills, glossaries, and drills\./);
  assert.match(home, /Exam-style practice, starting with Paper 1\./);
  assert.match(home, /Games and creative projects, such as Say It Louder\./);
  assert.match(home, /Speech Festival, Speak Up, and challenges like Roaming Mic\./);
  assert.match(home, /Live lesson tools — desks, roster, and points\./);
  assert.match(home, /What was added or changed on this site\./);
  assert.match(home, /Open Materials →/);
  assert.match(home, /Open Practice →/);
  assert.match(home, /Open Fun Projects →/);
  assert.match(home, /Open Activities →/);
  assert.match(home, /Open Classroom →/);
  assert.match(home, /Open Site Notes →/);
  assert.equal(home.includes("Open materials"), false);
  assert.equal(home.includes("Open practice →"), false);
  assert.equal(home.includes("Open activities →"), false);
  assert.match(home, /href="learning-materials\/"/);
  assert.match(home, /href="practice\/"/);
  assert.match(home, /href="fun-projects\/"/);
  assert.match(home, /href="activities-and-competitions\/"/);
  assert.match(home, /href="classroom\/"/);
  assert.match(home, /href="site-notes\/"/);
  assert.match(home, /badge-teacher">Teacher</);
  assert.match(home, /badge-updates">Updates</);
  assert.equal(home.includes("card-zh"), false);
  assert.equal(home.includes("學習材料"), false);
  assert.equal(home.includes("練習"), false);
  assert.equal(home.includes("有趣專題"), false);
  assert.equal(home.includes("活動與比賽"), false);
  assert.equal(home.includes("課堂"), false);
  assert.equal(home.includes("網站更新"), false);
  assert.match(home, /M12 5\.2C9\.55 4\.35 7\.05 4\.2 5\.1 4\.55/);
  assert.match(home, /<circle cx="12" cy="12" r="8\.15"\/>/);
  assert.match(home, /<rect x="3\.3" y="8\.15" width="17\.4" height="9\.2" rx="2\.8"\/>/);
  assert.match(home, /M7\.6 4\.85h8\.8/);
  assert.match(home, /<rect x="3\.85" y="4\.15" width="7\.15" height="6\.7" rx="1\.35"\/>/);
  assert.match(home, /M7\.1 3\.85h6\.55l4\.25 4\.25/);
  assert.equal(home.includes('aria-hidden="true"'), true);
  assert.match(home, /color: var\(--accent-deep\)/);
  assert.match(home, /\.card-title svg \{ width: 36px; height: 36px; \}/);
  assert.match(home, /\.utility svg \{ width: 22px; height: 22px; margin-top: 1px; \}/);
  const cardsAt = home.indexOf('<div class="cards">');
  const utilityAt = home.indexOf('<div class="utility-strip">');
  const footerAt = home.indexOf("<footer>");
  assert.equal(cardsAt !== -1 && utilityAt > cardsAt && footerAt > utilityAt, true);
  const hero = home.slice(cardsAt, utilityAt);
  const strip = home.slice(utilityAt, footerAt);
  assert.equal(hero.includes(">Classroom<"), false);
  assert.equal(hero.includes(">Site Notes<"), false);
  assert.equal(strip.includes(">Learning Materials<"), false);
  assert.equal(strip.includes(">Fun Projects<"), false);
  assert.match(strip, /badge-teacher">Teacher</);
  assert.match(strip, /badge-updates">Updates</);
  assert.match(home, /src="assets\/logo\.png"/);
  assert.equal(home.includes("https://www.hcs.edu.hk/template/app/img/logo.png"), false);
  assert.match(home, /rel="apple-touch-icon"/);
  assert.match(home, /rel="manifest" href="site\.webmanifest"/);
  assert.equal(home.includes("last-minute-notes"), false);
  assert.equal(home.includes("instagram"), false);
  assert.equal(home.includes("Highlights"), false);
});

test("subject pages self-host the school logo and link the home-screen icon", () => {
  const hotlink = "https://www.hcs.edu.hk/template/app/img/logo.png";
  function walk(dir, acc) {
    for (const name of fs.readdirSync(dir)) {
      if (name === "node_modules" || name === ".git") continue;
      const full = new URL(name + (fs.statSync(new URL(name, dir)).isDirectory() ? "/" : ""), dir);
      if (fs.statSync(full).isDirectory()) walk(full, acc);
      else if (name.endsWith(".html")) acc.push(full);
    }
    return acc;
  }
  const pages = walk(new URL("./", import.meta.url), []);
  for (const page of pages) {
    const html = fs.readFileSync(page, "utf8");
    assert.equal(html.includes(hotlink), false, page.pathname);
  }
  const blog = fs.readFileSync(
    new URL("./learning-materials/paper-2-writing-formats/blog/index.html", import.meta.url),
    "utf8"
  );
  assert.match(blog, /src="\.\.\/\.\.\/\.\.\/assets\/logo\.png"/);
  assert.match(blog, /href="\.\.\/\.\.\/\.\.\/apple-touch-icon\.png"/);
  assert.match(blog, /href="\.\.\/\.\.\/\.\.\/site\.webmanifest"/);
  assert.match(blog, /site-find\.js\?v=20261115a/);
  const hub = fs.readFileSync(new URL("./learning-materials/index.html", import.meta.url), "utf8");
  assert.match(hub, /src="\.\.\/assets\/logo\.png"/);
  assert.match(hub, /site-find\.js\?v=20261115a/);
  const manifest = fs.readFileSync(new URL("./site.webmanifest", import.meta.url), "utf8");
  assert.match(manifest, /"short_name": "HCS English"/);
  assert.match(manifest, /"name": "HCS English"/);
  assert.match(manifest, /"theme_color": "#123a4d"/);
  assert.equal(fs.existsSync(new URL("./assets/logo.png", import.meta.url)), true);
  assert.equal(fs.existsSync(new URL("./apple-touch-icon.png", import.meta.url)), true);
  const live = fs.readFileSync(new URL("./classroom/hcs-live-class/site.webmanifest", import.meta.url), "utf8");
  assert.match(live, /"name": "HCS Live Class"/);
  const plus = fs.readFileSync(new URL("./classroom/hcs-live-class-plus/site.webmanifest", import.meta.url), "utf8");
  assert.match(plus, /"name": "HCS Live Class \+"/);
  const notes = fs.readFileSync(new URL("./site-notes/index.html", import.meta.url), "utf8");
  assert.match(notes, /src="\.\.\/assets\/logo\.png"/);
  assert.match(notes, /Site version: <span data-site-version-label>/);
  assert.equal(notes.includes("site-find.js"), false);
});

test("rectsOverlap is a soft-fail check for the Ask circle and the dock", () => {
  const circle = { left: 12, top: 700, right: 68, bottom: 756, width: 56, height: 56 };
  const chip = { left: 334, top: 740, right: 378, bottom: 784, width: 44, height: 44 };
  assert.equal(SiteFind.rectsOverlap(circle, chip), false);
  const bar = { left: 0, top: 740, right: 390, bottom: 800, width: 390, height: 60 };
  assert.equal(SiteFind.rectsOverlap(circle, bar), true);
  const lifted = { left: 12, top: 670, right: 68, bottom: 726, width: 56, height: 56 };
  assert.equal(SiteFind.rectsOverlap(lifted, bar), false);
});
