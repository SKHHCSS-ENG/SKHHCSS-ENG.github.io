/* Pixel Arcade skin pack (pixel.js) — independent 16-bit combo chain & timer gauge,
   CONTINUE? undo state, and critical score floats (does not use SparkFire). */
(function (root) {
  var COMBO_WINDOW_MS = 45000;
  var CONTINUE_WINDOW_MS = 18000;
  var stateById = {};
  var pixelTimer = 0;

  function ctx() {
    return root.HcsSkinHost && typeof root.HcsSkinHost.context === 'function'
      ? root.HcsSkinHost.context()
      : null;
  }

  function isActive() {
    return typeof document !== 'undefined' &&
      document.documentElement &&
      document.documentElement.getAttribute('data-skin') === 'pixel';
  }

  function keyOf(st) {
    if (!st) return '';
    return String(st.id != null ? st.id : (st.classNo != null ? st.classNo : st.name || ''));
  }

  function recordFor(st) {
    var k = keyOf(st);
    if (!k) return null;
    if (!stateById[k]) {
      stateById[k] = { chain: 0, lastAt: 0, undoAt: 0, lastDelta: 0 };
    }
    return stateById[k];
  }

  function activeChain(rec, now) {
    if (!rec || !rec.chain || !rec.lastAt) return 0;
    if (now - rec.lastAt > COMBO_WINDOW_MS) return 0;
    return rec.chain;
  }

  function remainingPct(rec, now) {
    if (!rec || !rec.lastAt) return 0;
    var elapsed = Math.max(0, now - rec.lastAt);
    if (elapsed >= COMBO_WINDOW_MS) return 0;
    return Math.max(8, Math.round(((COMBO_WINDOW_MS - elapsed) / COMBO_WINDOW_MS) * 100));
  }

  function chainLabel(chain) {
    if (chain >= 4) return 'MAX JACKPOT!';
    if (chain === 3) return '3x HYPER!';
    if (chain === 2) return '2x SUPER';
    return '1x COIN';
  }

  function scoreOf(st) {
    if (!st) return 0;
    if (typeof st.score === 'number') return st.score;
    if (typeof st.points === 'number') return st.points;
    return Number(st.score) || 0;
  }

  function rankAmongClass(st) {
    var api = ctx();
    if (!st) return 0;
    var sScore = scoreOf(st);
    if (sScore <= 0) return 0;
    var cls = api && typeof api.getClass === 'function' ? api.getClass() : null;
    var list = cls && Array.isArray(cls.students) ? cls.students : null;
    if (!list || !list.length) {
      if (sScore >= 10) return 1;
      if (sScore >= 5) return 2;
      return 3;
    }
    var higher = 0;
    for (var i = 0; i < list.length; i++) {
      var other = scoreOf(list[i]);
      if (other > sScore) higher++;
    }
    return higher + 1;
  }

  function buildDeskChrome(st, now) {
    var t = typeof now === 'number' ? now : Date.now();
    var rec = recordFor(st);
    var chain = activeChain(rec, t);
    var inContinue = rec && rec.undoAt && (t - rec.undoAt <= CONTINUE_WINDOW_MS);
    var rank = rankAmongClass(st);
    var classes = [];
    var badge = '';
    var fire = '';

    if (rank >= 1 && rank <= 3) {
      classes.push('pixel-tier-' + rank);
      var playerTag = rank === 1 ? '1P HI-SCORE' : (rank === 2 ? '2P CHALLENGER' : '3P ARCADE');
      badge = '<span class="pixel-tier-badge">' + playerTag + '</span>';
    }

    if (inContinue) {
      classes.push('pixel-continue-state');
      fire = '<div class="pixel-combo-hud is-continue"><span>CONTINUE? 9...</span></div>';
    } else if (chain >= 1) {
      classes.push('pixel-chain-' + Math.min(4, chain));
      var pct = remainingPct(rec, t);
      fire =
        '<div class="pixel-combo-hud is-on">' +
          '<span>' + chainLabel(chain) + '</span>' +
          '<span class="pixel-combo-bar"><span class="pixel-combo-fill" style="width:' + pct + '%"></span></span>' +
        '</div>';
    }

    return {
      className: classes.join(' '),
      badge: badge,
      fire: fire
    };
  }

  function syncPixelSeats() {
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
        'pixel-tier-1', 'pixel-tier-2', 'pixel-tier-3',
        'pixel-chain-1', 'pixel-chain-2', 'pixel-chain-3', 'pixel-chain-4',
        'pixel-continue-state'
      );
      var oldBadge = desk.querySelector('.pixel-tier-badge');
      var oldHud = desk.querySelector('.pixel-combo-hud');
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
          oldBadge.className = 'pixel-tier-badge';
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

  function schedulePixelTick() {
    if (typeof MutationObserver !== 'function') return;
    if (pixelTimer) clearTimeout(pixelTimer);
    pixelTimer = 0;
    if (!isActive()) return;
    var now = Date.now();
    var nextAt = null;
    Object.keys(stateById).forEach(function (k) {
      var r = stateById[k];
      if (!r) return;
      if (r.lastAt && now - r.lastAt <= COMBO_WINDOW_MS) {
        var exp = r.lastAt + COMBO_WINDOW_MS;
        if (nextAt === null || exp < nextAt) nextAt = exp;
      }
      if (r.undoAt && now - r.undoAt <= CONTINUE_WINDOW_MS) {
        var uExp = r.undoAt + CONTINUE_WINDOW_MS;
        if (nextAt === null || uExp < nextAt) nextAt = uExp;
      }
    });
    if (nextAt === null) return;
    var delay = Math.min(2147483647, Math.max(80, nextAt - now + 50));
    pixelTimer = setTimeout(function () {
      pixelTimer = 0;
      syncPixelSeats();
      var api = ctx();
      if (api && api.leaderboardTab && api.leaderboardTab() === 'students' && api.renderLeaderboard) {
        api.renderLeaderboard();
      }
      schedulePixelTick();
    }, delay);
  }

  if (root.HcsSkinHost && typeof root.HcsSkinHost.register === 'function') {
    root.HcsSkinHost.register({
      id: 'pixel',
      noteScore: function (st, delta, at) {
        if ((Number(delta) || 0) <= 0) return;
        var rec = recordFor(st);
        if (!rec) return;
        var now = typeof at === 'number' && at > 0 ? at : Date.now();
        var prev = activeChain(rec, now);
        rec.chain = Math.min(4, prev + 1);
        rec.lastAt = now;
        rec.undoAt = 0;
        rec.lastDelta = Number(delta) || 1;
      },
      undoScore: function (st, delta, at) {
        var rec = recordFor(st);
        if (!rec) return;
        var now = typeof at === 'number' && at > 0 ? at : Date.now();
        rec.chain = 0;
        rec.lastAt = 0;
        rec.undoAt = now;
      },
      clearStudent: function (st) {
        var k = keyOf(st);
        if (k && stateById[k]) {
          delete stateById[k];
        }
      },
      refresh: function () {
        syncPixelSeats();
        schedulePixelTick();
      },
      scoreFloat: function (delta) {
        if (!isActive()) return null;
        var n = Number(delta) || 0;
        if (n <= 0) return null;
        if (n >= 2) {
          return { className: 'pixel-burst-crit', ms: 1450 };
        }
        return { className: 'pixel-burst', ms: 1200 };
      },
      deskChrome: function (st, now) {
        if (!isActive() || !st) return null;
        return buildDeskChrome(st, now);
      },
      leaderboardChrome: function (st, now) {
        if (!isActive() || !st) return null;
        var t = typeof now === 'number' ? now : Date.now();
        var rec = recordFor(st);
        var chain = activeChain(rec, t);
        var rank = rankAmongClass(st);
        var clsName = rank >= 1 && rank <= 3 ? 'pixel-tier-' + rank : '';
        var tag = '';
        if (chain >= 1) {
          tag = '<span class="pixel-board-tag">' + chainLabel(chain) + '</span>';
        } else if (rank === 1) {
          tag = '<span class="pixel-board-tag">1P ★</span>';
        }
        return { className: clsName, fire: tag };
      }
    });
  }

  if (typeof document !== 'undefined' && typeof MutationObserver === 'function' && document.documentElement) {
    var obs = new MutationObserver(function () {
      syncPixelSeats();
      if (isActive()) {
        var api = ctx();
        if (api && api.renderLeaderboard) api.renderLeaderboard();
      }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-skin'] });
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
