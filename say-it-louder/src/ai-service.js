/**
 * Speech helpers and the coach call.
 *
 * Live pages post to the same DeepSeek Worker as Ask and Explain
 * (page "Say It Louder"). The key stays on that Worker. USE_MOCK is off.
 * Node tests have no document, so they stay on the mock. If the Worker
 * misses, the page falls back to mockCoach and the scene still moves.
 * Do not put a DeepSeek key in this file or on the student page.
 */
export const USE_MOCK = false;

var LIVE_WORKER = "https://deepseek-explain.skhhcss-eng.workers.dev";

export function normaliseUtterance(raw) {
  return String(raw || "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\bgray\b/g, "grey")
    .replace(/\bcolor\b/g, "colour")
    .replace(/\btoward\b/g, "towards")
    .replace(/\bstraightly\b/g, "straight")
    .replace(/\blunch box\b/g, "lunchbox")
    .replace(/\bnametag\b/g, "name tag")
    .replace(/\s+/g, " ")
    .trim();
}

function has(text, phrase) {
  if (!phrase) return false;
  if (phrase.indexOf(" ") !== -1) {
    return (" " + text + " ").indexOf(" " + phrase + " ") !== -1;
  }
  var parts = text.split(" ");
  for (var i = 0; i < parts.length; i++) {
    if (parts[i] === phrase || parts[i] === phrase + "s") return true;
  }
  return false;
}

function cloneLine(line, action) {
  return {
    spoken_reply: line.spoken_reply,
    mood: line.mood,
    hardware_action: action || line.hardware_action,
    teacher_tip: line.teacher_tip
  };
}

function fullBag(text) {
  var size = has(text, "small") || has(text, "little");
  var navy = has(text, "navy");
  var between = has(text, "between") &&
    (has(text, "black") || has(text, "sports")) &&
    (has(text, "yellow") || has(text, "lunchbox"));
  var under = has(text, "under") || has(text, "beneath") || has(text, "underneath");
  return size && navy && between && under;
}

function isInTheDoor(text) {
  return has(text, "in the door") || has(text, "in the doors") || has(text, "inside the door");
}

function isNameTag(text) {
  return has(text, "name tag") || has(text, "is it leo") || has(text, "it is leos") || has(text, "leos name");
}

function isNameTagInside(text) {
  if (!has(text, "name tag")) return false;
  if (has(text, "on the front") || has(text, "on the bag") || has(text, "on it")) return false;
  return has(text, "in the bag") || has(text, "inside the bag") || has(text, "inside") || has(text, "in it");
}

function isZone(text) {
  if (isInTheDoor(text)) return false;
  var underSeats = has(text, "under") && has(text, "seat");
  var nearDoor = has(text, "near") || has(text, "by") || has(text, "next to") || has(text, "beside");
  if (underSeats && has(text, "door") && nearDoor) return true;
  if (has(text, "near the door") || has(text, "by the door") || has(text, "next to the door") || has(text, "beside the door")) {
    return true;
  }
  return false;
}

function isVague(text) {
  var exact = {
    "the bag": 1,
    "that one": 1,
    "this one": 1,
    "that bag": 1,
    "the one": 1,
    "the rucksack": 1,
    "the school bag": 1,
    "the backpack": 1,
    "it": 1,
    "yes": 1,
    "no": 1
  };
  if (exact[text]) return true;
  var mentionsBag = has(text, "bag") || has(text, "rucksack") || has(text, "backpack");
  if (!mentionsBag) return false;
  if (has(text, "navy") || has(text, "black") || has(text, "grey") || has(text, "yellow") || has(text, "blue") || has(text, "red")) return false;
  if (has(text, "small") || has(text, "big") || has(text, "little") || has(text, "large")) return false;
  if (has(text, "door") || has(text, "seat") || has(text, "between") || has(text, "under") || has(text, "lunchbox")) return false;
  return true;
}

function blackGrab(text) {
  if (has(text, "not the black") || has(text, "not black")) return false;
  if (has(text, "between")) return false;
  if (has(text, "navy")) return false;
  var mentions = has(text, "black") || has(text, "sports bag");
  if (!mentions) return false;
  return has(text, "bag") || has(text, "one") || has(text, "rucksack") || has(text, "sports") || has(text, "black");
}

function greyGrab(text) {
  if (has(text, "not the big") || has(text, "not the grey") || has(text, "not big") || has(text, "not grey")) return false;
  if (has(text, "navy") || has(text, "between")) return false;
  if (has(text, "big grey") || has(text, "large grey") || has(text, "grey bag") || has(text, "the big bag") || has(text, "the big one") || has(text, "the large one") || has(text, "the grey one")) {
    return true;
  }
  return false;
}

function lunchGrab(text) {
  if (has(text, "between") || has(text, "navy") || has(text, "black")) return false;
  if (has(text, "lunchbox")) return true;
  if (has(text, "yellow") && (has(text, "one") || has(text, "box") || has(text, "pick") || has(text, "grab") || has(text, "take"))) return true;
  return false;
}

function isOnNotUnder(text) {
  if (has(text, "under") || has(text, "beneath")) return false;
  return has(text, "on the seat") || has(text, "on top of the seat");
}

function isBesideTrap(text) {
  if (has(text, "between")) return false;
  return (has(text, "beside") || has(text, "next to")) && (has(text, "black") || has(text, "navy") || has(text, "bag"));
}

function isBlueNotNavy(text) {
  return has(text, "blue") && !has(text, "navy");
}

function isRed(text) {
  return has(text, "red");
}

function isBeat6(text) {
  return has(text, "get off") || has(text, "next stop") || has(text, "getting off");
}

function isFarEnd(text) {
  return has(text, "far end");
}

function isLeftOnly(text) {
  if (!(has(text, "on the left") || has(text, "to the left"))) return false;
  if (has(text, "door") || has(text, "navy") || has(text, "between")) return false;
  return true;
}

function placeAction(text) {
  if (has(text, "middle")) return "SEAT_MIDDLE";
  if (isZone(text)) return "SEAT_NEAR_DOOR";
  if (isLeftOnly(text)) return "SEAT_LEFT";
  return "NONE";
}

function mapFlags(state) {
  var src = state || {};
  return {
    gate: src.GATE === "THROUGH",
    office: src.OFFICE === "PAST",
    officeAt: src.OFFICE === "AT" || src.OFFICE === "PAST",
    walkway: src.WALKWAY === "ALONG",
    canteen: src.CANTEEN === "PAST",
    play: src.PLAYGROUND === "CROSSED",
    library: src.LIBRARY === "ARRIVED"
  };
}

function saysLeft(text) {
  if (!has(text, "left")) return false;
  if (has(text, "right") && !has(text, "not right") && !has(text, "dont")) return false;
  return true;
}

function saysRightOnly(text) {
  return has(text, "right") && !saysLeft(text);
}

function hasLandmark(text) {
  return has(text, "gate") || has(text, "office") || has(text, "walkway") || has(text, "path") ||
    has(text, "canteen") || has(text, "playground") || has(text, "hall") || has(text, "library");
}

function isVagueDirection(text) {
  var exact = {
    go: 1,
    turn: 1,
    "that way": 1,
    "this way": 1,
    "go there": 1,
    "go that way": 1,
    "walk": 1,
    "walk there": 1,
    "over there": 1,
    "that direction": 1,
    "go on": 1,
    move: 1,
    yes: 1,
    no: 1,
    ok: 1,
    okay: 1
  };
  if (exact[text]) return true;
  if (hasLandmark(text) || saysLeft(text) || saysRightOnly(text)) return false;
  if (has(text, "north") || has(text, "south") || has(text, "east") || has(text, "west")) return false;
  if (has(text, "through") || has(text, "along") || has(text, "past") || has(text, "across") || has(text, "straight")) return false;
  if (has(text, "that way") || has(text, "this way")) return true;
  var words = text.split(" ");
  if (words.length <= 3 && (has(text, "go") || has(text, "turn") || has(text, "walk"))) return true;
  return false;
}

function throughGate(text) {
  if (!has(text, "gate")) return false;
  return has(text, "through") || has(text, "enter") || has(text, "straight") || has(text, "inside");
}

function atGateOnly(text) {
  if (!has(text, "gate")) return false;
  return !throughGate(text);
}

function pastOffice(text) {
  if (!has(text, "office")) return false;
  return has(text, "past") || has(text, "pass") || has(text, "by");
}

function alongPath(text) {
  if (has(text, "along") || has(text, "walkway") || has(text, "covered")) return true;
  if (has(text, "path") || has(text, "corridor")) {
    return has(text, "go") || has(text, "walk") || has(text, "down") || has(text, "along");
  }
  return false;
}

function canteenEnter(text) {
  if (!has(text, "canteen")) return false;
  if (has(text, "past") || has(text, "pass")) return false;
  if (has(text, "along") || has(text, "walkway") || has(text, "towards")) return false;
  if ((has(text, "dont") || has(text, "do not")) && (has(text, "in") || has(text, "inside") || has(text, "into"))) return false;
  return has(text, "into") || has(text, "enter") || has(text, "inside") || has(text, "go in") ||
    has(text, "go to") || has(text, "to the canteen") || has(text, "in the canteen") || has(text, "stop");
}

function pastCanteen(text) {
  if (!has(text, "canteen")) return false;
  if (canteenEnter(text)) return false;
  return has(text, "past") || has(text, "pass");
}

function besideCanteen(text) {
  if (!has(text, "canteen") || pastCanteen(text) || canteenEnter(text)) return false;
  return has(text, "beside") || has(text, "next to");
}

function hallFoil(text) {
  if (!has(text, "hall")) return false;
  if (has(text, "not the hall") || has(text, "not the school hall")) return false;
  if (has(text, "library")) {
    if (has(text, "into the hall") || has(text, "enter the hall") || has(text, "go into the hall")) {
      return !has(text, "not") && !has(text, "dont");
    }
    return false;
  }
  return true;
}

function wantsLibrary(text) {
  if (!has(text, "library") || hallFoil(text)) return false;
  if (playgroundMove(text)) return false;
  return has(text, "into") || has(text, "enter") || has(text, "go to") || has(text, "to the library") ||
    has(text, "stop") || has(text, "wait") || has(text, "arrive");
}

function playgroundMove(text) {
  return has(text, "playground");
}

function fullRoute(text) {
  var gate = has(text, "through") && has(text, "gate");
  var office = has(text, "office") && (has(text, "past") || has(text, "pass") || saysLeft(text));
  var path = has(text, "along") || has(text, "walkway");
  var canteen = has(text, "canteen") && (has(text, "past") || has(text, "pass")) && !canteenEnter(text);
  var play = has(text, "playground");
  var library = has(text, "library") && !hallFoil(text);
  return gate && office && path && canteen && play && library;
}

function compassAction(text) {
  var north = has(text, "north");
  var south = has(text, "south");
  var east = has(text, "east");
  var west = has(text, "west");
  var count = (north ? 1 : 0) + (south ? 1 : 0) + (east ? 1 : 0) + (west ? 1 : 0);
  if (count !== 1) return "";
  if (hasLandmark(text) && !has(text, "straight")) return "";
  if (north) return "MOVE_NORTH";
  if (south) return "MOVE_SOUTH";
  if (east) return "MOVE_EAST";
  return "MOVE_WEST";
}

function straightOn(text) {
  return has(text, "straight") || has(text, "north");
}

/**
 * Mission 2 mock. One hardware_action per turn. Win only on ARRIVE_LIBRARY.
 */
export function mockMapCoach({ scenario, currentState, transcript }) {
  var lines = scenario.lines;
  var text = normaliseUtterance(transcript);
  var flags = mapFlags(currentState || scenario.initialState);

  if (!text) return cloneLine(lines.empty);
  if (flags.library) return cloneLine(lines.alreadyWon);
  if (isVagueDirection(text)) {
    return cloneLine(has(text, "turn") ? lines.vagueTurn : lines.vagueGo);
  }
  if (fullRoute(text)) return cloneLine(lines.win);
  if (canteenEnter(text)) return cloneLine(lines.canteenFoil);
  if (hallFoil(text)) return cloneLine(lines.hallFoil);

  if (!flags.gate) {
    if (throughGate(text)) return cloneLine(lines.beat1);
    if (atGateOnly(text)) return cloneLine(lines.needThrough);
    if (straightOn(text) && !has(text, "library")) return cloneLine(lines.beat1North);
    var opening = compassAction(text);
    if (opening === "MOVE_NORTH") return cloneLine(lines.beat1North);
    if (opening) return cloneLine(lines.compass, opening);
    if (saysLeft(text) && !has(text, "office")) return cloneLine(lines.turnLeftOnly);
    if (wantsLibrary(text) || playgroundMove(text) || pastCanteen(text) || alongPath(text) || pastOffice(text)) {
      return cloneLine(lines.earlyStep);
    }
    return cloneLine(lines.fallback);
  }

  if (!flags.office) {
    if (pastOffice(text) && saysLeft(text)) return cloneLine(lines.officeTurn);
    if (pastOffice(text) && saysRightOnly(text)) return cloneLine(lines.turnRight);
    if (pastOffice(text)) return cloneLine(lines.officePast);
    if (saysLeft(text)) return cloneLine(lines.turnLeftOnly);
    if (saysRightOnly(text)) return cloneLine(lines.turnRight);
    if (alongPath(text) || pastCanteen(text) || playgroundMove(text) || wantsLibrary(text)) {
      return cloneLine(lines.earlyStep);
    }
    if (throughGate(text)) return cloneLine(lines.beat1);
    var officeCompass = compassAction(text);
    if (officeCompass) return cloneLine(lines.compass, officeCompass);
    return cloneLine(lines.fallback);
  }

  if (!flags.walkway) {
    if (alongPath(text)) return cloneLine(lines.along);
    if (pastCanteen(text) || playgroundMove(text) || wantsLibrary(text)) return cloneLine(lines.earlyStep);
    if (saysLeft(text)) return cloneLine(lines.turnLeftOnly);
    var pathCompass = compassAction(text);
    if (pathCompass) return cloneLine(lines.compass, pathCompass);
    return cloneLine(lines.fallback);
  }

  if (!flags.canteen) {
    if (pastCanteen(text)) return cloneLine(lines.canteenPast);
    if (besideCanteen(text)) return cloneLine(lines.besideCanteen);
    if ((has(text, "dont") || has(text, "do not")) && has(text, "canteen")) return cloneLine(lines.besideCanteen);
    if (playgroundMove(text) || wantsLibrary(text)) return cloneLine(lines.earlyStep);
    if (alongPath(text)) return cloneLine(lines.along);
    var canteenCompass = compassAction(text);
    if (canteenCompass) return cloneLine(lines.compass, canteenCompass);
    return cloneLine(lines.fallback);
  }

  if (!flags.play) {
    if (playgroundMove(text)) return cloneLine(lines.playground);
    if (wantsLibrary(text)) return cloneLine(lines.earlyLibrary);
    var yardCompass = compassAction(text);
    if (yardCompass) return cloneLine(lines.compass, yardCompass);
    return cloneLine(lines.fallback);
  }

  if (wantsLibrary(text)) return cloneLine(lines.win);
  if (has(text, "library")) return cloneLine(lines.libraryNeedVerb);
  if (playgroundMove(text)) return cloneLine(lines.playground);
  var endCompass = compassAction(text);
  if (endCompass) return cloneLine(lines.compass, endCompass);
  return cloneLine(lines.fallback);
}

/**
 * Deterministic coach. Same JSON shape the Worker will return later:
 * { spoken_reply, mood, hardware_action, teacher_tip }
 */
export function mockCoach({ scenario, currentState, transcript }) {
  if (scenario && scenario.sceneId === "school-map") {
    return mockMapCoach({ scenario: scenario, currentState: currentState, transcript: transcript });
  }
  return mockBagCoach({ scenario: scenario, currentState: currentState, transcript: transcript });
}

function mockBagCoach({ scenario, currentState, transcript }) {
  var lines = scenario.lines;
  var text = normaliseUtterance(transcript);
  var state = currentState || scenario.initialState;
  var navyHeld = state.BAG_NAVY_SMALL === "HELD";
  var tagShown = state.NAME_TAG === "SHOWN";
  var zone = state.SEAT_NEAR_DOOR === "LOOKING";

  if (!text) return cloneLine(lines.empty);

  if (tagShown && navyHeld && isBeat6(text)) return cloneLine(lines.beat6);
  if (tagShown && navyHeld) return cloneLine(lines.alreadyWon);

  if (isInTheDoor(text)) return cloneLine(lines.inTheDoor);
  if (isNameTagInside(text)) return cloneLine(lines.nameTagInside);

  if (isNameTag(text) && (navyHeld || fullBag(text))) return cloneLine(lines.beat4);
  if (isNameTag(text)) return cloneLine(lines.nameTagEarly);

  if (fullBag(text)) return cloneLine(lines.beat3);

  if (isOnNotUnder(text) && (has(text, "navy") || has(text, "bag") || has(text, "black"))) {
    return cloneLine(lines.underNotOn);
  }
  if (isBesideTrap(text) && !isZone(text)) return cloneLine(lines.besideNotBetween);

  if (blackGrab(text)) return cloneLine(lines.beat5Black);
  if (greyGrab(text)) return cloneLine(lines.beat5Grey);
  if (lunchGrab(text)) return cloneLine(lines.lunchbox);

  if (isVague(text)) return cloneLine(lines.beat2);
  if (isBlueNotNavy(text)) return cloneLine(lines.blueNotNavy);
  if (isRed(text)) return cloneLine(lines.redNone);

  if ((has(text, "small") || has(text, "little")) && has(text, "navy")) {
    var saidUnder = has(text, "under") || has(text, "beneath") || has(text, "underneath");
    if (!saidUnder && has(text, "between")) return cloneLine(lines.needUnder, placeAction(text));
    if (!saidUnder) return cloneLine(lines.beat6Early, placeAction(text));
    if (!has(text, "between")) return cloneLine(lines.needBetween, placeAction(text));
    return cloneLine(lines.needBetween, placeAction(text));
  }

  if (has(text, "navy")) return cloneLine(lines.navyNeedSize, placeAction(text));

  if (isFarEnd(text)) return cloneLine(lines.farEnd);
  if (isLeftOnly(text)) return cloneLine(lines.seatLeft);
  if (isZone(text)) return cloneLine(zone ? lines.zoneAgain : lines.beat1);

  if (has(text, "between") || (has(text, "under") && has(text, "seat"))) {
    return cloneLine(lines.needBetween, placeAction(text));
  }

  if (isBeat6(text)) return cloneLine(lines.beat6Early);

  return cloneLine(lines.fallback);
}

export function safeWorkerUrl(raw, base) {
  if (raw == null) return "";
  var text = String(raw).trim();
  if (!text) return "";
  try {
    var url = base ? new URL(text, base) : new URL(text);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    if (url.username || url.password) return "";
    if (url.search || url.hash) return "";
    return url.origin + url.pathname.replace(/\/+$/, "");
  } catch (err) {
    return "";
  }
}

/**
 * Absolute Worker host. A relative setting is rejected so a page under
 * /english/ on the LMS cannot retarget the call at the school origin.
 * An absolute https URL is used as given, with no /english/ prefix.
 */
export function coachWorkerUrl(raw, pageUrl) {
  var value = raw;
  if (value == null && typeof window !== "undefined") value = window.__EXPLAIN_WORKER__;
  var text = value == null ? "" : String(value).trim();
  if (text && text.indexOf("://") === -1) return LIVE_WORKER;
  var base = pageUrl;
  if (base == null && typeof location !== "undefined" && location.href) base = location.href;
  return safeWorkerUrl(text, base) || LIVE_WORKER;
}

export function stateLine(state) {
  var keys = Object.keys(state || {}).sort();
  var parts = [];
  for (var i = 0; i < keys.length; i++) {
    var key = String(keys[i]).toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 32);
    var value = String(state[keys[i]] == null ? "" : state[keys[i]]).toUpperCase().replace(/[^A-Z_]/g, "").slice(0, 24);
    if (!key || !value) continue;
    parts.push(key + "=" + value);
  }
  return parts.join("; ").slice(0, 500);
}

function clipLine(value, max) {
  var text = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return text.slice(0, max).trim();
}

function rubricVoice(tip) {
  return /\b(prompt|stretch)\s*:|soft fail|\bwin\s*:|excellent precision/i.test(tip);
}

function exactToken(value, allowed) {
  var text = String(value == null ? "" : value).trim();
  if (!text || !allowed) return "";
  for (var i = 0; i < allowed.length; i++) {
    if (allowed[i] === text || allowed[i].toLowerCase() === text.toLowerCase()) return allowed[i];
  }
  return "";
}

/**
 * Accept the Worker shape, including scene_action as an alias.
 * The carriage still reads hardware_action.
 */
export function normaliseCoachReply(data, scenario) {
  if (!data || typeof data !== "object" || !scenario) return null;
  var spoken = clipLine(data.spoken_reply, 280);
  var tip = clipLine(data.teacher_tip, 240);
  var named = typeof data.hardware_action === "string" && data.hardware_action.trim()
    ? data.hardware_action
    : data.scene_action;
  var action = exactToken(named, scenario.allowedActions);
  var mood = exactToken(data.mood, scenario.moods);
  if (!spoken || !tip || !mood || !action || rubricVoice(tip)) return null;
  return {
    spoken_reply: spoken,
    mood: mood,
    hardware_action: action,
    teacher_tip: tip
  };
}

export async function queryCoach(input, options) {
  var opts = options || {};
  var onPage = opts.live === true || (opts.live !== false && typeof document !== "undefined");
  if (USE_MOCK || !onPage) return mockCoach(input);
  try {
    var live = await liveCoach(input, opts.fetchImpl);
    if (live) return live;
  } catch (err) {
    /* Worker missed. The mock keeps the carriage moving. */
  }
  return mockCoach(input);
}

async function liveCoach(input, fetchImpl) {
  var scenario = input && input.scenario;
  if (!scenario) throw new Error("coach_scenario");
  var transcript = String((input && input.transcript) || "").replace(/\s+/g, " ").trim();
  if (!transcript) return mockCoach(input);
  var doFetch = fetchImpl || fetch;
  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, 20000);
  try {
    var res = await doFetch(coachWorkerUrl(), {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page: "Say It Louder",
        scenarioId: scenario.id,
        state: stateLine(input.currentState),
        transcript: transcript.slice(0, 400)
      }),
      signal: controller.signal
    });
    var data = null;
    try {
      data = await res.json();
    } catch (err) {
      data = null;
    }
    if (!res || !res.ok || !data) throw new Error("coach_http");
    var live = normaliseCoachReply(data, scenario);
    if (!live) throw new Error("coach_shape");
    return live;
  } finally {
    clearTimeout(timer);
  }
}

export function speechInputAvailable() {
  if (typeof window === "undefined") return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function createRecognizer(handlers) {
  if (!speechInputAvailable()) return null;
  var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  var recognition = new SpeechRec();
  recognition.lang = (handlers && handlers.lang) || "en-GB";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = function (event) {
    var said = "";
    try {
      said = event.results[0][0].transcript;
    } catch (err) {
      said = "";
    }
    if (handlers && handlers.onResult) handlers.onResult(said);
  };
  recognition.onerror = function (event) {
    if (handlers && handlers.onError) handlers.onError((event && event.error) || "error");
  };
  recognition.onend = function () {
    if (handlers && handlers.onEnd) handlers.onEnd();
  };
  return recognition;
}

export function speakText(text) {
  if (typeof window === "undefined" || !window.speechSynthesis || !text) return;
  var synth = window.speechSynthesis;
  synth.cancel();
  var utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-GB";
  utterance.rate = 1.02;
  var voices = synth.getVoices ? synth.getVoices() : [];
  for (var i = 0; i < voices.length; i++) {
    if (/en-GB/i.test(voices[i].lang)) {
      utterance.voice = voices[i];
      break;
    }
  }
  synth.speak(utterance);
}
