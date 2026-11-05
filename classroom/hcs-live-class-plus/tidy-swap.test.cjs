const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

function extractFunction(source, name) {
  const needle = 'function ' + name + '(';
  const start = source.indexOf(needle);
  assert.notEqual(start, -1, name);
  let i = source.indexOf('{', start);
  let depth = 0;
  for (; i < source.length; i++) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error('unclosed ' + name);
}

const sandbox = { module: { exports: {} }, exports: {} };
vm.runInNewContext(
  [
    'const DESK_W = 148;',
    'const DESK_H = 115;',
    extractFunction(html, 'deskOverlapArea'),
    extractFunction(html, 'findSeatSwapTarget'),
    extractFunction(html, 'axisClusterAnchor'),
    extractFunction(html, 'layoutAxisAnchors'),
    extractFunction(html, 'nearestLayoutAnchor'),
    'module.exports = { findSeatSwapTarget, layoutAxisAnchors, nearestLayoutAnchor };'
  ].join('\n'),
  sandbox
);
const { findSeatSwapTarget, layoutAxisAnchors, nearestLayoutAnchor } = sandbox.module.exports;

const COL_SPAN = (148 + 8) / 2 - 1;
const ROW_SPAN = (115 + 10) / 2 - 1;

test('a drop onto another seat exchanges that seat exactly', function () {
  const dragged = { id: 'a', name: 'Student 04', groupId: 'red', score: 3, x: 180, y: 58 };
  const target = { id: 'b', name: 'Student 09', groupId: 'blue', score: 1, x: 240, y: 50 };
  const hit = findSeatSwapTarget({ students: [dragged, target] }, dragged, dragged.x, dragged.y);
  assert.equal(hit, target);
  const sourceX = 76;
  const sourceY = 50;
  dragged.x = hit.x;
  dragged.y = hit.y;
  hit.x = sourceX;
  hit.y = sourceY;
  assert.deepEqual([dragged.x, dragged.y], [240, 50]);
  assert.deepEqual([target.x, target.y], [76, 50]);
  assert.equal(dragged.name, 'Student 04');
  assert.equal(target.name, 'Student 09');
  assert.equal(dragged.groupId, 'red');
  assert.equal(target.score, 1);
});

test('a near miss does not swap seats', function () {
  const dragged = { id: 'a', name: 'Student 04', x: 100, y: 50 };
  const target = { id: 'b', name: 'Student 09', x: 240, y: 50 };
  assert.equal(findSeatSwapTarget({ students: [dragged, target] }, dragged, dragged.x, dragged.y), null);
});

test('Tidy snaps a wobble to this layout and keeps uneven columns', function () {
  const cols = [76, 240, 404, 568, 732, 896];
  const rows = [50, 175, 300];
  const desks = [];
  rows.forEach(function (y) {
    cols.forEach(function (x) {
      desks.push({ x: x, y: y });
    });
  });
  desks[3].x = 568 + 36;
  desks[3].y = 50 + 20;
  const colAnchors = Array.from(layoutAxisAnchors(desks.map(function (d) { return d.x; }), COL_SPAN));
  const rowAnchors = Array.from(layoutAxisAnchors(desks.map(function (d) { return d.y; }), ROW_SPAN));
  assert.deepEqual(colAnchors, cols);
  assert.deepEqual(rowAnchors, rows);
  assert.equal(nearestLayoutAnchor(desks[3].x, colAnchors), 568);
  assert.equal(nearestLayoutAnchor(desks[3].y, rowAnchors), 50);

  const pairs = [28, 184, 368, 524];
  const pairValues = [];
  for (let r = 0; r < 3; r++) pairs.forEach(function (x) { pairValues.push(x); });
  pairValues.push(224);
  assert.deepEqual(Array.from(layoutAxisAnchors(pairValues, COL_SPAN)), pairs);
  assert.equal(nearestLayoutAnchor(224, layoutAxisAnchors(pairValues, COL_SPAN)), 184);

  const withSingle = cols.concat([1016]);
  const singleAnchors = Array.from(layoutAxisAnchors(withSingle, COL_SPAN));
  assert.ok(singleAnchors.indexOf(1016) !== -1);
  assert.equal(nearestLayoutAnchor(1016, singleAnchors), 1016);
  const nearColumn = Array.from(layoutAxisAnchors(cols.concat([700]), COL_SPAN));
  assert.equal(nearColumn.indexOf(700), -1);
  assert.equal(nearestLayoutAnchor(700, nearColumn), 732);
});
