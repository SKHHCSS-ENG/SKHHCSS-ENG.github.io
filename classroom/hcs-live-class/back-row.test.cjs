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
    'const ROW_GAP_Y = 10;',
    'const EXAM_COL_GAP_X = 16;',
    'const FRONT_LABEL_H = 32;',
    'const FRONT_EDGE = 8;',
    'const FRONT_ROW_GAP = 10;',
    'const STAGE_WIDTH = 1120;',
    'const STAGE_HEIGHT = 640;',
    extractFunction(html, 'frontRowTopOffset'),
    extractFunction(html, 'planBackRowDesk'),
    extractFunction(html, 'getContentStageBounds'),
    'module.exports = { planBackRowDesk, getContentStageBounds, frontRowTopOffset };'
  ].join('\n'),
  sandbox
);
const { planBackRowDesk, getContentStageBounds } = sandbox.module.exports;

function applyPlan(students, frontAtTop) {
  const plan = planBackRowDesk(students, frontAtTop);
  const next = students.map(function (st) {
    return { x: st.x, y: st.y + plan.shift };
  });
  next.push({ x: plan.x, y: plan.y });
  return { plan: plan, students: next };
}

test('Front Bottom: a full back row gains a seat behind it, on the board', function () {
  const students = [];
  for (let c = 0; c < 3; c++) {
    students.push({ x: 40 + c * 164, y: 28 });
    students.push({ x: 40 + c * 164, y: 153 });
  }
  const placed = applyPlan(students, false);
  assert.equal(placed.plan.shift > 0, true);
  const added = placed.students[placed.students.length - 1];
  assert.equal(added.x, 40);
  assert.ok(added.y >= 28, 'new seat stays below the top edge');
  const oldBack = placed.students[0];
  assert.ok(added.y + 115 <= oldBack.y, 'new row sits fully behind the previous back row');
  const bounds = getContentStageBounds({ frontAtTop: false, students: placed.students });
  placed.students.forEach(function (st) {
    assert.ok(st.y >= 0, 'no desk above the board');
    assert.ok(st.y + 115 <= bounds.height, 'desk bottom stays inside the stage');
  });
});

test('Front Bottom: spare seats on the back row fill that row before a new one', function () {
  const students = [
    { x: 40, y: 28 },
    { x: 40, y: 153 },
    { x: 204, y: 153 }
  ];
  const plan = planBackRowDesk(students, false);
  assert.equal(plan.shift, 0);
  assert.equal(plan.y, 28);
  assert.equal(plan.x, 40 + 164);
});

test('Front Bottom: an existing gap behind the back row is used without shifting', function () {
  const students = [
    { x: 40, y: 200 },
    { x: 204, y: 200 }
  ];
  const plan = planBackRowDesk(students, false);
  assert.equal(plan.shift, 0);
  assert.equal(plan.y, 200 - 125);
  assert.ok(plan.y >= 28);
});

test('Front Top: the new row lands below the last desks and the stage keeps that room', function () {
  const students = [
    { x: 40, y: 50 },
    { x: 204, y: 50 },
    { x: 40, y: 175 },
    { x: 204, y: 175 }
  ];
  const plan = planBackRowDesk(students, true);
  assert.equal(plan.shift, 0);
  assert.equal(plan.y, 175 + 125);
  assert.equal(plan.x, 40);
  const before = getContentStageBounds({ frontAtTop: true, students: students });
  assert.ok(plan.y + 115 <= before.height, 'the new row fits the back-edge room already on the stage');
  const after = getContentStageBounds({
    frontAtTop: true,
    students: students.concat([{ x: plan.x, y: plan.y }])
  });
  assert.ok(after.height >= plan.y + 115 + 8);
});

test('＋ Desk uses the back-row plan', function () {
  assert.match(html, /planBackRowDesk\(cls\.students, !!cls\.frontAtTop\)/);
  assert.doesNotMatch(html, /Math\.floor\(\(nextNum - 1\) \/ 6\) \* \(DESK_H \+ ROW_GAP_Y\)/);
});
