const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const day = fs.readFileSync(path.join(__dirname, 'assets/hcs-live-class-day.svg'), 'utf8');

test('default document does not set a skin attribute', function () {
  assert.match(html, /<html lang="en">/);
  assert.doesNotMatch(html, /<html[^>]*data-skin=/);
});

test('Bright mark stays the default mast image', function () {
  assert.match(html, /class="studio-mark-default" src="assets\/hcs-live-class-bright\.svg\?v=20261031a"/);
  assert.match(html, /class="studio-mark-day" src="assets\/hcs-live-class-day\.svg\?v=20261101b" alt="HCS Live Class" width="380" height="86"/);
});

test('Skin control is on the toolbar and persists in localStorage', function () {
  assert.match(html, /aria-label="Skin"/);
  assert.match(html, /id="btnSkinDefault"[^>]*>Default</);
  assert.match(html, /id="btnSkinMinimalist"[^>]*>Minimalist</);
  assert.match(html, /id="btnSkinDefault"[\s\S]*id="btnSkinMinimalist"/);
  assert.doesNotMatch(html, /id="btnSkinSpark"/);
  assert.doesNotMatch(html, />Spark</);
  assert.match(html, /skhhcss_eng_hcs_live_class_skin_v1/);
  assert.match(html, /setAttribute\("data-skin", "minimalist"\)/);
  assert.doesNotMatch(html, /setAttribute\("data-skin", "spark"\)/);
  assert.match(html, /removeAttribute\("data-skin"\)/);
  assert.doesNotMatch(html, /src="spark-fire\.js"/);
  assert.doesNotMatch(html, /SparkFire/);
  assert.doesNotMatch(html, /applySkin\("spark"\)/);
});

test('a saved Spark value loads as Default', function () {
  const boot = html.slice(html.indexOf('<script>'), html.indexOf('</script>'));
  assert.match(boot, /savedSkin === "spark"/);
  assert.match(boot, /savedSkin = "default"/);
  assert.match(boot, /localStorage\.setItem\(KEY, "default"\)/);
  assert.match(boot, /removeAttribute\("data-skin"\)/);
  assert.doesNotMatch(boot, /setAttribute\("data-skin", "spark"\)/);
  assert.doesNotMatch(html, /html\[data-skin="spark"\]/);
});

test('Minimalist overrides are gated and use the approved tokens', function () {
  assert.match(html, /html\[data-skin="minimalist"\]/);
  assert.match(html, /--skin-bg: #fff/);
  assert.match(html, /--skin-line: #e2e8f0/);
  assert.match(html, /--skin-text: #0f172a/);
  assert.match(html, /--skin-muted: #64748b/);
  assert.match(html, /--skin-accent: #2a8fad/);
  const root = html.slice(html.indexOf(':root {'), html.indexOf('body {'));
  assert.doesNotMatch(root, /--skin-/);
});

test('Day logo is the indigo-to-teal mark', function () {
  assert.match(day, /viewBox="6 16 380 86"/);
  assert.match(day, /font-size="44"/);
  assert.match(day, /y="50"/);
  assert.match(day, /y="100"/);
  assert.match(day, /#818cf8/);
  assert.match(day, /#2a8fad/);
  assert.match(day, /#334155/);
  assert.match(day, /HCS Live Class/);
  assert.doesNotMatch(day, /#22d3ee/);
  assert.doesNotMatch(day, /#f8fafc/);
});

test('Minimalist uses the Day mark and Default keeps Bright', function () {
  assert.match(html, /html\[data-skin="minimalist"\] \.studio-mark img\.studio-mark-default \{\s*display: none;/);
  assert.match(html, /html\[data-skin="minimalist"\] \.studio-mark img\.studio-mark-day \{\s*display: block;/);
  assert.match(html, /html:not\(\[data-skin\]\) #btnSkinDefault/);
  assert.doesNotMatch(html, /html:not\(\[data-skin="minimalist"\]\) #btnSkinDefault/);
  assert.doesNotMatch(html, /html\[data-skin="spark"\]/);
});

test('score floats stay on the shared plus and minus path', function () {
  assert.match(html, /floatEl\.className = 'score-float '/);
  assert.match(html, /@keyframes floatUpFade/);
  assert.doesNotMatch(html, /score-burst/);
  assert.doesNotMatch(html, /data-skin'\) === 'spark'/);
});

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
      if (/^@keyframes\b/.test(header)) fn(header, body, true);
      else if (/^@media\b/.test(header)) walkCssRules(body, fn);
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
    fn(selector, s.slice(open + 1, k - 1), false);
    i = k;
  }
}

test('Spark fire, burst, and tier chrome are gone', function () {
  var css = html.slice(html.indexOf('<style>'), html.lastIndexOf('</style>'));
  var sparkToken = /score-burst|spark-tier|spark-fire|sparkBurst|sparkRing|emberPulse|spark-burn|sparkMesh|On fire|data-skin="spark"/;
  assert.doesNotMatch(css, sparkToken);
  walkCssRules(css, function (selector, body) {
    assert.doesNotMatch(selector + body, sparkToken);
  });
  assert.doesNotMatch(html, />On fire</);
  assert.doesNotMatch(html, /class="spark-/);
  assert.doesNotMatch(html, /spark-fire\.js/);
  assert.equal(fs.existsSync(path.join(__dirname, 'spark-fire.js')), false);
  assert.equal(fs.existsSync(path.join(__dirname, 'spark-fire.test.cjs')), false);
  assert.match(html, /family=Fredoka:wght@500;600;700&family=Inter:wght@400;500;600;700;800/);
  assert.equal((html.match(/fonts\.googleapis\.com/g) || []).length, 2);
  assert.match(html, /html\[data-skin="minimalist"\]/);
  assert.match(html, /--skin-bg: #fff/);
});

test('Tidy, Assign, Clear, Group, and Snap chrome stay on the Default master', function () {
  assert.match(html, /id="btnQuickAddGroup"[\s\S]*id="btnTidyLayout"[\s\S]*id="btnOpenGroupModal"/);
  assert.match(html, /id="btnTidyLayout"[^>]*title="Snap desks to this layout — doesn’t move who sits where\."/);
  assert.match(html, /id="btnTidyLayout"[^>]*class="[^"]*px-2\.5 py-1 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 border border-sky-300 text-xs font-bold inline-flex items-center gap-1/);
  assert.match(html, /id="btnTidyLayout"[^>]*>\s*<span>Tidy<\/span>\s*<\/button>/);
  assert.doesNotMatch(html, /id="btnTidyLayout"[\s\S]{0,220}📐/);
  assert.match(html, /id="btnOpenGroupModal"[^>]*>\s*<span>Manage Groups<\/span>\s*<\/button>/);
  assert.doesNotMatch(html, /id="btnOpenGroupModal"[\s\S]{0,220}🛡️/);
  assert.match(html, /#btnTidyLayout \{\s*background-color: #e0f2fe;\s*color: #0369a1;\s*border: 1px solid #7dd3fc;/);
  assert.match(html, /aria-label="Assign Groups">\s*<span id="groupBrushBtnLabel">Assign<\/span>/);
  assert.doesNotMatch(html, /id="btnToggleGroupBrush"[\s\S]{0,400}🎨/);
  assert.match(html, /id="btnClearGroups"[^>]*aria-label="Clear Groups">\s*Clear\s*<\/button>/);
  assert.match(html, /aria-label="Cluster by Groups">Groups<\/button>/);
  assert.doesNotMatch(html, /id="btnToggleSnapGrid"[\s\S]{0,280}📏/);
  assert.doesNotMatch(html, /data-layout="groupClusters"[\s\S]{0,280}🧲/);
  assert.match(html, /id="studioToolbarRow"[^>]*flex flex-wrap/);
  assert.match(html, /studio-band-label">REGISTER<\/span>[\s\S]*studio-band-label">HISTORY<\/span>[\s\S]*studio-band-label">SEATING<\/span>[\s\S]*studio-band-label">SCORES<\/span>[\s\S]*studio-band-label">SKIN<\/span>/);
  assert.doesNotMatch(html, /studioToolbarRow[^>]*>[\s\S]*flex-nowrap/);
  assert.match(html, /id="applyGridModal"/);
  assert.match(html, /id="applyGridTitle"[^>]*>Apply a fresh grid\?<\/h3>/);
  assert.match(html, /This wipes the current desk positions and builds a fresh /);
  assert.match(html, /addEventListener\('click', requestApplyCustomGrid\)/);
  assert.match(html, /addEventListener\('click', tidyCurrentLayout\)/);
  var css = html.slice(html.indexOf('<style>'), html.lastIndexOf('</style>'));
  walkCssRules(css, function (selector, body, isKeyframes) {
    if (isKeyframes) return;
    if (!/btnTidyLayout|applyGridModal|btnConfirmApplyGrid|btnCancelApplyGrid/.test(selector)) return;
    assert.equal(selector.indexOf('html[data-skin="spark"]'), -1, selector);
    if (/btnTidyLayout/.test(selector)) {
      assert.equal(selector.indexOf('html[data-skin="minimalist"]'), -1, selector);
    }
  });
  assert.match(html, /html\[data-skin="minimalist"\] #btnCancelApplyGrid/);
  assert.match(html, /html\[data-skin="minimalist"\] #btnConfirmApplyGrid/);
  assert.match(html, /html\[data-skin="minimalist"\] #applyGridModal \.shadow-2xl/);
  assert.match(html, /html\[data-skin="minimalist"\] #studioToolbarRow button/);
  assert.match(html, /#studioToolbarRow button,[\s\S]*?#groupBrushBar button \{[\s\S]*?border-width: 1px/);

  assert.doesNotMatch(html, /html\[data-skin="spark"\] #studioToolbarRow button/);
});
