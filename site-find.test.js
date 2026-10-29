import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const SiteFind = require("./site-find.js");

test("alias index is Tess’s 32 entries and paths are unique", () => {
  assert.equal(SiteFind.entries.length, 32);
  const paths = SiteFind.entries.map((entry) => entry.path);
  assert.equal(new Set(paths).size, 32);
  assert.equal(SiteFind.entries[0].title, "English Home");
  assert.equal(SiteFind.entries[0].path, "/");
  assert.equal(SiteFind.entries[31].title, "What's New");
  assert.equal(SiteFind.entries[31].path, "whats-new/");
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
  assert.equal(speech.some((hit) => hit.title === "Speech Festival"), true);

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

  const festival = SiteFind.extraHaystack("../speech-festival/");
  assert.match(festival, /u41/);
  assert.match(festival, /朗誦節/);

  assert.equal(SiteFind.extraHaystack("https://example.com/"), "");
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
