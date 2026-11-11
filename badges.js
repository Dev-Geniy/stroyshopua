/* Досягнення партнера: челендж «Перші 10 замовлень», значки, курси. Спільне для кабінету (kabinet.js) і Telegram Mini App (app/app.js).
   Ті самі правила рахує сервер (tools/partner-api/Code.gs, BADGES) — щоб привітання в боті збігалися з кабінетом. */
window.BADGES = (() => {
const OK = ['Отримане', 'Виплачено'], CANC = ['Скасоване', 'Повернення'];
const earnOf = o => o.earnNow != null ? +o.earnNow : (o.earnFinal != null && o.earnFinal !== '' ? +o.earnFinal : +o.earn || 0);
// [id, значок, назва, як отримати, перевірка(s)]
const LIST = [
  ['first', '🥇', 'Перше замовлення', 'Оформіть перше замовлення', s => s.orders >= 1],
  ['deliv1', '📦', 'Перша доставка', 'Клієнт отримав перше замовлення', s => s.deliv >= 1],
  ['ch10', '🏆', 'Челендж «Перші 10»', '10 замовлень (без скасованих)', s => s.orders >= 10],
  ['earn1k', '💰', 'Перші 1\u00a0000\u00a0₴', 'Заробіток з отриманих замовлень', s => s.earned >= 1000],
  ['month5', '📈', '5 за місяць', '5 замовлень за один місяць', s => s.bestMonth >= 5],
  ['streak4', '🔥', '4 тижні поспіль', 'Замовлення щотижня 4 тижні', s => s.streak >= 4],
  ['d25', '⭐', '25 замовлень', '25 замовлень (без скасованих)', s => s.orders >= 25],
  ['earn10k', '💸', '10\u00a0000\u00a0₴', 'Заробіток з отриманих замовлень', s => s.earned >= 10000],
  ['d50', '💎', '50 замовлень', '50 замовлень (без скасованих)', s => s.orders >= 50],
  ['pro', '🚀', 'Рівень Pro', 'Маржа від 15%', s => s.level === 'Pro' || s.level === 'Team'],
  ['d100', '👑', '100 замовлень', '100 замовлень (без скасованих)', s => s.orders >= 100],
  ['team', '🏢', 'Рівень Team', 'Найвигідніші ціни й бонуси', s => s.level === 'Team']
];
const CNT = ['ch10', 'd25', 'd50', 'd100'];
const COURSES = [['drop_v2', '🎓', 'Дропшипінг з нуля', 'course-dropshipping.html'], ['sales3_v2', '🎯', 'Продажі 3.0', 'course-sales3.html'], ['vitryna_v1', '🏪', 'Своя вітрина', 'course-vitryna.html']];
const wk = d => { const t = new Date(d); t.setHours(12, 0, 0, 0); t.setDate(t.getDate() - (t.getDay() + 6) % 7); return t.toISOString().slice(0, 10); };
function stats(orders, me) {
  const L = (orders || []).filter(o => !CANC.includes(o.status)), D = L.filter(o => OK.includes(o.status));
  const byM = {}, weeks = new Set(L.map(o => wk(o.created)));
  L.forEach(o => { const m = String(o.created).slice(0, 7); byM[m] = (byM[m] || 0) + 1; });
  let streak = 0; const t = new Date(); if (!weeks.has(wk(t))) t.setDate(t.getDate() - 7);   // поточний тиждень ще може бути попереду
  while (weeks.has(wk(t))) { streak++; t.setDate(t.getDate() - 7); }
  return { orders: L.length, deliv: D.length, earned: D.reduce((a, o) => a + earnOf(o), 0), bestMonth: Math.max(0, ...Object.values(byM)), streak, level: (me && me.level) || 'Starter' };
}
function courses() {
  return COURSES.map(([k, e, n, url]) => { let S = null; try { S = JSON.parse(localStorage.getItem(k) || 'null'); } catch (x) { } return { id: 'c_' + k, e, n, url, got: !!(S && S.fin), hint: 'Пройдіть курс і тест' }; });
}
function compute(orders, me, noCourses) {
  const s = stats(orders, me);
  const list = LIST.map(([id, e, n, hint, f]) => ({ id, e, n, hint, got: !!f(s) })).concat(noCourses ? [] : courses());
  const goal = s.orders < 10 ? 10 : s.orders < 25 ? 25 : s.orders < 50 ? 50 : s.orders < 100 ? 100 : 0;
  return { s, list, got: list.filter(b => b.got).length, goal, next: list.find(b => !b.got && !b.id.startsWith('c_') && !CNT.includes(b.id)) };   // кількість замовлень уже показує смужка
}
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Готова картка «Досягнення». link(url, inner, cls) — як відкривати курс (у кабінеті <a>, у Mini App кнопка data-url).
function html(orders, me, link, noCourses) {
  const R = compute(orders, me, noCourses), s = R.s, ch = s.orders < 10;
  const goal = R.goal || s.orders, pct = goal ? Math.min(100, Math.round(s.orders / goal * 100)) : 100;
  const bar = ch ? `<div class="ach-seg">${Array.from({ length: 10 }, (_, i) => `<i class="${i < s.orders ? 'on' : ''}"></i>`).join('')}</div>`
    : `<div class="ach-bar"><b style="width:${pct}%"></b></div>`;
  const left = goal - s.orders;
  const sub = ch ? (s.orders ? `Ще ${left} — і значок 🏆 «Перші 10». Скасовані не рахуються.` : 'Оформіть перше замовлення — і отримаєте перший значок 🥇')
    : R.goal ? `Ще ${left} до ${goal} замовлень.` : 'Усі цілі за кількістю виконано — ви легенда 👑';
  const tile = b => { const t = `<span class="ach-e">${b.e}</span><b>${esc(b.n)}</b><small>${b.got ? 'отримано' : esc(b.hint)}</small>`, c = 'ach-b' + (b.got ? ' got' : '') + (R.next && b.id === R.next.id ? ' nx' : '');
    return b.url && !b.got && link ? link(b.url, t, c) : `<div class="${c}" title="${esc(b.hint)}">${t}</div>`; };
  return `<div class="ach"><div class="ach-top"><div><span class="ach-k">${ch ? '🏆 Челендж' : '🎯 Наступна ціль'}</span><b class="ach-t">${ch ? '«Перші 10 замовлень»' : R.goal ? goal + ' замовлень' : 'Виконано'}</b></div><span class="ach-n"><b>${s.orders}</b>/${goal}</span></div>
  ${bar}<p class="ach-s">${sub}</p>
  ${R.next ? `<p class="ach-x">Найближчий значок: <b>${R.next.e} ${esc(R.next.n)}</b> — ${esc(R.next.hint.toLowerCase())}</p>` : ''}
  <div class="ach-h"><span>Значки</span><span>${R.got} з ${R.list.length}</span></div>
  <div class="ach-g">${R.list.map(tile).join('')}</div></div>`;
}
return { compute, html, LIST };
})();
