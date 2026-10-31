/**
 * HCS Live Class — Spark "On fire" window and individual top-3.
 * On fire: 3+ points added inside a rolling 3 minute window. Older adds
 * drop out, and the flag clears when the window sum falls under 3.
 * Top-3 follows the live individual board (score, then class number).
 * Seat size and the other skins do not live here.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SparkFire = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var WINDOW_MS = 3 * 60 * 1000;
  var MIN_PTS = 3;

  function list(st) {
    if (!st.sparkPts || !Array.isArray(st.sparkPts)) st.sparkPts = [];
    return st.sparkPts;
  }

  function pointsAt(events, now) {
    var cut = now - WINDOW_MS;
    var sum = 0;
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      if (ev && ev.t > cut && ev.d > 0) sum += ev.d;
    }
    return sum;
  }

  function prune(events, now) {
    var cut = now - WINDOW_MS;
    var kept = [];
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      if (ev && ev.t > cut && ev.d > 0) kept.push(ev);
    }
    events.length = 0;
    for (var j = 0; j < kept.length; j++) events.push(kept[j]);
  }

  function note(st, delta, now) {
    if (!st || !(delta > 0) || !isFinite(now)) return;
    var events = list(st);
    events.push({ t: now, d: delta });
    prune(events, now);
  }

  function undo(st, delta, at) {
    if (!st || !(delta > 0) || !isFinite(at)) return;
    var events = list(st);
    for (var i = events.length - 1; i >= 0; i--) {
      if (events[i] && events[i].d === delta && events[i].t === at) {
        events.splice(i, 1);
        return;
      }
    }
  }

  function clear(st) {
    if (st) st.sparkPts = [];
  }

  function onFire(st, now) {
    if (!st || !isFinite(now)) return false;
    var events = list(st);
    prune(events, now);
    return pointsAt(events, now) >= MIN_PTS;
  }

  function sortedIndividuals(students) {
    return (students || []).slice().sort(function (a, b) {
      if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
      return String(a.classNo).localeCompare(String(b.classNo));
    });
  }

  function individualTiers(students) {
    var sorted = sortedIndividuals(students);
    var out = {};
    sorted.forEach(function (st, i) {
      var score = Number(st.score) || 0;
      out[st.id] = (i < 3 && score > 0) ? (i + 1) : 0;
    });
    return out;
  }

  // Soonest time an On fire flag flips as an add leaves the window.
  function nextChangeAt(students, now) {
    var soonest = null;
    var rows = students || [];
    for (var s = 0; s < rows.length; s++) {
      var events = rows[s] && rows[s].sparkPts;
      if (!events || !events.length) continue;
      for (var i = 0; i < events.length; i++) {
        var ev = events[i];
        if (!ev || !(ev.d > 0) || !isFinite(ev.t)) continue;
        var at = ev.t + WINDOW_MS;
        if (at <= now) continue;
        var beforeOn = pointsAt(events, at - 1) >= MIN_PTS;
        var afterOn = pointsAt(events, at) >= MIN_PTS;
        if (beforeOn !== afterOn && (soonest == null || at < soonest)) soonest = at;
      }
    }
    return soonest;
  }

  return {
    WINDOW_MS: WINDOW_MS,
    MIN_PTS: MIN_PTS,
    note: note,
    undo: undo,
    clear: clear,
    onFire: onFire,
    pointsAt: pointsAt,
    sortedIndividuals: sortedIndividuals,
    individualTiers: individualTiers,
    nextChangeAt: nextChangeAt
  };
});
