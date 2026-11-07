const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const here = __dirname;
const registrySrc = fs.readFileSync(path.join(here, 'skins/registry.js'), 'utf8');
const loaderSrc = fs.readFileSync(path.join(here, 'skins/loader.js'), 'utf8');
const sparkJs = fs.readFileSync(path.join(here, 'skins/spark.js'), 'utf8');
const sparkFireSrc = fs.readFileSync(path.join(here, 'spark-fire.js'), 'utf8');

function freshContext() {
  const sandbox = {
    console: console,
    Date: Date,
    Math: Math,
    Number: Number,
    String: String,
    Array: Array,
    Object: Object,
    setTimeout: function () { throw new Error('unexpected timer'); },
    clearTimeout: function () {}
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  return sandbox;
}

function run(sandbox, code, filename) {
  vm.runInNewContext(code, sandbox, { filename: filename });
}

test('registry knows Spark and not the core skins', function () {
  const sandbox = freshContext();
  run(sandbox, registrySrc, 'registry.js');
  assert.equal(sandbox.HcsSkinRegistry.known('spark'), true);
  assert.equal(sandbox.HcsSkinRegistry.known('minimalist'), false);
  assert.equal(sandbox.HcsSkinRegistry.known('default'), false);
  assert.equal(sandbox.HcsSkinRegistry.known(''), false);
  assert.equal(sandbox.HcsSkinRegistry.known(null), false);
  assert.equal(sandbox.HcsSkinRegistry.packs.length, 1);
  assert.equal(sandbox.HcsSkinRegistry.packs[0].css, 'skins/spark.css');
  assert.equal(sandbox.HcsSkinRegistry.packs[0].js, 'skins/spark.js');
});

test('boot writes the pack stylesheet and mount writes the Spark button', function () {
  const boot = freshContext();
  const written = [];
  boot.document = {
    readyState: 'loading',
    currentScript: { getAttribute: function (name) { return name === 'data-hcs-skin' ? 'boot' : null; } },
    write: function (html) { written.push(html); }
  };
  run(boot, registrySrc, 'registry.js');
  run(boot, loaderSrc, 'loader.js');
  assert.match(written.join(''), /<link rel="stylesheet" href="skins\/spark\.css">/);

  const mount = freshContext();
  const buttons = [];
  mount.document = {
    readyState: 'loading',
    currentScript: { getAttribute: function (name) { return name === 'data-hcs-skin' ? 'mount' : null; } },
    write: function (html) { buttons.push(html); }
  };
  run(mount, registrySrc, 'registry.js');
  run(mount, loaderSrc, 'loader.js');
  assert.match(buttons.join(''), /id="btnSkinSpark"[^>]*>Spark</);
  assert.match(buttons.join(''), /class="skin-choice"/);
  assert.match(buttons.join(''), /data-skin-pack="spark"/);
});

test('wire applies Default, Minimalist, and Spark without a hardcoded Spark branch', function () {
  const sandbox = freshContext();
  const store = {};
  function button(id, pressed) {
    return {
      id: id,
      pressed: pressed,
      setAttribute: function (name, value) {
        if (name === 'aria-pressed') this.pressed = value;
      },
      addEventListener: function (type, fn) {
        if (type === 'click') this.onclick = fn;
      }
    };
  }
  const buttons = {
    btnSkinDefault: button('btnSkinDefault', 'true'),
    btnSkinMinimalist: button('btnSkinMinimalist', 'false'),
    btnSkinSpark: button('btnSkinSpark', 'false')
  };
  sandbox.localStorage = {
    setItem: function (key, value) { store[key] = value; },
    getItem: function (key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; }
  };
  sandbox.document = {
    readyState: 'loading',
    currentScript: { getAttribute: function (name) { return name === 'data-hcs-skin' ? 'wire' : null; } },
    write: function () { throw new Error('wire should not write'); },
    getElementById: function (id) { return buttons[id] || null; },
    documentElement: {
      skin: null,
      getAttribute: function (name) { return name === 'data-skin' ? this.skin : null; },
      setAttribute: function (name, value) { if (name === 'data-skin') this.skin = value; },
      removeAttribute: function (name) { if (name === 'data-skin') this.skin = null; }
    }
  };
  run(sandbox, registrySrc, 'registry.js');
  run(sandbox, loaderSrc, 'loader.js');
  buttons.btnSkinSpark.onclick();
  assert.equal(sandbox.document.documentElement.skin, 'spark');
  assert.equal(store.hcsLiveClassPlus_skin_v1, 'spark');
  assert.equal(buttons.btnSkinSpark.pressed, 'true');
  assert.equal(buttons.btnSkinDefault.pressed, 'false');
  assert.equal(buttons.btnSkinMinimalist.pressed, 'false');
  buttons.btnSkinMinimalist.onclick();
  assert.equal(sandbox.document.documentElement.skin, 'minimalist');
  assert.equal(store.hcsLiveClassPlus_skin_v1, 'minimalist');
  assert.equal(buttons.btnSkinMinimalist.pressed, 'true');
  buttons.btnSkinDefault.onclick();
  assert.equal(sandbox.document.documentElement.skin, null);
  assert.equal(store.hcsLiveClassPlus_skin_v1, 'default');
  assert.equal(buttons.btnSkinDefault.pressed, 'true');
  assert.equal(buttons.btnSkinSpark.pressed, 'false');
});

test('Spark pack still notes, bursts, ranks, and clears through the host', function () {
  const sandbox = freshContext();
  let skin = 'spark';
  sandbox.document = {
    documentElement: {
      getAttribute: function (name) { return name === 'data-skin' ? skin : null; }
    },
    querySelectorAll: function () { return []; }
  };
  run(sandbox, loaderSrc, 'loader.js');
  run(sandbox, sparkFireSrc, 'spark-fire.js');
  run(sandbox, sparkJs, 'spark.js');
  const st = { id: 'a', classNo: '2', score: 10, sparkPts: [] };
  const other = { id: 'b', classNo: '1', score: 1, sparkPts: [] };
  const cls = { students: [st, other] };
  sandbox.HcsSkinHost.attach({
    getClass: function () { return cls; },
    leaderboardTab: function () { return 'students'; },
    renderLeaderboard: function () {},
    formatRankOrdinal: function (n) {
      return n === 1 ? '1st' : (n === 2 ? '2nd' : '3rd');
    }
  });
  const t = 1000000;
  sandbox.HcsSkinHost.noteScore(st, 1, t);
  sandbox.HcsSkinHost.noteScore(st, 1, t + 1);
  assert.equal(sandbox.SparkFire.onFire(st, t + 1), false);
  sandbox.HcsSkinHost.noteScore(st, 1, t + 2);
  assert.equal(sandbox.SparkFire.onFire(st, t + 2), true);
  const chrome = sandbox.HcsSkinHost.deskChrome(st, t + 2);
  assert.equal(chrome.className, 'spark-tier-1');
  assert.match(chrome.badge, /class="spark-tier-badge">1st</);
  assert.match(chrome.fire, /class="spark-fire is-on"/);
  assert.match(chrome.fire, /class="spark-burn-sheet"/);
  assert.match(chrome.fire, /class="spark-flame-wave w2"/);
  assert.match(chrome.fire, /M0,36 C14,36 12,14 24,18/);
  assert.match(chrome.fire, />On fire</);
  const board = sandbox.HcsSkinHost.leaderboardChrome(st, t + 2);
  assert.equal(board.className, 'spark-tier-1');
  assert.match(board.fire, /class="spark-fire-mini"[^>]*>On fire</);
  const sorted = sandbox.HcsSkinHost.sortStudents(cls.students);
  assert.equal(sorted[0].id, 'a');
  assert.equal(sorted[1].id, 'b');
  const otherChrome = sandbox.HcsSkinHost.deskChrome(other, t + 2);
  assert.equal(otherChrome.className, 'spark-tier-2');
  assert.equal(otherChrome.fire, '');
  const burst = sandbox.HcsSkinHost.scoreFloat(1);
  assert.equal(burst.className, 'score-burst');
  assert.equal(burst.ms, 1350);
  skin = null;
  assert.equal(sandbox.HcsSkinHost.scoreFloat(1), null);
  assert.equal(sandbox.HcsSkinHost.scoreFloat(-1), null);
  skin = 'minimalist';
  assert.equal(sandbox.HcsSkinHost.scoreFloat(2), null);
  skin = 'spark';
  sandbox.HcsSkinHost.undoScore(st, 1, t + 2);
  assert.equal(sandbox.SparkFire.onFire(st, t + 2), false);
  sandbox.HcsSkinHost.noteScore(st, 1, t + 2);
  sandbox.HcsSkinHost.clearStudent(st);
  assert.equal(sandbox.SparkFire.onFire(st, t + 2), false);
  assert.equal(st.sparkPts.length, 0);
  sandbox.HcsSkinHost.refresh();
});
