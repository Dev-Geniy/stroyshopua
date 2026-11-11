/**
 * Samostroy Shop — прийом замовлень з сайту, API для admin.html і два Telegram-боти:
 *   • адмін-бот (для власника) — нові замовлення й заявки з кнопками статусів, ТТН, звіт щоранку,
 *     пошук, листування з клієнтами й партнерами; сюди ж приходять сповіщення кабінету партнерів;
 *   • клієнтський бот — покупець стежить за статусом і ТТН, бачить свої замовлення, пише менеджеру.
 *
 * Секрети НЕ пишуться в цей код. Вони зберігаються у «Властивостях скрипта»
 * (Налаштування проєкту → Властивості скрипта):
 *   ADMIN_PASS        — пароль для admin.html (той самий у скрипті кабінету партнерів)
 *   BOT_TOKEN         — токен адмін-бота від @BotFather
 *   CLIENT_BOT_TOKEN  — токен клієнтського бота від @BotFather
 *   CHAT_ID           — заповнюється сам, коли ви напишете адмін-боту /login пароль
 * Після вставки коду: Розгорнути → Керувати розгортаннями → Нова версія, потім запустіть setupBots().
 * Покрокова інструкція — tools/main-api/ЯК-ЗАПУСТИТИ-БОТІВ.md.
 */

const SHEET_NAME = 'Замовлення';
const HEAD = ['№', 'Дата', 'Статус', 'Ім’я', 'Телефон', 'Місто / відділення', 'Оплата', 'Доставка',
  'Сума, ₴', 'Товари', 'Тип', 'ТТН', 'Коментар', 'Оновлено', 'Сторінка', 'Мова', 'Товари (дані)', 'Ключ', 'Telegram клієнта'];
const C = {}; HEAD.forEach((h, i) => C[h] = i);           // номер колонки за назвою (від 0)
const STATUSES = ['Нове', 'Підтверджене', 'Відправлене', 'Виконане', 'Скасоване'];
const TZ = 'Europe/Kyiv';
const SITE = 'https://samostroy.shop/';
const MANAGER = 'manager_samostroy_shop';
// адреси розгорнутих скриптів (як у config.js); можна перевизначити властивостями WEB_APP_URL і PARTNER_API
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzeYmkpMqlVwH6RsNc67d3YDuFGinnPmfy6UnWcW0FYEUpaoforC5m-GF4T1NVEMonn4w/exec';
const PARTNER_API = 'https://script.google.com/macros/s/AKfycbxEYmnhjGKGAZz-3RwFFQTR7XItSeFp8xPlrVQfFtrh-6L0reedHd-C21a0_HZ227mI/exec';

/* ---------------- вхід ---------------- */
function doGet() {
  return out_({ ok: true, service: 'samostroy-orders', time: new Date().toISOString() });
}

function doPost(e) {
  if (e && e.parameter && e.parameter.bot) return botWebhook_(e);
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (x) { return out_({ ok: false, error: 'bad_json' }); }
  try {
    if (req.action === 'order') return out_(newOrder_(req.order || {}));
    if (req.action === 'login' || req.action === 'list' || req.action === 'update') {
      const a = auth_(req.pass);
      if (a !== true) return out_({ ok: false, error: a });
      if (req.action === 'login') return out_({ ok: true, statuses: STATUSES });
      if (req.action === 'list') return out_({ ok: true, orders: list_(req.limit), statuses: STATUSES, now: new Date().toISOString() });
      if (req.action === 'update') return out_(update_(req));
    }
    return out_({ ok: false, error: 'unknown_action' });
  } catch (err) {
    console.error(err);
    return out_({ ok: false, error: 'server', detail: String(err && err.message || err) });
  }
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------- нове замовлення ---------------- */
function newOrder_(o) {
  if (o.hp) return { ok: true, id: '0' };                  // пастка для ботів-спамерів: тихо ігноруємо
  const phone = clean_(o.phone, 30);
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 13) return { ok: false, error: 'phone' };
  const items = (Array.isArray(o.items) ? o.items : []).slice(0, 100).map(x => ({
    id: clean_(x.id, 40), name: clean_(x.name, 200), sku: clean_(x.sku, 40),
    q: Math.max(1, Math.min(9999, parseInt(x.q, 10) || 1)),
    price: Math.max(0, Math.round((+x.price || 0) * 100) / 100)
  })).filter(x => x.name);
  if (!items.length) return { ok: false, error: 'items' };

  // захист від спаму: не більше 5 замовлень з одного телефону і 60 загалом за 10 хвилин
  const cache = CacheService.getScriptCache();
  const k1 = 'rl_' + digits, n1 = +(cache.get(k1) || 0), n2 = +(cache.get('rl_all') || 0);
  if (n1 >= 5 || n2 >= 60) return { ok: false, error: 'rate' };
  cache.put(k1, String(n1 + 1), 600); cache.put('rl_all', String(n2 + 1), 600);

  const key = clean_(o.key, 40);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let id;
  try {
    const sh = sheet_();
    const last = sh.getLastRow();
    // повторне натискання тієї ж кнопки — повертаємо той самий номер
    if (key && last > 1) {
      const from = Math.max(2, last - 49);
      const rows = sh.getRange(from, 1, last - from + 1, HEAD.length).getValues();
      const dup = rows.find(r => r[C['Ключ']] === key);
      if (dup) return withTg_({ ok: true, id: String(dup[C['№']]), dup: true }, String(dup[C['Тип']]));
    }
    const now = new Date();
    const day = Utilities.formatDate(now, TZ, 'ddMM');
    // номер виду 2210-007: дата і порядковий номер за день
    let seq = 1;
    if (last > 1) {
      const prev = String(sh.getRange(last, C['№'] + 1).getValue());
      if (prev.indexOf(day + '-') === 0) seq = (parseInt(prev.split('-')[1], 10) || 0) + 1;
    }
    id = day + '-' + ('00' + seq).slice(-3);
    const total = items.reduce((a, x) => a + x.q * x.price, 0);
    const lead = isLead_(o.type);   // заявка (партнер, опт, відгук…), а не замовлення товару
    const text = lead ? items.map(x => x.name).join('\n') : items.map(x => `${x.name}${x.sku ? ' (' + x.sku + ')' : ''} × ${x.q} = ${money_(x.q * x.price)}`).join('\n');
    const row = new Array(HEAD.length).fill('');
    row[C['№']] = id; row[C['Дата']] = now; row[C['Статус']] = 'Нове';
    row[C['Ім’я']] = clean_(o.name, 80); row[C['Телефон']] = "'" + phone;   // апостроф — щоб таблиця не з'їла «+380»
    row[C['Місто / відділення']] = clean_(o.city, 200); row[C['Оплата']] = clean_(o.pay, 40); row[C['Доставка']] = clean_(o.delivery, 40);
    row[C['Сума, ₴']] = total; row[C['Товари']] = text; row[C['Тип']] = clean_(o.type, 30) || 'Кошик';
    row[C['Оновлено']] = now; row[C['Сторінка']] = clean_(o.page, 300); row[C['Мова']] = clean_(o.lang, 5);
    row[C['Товари (дані)']] = JSON.stringify(items); row[C['Ключ']] = key;
    sh.appendRow(row);
    o = { id, phone, name: row[C['Ім’я']], city: row[C['Місто / відділення']], pay: row[C['Оплата']], delivery: row[C['Доставка']], type: row[C['Тип']], text, total, status: 'Нове', page: row[C['Сторінка']] };
  } finally { lock.releaseLock(); }

  try { notify_(o); } catch (err) { console.error('telegram', err); }   // помилка бота не скасовує замовлення
  return withTg_({ ok: true, id }, o.type);
}
// посилання «Стежити за статусом у Telegram» для сторінки подяки (лише для замовлень товарів)
function withTg_(r, type) {
  const bu = prop_('CLIENT_BOT_USER');
  if (bu && kind_(type) === 'order') { r.tg = 'https://t.me/' + bu + '?start=o_' + r.id + '_' + sig_(r.id); r.bot = bu; }
  return r;
}

/* ---------------- адмінка ---------------- */
function auth_(pass) {
  const real = prop_('ADMIN_PASS');
  if (!real) return 'no_pass_set';
  const cache = CacheService.getScriptCache();
  const fails = +(cache.get('auth_fail') || 0);
  if (fails >= 10) return 'locked';                       // 10 невдалих спроб — пауза 10 хвилин
  if (String(pass || '') !== real) { cache.put('auth_fail', String(fails + 1), 600); return 'auth'; }
  return true;
}

function list_(limit) {
  const sh = sheet_(), last = sh.getLastRow();
  if (last < 2) return [];
  const n = Math.min(last - 1, Math.max(1, Math.min(+limit || 1000, 3000)));
  const rows = sh.getRange(last - n + 1, 1, n, HEAD.length).getValues();
  return rows.reverse().map(rowToObj_);
}

function update_(req) {
  const ch = {};
  if (req.status !== undefined) ch.status = req.status;
  if (req.ttn !== undefined) ch.ttn = req.ttn;
  if (req.comment !== undefined) ch.comment = req.comment;
  return updateCore_(String(req.id || ''), ch);
}
// зміна запису (з адмінки або кнопками в адмін-боті) + повідомлення клієнту в клієнтський бот
function updateCore_(id, ch) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let old, obj;
  try {
    const sh = sheet_(), last = sh.getLastRow();
    if (last < 2) return { ok: false, error: 'not_found' };
    const ids = sh.getRange(2, 1, last - 1, 1).getValues().map(r => String(r[0]));
    const i = ids.lastIndexOf(id);
    if (i < 0) return { ok: false, error: 'not_found' };
    const r = i + 2, rng = sh.getRange(r, 1, 1, HEAD.length), row = rng.getValues()[0];
    old = rowToObj_(row);
    if (ch.status !== undefined) {
      if (STATUSES.indexOf(ch.status) < 0) return { ok: false, error: 'status' };
      row[C['Статус']] = ch.status;
    }
    if (ch.ttn !== undefined) row[C['ТТН']] = "'" + clean_(ch.ttn, 40).replace(/^'/, '');
    if (ch.comment !== undefined) row[C['Коментар']] = clean_(ch.comment, 2000);
    if (ch.tg !== undefined) row[C['Telegram клієнта']] = ch.tg;
    row[C['Оновлено']] = new Date();
    rng.setValues([row]);
    obj = rowToObj_(sh.getRange(r, 1, 1, HEAD.length).getValues()[0]);
  } finally { lock.releaseLock(); }
  try { tellClient_(obj, old); } catch (err) { console.error('client bot', err); }
  return { ok: true, order: obj };
}

function rowToObj_(r) {
  let items = [];
  try { items = JSON.parse(r[C['Товари (дані)']] || '[]'); } catch (x) { }
  const d = v => v instanceof Date ? v.toISOString() : String(v || '');
  return {
    id: String(r[C['№']]), created: d(r[C['Дата']]), status: String(r[C['Статус']] || 'Нове'),
    name: String(r[C['Ім’я']] || ''), phone: String(r[C['Телефон']] || '').replace(/^'/, ''),
    city: String(r[C['Місто / відділення']] || ''), pay: String(r[C['Оплата']] || ''), delivery: String(r[C['Доставка']] || ''),
    total: +r[C['Сума, ₴']] || 0, text: String(r[C['Товари']] || ''), type: String(r[C['Тип']] || ''),
    ttn: String(r[C['ТТН']] || '').replace(/^'/, ''), comment: String(r[C['Коментар']] || ''),
    updated: d(r[C['Оновлено']]), page: String(r[C['Сторінка']] || ''), items,
    tg: !!String(r[C['Telegram клієнта']] || '')
  };
}
function allRows_() {
  const sh = sheet_(), last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, HEAD.length).getValues().map((r, i) => ({ r: i + 2, raw: r, o: rowToObj_(r) }));
}

/* ---------------- Telegram: загальне ---------------- */
function prop_(k) { return PropertiesService.getScriptProperties().getProperty(k) || ''; }
function setProp_(k, v) { const p = PropertiesService.getScriptProperties(); if (v === '' || v == null) p.deleteProperty(k); else p.setProperty(k, String(v)); }
function h_(s) { return String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
function tgCall_(token, method, payload) {
  if (!token) return null;
  try {
    const r = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/' + method, {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true, payload: JSON.stringify(payload || {})
    });
    return JSON.parse(r.getContentText());
  } catch (x) { console.error(method, x); return null; }
}
const adminTok_ = () => prop_('BOT_TOKEN');
const clientTok_ = () => prop_('CLIENT_BOT_TOKEN');
function adminChats_() { return prop_('CHAT_ID').split(',').map(s => s.trim()).filter(String); }
function send_(token, chat, html, kb, extra) {
  const p = Object.assign({ chat_id: chat, text: String(html).slice(0, 4000), parse_mode: 'HTML', disable_web_page_preview: true }, extra || {});
  if (kb) p.reply_markup = kb;
  return tgCall_(token, 'sendMessage', p);
}
function toAdmins_(html, kb) { let n = 0; adminChats_().forEach(c => { const r = send_(adminTok_(), c, html, kb); if (r && r.ok) n++; }); return n; }
// сумісність зі старою функцією
function tg_(token, chat, html) { return send_(token, chat, html); }
function kind_(type) {
  const t = String(type || '').trim();
  if (!t || /^(кошик|1 клік|тест)$/i.test(t)) return 'order';
  if (/відгук/i.test(t)) return 'review';
  return 'lead';
}
function isLead_(type) { return kind_(type) !== 'order'; }
function sig_(id) {
  let salt = prop_('LINK_SALT');
  if (!salt) { salt = Utilities.getUuid(); setProp_('LINK_SALT', salt); }
  return Utilities.computeHmacSha256Signature(String(id), salt).slice(0, 5).map(b => ((b + 256) % 256).toString(16).padStart(2, '0')).join('');
}
function track_(o) {
  const n = String(o.ttn || '').replace(/\s/g, '');
  return /укр/i.test(o.delivery || '') ? 'https://track.ukrposhta.ua/tracking_UA.html?barcode=' + encodeURIComponent(n) : 'https://novaposhta.ua/tracking/?cargo_number=' + encodeURIComponent(n);
}
const ICON = { order: '🛒', lead: '🤝', review: '⭐' };

/* ---------------- адмін-бот: картки й кнопки ---------------- */
function card_(o) {
  const k = kind_(o.type), lines = [];
  if (k === 'order') lines.push(`🛒 <b>Замовлення №${h_(o.id)}</b> · ${h_(o.type || 'Кошик')}`, '', h_(o.text), '', `<b>Разом: ${h_(money_(o.total))}</b>`);
  else if (k === 'review') lines.push(`⭐ <b>Новий відгук №${h_(o.id)}</b>`, '', h_(o.text));
  else lines.push(`🤝 <b>Заявка №${h_(o.id)}: ${h_(o.type)}</b>`, '', h_(String(o.text).replace(/^Заявка на дропшипінг — /, '').split('; ').join('\n')));
  lines.push(`👤 ${h_(o.name || 'без імені')}`, `📞 ${h_(o.phone)}`);
  if (o.city) lines.push(`📦 ${h_(o.city)}`);
  const dp = [o.delivery, o.pay].filter(Boolean).map(h_).join(', ');
  if (dp) lines.push(dp);
  if (o.ttn) lines.push(`🚚 ТТН <code>${h_(o.ttn)}</code>`);
  if (o.comment) lines.push(`💬 ${h_(o.comment)}`);
  if (o.status && o.status !== 'Нове') lines.push(`Статус: <b>${h_(o.status)}</b>`);
  return lines.filter(x => x !== undefined).join('\n').replace(/\n{3,}/g, '\n\n');
}
function kb_(o) {
  const k = kind_(o.type), id = o.id, row = [];
  const b = (t, a) => ({ text: t, callback_data: 'o|' + a + '|' + id });
  if (k === 'order') {
    if (o.status === 'Нове') row.push(b('✅ Підтвердити', 'c'), b('❌ Скасувати', 'x'));
    else if (o.status === 'Підтверджене') row.push(b('🚚 Відправлено · ТТН', 's'), b('✔️ Виконане', 'd'));
    else if (o.status === 'Відправлене') row.push(b('✔️ Виконане', 'd'), b('❌ Скасувати', 'x'));
  } else if (k === 'lead') {
    if (o.status === 'Нове') row.push(b('👍 Зв’язались', 'c'), b('❌ Відмова', 'x'));
    else if (o.status === 'Підтверджене') row.push(b('✔️ Закрито', 'd'), b('❌ Відмова', 'x'));
  }
  const kb = [];
  if (row.length) kb.push(row);
  kb.push([{ text: 'Відкрити в адмінці', url: SITE + 'admin.html#' + (k === 'order' ? 'orders' : k === 'review' ? 'reviews' : 'leads') }]);
  return { inline_keyboard: kb };
}
function notify_(o) {
  if (!adminTok_() || !adminChats_().length) return;
  toAdmins_(card_(o), kb_(o));
}

/* ---------------- клієнтський бот: повідомлення про статус ---------------- */
function clientChats_(row) { return String(row || '').split(',').map(s => s.trim()).filter(String); }
function tellClient_(o, old) {
  const tok = clientTok_();
  if (!tok || kind_(o.type) !== 'order') return;
  const chats = clientChatsOf_(o.id);
  if (!chats.length) return;
  let text = '', kb = null;
  if (o.status !== old.status) {
    if (o.status === 'Підтверджене') text = `✅ <b>Замовлення №${h_(o.id)} підтверджено</b>\nГотуємо до відправки — ТТН надішлемо сюди.`;
    else if (o.status === 'Відправлене') text = `🚚 <b>Замовлення №${h_(o.id)} відправлено</b>${o.ttn ? `\nТТН: <code>${h_(o.ttn)}</code>` : ''}`;
    else if (o.status === 'Виконане') {
      text = `🎉 <b>Дякуємо за покупку!</b>\nЗамовлення №${h_(o.id)} виконано. Будемо раді вашому відгуку — він допомагає іншим покупцям.`;
      kb = { inline_keyboard: [[{ text: '⭐ Залишити відгук', url: SITE + 'reviews.html' }], [{ text: '🛍 Каталог', web_app: { url: SITE } }]] };
    } else if (o.status === 'Скасоване') text = `Замовлення №${h_(o.id)} скасовано.\nЯкщо це помилка або є питання — просто напишіть сюди.`;
  } else if (o.ttn && o.ttn !== old.ttn) text = `🚚 ТТН для замовлення №${h_(o.id)}: <code>${h_(o.ttn)}</code>`;
  if (!text) return;
  if (!kb && o.ttn && (o.status === 'Відправлене' || o.ttn !== old.ttn)) kb = { inline_keyboard: [[{ text: '📍 Відстежити посилку', url: track_(o) }]] };
  chats.forEach(c => send_(tok, c, text, kb));
}
function clientChatsOf_(id) {
  const x = allRows_().filter(r => r.o.id === id).pop();
  return x ? clientChats_(x.raw[C['Telegram клієнта']]) : [];
}
function linkClient_(id, chat) {
  const x = allRows_().filter(r => r.o.id === id).pop();
  if (!x) return null;
  const L = clientChats_(x.raw[C['Telegram клієнта']]);
  if (L.indexOf(String(chat)) < 0) { L.push(String(chat)); sheet_().getRange(x.r, C['Telegram клієнта'] + 1).setValue(L.join(',')); }
  return x.o;
}

/* ---------------- приймання оновлень від Telegram ---------------- */
function botWebhook_(e) {
  try {
    const who = e.parameter.bot, key = e.parameter.k;
    const sec = prop_(who === 'admin' ? 'ADMIN_SECRET' : 'CLIENT_SECRET');
    if (sec && key === sec && (who === 'admin' || who === 'client')) {
      const u = JSON.parse(e.postData.contents);
      if (u && u.update_id) once_(who, u);
    }
  } catch (x) { console.error(x && x.stack || x); }
  // HtmlService відповідає Telegram одразу кодом 200 (ContentService дав би переадресацію 302)
  return HtmlService.createHtmlOutput('ok');
}
function once_(who, u) {
  const c = CacheService.getScriptCache(), k = who + ':' + u.update_id;
  if (c.get(k)) return;
  c.put(k, '1', 21600);
  try { who === 'admin' ? adminUpdate_(u) : clientUpdate_(u); } catch (x) { console.error(x && x.stack || x); }
}

/* ---------------- адмін-бот ---------------- */
const ADMIN_KB = { keyboard: [[{ text: '📊 Сьогодні' }, { text: '🆕 Нові' }], [{ text: '🔎 Пошук' }, { text: '🌐 Адмінка' }]], resize_keyboard: true, is_persistent: true };
function adminUpdate_(u) {
  const tok = adminTok_();
  if (u.callback_query) return adminCallback_(u.callback_query);
  const m = u.message;
  if (!m || !m.chat) return;
  const chat = String(m.chat.id), text = String(m.text || '').trim(), isAdm = adminChats_().indexOf(chat) >= 0;
  const cmd = text.match(/^\/(\w+)(?:@\w+)?(?:\s+([\s\S]+))?$/) || [];
  if (cmd[1] === 'login') {
    tgCall_(tok, 'deleteMessage', { chat_id: chat, message_id: m.message_id });     // пароль не лишається в чаті
    const c = CacheService.getScriptCache(), fk = 'login_fail:' + chat, n = +(c.get(fk) || 0);
    if (n >= 5) return send_(tok, chat, 'Забагато спроб. Спробуйте через 15 хвилин.');
    if (String(cmd[2] || '').trim() !== prop_('ADMIN_PASS')) { c.put(fk, String(n + 1), 900); return send_(tok, chat, '❌ Невірний пароль. Напишіть: /login ваш_пароль_адмінки'); }
    if (!isAdm) setProp_('CHAT_ID', adminChats_().concat([chat]).join(','));
    return send_(tok, chat, '✅ <b>Готово! Цей чат підключено до адмін-бота Samostroy Shop.</b>\nСюди приходитимуть замовлення й заявки з сайту, відгуки, партнери й замовлення партнерів — з кнопками статусів.\n\nКнопки внизу: «📊 Сьогодні» — підсумки, «🆕 Нові» — що чекає обробки, «🔎 Пошук» — за номером або телефоном. Щоранку о 9:00 — короткий звіт.', ADMIN_KB);
  }
  if (cmd[1] === 'id') return send_(tok, chat, 'ID цього чату: <code>' + h_(chat) + '</code>');
  if (!isAdm) {
    if (m.chat.type === 'private') send_(tok, chat, 'Це службовий бот магазину Samostroy Shop. Якщо ви власник — напишіть: /login пароль_адмінки');
    return;
  }
  if (cmd[1] === 'logout') { setProp_('CHAT_ID', adminChats_().filter(c => c !== chat).join(',')); return send_(tok, chat, 'Чат відключено від сповіщень.', { remove_keyboard: true }); }
  // відповіді на повідомлення бота
  if (m.reply_to_message && text) return adminReply_(m, chat, text);
  if (cmd[1] === 'start' || cmd[1] === 'help') return send_(tok, chat, '👋 <b>Адмін-бот Samostroy Shop</b>\n📊 Сьогодні — продажі й що в роботі\n🆕 Нові — необроблені замовлення й заявки з кнопками\n🔎 Пошук — /find номер або телефон\n\nЩоб відповісти клієнту чи партнеру — відповідайте (Reply) на його повідомлення.', ADMIN_KB);
  if (cmd[1] === 'today' || text === '📊 Сьогодні') return send_(tok, chat, summary_(false), { inline_keyboard: [[{ text: 'Аналітика в адмінці', url: SITE + 'admin.html#stats' }]] });
  if (cmd[1] === 'new' || text === '🆕 Нові') return sendNew_(chat);
  if (cmd[1] === 'find' && cmd[2]) return sendFind_(chat, cmd[2]);
  if (text === '🔎 Пошук') return send_(tok, chat, 'Надішліть номер замовлення (напр. 1111-003) або телефон клієнта відповіддю на це повідомлення.', { force_reply: true, input_field_placeholder: 'Номер або телефон' });
  if (text === '🌐 Адмінка') return send_(tok, chat, 'Адмінка магазину:', { inline_keyboard: [[{ text: 'Відкрити адмінку', url: SITE + 'admin.html' }]] });
  if (text && !cmd[1] && /^[\d\s+()-]{4,}$/.test(text)) return sendFind_(chat, text);
}
function adminReply_(m, chat, text) {
  const tok = adminTok_(), src = String(m.reply_to_message.text || m.reply_to_message.caption || '');
  const reply = (t, kb) => send_(tok, chat, t, kb, { reply_to_message_id: m.message_id });
  let x;
  if (/номер замовлення .*або телефон/i.test(src)) return sendFind_(chat, text);
  if ((x = src.match(/ТТН для замовлення (Z\d+)/))) {                               // замовлення партнера
    const ttn = text.replace(/\D/g, '');
    if (ttn.length < 8) return reply('Це не схоже на ТТН. Надішліть лише цифри, напр. 20450012345678.');
    const r = papi_({ action: 'a_order', id: x[1], status: 'Відправлене', ttn });
    return reply(r && r.ok ? `🚚 ${h_(x[1])}: відправлено, ТТН <code>${h_(ttn)}</code>. Партнер отримав сповіщення.` : '⚠️ Не вдалося: ' + h_(r && r.error || 'немає зв’язку з кабінетом партнерів'), r && r.ok ? pkb_(r.order) : null);
  }
  if ((x = src.match(/ТТН для замовлення №?(\d{4}-\d+)/))) {                        // замовлення сайту
    const ttn = text.replace(/\D/g, '');
    if (ttn.length < 8) return reply('Це не схоже на ТТН. Надішліть лише цифри, напр. 20450012345678.');
    const r = updateCore_(x[1], { status: 'Відправлене', ttn });
    return reply(r.ok ? `🚚 №${h_(x[1])}: відправлено, ТТН <code>${h_(ttn)}</code>.${r.order.tg ? ' Клієнт отримав сповіщення в Telegram.' : ' Клієнт не підписаний на бот — надішліть йому ТТН самі.'}` : '⚠️ Замовлення не знайдено.', r.ok ? kb_(r.order) : null);
  }
  if ((x = src.match(/#c(-?\d+)/))) {                                                // клієнт з клієнтського бота
    const r = send_(clientTok_(), x[1], '💬 <b>Менеджер Samostroy Shop:</b>\n' + h_(text));
    return reply(r && r.ok ? '✅ Відповідь надіслано клієнту.' : '⚠️ Не вдалося надіслати: клієнт зупинив бота.');
  }
  if ((x = src.match(/#u(\d+)/))) {                                                  // партнер з бота партнерів
    const r = papi_({ action: 'a_tgsend', chat: x[1], text });
    return reply(r && r.ok ? '✅ Відповідь надіслано партнеру.' : '⚠️ Не вдалося: ' + h_(r && r.error || 'немає зв’язку з кабінетом партнерів'));
  }
}
function adminCallback_(q) {
  const tok = adminTok_(), chat = String(q.message && q.message.chat.id || ''), d = String(q.data || '').split('|');
  let ans = '';
  if (adminChats_().indexOf(chat) < 0) ans = 'Немає доступу';
  else if (d[0] === 'o') {                                                           // замовлення / заявка сайту
    if (d[1] === 's') { send_(tok, chat, `🚚 Впишіть ТТН для замовлення №${d[2]} — надішліть номер відповіддю на це повідомлення.`, { force_reply: true, input_field_placeholder: 'Номер ТТН' }); ans = 'Чекаю ТТН'; }
    else {
      const to = { c: 'Підтверджене', d: 'Виконане', x: 'Скасоване' }[d[1]];
      const r = to ? updateCore_(d[2], { status: to }) : null;
      if (r && r.ok) {
        tgCall_(tok, 'editMessageText', { chat_id: chat, message_id: q.message.message_id, text: card_(r.order) + stamp_(q), parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: kb_(r.order) });
        ans = 'Статус: ' + to + (r.order.tg ? '. Клієнту надіслано сповіщення' : '');
      } else ans = 'Не вдалося змінити статус';
    }
  } else if (d[0] === 'a') {                                                         // замовлення партнера (кабінет партнерів)
    if (d[1] === 's') { send_(tok, chat, `🚚 Впишіть ТТН для замовлення ${d[2]} — надішліть номер відповіддю на це повідомлення.`, { force_reply: true, input_field_placeholder: 'Номер ТТН' }); ans = 'Чекаю ТТН'; }
    else {
      const to = { c: 'Підтверджене', x: 'Скасоване', g: 'Отримане', v: 'Повернення' }[d[1]];
      const r = to ? papi_({ action: 'a_order', id: d[2], status: to }) : null;
      if (r && r.ok) {
        tgCall_(tok, 'editMessageText', { chat_id: chat, message_id: q.message.message_id, text: String(q.message.text || '').slice(0, 3700) + '\n\n➜ ' + to + stamp_(q, true), reply_markup: pkb_(r.order), disable_web_page_preview: true });
        ans = 'Статус: ' + to + '. Партнер отримав сповіщення';
      } else ans = 'Не вдалося: ' + (r && r.error || 'немає зв’язку з кабінетом партнерів');
    }
  } else if (d[0] === 'more') { sendNew_(chat, +d[1] || 10); }
  tgCall_(tok, 'answerCallbackQuery', { callback_query_id: q.id, text: ans });
}
function stamp_(q, plain) {
  const who = q.from.username ? '@' + q.from.username : (q.from.first_name || '');
  const t = Utilities.formatDate(new Date(), TZ, 'dd.MM HH:mm');
  return plain ? ' · ' + who + ' · ' + t : '\n<i>' + h_(who) + ' · ' + t + '</i>';
}
// кнопки для замовлення партнера (як у боті партнерів)
function pkb_(o) {
  const id = o.id, row = [];
  if (o.status === 'Нове') row.push({ text: '✅ Підтвердити', callback_data: 'a|c|' + id }, { text: '❌ Скасувати', callback_data: 'a|x|' + id });
  else if (o.status === 'Підтверджене') row.push({ text: '🚚 Відправлено · ТТН', callback_data: 'a|s|' + id }, { text: '❌ Скасувати', callback_data: 'a|x|' + id });
  else if (o.status === 'Відправлене') row.push({ text: '📬 Отримане', callback_data: 'a|g|' + id }, { text: '↩️ Повернення', callback_data: 'a|v|' + id });
  const kb = []; if (row.length) kb.push(row);
  kb.push([{ text: 'Відкрити в адмінці', url: SITE + 'admin.html#partners' }]);
  return { inline_keyboard: kb };
}
function papi_(body) {
  const url = prop_('PARTNER_API') || PARTNER_API;
  try {
    const r = UrlFetchApp.fetch(url, { method: 'post', contentType: 'text/plain', muteHttpExceptions: true, followRedirects: true,
      payload: JSON.stringify(Object.assign({ pass: prop_('ADMIN_PASS') }, body)) });
    return JSON.parse(r.getContentText());
  } catch (x) { console.error('papi', x); return null; }
}
function summary_(morning) {
  const L = allRows_().map(x => x.o), now = new Date();
  const day0 = new Date(Utilities.formatDate(now, TZ, "yyyy-MM-dd'T'00:00:00XXX"));
  const dAgo = n => new Date(day0.getTime() - n * 864e5);
  const ord = L.filter(o => kind_(o.type) === 'order' && o.status !== 'Скасоване');
  const sum = A => A.reduce((a, o) => a + o.total, 0);
  const inR = (o, a, b) => { const t = new Date(o.created); return t >= a && (!b || t < b); };
  const today = ord.filter(o => inR(o, day0)), yest = ord.filter(o => inR(o, dAgo(1), day0)), week = ord.filter(o => inR(o, dAgo(6)));
  const fresh = L.filter(o => o.status === 'Нове'), noTtn = ord.filter(o => o.status === 'Підтверджене');
  const out = [morning ? '☀️ <b>Доброго ранку! Підсумки Samostroy Shop</b>' : '📊 <b>Samostroy Shop — сьогодні</b>', ''];
  if (morning) out.push(`Вчора: <b>${yest.length}</b> замовл. на <b>${money_(sum(yest))}</b>`);
  else out.push(`Сьогодні: <b>${today.length}</b> замовл. на <b>${money_(sum(today))}</b>`, `Вчора: ${yest.length} на ${money_(sum(yest))}`);
  out.push(`7 днів: ${week.length} на ${money_(sum(week))}${week.length ? ' · середній чек ' + money_(sum(week) / week.length) : ''}`, '');
  out.push(`🆕 Не оброблено: <b>${fresh.filter(o => kind_(o.type) === 'order').length}</b> замовл., <b>${fresh.filter(o => kind_(o.type) === 'lead').length}</b> заявок, <b>${fresh.filter(o => kind_(o.type) === 'review').length}</b> відгуків`);
  out.push(`📦 Підтверджені без відправки: <b>${noTtn.length}</b>`);
  const p = papi_({ action: 'a_list' });
  if (p && p.ok) {
    const po = (p.orders || []).filter(o => o.status === 'Нове').length, pp = (p.partners || []).filter(x => new Date(x.created) >= (morning ? dAgo(1) : day0)).length;
    out.push(`🤝 Партнери: нових замовлень ${po}, ${morning ? 'нових партнерів за добу' : 'нових партнерів сьогодні'} ${pp}`);
  }
  return out.join('\n');
}
function sendNew_(chat, limit) {
  const tok = adminTok_(), L = allRows_().map(x => x.o).filter(o => o.status === 'Нове' || (kind_(o.type) === 'order' && o.status === 'Підтверджене')).reverse();
  if (!L.length) return send_(tok, chat, '✅ Усе оброблено — нових замовлень і заявок немає.');
  const n = limit || 8;
  send_(tok, chat, `🆕 Чекають обробки: <b>${L.length}</b>${L.length > n ? ` (показую ${n} найновіших)` : ''}`);
  L.slice(0, n).forEach(o => send_(tok, chat, card_(o), kb_(o)));
  if (L.length > n) send_(tok, chat, `Ще ${L.length - n} — в адмінці.`, { inline_keyboard: [[{ text: 'Відкрити адмінку', url: SITE + 'admin.html' }]] });
}
function sendFind_(chat, q) {
  const tok = adminTok_(), s = String(q).trim(), dg = s.replace(/\D/g, '');
  const L = allRows_().map(x => x.o).filter(o => o.id === s || (dg.length >= 7 && o.phone.replace(/\D/g, '').slice(-9).indexOf(dg.slice(-9)) >= 0) || (dg.length >= 8 && o.ttn.indexOf(dg) >= 0)).reverse();
  if (!L.length) return send_(tok, chat, 'Нічого не знайдено за «' + h_(s) + '».');
  L.slice(0, 6).forEach(o => send_(tok, chat, card_(o), kb_(o)));
  if (L.length > 6) send_(tok, chat, `Знайдено ${L.length}, показано 6 найновіших.`);
}
/** Ранковий звіт (тригер о 9:00, створює setupBots). */
function dailyReport() {
  if (!adminTok_() || !adminChats_().length) return;
  toAdmins_(summary_(true), { inline_keyboard: [[{ text: '🆕 Показати необроблені', callback_data: 'more|8' }]] });
}

/* ---------------- клієнтський бот ---------------- */
function clientUpdate_(u) {
  const tok = clientTok_();
  if (u.callback_query) {
    const q = u.callback_query;
    if (q.data === 'my') clientOrders_(String(q.message.chat.id));
    if (q.data === 'help') send_(tok, q.message.chat.id, '💬 Напишіть своє питання сюди одним повідомленням — менеджер відповість у цей чат. Можна надіслати фото стіни чи розміри.');
    return tgCall_(tok, 'answerCallbackQuery', { callback_query_id: q.id });
  }
  const m = u.message;
  if (!m || !m.chat || m.chat.type !== 'private') return;
  const chat = String(m.chat.id), from = m.from || {}, text = String(m.text || '').trim();
  const cmd = text.match(/^\/(\w+)(?:@\w+)?(?:\s+(\S+))?/) || [];
  if (cmd[1] === 'start' && cmd[2] && /^o_/.test(cmd[2])) {
    const p = cmd[2].slice(2), i = p.lastIndexOf('_'), id = p.slice(0, i), s = p.slice(i + 1);
    if (!id || s !== sig_(id)) return send_(tok, chat, 'Посилання не спрацювало. Натисніть «📦 Мої замовлення» й поділіться номером телефону — знайдемо ваші замовлення.', contactKb_());
    const o = linkClient_(id, chat);
    if (!o) return send_(tok, chat, 'Замовлення не знайдено.');
    send_(tok, chat, `✅ <b>Ви стежите за замовленням №${h_(o.id)}</b>\nСюди прийдуть підтвердження, ТТН і статус доставки.\n\n${clientLine_(o)}`, menuKb_());
    return;
  }
  if (m.contact) {
    if (String(m.contact.user_id || '') !== String(from.id)) return send_(tok, chat, 'Будь ласка, поділіться саме своїм номером — кнопкою «📱 Поділитися номером».', contactKb_());
    const dg = String(m.contact.phone_number).replace(/\D/g, '').slice(-9);
    const L = allRows_().filter(x => kind_(x.o.type) === 'order' && x.o.phone.replace(/\D/g, '').slice(-9) === dg).slice(-10);
    L.forEach(x => linkClient_(x.o.id, chat));
    send_(tok, chat, L.length ? `📱 Номер підтверджено. Знайшли замовлень: <b>${L.length}</b>. Статуси й ТТН тепер приходитимуть сюди.` : '📱 Номер підтверджено, але замовлень з ним поки немає. Коли оформите — натисніть на сайті «Отримувати статус у Telegram».', { remove_keyboard: true });
    if (L.length) clientOrders_(chat);
    return;
  }
  if (cmd[1] === 'start') return send_(tok, chat, `👋 <b>Вітаємо в Samostroy Shop!</b>\nСамоклеючі 3D панелі, PET і вінілова плитка, плівка, шпалери й підлога — ремонт своїми руками без майстрів і бруду.\n\n• 🛍 Каталог з цінами — прямо тут\n• 📦 Статус замовлення й ТТН\n• 💬 Питання — просто напишіть повідомлення, відповість менеджер`, menuKb_());
  if (cmd[1] === 'orders' || text === '📦 Мої замовлення') return clientOrders_(chat);
  if (cmd[1] === 'catalog') return send_(tok, chat, 'Каталог Samostroy Shop:', { inline_keyboard: [[{ text: '🛍 Відкрити каталог', web_app: { url: SITE } }]] });
  if (cmd[1] === 'help') return send_(tok, chat, '💬 Напишіть питання сюди — менеджер відповість у цей чат.\nТелефон: +380 98 492 79 48\nПн–Сб, 9:00–19:00');
  if (cmd[1]) return send_(tok, chat, 'Оберіть дію:', menuKb_());
  // повідомлення клієнта — власнику в адмін-бот
  if (!adminTok_() || !adminChats_().length) return send_(tok, chat, 'Напишіть, будь ласка, менеджеру: @' + MANAGER, { inline_keyboard: [[{ text: 'Написати менеджеру', url: 'https://t.me/' + MANAGER }]] });
  const ids = allRows_().filter(x => clientChats_(x.raw[C['Telegram клієнта']]).indexOf(chat) >= 0).map(x => '№' + x.o.id).slice(-3);
  const who = h_([from.first_name, from.last_name].filter(Boolean).join(' ')) + (from.username ? ' · @' + h_(from.username) : '');
  const head = `💬 <b>Клієнт пише в бот</b>\n${who}${ids.length ? '\nЗамовлення: ' + ids.join(', ') : ''}\n#c${chat}`;
  const body = text ? h_(text) : (m.caption ? h_(m.caption) + '\n' : '') + '📎 <i>надіслав ' + (m.photo ? 'фото' : m.voice ? 'голосове' : m.document ? 'файл' : 'вкладення') + ' — його видно лише в клієнтському боті; попросіть описати текстом або продублювати в Viber</i>';
  toAdmins_(head + '\n\n' + body + '\n\n<i>Відповідайте (Reply) на це повідомлення — відповідь піде клієнту.</i>');
  send_(tok, chat, '✅ Передали менеджеру. Відповідь прийде сюди — зазвичай протягом години в робочий час.');
}
function menuKb_() {
  return { inline_keyboard: [[{ text: '🛍 Каталог', web_app: { url: SITE } }, { text: '📦 Мої замовлення', callback_data: 'my' }],
    [{ text: '💬 Питання менеджеру', callback_data: 'help' }], [{ text: '⭐ Відгуки покупців', url: SITE + 'reviews.html' }]] };
}
function contactKb_() { return { keyboard: [[{ text: '📱 Поділитися номером', request_contact: true }]], resize_keyboard: true, one_time_keyboard: true }; }
function clientLine_(o) {
  const st = { 'Нове': '🕐 Прийнято, чекає підтвердження', 'Підтверджене': '✅ Підтверджено, готуємо до відправки', 'Відправлене': '🚚 Відправлено', 'Виконане': '🎉 Виконано', 'Скасоване': '✖️ Скасовано' }[o.status] || o.status;
  return `<b>№${h_(o.id)}</b> · ${Utilities.formatDate(new Date(o.created), TZ, 'dd.MM.yyyy')}\n${h_(o.text.split('\n').slice(0, 4).join('\n'))}\nРазом: <b>${h_(money_(o.total))}</b>\n${st}${o.ttn ? `\nТТН: <code>${h_(o.ttn)}</code>` : ''}`;
}
function clientOrders_(chat) {
  const tok = clientTok_(), L = allRows_().filter(x => clientChats_(x.raw[C['Telegram клієнта']]).indexOf(String(chat)) >= 0).map(x => x.o).reverse().slice(0, 5);
  if (!L.length) return send_(tok, chat, 'Поки не бачимо ваших замовлень. Натисніть кнопку нижче й поділіться номером телефону, з яким оформлювали замовлення — ми їх знайдемо.', contactKb_());
  L.forEach(o => send_(tok, chat, clientLine_(o), o.ttn && o.status === 'Відправлене' ? { inline_keyboard: [[{ text: '📍 Відстежити посилку', url: track_(o) }]] } : null));
}

/* ---------------- допоміжне ---------------- */
function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEAD);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEAD.length).setFontWeight('bold').setBackground('#2b3138').setFontColor('#ffffff');
    sh.getRange('B:B').setNumberFormat('dd.MM.yyyy HH:mm');
    sh.getRange('N:N').setNumberFormat('dd.MM.yyyy HH:mm');
    sh.getRange('I:I').setNumberFormat('#,##0 "₴"');
    sh.getRange(2, C['Статус'] + 1, 5000, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).build());
    [90, 130, 110, 120, 130, 220, 110, 110, 90, 380, 80, 130, 220].forEach((w, i) => sh.setColumnWidth(i + 1, w));
    sh.hideColumns(C['Товари (дані)'] + 1, 3);
  } else if (!CacheService.getScriptCache().get('head_ok')) {
    // новий стовпець «Telegram клієнта» в наявній таблиці
    if (sh.getMaxColumns() < HEAD.length) sh.insertColumnsAfter(sh.getMaxColumns(), HEAD.length - sh.getMaxColumns());
    const hc = sh.getRange(1, C['Telegram клієнта'] + 1);
    if (!hc.getValue()) { hc.setValue('Telegram клієнта').setFontWeight('bold'); sh.hideColumns(C['Telegram клієнта'] + 1); }
    CacheService.getScriptCache().put('head_ok', '1', 21600);
  }
  return sh;
}
function clean_(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, max || 200); }
function money_(n) { return Math.round(n).toLocaleString('uk-UA').replace(/ /g, ' ') + ' ₴'; }

/* =============== ЗАПУСКАЙТЕ ВРУЧНУ З РЕДАКТОРА =============== */

/** 1. Створює аркуш «Замовлення» з заголовками. Запустіть один раз. */
function setup() {
  sheet_();
  console.log('Аркуш готовий. Пароль адмінки: ' + (prop_('ADMIN_PASS') ? 'задано ✓' : 'НЕ задано — додайте ADMIN_PASS у Властивості скрипта'));
}

/** 2. Підключає обидва боти: адмін-бот (BOT_TOKEN) і клієнтський (CLIENT_BOT_TOKEN). Запустіть після нового розгортання. */
function setupBots() {
  const url = prop_('WEB_APP_URL') || WEB_APP_URL, log = [];
  [['admin', 'BOT_TOKEN', 'ADMIN_SECRET', 'ADMIN_BOT_USER'], ['client', 'CLIENT_BOT_TOKEN', 'CLIENT_SECRET', 'CLIENT_BOT_USER']].forEach(([who, tk, sk, uk]) => {
    const tok = prop_(tk);
    if (!tok) { log.push(`— ${who === 'admin' ? 'Адмін-бот' : 'Клієнтський бот'}: немає ${tk} у властивостях, пропускаю`); return; }
    const me = tgCall_(tok, 'getMe', {});
    if (!me || !me.ok) { log.push(`✗ ${tk}: Telegram не прийняв токен (${me && me.description}). Перевірте, що скопіювали його повністю.`); return; }
    setProp_(uk, me.result.username);
    const sec = prop_(sk) || Utilities.getUuid().replace(/-/g, '');
    setProp_(sk, sec);
    const r = tgCall_(tok, 'setWebhook', { url: url + '?bot=' + who + '&k=' + sec, allowed_updates: ['message', 'callback_query'], drop_pending_updates: true });
    if (who === 'admin') {
      tgCall_(tok, 'setMyCommands', { commands: [{ command: 'today', description: 'Підсумки за сьогодні' }, { command: 'new', description: 'Необроблені замовлення й заявки' },
        { command: 'find', description: 'Пошук: /find номер або телефон' }, { command: 'login', description: 'Підключити чат: /login пароль' }] });
      tgCall_(tok, 'setMyDescription', { description: 'Службовий бот власника Samostroy Shop. Вхід: /login пароль_адмінки.' });
    } else {
      tgCall_(tok, 'setChatMenuButton', { menu_button: { type: 'web_app', text: 'Каталог', web_app: { url: SITE } } });
      tgCall_(tok, 'setMyCommands', { commands: [{ command: 'start', description: 'Головне меню' }, { command: 'orders', description: 'Мої замовлення' },
        { command: 'catalog', description: 'Каталог товарів' }, { command: 'help', description: 'Зв’язок з менеджером' }] });
      tgCall_(tok, 'setMyShortDescription', { short_description: 'Samostroy Shop — самоклеючі панелі, плитка й плівка для ремонту своїми руками. Статус замовлення й ТТН тут.' });
      tgCall_(tok, 'setMyDescription', { description: 'Samostroy Shop — ремонт своїми руками без майстрів.\n\n🛍 Каталог з цінами прямо в Telegram\n📦 Статус замовлення й ТТН\n💬 Питання менеджеру — просто напишіть\n\nНатисніть «Почати».' });
    }
    log.push(`${r && r.ok ? '✓' : '✗'} ${who === 'admin' ? 'Адмін-бот' : 'Клієнтський бот'} @${me.result.username}: ${r && r.ok ? 'підключено' : 'помилка вебхука — ' + (r && r.description)}`);
  });
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === 'dailyReport') ScriptApp.deleteTrigger(t); });
  if (prop_('BOT_TOKEN')) { ScriptApp.newTrigger('dailyReport').timeBased().atHour(9).everyDays(1).inTimezone(TZ).create(); log.push('✓ Ранковий звіт о 9:00'); }
  setProp_('BOT_MODE', 'hook');
  sheet_();
  log.push('', prop_('BOT_TOKEN') ? `Далі: відкрийте @${prop_('ADMIN_BOT_USER')} у Telegram і напишіть: /login ваш_пароль_адмінки` : '');
  console.log(log.join('\n'));
}

/** Перевірка: стан обох ботів (останні помилки Telegram). */
function botStatus() {
  [['Адмін-бот', 'BOT_TOKEN'], ['Клієнтський бот', 'CLIENT_BOT_TOKEN']].forEach(([n, tk]) => {
    const tok = prop_(tk);
    if (!tok) return console.log(n + ': немає токена');
    const w = tgCall_(tok, 'getWebhookInfo', {}), r = w && w.result || {};
    console.log(`${n}: ${r.url ? 'вебхук є' : 'вебхука немає'}, у черзі ${r.pending_update_count || 0}${r.last_error_message ? ', остання помилка: ' + r.last_error_message : ', помилок немає'}`);
  });
  console.log('Чати власника: ' + (adminChats_().join(', ') || 'ще не підключено (/login у адмін-боті)'));
}

/** Резервний режим, якщо боти не відповідають: опитування щохвилини замість вебхука. */
function useBotPolling() {
  [['admin', 'BOT_TOKEN'], ['client', 'CLIENT_BOT_TOKEN']].forEach(([, tk]) => { if (prop_(tk)) tgCall_(prop_(tk), 'deleteWebhook', {}); });
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === 'pollBots') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('pollBots').timeBased().everyMinutes(1).create();
  setProp_('BOT_MODE', 'poll');
  console.log('Резервний режим увімкнено: боти відповідатимуть протягом хвилини. Повернутись — запустіть setupBots().');
}
function pollBots() {
  const c = CacheService.getScriptCache();
  if (c.get('polling')) return;                     // попередній запуск ще працює
  c.put('polling', '1', 70);
  try {
    [['admin', 'BOT_TOKEN', 'OFF_ADMIN'], ['client', 'CLIENT_BOT_TOKEN', 'OFF_CLIENT']].forEach(([who, tk, ok]) => {
      const tok = prop_(tk);
      if (!tok) return;
      let off = +(prop_(ok) || 0);
      const r = tgCall_(tok, 'getUpdates', { offset: off, timeout: 0, limit: 50, allowed_updates: ['message', 'callback_query'] });
      if (!r || !r.ok) return;
      r.result.forEach(u => { off = u.update_id + 1; setProp_(ok, off); once_(who, u); });
    });
  } finally { c.remove('polling'); }
}

/** 3. Перевірка: створює тестове замовлення (потім видаліть його в адмінці). */
function testOrder() {
  console.log(JSON.stringify(newOrder_({
    type: 'Тест', name: 'Перевірка', phone: '+380000000000', city: 'Київ, відділення 1', pay: 'При отриманні', delivery: 'Нова Пошта',
    items: [{ id: 'test', name: 'Тестовий товар', sku: 'SW-TEST', q: 2, price: 100 }], key: 'test-' + Date.now()
  })));
}
