/**
 * Pixel Arcade skin pack (arcade.js).
 * Styles live in skins/arcade.css under html[data-skin="arcade"].
 */
(function () {
  var arcadeTimer = 0;

  function ctx() {
    return window.HcsSkinHost && window.HcsSkinHost.context ? window.HcsSkinHost.context() : null;
  }

  function isActive() {
    return typeof document !== 'undefined' &&
      document.documentElement &&
      document.documentElement.getAttribute('data-skin') === 'arcade';
  }

  function tierPrefix(tier) {
    return tier === 1 ? '1P ★ ' : (tier === 2 ? '2P ★ ' : '3P ★ ');
  }

  function arcadeFireInnerHtml() {
    return '<svg class="arcade-coin-svg" viewBox="0 0 16 16" aria-hidden="true">' +
      '<rect x="3" y="1" width="10" height="14" rx="2" fill="#facc15" stroke="#090d16" stroke-width="2"/>' +
      '<rect x="6" y="4" width="4" height="8" fill="#fef08a"/>' +
      '</svg>' +
      '<span class="arcade-fire-label">COMBO!</span>';
  }

  function arcadeFireBadgeHtml() {
    return '<span class="arcade-fire is-on" title="3+ pts in the last ~3 min">' + arcadeFireInnerHtml() + '</span>';
  }

  function tierOf(st) {
    var api = ctx();
    var cls = api && api.getClass ? api.getClass() : null;
    if (!cls || !window.SparkFire || !st) return 0;
    var tiers = window.SparkFire.individualTiers(cls.students);
    return tiers[st.id] || 0;
  }

  function toggleClass(el, clsName, on) {
    if (!el || !el.classList) return;
    if (on) el.classList.add(clsName);
    else el.classList.remove(clsName);
  }

  function syncArcadeChrome() {
    if (typeof document === 'undefined' || !document.querySelectorAll) return;
    var active = isActive();
    var buttons = document.querySelectorAll('button');
    buttons.forEach(function (btn) {
      var txt = (btn.textContent || '').replace(/\s+/g, ' ').trim();
      var label = (btn.getAttribute && (btn.getAttribute('aria-label') || btn.getAttribute('title'))) || '';
      var isMore = txt === 'More' || /^More\b/.test(txt) || label === 'More';
      var isChanceBtn = (txt === 'Chance' || /\bChance\b/.test(txt) || label === 'Chance') &&
        !/Draw/.test(txt);
      var isChanceDraw = txt === 'Draw a card' || txt === 'Draw again' ||
        /\bDraw a card\b|\bDraw again\b/.test(txt);
      toggleClass(btn, 'arcade-more-btn', !!(active && isMore));
      toggleClass(btn, 'arcade-chance-btn', !!(active && isChanceBtn));
      toggleClass(btn, 'arcade-chance-draw', !!(active && isChanceDraw));
      if (isMore && btn.getAttribute && typeof document.getElementById === 'function') {
        var ctrlId = btn.getAttribute('aria-controls');
        var pop = ctrlId ? document.getElementById(ctrlId) : null;
        if (pop) toggleClass(pop, 'arcade-more-pop', !!active);
      }
    });
    var dialogs = document.querySelectorAll('[role="dialog"], [role="alertdialog"], #chanceSheet, #chanceModal, .chance-sheet, .chance-modal');
    dialogs.forEach(function (dlg) {
      var headings = dlg.querySelectorAll ? dlg.querySelectorAll('h1, h2, h3, h4, [id*="Title"], [class*="title"]') : [];
      var isChanceSheet = false;
      var titleEl = null;
      headings.forEach(function (h) {
        if (((h.textContent || '').trim()) === 'Chance') {
          isChanceSheet = true;
          if (!titleEl) titleEl = h;
        }
      });
      var panel = dlg.querySelector
        ? dlg.querySelector('.plan-panel, .chance-panel, .chance-dialog')
        : null;
      // The sheet node is the full-screen dimmer; paint the inner card only.
      toggleClass(dlg, 'arcade-chance-panel', !!(active && isChanceSheet && !panel));
      if (panel) toggleClass(panel, 'arcade-chance-panel', !!(active && isChanceSheet));
      if (dlg.parentNode && dlg.parentNode.classList && dlg.parentNode !== document.body) {
        toggleClass(dlg.parentNode, 'arcade-chance-sheet', !!(active && isChanceSheet));
      }
      if (titleEl && titleEl.parentNode && titleEl.parentNode !== dlg) {
        toggleClass(titleEl.parentNode, 'arcade-chance-bar', !!(active && isChanceSheet));
      }
      if (isChanceSheet && dlg.querySelectorAll) {
        var closeBtns = dlg.querySelectorAll('button[aria-label="Close"], .chance-close, .plan-close');
        closeBtns.forEach(function (cb) {
          toggleClass(cb, 'arcade-chance-close', !!active);
        });
      }
    });
    var bonusNodes = document.querySelectorAll('p, div, span');
    bonusNodes.forEach(function (node) {
      var t = (node.textContent || '').replace(/\s+/g, ' ').trim();
      if (t === 'Lucky! Draw again — this one is a bonus turn.') {
        toggleClass(node, 'arcade-chance-bonus', !!active);
      }
    });
  }

  function syncArcadeSeats() {
    if (typeof document === 'undefined' || !document.querySelectorAll) return;
    var api = ctx();
    var cls = api && api.getClass ? api.getClass() : null;
    var active = isActive();
    var now = Date.now();
    var tiers = (cls && window.SparkFire) ? window.SparkFire.individualTiers(cls.students) : {};
    var desks = document.querySelectorAll('.desk-card[data-student-id]');
    desks.forEach(function (desk) {
      var id = desk.getAttribute('data-student-id');
      var st = cls && cls.students ? cls.students.find(function (s) { return s.id === id; }) : null;
      var tier = (active && st && tiers[id]) ? tiers[id] : 0;
      desk.classList.remove('arcade-tier-1', 'arcade-tier-2', 'arcade-tier-3');
      if (tier) desk.classList.add('arcade-tier-' + tier);
      var badge = desk.querySelector('.arcade-tier-badge');
      if (tier) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'arcade-tier-badge';
          desk.insertBefore(badge, desk.firstChild);
        }
        var ord = api && api.formatRankOrdinal ? api.formatRankOrdinal(tier) : (tier + '');
        badge.textContent = tierPrefix(tier) + ord;
      } else if (badge && badge.parentNode) {
        badge.parentNode.removeChild(badge);
      }
      var fire = active && st && window.SparkFire && window.SparkFire.onFire(st, now);
      var row = desk.querySelector('.desk-team-row');
      var fireEl = desk.querySelector('.arcade-fire');
      if (fire) {
        if (!fireEl && row) {
          fireEl = document.createElement('span');
          fireEl.className = 'arcade-fire is-on';
          fireEl.title = '3+ pts in the last ~3 min';
          row.appendChild(fireEl);
        }
        if (fireEl && !fireEl.querySelector('.arcade-coin-svg')) {
          fireEl.innerHTML = arcadeFireInnerHtml();
        }
      } else if (fireEl && fireEl.parentNode) {
        fireEl.parentNode.removeChild(fireEl);
      }
      if (active && row && row.classList.contains('desk-team-spacer')) {
        if (fire) row.removeAttribute('aria-hidden');
        else row.setAttribute('aria-hidden', 'true');
      }
    });
    syncArcadeChrome();
  }

  function scheduleArcadeTick() {
    if (arcadeTimer) clearTimeout(arcadeTimer);
    arcadeTimer = 0;
    if (!isActive()) return;
    var api = ctx();
    if (!api || !api.getClass || !window.SparkFire) return;
    var cls = api.getClass();
    if (!cls) return;
    var now = Date.now();
    var at = window.SparkFire.nextChangeAt(cls.students, now);
    if (at == null) return;
    var delay = Math.min(2147483647, Math.max(50, at - now + 40));
    arcadeTimer = setTimeout(function () {
      arcadeTimer = 0;
      syncArcadeSeats();
      if (api.leaderboardTab && api.leaderboardTab() === 'students' && api.renderLeaderboard) {
        api.renderLeaderboard();
      }
      scheduleArcadeTick();
    }, delay);
  }

  if (!window.HcsSkinHost) return;

  var needsSparkFireWire = !(window.HcsSkinHost.sortStudents && window.HcsSkinHost.sortStudents([]));

  var packDef = {
    id: 'arcade',
    refresh: function () {
      syncArcadeSeats();
      scheduleArcadeTick();
    },
    scoreFloat: function (delta) {
      if (!(delta > 0 && isActive())) return null;
      return { className: 'arcade-burst', ms: 1300 };
    },
    deskChrome: function (st, now) {
      if (!isActive() || !window.SparkFire || !st) return null;
      var api = ctx();
      var tier = tierOf(st);
      var onFire = window.SparkFire.onFire(st, now);
      var ordinal = api && api.formatRankOrdinal ? api.formatRankOrdinal(tier) : '';
      return {
        className: tier ? ('arcade-tier-' + tier) : '',
        badge: tier ? ('<span class="arcade-tier-badge">' + tierPrefix(tier) + ordinal + '</span>') : '',
        fire: onFire ? arcadeFireBadgeHtml() : ''
      };
    },
    leaderboardChrome: function (st, now) {
      if (!isActive() || !window.SparkFire || !st) return null;
      var tier = tierOf(st);
      var onFire = window.SparkFire.onFire(st, now);
      return {
        className: tier ? ('arcade-tier-' + tier) : '',
        fire: onFire ? '<span class="arcade-fire-mini" title="3+ pts in the last ~3 min">COMBO!</span>' : ''
      };
    }
  };

  if (needsSparkFireWire) {
    packDef.noteScore = function (st, delta, at) {
      if (st && delta > 0 && at && window.SparkFire) window.SparkFire.note(st, delta, at);
    };
    packDef.undoScore = function (st, delta, at) {
      if (st && delta > 0 && at && window.SparkFire) window.SparkFire.undo(st, delta, at);
    };
    packDef.clearStudent = function (st) {
      if (window.SparkFire) window.SparkFire.clear(st);
      else if (st) st.sparkPts = [];
    };
    packDef.sortStudents = function (students) {
      if (!window.SparkFire) return null;
      return window.SparkFire.sortedIndividuals(students);
    };
  }

  window.HcsSkinHost.register(packDef);

  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('click', function () {
      if (isActive()) syncArcadeChrome();
    });
  }

  if (typeof document !== 'undefined' && typeof MutationObserver === 'function' && document.documentElement) {
    var obs = new MutationObserver(function () {
      syncArcadeSeats();
      if (isActive()) {
        var api = ctx();
        if (api && api.renderLeaderboard) api.renderLeaderboard();
      }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-skin'] });
  }
})();
