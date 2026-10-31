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
  assert.match(html, /class="studio-mark-day" src="assets\/hcs-live-class-day\.svg\?v=20261101a"/);
});

test('Skin control is on the toolbar and persists in localStorage', function () {
  assert.match(html, /aria-label="Skin"/);
  assert.match(html, /id="btnSkinDefault"[^>]*>Default</);
  assert.match(html, /id="btnSkinMinimalist"[^>]*>Minimalist</);
  assert.match(html, /skhhcss_eng_hcs_live_class_skin_v1/);
  assert.match(html, /setAttribute\("data-skin", "minimalist"\)/);
  assert.match(html, /removeAttribute\("data-skin"\)/);
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
  assert.match(day, /#818cf8/);
  assert.match(day, /#2a8fad/);
  assert.match(day, /HCS Live Class/);
  assert.doesNotMatch(day, /#22d3ee/);
});
