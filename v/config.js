/* Вітрини партнерів — налаштування модуля (окремо від config.js сайту).
   on: false — вимкнути всі вітрини й редактор (без видалення файлів).
   api: адреса скрипта вітрин (tools/vitryna-api/Code.gs → Розгорнути → URL вебзастосунку).
   seller: продавець за замовчуванням; порожньо — «інтернет-магазин Samostroy Shop». Партнер може вписати свій ФОП у редакторі (поле fop) — тоді на його вітрині показується він. */
window.VCFG = {
  on: true,
  api: 'https://script.google.com/macros/s/AKfycby-JZyZLVNUaln6PYlJHP_7VrfNiogRussv70Rz67CcIVmt2bbbkcOgT1U2SuSD10gbXw/exec',
  seller: '',
  platform: 'https://samostroy.shop/dropshipping.html'
};
