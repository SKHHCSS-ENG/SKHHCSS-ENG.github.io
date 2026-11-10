/**
 * HCS Live Class — shared seating core.
 * Desk pitch, layout positions, overlap repair, tidy anchors, stage bounds,
 * and the floor zoom clamp. The original page binds these names and calls
 * them as before. Minimalist stays a skin of that page. Drive save/open
 * stays in studio-drive.js and drive-config.js.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HcsLiveCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STAGE_WIDTH = 1120;
  const STAGE_HEIGHT = 640;
  const DESK_W = 148;
  // Slot height matches the taller phone card (name row min-height 36px).
  // Desktop paints about 105px, so a row gap of 10px reads as about 20px of white there.
  const DESK_H = 115;
  const ROW_GAP_Y = 10;
  // Paired Desks, 4-Desk Pods, and Cluster by Group: tight left–right pack
  // inside the group, and a clearly wider left–right aisle between groups.
  // 8px within vs 36px between is enough to read as pairs / pods / clusters
  // rather than Exam Rows' even 16px grid. Vertical gutters stay compact:
  // 10px inside a group and between ordinary rows; 24px only between stacked
  // 4-desk pods and between cluster bands (one aisle, not a second moat).
  // Exam Rows do not use these gaps.
  const POD_INNER_GAP_X = 8;
  const POD_AISLE_GAP_X = 36;
  const POD_ROW_AISLE_Y = 24;
  const EXAM_COL_GAP_X = 16;
  // Framed FRONT OF ROOM pill is 32px tall and stays 10px from the facing desk row.
  // A fresh front-at-top layout also leaves 8px above the strip.
  const FRONT_LABEL_H = 32;
  const FRONT_EDGE = 8;
  const FRONT_ROW_GAP = 10;
  // Bump when desk size or step formula changes. Factory Quick Layout
  // buttons (Exam Rows, Paired Desks, 4-Desk Pods, Cluster by Group, Apply
  // Grid) always emit this pitch. Untouched factory seats reseed with it.
  // Saved boards (Save), dragged seats, and Load on a
  // class whose saved default was captured before this pitch keep the old
  // positions until the teacher reseeds with a Quick Layout button.
  const LAYOUT_PITCH_VERSION = 'desk-148x115-groupLr-8within-36aisle';
  const GRID_SIZE = 20;
  // Floor zoom. Minus and plus still step by 0.1. Minimum stays 35%.
  // Ceiling is 200% (was 125%).
  const ZOOM_MIN = 0.35;
  const ZOOM_MAX = 2;

  // Sort students by their current visual row & column on the canvas so custom seat swaps are preserved
  function getSpatiallyOrderedStudents(students) {
    if (!students || students.length === 0) return [];
    const copy = students.slice();
    const hasCoords = copy.every(function (s) {
      return typeof s.x === 'number' && typeof s.y === 'number';
    });
    if (!hasCoords) return copy;

    // Sort primarily by Y, then bucket into horizontal row bands (within 65px) and sort each row band by X
    copy.sort(function (a, b) { return a.y - b.y; });
    const rowBands = [];
    copy.forEach(function (st) {
      const lastBand = rowBands[rowBands.length - 1];
      if (!lastBand || Math.abs(st.y - lastBand.avgY) > 65) {
        rowBands.push({ avgY: st.y, items: [st] });
      } else {
        lastBand.items.push(st);
        lastBand.avgY = lastBand.items.reduce(function (sum, item) { return sum + item.y; }, 0) / lastBand.items.length;
      }
    });
    const ordered = [];
    rowBands.forEach(function (band) {
      band.items.sort(function (a, b) { return a.x - b.x; });
      band.items.forEach(function (item) { ordered.push(item); });
    });
    return ordered;
  }

  // Coordinate calculator for preset and custom grid layouts (adapts Exam Rows, Paired Desks, and 4-Desk Pods to custom Rows x Cols)
  function frontRowTopOffset(frontAtTop) {
    // Front at the top: leave a compact strip for FRONT OF ROOM, then the first desk row.
    // Front at the bottom: a small back-of-room margin. The strip sits just past the front row.
    return frontAtTop ? (FRONT_EDGE + FRONT_LABEL_H + FRONT_ROW_GAP) : 28;
  }

  // Where ＋ Desk should land: on the back row if it still has a gap,
  // otherwise one row further from FRONT OF ROOM. Back is the top of the
  // board when the front pill is at the bottom, and the bottom when the
  // pill is at the top. shift moves every existing desk toward the front
  // so a new back row is not placed above y=0.
  function planBackRowDesk(students, frontAtTop) {
    var stepY = DESK_H + ROW_GAP_Y;
    var stepX = DESK_W + EXAM_COL_GAP_X;
    var edge = frontRowTopOffset(false);
    var band = stepY * 0.45;
    var list = [];
    (students || []).forEach(function (st) {
      var x = Number(st && st.x);
      var y = Number(st && st.y);
      if (!isFinite(x) || !isFinite(y)) return;
      list.push({ x: x, y: y });
    });
    if (!list.length) {
      return {
        x: 28,
        y: frontAtTop ? frontRowTopOffset(true) : edge,
        shift: 0
      };
    }
    list.sort(function (a, b) { return a.y - b.y || a.x - b.x; });
    var rows = [];
    list.forEach(function (desk) {
      var row = rows.length ? rows[rows.length - 1] : null;
      if (!row || Math.abs(desk.y - row.anchor) > band) {
        rows.push({ anchor: desk.y, desks: [desk] });
      } else {
        row.desks.push(desk);
        var sum = 0;
        row.desks.forEach(function (d) { sum += d.y; });
        row.anchor = sum / row.desks.length;
      }
    });
    var back = frontAtTop ? rows[rows.length - 1] : rows[0];
    var widest = 0;
    rows.forEach(function (row) {
      if (row.desks.length > widest) widest = row.desks.length;
    });
    var backY = frontAtTop ? -Infinity : Infinity;
    var minX = Infinity;
    var maxX = -Infinity;
    back.desks.forEach(function (d) {
      if (d.x < minX) minX = d.x;
      if (d.x > maxX) maxX = d.x;
      if (frontAtTop) {
        if (d.y > backY) backY = d.y;
      } else if (d.y < backY) backY = d.y;
    });
    var pitch = stepX;
    if (back.desks.length >= 2) {
      var xs = back.desks.map(function (d) { return d.x; }).sort(function (a, b) { return a - b; });
      var gaps = [];
      for (var i = 1; i < xs.length; i++) {
        var gap = xs[i] - xs[i - 1];
        if (gap >= DESK_W * 0.5) gaps.push(gap);
      }
      if (gaps.length) {
        gaps.sort(function (a, b) { return a - b; });
        pitch = gaps[Math.floor((gaps.length - 1) / 2)];
      }
    }
    var x = minX;
    var y = backY;
    var shift = 0;
    if (back.desks.length < widest) {
      x = maxX + pitch;
    } else {
      y = frontAtTop ? (backY + stepY) : (backY - stepY);
    }
    // Front at the bottom: the back is y=0. Open the board instead of
    // parking the new seat above it.
    if (!frontAtTop && y < edge) {
      shift = edge - y;
      y = edge;
    }
    return { x: Math.round(x), y: Math.round(y), shift: shift };
  }

  // Left edge of column c inside a Paired Desks row.
  // Even counts are always 2 2 2… . Odd counts default to 2 2 … 1
  // (singleton on the right). singletonSide 'start' flips that to 1 2 … 2
  // (singleton on the left). The aisle after a singleton is the same wide
  // gap used between pairs. A one-column grid has nothing to flip.
  function pairColumnOffset(col, cols, singletonSide) {
    const c = Math.max(0, col | 0);
    const n = Math.max(1, cols | 0);
    const pitch = 2 * DESK_W + POD_INNER_GAP_X + POD_AISLE_GAP_X;
    const inner = DESK_W + POD_INNER_GAP_X;
    const lead = singletonSide === 'start' && (n % 2 === 1);
    if (lead) {
      if (c <= 0) return 0;
      const shifted = c - 1;
      const pairIdx = Math.floor(shifted / 2);
      const inPair = shifted % 2;
      return (DESK_W + POD_AISLE_GAP_X) + pairIdx * pitch + inPair * inner;
    }
    const pairIdx = Math.floor(c / 2);
    const inPair = c % 2;
    return pairIdx * pitch + inPair * inner;
  }

  // Next Pairs click when the column count is odd and greater than 1.
  // onFloor is 'start' or 'end' when the desks already sit on that arrangement.
  // Anything else (another layout, a dragged board, an even count) stays on
  // the classic singleton-right arrangement. Even counts ignore the side.
  function nextPairSingleton(onFloor, cols) {
    const n = cols | 0;
    if (n <= 1 || n % 2 === 0) return 'end';
    if (onFloor === 'start') return 'end';
    if (onFloor === 'end') return 'start';
    return 'end';
  }

  function computeLayoutPositions(count, layoutType, frontAtTop, students, groups, customCols, customRows, pairSingleton) {
    const positions = [];
    const topOffset = frontRowTopOffset(frontAtTop);
    const stepX = DESK_W + EXAM_COL_GAP_X;
    const stepY = DESK_H + ROW_GAP_Y; // card slot + tight vertical gutter
    const cols = Math.max(1, Math.min(12, customCols || (count > 30 ? 7 : 6)));

    if (layoutType === 'customGrid' || layoutType === 'rows') {
      // Exam Rows applied to (customRows x cols) grid: even spacing between every column and row
      const totalGridW = (cols - 1) * stepX + DESK_W;
      const effStageW = Math.max(STAGE_WIDTH, totalGridW + 64);
      const startX = Math.max(28, Math.round((effStageW - totalGridW) / 2));
      for (let i = 0; i < count; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        positions.push({
          x: startX + c * stepX,
          y: topOffset + r * stepY
        });
      }
    } else if (layoutType === 'pairs') {
      // Paired Desks applied to (customRows x cols) grid.
      // Tight gap inside each pair; a wider left–right aisle between pairs.
      // Rows stay on the compact ROW_GAP_Y gutter (pairs are not stacked pods).
      // Odd column counts can put the leftover column on the right (default)
      // or the left (pairSingleton === 'start').
      function getPairColOffset(c) {
        return pairColumnOffset(c, cols, pairSingleton);
      }
      const totalGridW = cols > 0 ? (getPairColOffset(cols - 1) + DESK_W) : DESK_W;
      const effStageW = Math.max(STAGE_WIDTH, totalGridW + 64);
      const startX = Math.max(28, Math.round((effStageW - totalGridW) / 2));

      for (let i = 0; i < count; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        positions.push({
          x: startX + getPairColOffset(c),
          y: topOffset + r * stepY
        });
      }
    } else if (layoutType === 'pods4') {
      // 4-Desk Pods applied to (customRows x cols) grid:
      // Every 2×2 block sits tight inside the pod. The left–right aisle
      // between pods is wider; the vertical break between pod rows is a
      // compact aisle so the block reads as four desks, not an even grid.
      const podInnerGapX = POD_INNER_GAP_X;
      const podAisleGapX = POD_AISLE_GAP_X;
      const podInnerGapY = ROW_GAP_Y;
      const podAisleGapY = POD_ROW_AISLE_Y;

      function getPodColOffset(c) {
        const podCol = Math.floor(c / 2);
        const inPodCol = c % 2;
        return podCol * (2 * DESK_W + podInnerGapX + podAisleGapX) + inPodCol * (DESK_W + podInnerGapX);
      }
      function getPodRowOffset(r) {
        const podRow = Math.floor(r / 2);
        const inPodRow = r % 2;
        return podRow * (2 * DESK_H + podInnerGapY + podAisleGapY) + inPodRow * (DESK_H + podInnerGapY);
      }

      const totalGridW = cols > 0 ? (getPodColOffset(cols - 1) + DESK_W) : DESK_W;
      const effStageW = Math.max(STAGE_WIDTH, totalGridW + 64);
      const startX = Math.max(28, Math.round((effStageW - totalGridW) / 2));

      for (let i = 0; i < count; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        positions.push({
          x: startX + getPodColOffset(c),
          y: topOffset + getPodRowOffset(r)
        });
      }
    } else if (layoutType === 'groupClusters' && students && groups) {
      // Cluster students by their assigned groupId with dynamic row heights so large teams never overlap
      const groupOrder = groups.map(function (g) { return g.id; }).concat(['']);
      const buckets = {};
      groupOrder.forEach(function (gid) { buckets[gid] = []; });
      students.forEach(function (st, idx) {
        const key = st.groupId && buckets[st.groupId] ? st.groupId : '';
        buckets[key].push(idx);
      });

      const activeGids = groupOrder.filter(function (gid) {
        return buckets[gid] && buckets[gid].length > 0;
      });

      const clusterStride = 2 * DESK_W + POD_INNER_GAP_X + POD_AISLE_GAP_X;
      const podOriginX = [28, 28 + clusterStride, 28 + 2 * clusterStride];
      const resultByStudentIdx = {};
      let currentBandY = topOffset;

      for (let b = 0; b < activeGids.length; b += 3) {
        const bandGids = activeGids.slice(b, b + 3);
        let maxRowsInBand = 1;
        bandGids.forEach(function (gid, colInBand) {
          const indices = buckets[gid];
          const rowsNeeded = Math.ceil(indices.length / 2);
          if (rowsNeeded > maxRowsInBand) maxRowsInBand = rowsNeeded;
          const baseX = podOriginX[colInBand];
          indices.forEach(function (sIdx, posInTeam) {
            const col = posInTeam % 2;
            const row = Math.floor(posInTeam / 2);
            resultByStudentIdx[sIdx] = {
              x: baseX + col * (DESK_W + POD_INNER_GAP_X),
              y: currentBandY + row * (DESK_H + ROW_GAP_Y)
            };
          });
        });
        // One compact aisle under the band. Do not add it on top of the
        // within-cluster row gutter (that double count was the old moat).
        currentBandY += (maxRowsInBand - 1) * (DESK_H + ROW_GAP_Y) + DESK_H + POD_ROW_AISLE_Y;
      }

      for (let i = 0; i < count; i++) {
        positions.push(resultByStudentIdx[i] || {
          x: 32 + (i % 6) * stepX,
          y: topOffset + Math.floor(i / 6) * stepY
        });
      }
    } else {
      // Fallback non-overlapping rows
      for (let i = 0; i < count; i++) {
        positions.push({
          x: 32 + (i % 6) * stepX,
          y: topOffset + Math.floor(i / 6) * stepY
        });
      }
    }
    return positions;
  }

  // Guarantee zero unintended box overlaps when loading or adding students
  function ensureNoOverlaps(students) {
    if (!students || students.length < 2) return;
    const minDx = DESK_W + 8;
    const minDy = DESK_H + 8;
    for (let pass = 0; pass < 4; pass++) {
      let moved = false;
      for (let i = 0; i < students.length; i++) {
        for (let j = i + 1; j < students.length; j++) {
          const a = students[i];
          const b = students[j];
          const dx = Math.abs(a.x - b.x);
          const dy = Math.abs(a.y - b.y);
          if (dx < minDx - 4 && dy < minDy - 4) {
            // Push lower/later desk down or right so they don't overlap
            if (dy >= dx * 0.5) {
              if (b.y >= a.y) {
                b.y = a.y + minDy;
              } else {
                a.y = b.y + minDy;
              }
            } else {
              if (b.x >= a.x) {
                b.x = a.x + minDx;
              } else {
                a.x = b.x + minDx;
              }
            }
            moved = true;
          }
        }
      }
      if (!moved) break;
    }
  }

  // Restore exact saved coords; only nudge desks NOT in the locked id set if they overlap locked ones
  function ensureNoOverlapsProtecting(students, lockedIds) {
    if (!students || students.length < 2) return;
    const locked = lockedIds || {};
    const minDx = DESK_W + 8;
    const minDy = DESK_H + 8;
    for (let pass = 0; pass < 4; pass++) {
      let moved = false;
      for (let i = 0; i < students.length; i++) {
        for (let j = i + 1; j < students.length; j++) {
          const a = students[i];
          const b = students[j];
          const dx = Math.abs(a.x - b.x);
          const dy = Math.abs(a.y - b.y);
          if (dx < minDx - 4 && dy < minDy - 4) {
            const aLock = !!locked[a.id];
            const bLock = !!locked[b.id];
            if (aLock && bLock) continue; // both exact — leave as saved
            var mover = (!aLock && bLock) ? a : ((!bLock && aLock) ? b : (b.y >= a.y ? b : a));
            var anchor = (mover === a) ? b : a;
            if (dy >= dx * 0.5) {
              mover.y = anchor.y + (mover.y >= anchor.y ? minDy : -minDy);
            } else {
              mover.x = anchor.x + (mover.x >= anchor.x ? minDx : -minDx);
            }
            moved = true;
          }
        }
      }
      if (!moved) break;
    }
  }

  function clampZoom(zoom) {
    const z = Math.round(Number(zoom) * 100) / 100;
    if (!isFinite(z)) return 1;
    if (z < ZOOM_MIN) return ZOOM_MIN;
    if (z > ZOOM_MAX) return ZOOM_MAX;
    return z;
  }

  // Compute dynamic stage bounds so large grids or tall layouts never clip
  function getDynamicStageBounds(cls) {
    let maxX = STAGE_WIDTH;
    let maxY = STAGE_HEIGHT;
    if (cls && cls.students) {
      cls.students.forEach(function (st) {
        if (st.x + DESK_W + 36 > maxX) maxX = st.x + DESK_W + 36;
        // Front at the bottom needs room for the FRONT OF ROOM strip just past the front row.
        // Front at the top only needs a small back-of-room margin under the last row.
        const endPad = cls.frontAtTop ? 28 : (FRONT_ROW_GAP + FRONT_LABEL_H + FRONT_EDGE);
        if (st.y + DESK_H + endPad > maxY) maxY = st.y + DESK_H + endPad;
      });
    }
    return { width: Math.ceil(maxX), height: Math.ceil(maxY) };
  }

  // Tight box around the desks and the FRONT OF ROOM strip.
  // Desk cards stay their fixed pixel size; this does not scale them.
  // The visible stage then grows up to the window around this box.
  function getContentStageBounds(cls) {
    let maxX = 240;
    let maxY = 160;
    let bottom = 0;
    if (cls && cls.students && cls.students.length) {
      cls.students.forEach(function (st) {
        const right = (Number(st.x) || 0) + DESK_W;
        const deskBottom = (Number(st.y) || 0) + DESK_H;
        if (right + 4 > maxX) maxX = right + 4;
        if (deskBottom > bottom) bottom = deskBottom;
      });
      if (cls.frontAtTop) {
        // Back of the room is the bottom edge. One more row, plus the
        // same 8px front-edge inset, so a desk can sit behind the last
        // row without ending on the stage border.
        const backFloor = bottom + DESK_H + ROW_GAP_Y + FRONT_EDGE;
        if (backFloor > maxY) maxY = backFloor;
      } else {
        // Front pill sits under the last row. Back room is opened above
        // the top row by planBackRowDesk, not by growing this bottom edge.
        bottom += FRONT_ROW_GAP + FRONT_LABEL_H;
        if (bottom + 12 > maxY) maxY = bottom + 12;
      }
    }
    return {
      width: Math.ceil(maxX),
      height: Math.ceil(maxY),
      bottom: Math.ceil(bottom)
    };
  }

  // Distance ratio into zoomFloorToward, which clamps at 35%–200%.
  // Not a second transform. A zero span keeps the zoom where it is.
  function floorPinchNextZoom(startZoom, startDist, dist) {
    if (!(startDist > 0) || !(dist > 0)) return startZoom;
    return startZoom * (dist / startDist);
  }

  // Column count on the class. Chrome (header, panels, floor size) is not an input.
  function seatingColumnCount(cls) {
    const n = cls && cls.students ? cls.students.length : 0;
    const fallback = n > 30 ? 7 : 6;
    const cols = parseInt(cls && cls.gridCols, 10);
    const used = (isFinite(cols) && cols >= 1) ? cols : fallback;
    return Math.max(1, Math.min(12, used));
  }

  // Horizontal slot of column c. Pairs and 4-desk pods share the left–right pitch
  // when the singleton sits on the right. A left singleton only changes pairs.
  // Exam rows use the even column step. This does not read the window.
  function columnSlotOffset(col, layoutType, cols, pairSingleton) {
    const c = Math.max(0, col);
    if (layoutType === 'pairs') {
      return pairColumnOffset(c, cols == null ? c + 1 : cols, pairSingleton);
    }
    if (layoutType === 'pods4') {
      const podCol = Math.floor(c / 2);
      const inPod = c % 2;
      return podCol * (2 * DESK_W + POD_INNER_GAP_X + POD_AISLE_GAP_X) + inPod * (DESK_W + POD_INNER_GAP_X);
    }
    return c * (DESK_W + EXAM_COL_GAP_X);
  }

  // The seating room is as wide as the column span. Six columns always
  // make the same width. Opening the header or the leaderboard does not.
  // The centre matches the layout origin those columns are drawn from.
  function columnRoomBox(cls) {
    const cols = seatingColumnCount(cls);
    const style = (cls && cls.layoutStyle) || 'rows';
    if (style === 'groupClusters' && cls && cls.students && cls.students.length) {
      const positions = computeLayoutPositions(cls.students.length, 'groupClusters', !!cls.frontAtTop, cls.students, cls.groups || [], cols, cls.gridRows);
      let minX = Infinity;
      let maxX = -Infinity;
      positions.forEach(function (p) {
        if (!p || !isFinite(p.x)) return;
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
      });
      if (isFinite(minX) && isFinite(maxX)) {
        const width = maxX - minX + DESK_W;
        return { cols: cols, width: width, center: minX + width / 2 };
      }
    }
    const width = columnSlotOffset(cols - 1, style, cols, cls && cls.pairSingleton) + DESK_W;
    const effStageW = Math.max(STAGE_WIDTH, width + 64);
    const origin = Math.max(28, Math.round((effStageW - width) / 2));
    return { cols: cols, width: width, center: origin + width / 2 };
  }

  // How much of a desk the drop covers. A light brush is not a swap.
  function deskOverlapArea(ax, ay, bx, by) {
    var left = Math.max(ax, bx);
    var right = Math.min(ax + DESK_W, bx + DESK_W);
    var top = Math.max(ay, by);
    var bottom = Math.min(ay + DESK_H, by + DESK_H);
    if (right <= left || bottom <= top) return 0;
    return (right - left) * (bottom - top);
  }

  // Dropping onto another seat exchanges the two slot positions exactly.
  // The student stays on their own desk. Only x/y swap, so both land flush.
  function findSeatSwapTarget(cls, student, x, y) {
    var best = null;
    var bestArea = 0;
    var minArea = DESK_W * DESK_H * 0.2;
    var cx = x + DESK_W / 2;
    var cy = y + DESK_H / 2;
    (cls.students || []).forEach(function (other) {
      if (!other || other.id === student.id) return;
      var area = deskOverlapArea(x, y, other.x, other.y);
      var centerInside = cx >= other.x && cx <= other.x + DESK_W && cy >= other.y && cy <= other.y + DESK_H;
      if (centerInside) area = Math.max(area, minArea);
      if (area > bestArea) {
        bestArea = area;
        best = other;
      }
    });
    if (!best || bestArea < minArea) return null;
    return best;
  }

  // Column/row anchor: the position in the cluster that the desks already share.
  function axisClusterAnchor(items) {
    var best = items[0];
    var bestSum = Infinity;
    var bestCount = -1;
    for (var i = 0; i < items.length; i++) {
      var candidate = items[i];
      var sum = 0;
      var count = 0;
      for (var j = 0; j < items.length; j++) {
        var dist = Math.abs(items[j] - candidate);
        sum += dist;
        if (dist < 0.5) count += 1;
      }
      if (sum < bestSum - 0.001 || (Math.abs(sum - bestSum) <= 0.001 && count > bestCount)) {
        best = candidate;
        bestSum = sum;
        bestCount = count;
      }
    }
    return best;
  }

  // Cluster nearby X or Y values without joining real columns or rows.
  // maxSpan stays under half the tightest pitch, so pairs and singles stay.
  function layoutAxisAnchors(values, maxSpan) {
    var clusters = [];
    values.forEach(function (v) {
      if (typeof v !== 'number' || !isFinite(v)) return;
      clusters.push([v]);
    });
    if (!clusters.length) return [];
    function canMerge(a, b) {
      var min = Infinity;
      var max = -Infinity;
      a.concat(b).forEach(function (v) {
        if (v < min) min = v;
        if (v > max) max = v;
      });
      if (max - min > maxSpan) return false;
      return Math.abs(axisClusterAnchor(a) - axisClusterAnchor(b)) <= maxSpan;
    }
    var guard = clusters.length * clusters.length + 2;
    while (clusters.length > 1 && guard > 0) {
      guard -= 1;
      var bestI = -1;
      var bestJ = -1;
      var bestDist = Infinity;
      for (var i = 0; i < clusters.length; i++) {
        for (var j = i + 1; j < clusters.length; j++) {
          if (!canMerge(clusters[i], clusters[j])) continue;
          var dist = Math.abs(axisClusterAnchor(clusters[i]) - axisClusterAnchor(clusters[j]));
          if (dist < bestDist - 0.001) {
            bestDist = dist;
            bestI = i;
            bestJ = j;
          }
        }
      }
      if (bestI < 0) break;
      clusters[bestI] = clusters[bestI].concat(clusters[bestJ]);
      clusters.splice(bestJ, 1);
    }
    return clusters.map(axisClusterAnchor).sort(function (a, b) { return a - b; });
  }

  function nearestLayoutAnchor(value, anchors) {
    var best = anchors[0];
    var bestDist = Math.abs(value - best);
    for (var i = 1; i < anchors.length; i++) {
      var dist = Math.abs(value - anchors[i]);
      if (dist < bestDist) {
        best = anchors[i];
        bestDist = dist;
      }
    }
    return best;
  }

  return {
    STAGE_WIDTH: STAGE_WIDTH,
    STAGE_HEIGHT: STAGE_HEIGHT,
    DESK_W: DESK_W,
    DESK_H: DESK_H,
    ROW_GAP_Y: ROW_GAP_Y,
    POD_INNER_GAP_X: POD_INNER_GAP_X,
    POD_AISLE_GAP_X: POD_AISLE_GAP_X,
    POD_ROW_AISLE_Y: POD_ROW_AISLE_Y,
    EXAM_COL_GAP_X: EXAM_COL_GAP_X,
    FRONT_LABEL_H: FRONT_LABEL_H,
    FRONT_EDGE: FRONT_EDGE,
    FRONT_ROW_GAP: FRONT_ROW_GAP,
    LAYOUT_PITCH_VERSION: LAYOUT_PITCH_VERSION,
    GRID_SIZE: GRID_SIZE,
    ZOOM_MIN: ZOOM_MIN,
    ZOOM_MAX: ZOOM_MAX,
    getSpatiallyOrderedStudents: getSpatiallyOrderedStudents,
    frontRowTopOffset: frontRowTopOffset,
    planBackRowDesk: planBackRowDesk,
    computeLayoutPositions: computeLayoutPositions,
    pairColumnOffset: pairColumnOffset,
    nextPairSingleton: nextPairSingleton,
    ensureNoOverlaps: ensureNoOverlaps,
    ensureNoOverlapsProtecting: ensureNoOverlapsProtecting,
    clampZoom: clampZoom,
    getDynamicStageBounds: getDynamicStageBounds,
    getContentStageBounds: getContentStageBounds,
    floorPinchNextZoom: floorPinchNextZoom,
    seatingColumnCount: seatingColumnCount,
    columnSlotOffset: columnSlotOffset,
    columnRoomBox: columnRoomBox,
    deskOverlapArea: deskOverlapArea,
    findSeatSwapTarget: findSeatSwapTarget,
    axisClusterAnchor: axisClusterAnchor,
    layoutAxisAnchors: layoutAxisAnchors,
    nearestLayoutAnchor: nearestLayoutAnchor
  };
});
