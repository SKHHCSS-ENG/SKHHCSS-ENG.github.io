/**
 * Class Activity Studio — shared seating plans in one Google Drive folder.
 * Browser calls Drive API v3 with the teacher’s own token (no Worker, no secret).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.StudioDrive = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
  var FOLDER_NAME = 'Class Activity Studio';
  var FOLDER_MIME = 'application/vnd.google-apps.folder';
  var PLAN_MIME = 'application/json';
  var FOLDER_STORAGE_KEY = 'skhhcss_eng_studio_drive_folder_v1';
  var PLAN_KIND = 'skhhcss-studio-plan';
  var PLAN_VERSION = 1;
  var DRIVE_API = 'https://www.googleapis.com/drive/v3';
  var DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

  function planTitle(name) {
    var t = String(name == null ? '' : name).replace(/\s+/g, ' ').trim();
    if (!t) return 'Untitled';
    if (t.length > 120) t = t.slice(0, 120).trim();
    return t || 'Untitled';
  }

  function fileNameForTitle(title) {
    var t = planTitle(title).replace(/[\\/]/g, '-').replace(/[\u0000-\u001f]/g, '').trim();
    if (!t) t = 'Untitled';
    if (/\.json$/i.test(t)) return t;
    return t + '.json';
  }

  function titleFromFileName(name) {
    var n = String(name || '').trim();
    if (/\.json$/i.test(n)) n = n.slice(0, -5).trim();
    return planTitle(n);
  }

  function driveQuote(value) {
    return "'" + String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  }

  function isDriveId(id) {
    return /^[a-zA-Z0-9_-]{8,}$/.test(String(id || ''));
  }

  function readFolderId(storage) {
    try {
      var id = storage.getItem(FOLDER_STORAGE_KEY) || '';
      return isDriveId(id) ? id : '';
    } catch (e) {
      return '';
    }
  }

  function writeFolderId(storage, id) {
    if (!isDriveId(id)) return;
    storage.setItem(FOLDER_STORAGE_KEY, id);
  }

  function clearFolderId(storage) {
    try { storage.removeItem(FOLDER_STORAGE_KEY); } catch (e) {}
  }

  function planWho(file) {
    var user = file && file.lastModifyingUser;
    var name = user && user.displayName ? String(user.displayName).trim() : '';
    return name;
  }

  function folderWho(file) {
    var owner = file && file.owners && file.owners[0];
    return owner && owner.displayName ? String(owner.displayName).trim() : '';
  }

  function formatSavedStamp(iso, who) {
    var d = new Date(iso);
    var name = String(who || '').trim();
    if (!iso || isNaN(d.getTime())) return name;
    var parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Hong_Kong',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(d);
    var bag = {};
    parts.forEach(function (p) {
      if (p.type !== 'literal') bag[p.type] = p.value;
    });
    var hour = String(bag.hour || '00');
    if (hour.length === 1) hour = '0' + hour;
    var minute = String(bag.minute || '00');
    if (minute.length === 1) minute = '0' + minute;
    var stamp = bag.day + ' ' + bag.month + ' ' + hour + ':' + minute;
    return name ? stamp + ' \u00b7 ' + name : stamp;
  }

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function buildPlanPayload(cls, options) {
    options = options || {};
    var name = planTitle(options.name || (cls && cls.name));
    var copy = cloneJson(cls || {});
    copy.name = name;
    if (!Array.isArray(copy.groups)) copy.groups = [];
    if (!Array.isArray(copy.students)) copy.students = [];
    return {
      kind: PLAN_KIND,
      v: PLAN_VERSION,
      name: name,
      savedAt: options.savedAt || new Date().toISOString(),
      savedBy: String(options.savedBy || '').trim(),
      class: copy
    };
  }

  function parsePlanFile(text) {
    var data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return { ok: false, error: 'parse' };
    }
    if (!data || data.kind !== PLAN_KIND || !data.class || typeof data.class !== 'object') {
      return { ok: false, error: 'format' };
    }
    if (!Array.isArray(data.class.students)) return { ok: false, error: 'format' };
    var cls = cloneJson(data.class);
    if (!Array.isArray(cls.groups)) cls.groups = [];
    var name = planTitle(data.name || cls.name);
    cls.name = name;
    return {
      ok: true,
      plan: {
        kind: PLAN_KIND,
        v: data.v || PLAN_VERSION,
        name: name,
        savedAt: data.savedAt || '',
        savedBy: String(data.savedBy || '').trim(),
        class: cls
      }
    };
  }

  function applyPlanToState(state, plan) {
    if (!state.classes) state.classes = [];
    var cls = cloneJson(plan.class);
    cls.name = planTitle(plan.name || cls.name);
    if (!cls.id) cls.id = 'cls_drive_' + Date.now();
    if (!Array.isArray(cls.groups)) cls.groups = [];
    var replaced = false;
    for (var i = 0; i < state.classes.length; i++) {
      if (state.classes[i] && state.classes[i].id === cls.id) {
        state.classes[i] = cls;
        replaced = true;
        break;
      }
    }
    if (!replaced) state.classes.push(cls);
    state.currentClassId = cls.id;
    return { classId: cls.id, replaced: replaced, classRecord: cls };
  }

  function findPlanByTitle(files, title) {
    var want = planTitle(title);
    var wantFile = fileNameForTitle(want);
    var list = files || [];
    for (var i = 0; i < list.length; i++) {
      var file = list[i];
      if (!file) continue;
      if (file.name === wantFile || titleFromFileName(file.name) === want) return file;
    }
    return null;
  }

  function multipartBody(metadata, jsonText) {
    var boundary = 'studioplan' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    var body = [
      '--' + boundary,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify(metadata),
      '--' + boundary,
      'Content-Type: application/json; charset=UTF-8',
      '',
      jsonText,
      '--' + boundary + '--',
      ''
    ].join('\r\n');
    return { boundary: boundary, body: body };
  }

  function createClient(options) {
    var fetchFn = options.fetch;
    var getToken = options.getToken;
    var apiBase = options.apiBase || DRIVE_API;
    var uploadBase = options.uploadBase || DRIVE_UPLOAD;

    function driveFetch(url, init) {
      return Promise.resolve(getToken()).then(function (token) {
        var headers = { Authorization: 'Bearer ' + token };
        if (init && init.headers) {
          Object.keys(init.headers).forEach(function (key) {
            headers[key] = init.headers[key];
          });
        }
        return fetchFn(url, {
          method: (init && init.method) || 'GET',
          headers: headers,
          body: init && init.body,
          cache: 'no-store'
        });
      });
    }

    function readBody(res, asText) {
      return res.text().then(function (text) {
        if (!res.ok) {
          var err = new Error('drive');
          err.status = res.status;
          throw err;
        }
        if (asText) return text;
        return text ? JSON.parse(text) : {};
      });
    }

    function listAll(query) {
      var files = [];
      function page(pageToken, guard) {
        var params = new URLSearchParams();
        params.set('q', query);
        params.set('fields', 'nextPageToken,files(id,name,mimeType,modifiedTime,trashed,owners(displayName),lastModifyingUser(displayName))');
        params.set('pageSize', '100');
        params.set('orderBy', 'modifiedTime desc');
        params.set('supportsAllDrives', 'true');
        params.set('includeItemsFromAllDrives', 'true');
        params.set('spaces', 'drive');
        if (pageToken) params.set('pageToken', pageToken);
        return driveFetch(apiBase + '/files?' + params.toString()).then(function (res) {
          return readBody(res, false);
        }).then(function (data) {
          files = files.concat(data.files || []);
          if (data.nextPageToken && guard < 10) return page(data.nextPageToken, guard + 1);
          return files;
        });
      }
      return page('', 0);
    }

    function writePlan(method, url, metadata, payload) {
      var packed = multipartBody(metadata, JSON.stringify(payload, null, 2));
      return driveFetch(url, {
        method: method,
        headers: { 'Content-Type': 'multipart/related; boundary=' + packed.boundary },
        body: packed.body
      }).then(function (res) { return readBody(res, false); });
    }

    return {
      listFolders: function () {
        var q = 'name = ' + driveQuote(FOLDER_NAME) +
          " and mimeType = '" + FOLDER_MIME + "' and trashed = false";
        return listAll(q);
      },
      createFolder: function () {
        var params = new URLSearchParams();
        params.set('supportsAllDrives', 'true');
        params.set('fields', 'id,name,mimeType');
        return driveFetch(apiBase + '/files?' + params.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: FOLDER_NAME, mimeType: FOLDER_MIME })
        }).then(function (res) { return readBody(res, false); });
      },
      getFile: function (fileId) {
        var params = new URLSearchParams();
        params.set('supportsAllDrives', 'true');
        params.set('fields', 'id,name,mimeType,trashed');
        return driveFetch(apiBase + '/files/' + encodeURIComponent(fileId) + '?' + params.toString())
          .then(function (res) { return readBody(res, false); });
      },
      listPlans: function (folderId) {
        var q = driveQuote(folderId) + " in parents and trashed = false and mimeType = '" + PLAN_MIME + "'";
        return listAll(q);
      },
      readPlan: function (fileId) {
        var params = new URLSearchParams();
        params.set('alt', 'media');
        params.set('supportsAllDrives', 'true');
        return driveFetch(apiBase + '/files/' + encodeURIComponent(fileId) + '?' + params.toString())
          .then(function (res) { return readBody(res, true); });
      },
      createPlan: function (folderId, fileName, payload) {
        var params = new URLSearchParams();
        params.set('uploadType', 'multipart');
        params.set('supportsAllDrives', 'true');
        params.set('fields', 'id,name,modifiedTime');
        return writePlan('POST', uploadBase + '/files?' + params.toString(), {
          name: fileName,
          mimeType: PLAN_MIME,
          parents: [folderId]
        }, payload);
      },
      updatePlan: function (fileId, fileName, payload) {
        var params = new URLSearchParams();
        params.set('uploadType', 'multipart');
        params.set('supportsAllDrives', 'true');
        params.set('fields', 'id,name,modifiedTime');
        return writePlan('PATCH', uploadBase + '/files/' + encodeURIComponent(fileId) + '?' + params.toString(), {
          name: fileName,
          mimeType: PLAN_MIME
        }, payload);
      }
    };
  }

  return {
    DRIVE_SCOPE: DRIVE_SCOPE,
    FOLDER_NAME: FOLDER_NAME,
    FOLDER_MIME: FOLDER_MIME,
    PLAN_MIME: PLAN_MIME,
    FOLDER_STORAGE_KEY: FOLDER_STORAGE_KEY,
    PLAN_KIND: PLAN_KIND,
    planTitle: planTitle,
    fileNameForTitle: fileNameForTitle,
    titleFromFileName: titleFromFileName,
    driveQuote: driveQuote,
    readFolderId: readFolderId,
    writeFolderId: writeFolderId,
    clearFolderId: clearFolderId,
    planWho: planWho,
    folderWho: folderWho,
    formatSavedStamp: formatSavedStamp,
    buildPlanPayload: buildPlanPayload,
    parsePlanFile: parsePlanFile,
    applyPlanToState: applyPlanToState,
    findPlanByTitle: findPlanByTitle,
    createClient: createClient
  };
});
