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
  assert.equal(SiteFind.entries.length, 32);
  const paths = SiteFind.entries.map((entry) => entry.path);
  assert.equal(new Set(paths).size, 32);
  assert.equal(SiteFind.entries[0].title, "English Home");
  assert.equal(SiteFind.entries[0].path, "/");
  assert.equal(SiteFind.entries[28].title, "What's New");
  assert.equal(SiteFind.entries[28].path, "whats-new/");
  assert.equal(SiteFind.entries[29].title, "Practice");
  assert.equal(SiteFind.entries[29].path, "practice/");
  assert.equal(SiteFind.entries[30].title, "Fun Projects");
  assert.equal(SiteFind.entries[30].path, "fun-projects/");
  assert.equal(SiteFind.entries[31].title, "Activities & Competitions");
  assert.equal(SiteFind.entries[31].path, "activities-and-competitions/");
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
  assert.equal(SiteFind.hrefFor("/english/whats-new/", base), "/english/whats-new/");
  assert.equal(SiteFind.hrefFor("whats-new/", "/english/"), "/english/whats-new/");
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
  assert.equal(rootPage.hrefFor("whats-new/"), "/whats-new/");
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
    "What's New"
  ]);
  assert.match(home, /Exam skills, writing formats, junior grammar, and useful vocabulary\./);
  assert.match(home, /Exam-style practice, starting with Paper 1\./);
  assert.match(home, /Say It Louder, with more fun English projects to come\./);
  assert.match(home, /Speech Festival, Speak Up, and challenges like Roaming Mic\./);
  assert.match(home, /Teacher tools for live lessons — HCS Live Class \(desks, roster, live points\)\./);
  assert.match(home, /See what was added or changed on the English subject site\./);
  assert.match(home, /href="learning-materials\/"/);
  assert.match(home, /href="practice\/"/);
  assert.match(home, /href="fun-projects\/"/);
  assert.match(home, /href="activities-and-competitions\/"/);
  assert.match(home, /href="classroom\/"/);
  assert.match(home, /href="whats-new\/"/);
  assert.match(home, /badge-teacher">Teacher</);
  assert.equal(home.includes("last-minute-notes"), false);
  assert.equal(home.includes("instagram"), false);
  assert.equal(home.includes("Highlights"), false);
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
