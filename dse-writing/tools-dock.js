/**
 * DSE Writing — sticky Tools dock
 * 譯 (Chinese gloss) + Handwrite (✏️ 🖍 colour-ball 🩹 / ↶ ↷ 🗑) — 1 tools row
 * Collapsible dock (🛠 toggles expand/collapse; always bottom-right). Canvas overlays cards — no blank spacer.
 */
(function () {
  var ZH_KEY = 'dse-writing-zh-on';
  var pageSlug = (function () {
    var parts = location.pathname.replace(/\/+$/, '').split('/');
    var last = parts[parts.length - 1] || '';
    if (last === 'index.html') last = parts[parts.length - 2] || 'page';
    return last || 'page';
  })();
  var HW_KEY = 'dse-writing-hw-v2-' + pageSlug;

  /* ---------- Chinese gloss ---------- */
  var zhBtn = document.getElementById('zhToggle');
  function applyZh(on) {
    document.body.classList.toggle('zh-on', on);
    if (zhBtn) {
      zhBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      zhBtn.setAttribute('aria-label', on ? 'Chinese gloss: ON' : 'Chinese gloss: OFF');
      zhBtn.classList.toggle('on', on);
      zhBtn.textContent = '譯';
    }
    try { localStorage.setItem(ZH_KEY, on ? '1' : '0'); } catch (e) {}
    if (typeof window.hwResize === 'function') {
      requestAnimationFrame(function () { setTimeout(window.hwResize, 50); });
    }
  }
  var zhSaved = false;
  try { zhSaved = localStorage.getItem(ZH_KEY) === '1'; } catch (e) {}
  applyZh(zhSaved);
  if (zhBtn) {
    zhBtn.addEventListener('click', function () {
      applyZh(!document.body.classList.contains('zh-on'));
    });
  }


  /* ---------- Dock collapse (default collapsed = 🛠 chip) ---------- */
  var DOCK_KEY = 'dse-writing-dock-open';
  var foldBtn = document.getElementById('dockFold');
  function setDockOpen(open) {
    document.body.classList.toggle('dock-open', open);
    document.documentElement.classList.toggle('dock-open', open);
    if (foldBtn) {
      foldBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      foldBtn.setAttribute('aria-label', open ? 'Collapse tools' : 'Expand tools');
      foldBtn.title = open ? 'Collapse tools' : 'Tools';
      foldBtn.textContent = '🛠';
    }
    try { localStorage.setItem(DOCK_KEY, open ? '1' : '0'); } catch (e) {}
    if (typeof window.hwSyncCanvasPointer === 'function') {
      window.hwSyncCanvasPointer();
    }
    if (typeof window.hwResize === 'function') {
      requestAnimationFrame(function () { setTimeout(window.hwResize, 50); });
    }
  }
  var dockSaved = null;
  try { dockSaved = localStorage.getItem(DOCK_KEY); } catch (e) {}
  /* Default collapsed; only open if user previously expanded */
  setDockOpen(dockSaved === '1');
  if (foldBtn) {
    foldBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      setDockOpen(!document.body.classList.contains('dock-open'));
    });
  }

  /* ---------- Handwrite ---------- */
  (function initHandwrite() {
    var COLOURS = [
      { id: 'teal', hex: '#0e6b7a', hi: 'rgba(14,107,122,0.4)' },
      { id: 'navy', hex: '#123a4d', hi: 'rgba(18,58,77,0.4)' },
      { id: 'amber', hex: '#b45309', hi: 'rgba(250,204,21,0.5)' },
      { id: 'blue', hex: '#2563EB', hi: 'rgba(37,99,235,0.4)' },
      { id: 'pink', hex: '#db2777', hi: 'rgba(244,114,182,0.45)' }
    ];
    var colourIdx = 0;
    var tool = 'pen'; /* pen | erase | highlight */
    var enabled = false;
    var strokes = {};
    var undoStack = [];
    var redoStack = [];
    var drawing = false;
    var current = null;
    var activeCanvas = null;
    var lastHwId = null;

    var PEN_BASE = 0.85;
    var PEN_PRESS = 0.55;
    var HI_BASE = 16;
    var HI_PRESS = 8;
    var ER_BASE = 14;
    var ER_PRESS = 8;

    var tog = document.getElementById('togHandwrite');
    var hwBar = document.getElementById('hwBar');
    var btnPen = document.getElementById('hwPen');
    var btnEraser = document.getElementById('hwEraser');
    var btnColour = document.getElementById('hwColour');
    var btnHighlight = document.getElementById('hwHighlight');
    var btnClearAll = document.getElementById('hwClearAll');
    var btnUndo = document.getElementById('hwUndo');
    var btnRedo = document.getElementById('hwRedo');
    var canvases = Array.from(document.querySelectorAll('.hw-canvas'));
    if (!tog || !canvases.length) return;

    function load() {
      try {
        var raw = localStorage.getItem(HW_KEY);
        if (!raw) {
          /* migrate v1 key if present */
          var old = localStorage.getItem('dse-writing-hw-' + pageSlug);
          if (old) raw = old;
        }
        if (raw) {
          var data = JSON.parse(raw);
          if (data && data.strokes) strokes = data.strokes;
          else if (data && typeof data === 'object') strokes = data;
          if (data && data.lastHwId) lastHwId = data.lastHwId;
        }
      } catch (e) { strokes = {}; }
    }
    function save() {
      try {
        localStorage.setItem(HW_KEY, JSON.stringify({ v: 2, strokes: strokes, lastHwId: lastHwId }));
      } catch (e) {}
    }
    function updateUndoRedo() {
      if (btnUndo) btnUndo.disabled = !enabled || undoStack.length === 0;
      if (btnRedo) btnRedo.disabled = !enabled || redoStack.length === 0;
    }
    function syncCanvasPointer() {
      /* Ink stays visible whenever Handwrite is ON; drawing only with dock open */
      var draw = enabled && document.body.classList.contains('dock-open');
      canvases.forEach(function (c) {
        c.style.display = enabled ? 'block' : 'none';
        c.style.pointerEvents = draw ? 'auto' : 'none';
      });
    }
    window.hwSyncCanvasPointer = syncCanvasPointer;
    function setEnabled(on) {
      enabled = on;
      document.body.classList.toggle('hw-on', on);
      document.body.classList.toggle('hw-erase', on && tool === 'erase');
      document.body.classList.toggle('hw-highlight', on && tool === 'highlight');
      tog.classList.toggle('on', on);
      tog.setAttribute('aria-pressed', String(on));
      if (hwBar) {
        if (on) hwBar.removeAttribute('hidden');
        else hwBar.setAttribute('hidden', '');
      }
      syncCanvasPointer();
      if (on) resizeAll();
      updateUndoRedo();
    }
    function setTool(t) {
      tool = t;
      document.body.classList.toggle('hw-erase', enabled && tool === 'erase');
      document.body.classList.toggle('hw-highlight', enabled && tool === 'highlight');
      if (btnPen) {
        btnPen.classList.toggle('tool-on', tool === 'pen');
        btnPen.setAttribute('aria-pressed', String(tool === 'pen'));
      }
      if (btnEraser) {
        btnEraser.classList.toggle('tool-on', tool === 'erase');
        btnEraser.setAttribute('aria-pressed', String(tool === 'erase'));
      }
      if (btnHighlight) {
        btnHighlight.classList.toggle('tool-on', tool === 'highlight');
        btnHighlight.setAttribute('aria-pressed', String(tool === 'highlight'));
      }
    }
    function syncColourBtn() {
      if (!btnColour) return;
      var c = COLOURS[colourIdx];
      btnColour.textContent = '';
      btnColour.style.background = c.hex;
      btnColour.style.boxShadow = '0 0 0 1.5px #d3e8ef';
      btnColour.title = 'Colour: ' + c.id + ' (tap to change)';
      btnColour.setAttribute('aria-label', 'Colour: ' + c.id + '. Tap to change.');
    }
    function cycleColour() {
      colourIdx = (colourIdx + 1) % COLOURS.length;
      syncColourBtn();
    }

    function sizeCanvas(canvas) {
      var wrap = canvas.parentElement;
      if (!wrap) return;
      var rect = wrap.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var cssW = Math.max(1, Math.round(rect.width));
      var cssH = Math.max(1, Math.round(rect.height));
      if (canvas._cssW === cssW && canvas._cssH === cssH && canvas._dpr === dpr) return;
      canvas._cssW = cssW;
      canvas._cssH = cssH;
      canvas._dpr = dpr;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      var ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      redrawCanvas(canvas);
    }

    function strokeStyleFor(stroke) {
      if (stroke.erase) return null;
      if (stroke.highlight) {
        return stroke.hiColour || COLOURS[0].hi;
      }
      return stroke.colour || COLOURS[0].hex;
    }

    function redrawCanvas(canvas) {
      var id = canvas.dataset.hw;
      var ctx = canvas.getContext('2d');
      var w = canvas._cssW || canvas.clientWidth;
      var h = canvas._cssH || canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      var list = strokes[id] || [];
      for (var s = 0; s < list.length; s++) {
        var stroke = list[s];
        if (!stroke.points || stroke.points.length < 1) continue;
        ctx.save();
        if (stroke.erase) {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.strokeStyle = 'rgba(0,0,0,1)';
          ctx.fillStyle = 'rgba(0,0,0,1)';
        } else if (stroke.highlight) {
          /* Overlay canvas is transparent: multiply often yields invisible
             strokes on iOS. source-over + alpha hi colours read as highlighter. */
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = strokeStyleFor(stroke);
          ctx.fillStyle = strokeStyleFor(stroke);
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = strokeStyleFor(stroke);
          ctx.fillStyle = strokeStyleFor(stroke);
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        var lw = stroke.width || (stroke.highlight ? HI_BASE : PEN_BASE);
        ctx.lineWidth = lw;
        ctx.beginPath();
        for (var i = 0; i < stroke.points.length; i++) {
          var pt = stroke.points[i];
          var x = pt.x * w;
          var y = pt.y * h;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        if (stroke.points.length === 1) {
          var p0 = stroke.points[0];
          ctx.beginPath();
          ctx.arc(p0.x * w, p0.y * h, lw / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    function redrawAll() {
      canvases.forEach(redrawCanvas);
    }
    function resizeAll() {
      canvases.forEach(sizeCanvas);
    }
    window.hwResize = resizeAll;

    function posNorm(canvas, clientX, clientY) {
      var rect = canvas.getBoundingClientRect();
      var w = rect.width || 1;
      var h = rect.height || 1;
      return {
        x: Math.min(1, Math.max(0, (clientX - rect.left) / w)),
        y: Math.min(1, Math.max(0, (clientY - rect.top) / h))
      };
    }

    function penWidth(p) {
      if (tool === 'erase') return ER_BASE + p * ER_PRESS;
      if (tool === 'highlight') return HI_BASE + p * HI_PRESS;
      return PEN_BASE + p * PEN_PRESS;
    }

    function startDraw(canvas, e) {
      if (!enabled) return;
      e.preventDefault();
      drawing = true;
      activeCanvas = canvas;
      var id = canvas.dataset.hw;
      lastHwId = id;
      if (!strokes[id]) strokes[id] = [];
      var p = e.pressure && e.pressure > 0 ? e.pressure : 0.5;
      var pt = posNorm(canvas, e.clientX, e.clientY);
      pt.p = p;
      var c = COLOURS[colourIdx];
      current = {
        colour: c.hex,
        hiColour: c.hi,
        width: penWidth(p),
        erase: tool === 'erase',
        highlight: tool === 'highlight',
        points: [pt]
      };
      strokes[id].push(current);
      redrawCanvas(canvas);
    }

    function moveDraw(e) {
      if (!drawing || !activeCanvas || !current) return;
      e.preventDefault();
      var p = e.pressure && e.pressure > 0 ? e.pressure : 0.5;
      var pt = posNorm(activeCanvas, e.clientX, e.clientY);
      pt.p = p;
      current.points.push(pt);
      if (!current.erase) {
        if (current.highlight) current.width = HI_BASE + p * HI_PRESS;
        else current.width = PEN_BASE + p * PEN_PRESS;
      }
      redrawCanvas(activeCanvas);
    }

    function endDraw() {
      if (!drawing) return;
      drawing = false;
      if (current && activeCanvas) {
        var id = activeCanvas.dataset.hw;
        /* deep-ish copy for undo */
        var snap = {
          type: 'add',
          id: id,
          stroke: JSON.parse(JSON.stringify(current))
        };
        undoStack.push(snap);
        redoStack = [];
        save();
        updateUndoRedo();
      }
      current = null;
      activeCanvas = null;
    }

    function doUndo() {
      if (!undoStack.length) return;
      var act = undoStack.pop();
      if (act.type === 'add') {
        var list = strokes[act.id] || [];
        if (list.length) {
          var removed = list.pop();
          redoStack.push({ type: 'add', id: act.id, stroke: removed });
        }
      } else if (act.type === 'clearAll') {
        strokes = act.prev || {};
        redoStack.push({ type: 'clearAll', prev: null, after: act.after });
      }
      save();
      redrawAll();
      updateUndoRedo();
    }

    function doRedo() {
      if (!redoStack.length) return;
      var act = redoStack.pop();
      if (act.type === 'add') {
        if (!strokes[act.id]) strokes[act.id] = [];
        strokes[act.id].push(act.stroke);
        undoStack.push({ type: 'add', id: act.id, stroke: act.stroke });
      } else if (act.type === 'clearAll') {
        var prev = JSON.parse(JSON.stringify(strokes));
        strokes = {};
        undoStack.push({ type: 'clearAll', prev: prev, after: {} });
      }
      save();
      redrawAll();
      updateUndoRedo();
    }

    canvases.forEach(function (canvas) {
      canvas.addEventListener('pointerdown', function (e) {
        if (e.button !== undefined && e.button !== 0) return;
        canvas.setPointerCapture(e.pointerId);
        startDraw(canvas, e);
      });
      canvas.addEventListener('pointermove', moveDraw);
      canvas.addEventListener('pointerup', endDraw);
      canvas.addEventListener('pointercancel', endDraw);
      canvas.addEventListener('lostpointercapture', endDraw);
    });

    function bindTap(el, fn) {
      if (!el) return;
      el.addEventListener('click', function (e) {
        if (el.disabled) return;
        fn(e);
      });
    }
    bindTap(tog, function () { setEnabled(!enabled); });
    bindTap(btnPen, function () { setTool('pen'); });
    bindTap(btnEraser, function () { setTool('erase'); });
    bindTap(btnHighlight, function () { setTool('highlight'); });
    bindTap(btnColour, cycleColour);
    bindTap(btnUndo, doUndo);
    bindTap(btnRedo, doRedo);

    if (btnClearAll) {
      bindTap(btnClearAll, function () {
        var any = Object.keys(strokes).some(function (k) {
          return strokes[k] && strokes[k].length;
        });
        if (!any) return;
        if (!confirm('Clear ALL handwriting notes? / 清除全部手寫筆記？')) return;
        var prev = JSON.parse(JSON.stringify(strokes));
        undoStack.push({ type: 'clearAll', prev: prev, after: {} });
        redoStack = [];
        strokes = {};
        lastHwId = null;
        save();
        redrawAll();
        updateUndoRedo();
      });
    }

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resizeAll, 120);
    });
    window.addEventListener('orientationchange', function () {
      setTimeout(resizeAll, 200);
    });

    load();
    syncColourBtn();
    setTool('pen');
    setEnabled(false);
    resizeAll();
    canvases.forEach(function (c) {
      c.style.display = 'none';
      c.style.pointerEvents = 'none';
    });
  })();

  /* ---------- Format page sections: multi-open + localStorage ---------- */
  (function () {
    /* HTML defaults are closed. Sections open and close independently
       (no accordion) so Expand All can leave every section open together.
       A saved choice in localStorage is restored when one exists. */
    var KEY = 'dse-writing-format-sections-v2-' + pageSlug;
    var sections = Array.prototype.slice.call(
      document.querySelectorAll('details.format-section[data-section]')
    );
    if (!sections.length) return;

    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (saved && typeof saved === 'object') {
      var anyKnown = sections.some(function (el) {
        return Object.prototype.hasOwnProperty.call(saved, el.getAttribute('data-section'));
      });
      if (anyKnown) {
        sections.forEach(function (el) {
          var id = el.getAttribute('data-section');
          el.open = Object.prototype.hasOwnProperty.call(saved, id) ? !!saved[id] : false;
        });
      }
    }

    function persist() {
      var state = {};
      sections.forEach(function (el) {
        state[el.getAttribute('data-section')] = el.open;
      });
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    }

    sections.forEach(function (el) {
      el.addEventListener('toggle', function () {
        persist();
        if (typeof window.hwResize === 'function') {
          requestAnimationFrame(function () { setTimeout(window.hwResize, 50); });
        }
      });
    });
  })();

  /* Expand All ↔ Collapse All — one chip. Native <details>, top-level and nested.
     The label is the next action: Expand All while any section is closed,
     Collapse All only when every section (including nested banks) is open.
     A heading still toggles on its own; the chip follows that state.
     Older pages that still ship the two-button pair keep that behaviour. */
  (function () {
    var bar = document.querySelector('.section-toggle');
    if (!bar) return;
    var toggleBtn = bar.querySelector('[data-sections="toggle"]');
    var expandBtn = bar.querySelector('[data-sections="expand"]');
    var collapseBtn = bar.querySelector('[data-sections="collapse"]');

    function detailsNodes() {
      return document.querySelectorAll('.wrap details');
    }

    function allOpen() {
      var nodes = detailsNodes();
      if (!nodes.length) return false;
      for (var i = 0; i < nodes.length; i++) {
        if (!nodes[i].open) return false;
      }
      return true;
    }

    function setAll(open) {
      var nodes = detailsNodes();
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].open !== open) nodes[i].open = open;
      }
      if (typeof window.hwResize === 'function') {
        requestAnimationFrame(function () { setTimeout(window.hwResize, 50); });
      }
    }

    function syncChip() {
      if (!toggleBtn) return;
      toggleBtn.textContent = allOpen() ? 'Collapse All' : 'Expand All';
    }

    if (toggleBtn) {
      var nodes = detailsNodes();
      for (var i = 0; i < nodes.length; i++) {
        nodes[i].addEventListener('toggle', syncChip);
      }
      toggleBtn.addEventListener('click', function () {
        setAll(!allOpen());
        syncChip();
      });
      syncChip();
      return;
    }

    if (expandBtn) expandBtn.addEventListener('click', function () { setAll(true); });
    if (collapseBtn) collapseBtn.addEventListener('click', function () { setAll(false); });
  })();
})();
