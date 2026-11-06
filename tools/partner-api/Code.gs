/**
 * Samostroy Shop — особистий кабінет партнера (окремий скрипт Google).
 *
 * Що робить: реєстрація й вхід партнерів, анкета, замовлення від партнерів,
 * їхні статуси й заробіток, а для адмінки — керування замовленнями, партнерами й виплатами.
 * Дані — у Google Таблиці, до якої прив’язано цей скрипт (аркуші створюються самі).
 *
 * Властивості скрипта (Налаштування проєкту → Властивості скрипта):
 *   ADMIN_PASS — пароль адмінки (той самий, що в основному скрипті)
 *   TG_TOKEN   — токен Telegram-бота (необов’язково, для сповіщень)
 *   TG_CHAT    — ID чату для сповіщень (необов’язково)
 *
 * Інструкція з запуску — у файлі ЯК-ЗАПУСТИТИ.md поруч.
 */

// Маржа партнера за рівнем, % від рекомендованої ціни (як у калькуляторі кабінету на сайті)
var LEVELS = { Starter: 10, Pro: 15, Team: 20 };
var STATUSES = ['Нове', 'Підтверджене', 'Відправлене', 'Отримане', 'Виплачено', 'Скасоване', 'Повернення'];
var TOKEN_DAYS = 60;

// [ключ, назва стовпця в таблиці]
var PC = [['id', 'ID'], ['created', 'Зареєстровано'], ['name', 'Ім’я'], ['phone', 'Телефон'], ['city', 'Місто'],
  ['msg', 'Telegram / Viber'], ['level', 'Рівень'], ['status', 'Статус'], ['payout', 'Реквізити для виплат'],
  ['note', 'Нотатка менеджера'], ['anketaAt', 'Анкета заповнена'], ['anketa', 'Анкета (дані)'],
  ['lastLogin', 'Останній вхід'], ['pass', 'Пароль (хеш)'], ['salt', 'Сіль'], ['tokens', 'Сесії']];
var OC = [['id', '№'], ['created', 'Створено'], ['updated', 'Оновлено'], ['partnerId', 'ID партнера'], ['partner', 'Партнер'],
  ['status', 'Статус'], ['client', 'Клієнт'], ['phone', 'Телефон клієнта'], ['city', 'Місто'], ['delivery', 'Доставка'],
  ['branch', 'Відділення'], ['pay', 'Оплата'], ['sale', 'Сума для клієнта'], ['whole', 'Оптова (орієнтовно)'],
  ['earn', 'Заробіток (орієнтовно)'], ['earnFinal', 'Заробіток (підтверджено)'], ['ttn', 'ТТН'], ['source', 'Звідки клієнт'],
  ['note', 'Коментар партнера'], ['comment', 'Коментар менеджера'], ['paidAt', 'Виплачено'], ['items', 'Товари (дані)'], ['key', 'Ключ']];
var SH_P = 'Партнери', SH_O = 'Замовлення партнерів';

/* ---------------- вхід ---------------- */
function doGet() { return out({ ok: true, service: 'samostroy-partners' }); }
function doPost(e) {
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
function withLock(fn) {
  var l = LockService.getScriptLock();
  l.waitLock(25000);
  try { return fn(); } finally { l.releaseLock(); }
}

/* ---------------- утиліти ---------------- */
function prop(k) { return PropertiesService.getScriptProperties().getProperty(k) || ''; }
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
function tg(text) {
  var t = prop('TG_TOKEN'), c = prop('TG_CHAT');
  if (!t || !c) return;
  try {
    UrlFetchApp.fetch('https://api.telegram.org/bot' + t + '/sendMessage',
      { method: 'post', payload: { chat_id: c, text: text.slice(0, 3900), disable_web_page_preview: 'true' }, muteHttpExceptions: true });
  } catch (x) { console.error(x); }
}
function money(n) { return Math.round(n).toLocaleString('uk-UA').replace(/ /g, ' ') + ' грн'; }
function marginOf(p) { return LEVELS[p.level] || LEVELS.Starter; }
function earnOf(o) { return o.earnFinal !== '' ? num(o.earnFinal) : num(o.earn); }

/* ---------------- партнер: публічні дані ---------------- */
function pubPartner(p) {
  return { id: p.id, created: p.created, name: p.name, phone: p.phone, city: p.city, msg: p.msg, level: p.level || 'Starter',
    margin: marginOf(p), status: p.status, payout: p.payout, anketa: json(p.anketa, null), anketaAt: p.anketaAt };
}
function pubOrder(o) {
  return { id: o.id, created: o.created, updated: o.updated, partnerId: o.partnerId, partner: o.partner, status: o.status,
    client: o.client, phone: o.phone, city: o.city, delivery: o.delivery, branch: o.branch, pay: o.pay,
    sale: num(o.sale), whole: num(o.whole), earn: num(o.earn), earnFinal: o.earnFinal === '' ? null : num(o.earnFinal),
    earnNow: earnOf(o), ttn: o.ttn, source: o.source, note: o.note, comment: o.comment, paidAt: o.paidAt, items: json(o.items, []) };
}
function findPhone(list, ph) { for (var i = 0; i < list.length; i++) if (list[i].phone === ph) return list[i]; return null; }

function newToken(p) {
  var t = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  var exp = Date.now() + TOKEN_DAYS * 864e5;
  var list = json(p.tokens, []).filter(function (x) { return x.e > Date.now(); });
  list.push({ t: t, e: exp });
  p.tokens = JSON.stringify(list.slice(-5));
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
    var salt = Utilities.getUuid(), an = anketaIn(b);
    var p = { id: 'P' + (1001 + list.length), created: now(), name: name, phone: ph, city: str(b.city, 80), msg: str(b.msg, 80),
      level: 'Starter', status: 'Активний', payout: '', note: '', anketa: an ? JSON.stringify(an) : '', anketaAt: an ? now() : '',
      lastLogin: now(), pass: hash(pass, salt), salt: salt, tokens: '[]' };
    var token = newToken(p);
    write(SH_P, PC, p);
    tg('🤝 Новий партнер у кабінеті\n' + p.id + ' · ' + name + '\nТелефон: +' + ph + (p.city ? '\nМісто: ' + p.city : '') + (p.msg ? '\nЗв’язок: ' + p.msg : '') + '\nАнкета: ' + (an ? 'заповнена' : 'ще ні'));
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
    tg('📝 Анкета в кабінеті' + (first ? '' : ' (оновлено)') + '\n' + p.id + ' · ' + p.name + ' · +' + p.phone + '\nПлатформ «так»: ' + yes.length + (yes.length ? ' (' + yes.join(', ') + ')' : ''));
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
      if (hash(String(b.oldPassword || ''), p.salt) !== p.pass) fail('wrong');
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
    var r = { id: 'Z' + (1001 + all.length), created: now(), updated: now(), partnerId: p.id, partner: p.name, status: 'Нове',
      client: str(o.client, 120), phone: ph, city: str(o.city, 120), delivery: str(o.delivery, 40), branch: str(o.branch, 80),
      pay: str(o.pay, 60), sale: Math.round(sale), whole: Math.round(whole), earn: Math.round(sale - whole), earnFinal: '',
      ttn: '', source: str(o.source, 60), note: str(o.note, 1000), comment: '', paidAt: '', items: JSON.stringify(items), key: key };
    write(SH_O, OC, r);
    if (key) cache().put('key:' + key, r.id, 21600);
    tg('📦 Замовлення партнера ' + r.id + '\nПартнер: ' + p.name + ' (' + p.id + ', ' + (p.level || 'Starter') + ')\n' +
      items.map(function (x, i) { return (i + 1) + '. ' + x.name + (x.sku ? ' (' + x.sku + ')' : '') + ' × ' + x.q + ' — ' + money(x.sale * x.q); }).join('\n') +
      '\n\nСума для клієнта: ' + money(sale) + '\nКлієнт: ' + r.client + ', +' + ph + '\nДоставка: ' + [r.delivery, r.city, r.branch].filter(String).join(', ') +
      '\nОплата: ' + (r.pay || '—') + (r.note ? '\nКоментар: ' + r.note : ''));
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
      tg('✖️ Партнер скасував замовлення ' + id + ' (' + p.name + ')');
      return { ok: true, order: pubOrder(list[i]) };
    }
    fail('notfound');
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

ACTIONS.a_list = function (b) {
  admin(b);
  return { ok: true, partners: readAll(SH_P, PC).map(adminPartner), orders: readAll(SH_O, OC).map(pubOrder), statuses: STATUSES, levels: LEVELS };
};

ACTIONS.a_order = function (b) {
  admin(b);
  return withLock(function () {
    var id = str(b.id, 20), list = readAll(SH_O, OC);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) {
      var o = list[i], old = o.status;
      if (b.status !== undefined) { if (STATUSES.indexOf(b.status) < 0) fail('status'); o.status = b.status; }
      if (b.ttn !== undefined) o.ttn = str(b.ttn, 40).replace(/\s/g, '');
      if (b.comment !== undefined) o.comment = str(b.comment, 1000);
      if (b.earnFinal !== undefined) o.earnFinal = b.earnFinal === '' || b.earnFinal === null ? '' : String(Math.round(num(b.earnFinal)));
      if (o.status === 'Виплачено' && old !== 'Виплачено') o.paidAt = now();
      if (o.status !== 'Виплачено') o.paidAt = '';
      o.updated = now();
      write(SH_O, OC, o);
      return { ok: true, order: pubOrder(o) };
    }
    fail('notfound');
  });
};

ACTIONS.a_partner = function (b) {
  admin(b);
  return withLock(function () {
    var id = str(b.id, 20), list = readAll(SH_P, PC);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) {
      var p = list[i];
      if (b.level !== undefined) { if (!LEVELS[b.level]) fail('level'); p.level = b.level; }
      if (b.status !== undefined) { if (['Активний', 'Заблокований'].indexOf(b.status) < 0) fail('status'); p.status = b.status; if (b.status === 'Заблокований') p.tokens = '[]'; }
      if (b.note !== undefined) p.note = str(b.note, 1000);
      write(SH_P, PC, p);
      return { ok: true, partner: adminPartner(p) };
    }
    fail('notfound');
  });
};

ACTIONS.a_pay = function (b) {
  admin(b);
  return withLock(function () {
    var id = str(b.partnerId, 20), n = 0, sum = 0, list = readAll(SH_O, OC);
    list.forEach(function (o) {
      if (o.partnerId === id && o.status === 'Отримане') { o.status = 'Виплачено'; o.paidAt = now(); o.updated = now(); n++; sum += earnOf(o); write(SH_O, OC, o); }
    });
    return { ok: true, count: n, sum: sum };
  });
};

ACTIONS.a_reset = function (b) {
  admin(b);
  return withLock(function () {
    var id = str(b.id, 20), list = readAll(SH_P, PC);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) {
      var p = list[i], abc = 'abcdefghkmnpqrstuvwxyz23456789', temp = '';
      for (var k = 0; k < 8; k++) temp += abc.charAt(Math.floor(Math.random() * abc.length));
      p.salt = Utilities.getUuid(); p.pass = hash(temp, p.salt); p.tokens = '[]';
      write(SH_P, PC, p);
      return { ok: true, password: temp };
    }
    fail('notfound');
  });
};
