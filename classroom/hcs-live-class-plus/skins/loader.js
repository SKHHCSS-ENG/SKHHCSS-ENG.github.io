/**
 * Thin skin loader for HCS Live Class +.
 *
 * The page includes this file four times, distinguished by data-hcs-skin:
 *   boot   end of <head>, after the page style: blocking pack stylesheets
 *   mount  inside the SKIN band, after Minimalist: pack buttons
 *   packs  immediately after spark-fire.js: pack scripts, still during parse
 *   wire   end of <body>: Default, Minimalist, and pack button clicks
 *
 * HcsSkinHost is the seam the page calls. A pack registers hooks; the page
 * does not name Spark inside scoring or desk paint.
 *
 * After DOMContentLoaded the page calls attach with:
 *   getClass()            current class, or null
 *   leaderboardTab()      'students' | 'groups' | 'feed'
 *   renderLeaderboard()   repaint the board
 *   formatRankOrdinal(n)  1st, 2nd, 3rd
 *
 * Pack hooks (all optional):
 *   noteScore(st, delta, at)   a positive add, at is the history stamp
 *   undoScore(st, delta, at)   undo of that add
 *   clearStudent(st)           score reset
 *   refresh()                  seats and timers after a paint or score change
 *   scoreFloat(delta)          { className, ms } to replace the +pts float, or null
 *   sortStudents(students)     leaderboard order, or null to keep the page sort
 *   deskChrome(st, now)        { className, badge, fire } HTML fragments
 *   leaderboardChrome(st, now) { className, fire }
 */
(function (root) {
  if (!root.HcsSkinHost) {
    var packs = [];
    var ctx = null;

    function each(name, args) {
      for (var i = 0; i < packs.length; i++) {
        var fn = packs[i][name];
        if (typeof fn === 'function') fn.apply(packs[i], args);
      }
    }

    root.HcsSkinHost = {
      register: function (pack) {
        if (!pack || !pack.id) return;
        for (var i = 0; i < packs.length; i++) {
          if (packs[i].id === pack.id) {
            packs[i] = pack;
            return;
          }
        }
        packs.push(pack);
      },
      attach: function (next) {
        ctx = next || null;
      },
      context: function () {
        return ctx;
      },
      noteScore: function (st, delta, at) {
        each('noteScore', [st, delta, at]);
      },
      undoScore: function (st, delta, at) {
        each('undoScore', [st, delta, at]);
      },
      clearStudent: function (st) {
        var handled = false;
        for (var i = 0; i < packs.length; i++) {
          if (typeof packs[i].clearStudent === 'function') {
            packs[i].clearStudent(st);
            handled = true;
          }
        }
        if (!handled && st) st.sparkPts = [];
      },
      refresh: function () {
        each('refresh', []);
      },
      scoreFloat: function (delta, isTeamSync) {
        for (var i = 0; i < packs.length; i++) {
          if (typeof packs[i].scoreFloat !== 'function') continue;
          var spec = packs[i].scoreFloat(delta, isTeamSync);
          if (spec) return spec;
        }
        return null;
      },
      sortStudents: function (students) {
        for (var i = 0; i < packs.length; i++) {
          if (typeof packs[i].sortStudents !== 'function') continue;
          var sorted = packs[i].sortStudents(students);
          if (sorted) return sorted;
        }
        return null;
      },
      deskChrome: function (st, now) {
        var className = '';
        var badge = '';
        var fire = '';
        for (var i = 0; i < packs.length; i++) {
          if (typeof packs[i].deskChrome !== 'function') continue;
          var part = packs[i].deskChrome(st, now) || {};
          if (part.className) className += (className ? ' ' : '') + part.className;
          if (part.badge) badge += part.badge;
          if (part.fire) fire += part.fire;
        }
        return { className: className, badge: badge, fire: fire };
      },
      leaderboardChrome: function (st, now) {
        var className = '';
        var fire = '';
        for (var i = 0; i < packs.length; i++) {
          if (typeof packs[i].leaderboardChrome !== 'function') continue;
          var part = packs[i].leaderboardChrome(st, now) || {};
          if (part.className) className += (className ? ' ' : '') + part.className;
          if (part.fire) fire += part.fire;
        }
        return { className: className, fire: fire };
      }
    };
  }

  if (typeof document === 'undefined') return;

  var mode = document.currentScript && document.currentScript.getAttribute('data-hcs-skin');
  var registryPacks = (root.HcsSkinRegistry && root.HcsSkinRegistry.packs) || [];

  function buttonId(pack) {
    if (pack.buttonId) return pack.buttonId;
    var id = String(pack.id || '');
    return 'btnSkin' + id.charAt(0).toUpperCase() + id.slice(1);
  }

  function writeDuringParse(html) {
    if (!html || document.readyState !== 'loading') return;
    document.write(html);
  }

  if (mode === 'boot') {
    var links = '';
    for (var i = 0; i < registryPacks.length; i++) {
      var css = registryPacks[i].css;
      if (!css) continue;
      links += '<link rel="stylesheet" href="' + String(css).replace(/"/g, '') + '">';
    }
    writeDuringParse(links);
    return;
  }

  if (mode === 'mount') {
    var buttons = '';
    for (var j = 0; j < registryPacks.length; j++) {
      var pack = registryPacks[j];
      var label = String(pack.label || pack.id || '').replace(/[&<>"]/g, function (ch) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch];
      });
      var idAttr = String(pack.id || '').replace(/"/g, '');
      buttons += '<button type="button" id="' + buttonId(pack) + '" class="skin-choice" data-skin-pack="' + idAttr + '" aria-pressed="false">' + label + '</button>';
    }
    writeDuringParse(buttons);
    return;
  }

  if (mode === 'packs') {
    var scripts = '';
    for (var s = 0; s < registryPacks.length; s++) {
      var src = registryPacks[s].js;
      if (!src) continue;
      scripts += '<script src="' + String(src).replace(/"/g, '') + '"><\/script>';
    }
    writeDuringParse(scripts);
    return;
  }

  if (mode === 'wire') {
    var KEY = 'hcsLiveClassPlus_skin_v1';

    function isPack(skin) {
      return !!(root.HcsSkinRegistry && root.HcsSkinRegistry.known(skin));
    }

    function skinNow() {
      var skin = document.documentElement.getAttribute('data-skin');
      if (skin === 'minimalist' || isPack(skin)) return skin;
      return 'default';
    }

    function syncPressed() {
      var skin = skinNow();
      var defBtn = document.getElementById('btnSkinDefault');
      var minBtn = document.getElementById('btnSkinMinimalist');
      if (defBtn) defBtn.setAttribute('aria-pressed', skin === 'default' ? 'true' : 'false');
      if (minBtn) minBtn.setAttribute('aria-pressed', skin === 'minimalist' ? 'true' : 'false');
      for (var n = 0; n < registryPacks.length; n++) {
        var btn = document.getElementById(buttonId(registryPacks[n]));
        if (btn) btn.setAttribute('aria-pressed', skin === registryPacks[n].id ? 'true' : 'false');
      }
    }

    function applySkin(skin) {
      if (skin === 'minimalist' || isPack(skin)) {
        document.documentElement.setAttribute('data-skin', skin);
      } else {
        document.documentElement.removeAttribute('data-skin');
        skin = 'default';
      }
      try {
        localStorage.setItem(KEY, skin);
      } catch (err) {}
      syncPressed();
    }

    var defBtn = document.getElementById('btnSkinDefault');
    var minBtn = document.getElementById('btnSkinMinimalist');
    if (defBtn) defBtn.addEventListener('click', function () { applySkin('default'); });
    if (minBtn) minBtn.addEventListener('click', function () { applySkin('minimalist'); });
    for (var k = 0; k < registryPacks.length; k++) {
      (function (pack) {
        var btn = document.getElementById(buttonId(pack));
        if (btn) btn.addEventListener('click', function () { applySkin(pack.id); });
      })(registryPacks[k]);
    }
    syncPressed();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
