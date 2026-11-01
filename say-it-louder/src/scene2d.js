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

export function sceneCue(action, state) {
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

export function mountScene(root, scenario) {
  root.replaceChildren();
  root.classList.add("scene");
  var live = el("p", "scene-live");
  live.setAttribute("aria-live", "polite");

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
  carriage.setAttribute("aria-label", "MTR carriage with four items near the door seats: a black sports bag, a small navy bag under the seat, a yellow lunchbox, and a big grey bag at the far end.");

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
  far.appendChild(propNode(props.BAG_GREY_BIG || { id: "BAG_GREY_BIG", label: "Big grey bag", place: "At the far end" }, "prop-grey"));
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
    showCue(null);
    if (kind === "win") {
      carriage.classList.add("is-win");
      chan.textContent = "Ms Chan: Bag found. Lovely clear English.";
    }
    if (kind === "miss") {
      carriage.classList.add("is-missed");
      chan.textContent = "Ms Chan: Missed the stop — try again next carriage.";
    }
  }

  setMood("PANICKED");
  return { apply: apply, setMood: setMood, setDoors: setDoors, setOutcome: setOutcome };
}
