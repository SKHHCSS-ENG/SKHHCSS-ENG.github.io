const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const coreSrc = fs.readFileSync(path.join(__dirname, 'studio-core.js'), 'utf8');
const driveConfig = fs.readFileSync(path.join(__dirname, 'drive-config.js'), 'utf8');
const Core = require('./studio-core.js');
const SD = require('./studio-drive.js');

test('seating pitch stays the Live Class numbers', function () {
  assert.equal(Core.STAGE_WIDTH, 1120);
  assert.equal(Core.STAGE_HEIGHT, 640);
  assert.equal(Core.DESK_W, 148);
  assert.equal(Core.DESK_H, 115);
  assert.equal(Core.ROW_GAP_Y, 10);
  assert.equal(Core.POD_INNER_GAP_X, 8);
  assert.equal(Core.POD_AISLE_GAP_X, 36);
  assert.equal(Core.POD_ROW_AISLE_Y, 24);
  assert.equal(Core.EXAM_COL_GAP_X, 16);
  assert.equal(Core.FRONT_LABEL_H, 32);
  assert.equal(Core.FRONT_EDGE, 8);
  assert.equal(Core.FRONT_ROW_GAP, 10);
  assert.equal(Core.GRID_SIZE, 20);
  assert.equal(Core.ZOOM_MIN, 0.35);
  assert.equal(Core.ZOOM_MAX, 2);
  assert.equal(Core.LAYOUT_PITCH_VERSION, 'desk-148x115-groupLr-8within-36aisle');
});

test('layout positions stay on the shared pitch', function () {
  assert.deepEqual(Core.computeLayoutPositions(6, 'rows', false, null, null, 3, 2), [
    { x: 322, y: 28 },
    { x: 486, y: 28 },
    { x: 650, y: 28 },
    { x: 322, y: 153 },
    { x: 486, y: 153 },
    { x: 650, y: 153 }
  ]);
  assert.deepEqual(Core.computeLayoutPositions(4, 'pairs', true, null, null, 4, 1), [
    { x: 238, y: 50 },
    { x: 394, y: 50 },
    { x: 578, y: 50 },
    { x: 734, y: 50 }
  ]);
  assert.deepEqual(Core.computeLayoutPositions(4, 'pods4', false, null, null, 4, 2), [
    { x: 238, y: 28 },
    { x: 394, y: 28 },
    { x: 578, y: 28 },
    { x: 734, y: 28 }
  ]);
  assert.equal(Core.frontRowTopOffset(false), 28);
  assert.equal(Core.frontRowTopOffset(true), 50);
});

test('Plus studio-core.js matches the original seating module', function () {
  const original = fs.readFileSync(path.join(__dirname, '../hcs-live-class/studio-core.js'), 'utf8');
  assert.equal(coreSrc, original);
});

test('the Plus page loads the core and calls it by the same names', function () {
  const drive = html.indexOf('<script src="studio-drive.js"></script>');
  const core = html.indexOf('<script src="studio-core.js"></script>');
  const inline = html.indexOf("const STORAGE_KEY = 'hcsLiveClassPlus_classroom_v1'");
  assert.ok(drive > 0 && core > drive && inline > core);
  assert.match(html, /<script src="studio-core\.js"><\/script>/);
  assert.doesNotMatch(html, /studio-core\.js"[^>]*\b(?:async|defer)\b/);
  assert.match(html, /const Core = window\.HcsLiveCore;/);
  [
    'DESK_W',
    'LAYOUT_PITCH_VERSION',
    'planBackRowDesk',
    'computeLayoutPositions',
    'ensureNoOverlaps',
    'clampZoom',
    'getContentStageBounds',
    'floorPinchNextZoom',
    'findSeatSwapTarget',
    'layoutAxisAnchors'
  ].forEach(function (name) {
    assert.match(html, new RegExp('const ' + name + ' = Core\\.' + name + ';'));
    assert.equal(html.indexOf('function ' + name + '('), -1, name);
  });
  assert.equal(html.indexOf('const DESK_W = 148'), -1);
  assert.match(html, /planBackRowDesk\(cls\.students, !!cls\.frontAtTop\)/);
  const open = html.lastIndexOf('<script>', inline);
  const close = html.indexOf('</script>', inline);
  new vm.Script(html.slice(open + '<script>'.length, close));
});

test('a browser without module.exports receives HcsLiveCore', function () {
  const sandbox = {};
  vm.runInNewContext(coreSrc, sandbox);
  assert.equal(sandbox.HcsLiveCore.DESK_W, 148);
  assert.equal(typeof sandbox.HcsLiveCore.computeLayoutPositions, 'function');
});

test('the core stays free of Drive and skins while Plus keeps Spark', function () {
  assert.doesNotMatch(coreSrc, /\bdocument\b|\blocalStorage\b|window\.[A-Za-z_$]/);
  assert.doesNotMatch(coreSrc, /spark/i);
  assert.doesNotMatch(coreSrc, /data-skin/);
  assert.doesNotMatch(coreSrc, /SKHHCSS_STUDIO_DRIVE|FOLDER_STORAGE_KEY|PLAN_KIND/);
  assert.match(html, /id="btnSkinSpark"[^>]*>Spark</);
  assert.match(html, /src="spark-fire\.js"/);
  assert.match(html, /setAttribute\("data-skin", "spark"\)/);
  assert.match(html, /id="btnSkinDefault"[^>]*>Default</);
  assert.match(html, /id="btnSkinMinimalist"[^>]*>Minimalist</);
  assert.match(html, /hcsLiveClassPlus_skin_v1/);
});

test('Drive OAuth paths and seating storage keys stay put', function () {
  assert.match(html, /src="drive-config\.js"/);
  assert.match(html, /src="studio-drive\.js"/);
  assert.match(html, /accounts\.google\.com\/gsi\/client/);
  assert.match(html, /STORAGE_KEY = 'hcsLiveClassPlus_classroom_v1'/);
  assert.match(driveConfig, /clientId:\s*"322774470382-v8tevo6q55satejpvhqcd24l4ujmdruv\.apps\.googleusercontent\.com"/);
  assert.equal(driveConfig.indexOf('client_secret'), -1);
  assert.equal(SD.DRIVE_SCOPE, 'https://www.googleapis.com/auth/drive');
  assert.equal(SD.FOLDER_NAME, 'HCS Live Class');
  assert.equal(SD.FOLDER_NAME_LEGACY, 'Class Activity Studio');
  assert.equal(SD.FOLDER_STORAGE_KEY, 'hcsLiveClassPlus_drive_folder_v1');
  assert.equal(SD.PLAN_KIND, 'skhhcss-studio-plan');
  assert.equal(
    SD.folderSearchQuery(),
    "(name = 'HCS Live Class' or name = 'Class Activity Studio' or name = 'HCS Live Class +') and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
  );
});
