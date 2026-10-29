/**
 * Explain — Cohesion and Aspects sample sheet, and Sentence Patterns cards.
 * Worker URL: window.__EXPLAIN_WORKER__ (empty until Nest pastes the workers.dev URL).
 * No API key here.
 */
(function () {
  if (document.documentElement.getAttribute("data-explain-init") === "1") return;
  document.documentElement.setAttribute("data-explain-init", "1");

  var workerUrl = safeWorkerUrl(window.__EXPLAIN_WORKER__);
  var cache = Object.create(null);
  var inflight = null;
  var seq = 0;

  function safeWorkerUrl(raw) {
    if (raw == null) return "";
    var text = String(raw).trim();
    if (!text) return "";
    try {
      var url = new URL(text);
      if (url.protocol !== "https:" && url.protocol !== "http:") return "";
      if (url.username || url.password) return "";
      if (url.search || url.hash) return "";
      var path = url.pathname.replace(/\/+$/, "");
      return url.origin + path;
    } catch (e) {
      return "";
    }
  }

  function configured() {
    return workerUrl.length > 0;
  }

  function squash(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function decodeSample(raw) {
    return String(raw || "")
      .replace(/<[^>]*>/g, "")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, "\"")
      .replace(/&#39;|&apos;/gi, "'");
  }

  function highlightsFromHtml(raw) {
    var out = [];
    var re = /<strong>([\s\S]*?)<\/strong>/gi;
    var match;
    while ((match = re.exec(String(raw || "")))) {
      var piece = squash(decodeSample(match[1]));
      if (piece) out.push(piece);
    }
    return out.join(" / ");
  }

  function makeButton() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "explain-btn";
    if (configured()) {
      btn.textContent = "Explain";
      btn.setAttribute("aria-expanded", "false");
    } else {
      btn.textContent = "Explain soon";
      btn.disabled = true;
    }
    return btn;
  }

  function makePanel(id) {
    var panel = document.createElement("p");
    panel.className = "explain-panel";
    panel.id = id;
    panel.hidden = true;
    panel.setAttribute("role", "status");
    panel.setAttribute("aria-live", "polite");
    return panel;
  }

  function hidePanel(btn, panel) {
    panel.hidden = true;
    panel.textContent = "";
    if (btn && !btn.disabled) btn.setAttribute("aria-expanded", "false");
  }

  function setBusy(btn, busy) {
    if (busy) {
      btn.setAttribute("aria-busy", "true");
      btn.classList.add("is-busy");
      btn.textContent = "Explain…";
    } else if (configured()) {
      btn.removeAttribute("aria-busy");
      btn.classList.remove("is-busy");
      btn.disabled = false;
      btn.textContent = "Explain";
    }
  }

  function cancelAsk() {
    seq += 1;
    if (inflight) {
      inflight.abort();
      inflight = null;
    }
  }

  function showPanel(btn, panel, text) {
    panel.textContent = text;
    panel.hidden = false;
    if (btn && !btn.disabled) btn.setAttribute("aria-expanded", "true");
  }

  function payloadKey(payload) {
    return [
      payload.page,
      payload.itemLabel,
      payload.category || "",
      payload.sampleText,
      payload.highlight || "",
      payload.gloss || "",
    ].join("\n");
  }

  function studentError(status) {
    if (status === 429) return "Too many explanations. Wait a minute.";
    if (status === 400 || status === 413) return "That sample could not be sent.";
    return "Could not explain just now.";
  }

  function ask(payload, btn, panel) {
    var key = payloadKey(payload);
    if (cache[key]) {
      if (!panel.hidden) {
        hidePanel(btn, panel);
        return;
      }
      showPanel(btn, panel, cache[key]);
      return;
    }
    if (inflight) {
      inflight.abort();
      inflight = null;
    }
    var controller = new AbortController();
    var ticket = ++seq;
    inflight = controller;
    setBusy(btn, true);
    hidePanel(btn, panel);

    var body = {
      page: payload.page,
      itemLabel: payload.itemLabel,
      label: payload.label || payload.itemLabel,
      sampleText: payload.sampleText,
      sample: payload.sample || payload.sampleText,
      locale: document.documentElement.lang || "en-GB",
    };
    if (payload.category) body.category = payload.category;
    if (payload.set) body.set = payload.set;
    if (payload.highlight) body.highlight = payload.highlight;
    if (payload.gloss) body.gloss = payload.gloss;

    fetch(workerUrl, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { status: res.status, data: data };
      });
    }).then(function (result) {
      if (ticket !== seq) return;
      setBusy(btn, false);
      if (result.status === 200 && result.data && typeof result.data.explanation === "string" && result.data.explanation.trim()) {
        cache[key] = result.data.explanation.trim();
        showPanel(btn, panel, cache[key]);
        return;
      }
      showPanel(btn, panel, studentError(result.status));
    }).catch(function (err) {
      if (err && err.name === "AbortError") return;
      if (ticket !== seq) return;
      setBusy(btn, false);
      showPanel(btn, panel, studentError(0));
    });
  }

  function wire(btn, panel, getPayload) {
    if (!configured()) return;
    btn.addEventListener("click", function () {
      if (btn.getAttribute("aria-busy") === "true") return;
      if (document.body.classList.contains("hw-on") && btn.closest(".pattern-card")) return;
      var payload = getPayload();
      if (!payload || !payload.itemLabel || !payload.sampleText) return;
      ask(payload, btn, panel);
    });
  }

  function mountCohesion() {
    var sheet = document.getElementById("exampleSheet");
    var textEl = document.getElementById("exampleSheetText");
    var inner = sheet && sheet.querySelector(".example-sheet-inner");
    var roots = document.querySelectorAll(
      'details[data-section="cohesion"], details[data-section="aspects"]'
    );
    if (!sheet || !textEl || !inner || !roots.length) return;

    var row = document.createElement("div");
    row.className = "explain-row";
    var btn = makeButton();
    btn.id = "exampleExplainBtn";
    var panel = makePanel("exampleExplainPanel");
    btn.setAttribute("aria-controls", panel.id);
    row.appendChild(btn);
    inner.appendChild(row);
    inner.appendChild(panel);

    var shownKey = "";

    function expandedChip() {
      var i;
      for (i = 0; i < roots.length; i++) {
        var chip = roots[i].querySelector('.vocab-example[aria-expanded="true"]');
        if (chip) return chip;
      }
      return null;
    }

    function pageFor(chip) {
      var section = chip.closest("details[data-section]");
      if (section && section.getAttribute("data-section") === "aspects") return "Aspects";
      return "Cohesion";
    }

    function currentPayload() {
      var chip = expandedChip();
      if (!chip) return null;
      var raw = chip.getAttribute("data-example") || "";
      var sampleText = squash(decodeSample(raw));
      var list = chip.closest(".vocab-chips");
      var category = list ? squash(list.getAttribute("aria-label") || "") : "";
      if (!category) {
        var part = chip.closest(".part");
        var label = part && part.querySelector(".part-label");
        category = label ? squash(label.textContent) : "";
      }
      var itemLabel = squash(chip.textContent);
      var page = pageFor(chip);
      var payload = {
        page: page,
        itemLabel: itemLabel,
        label: itemLabel,
        category: category,
        sampleText: sampleText,
        sample: sampleText,
        highlight: highlightsFromHtml(raw),
        gloss: squash(chip.getAttribute("data-zh") || ""),
      };
      if (page === "Aspects" && category) payload.set = category;
      return payload;
    }

    function sync() {
      if (sheet.hidden) {
        cancelAsk();
        hidePanel(btn, panel);
        setBusy(btn, false);
        shownKey = "";
        return;
      }
      var payload = currentPayload();
      if (!payload) return;
      var key = payloadKey(payload);
      if (key === shownKey) return;
      cancelAsk();
      shownKey = key;
      hidePanel(btn, panel);
      setBusy(btn, false);
    }

    wire(btn, panel, currentPayload);

    var observer = new MutationObserver(sync);
    observer.observe(sheet, { attributes: true, attributeFilter: ["hidden"] });
    observer.observe(textEl, { childList: true, characterData: true, subtree: true });
    sync();
  }

  function mountPatterns() {
    if (!document.body.classList.contains("sentence-patterns")) return;
    var cards = document.querySelectorAll("article.pattern-card");
    var n = 0;
    Array.prototype.forEach.call(cards, function (card) {
      var example = card.querySelector(".pattern-example");
      var frame = card.querySelector(".pattern-frame");
      if (!example || !frame || card.querySelector(".explain-btn")) return;
      n += 1;
      var row = document.createElement("div");
      row.className = "explain-row";
      var btn = makeButton();
      var panel = makePanel("patternExplain" + n);
      btn.setAttribute("aria-controls", panel.id);
      row.appendChild(btn);
      example.insertAdjacentElement("afterend", panel);
      example.insertAdjacentElement("afterend", row);

      var section = card.closest("details[data-section]");
      var title = section && section.querySelector(".section-title");
      var glossEl = frame.querySelector(".gloss");
      var payload = {
        page: "Sentence Patterns",
        itemLabel: squash(frame.textContent),
        category: title ? squash(title.textContent) : (section ? section.getAttribute("data-section") || "" : ""),
        sampleText: squash(example.textContent),
        highlight: squash(Array.prototype.map.call(example.querySelectorAll("mark.cohesion-hl"), function (mark) {
          return squash(mark.textContent);
        }).filter(Boolean).join(" / ")),
        gloss: glossEl ? squash(glossEl.getAttribute("data-zh") || "") : "",
      };
      wire(btn, panel, function () { return payload; });
    });
  }

  mountCohesion();
  mountPatterns();
})();
