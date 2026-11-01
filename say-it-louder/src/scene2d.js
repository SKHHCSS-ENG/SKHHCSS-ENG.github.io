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

function el(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function propNode(prop, className) {
  var wrap = el("div", "prop " + className);
  wrap.dataset.prop = prop.id;
  wrap.appendChild(el("span", "prop-body", ""));
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
  navy.appendChild(tag);
  seat.appendChild(navy);
  row.appendChild(seat);

  row.appendChild(propNode(props.LUNCHBOX_YELLOW || { id: "LUNCHBOX_YELLOW", label: "Yellow lunchbox", place: "Next to the seat" }, "prop-lunch"));
  doorCol.appendChild(row);
  floor.appendChild(doorCol);

  var leo = el("div", "leo");
  leo.appendChild(el("span", "leo-head"));
  leo.appendChild(el("span", "leo-body"));
  var mood = el("span", "leo-mood", "Panicked");
  leo.appendChild(mood);
  floor.appendChild(leo);
  carriage.appendChild(floor);

  var chan = el("p", "ms-chan", "Ms Chan is on the platform. The doors start when you speak.");
  carriage.appendChild(chan);

  root.appendChild(carriage);
  root.appendChild(live);

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
