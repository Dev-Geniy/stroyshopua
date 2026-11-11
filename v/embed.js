/* Віджет вітрини для сайту партнера:
   <div data-samostroy-vitryna="адреса"></div><script src="https://samostroy.shop/v/embed.js" async></script> */
(function () {
  var base = (document.currentScript && document.currentScript.src || 'https://samostroy.shop/v/embed.js').replace(/embed\.js.*$/, '');
  function mount(el) {
    if (el.dataset.vOn) return; el.dataset.vOn = '1';
    var slug = String(el.getAttribute('data-samostroy-vitryna') || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
    var f = document.createElement('iframe');
    f.src = base + '?s=' + slug + '&embed=1'; f.title = 'Вітрина'; f.loading = 'lazy';
    f.style.cssText = 'width:100%;border:0;display:block;min-height:420px;background:transparent';
    el.appendChild(f);
    window.addEventListener('message', function (e) { if (e.source === f.contentWindow && e.data && e.data.vh) f.style.height = e.data.vh + 'px'; });
  }
  function all() { Array.prototype.forEach.call(document.querySelectorAll('[data-samostroy-vitryna]'), mount); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', all); else all();
})();
