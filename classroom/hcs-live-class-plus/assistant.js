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

  // Same roster rule as the floor: one to three digits pad to two, so a
  // chart "7" matches a desk stored as "07". Anything else is kept as typed.
  function normaliseClassNo(rawText) {
    var next = String(rawText == null ? '' : rawText).replace(/\s+/g, ' ').trim();
    if (next.charAt(0) === '#') next = next.slice(1).trim();
    if (!next) return '';
    if (next.length > 12) next = next.slice(0, 12).trim();
    if (/^\d{1,3}$/.test(next)) return next.padStart(2, '0');
    return next;
  }

  // OCR words are digits only. A date or a glued pair is not a class number.
  function chartToken(text) {
    var digits = String(text == null ? '' : text).replace(/\D/g, '');
    if (!/^\d{1,3}$/.test(digits)) return '';
    return normaliseClassNo(digits);
  }

  // Desk pitch copied from the floor. Pairs and pods use the 8px / 36px
  // left-right gaps; exam rows use the even 16px column step.
  var CHART_PITCH = {
    stageWidth: 1120,
    deskW: 148,
    deskH: 115,
    rowGapY: 10,
    examColGapX: 16,
    podInnerGapX: 8,
    podAisleGapX: 36,
    podRowAisleY: 24,
    frontEdge: 8,
    frontLabelH: 32,
    frontRowGap: 10
  };

  function frontRowTopOffset(frontAtTop) {
    var p = CHART_PITCH;
    return frontAtTop ? (p.frontEdge + p.frontLabelH + p.frontRowGap) : 28;
  }

  function pairColOffset(c) {
    var p = CHART_PITCH;
    var pairIdx = Math.floor(c / 2);
    var inPair = c % 2;
    return pairIdx * (2 * p.deskW + p.podInnerGapX + p.podAisleGapX) + inPair * (p.deskW + p.podInnerGapX);
  }

  function podRowOffset(r) {
    var p = CHART_PITCH;
    var podRow = Math.floor(r / 2);
    var inPod = r % 2;
    return podRow * (2 * p.deskH + p.rowGapY + p.podRowAisleY) + inPod * (p.deskH + p.rowGapY);
  }

  function layoutOriginX(totalGridW) {
    var p = CHART_PITCH;
    var eff = Math.max(p.stageWidth, totalGridW + 64);
    return Math.max(28, Math.round((eff - totalGridW) / 2));
  }

  // Row 0 is the top of the floor. frontAtTop puts the front label above it.
  function layoutSlots(rows, cols, layoutStyle, frontAtTop) {
    var p = CHART_PITCH;
    var style = layoutStyle || 'pairs';
    if (style !== 'rows' && style !== 'pairs' && style !== 'pods4' && style !== 'customGrid') style = 'rows';
    var nRows = Math.max(1, rows | 0);
    var nCols = Math.max(1, cols | 0);
    var top = frontRowTopOffset(!!frontAtTop);
    var stepY = p.deskH + p.rowGapY;
    var stepX = p.deskW + p.examColGapX;
    var totalW = (style === 'rows' || style === 'customGrid')
      ? ((nCols - 1) * stepX + p.deskW)
      : (pairColOffset(nCols - 1) + p.deskW);
    var startX = layoutOriginX(totalW);
    var slots = [];
    for (var r = 0; r < nRows; r++) {
      var row = [];
      for (var c = 0; c < nCols; c++) {
        var x = (style === 'rows' || style === 'customGrid') ? (startX + c * stepX) : (startX + pairColOffset(c));
        var y = top + (style === 'pods4' ? podRowOffset(r) : r * stepY);
        row.push({ x: x, y: y });
      }
      slots.push(row);
    }
    return slots;
  }

  function clusterAxis(values, tol) {
    var sorted = [];
    (values || []).forEach(function (v) {
      if (typeof v === 'number' && isFinite(v)) sorted.push(v);
    });
    sorted.sort(function (a, b) { return a - b; });
    var groups = [];
    sorted.forEach(function (v) {
      var g = groups.length ? groups[groups.length - 1] : null;
      if (!g || v - g.mean > tol) groups.push({ sum: v, n: 1, mean: v });
      else {
        g.sum += v;
        g.n += 1;
        g.mean = g.sum / g.n;
      }
    });
    return groups.map(function (g) { return Math.round(g.mean); });
  }

  // Reuse the open plan's column and row centres when they already match
  // the chart. That keeps a dragged block's origin instead of recentering it.
  function inferDeskAxes(students, rows, cols) {
    var xs = [];
    var ys = [];
    (students || []).forEach(function (st) {
      if (!st) return;
      if (typeof st.x === 'number') xs.push(st.x);
      if (typeof st.y === 'number') ys.push(st.y);
    });
    var cx = clusterAxis(xs, 40);
    var cy = clusterAxis(ys, 50);
    if (cx.length !== cols || cy.length !== rows) return null;
    return { xs: cx, ys: cy };
  }

  function axesToSlots(xs, ys) {
    var slots = [];
    for (var r = 0; r < ys.length; r++) {
      var row = [];
      for (var c = 0; c < xs.length; c++) row.push({ x: xs[c], y: ys[r] });
      slots.push(row);
    }
    return slots;
  }

  function blueMaskFromRGBA(data, width, height) {
    var mask = new Uint8Array(width * height);
    var count = 0;
    var p = 0;
    for (var i = 0; i < data.length && p < mask.length; i += 4, p++) {
      var r = data[i];
      var g = data[i + 1];
      var b = data[i + 2];
      if (b > r + 25 && b > g && b > 100 && r < 200 && (b - r) > 28) {
        mask[p] = 1;
        count += 1;
      }
    }
    return { mask: mask, count: count, width: width, height: height };
  }

  // Horizontal runs of number ink. A short empty gap is one broken stroke,
  // not a new desk row.
  function inkRowBands(mask, width, height) {
    var rows = new Uint32Array(height);
    var max = 0;
    for (var y = 0; y < height; y++) {
      var s = 0;
      var row = y * width;
      for (var x = 0; x < width; x++) s += mask[row + x];
      rows[y] = s;
      if (s > max) max = s;
    }
    var thresh = Math.max(12, Math.floor(max * 0.25));
    var bands = [];
    var yy = 0;
    while (yy < height) {
      if (rows[yy] >= thresh) {
        var y0 = yy;
        // Keep the thinner top and bottom of the same digits. A full row
        // sets the threshold; a short back row would otherwise be clipped.
        while (y0 > 0 && rows[y0 - 1] >= 8) y0 -= 1;
        while (yy < height && rows[yy] >= 8) yy += 1;
        if (yy - y0 >= 8) bands.push({ y0: y0, y1: yy });
      } else yy += 1;
    }
    var merged = [];
    bands.forEach(function (b) {
      var prev = merged.length ? merged[merged.length - 1] : null;
      if (prev && b.y0 - prev.y1 <= 10) prev.y1 = b.y1;
      else merged.push({ y0: b.y0, y1: b.y1 });
    });
    return merged;
  }

  function chooseDeskRows(bands) {
    var kept = [];
    (bands || []).forEach(function (band) {
      var items = [];
      ((band && band.items) || []).forEach(function (it) {
        var raw = it && it.classNo != null ? it.classNo : (it && it.text);
        var no = chartToken(raw);
        var x = Number(it && it.x);
        if (!no || !isFinite(x)) return;
        var conf = Number(it && it.confidence);
        if (!isFinite(conf)) conf = 100;
        items.push({ classNo: no, x: x, confidence: conf });
      });
      if (!items.length) return;
      if (items.length === 1 && items[0].confidence < 45) return;
      items.sort(function (a, b) { return a.x - b.x; });
      kept.push({ items: items });
    });
    return kept;
  }

  function medianGap(xs) {
    if (!xs || xs.length < 2) return 0;
    var gaps = [];
    for (var i = 1; i < xs.length; i++) gaps.push(xs[i] - xs[i - 1]);
    gaps.sort(function (a, b) { return a - b; });
    return gaps[Math.floor((gaps.length - 1) / 2)];
  }

  function columnCenters(xs) {
    var sorted = [];
    xs.slice().sort(function (a, b) { return a - b; }).forEach(function (x) {
      if (!sorted.length || x - sorted[sorted.length - 1] > 1) sorted.push(x);
    });
    if (sorted.length < 2) return sorted;
    var median = medianGap(sorted);
    if (!(median > 0)) return sorted;
    var out = [sorted[0]];
    for (var i = 1; i < sorted.length; i++) {
      var dx = sorted[i] - sorted[i - 1];
      var missing = Math.round(dx / median) - 1;
      if (missing > 0 && missing <= 6 && dx > median * 1.65) {
        for (var k = 1; k <= missing; k++) out.push(sorted[i - 1] + (dx * k) / (missing + 1));
      }
      out.push(sorted[i]);
    }
    return out;
  }

  // Photo order: the first band is the top of the picture. Empty cells stay
  // blank so a short back row does not slide left.
  function seatingGridFromMarks(bands) {
    var rows = chooseDeskRows(bands);
    var notes = [];
    if (!rows.length) return { grid: [], notes: notes };
    var seed = rows[0];
    rows.forEach(function (row) {
      if (row.items.length > seed.items.length) seed = row;
    });
    var centers = columnCenters(seed.items.map(function (it) { return it.x; }));
    var median = medianGap(centers);
    var tol = median > 0 ? median * 0.6 : 80;
    var spanMin = centers[0];
    var spanMax = centers[centers.length - 1];
    var grid = [];
    rows.forEach(function (row) {
      var cells = [];
      var claimed = {};
      for (var c = 0; c < centers.length; c++) cells.push('');
      row.items.forEach(function (it) {
        if (it.x < spanMin - tol || it.x > spanMax + tol) {
          notes.push('#' + it.classNo + ' sat outside the desk columns and was left off.');
          return;
        }
        var best = 0;
        var bestD = Infinity;
        for (var i = 0; i < centers.length; i++) {
          var d = Math.abs(it.x - centers[i]);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
        if (claimed[best]) {
          notes.push('#' + it.classNo + ' overlapped another number in the same column and was left off.');
          return;
        }
        claimed[best] = true;
        cells[best] = it.classNo;
      });
      grid.push(cells);
    });
    return { grid: grid, notes: notes };
  }

  function resolveChartSlots(students, rows, cols, options) {
    if (options && options.slots) return options.slots;
    var inferred = inferDeskAxes(students, rows, cols);
    if (inferred) return axesToSlots(inferred.xs, inferred.ys);
    return layoutSlots(rows, cols, options && options.layoutStyle, !!(options && options.frontAtTop));
  }

  // grid is photo order, top row first. chartBoardAtBottom means the last
  // photo row is the front. The floor's row 0 is the top of the screen.
  // Those agree when the board is at the bottom and the floor front is too.
  function rematchByClassNo(students, grid, options) {
    options = options || {};
    var list = students || [];
    var source = grid || [];
    var rows = source.length;
    var cols = 0;
    for (var r = 0; r < rows; r++) cols = Math.max(cols, (source[r] || []).length);
    var frontAtTop = !!options.frontAtTop;
    var chartBoardAtBottom = options.chartBoardAtBottom !== false;
    var flip = chartBoardAtBottom === frontAtTop;
    var floor = [];
    for (var rr = 0; rr < rows; rr++) {
      var src = flip ? rows - 1 - rr : rr;
      var line = [];
      for (var c = 0; c < cols; c++) {
        var raw = source[src] && source[src][c] != null ? source[src][c] : '';
        line.push(raw === '' ? '' : normaliseClassNo(raw));
      }
      floor.push(line);
    }
    var slots = rows && cols ? resolveChartSlots(list, rows, cols, options) : [];
    var byNo = {};
    list.forEach(function (st) {
      if (!st) return;
      var key = normaliseClassNo(st.classNo);
      if (!key || byNo[key]) return;
      byNo[key] = st;
    });
    var used = {};
    var notes = (options.notes || []).slice();
    var moves = [];
    var preview = [];
    for (var r = 0; r < rows; r++) {
      var prow = [];
      for (var cc = 0; cc < cols; cc++) {
        var key = floor[r][cc];
        var slot = slots[r] && slots[r][cc] ? slots[r][cc] : null;
        if (!key) {
          prow.push({ classNo: '', name: '', status: 'empty' });
          continue;
        }
        if (used[key]) {
          notes.push('#' + key + ' is on the chart twice. The second desk stays empty.');
          prow.push({ classNo: key, name: '', status: 'duplicate' });
          continue;
        }
        used[key] = true;
        var st = byNo[key];
        if (!st || !slot) {
          notes.push('#' + key + ' is on the chart and not in this plan. That desk stays empty.');
          prow.push({ classNo: key, name: '', status: 'missing' });
          continue;
        }
        moves.push({ id: st.id, classNo: key, name: st.name || '', x: slot.x, y: slot.y });
        prow.push({ classNo: key, name: st.name || '', status: 'matched', x: slot.x, y: slot.y });
      }
      preview.push(prow);
    }
    list.forEach(function (st) {
      if (!st) return;
      var key = normaliseClassNo(st.classNo);
      if (key && byNo[key] && byNo[key].id !== st.id) {
        notes.push((st.name || 'A student') + ' shares #' + key + ' and stays put.');
        return;
      }
      if (key && used[key]) return;
      var label = (key ? '#' + key + ' ' : '') + (st.name || 'A student');
      notes.push(label.trim() + ' is not on the chart and stays put.');
    });
    return {
      moves: moves,
      notes: notes,
      preview: preview,
      gridRows: rows,
      gridCols: cols
    };
  }

  // Copy every field, then replace x and y. Groups, scores, and names stay.
  function applySeatMoves(students, moves) {
    var byId = {};
    (moves || []).forEach(function (m) {
      if (m && m.id) byId[m.id] = m;
    });
    return (students || []).map(function (st) {
      var next = {};
      Object.keys(st || {}).forEach(function (k) { next[k] = st[k]; });
      var m = st && byId[st.id];
      if (m && typeof m.x === 'number' && typeof m.y === 'number') {
        next.x = m.x;
        next.y = m.y;
      }
      return next;
    });
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
    readPayload: readPayload,
    normaliseClassNo: normaliseClassNo,
    chartToken: chartToken,
    CHART_PITCH: CHART_PITCH,
    layoutSlots: layoutSlots,
    inferDeskAxes: inferDeskAxes,
    blueMaskFromRGBA: blueMaskFromRGBA,
    inkRowBands: inkRowBands,
    chooseDeskRows: chooseDeskRows,
    seatingGridFromMarks: seatingGridFromMarks,
    rematchByClassNo: rematchByClassNo,
    applySeatMoves: applySeatMoves
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
    var commandLine = document.createElement('div');
    commandLine.className = 'command-line';
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
    commandLine.appendChild(input);
    commandLine.appendChild(sendBtn);
    var chartBtn = document.createElement('button');
    chartBtn.type = 'button';
    chartBtn.className = 'chart-chip';
    chartBtn.id = 'btnImportChart';
    chartBtn.textContent = 'Import chart';
    chartBtn.title = 'Read a seating-chart photo and move desks by class number';
    command.appendChild(commandLine);
    command.appendChild(chartBtn);

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
    mountChartImport();

    // Import chart reads blue class numbers on the device. The picture is
    // not uploaded. Tesseract is loaded only after the teacher picks a file.
    function mountChartImport() {
      var button = document.getElementById('btnImportChart');
      if (!button || button.getAttribute('data-chart-bound') === '1') return;
      button.setAttribute('data-chart-bound', '1');
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.className = 'chart-file';
      input.setAttribute('aria-hidden', 'true');
      input.tabIndex = -1;
      document.body.appendChild(input);
      var sheet = null;
      var token = 0;
      var ocrPromise = null;

      function closeSheet() {
        token += 1;
        button.disabled = false;
        if (sheet && sheet.parentNode) sheet.parentNode.removeChild(sheet);
        sheet = null;
      }

      function loadTesseract() {
        if (root.Tesseract && root.Tesseract.createWorker) return Promise.resolve(root.Tesseract);
        return new Promise(function (resolve, reject) {
          var s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
          s.async = true;
          s.onload = function () {
            if (root.Tesseract && root.Tesseract.createWorker) resolve(root.Tesseract);
            else reject(new Error('ocr'));
          };
          s.onerror = function () { reject(new Error('ocr')); };
          document.head.appendChild(s);
        });
      }

      function ocrWorker() {
        if (ocrPromise) return ocrPromise;
        ocrPromise = loadTesseract().then(function (T) {
          return T.createWorker('eng', 1, {});
        }).then(function (worker) {
          return worker.setParameters({
            tessedit_char_whitelist: '0123456789',
            tessedit_pageseg_mode: '7',
            user_defined_dpi: '300'
          }).then(function () { return worker; });
        }).catch(function (err) {
          ocrPromise = null;
          throw err;
        });
        return ocrPromise;
      }

      function wordsFromResult(data) {
        if (data && data.words && data.words.length) return data.words;
        var words = [];
        var seen = {};
        function add(word) {
          if (!word) return;
          var box = word.bbox || {};
          var key = String(word.text || '') + '@' + box.x0 + ',' + box.y0;
          if (seen[key]) return;
          seen[key] = true;
          words.push(word);
        }
        ((data && data.blocks) || []).forEach(function (block) {
          (block.paragraphs || []).forEach(function (para) {
            (para.lines || []).forEach(function (line) {
              (line.words || []).forEach(add);
            });
          });
        });
        return words;
      }

      function chartScale(width) {
        var w = width || 0;
        if (w < 2000) return Math.min(3, 4800 / Math.max(1, w));
        if (w > 4200) return 4200 / w;
        return 1;
      }

      function imageMask(img) {
        var scale = chartScale(img.naturalWidth || img.width);
        var w = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
        var h = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        var image = ctx.getImageData(0, 0, w, h);
        return api.blueMaskFromRGBA(image.data, w, h);
      }

      // A short row in a wide picture is easy to miss. Crop to the ink,
      // and add the crop's left edge back onto each word.
      function bandBounds(mask, width, y0, y1) {
        var minX = width;
        var maxX = -1;
        for (var y = y0; y < y1; y++) {
          var row = y * width;
          for (var x = 0; x < width; x++) {
            if (!mask[row + x]) continue;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
          }
        }
        if (maxX < minX) return null;
        var padX = 24;
        return {
          x0: Math.max(0, minX - padX),
          x1: Math.min(width, maxX + 1 + padX)
        };
      }

      function bandCanvas(mask, width, y0, y1, x0, x1) {
        var pad = 16;
        var bh = Math.max(1, y1 - y0);
        var bw = Math.max(1, x1 - x0);
        var canvas = document.createElement('canvas');
        canvas.width = bw + pad * 2;
        canvas.height = bh + pad * 2;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        var img = ctx.createImageData(bw, bh);
        var d = img.data;
        for (var y = 0; y < bh; y++) {
          var src = (y0 + y) * width + x0;
          for (var x = 0; x < bw; x++) {
            var v = mask[src + x] ? 0 : 255;
            var i = (y * bw + x) * 4;
            d[i] = d[i + 1] = d[i + 2] = v;
            d[i + 3] = 255;
          }
        }
        ctx.putImageData(img, pad, pad);
        return canvas;
      }

      function readChartImage(img) {
        var painted = imageMask(img);
        var bands = api.inkRowBands(painted.mask, painted.width, painted.height);
        return ocrWorker().then(function (worker) {
          var chain = Promise.resolve([]);
          bands.forEach(function (band) {
            chain = chain.then(function (acc) {
              var bounds = bandBounds(painted.mask, painted.width, band.y0, band.y1);
              if (!bounds) return acc;
              var canvas = bandCanvas(painted.mask, painted.width, band.y0, band.y1, bounds.x0, bounds.x1);
              return worker.recognize(canvas).then(function (res) {
                var items = [];
                wordsFromResult(res && res.data).forEach(function (word) {
                  var box = word.bbox || {};
                  var x0 = Number(box.x0);
                  var x1 = Number(box.x1);
                  if (!isFinite(x0) || !isFinite(x1)) return;
                  var conf = Number(word.confidence);
                  if (isFinite(conf) && conf > 0 && conf <= 1) conf = conf * 100;
                  items.push({
                    text: word.text,
                    x: bounds.x0 - 16 + (x0 + x1) / 2,
                    confidence: isFinite(conf) ? conf : 0
                  });
                });
                acc.push({ items: items, y: (band.y0 + band.y1) / 2 });
                return acc;
              });
            });
          });
          return chain;
        }).then(function (marked) {
          marked.sort(function (a, b) { return a.y - b.y; });
          return api.seatingGridFromMarks(marked);
        });
      }

      function ensureSheet() {
        if (sheet) return sheet;
        sheet = document.createElement('div');
        sheet.className = 'chart-import-sheet';
        sheet.setAttribute('role', 'dialog');
        sheet.setAttribute('aria-modal', 'true');
        sheet.setAttribute('aria-labelledby', 'chartImportTitle');
        var panel = document.createElement('div');
        panel.className = 'chart-import-panel';
        var bar = document.createElement('div');
        bar.className = 'chart-import-bar';
        var title = document.createElement('h3');
        title.id = 'chartImportTitle';
        title.textContent = 'Import chart';
        var close = document.createElement('button');
        close.type = 'button';
        close.className = 'chart-import-close';
        close.setAttribute('aria-label', 'Close');
        close.textContent = '\u2715';
        close.addEventListener('click', closeSheet);
        bar.appendChild(title);
        bar.appendChild(close);
        var body = document.createElement('div');
        body.className = 'chart-import-body';
        panel.appendChild(bar);
        panel.appendChild(body);
        sheet.appendChild(panel);
        sheet.addEventListener('click', function (e) {
          if (e.target === sheet) closeSheet();
        });
        document.body.appendChild(sheet);
        return sheet;
      }

      function setBody(node) {
        ensureSheet();
        var body = sheet.querySelector('.chart-import-body');
        body.textContent = '';
        body.appendChild(node);
      }

      function showMessage(text) {
        var wrap = document.createElement('div');
        wrap.className = 'chart-import-pad';
        var p = document.createElement('p');
        p.className = 'chart-import-lead';
        p.textContent = text;
        var row = document.createElement('div');
        row.className = 'chart-import-actions';
        var cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'chart-import-cancel';
        cancel.textContent = 'Close';
        cancel.addEventListener('click', closeSheet);
        row.appendChild(cancel);
        wrap.appendChild(p);
        wrap.appendChild(row);
        setBody(wrap);
        cancel.focus();
      }

      function showPreview(plan, read) {
        var boardAtBottom = true;
        function draw() {
          var result = api.rematchByClassNo(plan.students, read.grid, {
            frontAtTop: !!plan.frontAtTop,
            chartBoardAtBottom: boardAtBottom,
            layoutStyle: plan.layoutStyle,
            notes: read.notes || []
          });
          var wrap = document.createElement('div');
          wrap.className = 'chart-import-pad';
          var lead = document.createElement('p');
          lead.className = 'chart-import-lead';
          lead.textContent = 'Names, groups, and scores stay. Only seats move.';
          wrap.appendChild(lead);

          var orient = document.createElement('button');
          orient.type = 'button';
          orient.className = 'chart-import-orient';
          orient.textContent = boardAtBottom ? 'Board in photo: Bottom' : 'Board in photo: Top';
          orient.addEventListener('click', function () {
            boardAtBottom = !boardAtBottom;
            draw();
          });
          wrap.appendChild(orient);

          var where = document.createElement('p');
          where.className = 'chart-import-where';
          var floorFront = plan.frontAtTop ? 'top' : 'bottom';
          var photoFront = boardAtBottom ? 'bottom' : 'top';
          where.textContent = 'Floor front is at the ' + floorFront + '. The ' + photoFront + ' row of the photo sits at the front.';
          wrap.appendChild(where);

          var byNo = {};
          (plan.students || []).forEach(function (st) {
            var key = api.normaliseClassNo(st.classNo);
            if (key && !byNo[key]) byNo[key] = st;
          });
          var seenNo = {};
          var scroller = document.createElement('div');
          scroller.className = 'chart-import-scroll';
          var grid = document.createElement('div');
          grid.className = 'chart-preview-grid';
          var cols = result.gridCols || 1;
          grid.style.gridTemplateColumns = 'repeat(' + cols + ', minmax(4.5rem, 1fr))';
          // Photo order, top row first, so the grid can be checked against the picture.
          // The board toggle changes where those rows land, not this preview.
          (read.grid || []).forEach(function (row) {
            for (var c = 0; c < cols; c++) {
              var key = row && row[c] ? api.normaliseClassNo(row[c]) : '';
              var box = document.createElement('div');
              var status = 'empty';
              var label = '';
              if (key) {
                if (seenNo[key]) status = 'duplicate';
                else if (!byNo[key]) status = 'missing';
                else {
                  status = 'matched';
                  label = byNo[key].name || 'Student';
                }
                seenNo[key] = true;
              }
              box.className = 'chart-cell is-' + status;
              if (key) {
                var no = document.createElement('span');
                no.className = 'chart-cell-no';
                no.textContent = '#' + key;
                box.appendChild(no);
              }
              if (status === 'matched') label = label || 'Student';
              else if (status === 'missing') label = 'No student';
              else if (status === 'duplicate') label = 'Already used';
              if (label) {
                var name = document.createElement('span');
                name.className = 'chart-cell-name';
                name.textContent = label;
                box.appendChild(name);
              }
              grid.appendChild(box);
            }
          });
          scroller.appendChild(grid);
          wrap.appendChild(scroller);

          if (result.notes && result.notes.length) {
            var list = document.createElement('ul');
            list.className = 'chart-import-notes';
            result.notes.forEach(function (note) {
              var li = document.createElement('li');
              li.textContent = note;
              list.appendChild(li);
            });
            wrap.appendChild(list);
          }

          var summary = document.createElement('p');
          summary.className = 'chart-import-summary';
          var n = result.moves.length;
          summary.textContent = n + (n === 1 ? ' student will move.' : ' students will move.');
          wrap.appendChild(summary);

          var actions = document.createElement('div');
          actions.className = 'chart-import-actions';
          var apply = document.createElement('button');
          apply.type = 'button';
          apply.className = 'chart-import-apply';
          apply.textContent = 'Apply';
          apply.disabled = n === 0;
          apply.addEventListener('click', function () {
            var board = root.HcsLiveClassPlusBoard;
            var live = board && board.chartPlan ? board.chartPlan() : null;
            if (!live || live.id !== plan.id) {
              showMessage('The open plan changed. Import the chart again.');
              return;
            }
            if (!live.editMode) {
              showMessage('Turn Edit on, then import the chart again.');
              return;
            }
            var fresh = api.rematchByClassNo(live.students, read.grid, {
              frontAtTop: !!live.frontAtTop,
              chartBoardAtBottom: boardAtBottom,
              layoutStyle: live.layoutStyle,
              notes: read.notes || []
            });
            var applied = board.applyChart(fresh.moves, {
              gridRows: fresh.gridRows,
              gridCols: fresh.gridCols
            });
            if (!applied || applied.ok === false) {
              showMessage((applied && applied.message) || 'Couldn\'t move the desks.');
              return;
            }
            closeSheet();
          });
          var cancel = document.createElement('button');
          cancel.type = 'button';
          cancel.className = 'chart-import-cancel';
          cancel.textContent = 'Cancel';
          cancel.addEventListener('click', closeSheet);
          actions.appendChild(apply);
          actions.appendChild(cancel);
          wrap.appendChild(actions);
          setBody(wrap);
          if (!apply.disabled) apply.focus();
          else cancel.focus();
        }
        draw();
      }

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && sheet) closeSheet();
      });

      button.addEventListener('click', function () {
        var board = root.HcsLiveClassPlusBoard;
        var plan = board && board.chartPlan ? board.chartPlan() : null;
        if (!plan || !plan.students || !plan.students.length) {
          showMessage('Open a plan with class numbers first.');
          return;
        }
        if (!plan.editMode) {
          showMessage('Turn Edit on, then import the chart again.');
          return;
        }
        input.value = '';
        input.click();
      });

      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        if (!file) return;
        var board = root.HcsLiveClassPlusBoard;
        var plan = board && board.chartPlan ? board.chartPlan() : null;
        if (!plan || !plan.students || !plan.students.length) {
          showMessage('Open a plan with class numbers first.');
          return;
        }
        var my = ++token;
        button.disabled = true;
        showMessage('Reading class numbers\u2026');
        var img = new Image();
        var url = URL.createObjectURL(file);
        img.onload = function () {
          URL.revokeObjectURL(url);
          readChartImage(img).then(function (read) {
            if (my !== token) return;
            button.disabled = false;
            var count = 0;
            ((read && read.grid) || []).forEach(function (row) {
              row.forEach(function (cell) { if (cell) count += 1; });
            });
            if (!count) {
              showMessage('Couldn\'t read class numbers from that picture. Use a clear shot of the chart, with the numbers visible.');
              return;
            }
            var live = board.chartPlan ? board.chartPlan() : plan;
            showPreview(live && live.id === plan.id ? live : plan, read);
          }).catch(function () {
            if (my !== token) return;
            button.disabled = false;
            showMessage('The chart reader couldn\'t start. Check the connection and try the picture again.');
          });
        };
        img.onerror = function () {
          URL.revokeObjectURL(url);
          button.disabled = false;
          if (my !== token) return;
          showMessage('That file couldn\'t be opened as a picture.');
        };
        img.src = url;
      });
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
