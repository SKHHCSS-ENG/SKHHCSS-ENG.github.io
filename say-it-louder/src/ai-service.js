/**
 * Speech helpers and the coach call.
 *
 * USE_MOCK stays true until a Worker proxy exists. Flip it then.
 * Do not put a DeepSeek key in this file or on the student page.
 */
export const USE_MOCK = true;

export function normaliseUtterance(raw) {
  return String(raw || "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\bgray\b/g, "grey")
    .replace(/\bcolor\b/g, "colour")
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

/**
 * Deterministic coach. Same JSON shape the Worker will return later:
 * { spoken_reply, mood, hardware_action, teacher_tip }
 */
export function mockCoach({ scenario, currentState, transcript }) {
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

export async function queryCoach(input) {
  if (USE_MOCK) return mockCoach(input);
  return liveCoach(input);
}

async function liveCoach() {
  throw new Error("Live coach is not connected. Keep USE_MOCK true until the Worker proxy is ready.");
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
