(function () {
  var KEY = 'dse-writing-zh-on';
  var btn = document.getElementById('zhToggle');
  if (!btn) return;

  function shortLabel() {
    return window.matchMedia('(max-width: 700px)').matches;
  }

  function label(on) {
    if (shortLabel()) {
      return on ? '中文 ON' : '中文';
    }
    return on ? '中文 gloss：ON' : '中文 gloss：OFF';
  }

  function apply(on) {
    document.body.classList.toggle('zh-on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'Chinese gloss: ON' : 'Chinese gloss: OFF');
    btn.textContent = label(on);
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {}
  }

  var saved = false;
  try { saved = localStorage.getItem(KEY) === '1'; } catch (e) {}
  apply(saved);

  btn.addEventListener('click', function () {
    apply(!document.body.classList.contains('zh-on'));
  });

  var mq = window.matchMedia('(max-width: 700px)');
  function refreshLabel() {
    apply(document.body.classList.contains('zh-on'));
  }
  if (mq.addEventListener) mq.addEventListener('change', refreshLabel);
  else if (mq.addListener) mq.addListener(refreshLabel);
})();
