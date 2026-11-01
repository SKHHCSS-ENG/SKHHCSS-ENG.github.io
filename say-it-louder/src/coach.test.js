import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { USE_MOCK, coachWorkerUrl, forgivePronunciation, heardText, mockCoach, normaliseCoachReply, normaliseUtterance, queryCoach } from "./ai-service.js";
import { SCENARIOS } from "./scenarios.js";
import { applyHardwareAction, clarityLabel, freshState, isWin, listScenarios, packForId } from "./main.js";
import { MAP_SPOTS, campusPlate, carriagePlate, sceneCue } from "./scene2d.js";

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

test("live coach is on and both scenario keys share the lost-bag pack", () => {
  assert.equal(USE_MOCK, false);
  assert.equal(SCENARIOS.mission_1_lost_bag, pack);
  assert.equal(pack.id, "level_1_lost_bag");
  assert.equal(listScenarios().length, 2);
  assert.equal(listScenarios()[0].title, "Mission 1: The Lost Bag");
  assert.equal(listScenarios()[0].id, "level_1_lost_bag");
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
  assert.equal(short.mood, "CONFUSED");
  assert.match(short.spoken_reply, /few bags under the seat/i);
  assert.match(short.spoken_reply, /navy/i);
  assert.match(short.spoken_reply, /black sports bag/i);
  assert.match(short.spoken_reply, /yellow lunchbox/i);

  const which = coach("under the seat");
  assert.equal(which.mood, "CONFUSED");
  assert.match(which.spoken_reply, /few bags under the seat/i);
  assert.equal(pack.lines.zoneAgain.mood, "CONFUSED");
  assert.equal(pack.lines.zoneAgain.hardware_action, "HOVER_CONFUSED");
  assert.match(pack.lines.zoneAgain.spoken_reply, /few bags under the seat/i);

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
  assert.match(beside.teacher_tip, /Between names both sides/i);

  const landmark = coach("under the seat between the black bag and the yellow lunchbox");
  assert.equal(landmark.hardware_action, "NONE");
  assert.equal(pack.clarityStrikeActions.includes(landmark.hardware_action), false);
});

test("soft-oops stills swap on the wrong-path beats", () => {
  const bag = freshState(pack);
  assert.equal(carriagePlate("NONE", bag, "PANICKED", ""), "m1-01");
  assert.equal(carriagePlate("SEAT_NEAR_DOOR", freshState(pack), "PANICKED", ""), "m1-01");
  const looking = applyHardwareAction(bag, "SEAT_NEAR_DOOR");
  assert.equal(carriagePlate("SEAT_NEAR_DOOR", looking, "PANICKED", ""), "m1-02");
  assert.equal(carriagePlate("LUNCHBOX_YELLOW", looking, "PANICKED", ""), "m1-02");
  assert.equal(carriagePlate("HOVER_CONFUSED", bag, "CONFUSED", ""), "m1-03");
  assert.equal(carriagePlate("BAG_BLACK_SPORTS", looking, "CONFUSED", ""), "m1-f01");
  assert.equal(carriagePlate("BAG_BLACK_SPORTS", looking, "PANICKED", "", true), "m1-f03");
  assert.equal(carriagePlate("BAG_GREY_BIG", looking, "PANICKED", ""), "m1-f02");
  assert.equal(carriagePlate("BAG_GREY_BIG", looking, "PANICKED", "", true), "m1-f03");
  const held = applyHardwareAction(looking, "BAG_NAVY_SMALL");
  assert.equal(carriagePlate("BAG_NAVY_SMALL", held, "HOPEFUL", ""), "m1-04");
  assert.equal(carriagePlate("BAG_GREY_BIG", held, "PANICKED", ""), "m1-f02");
  const tagged = applyHardwareAction(held, "SHOW_NAME_TAG");
  assert.equal(carriagePlate("SHOW_NAME_TAG", tagged, "RELIEVED", "win"), "m1-06");

  const gate = freshState(mapPack);
  const canteen = Object.assign(freshState(mapPack), { NODE: "CANTEEN", CANTEEN: "FOIL" });
  assert.equal(campusPlate("ARRIVE_CANTEEN", canteen, "CONFUSED", "", true), "m2-f01");
  assert.equal(campusPlate("STEP_BACK", Object.assign(freshState(mapPack), { NODE: "WALKWAY" }), "CONFUSED", ""), "m2-f01");
  const past = Object.assign(freshState(mapPack), { NODE: "CANTEEN_PATH", CANTEEN: "PAST" });
  assert.equal(campusPlate("WALK_PAST_CANTEEN", past, "HOPEFUL", "", true), "m2-08");
  assert.equal(campusPlate("NONE", past, "HOPEFUL", ""), "m2-04");
  assert.equal(campusPlate("ARRIVE_HALL", Object.assign(freshState(mapPack), { NODE: "HALL" }), "CONFUSED", ""), "m2-06");
  assert.equal(campusPlate("HOVER_CONFUSED", Object.assign(freshState(mapPack), { NODE: "WALKWAY" }), "CONFUSED", ""), "m2-09");
  assert.equal(campusPlate("NONE", gate, "CONFUSED", ""), "m2-01");
  assert.equal(campusPlate("NONE", gate, "CONFUSED", "miss"), "m2-f02");
  assert.equal(campusPlate("ARRIVE_LIBRARY", Object.assign(freshState(mapPack), { NODE: "LIBRARY" }), "RELIEVED", "win"), "m2-10");

  const scene = fs.readFileSync(new URL("./scene2d.js", import.meta.url), "utf8");
  const plates = [
    "say-it-louder-M1-F01-wrong-black-bag.jpg",
    "say-it-louder-M1-F02-wrong-grey-bag.jpg",
    "say-it-louder-M1-F03-put-bag-back.jpg",
    "say-it-louder-M2-F01-canteen-enter.jpg",
    "say-it-louder-M2-F02-bells-gone-gate.jpg"
  ];
  plates.forEach(function (name) {
    assert.match(scene, new RegExp(name.replace(".", "\\.")));
    assert.equal(fs.existsSync(new URL("../assets/" + name, import.meta.url)), true, name);
  });
  assert.match(scene, /PUT_BACK_MS/);
  assert.match(fs.readFileSync(new URL("../index.html", import.meta.url), "utf8"), /main\.js\?v=20261101d/);
});

test("hub card does not tag a device", () => {
  const hub = fs.readFileSync(new URL("../../learning-materials/index.html", import.meta.url), "utf8");
  const start = hub.indexOf('href="../say-it-louder/"');
  assert.equal(start > 0, true);
  const card = hub.slice(start, hub.indexOf("</a>", start));
  assert.match(card, /Say It Louder/);
  assert.match(card, /badge-activity/);
  assert.equal(/badge-phone|>Phone<|>Desktop<|>Android<|>iOS</i.test(card), false);
  const page = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.equal(/badge-phone|>Phone</i.test(page), false);
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
  assert.match(ai, /export const USE_MOCK = false/);
  assert.match(ai, /https:\/\/deepseek-explain\.skhhcss-eng\.workers\.dev/);
  assert.match(ai, /page: "Say It Louder"/);
  assert.equal(/DEEPSEEK_API_KEY|api[_-]?key\b|Bearer\s|sk-[A-Za-z0-9]{8,}/i.test(html + css + ai), false);
  assert.match(html, /id="micBtn"[^>]*class="ask-send api-mesh"/);
  assert.match(html, /id="sendBtn"[^>]*class="ask-send api-mesh"/);
  assert.match(css, /#micBtn\.ask-send\.api-mesh/);
  assert.match(css, /say-clearer-pulse/);
  assert.equal(css.includes("#1458d6"), false);
});

test("clarity pill counts chances still left", () => {
  assert.equal(clarityLabel(0, 3), "3 clear chances");
  assert.equal(clarityLabel(1, 3), "2 clear chances");
  assert.equal(clarityLabel(2, 3), "1 clear chance");
  assert.equal(clarityLabel(3, 3), "No clear chances");
  assert.equal(clarityLabel(9, 3), "No clear chances");
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /id="clarityHud"[^>]*>3 clear chances</);
  assert.equal(/Clarity 0/.test(html), false);
});

test("wait and hold cues name the moment", () => {
  assert.deepEqual(sceneCue("HOVER_CONFUSED", freshState(pack)), {
    kind: "wait",
    text: "Wait — say the colour and the size."
  });
  const held = applyHardwareAction(freshState(pack), "BAG_NAVY_SMALL");
  assert.equal(sceneCue("HOVER_CONFUSED", held).kind, "wait");
  assert.equal(sceneCue("BAG_NAVY_SMALL", held).kind, "hold");
  assert.match(sceneCue("BAG_NAVY_SMALL", held).text, /small navy bag/);
  const won = applyHardwareAction(held, "SHOW_NAME_TAG");
  assert.equal(sceneCue("SHOW_NAME_TAG", won), null);
  assert.equal(sceneCue("SEAT_NEAR_DOOR", freshState(pack)), null);
});

test("phone Ask chip stays off Leo, Ms Chan, and the dialogue", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const scene = fs.readFileSync(new URL("./scene2d.js", import.meta.url), "utf8");
  const ask = fs.readFileSync(new URL("../../ask.js", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(html, /data-ask-park/);
  assert.match(html, /class="dialogue"[^>]*data-ask-clear/);
  const marks = scene.match(/setAttribute\("data-ask-clear"/g) || [];
  assert.equal(marks.length >= 4, true);
  assert.match(ask, /\[data-ask-clear\]/);
  assert.match(ask, /data-ask-park/);
  assert.match(ask, /innerWidth < 860/);
  assert.match(css, /\.prop-black \.prop-strap/);
  assert.match(css, /\.prop-grey \.prop-body/);
  assert.match(css, /\.prop-lunch \.prop-strap/);
  assert.match(css, /\.prop-navy \.prop-mark/);
  assert.match(css, /\.is-hold-navy \.prop-navy/);
  assert.match(css, /\.is-hover \.leo/);
  assert.match(css, /\.leo-name/);
  assert.match(css, /\.has-plate \.prop-body[\s\S]{0,400}display:\s*none/);
  assert.match(css, /\.has-plate \.campus-path/);
  assert.match(css, /\.has-plate \.leo-head/);
  assert.match(css, /data-plate="m1-02"\] \.prop-navy/);
  assert.match(css, /data-plate="m2-07"\] \.pin-library/);
  assert.match(css, /\.has-plate \.leo-name/);
  assert.match(css, /is-wrong-grey \.prop/);
  assert.match(css, /data-plate="m1-f02"\] \.prop/);
  assert.match(css, /data-plate="m1-f02"\] \.zone-name/);
  assert.match(css, /data-plate="m2-f01"\] \.pin/);
  assert.match(css, /is-wrong-grey \.seat-row/);
  assert.match(css, /\.scene-cue\.is-wait/);
  assert.match(css, /\.scene-cue\.is-hold/);
});

test("teacher tips speak to the student", () => {
  const tips = Object.keys(pack.lines).map((key) => pack.lines[key].teacher_tip);
  tips.push(pack.intro.teacher_tip);
  const banned = /Prompt:|Stretch:|soft fail|Win:|Excellent precision|Between is the trap|preposition under|Send Leo/;
  for (const tip of tips) assert.equal(banned.test(tip), false, tip);
  assert.equal(pack.intro.teacher_tip, "Start with a place. Try: Look under the seats near the door.");
  assert.equal(pack.lines.beat1.teacher_tip, "Nice start. Add a colour or size so Leo knows which bag.");
  assert.equal(pack.lines.beat2.teacher_tip, "Try navy or black — say colour and size together.");
  assert.equal(pack.lines.beat3.teacher_tip, "Great — size, colour, and between. Next check the name tag.");
  assert.equal(pack.lines.beat4.teacher_tip, "Try: Check the name tag on the front of the bag.");
  assert.equal(pack.lines.beat5Black.teacher_tip, "That was the black sports bag. Try the small navy one under the seat.");
  assert.equal(pack.lines.beat5Grey.teacher_tip, "That was the big grey bag. Leo needs the small navy one under the seat, between the black sports bag and the yellow lunchbox.");
  assert.equal(pack.lines.beat6.teacher_tip, "Clear speech found it — not volume. Well done.");
  assert.equal(pack.lines.alreadyWon.teacher_tip, pack.lines.beat6.teacher_tip);
  assert.equal(pack.lines.beat6Early.teacher_tip, "Add the place: under the seat, between the black sports bag and the yellow lunchbox.");
  assert.equal(pack.lines.nameTagEarly.teacher_tip, "Find the bag first. Small navy, under the seat, between the black sports bag and the yellow lunchbox.");
  assert.equal(pack.lines.needBetween.teacher_tip, "Say: between the black sports bag and the yellow lunchbox.");
  assert.equal(pack.lines.needUnder.teacher_tip, "Add under — the small navy bag is under the seat, not on it.");
  assert.equal(pack.lines.besideNotBetween.teacher_tip, "Between names both sides. Beside only names one neighbour.");
  assert.equal(pack.lines.navyNeedSize.teacher_tip, "Add size and place: the small navy bag under the seat.");
  assert.equal(pack.lines.blueNotNavy.teacher_tip, "Say navy, not just blue. The lunchbox is yellow.");
  assert.equal(pack.lines.redNone.teacher_tip, "Name a colour that is there: black, navy, or grey.");
  assert.equal(pack.lines.zoneAgain.teacher_tip, "Next: small navy, under the seat, between the black sports bag and the yellow lunchbox.");
  assert.equal(pack.lines.seatLeft.teacher_tip, "On the left is the wrong bag. Look under the seats near the door.");
  assert.equal(pack.lines.farEnd.teacher_tip, "The big grey bag is on the seat. Leo's is under the seat near the door.");
  assert.equal(pack.lines.fallback.teacher_tip, "Try one sentence: the small navy bag under the seat, between the black sports bag and the yellow lunchbox.");
});

test("live reply keeps the contract and a miss falls back to the mock", async () => {
  const input = {
    scenario: pack,
    currentState: freshState(pack),
    transcript: "Look under the seats near the door."
  };
  let sentUrl = "";
  let sentBody = null;
  const live = await queryCoach(input, {
    live: true,
    fetchImpl: async function (url, init) {
      sentUrl = String(url);
      sentBody = JSON.parse(init.body);
      return {
        ok: true,
        json: async function () {
          return {
            spoken_reply: "Near the door, then.",
            mood: "panicked",
            scene_action: "SEAT_NEAR_DOOR",
            teacher_tip: "Nice start. Add a colour or size so Leo knows which bag."
          };
        }
      };
    }
  });
  assert.equal(live.hardware_action, "SEAT_NEAR_DOOR");
  assert.equal(live.mood, "PANICKED");
  assert.equal(live.scene_action, undefined);
  assert.deepEqual(keys(live), ["hardware_action", "mood", "spoken_reply", "teacher_tip"]);
  assert.equal(sentUrl, "https://deepseek-explain.skhhcss-eng.workers.dev");
  assert.equal(sentBody.page, "Say It Louder");
  assert.equal(sentBody.scenarioId, "level_1_lost_bag");
  assert.match(sentBody.state, /BAG_NAVY_SMALL=UNDER_SEAT/);
  assert.equal(sentBody.transcript, input.transcript);
  assert.equal(JSON.stringify(sentBody).includes("sk-"), false);

  const missed = await queryCoach(input, {
    live: true,
    fetchImpl: async function () {
      throw new Error("down");
    }
  });
  assert.deepEqual(missed, mockCoach(input));

  assert.equal(normaliseCoachReply({
    spoken_reply: "Which bag?",
    mood: "CONFUSED",
    hardware_action: "HOVER_CONFUSED",
    teacher_tip: "Prompt: navy vs black."
  }, pack), null);
  assert.equal(normaliseCoachReply({
    spoken_reply: "Under the seat, that's a start! But in which one? There are a few bags down there.",
    mood: "HOPEFUL",
    hardware_action: "HOVER_CONFUSED",
    teacher_tip: "Say which bag is under the seat."
  }, pack).mood, "CONFUSED");
  assert.equal(coachWorkerUrl("https://user:secret@evil.example"), "https://deepseek-explain.skhhcss-eng.workers.dev");
  assert.equal(coachWorkerUrl("https://evil.example/hook?key=sk-test"), "https://deepseek-explain.skhhcss-eng.workers.dev");
  const lmsPage = "https://learning.hcs.edu.hk/english/say-it-louder/";
  assert.equal(coachWorkerUrl(undefined, lmsPage), "https://deepseek-explain.skhhcss-eng.workers.dev");
  assert.equal(
    coachWorkerUrl("https://deepseek-explain.skhhcss-eng.workers.dev/", lmsPage),
    "https://deepseek-explain.skhhcss-eng.workers.dev"
  );
  assert.equal(coachWorkerUrl("/english/api", lmsPage), "https://deepseek-explain.skhhcss-eng.workers.dev");
  assert.equal(coachWorkerUrl("deepseek-explain.skhhcss-eng.workers.dev", lmsPage), "https://deepseek-explain.skhhcss-eng.workers.dev");
});

const mapPack = SCENARIOS.mission_2_school_map_walk;
const MAP_ROUTE = [
  "Go through the school gate and walk straight on.",
  "Walk past the school office and turn left.",
  "Go along the covered walkway towards the canteen.",
  "Walk past the canteen. Don't go inside.",
  "Walk next to the playground until you see the library.",
  "Go into the library."
];

function mapCoach(transcript, state) {
  return mockCoach({
    scenario: mapPack,
    currentState: state || freshState(mapPack),
    transcript: transcript
  });
}

test("mission 2 is selectable beside mission 1 and keeps the four-field JSON", async () => {
  assert.equal(mapPack, SCENARIOS.level_2_map_walk);
  assert.equal(mapPack.id, "mission_2_school_map_walk");
  assert.equal(mapPack.sceneId, "school-map");
  assert.equal(packForId("level_2_map_walk").id, "mission_2_school_map_walk");
  assert.equal(packForId("mission_1_lost_bag").id, "level_1_lost_bag");
  assert.equal(listScenarios()[1].title, "Mission 2: School Map Walk");

  const result = await queryCoach({
    scenario: mapPack,
    currentState: freshState(mapPack),
    transcript: MAP_ROUTE[0]
  });
  assert.deepEqual(keys(result), ["hardware_action", "mood", "spoken_reply", "teacher_tip"]);
  assert.equal(result.hardware_action, "GO_THROUGH_GATE");
  assert.ok(mapPack.allowedActions.includes(result.hardware_action));
  assert.match(mapPack.frame, /library/i);
  assert.match(mapPack.endCopy.winTitle, /Made it!/);
  assert.match(mapPack.endCopy.winDetail, /Library reached/);
  assert.match(mapPack.endCopy.missTitle, /Bell's gone/);
  assert.match(mapPack.endCopy.missTitle, /gate/);
});

test("mission 2 tips stay student-facing", () => {
  const bits = [mapPack.intro.teacher_tip];
  Object.keys(mapPack.lines).forEach(function (key) {
    bits.push(mapPack.lines[key].teacher_tip);
    bits.push(mapPack.lines[key].spoken_reply);
  });
  const text = bits.join("\n");
  assert.equal(/prompt\s*:/i.test(text), false);
  assert.equal(/stretch\s*:/i.test(text), false);
  assert.equal(/\b(chase|lockdown|stranger)\b/i.test(text), false);
});

test("mission 2 walks gate to library and wins only on ARRIVE_LIBRARY", () => {
  let state = freshState(mapPack);
  const expected = [
    "GO_THROUGH_GATE",
    "TURN_LEFT",
    "GO_ALONG_PATH",
    "WALK_PAST_CANTEEN",
    "CROSS_PLAYGROUND",
    "ARRIVE_LIBRARY"
  ];
  for (let i = 0; i < MAP_ROUTE.length; i++) {
    const result = mapCoach(MAP_ROUTE[i], state);
    assert.equal(result.hardware_action, expected[i], MAP_ROUTE[i]);
    assert.ok(mapPack.allowedActions.includes(result.hardware_action));
    state = applyHardwareAction(state, result.hardware_action);
    if (i < MAP_ROUTE.length - 1) assert.equal(isWin(mapPack, state), false);
  }
  assert.equal(state.LIBRARY, "ARRIVED");
  assert.equal(state.GATE, "THROUGH");
  assert.equal(state.OFFICE, "PAST");
  assert.equal(state.WALKWAY, "ALONG");
  assert.equal(state.CANTEEN, "PAST");
  assert.equal(state.PLAYGROUND, "CROSSED");
  assert.equal(isWin(mapPack, state), true);
  assert.equal(mapCoach(MAP_ROUTE[5], state).mood, "RELIEVED");
  const won = mapCoach("Go into the library.", applyHardwareAction(freshState(mapPack), "ARRIVE_LIBRARY"));
  assert.equal(won.hardware_action, "NONE");
  assert.equal(won.mood, "RELIEVED");
});

test("vague directions hover, and canteen or hall do not win", () => {
  for (const line of ["go", "turn", "that way", "Go there."]) {
    const result = mapCoach(line);
    assert.equal(result.hardware_action, "HOVER_CONFUSED", line);
    assert.equal(mapPack.clarityStrikeActions.includes(result.hardware_action), true, line);
  }

  let state = freshState(mapPack);
  state = applyHardwareAction(state, "GO_THROUGH_GATE");
  state = applyHardwareAction(state, "TURN_LEFT");
  state = applyHardwareAction(state, "GO_ALONG_PATH");
  const canteen = mapCoach("Go into the canteen.", state);
  assert.equal(canteen.hardware_action, "STEP_BACK");
  assert.equal(canteen.mood, "CONFUSED");
  assert.match(canteen.spoken_reply, /lunch/i);
  const afterCanteen = applyHardwareAction(state, canteen.hardware_action);
  assert.equal(isWin(mapPack, afterCanteen), false);
  assert.equal(afterCanteen.CANTEEN, "AHEAD");
  assert.equal(mapPack.clarityStrikeActions.includes("ARRIVE_CANTEEN"), true);

  state = applyHardwareAction(state, "WALK_PAST_CANTEEN");
  state = applyHardwareAction(state, "CROSS_PLAYGROUND");
  const hall = mapCoach("Go to the school hall.", state);
  assert.equal(hall.hardware_action, "ARRIVE_HALL");
  assert.equal(isWin(mapPack, applyHardwareAction(state, hall.hardware_action)), false);
  assert.match(hall.teacher_tip, /library/i);

  const early = mapCoach("Go into the library.");
  assert.notEqual(early.hardware_action, "ARRIVE_LIBRARY");
  assert.equal(isWin(mapPack, applyHardwareAction(freshState(mapPack), early.hardware_action)), false);
});

test("one clear multi-step utterance can reach the library", () => {
  const line = "Go through the school gate, walk past the office and turn left, go along the covered walkway, walk past the canteen, walk next to the playground, and go into the library.";
  const result = mapCoach(line);
  assert.equal(result.hardware_action, "ARRIVE_LIBRARY");
  assert.equal(result.mood, "RELIEVED");
  assert.equal(isWin(mapPack, applyHardwareAction(freshState(mapPack), result.hardware_action)), true);
});

test("map tokens move Leo from the gate towards the library", () => {
  const start = freshState(mapPack);
  const through = applyHardwareAction(start, "MOVE_NORTH");
  assert.equal(through.GATE, "THROUGH");
  assert.equal(through.FACING, "NORTH");
  assert.equal(through.NODE, "GATE_IN");
  const left = applyHardwareAction(through, "TURN_LEFT");
  assert.equal(left.OFFICE, "PAST");
  assert.equal(left.FACING, "WEST");
  const west = applyHardwareAction(left, "MOVE_WEST");
  assert.equal(west.FACING, "WEST");
  assert.equal(west.LIBRARY, "AHEAD");
  const hall = applyHardwareAction(west, "ARRIVE_HALL");
  assert.equal(hall.NODE, "HALL");
  const back = applyHardwareAction(hall, "STEP_BACK");
  assert.equal(back.NODE, "CORNER");
  assert.ok(MAP_SPOTS.LIBRARY.y < MAP_SPOTS.GATE.y);
  assert.equal(sceneCue("HOVER_CONFUSED", start).text.includes("landmark"), true);
  assert.equal(sceneCue("ARRIVE_LIBRARY", applyHardwareAction(start, "ARRIVE_LIBRARY")).kind, "hold");
  assert.equal(sceneCue("HOVER_CONFUSED", freshState(pack)).text.includes("colour"), true);
});

test("mission 1 tips are student-facing", () => {
  const tips = Object.keys(pack.lines).map((key) => pack.lines[key].teacher_tip);
  tips.push(pack.intro.teacher_tip);
  const banned = /Prompt:|Stretch:|soft fail|Win:|Excellent precision|Between is the trap|preposition under|Send Leo|Wrong bag =/;
  for (const tip of tips) assert.equal(banned.test(tip), false, tip);
  assert.equal(pack.lines.beat2.teacher_tip, "Try navy or black — say colour and size together.");
  assert.equal(pack.lines.beat3.teacher_tip, "Great — size, colour, and between. Next check the name tag.");
  assert.equal(pack.lines.beat4.teacher_tip, "Try: Check the name tag on the front of the bag.");
  assert.equal(pack.lines.beat5Black.teacher_tip, "That was the black sports bag. Try the small navy one under the seat.");
  assert.equal(pack.lines.beat5Grey.teacher_tip, "That was the big grey bag. Leo needs the small navy one under the seat, between the black sports bag and the yellow lunchbox.");
  assert.equal(pack.lines.beat6.teacher_tip, "Clear speech found it — not volume. Well done.");
  assert.equal(pack.lines.alreadyWon.teacher_tip, pack.lines.beat6.teacher_tip);
  assert.equal(pack.lines.needBetween.teacher_tip, "Say: between the black sports bag and the yellow lunchbox.");
  assert.equal(pack.lines.fallback.teacher_tip, "Try one sentence: the small navy bag under the seat, between the black sports bag and the yellow lunchbox.");
  const mapTips = Object.keys(mapPack.lines).map((key) => mapPack.lines[key].teacher_tip);
  for (const tip of mapTips) assert.equal(/Prompt:|Stretch:/.test(tip), false, tip);
});

test("near-hit pronunciation maps to the target word and does not save a wrong bag", () => {
  assert.equal(forgivePronunciation("lie berry"), "library");
  assert.equal(forgivePronunciation("be twin"), "between");
  assert.equal(forgivePronunciation("be to"), "between");
  assert.equal(forgivePronunciation("onda"), "under");
  assert.equal(forgivePronunciation("and the seat"), "under the seat");
  assert.equal(forgivePronunciation("neighbour"), "navy");
  assert.equal(
    normaliseUtterance("between the black bag and the yellow lunchbox"),
    "between the black bag and the yellow lunchbox"
  );

  const door = coach("Look and the seats near the door.");
  assert.equal(door.hardware_action, "SEAT_NEAR_DOOR");

  const navy = coach("The maybe bag.");
  assert.equal(navy.hardware_action, "NONE");
  assert.match(navy.spoken_reply, /small/i);

  const black = coach("The black bag.");
  assert.equal(black.hardware_action, "BAG_BLACK_SPORTS");

  const kept = coach("Maybe the black bag.");
  assert.equal(kept.hardware_action, "BAG_BLACK_SPORTS");

  const full = coach("The small neighbour bag onda the seat be twin the black bag and the yellow lunchbox.");
  assert.equal(full.hardware_action, "BAG_NAVY_SMALL");

  let walked = freshState(mapPack);
  walked = applyHardwareAction(walked, "GO_THROUGH_GATE");
  walked = applyHardwareAction(walked, "TURN_LEFT");
  walked = applyHardwareAction(walked, "GO_ALONG_PATH");
  walked = applyHardwareAction(walked, "WALK_PAST_CANTEEN");
  walked = applyHardwareAction(walked, "CROSS_PLAYGROUND");
  const lib = mapCoach("Go to the lie berry.", walked);
  assert.equal(lib.hardware_action, "ARRIVE_LIBRARY");

  const first = mapCoach("navi");
  assert.equal(first.hardware_action, "NONE");
  assert.match(first.teacher_tip, /Nearly there/i);
  const again = mapCoach("navi", Object.assign(freshState(mapPack), { LAST_UTTERANCE: "navy" }));
  assert.equal(again.hardware_action, "HOVER_CONFUSED");
  assert.equal(mapCoach("go").hardware_action, "HOVER_CONFUSED");
});

test("speak fills the box and does not auto-send a final transcript", () => {
  const main = fs.readFileSync(new URL("./main.js", import.meta.url), "utf8");
  const ai = fs.readFileSync(new URL("./ai-service.js", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(ai, /continuous = true/);
  assert.match(ai, /interimResults = true/);
  assert.match(main, /onHeard/);
  assert.equal(/onResult:\s*function[\s\S]{0,80}takeTurn/.test(main), false);
  assert.match(main, /Say it clearer/);
  assert.match(css, /#micBtn\.ask-send\.api-mesh\.is-listening/);
  assert.match(css, /\.pin-gate \{ left: 50%/);
  assert.match(css, /\.pin-library \{ left: 50%/);
  assert.match(css, /\.pin-hall \{ left: 78%/);
  assert.equal(/pin-goal/.test(fs.readFileSync(new URL("./scene2d.js", import.meta.url), "utf8")), false);
  assert.match(fs.readFileSync(new URL("../index.html", import.meta.url), "utf8"), /id="noteCard"[^>]*data-ask-clear/);
  const heard = heardText({
    results: [
      [{ transcript: "go through " }],
      [{ transcript: "the gate" }]
    ]
  });
  heardText({ results: [] });
  const finals = heardText({
    results: [
      Object.assign([{ transcript: "walk past the canteen" }], { isFinal: true }),
      [{ transcript: " please" }]
    ]
  });
  assert.equal(finals.finalText, "walk past the canteen");
  assert.equal(finals.interim, "please");
  assert.equal(heard.interim.length > 0, true);
});

test("lost-bag copy stays school-safe", () => {
  const files = ["scenarios.js", "ai-service.js", "main.js", "scene2d.js"];
  const banned = /\b(bomb|disarm|detonat|explosion|terror|wire|blast)\b/i;
  for (const file of files) {
    const text = fs.readFileSync(new URL("./" + file, import.meta.url), "utf8");
    assert.equal(banned.test(text), false, file);
  }
});
