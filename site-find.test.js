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
  assert.equal(SiteFind.entries.length, 26);
  const paths = SiteFind.entries.map((entry) => entry.path);
  assert.equal(new Set(paths).size, 26);
  assert.equal(SiteFind.entries[0].title, "English Home");
  assert.equal(SiteFind.entries[0].path, "/");
  assert.equal(SiteFind.entries[25].title, "What's New");
  assert.equal(SiteFind.entries[25].path, "whats-new/");
  assert.equal(paths.includes("learning-materials/paper-1-exam-practice/"), false);
  assert.equal(paths.includes("speech-festival/"), false);
  assert.equal(SiteFind.search("paper 1 exam practice").length, 0);
  assert.equal(SiteFind.search("quest hub").length, 0);
  assert.equal(SiteFind.search("朗誦節").length, 0);
  assert.equal(SiteFind.search("u41").length, 0);
  assert.equal(SiteFind.search("say it louder").length, 0);
  assert.equal(SiteFind.search("lost bag").length, 0);
  assert.equal(SiteFind.search("club fair").length, 0);
  assert.equal(paths.includes("say-it-louder/"), false);
});

test("Find uses the hub brain: norm, exact, prefix, substring, cap 3", () => {
  assert.equal(SiteFind.norm("  LTE \n "), "lte");
  assert.deepEqual(SiteFind.search("   "), []);
  assert.deepEqual(SiteFind.search(""), []);

  const lte = SiteFind.search("lte");
  assert.equal(lte.length, 1);
  assert.equal(lte[0].title, "Letter to the Editor");
  assert.equal(lte[0].path, "learning-materials/paper-2-exam-skills/letter-to-the-editor/");

  const zh = SiteFind.search("讀者來函");
  assert.equal(zh[0].title, "Letter to the Editor");

  const cohesion = SiteFind.search("cohesion");
  assert.equal(cohesion[0].title, "Cohesion (Linking Words)");
  assert.equal(cohesion[0].path, "learning-materials/useful-vocabulary/#coh-h");

  const speech = SiteFind.search("speech");
  assert.equal(speech[0].title, "Speech");
  assert.equal(speech.length <= 3, true);
  assert.equal(speech.some((hit) => hit.title === "Speech Festival"), false);

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
  assert.equal(formats.includes("lte"), false);

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
    SiteFind.hrefFor("learning-materials/paper-2-exam-skills/letter-to-the-editor/", ""),
    "/learning-materials/paper-2-exam-skills/letter-to-the-editor/"
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
    SiteFind.hrefFor("learning-materials/paper-2-exam-skills/letter-to-the-editor/", base),
    "/english/learning-materials/paper-2-exam-skills/letter-to-the-editor/"
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
    pages.hrefFor("learning-materials/paper-2-exam-skills/letter-to-the-editor/"),
    "/learning-materials/paper-2-exam-skills/letter-to-the-editor/"
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
  const hub = fs.readFileSync(new URL("./learning-materials/index.html", import.meta.url), "utf8");
  assert.match(
    hub,
    /href="https:\/\/skhhcss-eng\.github\.io\/paper-1-exam-practice\/" target="_blank" rel="noopener noreferrer"/
  );
  assert.match(
    hub,
    /href="https:\/\/skhhcss-eng\.github\.io\/speech-festival\/" target="_blank" rel="noopener noreferrer"/
  );
  assert.equal(hub.includes('href="paper-1-exam-practice/"'), false);
  assert.equal(hub.includes('href="../speech-festival/"'), false);

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

  const stubs = [
    ["learning-materials/paper-1-exam-practice/redirect.html", "https://skhhcss-eng.github.io/paper-1-exam-practice/"],
    ["learning-materials/reading-paper-1/index.html", "https://skhhcss-eng.github.io/paper-1-exam-practice/"],
    ["speech-festival/redirect.html", "https://skhhcss-eng.github.io/speech-festival/"],
    ["speech-festival/solo-verse/redirect.html", "https://skhhcss-eng.github.io/speech-festival/solo-verse/"],
    ["speech-festival/u41/redirect.html", "https://skhhcss-eng.github.io/speech-festival/u41/"],
    ["speech-festival/u47/redirect.html", "https://skhhcss-eng.github.io/speech-festival/u47/"],
    ["speech-festival/u66/redirect.html", "https://skhhcss-eng.github.io/speech-festival/u66/"]
  ];
  for (const [file, url] of stubs) {
    const html = fs.readFileSync(new URL("./" + file, import.meta.url), "utf8");
    assert.match(html, new RegExp("location\\.replace\\(\"" + url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(html, new RegExp("location\\.search \\+ location\\.hash"));
    assert.match(html, new RegExp('content="0; url=' + url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '"'));
  }
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
