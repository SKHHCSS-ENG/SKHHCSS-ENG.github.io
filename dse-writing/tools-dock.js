/**
 * DSE Writing — U47-style Tools dock
 * 中文 gloss + Handwrite notes (localStorage). No timer/recording.
 */
(function () {
  var ZH_KEY = 'dse-writing-zh-on';
  var DOCK_KEY = 'dse-writing-dock-open';
  var pageSlug = (function () {
    var parts = location.pathname.replace(/\/+$/, '').split('/');
    var last = parts[parts.length - 1] || '';
    if (last === 'index.html') last = parts[parts.length - 2] || 'page';
    return last || 'page';
  })();
  var HW_KEY = 'dse-writing-hw-' + pageSlug;

  /* ---------- 中文 gloss ---------- */
  var zhBtn = document.getElementById('zhToggle');
  function shortLabel() {
    return window.matchMedia('(max-width: 700px)').matches;
  }
  function zhLabel(on) {
    if (shortLabel()) return on ? '中文 ON' : '中文';
    return on ? '中文 ON' : '中文';
  }
  function applyZh(on) {
    document.body.classList.toggle('zh-on', on);
    if (zhBtn) {
      zhBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      zhBtn.setAttribute('aria-label', on ? 'Chinese gloss: ON' : 'Chinese gloss: OFF');
      zhBtn.classList.toggle('on', on);
      zhBtn.textContent = zhLabel(on);
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
  var mq = window.matchMedia('(max-width: 700px)');
  function refreshZhLabel() {
    applyZh(document.body.classList.contains('zh-on'));
  }
  if (mq.addEventListener) mq.addEventListener('change', refreshZhLabel);
  else if (mq.addListener) mq.addListener(refreshZhLabel);

  /* ---------- Collapsible dock ---------- */
  var dockToggle = document.getElementById('dockToggle');
  var dockOpen = false;
  function loadDockOpen() {
    try {
      var v = localStorage.getItem(DOCK_KEY);
      if (v === '1') return true;
      if (v === '0') return false;
    } catch (e) {}
    return false;
  }
  function saveDockOpen(on) {
    try { localStorage.setItem(DOCK_KEY, on ? '1' : '0'); } catch (e) {}
  }
  function setDockOpen(on, persist) {
    dockOpen = !!on;
    document.body.classList.toggle('dock-open', dockOpen);
    if (dockToggle) dockToggle.setAttribute('aria-expanded', String(dockOpen));
    if (persist !== false) saveDockOpen(dockOpen);
  }
  window.dseExpandDock = function () { setDockOpen(true, true); };
  if (dockToggle) {
    dockToggle.addEventListener('click', function () {
      setDockOpen(!dockOpen, true);
    });
  }
  setDockOpen(loadDockOpen(), false);

  /* ---------- Handwrite (U47 pattern; Clear last = last drawn area) ---------- */
  (function initHandwrite() {
    var COLOURS = [
      { id: 'teal', hex: '#0e6b7a', emoji: '🟢' },
      { id: 'navy', hex: '#123a4d', emoji: '⚫' },
      { id: 'warn', hex: '#b45309', emoji: '🟠' },
      { id: 'blue', hex: '#2563EB', emoji: '🔵' }
    ];
    var colourIdx = 0;
    var tool = 'pen';
    var enabled = false;
    var strokes = {};
    var drawing = false;
    var current = null;
    var activeCanvas = null;
    var lastHwId = null;

    var tog = document.getElementById('togHandwrite');
    var btnPen = document.getElementById('hwPen');
    var btnEraser = document.getElementById('hwEraser');
    var btnColour = document.getElementById('hwColour');
    var btnClearLast = document.getElementById('hwClearLast');
    var btnClearAll = document.getElementById('hwClearAll');
    var canvases = Array.from(document.querySelectorAll('.hw-canvas'));
    if (!tog || !canvases.length) return;

    function load() {
      try {
        var raw = localStorage.getItem(HW_KEY);
        if (raw) {
          var data = JSON.parse(raw);
          if (data && typeof data === 'object' && data.strokes) strokes = data.strokes;
          else if (data && typeof data === 'object') strokes = data;
          if (data && data.lastHwId) lastHwId = data.lastHwId;
        }
      } catch (e) { strokes = {}; }
    }
    function save() {
      try {
        localStorage.setItem(HW_KEY, JSON.stringify({ v: 1, strokes: strokes, lastHwId: lastHwId }));
      } catch (e) {}
    }
    function setToolsEnabled(on) {
      [btnPen, btnEraser, btnColour, btnClearLast, btnClearAll].forEach(function (b) {
        if (b) b.disabled = !on;
      });
    }
    function setEnabled(on) {
      enabled = on;
      document.body.classList.toggle('hw-on', on);
      document.body.classList.toggle('hw-erase', on && tool === 'erase');
      tog.classList.toggle('on', on);
      tog.setAttribute('aria-pressed', String(on));
      setToolsEnabled(on);
      canvases.forEach(function (c) {
        c.style.display = on ? 'block' : 'none';
        c.style.pointerEvents = on ? 'auto' : 'none';
      });
      if (on) {
        if (typeof window.dseExpandDock === 'function') window.dseExpandDock();
        resizeAll();
      }
    }
    function setTool(t) {
      tool = t;
      document.body.classList.toggle('hw-erase', enabled && tool === 'erase');
      if (btnPen) {
        btnPen.classList.toggle('tool-on', tool === 'pen');
        btnPen.setAttribute('aria-pressed', String(tool === 'pen'));
      }
      if (btnEraser) {
        btnEraser.classList.toggle('tool-on', tool === 'erase');
        btnEraser.setAttribute('aria-pressed', String(tool === 'erase'));
      }
    }
    function cycleColour() {
      colourIdx = (colourIdx + 1) % COLOURS.length;
      if (btnColour) {
        btnColour.textContent = COLOURS[colourIdx].emoji;
        btnColour.title = 'Ink: ' + COLOURS[colourIdx].id;
      }
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
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = stroke.colour || COLOURS[0].hex;
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = stroke.width || 2.0;
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
          ctx.arc(p0.x * w, p0.y * h, (stroke.width || 2.0) / 2, 0, Math.PI * 2);
          ctx.fillStyle = stroke.erase ? 'rgba(0,0,0,1)' : (stroke.colour || COLOURS[0].hex);
          if (stroke.erase) ctx.globalCompositeOperation = 'destination-out';
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
      var width = tool === 'erase' ? 12 + p * 8 : 1.5 + p * 1.0;
      current = {
        colour: COLOURS[colourIdx].hex,
        width: width,
        erase: tool === 'erase',
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
      if (!current.erase) current.width = 1.5 + p * 1.0;
      redrawCanvas(activeCanvas);
    }

    function endDraw() {
      if (!drawing) return;
      drawing = false;
      current = null;
      activeCanvas = null;
      save();
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

    tog.addEventListener('click', function () { setEnabled(!enabled); });
    if (btnPen) btnPen.addEventListener('click', function () { setTool('pen'); });
    if (btnEraser) btnEraser.addEventListener('click', function () { setTool('erase'); });
    if (btnColour) btnColour.addEventListener('click', cycleColour);

    /* Clear last drawn section — no play-focus required */
    if (btnClearLast) {
      btnClearLast.addEventListener('click', function () {
        var id = lastHwId;
        var target = null;
        if (id) {
          target = document.querySelector('.hw-canvas[data-hw="' + id + '"]');
        }
        if (!target || !strokes[id] || !strokes[id].length) {
          /* fallback: most recently non-empty canvas in DOM order (last with ink) */
          for (var i = canvases.length - 1; i >= 0; i--) {
            var cid = canvases[i].dataset.hw;
            if (strokes[cid] && strokes[cid].length) {
              id = cid;
              target = canvases[i];
              break;
            }
          }
        }
        if (!target || !id || !strokes[id] || !strokes[id].length) return;
        if (!confirm('Clear handwriting on this section? / 清除這一區的手寫？')) return;
        strokes[id] = [];
        save();
        redrawCanvas(target);
      });
    }

    if (btnClearAll) {
      btnClearAll.addEventListener('click', function () {
        var any = Object.keys(strokes).some(function (k) {
          return strokes[k] && strokes[k].length;
        });
        if (!any) return;
        if (!confirm('Clear ALL handwriting notes? / 清除全部手寫筆記？')) return;
        strokes = {};
        lastHwId = null;
        save();
        redrawAll();
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
    setTool('pen');
    setEnabled(false);
    resizeAll();
    canvases.forEach(function (c) {
      c.style.display = 'none';
      c.style.pointerEvents = 'none';
    });
  })();
})();
