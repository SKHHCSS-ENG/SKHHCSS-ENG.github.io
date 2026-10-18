(function () {
  var KEY = 'dse-writing-zh-on';
  var btn = document.getElementById('zhToggle');
  if (!btn) return;

  function apply(on) {
    document.body.classList.toggle('zh-on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.textContent = on ? '中文 gloss：ON' : '中文 gloss：OFF';
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {}
  }

  var saved = false;
  try { saved = localStorage.getItem(KEY) === '1'; } catch (e) {}
  apply(saved);

  btn.addEventListener('click', function () {
    apply(!document.body.classList.contains('zh-on'));
  });
})();
