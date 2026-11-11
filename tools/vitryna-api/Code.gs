/**
 * Samostroy Shop — вітрини партнерів (окремий модуль; його можна вимкнути або прибрати, не чіпаючи решту сайту).
 *
 * Що робить: зберігає налаштування вітрин партнерів, віддає їх сторінці v/, приймає замовлення з вітрини
 * (ціни й товари перевіряє сам за каталогом сайту) і передає їх у кабінет партнерів (дія ext_order),
 * модерація для власника, скарги покупців.
 * Дані — у Google Таблиці «Samostroy — вітрини», до якої прив’язано цей скрипт (аркуші створюються самі).
 *
 * Властивості скрипта:
 *   ADMIN_PASS — пароль адмінки (той самий, що в основному скрипті й скрипті партнерів)
 *   TG_TOKEN   — токен адмін-бота (необов’язково: сповіщення про нові вітрини й скарги)
 *   TG_CHAT    — ID вашого чату з адмін-ботом (необов’язково)
 * Інструкція — tools/vitryna-api/ЯК-ЗАПУСТИТИ.md.
 */
var SITE = 'https://samostroy.shop/';
var PARTNER_API = 'https://script.google.com/macros/s/AKfycbxEYmnhjGKGAZz-3RwFFQTR7XItSeFp8xPlrVQfFtrh-6L0reedHd-C21a0_HZ227mI/exec';
var SC = [['slug', 'Адреса'], ['partnerId', 'ID партнера'], ['partner', 'Партнер'], ['phone', 'Телефон партнера'], ['status', 'Статус'],
  ['created', 'Створено'], ['updated', 'Оновлено'], ['approvedAt', 'Схвалено'], ['views', 'Перегляди'], ['orders', 'Замовлення'],
  ['note', 'Нотатка'], ['config', 'Налаштування (дані)']];
var RC = [['at', 'Дата'], ['slug', 'Вітрина'], ['text', 'Скарга'], ['contact', 'Контакт']];
var SH_S = 'Вітрини', SH_R = 'Скарги';
var THEMES = ['classic', 'minimal', 'dark', 'bright'], FONTS = ['golos', 'manrope', 'montserrat', 'unbounded'];
var RESERVED = ['edit', 'admin', 'index', 'config', 'embed', 'store', 'boot', 'api', 'app', 'samostroy', 'shop', 'admin-panel', 'test', 'v', 'help'];

/* ---------------- вхід ---------------- */
function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.a === 'get') return out(getStore(str(p.s, 40).toLowerCase(), p.pv === '1'));
    return out({ ok: true, service: 'samostroy-vitryny' });
  } catch (x) { return out({ ok: false, error: x.code || 'server' }); }
}
function doPost(e) {
  var b = {};
  try { b = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (x) { return out({ ok: false, error: 'bad' }); }
  var f = ACTIONS[b.action];
  if (!f) return out({ ok: false, error: 'action' });
  try { return out(f(b)); }
  catch (x) { if (x && x.code) return out({ ok: false, error: x.code, msg: x.msg || '' }); console.error(x && x.stack || x); return out({ ok: false, error: 'server' }); }
}
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function fail(code, msg) { var e = new Error(code); e.code = code; e.msg = msg; throw e; }

/* ---------------- таблиця ---------------- */
function sheet(name, cols) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), s = ss.getSheetByName(name);
  if (!s) {
    s = ss.insertSheet(name);
    s.getRange(1, 1, 1, cols.length).setValues([cols.map(function (c) { return c[1]; })]).setFontWeight('bold');
    s.getRange(1, 1, 1000, cols.length).setNumberFormat('@');
    s.setFrozenRows(1);
  }
  return s;
}
function readAll(name, cols) {
  var s = sheet(name, cols), n = s.getLastRow();
  if (n < 2) return [];
  return s.getRange(2, 1, n - 1, cols.length).getValues().map(function (r, i) {
    var o = { _r: i + 2 };
    cols.forEach(function (c, k) { var v = r[k]; o[c[0]] = v instanceof Date ? v.toISOString() : String(v == null ? '' : v); });
    return o;
  });
}
function write(name, cols, o) {
  var s = sheet(name, cols), row = [cols.map(function (c) { var v = o[c[0]]; return v == null ? '' : String(v); })];
  if (o._r) s.getRange(o._r, 1, 1, cols.length).setNumberFormat('@').setValues(row);
  else { var r = s.getLastRow() + 1; s.getRange(r, 1, 1, cols.length).setNumberFormat('@').setValues(row); o._r = r; }
  return o;
}
function withLock(fn) { var l = LockService.getScriptLock(); l.waitLock(25000); try { return fn(); } finally { l.releaseLock(); } }
function prop(k) { return PropertiesService.getScriptProperties().getProperty(k) || ''; }
function cache() { return CacheService.getScriptCache(); }
function now() { return new Date().toISOString(); }
function str(v, n) { return String(v == null ? '' : v).trim().slice(0, n || 200); }
function num(v) { var n = Number(String(v).replace(',', '.')); return isFinite(n) ? n : 0; }
function json(v, d) { try { return v ? JSON.parse(v) : d; } catch (x) { return d; } }
function h(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function findSlug(list, slug) { for (var i = 0; i < list.length; i++) if (list[i].slug === slug) return list[i]; return null; }
function findPartner(list, pid) { for (var i = 0; i < list.length; i++) if (list[i].partnerId === pid) return list[i]; return null; }
function tooMany(key, max, sec) { var c = cache(), n = Number(c.get(key) || 0); if (n >= max) return true; c.put(key, String(n + 1), sec); return false; }

/* ---------------- зв’язок з кабінетом партнерів ---------------- */
function papi(body) {
  try {
    var r = UrlFetchApp.fetch(prop('PARTNER_API') || PARTNER_API, { method: 'post', contentType: 'text/plain', muteHttpExceptions: true, followRedirects: true, payload: JSON.stringify(body) });
    return JSON.parse(r.getContentText());
  } catch (x) { console.error('papi', x); return null; }
}
// партнер за токеном його кабінету (перевіряє скрипт партнерів)
function partnerMe(token) {
  var t = str(token, 80);
  if (!t) fail('auth');
  var r = papi({ action: 'p_me', token: t });
  if (!r) fail('net');
  if (!r.ok) fail(r.error || 'auth');
  return r.me;
}
function tgAdmin(html, url) {
  var t = prop('TG_TOKEN');
  if (!t) return;
  prop('TG_CHAT').split(',').filter(String).forEach(function (c) {
    try {
      var p = { chat_id: c.trim(), text: html, parse_mode: 'HTML', disable_web_page_preview: true };
      if (url) p.reply_markup = { inline_keyboard: [[{ text: 'Відкрити модерацію вітрин', url: url }]] };
      UrlFetchApp.fetch('https://api.telegram.org/bot' + t + '/sendMessage', { method: 'post', contentType: 'application/json', payload: JSON.stringify(p), muteHttpExceptions: true });
    } catch (x) { console.error(x); }
  });
}

/* ---------------- каталог сайту (ціни й наявність — для перевірки замовлень) ---------------- */
function catalog() {
  var c = cache(), n = Number(c.get('cat_n') || 0), parts = [];
  if (n) { var got = c.getAll(Array.apply(null, Array(n)).map(function (_, i) { return 'cat_' + i; })); for (var i = 0; i < n; i++) parts.push(got['cat_' + i] || ''); }
  var s = parts.join('');
  if (!n || !s) {
    var j = JSON.parse(UrlFetchApp.fetch(SITE + 'app/catalog.json?t=' + Date.now(), { muteHttpExceptions: true }).getContentText());
    var f = j.f, map = {};
    j.items.forEach(function (a) { var o = {}; f.forEach(function (k, i) { o[k] = a[i]; }); map[o.id] = [o.price, o.av ? 1 : 0, o.name, o.sku || '']; });
    s = JSON.stringify(map);
    var size = 40000, chunks = {}, k = 0;   // кирилиця — до 2 байтів на символ, ліміт кешу 100 КБ
    for (var p = 0; p < s.length; p += size) chunks['cat_' + (k++)] = s.slice(p, p + size);
    chunks.cat_n = String(k);
    c.putAll(chunks, 1800);
  }
  return JSON.parse(s);
}
// ціна партнера: не нижче ціни сайту; націнка у % або своя ціна на товар; округлення
function priceOf(cfg, id, base) {
  var o = cfg.over && cfg.over[id], v;
  if (o) v = num(o);
  else {
    v = base * (1 + Math.max(0, Math.min(200, num(cfg.markup))) / 100);
    if (cfg.round === '10') v = Math.ceil(v / 10) * 10;
    else if (cfg.round === '9') v = Math.ceil((v + 1) / 10) * 10 - 1;
    else v = Math.ceil(v);
  }
  return Math.max(Math.ceil(base), Math.round(v));
}

/* ---------------- налаштування вітрини: перевірка ---------------- */
var URL_RE = /^https:\/\/[\w.-]+\.[a-z]{2,}\/[\w\-./%~+]*$/i;
function cleanCfg(c, me) {
  c = c || {};
  var hex = function (v, d) { v = str(v, 7); return /^#[0-9a-f]{6}$/i.test(v) ? v : d; };
  var url = function (v) { v = str(v, 400); return URL_RE.test(v) ? v : ''; };
  var cont = c.contacts || {};
  var items = (Array.isArray(c.items) ? c.items : []).slice(0, 400).map(function (x) { return str(x, 40); }).filter(String);
  var seen = {}; items = items.filter(function (x) { return seen[x] ? false : (seen[x] = 1); });
  var over = {}, feat = [];
  Object.keys(c.over || {}).slice(0, 400).forEach(function (k) { var v = Math.round(num(c.over[k])); if (items.indexOf(k) >= 0 && v > 0) over[k] = v; });
  (Array.isArray(c.feat) ? c.feat : []).slice(0, 12).forEach(function (x) { x = str(x, 40); if (items.indexOf(x) >= 0 && feat.indexOf(x) < 0) feat.push(x); });
  return {
    name: str(c.name, 60) || me.name, slogan: str(c.slogan, 140), logo: url(c.logo), cover: url(c.cover),
    theme: THEMES.indexOf(c.theme) >= 0 ? c.theme : 'classic', accent: hex(c.accent, '#f08a1c'), font: FONTS.indexOf(c.font) >= 0 ? c.font : 'golos',
    radius: c.radius === 'square' ? 'square' : 'round', hideOut: !!c.hideOut,
    markup: Math.max(0, Math.min(200, Math.round(num(c.markup)))), round: ['', '10', '9'].indexOf(c.round) >= 0 ? c.round : '',
    items: items, over: over, feat: feat,
    about: str(c.about, 800), delivery: str(c.delivery, 500), payment: str(c.payment, 500),
    contacts: { phone: str(cont.phone, 30), tg: str(cont.tg, 40).replace(/^@/, '').replace(/^https?:\/\/t\.me\//, ''), viber: str(cont.viber, 30),
      ig: str(cont.ig, 60).replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, ''),
      tt: str(cont.tt, 60).replace(/^@/, '').replace(/^https?:\/\/(www\.)?tiktok\.com\/@?/, '').replace(/\/$/, ''), fb: url(cont.fb), hours: str(cont.hours, 80) }
  };
}
function pubStore(s, full) {
  var c = json(s.config, {});
  var o = { slug: s.slug, status: s.status, approved: !!s.approvedAt, updated: s.updated, cfg: c, partner: { id: s.partnerId, name: s.partner } };
  if (full) { o.views = Number(s.views || 0); o.orders = Number(s.orders || 0); o.note = s.note; o.approvedAt = s.approvedAt; o.created = s.created; o.phone = s.phone; }
  return o;
}

/* ---------------- публічне: вітрина для покупців ---------------- */
function getStore(slug, preview) {
  if (!slug) fail('notfound');
  var key = 'st:' + slug, c = cache().get(key), s;
  if (c) s = JSON.parse(c);
  else { s = findSlug(readAll(SH_S, SC), slug); if (!s) fail('notfound'); delete s._r; cache().put(key, JSON.stringify(s), 300); }
  if (s.status === 'Вимкнена') return { ok: true, off: true };
  if (!preview) countView(slug);
  var o = pubStore(s);
  delete o.partner.id;
  return { ok: true, store: o };
}
function countView(slug) {
  var k = 'vw:' + slug, n = Number(cache().get(k) || 0) + 1;
  if (n < 20) { cache().put(k, String(n), 21600); return; }
  cache().put(k, '0', 21600);
  try { withLock(function () { var s = findSlug(readAll(SH_S, SC), slug); if (s) { s.views = String(Number(s.views || 0) + n); write(SH_S, SC, s); } }); } catch (x) { }
}
var ACTIONS = {};

ACTIONS.v_order = function (b) {
  if (str(b.hp)) return { ok: true, id: '—' };
  var slug = str(b.slug, 40).toLowerCase(), o = b.order || {}, key = str(b.key, 40);
  var digits = String(o.phone || '').replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 13) fail('phone');
  if (str(o.client).length < 3) fail('client');
  if (!str(o.city)) fail('city');
  if (!str(o.branch)) fail('branch');
  if (tooMany('vo:' + digits.slice(-9), 5, 600) || tooMany('vo_all', 120, 600)) fail('rate');
  var s = findSlug(readAll(SH_S, SC), slug);
  if (!s || s.status === 'Вимкнена') fail('off');
  var cfg = json(s.config, {}), cat = catalog(), bad = [];
  var items = (o.items || []).slice(0, 40).map(function (x) {
    var id = str(x.id, 40), p = cat[id];
    if (!p || cfg.items.indexOf(id) < 0) { bad.push(id); return null; }
    if (!p[1]) { bad.push(p[2]); return null; }
    return { id: id, name: p[2], sku: p[3], q: Math.max(1, Math.min(999, Math.round(num(x.q)))), price: p[0], sale: priceOf(cfg, id, p[0]) };
  }).filter(Boolean);
  if (bad.length) fail('stock', bad.join('; '));
  if (!items.length) fail('items');
  var total = items.reduce(function (a, x) { return a + x.q * x.sale; }, 0);
  var r = papi({ action: 'ext_order', pass: prop('ADMIN_PASS'), partnerId: s.partnerId, key: key ? 'v-' + key : '',
    order: { items: items, client: str(o.client, 120), phone: o.phone, city: str(o.city, 120), branch: str(o.branch, 80),
      delivery: str(o.delivery, 40) || 'Нова Пошта', pay: 'Накладений платіж', source: 'Вітрина ' + slug, note: str(o.note, 600) } });
  if (!r) fail('net');
  if (!r.ok) fail(r.error === 'action' ? 'update' : r.error || 'server');
  if (!r.dup) withLock(function () { var x = findSlug(readAll(SH_S, SC), slug); if (x) { x.orders = String(Number(x.orders || 0) + 1); write(SH_S, SC, x); } });
  return { ok: true, id: r.id, total: total };
};

ACTIONS.v_report = function (b) {
  var slug = str(b.slug, 40).toLowerCase(), text = str(b.text, 1000);
  if (text.length < 5) fail('text');
  if (tooMany('rp_all', 30, 3600)) fail('rate');
  write(SH_R, RC, { at: now(), slug: slug, text: text, contact: str(b.contact, 80) });
  tgAdmin('⚠️ <b>Скарга на вітрину</b> ' + h(slug) + '\n' + h(text) + (b.contact ? '\nКонтакт: ' + h(str(b.contact, 80)) : ''), SITE + 'v/admin.html#' + encodeURIComponent(slug));
  return { ok: true };
};

/* ---------------- партнер: редактор вітрини ---------------- */
ACTIONS.v_mine = function (b) {
  var me = partnerMe(b.token), s = findPartner(readAll(SH_S, SC), me.id);
  return { ok: true, me: { id: me.id, name: me.name, level: me.level, margin: me.margin, favs: me.favs || [], tg: me.tg }, store: s ? pubStore(s, true) : null };
};
ACTIONS.v_slug = function (b) {
  var me = partnerMe(b.token), slug = str(b.slug, 40).toLowerCase();
  var err = slugErr(slug);
  if (err) return { ok: true, free: false, why: err };
  var s = findSlug(readAll(SH_S, SC), slug);
  return { ok: true, free: !s || s.partnerId === me.id, why: s && s.partnerId !== me.id ? 'Ця адреса вже зайнята' : '' };
};
function slugErr(slug) {
  if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(slug)) return 'Від 3 до 30 символів: латинські літери, цифри й дефіс';
  if (RESERVED.indexOf(slug) >= 0 || /--/.test(slug)) return 'Ця адреса недоступна';
  return '';
}
ACTIONS.v_save = function (b) {
  var me = partnerMe(b.token);
  if (me.status === 'Заблокований') fail('blocked');
  var cfg = cleanCfg(b.cfg, me), slug = str(b.slug, 40).toLowerCase();
  if (!cfg.items.length) fail('noitems');
  return withLock(function () {
    var list = readAll(SH_S, SC), s = findPartner(list, me.id), first = !s;
    if (s && s.approvedAt && slug && slug !== s.slug) fail('slocked');
    if (!s || !s.approvedAt) {
      var e = slugErr(slug); if (e) fail('slug', e);
      var other = findSlug(list, slug); if (other && other.partnerId !== me.id) fail('taken');
    }
    if (!s) s = { slug: slug, partnerId: me.id, created: now(), status: 'На модерації', views: '0', orders: '0', note: '', approvedAt: '' };
    else if (!s.approvedAt) s.slug = slug;
    s.partner = me.name; s.phone = me.phone; s.updated = now(); s.config = JSON.stringify(cfg);
    write(SH_S, SC, s);
    cache().remove('st:' + s.slug);
    if (first) tgAdmin('🏪 <b>Нова вітрина на модерації</b>\n' + h(cfg.name) + ' · samostroy.shop/v/?' + h(s.slug) + '\nПартнер: ' + h(me.name) + ' (' + h(me.id) + ')\nТоварів: ' + cfg.items.length + ', націнка ' + cfg.markup + '%',
      SITE + 'v/admin.html#' + encodeURIComponent(s.slug));
    return { ok: true, store: pubStore(s, true), first: first };
  });
};

/* ---------------- власник: модерація ---------------- */
function admin(b) {
  var pass = prop('ADMIN_PASS'), c = cache();
  if (Number(c.get('afail') || 0) >= 10) fail('locked');
  if (!pass || String(b.pass || '') !== pass) { c.put('afail', String(Number(c.get('afail') || 0) + 1), 900); fail('auth'); }
}
ACTIONS.a_list = function (b) {
  admin(b);
  return { ok: true, stores: readAll(SH_S, SC).map(function (s) { return pubStore(s, true); }), reports: readAll(SH_R, RC).reverse().slice(0, 200) };
};
ACTIONS.a_set = function (b) {
  admin(b);
  var slug = str(b.slug, 40).toLowerCase(), op = str(b.op, 20);
  return withLock(function () {
    var s = findSlug(readAll(SH_S, SC), slug);
    if (!s) fail('notfound');
    if (op === 'approve') { s.status = 'Опублікована'; s.approvedAt = now(); }
    else if (op === 'disable') s.status = 'Вимкнена';
    else if (op === 'enable') s.status = s.approvedAt ? 'Опублікована' : 'На модерації';
    else if (op === 'note') s.note = str(b.note, 500);
    else if (op === 'stubbed') s.approvedAt = now();
    else if (op === 'delete') { sheet(SH_S, SC).deleteRow(s._r); cache().remove('st:' + slug); return { ok: true, deleted: true }; }
    else fail('bad');
    write(SH_S, SC, s);
    cache().remove('st:' + slug);
    return { ok: true, store: pubStore(s, true) };
  });
};

/** Запустіть один раз у редакторі після вставки коду: створить аркуші й попросить дозволи. */
function setup() {
  sheet(SH_S, SC); sheet(SH_R, RC);
  var n = Object.keys(catalog()).length;
  var p = papi({ action: 'a_list', pass: prop('ADMIN_PASS') });
  console.log('Аркуші готові ✓\nКаталог сайту: ' + n + ' товарів ✓\nЗв’язок з кабінетом партнерів: ' + (p && p.ok ? 'є ✓' : 'НЕМАЄ — перевірте ADMIN_PASS (має збігатися зі скриптом партнерів)') +
    '\nСповіщення в адмін-бот: ' + (prop('TG_TOKEN') && prop('TG_CHAT') ? 'увімкнено ✓' : 'вимкнено (TG_TOKEN / TG_CHAT не задано)'));
}
