/* «Порекомендувати Samostroy» — тихий блок у профілі партнера (кабінет на сайті й Telegram Mini App).
   Дані — дія p_ref скрипта партнерів (tools/partner-api/Code.gs, REF). Посилання ?ref=P1001 запам’ятовується на 60 днів (refCapture). */
window.REFER = (() => {
const SITE = 'https://samostroy.shop/', KEY = 'sref', DAYS = 60;
const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const M = n => Math.round(+n || 0).toLocaleString('uk-UA') + ' ₴';
const dt = s => s ? new Date(s).toLocaleDateString('uk-UA') : '';
// запам’ятати ?ref= з адреси (останнє посилання перемагає)
function capture() {
  try { const m = location.search.match(/[?&]ref=(P\d{3,7})\b/i); if (m) localStorage.setItem(KEY, JSON.stringify({ id: m[1].toUpperCase(), t: Date.now() })); } catch (e) { }
}
function get() {
  try { const x = JSON.parse(localStorage.getItem(KEY) || 'null'); return x && Date.now() - x.t < DAYS * 864e5 ? x.id : ''; } catch (e) { return ''; }
}
const link = me => SITE + 'dropshipping.html?ref=' + encodeURIComponent(me.id);
const botLink = (me, bot) => bot ? 'https://t.me/' + bot + '?start=r_' + me.id : '';
const TEXT = 'Я продаю будматеріали з Samostroy Shop без складу й вкладень — товар відправляють самі, я отримую свою маржу. Спробуйте:';
let OPT = {};
// opts: { open(url) — відкрити посилання, note(text) — коротке повідомлення }
function html(d, me, opts) {
  OPT = opts || {};
  const R = (d && d.ref) || { first: 20, then: 10, months: 6, activeDays: 90 }, L = link(me), B = d ? botLink(me, d.bot) : '';
  const inv = (d && d.invited) || [];
  return `<p class="rf-p">Знаєте когось, кому підійде продаж без складу й вкладень? Поділіться посиланням. Коли людина почне продавати, Samostroy платитиме вам бонус: <b>${R.first}%</b> від її заробітку перші ${R.months} місяців, далі <b>${R.then}%</b>. Її заробіток від цього не зменшується.</p>
  <div class="rf-l"><input readonly value="${esc(L)}" aria-label="Ваше посилання" onclick="this.select()"><button type="button" class="btn sm" data-rfcopy="${esc(L)}">Копіювати</button></div>
  <div class="rf-a"><button type="button" class="btn ghost sm" data-rfshare="${esc(L)}">Поділитися</button>${B ? `<button type="button" class="btn ghost sm" data-rfcopy="${esc(B)}" title="${esc(B)}">Посилання на бот</button>` : ''}</div>
  ${d ? `<div class="rf-k"><div><span>Запрошено</span><b>${inv.length}</b></div><div><span>Бонус усього</span><b>${M(d.total)}</b></div><div><span>До виплати</span><b>${M(d.due)}</b></div></div>`
    : d === false ? '' : '<p class="rf-p rf-s">Завантажуємо…</p>'}
  <details class="rf-d"><summary>Умови</summary><ul>
   <li>Бонус платить Samostroy — запрошений заробляє стільки ж, скільки й без рекомендації.</li>
   <li>Рахуються лише замовлення, які клієнти отримали (без скасувань і повернень).</li>
   <li>${R.first}% — перші ${R.months} місяців від реєстрації запрошеного, далі ${R.then}% — поки він продає (без перерви понад ${R.activeDays} днів).</li>
   <li>Лише один рівень: бонус — за тих, кого запросили ви, а не за їхніх запрошених.</li>
   <li>Посилання діє ${DAYS} днів після переходу. Себе запросити не можна.</li>
   <li>Бонуси виплачуються разом із вашим заробітком.</li></ul></details>`;
}
// окремий список запрошених: ім’я, дата реєстрації, скільки бонусу принесла людина
function list(d) {
  const inv = (d && d.invited) || [];
  return inv.length ? `<div class="rf-i">${inv.map(x => `<div><b>${esc(x.name)}</b><span>з ${dt(x.created)}</span><em class="${x.bonus ? '' : 'z'}">${x.bonus ? '+' : ''}${M(x.bonus)}</em></div>`).join('')}</div>` : '';
}
function copy(t) {
  const ok = () => OPT.note && OPT.note('Посилання скопійовано');
  const fb = () => { const a = document.createElement('textarea'); a.value = t; a.style.cssText = 'position:fixed;opacity:0'; document.body.append(a); a.select(); try { document.execCommand('copy'); ok(); } catch (x) { } a.remove(); };
  try { navigator.clipboard.writeText(t).then(ok, fb); } catch (x) { fb(); }
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-rfcopy]'), s = e.target.closest('[data-rfshare]');
  if (c) return copy(c.dataset.rfcopy);
  if (s) {
    const u = s.dataset.rfshare, tg = 'https://t.me/share/url?url=' + encodeURIComponent(u) + '&text=' + encodeURIComponent(TEXT);
    if (OPT.open) return OPT.open(tg);
    if (navigator.share) return navigator.share({ text: TEXT, url: u }).catch(() => { });
    window.open(tg, '_blank', 'noopener');
  }
});
return { capture, get, html, list };
})();
