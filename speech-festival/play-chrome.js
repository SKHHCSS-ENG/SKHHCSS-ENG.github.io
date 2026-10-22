/* Top chrome hides on scroll-down and returns on scroll-up.
   Play pill drags from the grip only, and stays off the Tools dock.
   Mirrors U41 (9c0db4b). Opt in with class sf-play-pill on <html>.
   Load this script immediately after <header>. */
(function initSfPlayChrome() {
  var root = document.documentElement;
  if (!root.classList.contains("sf-play-pill")) return;

  var header = document.querySelector("header");
  if (header) {
    var syncHeaderHeight = function () {
      root.style.setProperty("--sf-header-h", header.offsetHeight + "px");
    };
    syncHeaderHeight();
    if (window.ResizeObserver) new ResizeObserver(syncHeaderHeight).observe(header);
  }

  if (header) {
    var lastY = window.scrollY || 0;
    var acc = 0;
    var ticking = false;
    var gesture = null;
    var holdUntil = 0;
    /* A tap's scrollIntoView should not slide the header away under the finger.
       A real drag-scroll still hides it. */
    document.addEventListener("pointerdown", function (ev) {
      gesture = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, tap: true };
    }, { passive: true });
    document.addEventListener("pointermove", function (ev) {
      if (!gesture || ev.pointerId !== gesture.id) return;
      if (Math.abs(ev.clientX - gesture.x) + Math.abs(ev.clientY - gesture.y) > 12) gesture.tap = false;
    }, { passive: true });
    function endGesture(ev) {
      if (!gesture || ev.pointerId !== gesture.id) return;
      var el = ev.target;
      var tapsStanza = el && el.closest && el.closest(".stanza, #titlePlay");
      if (gesture.tap && tapsStanza) holdUntil = Date.now() + 600;
      gesture = null;
    }
    document.addEventListener("pointerup", endGesture, { passive: true });
    document.addEventListener("pointercancel", endGesture, { passive: true });
    function onScrollFrame() {
      ticking = false;
      var y = window.scrollY || 0;
      if (y < 0) y = 0;
      var dy = y - lastY;
      lastY = y;
      var tapScroll = (gesture && gesture.tap) || Date.now() < holdUntil;
      if (y <= 56) {
        acc = 0;
        root.classList.remove("chrome-hidden");
        return;
      }
      if (dy === 0) return;
      if (tapScroll) {
        acc = 0;
        if (dy < -12) root.classList.remove("chrome-hidden");
        return;
      }
      if ((dy > 0 && acc < 0) || (dy < 0 && acc > 0)) acc = 0;
      acc += dy;
      if (acc > 18) {
        root.classList.add("chrome-hidden");
        acc = 0;
      } else if (acc < -12) {
        root.classList.remove("chrome-hidden");
        acc = 0;
      }
    }
    window.addEventListener("scroll", function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScrollFrame);
      }
    }, { passive: true });
    header.addEventListener("focusin", function () {
      acc = 0;
      root.classList.remove("chrome-hidden");
    });
  }

  function bootPill() {
    var dock = document.getElementById("ytPersist");
    var handle = document.getElementById("ytDrag");
    if (!dock || !handle || dock.dataset.sfPillReady === "1") return;
    dock.dataset.sfPillReady = "1";

    var parts = location.pathname.replace(/\/+$/, "").split("/");
    var slug = parts[parts.length - 1] || "page";
    if (slug === "index.html") slug = parts[parts.length - 2] || "page";
    var POS_KEY = "sf-playdock-pos-" + slug;

    function readInset(name) {
      var v = parseFloat(getComputedStyle(root).getPropertyValue(name));
      return Number.isFinite(v) ? v : 0;
    }
    function obstacleRect() {
      var el = document.getElementById("bottomDock");
      if (!el) return null;
      var r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return null;
      return r;
    }
    function clampPlayDock(left, top) {
      var w = dock.offsetWidth;
      var h = dock.offsetHeight;
      var vw = window.innerWidth;
      var vh = window.innerHeight;
      var m = 8;
      var minL = m + readInset("--sal");
      var minT = m + readInset("--sat");
      var maxL = vw - w - m - readInset("--sar");
      var maxT = vh - h - m - readInset("--sab");
      if (maxL < minL) maxL = minL;
      if (maxT < minT) maxT = minT;
      var L = Math.min(Math.max(left, minL), maxL);
      var T = Math.min(Math.max(top, minT), maxT);
      var ob = obstacleRect();
      if (ob) {
        var gap = 10;
        var overlaps = L < ob.right + gap && (L + w) > ob.left - gap && T < ob.bottom + gap && (T + h) > ob.top - gap;
        if (overlaps) {
          var above = ob.top - gap - h;
          if (above >= minT) T = above;
          else {
            var leftOf = ob.left - gap - w;
            if (leftOf >= minL) L = leftOf;
            else {
              var rightOf = ob.right + gap;
              if (rightOf <= maxL) L = rightOf;
            }
          }
          L = Math.min(Math.max(L, minL), maxL);
          T = Math.min(Math.max(T, minT), maxT);
        }
      }
      return { x: Math.round(L), y: Math.round(T) };
    }
    function placePlayDock(x, y) {
      dock.style.setProperty("--playdock-x", x + "px");
      dock.style.setProperty("--playdock-y", y + "px");
      dock.classList.add("is-placed");
    }
    function clearPlacement() {
      dock.classList.remove("is-placed");
      dock.style.removeProperty("--playdock-x");
      dock.style.removeProperty("--playdock-y");
      try { sessionStorage.removeItem(POS_KEY); } catch (e) {}
    }
    function reclamp() {
      if (!dock.classList.contains("compact") || !dock.classList.contains("is-placed")) return;
      var x = parseFloat(dock.style.getPropertyValue("--playdock-x"));
      var y = parseFloat(dock.style.getPropertyValue("--playdock-y"));
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      var c = clampPlayDock(x, y);
      placePlayDock(c.x, c.y);
    }
    window.sfSyncPlayDock = reclamp;

    var drag = null;
    handle.addEventListener("pointerdown", function (ev) {
      if (!dock.classList.contains("compact")) return;
      if (ev.button != null && ev.button !== 0) return;
      var rect = dock.getBoundingClientRect();
      drag = {
        id: ev.pointerId,
        sx: ev.clientX,
        sy: ev.clientY,
        ox: rect.left,
        oy: rect.top,
        moved: false,
        wasPlaced: dock.classList.contains("is-placed")
      };
      dock.classList.add("is-dragging");
      try { handle.setPointerCapture(ev.pointerId); } catch (e) {}
      ev.preventDefault();
      ev.stopPropagation();
    });
    handle.addEventListener("pointermove", function (ev) {
      if (!drag || ev.pointerId !== drag.id) return;
      var dx = ev.clientX - drag.sx;
      var dy = ev.clientY - drag.sy;
      if (!drag.moved) {
        if (Math.abs(dx) + Math.abs(dy) < 5) return;
        drag.moved = true;
      }
      var c = clampPlayDock(drag.ox + dx, drag.oy + dy);
      placePlayDock(c.x, c.y);
      ev.preventDefault();
    });
    function endDrag(ev) {
      if (!drag || (ev && ev.pointerId !== drag.id)) return;
      dock.classList.remove("is-dragging");
      if (drag.moved) {
        var x = parseFloat(dock.style.getPropertyValue("--playdock-x"));
        var y = parseFloat(dock.style.getPropertyValue("--playdock-y"));
        try { sessionStorage.setItem(POS_KEY, JSON.stringify({ x: x, y: y })); } catch (e) {}
      } else if (!drag.wasPlaced) {
        clearPlacement();
      }
      drag = null;
    }
    handle.addEventListener("pointerup", endDrag);
    handle.addEventListener("pointercancel", endDrag);
    window.addEventListener("resize", function () { reclamp(); }, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", function () { reclamp(); }, { passive: true });
    }
    var mo = new MutationObserver(function () { reclamp(); });
    mo.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    try {
      var saved = JSON.parse(sessionStorage.getItem(POS_KEY) || "null");
      if (saved && typeof saved.x === "number" && typeof saved.y === "number") {
        var restored = clampPlayDock(saved.x, saved.y);
        placePlayDock(restored.x, restored.y);
      }
    } catch (e) {}
  }

  if (document.getElementById("ytPersist") && document.getElementById("ytDrag")) bootPill();
  else document.addEventListener("DOMContentLoaded", bootPill);
})();
