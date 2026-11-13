/**
 * Teacher whiteboard for HCS Live Class and HCS Live Class +.
 * Ink stays in this tab's memory. Closing the popup keeps the drawing.
 * A refresh or a new tab starts blank. Nothing is written to storage,
 * Drive, or the class plan.
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    var boot = function () { api.mount(root.document); };
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(typeof window !== 'undefined' ? window : this, function (root) {
  var COLOURS = [
    { id: 'navy', hex: '#123a4d' },
    { id: 'teal', hex: '#0e6b7a' },
    { id: 'blue', hex: '#2563eb' },
    { id: 'red', hex: '#dc2626' },
    { id: 'amber', hex: '#b45309' },
    { id: 'pink', hex: '#db2777' }
  ];
  var PEN_BASE = 5;
  var PEN_PRESS = 2;
  var HIGHLIGHT_BASE = 22;
  var HIGHLIGHT_PRESS = 6;
  var HIGHLIGHT_ALPHA = 0.38;
  var ERASER = 36;
  var HISTORY_LIMIT = 80;

  function colourWithAlpha(hex, alpha) {
    var n = String(hex || '').replace('#', '');
    if (n.length === 3) n = n[0] + n[0] + n[1] + n[1] + n[2] + n[2];
    var r = parseInt(n.slice(0, 2), 16);
    var g = parseInt(n.slice(2, 4), 16);
    var b = parseInt(n.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return hex;
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function pressureOf(pressure) {
    return pressure > 0 && pressure <= 1 ? pressure : 0.5;
  }

  function createSession() {
    var strokes = [];
    var texts = [];
    var undo = [];
    var redo = [];
    var tool = 'pen';
    var colourIdx = 0;
    var nextTextId = 1;
    var open = false;
    var drawing = null;
    var pendingUndo = null;

    function colour() {
      return COLOURS[colourIdx];
    }

    function pushUndo(snap) {
      undo.push(snap);
      if (undo.length > HISTORY_LIMIT) undo.shift();
      redo = [];
    }

    function textPlain(item) {
      return {
        id: item.id,
        x: item.x,
        y: item.y,
        colour: item.colour,
        value: item.value,
        fresh: !!item.fresh
      };
    }

    function snapshot() {
      return {
        strokes: clone(strokes),
        texts: texts.map(textPlain)
      };
    }

    function noteIds(list) {
      for (var i = 0; i < list.length; i++) {
        var n = Number(list[i].id);
        if (n >= nextTextId) nextTextId = n + 1;
      }
    }

    function restore(snap) {
      strokes = clone(snap.strokes || []);
      texts = clone(snap.texts || []);
      drawing = null;
      pendingUndo = null;
      noteIds(texts);
    }

    function findText(id) {
      for (var i = 0; i < texts.length; i++) {
        if (texts[i].id === id) return texts[i];
      }
      return null;
    }

    function removeText(id) {
      texts = texts.filter(function (item) { return item.id !== id; });
    }

    function hasInk() {
      if (strokes.length) return true;
      for (var i = 0; i < texts.length; i++) {
        if (!texts[i].fresh && String(texts[i].value || '').trim()) return true;
      }
      return false;
    }

    return {
      colours: COLOURS,
      isOpen: function () { return open; },
      openBoard: function () { open = true; },
      closeBoard: function () { open = false; },
      tool: function () { return tool; },
      setTool: function (next) {
        if (next === 'pen' || next === 'highlighter' || next === 'eraser' || next === 'text') tool = next;
        return tool;
      },
      colour: colour,
      cycleColour: function () {
        colourIdx = (colourIdx + 1) % COLOURS.length;
        return colour();
      },
      strokes: function () { return strokes; },
      texts: function () { return texts; },
      canUndo: function () { return undo.length > 0 && !drawing; },
      canRedo: function () { return redo.length > 0 && !drawing; },
      hasInk: hasInk,
      beginStroke: function (x, y, pressure) {
        if (tool === 'text' || drawing) return null;
        var width = tool === 'eraser'
          ? ERASER
          : tool === 'highlighter'
            ? HIGHLIGHT_BASE + pressureOf(pressure) * HIGHLIGHT_PRESS
            : PEN_BASE + pressureOf(pressure) * PEN_PRESS;
        pendingUndo = snapshot();
        drawing = {
          colour: colour().hex,
          width: width,
          erase: tool === 'eraser',
          highlight: tool === 'highlighter',
          points: [{ x: x, y: y }]
        };
        strokes.push(drawing);
        return drawing;
      },
      extendStroke: function (x, y) {
        if (!drawing) return;
        var last = drawing.points[drawing.points.length - 1];
        if (last && last.x === x && last.y === y) return;
        drawing.points.push({ x: x, y: y });
      },
      endStroke: function () {
        if (!drawing) return false;
        drawing = null;
        if (pendingUndo) {
          pushUndo(pendingUndo);
          pendingUndo = null;
        }
        return true;
      },
      placeText: function (x, y) {
        var item = {
          id: nextTextId++,
          x: Math.min(0.86, Math.max(0, x)),
          y: Math.min(0.92, Math.max(0, y)),
          colour: colour().hex,
          value: '',
          fresh: true
        };
        texts.push(item);
        return item;
      },
      setDraft: function (id, value) {
        var item = findText(id);
        if (!item) return;
        item.value = String(value == null ? '' : value);
      },
      commitText: function (id, value) {
        var item = findText(id);
        if (!item) return false;
        var next = String(value == null ? '' : value).replace(/\u00a0/g, ' ');
        if (item.fresh) {
          if (!next.trim()) {
            removeText(id);
            return false;
          }
          var beforeAdd = snapshot();
          beforeAdd.texts = beforeAdd.texts.filter(function (entry) { return entry.id !== id; });
          item.value = next;
          item.fresh = false;
          pushUndo(beforeAdd);
          return true;
        }
        if (next === item.value) return false;
        var before = snapshot();
        if (!next.trim()) removeText(id);
        else item.value = next;
        pushUndo(before);
        return true;
      },
      clear: function () {
        if (drawing) {
          drawing = null;
          pendingUndo = null;
        }
        if (!hasInk()) return false;
        var before = snapshot();
        before.texts = before.texts.filter(function (entry) {
          return String(entry.value || '').trim();
        });
        strokes = [];
        texts = [];
        pushUndo(before);
        return true;
      },
      undo: function () {
        if (!undo.length || drawing) return false;
        redo.push(snapshot());
        restore(undo.pop());
        return true;
      },
      redo: function () {
        if (!redo.length || drawing) return false;
        undo.push(snapshot());
        restore(redo.pop());
        return true;
      }
    };
  }

  function drawStroke(ctx, stroke, w, h) {
    var pts = stroke.points || [];
    if (!pts.length) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = stroke.width;
    if (stroke.erase) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.fillStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      var ink = stroke.highlight ? colourWithAlpha(stroke.colour, HIGHLIGHT_ALPHA) : stroke.colour;
      ctx.strokeStyle = ink;
      ctx.fillStyle = ink;
    }
    if (pts.length === 1) {
      ctx.beginPath();
      ctx.arc(pts[0].x * w, pts[0].y * h, stroke.width / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(pts[0].x * w, pts[0].y * h);
      for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x * w, pts[i].y * h);
      ctx.stroke();
    }
    ctx.restore();
  }

  function mount(doc) {
    if (!doc || doc.getElementById('whiteboardSheet')) return null;
    var openBtn = doc.getElementById('btnOpenWhiteboard');
    if (!openBtn) return null;

    var session = createSession();
    var sheet = doc.createElement('div');
    sheet.id = 'whiteboardSheet';
    sheet.className = 'wb-sheet';
    sheet.hidden = true;
    sheet.innerHTML = [
      '<div class="wb-panel" role="dialog" aria-modal="true" aria-labelledby="whiteboardTitle" tabindex="-1">',
      '  <div class="wb-bar">',
      '    <h2 id="whiteboardTitle" class="wb-title">Whiteboard</h2>',
      '    <div class="wb-tools" role="toolbar" aria-label="Whiteboard tools">',
      '      <button type="button" class="wb-tool" data-wb-tool="pen" aria-pressed="true">Pen</button>',
      '      <button type="button" class="wb-tool" data-wb-tool="highlighter" aria-pressed="false">Highlighter</button>',
      '      <button type="button" class="wb-tool" id="wbColour"><span class="wb-swatch" aria-hidden="true"></span><span>Colour</span></button>',
      '      <button type="button" class="wb-tool" data-wb-tool="eraser" aria-pressed="false">Eraser</button>',
      '      <button type="button" class="wb-tool" data-wb-tool="text" aria-pressed="false">Text</button>',
      '      <button type="button" class="wb-tool" id="wbUndo">Undo</button>',
      '      <button type="button" class="wb-tool" id="wbRedo">Redo</button>',
      '      <button type="button" class="wb-tool" id="wbClear">Clear</button>',
      '    </div>',
      '    <button type="button" class="wb-close" id="wbClose" aria-label="Close" title="Close">X</button>',
      '  </div>',
      '  <div class="wb-stage">',
      '    <canvas id="wbCanvas" aria-label="Whiteboard drawing"></canvas>',
      '    <div class="wb-texts" id="wbTextLayer"></div>',
      '  </div>',
      '  <div class="wb-confirm" id="wbConfirm" hidden>',
      '    <div class="wb-confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="wbConfirmTitle">',
      '      <p id="wbConfirmTitle">Clear the whiteboard? Undo brings it back.</p>',
      '      <div class="wb-confirm-actions">',
      '        <button type="button" id="wbConfirmCancel">Cancel</button>',
      '        <button type="button" id="wbConfirmClear">Clear</button>',
      '      </div>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');
    doc.body.appendChild(sheet);

    var panel = sheet.querySelector('.wb-panel');
    var canvas = sheet.querySelector('#wbCanvas');
    var layer = sheet.querySelector('#wbTextLayer');
    var stage = sheet.querySelector('.wb-stage');
    var colourBtn = sheet.querySelector('#wbColour');
    var swatch = sheet.querySelector('.wb-swatch');
    var undoBtn = sheet.querySelector('#wbUndo');
    var redoBtn = sheet.querySelector('#wbRedo');
    var clearBtn = sheet.querySelector('#wbClear');
    var closeBtn = sheet.querySelector('#wbClose');
    var confirm = sheet.querySelector('#wbConfirm');
    var confirmCancel = sheet.querySelector('#wbConfirmCancel');
    var confirmClear = sheet.querySelector('#wbConfirmClear');
    var activePointer = null;
    var paintQueued = false;

    function pointFromEvent(e, el) {
      var rect = el.getBoundingClientRect();
      var w = rect.width || 1;
      var h = rect.height || 1;
      return {
        x: Math.min(1, Math.max(0, (e.clientX - rect.left) / w)),
        y: Math.min(1, Math.max(0, (e.clientY - rect.top) / h))
      };
    }

    function paint() {
      var ctx = canvas.getContext('2d');
      if (!ctx) return;
      var w = canvas._cssW || canvas.clientWidth || 1;
      var h = canvas._cssH || canvas.clientHeight || 1;
      ctx.clearRect(0, 0, w, h);
      var list = session.strokes();
      for (var i = 0; i < list.length; i++) drawStroke(ctx, list[i], w, h);
    }

    function requestPaint() {
      if (paintQueued) return;
      paintQueued = true;
      var raf = root.requestAnimationFrame || function (fn) { return setTimeout(fn, 16); };
      raf(function () {
        paintQueued = false;
        paint();
      });
    }

    function sizeCanvas() {
      if (sheet.hidden) return;
      var rect = stage.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      var dpr = Math.min((root.devicePixelRatio || 1), 2);
      var cssW = Math.max(1, Math.round(rect.width));
      var cssH = Math.max(1, Math.round(rect.height));
      if (canvas._cssW === cssW && canvas._cssH === cssH && canvas._dpr === dpr) {
        paint();
        return;
      }
      canvas._cssW = cssW;
      canvas._cssH = cssH;
      canvas._dpr = dpr;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      var ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint();
    }

    function grow(el) {
      el.style.height = '0px';
      el.style.height = Math.max(44, el.scrollHeight) + 'px';
    }

    function syncTexts() {
      var keep = {};
      session.texts().forEach(function (item) {
        keep[item.id] = true;
        var el = layer.querySelector('[data-wb-text="' + item.id + '"]');
        if (!el) {
          el = doc.createElement('textarea');
          el.className = 'wb-text';
          el.setAttribute('data-wb-text', String(item.id));
          el.setAttribute('aria-label', 'Whiteboard text');
          el.rows = 1;
          el.placeholder = 'Type';
          el.addEventListener('input', function () {
            session.setDraft(Number(el.getAttribute('data-wb-text')), el.value);
            grow(el);
          });
          el.addEventListener('blur', function () {
            session.commitText(Number(el.getAttribute('data-wb-text')), el.value);
            syncTexts();
            syncHistory();
          });
          el.addEventListener('paste', function (e) {
            var data = e.clipboardData || root.clipboardData;
            if (!data) return;
            var text = data.getData('text/plain');
            if (text == null) return;
            e.preventDefault();
            var start = el.selectionStart || 0;
            var end = el.selectionEnd || 0;
            el.value = el.value.slice(0, start) + text + el.value.slice(end);
            var caret = start + text.length;
            if (el.setSelectionRange) el.setSelectionRange(caret, caret);
            grow(el);
          });
          layer.appendChild(el);
        }
        el.style.left = (item.x * 100) + '%';
        el.style.top = (item.y * 100) + '%';
        el.style.color = item.colour;
        if (doc.activeElement !== el && el.value !== item.value) el.value = item.value;
        grow(el);
      });
      Array.prototype.forEach.call(layer.querySelectorAll('.wb-text'), function (el) {
        if (!keep[Number(el.getAttribute('data-wb-text'))]) el.remove();
      });
    }

    function syncColour() {
      var c = session.colour();
      swatch.style.background = c.hex;
      colourBtn.setAttribute('aria-label', 'Colour: ' + c.id + '. Tap to change.');
      colourBtn.title = 'Colour: ' + c.id;
    }

    function syncTools() {
      sheet.setAttribute('data-tool', session.tool());
      Array.prototype.forEach.call(sheet.querySelectorAll('[data-wb-tool]'), function (btn) {
        var on = btn.getAttribute('data-wb-tool') === session.tool();
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    function syncHistory() {
      undoBtn.disabled = !session.canUndo();
      redoBtn.disabled = !session.canRedo();
      clearBtn.disabled = !session.hasInk();
    }

    function syncAll() {
      syncTools();
      syncColour();
      syncHistory();
      syncTexts();
      requestPaint();
    }

    function hideConfirm() {
      confirm.hidden = true;
    }

    function finishEditing() {
      var active = doc.activeElement;
      if (active && active.classList && active.classList.contains('wb-text')) active.blur();
    }

    function openSheet() {
      hideConfirm();
      session.openBoard();
      sheet.hidden = false;
      openBtn.setAttribute('aria-pressed', 'true');
      syncAll();
      var raf = root.requestAnimationFrame || function (fn) { return setTimeout(fn, 16); };
      raf(function () {
        sizeCanvas();
        raf(sizeCanvas);
      });
      if (panel.focus) panel.focus();
    }

    function closeSheet() {
      finishEditing();
      hideConfirm();
      session.closeBoard();
      sheet.hidden = true;
      openBtn.setAttribute('aria-pressed', 'false');
      if (openBtn.focus) openBtn.focus();
    }

    function setTool(next) {
      finishEditing();
      session.setTool(next);
      syncTools();
    }

    openBtn.addEventListener('click', function () {
      if (sheet.hidden) openSheet();
      else closeSheet();
    });
    closeBtn.addEventListener('click', closeSheet);
    colourBtn.addEventListener('click', function () {
      session.cycleColour();
      syncColour();
    });
    undoBtn.addEventListener('click', function () {
      finishEditing();
      if (!session.undo()) return;
      syncAll();
    });
    redoBtn.addEventListener('click', function () {
      finishEditing();
      if (!session.redo()) return;
      syncAll();
    });
    clearBtn.addEventListener('click', function () {
      finishEditing();
      if (!session.hasInk()) return;
      confirm.hidden = false;
      confirmCancel.focus();
    });
    confirmCancel.addEventListener('click', function () {
      hideConfirm();
      clearBtn.focus();
    });
    confirmClear.addEventListener('click', function () {
      session.clear();
      hideConfirm();
      syncAll();
    });
    confirm.addEventListener('click', function (e) {
      if (e.target === confirm) hideConfirm();
    });

    Array.prototype.forEach.call(sheet.querySelectorAll('[data-wb-tool]'), function (btn) {
      btn.addEventListener('click', function () {
        setTool(btn.getAttribute('data-wb-tool'));
      });
    });

    layer.addEventListener('click', function (e) {
      if (session.tool() !== 'text') return;
      if (e.target.closest && e.target.closest('.wb-text')) return;
      var pt = pointFromEvent(e, stage);
      var item = session.placeText(pt.x, pt.y);
      syncTexts();
      var el = layer.querySelector('[data-wb-text="' + item.id + '"]');
      if (el) el.focus();
    });

    canvas.addEventListener('pointerdown', function (e) {
      if (session.tool() === 'text') return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (activePointer != null) return;
      activePointer = e.pointerId;
      if (canvas.setPointerCapture) {
        try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      }
      var pt = pointFromEvent(e, canvas);
      session.beginStroke(pt.x, pt.y, e.pressure);
      requestPaint();
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', function (e) {
      if (e.pointerId !== activePointer) return;
      var events = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : null;
      if (!events || !events.length) events = [e];
      for (var i = 0; i < events.length; i++) {
        var pt = pointFromEvent(events[i], canvas);
        session.extendStroke(pt.x, pt.y);
      }
      requestPaint();
      e.preventDefault();
    });
    function endPointer(e) {
      if (e.pointerId !== activePointer) return;
      activePointer = null;
      if (session.endStroke()) syncHistory();
      requestPaint();
    }
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);
    canvas.addEventListener('lostpointercapture', function (e) {
      if (e.pointerId !== activePointer) return;
      activePointer = null;
      if (session.endStroke()) syncHistory();
    });

    doc.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || sheet.hidden) return;
      e.preventDefault();
      e.stopPropagation();
      if (!confirm.hidden) {
        hideConfirm();
        return;
      }
      closeSheet();
    }, true);

    root.addEventListener('resize', sizeCanvas);
    if (root.ResizeObserver) {
      var observer = new root.ResizeObserver(sizeCanvas);
      observer.observe(stage);
    }

    syncColour();
    syncTools();
    syncHistory();
    return session;
  }

  return {
    COLOURS: COLOURS,
    PEN_BASE: PEN_BASE,
    HIGHLIGHT_BASE: HIGHLIGHT_BASE,
    ERASER: ERASER,
    createSession: createSession,
    drawStroke: drawStroke,
    mount: mount
  };
});
