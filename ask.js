/**
 * Ask — circle bottom-left. Drag moves it (touch or mouse) and the last
 * spot is kept in localStorage for this browser. A tap opens the sheet;
 * a tap again, Close, or a press outside collapses it. A drag does not toggle.
 * One shared box. The sheet opens in Find (site-find.js). Dict and Ask are
 * the other modes. Chips read FIND, DICT, ASK. Send runs Find in Find mode,
 * posts mode "dict" in Dict mode, and posts one chat turn in Ask mode.
 * Find, Dict, and Ask have no student turn cap and no “n left” lock.
 * A Dict hit shows one 譯 gloss line, then the English senses. The gloss
 * comes from the gloss field, or from a 譯 line in the reply. A miss is
 * "Try another spelling?" with no gloss line.
 * Closing the sheet clears the open chat. Worker: window.__EXPLAIN_WORKER__
 * (page "Ask"), else the deployed deepseek-explain host. No API key here.
 * Does not restyle the Tools dock. On drop, and whenever the dock, an open
 * Cohesion sheet, or an Explain pill would cover the circle, it snaps clear.
 * On a narrow screen (under 860px) a [data-ask-clear] zone is the same kind
 * of obstacle. If the page sets data-ask-park on <html> and the circle
 * would cover a marked zone, it parks in the top-right corner instead. If
 * nowhere is clear, the circle hides.
 */
(function () {
  if (document.documentElement.getAttribute("data-ask-init") === "1") return;
  document.documentElement.setAttribute("data-ask-init", "1");

  var FALLBACK_WORKER = "https://deepseek-explain.skhhcss-eng.workers.dev";

  var workerUrl = safeWorkerUrl(window.__EXPLAIN_WORKER__) || FALLBACK_WORKER;
  var seq = 0;
  var inflight = null;
  var dictSeq = 0;
  var dictInflight = null;
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
  sheet.setAttribute("aria-label", "Ask");

  var mode = "find";

  var top = document.createElement("div");
  top.className = "ask-top";
  var modeBar = document.createElement("div");
  modeBar.className = "ask-mode";
  modeBar.setAttribute("role", "tablist");
  modeBar.setAttribute("aria-label", "FIND, DICT, or ASK");
  var findTab = document.createElement("button");
  findTab.type = "button";
  findTab.className = "ask-mode-btn is-on";
  findTab.id = "askModeFind";
  findTab.textContent = "FIND";
  findTab.setAttribute("role", "tab");
  findTab.setAttribute("aria-selected", "true");
  findTab.setAttribute("aria-controls", "askFindPanel");
  findTab.tabIndex = 0;
  var dictTab = document.createElement("button");
  dictTab.type = "button";
  dictTab.className = "ask-mode-btn is-dict";
  dictTab.id = "askModeDict";
  dictTab.textContent = "DICT";
  dictTab.setAttribute("role", "tab");
  dictTab.setAttribute("aria-selected", "false");
  dictTab.setAttribute("aria-controls", "askDictPanel");
  dictTab.tabIndex = -1;
  var askTab = document.createElement("button");
  askTab.type = "button";
  askTab.className = "ask-mode-btn is-ask";
  askTab.id = "askModeAsk";
  askTab.textContent = "ASK";
  askTab.setAttribute("role", "tab");
  askTab.setAttribute("aria-selected", "false");
  askTab.setAttribute("aria-controls", "askChatPanel");
  askTab.tabIndex = -1;
  modeBar.appendChild(findTab);
  modeBar.appendChild(dictTab);
  modeBar.appendChild(askTab);
  var closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "ask-close";
  closeBtn.textContent = "\u00d7";
  closeBtn.setAttribute("aria-label", "Close");
  top.appendChild(modeBar);
  top.appendChild(closeBtn);

  var form = document.createElement("form");
  form.className = "ask-form";
  form.setAttribute("action", "");
  var box = document.createElement("input");
  box.type = "search";
  box.id = "askBox";
  box.className = "ask-box";
  box.placeholder = "Format or topic";
  box.setAttribute("aria-label", "FIND a page");
  box.autocomplete = "off";
  box.spellcheck = false;
  box.enterKeyHint = "search";
  var sendBtn = document.createElement("button");
  sendBtn.type = "submit";
  sendBtn.className = "ask-send api-mesh";
  sendBtn.textContent = "SEND";
  form.appendChild(box);
  form.appendChild(sendBtn);

  var hitsBox = document.createElement("ul");
  hitsBox.className = "ask-hits";
  hitsBox.id = "askFindPanel";
  hitsBox.setAttribute("role", "tabpanel");
  hitsBox.setAttribute("aria-labelledby", "askModeFind");

  var chat = document.createElement("div");
  chat.className = "ask-chat";
  chat.id = "askChatPanel";
  chat.hidden = true;
  chat.setAttribute("role", "tabpanel");
  chat.setAttribute("aria-labelledby", "askModeAsk");
  var log = document.createElement("div");
  log.className = "ask-log";
  log.setAttribute("aria-live", "polite");
  chat.appendChild(log);

  var dictPanel = document.createElement("div");
  dictPanel.className = "ask-chat";
  dictPanel.id = "askDictPanel";
  dictPanel.hidden = true;
  dictPanel.setAttribute("role", "tabpanel");
  dictPanel.setAttribute("aria-labelledby", "askModeDict");
  var dictLog = document.createElement("div");
  dictLog.className = "ask-log";
  dictLog.setAttribute("aria-live", "polite");
  dictPanel.appendChild(dictLog);

  sheet.appendChild(top);
  sheet.appendChild(form);
  sheet.appendChild(hitsBox);
  sheet.appendChild(dictPanel);
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
    if (window.SiteFind && window.SiteFind.hrefFor) return window.SiteFind.hrefFor(path);
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
    var q = box.value;
    var hits = window.SiteFind && window.SiteFind.search ? window.SiteFind.search(q, 3) : [];
    currentHits = hits;
    hitsBox.textContent = "";
    hitsBox.hidden = mode !== "find" || !hits.length;
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
    syncShell();
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
    syncShell();
    log.scrollTop = log.scrollHeight;
  }

  function renderMine(text) {
    var p = document.createElement("p");
    p.className = "ask-mine";
    p.textContent = text;
    log.appendChild(p);
    syncShell();
  }

  function unlockComposer() {
    if (inflight || mode !== "ask") return;
    box.disabled = false;
    sendBtn.disabled = false;
    box.placeholder = "Short question";
  }

  function resetChat() {
    seq += 1;
    dictSeq += 1;
    if (inflight) {
      inflight.abort();
      inflight = null;
    }
    if (dictInflight) {
      dictInflight.abort();
      dictInflight = null;
    }
    log.textContent = "";
    dictLog.textContent = "";
    box.value = "";
    box.disabled = false;
    sendBtn.disabled = false;
    syncShell();
  }

  function paintMode() {
    var finding = mode === "find";
    var defining = mode === "dict";
    var asking = mode === "ask";
    findTab.classList.toggle("is-on", finding);
    dictTab.classList.toggle("is-on", defining);
    askTab.classList.toggle("is-on", asking);
    findTab.setAttribute("aria-selected", finding ? "true" : "false");
    dictTab.setAttribute("aria-selected", defining ? "true" : "false");
    askTab.setAttribute("aria-selected", asking ? "true" : "false");
    findTab.tabIndex = finding ? 0 : -1;
    dictTab.tabIndex = defining ? 0 : -1;
    askTab.tabIndex = asking ? 0 : -1;
    sheet.setAttribute("data-ask-mode", mode);
    chat.hidden = !asking;
    dictPanel.hidden = !defining;
    box.removeAttribute("lang");
    if (finding) {
      if (box.type !== "search") box.type = "search";
      box.placeholder = "Format or topic";
      box.setAttribute("aria-label", "FIND a page");
      box.enterKeyHint = "search";
      box.spellcheck = false;
      box.removeAttribute("maxlength");
      box.disabled = false;
      sendBtn.disabled = false;
      renderFind();
      return;
    }
    if (defining) {
      if (box.type !== "text") box.type = "text";
      box.maxLength = 40;
      box.placeholder = "Word or short phrase";
      box.setAttribute("aria-label", "DICT");
      box.enterKeyHint = "search";
      box.lang = "en-GB";
      box.spellcheck = true;
      box.disabled = !!dictInflight;
      sendBtn.disabled = !!dictInflight;
      hitsBox.hidden = true;
      syncShell();
      return;
    }
    if (box.type !== "text") box.type = "text";
    box.maxLength = 400;
    box.setAttribute("aria-label", "ASK");
    box.enterKeyHint = "send";
    box.spellcheck = true;
    var busy = !!inflight;
    box.disabled = busy;
    sendBtn.disabled = busy;
    box.placeholder = "Short question";
    hitsBox.hidden = true;
    syncShell();
  }

  var shellMin = 0;
  var placing = false;

  function panelContentPx(el) {
    var wasHidden = el.hidden;
    var prev = el.style.cssText;
    el.hidden = false;
    el.style.cssText = "position:absolute;visibility:hidden;display:flex;flex-direction:column;height:auto;max-height:none;min-height:0;flex:none;overflow:visible;width:" + Math.max(0, sheet.clientWidth - 16) + "px;pointer-events:none;";
    var h = el.scrollHeight;
    el.style.cssText = prev;
    el.hidden = wasHidden;
    return h;
  }

  function chromePx() {
    var cs = getComputedStyle(sheet);
    var pad = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    var border = (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0);
    var gap = parseFloat(cs.rowGap || cs.gap) || 0;
    var topEl = sheet.querySelector(".ask-top");
    var formEl = sheet.querySelector(".ask-form");
    return topEl.getBoundingClientRect().height + formEl.getBoundingClientRect().height + pad + border + gap * 2;
  }

  function shellCapPx() {
    var cap = sheetDesignMaxPx();
    var inlineMax = parseFloat(sheet.style.maxHeight);
    if (isFinite(inlineMax) && inlineMax > 0) cap = Math.min(cap, inlineMax);
    return cap;
  }

  function applyShellMin() {
    var cap = shellCapPx();
    var findLive = currentHits.length > 0;
    var askLive = log.children.length > 0;
    var dictLive = dictLog.children.length > 0;
    var liveCount = (findLive ? 1 : 0) + (askLive ? 1 : 0) + (dictLive ? 1 : 0);
    var shared = 0;
    if (liveCount >= 2) {
      var tallest = 0;
      if (findLive) tallest = Math.max(tallest, panelContentPx(hitsBox));
      if (askLive) tallest = Math.max(tallest, panelContentPx(chat));
      if (dictLive) tallest = Math.max(tallest, panelContentPx(dictPanel));
      shared = chromePx() + tallest;
    }
    var hold = Math.max(shared, shellMin || 0);
    if (!hold) {
      sheet.style.minHeight = "";
      return;
    }
    sheet.style.minHeight = Math.min(cap, Math.ceil(hold)) + "px";
  }

  function syncShell() {
    var filled = mode === "find" ? currentHits.length > 0 : (mode === "dict" ? dictLog.children.length > 0 : log.children.length > 0);
    sheet.classList.toggle("is-filled", filled);
    if (!filled) shellMin = 0;
    if (!sheetOpen() || placing) {
      applyShellMin();
      return;
    }
    placing = true;
    placeSheet();
    placing = false;
  }

  function modeFilled(which) {
    if (which === "find") return currentHits.length > 0;
    if (which === "dict") return dictLog.children.length > 0;
    return log.children.length > 0;
  }

  function setMode(next) {
    if (next !== "find" && next !== "dict" && next !== "ask") return;
    var changed = mode !== next;
    if (changed && sheetOpen()) {
      var srcFilled = modeFilled(mode);
      var destFilled = modeFilled(next);
      shellMin = srcFilled && destFilled ? Math.round(sheet.getBoundingClientRect().height) : 0;
    } else if (changed) {
      shellMin = 0;
    }
    if (changed && mode === "find") currentHits = [];
    mode = next;
    if (changed) box.value = "";
    paintMode();
  }

  function sheetOpen() {
    return !sheet.hidden;
  }

  function openSheet() {
    if (floater.getAttribute("data-ask-overlap") === "1") return;
    resetChat();
    setMode("find");
    sheet.hidden = false;
    scrim.hidden = false;
    floater.setAttribute("aria-expanded", "true");
    place();
    if (sheetOpen()) box.focus();
  }

  function closeSheet() {
    seq += 1;
    dictSeq += 1;
    if (inflight) {
      inflight.abort();
      inflight = null;
    }
    if (dictInflight) {
      dictInflight.abort();
      dictInflight = null;
    }
    sheet.hidden = true;
    scrim.hidden = true;
    floater.setAttribute("aria-expanded", "false");
    place();
    if (floater.getAttribute("data-ask-overlap") !== "1") floater.focus();
  }

  function sendMessage(message) {
    var text = String(message || "").replace(/\s+/g, " ").trim();
    if (!text || inflight) return;
    renderMine(text);
    box.value = "";
    var ticket = ++seq;
    var controller = new AbortController();
    inflight = controller;
    box.disabled = true;
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
        renderReply(reply);
        unlockComposer();
        return;
      }
      renderReply("Ask is unavailable just now.");
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

  function renderDictMine(text) {
    var p = document.createElement("p");
    p.className = "ask-mine";
    p.textContent = text;
    dictLog.appendChild(p);
    syncShell();
  }

  function renderDictText(text) {
    var wrap = document.createElement("div");
    wrap.className = "ask-reply ask-dict";
    var p = document.createElement("p");
    p.className = "ask-dict-plain";
    p.textContent = text;
    wrap.appendChild(p);
    dictLog.appendChild(wrap);
    syncShell();
    dictPanel.scrollTop = dictPanel.scrollHeight;
  }

  function dictGlossLine(line) {
    var matched = /^譯\s*[:：\-–—]?\s*(.+)$/.exec(String(line || "").replace(/\s+/g, " ").trim());
    if (!matched) return "";
    var text = matched[1].replace(/\s+/g, " ").trim().replace(/^譯\s*[:：\-–—]?\s*/, "");
    if (!/[\u3400-\u9fff]/.test(text)) return "";
    return text;
  }

  /** Prefer the gloss field. Otherwise a leading, or else a final, 譯 line in reply. */
  function dictGlossText(data) {
    var gloss = data && typeof data.gloss === "string" ? data.gloss.replace(/\s+/g, " ").trim() : "";
    gloss = gloss.replace(/^譯\s*[:：\-–—]?\s*/, "");
    if (gloss && /[\u3400-\u9fff]/.test(gloss)) return gloss;
    var reply = data && typeof data.reply === "string" ? data.reply.replace(/\r/g, "") : "";
    var lines = reply.split("\n").map(function (line) {
      return line.replace(/\s+/g, " ").trim();
    }).filter(Boolean);
    if (!lines.length) return "";
    var lead = dictGlossLine(lines[0]);
    if (lead) return lead;
    if (lines.length > 1) return dictGlossLine(lines[lines.length - 1]);
    return "";
  }

  function renderDictPayload(data) {
    var senses = data && Array.isArray(data.senses) ? data.senses : [];
    var word = data && typeof data.word === "string" ? data.word.trim() : "";
    var shown = [];
    var i;
    for (i = 0; i < senses.length && shown.length < 2; i++) {
      var pos = senses[i] && typeof senses[i].pos === "string" ? senses[i].pos.trim() : "";
      var definition = senses[i] && typeof senses[i].definition === "string" ? senses[i].definition.trim() : "";
      if (pos && definition) shown.push({ pos: pos, definition: definition });
    }
    if (!word || !shown.length) {
      var reply = data && typeof data.reply === "string" ? data.reply.trim() : "";
      renderDictText(reply || "Try another spelling?");
      return;
    }
    var wrap = document.createElement("div");
    wrap.className = "ask-reply ask-dict";
    var gloss = dictGlossText(data);
    if (gloss) {
      var glossLine = document.createElement("p");
      glossLine.className = "ask-dict-gloss";
      glossLine.lang = "zh-Hant";
      glossLine.textContent = "譯 " + gloss;
      wrap.appendChild(glossLine);
    }
    for (i = 0; i < shown.length; i++) {
      var head = document.createElement("p");
      head.className = "ask-dict-head";
      head.textContent = word + " \u2014 " + shown[i].pos;
      var def = document.createElement("p");
      def.className = "ask-dict-def";
      def.textContent = shown[i].definition;
      wrap.appendChild(head);
      wrap.appendChild(def);
    }
    if (data.example && typeof data.example === "string" && data.example.trim()) {
      var ex = document.createElement("p");
      ex.className = "ask-dict-ex";
      ex.textContent = "Example: " + data.example.trim();
      wrap.appendChild(ex);
    }
    dictLog.appendChild(wrap);
    syncShell();
    dictPanel.scrollTop = dictPanel.scrollHeight;
  }

  function unlockDict() {
    if (dictInflight || mode !== "dict") return;
    box.disabled = false;
    sendBtn.disabled = false;
    box.placeholder = "Word or short phrase";
  }

  function sendDict(message) {
    var text = String(message || "").replace(/\s+/g, " ").trim();
    if (!text || dictInflight || mode !== "dict") return;
    renderDictMine(text);
    box.value = "";
    var ticket = ++dictSeq;
    var controller = new AbortController();
    dictInflight = controller;
    box.disabled = true;
    sendBtn.disabled = true;
    var pending = document.createElement("p");
    pending.className = "ask-reply";
    pending.textContent = "\u2026";
    dictLog.appendChild(pending);
    syncShell();

    fetch(workerUrl, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "dict", word: text }),
      signal: controller.signal
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { status: res.status, data: data };
      });
    }).then(function (result) {
      if (ticket !== dictSeq) return;
      dictInflight = null;
      if (pending.parentNode) pending.parentNode.removeChild(pending);
      if (result.status === 200 && result.data && (result.data.reply || (result.data.senses && result.data.senses.length))) {
        renderDictPayload(result.data);
        unlockDict();
        return;
      }
      if (result.status === 404) {
        renderDictText("Try another spelling?");
        unlockDict();
        return;
      }
      renderDictText("The dictionary is unavailable just now.");
      unlockDict();
    }).catch(function (err) {
      if (err && err.name === "AbortError") return;
      if (ticket !== dictSeq) return;
      dictInflight = null;
      if (pending.parentNode) pending.parentNode.removeChild(pending);
      renderDictText("The dictionary is unavailable just now.");
      unlockDict();
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
      w: floater.offsetWidth || 44,
      h: floater.offsetHeight || 44
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
    if (window.innerWidth < 860) {
      var zones = document.querySelectorAll("[data-ask-clear]");
      for (i = 0; i < zones.length; i++) {
        var zone = visibleRect(zones[i]);
        if (zone) list.push(zone);
      }
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

  function parkPos() {
    if (window.innerWidth >= 860) return null;
    if (!document.documentElement.hasAttribute("data-ask-park")) return null;
    var b = bounds();
    return { left: b.maxL, top: b.minT };
  }

  function resolvePos(left, top, obs) {
    var start = clampPos(left, top);
    if (!hits(start.left, start.top, obs)) return { left: start.left, top: start.top, ok: true };
    var parked = parkPos();
    if (parked && !hits(parked.left, parked.top, obs)) {
      return { left: parked.left, top: parked.top, ok: true };
    }
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

  function sheetDesignMaxPx() {
    var prev = sheet.style.maxHeight;
    sheet.style.maxHeight = "";
    var px = parseFloat(getComputedStyle(sheet).maxHeight);
    sheet.style.maxHeight = prev;
    if (!isFinite(px) || px <= 0) px = 19.5 * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);
    return px;
  }

  function applySheetMax(bottomPx) {
    var room = window.innerHeight - bottomPx - 12;
    var cap = sheetDesignMaxPx();
    if (room < cap - 1) sheet.style.maxHeight = Math.max(160, room) + "px";
    else sheet.style.maxHeight = "";
  }

  function placeSheet() {
    if (!sheetOpen()) return;
    var pad = insets();
    var bottomPx = 12 + pad.bottom;
    var dock = document.querySelector(".bottom-dock");
    var dockRect = dock ? dock.getBoundingClientRect() : null;
    var dockClear = dockRect && dockRect.width >= 2 && dockRect.height >= 2 && dockRect.top < window.innerHeight && dockRect.bottom > 0;
    if (dockClear) bottomPx = Math.max(bottomPx, Math.ceil(window.innerHeight - dockRect.top + 10));
    sheet.style.bottom = bottomPx + "px";
    applySheetMax(bottomPx);
    applyShellMin();
    var sheetRect = sheet.getBoundingClientRect();
    dockRect = dock ? dock.getBoundingClientRect() : null;
    if (dockRect && rectsOverlap(sheetRect, dockRect)) {
      bottomPx = Math.max(bottomPx, Math.ceil(window.innerHeight - dockRect.top + 10));
      sheet.style.bottom = bottomPx + "px";
      applySheetMax(bottomPx);
      applyShellMin();
      sheetRect = sheet.getBoundingClientRect();
    }
    var circle = floater.getBoundingClientRect();
    // The circle stays where it is. Lift only the sheet so the shared box
    // is not hidden under the circle.
    if (circle.width >= 2 && circle.height >= 2 && rectsOverlap(sheetRect, circle)) {
      var lift = Math.ceil(window.innerHeight - circle.top + 8);
      if (lift > bottomPx) {
        bottomPx = lift;
        sheet.style.bottom = bottomPx + "px";
        applySheetMax(bottomPx);
        applyShellMin();
      }
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
  findTab.addEventListener("click", function () { setMode("find"); });
  dictTab.addEventListener("click", function () { setMode("dict"); });
  askTab.addEventListener("click", function () { setMode("ask"); });
  modeBar.addEventListener("keydown", function (e) {
    var order = ["find", "dict", "ask"];
    var tabs = { find: findTab, dict: dictTab, ask: askTab };
    var idx = order.indexOf(mode);
    var next = "";
    if (e.key === "ArrowRight") next = order[Math.min(order.length - 1, idx + 1)];
    else if (e.key === "ArrowLeft") next = order[Math.max(0, idx - 1)];
    else if (e.key === "End") next = "ask";
    else if (e.key === "Home") next = "find";
    else return;
    e.preventDefault();
    setMode(next);
    tabs[next].focus();
  });
  box.addEventListener("input", function () {
    if (mode === "find") renderFind();
  });
  box.addEventListener("search", function () {
    if (mode === "find") renderFind();
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (mode === "find") renderFind();
    else if (mode === "dict") sendDict(box.value);
    else sendMessage(box.value);
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

  function observeClearZones() {
    if (!ro) return;
    var zones = document.querySelectorAll("[data-ask-clear]");
    var z;
    for (z = 0; z < zones.length; z++) ro.observe(zones[z]);
  }

  observeClearZones();
  var sceneRoot = document.getElementById("scene");
  if (sceneRoot && window.MutationObserver) {
    var zoneWatch = new MutationObserver(function () {
      observeClearZones();
      schedulePlace();
    });
    zoneWatch.observe(sceneRoot, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "hidden"]
    });
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

  paintMode();
  place();
})();
