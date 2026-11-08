/* Cyberpunk Netrunner skin pack (cyber.js) — Active-Signal Leaderboard Sort (sortStudents floats
   recent scorers to the top with [LIVE UPLINK]) + Street Cred progression tiers. */
(function (root) {
  var UPLINK_WINDOW_MS = 60000;
  var GLITCH_UNDO_MS = 15000;
  var netById = {};
  var tickSeq = 0;
  var cyberTimer = 0;

  function ctx() {
    return root.HcsSkinHost && typeof root.HcsSkinHost.context === 'function'
      ? root.HcsSkinHost.context()
      : null;
  }

  function isActive() {
    return typeof document !== 'undefined' &&
      document.documentElement &&
      document.documentElement.getAttribute('data-skin') === 'cyber';
  }

  function keyOf(st) {
    if (!st) return '';
    return String(st.id != null ? st.id : (st.classNo != null ? st.classNo : st.name || ''));
  }

  function stateFor(st) {
    var k = keyOf(st);
    if (!k) return null;
    if (!netById[k]) {
      netById[k] = { lastAt: 0, seq: 0, undoAt: 0, breaches: 0 };
    }
    return netById[k];
  }

  function scoreOf(st) {
    if (!st) return 0;
    if (typeof st.score === 'number') return st.score;
    if (typeof st.points === 'number') return st.points;
    return Number(st.score) || 0;
  }

  function credTier(score) {
    var pts = Number(score) || 0;
    if (pts >= 10) return { tier: 4, label: 'TIER IV · LEGEND' };
    if (pts >= 6) return { tier: 3, label: 'TIER III · NETRUNNER' };
    if (pts >= 3) return { tier: 2, label: 'TIER II · SOLO' };
    if (pts >= 1) return { tier: 1, label: 'TIER I · ROOKIE' };
    return null;
  }

  function sortCyberStudents(students) {
    if (!Array.isArray(students)) return null;
    var copy = students.slice();
    copy.sort(function (a, b) {
      var ra = stateFor(a);
      var rb = stateFor(b);
      var sa = ra && ra.seq ? ra.seq : 0;
      var sb = rb && rb.seq ? rb.seq : 0;
      if (sa !== sb) return sb - sa;
      var pa = scoreOf(a);
      var pb = scoreOf(b);
      if (pa !== pb) return pb - pa;
      var ca = Number(a && a.classNo) || 0;
      var cb = Number(b && b.classNo) || 0;
      return ca - cb;
    });
    return copy;
  }

  function buildDeskChrome(st, now) {
    var t = typeof now === 'number' ? now : Date.now();
    var rec = stateFor(st);
    var cred = credTier(scoreOf(st));
    var classes = [];
    var badge = '';
    var fire = '';

    if (cred) {
      classes.push('cyber-cred-' + cred.tier);
      badge = '<span class="cyber-tier-badge">' + cred.label + '</span>';
    }

    if (rec && rec.undoAt && (t - rec.undoAt <= GLITCH_UNDO_MS)) {
      classes.push('cyber-glitch-undo');
      fire = '<div class="cyber-uplink-hud is-breach"><span>SIGNAL DROPPED</span></div>';
    } else if (rec && rec.lastAt && (t - rec.lastAt <= UPLINK_WINDOW_MS)) {
      classes.push('cyber-uplink-live');
      fire = '<div class="cyber-uplink-hud is-on"><span>⚡ LIVE UPLINK</span><span>RAM +' + rec.breaches + '</span></div>';
    }

    return {
      className: classes.join(' '),
      badge: badge,
      fire: fire
    };
  }

  function syncCyberSeats() {
    if (typeof document === 'undefined' || !document.querySelectorAll) return;
    var api = ctx();
    var cls = api && api.getClass ? api.getClass() : null;
    var active = isActive();
    var now = Date.now();
    var desks = document.querySelectorAll('.desk-card[data-student-id]');
    desks.forEach(function (desk) {
      var id = desk.getAttribute('data-student-id');
      var st = cls && cls.students ? cls.students.find(function (s) { return s.id === id; }) : null;
      desk.classList.remove(
        'cyber-cred-1', 'cyber-cred-2', 'cyber-cred-3', 'cyber-cred-4',
        'cyber-uplink-live', 'cyber-glitch-undo'
      );
      var oldBadge = desk.querySelector('.cyber-tier-badge');
      var oldHud = desk.querySelector('.cyber-uplink-hud');
      if (!active || !st) {
        if (oldBadge && oldBadge.parentNode) oldBadge.parentNode.removeChild(oldBadge);
        if (oldHud && oldHud.parentNode) oldHud.parentNode.removeChild(oldHud);
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
          oldBadge.className = 'cyber-tier-badge';
          desk.insertBefore(oldBadge, desk.firstChild);
        }
        oldBadge.outerHTML = part.badge;
      } else if (oldBadge && oldBadge.parentNode) {
        oldBadge.parentNode.removeChild(oldBadge);
      }
      var row = desk.querySelector('.desk-team-row');
      if (part.fire && row) {
        if (oldHud && oldHud.parentNode) oldHud.parentNode.removeChild(oldHud);
        var wrap = document.createElement('div');
        wrap.innerHTML = part.fire;
        if (wrap.firstChild) row.appendChild(wrap.firstChild);
      } else if (oldHud && oldHud.parentNode) {
        oldHud.parentNode.removeChild(oldHud);
      }
      if (row && row.classList.contains('desk-team-spacer')) {
        if (part.fire) row.removeAttribute('aria-hidden');
        else row.setAttribute('aria-hidden', 'true');
      }
    });
  }

  function scheduleCyberTick() {
    if (typeof MutationObserver !== 'function') return;
    if (cyberTimer) clearTimeout(cyberTimer);
    cyberTimer = 0;
    if (!isActive()) return;
    var now = Date.now();
    var nextAt = null;
    Object.keys(netById).forEach(function (k) {
      var r = netById[k];
      if (!r) return;
      if (r.lastAt && now - r.lastAt <= UPLINK_WINDOW_MS) {
        var exp = r.lastAt + UPLINK_WINDOW_MS;
        if (nextAt === null || exp < nextAt) nextAt = exp;
      }
      if (r.undoAt && now - r.undoAt <= GLITCH_UNDO_MS) {
        var uExp = r.undoAt + GLITCH_UNDO_MS;
        if (nextAt === null || uExp < nextAt) nextAt = uExp;
      }
    });
    if (nextAt === null) return;
    var delay = Math.min(2147483647, Math.max(80, nextAt - now + 50));
    cyberTimer = setTimeout(function () {
      cyberTimer = 0;
      syncCyberSeats();
      var api = ctx();
      if (api && api.leaderboardTab && api.leaderboardTab() === 'students' && api.renderLeaderboard) {
        api.renderLeaderboard();
      }
      scheduleCyberTick();
    }, delay);
  }

  if (root.HcsSkinHost && typeof root.HcsSkinHost.register === 'function') {
    var origSort = root.HcsSkinHost.sortStudents;
    if (typeof origSort === 'function' && !origSort.__cyberWrapped) {
      var wrappedSort = function (students) {
        if (isActive()) {
          return sortCyberStudents(students);
        }
        return origSort.call(root.HcsSkinHost, students);
      };
      wrappedSort.__cyberWrapped = true;
      root.HcsSkinHost.sortStudents = wrappedSort;
    }

    root.HcsSkinHost.register({
      id: 'cyber',
      noteScore: function (st, delta, at) {
        if ((Number(delta) || 0) <= 0) return;
        var rec = stateFor(st);
        if (!rec) return;
        var now = typeof at === 'number' && at > 0 ? at : Date.now();
        tickSeq += 1;
        rec.lastAt = now;
        rec.seq = tickSeq;
        rec.undoAt = 0;
        rec.breaches += 1;
      },
      undoScore: function (st, delta, at) {
        var rec = stateFor(st);
        if (!rec) return;
        var now = typeof at === 'number' && at > 0 ? at : Date.now();
        rec.lastAt = 0;
        rec.seq = 0;
        rec.undoAt = now;
      },
      clearStudent: function (st) {
        var k = keyOf(st);
        if (k && netById[k]) {
          delete netById[k];
        }
      },
      refresh: function () {
        syncCyberSeats();
        scheduleCyberTick();
      },
      scoreFloat: function (delta) {
        if (!isActive()) return null;
        if ((Number(delta) || 0) <= 0) return null;
        return { className: 'cyber-burst', ms: 1350 };
      },
      sortStudents: function (students) {
        if (!isActive()) return null;
        return sortCyberStudents(students);
      },
      deskChrome: function (st, now) {
        if (!isActive() || !st) return null;
        return buildDeskChrome(st, now);
      },
      leaderboardChrome: function (st, now) {
        if (!isActive() || !st) return null;
        var t = typeof now === 'number' ? now : Date.now();
        var rec = stateFor(st);
        var cred = credTier(scoreOf(st));
        var isLive = rec && rec.lastAt && (t - rec.lastAt <= UPLINK_WINDOW_MS);
        var clsName = cred ? 'cyber-cred-' + cred.tier : '';
        var tag = '';
        if (isLive) {
          tag = '<span class="cyber-board-tag is-live">[LIVE UPLINK]</span>';
        } else if (cred) {
          tag = '<span class="cyber-board-tag">' + cred.label + '</span>';
        }
        return { className: clsName, fire: tag };
      }
    });
  }

  if (typeof document !== 'undefined' && typeof MutationObserver === 'function' && document.documentElement) {
    var obs = new MutationObserver(function () {
      syncCyberSeats();
      if (isActive()) {
        var api = ctx();
        if (api && api.renderLeaderboard) api.renderLeaderboard();
      }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-skin'] });
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
