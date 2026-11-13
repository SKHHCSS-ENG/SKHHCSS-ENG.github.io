const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const chance = require('./chance.js');

const here = __dirname;
const html = fs.readFileSync(path.join(here, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(here, 'chance.js'), 'utf8');
const sparkCss = fs.readFileSync(path.join(here, 'skins/spark.css'), 'utf8');
const arcadeCss = fs.readFileSync(path.join(here, 'skins/arcade.css'), 'utf8');
const sparkJs = fs.readFileSync(path.join(here, 'skins/spark.js'), 'utf8');
const arcadeJs = fs.readFileSync(path.join(here, 'skins/arcade.js'), 'utf8');

const PROMPTS = [
  'Lucky! Choose a classmate to draw the next card.',
  'You have 15 seconds: name as many snacks as you can, in English.',
  'Mime a verb. The class has three guesses.',
  'Pass this card to any classmate — they must do it.',
  'Lucky! You may sit this one out, or pick the next player.',
  'Stand up and introduce the person on your left as if they were a superhero.',
  'Speak for 20 seconds about your favourite snack. If you pause, start again.',
  'Act out your trip to school this morning. No words. The class guesses how you got here.',
  'Give a dramatic one-sentence compliment to someone in the class.',
  'Whisper an English word to a classmate. They must use it in a sentence out loud.',
  'Lucky! Draw again — this one is a bonus turn.',
  'Oops! The whole class helps you finish this sentence: “This morning, I…”'
];

const BONUS = PROMPTS[10];

function sha256(rel) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(here, rel))).digest('hex');
}

function mulberry32(seed) {
  var a = seed >>> 0;
  return function () {
    a |= 0;
    a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

test('More is a 32px chip after Tools and before Fullscreen', function () {
  assert.match(html, /--studio-header-chip:\s*32px/);
  assert.match(html, /id="btnMore"[^>]*title="More"/);
  assert.match(html, /id="btnMore"[^>]*aria-label="More"/);
  assert.match(html, /id="btnMore"[^>]*>➕<\/button>/);
  assert.doesNotMatch(html, /id="btnMore"[^>]*aria-label="\+"/);
  assert.match(html, /#btnMore,\s*#btnStudioFullscreen,\s*#btnToggleHeaderBanner\s*\{[^}]*width:\s*var\(--studio-header-chip\)/);
  assert.match(html, /#btnMore\s*\{[^}]*height:\s*var\(--studio-header-chip\)/);
  assert.match(html, /#btnMore\s*\{[^}]*min-height:\s*var\(--studio-header-chip\)/);

  var toolsAt = html.indexOf('edit-switch-name">Tools</span>');
  var moreAt = html.indexOf('id="btnMore"');
  var fullAt = html.indexOf('id="btnStudioFullscreen"');
  var collapseAt = html.indexOf('id="btnToggleHeaderBanner"');
  assert.ok(toolsAt > 0 && moreAt > toolsAt && fullAt > moreAt && collapseAt > fullAt);

  var utils = html.slice(html.indexOf('id="studioHeaderUtilities"'), html.indexOf('class="studio-header-pin"'));
  assert.doesNotMatch(utils, /id="btnMore"/);
  var pin = html.slice(html.indexOf('class="studio-header-pin"'), html.indexOf('</header>'));
  assert.match(pin, /id="btnMore"/);
  assert.ok(pin.indexOf('id="btnMore"') < pin.indexOf('id="btnStudioFullscreen"'));
});

test('Chance is the first More item and later extras stay in that menu', function () {
  var menu = html.slice(html.indexOf('id="moreMenuList"'), html.indexOf('id="btnStudioFullscreen"'));
  assert.match(menu, /role="menu"/);
  assert.match(menu, /aria-label="More"/);
  var actions = menu.match(/data-more-action="[^"]+"/g);
  assert.deepEqual(actions, ['data-more-action="chance"']);
  assert.match(menu, /data-more-action="chance"[^>]*>Chance<\/button>/);
  assert.match(menu, /Later Plus extras go in this menu/);
  assert.match(js, /MORE_ACTIONS/);
  assert.match(js, /data-more-action/);
  assert.doesNotMatch(sparkJs + arcadeJs + sparkCss + arcadeCss, /id="btnMore"|id="chanceSheet"|data-more-action="chance"/);
});

test('More menu paints above Zoom the same way the Skin menu does', function () {
  assert.match(html, /#studioToolbar\.is-skin-menu-open\s*\{[^}]*z-index:\s*45/);
  assert.match(html, /#studioHeader\.is-more-open\s*\{[^}]*z-index:\s*46/);
  assert.match(html, /\.zoom-chip\s*\{[^}]*z-index:\s*40/);
  assert.match(js, /is-more-open/);
  assert.match(html, /#chanceSheet\s*\{\s*z-index:\s*80;\s*\}/);
});

test('Chance sheet title, tip, and draw labels', function () {
  assert.equal(chance.TIP, 'Draw a card and follow the instruction.');
  assert.equal(chance.DRAW_LABEL, 'Draw a card');
  assert.equal(chance.REDRAW_LABEL, 'Draw again');
  assert.match(html, /id="chanceSheetTitle">Chance</);
  assert.match(html, /id="chanceTip"[^>]*>Draw a card and follow the instruction\.</);
  assert.match(html, /id="btnDrawChance"[^>]*>Draw a card</);
  assert.match(html, /id="btnCloseChanceSheet"[^>]*aria-label="Close"/);
  assert.match(js, /drawBtn\.textContent = api\.REDRAW_LABEL/);
  assert.match(js, /promptEl\.textContent = step\.prompt/);
  assert.match(html, /chance\.js\?v=20261113a/);
  assert.match(js, /Cache stamp: 20261113a/);
});

test('the 12 prompts match the locked set and the page never says Monopoly', function () {
  assert.equal(chance.CARDS.length, 12);
  assert.deepEqual(chance.CARDS.map(function (card) { return card.text; }), PROMPTS);
  assert.equal(chance.CARDS[10].bonus, true);
  assert.equal(chance.CARDS.filter(function (card) { return card.bonus; }).length, 1);
  assert.match(PROMPTS[6], /favourite/);
  assert.doesNotMatch(html + js, /monopoly/i);
  assert.doesNotMatch(PROMPTS.join('\n'), /monopoly/i);
});

test('a pack does not repeat until all 12 are used, then it may reshuffle', function () {
  var pack = chance.CARDS.slice();
  var seen = [];
  var shown = [];
  while (pack.length) {
    var step = chance.drawChance({ pack: pack }, function () {
      throw new Error('reshuffled before the pack was used');
    });
    step.consumed.forEach(function (text) {
      assert.equal(seen.indexOf(text), -1, 'repeated ' + text);
      seen.push(text);
    });
    assert.equal(shown.indexOf(step.prompt), -1);
    assert.notEqual(step.prompt, BONUS);
    assert.equal(step.prompt.indexOf('11'), -1);
    shown.push(step.prompt);
    pack = step.pack;
  }
  assert.equal(seen.length, 12);
  assert.equal(shown.length, 11);
  assert.deepEqual(seen.slice().sort(), PROMPTS.slice().sort());
});

test('the bonus card draws again from the remaining pack', function () {
  var next = chance.CARDS[9];
  var bonus = chance.CARDS[10];
  var step = chance.drawChance({ pack: [next, bonus] }, function () {
    throw new Error('remaining cards should be used before a reshuffle');
  });
  assert.equal(step.prompt, next.text);
  assert.deepEqual(step.consumed, [bonus.text, next.text]);
  assert.equal(step.pack.length, 0);
  assert.equal(step.reshuffled, false);

  var again = chance.drawChance({ pack: [bonus] }, function () { return 0; });
  assert.equal(again.reshuffled, true);
  assert.equal(again.consumed[0], BONUS);
  assert.equal(again.prompt, PROMPTS[0]);
  assert.notEqual(again.prompt, BONUS);
});

test('several full packs never show the bonus text or a repeat inside a pack', function () {
  [1, 2, 99, 12345].forEach(function (seed) {
    var rng = mulberry32(seed);
    var state = { pack: [] };
    var cycle = [];
    for (var n = 0; n < 40; n++) {
      var step = chance.drawChance(state, rng);
      assert.notEqual(step.prompt, BONUS);
      assert.equal(PROMPTS.indexOf(step.prompt) >= 0, true);
      step.consumed.forEach(function (text) {
        assert.equal(cycle.indexOf(text), -1, 'seed ' + seed + ' repeated ' + text);
        cycle.push(text);
        if (cycle.length === 12) cycle = [];
      });
      state = { pack: step.pack };
    }
  });
});

test('original Live Class is unchanged and Drive Save/Open stays wired', function () {
  var live = {
    'index.html': '41704bbc0998a9607e8b40d0c068095ba23d18725d1c9aca15015957937e8995',
    'studio-core.js': '7329f02cb1d149ef5e204e8e12d6ff377f3864a86ca4556ecb073e8bd533796f',
    'studio-drive.js': '29618949827a7653c0b7bce0e050f229e7eac6f61592eebc50d0abb12ba2ef5b',
    'whiteboard.js': '10b5ad194b83c860d20dccec6a6c882004ab713fb9114ffe7af7081e30963dd1',
    'whiteboard.css': '672868e38e8510222b2ad523e812aad007d76cb196ef47c599c2067168a450d9',
    'drive-config.js': '17bc21ef4820acd90462bf7a3583abc8480799dc1d416418b35e574b2abada9f'
  };
  Object.keys(live).forEach(function (name) {
    var text = fs.readFileSync(path.join(here, '../hcs-live-class', name), 'utf8');
    assert.equal(sha256(path.join('..', 'hcs-live-class', name)), live[name], name);
    assert.doesNotMatch(text, /id="btnMore"|id="chanceSheet"|id="btnDrawChance"|Draw a card and follow the instruction/);
  });
  assert.equal(sha256('studio-drive.js'), '2714b529226ebb0fe2fbacc0ef0df17c81a6ba7c0334f08006da6a3365051ef2');
  assert.equal(sha256('drive-config.js'), '06582ea43992c4c26abc75741e5891f790de04d7c00e5e464797d9bef35d57fa');
  assert.match(html, /<script src="drive-config\.js"><\/script>/);
  assert.match(html, /<script src="studio-drive\.js"><\/script>/);
  assert.match(html, /var SD = window\.StudioDrive/);
  assert.match(html, /SD\.fenceSaveTitle/);
  assert.match(html, /id="btnSaveOnline"[^>]*>\s*Save Online/);
  assert.match(html, /id="btnOpenPlan"[^>]*>\s*Load Online/);
});
