/**
 * Grand Prix Pitwall skin pack (pitwall.js).
 * Styles live in skins/pitwall.css under html[data-skin="pitwall"].
 */
(function () {
  var pitwallTimer = 0;

  function ctx() {
    return window.HcsSkinHost && window.HcsSkinHost.context ? window.HcsSkinHost.context() : null;
  }

  function isActive() {
    return typeof document !== 'undefined' &&
      document.documentElement &&
      document.documentElement.getAttribute('data-skin') === 'pitwall';
  }

  function tierPrefix(tier) {
    return tier === 1 ? 'P1 🏆 ' : (tier === 2 ? 'P2 🏁 ' : 'P3 ⚡ ');
  }

  function pitwallFireInnerHtml() {
    return '<svg class="pitwall-wing-svg" viewBox="0 0 16 16" aria-hidden="true">' +
      '<path d="M2 11 L8 3 L14 11 L11 11 L8 7 L5 11 Z" fill="#fef08a" stroke="#0b0d12" stroke-width="1.4"/>' +
      '</svg>' +
      '<span class="pitwall-fire-label">DRS ACTIVE</span>';
  }

  function pitwallFireBadgeHtml() {
    return '<span class="pitwall-fire is-on" title="3+ pts in the last ~3 min">' + pitwallFireInnerHtml() + '</span>';
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

  function isFullScreenOverlay(el) {
    if (!el) return false;
    var id = el.id || '';
    if (id === 'chanceSheet' || id === 'chanceModal' || id === 'planSheet' || id === 'pickerModal') {
      return true;
    }
    if (el.classList && (
      el.classList.contains('chance-sheet') ||
      el.classList.contains('chance-modal') ||
      el.classList.contains('fixed') ||
      el.classList.contains('inset-0')
    )) {
      return true;
    }
    return typeof document !== 'undefined' && el.parentNode === document.body;
  }

  function syncPitwallChrome() {
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
      toggleClass(btn, 'pitwall-more-btn', !!(active && isMore));
      toggleClass(btn, 'pitwall-chance-btn', !!(active && isChanceBtn));
      toggleClass(btn, 'pitwall-chance-draw', !!(active && isChanceDraw));
      if (isMore && btn.getAttribute && typeof document.getElementById === 'function') {
        var ctrlId = btn.getAttribute('aria-controls');
        var pop = ctrlId ? document.getElementById(ctrlId) : null;
        if (pop) toggleClass(pop, 'pitwall-more-pop', !!active);
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

      var overlay = isFullScreenOverlay(dlg)
        ? dlg
        : (dlg.parentNode && dlg.parentNode !== document.body ? dlg.parentNode : null);
      var innerPanel = isFullScreenOverlay(dlg)
        ? ((dlg.querySelector && dlg.querySelector('.chance-panel, .chance-dialog, .plan-panel, [class*="panel"], [class*="dialog"]')) || dlg.firstElementChild)
        : dlg;

      /* Keep the full-screen overlay a dim scrim; style the inner card only. */
      if (overlay) {
        toggleClass(overlay, 'pitwall-chance-sheet', !!(active && isChanceSheet));
        toggleClass(overlay, 'pitwall-chance-panel', false);
      }
      if (innerPanel && innerPanel !== overlay) {
        toggleClass(innerPanel, 'pitwall-chance-panel', !!(active && isChanceSheet));
      }

      if (titleEl && titleEl.parentNode && titleEl.parentNode !== overlay && titleEl.parentNode !== innerPanel) {
        toggleClass(titleEl.parentNode, 'pitwall-chance-bar', !!(active && isChanceSheet));
      }

      if (isChanceSheet && dlg.querySelectorAll) {
        var closeBtns = dlg.querySelectorAll('button[aria-label="Close"], .chance-close, .plan-close');
        closeBtns.forEach(function (cb) {
          toggleClass(cb, 'pitwall-chance-close', !!active);
        });
        var cards = dlg.querySelectorAll('#chanceCard, #chanceCardBox, #chanceStage, #chanceStageBox, .chance-card, .chance-stage, .chance-card-box, .chance-card-face, .chance-card-body');
        cards.forEach(function (card) {
          toggleClass(card, 'pitwall-chance-card', !!active);
        });
        var prompts = dlg.querySelectorAll('#chancePrompt, #chancePromptText, #chanceCardPrompt, #chanceQuestion, #chanceText, #chanceCardText, .chance-prompt, .chance-prompt-text, .chance-card-prompt, .chance-question, .chance-text, .chance-card-text, .chance-card p, .chance-card-face p, .chance-card-body p, #chanceCard p, #chanceCardBox p');
        prompts.forEach(function (pr) {
          var pt = (pr.textContent || '').replace(/\s+/g, ' ').trim();
          if (pt !== 'Lucky! Draw again — this one is a bonus turn.') {
            toggleClass(pr, 'pitwall-chance-prompt', !!active);
          }
        });
      }
    });

    var bonusNodes = document.querySelectorAll('p, div, span');
    bonusNodes.forEach(function (node) {
      var t = (node.textContent || '').replace(/\s+/g, ' ').trim();
      if (t === 'Lucky! Draw again — this one is a bonus turn.') {
        toggleClass(node, 'pitwall-chance-bonus', !!active);
      }
    });
  }

  function syncPitwallSeats() {
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
      desk.classList.remove('pitwall-tier-1', 'pitwall-tier-2', 'pitwall-tier-3');
      if (tier) desk.classList.add('pitwall-tier-' + tier);
      var badge = desk.querySelector('.pitwall-tier-badge');
      if (tier) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'pitwall-tier-badge';
          desk.insertBefore(badge, desk.firstChild);
        }
        var ord = api && api.formatRankOrdinal ? api.formatRankOrdinal(tier) : (tier + '');
        badge.textContent = tierPrefix(tier) + ord;
      } else if (badge && badge.parentNode) {
        badge.parentNode.removeChild(badge);
      }
      var fire = active && st && window.SparkFire && window.SparkFire.onFire(st, now);
      var row = desk.querySelector('.desk-team-row');
      var fireEl = desk.querySelector('.pitwall-fire');
      if (fire) {
        if (!fireEl && row) {
          fireEl = document.createElement('span');
          fireEl.className = 'pitwall-fire is-on';
          fireEl.title = '3+ pts in the last ~3 min';
          row.appendChild(fireEl);
        }
        if (fireEl && !fireEl.querySelector('.pitwall-wing-svg')) {
          fireEl.innerHTML = pitwallFireInnerHtml();
        }
      } else if (fireEl && fireEl.parentNode) {
        fireEl.parentNode.removeChild(fireEl);
      }
      if (active && row && row.classList.contains('desk-team-spacer')) {
        if (fire) row.removeAttribute('aria-hidden');
        else row.setAttribute('aria-hidden', 'true');
      }
    });
    syncPitwallChrome();
  }

  function schedulePitwallTick() {
    if (pitwallTimer) clearTimeout(pitwallTimer);
    pitwallTimer = 0;
    if (!isActive()) return;
    var api = ctx();
    if (!api || !api.getClass || !window.SparkFire) return;
    var cls = api.getClass();
    if (!cls) return;
    var now = Date.now();
    var at = window.SparkFire.nextChangeAt(cls.students, now);
    if (at == null) return;
    var delay = Math.min(2147483647, Math.max(50, at - now + 40));
    pitwallTimer = setTimeout(function () {
      pitwallTimer = 0;
      syncPitwallSeats();
      if (api.leaderboardTab && api.leaderboardTab() === 'students' && api.renderLeaderboard) {
        api.renderLeaderboard();
      }
      schedulePitwallTick();
    }, delay);
  }

  if (!window.HcsSkinHost) return;

  var needsSparkFireWire = !(window.HcsSkinHost.sortStudents && window.HcsSkinHost.sortStudents([]));

  var packDef = {
    id: 'pitwall',
    refresh: function () {
      syncPitwallSeats();
      schedulePitwallTick();
    },
    scoreFloat: function (delta) {
      if (!(delta > 0 && isActive())) return null;
      return { className: 'pitwall-burst', ms: 1300 };
    },
    deskChrome: function (st, now) {
      if (!isActive() || !window.SparkFire || !st) return null;
      var api = ctx();
      var tier = tierOf(st);
      var onFire = window.SparkFire.onFire(st, now);
      var ordinal = api && api.formatRankOrdinal ? api.formatRankOrdinal(tier) : '';
      return {
        className: tier ? ('pitwall-tier-' + tier) : '',
        badge: tier ? ('<span class="pitwall-tier-badge">' + tierPrefix(tier) + ordinal + '</span>') : '',
        fire: onFire ? pitwallFireBadgeHtml() : ''
      };
    },
    leaderboardChrome: function (st, now) {
      if (!isActive() || !window.SparkFire || !st) return null;
      var tier = tierOf(st);
      var onFire = window.SparkFire.onFire(st, now);
      return {
        className: tier ? ('pitwall-tier-' + tier) : '',
        fire: onFire ? '<span class="pitwall-fire-mini" title="3+ pts in the last ~3 min">DRS ACTIVE</span>' : ''
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
      if (isActive()) syncPitwallChrome();
    });
  }

  if (typeof document !== 'undefined' && typeof MutationObserver === 'function' && document.documentElement) {
    var obs = new MutationObserver(function () {
      syncPitwallSeats();
      if (isActive()) {
        var api = ctx();
        if (api && api.renderLeaderboard) api.renderLeaderboard();
      }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-skin'] });
  }
})();
