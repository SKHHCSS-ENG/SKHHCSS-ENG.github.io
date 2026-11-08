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
  var plusAt = hub.indexOf('href="https://skhhcss-eng.github.io/classroom/hcs-live-class-plus/"');
  var liveAt = hub.indexOf('href="hcs-live-class/"');
  assert.ok(plusAt > 0 && liveAt > plusAt);
  assert.match(hub, /<h2>HCS Live Class \+<\/h2>/);
  assert.match(hub, /Classroom assistant \+ Live Class tools\./);
  assert.match(hub, /<h2>HCS Live Class<\/h2>/);
});

test('Muse ball is an unmarked 44px api-mesh button; the strip is mesh mist', function () {
  assert.match(css, /--ball-size:\s*44px/);
  assert.match(css, /--strip-max:\s*220px/);
  assert.match(css, /\.command-strip\[hidden\][\s\S]*display:\s*none/);
  assert.doesNotMatch(css, /\.plus-reply\s*\{[^}]*max-height:\s*calc\(1\.35em \* 5\)/);
  assert.match(css, /\.plus-reply\s*\{[^}]*overflow-y:\s*auto/);
  assert.match(js, /REPLY_MIN = 120/);
  assert.match(js, /if \(limit < REPLY_MIN\) limit = REPLY_MIN/);
  assert.doesNotMatch(js, /liftClear|hOverlap|THIN_X/);
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
  assert.match(css, /--mesh-mist:\s*#ebeff8/);
  assert.match(css, /--mesh-cream:\s*#f4f0e8/);
  assert.match(css, /--ink:\s*#123a4d/);
  assert.match(css, /\.plus-float \.command-strip,\s*\.plus-float \.plus-reply\s*\{[^}]*var\(--mesh-mist\)/);
  assert.match(css, /\.plus-float \.command-strip,\s*\.plus-float \.plus-reply\s*\{[^}]*rgba\(20,\s*88,\s*214,\s*0\.35\)/);
  assert.match(css, /\.chart-import-panel\s*\{[^}]*var\(--mesh-cream,\s*#f4f0e8\)/);
  assert.doesNotMatch(css, /\.command-strip\s*\{[^}]*api-mesh-wash/);
  assert.doesNotMatch(css, /\.plus-reply\s*\{[^}]*api-mesh/);
  assert.doesNotMatch(html, /ask\.css/);
  assert.match(css, /scale\(0\.92\)/);
  assert.match(css, /\.plus-float\.is-dragging \.home-ball[\s\S]*transform:\s*none/);
  assert.match(js, /Ask a question\\u2026/);
  assert.match(js, /\+1 name, pick, pairs\\u2026/);
  assert.doesNotMatch(html, /plus-badge/);
  assert.doesNotMatch(html, />\s*Live Class \+\s*</);
  assert.match(html, /Live Class \+/);
  assert.match(html, /assistant\.css\?v=20261106l/);
  assert.match(html, /assistant\.js\?v=20261106l/);
  assert.doesNotMatch(html, /— go\?/);
  assert.doesNotMatch(css, /\.home-ball[^}]*content:\s*["'][^"']+/);
});

test('class commands run on the first send and the command box keeps focus', function () {
  assert.doesNotMatch(js, /showConfirm|confirmBtn|plus-confirm|— go\?/);
  assert.doesNotMatch(css, /plus-confirm/);
  assert.equal(plus.ACTIONS.random_pick, 'Pick a student');
  assert.equal(plus.ACTIONS.tidy_snap, 'Tidy desks');
  assert.doesNotMatch(plus.ACTIONS.hide_names, /go\?/);
  var bootBody = js.slice(js.indexOf('function boot('));
  assert.match(bootBody, /function runAction\(action, slots, replyText\)/);
  assert.match(bootBody, /board\.run\(action, jobSlots\)/);
  assert.doesNotMatch(bootBody, /preview\.label/);
  assert.match(bootBody, /runAction\(payload\.action, payload\.slots, payload\.reply\)/);
  assert.match(bootBody, /function focusCommand\(\)/);
  assert.match(bootBody, /if \(!openState \|\| command\.hidden \|\| input\.disabled\) return/);
  assert.match(bootBody, /input\.focus\(\{ preventScroll: true \}\)/);
  assert.match(bootBody, /if \(openState\) focusCommand\(\)/);
  assert.match(bootBody, /send\(input\.value\);\s*focusCommand\(\)/);
  assert.doesNotMatch(bootBody, /input\.disabled\s*=/);
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
  assert.match(bootBody, /api\.resolveRect\(boxFromAnchor\(\), obstacles\(\), bounds\(\), api\.GAP\)/);
  assert.match(bootBody, /saveAnchor\(\)/);
  assert.doesNotMatch(bootBody, /addEventListener\('scroll'/);
  assert.doesNotMatch(bootBody, /MutationObserver/);
  assert.match(bootBody, /root\.addEventListener\('resize', schedulePlace\)/);
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

test('opening the strip keeps the ball and flips the panel toward the open side', function () {
  assert.equal(plus.BALL, 44);
  var bootBody = js.slice(js.indexOf('function boot('));
  assert.match(bootBody, /api\.ballRect\(anchor,/);
  assert.match(bootBody, /api\.layoutBeside\(ball,/);
  assert.match(bootBody, /panel-left/);
  assert.match(bootBody, /panel-right/);
  assert.doesNotMatch(bootBody, /offsetWidth \|\| 56/);
  assert.doesNotMatch(bootBody, /offsetWidth \|\| 44/);
  assert.doesNotMatch(bootBody, /anchor\.right - width/);
  assert.match(css, /\.plus-float\s*\{[^}]*width:\s*var\(--ball-size\)[^}]*height:\s*var\(--ball-size\)/);
  assert.match(css, /\.plus-float\.panel-left \.plus-panel\s*\{[^}]*right:\s*calc\(var\(--ball-size\) \+ 10px\)/);
  assert.match(css, /\.plus-float\.panel-right \.plus-panel\s*\{[^}]*left:\s*calc\(var\(--ball-size\) \+ 10px\)/);
  assert.match(css, /\.plus-float\.reply-above \.plus-reply\s*\{[^}]*order:\s*-1/);
  assert.match(bootBody, /reply-above/);
  assert.match(css, /\.plus-panel\[hidden\][\s\S]*display:\s*none/);

  var deskBounds = { left: 8, top: 48, right: 1272, bottom: 792 };
  var deskBall = plus.ballRect(
    { right: 18, bottom: 36 },
    { width: 1280, height: 800 },
    deskBounds,
    plus.BALL
  );
  assert.equal(deskBall.right - deskBall.left, 44);
  assert.equal(deskBall.bottom - deskBall.top, 44);
  assert.equal(deskBall.right, 1280 - 18);
  assert.equal(deskBall.bottom, 800 - 36);
  var deskOpen = plus.layoutBeside(deskBall, { width: 260, height: 48 }, deskBounds, plus.GAP);
  var deskClosed = plus.ballRect(
    { right: 18, bottom: 36 },
    { width: 1280, height: 800 },
    deskBounds,
    plus.BALL
  );
  assert.deepEqual(deskClosed, deskBall);
  assert.equal(deskOpen.side, 'left');
  assert.equal(deskOpen.width, 260);
  assert.ok(deskOpen.right <= deskBall.left - plus.GAP);
  assert.ok(deskOpen.left >= deskBounds.left);
  assert.ok(deskOpen.top >= deskBounds.top);
  assert.ok(deskOpen.bottom <= deskBounds.bottom);

  var phoneBounds = { left: 8, top: 48, right: 382, bottom: 836 };
  var phoneBall = plus.ballRect(
    { right: 12, bottom: 28 },
    { width: 390, height: 844 },
    phoneBounds,
    plus.BALL
  );
  var phoneOpen = plus.layoutBeside(phoneBall, { width: 260, height: 48 }, phoneBounds, plus.GAP);
  assert.equal(phoneOpen.side, 'left');
  assert.equal(phoneOpen.width, 260);
  assert.ok(phoneOpen.right <= phoneBall.left - plus.GAP);
  var phoneAgain = plus.ballRect(
    { right: 12, bottom: 28 },
    { width: 390, height: 844 },
    phoneBounds,
    plus.BALL
  );
  assert.deepEqual(phoneAgain, phoneBall);

  var leftBall = { left: 8, top: 760, right: 64, bottom: 816 };
  var leftOpen = plus.layoutBeside(leftBall, { width: 260, height: 48 }, phoneBounds, plus.GAP);
  assert.equal(leftOpen.side, 'right');
  assert.ok(leftOpen.left >= leftBall.right + plus.GAP);
  assert.ok(leftOpen.right <= phoneBounds.right);

  var tall = plus.layoutBeside(phoneBall, { width: 260, height: 400 }, phoneBounds, plus.GAP);
  assert.equal(tall.side, 'left');
  assert.equal(tall.replyAbove, false);
  assert.ok(tall.top >= phoneBounds.top);
  assert.ok(tall.bottom <= phoneBounds.bottom);
  assert.ok(tall.top < phoneBall.top);

  var stacked = plus.layoutBeside(phoneBall, { width: 260, strip: 46, reply: 400 }, phoneBounds, plus.GAP);
  assert.equal(stacked.replyAbove, true);
  assert.equal(stacked.side, 'left');
  var stripTop = stacked.top + 400 + plus.GAP;
  var ballMid = phoneBall.top + (phoneBall.bottom - phoneBall.top) / 2;
  assert.ok(Math.abs((stripTop + 23) - ballMid) < 1, JSON.stringify(stacked));
  assert.ok(stacked.top >= phoneBounds.top);
  assert.ok(stacked.bottom <= phoneBounds.bottom);

  var highBall = { left: 322, top: 48, right: 378, bottom: 104 };
  var below = plus.layoutBeside(highBall, { width: 260, strip: 46, reply: 400 }, phoneBounds, plus.GAP);
  assert.equal(below.replyAbove, false);
  assert.ok(Math.abs((below.top + 23) - (highBall.top + 28)) < 1);

  var mid = { left: 167, top: 400, right: 223, bottom: 456 };
  var midOpen = plus.layoutBeside(mid, { width: 260, height: 48 }, phoneBounds, plus.GAP);
  assert.ok(midOpen.width < 260);
  assert.ok(midOpen.width > 0);
  assert.ok(midOpen.left >= phoneBounds.left);
  assert.ok(midOpen.right <= phoneBounds.right);

  var clamped = plus.ballRect(
    { right: 300, bottom: 300 },
    { width: 200, height: 180 },
    { left: 8, top: 8, right: 192, bottom: 172 },
    plus.BALL
  );
  assert.ok(clamped.left >= 8);
  assert.ok(clamped.top >= 8);
  assert.ok(clamped.right <= 192);
  assert.ok(clamped.bottom <= 172);
  assert.equal(clamped.right - clamped.left, 44);
  assert.equal(clamped.bottom - clamped.top, 44);
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

test('import chart stays on the ball and off the original page', function () {
  assert.doesNotMatch(html, /id="btnImportChart"/);
  assert.doesNotMatch(html, />\s*Import chart\s*</);
  assert.doesNotMatch(html, /mode-row|plusModeAsk|mode-chip/);
  assert.match(js, /'btnImportChart', 'IMPORT'/);
  assert.match(js, /chartBtn\.setAttribute\('aria-label', 'Import chart'\)/);
  assert.match(js, /command\.appendChild\(modeRow\)/);
  assert.match(js, /title\.textContent = 'Import chart'/);
  assert.match(css, /\.plus-float \.mode-chip/);
  assert.match(html, /applyChart: applyChartMoves/);
  assert.match(html, /chartPlan: chartPlanSnapshot/);
  assert.match(js, /tesseract\.js@5\.1\.1/);
  assert.match(css, /\.chart-import-sheet/);
  assert.doesNotMatch(original, /btnImportChart/);
  assert.doesNotMatch(original, /Import chart/);
  assert.doesNotMatch(original, /applyChartMoves/);
  assert.doesNotMatch(original, /mode-row/);
});

test('Ask, Command, and Import share one cream row under the text box', function () {
  assert.match(js, /'plusModeAsk', 'ASK'/);
  assert.match(js, /'plusModeCommand', 'COMMAND'/);
  assert.match(js, /'btnImportChart', 'IMPORT'/);
  assert.match(js, /sendBtn\.textContent = 'SEND'/);
  assert.match(js, /importing \? 'CHOOSE' : 'SEND'/);
  assert.match(css, /\.plus-float \.command-strip\s*\{[^}]*gap:\s*0\.6rem/);
  assert.match(css, /\.plus-float \.command-line\s*\{[^}]*gap:\s*0\.55rem/);
  assert.match(js, /var mode = 'ask'/);
  assert.match(js, /if \(!wasOpen\) setMode\('ask'\)/);
  assert.match(css, /\.plus-float \.mode-row\s*\{[^}]*display:\s*flex/);
  assert.match(css, /\.plus-float \.mode-chip\s*\{[^}]*flex:\s*1 1 0/);
  assert.match(css, /\.plus-float \.mode-chip\s*\{[^}]*height:\s*26px/);
  assert.match(js, /var cap = 220/);
  assert.match(js, /var BALL = 44/);
  assert.doesNotMatch(css, /\.mode-chip\s*\{[^}]*min-height:\s*44px/);
  assert.match(css, /\.plus-float \.mode-chip\.is-selected\s*\{[^}]*background-color:\s*#1458d6/);
  assert.match(css, /\.plus-float \.mode-chip\.is-selected\s*\{[^}]*background-image:\s*var\(--api-mesh-image\)/);
  assert.match(css, /\.plus-float \.mode-chip\.is-selected\s*\{[^}]*color:\s*var\(--api-mesh-ink\)/);
  assert.match(css, /\.plus-float \.mode-chip\.is-selected\s*\{[^}]*animation:\s*api-mesh-wash 10s ease-in-out infinite/);
  assert.match(css, /\.plus-float \.mode-chip\s*\{[^}]*color:\s*#1458d6/);
  assert.match(css, /\.plus-float \.mode-chip:hover\s*\{[^}]*rgba\(58,\s*58,\s*208/);
  assert.doesNotMatch(css, /\.plus-float \.mode-chip\.is-selected\s*\{[^}]*#3a3428/);
  assert.match(css, /prefers-reduced-motion:\s*reduce[\s\S]*\.plus-float \.mode-chip\.is-selected\s*\{[^}]*animation:\s*none !important/);
  assert.match(css, /\.plus-float \.command-strip,\s*\.plus-float \.plus-reply\s*\{[^}]*var\(--mesh-mist\)/);
  var bootBody = js.slice(js.indexOf('function boot('));
  var submitAt = bootBody.indexOf("command.addEventListener('submit'");
  var submit = bootBody.slice(submitAt, submitAt + 450);
  assert.match(submit, /mode === 'import'/);
  assert.match(submit, /chartBtn\.click\(\)/);
  assert.match(submit, /mode === 'command'/);
  assert.match(submit, /dispatchCommand\(input\.value\)/);
  assert.match(submit, /send\(input\.value\);\s*focusCommand\(\)/);
  var dispatch = bootBody.slice(bootBody.indexOf('function dispatchCommand'), bootBody.indexOf('function setOpen'));
  assert.doesNotMatch(dispatch, /fetch\(/);
  assert.match(js, /JSON\.stringify\(\{ text: text \}\)/);
  assert.doesNotMatch(js, /mode:\s*['"]command['"]/);
  assert.equal(plus.DEFAULT_WORKER_URL, 'https://live-class-plus.skhhcss-eng.workers.dev');
});

test('command lines dispatch the page controls', function () {
  assert.equal(plus.parseCommand('+1 Ken').action, 'score_plus');
  assert.equal(plus.parseCommand('+1 Ken').slots.student, 'ken');
  assert.equal(plus.parseCommand('+1 Ken').slots.amount, 1);
  assert.equal(plus.parseCommand('+1').slots.student, '');
  assert.equal(plus.parseCommand('+1 #7').slots.student, '#7');
  assert.equal(plus.parseCommand('all +1').action, 'all_plus');
  assert.equal(plus.parseCommand('pair work').action, 'layout_pairs');
  assert.equal(plus.parseCommand('pairs').action, 'layout_pairs');
  assert.equal(plus.parseCommand('pick').action, 'random_pick');
  assert.equal(plus.parseCommand('pick group').action, 'random_group');
  assert.equal(plus.parseCommand('groups').action, 'layout_groups');
  assert.equal(plus.parseCommand('group work').action, 'mode_group');
  assert.equal(plus.parseCommand('exam').action, 'layout_rows');
  assert.equal(plus.parseCommand('pods').action, 'layout_pods');
  assert.equal(plus.parseCommand('tidy').action, 'tidy_snap');
  assert.equal(plus.parseCommand('podium').action, 'open_podium');
  assert.equal(plus.parseCommand('fit').action, 'zoom_reset');
  assert.equal(plus.parseCommand('hide names').action, 'hide_names');
  assert.equal(plus.parseCommand('help').action, 'help');
  assert.equal(plus.parseCommand('+30').action, 'timer_add30');
  assert.equal(plus.parseCommand('timer 3m').slots.seconds, 180);
  assert.equal(plus.parseCommand('timer 90s').slots.seconds, 90);
  assert.equal(plus.parseCommand('timer 2:30').slots.seconds, 150);
  assert.deepEqual(plus.parseCommand('grid 4x6').slots, { rows: 4, cols: 6 });
  assert.equal(plus.parseCommand('group +1 Lions').action, 'group_plus');
  assert.equal(plus.parseCommand('group +1 Lions').slots.group, 'lions');
  assert.equal(plus.parseCommand('-2 Amy').action, 'score_minus');
  assert.equal(plus.parseCommand('individual').action, 'mode_individual');
  assert.equal(plus.parseCommand('spark').action, 'skin_spark');
  assert.equal(plus.parseCommand('undo').action, 'undo');
  assert.equal(plus.parseCommand('what does metaphor mean'), null);
  assert.match(plus.commandHelp(), /\+1 name/);
  plus.commandCatalog().forEach(function (action) {
    assert.notEqual(action, 'help');
    assert.match(html, new RegExp(action.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
});

test('class numbers from a chart pad the same way as the roster', function () {
  assert.equal(plus.normaliseClassNo('7'), '07');
  assert.equal(plus.normaliseClassNo('#07'), '07');
  assert.equal(plus.normaliseClassNo('24'), '24');
  assert.equal(plus.normaliseClassNo(''), '');
  assert.equal(plus.chartToken('5'), '05');
  assert.equal(plus.chartToken('15'), '15');
  assert.equal(plus.chartToken('2026'), '');
  assert.equal(plus.chartToken('24 29'), '');
});

test('blue number ink forms desk rows and ignores a one-pixel speck', function () {
  var width = 30;
  var height = 40;
  var data = new Uint8ClampedArray(width * height * 4);
  for (var i = 0; i < data.length; i += 4) {
    data[i] = 240;
    data[i + 1] = 240;
    data[i + 2] = 240;
    data[i + 3] = 255;
  }
  function paint(x, y) {
    var i = (y * width + x) * 4;
    data[i] = 40;
    data[i + 1] = 90;
    data[i + 2] = 180;
  }
  for (var y = 12; y < 22; y++) {
    for (var x = 2; x < 28; x++) paint(x, y);
  }
  paint(4, 2);
  var blue = plus.blueMaskFromRGBA(data, width, height);
  assert.ok(blue.count > 100);
  var bands = plus.inkRowBands(blue.mask, width, height);
  assert.equal(bands.length, 1);
  assert.ok(bands[0].y0 >= 10 && bands[0].y1 <= 24);
});

test('chart marks keep empty seats so a short back row stays centred', function () {
  // x positions from the 3A screen chart after the blue-number read.
  var bands = [
    { items: [{ text: '4', x: 4147, confidence: 0 }] },
    { items: [{ text: '24', x: 2645, confidence: 96 }, { text: '29', x: 2976, confidence: 96 }] },
    { items: [
      { text: '35', x: 1144, confidence: 96 }, { text: '27', x: 1476, confidence: 95 },
      { text: '5', x: 1908, confidence: 96 }, { text: '9', x: 2237, confidence: 96 },
      { text: '36', x: 2644, confidence: 96 }, { text: '18', x: 2979, confidence: 95 },
      { text: '26', x: 3396, confidence: 96 }
    ] },
    { items: [
      { text: '11', x: 1147, confidence: 75 }, { text: '21', x: 1476, confidence: 96 },
      { text: '14', x: 1897, confidence: 96 }, { text: '15', x: 2229, confidence: 0 },
      { text: '8', x: 2657, confidence: 19 }, { text: '16', x: 2979, confidence: 0 },
      { text: '17', x: 3398, confidence: 31 }
    ] },
    { items: [
      { text: '20', x: 1145, confidence: 96 }, { text: '30', x: 1472, confidence: 96 },
      { text: '12', x: 1897, confidence: 96 }, { text: '2', x: 2239, confidence: 97 },
      { text: '4', x: 2657, confidence: 96 }, { text: '23', x: 2976, confidence: 95 },
      { text: '1', x: 3411, confidence: 96 }
    ] },
    { items: [
      { text: '13', x: 1147, confidence: 95 }, { text: '6', x: 1488, confidence: 96 },
      { text: '19', x: 1897, confidence: 96 }, { text: '34', x: 2226, confidence: 38 },
      { text: '7', x: 2657, confidence: 96 }, { text: '28', x: 2976, confidence: 96 },
      { text: '25', x: 3395, confidence: 93 }
    ] }
  ];
  var read = plus.seatingGridFromMarks(bands);
  assert.deepEqual(read.grid, [
    ['', '', '', '', '24', '29', ''],
    ['35', '27', '05', '09', '36', '18', '26'],
    ['11', '21', '14', '15', '08', '16', '17'],
    ['20', '30', '12', '02', '04', '23', '01'],
    ['13', '06', '19', '34', '07', '28', '25']
  ]);
});

test('rematch moves desks by class number and leaves names, groups, and scores', function () {
  var xs = [32, 188, 372, 528, 712, 868, 1052];
  var ys = [28, 153, 278, 403, 528];
  var slots = plus.layoutSlots(5, 7, 'pairs', false);
  xs.forEach(function (x, c) {
    assert.equal(slots[0][c].x, x);
    assert.equal(slots[0][c].y, 28);
  });
  ys.forEach(function (y, r) { assert.equal(slots[r][0].y, y); });

  var grid = [
    ['', '', '', '', '24', '29', ''],
    ['35', '27', '05', '09', '36', '18', '26'],
    ['11', '21', '14', '15', '08', '16', '17'],
    ['20', '30', '12', '02', '04', '23', '01'],
    ['13', '06', '19', '34', '07', '28', '25']
  ];
  var numbers = [];
  grid.forEach(function (row) {
    row.forEach(function (no) { if (no) numbers.push(no); });
  });
  var students = numbers.map(function (no, i) {
    return {
      id: 's' + no,
      classNo: no,
      name: 'Pupil ' + no,
      groupId: 'grp_' + ((i % 3) + 1),
      score: i % 4,
      x: xs[i % xs.length],
      y: ys[Math.floor(i / xs.length) % ys.length],
      sparkPts: [1]
    };
  });
  // One pupil on the plan is not in the picture. One chart number is not on the plan.
  students.push({ id: 's40', classNo: '40', name: 'Pat', groupId: 'grp_2', score: 3, x: 32, y: 28, sparkPts: [] });
  grid[0][0] = '99';

  var result = plus.rematchByClassNo(students, grid, {
    frontAtTop: false,
    chartBoardAtBottom: true,
    layoutStyle: 'pairs'
  });
  function at(no) {
    return result.moves.find(function (m) { return m.classNo === no; });
  }
  assert.equal(at('24').x, 712);
  assert.equal(at('24').y, 28);
  assert.equal(at('29').x, 868);
  assert.equal(at('29').y, 28);
  assert.equal(at('35').x, 32);
  assert.equal(at('35').y, 153);
  assert.equal(at('01').x, 1052);
  assert.equal(at('01').y, 403);
  assert.equal(at('13').x, 32);
  assert.equal(at('13').y, 528);
  assert.equal(at('99'), undefined);
  assert.ok(result.notes.some(function (n) { return n.indexOf('#99') !== -1; }));
  assert.ok(result.notes.some(function (n) { return n.indexOf('Pat') !== -1; }));

  var next = plus.applySeatMoves(students, result.moves);
  var ken = next.find(function (st) { return st.classNo === '24'; });
  var beforeKen = students.find(function (st) { return st.classNo === '24'; });
  assert.equal(ken.x, 712);
  assert.equal(ken.y, 28);
  assert.equal(ken.name, beforeKen.name);
  assert.equal(ken.groupId, beforeKen.groupId);
  assert.equal(ken.score, beforeKen.score);
  assert.deepEqual(ken.sparkPts, beforeKen.sparkPts);
  assert.equal(beforeKen.x, xs[0]);
  var pat = next.find(function (st) { return st.id === 's40'; });
  assert.equal(pat.x, 32);
  assert.equal(pat.y, 28);
  assert.equal(pat.score, 3);

  var flipped = plus.rematchByClassNo(students, grid, {
    frontAtTop: false,
    chartBoardAtBottom: false,
    layoutStyle: 'pairs'
  });
  var flipped13 = flipped.moves.find(function (m) { return m.classNo === '13'; });
  assert.equal(flipped13.x, 32);
  assert.equal(flipped13.y, 28);
});
