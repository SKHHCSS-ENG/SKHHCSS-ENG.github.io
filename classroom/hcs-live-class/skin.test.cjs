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
  assert.match(html, /id="btnSkinSpark"[^>]*>Spark</);
  assert.match(html, /id="btnSkinDefault"[\s\S]*id="btnSkinMinimalist"[\s\S]*id="btnSkinSpark"/);
  assert.match(html, /skhhcss_eng_hcs_live_class_skin_v1/);
  assert.match(html, /setAttribute\("data-skin", "minimalist"\)/);
  assert.match(html, /setAttribute\("data-skin", "spark"\)/);
  assert.match(html, /removeAttribute\("data-skin"\)/);
  assert.match(html, /src="spark-fire\.js"/);
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

test('Spark keeps Bright and leaves Day on Minimalist', function () {
  assert.match(html, /html\[data-skin="spark"\] \.studio-mark img\.studio-mark-default \{\s*display: block;/);
  assert.match(html, /html\[data-skin="spark"\] \.studio-mark img\.studio-mark-day \{\s*display: none;/);
  assert.match(html, /html\[data-skin="minimalist"\] \.studio-mark img\.studio-mark-day \{\s*display: block;/);
  assert.match(html, /html:not\(\[data-skin\]\) #btnSkinDefault/);
  assert.doesNotMatch(html, /html:not\(\[data-skin="minimalist"\]\) #btnSkinDefault/);
});

test('Spark burst is the +pts path only', function () {
  assert.match(html, /delta > 0 && document\.documentElement\.getAttribute\('data-skin'\) === 'spark'/);
  assert.match(html, /floatEl\.className = 'score-burst'/);
  assert.match(html, /floatEl\.className = 'score-float '/);
  assert.match(html, /@keyframes floatUpFade/);
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

test('Default and Minimalist never inherit Spark fire, burst, or tiers', function () {
  var css = html.slice(html.indexOf('<style>'), html.lastIndexOf('</style>'));
  var sawBurst = false;
  var sawBurstShown = false;
  var sawTier = false;
  var sawFire = false;
  var sawHide = false;
  walkCssRules(css, function (selector, body, isKeyframes) {
    var blob = selector + body;
    var sparkToken = /score-burst|spark-tier|spark-fire|sparkBurst|sparkRing|emberPulse/;
    if (isKeyframes) {
      if (sparkToken.test(blob)) {
        assert.match(selector, /@keyframes\s+(sparkBurst|sparkRing|emberPulse)\b/);
      }
      return;
    }
    if (!sparkToken.test(blob)) return;
    if (selector.indexOf('html[data-skin="spark"]') !== -1) {
      assert.equal(selector.indexOf('html[data-skin="minimalist"]'), -1);
      if (/score-burst/.test(selector)) sawBurst = true;
      if (selector.replace(/\s+/g, ' ').trim() === 'html[data-skin="spark"] .score-burst' && /display:\s*block/.test(body)) {
        sawBurstShown = true;
      }
      if (/spark-tier-1/.test(selector)) sawTier = true;
      if (/spark-fire/.test(selector)) sawFire = true;
      return;
    }
    sawHide = true;
    assert.doesNotMatch(selector, /minimalist|sparkBurst|sparkRing|emberPulse/);
    assert.match(selector, /\.spark-tier-badge/);
    assert.match(selector, /\.spark-fire/);
    assert.match(selector, /\.spark-fire-mini/);
    assert.match(selector, /\.score-burst/);
    assert.equal(body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ''), 'display:none;');
  });
  assert.equal(sawBurst, true);
  assert.equal(sawBurstShown, true);
  assert.equal(sawTier, true);
  assert.equal(sawFire, true);
  assert.equal(sawHide, true);
  assert.match(html, />On fire</);
  assert.match(html, /family=Fredoka:wght@500;600;700&family=Inter:wght@400;500;600;700;800/);
  assert.equal((html.match(/fonts\.googleapis\.com/g) || []).length, 2);
});

test('Spark On fire is one continuous burn, and the mast mesh loops without a cut', function () {
  assert.doesNotMatch(html, /spark-flame f1|class="spark-flame"|sparkBarShine|sparkFlameFlicker|spark-ember/);
  assert.match(html, /class="spark-burn-sheet"/);
  assert.match(html, /class="spark-burn-halo"/);
  assert.match(html, /class="spark-flame-wave w2"/);
  assert.match(html, /class="spark-flame-wave"/);
  assert.match(html, /M0,36 C14,36 12,14 24,18/);
  assert.match(html, /html\[data-skin="spark"\] \.spark-burn-sheet \{/);
  assert.match(html, /html\[data-skin="spark"\] #studioHeader::before \{[\s\S]*?width: 200%;[\s\S]*?animation: sparkMeshSlide 3\.6s linear infinite;/);
  assert.match(html, /html\[data-skin="spark"\] #studioHeader::after \{[\s\S]*?width: 200%;[\s\S]*?animation: sparkMeshSlide 5\.4s linear infinite reverse;/);
  assert.match(html, /@keyframes sparkMeshSlide \{\s*0% \{ transform: translateX\(0\); \}\s*100% \{ transform: translateX\(-50%\); \}\s*\}/);
  assert.match(html, /querySelector\('\.spark-burn-sheet'\)/);
  var css = html.slice(html.indexOf('<style>'), html.lastIndexOf('</style>'));
  walkCssRules(css, function (selector, body, isKeyframes) {
    if (isKeyframes) return;
    if (!/spark-burn|sparkMeshSlide|sparkBurnFlicker|sparkBurnCore/.test(selector + body)) return;
    assert.match(selector, /html\[data-skin="spark"\]/);
    assert.equal(selector.indexOf('html[data-skin="minimalist"]'), -1);
  });
});
