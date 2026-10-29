const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const SD = require('./studio-drive.js');

function memoryStorage(seed) {
  var data = Object.assign({}, seed || {});
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem: function (k, v) { data[k] = String(v); },
    removeItem: function (k) { delete data[k]; }
  };
}

function sampleClass() {
  return {
    id: 'cls_3a',
    name: '3A English',
    frontAtTop: false,
    gridRows: 4,
    gridCols: 6,
    layoutStyle: 'pairs',
    customDefaultSaved: true,
    layoutPitchVersion: 'desk-148x115-groupLr-8within-36aisle',
    groups: [{ id: 'grp_1', name: 'Red', icon: '🛡️', color: 'red', score: 3 }],
    students: [
      { id: 'st_1', classNo: '1', name: 'Chan Tai Man', groupId: 'grp_1', score: 4, x: 28, y: 50 },
      { id: 'st_2', classNo: '2', name: 'Empty', groupId: '', score: 0, x: 184, y: 50 }
    ],
    defaultPositions: [
      { id: 'st_1', x: 28, y: 50 },
      { id: 'st_2', x: 184, y: 50 },
      { id: 'st_gone', x: 340, y: 50 }
    ],
    defaultGroupSnapshot: {
      groups: [{ id: 'grp_1', name: 'Red', icon: '🛡️', color: 'red' }],
      assignments: [
        { id: 'st_1', groupId: 'grp_1' },
        { id: 'st_2', groupId: '' },
        { id: 'st_gone', groupId: 'grp_1' }
      ]
    },
    defaultStudentSnapshot: [
      { id: 'st_1', classNo: '1', name: 'Chan Tai Man', groupId: 'grp_1', x: 28, y: 50, score: 2 },
      { id: 'st_gone', classNo: '9', name: 'Lee Left', groupId: 'grp_1', x: 340, y: 50, score: 7 }
    ]
  };
}

test('plan titles and file names', function () {
  assert.equal(SD.planTitle('  3A   English  '), '3A English');
  assert.equal(SD.planTitle(''), 'Untitled');
  assert.equal(SD.fileNameForTitle('3A English'), '3A English.json');
  assert.equal(SD.fileNameForTitle('3A/English'), '3A-English.json');
  assert.equal(SD.fileNameForTitle('3A English.json'), '3A English.json');
  assert.equal(SD.titleFromFileName('3A English.json'), '3A English');
  assert.equal(SD.titleFromFileName('3A English.JSON'), '3A English');
});

test('Hong Kong 24-hour stamp drops a blank who', function () {
  assert.equal(SD.formatSavedStamp('2026-10-29T06:05:00.000Z', 'Ada Wong'), '29 Oct 14:05 · Ada Wong');
  assert.equal(SD.formatSavedStamp('2026-10-28T16:00:00.000Z', ''), '29 Oct 00:00');
  assert.equal(SD.formatSavedStamp('2026-10-28T16:00:00.000Z', '   '), '29 Oct 00:00');
});

test('who comes from Drive display names only', function () {
  assert.equal(SD.planWho({ lastModifyingUser: { displayName: ' Miss Lee ' } }), 'Miss Lee');
  assert.equal(SD.planWho({ lastModifyingUser: {} }), '');
  assert.equal(SD.planWho({}), '');
  assert.equal(SD.folderWho({ owners: [{ displayName: 'Howard' }] }), 'Howard');
});

test('payload keeps seating, live scores, and Save Default snapshot', function () {
  var cls = sampleClass();
  var payload = SD.buildPlanPayload(cls, { name: ' 3B  Oral ', savedAt: '2026-10-29T06:05:00.000Z' });
  cls.students[0].score = 99;
  cls.name = 'changed locally';
  assert.equal(payload.kind, SD.PLAN_KIND);
  assert.equal(payload.name, '3B Oral');
  assert.equal(payload.class.name, '3B Oral');
  assert.equal(payload.class.id, 'cls_3a');
  assert.equal(payload.class.students[0].score, 4);
  assert.equal(payload.class.students[0].x, 28);
  assert.equal(payload.class.groups[0].score, 3);
  assert.equal(payload.class.customDefaultSaved, true);
  assert.equal(payload.class.defaultStudentSnapshot[1].id, 'st_gone');
  assert.equal(payload.class.defaultStudentSnapshot[1].score, 7);
  assert.equal(payload.class.defaultPositions[2].id, 'st_gone');
  assert.equal(cls.students[0].score, 99);

  var parsed = SD.parsePlanFile(JSON.stringify(payload));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.plan.class.students[1].name, 'Empty');
  assert.equal(SD.parsePlanFile('{').ok, false);
  assert.equal(SD.parsePlanFile(JSON.stringify({ classes: [cls] })).ok, false);
});

test('open replaces the same class and leaves the others', function () {
  var payload = SD.buildPlanPayload(sampleClass(), { name: '3A English', savedAt: '2026-10-29T06:05:00.000Z' });
  var parsed = SD.parsePlanFile(JSON.stringify(payload));
  parsed.plan.class.students[0].score = 8;
  var state = {
    currentClassId: 'cls_other',
    classes: [
      { id: 'cls_other', name: '5A', students: [{ id: 'a', score: 1 }], customDefaultSaved: true },
      sampleClass()
    ]
  };
  var applied = SD.applyPlanToState(state, parsed.plan);
  assert.equal(applied.replaced, true);
  assert.equal(state.currentClassId, 'cls_3a');
  assert.equal(state.classes.length, 2);
  assert.equal(state.classes[0].id, 'cls_other');
  assert.equal(state.classes[0].students[0].score, 1);
  assert.equal(state.classes[1].students[0].score, 8);
  assert.equal(state.classes[1].customDefaultSaved, true);
  assert.equal(state.classes[1].defaultStudentSnapshot[1].name, 'Lee Left');
  assert.equal(state.classes[1].layoutStyle, 'pairs');

  var fresh = { classes: [], currentClassId: '' };
  var added = SD.applyPlanToState(fresh, parsed.plan);
  assert.equal(added.replaced, false);
  assert.equal(fresh.classes.length, 1);
  assert.equal(fresh.currentClassId, 'cls_3a');
});

test('same plan name is an overwrite; a different name is not', function () {
  var files = [
    { id: 'old', name: '3A English.json', modifiedTime: '2026-10-29T01:00:00.000Z' },
    { id: 'other', name: '5A DSE.json', modifiedTime: '2026-10-29T02:00:00.000Z' }
  ];
  assert.equal(SD.findPlanByTitle(files, '3A English').id, 'old');
  assert.equal(SD.findPlanByTitle(files, '3A  English').id, 'old');
  assert.equal(SD.findPlanByTitle(files, '3a english'), null);
  assert.equal(SD.findPlanByTitle(files, '5A DSE').id, 'other');
});

test('folder id stays in local storage', function () {
  var storage = memoryStorage();
  assert.equal(SD.readFolderId(storage), '');
  SD.writeFolderId(storage, 'not an id');
  assert.equal(SD.readFolderId(storage), '');
  SD.writeFolderId(storage, '1AbC_def-ghiJKLmnop');
  assert.equal(SD.readFolderId(storage), '1AbC_def-ghiJKLmnop');
  assert.equal(storage.getItem(SD.FOLDER_STORAGE_KEY), '1AbC_def-ghiJKLmnop');
  SD.clearFolderId(storage);
  assert.equal(SD.readFolderId(storage), '');
});

test('Drive client lists the folder, creates, and overwrites without a new parent', async function () {
  var calls = [];
  function respond(url, init) {
    calls.push({ url: url, method: (init && init.method) || 'GET', body: init && init.body, headers: init && init.headers });
    if (url.indexOf('/upload/') !== -1 && (init.method === 'POST' || init.method === 'PATCH')) {
      return { ok: true, status: 200, text: async function () { return JSON.stringify({ id: 'file1', name: '3A English.json' }); } };
    }
    if (init && init.method === 'POST' && url.indexOf('/upload/') === -1) {
      return { ok: true, status: 200, text: async function () { return JSON.stringify({ id: 'createdFolder', name: 'Class Activity Studio' }); } };
    }
    if (url.indexOf('mimeType') !== -1 && (url.indexOf('Class+Activity+Studio') !== -1 || url.indexOf('Class%20Activity%20Studio') !== -1)) {
      return { ok: true, status: 200, text: async function () { return JSON.stringify({ files: [{ id: 'folder1', name: 'Class Activity Studio', owners: [{ displayName: 'Howard' }] }] }); } };
    }
    if (url.indexOf('in+parents') !== -1 || url.indexOf('in%20parents') !== -1 || url.indexOf("in parents") !== -1) {
      return { ok: true, status: 200, text: async function () { return JSON.stringify({ files: [{ id: 'file9', name: '3A English.json', modifiedTime: '2026-10-29T06:05:00.000Z', lastModifyingUser: { displayName: 'Ada Wong' } }] }); } };
    }
    return { ok: false, status: 404, text: async function () { return ''; } };
  }
  var client = SD.createClient({
    fetch: function (url, init) { return Promise.resolve(respond(url, init)); },
    getToken: function () { return Promise.resolve('token-1'); },
    apiBase: 'https://example.test/drive/v3',
    uploadBase: 'https://example.test/upload/drive/v3'
  });

  function decoded(url) {
    return decodeURIComponent(url).replace(/\+/g, ' ');
  }

  var folders = await client.listFolders();
  assert.equal(folders[0].id, 'folder1');
  assert.equal(SD.folderWho(folders[0]), 'Howard');
  assert.match(calls[0].url, /supportsAllDrives=true/);
  assert.match(decoded(calls[0].url), /name = 'Class Activity Studio'/);
  var created = await client.createFolder();
  assert.equal(created.name, 'Class Activity Studio');
  assert.match(calls[1].body, /"name":"Class Activity Studio"/);

  var plans = await client.listPlans('folder1');
  assert.equal(plans[0].id, 'file9');
  assert.equal(SD.formatSavedStamp(plans[0].modifiedTime, SD.planWho(plans[0])), '29 Oct 14:05 · Ada Wong');
  assert.match(decoded(calls[2].url), /'folder1' in parents/);

  var payload = SD.buildPlanPayload(sampleClass(), { name: '3A English', savedAt: '2026-10-29T06:05:00.000Z' });
  await client.createPlan('folder1', '3A English.json', payload);
  assert.equal(calls[3].method, 'POST');
  assert.match(calls[3].body, /"parents":\["folder1"\]/);
  assert.match(calls[3].body, /"kind": "skhhcss-studio-plan"/);
  assert.match(calls[3].headers.Authorization, /Bearer token-1/);

  await client.updatePlan('file9', '3A English.json', payload);
  assert.equal(calls[4].method, 'PATCH');
  assert.equal(calls[4].body.indexOf('"parents"'), -1);
  assert.match(calls[4].url, /\/files\/file9/);
});

test('public client id is set, with no secret, and only an empty id is refused', function () {
  var cfg = fs.readFileSync(path.join(__dirname, 'drive-config.js'), 'utf8');
  assert.match(cfg, /clientId:\s*"322774470382-v8tevo6q55satejpvhqcd24l4ujmdruv\.apps\.googleusercontent\.com"/);
  assert.equal(cfg.indexOf('client_secret'), -1);
  assert.equal(cfg.indexOf('clientSecret'), -1);
  var html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  assert.match(html, /function currentClientId\(\) \{\s*return String\(\(window\.SKHHCSS_STUDIO_DRIVE \|\| \{\}\)\.clientId \|\| ''\)\.trim\(\);\s*\}/);
  assert.match(html, /function configured\(\) \{\s*return !!\(currentClientId\(\) && SD\);\s*\}/);
  assert.equal(html.split("showToast('Google sign-in is not set up.'").length - 1, 2);
  assert.match(html, /if \(!configured\(\)\) \{\s*showToast\('Google sign-in is not set up\.', '⚠️'\);\s*return;\s*\}/);
});

test('Studio chrome keeps local Save / Load and adds the Drive chips after them', function () {
  var html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  var save = html.indexOf('id="btnSetDefaultLayout"');
  var load = html.indexOf('id="btnResetLayout"');
  var online = html.indexOf('id="btnSaveOnline"');
  var open = html.indexOf('id="btnOpenPlan"');
  assert.ok(save > 0 && load > save && online > load && open > online);
  assert.match(html, /id="btnSaveOnline"[^>]*>\s*Save online\s*</);
  assert.match(html, /id="btnOpenPlan"[^>]*>\s*Open plan\s*</);
  assert.match(html, /id="btnBackupJson"/);
  assert.match(html, /id="importJsonInput"/);
  assert.match(html, /id="planSheetTitle"/);
  assert.match(html, /src="drive-config\.js"/);
  assert.match(html, /src="studio-drive\.js"/);
  assert.match(html, /accounts\.google\.com\/gsi\/client/);
  assert.equal(SD.DRIVE_SCOPE, 'https://www.googleapis.com/auth/drive');
  assert.equal(SD.FOLDER_NAME, 'Class Activity Studio');
});
