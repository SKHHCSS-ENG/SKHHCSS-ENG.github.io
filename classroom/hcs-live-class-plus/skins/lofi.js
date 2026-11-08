/* Cozy Cafe / Lo-Fi Study skin pack (lofi.js) — 5-stamp cafe loyalty card mechanic
   (5/5 = House Regular) with warm focus stamps and gentle steam floats. */
(function (root) {
  var FRESH_BREW_MS = 30000;
  var brewById = {};
  var lofiTimer = 0;

  function ctx() {
    return root.HcsSkinHost && typeof root.HcsSkinHost.context === 'function'
      ? root.HcsSkinHost.context()
      : null;
  }

  function isActive() {
    return typeof document !== 'undefined' &&
      document.documentElement &&
      document.documentElement.getAttribute('data-skin') === 'lofi';
  }

  function keyOf(st) {
    if (!st) return '';
    return String(st.id != null ? st.id : (st.classNo != null ? st.classNo : st.name || ''));
  }

  function brewFor(st) {
    var k = keyOf(st);
    if (!k) return null;
    if (!brewById[k]) {
      brewById[k] = { stamps: 0, lastAt: 0 };
    }
    return brewById[k];
  }

  function scoreOf(st) {
    if (!st) return 0;
    if (typeof st.score === 'number') return st.score;
    if (typeof st.points === 'number') return st.points;
    return Number(st.score) || 0;
  }

  function stampDots(count) {
    var filled = count % 5;
    if (count > 0 && filled === 0) filled = 5;
    var out = '';
    for (var i = 0; i < 5; i++) {
      out += i < filled ? '☕' : '○';
    }
    return out;
  }

  function buildDeskChrome(st, now) {
    var t = typeof now === 'number' ? now : Date.now();
    var rec = brewFor(st);
    var total = rec ? rec.stamps : 0;
    var scoreTotal = Math.max(total, scoreOf(st));
    var classes = [];
    var badge = '';
    var fire = '';

    if (scoreTotal >= 5) {
      classes.push('lofi-regular');
      badge = '<span class="lofi-tier-badge">🌟 HOUSE REGULAR</span>';
    } else if (scoreTotal >= 1) {
      badge = '<span class="lofi-tier-badge">☕ CAFE GUEST</span>';
    }

    if (rec && rec.lastAt && (t - rec.lastAt <= FRESH_BREW_MS)) {
      classes.push('lofi-fresh-brew');
    }

    if (scoreTotal >= 1) {
      var cardStep = scoreTotal % 5;
      if (cardStep === 0) cardStep = 5;
      fire =
        '<div class="lofi-stamp-card is-on">' +
          '<span class="lofi-stamp-dots">' + stampDots(scoreTotal) + '</span>' +
          '<span>' + cardStep + '/5</span>' +
        '</div>';
    }

    return {
      className: classes.join(' '),
      badge: badge,
      fire: fire
    };
  }

  function syncLofiSeats() {
    if (typeof document === 'undefined' || !document.querySelectorAll) return;
    var api = ctx();
    var cls = api && api.getClass ? api.getClass() : null;
    var active = isActive();
    var now = Date.now();
    var desks = document.querySelectorAll('.desk-card[data-student-id]');
    desks.forEach(function (desk) {
      var id = desk.getAttribute('data-student-id');
      var st = cls && cls.students ? cls.students.find(function (s) { return s.id === id; }) : null;
      desk.classList.remove('lofi-regular', 'lofi-fresh-brew');
      var oldBadge = desk.querySelector('.lofi-tier-badge');
      var oldCard = desk.querySelector('.lofi-stamp-card');
      if (!active || !st) {
        if (oldBadge && oldBadge.parentNode) oldBadge.parentNode.removeChild(oldBadge);
        if (oldCard && oldCard.parentNode) oldCard.parentNode.removeChild(oldCard);
        return;
      }
      var part = buildDeskChrome(st, now);
      if (part.className) {
        part.className.split(/\s+/).forEach(function (c) {
          if (c) desk.classList.add(c);
        });
      }
      if (part.badge) {
        if (!oldBadge) {
          oldBadge = document.createElement('span');
          oldBadge.className = 'lofi-tier-badge';
          desk.insertBefore(oldBadge, desk.firstChild);
        }
        oldBadge.outerHTML = part.badge;
      } else if (oldBadge && oldBadge.parentNode) {
        oldBadge.parentNode.removeChild(oldBadge);
      }
      var row = desk.querySelector('.desk-team-row');
      if (part.fire && row) {
        if (oldCard && oldCard.parentNode) oldCard.parentNode.removeChild(oldCard);
        var wrap = document.createElement('div');
        wrap.innerHTML = part.fire;
        if (wrap.firstChild) row.appendChild(wrap.firstChild);
      } else if (oldCard && oldCard.parentNode) {
        oldCard.parentNode.removeChild(oldCard);
      }
      if (row && row.classList.contains('desk-team-spacer')) {
        if (part.fire) row.removeAttribute('aria-hidden');
        else row.setAttribute('aria-hidden', 'true');
      }
    });
  }

  function scheduleLofiTick() {
    if (typeof MutationObserver !== 'function') return;
    if (lofiTimer) clearTimeout(lofiTimer);
    lofiTimer = 0;
    if (!isActive()) return;
    var now = Date.now();
    var nextAt = null;
    Object.keys(brewById).forEach(function (k) {
      var r = brewById[k];
      if (!r || !r.lastAt) return;
      if (now - r.lastAt <= FRESH_BREW_MS) {
        var exp = r.lastAt + FRESH_BREW_MS;
        if (nextAt === null || exp < nextAt) nextAt = exp;
      }
    });
    if (nextAt === null) return;
    var delay = Math.min(2147483647, Math.max(80, nextAt - now + 50));
    lofiTimer = setTimeout(function () {
      lofiTimer = 0;
      syncLofiSeats();
      scheduleLofiTick();
    }, delay);
  }

  if (root.HcsSkinHost && typeof root.HcsSkinHost.register === 'function') {
    root.HcsSkinHost.register({
      id: 'lofi',
      noteScore: function (st, delta, at) {
        if ((Number(delta) || 0) <= 0) return;
        var rec = brewFor(st);
        if (!rec) return;
        var add = Math.max(1, Number(delta) || 1);
        rec.stamps += add;
        rec.lastAt = typeof at === 'number' && at > 0 ? at : Date.now();
      },
      undoScore: function (st) {
        var rec = brewFor(st);
        if (!rec) return;
        rec.stamps = Math.max(0, rec.stamps - 1);
      },
      clearStudent: function (st) {
        var k = keyOf(st);
        if (k && brewById[k]) {
          delete brewById[k];
        }
      },
      refresh: function () {
        syncLofiSeats();
        scheduleLofiTick();
      },
      scoreFloat: function (delta) {
        if (!isActive()) return null;
        if ((Number(delta) || 0) <= 0) return null;
        return { className: 'lofi-burst', ms: 1600 };
      },
      deskChrome: function (st, now) {
        if (!isActive() || !st) return null;
        return buildDeskChrome(st, now);
      },
      leaderboardChrome: function (st) {
        if (!isActive() || !st) return null;
        var rec = brewFor(st);
        var total = Math.max(rec ? rec.stamps : 0, scoreOf(st));
        var clsName = total >= 5 ? 'lofi-regular' : '';
        var tag = '';
        if (total >= 5) {
          tag = '<span class="lofi-board-tag">🌟 Regular (' + total + '☕)</span>';
        } else if (total >= 1) {
          tag = '<span class="lofi-board-tag">' + (total % 5 || 5) + '/5 ☕</span>';
        }
        return { className: clsName, fire: tag };
      }
    });
  }

  if (typeof document !== 'undefined' && typeof MutationObserver === 'function' && document.documentElement) {
    var obs = new MutationObserver(function () {
      syncLofiSeats();
      if (isActive()) {
        var api = ctx();
        if (api && api.renderLeaderboard) api.renderLeaderboard();
      }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-skin'] });
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
