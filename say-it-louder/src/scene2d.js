/**
 * 2D MTR carriage. CSS panels only — no Three.js.
 * Props and labels come from the scenario pack.
 */

var ACTION_COPY = {
  SEAT_NEAR_DOOR: "Leo moves to the seats near the door.",
  SEAT_LEFT: "Leo looks to the left, at the black sports bag.",
  SEAT_MIDDLE: "Leo looks under the middle seat.",
  HOVER_CONFUSED: "Leo hovers, unsure which bag you mean.",
  BAG_BLACK_SPORTS: "Leo lifts the black sports bag, then puts it back.",
  BAG_GREY_BIG: "Leo lifts the big grey bag, then puts it back.",
  LUNCHBOX_YELLOW: "Leo lifts the yellow lunchbox, then puts it back.",
  BAG_NAVY_SMALL: "Leo picks up the small navy bag from under the seat.",
  SHOW_NAME_TAG: "Leo reads the name tag on the front. It says Leo.",
  NONE: ""
};

export var MAP_SPOTS = {
  GATE: { x: 50, y: 78 },
  GATE_IN: { x: 50, y: 68 },
  OFFICE: { x: 50, y: 58 },
  CORNER: { x: 50, y: 50 },
  WALKWAY: { x: 50, y: 42 },
  CANTEEN_PATH: { x: 50, y: 34 },
  CANTEEN: { x: 18, y: 34 },
  PLAYGROUND: { x: 50, y: 26 },
  HALL: { x: 78, y: 16 },
  LIBRARY: { x: 50, y: 30 }
};

var MAP_PIN = {
  GATE: "GATE",
  GATE_IN: "GATE",
  OFFICE: "OFFICE",
  CORNER: "OFFICE",
  WALKWAY: "WALKWAY",
  CANTEEN_PATH: "CANTEEN",
  CANTEEN: "CANTEEN",
  PLAYGROUND: "PLAYGROUND",
  HALL: "HALL",
  LIBRARY: "LIBRARY"
};

var WALK_ACTIONS = {
  MOVE_NORTH: 1,
  MOVE_SOUTH: 1,
  MOVE_EAST: 1,
  MOVE_WEST: 1,
  TURN_LEFT: 1,
  TURN_RIGHT: 1,
  GO_ALONG_PATH: 1,
  GO_THROUGH_GATE: 1,
  WALK_PAST_CANTEEN: 1,
  CROSS_PLAYGROUND: 1,
  ARRIVE_GATE: 1,
  ARRIVE_OFFICE: 1,
  ARRIVE_CANTEEN: 1,
  ARRIVE_PLAYGROUND: 1,
  ARRIVE_HALL: 1,
  ARRIVE_LIBRARY: 1,
  STEP_BACK: 1
};

var PLATE_FILE = {
  "m1-01": "say-it-louder-M1-01-carriage-wide.jpg",
  "m1-02": "say-it-louder-M1-02-seats-props.jpg",
  "m1-03": "say-it-louder-M1-03-leo-confused.jpg",
  "m1-04": "say-it-louder-M1-04-leo-navy-bag.jpg",
  "m1-05": "say-it-louder-M1-05-name-tag.jpg",
  "m1-06": "say-it-louder-M1-06-leo-relieved.jpg",
  "m1-f01": "say-it-louder-M1-F01-wrong-black-bag.jpg",
  "m1-f02": "say-it-louder-M1-F02-wrong-grey-bag.jpg",
  "m1-f03": "say-it-louder-M1-F03-put-bag-back.jpg",
  "m2-01": "say-it-louder-M2-01-school-gate.jpg",
  "m2-02": "say-it-louder-M2-02-school-office.jpg",
  "m2-03": "say-it-louder-M2-03-covered-walkway.jpg",
  "m2-04": "say-it-louder-M2-04-canteen.jpg",
  "m2-05": "say-it-louder-M2-05-playground.jpg",
  "m2-06": "say-it-louder-M2-06-school-hall.jpg",
  "m2-07": "say-it-louder-M2-07-library.jpg",
  "m2-08": "say-it-louder-M2-08-leo-side-walk.jpg",
  "m2-09": "say-it-louder-M2-09-leo-confused.jpg",
  "m2-10": "say-it-louder-M2-10-leo-relieved-library.jpg",
  "m2-f01": "say-it-louder-M2-F01-canteen-enter.jpg",
  "m2-f02": "say-it-louder-M2-F02-bells-gone-gate.jpg"
};

var PUT_BACK_MS = 1500;

var NODE_PLATE = {
  GATE: "m2-01",
  GATE_IN: "m2-01",
  OFFICE: "m2-02",
  CORNER: "m2-02",
  WALKWAY: "m2-03",
  CANTEEN_PATH: "m2-04",
  CANTEEN: "m2-04",
  PLAYGROUND: "m2-05",
  HALL: "m2-06",
  LIBRARY: "m2-07"
};

function plateSrc(id) {
  return new URL("../assets/" + PLATE_FILE[id], import.meta.url).href;
}

export function carriagePlate(action, state, mood, outcome, returning) {
  if (outcome === "win") return "m1-06";
  if (action === "BAG_BLACK_SPORTS") return returning ? "m1-f03" : "m1-f01";
  if (action === "BAG_GREY_BIG") return returning ? "m1-f03" : "m1-f02";
  if (state && state.NAME_TAG === "SHOWN") return "m1-05";
  if (state && state.BAG_NAVY_SMALL === "HELD") return "m1-04";
  if (action === "HOVER_CONFUSED" || mood === "CONFUSED") return "m1-03";
  if (
    action === "LUNCHBOX_YELLOW" ||
    (state && (state.SEAT_NEAR_DOOR === "LOOKING" || state.SEAT_LEFT === "LOOKING" || state.SEAT_MIDDLE === "LOOKING"))
  ) {
    return "m1-02";
  }
  return "m1-01";
}

export function campusPlate(action, state, mood, outcome, walking) {
  if (outcome === "win") return "m2-10";
  if (outcome === "miss") return "m2-f02";
  var node = (state && state.NODE) || "GATE";
  var hall = action === "ARRIVE_HALL" || node === "HALL";
  var canteenFoil = action === "STEP_BACK" || action === "ARRIVE_CANTEEN" || node === "CANTEEN";
  if (hall) return "m2-06";
  if (canteenFoil) return "m2-f01";
  if (walking) return "m2-08";
  var atGateStart = node === "GATE" && (action === "NONE" || !action);
  if (action === "HOVER_CONFUSED" || (mood === "CONFUSED" && !atGateStart)) return "m2-09";
  return NODE_PLATE[node] || "m2-01";
}

function mountPlate(host) {
  var img = el("img", "scene-plate");
  img.alt = "";
  img.setAttribute("aria-hidden", "true");
  img.decoding = "async";
  host.insertBefore(img, host.firstChild);
  var current = "";
  img.addEventListener("load", function () {
    if (img.getAttribute("src")) host.classList.add("has-plate");
  });
  img.addEventListener("error", function () {
    host.classList.remove("has-plate");
  });
  return function show(id) {
    if (!PLATE_FILE[id] || id === current) return;
    current = id;
    host.dataset.plate = id;
    img.src = plateSrc(id);
  };
}

function mapCue(action, state) {
  if (action === "HOVER_CONFUSED") {
    return { kind: "wait", text: "Wait — say left, right, or a landmark." };
  }
  if (action === "STEP_BACK" || action === "ARRIVE_CANTEEN") {
    return { kind: "wait", text: "Wrong building — step back and say it clearer." };
  }
  if (action === "ARRIVE_HALL" || (state && state.NODE === "HALL")) {
    return { kind: "wait", text: "That's the hall. The library is next to it." };
  }
  if (state && state.LIBRARY === "ARRIVED") {
    return { kind: "hold", text: "Library reached." };
  }
  return null;
}

export function sceneCue(action, state) {
  if (state && Object.prototype.hasOwnProperty.call(state, "GATE")) return mapCue(action, state);
  if (action === "HOVER_CONFUSED") {
    return { kind: "wait", text: "Wait — say the colour and the size." };
  }
  if (state && state.BAG_NAVY_SMALL === "HELD" && state.NAME_TAG !== "SHOWN") {
    return { kind: "hold", text: "Holding the small navy bag." };
  }
  return null;
}

function el(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function propNode(prop, className) {
  var wrap = el("div", "prop " + className);
  wrap.dataset.prop = prop.id;
  var body = el("span", "prop-body");
  body.appendChild(el("span", "prop-strap"));
  body.appendChild(el("span", "prop-mark"));
  wrap.appendChild(body);
  wrap.appendChild(el("span", "prop-label", prop.label));
  wrap.appendChild(el("span", "prop-place", prop.place));
  return wrap;
}

function mountSchoolMap(root, scenario, live) {
  var campus = el("div", "campus");
  campus.setAttribute("data-ask-clear", "");
  campus.setAttribute("role", "img");
  campus.setAttribute("aria-label", "School campus map. The gate is at the bottom. The path goes past the office, along the covered walkway, past the canteen, and beside the playground to the library. The school hall is next to the library.");
  var showPlate = mountPlate(campus);

  campus.appendChild(el("div", "campus-grass"));
  campus.appendChild(el("div", "campus-path campus-path-ns"));
  campus.appendChild(el("div", "campus-path campus-path-ew"));

  var pins = {};
  (scenario.landmarks || []).forEach(function (mark) {
    var pin = el("div", "pin pin-" + mark.id.toLowerCase());
    pin.dataset.pin = mark.id;
    pin.appendChild(el("span", "pin-label", mark.label));
    if (mark.place) pin.appendChild(el("span", "pin-place", mark.place));
    pins[mark.id] = pin;
    campus.appendChild(pin);
  });

  var leo = el("div", "leo");
  leo.setAttribute("data-ask-clear", "");
  leo.appendChild(el("span", "leo-name", "Leo"));
  var figure = el("span", "leo-figure");
  figure.setAttribute("aria-hidden", "true");
  var head = el("span", "leo-head");
  head.appendChild(el("span", "leo-hair"));
  head.appendChild(el("span", "leo-eyes"));
  head.appendChild(el("span", "leo-mouth"));
  head.appendChild(el("span", "leo-sweat"));
  figure.appendChild(head);
  var torso = el("span", "leo-body");
  torso.appendChild(el("span", "leo-tie"));
  figure.appendChild(torso);
  var legs = el("span", "leo-legs");
  legs.appendChild(el("span", "leo-leg"));
  legs.appendChild(el("span", "leo-leg"));
  figure.appendChild(legs);
  leo.appendChild(figure);
  var mood = el("span", "leo-mood", "Confused");
  leo.appendChild(mood);
  campus.appendChild(leo);

  var cue = el("p", "scene-cue");
  cue.hidden = true;
  cue.setAttribute("data-ask-clear", "");
  cue.setAttribute("role", "status");

  var chan = el("p", "ms-chan", "Ms Chan is by the gate. The bell starts when you speak.");
  chan.setAttribute("data-ask-clear", "");

  root.appendChild(cue);
  root.appendChild(campus);
  root.appendChild(chan);
  root.appendChild(live);

  var walkTimer = null;
  var plateAction = "";
  var plateState = scenario.initialState || null;
  var plateMood = "CONFUSED";
  var plateOutcome = "";
  var plateWalking = false;

  function syncPlate() {
    showPlate(campusPlate(plateAction, plateState, plateMood, plateOutcome, plateWalking));
  }

  function showCue(next) {
    if (!next) {
      cue.hidden = true;
      cue.textContent = "";
      cue.className = "scene-cue";
      return;
    }
    cue.hidden = false;
    cue.className = "scene-cue is-" + next.kind;
    cue.textContent = next.text;
  }

  function placeLeo(state) {
    var node = (state && state.NODE) || "GATE";
    var spot = MAP_SPOTS[node] || MAP_SPOTS.GATE;
    leo.style.left = spot.x + "%";
    leo.style.top = spot.y + "%";
    var facing = ((state && state.FACING) || "NORTH").toLowerCase();
    campus.classList.remove("facing-north", "facing-east", "facing-south", "facing-west");
    campus.classList.add("facing-" + facing);
    Object.keys(pins).forEach(function (id) {
      pins[id].classList.remove("is-here", "is-beside");
    });
    var pinId = MAP_PIN[node];
    if (pinId && pins[pinId]) {
      if (node === "CANTEEN_PATH") pins[pinId].classList.add("is-beside");
      else pins[pinId].classList.add("is-here");
    }
  }

  function setMood(next) {
    var label = {
      PANICKED: "Panicked",
      CONFUSED: "Confused",
      RELIEVED: "Relieved",
      HOPEFUL: "Hopeful"
    }[next] || "Confused";
    campus.dataset.mood = next || "CONFUSED";
    mood.textContent = label;
    plateMood = next || "CONFUSED";
    syncPlate();
  }

  function apply(action, state) {
    campus.classList.remove("is-hover", "is-foil-canteen", "is-foil-hall", "is-walking");
    placeLeo(state);
    plateAction = action || "";
    plateState = state || plateState;
    if (action === "HOVER_CONFUSED") campus.classList.add("is-hover");
    if (action === "STEP_BACK" || action === "ARRIVE_CANTEEN") campus.classList.add("is-foil-canteen");
    if (action === "ARRIVE_HALL") campus.classList.add("is-foil-hall");
    if (walkTimer) clearTimeout(walkTimer);
    plateWalking = false;
    if (WALK_ACTIONS[action]) {
      plateWalking = true;
      campus.classList.add("is-walking");
      walkTimer = setTimeout(function () {
        plateWalking = false;
        campus.classList.remove("is-walking");
        syncPlate();
      }, 800);
    }
    if (MAP_ACTION_COPY[action]) live.textContent = MAP_ACTION_COPY[action];
    showCue(mapCue(action, state));
    syncPlate();
  }

  function setDoors(seconds, running) {
    if (!running) {
      chan.textContent = "Ms Chan is by the gate. The bell starts when you speak.";
      return;
    }
    if (seconds <= 0) {
      chan.textContent = "Ms Chan: Bell's gone.";
      return;
    }
    chan.textContent = "Ms Chan: Bell in " + seconds + " seconds.";
  }

  function setOutcome(kind) {
    campus.classList.remove("is-win", "is-missed");
    plateOutcome = kind || "";
    if (kind === "win") {
      campus.classList.add("is-win");
      chan.textContent = "Ms Chan: Library reached. Lovely clear directions.";
      showCue({ kind: "hold", text: "Library reached." });
      syncPlate();
      return;
    }
    if (kind === "miss") {
      campus.classList.add("is-missed");
      chan.textContent = "Ms Chan: Bell's gone — back to the gate.";
      showCue(null);
      syncPlate();
      return;
    }
    showCue(null);
    syncPlate();
  }

  setMood("CONFUSED");
  placeLeo(scenario.initialState);
  syncPlate();
  return { apply: apply, setMood: setMood, setDoors: setDoors, setOutcome: setOutcome };
}

var MAP_ACTION_COPY = {
  MOVE_NORTH: "Leo walks north.",
  MOVE_SOUTH: "Leo walks south.",
  MOVE_EAST: "Leo walks east.",
  MOVE_WEST: "Leo walks west.",
  TURN_LEFT: "Leo turns left.",
  TURN_RIGHT: "Leo turns right.",
  GO_THROUGH_GATE: "Leo goes through the school gate.",
  GO_ALONG_PATH: "Leo goes along the covered walkway.",
  WALK_PAST_CANTEEN: "Leo walks past the canteen.",
  CROSS_PLAYGROUND: "Leo crosses the playground edge.",
  ARRIVE_GATE: "Leo is at the school gate.",
  ARRIVE_OFFICE: "Leo is by the school office.",
  ARRIVE_CANTEEN: "Leo steps into the canteen, then back.",
  ARRIVE_PLAYGROUND: "Leo is at the playground edge.",
  ARRIVE_HALL: "Leo is at the school hall.",
  ARRIVE_LIBRARY: "Leo arrives at the library.",
  STEP_BACK: "Leo steps back from the wrong building.",
  HOVER_CONFUSED: "Leo waits, unsure which way you mean.",
  NONE: ""
};

export function mountScene(root, scenario) {
  root.replaceChildren();
  root.classList.add("scene");
  root.classList.toggle("scene-map", !!(scenario && scenario.sceneId === "school-map"));
  var live = el("p", "scene-live");
  live.setAttribute("aria-live", "polite");

  if (scenario && scenario.sceneId === "school-map") return mountSchoolMap(root, scenario, live);

  if (!scenario || scenario.sceneId !== "mtr-carriage") {
    var plain = el("p", "scene-fallback", scenario ? scenario.title : "Scene");
    root.appendChild(plain);
    root.appendChild(live);
    return {
      apply: function () {},
      setMood: function () {},
      setDoors: function () {},
      setOutcome: function () {}
    };
  }

  var props = {};
  (scenario.props || []).forEach(function (prop) {
    props[prop.id] = prop;
  });

  var carriage = el("div", "carriage");
  carriage.setAttribute("data-ask-clear", "");
  carriage.setAttribute("role", "img");
  carriage.setAttribute("aria-label", "MTR carriage with four items near the door seats: a black sports bag, a small navy bag under the seat, a yellow lunchbox, and a big grey bag on the seat.");
  var showPlate = mountPlate(carriage);

  var wall = el("div", "carriage-wall");
  wall.appendChild(el("div", "window"));
  wall.appendChild(el("div", "window"));
  var doors = el("div", "doors");
  doors.appendChild(el("span", "door-leaf"));
  doors.appendChild(el("span", "door-leaf"));
  doors.appendChild(el("span", "door-caption", "Door"));
  wall.appendChild(doors);
  carriage.appendChild(wall);

  var floor = el("div", "carriage-floor");
  var far = el("div", "far-col");
  far.appendChild(el("p", "zone-name", "Far end"));
  far.appendChild(propNode(props.BAG_GREY_BIG || { id: "BAG_GREY_BIG", label: "Big grey bag", place: "On the seat" }, "prop-grey"));
  floor.appendChild(far);

  var doorCol = el("div", "door-col");
  doorCol.appendChild(el("p", "zone-name", "Near the door"));
  var row = el("div", "seat-row");

  row.appendChild(propNode(props.BAG_BLACK_SPORTS || { id: "BAG_BLACK_SPORTS", label: "Black sports bag", place: "Beside the seat" }, "prop-black"));

  var seat = el("div", "seat");
  seat.appendChild(el("span", "seat-pad"));
  var navy = propNode(props.BAG_NAVY_SMALL || { id: "BAG_NAVY_SMALL", label: "Small navy bag", place: "Under the seat" }, "prop-navy");
  var tag = el("span", "name-tag");
  tag.appendChild(el("span", "tag-face", "Leo"));
  navy.querySelector(".prop-body").appendChild(tag);
  seat.appendChild(navy);
  row.appendChild(seat);

  row.appendChild(propNode(props.LUNCHBOX_YELLOW || { id: "LUNCHBOX_YELLOW", label: "Yellow lunchbox", place: "Next to the seat" }, "prop-lunch"));
  doorCol.appendChild(row);
  floor.appendChild(doorCol);

  var leo = el("div", "leo");
  leo.setAttribute("data-ask-clear", "");
  leo.appendChild(el("span", "leo-name", "Leo"));
  var head = el("span", "leo-head");
  head.setAttribute("aria-hidden", "true");
  head.appendChild(el("span", "leo-hair"));
  head.appendChild(el("span", "leo-eyes"));
  head.appendChild(el("span", "leo-mouth"));
  head.appendChild(el("span", "leo-sweat"));
  leo.appendChild(head);
  var torso = el("span", "leo-body");
  torso.setAttribute("aria-hidden", "true");
  torso.appendChild(el("span", "leo-tie"));
  leo.appendChild(torso);
  var mood = el("span", "leo-mood", "Panicked");
  leo.appendChild(mood);
  floor.appendChild(leo);
  carriage.appendChild(floor);

  var cue = el("p", "scene-cue");
  cue.hidden = true;
  cue.setAttribute("data-ask-clear", "");
  cue.setAttribute("role", "status");

  var chan = el("p", "ms-chan", "Ms Chan is on the platform. The doors start when you speak.");
  chan.setAttribute("data-ask-clear", "");
  carriage.appendChild(chan);

  root.appendChild(cue);
  root.appendChild(carriage);
  root.appendChild(live);

  var plateAction = "";
  var plateState = scenario.initialState || null;
  var plateMood = "PANICKED";
  var plateOutcome = "";
  var plateReturning = false;
  var returnTimer = null;

  function syncPlate() {
    showPlate(carriagePlate(plateAction, plateState, plateMood, plateOutcome, plateReturning));
  }

  function showCue(next) {
    if (!next) {
      cue.hidden = true;
      cue.textContent = "";
      cue.className = "scene-cue";
      return;
    }
    cue.hidden = false;
    cue.className = "scene-cue is-" + next.kind;
    cue.textContent = next.text;
  }

  function setMood(next) {
    var label = {
      PANICKED: "Panicked",
      CONFUSED: "Confused",
      RELIEVED: "Relieved",
      HOPEFUL: "Hopeful"
    }[next] || "Panicked";
    carriage.dataset.mood = next || "PANICKED";
    mood.textContent = label;
    plateMood = next || "PANICKED";
    syncPlate();
  }

  function apply(action, state) {
    carriage.classList.remove(
      "is-zone",
      "is-hover",
      "is-hold-navy",
      "is-tag",
      "is-wrong-black",
      "is-wrong-grey",
      "is-wrong-lunch",
      "is-left",
      "is-middle"
    );
    plateAction = action || "";
    plateState = state || plateState;
    if (returnTimer) clearTimeout(returnTimer);
    plateReturning = false;
    if (action === "BAG_BLACK_SPORTS" || action === "BAG_GREY_BIG") {
      returnTimer = setTimeout(function () {
        plateReturning = true;
        syncPlate();
      }, PUT_BACK_MS);
    }
    if (state && state.SEAT_NEAR_DOOR === "LOOKING") carriage.classList.add("is-zone");
    if (state && state.SEAT_LEFT === "LOOKING") carriage.classList.add("is-left");
    if (state && state.SEAT_MIDDLE === "LOOKING") carriage.classList.add("is-middle");
    if (state && state.BAG_NAVY_SMALL === "HELD") carriage.classList.add("is-hold-navy");
    if (state && state.NAME_TAG === "SHOWN") carriage.classList.add("is-tag");
    if (action === "HOVER_CONFUSED") carriage.classList.add("is-hover");
    if (action === "BAG_BLACK_SPORTS") carriage.classList.add("is-wrong-black");
    if (action === "BAG_GREY_BIG") carriage.classList.add("is-wrong-grey");
    if (action === "LUNCHBOX_YELLOW") carriage.classList.add("is-wrong-lunch");
    if (ACTION_COPY[action]) live.textContent = ACTION_COPY[action];
    showCue(sceneCue(action, state));
    syncPlate();
  }

  function setDoors(seconds, running) {
    if (!running) {
      chan.textContent = "Ms Chan is on the platform. The doors start when you speak.";
      return;
    }
    if (seconds <= 0) {
      chan.textContent = "Ms Chan: The doors have closed.";
      return;
    }
    chan.textContent = "Ms Chan: Doors in " + seconds + " seconds!";
  }

  function setOutcome(kind) {
    carriage.classList.remove("is-win", "is-missed");
    plateOutcome = kind || "";
    showCue(null);
    if (kind === "win") {
      carriage.classList.add("is-win");
      chan.textContent = "Ms Chan: Bag found. Lovely clear English.";
    }
    if (kind === "miss") {
      carriage.classList.add("is-missed");
      chan.textContent = "Ms Chan: Missed the stop — try again next carriage.";
    }
    syncPlate();
  }

  setMood("PANICKED");
  syncPlate();
  return { apply: apply, setMood: setMood, setDoors: setDoors, setOutcome: setOutcome };
}
