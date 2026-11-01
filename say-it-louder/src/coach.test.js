import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { USE_MOCK, mockCoach, queryCoach } from "./ai-service.js";
import { SCENARIOS } from "./scenarios.js";
import { applyHardwareAction, freshState, isWin, listScenarios } from "./main.js";

const pack = SCENARIOS.level_1_lost_bag;
const FULL = "The small navy bag under the seat between the black bag and the yellow lunchbox.";

function coach(transcript, state) {
  return mockCoach({
    scenario: pack,
    currentState: state || freshState(pack),
    transcript: transcript
  });
}

function keys(result) {
  return Object.keys(result).sort();
}

test("mock flag is on and both scenario keys share the lost-bag pack", () => {
  assert.equal(USE_MOCK, true);
  assert.equal(SCENARIOS.mission_1_lost_bag, pack);
  assert.equal(pack.id, "level_1_lost_bag");
  assert.equal(listScenarios().length, 1);
  assert.equal(listScenarios()[0].title, "Mission 1: The Lost Bag");
});

test("coach JSON is the four-field contract", async () => {
  const result = await queryCoach({
    scenario: pack,
    currentState: freshState(pack),
    transcript: "Look under the seats near the door."
  });
  assert.deepEqual(keys(result), ["hardware_action", "mood", "spoken_reply", "teacher_tip"]);
  assert.ok(pack.moods.includes(result.mood));
  assert.ok(pack.allowedActions.includes(result.hardware_action));
});

test("beat 1 places Leo near the door, including a dropped article", () => {
  const exact = coach("Look under the seats near the door.");
  assert.equal(exact.hardware_action, "SEAT_NEAR_DOOR");
  assert.equal(exact.mood, "PANICKED");
  assert.match(exact.spoken_reply, /near the door/i);
  assert.match(exact.teacher_tip, /colour or size/i);

  const dropped = coach("look under seat near door");
  assert.equal(dropped.hardware_action, "SEAT_NEAR_DOOR");

  const inside = coach("Look in the door.");
  assert.equal(inside.hardware_action, "NONE");
  assert.match(inside.teacher_tip, /Near the door/i);
});

test("beat 2 traps vague bag language without a clarity strike action", () => {
  for (const line of ["the bag", "that one", "pick up the bag"]) {
    const result = coach(line);
    assert.equal(result.hardware_action, "HOVER_CONFUSED", line);
    assert.equal(result.mood, "CONFUSED", line);
    assert.match(result.spoken_reply, /black one or the navy one/i);
  }
});

test("beat 3 picks the small navy bag only when size, colour, under, and between are all there", () => {
  const result = coach(FULL);
  assert.deepEqual(result, pack.lines.beat3);
  const next = applyHardwareAction(freshState(pack), result.hardware_action);
  assert.equal(next.BAG_NAVY_SMALL, "HELD");
  assert.equal(isWin(pack, next), false);

  const short = coach("Pick the small navy bag under the seat.");
  assert.equal(short.hardware_action, "NONE");
  assert.match(short.spoken_reply, /Between what and what/i);

  const navyOnly = coach("the navy bag");
  assert.equal(navyOnly.hardware_action, "NONE");
  assert.match(navyOnly.spoken_reply, /small/i);

  const blue = coach("the blue bag");
  assert.equal(blue.hardware_action, "HOVER_CONFUSED");
  assert.match(blue.teacher_tip, /navy/i);
});

test("beat 4 confirms the name tag only after the navy bag is held, or in one clear sentence", () => {
  const early = coach("Check the name tag on the front.");
  assert.equal(early.hardware_action, "HOVER_CONFUSED");
  assert.equal(isWin(pack, applyHardwareAction(freshState(pack), early.hardware_action)), false);

  const held = applyHardwareAction(freshState(pack), "BAG_NAVY_SMALL");
  const tagged = coach("Check the name tag on the front.", held);
  assert.deepEqual(tagged, pack.lines.beat4);
  const won = applyHardwareAction(held, tagged.hardware_action);
  assert.equal(isWin(pack, won), true);

  const inside = coach("Check the name tag in the bag.", held);
  assert.equal(inside.hardware_action, "NONE");
  assert.match(inside.teacher_tip, /On the bag/i);

  const combined = coach(FULL.replace(/\.$/, "") + " and check the name tag on the front.");
  assert.equal(combined.hardware_action, "SHOW_NAME_TAG");
  assert.equal(isWin(pack, applyHardwareAction(freshState(pack), combined.hardware_action)), true);
});

test("beat 5 wrong bags are clarity strikes and do not win", () => {
  const black = coach("the black bag");
  assert.deepEqual(black, pack.lines.beat5Black);
  assert.equal(isWin(pack, applyHardwareAction(freshState(pack), black.hardware_action)), false);

  const sports = coach("Pick up the black sports bag.");
  assert.equal(sports.hardware_action, "BAG_BLACK_SPORTS");

  const big = coach("the big bag");
  assert.equal(big.hardware_action, "BAG_GREY_BIG");

  const grey = coach("Grab the big gray bag.");
  assert.equal(grey.hardware_action, "BAG_GREY_BIG");

  const lunch = coach("the yellow lunchbox");
  assert.equal(lunch.hardware_action, "LUNCHBOX_YELLOW");

  const notGrey = coach("Not the big grey one — the navy one between the sports bag and the lunchbox.");
  assert.equal(notGrey.hardware_action, "NONE");
  assert.equal(pack.clarityStrikeActions.includes(notGrey.hardware_action), false);
});

test("beat 6 celebration plays only after the bag and the name tag", () => {
  const early = coach("Take the small navy bag and get off at the next stop.");
  assert.notEqual(early.hardware_action, "SHOW_NAME_TAG");
  assert.match(early.spoken_reply, /name tag/i);
  assert.equal(isWin(pack, applyHardwareAction(freshState(pack), early.hardware_action)), false);

  let state = applyHardwareAction(freshState(pack), "BAG_NAVY_SMALL");
  state = applyHardwareAction(state, "SHOW_NAME_TAG");
  const done = coach("Take the small navy bag and get off at the next stop.", state);
  assert.deepEqual(done, pack.lines.beat6);
  assert.equal(done.mood, "RELIEVED");
});

test("beside is not between, and a landmark phrase is not a wrong-bag grab", () => {
  const beside = coach("It's beside the black bag.");
  assert.equal(beside.hardware_action, "HOVER_CONFUSED");
  assert.match(beside.teacher_tip, /Between A and B/i);

  const landmark = coach("under the seat between the black bag and the yellow lunchbox");
  assert.equal(landmark.hardware_action, "NONE");
  assert.equal(pack.clarityStrikeActions.includes(landmark.hardware_action), false);
});

test("student page has no API key and no Three.js", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  const ai = fs.readFileSync(new URL("./ai-service.js", import.meta.url), "utf8");
  assert.match(html, /Say It Louder/);
  assert.match(html, /Say it clearer/);
  assert.match(html, /type="module"/);
  assert.equal(/apiKey|api-key|deepseek/i.test(html + css), false);
  assert.equal(/three\.js|THREE\./.test(html + css + ai), false);
  assert.match(ai, /export const USE_MOCK = true/);
});

test("lost-bag copy stays school-safe", () => {
  const files = ["scenarios.js", "ai-service.js", "main.js", "scene2d.js"];
  const banned = /\b(bomb|disarm|detonat|explosion|terror|wire|blast)\b/i;
  for (const file of files) {
    const text = fs.readFileSync(new URL("./" + file, import.meta.url), "utf8");
    assert.equal(banned.test(text), false, file);
  }
});
