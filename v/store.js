/* Вітрина партнера для покупців. Налаштування — скрипт вітрин (VCFG.api), товари й ціни сайту — /app/catalog.json,
   фото й опис — зі сторінки товару /p/<id>.html. Режими: ?embed=1 (віджет на сайті партнера), ?preview=1 (перегляд у редакторі). */
(() => {
'use strict';
const C = window.VCFG || {}, API = C.on === false ? '' : (C.api || '');
const qs = new URLSearchParams(location.search);
const EMBED = qs.get('embed') === '1', PREVIEW = qs.get('preview') === '1';
const SLUG = String(window.VSLUG || qs.get('s') || (location.search.match(/^\?([a-z0-9-]{3,30})(?:&|$)/i) || [])[1] || (location.pathname.match(/\/v\/([a-z0-9-]{3,30})\/?(?:index\.html)?$/i) || [])[1] || '').toLowerCase();
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const M = n => Math.round(+n || 0).toLocaleString('uk-UA').replace(/\s/g, ' ') + ' ₴';
const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };
const IC = {
  cart: '<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  search: '<path d="M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM21 21l-5.2-5.2"/>', phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
  tg: '<path d="m21 4-18 7 6 2 2 6 3-4 5 4z"/><path d="m9 13 8-6"/>', viber: '<path d="M12 3c5 0 8 2.5 8 7.5S17 18 12 18l-4 3v-3.5C5 16.5 4 14 4 10.5 4 5.5 7 3 12 3z"/>',
  ig: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r=".6"/>', tt: '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.5 2.6 2.4 4.3 5 4.5"/>',
  fb: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>', clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  truck: '<path d="M2 6h12v10H2zM14 9h4l4 4v3h-8"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/>', card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>',
  back: '<path d="m15 5-7 7 7 7"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5h.01"/>', star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'
};
const ico = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg>`;
const FONTS = { golos: ['Golos+Text:wght@400;500;600;700;800', '"Golos Text"', '"Golos Text"'], manrope: ['Manrope:wght@400;500;600;700;800', 'Manrope', 'Manrope'],
  montserrat: ['Montserrat:wght@400;500;600;700;800', 'Montserrat', 'Montserrat'], unbounded: ['Unbounded:wght@600;700;800&family=Golos+Text:wght@400;500;600;700', 'Unbounded', '"Golos Text"'] };

/* ---------- статистика для партнера: без персональних даних, одна подія на візит (sendBeacon) ----------
   u — новий відвідувач за день (з цього пристрою), o/a/c — відкрив товар / додав у кошик / почав оформлення (раз на день),
   p/ad — які товари відкривали й додавали, src — звідки прийшов (?src=ig|tt|tg|viber|fb|qr, utm_source або referrer). */
const TODAY = (() => { try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Kiev' }).format(new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); } })();
const SRC = (() => {
  const A = { instagram: 'ig', ig: 'ig', tiktok: 'tt', tt: 'tt', telegram: 'tg', tg: 'tg', viber: 'viber', facebook: 'fb', fb: 'fb', google: 'google', youtube: 'yt', yt: 'yt', qr: 'qr' };
  const k = 'vsrc_' + SLUG;
  let s = (qs.get('src') || qs.get('utm_source') || '').toLowerCase();
  if (s) s = A[s] || 'site';
  else if (EMBED) s = 'widget';
  else {
    let h = ''; try { h = new URL(document.referrer).hostname.replace(/^www\./, ''); } catch (e) { }
    if (!h || h === location.hostname) { try { s = sessionStorage.getItem(k) || ''; } catch (e) { } }
    else s = /instagram/.test(h) ? 'ig' : /tiktok/.test(h) ? 'tt' : /t\.me$|telegram/.test(h) ? 'tg' : /facebook|fb\.(com|me)$/.test(h) ? 'fb' : /viber/.test(h) ? 'viber' : /(^|\.)google\./.test(h) ? 'google' : /youtube|youtu\.be/.test(h) ? 'yt' : 'site';
  }
  s = s || 'direct'; try { sessionStorage.setItem(k, s); } catch (e) { }
  return s;
})();
const TR = { u: 0, o: 0, a: 0, c: 0, p: {}, ad: {} };
let DONE = null;
function trackInit() {
  if (DONE || PREVIEW || !API || !S || !S.slug) return;
  DONE = LS.get('vst_' + S.slug, {}); if (!DONE || DONE.d !== TODAY) DONE = { d: TODAY };
  if (!DONE.u) { DONE.u = 1; TR.u = 1; LS.set('vst_' + S.slug, DONE); }
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushTr(); });
  addEventListener('pagehide', flushTr);
  setTimeout(flushTr, 4000);
}
function tr(stage, id, kind) {
  if (!DONE) return;
  if (!DONE[stage]) { DONE[stage] = 1; TR[stage] = 1; LS.set('vst_' + S.slug, DONE); }
  if (id && kind) { const m = TR[kind]; m[id] = (m[id] || 0) + 1; }
}
function flushTr() {
  if (!DONE) return;
  if (!(TR.u || TR.o || TR.a || TR.c || Object.keys(TR.p).length || Object.keys(TR.ad).length)) return;
  const body = JSON.stringify({ action: 'v_ev', slug: S.slug, src: SRC, u: TR.u, o: TR.o, a: TR.a, c: TR.c, p: TR.p, ad: TR.ad });
  TR.u = TR.o = TR.a = TR.c = 0; TR.p = {}; TR.ad = {};
  try { if (!(navigator.sendBeacon && navigator.sendBeacon(API, body))) fetch(API, { method: 'POST', body, keepalive: true }).catch(() => { }); } catch (e) { }
}

let S = null, cfg = null, CAT = null, byId = new Map(), list = [], cart = {}, V = { q: '', c: '', n: 24 }, pd = {}, key = '';
const root = $('#v') || Object.assign(document.body.appendChild(document.createElement('div')), { id: 'v' });
if (EMBED) document.documentElement.classList.add('embed');

/* ---------- старт ---------- */
async function boot() {
  if (!API) return off('Вітрина тимчасово недоступна', 'Спробуйте трохи пізніше.');
  if (PREVIEW) { window.addEventListener('message', e => { if (e.origin === location.origin && e.data && e.data.vcfg) { S = { slug: e.data.slug || SLUG || 'preview', cfg: e.data.vcfg }; apply(); } }); await loadCat(); parent.postMessage({ vready: 1 }, location.origin); return; }
  if (!SLUG) return off('Вітрину не знайдено', 'Перевірте посилання.');
  const [r] = await Promise.all([fetch(API + '?a=get&s=' + encodeURIComponent(SLUG)).then(x => x.json()).catch(() => null), loadCat()]);
  if (!r) return off('Немає зв’язку', 'Перевірте інтернет і оновіть сторінку.', 1);
  if (!r.ok) return off('Вітрину не знайдено', 'Можливо, адресу змінено. Перевірте посилання.');
  if (r.off) return off('Вітрина тимчасово недоступна', 'Продавець призупинив роботу вітрини.');
  S = r.store; apply(); trackInit();
}
async function loadCat() {
  if (CAT) return CAT;
  try {
    const j = await fetch('/app/catalog.json', { cache: 'default' }).then(x => x.json());
    CAT = j.items.map(a => { const o = {}; j.f.forEach((k, i) => o[k] = a[i]); return o; });
    j.cats.forEach(c => (CAT.cats = CAT.cats || {})[c[0]] = c[1]);
    byId = new Map(CAT.map(p => [String(p.id), p]));
  } catch (e) { CAT = []; }
  return CAT;
}
function off(t, s, retry) {
  document.title = t;
  root.innerHTML = `<div class="v-off"><div><h1>${E(t)}</h1><p>${E(s)}</p>${retry ? '<button class="v-btn" onclick="location.reload()">Оновити</button>' : ''}</div></div>`;
}
const ink = hex => { const n = parseInt(hex.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) > 160 ? '#1d2125' : '#ffffff'; };
function apply() {
  cfg = S.cfg || {};
  const d = document.documentElement;
  d.dataset.theme = cfg.theme || 'classic'; d.dataset.radius = cfg.radius || 'round';
  d.style.setProperty('--acc', cfg.accent || '#f08a1c'); d.style.setProperty('--acc-ink', ink(cfg.accent || '#f08a1c'));
  const f = FONTS[cfg.font] || FONTS.golos;
  let l = $('#vfont'); if (!l) { l = document.createElement('link'); l.id = 'vfont'; l.rel = 'stylesheet'; document.head.appendChild(l); }
  const href = 'https://fonts.googleapis.com/css2?family=' + f[0] + '&display=swap'; if (l.href !== href) l.href = href;
  d.style.setProperty('--fh', f[1] + ',system-ui,sans-serif'); d.style.setProperty('--fb', f[2] + ',system-ui,-apple-system,"Segoe UI",Roboto,sans-serif');
  document.title = cfg.name || 'Вітрина';
  if (cfg.logo) { let ic = $('link[rel=icon]'); if (!ic) { ic = document.createElement('link'); ic.rel = 'icon'; document.head.appendChild(ic); } ic.href = cfg.logo; }
  cart = LS.get('vcart:' + S.slug, {});
  list = (cfg.items || []).map(id => byId.get(String(id))).filter(p => p && (p.av || !cfg.hideOut));
  const k = docKey(); if (k) return docView(k);
  VIEW = 'home'; render();
  const m = location.hash.match(/^#p=([\w-]+)/); if (m && byId.get(m[1])) openP(m[1]);
}
// ціна вітрини — так само рахує сервер: не нижче ціни сайту, націнка або своя ціна, округлення
function price(p) {
  const base = +p.price, o = cfg.over && cfg.over[p.id];
  let v;
  if (o) v = +o;
  else { v = base * (1 + Math.max(0, +cfg.markup || 0) / 100); v = cfg.round === '10' ? Math.ceil(v / 10) * 10 : cfg.round === '9' ? Math.ceil((v + 1) / 10) * 10 - 1 : Math.ceil(v); }
  return Math.max(Math.ceil(base), Math.round(v));
}
const nCart = () => Object.values(cart).reduce((a, q) => a + q, 0);
const saveCart = () => { LS.set('vcart:' + S.slug, cart); const b = $('#vcn'); if (b) b.textContent = nCart() || ''; };

/* ---------- сторінка ---------- */
function contacts(cls) {
  const c = cfg.contacts || {}, L = [];
  if (c.tg) L.push(['tg', 'https://t.me/' + c.tg, 'Telegram']);
  if (c.viber) L.push(['viber', 'viber://chat?number=' + encodeURIComponent('+' + c.viber.replace(/\D/g, '')), 'Viber']);
  if (c.phone) L.push(['phone', 'tel:+' + c.phone.replace(/\D/g, ''), c.phone]);
  if (c.ig) L.push(['ig', 'https://instagram.com/' + c.ig, 'Instagram']);
  if (c.tt) L.push(['tt', 'https://www.tiktok.com/@' + c.tt, 'TikTok']);
  if (c.fb) L.push(['fb', c.fb, 'Facebook']);
  return L.map(x => `<a class="${cls}" href="${E(x[1])}" target="_blank" rel="noopener">${ico(x[0])}${E(x[2])}</a>`).join('');
}
function card(p) {
  const pr = price(p), inC = cart[p.id];
  return `<article class="v-card${p.av ? '' : ' off'}"><button type="button" class="im" data-p="${E(p.id)}" aria-label="${E(p.name)}">${p.img ? `<img src="${E(p.img)}" alt="" loading="lazy">` : ''}${!p.av ? '<span class="badge out">Немає в наявності</span>' : (cfg.feat || []).includes(p.id) ? '<span class="badge">Хіт</span>' : ''}</button>
  <div class="bd"><b data-p="${E(p.id)}">${E(p.name)}</b><div class="ft"><span class="pr">${M(pr)}</span><button type="button" class="v-add" data-add="${E(p.id)}"${p.av ? '' : ' disabled'} aria-label="Додати в кошик">${ico(inC ? 'check' : 'plus')}</button></div></div></article>`;
}
function hdr() {
  const nm = cfg.name || 'Вітрина', ini = nm.trim().slice(0, 1).toUpperCase();
  return `<header class="v-top"><div class="v-wrap"><a class="v-logo" href="#" data-home>${cfg.logo ? `<img src="${E(cfg.logo)}" alt="">` : `<span class="ini">${E(ini)}</span>`}<b>${E(nm)}</b></a><span class="v-sp"></span>
   <button type="button" class="v-cartb" data-cart>${ico('cart')}<span>Кошик</span><em id="vcn">${nCart() || ''}</em></button></div></header>`;
}
// продавець: ФОП партнера, якщо вказав, інакше — Samostroy Shop
const fop = () => String(cfg.fop || C.seller || '').trim().replace(/\.\s*$/, '');
const docHref = k => EMBED ? E(fullUrl()) + '#' + k : '#' + k;
function ftr() {
  const nm = cfg.name || 'Вітрина', t = EMBED ? ' target="_blank" rel="noopener"' : '';
  return `<footer class="v-foot"><div class="v-wrap"><div><b>${E(nm)}</b>${cfg.contacts && cfg.contacts.hours ? '<br>' + E(cfg.contacts.hours) : ''}<div class="cts" style="margin-top:10px">${contacts('')}</div></div>
   <div style="max-width:460px">${fop() ? `Продавець: ${E(fop())}. Відправник: інтернет-магазин Samostroy Shop.` : 'Продавець і відправник: інтернет-магазин Samostroy Shop.'}<br>
   <a href="${docHref('povernennya')}"${t}>Обмін і повернення</a> · <a href="${docHref('pryvatnist')}"${t}>Політика конфіденційності</a><br>
   <button type="button" data-report>Поскаржитися на вітрину</button> · Працює на платформі <a href="${E(C.platform || '/dropshipping.html')}?utm_source=vitryna&utm_campaign=${E(S.slug)}" target="_blank" rel="noopener">Samostroy</a></div></div></footer>`;
}
/* ---------- правила вітрини: #povernennya, #pryvatnist — у шаблоні й кольорах вітрини ---------- */
let VIEW = 'home';
const docKey = () => { const k = location.hash.slice(1); return window.VPOLICY && VPOLICY.has(k) ? k : ''; };
function docView(k) {
  VIEW = k; close();
  const c = cfg.contacts || {}, L = [];
  if (c.tg) L.push(`<a href="https://t.me/${E(c.tg)}" target="_blank" rel="noopener">Telegram @${E(c.tg)}</a>`);
  if (c.viber) L.push(`<a href="viber://chat?number=${E(encodeURIComponent('+' + c.viber.replace(/\D/g, '')))}">Viber</a>`);
  if (c.phone) L.push(`<a href="tel:+${E(c.phone.replace(/\D/g, ''))}">${E(c.phone)}</a>`);
  if (c.ig) L.push(`<a href="https://instagram.com/${E(c.ig)}" target="_blank" rel="noopener">Instagram</a>`);
  root.innerHTML = `${PREVIEW ? '<div class="v-prev">Перегляд вітрини — так її побачать покупці</div>' : ''}${hdr()}
  <main class="v-wrap"><a class="v-back" href="#" data-home>${ico('back')}До магазину</a>
   ${VPOLICY.html(k, { name: cfg.name || 'Вітрина', fop: fop(), contacts: L.join(', ') }, ico)}
   <div class="v-doc-ask"><div><b>Залишилися питання?</b><span>Напишіть нам — відповімо й допоможемо.</span></div><div class="v-cts">${contacts('v-btn line')}</div></div>
  </main>${ftr()}<div class="v-toast" id="vtoast"></div>`;
  document.title = VPOLICY.title(k) + ' — ' + (cfg.name || 'Вітрина');
  scrollTo(0, 0); height();
}
function home() { VIEW = 'home'; document.title = cfg.name || 'Вітрина'; render(); }
function view() {
  const k = docKey(); if (k) return docView(k);
  if (VIEW !== 'home') home();
  const m = location.hash.match(/^#p=([\w-]+)/); if (m && byId.get(m[1])) openP(m[1]);
}
addEventListener('hashchange', () => { if (S && cfg) view(); });
function render() {
  const cats = [...new Set(list.map(p => p.cat))], feat = (cfg.feat || []).map(id => byId.get(String(id))).filter(p => p && p.av);
  const nm = cfg.name || 'Вітрина', ini = nm.trim().slice(0, 1).toUpperCase();
  root.innerHTML = `${PREVIEW ? '<div class="v-prev">Перегляд вітрини — так її побачать покупці</div>' : ''}
  ${hdr()}
  <section class="v-hero">${cfg.cover ? `<img class="bg" src="${E(cfg.cover)}" alt="">` : ''}<div class="in"><h1>${E(nm)}</h1>${cfg.slogan ? `<p>${E(cfg.slogan)}</p>` : ''}<div class="v-cts">${contacts('v-ct')}</div></div></section>
  <main class="v-wrap">
   ${feat.length && !EMBED ? `<section class="v-sec"><h2 class="v-h2">${ico('star')}Популярне</h2><div class="v-grid">${feat.map(card).join('')}</div></section>` : ''}
   <section class="v-sec" id="vall"><h2 class="v-h2">${EMBED ? E(nm) : 'Усі товари'}</h2>
    ${list.length > 8 ? `<div class="v-tools"><label class="v-srch">${ico('search')}<input id="vq" type="search" placeholder="Пошук товару" value="${E(V.q)}" autocomplete="off"></label></div>` : ''}
    ${cats.length > 1 ? `<div class="v-chips" id="vcats"></div>` : ''}<div id="vgrid" style="margin-top:12px"></div></section>
   ${!EMBED && (cfg.about || cfg.delivery || cfg.payment || (cfg.contacts && cfg.contacts.hours)) ? `<section class="v-sec"><div class="v-info">
    ${cfg.about ? `<div><h3>${ico('info')}Про нас</h3><p>${E(cfg.about)}</p></div>` : ''}
    <div><h3>${ico('truck')}Доставка</h3><p>${E(cfg.delivery || 'Відправляємо Новою Поштою або Укрпоштою по всій Україні, зазвичай у день замовлення.')}</p></div>
    <div><h3>${ico('card')}Оплата</h3><p>${E(cfg.payment || 'Оплата при отриманні (накладений платіж): спершу оглядаєте посилку, потім платите. Доставка — за тарифами перевізника.')}</p></div>
    ${cfg.contacts && cfg.contacts.hours ? `<div><h3>${ico('clock')}Графік</h3><p>${E(cfg.contacts.hours)}</p></div>` : ''}</div></section>` : ''}
   ${EMBED ? `<div class="v-embfoot"><a class="v-btn" href="${E(fullUrl())}" target="_blank" rel="noopener">${ico('cart')}Відкрити вітрину й замовити</a></div>` : ''}
  </main>
  ${ftr()}
  <div class="v-toast" id="vtoast"></div>`;
  chips(); grid();
  const q = $('#vq'); if (q) q.addEventListener('input', () => { V.q = q.value; V.n = 24; grid(); });
  height();
}
function chips() {
  const el = $('#vcats'); if (!el) return;
  const cats = [...new Set(list.map(p => p.cat))];
  el.innerHTML = [['', 'Усі', list.length], ...cats.map(c => [c, (CAT.cats && CAT.cats[c]) || 'Інше', list.filter(p => p.cat === c).length])]
    .map(([k, l, n]) => `<button type="button" data-cat="${E(k)}" aria-pressed="${V.c === k}">${E(l)}<i>${n}</i></button>`).join('');
}
function grid() {
  const w = V.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const L = list.filter(p => (!V.c || p.cat === V.c) && (!w.length || w.every(x => (p.name + ' ' + (p.sku || '')).toLowerCase().includes(x))));
  const n = EMBED ? Math.min(V.n, 12) : V.n;
  $('#vgrid').innerHTML = L.length ? `<div class="v-grid">${L.slice(0, n).map(card).join('')}</div>${L.length > n && !EMBED ? `<button type="button" class="v-btn ghost v-more" data-more>Показати ще · ${L.length - n}</button>` : ''}`
    : `<div class="v-empty">${list.length ? 'Нічого не знайдено' : 'Товари скоро з’являться'}</div>`;
  height();
}
const fullUrl = () => location.origin + '/v/' + (S.slug ? '?' + S.slug : '');
function toast(m) { const t = $('#vtoast'); if (!t) return; t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2200); }
function height() { if (EMBED) requestAnimationFrame(() => parent.postMessage({ vh: document.documentElement.scrollHeight }, '*')); }
if (EMBED && 'ResizeObserver' in window) new ResizeObserver(height).observe(document.documentElement);

/* ---------- вікна ---------- */
function modal(html, cls) {
  close();
  const o = document.createElement('div'); o.className = 'v-ov'; o.id = 'vov';
  o.innerHTML = `<div class="v-md ${cls || ''}" role="dialog" aria-modal="true"><button type="button" class="v-x" data-close aria-label="Закрити">${ico('x')}</button>${html}</div>`;
  document.body.appendChild(o); document.body.style.overflow = 'hidden';
  o.addEventListener('click', e => { if (e.target === o) close(); });
  return o;
}
function close() { const o = $('#vov'); if (o) { o.remove(); document.body.style.overflow = ''; if (/^#p=/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search); } }
addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

// картка товару: фото й опис беремо зі сторінки товару сайту
async function details(id) {
  if (pd[id]) return pd[id];
  try {
    const html = await fetch('/p/' + encodeURIComponent(id) + '.html').then(r => r.ok ? r.text() : '');
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const imgs = [...doc.querySelectorAll('.pp-th [data-big]')].map(b => b.getAttribute('data-big')).filter(Boolean);
    const d = doc.querySelector('.pp-desc');
    pd[id] = { imgs, desc: d ? clean(d) : '' };
  } catch (e) { pd[id] = { imgs: [], desc: '' }; }
  return pd[id];
}
function clean(node) {
  const ok = { P: 'p', STRONG: 'b', B: 'b', EM: 'i', I: 'i', UL: 'ul', OL: 'ol', LI: 'li', BR: 'br', H2: 'h3', H3: 'h3', H4: 'h3' };
  const walk = n => [...n.childNodes].map(c => {
    if (c.nodeType === 3) return E(c.textContent);
    if (c.nodeType !== 1) return '';
    const t = ok[c.tagName];
    if (t === 'br') return '<br>';
    return t ? `<${t}>${walk(c)}</${t}>` : walk(c);
  }).join('');
  return walk(node).replace(/samostroy\.?shop|самострой/gi, '');
}
async function openP(id) {
  const p = byId.get(String(id)); if (!p) return;
  if (EMBED) { window.open(fullUrl() + '#p=' + encodeURIComponent(id), '_blank', 'noopener'); return; }
  tr('o', String(id), 'p');
  history.replaceState(null, '', '#p=' + encodeURIComponent(id));
  const pr = price(p);
  modal(`<div class="v-pd"><div class="v-gal"><div class="main"><img id="vmain" src="${E(p.img)}" alt=""></div><div class="th" id="vth"></div></div>
   <div class="v-pi"><h2>${E(p.name)}</h2><div class="meta">${p.sku ? 'Артикул ' + E(p.sku) + ' · ' : ''}${p.av ? '<span class="ok">В наявності</span>' : '<span class="no">Немає в наявності</span>'}</div>
   <div class="pr">${M(pr)}</div>
   ${p.av ? `<div class="v-buy"><div class="v-qty"><button type="button" data-qd>−</button><input id="vpq" inputmode="numeric" value="1" aria-label="Кількість"><button type="button" data-qu>+</button></div><button type="button" class="v-btn" style="flex:1" data-addq="${E(p.id)}">${ico('cart')}Додати в кошик</button></div>` : ''}
   <div class="v-desc" id="vdesc"><p class="muted">Завантажуємо опис…</p></div></div></div>`);
  const d = await details(id);
  if (!$('#vdesc')) return;
  const imgs = d.imgs.length ? d.imgs : [p.img];
  $('#vth').innerHTML = imgs.length > 1 ? imgs.slice(0, 12).map((u, i) => `<button type="button" class="${i ? '' : 'on'}" data-big="${E(u)}"><img src="${E(u)}" alt="" loading="lazy"></button>`).join('') : '';
  if (d.imgs[0]) $('#vmain').src = d.imgs[0];
  $('#vdesc').innerHTML = d.desc || '<p class="muted">Напишіть нам — розповімо про товар детальніше й допоможемо порахувати кількість.</p>';
}
function add(id, q) {
  const p = byId.get(String(id)); if (!p || !p.av) return;
  cart[id] = Math.min(999, (cart[id] || 0) + (q || 1)); saveCart(); toast('Додано в кошик'); tr('a', String(id), 'ad');
  $$(`[data-add="${CSS.escape(String(id))}"]`).forEach(b => b.innerHTML = ico('check'));
}
function cartView() {
  const ids = Object.keys(cart).filter(id => byId.get(id));
  if (!ids.length) { modal(`<div class="v-mh">Кошик</div><div class="v-mb"><div class="v-empty">Кошик порожній</div><button type="button" class="v-btn wide" data-close>До товарів</button></div>`, 'sm'); return; }
  const tot = ids.reduce((a, id) => a + price(byId.get(id)) * cart[id], 0);
  modal(`<div class="v-mh">Кошик</div><div class="v-mb">${ids.map(id => { const p = byId.get(id); return `<div class="v-ci">${p.img ? `<img src="${E(p.img)}" alt="">` : '<span class="ph"></span>'}
   <div><b>${E(p.name)}</b><div class="row"><div class="v-qty"><button type="button" data-cq="${E(id)}" data-d="-1">−</button><input value="${cart[id]}" data-ci="${E(id)}" inputmode="numeric" aria-label="Кількість"><button type="button" data-cq="${E(id)}" data-d="1">+</button></div><button type="button" class="rm" data-crm="${E(id)}">Прибрати</button></div></div>
   <div class="sum">${M(price(p) * cart[id])}</div></div>`; }).join('')}
   <div class="v-tot"><span>Разом</span><b>${M(tot)}</b></div><p class="v-note">+ доставка за тарифами перевізника. Оплата при отриманні.</p>
   <button type="button" class="v-btn wide" data-checkout>Оформити замовлення</button></div>`, 'sm');
  $$('[data-ci]').forEach(i => i.addEventListener('change', () => { const v = Math.max(0, Math.min(999, parseInt(i.value) || 0)); if (v) cart[i.dataset.ci] = v; else delete cart[i.dataset.ci]; saveCart(); cartView(); }));
}
let F = LS.get('vform', { delivery: 'Нова Пошта' });
function checkout() {
  const ids = Object.keys(cart).filter(id => byId.get(id)), tot = ids.reduce((a, id) => a + price(byId.get(id)) * cart[id], 0);
  if (!ids.length) return cartView();
  tr('c');
  modal(`<div class="v-mh">Оформлення</div><form class="v-mb" id="vf" novalidate>
   <input class="hp" name="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
   <div class="v-2"><label class="v-f"><span>Прізвище та ім’я</span><input name="client" autocomplete="name" value="${E(F.client || '')}"></label>
   <label class="v-f"><span>Телефон</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+380" value="${E(F.phone || '')}"></label></div>
   <span class="v-note" style="display:block;margin:0 2px 6px;font-weight:600">Доставка</span>
   <div class="v-seg" role="group">${['Нова Пошта', 'Укрпошта'].map(d => `<button type="button" data-dl="${d}" aria-pressed="${F.delivery === d}">${d}</button>`).join('')}</div>
   <div class="v-2"><label class="v-f"><span>Місто</span><input name="city" autocomplete="address-level2" value="${E(F.city || '')}"></label>
   <label class="v-f"><span>${F.delivery === 'Укрпошта' ? 'Індекс відділення' : 'Відділення або поштомат'}</span><input name="branch" value="${E(F.branch || '')}" placeholder="№"></label></div>
   <label class="v-f"><span>Коментар (необов’язково)</span><textarea name="note" placeholder="Колір, кількість, зручний час для дзвінка"></textarea></label>
   <p class="v-note">Оплата при отриманні (накладений платіж). Разом: <b>${M(tot)}</b> + доставка за тарифами перевізника.</p>
   <p class="v-note v-agree">Підтверджуючи замовлення, ви погоджуєтеся з <a href="${docHref('povernennya')}" target="_blank" rel="noopener">умовами обміну й повернення</a> та <a href="${docHref('pryvatnist')}" target="_blank" rel="noopener">політикою конфіденційності</a>.</p>
   <p class="v-err" id="verr"></p>
   <button class="v-btn wide" id="vsend">${PREVIEW ? 'Це перегляд — замовлення вимкнено' : 'Підтвердити замовлення · ' + M(tot)}</button></form>`, 'sm');
  const f = $('#vf');
  f.addEventListener('input', e => { const n = e.target.name; if (n && n !== 'hp' && n !== 'note') { F[n] = e.target.value; LS.set('vform', F); } const x = e.target.closest('.v-f'); if (x) x.classList.remove('bad'); });
  $$('[data-dl]').forEach(b => b.onclick = () => { F.delivery = b.dataset.dl; LS.set('vform', F); checkout(); });
  f.addEventListener('submit', e => { e.preventDefault(); send(); });
}
const ERR = { phone: 'Перевірте номер телефону.', client: 'Вкажіть прізвище та ім’я.', city: 'Вкажіть місто.', branch: 'Вкажіть відділення.', rate: 'Забагато замовлень за короткий час. Спробуйте за кілька хвилин.',
  off: 'Вітрина зараз не приймає замовлення. Напишіть продавцю.', update: 'Вітрина зараз не приймає замовлення. Напишіть продавцю.', net: 'Немає зв’язку. Спробуйте ще раз.', items: 'Кошик порожній.' };
async function send() {
  if (PREVIEW) return;
  const f = $('#vf'), el = f.elements, err = m => { $('#verr').textContent = m; }, bad = n => { el[n].closest('.v-f').classList.add('bad'); el[n].focus(); };
  if (el.client.value.trim().length < 3) { bad('client'); return err(ERR.client); }
  if (el.phone.value.replace(/\D/g, '').length < 10) { bad('phone'); return err(ERR.phone); }
  if (!el.city.value.trim()) { bad('city'); return err(ERR.city); }
  if (!el.branch.value.trim()) { bad('branch'); return err(ERR.branch); }
  const b = $('#vsend'); b.classList.add('busy');
  key = key || Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const items = Object.keys(cart).filter(id => byId.get(id)).map(id => ({ id, q: cart[id] }));
  let r;
  try { r = await fetch(API, { method: 'POST', body: JSON.stringify({ action: 'v_order', slug: S.slug, key, src: SRC, hp: el.hp.value, order: { items, client: el.client.value, phone: el.phone.value, city: el.city.value, branch: el.branch.value, delivery: F.delivery, note: el.note.value } }) }).then(x => x.json()); }
  catch (e) { r = { ok: false, error: 'net' }; }
  b.classList.remove('busy');
  if (!r.ok) return err(r.error === 'stock' ? 'Деяких товарів уже немає в наявності: ' + (r.msg || '') + '. Приберіть їх із кошика.' : ERR[r.error] || 'Не вдалося оформити замовлення. Напишіть продавцю.');
  key = ''; cart = {}; saveCart(); $$('[data-add]').forEach(x => x.innerHTML = ico('plus'));
  const nm = cfg.name || 'Продавець';
  modal(`<div class="v-done"><div class="ok">${ico('check')}</div><h3>Дякуємо! Замовлення № ${E(r.id)} прийнято</h3>
   <p>${E(nm)} зв’яжеться з вами для підтвердження. Після відправки ви отримаєте номер ТТН.</p><div class="v-cts" style="justify-content:center;margin-bottom:16px">${contacts('v-btn line')}</div>
   <button type="button" class="v-btn wide" data-close>Продовжити покупки</button></div>`, 'sm');
}
function report() {
  modal(`<div class="v-mh">Поскаржитися на вітрину</div><form class="v-mb" id="vrf"><p class="v-note">Повідомлення отримає адміністрація платформи. Опишіть, що не так: обман, неправдива інформація, чужий бренд тощо.</p>
   <label class="v-f"><span>Що сталося</span><textarea name="text" required></textarea></label><label class="v-f"><span>Ваш контакт (необов’язково)</span><input name="contact"></label>
   <p class="v-err" id="verr"></p><button class="v-btn wide">Надіслати</button></form>`, 'sm');
  $('#vrf').addEventListener('submit', async e => {
    e.preventDefault(); const el = e.target.elements; if (el.text.value.trim().length < 5) return $('#verr').textContent = 'Опишіть детальніше.';
    const r = await fetch(API, { method: 'POST', body: JSON.stringify({ action: 'v_report', slug: S.slug, text: el.text.value, contact: el.contact.value }) }).then(x => x.json()).catch(() => null);
    if (!r || !r.ok) return $('#verr').textContent = 'Не вдалося надіслати. Спробуйте пізніше.';
    close(); toast('Дякуємо, скаргу надіслано');
  });
}

/* ---------- події ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-p],[data-add],[data-addq],[data-cart],[data-close],[data-cat],[data-more],[data-checkout],[data-cq],[data-crm],[data-qd],[data-qu],[data-big],[data-report],[data-home]');
  if (!b) return; const d = b.dataset;
  if (d.home !== undefined) { e.preventDefault(); if (VIEW !== 'home') { history.pushState(null, '', location.pathname + location.search); home(); return scrollTo(0, 0); } return scrollTo({ top: 0, behavior: 'smooth' }); }
  if (d.add) { e.stopPropagation(); return EMBED ? openP(d.add) : add(d.add); }
  if (d.p) return openP(d.p);
  if (d.addq) { add(d.addq, Math.max(1, parseInt($('#vpq').value) || 1)); return close(); }
  if (d.cart !== undefined) return cartView();
  if (d.close !== undefined) return close();
  if (d.cat !== undefined) { V.c = d.cat; V.n = 24; chips(); return grid(); }
  if (d.more !== undefined) { V.n += 24; return grid(); }
  if (d.checkout !== undefined) return checkout();
  if (d.cq) { const v = (cart[d.cq] || 0) + +d.d; if (v > 0) cart[d.cq] = Math.min(999, v); else delete cart[d.cq]; saveCart(); return cartView(); }
  if (d.crm) { delete cart[d.crm]; saveCart(); $$(`[data-add="${CSS.escape(d.crm)}"]`).forEach(x => x.innerHTML = ico('plus')); return cartView(); }
  if (d.qd !== undefined || d.qu !== undefined) { const i = $('#vpq'); i.value = Math.max(1, Math.min(999, (parseInt(i.value) || 1) + (d.qu !== undefined ? 1 : -1))); return; }
  if (d.big) { $('#vmain').src = d.big; $$('#vth button').forEach(x => x.classList.toggle('on', x === b)); return; }
  if (d.report !== undefined) return report();
});
boot();
})();
