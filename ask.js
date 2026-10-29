/**
 * Ask — circle bottom-left. Find first (site-find.js), then a short Ask AI
 * chat. Three assistant replies per open; closing the sheet resets the count.
 * No daily cap. Worker: window.__EXPLAIN_WORKER__ (page "Ask"), else the
 * deployed deepseek-explain host. No API key here.
 * Does not touch the Tools dock or Explain pills.
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
  floater.className = "ask-floater";
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

  function place() {
    var findApi = window.SiteFind;
    var overlap = findApi && findApi.rectsOverlap ? findApi.rectsOverlap : function () { return false; };
    var dock = document.querySelector(".bottom-dock");
    floater.style.bottom = "calc(12px + env(safe-area-inset-bottom, 0px))";
    floater.removeAttribute("data-ask-overlap");
    var circle = floater.getBoundingClientRect();
    var dockRect = dock ? dock.getBoundingClientRect() : null;
    if (dockRect && overlap(circle, dockRect)) {
      var basePx = Math.max(0, window.innerHeight - circle.bottom);
      var lift = Math.ceil(circle.bottom - dockRect.top + 10);
      floater.style.bottom = (basePx + Math.max(0, lift)) + "px";
      circle = floater.getBoundingClientRect();
      dockRect = dock.getBoundingClientRect();
      if (overlap(circle, dockRect) || circle.top < 8) {
        floater.setAttribute("data-ask-overlap", "1");
        if (sheetOpen()) closeSheet();
      }
    }
    if (!sheetOpen()) return;
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
    if (dockRect && overlap(sheetRect, dockRect)) {
      var again = Math.ceil(window.innerHeight - dockRect.top + 10);
      sheet.style.bottom = again + "px";
      sheet.style.maxHeight = Math.max(160, window.innerHeight - again - 12) + "px";
    }
  }

  floater.addEventListener("click", function () {
    if (sheetOpen()) closeSheet();
    else openSheet();
  });
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
    closeSheet();
  }, true);

  window.addEventListener("resize", place);
  if (window.ResizeObserver) {
    var dock = document.querySelector(".bottom-dock");
    if (dock) new ResizeObserver(place).observe(dock);
  }
  if (window.MutationObserver && document.body) {
    var watch = new MutationObserver(place);
    watch.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  }

  renderFind();
  place();
})();
