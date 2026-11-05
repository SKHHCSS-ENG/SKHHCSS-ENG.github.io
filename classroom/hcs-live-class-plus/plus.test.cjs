const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('path');
const plus = require('./assistant.js');
const SD = require('./studio-drive.js');

const here = __dirname;
const html = fs.readFileSync(path.join(here, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(here, 'assistant.css'), 'utf8');
const js = fs.readFileSync(path.join(here, 'assistant.js'), 'utf8');
const original = fs.readFileSync(path.join(here, '../hcs-live-class/index.html'), 'utf8');
const originalDrive = fs.readFileSync(path.join(here, '../hcs-live-class/studio-drive.js'), 'utf8');
const hub = fs.readFileSync(path.join(here, '../index.html'), 'utf8');

function separated(a, b, gap) {
  return a.right <= b.left - gap || a.left >= b.right + gap ||
    a.bottom <= b.top - gap || a.top >= b.bottom + gap;
}

test('storage keys and worker host stay off Live Class and Eng workers', function () {
  assert.match(html, /hcsLiveClassPlus_classroom_v1/);
  assert.match(html, /hcsLiveClassPlus_skin_v1/);
  assert.equal(SD.FOLDER_STORAGE_KEY, 'hcsLiveClassPlus_drive_folder_v1');
  assert.equal(plus.POS_KEY, 'hcsLiveClassPlus_ball_v1');
  assert.equal(plus.DEFAULT_WORKER_URL, 'https://live-class-plus.skhhcss-eng.workers.dev');
  assert.match(html, /window\.HCS_LIVE_CLASS_PLUS_WORKER = "https:\/\/live-class-plus\.skhhcss-eng\.workers\.dev"/);
  assert.equal(plus.workerUrlFor(plus.DEFAULT_WORKER_URL), plus.DEFAULT_WORKER_URL);
  assert.equal(plus.workerUrlFor('https://deepseek-explain.skhhcss-eng.workers.dev'), plus.DEFAULT_WORKER_URL);
  assert.equal(plus.workerUrlFor('https://say-it-louder.skhhcss-eng.workers.dev'), plus.DEFAULT_WORKER_URL);
  assert.equal(plus.workerUrlFor('https://ces-softspeak.example.workers.dev'), plus.DEFAULT_WORKER_URL);
  assert.doesNotMatch(html + js + css, /https:\/\/deepseek-explain\./);
  assert.doesNotMatch(html + js + css, /https:\/\/say-it-louder\./);
  assert.doesNotMatch(html + js + css, /https:\/\/ces-softspeak\./);
  assert.match(original, /STORAGE_KEY = 'skhhcss_eng_classroom_v4'/);
  assert.match(original, /skhhcss_eng_hcs_live_class_skin_v1/);
  assert.match(originalDrive, /skhhcss_eng_studio_drive_folder_v1/);
  assert.doesNotMatch(original, /hcsLiveClassPlus/);
  assert.doesNotMatch(originalDrive, /fenceSaveTitle/);
});

test('save fence does not reuse a Live Class plan filename', function () {
  assert.equal(SD.fenceSaveTitle('3A English'), 'Live Class + 3A English');
  assert.equal(SD.fenceSaveTitle('Live Class + 3A English'), 'Live Class + 3A English');
  assert.equal(SD.fenceSaveTitle('  live class + oral  '), 'live class + oral');
  var files = [
    { id: 'live', name: '3A English.json' },
    { id: 'plus', name: 'Live Class + 3A English.json' }
  ];
  assert.equal(SD.findPlanByTitle(files, SD.fenceSaveTitle('3A English')).id, 'plus');
  assert.equal(SD.fileNameForTitle(SD.fenceSaveTitle('3A English')), 'Live Class + 3A English.json');
  assert.equal(SD.PLAN_KIND, 'skhhcss-studio-plan');
  assert.equal(SD.FOLDER_NAME, 'HCS Live Class');
  assert.match(SD.folderSearchQuery(), /HCS Live Class \+/);
});

test('hub card sits above HCS Live Class', function () {
  var plusAt = hub.indexOf('href="hcs-live-class-plus/"');
  var liveAt = hub.indexOf('href="hcs-live-class/"');
  assert.ok(plusAt > 0 && liveAt > plusAt);
  assert.match(hub, /<h2>HCS Live Class \+<\/h2>/);
  assert.match(hub, /Classroom assistant \+ Live Class tools\./);
  assert.match(hub, /<h2>HCS Live Class<\/h2>/);
});

test('Muse ball is an unmarked 56px api-mesh button; the strip stays cream', function () {
  assert.match(css, /--ball-size:\s*56px/);
  assert.match(css, /--strip-max:\s*260px/);
  assert.match(css, /\.command-strip\[hidden\][\s\S]*display:\s*none/);
  assert.doesNotMatch(css, /\.plus-reply\s*\{[^}]*max-height:\s*calc\(1\.35em \* 5\)/);
  assert.match(css, /\.plus-reply\s*\{[^}]*overflow-y:\s*auto/);
  assert.match(js, /REPLY_MIN = 120/);
  assert.match(js, /hOverlap < THIN_X/);
  assert.doesNotMatch(js, /room < 36/);
  assert.equal(
    plus.plainActionNames('Ready to tidy the desks — please confirm to run tidy_snap.'),
    'Ready to tidy the desks.'
  );
  assert.match(css, /--api-mesh-ink:\s*#f4f0e8/);
  assert.match(css, /--api-mesh-image:\s*linear-gradient\(\s*122deg,\s*#1458d6 0%,\s*#3a3ad0 24%,\s*#c42670 50%,\s*#be3a16 76%,\s*#7c6906 100%\s*\)/);
  assert.match(css, /@keyframes api-mesh-wash\s*\{[\s\S]*?0% 40%[\s\S]*?100% 60%[\s\S]*?0% 40%/);
  assert.match(css, /\.plus-float \.home-ball\s*\{[^}]*background-image:\s*var\(--api-mesh-image\)[^}]*animation:\s*api-mesh-wash 10s ease-in-out infinite/);
  assert.match(css, /prefers-reduced-motion:\s*reduce[\s\S]*\.plus-float \.home-ball\s*\{[^}]*animation:\s*none !important[^}]*background-size:\s*100% 100%[^}]*background-position:\s*0% 50%/);
  assert.doesNotMatch(css, /circle at 32% 28%/);
  assert.match(css, /\.plus-float \.command-strip,\s*\.plus-float \.plus-reply,\s*\.plus-float \.plus-confirm\s*\{[^}]*var\(--mesh-cream\)/);
  assert.doesNotMatch(css, /\.command-strip\s*\{[^}]*api-mesh-wash/);
  assert.doesNotMatch(css, /\.plus-reply\s*\{[^}]*api-mesh/);
  assert.doesNotMatch(html, /ask\.css/);
  assert.match(css, /scale\(0\.92\)/);
  assert.match(css, /\.plus-float\.is-dragging \.home-ball[\s\S]*transform:\s*none/);
  assert.match(js, /Ask or say a command\\u2026/);
  assert.match(html, /class="plus-badge"/);
  assert.match(html, /Live Class \+/);
  assert.match(html, /assistant\.css\?v=20261106a/);
  assert.doesNotMatch(css, /\.home-ball[^}]*content:\s*["'][^"']+/);
});

test('ball drag threshold is in boot scope and survives a finger leaving the ball', function () {
  var factoryBody = js.slice(js.indexOf('function factory('), js.indexOf('function boot('));
  var bootBody = js.slice(js.indexOf('function boot('));
  assert.doesNotMatch(factoryBody, /TAP_PX/);
  assert.match(bootBody, /var TAP_PX = 8/);
  assert.match(bootBody, /dx \* dx \+ dy \* dy\) < TAP_PX \* TAP_PX/);
  assert.doesNotMatch(js, /Math\.abs\(dx\) \+ Math\.abs\(dy\) < TAP_PX/);
  var thresh = bootBody.indexOf('TAP_PX * TAP_PX');
  var capture = bootBody.indexOf('setPointerCapture', thresh);
  assert.ok(capture > thresh);
  assert.match(bootBody, /document\.addEventListener\('pointermove', onBallPointerMove, \{ capture: true, passive: false \}\)/);
  assert.match(bootBody, /touchmove/);
  assert.match(bootBody, /if \(!\(drag && drag\.moved\)\) liftClear\(\)/);
  assert.equal(plus.POS_KEY, 'hcsLiveClassPlus_ball_v1');
});

test('open strip moves off a name chip the idle ball does not cover', function () {
  var bounds = { left: 8, top: 64, right: 382, bottom: 660 };
  var ng = { left: 250, top: 548, right: 292, bottom: 576 };
  var idle = { left: 316, top: 576, right: 372, bottom: 632 };
  assert.ok(separated(idle, ng, 0));
  var idleKept = plus.resolveRect(idle, [ng], bounds, 10);
  assert.equal(idleKept.left, idle.left);
  assert.equal(idleKept.top, idle.top);
  var open = { left: 112, top: 500, right: 372, bottom: 632 };
  assert.equal(separated(open, ng, 0), false);
  var lifted = plus.resolveRect(open, [ng], bounds, 10);
  assert.ok(separated(lifted, ng, 10), JSON.stringify(lifted));
  assert.ok(lifted.bottom <= ng.top - 10 || lifted.right <= ng.left - 10);
});

test('drag clamp keeps an open unit off the floor bar and a name chip', function () {
  var bounds = { left: 8, top: 48, right: 1280, bottom: 800 };
  var floor = { left: 8, top: 740, right: 280, bottom: 792 };
  var name = { left: 980, top: 640, right: 1040, bottom: 668 };
  var proposed = { left: 900, top: 620, right: 1160, bottom: 760 };
  var parked = plus.resolveRect(proposed, [floor, name], bounds, 10);
  assert.ok(separated(parked, floor, 10), JSON.stringify(parked));
  assert.ok(separated(parked, name, 10), JSON.stringify(parked));
});
