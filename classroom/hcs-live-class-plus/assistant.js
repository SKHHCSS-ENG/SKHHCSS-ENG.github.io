/**
 * HCS Live Class + assistant.
 * Nest: DEFAULT_WORKER_URL is the only assistant host. Do not point it at
 * deepseek-explain, say-it-louder, or ces-softspeak.
 * The ball keeps the viewport spot from the last drag (or the default
 * corner). Opening the strip does not move that circle: the cream panel
 * sits beside it and flips to the side, then up or down, that fits.
 * Floor scroll does not move the ball. A drag still settles the ball
 * clear of desk name chips and the floor zoom bar, then remembers that spot.
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
  var BALL = 56;
  var ACTIONS = {
    hide_names: 'Hide names',
    show_names: 'Show names',
    zoom_in: 'Zoom in',
    zoom_out: 'Zoom out',
    zoom_reset: 'Reset zoom',
    random_pick: 'Pick a student',
    open_seating: 'Open Seating',
    open_scores: 'Open Scores',
    tidy_snap: 'Tidy desks'
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

  /**
   * Viewport rect of the ball. `anchor` is the ball's inset from the
   * right and bottom edges, the same {r, b} stored under POS_KEY.
   * The open strip is not part of this box, so opening it cannot move
   * the circle. Resize clamps the circle into `bounds`.
   */
  function ballRect(anchor, viewport, bounds, size) {
    var ball = size > 0 ? size : BALL;
    var width = viewport && viewport.width > 0 ? viewport.width : 0;
    var height = viewport && viewport.height > 0 ? viewport.height : 0;
    var left = width - anchor.right - ball;
    var top = height - anchor.bottom - ball;
    if (left < bounds.left) left = bounds.left;
    if (left + ball > bounds.right) left = Math.max(bounds.left, bounds.right - ball);
    if (top + ball > bounds.bottom) top = bounds.bottom - ball;
    if (top < bounds.top) top = bounds.top;
    return { left: left, top: top, right: left + ball, bottom: top + ball };
  }

  /**
   * Lay the cream panel beside the ball. The ball rect stays put.
   * The side with more room gets the strip; width shrinks to that room
   * when the preferred width (260 / 72vw) does not fit.
   * `panel.strip` / `panel.reply` are the command and answer heights.
   * The command stays level with the ball. The answer sits below it
   * when that fits, otherwise above. A legacy `panel.height` is one
   * block centered on the ball. The stack then shifts to stay in bounds.
   */
  function layoutBeside(ball, panel, bounds, gap) {
    gap = gap == null ? GAP : gap;
    var prefW = panel && panel.width > 0 ? panel.width : 0;
    var stripH = 0;
    var replyH = 0;
    if (panel && (typeof panel.strip === 'number' || typeof panel.reply === 'number')) {
      stripH = panel.strip > 0 ? panel.strip : 0;
      replyH = panel.reply > 0 ? panel.reply : 0;
    } else if (panel && panel.height > 0) {
      stripH = panel.height;
    }
    var spaceRight = bounds.right - ball.right - gap;
    var spaceLeft = ball.left - bounds.left - gap;
    var side = spaceLeft > spaceRight ? 'left' : 'right';
    var room = side === 'left' ? spaceLeft : spaceRight;
    if (room < 0) room = 0;
    var width = prefW < room ? prefW : room;
    var left = side === 'right' ? ball.right + gap : ball.left - gap - width;
    var ballMid = ball.top + (ball.bottom - ball.top) / 2;
    var stripTop = ballMid - stripH / 2;
    var stackGap = replyH > 0 ? gap : 0;
    var replyAbove = false;
    if (replyH > 0) {
      var spaceBelow = bounds.bottom - (stripTop + stripH) - stackGap;
      var spaceAbove = stripTop - bounds.top - stackGap;
      if (spaceBelow >= replyH) replyAbove = false;
      else if (spaceAbove >= replyH) replyAbove = true;
      else replyAbove = spaceAbove > spaceBelow;
    }
    var height = stripH + stackGap + replyH;
    var top = replyAbove ? stripTop - stackGap - replyH : stripTop;
    if (top + height > bounds.bottom) top = bounds.bottom - height;
    if (top < bounds.top) top = bounds.top;
    return {
      side: side,
      left: left,
      top: top,
      width: width,
      height: height,
      right: left + width,
      bottom: top + height,
      replyAbove: replyAbove
    };
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

  // The Worker sometimes names tidy_snap, or asks the teacher to confirm.
  // Actions run on the first send, so a shown reply uses the plain words.
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
    BALL: BALL,
    ACTIONS: ACTIONS,
    safeWorkerUrl: safeWorkerUrl,
    isBlockedWorker: isBlockedWorker,
    workerUrlFor: workerUrlFor,
    resolveRect: resolveRect,
    ballRect: ballRect,
    layoutBeside: layoutBeside,
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
    var drag = null;
    var swallowUntil = 0;
    // Same 8px radius as the floor pan and the zoom chip. A finger that
    // jitters a few pixels on both axes is still a tap. This has to live
    // in boot: pointermove reads it, and factory locals are not in scope.
    var TAP_PX = 8;
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

    var reply = document.createElement('div');
    reply.className = 'plus-reply';
    reply.id = 'plusReply';
    reply.hidden = true;
    reply.setAttribute('aria-live', 'polite');

    var panel = document.createElement('div');
    panel.className = 'plus-panel';
    panel.hidden = true;
    panel.appendChild(command);
    panel.appendChild(reply);

    unit.appendChild(ball);
    unit.appendChild(panel);
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

    function ballBox() {
      return api.ballRect(anchor, {
        width: root.innerWidth,
        height: root.innerHeight
      }, bounds(), api.BALL);
    }

    function boxFromAnchor() {
      return ballBox();
    }

    var REPLY_MIN = 120;

    function replyLimit() {
      var box = bounds();
      var room = box.bottom - box.top;
      var reserve = 56 + 28;
      if (!command.hidden) reserve += command.offsetHeight + 10;
      var limit = room - reserve;
      if (limit < REPLY_MIN) limit = REPLY_MIN;
      return limit;
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
      panel.style.width = '';
      command.style.width = '';
      reply.style.width = '';
    }

    function stripCap() {
      var cap = 260;
      var vwCap = root.innerWidth * 0.72;
      if (vwCap < cap) cap = vwCap;
      return cap;
    }

    // The saved corner is the ball, not the open panel. The unit is the
    // 56px circle. The cream strip is a child that flips beside it, so
    // opening or closing cannot change the circle's viewport spot.
    // Resize clamps the ball. Floor scroll does not call this.
    function place() {
      var ball = ballBox();
      unit.style.left = Math.round(ball.left) + 'px';
      unit.style.top = Math.round(ball.top) + 'px';
      unit.style.right = 'auto';
      unit.style.bottom = 'auto';
      if (panel.hidden) return;
      relaxWidth();
      var limitBox = bounds();
      var rough = api.layoutBeside(ball, { width: stripCap(), height: 0 }, limitBox, api.GAP);
      panel.style.width = Math.round(rough.width) + 'px';
      fitReply();
      var stripH = command.hidden ? 0 : command.offsetHeight;
      var replyH = reply.hidden ? 0 : reply.offsetHeight;
      var placed = api.layoutBeside(ball, {
        width: stripCap(),
        strip: stripH,
        reply: replyH
      }, limitBox, api.GAP);
      panel.style.width = Math.round(placed.width) + 'px';
      panel.style.top = Math.round(placed.top - ball.top) + 'px';
      panel.style.bottom = 'auto';
      unit.classList.toggle('panel-left', placed.side === 'left');
      unit.classList.toggle('panel-right', placed.side === 'right');
      unit.classList.toggle('reply-above', placed.replyAbove);
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
        panel.hidden = false;
        command.hidden = false;
      } else {
        command.hidden = true;
        reply.hidden = true;
        reply.textContent = '';
        panel.hidden = true;
      }
      place();
      root.requestAnimationFrame(place);
      if (openState) focusCommand();
    }

    // After Enter, the field is cleared and often blurred (Send takes the
    // click, or the browser drops the caret). Put it back while the strip
    // is open so the next line can be typed. A closed strip stays closed.
    function focusCommand() {
      if (!openState || command.hidden || input.disabled) return;
      function aim() {
        if (!openState || command.hidden || input.disabled) return;
        try {
          input.focus({ preventScroll: true });
        } catch (err) {
          try { input.focus(); } catch (e2) {}
        }
      }
      aim();
      root.setTimeout(aim, 0);
    }

    function showReply(text) {
      var shown = String(text || '').trim();
      if (!shown) {
        reply.hidden = true;
        reply.textContent = '';
        place();
        focusCommand();
        return;
      }
      reply.hidden = false;
      reply.textContent = shown;
      place();
      root.requestAnimationFrame(place);
      focusCommand();
    }

    function runAction(action, slots, replyText) {
      var board = root.HcsLiveClassPlusBoard;
      if (!board || typeof board.run !== 'function') {
        showReply('The board is still loading.');
        return;
      }
      var jobSlots = slots || {};
      if (typeof board.preview === 'function') {
        var preview = board.preview(action, jobSlots);
        if (!preview || preview.ok === false) {
          showReply((preview && preview.message) || api.plainActionNames(replyText) || 'Which student?');
          return;
        }
        if (preview.slots) jobSlots = preview.slots;
      }
      var result = board.run(action, jobSlots);
      if (!result || result.ok === false) {
        showReply((result && result.message) || 'I can\u2019t run that from here.');
        return;
      }
      showReply(result.message || 'Done.');
    }

    function handlePayload(data) {
      var payload = api.readPayload(data);
      if (payload.kind === 'action' && payload.action) {
        runAction(payload.action, payload.slots, payload.reply);
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
      reply.hidden = false;
      reply.textContent = '\u2026';
      place();
      var ticket = ++seq;
      var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      inflight = controller;
      sendBtn.disabled = true;
      focusCommand();
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
        sendBtn.disabled = false;
        showReply('The assistant is unavailable just now.');
      });
    }

    command.addEventListener('submit', function (e) {
      e.preventDefault();
      send(input.value);
      focusCommand();
    });

    function onBallPointerMove(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x;
      var dy = e.clientY - drag.y;
      if (!drag.moved && (dx * dx + dy * dy) < TAP_PX * TAP_PX) return;
      if (!drag.moved) {
        drag.moved = true;
        unit.classList.add('is-dragging');
        try { ball.setPointerCapture(e.pointerId); } catch (err) {}
      }
      if (e.cancelable) e.preventDefault();
      anchor.right = drag.right - dx;
      anchor.bottom = drag.bottom - dy;
      place();
    }
    function endDrag(e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      document.removeEventListener('pointermove', onBallPointerMove, { capture: true });
      document.removeEventListener('pointerup', endDrag, true);
      document.removeEventListener('pointercancel', endDrag, true);
      var moved = drag.moved;
      drag = null;
      ball.classList.remove('is-pressed');
      unit.classList.remove('is-dragging');
      try { if (e) ball.releasePointerCapture(e.pointerId); } catch (err) {}
      if (moved) {
        var resolved = api.resolveRect(boxFromAnchor(), obstacles(), bounds(), api.GAP);
        anchor.right = root.innerWidth - resolved.right;
        anchor.bottom = root.innerHeight - resolved.bottom;
        place();
        saveAnchor();
        swallowUntil = Date.now() + 400;
      }
    }
    function armBallPointer(e) {
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
      document.addEventListener('pointermove', onBallPointerMove, { capture: true, passive: false });
      document.addEventListener('pointerup', endDrag, true);
      document.addEventListener('pointercancel', endDrag, true);
    }
    ball.addEventListener('pointerdown', armBallPointer);
    ball.addEventListener('pointermove', onBallPointerMove);
    ball.addEventListener('pointerup', endDrag);
    ball.addEventListener('pointercancel', endDrag);
    ball.addEventListener('touchmove', function (e) {
      if (!drag || !e.cancelable) return;
      e.preventDefault();
    }, { passive: false });
    ball.addEventListener('click', function (e) {
      if (Date.now() < swallowUntil) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      setOpen(!openState);
    });
    document.addEventListener('click', function (e) {
      if (Date.now() >= swallowUntil) return;
      swallowUntil = 0;
      e.preventDefault();
      e.stopPropagation();
    }, true);

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

    place();
    root.addEventListener('load', place);
    // Header height settles after the first layout pass. This reclamps
    // the saved corner; it does not follow the floor.
    root.setTimeout(place, 400);
    root.setTimeout(place, 1200);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
