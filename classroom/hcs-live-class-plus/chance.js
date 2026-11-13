/**
 * Chance for HCS Live Class +.
 * One pack of 12. A draw does not repeat until every card has been used,
 * then the pack is shuffled again. The bonus card is used up and immediately
 * draws the next card from what is left. The page shows the prompt only.
 * Later Plus extras belong in #moreMenuList (data-more-action), not as new
 * header chips. Add the action on MORE_ACTIONS.
 * Cache stamp: 20261113a.
 */
(function (root) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { boot(api); });
    } else {
      boot(api);
    }
  }

  function factory() {
    var DRAW_LABEL = 'Draw a card';
    var REDRAW_LABEL = 'Draw again';
    var TIP = 'Draw a card and follow the instruction.';
    var CARDS = [
      { text: 'Lucky! Choose a classmate to draw the next card.' },
      { text: 'You have 15 seconds: name as many snacks as you can, in English.' },
      { text: 'Mime a verb. The class has three guesses.' },
      { text: 'Pass this card to any classmate — they must do it.' },
      { text: 'Lucky! You may sit this one out, or pick the next player.' },
      { text: 'Stand up and introduce the person on your left as if they were a superhero.' },
      { text: 'Speak for 20 seconds about your favourite snack. If you pause, start again.' },
      { text: 'Act out your trip to school this morning. No words. The class guesses how you got here.' },
      { text: 'Give a dramatic one-sentence compliment to someone in the class.' },
      { text: 'Whisper an English word to a classmate. They must use it in a sentence out loud.' },
      { text: 'Lucky! Draw again — this one is a bonus turn.', bonus: true },
      { text: 'Oops! The whole class helps you finish this sentence: “This morning, I…”' }
    ];

    function shuffle(list, random) {
      var copy = list.slice();
      var rand = typeof random === 'function' ? random : Math.random;
      for (var i = copy.length - 1; i > 0; i--) {
        var j = Math.floor(rand() * (i + 1));
        if (!(j >= 0 && j <= i)) j = i;
        var tmp = copy[i];
        copy[i] = copy[j];
        copy[j] = tmp;
      }
      return copy;
    }

    function drawChance(state, random) {
      var rand = typeof random === 'function' ? random : Math.random;
      var pack = state && Array.isArray(state.pack) ? state.pack.slice() : [];
      var consumed = [];
      var reshuffled = false;

      function take() {
        if (!pack.length) {
          pack = shuffle(CARDS, rand);
          reshuffled = true;
        }
        var card = pack.pop();
        consumed.push(card.text);
        return card;
      }

      function takeNonBonus() {
        for (var i = pack.length - 1; i >= 0; i--) {
          if (!pack[i].bonus) {
            var found = pack.splice(i, 1)[0];
            consumed.push(found.text);
            return found;
          }
        }
        var rest = [];
        for (var n = 0; n < CARDS.length; n++) {
          if (!CARDS[n].bonus) rest.push(CARDS[n]);
        }
        pack = shuffle(rest, rand);
        reshuffled = true;
        var card = pack.pop();
        consumed.push(card.text);
        return card;
      }

      var card = take();
      var hops = 0;
      while (card && card.bonus) {
        hops += 1;
        if (hops > CARDS.length) {
          card = takeNonBonus();
          break;
        }
        card = take();
      }

      return {
        prompt: card.text,
        pack: pack,
        consumed: consumed,
        reshuffled: reshuffled
      };
    }

    return {
      CARDS: CARDS,
      DRAW_LABEL: DRAW_LABEL,
      REDRAW_LABEL: REDRAW_LABEL,
      TIP: TIP,
      shuffle: shuffle,
      drawChance: drawChance
    };
  }

  function boot(api) {
    var header = document.getElementById('studioHeader');
    var more = document.querySelector('.more-menu');
    var btn = document.getElementById('btnMore');
    var list = document.getElementById('moreMenuList');
    var sheet = document.getElementById('chanceSheet');
    var card = document.getElementById('chanceCard');
    var promptEl = document.getElementById('chancePrompt');
    var drawBtn = document.getElementById('btnDrawChance');
    var closeBtn = document.getElementById('btnCloseChanceSheet');
    if (!header || !btn || !list || !sheet || !card || !promptEl || !drawBtn || !closeBtn) return;

    var pack = [];
    var drawn = false;

    function placeMenu() {
      list.classList.remove('is-align-start');
      var anchor = more || btn;
      var rect = anchor.getBoundingClientRect();
      var width = list.offsetWidth || 120;
      if (rect.right - width < 8) list.classList.add('is-align-start');
    }

    function menuOpen() {
      return !list.hidden;
    }

    function openMenu() {
      list.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      header.classList.add('is-more-open');
      placeMenu();
    }

    function closeMenu() {
      list.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      header.classList.remove('is-more-open');
    }

    function openSheet() {
      closeMenu();
      sheet.classList.remove('hidden');
      drawBtn.focus();
    }

    function closeSheet() {
      sheet.classList.add('hidden');
      btn.focus();
    }

    function onDraw() {
      var step = api.drawChance({ pack: pack });
      pack = step.pack;
      promptEl.textContent = step.prompt;
      card.hidden = false;
      drawn = true;
      drawBtn.textContent = api.REDRAW_LABEL;
    }

    var MORE_ACTIONS = {
      chance: openSheet
    };

    btn.addEventListener('click', function () {
      if (menuOpen()) closeMenu();
      else openMenu();
    });

    list.addEventListener('click', function (e) {
      var item = e.target.closest('[data-more-action]');
      if (!item || !list.contains(item)) return;
      var run = MORE_ACTIONS[item.getAttribute('data-more-action')];
      if (!run) return;
      closeMenu();
      run();
    });

    document.addEventListener('click', function (e) {
      if (!menuOpen()) return;
      if (more && more.contains(e.target)) return;
      closeMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!sheet.classList.contains('hidden')) {
        closeSheet();
        return;
      }
      if (menuOpen()) closeMenu();
    });

    closeBtn.addEventListener('click', closeSheet);
    sheet.addEventListener('click', function (e) {
      if (e.target === sheet) closeSheet();
    });
    drawBtn.addEventListener('click', onDraw);
    drawBtn.textContent = drawn ? api.REDRAW_LABEL : api.DRAW_LABEL;

    window.addEventListener('resize', function () {
      if (menuOpen()) placeMenu();
    });
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
