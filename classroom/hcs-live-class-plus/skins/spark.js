/**
 * Spark skin pack. Paint lives in spark.css. The On fire window and top-3
 * order live in ../spark-fire.js (window.SparkFire). This file only wires
 * that engine into HcsSkinHost.
 */
(function () {
  var sparkFireTimer = 0;
  var sparkBurnSeq = 0;

  function ctx() {
    return window.HcsSkinHost && window.HcsSkinHost.context ? window.HcsSkinHost.context() : null;
  }

  function sparkFireInnerHtml() {
    sparkBurnSeq += 1;
    var gid = 'sparkBurn' + sparkBurnSeq;
    var gidSoft = gid + 'Soft';
    return '<span class="spark-burn-halo" aria-hidden="true"></span>' +
      '<span class="spark-burn-sheet" aria-hidden="true">' +
        '<svg viewBox="0 0 140 36" preserveAspectRatio="none" aria-hidden="true">' +
          '<defs>' +
            '<linearGradient id="' + gid + '" x1="0" y1="1" x2="0" y2="0">' +
              '<stop offset="0%" stop-color="#dc2626"/>' +
              '<stop offset="35%" stop-color="#ff6a00"/>' +
              '<stop offset="65%" stop-color="#ffb300"/>' +
              '<stop offset="100%" stop-color="#fff7ad"/>' +
            '</linearGradient>' +
            '<linearGradient id="' + gidSoft + '" x1="0" y1="1" x2="0" y2="0">' +
              '<stop offset="0%" stop-color="#ff2d95" stop-opacity=".85"/>' +
              '<stop offset="45%" stop-color="#ff6a00" stop-opacity=".7"/>' +
              '<stop offset="100%" stop-color="#fff7ad" stop-opacity=".55"/>' +
            '</linearGradient>' +
          '</defs>' +
          '<path class="spark-flame-wave w2" fill="url(#' + gidSoft + ')" d="M0,36 C12,36 10,8 22,14 C34,2 40,22 52,10 C64,-2 72,20 84,8 C96,-1 104,18 116,12 C128,6 132,36 140,36 Z"/>' +
          '<path class="spark-flame-wave" fill="url(#' + gid + ')" d="M0,36 C14,36 12,14 24,18 C36,6 44,24 56,14 C68,4 76,22 88,12 C100,4 108,20 120,14 C130,10 134,36 140,36 Z"/>' +
          '<ellipse class="spark-flame-core" cx="70" cy="30" rx="52" ry="8" fill="#ff6a00" opacity=".55"/>' +
        '</svg>' +
      '</span>' +
      '<span class="spark-fire-label">On fire</span>';
  }

  function sparkFireBadgeHtml() {
    return '<span class="spark-fire is-on" title="3+ pts in the last ~3 min">' + sparkFireInnerHtml() + '</span>';
  }

  function tierOf(st) {
    var api = ctx();
    var cls = api && api.getClass ? api.getClass() : null;
    if (!cls || !window.SparkFire || !st) return 0;
    var tiers = window.SparkFire.individualTiers(cls.students);
    return tiers[st.id] || 0;
  }

  function syncSparkSeats() {
    var api = ctx();
    if (!api || !api.getClass || !window.SparkFire) return;
    var cls = api.getClass();
    if (!cls) return;
    var now = Date.now();
    var tiers = window.SparkFire.individualTiers(cls.students);
    var desks = document.querySelectorAll('.desk-card[data-student-id]');
    desks.forEach(function (desk) {
      var id = desk.getAttribute('data-student-id');
      var st = cls.students.find(function (s) { return s.id === id; });
      if (!st) return;
      var tier = tiers[id] || 0;
      desk.classList.remove('spark-tier-1', 'spark-tier-2', 'spark-tier-3');
      if (tier) desk.classList.add('spark-tier-' + tier);
      var badge = desk.querySelector('.spark-tier-badge');
      if (tier) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'spark-tier-badge';
          desk.insertBefore(badge, desk.firstChild);
        }
        badge.textContent = api.formatRankOrdinal ? api.formatRankOrdinal(tier) : '';
      } else if (badge && badge.parentNode) {
        badge.parentNode.removeChild(badge);
      }
      var fire = window.SparkFire.onFire(st, now);
      var row = desk.querySelector('.desk-team-row');
      var fireEl = desk.querySelector('.spark-fire');
      if (fire) {
        if (!fireEl && row) {
          fireEl = document.createElement('span');
          fireEl.className = 'spark-fire is-on';
          fireEl.title = '3+ pts in the last ~3 min';
          row.appendChild(fireEl);
        }
        if (fireEl && !fireEl.querySelector('.spark-burn-sheet')) {
          fireEl.innerHTML = sparkFireInnerHtml();
        }
      } else if (fireEl && fireEl.parentNode) {
        fireEl.parentNode.removeChild(fireEl);
      }
      if (row && row.classList.contains('desk-team-spacer')) {
        var sparkOn = document.documentElement.getAttribute('data-skin') === 'spark';
        if (sparkOn && fire) row.removeAttribute('aria-hidden');
        else row.setAttribute('aria-hidden', 'true');
      }
    });
  }

  function scheduleSparkFireTick() {
    if (sparkFireTimer) clearTimeout(sparkFireTimer);
    sparkFireTimer = 0;
    var api = ctx();
    if (!api || !api.getClass || !window.SparkFire) return;
    var cls = api.getClass();
    if (!cls) return;
    var now = Date.now();
    var at = window.SparkFire.nextChangeAt(cls.students, now);
    if (at == null) return;
    var delay = Math.min(2147483647, Math.max(50, at - now + 40));
    sparkFireTimer = setTimeout(function () {
      sparkFireTimer = 0;
      syncSparkSeats();
      if (api.leaderboardTab && api.leaderboardTab() === 'students' && api.renderLeaderboard) {
        api.renderLeaderboard();
      }
      scheduleSparkFireTick();
    }, delay);
  }

  if (!window.HcsSkinHost) return;

  window.HcsSkinHost.register({
    id: 'spark',
    noteScore: function (st, delta, at) {
      if (st && delta > 0 && at && window.SparkFire) window.SparkFire.note(st, delta, at);
    },
    undoScore: function (st, delta, at) {
      if (st && delta > 0 && at && window.SparkFire) window.SparkFire.undo(st, delta, at);
    },
    clearStudent: function (st) {
      if (window.SparkFire) window.SparkFire.clear(st);
      else if (st) st.sparkPts = [];
    },
    refresh: function () {
      syncSparkSeats();
      scheduleSparkFireTick();
    },
    scoreFloat: function (delta) {
      var sparkBurst = delta > 0 && document.documentElement.getAttribute('data-skin') === 'spark';
      if (!sparkBurst) return null;
      return { className: 'score-burst', ms: 1350 };
    },
    sortStudents: function (students) {
      if (!window.SparkFire) return null;
      return window.SparkFire.sortedIndividuals(students);
    },
    deskChrome: function (st, now) {
      if (!window.SparkFire || !st) return null;
      var api = ctx();
      var tier = tierOf(st);
      var onFire = window.SparkFire.onFire(st, now);
      var ordinal = api && api.formatRankOrdinal ? api.formatRankOrdinal(tier) : '';
      return {
        className: tier ? ('spark-tier-' + tier) : '',
        badge: tier ? ('<span class="spark-tier-badge">' + ordinal + '</span>') : '',
        fire: onFire ? sparkFireBadgeHtml() : ''
      };
    },
    leaderboardChrome: function (st, now) {
      if (!window.SparkFire || !st) return null;
      var tier = tierOf(st);
      var onFire = window.SparkFire.onFire(st, now);
      return {
        className: tier ? ('spark-tier-' + tier) : '',
        fire: onFire ? '<span class="spark-fire-mini" title="3+ pts in the last ~3 min">On fire</span>' : ''
      };
    }
  });
})();
