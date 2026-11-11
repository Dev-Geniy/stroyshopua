/**
 * Samostroy Shop — особистий кабінет партнера + Telegram-бот «Samostroy Drop» (окремий скрипт Google).
 *
 * Що робить: реєстрація й вхід партнерів (на сайті й у Telegram), анкета, замовлення від партнерів,
 * їхні статуси й заробіток, сповіщення партнерам і менеджеру в Telegram, кнопки для менеджера прямо в чаті,
 * а для адмінки — керування замовленнями, партнерами, виплатами, видалення записів.
 * Дані — у Google Таблиці, до якої прив’язано цей скрипт (аркуші створюються самі).
 *
 * Властивості скрипта (Налаштування проєкту → Властивості скрипта):
 *   ADMIN_PASS     — пароль адмінки (той самий, що в основному скрипті)
 *   TG_TOKEN       — токен адмін-бота магазину (той самий BOT_TOKEN, що в основному скрипті)
 *   TG_CHAT        — ID вашого чату з адмін-ботом (той самий CHAT_ID, що в основному скрипті)
 *   DROP_BOT_TOKEN — токен бота партнерів «Samostroy Drop» від @BotFather (для бота й Mini App)
 * Решту (адреса Mini App, секрет вебхука, чати менеджерів) скрипт зберігає сам після кнопки
 * «Підключити бота» в адмінці → Налаштування.
 *
 * Інструкції з запуску — ЯК-ЗАПУСТИТИ.md і ЯК-ЗАПУСТИТИ-БОТА.md поруч.
 */

// Маржа партнера за рівнем, % від рекомендованої ціни (як у калькуляторі кабінету на сайті)
var LEVELS = { Starter: 10, Pro: 15, Team: 20 };
var STATUSES = ['Нове', 'Підтверджене', 'Відправлене', 'Отримане', 'Виплачено', 'Скасоване', 'Повернення'];
var TOKEN_DAYS = 60;
var SITE = 'https://samostroy.shop/';
var APP_URL = SITE + 'app/';               // Mini App у Telegram (сторінка на сайті)
var MANAGER = 'manager_samostroy_shop';     // Telegram менеджера (без @)

// [ключ, назва стовпця в таблиці]
var PC = [['id', 'ID'], ['created', 'Зареєстровано'], ['name', 'Ім’я'], ['phone', 'Телефон'], ['city', 'Місто'],
  ['msg', 'Telegram / Viber'], ['level', 'Рівень'], ['status', 'Статус'], ['payout', 'Реквізити для виплат'],
  ['note', 'Нотатка менеджера'], ['anketaAt', 'Анкета заповнена'], ['anketa', 'Анкета (дані)'],
  ['lastLogin', 'Останній вхід'], ['pass', 'Пароль (хеш)'], ['salt', 'Сіль'], ['tokens', 'Сесії'],
  ['tgId', 'Telegram ID'], ['tgName', 'Telegram'], ['favs', 'Мої товари']];
var OC = [['id', '№'], ['created', 'Створено'], ['updated', 'Оновлено'], ['partnerId', 'ID партнера'], ['partner', 'Партнер'],
  ['status', 'Статус'], ['client', 'Клієнт'], ['phone', 'Телефон клієнта'], ['city', 'Місто'], ['delivery', 'Доставка'],
  ['branch', 'Відділення'], ['pay', 'Оплата'], ['sale', 'Сума для клієнта'], ['whole', 'Оптова (орієнтовно)'],
  ['earn', 'Заробіток (орієнтовно)'], ['earnFinal', 'Заробіток (підтверджено)'], ['ttn', 'ТТН'], ['source', 'Звідки клієнт'],
  ['note', 'Коментар партнера'], ['comment', 'Коментар менеджера'], ['paidAt', 'Виплачено'], ['items', 'Товари (дані)'], ['key', 'Ключ'],
  ['via', 'Канал']];
// записи основної таблиці сайту (замовлення, заявки, відгуки), які видалили в адмінці: там вони більше не показуються
var HC = [['id', '№ запису'], ['created', 'Дата запису'], ['kind', 'Тип'], ['at', 'Видалено'], ['name', 'Ім’я'], ['phone', 'Телефон'], ['info', 'Що було в записі']];
// копії видалених замовлень партнерів і партнерів — про всяк випадок
var AC = [['at', 'Видалено'], ['type', 'Що'], ['id', 'ID'], ['data', 'Дані']];
var SH_P = 'Партнери', SH_O = 'Замовлення партнерів', SH_H = 'Видалені записи сайту', SH_A = 'Архів видаленого';

/* ---------------- вхід ---------------- */
function doGet() { return out({ ok: true, service: 'samostroy-partners' }); }
function doPost(e) {
  if (e && e.parameter && e.parameter.tg) return botWebhook(e);
  var b = {};
  try { b = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (x) { return out({ ok: false, error: 'bad' }); }
  var f = ACTIONS[b.action];
  if (!f) return out({ ok: false, error: 'action' });
  try { return out(f(b)); }
  catch (x) {
    if (x && x.code) return out({ ok: false, error: x.code });
    console.error(x && x.stack || x);
    return out({ ok: false, error: 'server' });
  }
}
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function fail(code) { var e = new Error(code); e.code = code; throw e; }

/* ---------------- таблиця ---------------- */
function sheet(name, cols) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), s = ss.getSheetByName(name);
  if (!s) {
    s = ss.insertSheet(name);
    s.getRange(1, 1, 1, cols.length).setValues([cols.map(function (c) { return c[1]; })]).setFontWeight('bold');
    s.getRange(1, 1, 2000, cols.length).setNumberFormat('@');
    s.setFrozenRows(1);
  } else if (s.getLastColumn() < cols.length) {
    // нові стовпці (напр. Telegram) — дописуємо заголовки праворуч, старі дані не чіпаємо
    var from = Math.max(1, s.getLastColumn() + 1);
    s.getRange(1, from, 1, cols.length - from + 1).setValues([cols.slice(from - 1).map(function (c) { return c[1]; })]).setFontWeight('bold');
  }
  return s;
}
function readAll(name, cols) {
  var s = sheet(name, cols), n = s.getLastRow();
  if (n < 2) return [];
  return s.getRange(2, 1, n - 1, cols.length).getValues().map(function (r, i) {
    var o = { _r: i + 2 };
    cols.forEach(function (c, k) { var v = r[k]; o[c[0]] = v instanceof Date ? v.toISOString() : String(v === null || v === undefined ? '' : v); });
    return o;
  });
}
function write(name, cols, o) {
  var s = sheet(name, cols), row = [cols.map(function (c) { var v = o[c[0]]; return v === undefined || v === null ? '' : String(v); })];
  if (o._r) s.getRange(o._r, 1, 1, cols.length).setNumberFormat('@').setValues(row);
  else { var r = s.getLastRow() + 1; s.getRange(r, 1, 1, cols.length).setNumberFormat('@').setValues(row); o._r = r; }
  return o;
}
function delRow(name, cols, r) { sheet(name, cols).deleteRow(r); }
function withLock(fn) {
  var l = LockService.getScriptLock();
  l.waitLock(25000);
  try { return fn(); } finally { l.releaseLock(); }
}
// наступний номер: найбільший наявний + 1 (після видалення рядків номери не повторюються)
function nextId(list, prefix, start) {
  var mx = start - 1;
  list.forEach(function (x) { var n = parseInt(String(x.id).replace(/\D/g, ''), 10); if (n > mx) mx = n; });
  var used = Number(prop('LAST_' + prefix) || 0);
  if (used > mx) mx = used;
  PropertiesService.getScriptProperties().setProperty('LAST_' + prefix, String(mx + 1));
  return prefix + (mx + 1);
}

/* ---------------- утиліти ---------------- */
function prop(k) { return PropertiesService.getScriptProperties().getProperty(k) || ''; }
function setProp(k, v) { if (v === '' || v === null || v === undefined) PropertiesService.getScriptProperties().deleteProperty(k); else PropertiesService.getScriptProperties().setProperty(k, String(v)); }
function now() { return new Date().toISOString(); }
function phoneNorm(p) {
  var d = String(p || '').replace(/\D/g, '');
  if (d.length < 9) return '';
  return '380' + d.slice(-9);
}
function str(v, n) { return String(v === undefined || v === null ? '' : v).trim().slice(0, n || 200); }
function num(v) { var n = Number(String(v).replace(',', '.')); return isFinite(n) ? n : 0; }
function hash(pass, salt) {
  var h = salt + '|' + pass;
  for (var i = 0; i < 300; i++) h = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + salt, Utilities.Charset.UTF_8));
  return h;
}
function json(v, d) { try { return v ? JSON.parse(v) : d; } catch (x) { return d; } }
function cache() { return CacheService.getScriptCache(); }
function code(n) { var abc = 'abcdefghkmnpqrstuvwxyz23456789', s = ''; for (var k = 0; k < (n || 8); k++) s += abc.charAt(Math.floor(Math.random() * abc.length)); return s; }
function h(s) { return String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function plain(s) { return String(s).replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'); }
// сповіщення в адмін-бот магазину (TG_TOKEN → TG_CHAT): з кнопками, які обробляє основний скрипт
function tgAdmin(html, kb) {
  var t = prop('TG_TOKEN'), n = 0;
  if (!t) return 0;
  prop('TG_CHAT').split(',').filter(String).forEach(function (c) {
    try {
      var p = { chat_id: c.trim(), text: String(html).slice(0, 4000), parse_mode: 'HTML', disable_web_page_preview: true };
      if (kb) p.reply_markup = kb;
      var r = JSON.parse(UrlFetchApp.fetch('https://api.telegram.org/bot' + t + '/sendMessage',
        { method: 'post', contentType: 'application/json', payload: JSON.stringify(p), muteHttpExceptions: true }).getContentText());
      if (r.ok) n++;
    } catch (x) { console.error(x); }
  });
  return n;
}
function tg(text) { return tgAdmin(h(text)); }
function money(n) { return Math.round(n).toLocaleString('uk-UA').replace(/ /g, ' ') + ' грн'; }
function marginOf(p) { return LEVELS[p.level] || LEVELS.Starter; }
function earnOf(o) { return o.earnFinal !== '' ? num(o.earnFinal) : num(o.earn); }
function track(o) {
  var n = String(o.ttn || '').replace(/\s/g, '');
  return /укр/i.test(o.delivery || '') ? 'https://track.ukrposhta.ua/tracking_UA.html?barcode=' + encodeURIComponent(n) : 'https://novaposhta.ua/tracking/?cargo_number=' + encodeURIComponent(n);
}

/* ---------------- партнер: публічні дані ---------------- */
function pubPartner(p) {
  return { id: p.id, created: p.created, name: p.name, phone: p.phone, city: p.city, msg: p.msg, level: p.level || 'Starter',
    margin: marginOf(p), status: p.status, payout: p.payout, anketa: json(p.anketa, null), anketaAt: p.anketaAt,
    tg: !!p.tgId, tgName: p.tgName, bot: prop('BOT_USER'), favs: json(p.favs, []) };
}
function pubOrder(o) {
  return { id: o.id, created: o.created, updated: o.updated, partnerId: o.partnerId, partner: o.partner, status: o.status,
    client: o.client, phone: o.phone, city: o.city, delivery: o.delivery, branch: o.branch, pay: o.pay,
    sale: num(o.sale), whole: num(o.whole), earn: num(o.earn), earnFinal: o.earnFinal === '' ? null : num(o.earnFinal),
    earnNow: earnOf(o), ttn: o.ttn, source: o.source, note: o.note, comment: o.comment, paidAt: o.paidAt, items: json(o.items, []), via: o.via };
}
function findPhone(list, ph) { for (var i = 0; i < list.length; i++) if (list[i].phone === ph) return list[i]; return null; }
function findTg(list, id) { id = String(id); for (var i = 0; i < list.length; i++) if (list[i].tgId && list[i].tgId === id) return list[i]; return null; }

function newToken(p, viaTg) {
  var t = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  var exp = Date.now() + TOKEN_DAYS * 864e5;
  var list = json(p.tokens, []).filter(function (x) { return x.e > Date.now() && !(viaTg && x.tg); });
  var web = list.filter(function (x) { return !x.tg; }).slice(viaTg ? -5 : -4), tgs = list.filter(function (x) { return x.tg; });
  var item = { t: t, e: exp };
  if (viaTg) item.tg = 1;
  p.tokens = JSON.stringify(web.concat(tgs, [item]));
  return t;
}
function auth(b) {
  var t = str(b.token, 80);
  if (!t) fail('auth');
  var list = readAll(SH_P, PC);
  for (var i = 0; i < list.length; i++) {
    var p = list[i], ts = json(p.tokens, []);
    for (var k = 0; k < ts.length; k++) if (ts[k].t === t && ts[k].e > Date.now()) {
      if (p.status === 'Заблокований') fail('blocked');
      p._tg = !!ts[k].tg;
      return p;
    }
  }
  fail('auth');
}
function tooMany(key, max, sec) {
  var c = cache(), n = Number(c.get(key) || 0);
  if (n >= max) return true;
  c.put(key, String(n + 1), sec);
  return false;
}
function anketaIn(b) {
  var a = b.anketa;
  if (!a || typeof a !== 'object') return null;
  var answers = {}, src = a.answers || {};
  Object.keys(src).slice(0, 40).forEach(function (k) {
    var x = src[k] || {};
    answers[str(k, 20)] = { has: !!x.has, link: str(x.link, 200), exp: str(x.exp, 20), aud: str(x.aud, 20) };
  });
  return { answers: answers, fop: str(a.fop, 20), time: str(a.time, 20), other: str(a.other, 300), note: str(a.note, 1000),
    lines: (a.lines || []).slice(0, 40).map(function (l) { return str(l, 400); }) };
}
function newPartner(list, f) {
  var salt = Utilities.getUuid();
  return { id: nextId(list, 'P', 1001), created: now(), name: f.name, phone: f.phone, city: f.city || '', msg: f.msg || '',
    level: 'Starter', status: 'Активний', payout: '', note: '', anketa: f.anketa ? JSON.stringify(f.anketa) : '', anketaAt: f.anketa ? now() : '',
    lastLogin: now(), pass: hash(f.password, salt), salt: salt, tokens: '[]', tgId: f.tgId || '', tgName: f.tgName || '' };
}

/* ---------------- дії партнера ---------------- */
var ACTIONS = {};

ACTIONS.p_register = function (b) {
  if (str(b.hp)) return { ok: true, token: '', me: null };            // бот
  var name = str(b.name, 80), ph = phoneNorm(b.phone), pass = String(b.password || '');
  if (name.length < 2) fail('name');
  if (!ph) fail('phone');
  if (pass.length < 6 || pass.length > 100) fail('password');
  if (tooMany('reg', 40, 3600)) fail('rate');
  return withLock(function () {
    var list = readAll(SH_P, PC);
    if (findPhone(list, ph)) fail('exists');
    var an = anketaIn(b);
    var p = newPartner(list, { name: name, phone: ph, city: str(b.city, 80), msg: str(b.msg, 80), password: pass, anketa: an });
    var token = newToken(p);
    write(SH_P, PC, p);
    notifyNewPartner(p, 'сайт');
    return { ok: true, token: token, me: pubPartner(p), orders: [] };
  });
};

ACTIONS.p_login = function (b) {
  var ph = phoneNorm(b.phone), pass = String(b.password || '');
  if (!ph) fail('phone');
  var c = cache(), fk = 'fail:' + ph;
  if (Number(c.get(fk) || 0) >= 8) fail('locked');
  return withLock(function () {
    var p = findPhone(readAll(SH_P, PC), ph);
    if (!p || hash(pass, p.salt) !== p.pass) { c.put(fk, String(Number(c.get(fk) || 0) + 1), 900); fail('wrong'); }
    if (p.status === 'Заблокований') fail('blocked');
    c.remove(fk);
    var token = newToken(p);
    p.lastLogin = now();
    write(SH_P, PC, p);
    return { ok: true, token: token, me: pubPartner(p), orders: myOrders(p) };
  });
};

function myOrders(p) {
  return readAll(SH_O, OC).filter(function (o) { return o.partnerId === p.id; }).map(pubOrder).reverse();
}

ACTIONS.p_me = function (b) {
  var p = auth(b);
  return { ok: true, me: pubPartner(p), orders: myOrders(p) };
};

ACTIONS.p_logout = function (b) {
  return withLock(function () {
    var p = auth(b), t = str(b.token, 80);
    p.tokens = JSON.stringify(json(p.tokens, []).filter(function (x) { return x.t !== t; }));
    write(SH_P, PC, p);
    return { ok: true };
  });
};

ACTIONS.p_anketa = function (b) {
  return withLock(function () {
    var p = auth(b), an = anketaIn(b);
    if (!an) fail('bad');
    var first = !p.anketaAt;
    p.anketa = JSON.stringify(an); p.anketaAt = now();
    write(SH_P, PC, p);
    var yes = Object.keys(an.answers).filter(function (k) { return an.answers[k].has; });
    notifyManager('📝 <b>Анкета в кабінеті' + (first ? '' : ' (оновлено)') + '</b>\n' + h(p.id + ' · ' + p.name + ' · +' + p.phone) + '\nПлатформ «так»: ' + yes.length + (yes.length ? ' (' + h(yes.join(', ')) + ')' : ''));
    return { ok: true, me: pubPartner(p) };
  });
};

ACTIONS.p_profile = function (b) {
  return withLock(function () {
    var p = auth(b);
    if (b.name !== undefined) { var n = str(b.name, 80); if (n.length < 2) fail('name'); p.name = n; }
    if (b.city !== undefined) p.city = str(b.city, 80);
    if (b.msg !== undefined) p.msg = str(b.msg, 80);
    if (b.payout !== undefined) p.payout = str(b.payout, 300);
    if (b.newPassword) {
      // у Telegram особу вже підтвердив сам Telegram — старий пароль не потрібен
      if (!p._tg && hash(String(b.oldPassword || ''), p.salt) !== p.pass) fail('wrong');
      if (String(b.newPassword).length < 6) fail('password');
      p.salt = Utilities.getUuid(); p.pass = hash(String(b.newPassword), p.salt);
    }
    write(SH_P, PC, p);
    return { ok: true, me: pubPartner(p) };
  });
};

ACTIONS.p_order = function (b) {
  var o = b.order || {};
  var key = str(b.key, 40);
  if (key) { var done = cache().get('key:' + key); if (done) return { ok: true, id: done, dup: true }; }
  var items = (o.items || []).slice(0, 50).map(function (x) {
    return { id: str(x.id, 40), name: str(x.name, 200), sku: str(x.sku, 60), q: Math.max(1, Math.min(9999, Math.round(num(x.q)))),
      price: Math.max(0, num(x.price)), sale: Math.max(0, num(x.sale)) };
  }).filter(function (x) { return x.name; });
  if (!items.length) fail('items');
  var ph = phoneNorm(o.phone);
  if (!ph) fail('phone');
  if (str(o.client).length < 2) fail('client');
  if (!str(o.city)) fail('city');
  return withLock(function () {
    var p = auth(b);
    if (key) { var d2 = cache().get('key:' + key); if (d2) return { ok: true, id: d2, dup: true }; }
    var m = marginOf(p), sale = 0, whole = 0;
    items.forEach(function (x) { sale += x.q * x.sale; whole += x.q * x.price * (1 - m / 100); });
    var all = readAll(SH_O, OC);
    var r = { id: nextId(all, 'Z', 1001), created: now(), updated: now(), partnerId: p.id, partner: p.name, status: 'Нове',
      client: str(o.client, 120), phone: ph, city: str(o.city, 120), delivery: str(o.delivery, 40), branch: str(o.branch, 80),
      pay: str(o.pay, 60), sale: Math.round(sale), whole: Math.round(whole), earn: Math.round(sale - whole), earnFinal: '',
      ttn: '', source: str(o.source, 60), note: str(o.note, 1000), comment: '', paidAt: '', items: JSON.stringify(items), key: key,
      via: b.via === 'tg' ? 'Telegram' : 'Сайт' };
    write(SH_O, OC, r);
    if (key) cache().put('key:' + key, r.id, 21600);
    notifyManager(orderCard(r, p), adminKb(r));
    if (p.tgId) toPartner(p, '✅ <b>Замовлення ' + h(r.id) + ' прийнято</b>\n' + h(r.client) + ', ' + h(r.city) + '\nСума для клієнта: ' + money(r.sale) +
      '\nВаш заробіток ≈ ' + money(r.earn) + '\n\nМенеджер перевірить наявність і підтвердить. Статус і ТТН прийдуть сюди.', appKb('Відкрити замовлення', 'o=' + r.id));
    return { ok: true, id: r.id, order: pubOrder(r) };
  });
};

ACTIONS.p_cancel = function (b) {
  return withLock(function () {
    var p = auth(b), id = str(b.id, 20), list = readAll(SH_O, OC);
    for (var i = 0; i < list.length; i++) if (list[i].id === id && list[i].partnerId === p.id) {
      if (list[i].status !== 'Нове') fail('state');
      list[i].status = 'Скасоване'; list[i].updated = now();
      write(SH_O, OC, list[i]);
      notifyManager('✖️ Партнер скасував замовлення <b>' + h(id) + '</b> (' + h(p.name) + ')');
      return { ok: true, order: pubOrder(list[i]) };
    }
    fail('notfound');
  });
};

// «Мої товари» — обрані партнером товари для продажу (id з каталогу)
ACTIONS.p_favs = function (b) {
  var L = (Array.isArray(b.favs) ? b.favs : []).map(function (x) { return str(x, 40); }).filter(String);
  var seen = {}; L = L.filter(function (x) { return seen[x] ? false : (seen[x] = 1); }).slice(0, 600);
  return withLock(function () {
    var p = auth(b);
    p.favs = JSON.stringify(L);
    write(SH_P, PC, p);
    return { ok: true, favs: L };
  });
};

// код для підключення Telegram з веб-кабінету: t.me/<бот>?start=link_<код>
ACTIONS.p_tgcode = function (b) {
  var p = auth(b), bu = botUser();
  if (!bu) fail('nobot');
  var c = code(10);
  cache().put('lnk:' + c, p.id, 900);
  return { ok: true, code: c, bot: bu, url: 'https://t.me/' + bu + '?start=link_' + c };
};

/* ---------------- Mini App у Telegram: вхід за підписом Telegram ---------------- */
function hex(bytes) { return bytes.map(function (x) { var v = (x < 0 ? x + 256 : x).toString(16); return v.length < 2 ? '0' + v : v; }).join(''); }
function qsDecode(s) { return decodeURIComponent(String(s).replace(/\+/g, '%20')); }
// перевірка initData за правилами Telegram: HMAC-SHA256(ключ = HMAC-SHA256("WebAppData", токен бота))
function tgUser(initData) {
  var token = prop('DROP_BOT_TOKEN');
  if (!token) fail('nobot');
  var s = String(initData || ''), map = {}, hs = '';
  if (!s || s.length > 8000) fail('tgauth');
  s.split('&').forEach(function (kv) {
    var i = kv.indexOf('=');
    if (i < 1) return;
    var k = qsDecode(kv.slice(0, i)), v = qsDecode(kv.slice(i + 1));
    if (k === 'hash') hs = v; else map[k] = v;
  });
  if (!hs) fail('tgauth');
  var dcs = Object.keys(map).sort().map(function (k) { return k + '=' + map[k]; }).join('\n');
  var secret = Utilities.computeHmacSha256Signature(Utilities.newBlob(token).getBytes(), Utilities.newBlob('WebAppData').getBytes());
  var sig = hex(Utilities.computeHmacSha256Signature(Utilities.newBlob(dcs).getBytes(), secret));
  if (sig !== hs) fail('tgauth');
  if (Date.now() / 1000 - Number(map.auth_date || 0) > 172800) fail('tgold');   // старше 2 діб — перевідкрити застосунок
  var u = json(map.user, null);
  if (!u || !u.id) fail('tgauth');
  return { id: String(u.id), name: str([u.first_name, u.last_name].filter(String).join(' '), 80), username: str(u.username, 40) };
}
function tgLabel(u) { return u.username ? '@' + u.username : u.name; }
function linkTg(list, p, u) {
  list.forEach(function (x) { if (x !== p && x.tgId === u.id) { x.tgId = ''; x.tgName = ''; write(SH_P, PC, x); } });
  p.tgId = u.id; p.tgName = tgLabel(u);
  if (!p.msg && u.username) p.msg = '@' + u.username;
}

ACTIONS.tg_auth = function (b) {
  var u = tgUser(b.initData);
  return withLock(function () {
    var list = readAll(SH_P, PC), p = findTg(list, u.id);
    if (!p) return { ok: true, linked: false, tg: { name: u.name, username: u.username } };
    if (p.status === 'Заблокований') fail('blocked');
    var token = newToken(p, true);
    p.lastLogin = now();
    if (p.tgName !== tgLabel(u)) p.tgName = tgLabel(u);
    write(SH_P, PC, p);
    return { ok: true, linked: true, token: token, me: pubPartner(p), orders: myOrders(p) };
  });
};

ACTIONS.tg_login = function (b) {
  var u = tgUser(b.initData), ph = phoneNorm(b.phone), pass = String(b.password || '');
  if (!ph) fail('phone');
  var c = cache(), fk = 'fail:' + ph;
  if (Number(c.get(fk) || 0) >= 8) fail('locked');
  return withLock(function () {
    var list = readAll(SH_P, PC), p = findPhone(list, ph);
    if (!p || hash(pass, p.salt) !== p.pass) { c.put(fk, String(Number(c.get(fk) || 0) + 1), 900); fail('wrong'); }
    if (p.status === 'Заблокований') fail('blocked');
    c.remove(fk);
    linkTg(list, p, u);
    var token = newToken(p, true);
    p.lastLogin = now();
    write(SH_P, PC, p);
    toPartner(p, '🔗 Telegram підключено до кабінету <b>' + h(p.id) + '</b>. Сюди приходитимуть статуси замовлень, ТТН і виплати.');
    return { ok: true, linked: true, token: token, me: pubPartner(p), orders: myOrders(p) };
  });
};

ACTIONS.tg_register = function (b) {
  var u = tgUser(b.initData), name = str(b.name, 80) || u.name, ph = phoneNorm(b.phone), pass = String(b.password || '');
  if (name.length < 2) fail('name');
  if (!ph) fail('phone');
  if (pass && (pass.length < 6 || pass.length > 100)) fail('password');
  if (tooMany('reg', 40, 3600)) fail('rate');
  return withLock(function () {
    var list = readAll(SH_P, PC);
    if (findPhone(list, ph)) fail('exists');
    var p = newPartner(list, { name: name, phone: ph, city: str(b.city, 80), msg: u.username ? '@' + u.username : '', password: pass || code(16), anketa: anketaIn(b) });
    linkTg(list, p, u);
    var token = newToken(p, true);
    write(SH_P, PC, p);
    notifyNewPartner(p, 'Telegram');
    toPartner(p, '🎉 <b>Вітаємо в партнерській програмі Samostroy Shop!</b>\nВаш кабінет: ' + h(p.id) + '.\n\nЯк почати:\n1. Оберіть товари й тексти в розділі «Товари для продажу».\n2. Розмістіть оголошення.\n3. Коли клієнт замовить — оформіть замовлення тут, у кабінеті. Ми все відправимо самі.',
      { inline_keyboard: [[{ text: '📱 Відкрити кабінет', web_app: { url: APP_URL } }], [{ text: '🛍 Товари для продажу', url: SITE + 'partners.html' }]] });
    return { ok: true, linked: true, token: token, me: pubPartner(p), orders: [] };
  });
};

ACTIONS.tg_unlink = function (b) {
  return withLock(function () {
    var p = auth(b);
    p.tgId = ''; p.tgName = '';
    p.tokens = JSON.stringify(json(p.tokens, []).filter(function (x) { return !x.tg; }));
    write(SH_P, PC, p);
    return { ok: true, me: pubPartner(p) };
  });
};

/* ---------------- адмінка ---------------- */
function admin(b) {
  var pass = prop('ADMIN_PASS'), c = cache();
  if (Number(c.get('afail') || 0) >= 10) fail('locked');
  if (!pass || String(b.pass || '') !== pass) { c.put('afail', String(Number(c.get('afail') || 0) + 1), 900); fail('auth'); }
}
function adminPartner(p) {
  var x = pubPartner(p); x.note = p.note; x.lastLogin = p.lastLogin; return x;
}
function hiddenList() {
  return readAll(SH_H, HC).map(function (x) { return { id: x.id, created: x.created, kind: x.kind, at: x.at, name: x.name, phone: x.phone, info: x.info }; });
}

ACTIONS.a_list = function (b) {
  admin(b);
  return { ok: true, partners: readAll(SH_P, PC).map(adminPartner), orders: readAll(SH_O, OC).map(pubOrder), statuses: STATUSES, levels: LEVELS,
    hidden: hiddenList(), bot: prop('BOT_USER') };
};

// зміна замовлення партнера (з адмінки або кнопками в Telegram) + повідомлення партнеру
function setOrder(o, ch) {
  var old = { status: o.status, ttn: o.ttn, comment: o.comment };
  if (ch.status !== undefined) { if (STATUSES.indexOf(ch.status) < 0) fail('status'); o.status = ch.status; }
  if (ch.ttn !== undefined) o.ttn = str(ch.ttn, 40).replace(/\s/g, '');
  if (ch.comment !== undefined) o.comment = str(ch.comment, 1000);
  if (ch.earnFinal !== undefined) o.earnFinal = ch.earnFinal === '' || ch.earnFinal === null ? '' : String(Math.round(num(ch.earnFinal)));
  if (o.status === 'Виплачено' && old.status !== 'Виплачено') o.paidAt = now();
  if (o.status !== 'Виплачено') o.paidAt = '';
  o.updated = now();
  write(SH_O, OC, o);
  tellPartner(o, old);
  return o;
}

ACTIONS.a_order = function (b) {
  admin(b);
  return withLock(function () {
    var id = str(b.id, 20), list = readAll(SH_O, OC);
    for (var i = 0; i < list.length; i++) if (list[i].id === id)
      return { ok: true, order: pubOrder(setOrder(list[i], { status: b.status, ttn: b.ttn, comment: b.comment, earnFinal: b.earnFinal })) };
    fail('notfound');
  });
};

ACTIONS.a_partner = function (b) {
  admin(b);
  return withLock(function () {
    var id = str(b.id, 20), list = readAll(SH_P, PC);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) {
      var p = list[i], oldLv = p.level || 'Starter';
      if (b.level !== undefined) { if (!LEVELS[b.level]) fail('level'); p.level = b.level; }
      if (b.status !== undefined) { if (['Активний', 'Заблокований'].indexOf(b.status) < 0) fail('status'); p.status = b.status; if (b.status === 'Заблокований') p.tokens = '[]'; }
      if (b.note !== undefined) p.note = str(b.note, 1000);
      write(SH_P, PC, p);
      if ((p.level || 'Starter') !== oldLv && LEVELS[p.level] > LEVELS[oldLv])
        toPartner(p, '🚀 <b>Новий рівень: ' + h(p.level) + '</b>\nТепер ваша маржа — ' + LEVELS[p.level] + '% від рекомендованої ціни. Дякуємо за роботу!');
      return { ok: true, partner: adminPartner(p) };
    }
    fail('notfound');
  });
};

ACTIONS.a_pay = function (b) {
  admin(b);
  return withLock(function () {
    var id = str(b.partnerId, 20), n = 0, sum = 0, ids = [], list = readAll(SH_O, OC);
    list.forEach(function (o) {
      if (o.partnerId === id && o.status === 'Отримане') { o.status = 'Виплачено'; o.paidAt = now(); o.updated = now(); n++; sum += earnOf(o); ids.push(o.id); write(SH_O, OC, o); }
    });
    if (n) { var p = findById(readAll(SH_P, PC), id); if (p) toPartner(p, '💸 <b>Виплачено ' + money(sum) + '</b>\nЗамовлення: ' + h(ids.join(', ')) + '.\nДякуємо за продажі!'); }
    return { ok: true, count: n, sum: sum };
  });
};
function findById(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }

ACTIONS.a_reset = function (b) {
  admin(b);
  return withLock(function () {
    var id = str(b.id, 20), list = readAll(SH_P, PC);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) {
      var p = list[i], temp = code(8);
      p.salt = Utilities.getUuid(); p.pass = hash(temp, p.salt); p.tokens = '[]';
      write(SH_P, PC, p);
      return { ok: true, password: temp };
    }
    fail('notfound');
  });
};

function archive(type, o) {
  var c = {}; Object.keys(o).forEach(function (k) { if (k !== '_r' && k !== 'pass' && k !== 'salt' && k !== 'tokens') c[k] = o[k]; });
  write(SH_A, AC, { at: now(), type: type, id: o.id, data: JSON.stringify(c).slice(0, 45000) });
}
ACTIONS.a_del_order = function (b) {
  admin(b);
  return withLock(function () {
    var o = findById(readAll(SH_O, OC), str(b.id, 20));
    if (!o) fail('notfound');
    archive('Замовлення партнера', o);
    delRow(SH_O, OC, o._r);
    return { ok: true, id: o.id };
  });
};
ACTIONS.a_del_partner = function (b) {
  admin(b);
  return withLock(function () {
    var p = findById(readAll(SH_P, PC), str(b.id, 20));
    if (!p) fail('notfound');
    archive('Партнер', p);
    delRow(SH_P, PC, p._r);
    return { ok: true, id: p.id };
  });
};

// видалення записів основної таблиці сайту (замовлення, заявки, відгуки): запис зникає з адмінки,
// а рядок лишається в таблиці сайту — тому номери нових замовлень не збиваються. Можна відновити.
ACTIONS.a_hidden = function (b) { admin(b); return { ok: true, hidden: hiddenList() }; };
ACTIONS.a_hide = function (b) {
  admin(b);
  var items = (b.items || []).slice(0, 500);
  if (!items.length) fail('bad');
  return withLock(function () {
    var have = {}, n = 0;
    readAll(SH_H, HC).forEach(function (x) { have[x.id + '|' + x.created] = 1; });
    items.forEach(function (x) {
      var r = { id: str(x.id, 40), created: str(x.created, 40), kind: str(x.kind, 40), at: now(), name: str(x.name, 120), phone: str(x.phone, 30), info: str(x.info, 2000) };
      if (!r.id || have[r.id + '|' + r.created]) return;
      write(SH_H, HC, r); have[r.id + '|' + r.created] = 1; n++;
    });
    return { ok: true, count: n, hidden: hiddenList() };
  });
};
ACTIONS.a_unhide = function (b) {
  admin(b);
  var ids = (b.ids || []).map(function (x) { return str(x, 40); });
  return withLock(function () {
    var L = readAll(SH_H, HC).filter(function (x) { return ids.indexOf(x.id) >= 0; });
    L.sort(function (a, c) { return c._r - a._r; }).forEach(function (x) { delRow(SH_H, HC, x._r); });
    return { ok: true, count: L.length, hidden: hiddenList() };
  });
};

// відповідь власника з адмін-бота (основний скрипт) → партнеру в бот партнерів
ACTIONS.a_tgsend = function (b) {
  admin(b);
  var chat = str(b.chat, 20), text = str(b.text, 3500);
  if (!/^\d+$/.test(chat) || !text) fail('bad');
  var r = send(chat, '💬 <b>Менеджер Samostroy Shop:</b>\n' + h(text));
  if (!r || !r.ok) fail('blocked');
  return { ok: true };
};

/* ---------------- адмінка → налаштування бота ---------------- */
ACTIONS.a_bot = function (b) {
  admin(b);
  var op = str(b.op, 20);
  if (!prop('DROP_BOT_TOKEN')) return { ok: true, token: false };
  if (op === 'setup') {
    var url = str(b.url, 300);
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url)) fail('url');
    var sec = prop('TG_SECRET') || (code(12) + code(12));
    setProp('TG_SECRET', sec);
    var r = bot('setWebhook', { url: url + '?tg=' + sec, allowed_updates: ['message', 'callback_query'], drop_pending_updates: true, max_connections: 10 });
    if (!r || !r.ok) return { ok: false, error: 'tg', msg: r && r.description || 'Telegram не відповів' };
    stopPolling();
    setProp('BOT_MODE', 'hook');
    botDecor();
  } else if (op === 'poll') {
    bot('deleteWebhook', { drop_pending_updates: false });
    stopPolling();
    ScriptApp.newTrigger('pollBot').timeBased().everyMinutes(1).create();
    setProp('BOT_MODE', 'poll');
    botDecor();
  } else if (op === 'admcode') {
    var c = code(10), bu = botUser();
    cache().put('adm:' + c, '1', 3600);
    return { ok: true, code: c, url: 'https://t.me/' + bu + '?start=adm_' + c, group: 'https://t.me/' + bu + '?startgroup=adm_' + c };
  } else if (op === 'admclear') {
    setProp('DROP_ADMIN_CHATS', '');
  } else if (op === 'test') {
    var n = notifyManager('✅ Тест: бот партнерів працює. Сюди приходитимуть нові замовлення партнерів з кнопками.');
    if (!n) fail('noadmin');
  }
  return botStatus();
};
function botStatus() {
  var me = bot('getMe', {}), wh = bot('getWebhookInfo', {}), w = wh && wh.result || {};
  if (me && me.ok) setProp('BOT_USER', me.result.username);
  return { ok: true, token: true, valid: !!(me && me.ok), user: me && me.ok ? me.result.username : '', name: me && me.ok ? me.result.first_name : '',
    mode: prop('BOT_MODE') || '', hook: !!w.url, pending: w.pending_update_count || 0, error: w.last_error_message || '',
    errorAt: w.last_error_date ? new Date(w.last_error_date * 1000).toISOString() : '', admins: adminChats().length, adminBot: !!(prop('TG_TOKEN') && prop('TG_CHAT')), app: APP_URL };
}
function botDecor() {
  bot('setChatMenuButton', { menu_button: { type: 'web_app', text: 'Кабінет', web_app: { url: APP_URL } } });
  bot('setMyCommands', { commands: [
    { command: 'start', description: 'Головне меню' }, { command: 'new', description: 'Нове замовлення' },
    { command: 'orders', description: 'Мої замовлення' }, { command: 'help', description: 'Як працювати й зв’язок з менеджером' }] });
  bot('setMyShortDescription', { short_description: 'Бот партнерів Samostroy Shop: замовлення для дропшипінгу, статуси, ТТН і заробіток.' });
  bot('setMyDescription', { description: 'Samostroy Drop — кабінет партнера Samostroy Shop у Telegram.\n\n• оформлюйте замовлення клієнтів за 1 хвилину\n• бачте статуси, ТТН і свій заробіток\n• отримуйте сповіщення про відправку й виплати\n\nНатисніть «Почати», щоб зареєструватися або увійти.' });
  var me = bot('getMe', {});
  if (me && me.ok) setProp('BOT_USER', me.result.username);
}
// без дозволу на «тригери» (ще не надано в редакторі) підключення бота все одно спрацює
function stopPolling() {
  try { ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'pollBot') ScriptApp.deleteTrigger(t); }); }
  catch (x) { console.error('triggers', x); }
}
/** Запустіть один раз у редакторі, якщо адмінка пише «Помилка скрипта кабінету»: Google попросить усі потрібні дозволи. */
function authorize() {
  ScriptApp.getProjectTriggers();
  console.log('Дозволи надано ✓ Бот партнерів: ' + (prop('DROP_BOT_TOKEN') ? 'токен є' : 'немає DROP_BOT_TOKEN') + '. Тепер натисніть «Підключити бота» в адмінці.');
}

/* ---------------- Telegram: виклики Bot API ---------------- */
function bot(method, payload) {
  var t = prop('DROP_BOT_TOKEN');
  if (!t) return null;
  try {
    var r = UrlFetchApp.fetch('https://api.telegram.org/bot' + t + '/' + method,
      { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload || {}), muteHttpExceptions: true });
    return json(r.getContentText(), null);
  } catch (x) { console.error(x); return null; }
}
function botUser() {
  var u = prop('BOT_USER');
  if (u || !prop('DROP_BOT_TOKEN')) return u;
  var me = bot('getMe', {});
  if (me && me.ok) { setProp('BOT_USER', me.result.username); return me.result.username; }
  return '';
}
function send(chat, text, kb, extra) {
  var p = { chat_id: chat, text: String(text).slice(0, 4000), parse_mode: 'HTML', disable_web_page_preview: true };
  if (kb) p.reply_markup = kb;
  if (extra) Object.keys(extra).forEach(function (k) { p[k] = extra[k]; });
  return bot('sendMessage', p);
}
function adminChats() { return prop('DROP_ADMIN_CHATS').split(',').filter(String); }
function appKb(text, hash) { return { inline_keyboard: [[{ text: '📱 ' + text, web_app: { url: APP_URL + (hash ? '#' + hash : '') } }]] }; }
function toPartner(p, text, kb) { if (p && p.tgId && prop('DROP_BOT_TOKEN')) send(p.tgId, text, kb || appKb('Відкрити кабінет')); }
// менеджеру: в адмін-бот магазину (TG_TOKEN/TG_CHAT) з кнопками; якщо підключено чат у боті партнерів — і туди
function notifyManager(text, kb) {
  var L = prop('DROP_BOT_TOKEN') ? adminChats() : [], n = 0;
  L.forEach(function (c) { var r = send(c, text, kb); if (r && r.ok) n++; });
  if (!n || prop('TG_TOKEN')) n += tgAdmin(text, kb);
  return n;
}
function managerReachable() { return adminChats().length > 0 || !!(prop('TG_TOKEN') && prop('TG_CHAT')); }
function notifyNewPartner(p, where) {
  notifyManager('🤝 <b>Новий партнер</b> (' + where + ')\n' + h(p.id + ' · ' + p.name) + '\nТелефон: +' + h(p.phone) + (p.city ? '\nМісто: ' + h(p.city) : '') +
    (p.msg ? '\nЗв’язок: ' + h(p.msg) : '') + '\nАнкета: ' + (p.anketaAt ? 'заповнена' : 'ще ні'));
}
function orderCard(r, p) {
  var items = json(r.items, []);
  return '📦 <b>Замовлення партнера ' + h(r.id) + '</b>' + (r.via === 'Telegram' ? ' · з Telegram' : '') + '\nПартнер: ' + h(p.name) + ' (' + h(p.id) + ', ' + h(p.level || 'Starter') + ')' + (p.tgName ? ' ' + h(p.tgName) : '') + '\n\n' +
    items.map(function (x, i) { return (i + 1) + '. ' + h(x.name) + (x.sku ? ' (' + h(x.sku) + ')' : '') + ' × ' + x.q + ' — ' + money(x.sale * x.q); }).join('\n') +
    '\n\nСума для клієнта: <b>' + money(num(r.sale)) + '</b>\nКлієнт: ' + h(r.client) + ', +' + h(r.phone) + '\nДоставка: ' + h([r.delivery, r.city, r.branch].filter(String).join(', ')) +
    '\nОплата: ' + h(r.pay || '—') + (r.note ? '\nКоментар: ' + h(r.note) : '');
}
function adminKb(o) {
  var id = o.id, row = [];
  if (o.status === 'Нове') row = [{ text: '✅ Підтвердити', callback_data: 'a|c|' + id }, { text: '❌ Скасувати', callback_data: 'a|x|' + id }];
  else if (o.status === 'Підтверджене') row = [{ text: '🚚 Відправлено · ТТН', callback_data: 'a|s|' + id }, { text: '❌ Скасувати', callback_data: 'a|x|' + id }];
  else if (o.status === 'Відправлене') row = [{ text: '📬 Отримане', callback_data: 'a|g|' + id }, { text: '↩️ Повернення', callback_data: 'a|v|' + id }];
  var kb = [];
  if (row.length) kb.push(row);
  kb.push([{ text: 'Відкрити в адмінці', url: SITE + 'admin.html#partners' }]);
  return { inline_keyboard: kb };
}
var TELL = {
  'Підтверджене': function (o) { return '👍 <b>Замовлення ' + h(o.id) + ' підтверджено</b> — готуємо до відправки.'; },
  'Відправлене': function (o) { return '🚚 <b>Замовлення ' + h(o.id) + ' відправлено</b>' + (o.ttn ? '\nТТН: <code>' + h(o.ttn) + '</code> — перешліть клієнту.' : ''); },
  'Отримане': function (o) { return '📬 <b>Клієнт забрав замовлення ' + h(o.id) + '</b>\nЗаробіток ' + money(earnOf(o)) + ' — до виплати.'; },
  'Виплачено': function (o) { return '💸 <b>Заробіток за ' + h(o.id) + ' виплачено:</b> ' + money(earnOf(o)) + '.'; },
  'Скасоване': function (o) { return '✖️ <b>Замовлення ' + h(o.id) + ' скасовано.</b>'; },
  'Повернення': function (o) { return '↩️ <b>Замовлення ' + h(o.id) + ': повернення</b> — клієнт не забрав посилку.'; }
};
function tellPartner(o, old) {
  if (!prop('DROP_BOT_TOKEN')) return;
  var lines = [];
  if (o.status !== old.status && TELL[o.status]) lines.push(TELL[o.status](o));
  else if (o.ttn && o.ttn !== old.ttn) lines.push('🚚 ТТН для замовлення <b>' + h(o.id) + '</b>: <code>' + h(o.ttn) + '</code>');
  if (o.comment && o.comment !== old.comment) lines.push('💬 Менеджер: ' + h(o.comment));
  if (!lines.length) return;
  var p = findById(readAll(SH_P, PC), o.partnerId);
  if (!p || !p.tgId) return;
  var kb = [[{ text: '📱 Відкрити замовлення', web_app: { url: APP_URL + '#o=' + o.id } }]];
  if (o.ttn && (o.status === 'Відправлене' || o.ttn !== old.ttn)) kb.push([{ text: 'Відстежити посилку', url: track(o) }]);
  send(p.tgId, lines.join('\n\n'), { inline_keyboard: kb });
}

/* ---------------- Telegram: приймання оновлень ---------------- */
function botWebhook(e) {
  try {
    if (prop('TG_SECRET') && e.parameter.tg === prop('TG_SECRET')) {
      var u = json(e.postData && e.postData.contents, null);
      if (u && u.update_id) handleOnce(u);
    }
  } catch (x) { console.error(x && x.stack || x); }
  // HtmlService відповідає Telegram одразу кодом 200 (ContentService дав би переадресацію 302)
  return HtmlService.createHtmlOutput('ok');
}
function handleOnce(u) {
  var c = cache(), k = 'u:' + u.update_id;
  if (c.get(k)) return;
  c.put(k, '1', 21600);
  try { onUpdate(u); } catch (x) { console.error(x && x.stack || x); }
}
// запасний режим без вебхука: щохвилини забирає нові повідомлення (кнопка «Резервний режим» в адмінці)
function pollBot() {
  var c = cache();
  if (c.get('polling')) return;
  c.put('polling', '1', 70);
  try {
    var off = Number(prop('BOT_OFFSET') || 0), end = Date.now() + 50000;
    while (Date.now() < end) {
      var r = bot('getUpdates', { offset: off, timeout: 0, limit: 50, allowed_updates: ['message', 'callback_query'] });
      if (!r || !r.ok || !r.result.length) break;
      r.result.forEach(function (u) { off = u.update_id + 1; setProp('BOT_OFFSET', off); handleOnce(u); });
    }
  } finally { c.remove('polling'); }
}
function onUpdate(u) {
  if (u.callback_query) return onCallback(u.callback_query);
  if (u.message) return onMessage(u.message);
}
function partnerByTg(id) { return findTg(readAll(SH_P, PC), id); }
function welcome(chat, p) {
  if (p) return send(chat, '👋 <b>' + h(p.name.split(' ')[0]) + ', вітаємо в Samostroy Drop!</b>\nКабінет ' + h(p.id) + ' · рівень ' + h(p.level || 'Starter') + ' (' + marginOf(p) + '%).\n\nОформлюйте замовлення клієнтів, стежте за статусами, ТТН і заробітком. Питання — просто напишіть сюди, відповість менеджер.',
    { inline_keyboard: [[{ text: '📱 Відкрити кабінет', web_app: { url: APP_URL } }], [{ text: '➕ Нове замовлення', web_app: { url: APP_URL + '#new' } }],
      [{ text: '📦 Мої замовлення', callback_data: 'my' }, { text: '🛍 Товари', url: SITE + 'partners.html' }]] });
  return send(chat, '👋 <b>Samostroy Drop — бот партнерів Samostroy Shop</b>\nПродавайте самоклеючі 3D панелі, плитку, плівку й інші товари без вкладень: ви знаходите клієнта, ми пакуємо й відправляємо, ви отримуєте різницю в ціні.\n\nНатисніть «Відкрити кабінет», щоб зареєструватися за 1 хвилину або увійти в наявний кабінет.',
    { inline_keyboard: [[{ text: '📱 Відкрити кабінет', web_app: { url: APP_URL } }], [{ text: 'Як це працює', url: SITE + 'dropshipping.html' }, { text: 'Менеджер', url: 'https://t.me/' + MANAGER }]] });
}
function ordersText(p) {
  var L = myOrders(p).slice(0, 8);
  if (!L.length) return 'Замовлень ще немає. Натисніть «Нове замовлення», коли клієнт буде готовий.';
  return '📦 <b>Останні замовлення</b>\n\n' + L.map(function (o) {
    return '<b>' + h(o.id) + '</b> · ' + h(o.status) + '\n' + h(o.client) + ', ' + h(o.city) + ' · ' + money(o.sale) + ' · +' + money(o.earnNow) + (o.ttn ? '\nТТН <code>' + h(o.ttn) + '</code>' : '');
  }).join('\n\n');
}
function onMessage(m) {
  var chat = String(m.chat.id), from = m.from || {}, text = String(m.text || '').trim(), priv = m.chat.type === 'private';
  var isAdm = adminChats().indexOf(chat) >= 0, cmd = (text.match(/^\/(\w+)(?:@\w+)?(?:\s+(.+))?$/) || []);
  if (cmd[1] === 'start' && cmd[2] && /^adm_/.test(cmd[2])) {
    var ac = cmd[2].slice(4);
    if (!cache().get('adm:' + ac)) return send(chat, 'Посилання застаріло. Створіть нове в адмінці → Налаштування → «Бот партнерів».');
    cache().remove('adm:' + ac);
    if (!isAdm) setProp('DROP_ADMIN_CHATS', adminChats().concat([chat]).join(','));
    return send(chat, '✅ Цей чат підключено для менеджера.\nСюди приходитимуть нові партнери, замовлення партнерів з кнопками «Підтвердити / Відправлено / Скасувати» і повідомлення від партнерів.\n\nЩоб відповісти партнеру — відповідайте (Reply) на його повідомлення.');
  }
  if (cmd[1] === 'id') return send(chat, 'ID цього чату: <code>' + h(chat) + '</code>');
  if (isAdm && !priv || isAdm && m.reply_to_message) return onAdmin(m, chat, text);
  if (!priv) return;
  var p = partnerByTg(from.id);
  if (cmd[1] === 'start' && cmd[2] && /^link_/.test(cmd[2])) {
    var pid = cache().get('lnk:' + cmd[2].slice(5));
    if (!pid) return send(chat, 'Посилання застаріло. Відкрийте особистий кабінет на сайті й натисніть «Підключити Telegram» ще раз.');
    return withLock(function () {
      var list = readAll(SH_P, PC), x = findById(list, pid);
      if (!x) return send(chat, 'Кабінет не знайдено.');
      linkTg(list, x, { id: String(from.id), name: [from.first_name, from.last_name].filter(String).join(' '), username: from.username || '' });
      write(SH_P, PC, x);
      cache().remove('lnk:' + cmd[2].slice(5));
      send(chat, '🔗 Telegram підключено до кабінету <b>' + h(x.id) + '</b>. Тепер статуси замовлень, ТТН і виплати приходитимуть сюди.');
      return welcome(chat, x);
    });
  }
  if (cmd[1] === 'start') return welcome(chat, p);
  if (cmd[1] === 'new') return send(chat, p ? 'Оформіть замовлення клієнта:' : 'Спершу відкрийте кабінет і зареєструйтесь:', appKb(p ? 'Нове замовлення' : 'Відкрити кабінет', p ? 'new' : ''));
  if (cmd[1] === 'orders') return p ? send(chat, ordersText(p), appKb('Усі замовлення', 'orders')) : welcome(chat, null);
  if (cmd[1] === 'help') return send(chat, '<b>Як працювати</b>\n1. Оберіть товари для продажу й розмістіть оголошення.\n2. Клієнт замовив — «Нове замовлення» в кабінеті: товари, ваша ціна, дані клієнта.\n3. Менеджер підтверджує, ми відправляємо, ТТН приходить сюди.\n4. Клієнт забрав посилку — заробіток переходить «до виплати».\n\nПитання — напишіть повідомлення в цей чат, відповість менеджер. Або @' + MANAGER + '.',
    { inline_keyboard: [[{ text: '📱 Відкрити кабінет', web_app: { url: APP_URL } }], [{ text: '🎓 Академія партнера', url: SITE + 'academy.html' }]] });
  if (cmd[1]) return welcome(chat, p);
  // звичайне повідомлення — менеджеру
  var L = adminChats();
  if (!managerReachable()) return send(chat, 'Напишіть, будь ласка, менеджеру: @' + MANAGER, { inline_keyboard: [[{ text: 'Написати менеджеру', url: 'https://t.me/' + MANAGER }]] });
  var who = p ? h(p.name) + ' · ' + h(p.id) + ' · +' + h(p.phone) : h([from.first_name, from.last_name].filter(String).join(' ')) + ' (ще не партнер)';
  var head = '💬 <b>Повідомлення від партнера</b>\n' + who + (from.username ? ' · @' + h(from.username) : '') + '\n#u' + from.id;
  var note = '\n\n<i>Відповідайте (Reply) на це повідомлення — відповідь піде партнеру.</i>';
  L.forEach(function (c) {
    if (text) send(c, head + '\n\n' + h(text) + note);
    else bot('copyMessage', { chat_id: c, from_chat_id: chat, message_id: m.message_id, caption: plain(head) + (m.caption ? '\n\n' + m.caption : ''), });
  });
  if (prop('TG_TOKEN')) tgAdmin(head.replace('Повідомлення від партнера', 'Партнер пише в бот') + '\n\n' + (text ? h(text) : (m.caption ? h(m.caption) + '\n' : '') +
    '📎 <i>надіслав ' + (m.photo ? 'фото' : m.document ? 'файл' : m.voice ? 'голосове' : 'вкладення') + ' — його видно лише в боті партнерів; попросіть описати текстом</i>') + note);
  return send(chat, '✅ Передали менеджеру. Відповідь прийде сюди.');
}
function onAdmin(m, chat, text) {
  var rt = m.reply_to_message, src = rt ? String(rt.text || rt.caption || '') : '';
  if (!rt || !text) return;
  var t = src.match(/ТТН для замовлення (Z\d+)/);
  if (t) {
    var ttn = text.replace(/[^\d]/g, '');
    if (ttn.length < 8) return send(chat, 'Це не схоже на номер ТТН. Надішліть лише цифри, напр. 20450012345678.', null, { reply_to_message_id: m.message_id });
    return withLock(function () {
      var o = findById(readAll(SH_O, OC), t[1]);
      if (!o) return send(chat, 'Замовлення ' + t[1] + ' не знайдено.');
      setOrder(o, { status: 'Відправлене', ttn: ttn });
      return send(chat, '🚚 ' + h(o.id) + ': відправлено, ТТН <code>' + h(ttn) + '</code>. Партнер отримав сповіщення.', adminKb(o));
    });
  }
  var u = src.match(/#u(\d+)/);
  if (u) {
    var r = send(u[1], '💬 <b>Менеджер Samostroy Shop:</b>\n' + h(text));
    return send(chat, r && r.ok ? '✅ Відповідь надіслано партнеру.' : '⚠️ Не вдалося надіслати: партнер зупинив бота.', null, { reply_to_message_id: m.message_id });
  }
}
function onCallback(q) {
  var d = String(q.data || '').split('|'), chat = String(q.message && q.message.chat.id || q.from.id), ans = '';
  if (d[0] === 'my') {
    var p = partnerByTg(q.from.id);
    if (p) send(chat, ordersText(p), appKb('Усі замовлення', 'orders')); else welcome(chat, null);
  } else if (d[0] === 'a') {
    if (adminChats().indexOf(chat) < 0) ans = 'Немає доступу';
    else ans = withLock(function () {
      var o = findById(readAll(SH_O, OC), d[2]);
      if (!o) return 'Замовлення не знайдено';
      if (d[1] === 's') {
        send(chat, '🚚 Впишіть ТТН для замовлення ' + o.id + ' — надішліть номер відповіддю на це повідомлення.', { force_reply: true, input_field_placeholder: 'Номер ТТН' });
        return 'Чекаю ТТН';
      }
      var to = { c: 'Підтверджене', x: 'Скасоване', g: 'Отримане', v: 'Повернення' }[d[1]];
      if (!to) return '';
      if (o.status === to) return 'Вже: ' + to;
      setOrder(o, { status: to });
      var who = q.from.username ? '@' + q.from.username : (q.from.first_name || '');
      bot('editMessageText', { chat_id: chat, message_id: q.message.message_id, text: String(q.message.text || '').slice(0, 3700) + '\n\n➜ ' + to + ' · ' + who + ' · ' + Utilities.formatDate(new Date(), 'Europe/Kyiv', 'dd.MM HH:mm'),
        reply_markup: adminKb(o), disable_web_page_preview: true });
      return 'Статус: ' + to + '. Партнеру надіслано сповіщення';
    });
  }
  bot('answerCallbackQuery', { callback_query_id: q.id, text: ans || '' });
}
