/* Статистика вітрини для партнера (модуль v/). Показується в кабінеті (вкладка «Вітрина») і в редакторі вітрини.
   VSTATS.mount(el, { api, token, site, edit, orders }) — api: адреса скрипта вітрин, token: токен кабінету партнера,
   edit: посилання на редактор, orders: посилання на «Мої замовлення» (необов’язково). Дані — дія v_stats. */
window.VSTATS = (() => {
const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const M = n => Math.round(+n || 0).toLocaleString('uk-UA').replace(/\s/g, ' ') + ' ₴';
const N = n => Math.round(+n || 0).toLocaleString('uk-UA').replace(/\s/g, ' ');
const P = (a, b) => b ? (a / b * 100) : 0;
const PF = x => (x >= 10 || x === 0 ? Math.round(x) : x.toFixed(1).replace('.', ',')) + '%';
const SRCN = { ig: 'Instagram', tt: 'TikTok', tg: 'Telegram', viber: 'Viber', fb: 'Facebook', google: 'Google', yt: 'YouTube', qr: 'QR-код', widget: 'Віджет на вашому сайті', site: 'Інші сайти', direct: 'Пряме посилання / без джерела' };
const OK = ['Отримане', 'Виплачено'], WORK = ['Нове', 'Підтверджене', 'Відправлене'], CANC = ['Скасоване', 'Повернення'];
const CL = 'https://samostroy.shop/course-vitryna.html#l=';
let css = false;
function style() {
  if (css) return; css = true;
  const s = document.createElement('style');
  s.textContent = `
.vs{--vs-acc:#e8590c;--vs-line:color-mix(in srgb,currentColor 13%,transparent);--vs-soft:color-mix(in srgb,currentColor 62%,transparent);--vs-bg:color-mix(in srgb,currentColor 4%,transparent);display:grid;gap:14px;font-variant-numeric:tabular-nums}
.vs *{box-sizing:border-box}
.vs-card{border:1px solid var(--vs-line);border-radius:14px;padding:16px 18px;min-width:0}
.vs h4{font-size:16px;font-weight:700;margin:0 0 4px}.vs .vs-s{color:var(--vs-soft);font-size:13px;margin:0 0 12px}
.vs-top{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center;justify-content:space-between}
.vs-top b{font-size:18px}.vs-top a.vs-l{color:inherit;font-size:13.5px;word-break:break-all}
.vs-chip{display:inline-block;font-size:12px;font-weight:700;border-radius:999px;padding:3px 9px;background:var(--vs-bg);border:1px solid var(--vs-line);margin-left:6px;vertical-align:2px}
.vs-chip.ok{color:#1f7a3f;border-color:color-mix(in srgb,#1f7a3f 40%,transparent)}.vs-chip.wait{color:#b45309;border-color:color-mix(in srgb,#b45309 40%,transparent)}
.vs-per{display:inline-flex;border:1px solid var(--vs-line);border-radius:999px;padding:3px;gap:2px}
.vs-per button{font:inherit;font-size:13px;font-weight:600;border:0;background:none;color:inherit;border-radius:999px;padding:6px 12px;cursor:pointer}
.vs-per button[aria-pressed=true]{background:var(--vs-acc);color:#fff}
.vs-act{display:flex;gap:8px;flex-wrap:wrap}
.vs-btn{display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:13.5px;font-weight:600;border:1px solid var(--vs-line);background:none;color:inherit;border-radius:10px;padding:8px 12px;cursor:pointer;text-decoration:none}
.vs-btn:hover{border-color:var(--vs-acc)}
.vs-kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(138px,1fr));gap:10px}
.vs-k{border:1px solid var(--vs-line);border-radius:12px;padding:12px 14px;min-width:0}
.vs-k span{display:block;color:var(--vs-soft);font-size:12.5px}.vs-k b{display:block;font-size:22px;line-height:1.25;margin:2px 0}
.vs-k small{font-size:12px;color:var(--vs-soft)}.vs-k small i{font-style:normal;font-weight:700}.vs-k small i.up{color:#1f7a3f}.vs-k small i.dn{color:#b42318}
.vs-chart{position:relative}.vs-chart svg{display:block;overflow:visible}
.vs-chart .gl{stroke:var(--vs-line);stroke-width:1}.vs-chart text{fill:var(--vs-soft);font-size:11px}
.vs-chart .bar{fill:var(--vs-acc)}.vs-chart .hit{fill:transparent;cursor:pointer}.vs-chart .bar.on{opacity:.7}
.vs-chart .od{fill:currentColor}
.vs-tip{position:absolute;pointer-events:none;background:Canvas;color:CanvasText;border:1px solid var(--vs-line);box-shadow:0 6px 24px rgba(0,0,0,.14);border-radius:10px;padding:8px 10px;font-size:12.5px;line-height:1.45;white-space:nowrap;transform:translate(-50%,-100%);z-index:3}
.vs-g2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.vs-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 10px;align-items:center;margin-bottom:10px;font-size:14px}
.vs-row .tr{grid-column:1/-1;height:8px;border-radius:4px;background:var(--vs-bg);overflow:hidden}
.vs-row .tr i{display:block;height:100%;border-radius:4px;background:var(--vs-acc)}
.vs-row em{font-style:normal;color:var(--vs-soft);font-size:12.5px;margin-left:6px}
.vs-tip2{border-left:3px solid var(--vs-acc);background:var(--vs-bg);border-radius:0 10px 10px 0;padding:10px 12px;font-size:13.5px;margin-top:4px}
.vs-tip2 a{color:inherit}
.vs-tb{width:100%;border-collapse:collapse;font-size:13.5px}
.vs-tb th{text-align:right;color:var(--vs-soft);font-weight:600;font-size:12px;padding:0 0 6px 8px;white-space:nowrap}.vs-tb th:first-child{text-align:left;padding-left:0}
.vs-tb td{border-top:1px solid var(--vs-line);padding:8px 0 8px 8px;text-align:right;white-space:nowrap}.vs-tb td:first-child{text-align:left;padding-left:0;white-space:normal;min-width:200px}
.vs-tb td small{display:block;color:#b45309;font-size:11.5px}
.vs-tb a{color:inherit;text-decoration:none}.vs-tb a:hover{text-decoration:underline}
.vs-src{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.vs-src button{font:inherit;font-size:12.5px;border:1px dashed var(--vs-line);background:none;color:inherit;border-radius:8px;padding:5px 9px;cursor:pointer}
.vs-src button:hover{border-color:var(--vs-acc)}
.vs-empty{text-align:center;padding:26px 12px}.vs-empty b{display:block;font-size:17px;margin-bottom:6px}
.vs-note{color:var(--vs-soft);font-size:12px}
.vs-load{padding:30px;text-align:center;color:var(--vs-soft)}
@media(max-width:760px){.vs-g2{grid-template-columns:1fr}.vs-k b{font-size:20px}.vs-card{padding:14px}}`;
  document.head.appendChild(s);
}
const ymd = d => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Kiev' }).format(d);
const dayList = (today, n, off) => { const t = new Date(today + 'T12:00:00Z'), r = []; for (let i = n - 1 + (off || 0); i >= (off || 0); i--) r.push(ymd(new Date(t - i * 864e5))); return r; };
const lbl = d => new Date(d + 'T12:00:00Z').toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' }).replace('.', '');

function sum(D, days) {
  const t = { v: 0, u: 0, o: 0, a: 0, c: 0, n: 0, s: 0, src: {}, so: {}, p: {} };
  days.forEach(d => {
    const x = D[d]; if (!x) return;
    ['v', 'u', 'o', 'a', 'c', 'n', 's'].forEach(k => t[k] += +x[k] || 0);
    Object.entries(x.src || {}).forEach(([k, v]) => t.src[k] = (t.src[k] || 0) + v);
    Object.entries(x.so || {}).forEach(([k, v]) => t.so[k] = (t.so[k] || 0) + v);
    Object.entries(x.p || {}).forEach(([id, a]) => { const q = t.p[id] || (t.p[id] = [0, 0, 0, 0]); a.forEach((v, i) => q[i] += +v || 0); });
  });
  t.vis = t.u || t.v;   // відвідувачі (до появи лічильника відвідувачів — перегляди)
  return t;
}
function delta(a, b) {
  if (!b) return a ? '<i class="up">нове</i>' : '';
  const d = (a - b) / b * 100; if (Math.abs(d) < 1) return '<i>без змін</i>';
  return `<i class="${d > 0 ? 'up' : 'dn'}">${d > 0 ? '▲' : '▼'} ${Math.round(Math.abs(d))}%</i>`;
}
function advice(t) {
  const vis = t.vis;
  if (vis < 15) return `Поки замало відвідувачів для висновків. Почніть з посилання в шапці профілю й закріпленого поста — <a href="${CL}v13" target="_blank" rel="noopener">куди поставити посилання</a>.`;
  const st = [['o', P(t.o, vis), 35, `Мало хто відкриває товари (${PF(P(t.o, vis))}). Поставте найкращі товари з гарними фото в ★ «Популярне», оновіть обкладинку й слоган — <a href="${CL}v6" target="_blank" rel="noopener">урок про оформлення</a>.`],
    ['a', P(t.a, t.o), 20, `Товари переглядають, але рідко додають у кошик (${PF(P(t.a, t.o))}). Перевірте ціну й націнку, порівняйте з ринком — <a href="${CL}v11" target="_blank" rel="noopener">урок про ціни</a>.`],
    ['c', P(t.c, t.a), 45, `Додають у кошик, але не переходять до оформлення (${PF(P(t.c, t.a))}). Напишіть у «Про вас», що відповідаєте швидко й допомагаєте з розрахунком, — <a href="${CL}v8" target="_blank" rel="noopener">шаблони</a>.`],
    ['n', P(t.n, t.c), 40, `Починають оформлення, але не завершують (${PF(P(t.n, t.c))}). Зніміть страхи: оплата при отриманні з оглядом, відправка в день замовлення — <a href="${CL}v9" target="_blank" rel="noopener">тексти про доставку й оплату</a>.`]];
  const w = st.filter(s => s[1] < s[2]).sort((a, b) => a[1] / a[2] - b[1] / b[2])[0];
  if (w) return w[3];
  return `Воронка в нормі 👍 Тепер головне — більше відвідувачів: регулярні пости й відео — <a href="${CL}v14" target="_blank" rel="noopener">план на 7 днів</a>.`;
}

function chart(D, days, W) {
  const H = 170, pl = 28, pb = 22, pt = 8, w = W - pl, h = H - pb - pt, n = days.length;
  const vals = days.map(d => { const x = D[d] || {}; return { d, vis: (+x.u || 0) || (+x.v || 0), v: +x.v || 0, n: +x.n || 0, s: +x.s || 0 }; });
  const mx = Math.max(4, ...vals.map(x => x.vis)), step = Math.ceil(mx / 4), top = step * 4;
  const bw = w / n, gap = Math.min(2 + bw * 0.25, 10), bar = Math.max(2, bw - gap);
  let g = '';
  for (let i = 0; i <= 4; i++) { const y = pt + h - h * i / 4; g += `<line class="gl" x1="${pl}" x2="${W}" y1="${y}" y2="${y}"/><text x="${pl - 6}" y="${y + 4}" text-anchor="end">${N(step * i)}</text>`; }
  const every = Math.ceil(n / 7);
  vals.forEach((x, i) => {
    const bh = x.vis ? Math.max(3, h * x.vis / top) : 0, X = pl + i * bw + gap / 2, Y = pt + h - bh, r = Math.min(4, bar / 2, bh);
    const path = bh ? `M${X},${pt + h}V${Y + r}Q${X},${Y} ${X + r},${Y}H${X + bar - r}Q${X + bar},${Y} ${X + bar},${Y + r}V${pt + h}Z` : '';
    g += `${path ? `<path class="bar" data-b="${i}" d="${path}"/>` : ''}<rect class="hit" x="${pl + i * bw}" y="${pt}" width="${bw}" height="${h + 12}" data-i="${i}"/>`;
    if (x.n) g += `<circle class="od" cx="${X + bar / 2}" cy="${pt + h + 6}" r="2.5"/>`;
    if (i % every === (n - 1) % every) g += `<text x="${X + bar / 2}" y="${H - 2}" text-anchor="middle">${lbl(x.d)}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Відвідувачі вітрини по днях">${g}</svg>`;
}

function view(R, per, o) {
  const st = R.store, D = R.days || {}, days = dayList(R.today, per), prev = dayList(R.today, per, per);
  const t = sum(D, days), tp = sum(D, prev);
  const link = st.approved ? `samostroy.shop/v/${st.slug}/` : `samostroy.shop/v/?${st.slug}`;
  const from = days[0], L = (R.list || []).filter(x => ymd(new Date(x.created)) >= from);
  const ok = L.filter(x => OK.includes(x.status)), work = L.filter(x => WORK.includes(x.status)), canc = L.filter(x => CANC.includes(x.status));
  const earnOk = ok.reduce((a, x) => a + (+x.earn || 0), 0), earnW = work.reduce((a, x) => a + (+x.earn || 0), 0);
  const conv = P(t.n, t.vis), convP = P(tp.n, tp.vis), avg = t.n ? t.s / t.n : 0;
  const has = Object.keys(D).length > 0;
  const per3 = [[7, '7 днів'], [30, '30 днів'], [90, '90 днів']];
  const top = `<div class="vs-card vs-top"><div><b>${E(st.name || 'Моя вітрина')}</b><span class="vs-chip ${st.status === 'Опублікована' ? 'ok' : st.status === 'Вимкнена' ? '' : 'wait'}">${E(st.status)}</span><br><a class="vs-l" href="https://${link}" target="_blank" rel="noopener">${E(link)}</a></div>
   <div class="vs-act"><div class="vs-per" role="group" aria-label="Період">${per3.map(([d, l]) => `<button type="button" data-per="${d}" aria-pressed="${d === per}">${l}</button>`).join('')}</div>
   <a class="vs-btn" href="${E(o.edit || 'v/edit.html')}">✏️ Редагувати</a><button type="button" class="vs-btn" data-rf title="Оновити">↻</button></div></div>`;
  if (!has) return top + `<div class="vs-card vs-empty"><b>Статистика з’явиться після перших відвідувачів</b><p class="vs-s">Поділіться посиланням на вітрину — тут ви побачите відвідувачів, джерела, воронку й найпопулярніші товари.</p>${srcLinks(link)}</div>`;
  const kpi = [['Відвідувачі', N(t.vis), `${t.u ? N(t.v) + ' переглядів · ' : ''}${delta(t.vis, tp.vis)}`],
    ['Замовлення', N(t.n), delta(t.n, tp.n)],
    ['Конверсія', PF(conv), `з відвідувача в замовлення · ${delta(conv, convP)}`],
    ['Сума продажів', M(t.s), `середній чек ${t.n ? M(avg) : '—'}`],
    ['Ваш заробіток', M(earnOk), `${earnW ? 'ще ' + M(earnW) + ' очікується' : 'з отриманих замовлень'}`]];
  const funnel = [['Відвідали вітрину', t.vis], ['Відкрили картку товару', t.o], ['Додали в кошик', t.a], ['Почали оформлення', t.c], ['Замовили', t.n]];
  const srcAll = Object.keys(SRCN).filter(k => t.src[k] || t.so[k]).sort((a, b) => (t.src[b] || 0) - (t.src[a] || 0));
  const srcMax = Math.max(1, ...srcAll.map(k => t.src[k] || 0));
  const prods = Object.entries(t.p).map(([id, a]) => ({ id, name: (R.names || {})[id] || 'Товар ' + id, o: a[0], a: a[1], q: a[2], s: a[3] }))
    .sort((x, y) => y.s - x.s || y.q - x.q || y.o - x.o).slice(0, 10);
  return top + `
  <div class="vs-kpi">${kpi.map(([l, b, s]) => `<div class="vs-k"><span>${l}</span><b>${b}</b><small>${s}</small></div>`).join('')}</div>
  <div class="vs-card"><h4>Відвідувачі по днях</h4><p class="vs-s">Стовпчик — відвідувачі за день, крапка під ним — у цей день було замовлення. Наведіть або торкніться, щоб побачити деталі.</p>
   <div class="vs-chart" data-chart><div class="vs-tip" hidden></div></div></div>
  <div class="vs-g2">
   <div class="vs-card"><h4>Воронка покупця</h4><p class="vs-s">Скільки відвідувачів доходить до кожного кроку.</p>
    ${funnel.map(([l, v], i) => `<div class="vs-row"><span>${l}</span><b>${N(v)}<em>${i ? PF(P(v, t.vis)) : '100%'}</em></b><div class="tr"><i style="width:${Math.min(100, P(v, t.vis || 1))}%"></i></div></div>`).join('')}
    <div class="vs-tip2">💡 ${advice(t)}</div></div>
   <div class="vs-card"><h4>Звідки приходять</h4><p class="vs-s">Нові відвідувачі за джерелом і замовлення з нього.</p>
    ${srcAll.length ? srcAll.map(k => `<div class="vs-row"><span>${SRCN[k]}</span><b>${N(t.src[k] || 0)}<em>${t.so[k] ? N(t.so[k]) + ' замовл.' : ''}</em></b><div class="tr"><i style="width:${P(t.src[k] || 0, srcMax)}%"></i></div></div>`).join('') : '<p class="vs-s">Джерела з’являться з новими відвідувачами.</p>'}
    <p class="vs-note">Instagram, TikTok і Telegram часто не передають, звідки прийшов відвідувач. Щоб бачити точно, ділитеся посиланнями з міткою — натисніть, щоб скопіювати:</p>${srcLinks(link)}</div>
  </div>
  <div class="vs-card"><h4>Товари</h4><p class="vs-s">Що відкривають, додають у кошик і купують за обраний період.</p>
   ${prods.length ? `<div style="overflow-x:auto"><table class="vs-tb"><thead><tr><th>Товар</th><th>Відкрили</th><th>У кошик</th><th>Продано</th><th>Сума</th></tr></thead><tbody>
   ${prods.map(p => `<tr><td><a href="https://samostroy.shop/p/${E(p.id)}.html" target="_blank" rel="noopener">${E(p.name)}</a>${p.o >= 5 && !p.q ? '<small>Цікавляться, але не купують — перевірте ціну й фото</small>' : ''}</td><td>${N(p.o)}</td><td>${N(p.a)}</td><td>${N(p.q)}</td><td>${p.s ? M(p.s) : '—'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="vs-s">Ще ніхто не відкривав товари за цей період.</p>'}</div>
  <div class="vs-card"><h4>Замовлення з вітрини</h4><p class="vs-s">За обраний період, за датою оформлення.</p>
   <div class="vs-kpi"><div class="vs-k"><span>У роботі</span><b>${work.length}</b><small>${earnW ? 'очікується ' + M(earnW) : 'нові, підтверджені, у дорозі'}</small></div>
    <div class="vs-k"><span>Отримано клієнтами</span><b>${ok.length}</b><small>${M(earnOk)} заробітку</small></div>
    <div class="vs-k"><span>Скасовано / відмова</span><b>${canc.length}</b><small>${L.length ? PF(P(canc.length, L.length)) + ' від усіх' : '—'}</small></div></div>
   ${o.orders ? `<p style="margin:12px 0 0"><a class="vs-btn" href="${E(o.orders)}">Усі замовлення →</a></p>` : ''}</div>
  <p class="vs-note">Відвідувач — унікальний пристрій за день, перегляд — кожне відкриття вітрини. Дані оновлюються протягом кількох хвилин і зберігаються 120 днів (по товарах — 45 днів). За весь час: ${N(st.views)} переглядів, ${N(st.orders)} замовлень. Без персональних даних покупців.</p>`;
}
function srcLinks(link) {
  return `<div class="vs-src">${[['ig', 'Instagram'], ['tt', 'TikTok'], ['tg', 'Telegram'], ['viber', 'Viber'], ['qr', 'QR / друк']].map(([k, l]) => `<button type="button" data-copy="https://${E(link)}${link.includes('?') ? '&' : '?'}src=${k}">${l}</button>`).join('')}</div>`;
}

function mount(el, o) {
  style();
  let R = null, per = 30;
  el.classList.add('vs');
  try { const a = getComputedStyle(el).getPropertyValue('--vs-acc'); if (!a.trim() && o.acc) el.style.setProperty('--vs-acc', o.acc); } catch (e) { }
  if (o.acc) el.style.setProperty('--vs-acc', o.acc);
  const draw = () => {
    if (!R) return;
    if (!R.store) { el.innerHTML = o.empty || '<div class="vs-card vs-empty"><b>У вас ще немає вітрини</b><p class="vs-s">Створіть її за 10 хвилин — і тут з’явиться статистика.</p><a class="vs-btn" href="' + E(o.edit || 'v/edit.html') + '">🏪 Створити вітрину</a></div>'; return; }
    el.innerHTML = view(R, per, o); bind();
  };
  const load = async () => {
    if (!R) el.innerHTML = '<div class="vs-load">Завантажуємо статистику…</div>';
    try { R = await (await fetch(o.api, { method: 'POST', body: JSON.stringify({ action: 'v_stats', token: o.token }) })).json(); }
    catch (e) { R = { ok: false, error: 'net' }; }
    if (!R.ok) { const m = R.error === 'action' ? 'Статистика ще не ввімкнена: оновіть скрипт вітрин (інструкція — tools/vitryna-api/ЯК-ЗАПУСТИТИ.md).' : R.error === 'auth' ? 'Увійдіть у кабінет ще раз.' : 'Не вдалося завантажити статистику. Спробуйте пізніше.'; el.innerHTML = `<div class="vs-card vs-empty"><p class="vs-s">${m}</p><button type="button" class="vs-btn" data-rf>Спробувати ще раз</button></div>`; R = null; bind(); return; }
    draw();
  };
  function bind() {
    el.onclick = async e => {
      const b = e.target.closest('[data-per],[data-rf],[data-copy]'); if (!b) return;
      if (b.dataset.per) { per = +b.dataset.per; return draw(); }
      if (b.dataset.rf !== undefined) return load();
      if (b.dataset.copy) { try { await navigator.clipboard.writeText(b.dataset.copy); } catch (x) { const t = document.createElement('textarea'); t.value = b.dataset.copy; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); } const l = b.textContent; b.textContent = '✓ Скопійовано'; setTimeout(() => b.textContent = l, 1400); }
    };
    const ch = el.querySelector('[data-chart]'); if (!ch) return;
    const tip = ch.querySelector('.vs-tip'), days = dayList(R.today, per), D = R.days || {};
    ch.insertAdjacentHTML('afterbegin', chart(D, days, Math.max(260, Math.floor(ch.clientWidth))));
    const show = t => {
      const i = +t.dataset.i, d = days[i], x = D[d] || {}, r = t.getBoundingClientRect(), cr = ch.getBoundingClientRect();
      ch.querySelectorAll('.bar.on').forEach(b => b.classList.remove('on'));
      const bar = ch.querySelector(`[data-b="${i}"]`); if (bar) bar.classList.add('on');
      tip.innerHTML = `<b>${lbl(d)}</b><br>Відвідувачі: ${N((+x.u || 0) || (+x.v || 0))}${x.u ? ' · перегляди: ' + N(x.v) : ''}<br>Замовлення: ${N(x.n)}${x.s ? ' · ' + M(x.s) : ''}`;
      tip.hidden = false;
      const left = Math.min(cr.width - 70, Math.max(70, r.left - cr.left + r.width / 2));
      tip.style.left = left + 'px'; tip.style.top = '6px';
    };
    ch.querySelectorAll('.hit').forEach(h => { h.addEventListener('mouseenter', () => show(h)); h.addEventListener('click', () => show(h)); });
    ch.addEventListener('mouseleave', () => { tip.hidden = true; ch.querySelectorAll('.bar.on').forEach(b => b.classList.remove('on')); });
  }
  let rt = 0, lw = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (R && R.store && el.isConnected && Math.abs(el.clientWidth - lw) > 20) { lw = el.clientWidth; draw(); } }, 200); });
  load();
  return { reload: load };
}
return { mount };
})();
