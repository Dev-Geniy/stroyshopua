/* Робочий кабінет команди (jobs-drop.html): план на день, майданчики, чекліст оголошення.
   Каталог і тексти — partners.js у режимі команди (body.pk-team). Усе зберігається в цьому браузері. */
(()=>{
const $i=id=>document.getElementById(id);
const st=Object.assign({day:'',done:{},pl:{},custom:[],ck:{},tab:'free'},ls.get('team_ws',{}));
const save=()=>ls.set('team_ws',st);
const today=new Date().toISOString().slice(0,10);
if(st.day!=today){st.day=today;st.done={};save()}
// внутрішня сторінка — не індексуємо (shop.js після завантаження каталогу ставить index)
addEventListener('catalog',()=>setTimeout(()=>{const m=document.querySelector('meta[name=robots]');if(m)m.content='noindex,nofollow'},0));

/* ---------- план на день ---------- */
const DAY=[
 ['up','Підняти або оновити 5 найкращих оголошень'],
 ['new','Опублікувати 3 нових оголошення з чеклістом нижче'],
 ['msg','Відповісти на всі повідомлення — кожне протягом 15 хвилин'],
 ['vid','Зняти 1 відео або сторіс з товаром'],
 ['crm','Внести заявки й замовлення в таблицю'],
 ['ana','Записати, яке оголошення дало заявку сьогодні']];
function drawDay(){
 const n=DAY.filter(d=>st.done[d[0]]).length;
 $i('tmDate').textContent=new Date().toLocaleDateString('uk-UA',{weekday:'long',day:'numeric',month:'long'});
 $i('tmDay').innerHTML=DAY.map(([k,t])=>`<li><label class="${st.done[k]?'on':''}"><input type="checkbox" data-d="${k}" ${st.done[k]?'checked':''}><span>${t}</span></label></li>`).join('');
 $i('tmBar').style.width=Math.round(n/DAY.length*100)+'%';
 $i('tmDone').textContent=n==DAY.length?'План на сьогодні виконано. Чудова робота!':`Виконано ${n} з ${DAY.length}. План оновиться завтра.`}
$i('tmDay').addEventListener('change',e=>{const k=e.target.dataset.d;if(!k)return;st.done[k]=e.target.checked;save();drawDay()});
drawDay();

/* ---------- майданчики ---------- */
const GROUPS_PL=[
 ['free','Безкоштовні дошки','Стартуємо тут: перевіряємо попит без бюджету.',[
  ['olx','OLX','https://www.olx.ua','Найбільша дошка. Базове розміщення безкоштовне, є платне підняття.'],
  ['besplatka','Besplatka','https://besplatka.ua','Оголошення по містах і категоріях, легка модерація.'],
  ['obyava','Obyava','https://obyava.ua','Товари для дому й послуги, зручний інтерфейс.'],
  ['izi','IZI','https://izi.ua','Сучасний інтерфейс, добре для декору й дрібних товарів.'],
  ['fbm','Facebook Marketplace','https://www.facebook.com/marketplace','Локальні покупці, плюс дублювання в групи про ремонт.']]],
 ['market','Маркетплейси','Вітрина з рейтингом і відгуками — важлива якість картки.',[
  ['prom','Prom','https://prom.ua','Каталог з тарифами й частково органічним трафіком.'],
  ['rozetka','Rozetka','https://rozetka.com.ua','Великий трафік, суворі вимоги до карток і характеристик.'],
  ['flagma','Flagma (B2B)','https://flagma.ua','Опт і підрядники: більші обсяги, довші переговори.']]],
 ['social','Соцмережі','Довіра й повторні продажі: «до/після», монтаж, відгуки.',[
  ['ig','Instagram','https://www.instagram.com/samostroy.shop','Reels і сторіс з результатами.'],
  ['tt','TikTok','https://www.tiktok.com/@stroyshop_ua','Короткі відео монтажу й трансформацій.'],
  ['tgc','Telegram-канал','https://t.me/samostroy_shop','Новинки, акції й поради.']]],
 ['paid','Платне просування','Підключаємо після тестів і рахуємо окупність.',[
  ['olxp','OLX — платне просування','https://www.olx.ua','Підняття в топ, VIP, пакети. Для сильних і сезонних позицій.'],
  ['promp','Prom — платні пакети','https://prom.ua','Реклама й тарифи. Рахуйте комісію в ціні.']]]];
const STATUS=[['','Не підключено'],['work','У процесі'],['on','Активно'],['pause','Пауза']];
function places(){return GROUPS_PL.flatMap(g=>g[3].map(p=>({g:g[0],id:p[0],t:p[1],u:p[2],d:p[3]}))).concat(st.custom.map(c=>({g:'custom',...c})))}
function drawPlaces(){
 const tabs=[...GROUPS_PL.map(g=>[g[0],g[1]]),['custom','Додані нами']];
 $i('tmTabs').innerHTML=tabs.map(([k,t])=>{const L=places().filter(p=>p.g==k),on=L.filter(p=>(st.pl[p.id]||{}).s=='on').length;return `<button type="button" role="tab" aria-selected="${st.tab==k}" class="${st.tab==k?'on':''}" data-tab="${k}">${t}${on?` <i>${on}</i>`:''}</button>`}).join('');
 const g=GROUPS_PL.find(x=>x[0]==st.tab),L=places().filter(p=>p.g==st.tab);
 $i('tmPlaces').innerHTML=(g?`<p class="tm-gd">${g[2]}</p>`:'')+(L.length?L.map(p=>{const v=st.pl[p.id]||{};return `<div class="tm-p s-${v.s||'none'}">
  <div class="tm-pi"><b>${esc(p.t)}</b>${p.d?`<span>${esc(p.d)}</span>`:''}<a href="${esc(p.u)}" target="_blank" rel="noopener">${esc(p.u.replace(/^https?:\/\/(www\.)?/,'').replace(/\/$/,''))}</a></div>
  <select data-ps="${p.id}" aria-label="Статус: ${esc(p.t)}">${STATUS.map(([k,t])=>`<option value="${k}" ${(v.s||'')==k?'selected':''}>${t}</option>`).join('')}</select>
  <input data-pu="${p.id}" value="${esc(v.u||'')}" placeholder="Посилання на наш профіль" aria-label="Наш профіль: ${esc(p.t)}">
  <input data-pn="${p.id}" value="${esc(v.n||'')}" placeholder="Нотатка: тариф, логін у кого, що працює" aria-label="Нотатка: ${esc(p.t)}">
  ${p.g=='custom'?`<button type="button" class="link tm-del" data-pdel="${p.id}">Видалити</button>`:''}</div>`}).join(''):`<p class="soft">Тут з’являться майданчики, які ви додасте нижче.</p>`)}
$i('tmTabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(!b)return;st.tab=b.dataset.tab;save();drawPlaces()});
$i('tmPlaces').addEventListener('change',e=>{const t=e.target,id=t.dataset.ps||t.dataset.pu||t.dataset.pn;if(!id)return;const v=st.pl[id]=st.pl[id]||{};
 if(t.dataset.ps!=null){v.s=t.value;save();drawPlaces();return}if(t.dataset.pu!=null)v.u=t.value.trim();else v.n=t.value.trim();save();toast('Збережено')});
$i('tmPlaces').addEventListener('click',e=>{const b=e.target.closest('[data-pdel]');if(!b||!confirm('Видалити майданчик зі списку?'))return;st.custom=st.custom.filter(c=>c.id!=b.dataset.pdel);delete st.pl[b.dataset.pdel];save();drawPlaces()});
$i('tmAdd').addEventListener('click',()=>{const n=$i('tmNewN').value.trim();let u=$i('tmNewU').value.trim();if(!n){$i('tmNewN').focus();return toast('Вкажіть назву майданчика')}
 if(u&&!/^https?:\/\//.test(u))u='https://'+u;st.custom.push({id:'c'+Date.now().toString(36),t:n,u:u||'#',d:''});st.tab='custom';save();$i('tmNewN').value=$i('tmNewU').value='';drawPlaces()});
$i('tmCsv').addEventListener('click',()=>{const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"',st2=Object.fromEntries(STATUS);
 const rows=[['Група','Майданчик','Сайт','Статус','Наш профіль','Нотатка']].concat(places().map(p=>{const v=st.pl[p.id]||{};return[(GROUPS_PL.find(g=>g[0]==p.g)||[0,'Додані нами'])[1],p.t,p.u,st2[v.s||''],v.u||'',v.n||'']}));
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['﻿'+rows.map(r=>r.map(q).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}));a.download='samostroy-maidanchyky.csv';document.body.appendChild(a);a.click();setTimeout(()=>a.remove(),300)});
drawPlaces();

/* ---------- чекліст оголошення ---------- */
const CK=[
 ['Заголовок = що + розмір + для чого','«Вінілова плитка під дерево 600×300 | Для кухні й коридору»'],
 ['УТП: чому купити в нас','Підбір під ремонт, відправка в день замовлення, оплата при отриманні'],
 ['Опис за структурою','Де використовується → переваги → характеристики → як замовити'],
 ['Перше фото — найкраще','Інтер’єр або «до/після», фактура й масштаб'],
 ['4–8 фото й коротке відео','Загальний вигляд, зблизька, в інтер’єрі, розміри'],
 ['Чесна ціна','«Уцінка» — у заголовку й першому рядку опису'],
 ['Місто, доставка, оплата','Нова Пошта / Укрпошта, відправка в день замовлення, оплата при отриманні'],
 ['Заклик до дії','«Напишіть розміри — порахую кількість», «Надішлю більше фото»'],
 ['Правила майданчика','Без капсу, десятків емодзі й «100% гарантії на все»'],
 ['Один товар — одне оголошення','Краще 3 картки за кольорами, ніж одна «збірна»']];
function drawCk(){const n=CK.filter((_,i)=>st.ck[i]).length;$i('tmCk').textContent=`${n} / ${CK.length}`;
 $i('tmCheck').innerHTML=CK.map(([a,b],i)=>`<li><label class="${st.ck[i]?'on':''}"><input type="checkbox" data-c="${i}" ${st.ck[i]?'checked':''}><span><b>${a}</b><em>${b}</em></span></label></li>`).join('')}
$i('tmCheck').addEventListener('change',e=>{const i=e.target.dataset.c;if(i==null)return;st.ck[i]=e.target.checked;save();drawCk();if(CK.every((_,k)=>st.ck[k]))toast('Оголошення готове до публікації')});
$i('tmCkReset').addEventListener('click',()=>{st.ck={};save();drawCk()});
drawCk();
})();
