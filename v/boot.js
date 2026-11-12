/* Завантажувач вітрини: однаковий для v/index.html і для сторінок v/<адреса>/ — підтягує актуальні версії файлів. */
(function () {
  var V = '8b00da17', base = (document.currentScript && document.currentScript.src || '').replace(/boot\.js.*$/, '');
  var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = base + 'store.css?v=' + V; document.head.appendChild(l);
  ['config.js', 'policy.js', 'store.js'].forEach(function (f) { var s = document.createElement('script'); s.src = base + f + '?v=' + V; s.async = false; document.head.appendChild(s); });
})();
