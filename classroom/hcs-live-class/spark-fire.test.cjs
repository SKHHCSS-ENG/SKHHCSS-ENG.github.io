const test = require('node:test');
const assert = require('node:assert/strict');
const Spark = require('./spark-fire.js');

const MIN = 3 * 60 * 1000;

test('window is 3 minutes and the flag starts at 3 points', function () {
  assert.equal(Spark.WINDOW_MS, MIN);
  assert.equal(Spark.MIN_PTS, 3);
});

test('2 points in the window is not On fire', function () {
  var st = { id: 'a', sparkPts: [] };
  var t = 1_000_000;
  Spark.note(st, 1, t);
  Spark.note(st, 1, t + 1000);
  assert.equal(Spark.onFire(st, t + 1000), false);
});

test('3 points in the window is On fire, including one +3', function () {
  var taps = { id: 'b', sparkPts: [] };
  var t = 2_000_000;
  Spark.note(taps, 1, t);
  Spark.note(taps, 1, t + 1000);
  Spark.note(taps, 1, t + 2000);
  assert.equal(Spark.onFire(taps, t + 2000), true);

  var lump = { id: 'c', sparkPts: [] };
  Spark.note(lump, 3, t);
  assert.equal(Spark.onFire(lump, t), true);
});

test('points older than 3 minutes drop out and the flag clears', function () {
  var st = { id: 'd', sparkPts: [] };
  var t = 5_000_000;
  Spark.note(st, 2, t);
  Spark.note(st, 1, t + 60 * 1000);
  assert.equal(Spark.onFire(st, t + 60 * 1000), true);
  // 1ms before the first add leaves the window, both still count.
  assert.equal(Spark.onFire(st, t + MIN - 1), true);
  assert.equal(Spark.onFire(st, t + MIN), false);
  assert.equal(Spark.onFire(st, t + MIN), false);
});

test('a minus does not add to the window', function () {
  var st = { id: 'e', sparkPts: [] };
  var t = 8_000_000;
  Spark.note(st, -1, t);
  Spark.note(st, 0, t);
  Spark.note(st, 2, t);
  assert.equal(st.sparkPts.length, 1);
  assert.equal(Spark.onFire(st, t), false);
});

test('undo removes that add and redo can put the same stamp back', function () {
  var st = { id: 'f', sparkPts: [] };
  var t = 9_000_000;
  Spark.note(st, 1, t);
  Spark.note(st, 1, t + 10);
  Spark.note(st, 1, t + 20);
  assert.equal(Spark.onFire(st, t + 20), true);
  Spark.undo(st, 1, t + 20);
  assert.equal(Spark.onFire(st, t + 20), false);
  Spark.note(st, 1, t + 20);
  assert.equal(Spark.onFire(st, t + 20), true);
});

test('clear drops the window', function () {
  var st = { id: 'g', sparkPts: [] };
  Spark.note(st, 4, 100);
  Spark.clear(st);
  assert.equal(Spark.onFire(st, 100), false);
});

test('next change is the moment the window falls under 3', function () {
  var st = { id: 'h', sparkPts: [] };
  var t = 20_000_000;
  Spark.note(st, 3, t);
  assert.equal(Spark.nextChangeAt([st], t), t + MIN);
  assert.equal(Spark.nextChangeAt([st], t + MIN), null);
});

test('top 3 follows score then class number and skips a zero score', function () {
  var tiers = Spark.individualTiers([
    { id: 'low', classNo: '1', score: 0 },
    { id: 'tieB', classNo: '12', score: 5 },
    { id: 'first', classNo: '3', score: 9 },
    { id: 'tieA', classNo: '4', score: 5 },
    { id: 'fourth', classNo: '2', score: 4 }
  ]);
  assert.equal(tiers.first, 1);
  // Class numbers sort as strings, same as the live board: "12" before "4".
  assert.equal(tiers.tieB, 2);
  assert.equal(tiers.tieA, 3);
  assert.equal(tiers.fourth, 0);
  assert.equal(tiers.low, 0);
});
