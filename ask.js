/**
 * Ask — circle bottom-left. Drag moves it (touch or mouse) and the last
 * spot is kept in localStorage for this browser. A tap opens the sheet;
 * a tap again, Close, or a press outside collapses it. A drag does not toggle.
 * Find first (site-find.js), then a short Ask AI chat. Three assistant
 * replies per open; closing the sheet resets the count.
 * No daily cap. Worker: window.__EXPLAIN_WORKER__ (page "Ask"), else the
 * deployed deepseek-explain host. No API key here.
 * Does not restyle the Tools dock. On drop, and whenever the dock, an open
 * Cohesion sheet, or an Explain pill would cover the circle, it snaps clear.
 */
(function () {
  if (document.documentElement.getAttribute("data-ask-init") === "1") return;
  document.documentElement.setAttribute("data-ask-init", "1");

  var TURNS = 3;
  var NUDGE = "這次 Ask 已達 3 輪。請改用上方 Find 找頁面，或到樣本下的 Explain 查看該項目。";
  var FALLBACK_WORKER = "https://deepseek-explain.skhhcss-eng.workers.dev";

  var workerUrl = safeWorkerUrl(window.__EXPLAIN_WORKER__) || FALLBACK_WORKER;
  var turns = 0;
  var seq = 0;
  var inflight = null;
  var currentHits = [];

  var floater = document.createElement("button");
  floater.type = "button";
  floater.className = "ask-floater api-mesh";
  floater.draggable = false;
  floater.textContent = "Ask";
  floater.setAttribute("aria-label", "Ask");
  floater.setAttribute("aria-expanded", "false");
  floater.setAttribute("aria-controls", "askSheet");
  floater.setAttribute("aria-haspopup", "dialog");

  var scrim = document.createElement("button");
  scrim.type = "button";
  scrim.className = "ask-scrim";
  scrim.hidden = true;
  scrim.setAttribute("aria-label", "Close Ask");
  scrim.tabIndex = -1;

  var sheet = document.createElement("section");
  sheet.className = "ask-sheet";
  sheet.id = "askSheet";
  sheet.hidden = true;
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-labelledby", "askTitle");

  var bar = document.createElement("div");
  bar.className = "ask-bar";
  var title = document.createElement("h2");
  title.className = "ask-title";
  title.id = "askTitle";
  title.textContent = "Ask";
  var closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "ask-close";
  closeBtn.textContent = "Close";
  bar.appendChild(title);
  bar.appendChild(closeBtn);

  var findLabel = document.createElement("label");
  findLabel.className = "ask-label";
  findLabel.appendChild(document.createTextNode("Find"));
  var findInput = document.createElement("input");
  findInput.type = "search";
  findInput.className = "ask-find";
  findInput.placeholder = "Format or topic";
  findInput.setAttribute("aria-label", "Find a page");
  findInput.autocomplete = "off";
  findInput.spellcheck = false;
  findInput.enterKeyHint = "search";
  findLabel.appendChild(findInput);

  var hint = document.createElement("p");
  hint.className = "ask-hint";
  hint.textContent = "Try a format or topic";

  var hitsBox = document.createElement("ul");
  hitsBox.className = "ask-hits";

  var chat = document.createElement("div");
  chat.className = "ask-chat";
  var kicker = document.createElement("p");
  kicker.className = "ask-kicker";
  kicker.textContent = "Ask AI";
  var log = document.createElement("div");
  log.className = "ask-log";
  log.setAttribute("aria-live", "polite");
  var form = document.createElement("form");
  form.className = "ask-form";
  form.setAttribute("action", "");
  var chatInput = document.createElement("input");
  chatInput.type = "text";
  chatInput.className = "ask-q";
  chatInput.maxLength = 400;
  chatInput.placeholder = "Short question";
  chatInput.setAttribute("aria-label", "Ask AI");
  chatInput.autocomplete = "off";
  chatInput.enterKeyHint = "send";
  var sendBtn = document.createElement("button");
  sendBtn.type = "submit";
  sendBtn.className = "ask-send";
  sendBtn.textContent = "Send";
  form.appendChild(chatInput);
  form.appendChild(sendBtn);
  chat.appendChild(kicker);
  chat.appendChild(log);
  chat.appendChild(form);

  sheet.appendChild(bar);
  sheet.appendChild(findLabel);
  sheet.appendChild(hint);
  sheet.appendChild(hitsBox);
  sheet.appendChild(chat);

  document.body.appendChild(floater);
  document.body.appendChild(scrim);
  document.body.appendChild(sheet);

  function safeWorkerUrl(raw) {
    if (raw == null) return "";
    var text = String(raw).trim();
    if (!text) return "";
    try {
      var url = new URL(text);
      if (url.protocol !== "https:" && url.protocol !== "http:") return "";
      if (url.username || url.password) return "";
      if (url.search || url.hash) return "";
      return url.origin + url.pathname.replace(/\/+$/, "");
    } catch (e) {
      return "";
    }
  }

  function hrefFor(path) {
    if (!path || path === "/") return "/";
    if (path.charAt(0) === "/") return path;
    return "/" + path;
  }

  function pagePath() {
    var path = String(location.pathname || "/");
    if (location.hash) path += location.hash;
    if (!path || path.length > 180) return "site";
    return path;
  }

  function findHitsText() {
    var lines = [];
    var i;
    for (i = 0; i < currentHits.length && i < 3; i++) {
      lines.push(currentHits[i].title + " \u2014 " + currentHits[i].path);
    }
    return lines.join("\n");
  }

  function renderFind() {
    var q = findInput.value;
    var hits = window.SiteFind && window.SiteFind.search ? window.SiteFind.search(q, 3) : [];
    currentHits = hits;
    hitsBox.textContent = "";
    if (!hits.length) {
      hint.hidden = false;
      hint.textContent = "Try a format or topic";
    } else {
      hint.hidden = true;
    }
    var i;
    for (i = 0; i < hits.length; i++) {
      var link = document.createElement("a");
      link.className = "ask-hit";
      link.href = hrefFor(hits[i].path);
      var name = document.createElement("span");
      name.className = "ask-hit-title";
      name.textContent = hits[i].title;
      var where = document.createElement("span");
      where.className = "ask-hit-path";
      where.textContent = hits[i].path;
      link.appendChild(name);
      link.appendChild(where);
      var item = document.createElement("li");
      item.appendChild(link);
      hitsBox.appendChild(item);
    }
  }

  function knownPaths() {
    var entries = window.SiteFind && window.SiteFind.entries ? window.SiteFind.entries : [];
    var paths = [];
    var i;
    for (i = 0; i < entries.length; i++) {
      if (entries[i].path && entries[i].path !== "/") paths.push(entries[i].path);
    }
    paths.sort(function (a, b) { return b.length - a.length; });
    return paths;
  }

  function renderReply(text) {
    var p = document.createElement("p");
    p.className = "ask-reply";
    var paths = knownPaths();
    var rest = String(text || "");
    while (rest) {
      var at = -1;
      var found = "";
      var i;
      for (i = 0; i < paths.length; i++) {
        var hit = rest.indexOf(paths[i]);
        if (hit !== -1 && (at === -1 || hit < at)) {
          at = hit;
          found = paths[i];
        }
      }
      if (at === -1) {
        p.appendChild(document.createTextNode(rest));
        break;
      }
      if (at > 0) p.appendChild(document.createTextNode(rest.slice(0, at)));
      var a = document.createElement("a");
      a.href = hrefFor(found);
      a.textContent = found;
      p.appendChild(a);
      rest = rest.slice(at + found.length);
    }
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
  }

  function renderMine(text) {
    var p = document.createElement("p");
    p.className = "ask-mine";
    p.textContent = text;
    log.appendChild(p);
  }

  function unlockComposer() {
    if (turns >= TURNS) return;
    chatInput.disabled = false;
    sendBtn.disabled = false;
  }

  function lockChat() {
    chatInput.disabled = true;
    sendBtn.disabled = true;
    chatInput.placeholder = "Find or Explain";
  }

  function resetChat() {
    seq += 1;
    if (inflight) {
      inflight.abort();
      inflight = null;
    }
    turns = 0;
    log.textContent = "";
    chatInput.value = "";
    chatInput.placeholder = "Short question";
    chatInput.disabled = false;
    sendBtn.disabled = false;
  }

  function sheetOpen() {
    return !sheet.hidden;
  }

  function openSheet() {
    if (floater.getAttribute("data-ask-overlap") === "1") return;
    resetChat();
    findInput.value = "";
    renderFind();
    sheet.hidden = false;
    scrim.hidden = false;
    floater.setAttribute("aria-expanded", "true");
    place();
    if (sheetOpen()) findInput.focus();
  }

  function closeSheet() {
    seq += 1;
    if (inflight) {
      inflight.abort();
      inflight = null;
    }
    turns = 0;
    sheet.hidden = true;
    scrim.hidden = true;
    floater.setAttribute("aria-expanded", "false");
    place();
    if (floater.getAttribute("data-ask-overlap") !== "1") floater.focus();
  }

  function sendMessage(message) {
    var text = String(message || "").replace(/\s+/g, " ").trim();
    if (!text || turns >= TURNS || inflight) return;
    var turn = turns + 1;
    renderMine(text);
    chatInput.value = "";
    var ticket = ++seq;
    var controller = new AbortController();
    inflight = controller;
    chatInput.disabled = true;
    sendBtn.disabled = true;
    var pending = document.createElement("p");
    pending.className = "ask-reply";
    pending.textContent = "\u2026";
    log.appendChild(pending);

    fetch(workerUrl, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page: "Ask",
        pagePath: pagePath(),
        turn: turn,
        findHits: findHitsText(),
        message: text
      }),
      signal: controller.signal
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { status: res.status, data: data };
      });
    }).then(function (result) {
      if (ticket !== seq) return;
      inflight = null;
      if (pending.parentNode) pending.parentNode.removeChild(pending);
      var reply = result.data && typeof result.data.reply === "string" ? result.data.reply.trim() : "";
      if (result.status === 200 && reply) {
        if (turn === TURNS && reply.indexOf("\u9019\u6b21 Ask \u5df2\u9054 3 \u8f2a") === -1) {
          reply = reply.replace(/\s+$/, "") + " " + NUDGE;
        }
        renderReply(reply);
        turns = turn;
        if (turns >= TURNS) lockChat();
        else unlockComposer();
        return;
      }
      renderReply(result.status === 429 ? "Too many questions. Wait a minute." : "Ask is unavailable just now.");
      unlockComposer();
    }).catch(function (err) {
      if (err && err.name === "AbortError") return;
      if (ticket !== seq) return;
      inflight = null;
      if (pending.parentNode) pending.parentNode.removeChild(pending);
      renderReply("Ask is unavailable just now.");
      unlockComposer();
    });
  }

  var POS_KEY = "ask-floater-pos";
  var TAP_PX = 8;
  var SNAP_GAP = 10;
  var EDGE = 12;
  var stored = readStored();
  var dragState = null;
  var swallowClickUntil = 0;
  var placeFrame = 0;

  function readStored() {
    try {
      var raw = localStorage.getItem(POS_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || typeof data.x !== "number" || typeof data.y !== "number") return null;
      if (!isFinite(data.x) || !isFinite(data.y)) return null;
      return {
        x: Math.min(1, Math.max(0, data.x)),
        y: Math.min(1, Math.max(0, data.y))
      };
    } catch (e) {
      return null;
    }
  }

  function writeStored(left, top) {
    var b = bounds();
    var spanL = b.maxL - b.minL;
    var spanT = b.maxT - b.minT;
    var data = {
      x: spanL > 0 ? (left - b.minL) / spanL : 0,
      y: spanT > 0 ? (top - b.minT) / spanT : 0
    };
    stored = {
      x: Math.min(1, Math.max(0, data.x)),
      y: Math.min(1, Math.max(0, data.y))
    };
    try { localStorage.setItem(POS_KEY, JSON.stringify(stored)); } catch (e) {}
  }

  function floaterSize() {
    return {
      w: floater.offsetWidth || 56,
      h: floater.offsetHeight || 56
    };
  }

  function insets() {
    if (!insets.el) {
      var el = document.createElement("div");
      el.setAttribute("aria-hidden", "true");
      el.style.cssText = "position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);";
      document.body.appendChild(el);
      insets.el = el;
    }
    var cs = getComputedStyle(insets.el);
    return {
      top: parseFloat(cs.paddingTop) || 0,
      right: parseFloat(cs.paddingRight) || 0,
      bottom: parseFloat(cs.paddingBottom) || 0,
      left: parseFloat(cs.paddingLeft) || 0
    };
  }

  function bounds() {
    var size = floaterSize();
    var pad = insets();
    var minL = EDGE + pad.left;
    var minT = EDGE + pad.top;
    var maxL = window.innerWidth - size.w - EDGE - pad.right;
    var maxT = window.innerHeight - size.h - EDGE - pad.bottom;
    if (maxL < minL) maxL = minL;
    if (maxT < minT) maxT = minT;
    return { minL: minL, minT: minT, maxL: maxL, maxT: maxT, w: size.w, h: size.h };
  }

  function clampPos(left, top) {
    var b = bounds();
    return {
      left: Math.min(b.maxL, Math.max(b.minL, left)),
      top: Math.min(b.maxT, Math.max(b.minT, top))
    };
  }

  function defaultPos() {
    var b = bounds();
    return { left: b.minL, top: b.maxT };
  }

  function storedPos() {
    if (!stored) return defaultPos();
    var b = bounds();
    return clampPos(
      b.minL + stored.x * (b.maxL - b.minL),
      b.minT + stored.y * (b.maxT - b.minT)
    );
  }

  function applyPos(left, top) {
    floater.style.left = Math.round(left) + "px";
    floater.style.top = Math.round(top) + "px";
    floater.style.right = "auto";
    floater.style.bottom = "auto";
  }

  function rectsOverlap(a, b) {
    var findApi = window.SiteFind;
    if (findApi && findApi.rectsOverlap) return findApi.rectsOverlap(a, b);
    if (!a || !b) return false;
    if (a.width < 2 || a.height < 2 || b.width < 2 || b.height < 2) return false;
    return a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;
  }

  function visibleRect(el) {
    if (!el || el.hidden) return null;
    if (el.closest && (el.closest("[hidden]") || el.closest("details:not([open])"))) return null;
    var r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    if (r.bottom <= 0 || r.right <= 0 || r.top >= window.innerHeight || r.left >= window.innerWidth) return null;
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
  }

  function obstacleRects() {
    var list = [];
    var dock = visibleRect(document.querySelector(".bottom-dock"));
    if (dock) {
      dock.dock = true;
      list.push(dock);
    }
    var exampleSheet = document.getElementById("exampleSheet");
    if (exampleSheet && !exampleSheet.hidden) {
      var inner = exampleSheet.querySelector(".example-sheet-inner") || exampleSheet;
      var sheetRect = visibleRect(inner);
      if (sheetRect) list.push(sheetRect);
    }
    var pills = document.querySelectorAll(".explain-btn");
    var i;
    for (i = 0; i < pills.length; i++) {
      var pill = visibleRect(pills[i]);
      if (pill) list.push(pill);
    }
    return list;
  }

  function circleBox(left, top) {
    var b = bounds();
    return {
      left: left,
      top: top,
      right: left + b.w,
      bottom: top + b.h,
      width: b.w,
      height: b.h
    };
  }

  function hits(left, top, obs) {
    var box = circleBox(left, top);
    var i;
    for (i = 0; i < obs.length; i++) {
      var o = obs[i];
      var block = o.dock
        ? {
            left: o.left - SNAP_GAP,
            top: o.top - SNAP_GAP,
            right: o.right + SNAP_GAP,
            bottom: o.bottom + SNAP_GAP,
            width: o.width + SNAP_GAP * 2,
            height: o.height + SNAP_GAP * 2
          }
        : o;
      if (rectsOverlap(box, block)) return true;
    }
    return false;
  }

  function resolvePos(left, top, obs) {
    var start = clampPos(left, top);
    if (!hits(start.left, start.top, obs)) return { left: start.left, top: start.top, ok: true };
    var b = bounds();
    var candidates = [];
    var i;
    for (i = 0; i < obs.length; i++) {
      var o = obs[i];
      candidates.push({ left: start.left, top: o.top - b.h - SNAP_GAP });
      candidates.push({ left: start.left, top: o.bottom + SNAP_GAP });
      candidates.push({ left: o.left - b.w - SNAP_GAP, top: start.top });
      candidates.push({ left: o.right + SNAP_GAP, top: start.top });
    }
    candidates.push(defaultPos());
    candidates.push({ left: b.minL, top: b.minT });
    candidates.push({ left: b.maxL, top: b.minT });
    candidates.push({ left: b.maxL, top: b.maxT });
    candidates.push({ left: (b.minL + b.maxL) / 2, top: b.minT });
    var best = null;
    for (i = 0; i < candidates.length; i++) {
      var c = clampPos(candidates[i].left, candidates[i].top);
      if (hits(c.left, c.top, obs)) continue;
      var d = (c.left - start.left) * (c.left - start.left) + (c.top - start.top) * (c.top - start.top);
      if (!best || d < best.d) best = { d: d, left: c.left, top: c.top };
    }
    if (best) return { left: best.left, top: best.top, ok: true };
    return { left: start.left, top: start.top, ok: false };
  }

  function placeSheet() {
    if (!sheetOpen()) return;
    var dock = document.querySelector(".bottom-dock");
    var dockRect = dock ? dock.getBoundingClientRect() : null;
    if (dockRect && dockRect.width >= 2 && dockRect.height >= 2 && dockRect.top < window.innerHeight && dockRect.bottom > 0) {
      var bottomPx = Math.max(12, Math.ceil(window.innerHeight - dockRect.top + 10));
      sheet.style.bottom = bottomPx + "px";
      sheet.style.maxHeight = Math.max(160, window.innerHeight - bottomPx - 12) + "px";
    } else {
      sheet.style.bottom = "calc(12px + env(safe-area-inset-bottom, 0px))";
      sheet.style.maxHeight = "";
    }
    var sheetRect = sheet.getBoundingClientRect();
    dockRect = dock ? dock.getBoundingClientRect() : null;
    if (dockRect && rectsOverlap(sheetRect, dockRect)) {
      var again = Math.ceil(window.innerHeight - dockRect.top + 10);
      sheet.style.bottom = again + "px";
      sheet.style.maxHeight = Math.max(160, window.innerHeight - again - 12) + "px";
    }
  }

  function markOverlap(ok) {
    if (ok) {
      floater.removeAttribute("data-ask-overlap");
      return;
    }
    floater.setAttribute("data-ask-overlap", "1");
    if (sheetOpen()) closeSheet();
  }

  function place() {
    if (dragState) {
      placeSheet();
      return;
    }
    var desired = storedPos();
    var resolved = resolvePos(desired.left, desired.top, obstacleRects());
    applyPos(resolved.left, resolved.top);
    markOverlap(resolved.ok);
    placeSheet();
  }

  function schedulePlace() {
    if (placeFrame) return;
    placeFrame = requestAnimationFrame(function () {
      placeFrame = 0;
      place();
    });
  }

  function endDrag(e) {
    if (!dragState || e.pointerId !== dragState.id) return;
    var moved = dragState.moved;
    dragState = null;
    floater.classList.remove("is-dragging");
    try { floater.releasePointerCapture(e.pointerId); } catch (err) {}
    if (!moved) return;
    swallowClickUntil = Date.now() + 500;
    var rect = floater.getBoundingClientRect();
    var obs = obstacleRects();
    var resolved = resolvePos(rect.left, rect.top, obs);
    if (!resolved.ok) resolved = resolvePos(storedPos().left, storedPos().top, obs);
    applyPos(resolved.left, resolved.top);
    if (resolved.ok) writeStored(resolved.left, resolved.top);
    markOverlap(resolved.ok);
    placeSheet();
  }

  floater.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    var rect = floater.getBoundingClientRect();
    dragState = {
      id: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      left: rect.left,
      top: rect.top,
      moved: false
    };
    try { floater.setPointerCapture(e.pointerId); } catch (err) {}
  });

  floater.addEventListener("pointermove", function (e) {
    if (!dragState || e.pointerId !== dragState.id) return;
    var dx = e.clientX - dragState.sx;
    var dy = e.clientY - dragState.sy;
    if (!dragState.moved) {
      if (dx * dx + dy * dy < TAP_PX * TAP_PX) return;
      dragState.moved = true;
      floater.classList.add("is-dragging");
    }
    if (e.cancelable) e.preventDefault();
    var next = clampPos(dragState.left + dx, dragState.top + dy);
    applyPos(next.left, next.top);
  }, { passive: false });

  floater.addEventListener("pointerup", endDrag);
  floater.addEventListener("pointercancel", endDrag);

  floater.addEventListener("click", function (e) {
    if (Date.now() < swallowClickUntil) {
      swallowClickUntil = 0;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (sheetOpen()) closeSheet();
    else openSheet();
  });

  document.addEventListener("click", function (e) {
    if (Date.now() >= swallowClickUntil) return;
    swallowClickUntil = 0;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  scrim.addEventListener("click", closeSheet);
  closeBtn.addEventListener("click", closeSheet);
  findInput.addEventListener("input", renderFind);
  findInput.addEventListener("search", renderFind);
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    sendMessage(chatInput.value);
  });
  document.addEventListener("keydown", function (e) {
    if (sheetOpen() && e.key === "Escape") {
      e.preventDefault();
      closeSheet();
    }
  });
  document.addEventListener("pointerdown", function (e) {
    if (!sheetOpen()) return;
    if (sheet.contains(e.target)) return;
    if (floater.contains(e.target)) return;
    closeSheet();
  }, true);

  document.addEventListener("toggle", schedulePlace, true);
  window.addEventListener("resize", schedulePlace);
  window.addEventListener("scroll", schedulePlace, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", schedulePlace);
    window.visualViewport.addEventListener("scroll", schedulePlace);
  }
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(schedulePlace);
    var dock = document.querySelector(".bottom-dock");
    if (dock) ro.observe(dock);
    var exampleSheet = document.getElementById("exampleSheet");
    if (exampleSheet) ro.observe(exampleSheet);
  }
  if (window.MutationObserver && document.body) {
    var watch = new MutationObserver(schedulePlace);
    watch.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    var exampleSheetWatch = document.getElementById("exampleSheet");
    if (exampleSheetWatch) {
      watch.observe(exampleSheetWatch, { attributes: true, attributeFilter: ["hidden"] });
    }
  }

  renderFind();
  place();
})();
