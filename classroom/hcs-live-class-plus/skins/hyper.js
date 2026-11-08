/**
 * Hyper Supernova skin pack (hyper.js) — maximum exaggerated visuals.
 * Styles live in skins/hyper.css under html[data-skin="hyper"].
 */
(function () {
  var hyperTimer = 0;
  var hyperSeq = 0;

  function ctx() {
    return window.HcsSkinHost && window.HcsSkinHost.context ? window.HcsSkinHost.context() : null;
  }

  function isActive() {
    return typeof document !== 'undefined' &&
      document.documentElement &&
      document.documentElement.getAttribute('data-skin') === 'hyper';
  }

  function tierPrefix(tier) {
    return tier === 1 ? '👑 CHAMP · ' : (tier === 2 ? '⚡ ELITE · ' : '🔥 ACE · ');
  }

  function hyperFireInnerHtml() {
    hyperSeq += 1;
    var gid = 'hyperNova' + hyperSeq;
    var gid2 = gid + 'B';
    return '<span class="hyper-nova-halo" aria-hidden="true"></span>' +
      '<span class="hyper-nova-sheet" aria-hidden="true">' +
        '<svg viewBox="0 0 140 36" preserveAspectRatio="none" aria-hidden="true">' +
          '<defs>' +
            '<linearGradient id="' + gid + '" x1="0" y1="1" x2="0" y2="0">' +
              '<stop offset="0%" stop-color="#ff007f"/>' +
              '<stop offset="40%" stop-color="#ffbe0b"/>' +
              '<stop offset="75%" stop-color="#00f5d4"/>' +
              '<stop offset="100%" stop-color="#ffffff"/>' +
            '</linearGradient>' +
            '<linearGradient id="' + gid2 + '" x1="0" y1="1" x2="0" y2="0">' +
              '<stop offset="0%" stop-color="#8338ec" stop-opacity=".9"/>' +
              '<stop offset="50%" stop-color="#ff007f" stop-opacity=".8"/>' +
              '<stop offset="100%" stop-color="#00f5d4" stop-opacity=".7"/>' +
            '</linearGradient>' +
          '</defs>' +
          '<path class="hyper-plasma-wave w2" fill="url(#' + gid2 + ')" d="M0,36 C10,36 8,4 20,12 C32,0 40,22 52,6 C64,-4 72,18 84,4 C96,-4 106,18 118,8 C130,2 134,36 140,36 Z"/>' +
          '<path class="hyper-plasma-wave" fill="url(#' + gid + ')" d="M0,36 C12,36 10,10 22,16 C34,2 44,24 56,10 C68,0 76,22 88,8 C100,0 110,20 122,12 C132,6 136,36 140,36 Z"/>' +
          '<ellipse class="hyper-plasma-core" cx="70" cy="30" rx="58" ry="9" fill="#00f5d4" opacity=".65"/>' +
        '</svg>' +
      '</span>' +
      '<span class="hyper-fire-label">HYPER NOVA!</span>';
  }

  function hyperFireBadgeHtml() {
    return '<span class="hyper-fire is-on" title="3+ pts in the last ~3 min">' + hyperFireInnerHtml() + '</span>';
  }

  function tierOf(st) {
    var api = ctx();
    var cls = api && api.getClass ? api.getClass() : null;
    if (!cls || !window.SparkFire || !st) return 0;
    var tiers = window.SparkFire.individualTiers(cls.students);
    return tiers[st.id] || 0;
  }

  function syncHyperSeats() {
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
      desk.classList.remove('hyper-tier-1', 'hyper-tier-2', 'hyper-tier-3');
      if (tier) desk.classList.add('hyper-tier-' + tier);
      var badge = desk.querySelector('.hyper-tier-badge');
      if (tier) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'hyper-tier-badge';
          desk.insertBefore(badge, desk.firstChild);
        }
        var ord = api && api.formatRankOrdinal ? api.formatRankOrdinal(tier) : (tier + '');
        badge.textContent = tierPrefix(tier) + ord;
      } else if (badge && badge.parentNode) {
        badge.parentNode.removeChild(badge);
      }
      var fire = active && st && window.SparkFire && window.SparkFire.onFire(st, now);
      var row = desk.querySelector('.desk-team-row');
      var fireEl = desk.querySelector('.hyper-fire');
      if (fire) {
        if (!fireEl && row) {
          fireEl = document.createElement('span');
          fireEl.className = 'hyper-fire is-on';
          fireEl.title = '3+ pts in the last ~3 min';
          row.appendChild(fireEl);
        }
        if (fireEl && !fireEl.querySelector('.hyper-nova-sheet')) {
          fireEl.innerHTML = hyperFireInnerHtml();
        }
      } else if (fireEl && fireEl.parentNode) {
        fireEl.parentNode.removeChild(fireEl);
      }
      if (active && row && row.classList.contains('desk-team-spacer')) {
        if (fire) row.removeAttribute('aria-hidden');
        else row.setAttribute('aria-hidden', 'true');
      }
    });
  }

  function scheduleHyperTick() {
    if (hyperTimer) clearTimeout(hyperTimer);
    hyperTimer = 0;
    if (!isActive()) return;
    var api = ctx();
    if (!api || !api.getClass || !window.SparkFire) return;
    var cls = api.getClass();
    if (!cls) return;
    var now = Date.now();
    var at = window.SparkFire.nextChangeAt(cls.students, now);
    if (at == null) return;
    var delay = Math.min(2147483647, Math.max(50, at - now + 40));
    hyperTimer = setTimeout(function () {
      hyperTimer = 0;
      syncHyperSeats();
      if (api.leaderboardTab && api.leaderboardTab() === 'students' && api.renderLeaderboard) {
        api.renderLeaderboard();
      }
      scheduleHyperTick();
    }, delay);
  }

  if (!window.HcsSkinHost) return;

  var needsSparkFireWire = !(window.HcsSkinHost.sortStudents && window.HcsSkinHost.sortStudents([]));

  var packDef = {
    id: 'hyper',
    refresh: function () {
      syncHyperSeats();
      scheduleHyperTick();
    },
    scoreFloat: function (delta) {
      if (!(delta > 0 && isActive())) return null;
      return { className: 'hyper-burst', ms: 1600 };
    },
    deskChrome: function (st, now) {
      if (!isActive() || !window.SparkFire || !st) return null;
      var api = ctx();
      var tier = tierOf(st);
      var onFire = window.SparkFire.onFire(st, now);
      var ordinal = api && api.formatRankOrdinal ? api.formatRankOrdinal(tier) : '';
      return {
        className: tier ? ('hyper-tier-' + tier) : '',
        badge: tier ? ('<span class="hyper-tier-badge">' + tierPrefix(tier) + ordinal + '</span>') : '',
        fire: onFire ? hyperFireBadgeHtml() : ''
      };
    },
    leaderboardChrome: function (st, now) {
      if (!isActive() || !window.SparkFire || !st) return null;
      var tier = tierOf(st);
      var onFire = window.SparkFire.onFire(st, now);
      return {
        className: tier ? ('hyper-tier-' + tier) : '',
        fire: onFire ? '<span class="hyper-fire-mini" title="3+ pts in the last ~3 min">HYPER NOVA!</span>' : ''
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

  if (typeof document !== 'undefined' && typeof MutationObserver === 'function' && document.documentElement) {
    var obs = new MutationObserver(function () {
      syncHyperSeats();
      if (isActive()) {
        var api = ctx();
        if (api && api.renderLeaderboard) api.renderLeaderboard();
      }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-skin'] });
  }
})();
