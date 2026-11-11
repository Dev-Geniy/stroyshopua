/* Завантажувач вітрини: однаковий для v/index.html і для сторінок v/<адреса>/ — підтягує актуальні версії файлів. */
(function () {
  var V = '4f907c62', base = (document.currentScript && document.currentScript.src || '').replace(/boot\.js.*$/, '');
  var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = base + 'store.css?v=' + V; document.head.appendChild(l);
  ['config.js', 'store.js'].forEach(function (f) { var s = document.createElement('script'); s.src = base + f + '?v=' + V; s.async = false; document.head.appendChild(s); });
})();
