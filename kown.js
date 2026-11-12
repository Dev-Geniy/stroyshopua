/* Власні товари партнера (яких немає в каталозі) у кабінеті → «Мої товари».
   Блок видно лише тим, кому адміністратор увімкнув можливість (me.feat.own). Кожен новий чи змінений товар перевіряє менеджер;
   на вітрину можна додати лише схвалені. Сервер — tools/partner-api/Code.gs (p_own, p_own_save, p_own_del, a_own). */
window.KOWN = (() => {
// кабінет живе в замкненні (kabinet.js) і віддає сюди лише потрібне через window.KCTX
const C = () => window.KCTX || {};
const E = s => C().E(s), M = n => C().M(n), ico = n => C().ico(n), note = m => C().note(m), api = b => C().api(b), catN = c => C().catN(c), vMine = () => C().vMine();
const $i = id => document.getElementById(id);
let L = null, loading = false, P = [], edit = '';
const IMGBB = (window.CFG && CFG.imgbb) || '';
const on = () => { const me = C().me; return !!(me && me.feat && me.feat.own); };
const ST = { 'На модерації': ['wait', '⏳ На перевірці'], 'Схвалено': ['ok', '✅ Схвалено'], 'Відхилено': ['no', '✖️ Не схвалено'] };
const ERR = { name: 'Вкажіть назву (від 3 символів).', price: 'Вкажіть ціну для покупця.', photos: 'Додайте хоча б одне фото.', limit: 'Досягнуто ліміту — 100 товарів.',
  rate: 'Забагато змін за годину. Спробуйте пізніше.', feature: 'Можливість вимкнено адміністратором.', blocked: 'Кабінет призупинено.', net: 'Немає зв’язку. Спробуйте ще раз.' };

async function load() {
  if (!on() || loading) return;
  loading = true;
  const r = await api({ action: 'p_own', token: C().token });
  loading = false;
  L = r.ok ? (r.items || []) : [];
  if (r.ok && r.off && C().me && C().me.feat) delete C().me.feat.own;
  if (C().tab == 'mine') vMine();
}
function block() {
  if (!on()) return '';
  if (!L) { load(); return `<div class="kb-card" id="kbOwn"><p class="kb-small">Завантажуємо власні товари…</p></div>`; }
  const pend = L.filter(x => x.status == 'На модерації').length;
  return `<div class="kb-card" id="kbOwn"><div class="kb-ch"><div><h3>🧩 Власні товари <span class="kb-small">· ${L.length}</span></h3>
   <p class="kb-small" style="margin:2px 0 0">Товари, яких немає в каталозі. Кожен перевіряє менеджер — після схвалення його можна додати на вітрину.${pend ? ` На перевірці: ${pend}.` : ''}</p></div>
   <div class="kb-acts">${L.some(x => x.status == 'Схвалено') ? '<a class="btn ghost sm" href="v/edit.html">🏪 На вітрину</a>' : ''}<button type="button" class="btn sm" data-own-new>${ico('plus')}Додати свій товар</button></div></div>
   ${L.length ? `<div class="kb-own">${L.map(row).join('')}</div>` : `<p class="kb-small" style="margin:6px 0 0">Ще немає. Додайте фото з телефона, назву, ціну й опис — менеджер перевірить, зазвичай протягом дня.</p>`}</div>`;
}
function row(x) {
  const s = ST[x.status] || ['wait', x.status], ok = x.status == 'Схвалено';
  return `<article class="kb-oi${x.av ? '' : ' off'}"><div class="kb-oimg">${x.photos[0] ? `<img src="${E(x.photos[0])}" alt="" loading="lazy">` : ''}</div>
  <div class="kb-ob"><b>${E(x.name)}</b><small>${E(x.id)}${x.sku ? ' · ' + E(x.sku) : ''} · ${M(x.price)}${ok ? (x.ship == 'shop' ? ` · відправляє магазин · заробіток ${M(x.price - x.cost)}` : ' · відправляєте самі') : ''}</small>
   <span class="kb-ost ${s[0]}">${s[1]}</span>${x.note ? `<small class="kb-onote">${x.status == 'Відхилено' ? 'Причина' : 'Коментар'}: ${E(x.note)}</small>` : ''}
   <div class="kb-oact"><button type="button" class="btn ghost sm" data-own-edit="${E(x.id)}">${x.status == 'Відхилено' ? 'Виправити' : 'Змінити'}</button>
    <label class="kb-chk sm"><input type="checkbox" data-own-av="${E(x.id)}"${x.av ? ' checked' : ''}> в наявності</label>
    <button type="button" class="kb-olink" data-own-del="${E(x.id)}">Видалити</button></div></div></article>`;
}

/* ---------- форма ---------- */
function form(id) {
  const x = id ? L.find(y => y.id == id) : { name: '', price: '', cat: '', sku: '', desc: '', photos: [], av: true, status: '' };
  if (!x) return;
  edit = id || ''; P = [...(x.photos || [])];
  let d = $i('kbOwnD');
  if (!d) { d = document.createElement('dialog'); d.id = 'kbOwnD'; d.setAttribute('aria-labelledby', 'kbOH'); document.body.append(d); d.addEventListener('click', click); d.addEventListener('change', change); d.addEventListener('submit', submit); }
  const cs = [...new Set((C().all || []).map(p => p.cat))].filter(Boolean);
  d.innerHTML = `<form id="kbOF" novalidate><h3 id="kbOH">${id ? 'Змінити товар' : 'Новий власний товар'}</h3>
   <div class="kb-f">Фото — до 5, перше буде головним *<div class="kb-oph" id="kbOP"></div><input type="file" id="kbOFile" accept="image/*" multiple hidden></div>
   <label class="kb-f">Назва *<input name="name" maxlength="160" value="${E(x.name)}" placeholder="Напр.: Дзеркало в дерев’яній рамі 60×80 см"></label>
   <div class="kb-og2"><label class="kb-f">Ціна для покупця, ₴ *<input name="price" inputmode="numeric" value="${x.price || ''}" placeholder="1200"></label>
    <label class="kb-f">Категорія<select name="cat"><option value="">Інше</option>${cs.map(c => `<option value="${E(c)}"${x.cat == c ? ' selected' : ''}>${E(catN(c))}</option>`).join('')}</select></label></div>
   <label class="kb-f">Артикул <small>необов’язково</small><input name="sku" maxlength="40" value="${E(x.sku || '')}"></label>
   <label class="kb-f">Опис <small>розміри, матеріал, комплектація, догляд</small><textarea name="desc" rows="5" maxlength="2000">${E(x.desc || '')}</textarea></label>
   <label class="kb-chk"><input type="checkbox" name="av"${x.av !== false ? ' checked' : ''}> В наявності</label>
   <p class="kb-small">${x.status == 'Схвалено' ? '⚠️ Після змін товар знову перевірить менеджер — до того його не буде на вітрині.' : 'Менеджер перевірить товар і вирішить, хто його відправляє: ви самі чи магазин (тоді вкаже закупівельну ціну й ваш заробіток з одиниці).'}</p>
   <p class="kb-err" id="kbOE" role="alert"></p>
   <div class="kb-oft"><button type="button" class="btn ghost" data-own-x>Скасувати</button><button type="submit" class="btn" id="kbOS">Надіслати на перевірку</button></div></form>`;
  photos();
  try { d.showModal(); } catch (e) { d.setAttribute('open', ''); }
}
function photos() {
  const b = $i('kbOP'); if (!b) return;
  b.innerHTML = P.map((u, i) => `<div class="kb-opt"><img src="${E(u)}" alt="">${i ? `<button type="button" data-own-main="${i}" title="Зробити головним">★</button>` : '<em>головне</em>'}<button type="button" data-own-rm="${i}" aria-label="Прибрати фото">×</button></div>`).join('')
    + (P.length < 5 ? `<button type="button" class="kb-opadd" data-own-add>${ico('plus')}<span>Додати фото</span></button>` : '');
}
async function upload(files) {
  if (!IMGBB) return note('Завантаження фото недоступне');
  for (const f of [...files].slice(0, 5 - P.length)) {
    const add = $i('kbOP') && $i('kbOP').querySelector('.kb-opadd'); if (add) add.classList.add('busy');
    try {
      const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = URL.createObjectURL(f); });
      const k = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .86)), fd = new FormData(); fd.append('image', blob, 'tovar.jpg');
      const j = await fetch('https://api.imgbb.com/1/upload?key=' + encodeURIComponent(IMGBB), { method: 'POST', body: fd }).then(r => r.json());
      if (!j.success) throw 0;
      P.push(j.data.url);
    } catch (e) { note('Не вдалося завантажити фото. Спробуйте інше.'); }
    photos();
  }
}
async function submit(e) {
  e.preventDefault();
  const f = e.target.elements, err = $i('kbOE'), b = $i('kbOS');
  const item = { id: edit || undefined, name: f.name.value.trim(), price: +String(f.price.value).replace(/[^\d.]/g, ''), cat: f.cat.value, sku: f.sku.value.trim(), desc: f.desc.value.trim(), photos: P, av: f.av.checked };
  err.textContent = !P.length ? ERR.photos : item.name.length < 3 ? ERR.name : !(item.price > 0) ? ERR.price : '';
  if (err.textContent) return;
  b.classList.add('busy'); b.disabled = true;
  const r = await api({ action: 'p_own_save', token: C().token, item });
  b.classList.remove('busy'); b.disabled = false;
  if (!r.ok) { err.textContent = ERR[r.error] || 'Не вдалося зберегти. Спробуйте ще раз.'; return; }
  const i = L.findIndex(x => x.id == r.item.id); if (i >= 0) L[i] = r.item; else L.unshift(r.item);
  close(); note('Надіслано на перевірку менеджеру'); vMine();
}
function close() { const d = $i('kbOwnD'); if (d) try { d.close(); } catch (e) { d.removeAttribute('open'); } }
function click(e) {
  const t = e.target.closest('[data-own-add],[data-own-rm],[data-own-main],[data-own-x]'); if (!t) return;
  const d = t.dataset;
  if (d.ownAdd !== undefined) return $i('kbOFile').click();
  if (d.ownRm !== undefined) { P.splice(+d.ownRm, 1); return photos(); }
  if (d.ownMain !== undefined) { const u = P.splice(+d.ownMain, 1)[0]; P.unshift(u); return photos(); }
  if (d.ownX !== undefined) return close();
}
function change(e) { if (e.target.id == 'kbOFile' && e.target.files.length) { upload(e.target.files); e.target.value = ''; } }

/* ---------- список: змінити, наявність, видалити ---------- */
document.addEventListener('click', async e => {
  const t = e.target.closest('[data-own-new],[data-own-edit],[data-own-del]'); if (!t || !$i('kbOwn') || !$i('kbOwn').contains(t)) return;
  const d = t.dataset;
  if (d.ownNew !== undefined) return form('');
  if (d.ownEdit) return form(d.ownEdit);
  if (d.ownDel) {
    const x = L.find(y => y.id == d.ownDel); if (!x || !confirm(`Видалити «${x.name}»? З вітрини він теж зникне.`)) return;
    const r = await api({ action: 'p_own_del', token: C().token, id: x.id });
    if (!r.ok) return note('Не вдалося видалити');
    L = L.filter(y => y.id != x.id); note('Видалено'); vMine();
  }
});
document.addEventListener('change', async e => {
  const i = e.target.closest('[data-own-av]'); if (!i) return;
  const x = L.find(y => y.id == i.dataset.ownAv); if (!x) return;
  const r = await api({ action: 'p_own_save', token: C().token, item: { id: x.id, onlyAv: 1, av: i.checked } });
  if (!r.ok) { i.checked = !i.checked; return note('Не вдалося змінити'); }
  x.av = r.item.av; note(x.av ? 'Товар у наявності' : 'Позначено: немає в наявності'); vMine();
});
return { block, load, reset() { L = null; } };
})();
