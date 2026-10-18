/**
 * Speech Festival — sticky Tools dock (U47 / U66)
 * 譯 (Chinese gloss) + Handwrite (Colour · Pen · Highlighter · Eraser · Undo · Redo · Clear)
 * + Record (device file / voice memo, local playback only)
 * Collapsible dock (🛠 toggles expand/collapse; always bottom-right). Canvas overlays stanzas — no blank spacer.
 * Adapted from dse-writing/tools-dock.js; does not load on Solo Verse.
 */
(function () {
  var pageSlug = (function () {
    var parts = location.pathname.replace(/\/+$/, '').split('/');
    var last = parts[parts.length - 1] || '';
    if (last === 'index.html') last = parts[parts.length - 2] || 'page';
    return last || 'page';
  })();
  var ZH_KEY = 'sf-zh-' + pageSlug;
  var HW_KEY = 'sf-hw-v2-' + pageSlug;
  var DOCK_KEY = 'sf-dock-open-' + pageSlug;
  var REC_KEY = 'sf-rec-open-' + pageSlug;
  /* legacy handwrite keys (migrate once) */
  var HW_LEGACY = {
    u47: 'u47-summer-handwrite-v1',
    u66: 'u66-late-home-handwrite-v1'
  };

  document.body.classList.add('sf-tools');
  document.documentElement.classList.add('sf-tools');

  var glossRoot = document.getElementById('stanzaContainer');
  var zhBtn = document.getElementById('zhToggle');

  function glossVisible() {
    if (!glossRoot) return true;
    return !glossRoot.classList.contains('hide-zh');
  }
  function applyZh(on) {
    if (glossRoot) glossRoot.classList.toggle('hide-zh', !on);
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
  var zhSaved = null;
  try { zhSaved = localStorage.getItem(ZH_KEY); } catch (e) {}
  /* Default ON (poem gloss visible) when no saved preference */
  applyZh(zhSaved === null ? true : zhSaved === '1');
  if (zhBtn) {
    zhBtn.addEventListener('click', function () {
      applyZh(!glossVisible());
    });
  }

  /* ---------- Dock collapse (default collapsed = 🛠 chip) ---------- */
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
    if (typeof window.hwResize === 'function') {
      requestAnimationFrame(function () { setTimeout(window.hwResize, 50); });
    }
  }
  window.sfExpandDock = function () { setDockOpen(true); };
  var dockSaved = null;
  try { dockSaved = localStorage.getItem(DOCK_KEY); } catch (e) {}
  setDockOpen(dockSaved === '1');
  if (foldBtn) {
    foldBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      setDockOpen(!document.body.classList.contains('dock-open'));
    });
  }

  /* ---------- Record toggle (chrome chip → rec-bar) ---------- */
  (function initRecord() {
    var togRec = document.getElementById('togRecord');
    var recBar = document.getElementById('recBar');
    var nativeAudioInput = document.getElementById('nativeAudioInput');
    var lblNativeRec = document.getElementById('lblNativeRec');
    var audioBar = document.getElementById('audioBar');
    var audioPlayer = document.getElementById('audioPlayer');
    var btnChangeTake = document.getElementById('btnChangeTake');
    if (!togRec) return;
    var audioUrl = null;
    var enabled = false;

    function setRec(on) {
      enabled = on;
      document.body.classList.toggle('rec-on', on);
      togRec.classList.toggle('on', on);
      togRec.setAttribute('aria-pressed', String(on));
      if (recBar) {
        if (on) recBar.removeAttribute('hidden');
        else recBar.setAttribute('hidden', '');
      }
      if (on && typeof window.sfExpandDock === 'function') window.sfExpandDock();
    }

    var recSaved = null;
    try { recSaved = localStorage.getItem(REC_KEY); } catch (e) {}
    setRec(recSaved === '1');
    togRec.addEventListener('click', function () {
      var next = !enabled;
      setRec(next);
      try { localStorage.setItem(REC_KEY, next ? '1' : '0'); } catch (e) {}
    });

    if (lblNativeRec && nativeAudioInput) {
      lblNativeRec.onkeydown = function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          nativeAudioInput.click();
        }
      };
      nativeAudioInput.onchange = function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file || !audioPlayer) return;
        audioPlayer.pause();
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        audioUrl = URL.createObjectURL(file);
        audioPlayer.src = audioUrl;
        lblNativeRec.style.display = 'none';
        if (audioBar) audioBar.classList.add('show');
      };
    }
    if (btnChangeTake && nativeAudioInput) {
      btnChangeTake.onclick = function () {
        nativeAudioInput.value = '';
        nativeAudioInput.click();
      };
    }
    window.addEventListener('pagehide', function () {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    });
  })();

  /* ---------- Handwrite ---------- */
  (function initHandwrite() {
    var COLOURS = [
      { id: 'heat', hex: '#C2410C', hi: 'rgba(194,65,12,0.4)' },
      { id: 'asphalt', hex: '#1C1917', hi: 'rgba(28,25,23,0.4)' },
      { id: 'cool', hex: '#2563EB', hi: 'rgba(37,99,235,0.4)' },
      { id: 'gold', hex: '#CA8A04', hi: 'rgba(250,204,21,0.5)' },
      { id: 'ok', hex: '#3D7A5A', hi: 'rgba(61,122,90,0.4)' }
    ];
    var colourIdx = 0;
    var tool = 'pen';
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
        if (!raw && HW_LEGACY[pageSlug]) {
          raw = localStorage.getItem(HW_LEGACY[pageSlug]);
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
      canvases.forEach(function (c) {
        c.style.display = on ? 'block' : 'none';
        c.style.pointerEvents = on ? 'auto' : 'none';
      });
      if (on) {
        if (typeof window.sfExpandDock === 'function') window.sfExpandDock();
        resizeAll();
      }
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
      btnColour.style.boxShadow = '0 0 0 1.5px #C4B8A8';
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
      if (stroke.highlight) return stroke.hiColour || COLOURS[0].hi;
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

    function redrawAll() { canvases.forEach(redrawCanvas); }
    function resizeAll() { canvases.forEach(sizeCanvas); }
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
        var snap = { type: 'add', id: id, stroke: JSON.parse(JSON.stringify(current)) };
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

    /* Resize when poem toggles change height */
    ['togRunon', 'togStress', 'togCues'].forEach(function (id) {
      var b = document.getElementById(id);
      if (!b) return;
      b.addEventListener('click', function () {
        requestAnimationFrame(function () { setTimeout(resizeAll, 50); });
      });
    });

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
})();
