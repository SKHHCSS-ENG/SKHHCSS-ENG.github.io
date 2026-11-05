/**
 * HCS Live Class + assistant.
 * Nest: DEFAULT_WORKER_URL is the only assistant host. Do not point it at
 * deepseek-explain, say-it-louder, or ces-softspeak.
 * The open unit is the ball plus the cream strip (and any reply). Placement
 * and drag bounds use that whole box, so an open strip cannot sit on a
 * desk name chip or the floor zoom bar.
 */
(function (root) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof document !== 'undefined') boot(root, api);

  function factory() {
  // Nest: Live Class + assistant Worker. Edit this host only.
  var DEFAULT_WORKER_URL = 'https://live-class-plus.skhhcss-eng.workers.dev';
  var POS_KEY = 'hcsLiveClassPlus_ball_v1';
  var GAP = 10;
  var TAP_PX = 8;
  var ACTIONS = {
    hide_names: 'Hide names — go?',
    show_names: 'Show names — go?',
    zoom_in: 'Zoom in — go?',
    zoom_out: 'Zoom out — go?',
    zoom_reset: 'Reset zoom — go?',
    random_pick: 'Pick a student — go?',
    open_seating: 'Open Seating — go?',
    open_scores: 'Open Scores — go?',
    tidy_snap: 'Tidy desks — go?'
  };

  function safeWorkerUrl(raw) {
    if (raw == null) return '';
    var text = String(raw).trim();
    if (!text) return '';
    try {
      var url = new URL(text);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
      if (url.username || url.password) return '';
      if (url.search || url.hash) return '';
      return url.origin + url.pathname.replace(/\/+$/, '');
    } catch (e) {
      return '';
    }
  }

  function isBlockedWorker(url) {
    var host = '';
    try { host = new URL(url).hostname.toLowerCase(); } catch (e) { return true; }
    if (host.indexOf('deepseek-explain') !== -1) return true;
    if (host.indexOf('say-it-louder') !== -1) return true;
    if (host.indexOf('softspeak') !== -1) return true;
    return false;
  }

  function workerUrlFor(configured) {
    var raw = safeWorkerUrl(configured);
    if (!raw || isBlockedWorker(raw)) return DEFAULT_WORKER_URL;
    return raw;
  }

  function overlaps(a, b, gap) {
    return a.left < b.right + gap && a.right > b.left - gap &&
      a.top < b.bottom + gap && a.bottom > b.top - gap;
  }

  function hits(box, obstacles, gap) {
    var found = null;
    var best = 0;
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      if (!overlaps(box, o, gap)) continue;
      var area = Math.max(0, Math.min(box.right, o.right) - Math.max(box.left, o.left)) *
        Math.max(0, Math.min(box.bottom, o.bottom) - Math.max(box.top, o.top));
      if (!found || area > best) {
        found = o;
        best = area;
      }
    }
    return found;
  }

  /**
   * Move `box` so it stays inside `bounds` and clear of `obstacles` by `gap`.
   * Up is preferred, then left, so an open strip lifts off name chips
   * before it slides sideways. `box` is {left, top, right, bottom}.
   */
  function resolveRect(box, obstacles, bounds, gap) {
    gap = gap == null ? GAP : gap;
    obstacles = obstacles || [];
    var width = box.right - box.left;
    var height = box.bottom - box.top;
    if (!(width > 0) || !(height > 0)) return box;
    function clamp(left, top) {
      var maxL = bounds.right - width;
      var maxT = bounds.bottom - height;
      if (maxL < bounds.left) left = bounds.left;
      else left = Math.min(maxL, Math.max(bounds.left, left));
      if (maxT < bounds.top) top = bounds.top;
      else top = Math.min(maxT, Math.max(bounds.top, top));
      return { left: left, top: top, right: left + width, bottom: top + height };
    }
    function area(candidate) {
      var sum = 0;
      for (var i = 0; i < obstacles.length; i++) {
        var o = obstacles[i];
        if (!overlaps(candidate, o, gap)) continue;
        sum += Math.max(0, Math.min(candidate.right, o.right) - Math.max(candidate.left, o.left)) *
          Math.max(0, Math.min(candidate.bottom, o.bottom) - Math.max(candidate.top, o.top));
      }
      return sum;
    }
    var origin = clamp(box.left, box.top);
    if (area(origin) === 0) return origin;
    var cur = origin;
    var guard = 8;
    while (guard--) {
      var hit = hits(cur, obstacles, gap);
      if (!hit) return cur;
      var above = clamp(cur.left, hit.top - gap - height);
      var below = clamp(cur.left, hit.bottom + gap);
      var left = clamp(hit.left - gap - width, cur.top);
      var right = clamp(hit.right + gap, cur.top);
      var options = [above, left, right, below];
      var best = null;
      var bestArea = area(cur);
      for (var i = 0; i < options.length; i++) {
        var opt = options[i];
        var nextArea = area(opt);
        if (nextArea < bestArea) {
          best = opt;
          bestArea = nextArea;
        }
      }
      if (!best) break;
      cur = best;
    }
    if (area(cur) === 0) return cur;
    var nearest = cur;
    var nearestArea = area(cur);
    var nearestDist = Math.abs(cur.left - origin.left) + Math.abs(cur.top - origin.top);
    for (var radius = 1; radius <= 48; radius++) {
      for (var row = 0; row <= radius; row++) {
        var col = radius - row;
        var tops = [origin.top - row * 12];
        if (row) tops.push(origin.top + row * 12);
        var lefts = [origin.left - col * 16];
        for (var t = 0; t < tops.length; t++) {
          for (var l = 0; l < lefts.length; l++) {
            var trial = clamp(lefts[l], tops[t]);
            var trialArea = area(trial);
            var dist = Math.abs(trial.left - origin.left) + Math.abs(trial.top - origin.top);
            if (trialArea === 0) return trial;
            if (trialArea < nearestArea || (trialArea === nearestArea && dist < nearestDist)) {
              nearest = trial;
              nearestArea = trialArea;
              nearestDist = dist;
            }
          }
        }
      }
    }
    return nearest;
  }

  function presentReply(data) {
    if (!data || typeof data !== 'object') return '';
    var kind = String(data.kind || data.type || '');
    if (kind === 'gloss') {
      var lines = [];
      if (data.gloss_zh) lines.push(String(data.gloss_zh).trim());
      if (data.gloss_en) lines.push(String(data.gloss_en).trim());
      if (lines.length) return plainActionNames(lines.join('\n'));
    }
    return data.reply ? plainActionNames(String(data.reply).trim()) : '';
  }

  // The Worker sometimes names tidy_snap in a sentence. The chip already
  // says "Tidy desks — go?". Shown replies use the plain words.
  function plainActionNames(text) {
    var out = String(text || '');
    out = out.replace(/\s*[—–-]\s*please confirm to run tidy_snap\b/gi, '');
    out = out.replace(/\bto run tidy_snap\b/gi, 'to tidy the desks');
    out = out.replace(/\btidy_snap\b/g, 'tidy the desks');
    return out.replace(/[ \t]{2,}/g, ' ').trim();
  }

  function readPayload(data) {
    var kind = data && (data.kind || data.type) ? String(data.kind || data.type).trim() : '';
    var slots = data && data.slots && typeof data.slots === 'object' ? data.slots : {};
    return {
      kind: kind,
      reply: data && typeof data.reply === 'string' ? data.reply.trim() : '',
      gloss_zh: data && typeof data.gloss_zh === 'string' ? data.gloss_zh.trim() : '',
      gloss_en: data && typeof data.gloss_en === 'string' ? data.gloss_en.trim() : '',
      action: data && typeof data.action === 'string' ? data.action.trim() : '',
      slots: {
        student: slots.student == null ? '' : String(slots.student).trim(),
        amount: slots.amount,
        note: slots.note == null ? '' : String(slots.note)
      }
    };
  }

  return {
    DEFAULT_WORKER_URL: DEFAULT_WORKER_URL,
    POS_KEY: POS_KEY,
    GAP: GAP,
    ACTIONS: ACTIONS,
    safeWorkerUrl: safeWorkerUrl,
    isBlockedWorker: isBlockedWorker,
    workerUrlFor: workerUrlFor,
    resolveRect: resolveRect,
    presentReply: presentReply,
    plainActionNames: plainActionNames,
    readPayload: readPayload
  };
  }

  function boot(root, api) {
    if (!document.body) return;
    if (document.documentElement.getAttribute('data-plus-assist') === '1') return;
    document.documentElement.setAttribute('data-plus-assist', '1');

    var workerUrl = api.workerUrlFor(root.HCS_LIVE_CLASS_PLUS_WORKER);
    var narrowHome = root.innerWidth <= 420;
    var anchor = { right: narrowHome ? 12 : 18, bottom: narrowHome ? 28 : 36 };
    var openState = false;
    var pending = null;
    var drag = null;
    var swallowUntil = 0;
    var placeFrame = 0;
    var inflight = null;
    var seq = 0;

    loadAnchor();

    var unit = document.createElement('div');
    unit.className = 'plus-float';
    unit.id = 'plusFloat';

    var ball = document.createElement('button');
    ball.type = 'button';
    ball.className = 'home-ball';
    ball.setAttribute('aria-label', 'Open Live Class + commands');
    ball.setAttribute('aria-expanded', 'false');
    ball.setAttribute('aria-controls', 'plusCommand');

    var command = document.createElement('form');
    command.className = 'command-strip';
    command.id = 'plusCommand';
    command.hidden = true;
    command.setAttribute('aria-label', 'Command box');
    var input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Ask or say a command\u2026';
    input.setAttribute('aria-label', 'Ask or say a command');
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.enterKeyHint = 'send';
    var sendBtn = document.createElement('button');
    sendBtn.type = 'submit';
    sendBtn.className = 'go';
    sendBtn.textContent = 'Send';
    command.appendChild(input);
    command.appendChild(sendBtn);

    var confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'plus-confirm';
    confirmBtn.hidden = true;

    var reply = document.createElement('div');
    reply.className = 'plus-reply';
    reply.id = 'plusReply';
    reply.hidden = true;
    reply.setAttribute('aria-live', 'polite');

    unit.appendChild(ball);
    unit.appendChild(command);
    unit.appendChild(confirmBtn);
    unit.appendChild(reply);
    document.body.appendChild(unit);

    function loadAnchor() {
      try {
        var raw = localStorage.getItem(api.POS_KEY);
        if (!raw) return;
        var data = JSON.parse(raw);
        if (!data || typeof data.r !== 'number' || typeof data.b !== 'number') return;
        if (!isFinite(data.r) || !isFinite(data.b)) return;
        anchor.right = Math.max(0, data.r) * root.innerWidth;
        anchor.bottom = Math.max(0, data.b) * root.innerHeight;
      } catch (e) {}
    }

    function saveAnchor() {
      try {
        var vw = Math.max(1, root.innerWidth);
        var vh = Math.max(1, root.innerHeight);
        localStorage.setItem(api.POS_KEY, JSON.stringify({
          r: anchor.right / vw,
          b: anchor.bottom / vh
        }));
      } catch (e) {}
    }

    function headerBottom() {
      var header = document.getElementById('studioHeader');
      if (!header) return 8;
      var rect = header.getBoundingClientRect();
      if (rect.bottom < 8) return 8;
      return rect.bottom + 4;
    }

    function bounds() {
      return {
        left: 8,
        top: headerBottom(),
        right: Math.max(64, root.innerWidth - 8),
        bottom: Math.max(64, root.innerHeight - 8)
      };
    }

    function obstacles() {
      var list = [];
      var nodes = document.querySelectorAll('.desk-name-btn, .desk-name-static, .desk-name-input');
      var vw = root.innerWidth;
      var vh = root.innerHeight;
      for (var i = 0; i < nodes.length; i++) {
        var rect = nodes[i].getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) continue;
        if (rect.bottom < 0 || rect.top > vh || rect.right < 0 || rect.left > vw) continue;
        list.push({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom });
      }
      var zoom = document.getElementById('zoomChip');
      if (zoom) {
        var z = zoom.getBoundingClientRect();
        if (z.width > 2 && z.height > 2) {
          list.push({ left: z.left, top: z.top, right: z.right, bottom: z.bottom, floor: true });
        }
      }
      return list;
    }

    function boxFromAnchor() {
      var w = unit.offsetWidth || 56;
      var h = unit.offsetHeight || 56;
      var left = root.innerWidth - anchor.right - w;
      var top = root.innerHeight - anchor.bottom - h;
      return { left: left, top: top, right: left + w, bottom: top + h };
    }

    function replyLimit() {
      var box = bounds();
      var room = box.bottom - box.top;
      var reserve = 56 + 28;
      if (!command.hidden) reserve += command.offsetHeight + 10;
      if (!confirmBtn.hidden) reserve += confirmBtn.offsetHeight + 10;
      var limit = room - reserve;
      if (limit < 120) limit = 120;
      return limit;
    }

    function boxHits(box, list, gap) {
      for (var i = 0; i < list.length; i++) {
        var o = list[i];
        if (box.left < o.right + gap && box.right > o.left - gap &&
            box.top < o.bottom + gap && box.bottom > o.top - gap) return true;
      }
      return false;
    }

    function fitReply() {
      if (reply.hidden) {
        reply.style.maxHeight = '';
        return;
      }
      reply.style.maxHeight = 'none';
      var limit = replyLimit();
      if (reply.scrollHeight > limit + 1) reply.style.maxHeight = Math.round(limit) + 'px';
    }

    function relaxWidth() {
      command.style.width = '';
      reply.style.width = '';
      confirmBtn.style.width = '';
    }

    // A long answer stays fully readable. The strip keeps --strip-max
    // (260px). liftClear moves the unit off desk names and the floor zoom
    // bar. Narrow the strip only when a move still leaves a real overlap.
    function place() {
      relaxWidth();
      fitReply();
      var limitBox = bounds();
      var width = unit.offsetWidth || 56;
      var height = unit.offsetHeight || 56;
      var left = root.innerWidth - anchor.right - width;
      var top = root.innerHeight - anchor.bottom - height;
      if (left < limitBox.left) left = limitBox.left;
      if (left + width > limitBox.right) left = Math.max(limitBox.left, limitBox.right - width);
      if (top < limitBox.top) top = limitBox.top;
      unit.style.left = Math.round(left) + 'px';
      unit.style.top = Math.round(top) + 'px';
      unit.style.right = 'auto';
      unit.style.bottom = 'auto';
      liftClear();
    }

    function liftClear() {
      var guard = 12;
      while (guard--) {
        var box = unit.getBoundingClientRect();
        var obs = obstacles();
        var blockTop = null;
        for (var i = 0; i < obs.length; i++) {
          var o = obs[i];
          if (!boxHits(box, [o], api.GAP)) continue;
          var hOverlap = Math.min(box.right, o.right) - Math.max(box.left, o.left);
          if (hOverlap <= 0 && !o.floor) continue;
          if (blockTop == null || o.top < blockTop) blockTop = o.top;
        }
        if (blockTop == null) return;
        var limitBox = bounds();
        var targetBottom = blockTop - api.GAP;
        var height = unit.offsetHeight;
        var targetTop = targetBottom - height;
        if (targetTop >= limitBox.top - 1) {
          unit.style.top = Math.round(targetTop) + 'px';
          continue;
        }
        if (reply.hidden) {
          unit.style.top = Math.round(limitBox.top) + 'px';
          return;
        }
        var replyBox = reply.getBoundingClientRect();
        var chrome = height - replyBox.height;
        var room = targetBottom - limitBox.top - chrome;
        if (room < 36) room = 36;
        if (replyBox.height <= room + 1) {
          unit.style.top = Math.round(limitBox.top) + 'px';
          return;
        }
        reply.style.maxHeight = Math.round(room) + 'px';
        var nextTop = targetBottom - unit.offsetHeight;
        if (nextTop < limitBox.top) nextTop = limitBox.top;
        unit.style.top = Math.round(nextTop) + 'px';
      }
    }

    function schedulePlace() {
      if (placeFrame) return;
      placeFrame = root.requestAnimationFrame(function () {
        placeFrame = 0;
        place();
      });
    }

    function setOpen(next) {
      openState = !!next;
      ball.setAttribute('aria-expanded', openState ? 'true' : 'false');
      ball.setAttribute('aria-label', openState ? 'Close Live Class + commands' : 'Open Live Class + commands');
      unit.classList.toggle('is-open', openState);
      if (openState) {
        command.hidden = false;
      } else {
        command.hidden = true;
        reply.hidden = true;
        reply.textContent = '';
        confirmBtn.hidden = true;
        confirmBtn.textContent = '';
        pending = null;
      }
      place();
      root.requestAnimationFrame(place);
      if (openState) {
        root.setTimeout(function () { input.focus(); }, 0);
      }
    }

    function showReply(text) {
      confirmBtn.hidden = true;
      confirmBtn.textContent = '';
      var shown = String(text || '').trim();
      if (!shown) {
        reply.hidden = true;
        reply.textContent = '';
        place();
        return;
      }
      reply.hidden = false;
      reply.textContent = shown;
      place();
      root.requestAnimationFrame(place);
    }

    function showConfirm(label, action, slots) {
      pending = { action: action, slots: slots, label: label };
      reply.hidden = true;
      reply.textContent = '';
      confirmBtn.hidden = false;
      confirmBtn.textContent = label;
      place();
      root.requestAnimationFrame(place);
    }

    function runPending() {
      if (!pending) return;
      var job = pending;
      pending = null;
      confirmBtn.hidden = true;
      var board = root.HcsLiveClassPlusBoard;
      if (!board || typeof board.run !== 'function') {
        showReply('The board is still loading.');
        return;
      }
      var result = board.run(job.action, job.slots);
      if (!result || result.ok === false) {
        showReply((result && result.message) || 'I can\u2019t run that from here.');
        return;
      }
      showReply(result.message || 'Done.');
    }

    function handlePayload(data) {
      var payload = api.readPayload(data);
      if (payload.kind === 'action' && payload.action) {
        var board = root.HcsLiveClassPlusBoard;
        if (!board || typeof board.preview !== 'function') {
          showReply('The board is still loading.');
          return;
        }
        var preview = board.preview(payload.action, payload.slots);
        if (!preview || preview.ok === false) {
          showReply((preview && preview.message) || api.plainActionNames(payload.reply) || 'Which student?');
          return;
        }
        showConfirm(preview.label, payload.action, preview.slots || payload.slots);
        return;
      }
      var text = api.presentReply(payload);
      if (!text) text = 'The assistant is unavailable just now.';
      showReply(text);
    }

    function send(message) {
      var text = String(message || '').replace(/\s+/g, ' ').trim();
      if (!text || inflight) return;
      input.value = '';
      pending = null;
      confirmBtn.hidden = true;
      reply.hidden = false;
      reply.textContent = '\u2026';
      place();
      var ticket = ++seq;
      var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      inflight = controller;
      input.disabled = true;
      sendBtn.disabled = true;
      var timer = root.setTimeout(function () {
        if (controller) controller.abort();
      }, 25000);
      fetch(workerUrl, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text }),
        signal: controller ? controller.signal : undefined
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          return { status: res.status, body: body };
        });
      }).then(function (result) {
        if (ticket !== seq) return;
        inflight = null;
        root.clearTimeout(timer);
        input.disabled = false;
        sendBtn.disabled = false;
        if (result.status === 200 && result.body) {
          handlePayload(result.body);
          return;
        }
        showReply('The assistant is unavailable just now.');
      }).catch(function (err) {
        if (err && err.name === 'AbortError' && ticket !== seq) return;
        if (ticket !== seq) return;
        inflight = null;
        root.clearTimeout(timer);
        input.disabled = false;
        sendBtn.disabled = false;
        showReply('The assistant is unavailable just now.');
      });
    }

    command.addEventListener('submit', function (e) {
      e.preventDefault();
      send(input.value);
    });
    confirmBtn.addEventListener('click', function () {
      runPending();
    });

    ball.addEventListener('pointerdown', function (e) {
      if (e.button != null && e.button !== 0) return;
      drag = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        right: anchor.right,
        bottom: anchor.bottom,
        moved: false
      };
      ball.classList.add('is-pressed');
      try { ball.setPointerCapture(e.pointerId); } catch (err) {}
    });
    ball.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x;
      var dy = e.clientY - drag.y;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) < TAP_PX) return;
      drag.moved = true;
      unit.classList.add('is-dragging');
      anchor.right = drag.right - dx;
      anchor.bottom = drag.bottom - dy;
      place();
    });
    function endDrag(e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      var moved = drag.moved;
      drag = null;
      ball.classList.remove('is-pressed');
      unit.classList.remove('is-dragging');
      if (moved) {
        var resolved = api.resolveRect(boxFromAnchor(), obstacles(), bounds(), api.GAP);
        var w = unit.offsetWidth || 56;
        var h = unit.offsetHeight || 56;
        anchor.right = root.innerWidth - resolved.right;
        anchor.bottom = root.innerHeight - resolved.bottom;
        place();
        saveAnchor();
        swallowUntil = Date.now() + 400;
      }
    }
    ball.addEventListener('pointerup', endDrag);
    ball.addEventListener('pointercancel', endDrag);
    ball.addEventListener('click', function (e) {
      if (Date.now() < swallowUntil) {
        e.preventDefault();
        return;
      }
      setOpen(!openState);
    });

    document.addEventListener('pointerdown', function (e) {
      if (!openState) return;
      if (unit.contains(e.target)) return;
      setOpen(false);
    }, true);

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !openState) return;
      setOpen(false);
    });

    root.addEventListener('resize', schedulePlace);
    var floor = document.getElementById('classroomViewport');
    if (floor) floor.addEventListener('scroll', schedulePlace, { passive: true });
    var desks = document.getElementById('desksContainer');
    if (desks && typeof MutationObserver !== 'undefined') {
      new MutationObserver(schedulePlace).observe(desks, { childList: true });
    }

    place();
    root.addEventListener('load', place);
    // Floor zoom bar and desk names settle after the Live Class layout pass.
    root.setTimeout(place, 400);
    root.setTimeout(place, 1200);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
