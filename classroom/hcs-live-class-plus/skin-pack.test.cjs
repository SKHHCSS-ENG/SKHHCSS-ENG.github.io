const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const here = __dirname;
const registrySrc = fs.readFileSync(path.join(here, 'skins/registry.js'), 'utf8');
const loaderSrc = fs.readFileSync(path.join(here, 'skins/loader.js'), 'utf8');
const sparkJs = fs.readFileSync(path.join(here, 'skins/spark.js'), 'utf8');
const sparkCss = fs.readFileSync(path.join(here, 'skins/spark.css'), 'utf8');
const arcadeJs = fs.readFileSync(path.join(here, 'skins/arcade.js'), 'utf8');
const arcadeCss = fs.readFileSync(path.join(here, 'skins/arcade.css'), 'utf8');
const pitwallJs = fs.readFileSync(path.join(here, 'skins/pitwall.js'), 'utf8');
const pitwallCss = fs.readFileSync(path.join(here, 'skins/pitwall.css'), 'utf8');
const sakuraJs = fs.readFileSync(path.join(here, 'skins/sakura.js'), 'utf8');
const sakuraCss = fs.readFileSync(path.join(here, 'skins/sakura.css'), 'utf8');
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

test('registry knows Spark, Arcade, Pitwall, and Sakura and not the core skins', function () {
  const sandbox = freshContext();
  run(sandbox, registrySrc, 'registry.js');
  assert.equal(sandbox.HcsSkinRegistry.known('spark'), true);
  assert.equal(sandbox.HcsSkinRegistry.known('arcade'), true);
  assert.equal(sandbox.HcsSkinRegistry.known('pitwall'), true);
  assert.equal(sandbox.HcsSkinRegistry.known('sakura'), true);
  assert.equal(sandbox.HcsSkinRegistry.known('minimalist'), false);
  assert.equal(sandbox.HcsSkinRegistry.known('default'), false);
  assert.equal(sandbox.HcsSkinRegistry.known(''), false);
  assert.equal(sandbox.HcsSkinRegistry.known(null), false);
  assert.equal(sandbox.HcsSkinRegistry.packs.length, 4);
  assert.equal(sandbox.HcsSkinRegistry.packs[0].id, 'spark');
  assert.equal(sandbox.HcsSkinRegistry.packs[1].id, 'arcade');
  assert.equal(sandbox.HcsSkinRegistry.packs[2].id, 'pitwall');
  assert.equal(sandbox.HcsSkinRegistry.packs[3].id, 'sakura');
  assert.equal(sandbox.HcsSkinRegistry.packs[0].css, 'skins/spark.css');
  assert.equal(sandbox.HcsSkinRegistry.packs[1].css, 'skins/arcade.css');
  assert.equal(sandbox.HcsSkinRegistry.packs[2].css, 'skins/pitwall.css');
  assert.equal(sandbox.HcsSkinRegistry.packs[3].css, 'skins/sakura.css');
});

test('boot writes pack stylesheets and mount writes Spark, Arcade, Pitwall, and Sakura skin buttons', function () {
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
  assert.match(bootHtml, /<link rel="stylesheet" href="skins\/pitwall\.css">/);
  assert.match(bootHtml, /<link rel="stylesheet" href="skins\/sakura\.css">/);

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
  assert.match(mountHtml, /id="btnSkinPitwall"[^>]*>Pitwall</);
  assert.match(mountHtml, /id="btnSkinSakura"[^>]*>Sakura</);
  assert.match(mountHtml, /class="skin-choice"/);
  assert.match(mountHtml, /data-skin-pack="spark"/);
  assert.match(mountHtml, /data-skin-pack="arcade"/);
  assert.match(mountHtml, /data-skin-pack="pitwall"/);
  assert.match(mountHtml, /data-skin-pack="sakura"/);
});

test('wire applies Default, Minimalist, Spark, Arcade, Pitwall, and Sakura without hardcoded pack branches', function () {
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
    btnSkinPitwall: button('btnSkinPitwall', 'false'),
    btnSkinSakura: button('btnSkinSakura', 'false')
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
  buttons.btnSkinPitwall.onclick();
  assert.equal(sandbox.document.documentElement.skin, 'pitwall');
  assert.equal(buttons.btnSkinPitwall.pressed, 'true');
  buttons.btnSkinSakura.onclick();
  assert.equal(sandbox.document.documentElement.skin, 'sakura');
  assert.equal(buttons.btnSkinSakura.pressed, 'true');
  buttons.btnSkinMinimalist.onclick();
  assert.equal(sandbox.document.documentElement.skin, 'minimalist');
  buttons.btnSkinDefault.onclick();
  assert.equal(sandbox.document.documentElement.skin, null);
  assert.equal(store.hcsLiveClassPlus_skin_v1, 'default');
});

test('Spark, Arcade, Pitwall, and Sakura packs note, burst, rank, and clear through the host', function () {
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
  run(sandbox, pitwallJs, 'pitwall.js');
  run(sandbox, sakuraJs, 'sakura.js');
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

  skin = 'pitwall';
  assert.equal(sandbox.HcsSkinHost.scoreFloat(1).className, 'pitwall-burst');
  const pitwallChrome = sandbox.HcsSkinHost.deskChrome(st, t + 2);
  assert.match(pitwallChrome.className, /\bpitwall-tier-1\b/);
  assert.match(pitwallChrome.badge, /class="pitwall-tier-badge">P1 🏆 1st</);
  assert.match(pitwallChrome.fire, />OVERTAKE</);

  skin = 'sakura';
  assert.equal(sandbox.HcsSkinHost.scoreFloat(1).className, 'sakura-burst');
  const sakuraChrome = sandbox.HcsSkinHost.deskChrome(st, t + 2);
  assert.match(sakuraChrome.className, /\bsakura-tier-1\b/);
  assert.match(sakuraChrome.badge, /class="sakura-tier-badge">🌸 1st</);
  assert.match(sakuraChrome.fire, />FULL BLOOM</);

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

test('All packs keep Chance overlays as a dim scrim, use solid non-white window shells and borders, and style darkened prompts light gold', function () {
  assert.match(sparkCss, /--spark-font-display:\s*'Syne',\s*'Outfit',\s*var\(--font-display\)/);
  assert.match(arcadeCss, /--arcade-font-display:\s*'Orbitron',\s*'Chakra Petch',\s*var\(--font-display\)/);
  assert.match(pitwallCss, /--pitwall-font-display:\s*'Russo One',\s*'Chakra Petch',\s*var\(--font-display\)/);
  assert.match(sakuraCss, /--sakura-font-display:\s*'M PLUS Rounded 1c',\s*'Quicksand',\s*var\(--font-display\)/);

  [
    { id: 'spark', js: sparkJs, css: sparkCss, shellBg: '#1a0a3c', shellBorder: '3px solid #00f5d4', promptColor: '#fff7ad' },
    { id: 'arcade', js: arcadeJs, css: arcadeCss, shellBg: '#fefce8', shellBorder: '3px solid #090d16', promptColor: '#fef08a' },
    { id: 'pitwall', js: pitwallJs, css: pitwallCss, shellBg: '#161922', shellBorder: '3px solid #ff8000', promptColor: '#fde68a' },
    { id: 'sakura', js: sakuraJs, css: sakuraCss, shellBg: '#ffe4ee', shellBorder: '3px solid #f472b6', promptColor: '#831843' }
  ].forEach(function (pack) {
    assert.match(pack.css, new RegExp('html\\[data-skin="' + pack.id + '"\\]\\s*#timerPopover\\s*\\{[\\s\\S]*?background(?:-color)?:\\s*' + pack.shellBg + ';[\\s\\S]*?border:\\s*' + pack.shellBorder + ';'));
    assert.match(pack.css, new RegExp('html\\[data-skin="' + pack.id + '"\\]\\s*#pickerModal\\s*\\.picker-dialog\\s*\\{[\\s\\S]*?background(?:-color)?:\\s*' + pack.shellBg + ';[\\s\\S]*?border:\\s*' + pack.shellBorder + ';'));
    assert.match(pack.css, new RegExp('html\\[data-skin="' + pack.id + '"\\]\\s*\\.' + pack.id + '-chance-prompt\\s*\\{[\\s\\S]*?color:\\s*' + pack.promptColor));
    assert.doesNotMatch(pack.css, /border:\s*[23]px solid transparent/);

    const sandbox = freshContext();
    let skin = pack.id;
    function makeClassList(initial) {
      const set = new Set(initial || []);
      return {
        add: function (c) { set.add(c); },
        remove: function (c) { set.delete(c); },
        contains: function (c) { return set.has(c); }
      };
    }
    const titleNode = { textContent: 'Chance', classList: makeClassList() };
    const promptNode = { textContent: 'Speak for 20 seconds about your weekend!', classList: makeClassList() };
    const cardNode = { classList: makeClassList(['chance-card']) };
    const innerPanel = {
      classList: makeClassList(['chance-panel']),
      parentNode: null
    };
    const overlayDialog = {
      id: 'chanceSheet',
      classList: makeClassList(['fixed', 'inset-0']),
      firstElementChild: innerPanel,
      parentNode: null,
      querySelector: function (sel) {
        if (/chance-panel/.test(sel)) return innerPanel;
        return null;
      },
      querySelectorAll: function (sel) {
        if (/h1, h2, h3/.test(sel)) return [titleNode];
        if (/chancePrompt/.test(sel)) return [promptNode];
        if (/chanceCard/.test(sel)) return [cardNode];
        return [];
      }
    };
    innerPanel.parentNode = overlayDialog;
    titleNode.parentNode = innerPanel;

    sandbox.document = {
      body: {},
      documentElement: {
        getAttribute: function (name) { return name === 'data-skin' ? skin : null; }
      },
      querySelectorAll: function (sel) {
        if (sel === '[role="dialog"], [role="alertdialog"], #chanceSheet, #chanceModal, .chance-sheet, .chance-modal') {
          return [overlayDialog];
        }
        return [];
      }
    };
    overlayDialog.parentNode = sandbox.document.body;

    run(sandbox, loaderSrc, 'loader.js');
    run(sandbox, sparkFireSrc, 'spark-fire.js');
    run(sandbox, pack.js, pack.id + '.js');
    sandbox.HcsSkinHost.refresh();

    assert.equal(overlayDialog.classList.contains(pack.id + '-chance-sheet'), true);
    assert.equal(overlayDialog.classList.contains(pack.id + '-chance-panel'), false);
    assert.equal(innerPanel.classList.contains(pack.id + '-chance-panel'), true);
    assert.equal(cardNode.classList.contains(pack.id + '-chance-card'), true);
    assert.equal(promptNode.classList.contains(pack.id + '-chance-prompt'), true);
  });
});

test('All DLC stylesheets scope rules under html[data-skin="<id>"] and restyle buttons, popups, fonts, and animated backgrounds', function () {
  [
    { id: 'spark', css: sparkCss, js: sparkJs, pageAnim: 'sparkPrismDrift', floorAnim: 'sparkFloorAurora' },
    { id: 'arcade', css: arcadeCss, js: arcadeJs, pageAnim: 'arcadePageMesh', floorAnim: 'arcadeFloorMesh' },
    { id: 'pitwall', css: pitwallCss, js: pitwallJs, pageAnim: 'pitwallPageMesh', floorAnim: 'pitwallFloorMesh' },
    { id: 'sakura', css: sakuraCss, js: sakuraJs, pageAnim: 'sakuraPageMesh', floorAnim: 'sakuraFloorMesh' }
  ].forEach(function (pack) {
    assert.match(pack.css, new RegExp('\\.studio-mark img\\.studio-mark-default'));
    assert.match(pack.css, new RegExp('html\\[data-skin="' + pack.id + '"\\] body'));
    assert.match(pack.css, new RegExp('html\\[data-skin="' + pack.id + '"\\] #studioHeader'));
    assert.match(pack.css, new RegExp('html\\[data-skin="' + pack.id + '"\\] \\.classroom-floor'));
    assert.match(pack.css, new RegExp('html\\[data-skin="' + pack.id + '"\\] \\.desk-card'));
    assert.match(pack.css, new RegExp('html\\[data-skin="' + pack.id + '"\\] #timerPopover'));
    assert.match(pack.css, new RegExp('html\\[data-skin="' + pack.id + '"\\] #pickerModal'));
    assert.match(pack.css, new RegExp('html\\[data-skin="' + pack.id + '"\\] \\.wb-sheet'));
    assert.match(pack.css, new RegExp('html\\[data-skin="' + pack.id + '"\\] #chanceSheet'));
    assert.match(pack.css, new RegExp('html\\[data-skin="' + pack.id + '"\\] #btnMore'));
    assert.match(pack.css, new RegExp('html\\[data-skin="' + pack.id + '"\\] #btnChance'));
    assert.match(pack.css, new RegExp('@keyframes ' + pack.pageAnim));
    assert.match(pack.css, new RegExp('@keyframes ' + pack.floorAnim));
    assert.match(pack.css, new RegExp('\\.' + pack.id + '-tier-badge[\\s\\S]*?display:\\s*none;'));
    assert.doesNotMatch(pack.css, /html\[data-skin="minimalist"\]/);
    assert.doesNotMatch(pack.css, new RegExp('html\\[data-skin="' + pack.id + '"\\]\\s*\\.desk-card\\s*\\{[^}]*position\\s*:\\s*relative', 'i'));
    assert.doesNotMatch(pack.css, new RegExp('html\\[data-skin="' + pack.id + '"\\]\\s*\\.desk-card\\s*\\{[^}]*clip-path\\s*:', 'i'));
    assert.doesNotMatch(pack.css + '\n' + pack.js, /monopoly/i);
  });
});
