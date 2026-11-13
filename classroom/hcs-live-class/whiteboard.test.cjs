const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('path');
const wb = require('./whiteboard.js');

const liveHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const plusHtml = fs.readFileSync(path.join(__dirname, '../hcs-live-class-plus/index.html'), 'utf8');
const src = fs.readFileSync(path.join(__dirname, 'whiteboard.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, 'whiteboard.css'), 'utf8');
const assistant = fs.readFileSync(path.join(__dirname, '../hcs-live-class-plus/assistant.js'), 'utf8');

function sliceBetween(html, startMark, endMark) {
  const start = html.indexOf(startMark);
  const end = html.indexOf(endMark, start + startMark.length);
  assert.ok(start >= 0 && end > start, startMark + ' .. ' + endMark);
  return html.slice(start, end);
}

function assertPageChrome(html, label) {
  const cluster = sliceBetween(html, 'id="studioHeaderCluster"', 'id="studioHeaderUtilities"');
  const edit = cluster.indexOf('id="btnOpenClassModal"');
  const select = cluster.indexOf('id="classSelect"');
  assert.ok(edit >= 0 && edit < select, label + ' Class edit sits before the dropdown');
  assert.equal((cluster.match(/>Class</g) || []).length, 1, label + ' one Class word');
  assert.doesNotMatch(cluster, /Class:/);
  assert.doesNotMatch(cluster, /hidden md:inline/);
  assert.match(cluster, /title="Edit class lists and student names"/);
  assert.match(cluster, /aria-label="Edit class lists and student names"/);
  assert.match(cluster, /<svg[^>]*stroke=/);

  const utils = sliceBetween(html, 'id="studioHeaderUtilities"', 'class="studio-header-pin"');
  const order = ['btnToggleTimerPanel', 'btnOpenPickerModal', 'btnToggleSound', 'btnOpenWhiteboard', 'btnToggleStudioBands'];
  let at = -1;
  order.forEach(function (id) {
    const next = utils.indexOf('id="' + id + '"');
    assert.ok(next > at, label + ' header order ' + id);
    at = next;
  });
  assert.match(utils, /hidden sm:inline">Board</);
  assert.match(utils, /aria-label="Whiteboard"/);
  assert.match(utils, /🖊️/);
  assert.doesNotMatch(utils, /<svg/);
  assert.doesNotMatch(utils, /btnOpenPodiumModal|btnExportCsv/);

  const toolbar = sliceBetween(html, 'id="studioToolbarRow"', 'id="studioWorkspace"');
  const lineSplit = toolbar.split('studio-toolbar-line');
  assert.ok(lineSplit.length >= 3, label + ' two tools lines');
  const upper = lineSplit[1];
  const lower = lineSplit[2];
  assert.ok(upper.indexOf('id="btnOpenPlan"') < upper.indexOf('id="btnExportCsv"'), label + ' Export after Load online');
  assert.match(upper, />\s*Export CSV\s*</);
  assert.match(upper, /aria-label="Export CSV"/);
  assert.match(upper, /HISTORY/);
  assert.doesNotMatch(lower, /btnExportCsv/);
  assert.match(lower, /SEATING/);

  const card = sliceBetween(html, 'id="leaderboardCard"', 'id="leaderboardPanel"');
  assert.ok(card.indexOf('Live Leaderboard') < card.indexOf('id="btnOpenPodiumModal"'), label + ' Podium on the right of the heading');
  assert.match(card, /🏆/);
  assert.match(card, /class="podium-word">Podium</);
  assert.match(card, /title="Show the live podium"/);
  assert.doesNotMatch(html, /Real-Time Rank|leaderboardSortHint/);
  assert.equal((html.match(/id="btnOpenPodiumModal"/g) || []).length, 1);
  assert.equal((html.match(/id="btnExportCsv"/g) || []).length, 1);
  assert.equal((html.match(/id="btnOpenWhiteboard"/g) || []).length, 1);

  assert.match(html, /#btnToggleTimerPanel,\s*#btnOpenPickerModal,\s*#btnToggleSound,\s*#btnOpenWhiteboard \{/);
  assert.doesNotMatch(html, /#btnOpenPodiumModal,\s*#btnToggleSound/);
  assert.doesNotMatch(html, /#btnExportCsv,/);
  const inset = sliceBetween(html, 'html[data-skin="minimalist"] #studioHeader #btnOpenPickerModal', 'box-shadow: inset 0 0 0 1px var(--skin-line);');
  assert.match(inset, /#btnOpenClassModal/);
  assert.doesNotMatch(inset, /#btnOpenWhiteboard/);
  assert.match(html, /document\.getElementById\('btnOpenPodiumModal'\)\.addEventListener\('click', openPodiumModal\)/);
  assert.match(html, /document\.getElementById\('btnExportCsv'\)\.addEventListener\('click', exportClassScoresToCsv\)/);
  assert.match(html, /document\.getElementById\('btnOpenClassModal'\)\.addEventListener\('click', openClassModal\)/);
}

test('Live Class and Live Class + share the header, tools, and leaderboard placement', function () {
  assertPageChrome(liveHtml, 'Live Class');
  assertPageChrome(plusHtml, 'Live Class +');
  assert.match(liveHtml, /href="whiteboard\.css\?v=20261113k"/);
  assert.match(liveHtml, /src="whiteboard\.js\?v=20261113j"/);
  assert.match(plusHtml, /href="\.\.\/hcs-live-class\/whiteboard\.css\?v=20261113k"/);
  assert.match(plusHtml, /src="\.\.\/hcs-live-class\/whiteboard\.js\?v=20261113j"/);
  const drive = liveHtml.indexOf('<script src="studio-drive.js"></script>');
  const core = liveHtml.indexOf('<script src="studio-core.js?v=20261109c"></script>');
  const board = liveHtml.indexOf('<script src="whiteboard.js?v=20261113j"></script>');
  const inline = liveHtml.indexOf("const STORAGE_KEY = 'skhhcss_eng_classroom_v4'");
  assert.ok(drive > 0 && core > drive && board > core && inline > board);
});

test('the board is memory only and does not join Ask or Dict', function () {
  assert.match(src, /id="wbColour"[^>]*aria-label="Colour"/);
  assert.match(src, /id="wbColourPop"/);
  assert.match(src, /setColour/);
  assert.doesNotMatch(src, /cycleColour/);
  assert.doesNotMatch(src, /Color/);
  assert.doesNotMatch(src, /localStorage|sessionStorage|indexedDB/);
  assert.doesNotMatch(src + css, /HcsStudioDrive|gapi/);
  assert.match(src, /data-wb-tool="highlighter"[^>]*aria-label="Highlighter"/);
  assert.match(src, /✏️|🖍️|🧽|🔤|↩️|↪️|🗑️/);
  assert.match(src, /id="wbClose"[^>]*>X</);
  assert.match(src, /aria-label="Close"/);
  assert.doesNotMatch(src, /id="wbClose">Close</);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /width:\s*44px/);
  assert.match(css, /html\[data-skin="minimalist"\] \.wb-bar/);
  assert.match(css, /html\[data-skin="minimalist"\] \.wb-bar \{[^}]*background:\s*var\(--skin-bg/);
  assert.match(css, /\.wb-close/);
  assert.match(src, /Clear the whiteboard\? Undo brings it back/);
  assert.match(src, /e\.key !== 'Escape'/);
  assert.match(assistant, /plusModeAsk/);
  assert.match(assistant, /plusModeDict/);
  assert.doesNotMatch(assistant, /btnOpenWhiteboard|Whiteboard/);
  const ball = sliceBetween(plusHtml, 'assistant.js?v=', '</html>');
  assert.doesNotMatch(ball, /Whiteboard/);
});

test('ink stays for the session, and clear can be undone', function () {
  const board = wb.createSession();
  assert.equal(board.tool(), 'pen');
  assert.equal(board.colour().id, 'navy');
  assert.equal(board.setColour('red').id, 'red');
  assert.equal(board.colour().id, 'red');
  assert.ok(wb.COLOURS.length > 6);
  assert.equal(wb.COLOURS.find((c) => c.id === 'yellow').hex, '#FACC15');
  assert.equal(wb.COLOURS.find((c) => c.id === 'green').hex, '#22C55E');
  assert.equal(board.setColour('black').id, 'black');
  assert.equal(board.setColour('purple').id, 'purple');
  board.beginStroke(0.1, 0.2, 0.4);
  board.extendStroke(0.4, 0.5);
  assert.equal(board.endStroke(), true);
  assert.equal(board.strokes().length, 1);
  assert.equal(board.strokes()[0].points.length, 2);
  assert.equal(board.hasInk(), true);
  board.closeBoard();
  assert.equal(board.isOpen(), false);
  assert.equal(board.strokes().length, 1);
  board.openBoard();
  assert.equal(board.strokes()[0].points[1].x, 0.4);
  assert.equal(board.undo(), true);
  assert.equal(board.strokes().length, 0);
  assert.equal(board.redo(), true);
  assert.equal(board.strokes().length, 1);
  assert.equal(board.clear(), true);
  assert.equal(board.hasInk(), false);
  assert.equal(board.clear(), false);
  assert.equal(board.undo(), true);
  assert.equal(board.strokes().length, 1);
  const fresh = wb.createSession();
  assert.equal(fresh.strokes().length, 0);
  assert.equal(fresh.hasInk(), false);
});

test('text is placed, edited, and kept out of the pen', function () {
  const board = wb.createSession();
  board.setTool('text');
  assert.equal(board.beginStroke(0.5, 0.5, 1), null);
  assert.equal(board.strokes().length, 0);
  const blank = board.placeText(2, -1);
  assert.equal(blank.x, 0.86);
  assert.equal(blank.y, 0);
  assert.equal(board.commitText(blank.id, '   '), false);
  assert.equal(board.texts().length, 0);
  assert.equal(board.canUndo(), false);
  const note = board.placeText(0.2, 0.3);
  assert.equal(board.commitText(note.id, 'Hello'), true);
  assert.equal(board.texts()[0].value, 'Hello');
  assert.equal(board.texts()[0].fresh, false);
  board.commitText(note.id, '');
  assert.equal(board.texts().length, 0);
  assert.equal(board.undo(), true);
  assert.equal(board.texts()[0].value, 'Hello');
  const draft = board.placeText(0.4, 0.4);
  board.setDraft(draft.id, 'Keep me');
  assert.equal(board.clear(), true);
  assert.equal(board.undo(), true);
  assert.equal(board.texts().some(function (item) { return item.value === 'Keep me'; }), true);
  board.setTool('eraser');
  board.beginStroke(0.2, 0.2, 0);
  assert.equal(board.strokes()[0].erase, true);
  assert.equal(board.strokes()[0].width, wb.ERASER);
  board.endStroke();
  assert.deepEqual(board.texts().map(function (item) { return item.value; }), ['Hello', 'Keep me']);
});

test('highlighter makes a wider translucent stroke and leaves text alone', function () {
  const board = wb.createSession();
  board.setTool('highlighter');
  assert.equal(board.tool(), 'highlighter');
  board.beginStroke(0.2, 0.2, 0.5);
  board.extendStroke(0.5, 0.4);
  assert.equal(board.endStroke(), true);
  assert.equal(board.strokes()[0].highlight, true);
  assert.equal(board.strokes()[0].erase, false);
  assert.ok(board.strokes()[0].width > wb.PEN_BASE);
  assert.ok(board.strokes()[0].width >= wb.HIGHLIGHT_BASE);
  board.setTool('text');
  assert.equal(board.beginStroke(0.3, 0.3, 1), null);
  const note = board.placeText(0.1, 0.1);
  board.commitText(note.id, 'Keep');
  board.setTool('highlighter');
  board.beginStroke(0.1, 0.1, 0.5);
  board.endStroke();
  assert.deepEqual(board.texts().map(function (item) { return item.value; }), ['Keep']);
});
