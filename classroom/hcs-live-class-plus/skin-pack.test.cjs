const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const here = __dirname;
const registrySrc = fs.readFileSync(path.join(here, 'skins/registry.js'), 'utf8');
const loaderSrc = fs.readFileSync(path.join(here, 'skins/loader.js'), 'utf8');
const sparkJs = fs.readFileSync(path.join(here, 'skins/spark.js'), 'utf8');
const arcadeJs = fs.readFileSync(path.join(here, 'skins/arcade.js'), 'utf8');
const holoJs = fs.readFileSync(path.join(here, 'skins/holo.js'), 'utf8');
const hyperJs = fs.readFileSync(path.join(here, 'skins/hyper.js'), 'utf8');
const pixelJs = fs.readFileSync(path.join(here, 'skins/pixel.js'), 'utf8');
const cyberJs = fs.readFileSync(path.join(here, 'skins/cyber.js'), 'utf8');
const lofiJs = fs.readFileSync(path.join(here, 'skins/lofi.js'), 'utf8');
const arcadeCss = fs.readFileSync(path.join(here, 'skins/arcade.css'), 'utf8');
const holoCss = fs.readFileSync(path.join(here, 'skins/holo.css'), 'utf8');
const hyperCss = fs.readFileSync(path.join(here, 'skins/hyper.css'), 'utf8');
const pixelCss = fs.readFileSync(path.join(here, 'skins/pixel.css'), 'utf8');
const cyberCss = fs.readFileSync(path.join(here, 'skins/cyber.css'), 'utf8');
const lofiCss = fs.readFileSync(path.join(here, 'skins/lofi.css'), 'utf8');
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

test('registry knows Spark, Arcade, Holo, Hyper, Pixel, Cyber, and Lo-Fi and not the core skins', function () {
  const sandbox = freshContext();
  run(sandbox, registrySrc, 'registry.js');
  assert.equal(sandbox.HcsSkinRegistry.known('spark'), true);
  assert.equal(sandbox.HcsSkinRegistry.known('arcade'), true);
  assert.equal(sandbox.HcsSkinRegistry.known('holo'), true);
  assert.equal(sandbox.HcsSkinRegistry.known('hyper'), true);
  assert.equal(sandbox.HcsSkinRegistry.known('pixel'), true);
  assert.equal(sandbox.HcsSkinRegistry.known('cyber'), true);
  assert.equal(sandbox.HcsSkinRegistry.known('lofi'), true);
  assert.equal(sandbox.HcsSkinRegistry.known('minimalist'), false);
  assert.equal(sandbox.HcsSkinRegistry.known('default'), false);
  assert.equal(sandbox.HcsSkinRegistry.known(''), false);
  assert.equal(sandbox.HcsSkinRegistry.known(null), false);
  assert.equal(sandbox.HcsSkinRegistry.packs.length, 7);
  assert.equal(sandbox.HcsSkinRegistry.packs[0].css, 'skins/spark.css');
  assert.equal(sandbox.HcsSkinRegistry.packs[1].css, 'skins/arcade.css');
  assert.equal(sandbox.HcsSkinRegistry.packs[2].css, 'skins/holo.css');
  assert.equal(sandbox.HcsSkinRegistry.packs[3].css, 'skins/hyper.css');
  assert.equal(sandbox.HcsSkinRegistry.packs[4].css, 'skins/pixel.css');
  assert.equal(sandbox.HcsSkinRegistry.packs[5].css, 'skins/cyber.css');
  assert.equal(sandbox.HcsSkinRegistry.packs[6].css, 'skins/lofi.css');
});

test('boot writes pack stylesheets and mount writes all 7 DLC skin buttons', function () {
  const boot = freshContext();
  const written = [];
  boot.document = {
    readyState: 'loading',
    currentScript: { getAttribute: function (name) { return name === 'data-hcs-skin' ? 'boot' : null; } },
    write: function (html) { written.push(html); }
  };
  run(boot, registrySrc, 'registry.js');
  run(boot, loaderSrc, 'loader.js');
  const bootHtml = written.join('');
  assert.match(bootHtml, /<link rel="stylesheet" href="skins\/spark\.css">/);
  assert.match(bootHtml, /<link rel="stylesheet" href="skins\/arcade\.css">/);
  assert.match(bootHtml, /<link rel="stylesheet" href="skins\/holo\.css">/);
  assert.match(bootHtml, /<link rel="stylesheet" href="skins\/hyper\.css">/);
  assert.match(bootHtml, /<link rel="stylesheet" href="skins\/pixel\.css">/);
  assert.match(bootHtml, /<link rel="stylesheet" href="skins\/cyber\.css">/);
  assert.match(bootHtml, /<link rel="stylesheet" href="skins\/lofi\.css">/);

  const mount = freshContext();
  const buttons = [];
  mount.document = {
    readyState: 'loading',
    currentScript: { getAttribute: function (name) { return name === 'data-hcs-skin' ? 'mount' : null; } },
    write: function (html) { buttons.push(html); }
  };
  run(mount, registrySrc, 'registry.js');
  run(mount, loaderSrc, 'loader.js');
  const mountHtml = buttons.join('');
  assert.match(mountHtml, /id="btnSkinSpark"[^>]*>Spark</);
  assert.match(mountHtml, /id="btnSkinArcade"[^>]*>Arcade</);
  assert.match(mountHtml, /id="btnSkinHolo"[^>]*>Holo</);
  assert.match(mountHtml, /id="btnSkinHyper"[^>]*>Hyper</);
  assert.match(mountHtml, /id="btnSkinPixel"[^>]*>Pixel</);
  assert.match(mountHtml, /id="btnSkinCyber"[^>]*>Cyber</);
  assert.match(mountHtml, /id="btnSkinLofi"[^>]*>Lo-Fi</);
  assert.match(mountHtml, /class="skin-choice"/);
  assert.match(mountHtml, /data-skin-pack="pixel"/);
  assert.match(mountHtml, /data-skin-pack="cyber"/);
  assert.match(mountHtml, /data-skin-pack="lofi"/);
});

test('wire applies Default, Minimalist, Spark, Arcade, Holo, Hyper, Pixel, Cyber, and Lo-Fi without hardcoded pack branches', function () {
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
    btnSkinSpark: button('btnSkinSpark', 'false'),
    btnSkinArcade: button('btnSkinArcade', 'false'),
    btnSkinHolo: button('btnSkinHolo', 'false'),
    btnSkinHyper: button('btnSkinHyper', 'false'),
    btnSkinPixel: button('btnSkinPixel', 'false'),
    btnSkinCyber: button('btnSkinCyber', 'false'),
    btnSkinLofi: button('btnSkinLofi', 'false')
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
  buttons.btnSkinArcade.onclick();
  assert.equal(sandbox.document.documentElement.skin, 'arcade');
  assert.equal(buttons.btnSkinArcade.pressed, 'true');
  buttons.btnSkinHolo.onclick();
  assert.equal(sandbox.document.documentElement.skin, 'holo');
  assert.equal(buttons.btnSkinHolo.pressed, 'true');
  buttons.btnSkinHyper.onclick();
  assert.equal(sandbox.document.documentElement.skin, 'hyper');
  assert.equal(buttons.btnSkinHyper.pressed, 'true');
  buttons.btnSkinPixel.onclick();
  assert.equal(sandbox.document.documentElement.skin, 'pixel');
  assert.equal(store.hcsLiveClassPlus_skin_v1, 'pixel');
  assert.equal(buttons.btnSkinPixel.pressed, 'true');
  buttons.btnSkinCyber.onclick();
  assert.equal(sandbox.document.documentElement.skin, 'cyber');
  assert.equal(store.hcsLiveClassPlus_skin_v1, 'cyber');
  assert.equal(buttons.btnSkinCyber.pressed, 'true');
  buttons.btnSkinLofi.onclick();
  assert.equal(sandbox.document.documentElement.skin, 'lofi');
  assert.equal(store.hcsLiveClassPlus_skin_v1, 'lofi');
  assert.equal(buttons.btnSkinLofi.pressed, 'true');
  buttons.btnSkinMinimalist.onclick();
  assert.equal(sandbox.document.documentElement.skin, 'minimalist');
  buttons.btnSkinDefault.onclick();
  assert.equal(sandbox.document.documentElement.skin, null);
  assert.equal(store.hcsLiveClassPlus_skin_v1, 'default');
});

test('Spark, Arcade, Holo, and Hyper packs note, burst, rank, and clear through the host', function () {
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
  run(sandbox, arcadeJs, 'arcade.js');
  run(sandbox, holoJs, 'holo.js');
  run(sandbox, hyperJs, 'hyper.js');
  run(sandbox, pixelJs, 'pixel.js');
  run(sandbox, cyberJs, 'cyber.js');
  run(sandbox, lofiJs, 'lofi.js');
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

  skin = 'arcade';
  assert.equal(sandbox.HcsSkinHost.scoreFloat(1).className, 'arcade-burst');
  const arcadeChrome = sandbox.HcsSkinHost.deskChrome(st, t + 2);
  assert.match(arcadeChrome.className, /\barcade-tier-1\b/);
  assert.match(arcadeChrome.badge, /class="arcade-tier-badge">1P ★ 1st</);
  assert.match(arcadeChrome.fire, />COMBO!</);

  skin = 'holo';
  assert.equal(sandbox.HcsSkinHost.scoreFloat(1).className, 'holo-burst');
  const holoChrome = sandbox.HcsSkinHost.deskChrome(st, t + 2);
  assert.match(holoChrome.className, /\bholo-tier-1\b/);
  assert.match(holoChrome.badge, /class="holo-tier-badge">◆ TIER I · 1st</);
  assert.match(holoChrome.fire, />OVERDRIVE</);

  skin = 'hyper';
  assert.equal(sandbox.HcsSkinHost.scoreFloat(1).className, 'hyper-burst');
  const hyperChrome = sandbox.HcsSkinHost.deskChrome(st, t + 2);
  assert.match(hyperChrome.className, /\bhyper-tier-1\b/);
  assert.match(hyperChrome.badge, /class="hyper-tier-badge">👑 CHAMP · 1st</);
  assert.match(hyperChrome.fire, />HYPER NOVA!</);

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

test('Pixel, Cyber, and Lo-Fi packs execute custom classroom mechanics (combo timer, live uplink sort, loyalty stamps)', function () {
  const sandbox = freshContext();
  let skin = 'pixel';
  sandbox.document = {
    documentElement: {
      getAttribute: function (name) { return name === 'data-skin' ? skin : null; }
    },
    querySelectorAll: function () { return []; }
  };
  run(sandbox, loaderSrc, 'loader.js');
  run(sandbox, sparkFireSrc, 'spark-fire.js');
  run(sandbox, sparkJs, 'spark.js');
  run(sandbox, arcadeJs, 'arcade.js');
  run(sandbox, holoJs, 'holo.js');
  run(sandbox, hyperJs, 'hyper.js');
  run(sandbox, pixelJs, 'pixel.js');
  run(sandbox, cyberJs, 'cyber.js');
  run(sandbox, lofiJs, 'lofi.js');

  const stA = { id: 'a', classNo: '2', score: 10, sparkPts: [] };
  const stB = { id: 'b', classNo: '1', score: 2, sparkPts: [] };
  const cls = { students: [stA, stB] };
  sandbox.HcsSkinHost.attach({
    getClass: function () { return cls; },
    leaderboardTab: function () { return 'students'; },
    renderLeaderboard: function () {},
    formatRankOrdinal: function (n) { return n === 1 ? '1st' : '2nd'; }
  });

  const t = 1000000;
  // 1. Pixel combo chain & critical float + CONTINUE? undo state
  sandbox.HcsSkinHost.noteScore(stA, 1, t);
  sandbox.HcsSkinHost.noteScore(stA, 3, t + 2000);
  assert.equal(sandbox.HcsSkinHost.scoreFloat(1).className, 'pixel-burst');
  assert.equal(sandbox.HcsSkinHost.scoreFloat(3).className, 'pixel-burst-crit');
  const pxChrome = sandbox.HcsSkinHost.deskChrome(stA, t + 3000);
  assert.match(pxChrome.className, /\bpixel-chain-2\b/);
  assert.match(pxChrome.badge, /1P HI-SCORE/);
  assert.match(pxChrome.fire, /2x SUPER/);
  assert.match(pxChrome.fire, /pixel-combo-fill/);
  sandbox.HcsSkinHost.undoScore(stA, 1, t + 4000);
  const pxUndo = sandbox.HcsSkinHost.deskChrome(stA, t + 5000);
  assert.match(pxUndo.className, /\bpixel-continue-state\b/);
  assert.match(pxUndo.fire, /CONTINUE\? 9\.\.\./);

  // 2. Cyber live uplink sortStudents & Street Cred tier
  skin = 'cyber';
  sandbox.HcsSkinHost.noteScore(stB, 1, t + 6000);
  const cyberSorted = sandbox.HcsSkinHost.sortStudents(cls.students);
  assert.equal(cyberSorted[0].id, 'b'); // Lower total score, but most recent active uplink!
  const cyChrome = sandbox.HcsSkinHost.deskChrome(stB, t + 6500);
  assert.match(cyChrome.className, /\bcyber-uplink-live\b/);
  assert.match(cyChrome.fire, /LIVE UPLINK/);
  const cyBoard = sandbox.HcsSkinHost.leaderboardChrome(stB, t + 6500);
  assert.match(cyBoard.fire, /\[LIVE UPLINK\]/);
  assert.equal(sandbox.HcsSkinHost.scoreFloat(1).className, 'cyber-burst');

  // 3. Lo-Fi 5-stamp cafe loyalty card mechanic
  skin = 'lofi';
  stB.score = 5;
  sandbox.HcsSkinHost.noteScore(stB, 1, t + 7000);
  const lfChrome = sandbox.HcsSkinHost.deskChrome(stB, t + 7500);
  assert.match(lfChrome.className, /\blofi-regular\b/);
  assert.match(lfChrome.badge, /HOUSE REGULAR/);
  assert.match(lfChrome.fire, /lofi-stamp-card/);
  assert.equal(sandbox.HcsSkinHost.scoreFloat(1).className, 'lofi-burst');
});

test('All DLC stylesheets scope rules under html[data-skin="<id>"] and never override .desk-card position: absolute', function () {
  [
    { id: 'arcade', css: arcadeCss },
    { id: 'holo', css: holoCss },
    { id: 'hyper', css: hyperCss },
    { id: 'pixel', css: pixelCss },
    { id: 'cyber', css: cyberCss },
    { id: 'lofi', css: lofiCss }
  ].forEach(function (pack) {
    assert.match(pack.css, new RegExp('\\.studio-mark img\\.studio-mark-default'));
    assert.match(pack.css, new RegExp('html\\[data-skin="' + pack.id + '"\\] #studioHeader'));
    assert.match(pack.css, new RegExp('html\\[data-skin="' + pack.id + '"\\] \\.desk-card'));
    assert.match(pack.css, new RegExp('\\.' + pack.id + '-tier-badge[\\s\\S]*?display:\\s*none;'));
    assert.doesNotMatch(pack.css, /html\[data-skin="minimalist"\]/);
    assert.doesNotMatch(pack.css, /html\[data-skin="spark"\]/);
    assert.doesNotMatch(pack.css, new RegExp('html\\[data-skin="' + pack.id + '"\\]\\s*\\.desk-card\\s*\\{[^}]*position\\s*:\\s*relative', 'i'));
    assert.doesNotMatch(pack.css, new RegExp('html\\[data-skin="' + pack.id + '"\\]\\s*\\.desk-card\\s*\\{[^}]*clip-path\\s*:', 'i'));
  });
});
