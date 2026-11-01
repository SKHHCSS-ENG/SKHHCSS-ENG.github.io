const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('path');
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

function stripCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function walkCssRules(css, fn) {
  var s = stripCssComments(css);
  var i = 0;
  while (i < s.length) {
    while (i < s.length && /\s/.test(s[i])) i++;
    if (i >= s.length) break;
    if (s[i] === '@') {
      var brace = s.indexOf('{', i);
      var semi = s.indexOf(';', i);
      if (brace === -1 || (semi !== -1 && semi < brace)) {
        i = semi === -1 ? s.length : semi + 1;
        continue;
      }
      var header = s.slice(i, brace).trim();
      var depth = 1;
      var j = brace + 1;
      while (j < s.length && depth) {
        if (s[j] === '{') depth++;
        else if (s[j] === '}') depth--;
        j++;
      }
      var body = s.slice(brace + 1, j - 1);
      if (/^@media\b/.test(header)) walkCssRules(body, fn);
      i = j;
      continue;
    }
    var open = s.indexOf('{', i);
    if (open === -1) break;
    var selector = s.slice(i, open).trim();
    var depth2 = 1;
    var k = open + 1;
    while (k < s.length && depth2) {
      if (s[k] === '{') depth2++;
      else if (s[k] === '}') depth2--;
      k++;
    }
    fn(selector, s.slice(open + 1, k - 1));
    i = k;
  }
}

test('floor pinch ratio feeds the same 35%–200% clamp as the wheel', function () {
  const sandbox = { module: { exports: {} } };
  vm.runInNewContext(
    [
      'const ZOOM_MIN = 0.35;',
      'const ZOOM_MAX = 2;',
      extractFunction(html, 'clampZoom'),
      extractFunction(html, 'floorPinchNextZoom'),
      'module.exports = { clampZoom, floorPinchNextZoom };'
    ].join('\n'),
    sandbox
  );
  const { clampZoom, floorPinchNextZoom } = sandbox.module.exports;
  assert.equal(floorPinchNextZoom(1, 100, 150), 1.5);
  assert.equal(floorPinchNextZoom(1, 120, 60), 0.5);
  assert.equal(floorPinchNextZoom(1, 0, 40), 1);
  assert.equal(clampZoom(floorPinchNextZoom(1, 100, 400)), 2);
  assert.equal(clampZoom(floorPinchNextZoom(1, 100, 10)), 0.35);
  assert.equal(clampZoom(floorPinchNextZoom(0.8, 80, 100)), 1);
});

test('floor touch-action is on the shared canvas, not a skin fork', function () {
  const css = html.slice(html.indexOf('<style>'), html.lastIndexOf('</style>'));
  let floorNone = 0;
  walkCssRules(css, function (selector, body) {
    if (!/touch-action\s*:\s*none/.test(body)) return;
    if (selector === '#classroomViewport') {
      assert.equal(selector.indexOf('data-skin'), -1);
      floorNone += 1;
      return;
    }
    assert.equal(selector.indexOf('classroomViewport'), -1);
    assert.equal(selector.indexOf('classroom-floor'), -1);
  });
  assert.equal(floorNone, 1);
  assert.match(html, /var FLOOR_PAN_THRESHOLD = 8;/);
  assert.match(html, /floorPinchNextZoom\(floorPinch\.startZoom, floorPinch\.startDist, span\.dist\)/);
  assert.match(html, /zoomFloorToward\(\s*span\.midX/);
  assert.match(html, /if \(e\.pointerType && e\.pointerType !== 'mouse'\) return;/);
  assert.match(html, /if \(e\.button != null && e\.button !== 0\) return;/);
  assert.match(html, /if \(onField \|\| boardEditsAllowed\(\) \|\| state\.brushMode\) return;/);
  assert.doesNotMatch(
    extractFunction(html, 'initFloorWheelAndPan'),
    /data-skin/
  );
});
