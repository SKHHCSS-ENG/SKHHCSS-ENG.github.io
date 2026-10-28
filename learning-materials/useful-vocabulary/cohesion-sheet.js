/**
 * Useful Vocabulary — Cohesion sample sentences.
 * Handwrite off: a chip opens one sample in a fixed sheet above the Tools dock.
 * The sheet is position:fixed, so the chip list and handwriting canvas do not move.
 * Handwrite on: chips do not receive taps (see cohesion-sheet.css).
 */
(function () {
  var cohesion = document.querySelector('details[data-section="cohesion"]');
  var dock = document.getElementById('bottomDock');
  if (!cohesion || !dock) return;

  var chips = cohesion.querySelectorAll('.vocab-example[data-example]');
  if (!chips.length) return;

  var backdrop = document.getElementById('exampleBackdrop');
  var sheet = document.getElementById('exampleSheet');
  var labelEl = document.getElementById('exampleSheetLabel');
  var textEl = document.getElementById('exampleSheetText');
  var closeBtn = document.getElementById('exampleSheetClose');
  if (!backdrop || !sheet || !labelEl || !textEl || !closeBtn) return;

  var current = null;

  function place() {
    var h = Math.ceil(dock.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--example-dock-h', h + 'px');
  }

  function clearSelected() {
    var i;
    for (i = 0; i < chips.length; i++) {
      chips[i].setAttribute('aria-expanded', 'false');
      var li = chips[i].closest('li');
      if (li) li.classList.remove('is-selected');
    }
  }

  function closeSheet(opts) {
    var btn = current;
    current = null;
    clearSelected();
    sheet.hidden = true;
    backdrop.hidden = true;
    if (btn && opts && opts.restoreFocus && cohesion.open) {
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
    textEl.textContent = example;
    place();
    backdrop.hidden = false;
    sheet.hidden = false;
    if (wasHidden) sheet.focus({ preventScroll: true });
  }

  function chipFromEvent(e) {
    var li = e.target.closest('.vocab-chips li');
    if (!li || !cohesion.contains(li)) return null;
    return li.querySelector('.vocab-example[data-example]');
  }

  function onChipActivate(e) {
    if (document.body.classList.contains('hw-on')) return;
    var btn = chipFromEvent(e);
    if (!btn) return;
    if (current === btn) closeSheet();
    else openSheet(btn);
  }

  cohesion.addEventListener('click', onChipActivate);
  cohesion.addEventListener('keydown', function (e) {
    if (e.repeat) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (!e.target.closest('.vocab-example')) return;
    e.preventDefault();
    onChipActivate(e);
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

  var summary = cohesion.querySelector('summary');
  if (summary) {
    summary.addEventListener('click', function () {
      /* Close in this turn. The details toggle event is queued, so waiting
         for it leaves the sheet up for a frame after the section shuts. */
      if (current) closeSheet();
    });
  }
  cohesion.addEventListener('toggle', function () {
    if (!cohesion.open && current) closeSheet();
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

  place();
})();
