/**
 * Cyber Grid / Holo skin pack (holo.js).
 * Styles live in skins/holo.css under html[data-skin="holo"].
 */
(function () {
  var holoTimer = 0;

  function ctx() {
    return window.HcsSkinHost && window.HcsSkinHost.context ? window.HcsSkinHost.context() : null;
  }

  function isActive() {
    return typeof document !== 'undefined' &&
      document.documentElement &&
      document.documentElement.getAttribute('data-skin') === 'holo';
  }

  function tierPrefix(tier) {
    return tier === 1 ? '◆ TIER I · ' : (tier === 2 ? '◇ TIER II · ' : '◈ TIER III · ');
  }

  function holoFireInnerHtml() {
    return '<svg class="holo-radar-svg" viewBox="0 0 16 16" aria-hidden="true">' +
      '<circle cx="8" cy="8" r="6" fill="none" stroke="#041016" stroke-width="2"/>' +
      '<circle cx="8" cy="8" r="2.5" fill="#041016"/>' +
      '</svg>' +
      '<span class="holo-fire-label">OVERDRIVE</span>';
  }

  function holoFireBadgeHtml() {
    return '<span class="holo-fire is-on" title="3+ pts in the last ~3 min">' + holoFireInnerHtml() + '</span>';
  }

  function tierOf(st) {
    var api = ctx();
    var cls = api && api.getClass ? api.getClass() : null;
    if (!cls || !window.SparkFire || !st) return 0;
    var tiers = window.SparkFire.individualTiers(cls.students);
    return tiers[st.id] || 0;
  }

  function syncHoloSeats() {
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
      desk.classList.remove('holo-tier-1', 'holo-tier-2', 'holo-tier-3');
      if (tier) desk.classList.add('holo-tier-' + tier);
      var badge = desk.querySelector('.holo-tier-badge');
      if (tier) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'holo-tier-badge';
          desk.insertBefore(badge, desk.firstChild);
        }
        var ord = api && api.formatRankOrdinal ? api.formatRankOrdinal(tier) : (tier + '');
        badge.textContent = tierPrefix(tier) + ord;
      } else if (badge && badge.parentNode) {
        badge.parentNode.removeChild(badge);
      }
      var fire = active && st && window.SparkFire && window.SparkFire.onFire(st, now);
      var row = desk.querySelector('.desk-team-row');
      var fireEl = desk.querySelector('.holo-fire');
      if (fire) {
        if (!fireEl && row) {
          fireEl = document.createElement('span');
          fireEl.className = 'holo-fire is-on';
          fireEl.title = '3+ pts in the last ~3 min';
          row.appendChild(fireEl);
        }
        if (fireEl && !fireEl.querySelector('.holo-radar-svg')) {
          fireEl.innerHTML = holoFireInnerHtml();
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

  function scheduleHoloTick() {
    if (holoTimer) clearTimeout(holoTimer);
    holoTimer = 0;
    if (!isActive()) return;
    var api = ctx();
    if (!api || !api.getClass || !window.SparkFire) return;
    var cls = api.getClass();
    if (!cls) return;
    var now = Date.now();
    var at = window.SparkFire.nextChangeAt(cls.students, now);
    if (at == null) return;
    var delay = Math.min(2147483647, Math.max(50, at - now + 40));
    holoTimer = setTimeout(function () {
      holoTimer = 0;
      syncHoloSeats();
      if (api.leaderboardTab && api.leaderboardTab() === 'students' && api.renderLeaderboard) {
        api.renderLeaderboard();
      }
      scheduleHoloTick();
    }, delay);
  }

  if (!window.HcsSkinHost) return;

  var needsSparkFireWire = !(window.HcsSkinHost.sortStudents && window.HcsSkinHost.sortStudents([]));

  var packDef = {
    id: 'holo',
    refresh: function () {
      syncHoloSeats();
      scheduleHoloTick();
    },
    scoreFloat: function (delta) {
      if (!(delta > 0 && isActive())) return null;
      return { className: 'holo-burst', ms: 1300 };
    },
    deskChrome: function (st, now) {
      if (!isActive() || !window.SparkFire || !st) return null;
      var api = ctx();
      var tier = tierOf(st);
      var onFire = window.SparkFire.onFire(st, now);
      var ordinal = api && api.formatRankOrdinal ? api.formatRankOrdinal(tier) : '';
      return {
        className: tier ? ('holo-tier-' + tier) : '',
        badge: tier ? ('<span class="holo-tier-badge">' + tierPrefix(tier) + ordinal + '</span>') : '',
        fire: onFire ? holoFireBadgeHtml() : ''
      };
    },
    leaderboardChrome: function (st, now) {
      if (!isActive() || !window.SparkFire || !st) return null;
      var tier = tierOf(st);
      var onFire = window.SparkFire.onFire(st, now);
      return {
        className: tier ? ('holo-tier-' + tier) : '',
        fire: onFire ? '<span class="holo-fire-mini" title="3+ pts in the last ~3 min">OVERDRIVE</span>' : ''
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
      syncHoloSeats();
      if (isActive()) {
        var api = ctx();
        if (api && api.renderLeaderboard) api.renderLeaderboard();
      }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-skin'] });
  }
})();
