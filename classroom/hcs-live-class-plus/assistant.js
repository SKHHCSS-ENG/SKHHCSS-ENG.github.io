/**
 * HCS Live Class + assistant.
 * Nest: DEFAULT_WORKER_URL is the only assistant host. Do not point it at
 * deepseek-explain, say-it-louder, or ces-softspeak.
 * The ball keeps the viewport spot from the last drag (or the default
 * corner). Opening the strip does not move that circle: the Mesh mist
 * panel sits beside it and flips to the side, then up or down, that fits.
 * Under the text box, Ask, Dict, Command, and Import share one row.
 * Dict posts { text, mode: "gloss" } and does not send or store Ask history.
 * A Dict card is five lines, in order: the word, the Chinese meaning,
 * the part of speech, the English meaning, and a sample sentence.
 * Ask posts { text, mode: "ask" } and recent Ask turns in history.
 * Ask stays in short points. Typing “what does X mean” while Ask is
 * selected still posts mode ask.
 * Command runs the line on the page. Import opens the chart photo flow.
 * Neither of those sends the Ask thread. The Worker host stays live-class-plus.
 * Floor scroll does not move the ball. A drag still settles the ball
 * clear of desk name chips and the floor zoom bar, then remembers that spot.
 * Ask and Gloss stay in the small strip. Show class copies the current
 * reply onto a centre board for the room. A drag on that board highlights
 * a stretch; another drag adds another highlight. A short click clears
 * them. Closing the board, or a new Show class reply, clears them too.
 * Nothing is saved. The X, Esc, or a tap outside returns to that strip.
 * Cache stamp: 20261110e.
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
  var BALL = 44;
  var ACTIONS = {
    hide_names: 'Hide names',
    show_names: 'Show names',
    zoom_in: 'Zoom in',
    zoom_out: 'Zoom out',
    zoom_reset: 'Reset zoom',
    random_pick: 'Pick a student',
    open_seating: 'Open Seating',
    open_scores: 'Open Scores',
    tidy_snap: 'Tidy desks',
    layout_pairs: 'Paired desks',
    layout_rows: 'Exam rows',
    layout_pods: '4-desk pods',
    layout_groups: 'Group clusters',
    random_group: 'Pick a group',
    all_plus: 'All +1',
    all_minus: 'All minus',
    group_plus: 'Group +',
    group_minus: 'Group minus'
  };

  // Exact Command lines. Longer phrases are matched in parseCommand.
  var COMMANDS = {
    'hide names': 'hide_names',
    'show names': 'show_names',
    'names on': 'show_names',
    'names off': 'hide_names',
    'zoom in': 'zoom_in',
    'zoom out': 'zoom_out',
    'zoom +': 'zoom_in',
    'zoom -': 'zoom_out',
    'fit': 'zoom_reset',
    'zoom fit': 'zoom_reset',
    'reset zoom': 'zoom_reset',
    'zoom reset': 'zoom_reset',
    'pick': 'random_pick',
    'random': 'random_pick',
    'random pick': 'random_pick',
    'pick student': 'random_pick',
    'random student': 'random_pick',
    'draw': 'random_pick',
    'draw student': 'random_pick',
    'pick group': 'random_group',
    'random group': 'random_group',
    'draw group': 'random_group',
    'picker': 'open_picker',
    'open picker': 'open_picker',
    'close picker': 'close_picker',
    'reset pool': 'reset_pool',
    'seating': 'open_seating',
    'open seating': 'open_seating',
    'scores': 'open_scores',
    'open scores': 'open_scores',
    'tidy': 'tidy_snap',
    'tidy desks': 'tidy_snap',
    'pairs': 'layout_pairs',
    'pair': 'layout_pairs',
    'pair work': 'layout_pairs',
    'paired': 'layout_pairs',
    'paired desks': 'layout_pairs',
    'exam': 'layout_rows',
    'rows': 'layout_rows',
    'exam rows': 'layout_rows',
    'pods': 'layout_pods',
    '4-desk': 'layout_pods',
    '4 desk': 'layout_pods',
    '4-desk pods': 'layout_pods',
    'pods4': 'layout_pods',
    'groups': 'layout_groups',
    'cluster': 'layout_groups',
    'clusters': 'layout_groups',
    'group clusters': 'layout_groups',
    'gather groups': 'layout_groups',
    'gather desks': 'layout_groups',
    'podium': 'open_podium',
    'open podium': 'open_podium',
    'close podium': 'close_podium',
    'timer': 'open_timer',
    'open timer': 'open_timer',
    'close timer': 'close_timer',
    'start timer': 'timer_start',
    'timer start': 'timer_start',
    'pause timer': 'timer_pause',
    'timer pause': 'timer_pause',
    'stop timer': 'timer_pause',
    'reset timer': 'timer_reset',
    'timer reset': 'timer_reset',
    '+30': 'timer_add30',
    'timer +30': 'timer_add30',
    '+30 sec': 'timer_add30',
    '+30s': 'timer_add30',
    'edit on': 'edit_on',
    'edit off': 'edit_off',
    'sound on': 'sound_on',
    'sound off': 'sound_off',
    'mute': 'sound_off',
    'unmute': 'sound_on',
    'undo': 'undo',
    'redo': 'redo',
    'flip': 'flip_room',
    'flip room': 'flip_room',
    'front top': 'front_top',
    'front bottom': 'front_bottom',
    'snap on': 'snap_on',
    'snap off': 'snap_off',
    'tools on': 'tools_on',
    'tools off': 'tools_off',
    'show header': 'header_show',
    'hide header': 'header_hide',
    'collapse header': 'header_hide',
    'fullscreen': 'fullscreen',
    'full screen': 'fullscreen',
    'exit fullscreen': 'fullscreen_exit',
    'show panels': 'panels_show',
    'hide panels': 'panels_hide',
    'side panels': 'panels_toggle',
    'export': 'export_csv',
    'export csv': 'export_csv',
    'csv': 'export_csv',
    'backup': 'backup_json',
    'classes': 'open_classes',
    'roster': 'open_classes',
    'open classes': 'open_classes',
    'close classes': 'close_classes',
    'manage groups': 'open_group_modal',
    'edit groups': 'open_group_modal',
    'open groups': 'open_group_modal',
    'close groups': 'close_groups',
    'brush': 'brush_on',
    'assign groups': 'brush_on',
    'paint groups': 'brush_on',
    'brush off': 'brush_off',
    'done assigning': 'brush_off',
    'clear groups': 'clear_groups',
    'distribute groups': 'distribute_groups',
    'share groups': 'distribute_groups',
    'even groups': 'distribute_groups',
    'reset scores': 'reset_scores',
    'save online': 'save_online',
    'open plan': 'open_plan',
    'add desk': 'add_desk',
    'add student': 'add_desk',
    'add group': 'add_group',
    'add team': 'add_group',
    'save layout': 'save_layout',
    'load layout': 'load_layout',
    'skin default': 'skin_default',
    'default skin': 'skin_default',
    'skin minimalist': 'skin_minimalist',
    'minimalist': 'skin_minimalist',
    'skin spark': 'skin_spark',
    'spark': 'skin_spark',
    'individual': 'mode_individual',
    'individual work': 'mode_individual',
    'individual mode': 'mode_individual',
    'group work': 'mode_group',
    'group mode': 'mode_group',
    'students tab': 'lb_students',
    'leaderboard': 'lb_students',
    'groups tab': 'lb_groups',
    'history': 'lb_feed',
    'feed': 'lb_feed',
    'scoreboard': 'scoreboard_toggle',
    'team scoreboard': 'scoreboard_toggle',
    'show scoreboard': 'scoreboard_show',
    'hide scoreboard': 'scoreboard_hide',
    'help': 'help',
    'commands': 'help',
    '?': 'help'
  };

  function commandLine(raw) {
    var text = String(raw || '').replace(/[\u2212\u2013\u2014]/g, '-').replace(/\s+/g, ' ').trim();
    text = text.replace(/[.!?]+$/g, '').trim();
    text = text.replace(/\s+(please|now|thanks)$/i, '').trim();
    return text;
  }

  function commandKey(text) {
    return String(text || '').toLowerCase()
      .replace(/\bplus\s+one\b/g, '+1')
      .replace(/\bminus\s+one\b/g, '-1')
      .replace(/\bplus\s+/g, '+')
      .replace(/\bminus\s+/g, '-');
  }

  function scoreSlots(amount, who) {
    var n = parseInt(amount, 10);
    if (!isFinite(n) || n < 1) n = 1;
    return { amount: n, student: who ? String(who).trim() : '' };
  }

  function groupSlots(amount, name) {
    var n = parseInt(amount, 10);
    if (!isFinite(n) || n < 1) n = 1;
    return { amount: n, group: name ? String(name).trim() : '' };
  }

  // Short Command lines. Ask still goes to the Worker; this never calls it.
  function parseCommand(raw) {
    var text = commandLine(raw);
    if (!text) return null;
    var key = commandKey(text);
    if (COMMANDS[key]) return { action: COMMANDS[key], slots: {} };

    var m;
    m = key.match(/^(?:all|everyone|class|whole class)\s+\+(\d{1,2})$/);
    if (m) return { action: 'all_plus', slots: { amount: parseInt(m[1], 10) } };
    m = key.match(/^(?:all|everyone|class|whole class)\s+-(\d{1,2})$/);
    if (m) return { action: 'all_minus', slots: { amount: parseInt(m[1], 10) } };

    m = key.match(/^group\s+\+(\d{1,2})(?:\s+(.+))?$/);
    if (m) return { action: 'group_plus', slots: groupSlots(m[1], m[2]) };
    m = key.match(/^group\s+-(\d{1,2})(?:\s+(.+))?$/);
    if (m) return { action: 'group_minus', slots: groupSlots(m[1], m[2]) };
    m = key.match(/^\+(\d{1,2})\s+group(?:\s+(.+))?$/);
    if (m) return { action: 'group_plus', slots: groupSlots(m[1], m[2]) };
    m = key.match(/^-(\d{1,2})\s+group(?:\s+(.+))?$/);
    if (m) return { action: 'group_minus', slots: groupSlots(m[1], m[2]) };
    m = key.match(/^(.+?)\s+group\s+\+(\d{1,2})$/);
    if (m) return { action: 'group_plus', slots: groupSlots(m[2], m[1]) };
    m = key.match(/^(.+?)\s+group\s+-(\d{1,2})$/);
    if (m) return { action: 'group_minus', slots: groupSlots(m[2], m[1]) };

    m = key.match(/^score\s+\+(\d{1,2})(?:\s+(.+))?$/);
    if (m) return { action: 'score_plus', slots: scoreSlots(m[1], m[2]) };
    m = key.match(/^score\s+-(\d{1,2})(?:\s+(.+))?$/);
    if (m) return { action: 'score_minus', slots: scoreSlots(m[1], m[2]) };
    m = key.match(/^\+(\d{1,2})(?:\s+(.+))?$/);
    if (m) return { action: 'score_plus', slots: scoreSlots(m[1], m[2]) };
    m = key.match(/^-(\d{1,2})(?:\s+(.+))?$/);
    if (m) return { action: 'score_minus', slots: scoreSlots(m[1], m[2]) };
    m = key.match(/^(.+?)\s+\+(\d{1,2})$/);
    if (m) return { action: 'score_plus', slots: scoreSlots(m[2], m[1]) };
    m = key.match(/^(.+?)\s+-(\d{1,2})$/);
    if (m) return { action: 'score_minus', slots: scoreSlots(m[2], m[1]) };

    m = key.match(/^(?:timer|set timer)\s+(\d{1,2}):(\d{2})$/);
    if (m) {
      return { action: 'timer_set', slots: { seconds: parseInt(m[1], 10) * 60 + parseInt(m[2], 10) } };
    }
    m = key.match(/^(?:timer|set timer)\s+(\d{1,3})\s*(m|min|mins|minute|minutes|s|sec|secs|second|seconds)?$/);
    if (m) {
      var n = parseInt(m[1], 10);
      var unit = m[2] || 'm';
      return { action: 'timer_set', slots: { seconds: unit.charAt(0) === 's' ? n : n * 60 } };
    }

    m = key.match(/^(?:grid\s+)?(\d{1,2})\s*(?:x|\u00d7|by)\s*(\d{1,2})(?:\s*grid)?$/);
    if (m) return { action: 'apply_grid', slots: { rows: parseInt(m[1], 10), cols: parseInt(m[2], 10) } };

    return null;
  }

  function commandHelp() {
    return [
      '+1 name, -1, +1 07, all +1, group +1 Lions',
      'pick, pick group, pairs, exam, pods, groups, tidy',
      'podium, timer, timer 3m, start timer, +30, fit',
      'hide names, edit on, undo, individual, group work, spark'
    ].join('\n');
  }

  function commandCatalog() {
    var seen = { help: true };
    var list = [];
    function add(action) {
      if (!action || seen[action]) return;
      seen[action] = true;
      list.push(action);
    }
    Object.keys(COMMANDS).forEach(function (k) { add(COMMANDS[k]); });
    [
      'score_plus', 'score_minus', 'all_plus', 'all_minus',
      'group_plus', 'group_minus', 'timer_set', 'apply_grid'
    ].forEach(add);
    return list;
  }

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
   * Lay the panel beside the ball. The ball rect stays put.
   * The side with more room gets the strip; width shrinks to that room
   * when the preferred width (220 / 72vw) does not fit.
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

  // One scannable point per line. Blank lines drop out. A bullet or
  // numbered marker stays, so a list is not folded into one paragraph.
  function pointLines(text) {
    var raw = plainActionNames(typeof text === 'string' ? text : '');
    if (!raw) return [];
    var out = [];
    raw.split(/\r?\n/).forEach(function (part) {
      var line = part.replace(/[ \t]+/g, ' ').trim();
      if (line) out.push(line);
    });
    return out;
  }

  function oneLine(text) {
    return plainActionNames(typeof text === 'string' ? text : '').replace(/\s+/g, ' ').trim();
  }

  // A part-of-speech label, not a definition. An unknown tag stays in the
  // English line rather than being guessed into its own row.
  function looksLikePos(text) {
    var s = String(text || '').trim();
    if (!s || s.length > 48) return false;
    if (/[.!?。！？]/.test(s)) return false;
    if (s.split(/\s+/).length > 4) return false;
    return /^(?:(?:adj|adv|n|v|prep|conj|pron|det|art|interj|aux)\.?|(?:adjectives?|adverbs?|nouns?|verbs?|pronouns?|prepositions?|conjunctions?|interjections?|determiners?|articles?|phrases?|idioms?|phrasal verbs?|noun phrases?|verb phrases?|auxiliaries|auxiliary verbs?|modal verbs?|modals?|countable nouns?|uncountable nouns?|transitive verbs?|intransitive verbs?|linking verbs?|gerunds?|participles?|infinitives?))(?:\s|$)/i.test(s);
  }

  function looksLikeSample(text) {
    var s = String(text || '').trim();
    if (!s) return false;
    if (/[.!?。！？]["'”’)\]]*\s*$/.test(s)) return true;
    var words = s.split(/\s+/);
    return words.length >= 5 && /^[A-Z"“']/.test(s);
  }

  // Older gloss_en is one string: "adjective · sense · example sentence".
  // Three middle-dot parts are that card. Two parts split only when the
  // first is a part of speech or the last is clearly a sentence.
  // Otherwise the whole string stays the English meaning.
  function splitLegacyGloss(raw) {
    var text = plainActionNames(typeof raw === 'string' ? raw : '').trim();
    if (!text) return { pos: '', en: '', sample: '', used: false };
    var dot = /[·•・]/.test(text);
    var parts = (dot ? text.split(/\s*[·•・]\s*/) : text.split(/\r?\n/))
      .map(function (part) { return part.replace(/[ \t]+/g, ' ').trim(); })
      .filter(Boolean);
    if (dot && parts.length === 3) {
      return { pos: oneLine(parts[0]), en: oneLine(parts[1]), sample: oneLine(parts[2]), used: true };
    }
    if (!dot && parts.length < 2) {
      return { pos: '', en: oneLine(text), sample: '', used: false };
    }
    var pos = '';
    var sample = '';
    var mid = parts.slice();
    if (mid.length >= 2 && looksLikePos(mid[0])) pos = oneLine(mid.shift());
    if (mid.length >= 2 && looksLikeSample(mid[mid.length - 1])) sample = oneLine(mid.pop());
    if (!pos && !sample) return { pos: '', en: oneLine(text), sample: '', used: false };
    return {
      pos: pos,
      en: mid.join(' ').replace(/\s+/g, ' ').trim(),
      sample: sample,
      used: true
    };
  }

  // Dict / kind gloss only. Five slots, always, in this order. Empty slots
  // stay empty — a missing sense is not invented. Ask returns null.
  function glossCard(data, query) {
    if (!data || typeof data !== 'object') return null;
    var kind = String(data.kind || data.type || '').trim();
    if (kind && kind !== 'gloss') return null;
    var zh = oneLine(data.gloss_zh);
    var explicitPos = oneLine(typeof data.pos === 'string' && data.pos.trim() ? data.pos : data.part_of_speech);
    var explicitSample = oneLine(typeof data.example === 'string' && data.example.trim() ? data.example : data.sample);
    var split = splitLegacyGloss(data.gloss_en);
    var pos = explicitPos || split.pos;
    var sample = explicitSample || split.sample;
    var en = split.used ? split.en : oneLine(data.gloss_en);
    var hasField = !!(zh || explicitPos || explicitSample || (typeof data.gloss_en === 'string' && data.gloss_en.trim()));
    if (!hasField) return null;
    var word = oneLine(data.word) || oneLine(data.headword) || classWord(data.reply) || classWord(query);
    return { word: word, zh: zh, pos: pos, en: en, sample: sample };
  }

  function glossLines(card) {
    if (!card) return [];
    return [card.word || '', card.zh || '', card.pos || '', card.en || '', card.sample || ''];
  }

  function presentReply(data, query) {
    if (!data || typeof data !== 'object') return '';
    var card = glossCard(data, query);
    if (card) return glossLines(card).join('\n');
    return pointLines(data.reply).join('\n');
  }

  // A looked-up word or short phrase. Questions and sentences stay in the body.
  function classWord(text) {
    var line = plainActionNames(String(text || '')).replace(/\s+/g, ' ').trim();
    if (!line || line.length > 32) return '';
    if (/[.!?。！？]/.test(line)) return '';
    if (line.split(' ').length > 4) return '';
    return line;
  }

  // Head is the word. A Dict card keeps four lines under it (Chinese,
  // part of speech, English meaning, sample), blanks included. An Ask
  // reply stays one point per line.
  function classBoardParts(payload, query) {
    var data = payload && typeof payload === 'object' ? payload : {};
    var card = glossCard(data, query);
    if (card) {
      return {
        head: card.word,
        lines: [card.zh, card.pos, card.en, card.sample],
        gloss: true
      };
    }
    var replyRaw = plainActionNames(typeof data.reply === 'string' ? data.reply : '').trim();
    var reply = replyRaw.replace(/\s+/g, ' ').trim();
    var head = classWord(query);
    if (!head && reply) head = classWord(reply);
    var lines = [];
    pointLines(replyRaw).forEach(function (line) {
      if (line && line !== head && lines.indexOf(line) < 0) lines.push(line);
    });
    if (!head && !lines.length) return null;
    return { head: head, lines: lines, gloss: false };
  }

  // A drag farther than this is a highlight. A shorter press is a click
  // and clears. Same 8px radius as the ball tap. Marks are not stored.
  var CLASS_MARK_TAP = 8;

  function classHighlightGesture(state, event) {
    var marks = [];
    if (state && Array.isArray(state.marks)) {
      state.marks.forEach(function (mark) {
        if (!mark) return;
        marks.push({ start: mark.start, end: mark.end, text: mark.text });
      });
    }
    var type = event && event.type;
    if (type === 'close' || type === 'open') return { marks: [], effect: 'clear' };
    if (type !== 'up') return { marks: marks, effect: 'ignore' };
    if (event.chrome) return { marks: marks, effect: 'ignore' };
    var distance = Number(event.distance);
    if (!isFinite(distance) || distance < 0) distance = 0;
    if (distance <= CLASS_MARK_TAP) return { marks: [], effect: 'clear' };
    var selection = event.selection;
    var text = selection && typeof selection.text === 'string' ? selection.text : '';
    var start = selection ? Number(selection.start) : NaN;
    var end = selection ? Number(selection.end) : NaN;
    if (!text || !isFinite(start) || !isFinite(end) || end <= start) {
      return { marks: marks, effect: 'ignore' };
    }
    var next = { start: start, end: end, text: text };
    var dup = marks.some(function (mark) {
      return mark.start === next.start && mark.end === next.end;
    });
    if (!dup) marks.push(next);
    return { marks: marks, effect: 'add' };
  }

  function canShowClass(data) {
    if (!data || typeof data !== 'object') return false;
    var kind = String(data.kind || data.type || '').trim();
    if (kind !== 'ask' && kind !== 'gloss') return false;
    return !!classBoardParts(data, '');
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

  function payloadText(data, key) {
    if (!data || typeof data[key] !== 'string') return '';
    return data[key].trim();
  }

  function readPayload(data) {
    var kind = data && (data.kind || data.type) ? String(data.kind || data.type).trim() : '';
    var slots = data && data.slots && typeof data.slots === 'object' ? data.slots : {};
    return {
      kind: kind,
      reply: payloadText(data, 'reply'),
      word: payloadText(data, 'word') || payloadText(data, 'headword'),
      headword: payloadText(data, 'headword'),
      gloss_zh: payloadText(data, 'gloss_zh'),
      pos: payloadText(data, 'pos') || payloadText(data, 'part_of_speech'),
      part_of_speech: payloadText(data, 'part_of_speech'),
      gloss_en: payloadText(data, 'gloss_en'),
      example: payloadText(data, 'example') || payloadText(data, 'sample'),
      sample: payloadText(data, 'sample'),
      action: payloadText(data, 'action'),
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

  // Prior Ask lines sent with the new one. Eight keeps a short thread
  // (a few questions and replies) without dragging in the whole lesson.
  // A quiet gap this long starts a fresh Ask. Closing the strip, or
  // leaving Ask for Command or Import, also drops the thread.
  // Dict does not read or write this thread.
  var ASK_HISTORY_CAP = 8;
  var ASK_HISTORY_GAP_MS = 30 * 60 * 1000;

  function turnText(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  // text is the line being sent. history is earlier Ask turns only.
  // A trailing user turn that repeats text is dropped so the line is
  // not posted twice. Missing history stays off the body.
  function askRequestBody(text, history) {
    var line = turnText(text);
    var body = { text: line, mode: 'ask' };
    var turns = [];
    var list = Array.isArray(history) ? history : [];
    for (var i = 0; i < list.length; i++) {
      var turn = list[i];
      if (!turn) continue;
      var role = turn.role === 'user' || turn.role === 'assistant' ? turn.role : '';
      var said = turnText(turn.text);
      if (!role || !said) continue;
      turns.push({ role: role, text: said });
    }
    if (turns.length && turns[turns.length - 1].role === 'user' && turns[turns.length - 1].text === line) {
      turns.pop();
    }
    if (turns.length > ASK_HISTORY_CAP) turns = turns.slice(turns.length - ASK_HISTORY_CAP);
    if (turns.length && turns[0].role === 'assistant') turns.shift();
    if (turns.length) body.history = turns;
    return body;
  }

  // Word or phrase lookup. No history key, even when an Ask thread is open.
  function glossRequestBody(text) {
    return { text: turnText(text), mode: 'gloss' };
  }

  // clock is optional. Tests pass a function; the page uses Date.now.
  function createAskThread(clock) {
    var turns = [];
    var at = null;
    function now() {
      return typeof clock === 'function' ? clock() : Date.now();
    }
    function expire(t) {
      if (at != null && t - at > ASK_HISTORY_GAP_MS) {
        turns = [];
        at = null;
      }
    }
    function trim() {
      if (turns.length > ASK_HISTORY_CAP) turns = turns.slice(turns.length - ASK_HISTORY_CAP);
      if (turns.length && turns[0].role === 'assistant') turns.shift();
    }
    return {
      reset: function () {
        turns = [];
        at = null;
      },
      snapshot: function () {
        expire(now());
        return turns.slice();
      },
      remember: function (userText, assistantText) {
        var user = turnText(userText);
        var assistant = turnText(assistantText);
        if (!user || !assistant) return;
        var t = now();
        expire(t);
        turns.push({ role: 'user', text: user });
        turns.push({ role: 'assistant', text: assistant });
        trim();
        at = t;
      }
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
    glossCard: glossCard,
    glossLines: glossLines,
    classBoardParts: classBoardParts,
    canShowClass: canShowClass,
    classHighlightGesture: classHighlightGesture,
    CLASS_MARK_TAP: CLASS_MARK_TAP,
    plainActionNames: plainActionNames,
    readPayload: readPayload,
    parseCommand: parseCommand,
    commandHelp: commandHelp,
    commandCatalog: commandCatalog,
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
    applySeatMoves: applySeatMoves,
    ASK_HISTORY_CAP: ASK_HISTORY_CAP,
    ASK_HISTORY_GAP_MS: ASK_HISTORY_GAP_MS,
    askRequestBody: askRequestBody,
    glossRequestBody: glossRequestBody,
    createAskThread: createAskThread
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
    var classSheet = null;
    var classPayload = null;
    var classQuery = '';
    var pendingQuery = '';
    var boardMarks = [];
    var boardPointer = null;

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
    input.placeholder = 'Ask a question\u2026';
    input.setAttribute('aria-label', 'Ask a question');
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.enterKeyHint = 'send';
    var sendBtn = document.createElement('button');
    sendBtn.type = 'submit';
    sendBtn.className = 'go';
    sendBtn.textContent = 'SEND';
    commandLine.appendChild(input);
    commandLine.appendChild(sendBtn);
    var mode = 'ask';
    var askThread = api.createAskThread();
    var modeRow = document.createElement('div');
    modeRow.className = 'mode-row';
    modeRow.setAttribute('role', 'radiogroup');
    modeRow.setAttribute('aria-label', 'Assistant mode');
    function makeModeChip(id, label, value, title) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mode-chip';
      btn.id = id;
      btn.textContent = label;
      btn.title = title;
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', 'false');
      btn.setAttribute('data-mode', value);
      modeRow.appendChild(btn);
      return btn;
    }
    var askBtn = makeModeChip('plusModeAsk', 'ASK', 'ask', 'Ask a question');
    var dictBtn = makeModeChip('plusModeDict', 'DICT', 'dict', 'Meaning of a word or phrase');
    var commandBtn = makeModeChip('plusModeCommand', 'COMMAND', 'command', 'Run a class control');
    var chartBtn = makeModeChip('btnImportChart', 'IMPORT', 'import', 'Read a seating-chart photo and move desks by class number');
    chartBtn.setAttribute('aria-label', 'Import chart');
    dictBtn.setAttribute('aria-label', 'Dict');
    command.appendChild(commandLine);
    command.appendChild(modeRow);
    applyModeChrome();
    askBtn.addEventListener('click', function () { setMode('ask'); });
    dictBtn.addEventListener('click', function () { setMode('dict'); });
    commandBtn.addEventListener('click', function () { setMode('command'); });
    chartBtn.addEventListener('click', function () { setMode('import'); });

    var reply = document.createElement('div');
    reply.className = 'plus-reply';
    reply.id = 'plusReply';
    reply.hidden = true;
    reply.setAttribute('aria-live', 'polite');

    var showClassBtn = document.createElement('button');
    showClassBtn.type = 'button';
    showClassBtn.className = 'plus-show-class';
    showClassBtn.id = 'plusShowClass';
    showClassBtn.hidden = true;
    showClassBtn.textContent = 'Show class';
    showClassBtn.setAttribute('aria-expanded', 'false');
    showClassBtn.setAttribute('aria-controls', 'classBoard');
    showClassBtn.addEventListener('click', function () {
      openClassBoard();
    });

    var panel = document.createElement('div');
    panel.className = 'plus-panel';
    panel.hidden = true;
    panel.appendChild(command);
    panel.appendChild(reply);
    panel.appendChild(showClassBtn);

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
      var reserve = api.BALL + 28;
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
      var cap = 220;
      var vwCap = root.innerWidth * 0.72;
      if (vwCap < cap) cap = vwCap;
      return cap;
    }

    // The saved corner is the ball, not the open panel. The unit is the
    // 44px circle. The strip is a child that flips beside it, so
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
      if (!showClassBtn.hidden) replyH += showClassBtn.offsetHeight + api.GAP;
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

    function applyModeChrome() {
      var ask = mode === 'ask';
      var dicting = mode === 'dict';
      var commandMode = mode === 'command';
      var importing = mode === 'import';
      input.placeholder = dicting
        ? 'A word or phrase\u2026'
        : (ask ? 'Ask a question\u2026' : (commandMode ? '+1 name, pick, pairs\u2026' : 'Chart photo'));
      input.setAttribute('aria-label', dicting
        ? 'Word or phrase'
        : (ask ? 'Ask a question' : (commandMode ? 'Command' : 'Import chart')));
      sendBtn.textContent = importing ? 'CHOOSE' : 'SEND';
      [askBtn, dictBtn, commandBtn, chartBtn].forEach(function (btn) {
        var on = btn.getAttribute('data-mode') === mode;
        btn.classList.toggle('is-selected', on);
        btn.setAttribute('aria-checked', on ? 'true' : 'false');
      });
    }

    function setMode(next) {
      if (next !== 'ask' && next !== 'dict' && next !== 'command' && next !== 'import') next = 'ask';
      if (next === 'command' || next === 'import') askThread.reset();
      mode = next;
      applyModeChrome();
      if (mode !== 'import' && openState) focusCommand();
    }

    function dispatchCommand(message) {
      var text = String(message || '').replace(/\s+/g, ' ').trim();
      if (!text) return;
      input.value = '';
      var parsed = api.parseCommand(text);
      if (!parsed || !parsed.action) {
        showReply('Command not recognised. Say help for the list, or switch to Ask.');
        return;
      }
      if (parsed.action === 'help') {
        showReply(api.commandHelp());
        return;
      }
      runAction(parsed.action, parsed.slots || {}, '');
    }

    function setOpen(next) {
      var wasOpen = openState;
      openState = !!next;
      ball.setAttribute('aria-expanded', openState ? 'true' : 'false');
      ball.setAttribute('aria-label', openState ? 'Close Live Class + commands' : 'Open Live Class + commands');
      unit.classList.toggle('is-open', openState);
      if (openState) {
        panel.hidden = false;
        command.hidden = false;
        if (!wasOpen) setMode('ask');
      } else {
        askThread.reset();
        command.hidden = true;
        reply.hidden = true;
        reply.textContent = '';
        showClassBtn.hidden = true;
        showClassBtn.setAttribute('aria-expanded', 'false');
        classPayload = null;
        classQuery = '';
        closeClassBoard({ silent: true });
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

    function showReply(text, opts) {
      opts = opts || {};
      var raw = String(text == null ? '' : text);
      var shown = opts.gloss ? raw : raw.trim();
      if (!shown.replace(/\s+/g, '')) {
        reply.hidden = true;
        reply.textContent = '';
        reply.classList.remove('is-gloss');
        showClassBtn.hidden = true;
        showClassBtn.setAttribute('aria-expanded', 'false');
        classPayload = null;
        classQuery = '';
        closeClassBoard({ silent: true });
        place();
        focusCommand();
        return;
      }
      reply.hidden = false;
      paintReply(shown, opts);
      var allow = !!opts.showClass;
      showClassBtn.hidden = !allow;
      if (!allow) showClassBtn.setAttribute('aria-expanded', 'false');
      if (allow) {
        classPayload = opts.payload || { kind: 'ask', reply: shown };
        classQuery = opts.query || '';
      } else {
        classPayload = null;
        classQuery = '';
      }
      if (classSheet) {
        if (allow) paintClassBoard();
        else closeClassBoard({ silent: true });
      }
      place();
      root.requestAnimationFrame(place);
      if (!classSheet) focusCommand();
    }

    function paintReply(text, opts) {
      opts = opts || {};
      var gloss = !!opts.gloss;
      var bits = String(text || '').split('\n');
      reply.classList.toggle('is-gloss', gloss);
      reply.textContent = '';
      if (!gloss && bits.length < 2) {
        reply.textContent = bits[0] || '';
        return;
      }
      bits.forEach(function (bit, i) {
        var row = document.createElement('div');
        row.className = 'plus-reply-line';
        if (gloss) {
          row.setAttribute('data-gloss-line', String(i + 1));
          if (!bit) row.classList.add('is-blank');
        }
        row.textContent = bit;
        reply.appendChild(row);
      });
    }

    function ensureClassBoard() {
      if (classSheet) return classSheet;
      classSheet = document.createElement('div');
      classSheet.className = 'class-board-sheet';
      classSheet.addEventListener('click', function (e) {
        if (e.target === classSheet) closeClassBoard();
      });
      var frame = document.createElement('div');
      frame.className = 'class-board';
      frame.id = 'classBoard';
      frame.setAttribute('role', 'dialog');
      frame.setAttribute('aria-modal', 'true');
      var bar = document.createElement('div');
      bar.className = 'class-board-bar';
      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'class-board-close';
      closeBtn.setAttribute('aria-label', 'Close');
      closeBtn.textContent = '\u2715';
      closeBtn.addEventListener('click', function () { closeClassBoard(); });
      bar.appendChild(closeBtn);
      var body = document.createElement('div');
      body.className = 'class-board-body';
      body.addEventListener('pointerdown', armBoardPointer);
      frame.appendChild(bar);
      frame.appendChild(body);
      classSheet.appendChild(frame);
      document.body.appendChild(classSheet);
      return classSheet;
    }

    function paintClassBoard() {
      if (!classSheet || !classPayload) return;
      boardMarks = api.classHighlightGesture({ marks: boardMarks }, { type: 'open' }).marks;
      var parts = api.classBoardParts(classPayload, classQuery);
      if (!parts) {
        closeClassBoard({ silent: true });
        return;
      }
      var frame = classSheet.querySelector('.class-board');
      var body = classSheet.querySelector('.class-board-body');
      body.textContent = '';
      body.classList.toggle('is-gloss', !!parts.gloss);
      body.classList.toggle('is-prose', !parts.head && !parts.gloss);
      if (parts.gloss || parts.head) {
        var head = document.createElement('h2');
        head.className = 'class-board-head';
        head.id = 'classBoardTitle';
        head.textContent = parts.head || '';
        if (!parts.head) {
          head.classList.add('is-blank');
          head.setAttribute('aria-hidden', 'true');
        }
        if (parts.gloss) head.setAttribute('data-gloss-line', '1');
        body.appendChild(head);
        if (parts.head) {
          frame.setAttribute('aria-labelledby', 'classBoardTitle');
          frame.removeAttribute('aria-label');
        } else {
          frame.removeAttribute('aria-labelledby');
          frame.setAttribute('aria-label', 'Class board');
        }
      } else {
        frame.removeAttribute('aria-labelledby');
        frame.setAttribute('aria-label', 'Class board');
      }
      var lines = parts.lines.slice();
      if (parts.gloss) {
        while (lines.length < 4) lines.push('');
        lines = lines.slice(0, 4);
      }
      lines.forEach(function (line, i) {
        var p = document.createElement('p');
        var lead = !parts.gloss && i === 0 && lines.length > 1;
        p.className = 'class-board-line' + (lead ? ' is-lead' : '');
        if (!line) {
          p.classList.add('is-blank');
          p.setAttribute('aria-hidden', 'true');
        }
        if (parts.gloss) p.setAttribute('data-gloss-line', String(i + 2));
        p.textContent = line || '';
        body.appendChild(p);
      });
    }

    function openClassBoard() {
      if (showClassBtn.hidden || !classPayload) return;
      ensureClassBoard();
      paintClassBoard();
      if (!classSheet) return;
      showClassBtn.setAttribute('aria-expanded', 'true');
      var closeBtn = classSheet.querySelector('.class-board-close');
      if (closeBtn) {
        try { closeBtn.focus({ preventScroll: true }); }
        catch (err) { closeBtn.focus(); }
      }
    }

    function closeClassBoard(opts) {
      opts = opts || {};
      boardMarks = api.classHighlightGesture({ marks: boardMarks }, { type: 'close' }).marks;
      boardPointer = null;
      document.removeEventListener('pointerup', finishBoardPointer, true);
      document.removeEventListener('pointercancel', finishBoardPointer, true);
      if (!classSheet) return;
      clearBoardSelection();
      if (classSheet.parentNode) classSheet.parentNode.removeChild(classSheet);
      classSheet = null;
      showClassBtn.setAttribute('aria-expanded', 'false');
      if (opts.silent) return;
      if (!showClassBtn.hidden) {
        try { showClassBtn.focus({ preventScroll: true }); }
        catch (err) { try { showClassBtn.focus(); } catch (e2) {} }
      }
    }

    // Temporary marker stretches on the open board. Another drag adds
    // another. A short click clears. Closing the board drops them. They
    // are not written to the lesson or to localStorage.
    function boardTextNodes(body) {
      var walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, null);
      var nodes = [];
      var n;
      while ((n = walker.nextNode())) nodes.push(n);
      return nodes;
    }

    function boardOffset(body, container, offset) {
      var nodes = boardTextNodes(body);
      if (!container) return -1;
      if (container.nodeType === 3) {
        var cursor = 0;
        for (var i = 0; i < nodes.length; i++) {
          if (nodes[i] === container) {
            var at = offset;
            if (at < 0) at = 0;
            if (at > nodes[i].nodeValue.length) at = nodes[i].nodeValue.length;
            return cursor + at;
          }
          cursor += nodes[i].nodeValue.length;
        }
        return -1;
      }
      var boundary;
      try {
        boundary = document.createRange();
        boundary.setStart(container, offset);
        boundary.collapse(true);
      } catch (err) {
        return -1;
      }
      var pos = 0;
      for (var j = 0; j < nodes.length; j++) {
        var nodeRange = document.createRange();
        nodeRange.selectNodeContents(nodes[j]);
        if (nodeRange.compareBoundaryPoints(Range.START_TO_START, boundary) >= 0) return pos;
        pos += nodes[j].nodeValue.length;
      }
      return pos;
    }

    function boardSelection(body) {
      var sel = window.getSelection ? window.getSelection() : null;
      if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
      var range = sel.getRangeAt(0);
      if (!body.contains(range.startContainer) || !body.contains(range.endContainer)) return null;
      var start = boardOffset(body, range.startContainer, range.startOffset);
      var end = boardOffset(body, range.endContainer, range.endOffset);
      if (start < 0 || end < 0 || end <= start) return null;
      var nodes = boardTextNodes(body);
      var all = '';
      for (var i = 0; i < nodes.length; i++) all += nodes[i].nodeValue;
      var text = all.slice(start, end);
      if (!text || !String(text).replace(/\s+/g, '')) return null;
      return { start: start, end: end, text: text };
    }

    function clearBoardSelection() {
      var sel = window.getSelection ? window.getSelection() : null;
      if (!sel || !sel.rangeCount || !sel.anchorNode) return;
      if (classSheet && classSheet.contains(sel.anchorNode)) {
        try { sel.removeAllRanges(); } catch (err) {}
      }
    }

    function unwrapBoardMarks(body) {
      var found = body.querySelectorAll('mark.class-board-mark');
      for (var i = found.length - 1; i >= 0; i--) {
        var mark = found[i];
        var parent = mark.parentNode;
        while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
        parent.removeChild(mark);
      }
      if (body.normalize) body.normalize();
    }

    function wrapBoardSlice(textNode, start, end) {
      var value = textNode.nodeValue || '';
      if (start < 0) start = 0;
      if (end > value.length) end = value.length;
      if (start >= end) return;
      var mark = document.createElement('mark');
      mark.className = 'class-board-mark';
      var parent = textNode.parentNode;
      if (start <= 0 && end >= value.length) {
        parent.insertBefore(mark, textNode);
        mark.appendChild(textNode);
        return;
      }
      var before = value.slice(0, start);
      var after = value.slice(end);
      textNode.nodeValue = before;
      mark.textContent = value.slice(start, end);
      var anchor = textNode.nextSibling;
      if (!before) parent.removeChild(textNode);
      if (anchor) parent.insertBefore(mark, anchor);
      else parent.appendChild(mark);
      if (after) {
        var tail = document.createTextNode(after);
        if (mark.nextSibling) parent.insertBefore(tail, mark.nextSibling);
        else parent.appendChild(tail);
      }
    }

    function paintBoardMarks(body, ranges) {
      unwrapBoardMarks(body);
      var ordered = (ranges || []).slice().sort(function (a, b) { return b.start - a.start; });
      ordered.forEach(function (range) {
        if (!range || range.end <= range.start) return;
        var nodes = boardTextNodes(body);
        var cursor = 0;
        var slices = [];
        for (var i = 0; i < nodes.length; i++) {
          var len = nodes[i].nodeValue.length;
          var from = range.start > cursor ? range.start : cursor;
          var to = range.end < cursor + len ? range.end : cursor + len;
          if (from < to) slices.push({ node: nodes[i], start: from - cursor, end: to - cursor });
          cursor += len;
        }
        for (var s = slices.length - 1; s >= 0; s--) {
          wrapBoardSlice(slices[s].node, slices[s].start, slices[s].end);
        }
      });
    }

    function boardControlTarget(target) {
      if (!target || !target.closest) return false;
      return !!target.closest('button, a, input, select, textarea, .class-board-bar');
    }

    function finishBoardPointer(e) {
      if (!boardPointer) return;
      if (e && e.pointerId != null && e.pointerId !== boardPointer.id) return;
      var down = boardPointer;
      boardPointer = null;
      document.removeEventListener('pointerup', finishBoardPointer, true);
      document.removeEventListener('pointercancel', finishBoardPointer, true);
      if (e && e.type === 'pointercancel') return;
      var body = classSheet && classSheet.querySelector('.class-board-body');
      if (!body) return;
      var dx = (e && e.clientX != null ? e.clientX : down.x) - down.x;
      var dy = (e && e.clientY != null ? e.clientY : down.y) - down.y;
      var chrome = boardControlTarget(e && e.target);
      var result = api.classHighlightGesture({ marks: boardMarks }, {
        type: 'up',
        chrome: chrome,
        distance: Math.sqrt(dx * dx + dy * dy),
        selection: chrome ? null : boardSelection(body)
      });
      boardMarks = result.marks;
      if (result.effect === 'clear' || result.effect === 'add') {
        paintBoardMarks(body, boardMarks);
        var sel = window.getSelection ? window.getSelection() : null;
        if (sel && sel.removeAllRanges) {
          try { sel.removeAllRanges(); } catch (err) {}
        }
      }
    }

    function armBoardPointer(e) {
      if (!e || (e.button != null && e.button !== 0)) return;
      if (boardControlTarget(e.target)) return;
      var body = classSheet && classSheet.querySelector('.class-board-body');
      if (!body || !body.contains(e.target)) return;
      boardPointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
      document.addEventListener('pointerup', finishBoardPointer, true);
      document.addEventListener('pointercancel', finishBoardPointer, true);
    }

    function trapClassBoardTab(e) {
      if (!classSheet) return;
      var nodes = classSheet.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      var list = [];
      for (var i = 0; i < nodes.length; i++) {
        if (!nodes[i].disabled) list.push(nodes[i]);
      }
      if (!list.length) {
        e.preventDefault();
        return;
      }
      var first = list[0];
      var last = list[list.length - 1];
      var active = document.activeElement;
      var inside = classSheet.contains(active);
      if (e.shiftKey) {
        if (!inside || active === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (!inside || active === last) {
        e.preventDefault();
        first.focus();
      }
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
      var card = api.glossCard(payload, pendingQuery);
      var text = card ? api.glossLines(card).join('\n') : api.presentReply(payload);
      if (!String(text || '').replace(/\s+/g, '')) {
        showReply('The assistant is unavailable just now.');
        return;
      }
      showReply(text, {
        showClass: api.canShowClass(payload),
        payload: payload,
        query: pendingQuery,
        gloss: !!card
      });
    }

    function send(message) {
      var text = String(message || '').replace(/\s+/g, ' ').trim();
      if (!text || inflight) return;
      pendingQuery = text;
      input.value = '';
      reply.hidden = false;
      reply.classList.remove('is-gloss');
      reply.textContent = '\u2026';
      showClassBtn.hidden = true;
      place();
      var ticket = ++seq;
      var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      inflight = controller;
      sendBtn.disabled = true;
      focusCommand();
      var timer = root.setTimeout(function () {
        if (controller) controller.abort();
      }, 25000);
      // Ask sends the open-strip thread. Dict posts gloss and omits
      // history. Command and Import never call send. A non-Ask caller
      // still posts the line alone. glossing is fixed for this send.
      var glossing = mode === 'dict';
      var prior = mode === 'ask' ? askThread.snapshot() : [];
      var payload = glossing
        ? api.glossRequestBody(text)
        : (mode === 'ask' ? api.askRequestBody(text, prior) : { text: text });
      fetch(workerUrl, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
          if (mode === 'ask' && !glossing) {
            var answered = api.readPayload(result.body);
            if (answered.kind !== 'action') askThread.remember(text, api.presentReply(answered));
          }
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
      if (mode === 'import') {
        chartBtn.click();
        return;
      }
      if (mode === 'command') {
        dispatchCommand(input.value);
        focusCommand();
        return;
      }
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
      if (classSheet && classSheet.contains(e.target)) return;
      setOpen(false);
    }, true);

    document.addEventListener('keydown', function (e) {
      if (classSheet && e.key === 'Tab') {
        trapClassBoardTab(e);
        return;
      }
      if (e.key !== 'Escape') return;
      if (classSheet) {
        e.preventDefault();
        e.stopImmediatePropagation();
        closeClassBoard();
        return;
      }
      if (!openState) return;
      setOpen(false);
    }, true);

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
