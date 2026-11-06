/* Товари для продажу (partners.html): каталог для дропшиперів з цінами, доходом, готовими текстами й експортом.
   Працює поверх shop.js (каталог товарів, шапка, кошик, картка товару). */
(()=>{
// TEAM — робочий кабінет команди (jobs-drop.html): ціни магазину без націнки й доходу партнера, свій список
const TEAM=document.body.classList.contains('pk-team');
const KEY=TEAM?'team_v1':'partner_v2';
const S=Object.assign({m:10,mk:0,list:[],av:1},ls.get(KEY,{}));if(TEAM)S.mk=0;
const save=()=>ls.set(KEY,S);
const $i=id=>document.getElementById(id);
const grid=$i('pkGrid'),STEP=24;
let shown=STEP,onlyList=false;

/* ---------- ціни ---------- */
const sellOf=p=>Math.ceil(p.price*(1+S.mk/100));
const wholeOf=p=>p.price*(1-S.m/100);
const incOf=p=>sellOf(p)-wholeOf(p);

/* ---------- тексти ---------- */
const BEN={
 stiny:['Клеїться без клею й інструментів — ремонт стіни за один день','Ховає нерівності, легко миється вологою ганчіркою'],
 plytka:['Укладається без розчину й затирки — без бруду й майстрів','Не боїться вологи: підходить для кухні та ванної'],
 pidloga:['Кладеться поверх старої підлоги без спеціальних інструментів','Зносостійке покриття, яке легко доглядати'],
 dekor:['Завершує ремонт: закриває стики й торці, додає акцент','Легкий монтаж своїми руками'],
 dim:['Практична річ для дому, яку легко показати на фото','Зручно купувати одразу кілька штук']};
const grpOf=p=>(catBy[p.cat]||[])[1]||'dim';
const UNITS={Ширина:' мм',Довжина:' мм',Висота:' мм',Товщина:' мм',Глибина:' мм','Площа, що покривається панеллю':' м²','Площа, що покривається пачкою':' м²'};
const SKIP=new Set(['Стан','Країна виробник']);
function htmlText(h){
 const d=new DOMParser().parseFromString(h||'','text/html');
 d.querySelectorAll('li').forEach(li=>li.prepend('• '));
 d.querySelectorAll('p,li,br,h1,h2,h3,h4,div,ul,ol').forEach(e=>e.append('\n'));
 return (d.body.textContent||'').replace(/ /g,' ').replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim()}
function title(p){let t=p.name.replace(/\s*\((?=[^)]*\d)[^)]{1,12}\)\s*/g,' ').replace(/\s+/g,' ').trim();if(t.length>70)t=t.slice(0,69).replace(/\s+\S*$/,'')+'…';return t}
function adText(p,full=true){
 const b=BEN[grpOf(p)]||BEN.dim;
 const pars=p.par.filter(([k,v])=>v&&!SKIP.has(k)).map(([k,v])=>`• ${k}: ${v}${UNITS[k]&&/^[\d.,\s*xх×]+$/i.test(v)?UNITS[k]:''}`);
 const d=full?htmlText(p.desc):'';
 return [title(p),'',`Ціна: ${money(sellOf(p))}`,'',`✓ ${b[0]}`,`✓ ${b[1]}`,
  ...(pars.length?['','Характеристики:',...pars]:[]),
  ...(d?['',d.length>1800?d.slice(0,1800).replace(/\s+\S*$/,'')+'…':d]:[]),
  '','🚚 Відправка в день замовлення Новою Поштою або Укрпоштою','💳 Оплата при отриманні з оглядом на відділенні','📏 Напишіть розміри — допоможу порахувати потрібну кількість'].join('\n')}
const photos=p=>p.imgs.join('\n');

/* ---------- копіювання й файли ---------- */
function copy(t,msg){
 const ok=()=>toast(msg||'Скопійовано');
 const fb=()=>{const a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();try{document.execCommand('copy');ok()}catch(x){toast('Не вдалося скопіювати')}a.remove()};
 try{navigator.clipboard.writeText(t).then(ok,fb)}catch(x){fb()}}
function csv(L){
 const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
 const head=TEAM?['Назва','Артикул','Категорія','Ціна','Наявність','Фото','Опис','Посилання']:['Назва','Артикул','Категорія','Рекомендована ціна','Моя ціна','Мій дохід (орієнтовно)','Наявність','Фото','Опис','Посилання'];
 const rows=[head].concat(L.map(p=>TEAM?[p.name,p.sku,cname(p.cat),Math.round(p.price),p.av?'В наявності':'Немає',p.imgs.join(' '),adText(p),CFG.site+'?p='+p.id]:[p.name,p.sku,cname(p.cat),Math.round(p.price),sellOf(p),Math.round(incOf(p)),p.av?'В наявності':'Немає',p.imgs.join(' '),adText(p),CFG.site+'?p='+p.id]));
 const blob=new Blob(['﻿'+rows.map(r=>r.map(q).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='samostroy-tovary-'+new Date().toISOString().slice(0,10)+'.csv';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
 toast('Файл завантажено: '+L.length+' товарів')}

/* ---------- фільтри ---------- */
function fillCats(){
 const sel=$i('pkCat');let h='<option value="">Усі категорії</option>';
 for(const[g]of GROUPS){const cs=(ORDER[g]||[]).filter(c=>!VIRT[c]&&counts[c]);if(!cs.length)continue;
  h+=`<optgroup label="${esc(gname(g))}">`+cs.map(c=>`<option value="${c}">${esc(cname(c))} (${all.filter(p=>p.cat==c&&p.av).length})</option>`).join('')+'</optgroup>'}
 const v=sel.value;sel.innerHTML=h;sel.value=v}
function list(){
 if(onlyList)return S.list.map(id=>byId.get(id)).filter(Boolean);
 const q=$i('pkQ').value.trim().toLowerCase().replace(/[x*×]/g,'х'),c=$i('pkCat').value,so=$i('pkSort').value;
 const words=q.split(/\s+/).filter(Boolean);
 let L=all.filter(p=>(!S.av||p.av)&&(!c||p.cat==c)&&words.every(w=>p.key.includes(w)));
 if(so=='lo')L.sort((a,b)=>a.price-b.price);else if(so=='hi')L.sort((a,b)=>b.price-a.price);else if(so=='new')L.sort((a,b)=>b.n-a.n);
 else L.sort((a,b)=>(b.av-a.av)||(b.imgs.length>2)-(a.imgs.length>2)||a.i-b.i);
 return L}

/* ---------- рендер ---------- */
const ico=n=>`<svg class="i"><use href="#i-${n}"/></svg>`;
function item(p){
 const on=S.list.includes(p.id);
 return `<article class="pk-c${on?' on':''}${p.av?'':' out'}">
  <button type="button" class="im" data-p="${esc(p.id)}" aria-label="Відкрити: ${esc(p.name)}"><img loading="lazy" decoding="async" src="${esc(p.img)}" alt="" onerror="this.style.opacity=0">${p.av?'':`<span class="badge out">${t('outst')}</span>`}<em>${p.imgs.length} фото</em></button>
  <div class="pk-b">
   <span class="pk-sku">${esc(p.sku||p.id)} · ${esc(cname(p.cat))}</span>
   <b class="pk-n">${esc(p.name)}</b>
   <dl class="pk-pr"><div><dt>${TEAM?'Ціна':'Рекомендована'}</dt><dd>${money(p.price)}</dd></div>${S.mk?`<div><dt>Ваша ціна</dt><dd>${money(sellOf(p))}</dd></div>`:''}${TEAM?'':`<div class="y"><dt>Ваш дохід ≈</dt><dd>${money(incOf(p))}</dd></div>`}</dl>
   ${p.av&&p.qty>0&&p.qty<=10?`<span class="pk-low">Залишилось ${p.qty} шт.</span>`:''}
   <div class="pk-act">
    <button type="button" class="btn sm" data-pk="copy" data-pid="${esc(p.id)}">Текст</button>
    <button type="button" class="btn sm ghost" data-pk="ph" data-pid="${esc(p.id)}">Фото</button>
    <button type="button" class="btn sm ghost pk-add" data-pk="add" data-pid="${esc(p.id)}" aria-pressed="${on}" aria-label="${on?'Прибрати зі списку':'Додати в список'}">${on?ico('check'):'+'}<span>${on?' У списку':' До списку'}</span></button>
   </div>
  </div></article>`}
function draw(){
 if(!loaded)return;
 const L=list();
 grid.innerHTML=L.length?L.slice(0,shown).map(item).join(''):`<div class="empty">${onlyList?'У списку поки немає товарів. Натисніть «+» на картці, щоб додати.':'Нічого не знайдено. Спробуйте інше слово або приберіть фільтр категорії.'}</div>`;
 $i('pkMore').hidden=L.length<=shown;
 $i('pkCnt').textContent=onlyList?'':L.length?`Знайдено ${L.length} ${plural(L.length)}`:'';
 drawList()}
const plural=n=>{const a=n%10,b=n%100;return a==1&&b!=11?'товар':a>=2&&a<=4&&(b<12||b>14)?'товари':'товарів'};
function drawList(){
 S.list=S.list.filter(id=>!loaded||byId.has(id));
 $i('pkListN').textContent=S.list.length;
 $i('pkListBtn').classList.toggle('on',onlyList);$i('pkListBtn').setAttribute('aria-pressed',onlyList);
 $i('pkBulk').hidden=!onlyList||!S.list.length;
 if(onlyList&&S.list.length){const L=S.list.map(id=>byId.get(id)).filter(Boolean),sum=L.reduce((a,p)=>a+incOf(p),0);
  $i('pkBulkT').innerHTML=`<b>${L.length} ${plural(L.length)}</b>`+(TEAM?'':` · дохід з одного продажу кожного ≈ ${money(sum)}`)}}
function priceUI(){
 document.querySelectorAll('[data-pk=lv]').forEach(b=>b.classList.toggle('on',+b.dataset.v==S.m));
 $i('pkMk').value=S.mk;$i('pkMkO').textContent='+'+S.mk+'%'}

/* ---------- шаблони відповідей ---------- */
const TPL=[
 ['Перша відповідь','Вітаю! Так, [товар] є в наявності. Підкажіть, будь ласка, розміри стіни чи підлоги — порахую, скільки потрібно, щоб вистачило з невеликим запасом.'],
 ['Про товар','Матеріал легкий і вологостійкий, клеїться без клею й інструментів, миється вологою ганчіркою. Можу надіслати більше фото чи відео — щоб ви побачили фактуру ближче.'],
 ['Доставка й оплата','Відправляємо в день замовлення Новою Поштою або Укрпоштою. Оплатити можна при отриманні: спершу оглянете товар на відділенні, потім оплачуєте.'],
 ['Оформлення','Для відправки напишіть, будь ласка: прізвище та ім’я отримувача, телефон, місто й номер відділення. Оплата при отриманні чи на реквізити?'],
 ['Клієнт сумнівається','Розумію, хочеться бути впевненим. Можу порахувати точну кількість під ваші розміри й надіслати фото, як матеріал виглядає в інтер’єрі. А при оплаті на пошті ви спершу оглядаєте товар.'],
 ['Після покупки','Дякую за замовлення! Буду вдячний за фото результату — і з радістю допоможу підібрати матеріали для наступної кімнати.'],
 ['Замовлення менеджеру','Замовлення від партнера\nОтримувач: \nТелефон: \nДоставка: Нова Пошта, місто ___, відділення № ___\nТовар: назва, артикул SW-____ × кількість\nОплата: післяплата / передоплата\nСума для клієнта: ___ ₴']];
if($i('pkTpl'))$i('pkTpl').innerHTML=TPL.map(([h,b],i)=>`<div class="pk-t${i==TPL.length-1?' mgr':''}"><b>${h}</b><p>${esc(b).replace(/\n/g,'<br>')}</p><button type="button" class="btn sm ghost" data-pk="tpl" data-x="${i}">Скопіювати</button></div>`).join('');

/* ---------- події ---------- */
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-pk]');if(!b)return;const D=b.dataset,p=D.pid&&byId.get(D.pid);
 switch(D.pk){
  case'copy':return p&&copy(adText(p),'Текст оголошення скопійовано — вставте його в OLX чи інший майданчик');
  case'ph':return p&&copy(photos(p),`Скопійовано посилань на фото: ${p.imgs.length}. Відкрийте їх, щоб зберегти`);
  case'add':{const i=S.list.indexOf(D.pid);i>=0?S.list.splice(i,1):S.list.push(D.pid);save();
   if(onlyList)return draw();const c=b.closest('.pk-c'),on=i<0;c.classList.toggle('on',on);b.innerHTML=(on?ico('check'):'+')+`<span>${on?' У списку':' До списку'}</span>`;b.setAttribute('aria-pressed',on);drawList();
   if(on)toast('Додано в «Мій список»');return}
  case'lv':S.m=+D.v;save();priceUI();return draw();
  case'tpl':return copy(TPL[+D.x][1],'Шаблон скопійовано');
  case'copyall':{const L=S.list.map(id=>byId.get(id)).filter(Boolean);return copy(L.map(p=>adText(p,false)).join('\n\n———————\n\n'),'Скопійовано тексти: '+L.length)}
  case'csv':return csv(S.list.map(id=>byId.get(id)).filter(Boolean));
  case'tglist':{const L=S.list.map(id=>byId.get(id)).filter(Boolean);return tg('Вітаю! Я партнер, цікавлять товари зі списку:\n'+L.map((p,k)=>`${k+1}. ${p.name}${p.sku?' ('+p.sku+')':''}`).join('\n'))}
  case'clear':if(!confirm('Очистити «Мій список»?'))return;S.list=[];save();return draw();
 }});
let tq;$i('pkQ').addEventListener('input',()=>{clearTimeout(tq);tq=setTimeout(()=>{onlyList=false;shown=STEP;draw()},180)});
['pkCat','pkSort'].forEach(id=>$i(id).addEventListener('change',()=>{onlyList=false;shown=STEP;draw()}));
$i('pkAv').checked=!!S.av;$i('pkAv').addEventListener('change',e=>{S.av=e.target.checked?1:0;save();shown=STEP;draw()});
$i('pkMk').addEventListener('input',e=>{S.mk=+e.target.value;$i('pkMkO').textContent='+'+S.mk+'%';save();clearTimeout(tq);tq=setTimeout(draw,120)});
$i('pkMore').addEventListener('click',()=>{shown+=STEP;draw()});
$i('pkListBtn').addEventListener('click',()=>{onlyList=!onlyList;shown=999;if(!onlyList)shown=STEP;draw()});
priceUI();drawList();
const avn=()=>{const n=all.filter(p=>p.av).length;document.querySelectorAll('[data-avn]').forEach(e=>e.textContent=n)};
addEventListener('catalog',()=>{fillCats();avn();draw()});
addEventListener('catalogfail',()=>{grid.innerHTML=`<div class="empty">Каталог зараз не завантажився. <button class="btn sm" data-a="retry">Спробувати ще раз</button> або напишіть <a href="https://t.me/manager_samostroy_shop" target="_blank" rel="noopener">менеджеру в Telegram</a>.</div>`});
if(loaded){fillCats();avn();draw()}
})();
