import { SCENARIOS } from "./scenarios.js";
import { queryCoach, createRecognizer, speakText, speechInputAvailable } from "./ai-service.js";
import { mountScene } from "./scene2d.js";

var MOOD_LABEL = {
  PANICKED: "panicked",
  CONFUSED: "confused",
  RELIEVED: "relieved",
  HOPEFUL: "hopeful"
};

export function freshState(scenario) {
  var next = {};
  var source = scenario.initialState || {};
  Object.keys(source).forEach(function (key) {
    next[key] = source[key];
  });
  return next;
}

export function applyHardwareAction(state, action) {
  var next = freshFrom(state);
  if (action === "SEAT_NEAR_DOOR") next.SEAT_NEAR_DOOR = "LOOKING";
  if (action === "SEAT_LEFT") next.SEAT_LEFT = "LOOKING";
  if (action === "SEAT_MIDDLE") next.SEAT_MIDDLE = "LOOKING";
  if (action === "BAG_NAVY_SMALL") {
    next.BAG_NAVY_SMALL = "HELD";
    next.SEAT_NEAR_DOOR = "LOOKING";
  }
  if (action === "SHOW_NAME_TAG") {
    next.BAG_NAVY_SMALL = "HELD";
    next.SEAT_NEAR_DOOR = "LOOKING";
    next.NAME_TAG = "SHOWN";
  }
  return next;
}

function freshFrom(state) {
  var next = {};
  Object.keys(state || {}).forEach(function (key) {
    next[key] = state[key];
  });
  return next;
}

export function isWin(scenario, state) {
  var need = scenario.winWhen || {};
  return Object.keys(need).every(function (key) {
    return state[key] === need[key];
  });
}

export function clarityLabel(strikes, maxStrikes) {
  var remaining = maxStrikes - strikes;
  if (remaining < 1) return "No clear chances";
  if (remaining === 1) return "1 clear chance";
  return remaining + " clear chances";
}

export function listScenarios() {
  var seen = {};
  var out = [];
  Object.keys(SCENARIOS).forEach(function (key) {
    var pack = SCENARIOS[key];
    if (!pack || seen[pack.id]) return;
    seen[pack.id] = true;
    out.push(pack);
  });
  return out;
}

function $(id) {
  return document.getElementById(id);
}

function boot() {
  var packs = listScenarios();
  var scenario = packs[0];
  var state = freshState(scenario);
  var strikes = 0;
  var doorsLeft = scenario.doorsSeconds;
  var doorsRunning = false;
  var doorsTimer = null;
  var ended = "";
  var listening = false;
  var turnTicket = 0;
  var scene = mountScene($("scene"), scenario);

  var select = $("missionSelect");
  packs.forEach(function (pack) {
    var opt = document.createElement("option");
    opt.value = pack.id;
    opt.textContent = pack.title;
    select.appendChild(opt);
  });
  if (packs.length < 2) $("missionField").hidden = true;

  $("missionTitle").textContent = scenario.title;
  $("frameLine").textContent = scenario.frame;
  renderManual(scenario);
  renderDialogue(scenario.intro);
  scene.setMood(scenario.intro.mood);
  $("teacherTip").textContent = scenario.intro.teacher_tip;
  updateHud();
  scene.setDoors(doorsLeft, false);

  var recognition = createRecognizer({
    lang: "en-GB",
    onResult: function (text) {
      setListening(false);
      takeTurn(text);
    },
    onError: function (code) {
      setListening(false);
      if (code === "not-allowed" || code === "service-not-allowed") {
        showMicNote("The microphone is blocked. Type your instruction instead.");
      }
    },
    onEnd: function () {
      setListening(false);
    }
  });

  if (!speechInputAvailable()) {
    $("micBtn").disabled = true;
    showMicNote("The microphone needs Chrome or Edge. Type your instruction instead.");
  }

  $("micBtn").addEventListener("click", function () {
    if (!recognition || ended) return;
    if (listening) {
      recognition.stop();
      setListening(false);
      return;
    }
    try {
      setListening(true);
      recognition.start();
    } catch (err) {
      setListening(false);
    }
  });

  $("textForm").addEventListener("submit", function (event) {
    event.preventDefault();
    var input = $("textCmd");
    var value = input.value.trim();
    if (!value) return;
    input.value = "";
    takeTurn(value);
  });

  $("resetBtn").addEventListener("click", function () {
    resetMission();
  });

  select.addEventListener("change", function () {
    var next = SCENARIOS[select.value] || scenario;
    var unique = listScenarios().filter(function (pack) { return pack.id === select.value; })[0];
    scenario = unique || next;
    resetMission();
  });

  function showMicNote(text) {
    var note = $("micNote");
    note.hidden = false;
    note.textContent = text;
  }

  function setListening(on) {
    listening = on;
    var btn = $("micBtn");
    btn.classList.toggle("is-listening", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.textContent = on ? "Listening…" : "Speak";
  }

  function renderManual(pack) {
    var list = $("manualList");
    list.replaceChildren();
    (pack.manualSteps || []).forEach(function (step) {
      var item = document.createElement("li");
      item.textContent = step;
      list.appendChild(item);
    });
  }

  function renderDialogue(result) {
    $("speakerTag").textContent = scenario.aiName + " · " + (MOOD_LABEL[result.mood] || "panicked");
    $("aiDialogue").textContent = result.spoken_reply;
    scene.setMood(result.mood);
  }

  function updateHud() {
    var m = String(Math.floor(doorsLeft / 60));
    var s = String(doorsLeft % 60).padStart(2, "0");
    $("doorsHud").textContent = "Doors " + m + ":" + s;
    var clarity = $("clarityHud");
    var remaining = scenario.maxStrikes - strikes;
    if (remaining < 0) remaining = 0;
    clarity.textContent = clarityLabel(strikes, scenario.maxStrikes);
    clarity.classList.toggle("is-low", remaining > 0 && remaining < scenario.maxStrikes);
    clarity.classList.toggle("is-out", remaining === 0);
    clarity.setAttribute("aria-label", remaining + " of " + scenario.maxStrikes + " clear chances remaining");
    setStep("zone", state.SEAT_NEAR_DOOR === "LOOKING");
    setStep("bag", state.BAG_NAVY_SMALL === "HELD");
    setStep("tag", state.NAME_TAG === "SHOWN");
  }

  function setStep(name, done) {
    var node = document.querySelector('[data-step="' + name + '"]');
    if (!node) return;
    node.classList.toggle("is-done", !!done);
  }

  function startDoors() {
    if (doorsRunning || ended) return;
    doorsRunning = true;
    scene.setDoors(doorsLeft, true);
    doorsTimer = setInterval(function () {
      doorsLeft -= 1;
      if (doorsLeft < 0) doorsLeft = 0;
      updateHud();
      scene.setDoors(doorsLeft, true);
      if (doorsLeft <= 0 && !ended) {
        stopDoors();
        if (!isWin(scenario, state)) {
          $("aiDialogue").textContent = "The doors closed. We missed this stop — try again next carriage.";
          $("speakerTag").textContent = scenario.aiName + " · panicked";
          scene.setMood("PANICKED");
          finish("miss");
        }
      }
    }, 1000);
  }

  function stopDoors() {
    doorsRunning = false;
    if (doorsTimer) clearInterval(doorsTimer);
    doorsTimer = null;
  }

  function finish(kind) {
    ended = kind;
    stopDoors();
    if (recognition && listening) {
      try { recognition.stop(); } catch (err) { /* already stopped */ }
      setListening(false);
    }
    var banner = $("banner");
    banner.hidden = false;
    if (kind === "win") {
      banner.textContent = scenario.endCopy.winTitle + " " + scenario.endCopy.winDetail;
      banner.className = "banner is-win";
      scene.setOutcome("win");
    } else {
      banner.textContent = scenario.endCopy.missTitle;
      banner.className = "banner is-miss";
      scene.setOutcome("miss");
    }
    if (kind === "miss") {
      $("micBtn").disabled = true;
      $("textCmd").disabled = true;
      $("sendBtn").disabled = true;
    }
  }

  async function takeTurn(transcript) {
    if (ended === "miss") return;
    var ticket = ++turnTicket;
    $("heardText").textContent = transcript;
    startDoors();
    var result;
    try {
      result = await queryCoach({
        scenario: scenario,
        currentState: state,
        transcript: transcript
      });
    } catch (err) {
      if (ticket !== turnTicket) return;
      $("aiDialogue").textContent = "The coach is not connected. Type your line again in a moment.";
      return;
    }
    if (ticket !== turnTicket) return;
    if (!result || scenario.allowedActions.indexOf(result.hardware_action) === -1) {
      $("teacherTip").textContent = "The coach reply was not a known action. Try the seat note again.";
      return;
    }
    state = applyHardwareAction(state, result.hardware_action);
    if (scenario.clarityStrikeActions.indexOf(result.hardware_action) !== -1) {
      strikes += 1;
    }
    renderDialogue(result);
    speakText(result.spoken_reply);
    scene.apply(result.hardware_action, state);
    var tip = result.teacher_tip;
    if (strikes >= scenario.maxStrikes && !isWin(scenario, state)) {
      tip = tip + " That's three. Missed the stop — try again next carriage.";
    }
    $("teacherTip").textContent = tip;
    updateHud();
    if (isWin(scenario, state)) {
      if (ended !== "win") finish("win");
    } else if (strikes >= scenario.maxStrikes) {
      finish("miss");
    }
  }

  function resetMission() {
    turnTicket += 1;
    stopDoors();
    if (recognition && listening) {
      try { recognition.stop(); } catch (err) { /* already stopped */ }
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    state = freshState(scenario);
    strikes = 0;
    doorsLeft = scenario.doorsSeconds;
    ended = "";
    scene = mountScene($("scene"), scenario);
    $("missionTitle").textContent = scenario.title;
    $("frameLine").textContent = scenario.frame;
    renderManual(scenario);
    renderDialogue(scenario.intro);
    $("teacherTip").textContent = scenario.intro.teacher_tip;
    $("heardText").textContent = "…";
    $("banner").hidden = true;
    $("banner").className = "banner";
    $("micBtn").disabled = !speechInputAvailable();
    $("textCmd").disabled = false;
    $("sendBtn").disabled = false;
    setListening(false);
    updateHud();
    scene.setDoors(doorsLeft, false);
    scene.setOutcome("");
  }
}

if (typeof document !== "undefined") boot();
