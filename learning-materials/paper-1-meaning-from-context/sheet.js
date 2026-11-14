/**
 * Paper 1 - Meaning from Context — skill dropdown and sample sheet.
 * Handwrite off: a chip opens part of speech, an English definition, and one sample.
 * Chinese stays on data-zh for the Tools dock 譯 toggle. It is not copied into the sheet.
 * Handwrite on: chips do not receive taps.
 * The sheet is position:fixed, so the chip list and handwriting canvas do not move.
 */
(function () {
  var root = document.getElementById('skillSets');
  var pick = document.getElementById('skillPick');
  var dock = document.getElementById('bottomDock');
  if (!root || !pick || !dock) return;

  var chips = [];
  var found = root.querySelectorAll('.vocab-example[data-example]');
  var i;
  for (i = 0; i < found.length; i++) chips.push(found[i]);
  if (!chips.length) return;

  var backdrop = document.getElementById('exampleBackdrop');
  var sheet = document.getElementById('exampleSheet');
  var labelEl = document.getElementById('exampleSheetLabel');
  var posEl = document.getElementById('exampleSheetPos');
  var defEl = document.getElementById('exampleSheetDef');
  var textEl = document.getElementById('exampleSheetText');
  var closeBtn = document.getElementById('exampleSheetClose');
  if (!backdrop || !sheet || !labelEl || !posEl || !defEl || !textEl || !closeBtn) return;

  var current = null;

  /* Samples wrap the target in <strong>. Escape everything, then restore
     those tags as <mark class="cohesion-hl"> so the sheet never grows other
     markup and highlight is not bold weight. */
  function exampleHtml(raw) {
    return String(raw)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/&lt;strong&gt;/gi, '<mark class="cohesion-hl">')
      .replace(/&lt;\/strong&gt;/gi, '</mark>');
  }

  function place() {
    var h = Math.ceil(dock.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--example-dock-h', h + 'px');
  }

  function clearSelected() {
    var n;
    for (n = 0; n < chips.length; n++) {
      chips[n].setAttribute('aria-expanded', 'false');
      var li = chips[n].closest('li');
      if (li) li.classList.remove('is-selected');
    }
  }

  function closeSheet(opts) {
    var btn = current;
    var set = btn && btn.closest('.skill-set');
    current = null;
    clearSelected();
    sheet.hidden = true;
    backdrop.hidden = true;
    if (btn && opts && opts.restoreFocus && set && !set.hasAttribute('hidden')) {
      btn.focus({ preventScroll: true });
    }
  }

  function openSheet(btn) {
    var example = btn.getAttribute('data-example') || '';
    if (!example) return;
    var wasHidden = sheet.hidden;
    clearSelected();
    current = btn;
    btn.setAttribute('aria-expanded', 'true');
    var li = btn.closest('li');
    if (li) li.classList.add('is-selected');
    labelEl.textContent = (btn.textContent || '').replace(/\s+/g, ' ').trim();
    posEl.textContent = btn.getAttribute('data-pos') || '';
    defEl.textContent = btn.getAttribute('data-def') || '';
    textEl.innerHTML = exampleHtml(example);
    place();
    backdrop.hidden = false;
    sheet.hidden = false;
    if (wasHidden) sheet.focus({ preventScroll: true });
  }

  function chipFromEvent(e) {
    var li = e.target.closest('.vocab-chips li');
    if (!li || !root.contains(li)) return null;
    var set = li.closest('.skill-set');
    if (!set || set.hasAttribute('hidden')) return null;
    return li.querySelector('.vocab-example[data-example]');
  }

  function onChipActivate(e) {
    if (document.body.classList.contains('hw-on')) return;
    var btn = chipFromEvent(e);
    if (!btn) return;
    if (current === btn) closeSheet();
    else openSheet(btn);
  }

  function showSkill(skill) {
    if (current) closeSheet();
    var sets = root.querySelectorAll('.skill-set');
    var n;
    var shown = false;
    for (n = 0; n < sets.length; n++) {
      var on = sets[n].getAttribute('data-skill') === skill;
      if (on) {
        sets[n].removeAttribute('hidden');
        shown = true;
      } else {
        sets[n].setAttribute('hidden', '');
      }
    }
    if (!shown && sets.length) sets[0].removeAttribute('hidden');
    if (pick.value !== skill && shown) pick.value = skill;
    if (typeof window.hwResize === 'function') {
      requestAnimationFrame(function () { setTimeout(window.hwResize, 50); });
    }
  }

  root.addEventListener('click', onChipActivate);
  root.addEventListener('keydown', function (e) {
    if (e.repeat) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (!e.target.closest('.vocab-example')) return;
    e.preventDefault();
    onChipActivate(e);
  });

  pick.addEventListener('change', function () {
    showSkill(pick.value);
  });

  closeBtn.addEventListener('click', function () {
    closeSheet({ restoreFocus: true });
  });

  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Escape' || e.key === 'Esc') && current) {
      e.preventDefault();
      closeSheet({ restoreFocus: true });
    }
  });

  document.addEventListener('click', function (e) {
    if (!current) return;
    if (sheet.contains(e.target)) return;
    if (e.target.closest('#bottomDock')) return;
    if (chipFromEvent(e)) return;
    closeSheet();
  });

  if (window.ResizeObserver) {
    var ro = new ResizeObserver(function () { place(); });
    ro.observe(dock);
  }
  window.addEventListener('resize', place);

  var classObserver = new MutationObserver(function () {
    if (document.body.classList.contains('hw-on') && current) closeSheet();
    place();
  });
  classObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  showSkill(pick.value || 'contrast-clues');
  place();
})();
