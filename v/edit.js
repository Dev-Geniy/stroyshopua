/* Редактор вітрини партнера. Вхід — той самий, що в кабінеті (pk_token), перевіряє скрипт вітрин через кабінет партнерів. */
(() => {
'use strict';
const V = window.VCFG || {}, API = V.on === false ? '' : (V.api || ''), IMGBB = (window.CFG && CFG.imgbb) || '', SITE = location.origin + '/';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const M = n => Math.round(+n || 0).toLocaleString('uk-UA').replace(/\s/g, ' ') + ' ₴';
const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }, del(k) { try { localStorage.removeItem(k); } catch (e) { } } };
const IC = { star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', copy: '<path d="M9 9h11v11H9zM5 15H4V4h11v1"/>', link: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>' };
const ico = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg>`;
const THEMES = [['classic', 'Класика', 'світла, з обкладинкою', ['#f6f6f4', '#fff', null]], ['minimal', 'Мінімал', 'чисто й просто', ['#fff', '#f2f2f2', '#111']], ['dark', 'Темна', 'преміальний вигляд', ['#121417', '#1c2025', null]], ['bright', 'Яскрава', 'кольорова', [null, '#fff', null]],
  ['warm', 'Тепла', 'бежева, затишна', ['#f6efe4', '#fffaf2', null]], ['nature', 'Природна', 'свіжа, спокійна', ['#eef3ee', '#fff', null]],
  ['luxe', 'Люкс', 'чорне із золотом', ['#0d0d0f', '#17171a', null]], ['pastel', 'Пастель', 'ніжна, для дітей', [null, '#fff', null]]];
const COLORS = ['#f08a1c', '#d9480f', '#e4572e', '#d6336c', '#e64980', '#7c3aed', '#2563eb', '#0b7285', '#0e9f9a', '#2f8a4c', '#c9a227', '#c8963e', '#1d2125'];
const FONTS = [['golos', 'Golos', '"Golos Text"'], ['manrope', 'Manrope', 'Manrope'], ['montserrat', 'Montserrat', 'Montserrat'], ['unbounded', 'Unbounded', 'Unbounded'], ['playfair', 'Playfair', '"Playfair Display"'], ['comfortaa', 'Comfortaa', 'Comfortaa'], ['rubik', 'Rubik', 'Rubik']];
const from = new URLSearchParams(location.search).get('from') || sessionStorage.getItem('v_from') || '';
if (from) sessionStorage.setItem('v_from', from);
if (from === 'app') { $('#back').href = '../app/#profile'; $('#back').textContent = '‹ Telegram-кабінет'; }

// кілька вітрин (можливість feat.multi): ?s=S1002 — яку редагуємо, ?new=1 — нова вітрина
const QS = new URLSearchParams(location.search);
let SID = QS.get('s') || '', NEW = QS.get('new') === '1', STORES = [], MAXS = 10;
const DK = () => 'vdraft:' + me.id + (NEW ? ':new' : store && STORES.length > 1 && STORES[0].sid !== store.sid ? ':' + store.sid : '');
let OWN = [], OWNP = [], token = '', me = null, store = null, cfg = null, CAT = [], byId = new Map(), cats = {}, dirty = false, slugOk = true, frame = null, frameReady = false;
const blank = () => ({ name: '', slogan: '', logo: '', cover: '', theme: 'classic', accent: '#f08a1c', font: 'golos', radius: 'round', hero: 'cover', grid: 'normal', bar: '', perks: [], featTitle: '', preset: '', hideOut: true, markup: 0, round: '9', items: [], over: {}, feat: [],
  about: '', delivery: '', payment: '', fop: '', contacts: { phone: '', tg: '', viber: '', ig: '', tt: '', fb: '', hours: '' } });
let slug = '';

function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2400); }
function center(h, p, btn) { $('#main').innerHTML = `<div class="center"><div><h2>${E(h)}</h2><p>${E(p)}</p>${btn || ''}</div></div>`; }
async function api(b) {
  try { const r = await fetch(API, { method: 'POST', body: JSON.stringify(b) }); return await r.json(); } catch (e) { return { ok: false, error: 'net' }; }
}
const ERR = { multi: 'Кілька вітрин вмикає менеджер — напишіть йому.', limit: 'Досягнуто ліміту вітрин.', notfound: 'Вітрину не знайдено — оновіть сторінку.', auth: 'Сесія кабінету завершилась — увійдіть ще раз.', net: 'Немає зв’язку. Спробуйте ще раз.', noitems: 'Додайте хоча б один товар.', taken: 'Ця адреса вже зайнята — оберіть іншу.',
  slug: 'Адреса: від 3 до 30 символів — латинські літери, цифри й дефіс.', slocked: 'Після схвалення адресу змінити не можна.', blocked: 'Кабінет призупинено.', server: 'Помилка сервера. Спробуйте ще раз.' };

/* ---------- старт ---------- */
async function boot() {
  if (!API) return center('Вітрини ще налаштовуються', 'Скоро тут можна буде створити власну вітрину товарів. Слідкуйте за новинами в кабінеті.', '<a class="btn" href="../kabinet.html">До кабінету</a>');
  token = LS.get('pk_token', '');
  if (!token) return center('Увійдіть у кабінет партнера', 'Вітрину створює й налаштовує партнер зі свого кабінету.', '<a class="btn" href="../kabinet.html">Увійти в кабінет</a>');
  const [r] = await Promise.all([api({ action: 'v_mine', token, sid: SID }), loadCat()]);
  if (!r.ok) {
    if (r.error === 'auth') return center('Увійдіть у кабінет ще раз', 'Сесія завершилась.', '<a class="btn" href="../kabinet.html">Увійти</a>');
    return center('Не вдалося завантажити', ERR[r.error] || 'Спробуйте оновити сторінку.', '<button class="btn" onclick="location.reload()">Оновити</button>');
  }
  me = r.me; STORES = r.stores || []; MAXS = r.multiMax || 10;
  const multi = !!(me.feat && me.feat.multi);
  if (NEW && STORES.length && !multi) NEW = false;                  // без дозволу — лише одна вітрина
  if (NEW && STORES.length >= MAXS) { NEW = false; toast('Досягнуто ліміту вітрин'); }
  store = NEW ? null : r.store;
  if (SID && !NEW && store && store.sid !== SID) SID = store.sid;
  // власні товари партнера: схвалені — у загальний список як товари; на модерації/відхилені — лише показуємо статус
  OWN = (me.feat && me.feat.own && r.own) || [];
  OWNP = OWN.filter(x => x.status === 'Схвалено').map(x => ({ id: String(x.id), name: x.name, sku: x.sku || '', price: +x.price, av: x.av ? 1 : 0, img: (x.photos || [])[0] || '', cat: '__own', own: 1, ship: x.ship, cost: +x.cost || 0, key: (x.name + ' ' + (x.sku || '')).toLowerCase() }));
  OWNP.forEach(p => byId.set(p.id, p));
  const draft = LS.get(DK(), null);
  cfg = Object.assign(blank(), store ? store.cfg : {}, draft && draft.cfg && (!store || draft.at > Date.parse(store.updated || 0)) ? draft.cfg : {});
  cfg.contacts = Object.assign(blank().contacts, cfg.contacts || {});
  slug = store ? store.slug : (draft && draft.slug) || (NEW ? '' : suggest(me.name));
  if (!cfg.name) cfg.name = me.name;
  if (!store && !NEW && !cfg.items.length && me.favs && me.favs.length) cfg.items = me.favs.filter(id => byId.get(String(id))).slice(0, 400);
  dirty = !!(draft && store && draft.at > Date.parse(store.updated || 0));
  draw();
}
async function loadCat() {
  try {
    const j = await fetch('/app/catalog.json').then(x => x.json());
    CAT = j.items.map(a => { const o = {}; j.f.forEach((k, i) => o[k] = a[i]); o.id = String(o.id); o.key = (o.name + ' ' + o.sku).toLowerCase(); return o; });
    j.cats.forEach(c => cats[c[0]] = c[1]); byId = new Map(CAT.map(p => [p.id, p]));
  } catch (e) { }
}
const TR = { а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia', ы: 'y', э: 'e', ё: 'e', ъ: '' };
function suggest(n) { const s = String(n || '').toLowerCase().split('').map(c => TR[c] ?? c).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24); return s.length >= 3 ? s : 'shop-' + (me ? me.id.toLowerCase() : 'new'); }

/* ---------- ціни (так само рахує сервер) ---------- */
function price(p) {
  if (p.own) return Math.round(+p.price);
  const base = +p.price, o = cfg.over[p.id];
  let v;
  if (o) v = +o;
  else { v = base * (1 + Math.max(0, +cfg.markup || 0) / 100); v = cfg.round === '10' ? Math.ceil(v / 10) * 10 : cfg.round === '9' ? Math.ceil((v + 1) / 10) * 10 - 1 : Math.ceil(v); }
  return Math.max(Math.ceil(base), Math.round(v));
}
const whole = p => p.own ? (p.ship === 'shop' ? +p.cost : +p.price) : +p.price * (1 - (+me.margin || 10) / 100);

/* ---------- готові вітрини (v/presets.js) ---------- */
const PRK = {};
const pres = id => (window.VPRESETS ? VPRESETS.list : []).find(p => p.id === id);
const picked = p => PRK[p.id] || (PRK[p.id] = VPRESETS.pick(p, CAT));
function presetsCard() {
  if (!window.VPRESETS || !CAT.length) return '';
  const fresh = !store, TB = Object.fromEntries(THEMES.map(t => [t[0], t[3]]));
  const tile = p => {
    const it = picked(p), ph = it.filter(x => x.img).slice(0, 3), c = TB[p.theme] || [], bg = c[0] || `color-mix(in srgb,${p.accent} 10%,#fff)`, dark = ['dark', 'luxe'].includes(p.theme);
    return `<button class="pst${cfg.preset === p.id ? ' on' : ''}" data-preset="${p.id}" aria-pressed="${cfg.preset === p.id}">
     <span class="pst-v" style="background:${bg};color:${dark ? '#fff' : '#1d2125'}"><span class="pst-b" style="background:${p.accent}"></span><span class="pst-p">${ph.map(x => `<img src="${E(x.img)}" alt="" loading="lazy">`).join('')}</span><span class="pst-e">${p.emoji}</span></span>
     <span class="pst-t"><b>${E(p.title)}</b>${p.tag ? `<em style="background:${p.accent}">${E(p.tag)}</em>` : ''}</span><small>${E(p.desc)}</small><small class="pst-n">${it.length} товарів · ${E((THEMES.find(t => t[0] === p.theme) || [])[1] || '')}</small></button>`;
  };
  const body = `<p class="sub">Оформлення, тексти й підібрані товари вже готові — залишиться вписати назву й контакти. Усе можна змінити.</p>
   <div class="pst-g">${VPRESETS.list.map(tile).join('')}</div><div id="pconf"></div>`;
  return fresh ? `<section class="card prc" style="border-color:var(--acc)"><h2>✨ Почніть з готової вітрини</h2>${body}</section>`
    : `<details class="card prc"><summary><h2 style="margin:0">✨ Готові вітрини в один клік</h2><span class="sub" style="margin:0">Змініть стиль, тексти й товари за секунду</span></summary><div style="margin-top:12px">${body}</div></details>`;
}
function presetPick(id) {
  const p = pres(id); if (!p) return;
  if (!store && !(cfg.items || []).length) return presetApply(id, 'all');
  const el = $('#pconf');
  el.innerHTML = `<div class="pconf"><b>${p.emoji} «${E(p.title)}»</b><p class="note">Ваші назва (якщо ви її змінювали), логотип, адреса, контакти й ціни залишаться.</p>
   <div class="row"><button class="btn sm" data-papply="${id}" data-mode="all">Застосувати повністю — з товарами (${picked(p).length})</button>
   <button class="btn ghost sm" data-papply="${id}" data-mode="look">Лише оформлення й тексти</button></div></div>`;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function presetApply(id, mode) {
  const p = pres(id); if (!p) return;
  ['theme', 'accent', 'font', 'radius', 'hero', 'grid', 'bar', 'featTitle', 'slogan', 'about'].forEach(k => cfg[k] = p[k]);
  cfg.perks = p.perks.slice(); cfg.preset = p.id;
  if (!cfg.name || cfg.name === me.name || VPRESETS.list.some(x => x.title === cfg.name)) cfg.name = p.title;
  if (mode === 'all') {
    const it = picked(p);
    cfg.items = it.map(x => x.id); cfg.feat = VPRESETS.featured(p, it).map(x => x.id);
    Object.keys(cfg.over || {}).forEach(k => { if (!cfg.items.includes(k)) delete cfg.over[k]; });
    cfg.hideOut = true; if (!cfg.round) cfg.round = '9';
  }
  dirtyOn(); draw();
  toast('Шаблон «' + p.title + '» застосовано — перевірте назву й контакти');
  const s1 = $('#sec1'); if (s1) { s1.scrollIntoView({ behavior: 'smooth', block: 'start' }); const n = s1.querySelector('[data-k=name]'); if (n) setTimeout(() => { n.focus(); n.select(); }, 450); }
}

/* ---------- сторінка ---------- */
function draw() {
  const pub = store && store.approved, st = store ? store.status : '';
  const sEl = $('#st'); sEl.hidden = !store; sEl.className = 'st ' + (st === 'Опублікована' ? 'pub' : st === 'Вимкнена' ? 'off' : 'mod');
  sEl.textContent = st === 'Опублікована' ? '● Опублікована' : st === 'Вимкнена' ? '● Вимкнена' : store ? (store.extra && !store.approved ? '● Чекає схвалення' : '● Працює · на модерації') : '';
  const op = $('#open'); op.hidden = !store; if (store) op.href = link(pub);
  $('#main').innerHTML = `<div class="wrap" id="wrap"><div class="ed">
  ${switcher()}
  ${NEW ? `<div class="card" style="border-color:var(--acc)"><h2>🏪 Нова вітрина</h2><p class="sub" style="margin:0">Окремий магазин зі своєю назвою, адресою, оформленням і товарами. Після збереження її перевірить менеджер — до схвалення покупці її не бачать.</p></div>` : ''}
  ${store && store.extra && !store.approved ? '<div class="warn">Ця вітрина чекає схвалення менеджером — покупці побачать її після перевірки. Редагувати можна вже зараз.</div>' : ''}
  ${!store && !NEW ? `<div class="card" style="border-color:var(--acc)"><h2>🏪 Ваш власний магазин за 5 хвилин</h2><p class="sub" style="margin:0">Назва, логотип і кольори — ваші. Покупці замовляють прямо на вітрині, замовлення приходять у кабінет, ми пакуємо й відправляємо, заробіток нараховується автоматично. Заповніть кроки нижче й натисніть «Опублікувати».</p><p class="sub" style="margin:10px 0 0"><a class="tip" href="${SITE}course-vitryna.html#l=v1" target="_blank" rel="noopener">💡 Безкоштовний курс «Своя вітрина»: назва, логотип з ChatGPT чи Gemini, продаючі тексти й перші замовлення</a></p></div>` : ''}
  ${store && window.VSTATS ? `<details class="card vsd" id="vsd"${location.hash === '#stats' ? ' open' : ''}><summary><h2 style="margin:0">📊 Статистика вітрини</h2><span class="sub" style="margin:0">Відвідувачі, джерела, воронка й найпопулярніші товари</span></summary><div id="vsBox" style="margin-top:14px"></div></details>` : ''}
  ${st === 'Вимкнена' ? '<div class="warn">Вітрину вимкнув адміністратор — покупці її не бачать. Напишіть менеджеру, щоб дізнатися причину.</div>' : ''}
  ${presetsCard()}
  <section class="card" id="sec1"><h2><span class="n">1</span>Назва й адреса</h2><p class="sub">Так вітрину бачитимуть покупці. <a class="tip" href="${SITE}course-vitryna.html#l=v3" target="_blank" rel="noopener">💡 Як придумати назву</a> <a class="tip" href="${SITE}course-vitryna.html#l=v5" target="_blank" rel="noopener">💡 Логотип з ШІ за 10 хвилин</a></p>
   <div class="g2"><label class="f"><span>Назва магазину</span><input data-k="name" maxlength="60" value="${E(cfg.name)}" placeholder="Напр. Декор для дому Олени"></label>
   <label class="f"><span>Слоган — коротко, чим ви корисні</span><input data-k="slogan" maxlength="140" value="${E(cfg.slogan)}" placeholder="Ремонт без майстрів за вихідні"></label></div>
   <label class="f"><span>Адреса вітрини</span><span class="slug"><b>samostroy.shop/v/</b><input id="slug" value="${E(slug)}" maxlength="30" autocomplete="off" spellcheck="false"${pub ? ' disabled' : ''}></span>
    <small id="slugm">${pub ? 'Адресу закріплено після схвалення.' : 'Латинські літери, цифри й дефіс. Після схвалення змінити не можна.'}</small></label>
   <div class="g2"><div class="f"><span>Логотип (квадратний)</span><div class="up"><span class="ph" id="logoP">${cfg.logo ? `<img src="${E(cfg.logo)}" alt="">` : 'немає'}</span><div><label class="btn ghost sm">Завантажити<input type="file" accept="image/*" data-up="logo" hidden></label>${cfg.logo ? ' <button class="btn ghost sm" data-clr="logo">Прибрати</button>' : ''}</div></div></div>
   <div class="f"><span>Обкладинка (широке фото)</span><div class="up"><span class="ph wide" id="coverP">${cfg.cover ? `<img src="${E(cfg.cover)}" alt="">` : 'немає'}</span><div><label class="btn ghost sm">Завантажити<input type="file" accept="image/*" data-up="cover" hidden></label>${cfg.cover ? ' <button class="btn ghost sm" data-clr="cover">Прибрати</button>' : ''}</div></div></div></div>
   ${IMGBB ? '' : '<p class="note">Завантаження фото тимчасово недоступне.</p>'}</section>

  <section class="card"><h2><span class="n">2</span>Оформлення</h2><p class="sub">Шаблон, колір, шрифт — зміни одразу видно в перегляді. <a class="tip" href="${SITE}course-vitryna.html#l=v6" target="_blank" rel="noopener">💡 Обкладинка й кольори</a></p>
   <div class="themes">${THEMES.map(([k, l, d, c]) => `<button class="th" data-theme="${k}" aria-pressed="${cfg.theme === k}"><span class="mini" style="background:${c[0] || 'color-mix(in srgb,' + cfg.accent + ' 12%,#fff)'}"><i style="background:${k === 'minimal' ? '#ececec' : cfg.accent}"></i><span class="row"><i style="background:${c[1]}"></i><i style="background:${c[1]}"></i><i style="background:${c[1]}"></i></span></span><b>${l}</b><small>${d}</small></button>`).join('')}</div>
   <div class="lbl">Акцентний колір (кнопки, ціни, обкладинка)</div>
   <div class="sw">${COLORS.map(c => `<button data-color="${c}" style="background:${c}" aria-pressed="${cfg.accent === c}" aria-label="${c}"></button>`).join('')}<input type="color" id="color" value="${E(cfg.accent)}" title="Свій колір"></div>
   <div class="lbl">Шрифт</div><div class="seg">${FONTS.map(([k, l, f]) => `<button data-font="${k}" aria-pressed="${cfg.font === k}" style="font-family:${f}">${l}</button>`).join('')}</div>
   <div class="lbl">Кути</div><div class="seg">${[['round', 'Округлі'], ['xl', 'М’які'], ['square', 'Прямі']].map(([k, l]) => `<button data-radius="${k}" aria-pressed="${(cfg.radius || 'round') === k}">${l}</button>`).join('')}</div>
   <div class="lbl">Верх вітрини</div><div class="seg">${[['cover', 'Фото на всю ширину'], ['split', 'Колаж із товарів'], ['compact', 'Компактний']].map(([k, l]) => `<button data-hero="${k}" aria-pressed="${(cfg.hero || 'cover') === k}">${l}</button>`).join('')}</div>
   <div class="lbl">Картки товарів</div><div class="seg">${[['normal', 'Звичайні'], ['large', 'Великі'], ['compact', 'Компактні']].map(([k, l]) => `<button data-grid="${k}" aria-pressed="${(cfg.grid || 'normal') === k}">${l}</button>`).join('')}</div>
   <div class="lbl">Блоки</div>
   <label class="f"><span>Стрічка вгорі (необов’язково)</span><input data-k="bar" maxlength="120" value="${E(cfg.bar)}" placeholder="🚚 Відправка в день замовлення · Оплата при отриманні"></label>
   <div class="f"><span>Переваги під обкладинкою — до 4 коротких пунктів (необов’язково)</span><div class="g2">${[0, 1, 2, 3].map(i => `<input data-perk="${i}" maxlength="60" value="${E((cfg.perks || [])[i] || '')}" placeholder="${['⏱ Монтаж за один вечір', '💳 Оплата після огляду', '📐 Порахуємо кількість', '↩️ Обмін 14 днів'][i]}">`).join('')}</div></div>
   <label class="f"><span>Назва блоку «Популярне»</span><input data-k="featTitle" maxlength="40" value="${E(cfg.featTitle)}" placeholder="Популярне"></label>
   <label class="chk"><input type="checkbox" id="showRev"${cfg.noRev ? '' : ' checked'}> Показувати відгуки покупців (з фото, 4–5⭐; спершу — про ваші товари)</label></section>

  <section class="card"><h2><span class="n">3</span>Товари <span class="note" id="cnt"></span></h2><p class="sub">Оберіть, що продаєте. ★ — «Популярне» вгорі вітрини (до 12). <a class="tip" href="${SITE}course-vitryna.html#l=v2" target="_blank" rel="noopener">💡 Що поставити на вітрину</a></p>
   <div class="acts"><button class="btn sm" data-pick>${ico('plus')}Обрати з каталогу</button>${me.favs && me.favs.length ? `<button class="btn ghost sm" data-favs>Додати «Мої товари» (${me.favs.length})</button>` : ''}${OWNP.length ? `<button class="btn ghost sm" data-ownall>🧩 Власні товари (${OWNP.length})</button>` : ''}${cfg.items.length ? '<button class="btn ghost sm" data-clear>Прибрати всі</button>' : ''}</div>
   ${me.feat && me.feat.own ? ownNote() : ''}
   <label class="chk"><input type="checkbox" id="hideOut"${cfg.hideOut ? ' checked' : ''}> Не показувати товари, яких немає в наявності</label>
   <div class="items" id="items"></div></section>

  <section class="card"><h2><span class="n">4</span>Ціни</h2><p class="sub">Ціна вітрини — не нижче ціни сайту. Націнка діє на всі товари; на окремий товар можна вписати свою ціну в списку вище. <a class="tip" href="${SITE}course-vitryna.html#l=v11" target="_blank" rel="noopener">💡 Яку націнку ставити</a></p>
   <div class="lbl">Націнка до ціни сайту</div><div class="range"><input type="range" id="mk" min="0" max="60" step="1" value="${cfg.markup}"><input type="number" id="mkn" min="0" max="200" value="${cfg.markup}"> %</div>
   <div class="lbl">Округлення</div><div class="seg"><button data-round="" aria-pressed="${cfg.round === ''}">Без округлення</button><button data-round="10" aria-pressed="${cfg.round === '10'}">До 10 ₴</button><button data-round="9" aria-pressed="${cfg.round === '9'}">Закінчується на 9</button></div>
   <div class="ex" id="ex"></div></section>

  <section class="card"><h2><span class="n">5</span>Контакти й тексти</h2><p class="sub">Покупці бачать їх на вітрині й після замовлення. <a class="tip" href="${SITE}course-vitryna.html#l=v8" target="_blank" rel="noopener">💡 Шаблони «Про вас»</a> <a class="tip" href="${SITE}course-vitryna.html#l=v4" target="_blank" rel="noopener">💡 Слоган, що продає</a></p>
   <div class="g3"><label class="f"><span>Telegram (@нік)</span><input data-c="tg" value="${E(cfg.contacts.tg)}" placeholder="olena_decor"></label><label class="f"><span>Viber (номер)</span><input data-c="viber" value="${E(cfg.contacts.viber)}" placeholder="+380…"></label><label class="f"><span>Телефон</span><input data-c="phone" value="${E(cfg.contacts.phone)}" placeholder="+380…"></label>
   <label class="f"><span>Instagram</span><input data-c="ig" value="${E(cfg.contacts.ig)}" placeholder="olena.decor"></label><label class="f"><span>TikTok</span><input data-c="tt" value="${E(cfg.contacts.tt)}" placeholder="olena.decor"></label><label class="f"><span>Facebook (посилання)</span><input data-c="fb" value="${E(cfg.contacts.fb)}" placeholder="https://facebook.com/…"></label></div>
   <label class="f"><span>Графік роботи</span><input data-c="hours" value="${E(cfg.contacts.hours)}" placeholder="Пн–Сб 9:00–19:00"></label>
   <label class="f"><span>Продавець — ваш ФОП (необов’язково)</span><input data-k="fop" maxlength="150" value="${E(cfg.fop)}" placeholder="ФОП Коваль Олена Іванівна"><small>Якщо порожньо — продавцем на вітрині й у правилах буде вказано інтернет-магазин Samostroy Shop. Вписуйте лише чинний ФОП.</small></label>
   <label class="f"><span>Про вас (необов’язково)</span><textarea data-k="about" maxlength="800" placeholder="Допомагаю підібрати панелі й порахувати кількість під ваші розміри. Відповідаю швидко.">${E(cfg.about)}</textarea></label>
   <div class="g2"><label class="f"><span>Доставка (якщо порожньо — стандартний текст)</span><textarea data-k="delivery" maxlength="500" placeholder="Відправляємо Новою Поштою або Укрпоштою по всій Україні, зазвичай у день замовлення.">${E(cfg.delivery)}</textarea></label>
   <label class="f"><span>Оплата (якщо порожньо — стандартний текст)</span><textarea data-k="payment" maxlength="500" placeholder="Оплата при отриманні: спершу оглядаєте посилку, потім платите.">${E(cfg.payment)}</textarea></label></div></section>

  ${store ? share() : ''}
  </div><aside class="pv"><div class="phone"><iframe id="frame" src="index.html?preview=1" title="Перегляд вітрини"></iframe></div><p>Перегляд оновлюється одразу. Замовлення тут вимкнено.</p></aside></div>
  <div class="bar"><div class="in"><span class="msg" id="msg"></span><button class="btn" id="save">${store ? 'Зберегти зміни' : 'Опублікувати вітрину'}</button></div></div>`;
  frame = $('#frame'); frameReady = false;
  items(); prices(); msg();
  const s = $('#slug'); if (s && !pub) s.addEventListener('input', () => { s.value = s.value.toLowerCase().replace(/[^a-z0-9-]/g, ''); slug = s.value; dirtyOn(); checkSlug(); });
  if (!store) checkSlug();
}
function switcher() {
  const multi = !!(me.feat && me.feat.multi);
  if (!multi && STORES.length < 2) return '';
  const q = sid => '?' + (sid ? 's=' + encodeURIComponent(sid) : 'new=1') + (from ? '&from=' + from : '');
  return `<nav class="card vsw" aria-label="Мої вітрини"><span class="lbl" style="margin:0">Мої вітрини</span>${STORES.map(x => `<a href="${q(x.sid)}" class="vsw-i${store && store.sid === x.sid && !NEW ? ' on' : ''}" aria-current="${store && store.sid === x.sid && !NEW}"><b>${E(x.name)}</b><small>${x.status === 'Опублікована' ? '● опублікована' : x.status === 'Вимкнена' ? '● вимкнена' : x.extra && !x.approved ? '● чекає схвалення' : '● на модерації'}</small></a>`).join('')}
   ${multi && STORES.length < MAXS ? `<a href="${q('')}" class="vsw-i add${NEW ? ' on' : ''}">${ico('plus')}<b>Нова вітрина</b></a>` : ''}</nav>`;
}
function link(pretty) { return pretty ? SITE + 'v/' + store.slug + '/' : SITE + 'v/?' + store.slug; }
function share() {
  const pub = store.approved, url = link(pub), nm = cfg.name;
  const t1 = `🏪 ${nm}${cfg.slogan ? ' — ' + cfg.slogan : ''}\n👉 ${url}`;
  const t2 = `${nm}: ${cfg.items.length} товарів для ремонту своїми руками — 3D панелі, плитка, плівка й інше.\nЗамовляйте онлайн, оплата при отриманні, відправка по всій Україні.\n${url}`;
  const emb = `<div data-samostroy-vitryna="${store.slug}"></div>\n<script src="${SITE}v/embed.js" async></script>`;
  return `<section class="card links"><h2><span class="n">6</span>Посилання й поширення</h2>
   <p class="sub">${pub ? 'Вітрину схвалено — використовуйте коротке посилання.' : 'Вітрина вже працює за технічним посиланням. Після перевірки адміністратором з’явиться коротке посилання <b>samostroy.shop/v/' + E(store.slug) + '</b>.'} <a class="tip" href="${SITE}course-vitryna.html#l=v13" target="_blank" rel="noopener">💡 Куди поставити посилання</a> <a class="tip" href="${SITE}course-vitryna.html#l=v10" target="_blank" rel="noopener">💡 Готові пости</a></p>
   <div class="ln"><code><small>${pub ? 'Посилання на вітрину' : 'Технічне посилання (працює вже зараз)'}</small>${E(url.replace(/^https?:\/\//, ''))}</code><button class="btn ghost sm" data-copy="${E(url)}">${ico('copy')}Копіювати</button><a class="btn ghost sm" href="${E(url)}" target="_blank" rel="noopener">${ico('link')}</a></div>
   <div class="qr"><img src="https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=0&data=${encodeURIComponent(url + (url.includes('?') ? '&' : '?') + 'src=qr')}" alt="QR-код вітрини" loading="lazy"><div><b>QR-код</b><p class="note">Для візиток, наліпок на посилки, сторіс.</p><a class="btn ghost sm" href="https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&format=png&data=${encodeURIComponent(url)}" target="_blank" rel="noopener" download>Завантажити PNG</a></div></div>
   <div class="lbl">Для шапки Instagram / TikTok і Telegram-каналу</div><div class="txt">${E(t1)}</div><button class="btn ghost sm" data-copy="${E(t1)}" style="margin-bottom:12px">${ico('copy')}Копіювати</button>
   <div class="lbl">Пост або повідомлення клієнту</div><div class="txt">${E(t2)}</div><button class="btn ghost sm" data-copy="${E(t2)}" style="margin-bottom:12px">${ico('copy')}Копіювати</button>
   <div class="lbl">Віджет для вашого сайту (Tilda, WordPress, Wix, будь-який HTML)</div><div class="txt" style="font-family:ui-monospace,Menlo,monospace;font-size:12.5px">${E(emb)}</div><button class="btn ghost sm" data-copy="${E(emb)}">${ico('copy')}Копіювати код</button>
   <p class="note" style="margin-top:12px">Статистика: переглядів ≈ ${store.views || 0}, замовлень з вітрини: ${store.orders || 0}. Замовлення приходять у кабінет із позначкою «з вітрини».</p></section>`;
}
function ownNote() {
  const pend = OWN.filter(x => x.status === 'На модерації').length, rej = OWN.filter(x => x.status === 'Відхилено').length;
  return `<p class="note" style="margin:8px 0 0">🧩 Власні товари: схвалено ${OWNP.length}${pend ? ` · на перевірці ${pend} — з’являться тут після схвалення` : ''}${rej ? ` · відхилено ${rej}` : ''}. <a href="../kabinet.html#mine">Додати або змінити</a></p>`;
}
function items() {
  const L = cfg.items.map(id => byId.get(String(id))).filter(Boolean), gone = cfg.items.length - L.length;
  $('#cnt').textContent = L.length ? '· ' + L.length : '';
  $('#items').innerHTML = L.length ? L.slice(0, items.n || 60).map(p => {
    const pr = price(p), ov = cfg.over[p.id], f = cfg.feat.includes(p.id);
    if (p.own) return `<div class="it">${p.img ? `<img src="${E(p.img)}" alt="" loading="lazy">` : '<span class="noimg"></span>'}<div class="t"><b title="${E(p.name)}">🧩 ${E(p.name)}</b><small${p.av ? '' : ' class="out"'}>${p.av ? 'ваш товар · ' + M(pr) + ' · ' + (p.ship === 'shop' ? 'відправляє магазин, заробіток ' + M(pr - whole(p)) : 'відправляєте самі') : 'немає в наявності'}</small></div>
    <div class="c"><button data-feat="${E(p.id)}" class="${f ? 'on' : ''}" aria-label="Популярне">${ico('star')}</button><button data-rm="${E(p.id)}" aria-label="Прибрати">${ico('x')}</button></div></div>`;
    return `<div class="it">${p.img ? `<img src="${E(p.img)}" alt="" loading="lazy">` : '<span class="noimg"></span>'}<div class="t"><b title="${E(p.name)}">${E(p.name)}</b><small${p.av ? '' : ' class="out"'}>${p.av ? 'сайт ' + M(p.price) + ' · ваш заробіток ≈ ' + M(pr - whole(p)) : 'немає в наявності'}</small></div>
    <div class="c"><input inputmode="numeric" data-ov="${E(p.id)}" value="${ov || ''}" placeholder="${pr}" title="Своя ціна (порожньо — за націнкою)"${ov && ov < Math.ceil(p.price) ? ' class="bad"' : ''}><button data-feat="${E(p.id)}" class="${f ? 'on' : ''}" aria-label="Популярне">${ico('star')}</button><button data-rm="${E(p.id)}" aria-label="Прибрати">${ico('x')}</button></div></div>`;
  }).join('') + (L.length > (items.n || 60) ? `<button class="more" data-imore>Показати всі (${L.length})</button>` : '') + (gone ? `<p class="note" style="margin-top:8px">${gone} товарів недоступні (немає в каталозі або власний товар ще на перевірці) — на вітрині їх не буде.</p>` : '')
    : '<p class="note" style="padding:14px 0">Ще немає товарів. Натисніть «Обрати з каталогу».</p>';
  $$('#items [data-ov]').forEach(i => i.addEventListener('change', () => {
    const p = byId.get(i.dataset.ov), v = Math.round(+i.value.replace(/[^\d.]/g, '') || 0);
    if (!v) delete cfg.over[p.id]; else if (v < Math.ceil(p.price)) { toast('Не нижче ціни сайту: ' + M(p.price)); i.value = ''; delete cfg.over[p.id]; } else cfg.over[p.id] = v;
    dirtyOn(); items(); prices();
  }));
}
function prices() {
  const p = cfg.items.map(id => byId.get(String(id))).find(Boolean) || CAT.find(x => x.av) || { price: 1000, name: 'Товар' };
  const pr = price(p);
  $('#ex').innerHTML = `Приклад: «${E(String(p.name).slice(0, 50))}${String(p.name).length > 50 ? '…' : ''}» — на сайті ${M(p.price)}, на вашій вітрині <b style="color:var(--ink)">${M(pr)}</b>. Ваш заробіток ≈ <b>${M(pr - whole(p))}</b> (рівень ${E(me.level || 'Starter')}, оптова −${me.margin || 10}%).`;
}
function msg() {
  const m = $('#msg'); if (!m) return;
  m.textContent = !cfg.items.length ? 'Додайте товари, щоб опублікувати' : !slugOk ? 'Оберіть іншу адресу' : dirty ? 'Є незбережені зміни' : store ? 'Усе збережено' : 'Готово до публікації';
  $('#save').disabled = !cfg.items.length || !slugOk || (!dirty && !!store);
}
function dirtyOn() { dirty = true; LS.set(DK(), { at: Date.now(), cfg, slug }); msg(); push(); }
let ct = null;
function checkSlug() {
  const m = $('#slugm'); clearTimeout(ct);
  if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(slug)) { slugOk = false; m.className = 'bad'; m.textContent = 'Від 3 до 30 символів: латинські літери, цифри й дефіс.'; return msg(); }
  ct = setTimeout(async () => { const r = await api({ action: 'v_slug', token, slug, sid: store ? store.sid : '', new: NEW ? 1 : 0 }); if (!r.ok) return; slugOk = r.free; m.className = r.free ? 'ok' : 'bad'; m.textContent = r.free ? '✓ Адреса вільна: samostroy.shop/v/' + slug : r.why; msg(); }, 450);
}

/* ---------- перегляд ---------- */
let pt = null;
function push() { clearTimeout(pt); pt = setTimeout(() => { if (frame && frameReady) frame.contentWindow.postMessage({ vcfg: cfg, slug: slug || 'preview', vown: OWN.filter(x => x.status === 'Схвалено') }, location.origin); }, 200); }
addEventListener('message', e => { if (e.origin === location.origin && e.data && e.data.vready) { frameReady = true; push(); } });

/* ---------- фото: стискаємо в браузері й вантажимо на imgbb ---------- */
async function upload(file, kind) {
  if (!IMGBB) return toast('Завантаження фото недоступне');
  const max = kind === 'logo' ? 512 : 1600;
  const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = URL.createObjectURL(file); }).catch(() => null);
  if (!img) return toast('Не вдалося відкрити фото');
  const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .86));
  const fd = new FormData(); fd.append('image', blob, kind + '.jpg');
  toast('Завантажуємо фото…');
  try {
    const j = await fetch('https://api.imgbb.com/1/upload?key=' + encodeURIComponent(IMGBB), { method: 'POST', body: fd }).then(r => r.json());
    if (!j.success) throw 0;
    cfg[kind] = j.data.url; dirtyOn(); $('#' + kind + 'P').innerHTML = `<img src="${E(cfg[kind])}" alt="">`; toast('Фото додано');
  } catch (e) { toast('Не вдалося завантажити фото. Спробуйте інше.'); }
}

/* ---------- вибір товарів ---------- */
let PK = { q: '', c: '', av: 1, n: 60 };
function picker() {
  const o = document.createElement('div'); o.className = 'pk'; o.id = 'pk';
  const cs = {}; CAT.forEach(p => cs[p.cat] = (cs[p.cat] || 0) + 1);
  o.innerHTML = `<div class="hd"><div class="r1"><h3>Оберіть товари для вітрини</h3><button class="btn" data-pkdone>Готово<span id="pkn"></span></button></div>
   <div class="r2"><input class="q" id="pkq" type="search" placeholder="Пошук: 3D панель, PET плитка, артикул…" value="${E(PK.q)}" autocomplete="off"><label class="chk" style="margin:0"><input type="checkbox" id="pkav"${PK.av ? ' checked' : ''}> Лише в наявності</label></div>
   <div class="chips">${[['', 'Усі'], ['__sel', 'Обрані']].concat(OWNP.length ? [['__own', '🧩 Власні']] : []).concat(Object.keys(cs).sort((a, b) => cs[b] - cs[a]).map(c => [c, cats[c] || c])).map(([k, l]) => `<button data-pkc="${E(k)}" aria-pressed="${PK.c === k}">${E(l)}</button>`).join('')}</div></div><div class="gr" id="pkg"></div>`;
  document.body.appendChild(o); document.body.style.overflow = 'hidden';
  $('#pkq').addEventListener('input', e => { PK.q = e.target.value; PK.n = 60; pgrid(); });
  $('#pkav').addEventListener('change', e => { PK.av = e.target.checked ? 1 : 0; PK.n = 60; pgrid(); });
  pgrid();
}
function pgrid() {
  const w = PK.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  let L = PK.c === '__sel' ? cfg.items.map(id => byId.get(String(id))).filter(Boolean) : PK.c === '__own' ? OWNP.filter(p => !w.length || w.every(x => p.key.includes(x))) : CAT.filter(p => (!PK.c || p.cat === PK.c) && (!PK.av || p.av) && (!w.length || w.every(x => p.key.includes(x))));
  $('#pkn').textContent = cfg.items.length ? ' · ' + cfg.items.length : '';
  $('#pkg').innerHTML = L.slice(0, PK.n).map(p => { const on = cfg.items.includes(p.id); return `<div class="pc${on ? ' on' : ''}"><button class="im" data-tog="${E(p.id)}" aria-pressed="${on}">${p.img ? `<img src="${E(p.img)}" alt="" loading="lazy">` : ''}<span class="pl">${ico(on ? 'check' : 'plus')}</span></button><div class="b"><b>${E(p.name)}</b><span>${M(p.price)}</span></div></div>`; }).join('')
    + (L.length > PK.n ? `<button class="btn ghost" style="grid-column:1/-1;justify-self:center" data-pkmore>Показати ще · ${L.length - PK.n}</button>` : '') + (L.length ? '' : '<p class="note" style="grid-column:1/-1;text-align:center;padding:30px">Нічого не знайдено</p>');
}
function pickClose() { const o = $('#pk'); if (o) o.remove(); document.body.style.overflow = ''; items(); prices(); msg(); push(); }

/* ---------- збереження ---------- */
async function save() {
  const b = $('#save'); b.classList.add('busy');
  const r = await api({ action: 'v_save', token, slug, cfg, sid: store ? store.sid : '', new: NEW ? 1 : 0 });
  b.classList.remove('busy');
  if (!r.ok) return toast(r.msg || ERR[r.error] || 'Не збережено: ' + r.error);
  LS.del(DK());
  const wasNew = NEW; NEW = false;
  store = r.store; cfg = Object.assign(blank(), store.cfg); cfg.contacts = Object.assign(blank().contacts, cfg.contacts); slug = store.slug; dirty = false;
  if (r.stores) STORES = r.stores;
  if (store.sid && (wasNew || SID)) { SID = store.sid; history.replaceState(null, '', location.pathname + '?s=' + encodeURIComponent(SID) + (from ? '&from=' + from : '')); }
  toast(store.extra && !store.approved ? 'Вітрину надіслано на перевірку. Покупці побачать її після схвалення менеджером' : r.first ? 'Вітрину опубліковано! Посилання — внизу сторінки' : 'Збережено. Покупці побачать зміни за кілька хвилин');
  const y = scrollY; draw(); scrollTo(0, r.first ? document.body.scrollHeight : y);
}
function copy(t) { const ok = () => toast('Скопійовано'); try { navigator.clipboard.writeText(t).then(ok, fb); } catch (e) { fb(); } function fb() { const a = document.createElement('textarea'); a.value = t; a.style.cssText = 'position:fixed;opacity:0'; document.body.append(a); a.select(); try { document.execCommand('copy'); ok(); } catch (x) { } a.remove(); } }

/* ---------- події ---------- */
document.addEventListener('input', e => {
  const t = e.target, d = t.dataset;
  if (d.k) { cfg[d.k] = t.value; dirtyOn(); if (d.k === 'name') prices(); }
  else if (d.c) { cfg.contacts[d.c] = t.value; dirtyOn(); }
  else if (d.perk) { cfg.perks = (cfg.perks || []).slice(0, 4); while (cfg.perks.length < 4) cfg.perks.push(''); cfg.perks[+d.perk] = t.value; dirtyOn(); }
  else if (t.id === 'mk' || t.id === 'mkn') { cfg.markup = Math.max(0, Math.min(200, Math.round(+t.value || 0))); (t.id === 'mk' ? $('#mkn') : $('#mk')).value = cfg.markup; dirtyOn(); prices(); clearTimeout(items.t); items.t = setTimeout(items, 250); }
  else if (t.id === 'color') { cfg.accent = t.value; $$('[data-color]').forEach(b => b.setAttribute('aria-pressed', b.dataset.color === cfg.accent)); dirtyOn(); }
});
document.addEventListener('change', e => {
  if (e.target.id === 'showRev') { cfg.noRev = !e.target.checked; dirtyOn(); return; }
  const t = e.target;
  if (t.dataset.up && t.files[0]) upload(t.files[0], t.dataset.up);
  if (t.id === 'hideOut') { cfg.hideOut = t.checked; dirtyOn(); }
});
document.addEventListener('click', e => {
  const b = e.target.closest('button,[data-tab]'); if (!b) return; const d = b.dataset;
  if (d.tab) { $$('#tabs button').forEach(x => x.setAttribute('aria-pressed', x === b)); $('#wrap').classList.toggle('showpv', d.tab === 'pv'); scrollTo(0, 0); return; }
  if (d.theme) { cfg.theme = d.theme; $$('[data-theme]').forEach(x => x.setAttribute('aria-pressed', x === b)); return dirtyOn(); }
  if (d.color) { cfg.accent = d.color; $('#color').value = d.color; $$('[data-color]').forEach(x => x.setAttribute('aria-pressed', x === b)); return dirtyOn(); }
  if (d.font) { cfg.font = d.font; $$('[data-font]').forEach(x => x.setAttribute('aria-pressed', x === b)); return dirtyOn(); }
  if (d.radius) { cfg.radius = d.radius; $$('[data-radius]').forEach(x => x.setAttribute('aria-pressed', x === b)); return dirtyOn(); }
  if (d.hero) { cfg.hero = d.hero; $$('[data-hero]').forEach(x => x.setAttribute('aria-pressed', x === b)); return dirtyOn(); }
  if (d.grid) { cfg.grid = d.grid; $$('[data-grid]').forEach(x => x.setAttribute('aria-pressed', x === b)); return dirtyOn(); }
  if (d.preset) return presetPick(d.preset);
  if (d.papply) return presetApply(d.papply, b.dataset.mode);
  if (d.round !== undefined) { cfg.round = d.round; $$('[data-round]').forEach(x => x.setAttribute('aria-pressed', x === b)); dirtyOn(); prices(); return items(); }
  if (d.clr) { cfg[d.clr] = ''; dirtyOn(); const y = scrollY; draw(); return scrollTo(0, y); }
  if (d.pick !== undefined) return picker();
  if (d.favs !== undefined) { const before = cfg.items.length; me.favs.forEach(id => { id = String(id); if (byId.get(id) && !cfg.items.includes(id)) cfg.items.push(id); }); toast('Додано: ' + (cfg.items.length - before)); dirtyOn(); items(); return prices(); }
  if (d.ownall !== undefined) { const before = cfg.items.length; OWNP.forEach(p => { if (!cfg.items.includes(p.id)) cfg.items.push(p.id); }); toast('Додано: ' + (cfg.items.length - before)); dirtyOn(); items(); return prices(); }
  if (d.clear !== undefined) { if (!confirm('Прибрати всі товари з вітрини?')) return; cfg.items = []; cfg.feat = []; cfg.over = {}; dirtyOn(); return items(); }
  if (d.rm) { cfg.items = cfg.items.filter(x => x !== d.rm); cfg.feat = cfg.feat.filter(x => x !== d.rm); delete cfg.over[d.rm]; dirtyOn(); return items(); }
  if (d.feat) { if (cfg.feat.includes(d.feat)) cfg.feat = cfg.feat.filter(x => x !== d.feat); else if (cfg.feat.length >= 12) return toast('До 12 популярних товарів'); else cfg.feat.push(d.feat); dirtyOn(); return items(); }
  if (d.imore !== undefined) { items.n = 1000; return items(); }
  if (d.tog) { const on = !cfg.items.includes(d.tog); if (on) cfg.items.push(d.tog); else { cfg.items = cfg.items.filter(x => x !== d.tog); cfg.feat = cfg.feat.filter(x => x !== d.tog); } dirty = true; LS.set(DK(), { at: Date.now(), cfg, slug });
    const c = b.closest('.pc'); c.classList.toggle('on', on); b.querySelector('.pl').innerHTML = ico(on ? 'check' : 'plus'); $('#pkn').textContent = cfg.items.length ? ' · ' + cfg.items.length : ''; return; }
  if (d.pkc !== undefined) { PK.c = d.pkc; PK.n = 60; $$('[data-pkc]').forEach(x => x.setAttribute('aria-pressed', x === b)); return pgrid(); }
  if (d.pkmore !== undefined) { PK.n += 60; return pgrid(); }
  if (d.pkdone !== undefined) return pickClose();
  if (d.copy) return copy(d.copy);
  if (b.id === 'save') return save();
});
addEventListener('keydown', e => { if (e.key === 'Escape' && $('#pk')) pickClose(); });
addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
boot();
/* статистика вітрини (v/kstats.js): підвантажується, коли розгортають блок */
document.addEventListener('toggle', e => {
  if (e.target.id !== 'vsd' || !e.target.open || !window.VSTATS) return;
  const b = document.getElementById('vsBox'); if (!b || b.dataset.m) return;
  b.dataset.m = '1';
  VSTATS.mount(b, { api: (window.VCFG || {}).api, token, sid: store ? store.sid : '', sidFixed: true, edit: '#wrap', acc: getComputedStyle(document.documentElement).getPropertyValue('--acc').trim() || '#e8590c' });
}, true);
// якщо блок статистики вже відкритий (посилання …#stats) — підвантажити одразу
new MutationObserver(() => { const d = document.getElementById('vsd'); if (d && d.open) d.dispatchEvent(new Event('toggle')); }).observe(document.getElementById('main'), { childList: true });
})();
