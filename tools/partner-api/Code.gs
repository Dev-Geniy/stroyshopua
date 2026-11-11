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
 * Реферальна програма — налаштування REF нижче, опис у РЕФЕРАЛЬНА-ПРОГРАМА.md.
 * Інструкції з запуску — ЯК-ЗАПУСТИТИ.md і ЯК-ЗАПУСТИТИ-БОТА.md поруч.
 */

// Маржа партнера за рівнем, % від рекомендованої ціни (як у калькуляторі кабінету на сайті)
var LEVELS = { Starter: 10, Pro: 15, Team: 20 };
// Реферальна програма (тиха): бонус платить магазин, запрошений нічого не втрачає. Лише 1 рівень, лише отримані замовлення.
// first — % від заробітку запрошеного перші `months` місяців; then — далі, поки він активний (без перерви в замовленнях понад activeDays днів).
var REF = { first: 20, then: 10, months: 6, activeDays: 90 };
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
  ['tgId', 'Telegram ID'], ['tgName', 'Telegram'], ['favs', 'Мої товари'], ['onb', 'Поради в боті'], ['ref', 'Запросив (ID)']];
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
// бонуси за рекомендації: один рядок на замовлення запрошеного партнера
var RC = [['order', '№ замовлення'], ['created', 'Нараховано'], ['refId', 'Отримує (ID)'], ['refName', 'Отримує'], ['partnerId', 'Запрошений (ID)'],
  ['partner', 'Запрошений'], ['earn', 'Заробіток запрошеного'], ['pct', '%'], ['bonus', 'Бонус'], ['status', 'Статус'], ['paidAt', 'Виплачено']];
var SH_P = 'Партнери', SH_O = 'Замовлення партнерів', SH_H = 'Видалені записи сайту', SH_A = 'Архів видаленого', SH_R = 'Бонуси за рекомендації';

/* ---------------- вхід ---------------- */
function doGet(e) {
  if (e && e.parameter && e.parameter.health) {   // для сторожа (.github/workflows/watchdog.yml): таблиця відкривається
    try { return out({ ok: true, service: 'samostroy-partners', health: true, rows: SpreadsheetApp.getActiveSpreadsheet().getSheets().length }); }
    catch (x) { return out({ ok: false, service: 'samostroy-partners', health: true, error: String(x && x.message || x).slice(0, 200) }); }
  }
  return out({ ok: true, service: 'samostroy-partners' });
}
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
    lastLogin: now(), pass: hash(f.password, salt), salt: salt, tokens: '[]', tgId: f.tgId || '', tgName: f.tgName || '', ref: f.ref || '' };
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
    var p = newPartner(list, { name: name, phone: ph, city: str(b.city, 80), msg: str(b.msg, 80), password: pass, anketa: an, ref: refCheck(list, b.ref, ph, '') });
    var token = newToken(p);
    write(SH_P, PC, p);
    notifyNewPartner(p, 'сайт');
    refJoined(list, p);
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
    return makeOrder(p, o, items, ph, key, b.via === 'tg' ? 'Telegram' : 'Сайт');
  });
};
// створення замовлення партнера (з кабінету, Telegram або вітрини) — однаково для всіх каналів
function makeOrder(p, o, items, ph, key, via) {
    if (key) { var d2 = cache().get('key:' + key); if (d2) return { ok: true, id: d2, dup: true }; }
    var m = marginOf(p), sale = 0, whole = 0;
    items.forEach(function (x) { sale += x.q * x.sale; whole += x.q * x.price * (1 - m / 100); });
    var all = readAll(SH_O, OC);
    var r = { id: nextId(all, 'Z', 1001), created: now(), updated: now(), partnerId: p.id, partner: p.name, status: 'Нове',
      client: str(o.client, 120), phone: ph, city: str(o.city, 120), delivery: str(o.delivery, 40), branch: str(o.branch, 80),
      pay: str(o.pay, 60), sale: Math.round(sale), whole: Math.round(whole), earn: Math.round(sale - whole), earnFinal: '',
      ttn: '', source: str(o.source, 60), note: str(o.note, 1000), comment: '', paidAt: '', items: JSON.stringify(items), key: key,
      via: via };
    write(SH_O, OC, r);
    if (key) cache().put('key:' + key, r.id, 21600);
    notifyManager(orderCard(r, p), adminKb(r));
    if (p.tgId) toPartner(p, '✅ <b>Замовлення ' + h(r.id) + ' прийнято</b>\n' + h(r.client) + ', ' + h(r.city) + '\nСума для клієнта: ' + money(r.sale) +
      '\nВаш заробіток ≈ ' + money(r.earn) + (via === 'Вітрина' ? '\nДжерело: ваша вітрина' : '') + '\n\nМенеджер перевірить наявність і підтвердить. Статус і ТТН прийдуть сюди.', appKb('Відкрити замовлення', 'o=' + r.id));
    award(p.id);                                       // після «прийнято» — привітання зі значком
    return { ok: true, id: r.id, order: pubOrder(r) };
}

/* ---------------- вітрини партнерів (окремий модуль v/ і tools/vitryna-api) ----------------
   Скрипт вітрин сам перевіряє ціни й товари й передає сюди готове замовлення. Якщо модуль вітрин прибрати — ця дія просто не викликається. */
ACTIONS.ext_order = function (b) {
  admin(b);
  var o = b.order || {}, key = str(b.key, 40), pid = str(b.partnerId, 20);
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
    var p = findById(readAll(SH_P, PC), pid);
    if (!p) fail('notfound');
    if (p.status === 'Заблокований') fail('blocked');
    return makeOrder(p, o, items, ph, key, 'Вітрина');
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
    var p = newPartner(list, { name: name, phone: ph, city: str(b.city, 80), msg: u.username ? '@' + u.username : '', password: pass || code(16), anketa: anketaIn(b),
      ref: refCheck(list, b.ref || refPending(u.id), ph, u.id) });
    linkTg(list, p, u);
    var token = newToken(p, true);
    write(SH_P, PC, p);
    notifyNewPartner(p, 'Telegram');
    refJoined(list, p);
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
  var x = pubPartner(p); x.note = p.note; x.lastLogin = p.lastLogin; x.ref = p.ref || ''; return x;
}
function hiddenList() {
  return readAll(SH_H, HC).map(function (x) { return { id: x.id, created: x.created, kind: x.kind, at: x.at, name: x.name, phone: x.phone, info: x.info }; });
}

ACTIONS.a_list = function (b) {
  admin(b);
  return { ok: true, partners: readAll(SH_P, PC).map(adminPartner), orders: readAll(SH_O, OC).map(pubOrder), statuses: STATUSES, levels: LEVELS,
    hidden: hiddenList(), bot: prop('BOT_USER'), refs: readAll(SH_R, RC).map(pubRef), ref: REF };
};

// зміна замовлення партнера (з адмінки або кнопками в Telegram) + повідомлення партнеру
function setOrder(o, ch) {
  var old = { status: o.status, ttn: o.ttn, comment: o.comment, earnFinal: o.earnFinal };
  if (ch.status !== undefined) { if (STATUSES.indexOf(ch.status) < 0) fail('status'); o.status = ch.status; }
  if (ch.ttn !== undefined) o.ttn = str(ch.ttn, 40).replace(/\s/g, '');
  if (ch.comment !== undefined) o.comment = str(ch.comment, 1000);
  if (ch.earnFinal !== undefined) o.earnFinal = ch.earnFinal === '' || ch.earnFinal === null ? '' : String(Math.round(num(ch.earnFinal)));
  if (o.status === 'Виплачено' && old.status !== 'Виплачено') o.paidAt = now();
  if (o.status !== 'Виплачено') o.paidAt = '';
  o.updated = now();
  write(SH_O, OC, o);
  tellPartner(o, old);
  if (o.status !== old.status) award(o.partnerId);
  if (o.status !== old.status || o.earnFinal !== old.earnFinal) refSync(o);
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
      if (b.ref !== undefined && str(b.ref, 20).toUpperCase() !== (p.ref || '')) {       // змінити запрошувача може лише адміністратор
        var nr = str(b.ref, 20).toUpperCase();
        if (nr && (nr === p.id || !findById(list, nr))) fail('ref');
        p.ref = nr;
      }
      write(SH_P, PC, p);
      if ((p.level || 'Starter') !== oldLv && LEVELS[p.level] > LEVELS[oldLv])
        toPartner(p, '🚀 <b>Вітаємо з новим рівнем: ' + h(p.level) + '!</b>\nТепер ваша маржа — <b>' + LEVELS[p.level] + '%</b> від рекомендованої ціни: з кожного замовлення ви заробляєте більше.\n\n🏅 Новий значок «' + (p.level === 'Team' ? '🏢 Рівень Team' : '🚀 Рівень Pro') + '» уже в кабінеті. Дякуємо за роботу!',
          { inline_keyboard: [[{ text: '📱 Кабінет', web_app: { url: APP_URL } }, { text: '⚙️ Налаштування', callback_data: 'set|show' }]] });
      return { ok: true, partner: adminPartner(p) };
    }
    fail('notfound');
  });
};

ACTIONS.a_pay = function (b) {
  admin(b);
  return withLock(function () {
    var id = str(b.partnerId, 20), n = 0, sum = 0, ids = [], list = readAll(SH_O, OC), rb = 0, rn = 0;
    list.forEach(function (o) {
      if (o.partnerId === id && o.status === 'Отримане') { o.status = 'Виплачено'; o.paidAt = now(); o.updated = now(); n++; sum += earnOf(o); ids.push(o.id); write(SH_O, OC, o); }
    });
    readAll(SH_R, RC).forEach(function (r) {               // бонуси за рекомендації — разом зі звичайною виплатою
      if (r.refId === id && r.status === 'До виплати') { r.status = 'Виплачено'; r.paidAt = now(); rb += num(r.bonus); rn++; write(SH_R, RC, r); }
    });
    if (n || rn) {
      var p = findById(readAll(SH_P, PC), id);
      if (p) toPartner(p, '💸 <b>Виплачено ' + money(sum + rb) + '</b>' + (n ? '\nЗамовлення: ' + h(ids.join(', ')) + (rb ? ' — ' + money(sum) : '') + '.' : '') +
        (rb ? '\n🤝 Бонуси за рекомендації: ' + money(rb) + '.' : '') + '\nДякуємо за продажі!');
    }
    return { ok: true, count: n, sum: sum + rb, bonus: rb, bonusCount: rn };
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
    readAll(SH_R, RC).forEach(function (r) { if (r.order === o.id && r.status === 'До виплати') { r.status = 'Скасовано'; write(SH_R, RC, r); } });
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
    (p.msg ? '\nЗв’язок: ' + h(p.msg) : '') + '\nАнкета: ' + (p.anketaAt ? 'заповнена' : 'ще ні') + (p.ref ? '\n🤝 За рекомендацією партнера ' + h(p.ref) : ''));
}
function orderCard(r, p) {
  var items = json(r.items, []);
  return '📦 <b>Замовлення партнера ' + h(r.id) + '</b>' + (r.via === 'Telegram' ? ' · з Telegram' : r.via === 'Вітрина' ? ' · 🏪 з вітрини' + (r.source ? ' (' + h(r.source.replace(/^Вітрина\s*/, '')) + ')' : '') : '') + '\nПартнер: ' + h(p.name) + ' (' + h(p.id) + ', ' + h(p.level || 'Starter') + ')' + (p.tgName ? ' ' + h(p.tgName) : '') + '\n\n' +
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
  if (cmd[1] === 'settings' && priv) return settingsShow(chat, from.id);
  if ((cmd[1] === 'tips' || cmd[1] === 'summary') && priv) { var on = !(cmd[2] && /^(off|ні|вимк)/i.test(cmd[2])); return send(chat, onbToggle(from.id, on, cmd[1] === 'summary' ? 'sum' : 'tips')); }
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
  if (cmd[1] === 'start' && cmd[2] && /^r_P\d{3,7}$/i.test(cmd[2]) && !p) refKeep(from.id, cmd[2].slice(2).toUpperCase());
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
  if (d[0] === 'set') ans = settingsCb(q, chat, d);
  else if (d[0] === 'onb' || d[0] === 'sum') ans = onbToggle(q.from.id, d[1] === 'on', d[0] === 'sum' ? 'sum' : 'tips');
  else if (d[0] === 'my') {
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

/* ---------------- резервна копія таблиці раз на тиждень ----------------
   Один раз запустіть setupBackup (▶ Виконати → дозволи): щонеділі близько 03:00 у Google Диску, у папці
   «Samostroy — резервні копії», з’являтиметься копія цієї таблиці. Зберігаються останні 8 копій (≈ 2 місяці).
   backupNow — зробити копію зараз. Відновлення: відкрийте потрібну копію → Файл → Створити копію / скопіюйте аркуш назад. */
var BACKUP_FOLDER = 'Samostroy — резервні копії', BACKUP_KEEP = 8;
function backupNow() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), it = DriveApp.getFoldersByName(BACKUP_FOLDER);
  var folder = it.hasNext() ? it.next() : DriveApp.createFolder(BACKUP_FOLDER);
  var prefix = 'Копія · ' + ss.getName() + ' · ';
  var name = prefix + Utilities.formatDate(new Date(), 'Europe/Kiev', 'yyyy-MM-dd HH:mm');
  DriveApp.getFileById(ss.getId()).makeCopy(name, folder);
  var list = [], files = folder.getFiles();
  while (files.hasNext()) { var f = files.next(); if (f.getName().indexOf(prefix) === 0) list.push(f); }
  list.sort(function (a, b) { return b.getDateCreated().getTime() - a.getDateCreated().getTime(); });
  list.slice(BACKUP_KEEP).forEach(function (f) { f.setTrashed(true); });
  console.log('✓ Копію збережено: «' + name + '» (папка «' + BACKUP_FOLDER + '», зберігаються ' + BACKUP_KEEP + ' останніх)');
  return name;
}
function backupWeekly() {
  try { backupNow(); }
  catch (x) {
    var nm = ''; try { nm = SpreadsheetApp.getActiveSpreadsheet().getName(); } catch (y) { }
    try { tgAdmin('💾 <b>Не вдалося зробити резервну копію</b> таблиці «' + nm + '»\n' + String(x && x.message || x).slice(0, 300) + '\nApps Script → «Виконання» — там деталі. Найчастіше допомагає ще раз запустити setupBackup.'); } catch (y) { }
    throw x;
  }
}
function setupBackup() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'backupWeekly') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('backupWeekly').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(3).inTimezone('Europe/Kiev').create();
  var n = backupNow();
  console.log('✓ Щотижнева резервна копія увімкнена: щонеділі близько 03:00. Першу копію вже зроблено: «' + n + '»');
}

/* ================= Навчання в Drop-боті: 7 днів по кроку, далі урок тижня (≈ 6 місяців) =================
   Один раз запустіть setupOnboarding (▶ Виконати). Щодня об 11:00 (Київ) бот надсилає партнерам, які підключили Telegram:
   • новим — 7 днів по одному короткому кроку з посиланням на урок, кабінет і менеджера;
   • далі (і всім, хто зареєструвався раніше) — щопонеділка одне повідомлення: сводка тижня (продажі, заробіток, хіти, сезон, новинки)
     + «урок тижня» (52 уроки, потім по колу «Корисно повторити»). summaryPreview — подивитися сводку.
   Партнер вимикає кнопкою «🔕 Не надсилати поради» або командою /tips off (увімкнути — /tips).
   onbPreview — 7 кроків і 2 перші уроки тижня вам у бот партнерів; onbPreviewAll — усі 52 уроки тижня. */
var COURSE = SITE + 'course-dropshipping.html#l=', SALES = SITE + 'course-sales3.html#l=', VIT = SITE + 'course-vitryna.html#l=', BLOG = SITE + 'blog/';
var ONB_D = [
  { t: '🎯 Крок 1 з 7. Оберіть 5–10 товарів', x: 'Почніть з однієї теми: панелі для кухні, плитка для ванної або дитячі килимки. Легше продавати те, що зрозуміло вам самим.\n\n<b>Завдання:</b> відкрийте «Товари для продажу», додайте 5–10 товарів у ⭐ «Мої товари» в кабінеті.',
    b: [['🛍 Товари для продажу', SITE + 'partners.html'], ['🎓 Урок: вибір ніші', COURSE + 'm1l2']], app: 'cat' },
  { t: '📣 Крок 2 з 7. Перші оголошення', x: 'Розмістіть 3–5 оголошень на OLX, у Facebook Marketplace чи в місцевих групах. Фото й готові тексти беріть у розділі «Товари для продажу».\n\n<b>Завдання:</b> сьогодні — хоча б 3 оголошення.',
    b: [['🎓 Урок: де розміщувати оголошення', COURSE + 'm2l2'], ['📖 Як продавати на OLX без складу', BLOG + 'yak-prodavaty-na-olx-bez-skladu.html']] },
  { t: '💬 Крок 3 з 7. Відповідайте так, щоб купували', x: 'Перші 5 хвилин вирішують усе: хто відповів швидко й по суті — той і продав. Привітайтесь, уточніть розміри, запропонуйте рішення й наступний крок.\n\n<b>Завдання:</b> збережіть 3 шаблони відповідей у нотатки телефона.',
    alt: { t: '🎉 Перше замовлення вже є!', x: 'Чудовий старт. Щоб клієнти поверталися й радили вас, відповідайте швидко й тримайте клієнта в курсі: підтвердили, відправили, надіслали ТТН.\n\n<b>Завдання:</b> перегляньте урок про скрипти відповідей — заберіть 2–3 фрази собі.' },
    b: [['🎓 Урок: скрипти відповідей', SALES + 'l5']] },
  { t: '📦 Крок 4 з 7. Як оформити замовлення', x: 'Клієнт готовий купити? Кабінет → <b>«Нове замовлення»</b>: товари, ПІБ і телефон клієнта, місто й відділення. Це хвилина. Далі ми підтвердимо, спакуємо й відправимо, а ТТН і статуси прийдуть сюди.\n\nОплата — при отриманні, ваш заробіток нараховується автоматично.',
    alt: { t: '📦 Крок 4 з 7. Статуси й ТТН', x: 'Усі ваші замовлення — у кабінеті: статус, ТТН, заробіток. Коли посилку відправлять, номер ТТН прийде сюди — перешліть його клієнту, це знижує відмови.' },
    b: [['🎓 Урок: спілкування з клієнтами', COURSE + 'm6l1']], app: 'new' },
  { t: '🏪 Крок 5 з 7. Свій магазин за 10 хвилин', x: 'Створіть власну вітрину: ваша назва, кольори й ціни за одним посиланням. Є 9 готових шаблонів — «Кухня за вихідні», «Ванна без плитки», «Дитяча» та інші: товари й тексти вже підібрані.\n\n<b>Завдання:</b> оберіть шаблон, впишіть назву й контакти — і поставте посилання в профіль Instagram чи Telegram.',
    b: [['🏪 Створити вітрину', SITE + 'v/edit.html', 1], ['🎓 Курс «Своя вітрина»', VIT + 'v1']] },
  { t: '🛡 Крок 6 з 7. «Дорого» — як відповісти', x: '«Дорого» майже ніколи не про гроші — це «я не бачу цінності». Порівняйте з ціною майстра й ремонту, покажіть результат «до/після», запропонуйте варіант дешевше.\n\n<b>Завдання:</b> прочитайте 5 готових відповідей і оберіть свою.',
    b: [['📖 Заперечення «дорого»', BLOG + 'zaperechennya-dorogo-yak-vidpovisty.html'], ['🎓 Урок: ТОП-10 заперечень', SALES + 'l10']] },
  { t: '🏁 Крок 7 з 7. Тиждень позаду — що далі', x: 'Ви вже знаєте головне: товари, оголошення, відповіді клієнтам, замовлення й вітрина. Далі раз на тиждень надсилатимемо один корисний урок.\n\nЗастрягли або немає першого продажу? Напишіть менеджеру — розберемо ваші оголошення й підкажемо, що змінити.',
    alt: { t: '🏁 Тиждень позаду — у вас уже {n}!', x: 'Так тримати! Щоб продажів ставало більше: більше оголошень, вітрина в профілі й регулярні відео. Раз на тиждень надсилатимемо один корисний урок.\n\nПитання — пишіть менеджеру, допоможемо.' },
    b: [['🎓 Академія партнера', SITE + 'academy.html'], ['💬 Написати менеджеру', 'https://t.me/' + MANAGER]] }
];
var ONB_W1 = [
  { t: 'Перевірте попит, перш ніж вкладати час', x: 'Як за 15 хвилин зрозуміти, чи шукають ваш товар: пошук OLX, Google, кількість переглядів.', b: [['🎓 Урок: перевірка попиту', COURSE + 'm1l3']] },
  { t: 'УТП: чому купити саме у вас', x: 'Одна фраза, яка відрізняє вас від сотні таких самих оголошень. Формули й приклади.', b: [['🎓 Урок: УТП, яке продає', COURSE + 'm2l1']] },
  { t: 'Фото, які зупиняють прокрутку', x: 'Як зробити унікальні фото й креативи без фотографа — навіть телефоном.', b: [['🎓 Урок: фото й креативи', COURSE + 'm3l1']] },
  { t: 'Звідки береться довіра', x: 'Чому одним продавцям вірять з першого повідомлення, а іншим — ні. 5 простих сигналів довіри.', b: [['🎓 Урок: де зароджується довіра', SALES + 'l2']] },
  { t: 'Відео, які продають товари для ремонту', x: '«До/після», монтаж за 30 секунд, лайфхак — формати, які набирають перегляди.', b: [['🎓 Урок: формати відео', COURSE + 'm5l1'], ['📖 Відео для продажу', BLOG + 'video-dlya-prodazhu-tovariv-dlya-remontu.html']] },
  { t: 'Куди поставити посилання на вітрину', x: 'Шапка профілю, закріплений пост, QR-код — і посилання з міткою, щоб бачити в статистиці, звідки приходять покупці.', b: [['🎓 Урок: куди поставити посилання', VIT + 'v13'], ['📊 Статистика вітрини', SITE + 'v/edit.html#stats', 1]] },
  { t: 'Швидкість і тон відповіді', x: 'Клієнт пише трьом продавцям одночасно. Купує в того, хто відповів першим і по-людськи.', b: [['🎓 Урок: швидкість реакції та тон', SALES + 'l4']] },
  { t: 'Допродаж: +20–30% до чека', x: 'До панелей — плінтус і клей-ніж, до плитки — запас 10%. Як пропонувати, щоб не тиснути.', b: [['📖 Як збільшити середній чек', BLOG + 'doprodazh-yak-zbilshyty-serednii-chek.html']] },
  { t: 'Контент-план на місяць за 20 хвилин з ШІ', x: 'Готовий промпт: ChatGPT чи Gemini складе план постів і сторіс під ваші товари.', b: [['🎓 Урок: контент-план з AI', COURSE + 'm3l3']] },
  { t: 'Менше відмов від посилок', x: 'Чому клієнти не забирають посилки і що зробити до відправки, щоб цього не сталося.', b: [['📖 Відмови від накладеного платежу', BLOG + 'vidmovy-vid-nakladenoho-platezhu.html']] },
  { t: 'Заголовки й пости, що ведуть на вітрину', x: 'Перший рядок вирішує, чи прочитають пост. 6 формул заголовків і готові шаблони.', b: [['🎓 Урок: заголовки й пости', VIT + 'v10']] },
  { t: 'Що робити, коли клієнт сумнівається', x: '«Подумаю», «порівняю», «потім» — як допомогти прийняти рішення без тиску.', b: [['🎓 Урок: робота із сумнівами', SALES + 'l6']] },
  { t: 'Як потрапляти в рекомендації', x: 'Що любить алгоритм TikTok та Instagram і як знімати, щоб відео бачили нові люди.', b: [['🎓 Урок: рекомендації', COURSE + 'm5l4']] },
  { t: 'Повторні продажі й відгуки', x: 'Найдешевший клієнт — той, що вже купив. Як попросити відгук і повернути покупця.', b: [['📖 Повторні продажі й відгуки', BLOG + 'povtorni-prodazhi-i-vidhuky.html']] },
  { t: 'Психологія клієнта', x: 'Чого насправді боїться покупець в інтернеті — і як зняти ці страхи ще до питань.', b: [['🎓 Урок: психологія й довіра', COURSE + 'm4l2']] },
  { t: 'Продажі на Prom.ua', x: 'Ще один майданчик з готовими покупцями: як почати й не загубитися серед конкурентів.', b: [['📖 Як продавати на Prom', BLOG + 'yak-prodavaty-na-prom.html']] },
  { t: 'Як завершити угоду', x: 'Клієнт усе питає, але не купує. Фрази, які м’яко переводять розмову до замовлення.', b: [['🎓 Урок: як завершити угоду', SALES + 'l9']] },
  { t: 'Як підняти конверсію', x: 'Ті самі перегляди — більше замовлень: фото, ціна, опис, відповіді.', b: [['🎓 Урок: як підняти конверсію', COURSE + 'm4l4']] },
  { t: 'Ціна й націнка на вітрині', x: 'Скільки ставити зверху ціни сайту, щоб заробляти більше й не відлякати покупця.', b: [['🎓 Урок: ціни й націнка', VIT + 'v11']] },
  { t: 'Повторні продажі та відмови', x: 'Система, яка повертає клієнтів і знижує відмови: нагадування, сервіс, сезонні пропозиції.', b: [['🎓 Урок: повторні продажі', COURSE + 'm6l2']] },
  { t: 'Чому клієнт відмовляється', x: 'Розбір справжніх причин відмов — і що змінити у своїх відповідях.', b: [['🎓 Урок: чому клієнт відмовляється', SALES + 'l11']] },
  { t: 'Облік без хаосу', x: 'Таблиця, шаблони, нагадування: як вести 20+ клієнтів і нічого не забути.', b: [['🎓 Урок: автоматизація й облік', COURSE + 'm3l2']] },
  { t: 'Лайфхаки продажів у месенджерах', x: 'Голосові, фото «на руці», швидкі відповіді — дрібниці, що додають продажів.', b: [['📖 Лайфхаки продажів у месенджерах', BLOG + 'layfkhaky-prodazhiv-u-mesendzherakh.html']] },
  { t: 'Реклама: коли й скільки', x: 'Коли вже варто платити за рекламу, з якого бюджету почати й як не злити гроші.', b: [['🎓 Урок: реклама та бюджети', COURSE + 'm7l1']] },
  { t: 'Що відрізняє найкращих продавців', x: 'Звички партнерів, які продають щотижня. Порівняйте зі своїми.', b: [['🎓 Урок: що відрізняє найкращих', SALES + 'l13']] },
  { t: 'Від підробітку до системи', x: 'Як перетворити продажі на стабільний дохід: система, делегування, команда. Дякуємо, що пройшли весь шлях з нами!', b: [['🎓 Урок: система та команда', COURSE + 'm7l2']] }
];
var PDF = SITE + 'partner/', HUB = SITE + 'lk.html';
var ONB_W2 = [
  { t: 'Де продавати: Partner Hub', x: 'OLX, Instagram, TikTok, Prom, групи — з чого почати саме вам. Порівняння майданчиків і план на перший тиждень на одній сторінці.\n\n<b>Завдання:</b> оберіть 2 майданчики, на яких будете щотижня.', b: [['🧭 Partner Hub: де й як продавати', HUB]] },
  { t: 'Вітрина за хвилину: 9 готових шаблонів', x: '«Кухня за вихідні», «Ванна без плитки», «Дитяча», «Лофт», «Дзеркала й декор»… Шаблон сам підбере товари, тексти й оформлення — вам лишається вписати назву й контакти.', b: [['🏪 Обрати шаблон вітрини', SITE + 'v/edit.html', 1], ['📖 Як працює вітрина', BLOG + 'vlasnyi-internet-mahazyn-bez-vkladen.html']] },
  { t: 'OLX: оголошення, які продають', x: 'Заголовок з ключовими словами, 8+ фото, ціна й відповідь протягом години. Покрокова PDF-інструкція саме для OLX.', b: [['📄 PDF: OLX', PDF + 'olx.pdf'], ['📖 OLX без складу', BLOG + 'yak-prodavaty-na-olx-bez-skladu.html']] },
  { t: 'База знань: відповіді за 10 секунд', x: 'Як оформити замовлення, коли виплата, що робити з відмовою, як підключити вітрину — усе вже є в розділі «Допомога». Пошук розуміє звичайні слова.\n\n<b>Порада:</b> не знайшли відповіді — кнопка «Менеджер».', b: [['❓ Відкрити «Допомогу»', APP_URL + '#help', 1]] },
  { t: 'Instagram: профіль, що продає', x: 'Шапка профілю з користю, закріплені Stories «Ціни», «Відгуки», «Доставка» і посилання на вашу вітрину.', b: [['📄 PDF: Instagram', PDF + 'instagram.pdf']] },
  { t: 'Статистика вітрини: звідки покупці', x: 'Скільки людей зайшло, що відкривали, на якому кроці пішли. Копіюйте посилання з міткою для Instagram, TikTok, Telegram — і бачте, який канал приносить замовлення.', b: [['📊 Статистика вітрини', SITE + 'v/edit.html#stats', 1]] },
  { t: 'TikTok: перші 1000 переглядів', x: 'Відео 15–30 секунд «до/після» або монтаж — найкращий формат для товарів для ремонту. Знімайте серіями по 3–5.', b: [['📄 PDF: TikTok', PDF + 'tiktok.pdf'], ['📖 Відео для продажу', BLOG + 'video-dlya-prodazhu-tovariv-dlya-remontu.html']] },
  { t: 'Персональний план за 3 хвилини', x: 'Позначте в анкеті, які у вас уже є сторінки й майданчики, — отримаєте план і PDF-інструкції саме під них.', b: [['📝 Заповнити анкету', SITE + 'anketa.html']] },
  { t: 'Telegram-канал або чат свого району', x: 'Закріплений пост з вітриною, підбірки «до/після», відповіді на питання — Telegram продає тихо, але стабільно.', b: [['📄 PDF: Telegram', PDF + 'telegram.pdf']] },
  { t: 'Назва й логотип вітрини з ШІ', x: 'Готові промпти для ChatGPT і Gemini: 20 назв за хвилину й логотип без дизайнера.', b: [['🎓 Урок: логотип з ШІ', VIT + 'v5'], ['📖 Назва й логотип', BLOG + 'nazva-i-lohotyp-mahazynu-z-shi.html']] },
  { t: 'Facebook Marketplace і групи', x: 'Місцеві групи «ремонт», «оренда», «продам» — безкоштовні покупці поруч. Як публікувати, щоб не банили.', b: [['📄 PDF: Facebook', PDF + 'facebook.pdf']] },
  { t: 'Регулярність перемагає талант', x: 'Найкращі партнери не геніальні — вони просто щотижня роблять 3 речі: нові оголошення, 2–3 відео, швидкі відповіді. Поставте собі ці 3 нагадування в телефон.', b: [['🎓 Урок: що відрізняє найкращих', SALES + 'l13']] },
  { t: 'Viber-спільноти й розсилки', x: 'Спільнота «Ремонт своїми руками» у вашому місті — канал, де купують повторно. Як запустити й не набриднути.', b: [['📄 PDF: Viber', PDF + 'viber.pdf']] },
  { t: 'QR-код і віджет вітрини', x: 'QR-код на візитках і наліпках, віджет — на вашому сайті чи блозі. Покупець сканує й одразу замовляє.', b: [['🏪 Редактор вітрини: QR і віджет', SITE + 'v/edit.html', 1], ['🎓 Урок: куди поставити посилання', VIT + 'v13']] },
  { t: 'Prom.ua: свій магазин на маркетплейсі', x: 'Мільйони покупців шукають тут товари для ремонту. Покрокова PDF-інструкція: реєстрація, картки, відповіді.', b: [['📄 PDF: Prom', PDF + 'prom.pdf']] },
  { t: '«Мої товари» — замовлення в 2 кліки', x: 'Позначте ⭐ товари, які продаєте найчастіше, — і оформлюйте замовлення з них за секунди, навіть з телефона в Telegram.', b: [['⭐ Мої товари', APP_URL + '#cat', 1]] },
  { t: 'Rozetka, Епіцентр, Allo', x: 'Великі маркетплейси: коли варто заходити і як там продавати товари нашого каталогу.', b: [['📄 PDF: Rozetka', PDF + 'rozetka.pdf'], ['📄 PDF: Епіцентр', PDF + 'epicentr.pdf'], ['📄 PDF: Allo', PDF + 'allo.pdf']] },
  { t: 'Тексти вітрини, що продають', x: '«Про вас», переваги під обкладинкою, стрічка вгорі — 3 блоки, які перетворюють відвідувача на покупця. Шаблони й формули.', b: [['🎓 Урок: блок «Про вас»', VIT + 'v8'], ['📖 Продаючі тексти', BLOG + 'prodayuchi-teksty-dlya-internet-mahazynu.html']] },
  { t: 'Pinterest і YouTube Shorts', x: 'Ідеї інтер’єру живуть роками: один пін чи Shorts може приводити покупців місяцями.', b: [['📄 PDF: Pinterest', PDF + 'pinterest.pdf'], ['📄 PDF: YouTube', PDF + 'youtube.pdf']] },
  { t: 'Розбір свого тижня за 10 хвилин', x: 'Скільки оголошень, скільки звернень, скільки замовлень? Відкрийте кабінет і статистику вітрини — одна зміна на наступний тиждень дає більше, ніж десять планів.', b: [['📱 Кабінет', APP_URL, 1], ['📊 Статистика вітрини', SITE + 'v/edit.html#stats', 1]] },
  { t: 'Threads і Google Мій бізнес', x: 'Ще два безкоштовні канали: короткі пости в Threads і картка в Google Картах для місцевих покупців.', b: [['📄 PDF: Threads', PDF + 'threads.pdf'], ['📄 PDF: Google', PDF + 'google.pdf']] },
  { t: 'Довіра покупця на вітрині', x: 'Правила обміну й повернення та політика конфіденційності вже є на вашій вітрині у вашому дизайні. Згадуйте про оплату після огляду — це знімає головний страх.', b: [['🎓 Урок: доставка й оплата без страхів', VIT + 'v9']] },
  { t: 'Дошки оголошень: Besplatka, Obyava та інші', x: 'Менше конкурентів, ніж на OLX, і безкоштовно. Одне оголошення — 5 хвилин.', b: [['📄 PDF: дошки оголошень', PDF + 'dosky.pdf']] },
  { t: 'Свій сайт або блог', x: 'Якщо у вас є сайт — вставте віджет вітрини. Якщо ні — вітрина і є ваш сайт: з кошиком, умовами й статистикою.', b: [['📄 PDF: свій сайт', PDF + 'sait.pdf'], ['🏪 Моя вітрина', SITE + 'v/edit.html', 1]] },
  { t: 'Сезонність: що продавати зараз', x: 'Восени й узимку — килимки, утеплення, затишок; навесні — балкон, дача, ремонт ванної; влітку — меблі й декор. Оновіть «Популярне» на вітрині під сезон.', b: [['🛍 Товари для продажу', SITE + 'partners.html']] },
  { t: 'Шпаргалка партнера: усе на одній сторінці', x: 'Схема роботи, статуси, виплати, контакти — роздрукуйте або збережіть у телефон.', b: [['📄 Шпаргалка', PDF + 'shpargalka.pdf'], ['📄 Старт партнера', PDF + 'start.pdf']] }
];
// чергуємо: навичка продажу → майданчик / вітрина / знання
var ONB_W = [];
for (var _i = 0; _i < Math.max(ONB_W1.length, ONB_W2.length); _i++) { if (ONB_W2[_i]) ONB_W.push(ONB_W2[_i]); if (ONB_W1[_i]) ONB_W.push(ONB_W1[_i]); }
function onbDay(d) { return Utilities.formatDate(d ? new Date(d) : new Date(), 'Europe/Kiev', 'yyyy-MM-dd'); }
function onbDiff(a, b) { return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5); }
function onbState(p) { return json(p.onb, {}) || {}; }
// посилання у Mini App (вітрина) — з ?from=app перед #, щоб кнопка «Назад» вела в кабінет у Telegram
function onbApp(u) { var i = u.indexOf('#'), b = i < 0 ? u : u.slice(0, i), hs = i < 0 ? '' : u.slice(i); return b + (b.indexOf('?') < 0 ? '?' : '&') + 'from=app' + hs; }
function onbMsg(it, st, plain) {
  var alt = it.alt && st.n > 0 ? it.alt : null, t = (alt || it).t.replace('{n}', st.n + ' ' + plural(st.n, 'замовлення', 'замовлення', 'замовлень')), x = (alt || it).x;
  var btn = function (text, url, app) { return app && !plain ? { text: text, web_app: { url: url } } : { text: text, url: url }; };   // web_app — лише в особистому чаті
  var kb = (it.b || []).map(function (b) { return [b[2] ? btn(b[0], onbApp(b[1]), 1) : btn(b[0], b[1])]; });
  kb.push([btn('📱 Кабінет', APP_URL + (it.app ? '#' + it.app : ''), 1), { text: '⚙️ Налаштування', callback_data: 'set|show' }]);
  kb.push([btn('🏪 Моя вітрина', onbApp(SITE + 'v/edit.html'), 1)]);
  return { text: '<b>' + h(t) + '</b>\n\n' + x, kb: { inline_keyboard: kb } };
}
function plural(n, one, few, many) { var a = n % 10, b = n % 100; return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many; }
// що надіслати сьогодні цьому партнерові (або null). force — для перегляду: урок тижня без перевірки дня тижня
function onbNext(p, st, today, start, force) {
  if (st.blk || st.off === 2 || !p.tgId || p.status === 'Заблокований' || (!force && st.d === today)) return null;
  var reg = onbDay(p.created || today), legacy = start && reg < start, s = +st.s || 0, w = +st.w || 0;
  if (!legacy && s < ONB_D.length && !st.off) return onbDiff(reg, today) >= s + 1 ? { kind: 's', it: ONB_D[s], i: s } : null;
  // щотижневе повідомлення — у понеділок (сводка + урок тижня), не раніше ніж через 3 дні після попереднього
  if (!force && (new Date(today + 'T12:00:00Z').getUTCDay() !== 1 || (st.d && onbDiff(st.d, today) < 3))) return null;
  if (st.off) return { kind: 'w', it: null, i: w };
  // після останнього уроку — по колу, з позначкою «Корисно повторити»: поради приходять щотижня, доки партнер їх не вимкне
  var it = ONB_W[w % ONB_W.length], round = Math.floor(w / ONB_W.length);
  var intro = legacy && !w ? '🎓 <b>Нова рубрика: урок тижня</b>\nРаз на тиждень — одна корисна порада для продажів. Не потрібно — натисніть «Не надсилати поради».\n\n' : '';
  return { kind: 'w', it: { t: (round ? '🔁 Корисно повторити · ' : '🎓 Урок тижня · ') + it.t, x: intro + it.x + '\n\n<i>Урок ' + (w + 1) + '</i>', b: it.b, app: it.app }, i: w };
}

/* ---------------- Сводка тижня (понеділок): продажі партнера, хіти, сезон, новинки + урок тижня ---------------- */
var OK_ST = ['Отримане', 'Виплачено'], WORK_ST = ['Нове', 'Підтверджене', 'Відправлене'];
var SEASON = [   // місяць (1–12) → підказка й категорії сайту (c/<slug>.html)
  [[12, 1, 2], '❄️ Зима: тепло й затишок удома', ['termokylymky', 'pidloga-pazl-plyushevyy', 'vologopoglynayuchi-kylymky', 'plytka-pid-kovrolin']],
  [[3, 4, 5], '🌱 Весна: ремонт ванної й кухні, балкон і дача', ['pet-plytka', 'pvh-paneli-plyty', 'plytka-vinilova', 'skladni-mebli']],
  [[6, 7, 8], '☀️ Літо: дача, тераса й декор', ['skladni-mebli', 'naduvni-mebli', 'stolyky', 'dzerkalnyi-dekor']],
  [[9, 10, 11], '🍂 Осінь: сезон ремонтів — стіни, підлога, затишок', ['3d-paneli', 'samokleyucha-plivka', 'plytka-vinilova', 'termokylymky']]];
function weekCtx(today) {
  var t = new Date(today + 'T12:00:00Z'), dow = (t.getUTCDay() + 6) % 7;          // 0 = понеділок
  var mon = new Date(t - dow * 864e5), from = new Date(mon - 7 * 864e5), prev = new Date(mon - 14 * 864e5);
  var d = function (x) { return x.toISOString().slice(0, 10); }, all = readAll(SH_O, OC), hits = {}, m30 = d(new Date(t - 30 * 864e5));
  all.forEach(function (o) {
    if (CANCELLED.indexOf(o.status) >= 0 || onbDay(o.created) < m30) return;
    json(o.items, []).forEach(function (x) { var k = String(x.id || x.name); (hits[k] = hits[k] || { id: x.id, name: x.name, q: 0, n: {} }).q += +x.q || 1; hits[k].n[o.partnerId] = 1; });
  });
  var top = Object.keys(hits).map(function (k) { return hits[k]; }).filter(function (x) { return Object.keys(x.n).length >= 2 || x.q >= 3; })
    .sort(function (a, b) { return b.q - a.q; }).slice(0, 3);
  var rep = {}, news = [];
  try { rep = JSON.parse(UrlFetchApp.fetch(SITE + 'catalog-report.json?t=' + Date.now(), { muteHttpExceptions: true }).getContentText()); } catch (x) { }
  (rep.log || []).forEach(function (e) { if (String(e.date).slice(0, 10) >= d(from)) (e['new'] || []).forEach(function (n) { if (news.length < 3 && !news.some(function (y) { return y[0] === n[0]; })) news.push(n); }); });
  var month = t.getUTCMonth() + 1, season = SEASON.filter(function (z) { return z[0].indexOf(month) >= 0; })[0], cn = {};
  (rep.cats || []).forEach(function (c) { cn[c.cat] = c.name; });
  return { orders: all, from: d(from), to: d(new Date(mon - 864e5)), prev: d(prev), top: top, news: news, season: season, cn: cn };
}
function weekSummary(p, W) {
  var my = W.orders.filter(function (o) { return o.partnerId === p.id; }), inW = function (o, a, b) { var x = onbDay(o.created); return x >= a && x < b; };
  var wk = my.filter(function (o) { return inW(o, W.from, onbDay(new Date(Date.parse(W.to + 'T12:00:00Z') + 864e5))) && CANCELLED.indexOf(o.status) < 0; });
  var pw = my.filter(function (o) { return inW(o, W.prev, W.from) && CANCELLED.indexOf(o.status) < 0; });
  var got = my.filter(function (o) { return OK_ST.indexOf(o.status) >= 0 && onbDay(o.updated) >= W.from && onbDay(o.updated) <= W.to; });
  var work = my.filter(function (o) { return WORK_ST.indexOf(o.status) >= 0; }), due = my.filter(function (o) { return o.status === 'Отримане'; });
  var sum = function (L, f) { return L.reduce(function (a, o) { return a + f(o); }, 0); };
  var d = function (a, b) { return a > b ? ' ▲' : a < b ? ' ▼' : ''; };
  var dm = function (x) { return x.slice(8, 10) + '.' + x.slice(5, 7); };
  var active = wk.length || got.length || work.length || due.length || my.some(function (o) { return onbDay(o.created) >= W.prev; });
  var L = ['📊 <b>Ваш тиждень · ' + dm(W.from) + '–' + dm(W.to) + '</b>'];
  if (wk.length || got.length) {
    L.push('Нових замовлень: <b>' + wk.length + '</b>' + d(wk.length, pw.length) + (wk.length ? ' · на ' + money(sum(wk, function (o) { return num(o.sale); })) + ' · заробіток ≈ ' + money(sum(wk, earnOf)) : ''));
    if (got.length) L.push('Отримано клієнтами: <b>' + got.length + '</b> · +' + money(sum(got, earnOf)));
  } else L.push(my.length ? 'Цього тижня нових замовлень не було. Одна дія на цей тиждень — 3 нові оголошення або 2 відео: це повертає продажі.' : 'Перше замовлення — найважче. Почніть з 3 оголошень і посилання на вітрину в профілі — урок нижче допоможе.');
  if (work.length) L.push('У роботі зараз: ' + work.length);
  if (due.length) L.push('До виплати: <b>' + money(sum(due, earnOf)) + '</b>');
  var X = [];
  if (W.top.length) X.push('🔥 <b>Хіти в партнерів</b> (30 днів)\n' + W.top.map(function (x, i) { return (i + 1) + '. ' + (x.id ? '<a href="' + SITE + 'p/' + h(x.id) + '.html">' + h(x.name) + '</a>' : h(x.name)); }).join('\n'));
  if (W.season) X.push(W.season[1] + '\n' + W.season[2].map(function (c) { return '<a href="' + SITE + 'c/' + c + '.html">' + h(W.cn[c] || c) + '</a>'; }).join(' · '));
  if (W.news.length) X.push('🆕 <b>Новинки каталогу</b>\n' + W.news.map(function (n) { return '• <a href="' + SITE + 'p/' + h(n[0]) + '.html">' + h(n[1]) + '</a> — ' + money(n[2]); }).join('\n'));
  return { text: L.join('\n') + (X.length ? '\n\n' + X.join('\n\n') : ''), active: !!active };
}
function weeklyMsg(p, st, nx, W) {
  var sm = st.soff ? null : weekSummary(p, W), les = nx.it;
  if (!les && !(sm && sm.active)) return null;
  var kb = (les && les.b || []).map(function (b) { return [b[2] ? { text: b[0], web_app: { url: onbApp(b[1]) } } : { text: b[0], url: b[1] }]; });
  kb.push([{ text: '📱 Кабінет', web_app: { url: APP_URL } }, { text: '⚙️ Налаштування', callback_data: 'set|show' }]);
  kb.push([{ text: '🏪 Моя вітрина', web_app: { url: onbApp(SITE + 'v/edit.html#stats') } }]);
  var text = (sm ? sm.text : '') + (les ? (sm ? '\n\n━━━━━━━━━━\n' : '') + '<b>' + h(les.t) + '</b>\n' + les.x : '');
  return { text: text, kb: { inline_keyboard: kb } };
}
function onbDaily() {
  if (!prop('DROP_BOT_TOKEN')) return;
  var today = onbDay(), start = prop('ONB_START'), sh = sheet(SH_P, PC), col = PC.map(function (c) { return c[0]; }).indexOf('onb') + 1, idCol = 1, sent = 0, W = null;
  var cnt = {};
  readAll(SH_O, OC).forEach(function (o) { if (CANCELLED.indexOf(o.status) < 0) cnt[o.partnerId] = (cnt[o.partnerId] || 0) + 1; });
  readAll(SH_P, PC).forEach(function (p) { try { onbOne(p); } catch (x) { console.error('onb ' + p.id, x); } });
  console.log('Навчання й сводка в боті: надіслано ' + sent);
  function onbOne(p) {
    var st = onbState(p); st.n = cnt[p.id] || 0;
    var nx = onbNext(p, st, today, start), m;
    if (!nx) return;
    if (nx.kind === 's') m = onbMsg(nx.it, st);
    else { W = W || weekCtx(today); m = weeklyMsg(p, st, nx, W); }
    if (!m) return;
    var r = send(p.tgId, m.text, m.kb), o = onbState(p);
    if (r && r.ok) { if (nx.kind === 's') o.s = nx.i + 1; else if (nx.it) o.w = nx.i + 1; o.d = today; sent++; }
    else if (r && r.error_code === 403) o.blk = 1;      // партнер зупинив бота — більше не пишемо
    else return;
    try { withLock(function () { if (String(sh.getRange(p._r, idCol).getValue()) === p.id) sh.getRange(p._r, col).setNumberFormat('@').setValue(JSON.stringify(o)); }); } catch (x) { console.error(x); }
    Utilities.sleep(60);
  }
}
var CANCELLED = ['Скасоване', 'Повернення'];
// what: 'tips' — поради/уроки, 'sum' — сводка тижня
function onbToggle(tgId, on, what) {
  return withLock(function () {
    var list = readAll(SH_P, PC), p = findTg(list, tgId);
    if (!p) return 'Спершу підключіть кабінет партнера.';
    var st = onbState(p), k = what === 'sum' ? 'soff' : 'off';
    if (on) delete st[k]; else st[k] = 1;
    delete st.blk;
    p.onb = JSON.stringify(st); write(SH_P, PC, p);
    if (what === 'sum') return on ? '🔔 Сводку тижня ввімкнено: щопонеділка — ваші продажі, хіти й новинки.' : '🔕 Сводку вимкнено. Увімкнути знову — команда /summary';
    return on ? '🔔 Поради ввімкнено: раз на тиждень — один корисний урок.' : '🔕 Поради вимкнено. Увімкнути знову — команда /tips';
  });
}
/** Перегляд сводки: надсилає вам (бот партнерів) понеділкове повідомлення так, як його отримає найактивніший партнер. */
function summaryPreview() {
  var chats = adminChats().length ? adminChats() : prop('TG_CHAT').split(',').map(function (c) { return c.trim(); }).filter(String);
  var today = onbDay(), W = weekCtx(today), cnt = {};
  W.orders.forEach(function (o) { cnt[o.partnerId] = (cnt[o.partnerId] || 0) + 1; });
  var P = readAll(SH_P, PC).sort(function (a, b) { return (cnt[b.id] || 0) - (cnt[a.id] || 0); })[0];
  if (!P) return console.log('Партнерів ще немає.');
  var st = onbState(P), w = +st.w || 0, it = ONB_W[w % ONB_W.length];
  var m = weeklyMsg(P, {}, { kind: 'w', it: { t: '🎓 Урок тижня · ' + it.t, x: it.x, b: it.b }, i: w }, W);
  m.kb.inline_keyboard = m.kb.inline_keyboard.map(function (row) { return row.map(function (b) { return b.web_app ? { text: b.text, url: b.web_app.url } : b; }); });
  if (!chats.length) return console.log(m.text);
  chats.forEach(function (c) {
    var r = send(c, '👀 <b>Так виглядатиме сводка партнера ' + h(P.id + ' · ' + P.name) + '</b> (щопонеділка об 11:00):');
    if (!r || !r.ok) return console.log('⚠️ Не вдалося надіслати в ' + c + ' — натисніть Start у боті партнерів і запустіть ще раз.');
    send(c, m.text, m.kb);
  });
  console.log('Перегляд сводки надіслано. Партнер: ' + P.id);
}
function setupOnboarding() {
  if (!prop('ONB_START')) setProp('ONB_START', onbDay());
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'onbDaily') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('onbDaily').timeBased().everyDays(1).atHour(11).inTimezone('Europe/Kiev').create();
  sheet(SH_P, PC);
  console.log('✓ Навчання в Drop-боті ввімкнено: щодня близько 11:00. Нові партнери — 7 днів по кроку, далі урок тижня; ' +
    'партнери, що зареєструвалися до ' + prop('ONB_START') + ', — одразу уроки тижня (раз на 7 днів).\nПодивитися повідомлення: onbPreview.');
}
function onbPreview() {
  // кому: чат менеджера в боті партнерів, а якщо його немає — ваш Telegram з TG_CHAT (спершу натисніть Start у боті партнерів)
  var chats = adminChats().length ? adminChats() : prop('TG_CHAT').split(',').map(function (c) { return c.trim(); }).filter(String), st = { n: 0 };
  var nW = onbPreview.all ? ONB_W.length : 2, W = [];
  for (var k = 0; k < nW; k++) W.push(onbNext({ tgId: 1, created: '2000-01-01' }, k ? { w: k } : {}, onbDay(), onbDay(), true));
  var L = ONB_D.map(function (it) { return onbMsg(it, st, 1); }).concat(W.map(function (n) { return onbMsg(n.it, st, 1); }));
  if (!chats.length || !prop('DROP_BOT_TOKEN')) { L.forEach(function (m) { console.log(m.text + '\n---'); }); return console.log('Немає чату для перегляду (DROP_ADMIN_CHATS / TG_CHAT) — тексти вище в журналі.'); }
  var bad = [];
  chats.forEach(function (c) {
    var r = send(c, '👀 <b>Перегляд навчання в боті</b>: 7 кроків для нових партнерів і ' + nW + ' ' + (nW > 2 ? 'уроків тижня (усі)' : 'перші уроки тижня') + '. Так їх побачать партнери (у них кнопки «Кабінет» відкривають Mini App).');
    if (!r || !r.ok) { bad.push(c + ' (' + (r && r.description || 'немає відповіді') + ')'); return; }
    L.forEach(function (m) { send(c, m.text, m.kb); Utilities.sleep(80); });
  });
  if (bad.length) console.log('⚠️ Не вдалося надіслати в чат ' + bad.join(', ') + '.\nВідкрийте бота партнерів @' + (botUser() || 'samostroy_drop_bot') + ' у Telegram, натисніть «Start» і запустіть onbPreview ще раз.');
  console.log('Перегляд надіслано: ' + (chats.length - bad.length) + ' чат(и), по ' + L.length + ' повідомлень.');
}
/** Надіслати собі ВСІ уроки тижня (59 повідомлень) — щоб прочитати весь курс у боті. */
function onbPreviewAll() { onbPreview.all = true; try { onbPreview(); } finally { onbPreview.all = false; } }

/* ================= Налаштування повідомлень у боті (кнопка «⚙️ Налаштування», команда /settings) ================= */
var SET_ITEMS = [
  ['tips', 'off', '🎓 Уроки тижня', 'Одна коротка порада на тиждень: де знайти клієнтів, що відповісти на «дорого», як оформити вітрину. Перевірені прийоми партнерів, які продають щотижня, — 3 хвилини читання.',
    'Ви більше не отримуватимете уроки тижня — нові прийоми продажу, майданчики й PDF-інструкції доведеться шукати самостійно.'],
  ['sum', 'soff', '📊 Сводка тижня', 'Щопонеділка: скільки замовлень і заробітку за тиждень, що вже до виплати, хіти в інших партнерів і новинки каталогу. Ваш тиждень — за 10 секунд, без входу в кабінет.',
    'Ви не бачитимете щопонеділка свої результати, хіти в партнерів і новинки каталогу.'],
  ['ach', 'aoff', '🏆 Досягнення й рівні', 'Привітання з першим замовленням, новими значками й челенджем «Перші 10», а також підказка, коли ви виконали умову нового рівня маржі — щоб не пропустити підвищення заробітку.',
    'Ви не дізнаєтеся вчасно, що виконали умову нового рівня маржі, і не отримуватимете привітань із досягненнями.']];
function settingsView(p) {
  var st = onbState(p), L = ['⚙️ <b>Налаштування повідомлень</b>', 'Бот пише не частіше ніж раз на тиждень — і лише те, що допомагає продавати більше.', ''];
  SET_ITEMS.forEach(function (x) { L.push(x[2] + ' — ' + (st[x[1]] ? '⬜ <i>вимкнено</i>' : '✅ <b>увімкнено</b>')); L.push(x[3]); L.push(''); });
  L.push('📦 Сповіщення про замовлення, ТТН і виплати приходять завжди.');
  var kb = SET_ITEMS.map(function (x) { return [{ text: (st[x[1]] ? '⬜ Увімкнути: ' : '✅ ') + x[2].replace(/^\S+\s/, ''), callback_data: 'set|' + (st[x[1]] ? 'on' : 'ask') + '|' + x[0] }]; });
  kb.push([{ text: '💬 Написати менеджеру', url: 'https://t.me/' + MANAGER }, { text: '📱 Кабінет', web_app: { url: APP_URL } }]);
  return { text: L.join('\n'), kb: { inline_keyboard: kb } };
}
function settingsShow(chat, tgId) {
  var p = partnerByTg(tgId);
  if (!p) return send(chat, 'Спершу підключіть кабінет партнера.', appKb('Відкрити кабінет'));
  var v = settingsView(p); return send(chat, v.text, v.kb);
}
function settingsCb(q, chat, d) {
  var mid = q.message && q.message.message_id, edit = function (v) { bot('editMessageText', { chat_id: chat, message_id: mid, text: v.text, parse_mode: 'HTML', reply_markup: v.kb, disable_web_page_preview: true }); };
  if (d[1] === 'show') { settingsShow(chat, q.from.id); return ''; }
  var it = SET_ITEMS.filter(function (x) { return x[0] === d[2]; })[0];
  if (!it) return '';
  if (d[1] === 'ask') {        // перед вимкненням — коротко, що саме зміниться
    edit({ text: '⚙️ <b>Вимкнути «' + it[2].replace(/^\S+\s/, '') + '»?</b>\n\n' + it[4] + '\n\nМи пишемо не частіше ніж раз на тиждень — і лише корисне.',
      kb: { inline_keyboard: [[{ text: '👍 Залишити ввімкненим', callback_data: 'set|keep|' + it[0] }], [{ text: 'Так, вимкнути', callback_data: 'set|off|' + it[0] }]] } });
    return '';
  }
  var msg = withLock(function () {
    var list = readAll(SH_P, PC), p = findTg(list, q.from.id);
    if (!p) return 'Спершу підключіть кабінет';
    if (d[1] === 'on' || d[1] === 'off') { var st = onbState(p); if (d[1] === 'on') delete st[it[1]]; else st[it[1]] = 1; delete st.blk; p.onb = JSON.stringify(st); write(SH_P, PC, p); }
    edit(settingsView(p));
    return d[1] === 'on' ? 'Увімкнено ✅' : d[1] === 'off' ? 'Вимкнено' : 'Чудово, залишаємо 👍';
  });
  return msg;
}

/* ================= Досягнення: челендж «Перші 10 замовлень», значки, умова нового рівня =================
   Ті самі правила, що в badges.js (кабінет і Mini App). Привітання — після нового замовлення чи зміни статусу.
   Партнерам, у яких на момент запуску вже були значки, їх зараховано тихо — привітання лише за нові. */
var BADGES = [
  ['first', '🥇', 'Перше замовлення', function (s) { return s.orders >= 1; }, 'Перший крок зроблено — далі легше. Тримайте клієнта в курсі: підтвердили, відправили, ТТН.'],
  ['deliv1', '📦', 'Перша доставка', function (s) { return s.deliv >= 1; }, 'Клієнт отримав посилку, а ви — перший заробіток. Попросіть у клієнта відгук і фото — це найкращий контент.'],
  ['ch10', '🏆', 'Челендж «Перші 10»', function (s) { return s.orders >= 10; }, 'Десять замовлень — ви вже не новачок, а продавець. Наступна ціль — 25.'],
  ['earn1k', '💰', 'Перші 1 000 ₴', function (s) { return s.earned >= 1000; }, 'Перша тисяча заробітку з отриманих замовлень. Далі — 10 000.'],
  ['month5', '📈', '5 за місяць', function (s) { return s.bestMonth >= 5; }, 'П’ять замовлень за місяць — стабільний ритм. Так виходять на рівень Pro.'],
  ['streak4', '🔥', '4 тижні поспіль', function (s) { return s.streak >= 4; }, 'Замовлення щотижня місяць поспіль. Регулярність — головний секрет найкращих партнерів.'],
  ['d25', '⭐', '25 замовлень', function (s) { return s.orders >= 25; }, '25 замовлень! Наступна ціль — 50.'],
  ['earn10k', '💸', '10 000 ₴', function (s) { return s.earned >= 10000; }, '10 000 ₴ заробітку. Це вже серйозний додатковий дохід.'],
  ['d50', '💎', '50 замовлень', function (s) { return s.orders >= 50; }, '50 замовлень — ви в числі найактивніших партнерів.'],
  ['d100', '👑', '100 замовлень', function (s) { return s.orders >= 100; }, 'Сто замовлень. Дякуємо, що ви з нами!']];
var LV_TURN = { Pro: 20000, Team: 80000 }, LV_NEXT = { Starter: 'Pro', Pro: 'Team' };
function pStats(pid, all) {
  var L = all.filter(function (o) { return o.partnerId === pid && CANCELLED.indexOf(o.status) < 0; }), D = L.filter(function (o) { return OK_ST.indexOf(o.status) >= 0; });
  var byM = {}, weeks = {}, wk = function (iso) { var t = new Date(Date.parse(onbDay(iso) + 'T12:00:00Z')); t = new Date(t - ((t.getUTCDay() + 6) % 7) * 864e5); return t.toISOString().slice(0, 10); };
  L.forEach(function (o) { var m = onbDay(o.created).slice(0, 7); byM[m] = (byM[m] || 0) + 1; weeks[wk(o.created)] = 1; });
  var streak = 0, t = Date.parse(wk(new Date().toISOString()) + 'T12:00:00Z');
  if (!weeks[new Date(t).toISOString().slice(0, 10)]) t -= 7 * 864e5;
  while (weeks[new Date(t).toISOString().slice(0, 10)]) { streak++; t -= 7 * 864e5; }
  var mon = onbDay().slice(0, 7), turn = L.filter(function (o) { return onbDay(o.created).slice(0, 7) === mon; }).reduce(function (a, o) { return a + num(o.sale); }, 0);
  var best = 0; Object.keys(byM).forEach(function (k) { best = Math.max(best, byM[k]); });
  return { orders: L.length, deliv: D.length, earned: D.reduce(function (a, o) { return a + earnOf(o); }, 0), bestMonth: best, streak: streak, turn: turn, month: mon };
}
function bar10(n) { n = Math.max(0, Math.min(10, n)); return new Array(n + 1).join('▰') + new Array(11 - n).join('▱'); }
/* ---------------- реферальна програма (тиха) ---------------- */
function pubRef(r) {
  return { order: r.order, created: r.created, refId: r.refId, refName: r.refName, partnerId: r.partnerId, partner: r.partner,
    earn: num(r.earn), pct: num(r.pct), bonus: num(r.bonus), status: r.status, paidAt: r.paidAt };
}
function firstName(n) { var w = String(n || '').trim().split(/\s+/); return w[0] + (w[1] ? ' ' + w[1].charAt(0) + '.' : ''); }
// запрошувач дійсний: існує, не заблокований, не той самий телефон чи Telegram
function refCheck(list, ref, phone, tgId) {
  ref = str(ref, 20).toUpperCase();
  if (!/^P\d{3,7}$/.test(ref)) return '';
  var r = findById(list, ref);
  if (!r || r.status === 'Заблокований' || r.phone === phone || (tgId && r.tgId && r.tgId === String(tgId))) return '';
  return ref;
}
// перехід у бот за посиланням t.me/<бот>?start=r_P1001 — пам’ятаємо 60 днів, доки людина не зареєструється в Mini App
function refKeep(tgId, ref) {
  var m = json(prop('REF_WAIT'), {}), t = Date.now(), k;
  for (k in m) if (t - m[k][1] > 60 * 864e5) delete m[k];
  m[String(tgId)] = [ref, t];
  var keys = Object.keys(m); if (keys.length > 400) keys.slice(0, keys.length - 400).forEach(function (x) { delete m[x]; });
  setProp('REF_WAIT', JSON.stringify(m));
}
function refPending(tgId) {
  var m = json(prop('REF_WAIT'), {}), x = m[String(tgId)];
  if (!x) return '';
  delete m[String(tgId)]; setProp('REF_WAIT', JSON.stringify(m));
  return Date.now() - x[1] <= 60 * 864e5 ? x[0] : '';
}
function refJoined(list, p) {
  if (!p.ref) return;
  var r = findById(list, p.ref);
  if (r) toPartner(r, '🤝 <b>За вашою рекомендацією зареєструвався новий партнер — ' + h(firstName(p.name)) + '.</b>\nКоли він почне продавати, ви отримуватимете бонус від Samostroy: ' +
    REF.first + '% від його заробітку перші ' + REF.months + ' місяців, далі ' + REF.then + '%. Його заробіток від цього не зменшується.\n\nПідкажіть йому, з чого почати, — перше замовлення найважливіше.');
}
// який % належить за замовлення o (0 — зв’язок завершився): перші REF.months місяців — first; далі then, поки немає перерви понад activeDays днів
function refPct(p, o, orders) {
  var start = new Date(p.created).getTime(), at = new Date(o.created).getTime(), six = new Date(p.created);
  six.setMonth(six.getMonth() + REF.months);
  if (!start || at < six.getTime()) return REF.first;
  var gap = REF.activeDays * 864e5, prev = start;
  var ds = orders.filter(function (x) { return x.partnerId === p.id && CANC_ST.indexOf(x.status) < 0; })
    .map(function (x) { return new Date(x.created).getTime(); }).filter(function (t) { return t && t <= at; }).sort(function (a, b) { return a - b; });
  for (var i = 0; i < ds.length; i++) { if (ds[i] - prev > gap && prev + gap > six.getTime()) return 0; prev = ds[i]; }
  return REF.then;
}
var CANC_ST = ['Скасоване', 'Повернення'];
// синхронізація бонусу із замовленням запрошеного: нараховуємо на «Отримане/Виплачено», скасовуємо при поверненні, оновлюємо суму
function refSync(o) {
  try {
    var P = readAll(SH_P, PC), p = findById(P, o.partnerId);
    if (!p || !p.ref) return;
    var R = readAll(SH_R, RC), row = null;
    for (var i = 0; i < R.length; i++) if (R[i].order === o.id) { row = R[i]; break; }
    var ok = o.status === 'Отримане' || o.status === 'Виплачено', r = findById(P, row ? row.refId : p.ref);
    if (row) {
      if (row.status === 'Виплачено') return;                                  // уже виплачено — не чіпаємо
      var pct = num(row.pct), bonus = Math.round(earnOf(o) * pct / 100);
      if (ok && bonus > 0) { if (row.status !== 'До виплати' || num(row.bonus) !== bonus) { row.status = 'До виплати'; row.earn = String(Math.round(earnOf(o))); row.bonus = String(bonus); write(SH_R, RC, row); } }
      else if (row.status !== 'Скасовано') { row.status = 'Скасовано'; write(SH_R, RC, row); }
      return;
    }
    if (!ok || !r || r.status === 'Заблокований') return;
    var pc = refPct(p, o, readAll(SH_O, OC)), b = Math.round(earnOf(o) * pc / 100);
    if (!pc || b <= 0) return;
    write(SH_R, RC, { order: o.id, created: now(), refId: r.id, refName: r.name, partnerId: p.id, partner: p.name, earn: String(Math.round(earnOf(o))),
      pct: String(pc), bonus: String(b), status: 'До виплати', paidAt: '' });
    toPartner(r, '🤝 <b>Бонус за рекомендацію: +' + money(b) + '</b>\n' + h(firstName(p.name)) + ' отримав(-ла) замовлення — вам ' + pc + '% від його заробітку. Бонус виплачується разом із вашим заробітком.',
      { inline_keyboard: [[{ text: '📱 Кабінет', web_app: { url: APP_URL + '#profile' } }]] });
  } catch (x) { console.error('refSync', x); }
}
ACTIONS.p_ref = function (b) {
  var p = auth(b), P = readAll(SH_P, PC), O = readAll(SH_O, OC), R = readAll(SH_R, RC).filter(function (r) { return r.refId === p.id; });
  var inv = P.filter(function (x) { return x.ref === p.id; }).map(function (x) {
    var mine = R.filter(function (r) { return r.partnerId === x.id && r.status !== 'Скасовано'; }), six = new Date(x.created); six.setMonth(six.getMonth() + REF.months);
    var sold = O.some(function (o) { return o.partnerId === x.id && CANC_ST.indexOf(o.status) < 0; });
    return { name: firstName(x.name), created: x.created, sold: sold, until: six.toISOString(), bonus: mine.reduce(function (a, r) { return a + num(r.bonus); }, 0) };
  }).reverse();
  var live = R.filter(function (r) { return r.status !== 'Скасовано'; });
  return { ok: true, ref: REF, bot: prop('BOT_USER'), invited: inv,
    bonuses: live.slice(-20).reverse().map(function (r) { return { order: r.order, created: r.created, partner: firstName(r.partner), pct: num(r.pct), bonus: num(r.bonus), status: r.status }; }),
    total: live.reduce(function (a, r) { return a + num(r.bonus); }, 0), due: live.filter(function (r) { return r.status === 'До виплати'; }).reduce(function (a, r) { return a + num(r.bonus); }, 0) };
};

function award(pid) {
  try {
    if (!prop('DROP_BOT_TOKEN')) return;
    var list = readAll(SH_P, PC), p = findById(list, pid);
    if (!p) return;
    var s = pStats(pid, readAll(SH_O, OC)), st = onbState(p), got = BADGES.filter(function (b) { return b[3](s); }).map(function (b) { return b[0]; });
    var had = st.bdg, fresh = [], changed = false, msgs = [];
    if (!had) { st.bdg = got; changed = true; if (s.orders <= 1) fresh = got; }          // перший запуск: старі значки — тихо
    else { fresh = got.filter(function (x) { return had.indexOf(x) < 0; }); if (fresh.length) { st.bdg = had.concat(fresh); changed = true; } }
    if (fresh.length && !st.aoff) {
      var B = BADGES.filter(function (b) { return fresh.indexOf(b[0]) >= 0; }), nx = BADGES.filter(function (b) { return got.indexOf(b[0]) < 0; })[0];
      var ch = s.orders < 10 ? '\n\n🏆 Челендж «Перші 10 замовлень»: ' + bar10(s.orders) + ' <b>' + s.orders + '/10</b>' : '';
      msgs.push('🏅 <b>Нове досягнення: ' + B.map(function (b) { return b[1] + ' ' + b[2]; }).join(', ') + '!</b>\n' + B[B.length - 1][4] + ch +
        (nx ? '\n\nНаступна ціль: ' + nx[1] + ' ' + nx[2] : ''));
    }
    // умова нового рівня маржі: оборот за місяць ≥ порогу → підказка партнеру й менеджеру (рівень підвищує менеджер)
    var nl = LV_NEXT[p.level || 'Starter'], key = nl ? s.month + ':' + nl : '';
    if (nl && s.turn >= LV_TURN[nl] && st.lvq !== key) {
      st.lvq = key; changed = true;
      if (!st.aoff) msgs.push('🎯 <b>Ви виконали умову рівня ' + nl + '!</b>\nОборот за цей місяць — ' + money(s.turn) + ' (поріг ' + money(LV_TURN[nl]) + '). Менеджер перевірить і підвищить рівень — маржа стане від ' + LEVELS[nl] + '%.');
      notifyManager('📈 <b>Партнер досяг обороту рівня ' + nl + '</b>\n' + h(p.id + ' · ' + p.name) + ' (зараз ' + h(p.level || 'Starter') + ')\nОборот за місяць: ' + money(s.turn) + ' з ' + money(LV_TURN[nl]) +
        '\nПідвищити: адмінка → Партнери → ' + h(p.id) + ' → рівень ' + nl + '.');
    }
    if (changed) {
      var sh = sheet(SH_P, PC), col = PC.map(function (c) { return c[0]; }).indexOf('onb') + 1;
      if (String(sh.getRange(p._r, 1).getValue()) === p.id) sh.getRange(p._r, col).setNumberFormat('@').setValue(JSON.stringify(st));
    }
    if (p.tgId) msgs.forEach(function (m) { send(p.tgId, m, { inline_keyboard: [[{ text: '🏆 Мої досягнення', web_app: { url: APP_URL + '#home' } }, { text: '⚙️ Налаштування', callback_data: 'set|show' }]] }); });
  } catch (x) { console.error('award', x); }
}
