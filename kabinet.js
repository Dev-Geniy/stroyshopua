/* Особистий кабінет партнера: вхід і реєстрація, анкета, дашборд заробітку, відправка замовлень,
   статуси й ТТН, інструкції під платформи партнера, профіль.
   Працює поверх shop.js (каталог товарів). Сервер — окремий скрипт Google (CFG.papi), див. tools/partner-api. */
(()=>{
const $i=id=>document.getElementById(id),app=$i('kbApp');
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const M=n=>Math.round(+n||0).toLocaleString('uk-UA').replace(/\s/g,' ')+' ₴';
const API=(window.CFG&&CFG.papi)||'',TGM=(window.CFG&&CFG.tg)||'manager_samostroy_shop',PHONE=(window.CFG&&CFG.phone)||'';
const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
const SS={get(k){try{return sessionStorage.getItem(k)}catch(e){return null}},set(k,v){try{sessionStorage.setItem(k,v)}catch(e){}},del(k){try{sessionStorage.removeItem(k)}catch(e){}}};
const note=m=>{if(typeof toast=='function')toast(m)};
const tgLink=t=>`https://t.me/${TGM}${t?'?text='+encodeURIComponent(t):''}`;

let token=LS.get('pk_token',''),me=LS.get('pk_me',null),orders=LS.get('pk_orders',[]),tab='home',flt='all',timer=null;

/* ---------- довідники ---------- */
const PL=[['sait','Свій сайт'],['google','Google'],['instagram','Instagram'],['tiktok','TikTok'],['facebook','Facebook'],['youtube','YouTube'],['threads','Threads'],['pinterest','Pinterest'],
 ['telegram','Telegram'],['viber','Viber'],['olx','OLX'],['besplatka','Besplatka','dosky'],['obyava','Obyava','dosky'],['prom','Prom.ua'],['rozetka','Rozetka'],['epicentr','Епіцентр'],['allo','Allo']];
const START=['olx','instagram','tiktok','telegram'];
const ST={'Нове':['Нове · менеджер перевіряє','#f08a1c'],'Підтверджене':['Підтверджене','#2563eb'],'Відправлене':['У дорозі','#7c3aed'],
 'Отримане':['Отримане · до виплати','#2f8a4c'],'Виплачено':['Виплачено','#1f6b3a'],'Скасоване':['Скасоване','#8a939b'],'Повернення':['Повернення','#c2410c']};
const WORK=['Нове','Підтверджене','Відправлене'],CANC=['Скасоване','Повернення'];
const LV=[['Starter',0,10],['Pro',20000,15],['Team',80000,20]];
const ERR={wrong:'Невірний телефон або пароль.',exists:'Цей номер уже зареєстровано — увійдіть у кабінет.',locked:'Забагато спроб. Спробуйте через 15 хвилин.',
 blocked:'Кабінет призупинено. Напишіть менеджеру.',auth:'Сесія завершилась — увійдіть ще раз.',net:'Немає зв’язку з сервером. Перевірте інтернет і спробуйте ще раз.',
 password:'Пароль — щонайменше 6 символів.',phone:'Перевірте номер телефону.',name:'Вкажіть ім’я.',items:'Додайте хоча б один товар.',client:'Вкажіть ПІБ клієнта.',
 city:'Вкажіть місто доставки.',rate:'Забагато реєстрацій. Спробуйте пізніше.',server:'Помилка сервера. Спробуйте ще раз або напишіть менеджеру.',
 state:'Замовлення вже в роботі — скасувати його може менеджер.',notfound:'Замовлення не знайдено.',bad:'Перевірте дані форми.'};
const errMsg=e=>ERR[e]||('Помилка: '+e);
const earn=o=>o.earnNow!=null?+o.earnNow:(o.earnFinal!=null?+o.earnFinal:+o.earn||0);
const pill=s=>{const x=ST[s]||[s,'#8a939b'];return `<span class="kb-st" style="--c:${x[1]}">${E(x[0])}</span>`};
const fdate=s=>{const d=new Date(s);return isNaN(d)?'':d.toLocaleDateString('uk-UA',{day:'numeric',month:'short'})+' '+d.toLocaleTimeString('uk-UA',{hour:'2-digit',minute:'2-digit'})};
const first=n=>String(n||'').trim().split(/\s+/)[0]||'партнере';
const lvl=()=>LV.find(l=>l[0]==(me&&me.level))||LV[0];
const margin=()=>me&&me.margin?+me.margin:lvl()[2];
const needAnketa=()=>!!me&&!me.anketaAt;
const locked=()=>needAnketa()&&SS.get('pk_skip')!='1';
const ico=n=>`<svg class="i" aria-hidden="true"><use href="#i-${n}"/></svg>`;

async function api(b){
 if(!API)return{ok:false,error:'noapi'};
 const ac=new AbortController(),t=setTimeout(()=>ac.abort(),30000);
 try{const r=await fetch(API,{method:'POST',body:JSON.stringify(b),signal:ac.signal,redirect:'follow'});return await r.json()}
 catch(e){return{ok:false,error:'net'}}finally{clearTimeout(t)}}
function keep(r){if(r.me){if(!favT)FAV=null;me=r.me;LS.set('pk_me',me)}if(r.orders){orders=r.orders;LS.set('pk_orders',orders)}}
function out(msg){FAV=null;LS.del('pk_favs');LS.del('pk_favs_m');token='';me=null;orders=[];LS.del('pk_token');LS.del('pk_me');LS.del('pk_orders');SS.del('pk_skip');SS.del('pk_seen');clearInterval(timer);authView('login',msg)}
async function refresh(quiet){
 if(!token)return;const r=await api({action:'p_me',token});
 if(!r.ok){if(r.error=='auth'||r.error=='blocked')return out(errMsg(r.error));if(!quiet)note(errMsg(r.error));return}
 keep(r);if(quiet&&tab=='vit'&&$i('kbVs'))return;draw()}
function busy(b,on){if(b){b.classList.toggle('busy',on);b.disabled=on}}

/* ---------- заглушка, якщо сервер ще не підключено ---------- */
function noApi(){
 $i('kbSub').textContent='Кабінет запускається. Поки що замовлення приймає менеджер у Telegram — усе працює як і раніше.';
 app.innerHTML=`<div class="kb-card kb-empty"><h2>Особистий кабінет скоро запрацює</h2>
 <p>Ми підключаємо вхід для партнерів. А поки — заповніть анкету, беріть товари й тексти в каталозі та передавайте замовлення менеджеру.</p>
 <div class="kb-acts"><a class="btn" href="anketa.html">Заповнити анкету</a><a class="btn ghost" href="partners.html">Товари для продажу</a><a class="btn ghost" href="${tgLink()}" target="_blank" rel="noopener">Написати менеджеру</a></div></div>`}

/* ---------- вхід і реєстрація ---------- */
function authView(mode,msg){
 tab='home';$i('kbUser').innerHTML='';
 $i('kbSub').textContent='Ваші замовлення, заробіток і інструкції — в одному місці.';
 const an=LS.get('anketa_done',null);
 app.innerHTML=`<div class="kb-auth">
 <div class="kb-card">
  <div class="kb-sw" role="tablist"><button type="button" role="tab" data-mode="login" aria-selected="${mode=='login'}">Вхід</button><button type="button" role="tab" data-mode="reg" aria-selected="${mode=='reg'}">Реєстрація</button></div>
  ${mode=='login'?`<form id="kbF" novalidate>
   <label class="kb-f">Телефон<input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+380" required></label>
   <label class="kb-f">Пароль<span class="kb-pw"><input name="password" type="password" autocomplete="current-password" required><button type="button" class="kb-eye" data-eye aria-label="Показати пароль">${ico('eye')}</button></span></label>
   <p class="kb-err" id="kbErr" role="alert">${E(msg||'')}</p>
   <button class="btn kb-wide" id="kbGo">Увійти</button>
   <p class="kb-small">Забули пароль? <a href="${tgLink('Добрий день! Не можу увійти в особистий кабінет партнера, допоможіть відновити пароль.')}" target="_blank" rel="noopener">Напишіть менеджеру</a> — він надішле тимчасовий. <a href="#help-forgot">Як це працює</a> · <a href="#help">Питання й відповіді</a></p>
  </form>`:`<form id="kbF" novalidate>
   <input class="hp" name="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
   <label class="kb-f">Ім’я *<input name="name" autocomplete="name" required value="${E(an&&an.name||'')}"></label>
   <label class="kb-f">Телефон * <small>буде вашим логіном</small><input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+380" required value="${E(an&&an.phone||'')}"></label>
   <label class="kb-f">Пароль * <small>щонайменше 6 символів</small><span class="kb-pw"><input name="password" type="password" autocomplete="new-password" minlength="6" required><button type="button" class="kb-eye" data-eye aria-label="Показати пароль">${ico('eye')}</button></span></label>
   <div class="kb-2"><label class="kb-f">Місто<input name="city" autocomplete="address-level2" value="${E(an&&an.city||'')}"></label>
   <label class="kb-f">Telegram або Viber<input name="msg" placeholder="@нік" value="${E(an&&an.msg||'')}"></label></div>
   <label class="kb-chk"><input type="checkbox" name="agree" required> <span>Погоджуюсь з <a href="dropshipping.html" target="_blank" rel="noopener">умовами партнерства</a></span></label>
   ${an?`<p class="kb-ok">${ico('check')} Вашу анкету буде додано до кабінету автоматично.</p>`:''}
   <p class="kb-err" id="kbErr" role="alert">${E(msg||'')}</p>
   <button class="btn kb-wide" id="kbGo">Створити кабінет</button>
  </form>`}
 </div>
 <div class="kb-why">
  <h2>Що є в кабінеті</h2>
  <ul>
   <li>${ico('chart')}<span><b>Дашборд заробітку</b>Скільки заробили, що очікується й що вже виплачено.</span></li>
   <li>${ico('cart')}<span><b>Замовлення за хвилину</b>Оберіть товар із каталогу, вкажіть клієнта — ми пакуємо й відправляємо.</span></li>
   <li>${ico('truck')}<span><b>Статуси й ТТН</b>Бачите кожне замовлення: перевірка, у дорозі, отримано.</span></li>
   <li>${ico('book')}<span><b>Інструкції під ваші платформи</b>PDF-курси за вашою анкетою: з нуля або як рости.</span></li>
  </ul>
  <p class="kb-small">Ще не знаєте умов? <a href="dropshipping.html">Як працює партнерство</a></p>
 </div></div>`;
 app.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{history.replaceState(null,'',b.dataset.mode=='reg'?'#reg':location.pathname+location.search);authView(b.dataset.mode)});
 const f=$i('kbF');f.addEventListener('submit',e=>{e.preventDefault();mode=='login'?login(f):register(f)});
 const ph=f.elements.phone;if(ph&&!ph.value)setTimeout(()=>ph.focus(),50)}
function eye(b){const i=b.parentNode.querySelector('input');i.type=i.type=='password'?'text':'password'}
function ferr(f,el,msg){$i('kbErr').textContent=msg;if(el){el.classList.add('bad');el.focus();el.addEventListener('input',()=>el.classList.remove('bad'),{once:true})}}
async function login(f){
 const ph=f.elements.phone,pw=f.elements.password;
 if(ph.value.replace(/\D/g,'').length<10)return ferr(f,ph,ERR.phone);if(!pw.value)return ferr(f,pw,'Введіть пароль.');
 const b=$i('kbGo');busy(b,1);const r=await api({action:'p_login',phone:ph.value,password:pw.value});busy(b,0);
 if(!r.ok)return ferr(f,null,errMsg(r.error));
 enter(r)}
async function register(f){
 const el=f.elements,an=LS.get('anketa_done',null);
 if(el.name.value.trim().length<2)return ferr(f,el.name,ERR.name);
 if(el.phone.value.replace(/\D/g,'').length<10)return ferr(f,el.phone,ERR.phone);
 if(el.password.value.length<6)return ferr(f,el.password,ERR.password);
 if(!el.agree.checked)return ferr(f,null,'Підтвердьте згоду з умовами партнерства.');
 const b=$i('kbGo');busy(b,1);
 const r=await api({action:'p_register',name:el.name.value,phone:el.phone.value,password:el.password.value,city:el.city.value,msg:el.msg.value,hp:el.hp.value,anketa:an||undefined});
 busy(b,0);if(!r.ok)return ferr(f,null,errMsg(r.error));
 if(an)LS.del('anketa_done');enter(r,1)}
function enter(r,isNew){token=r.token;LS.set('pk_token',token);SS.del('pk_skip');SS.set('pk_seen','1');keep(r);
 history.replaceState(null,'',location.pathname+location.search);tab='home';start();if(isNew)note('Кабінет створено. Ласкаво просимо!');gate()}

/* ---------- вимога анкети ---------- */
function gate(){if(!locked())return;const d=$i('kbGate');if(!d)return;
 try{d.showModal()}catch(e){d.setAttribute('open','')}}
function skip(){SS.set('pk_skip','1');const d=$i('kbGate');try{d.close()}catch(e){d.removeAttribute('open')}draw()}
const lockBox=()=>`<div class="kb-card kb-lock">${ico('lock')}<div><h3>Заповніть анкету, щоб надсилати замовлення</h3>
 <p>3 хвилини: які платформи у вас уже є. Після анкети ви отримаєте інструкції саме під ваші канали, а менеджер — розуміння, з чим допомогти.</p>
 <div class="kb-acts"><a class="btn" href="anketa.html?kab=1">Заповнити анкету</a><button class="btn ghost" type="button" data-skip>Пропустити зараз</button></div>
 <p class="kb-small">Якщо пропустите, нагадування з’явиться при наступному вході.</p></div></div>`;

/* ---------- каркас кабінету ---------- */
const TABS=[['home','Огляд','chart'],['order','Нове замовлення','plus'],['orders','Мої замовлення','list'],['mine','Мої товари','heart'],['learn','Інструкції','book'],['help','Допомога','info'],['profile','Профіль','user']];
function start(){
 const h=location.hash.slice(1);if(TABS.some(t=>t[0]==h)||h=='vit')tab=h;else if(/^help-/.test(h))tab='help';
 draw();clearInterval(timer);timer=setInterval(()=>{if(!document.hidden)refresh(true)},120000)}
function draw(){
 if(!me)return authView('login');
 $i('kbSub').textContent=`${me.name} · ${me.id} · рівень ${me.level||'Starter'}`;
 $i('kbUser').innerHTML=`<button type="button" class="btn ghost sm" data-out>Вийти</button>`;
 const nWork=orders.filter(o=>WORK.includes(o.status)).length;
 const nFav=favs().length;
 app.innerHTML=`<nav class="kb-tabs" aria-label="Розділи кабінету">${TABS.map(([k,l,i])=>`<a href="#${k}" data-tab="${k}"${tab==k?' aria-current="page"':''}>${ico(i)}<span>${l}</span>${k=='orders'&&nWork?`<i>${nWork}</i>`:k=='mine'&&nFav?`<i class="soft">${nFav}</i>`:''}</a>${k=='mine'?`<a href="#vit" data-tab="vit" class="kb-tv" title="Своя вітрина: статистика й налаштування"${tab=='vit'?' aria-current="page"':''}>${ico('store')}<span>Вітрина</span><b>NEW</b></a>`:''}`).join('')}</nav><div id="kbP"></div>`;
 ({home:vHome,order:vOrder,orders:vOrders,mine:vMine,learn:vLearn,help:vHelp,profile:vProfile,vit:vVit})[tab]()}
/* ---------- вітрина партнера (модуль v/): статистика — v/kstats.js, підвантажується лише тут ---------- */
const lazy=src=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=no;document.head.appendChild(s)});
async function vVit(){const P=$i('kbP');P.innerHTML=`<div id="kbVs"><div class="kb-card" style="text-align:center;color:var(--soft)">Завантажуємо статистику вітрини…</div></div>`;
 try{if(!window.VCFG)await lazy('v/config.js?v='+VV);if(!window.VSTATS)await lazy('v/kstats.js?v='+VV)}catch(e){P.innerHTML=`<div class="kb-card">Не вдалося завантажити статистику. Оновіть сторінку.</div>`;return}
 const el=$i('kbVs');if(!el)return;
 if(!VCFG.api||VCFG.on===false){el.innerHTML=`<div class="kb-card">Вітрини тимчасово недоступні.</div>`;return}
 VSTATS.mount(el,{api:VCFG.api,token,edit:'v/edit.html',orders:'#orders',acc:getComputedStyle(document.documentElement).getPropertyValue('--orange').trim()||'#e8590c',
  empty:`${vitPromo()}`})}
const VV='9f2175ec';
/* ---------- допомога (база знань kb.js) — доступна й без входу ---------- */
function vHelp(open){const P=$i('kbP')||app;P.innerHTML=`<div class="kb-card"><h3 style="margin-bottom:4px">Питання й відповіді</h3><p class="kb-small" style="margin:0 0 14px">Вхід і пароль, замовлення, ТТН, заробіток і виплати, Telegram-бот.</p><div id="kbHelp"></div></div>`;
 if(window.KB)KB.mount($i('kbHelp'),{aud:'p',open:open||helpId(),toast:note});else $i('kbHelp').textContent='Завантаження…'}
const helpId=()=>{const m=location.hash.match(/^#help-([\w-]+)/);return m?m[1]:''};
function helpPublic(){tab='help';$i('kbUser').innerHTML='';$i('kbSub').textContent='Відповіді на часті питання партнерів.';
 app.innerHTML=`<p style="margin:0 0 12px"><a href="kabinet.html" class="btn ghost sm" data-tologin>← До входу в кабінет</a></p><div id="kbP"></div>`;vHelp();
 $i('kbApp')&&app.querySelector('[data-tologin]').addEventListener('click',e=>{e.preventDefault();history.replaceState(null,'',location.pathname);authView('login')})}
function go(t){tab=t;history.replaceState(null,'','#'+t);draw();$i('kbApp').scrollIntoView({behavior:'smooth',block:'start'})}

/* ---------- інструменти й навчання (дашборд та інструкції) ---------- */
const grow=()=>`<section class="kb-grow" aria-labelledby="kbGrowH"><div class="kb-ch"><h3 id="kbGrowH">Інструменти й навчання</h3></div><div class="kb-gc">
 <article class="kb-g"><span class="kb-gi">${ico('grid')}</span><h4>Товари для продажу</h4><p>Ціни й наявність зі складу, фото й готові тексти оголошень з вашою ціною. Оберіть товар, скопіюйте — і публікуйте.</p>
  <a class="btn" href="partners.html">Обрати товари</a></article>
 <article class="kb-g"><span class="kb-gi">${ico('book')}</span><h4>Академія партнера</h4><p>Короткий шлях від першого оголошення до стабільних замовлень: що робити, у якому порядку й де продавати.</p>
  <a class="btn ghost" href="academy.html">До академії</a></article>
 <article class="kb-g"><span class="kb-gi">${ico('play')}</span><h4>Курси</h4>
  <a class="kb-gl" href="course-dropshipping.html"><b>Дропшипінг з нуля</b><small>Від першого оголошення до перших замовлень</small>${ico('arrow')}</a>
  <a class="kb-gl" href="course-sales3.html"><b>Продажі 3.0</b><small>Скрипти відповідей і робота з запереченнями</small>${ico('arrow')}</a>
  <a class="kb-gl" href="course-vitryna.html"><b>Своя вітрина</b><small>Назва, логотип з ШІ й продаючі тексти</small>${ico('arrow')}</a>
  <a class="kb-gl" href="lk.html"><b>Де й як продавати</b><small>Порівняння майданчиків і план на тиждень</small>${ico('arrow')}</a></article>
</div></section>`;

/* ---------- вітрина партнера (модуль v/): промо на огляді ---------- */
const vitPromo=()=>`<section class="kb-vit" aria-labelledby="kbVitH"><div><em>Головна фішка партнерства</em><h3 id="kbVitH">🏪 Своя вітрина — ваш магазин за 10 хвилин</h3>
 <p>Ваша назва, логотип і ціни за одним посиланням. Покупці замовляють самі, замовлення падають у кабінет, а ми пакуємо й відправляємо.</p>
 <div class="kb-va"><a class="btn" href="v/edit.html">Відкрити редактор вітрини</a><a class="btn ghost" href="course-vitryna.html">Курс: як зробити, щоб продавала</a></div></div>
 <ul><li>${ico('check')}<span>9 готових вітрин в один клік — з товарами й текстами</span></li><li>${ico('check')}<span>Безкоштовно, без сайту й програміста</span></li><li>${ico('check')}<span>Логотип і тексти — з ШІ за готовими промптами</span></li><li>${ico('check')}<span>Замовлення 24/7, оплата при отриманні</span></li><li>${ico('check')}<span>QR-код, віджет на сайт і готові пости</span></li></ul></section>`;
/* ---------- огляд ---------- */
function stats(){
 const live=orders.filter(o=>!CANC.includes(o.status)),now=new Date(),ms=new Date(now.getFullYear(),now.getMonth(),1);
 const sum=(L,f)=>L.reduce((a,o)=>a+f(o),0),inM=o=>new Date(o.created)>=ms;
 const mL=live.filter(inM);
 return {live,work:live.filter(o=>WORK.includes(o.status)),due:live.filter(o=>o.status=='Отримане'),paid:live.filter(o=>o.status=='Виплачено'),
  mL,mTurn:sum(mL,o=>+o.sale||0),mEarn:sum(mL.filter(o=>o.status=='Отримане'||o.status=='Виплачено'),earn),sum}}
function months(){
 const now=new Date(),R=[];
 for(let k=5;k>=0;k--){const a=new Date(now.getFullYear(),now.getMonth()-k,1),b=new Date(now.getFullYear(),now.getMonth()-k+1,1);
  const L=orders.filter(o=>!CANC.includes(o.status)&&new Date(o.created)>=a&&new Date(o.created)<b);
  R.push({l:a.toLocaleDateString('uk-UA',{month:'short'}).replace('.',''),ok:L.filter(o=>o.status=='Отримане'||o.status=='Виплачено').reduce((s,o)=>s+earn(o),0),w:L.filter(o=>WORK.includes(o.status)).reduce((s,o)=>s+earn(o),0),n:L.length})}
 return R}
function vHome(){
 const s=stats(),mn=new Date().toLocaleDateString('uk-UA',{month:'long'}),L=lvl(),nx=LV[LV.indexOf(L)+1];
 const R=months(),mx=Math.max(1,...R.map(r=>r.ok+r.w));
 const pct=nx?Math.min(100,Math.round(s.mTurn/nx[1]*100)):100;
 $i('kbP').innerHTML=`
 <div class="kb-hello"><div><h2>Вітаємо, ${E(first(me.name))}!</h2><p>${s.live.length?`У вас ${s.work.length} ${pl(s.work.length,'замовлення','замовлення','замовлень')} у роботі.`:'Почніть з першого замовлення — ми все відправимо самі.'}</p></div>
  <a class="btn" href="#order" data-tab="order">${ico('plus')}Нове замовлення</a></div>
 ${needAnketa()?`<div class="kb-banner">${ico('info')}<span><b>Анкета ще не заповнена.</b> Заповніть — і отримаєте інструкції під ваші платформи${locked()?'':' (відправка замовлень зараз дозволена, бо ви пропустили цей крок)'}.</span><a class="btn sm" href="anketa.html?kab=1">Заповнити</a></div>`:''}
 <div class="kb-kpi">
  <div class="kb-k hot"><span>Заробіток за ${E(mn)}</span><b>${M(s.mEarn)}</b><small>з отриманих клієнтами замовлень</small></div>
  <div class="kb-k"><span>Очікується</span><b>${M(s.sum(s.work,earn))}</b><small>${s.work.length} у роботі</small></div>
  <div class="kb-k"><span>До виплати</span><b>${M(s.sum(s.due,earn))}</b><small>${s.due.length?'отримано клієнтами':'поки немає'}</small></div>
  <div class="kb-k"><span>Виплачено всього</span><b>${M(s.sum(s.paid,earn))}</b><small>${s.paid.length} ${pl(s.paid.length,'замовлення','замовлення','замовлень')}</small></div>
 </div>
 <div class="kb-cols">
  <div class="kb-card"><div class="kb-ch"><h3>Заробіток за 6 місяців</h3><span class="kb-leg"><i></i>підтверджено <i class="w"></i>в роботі</span></div>
   <div class="kb-bars">${R.map(r=>`<div class="kb-bar" title="${E(r.l)}: ${M(r.ok)} підтверджено, ${M(r.w)} в роботі, ${r.n} замовл."><div class="kb-col"><b style="height:${(r.w/mx*100).toFixed(1)}%" class="w"></b><b style="height:${(r.ok/mx*100).toFixed(1)}%"></b></div><span>${E(r.l)}</span><small>${r.ok+r.w?M(r.ok+r.w):'—'}</small></div>`).join('')}</div></div>
  <div class="kb-card"><h3>Ваше партнерство</h3>
   <dl class="kb-dl"><dt>Рівень</dt><dd><span class="kb-lv">${E(L[0])}</span> маржа ≈ ${margin()}% від рекомендованої ціни</dd>
   <dt>Оборот за ${E(mn)}</dt><dd>${M(s.mTurn)} · ${s.mL.length} ${pl(s.mL.length,'замовлення','замовлення','замовлень')}</dd>
   <dt>Виплати</dt><dd>За запитом або раз на тиждень чи місяць — за домовленістю з менеджером</dd></dl>
   ${nx?`<div class="kb-prog"><div><span>До рівня <b>${nx[0]}</b> (маржа від ${nx[2]}%)</span><span>${M(s.mTurn)} з ${M(nx[1])}</span></div><i><b style="width:${pct}%"></b></i></div>`:'<p class="kb-small">У вас найвищий рівень — дякуємо!</p>'}
   <p class="kb-small">Рівень змінює менеджер, коли оборот тримається стабільно. Питання — <a href="${tgLink()}" target="_blank" rel="noopener">@${E(TGM)}</a></p></div>
 </div>
 <div class="kb-card"><div class="kb-ch"><h3>Останні замовлення</h3>${orders.length?'<a href="#orders" data-tab="orders" class="kb-link">Усі замовлення</a>':''}</div>
  ${orders.length?`<div class="kb-list">${orders.slice(0,5).map(row).join('')}</div>`:`<div class="kb-none"><p>Тут з’являться ваші замовлення зі статусами й ТТН.</p><a class="btn ghost sm" href="partners.html">Обрати товари для продажу</a></div>`}</div>
 ${vitPromo()}
 ${grow()}`}
function pl(n,a,b,c){const m=n%10,h=n%100;return m==1&&h!=11?a:m>=2&&m<=4&&(h<10||h>=20)?b:c}

/* ---------- список замовлень ---------- */
function trackUrl(o){const n=String(o.ttn||'').replace(/\s/g,'');return /укр/i.test(o.delivery||'')?'https://track.ukrposhta.ua/tracking_UA.html?barcode='+encodeURIComponent(n):'https://novaposhta.ua/tracking/?cargo_number='+encodeURIComponent(n)}
function row(o){
 const its=(o.items||[]).map(x=>`${x.name}${x.q>1?' × '+x.q:''}`).join('; ');
 return `<article class="kb-o"><div class="kb-o1"><b>№ ${E(o.id)}</b><span>${fdate(o.created)}</span>${pill(o.status)}</div>
 <div class="kb-o2"><div><b>${E(o.client)}</b><span>${E([o.city,o.branch].filter(Boolean).join(', '))}</span><p>${E(its)}</p></div>
 <div class="kb-o3"><span>${M(o.sale)}</span><b class="${CANC.includes(o.status)?'off':''}">+${M(earn(o))}</b><small>${o.earnFinal!=null?'підтверджено':'орієнтовно'}</small></div></div>
 ${o.ttn||o.comment||o.status=='Нове'?`<div class="kb-o4">${o.ttn?`<span>ТТН <b>${E(o.ttn)}</b> <a href="${trackUrl(o)}" target="_blank" rel="noopener">Відстежити</a></span>`:''}${o.comment?`<span class="kb-com">Менеджер: ${E(o.comment)}</span>`:''}${o.status=='Нове'?`<button type="button" class="kb-link" data-cancel="${E(o.id)}">Скасувати</button>`:''}</div>`:''}</article>`}
function vOrders(){
 const G=[['all','Усі',()=>1],['work','У роботі',o=>WORK.includes(o.status)],['due','До виплати',o=>o.status=='Отримане'],['paid','Виплачено',o=>o.status=='Виплачено'],['canc','Скасовані',o=>CANC.includes(o.status)]];
 const f=(G.find(g=>g[0]==flt)||G[0])[2],L=orders.filter(f);
 $i('kbP').innerHTML=`<div class="kb-card"><div class="kb-ch"><h3>Мої замовлення</h3><button type="button" class="btn ghost sm" data-refresh>${ico('refresh')}Оновити</button></div>
 <div class="kb-chips">${G.map(([k,l,fn])=>`<button type="button" data-flt="${k}" aria-pressed="${flt==k}">${l}<i>${orders.filter(fn).length}</i></button>`).join('')}</div>
 ${L.length?`<div class="kb-list">${L.map(row).join('')}</div>`:`<div class="kb-none"><p>${orders.length?'У цьому розділі поки порожньо.':'Ще немає замовлень.'}</p>${orders.length?'':'<a class="btn sm" href="#order" data-tab="order">Надіслати перше замовлення</a>'}</div>`}
 <p class="kb-small" style="margin-top:12px">Статуси й ТТН оновлює менеджер. Заробіток стає «до виплати», коли клієнт забрав посилку.</p></div>`}
async function cancel(id,b){
 if(!confirm('Скасувати замовлення № '+id+'?'))return;
 busy(b,1);const r=await api({action:'p_cancel',token,id});busy(b,0);
 if(!r.ok)return note(errMsg(r.error));const i=orders.findIndex(o=>o.id==id);if(i>=0)orders[i]=r.order;LS.set('pk_orders',orders);draw();note('Замовлення скасовано')}

/* ---------- нове замовлення ---------- */
let D=Object.assign({items:[],client:'',phone:'',city:'',branch:'',delivery:'Нова Пошта',pay:'Накладений платіж',source:'',note:''},LS.get('pk_draft',{}));
let sent=null,okey='';
const saveD=()=>LS.set('pk_draft',D);
const prod=id=>(typeof byId!='undefined'&&byId.get)?byId.get(id):null;
const wholeU=x=>x.price*(1-margin()/100);
function sources(){const a=me&&me.anketa&&me.anketa.answers||{},yes=PL.filter(p=>a[p[0]]&&a[p[0]].has);return [...yes,...PL.filter(p=>!yes.includes(p))]}
function vOrder(){
 if(sent){const id=sent;$i('kbP').innerHTML=`<div class="kb-card kb-done">${ico('check')}<h2>Замовлення № ${E(id)} надіслано</h2>
  <ol class="kb-next"><li><b>Менеджер перевіряє</b> наявність і підтверджує — зазвичай протягом години в робочий час.</li><li><b>Ми пакуємо й відправляємо</b> в день замовлення. ТТН з’явиться в «Мої замовлення» — перешліть її клієнту.</li><li><b>Клієнт забирає посилку</b> — заробіток переходить у «До виплати».</li></ol>
  <div class="kb-acts"><a class="btn" href="#orders" data-tab="orders">Мої замовлення</a><button type="button" class="btn ghost" data-again>Ще одне замовлення</button></div></div>`;return}
 if(locked()){$i('kbP').innerHTML=lockBox();return}
 const src=sources();
 $i('kbP').innerHTML=`<form class="kb-ord" id="kbO" novalidate>
 <div class="kb-ordm">
  <div class="kb-card"><h3><i class="kb-n">1</i>Товари</h3>
   <div class="kb-srch">${ico('search')}<input id="kbQ" type="search" autocomplete="off" placeholder="${typeof all!='undefined'&&all.length?'Назва або артикул: 3D панель, PET плитка…':'Каталог завантажується…'}" aria-label="Пошук товару"><div class="kb-res" id="kbRes" hidden></div></div>
   <p class="kb-small" style="margin:-4px 0 12px">Фото й готові тексти для оголошень — у розділі <a href="partners.html">«Товари для продажу»</a>.</p>
   <div id="kbIt"></div>
   <button type="button" class="kb-link" data-manual>Немає в списку? Додати товар вручну</button></div>
  <div class="kb-card"><h3><i class="kb-n">2</i>Клієнт і доставка</h3>
   <div class="kb-2"><label class="kb-f">ПІБ клієнта *<input name="client" autocomplete="off" value="${E(D.client)}"></label>
   <label class="kb-f">Телефон клієнта *<input name="phone" type="tel" inputmode="tel" autocomplete="off" placeholder="+380" value="${E(D.phone)}"></label></div>
   <div class="kb-q"><b>Служба доставки</b>${seg('delivery',['Нова Пошта','Укрпошта'],D.delivery)}</div>
   <div class="kb-2"><label class="kb-f">Місто *<input name="city" autocomplete="off" value="${E(D.city)}"></label>
   <label class="kb-f">Відділення або поштомат *<input name="branch" autocomplete="off" placeholder="№ 12 або адреса" value="${E(D.branch)}"></label></div>
   <div class="kb-q"><b>Оплата</b>${seg('pay',['Накладений платіж','Передоплата'],D.pay)}</div>
   <div class="kb-2"><label class="kb-f">Звідки клієнт<select name="source"><option value="">Не вказано</option>${src.map(p=>`<option${D.source==p[1]?' selected':''}>${E(p[1])}</option>`).join('')}<option${D.source=='Інше'?' selected':''}>Інше</option></select></label>
   <label class="kb-f">Коментар для менеджера<input name="note" autocomplete="off" placeholder="Колір, терміновість…" value="${E(D.note)}"></label></div></div>
 </div>
 <aside class="kb-card kb-sum" id="kbSum"></aside>
 </form>`;
 drawItems();sumBox();
 const f=$i('kbO'),q=$i('kbQ');
 f.addEventListener('input',e=>{const n=e.target.name;if(n&&n in D){D[n]=e.target.value;saveD()}e.target.classList&&e.target.classList.remove('bad')});
 f.addEventListener('change',e=>{const n=e.target.name;if(n&&n in D){D[n]=e.target.value;saveD()}});
 f.addEventListener('submit',e=>{e.preventDefault();send()});
 q.addEventListener('input',()=>search(q.value));q.addEventListener('focus',()=>q.value&&search(q.value));
 q.addEventListener('keydown',e=>{if(e.key=='Escape'){$i('kbRes').hidden=true}if(e.key=='Enter'){e.preventDefault();const a=$i('kbRes').querySelector('[data-kadd]:not([disabled])');a&&a.click()}})}
const seg=(n,opts,v)=>`<div class="kb-seg">${opts.map(o=>`<label><input type="radio" name="${n}" value="${E(o)}"${v==o?' checked':''}><span>${E(o)}</span></label>`).join('')}</div>`;
function search(t){
 const box=$i('kbRes');t=t.trim().toLowerCase();
 if(!t||typeof all=='undefined'||!all.length){box.hidden=true;return}
 const w=t.split(/\s+/),L=all.filter(p=>{const h=(p.name+' '+(p.sku||'')).toLowerCase();return w.every(x=>h.includes(x))}).sort((a,b)=>(b.av?1:0)-(a.av?1:0)).slice(0,8);
 box.hidden=false;
 box.innerHTML=L.length?L.map(p=>`<button type="button" data-kadd="${E(p.id)}"${p.av?'':' disabled'}>${p.imgs&&p.imgs[0]?`<img src="${E(p.imgs[0])}" alt="" loading="lazy" width="44" height="44">`:'<span class="kb-ph"></span>'}<span><b>${E(p.name)}</b><small>${E(p.sku||'')}${p.av?'':' · немає в наявності'}</small></span><em>${M(p.price)}</em></button>`).join(''):'<p class="kb-small" style="padding:12px">Нічого не знайдено. Спробуйте інше слово або артикул.</p>'}
function add(id){const p=prod(id);if(!p)return;const x=D.items.find(i=>i.id==id);
 if(x)x.q++;else D.items.push({id:p.id,name:p.name,sku:p.sku||'',price:+p.price,sale:Math.ceil(+p.price),q:1,img:p.imgs&&p.imgs[0]||''});
 saveD();$i('kbQ').value='';$i('kbRes').hidden=true;drawItems();sumBox()}
function manual(){const n=prompt('Назва товару (як у каталозі або прайсі):');if(!n||!n.trim())return;
 const pr=+String(prompt('Рекомендована ціна за одиницю, грн:')||'').replace(',','.').replace(/[^\d.]/g,'');if(!pr)return note('Вкажіть ціну числом');
 D.items.push({id:'',name:n.trim(),sku:'',price:pr,sale:Math.ceil(pr),q:1,img:''});saveD();drawItems();sumBox()}
function drawItems(){
 const box=$i('kbIt');if(!box)return;
 box.innerHTML=D.items.length?`<div class="kb-its">${D.items.map((x,k)=>`<div class="kb-it">
  ${x.img?`<img src="${E(x.img)}" alt="" loading="lazy" width="52" height="52">`:'<span class="kb-ph"></span>'}
  <div class="kb-itn"><b>${E(x.name)}</b><small>${x.sku?E(x.sku)+' · ':''}рекомендована ${M(x.price)} · оптова ≈ ${M(wholeU(x))}</small></div>
  <label class="kb-mini">К-сть<span class="kb-qty"><button type="button" data-qm="${k}" aria-label="Менше">−</button><input inputmode="numeric" data-q="${k}" value="${x.q}" aria-label="Кількість"><button type="button" data-qp="${k}" aria-label="Більше">+</button></span></label>
  <label class="kb-mini">Ціна для клієнта, ₴<input inputmode="decimal" data-sale="${k}" value="${x.sale}" class="${x.sale<wholeU(x)?'bad':''}"></label>
  <div class="kb-itt"><b>${M(x.sale*x.q)}</b><small>+${M((x.sale-wholeU(x))*x.q)}</small></div>
  <button type="button" class="kb-x" data-rm="${k}" aria-label="Прибрати">${ico('x')}</button></div>`).join('')}</div>`
  :`<div class="kb-none sm"><p>Знайдіть товар у пошуку вище — він з’явиться тут.</p></div>`;
 box.querySelectorAll('[data-q]').forEach(i=>i.addEventListener('input',()=>{const x=D.items[+i.dataset.q];x.q=Math.max(1,parseInt(i.value)||1);saveD();sumBox();upd(+i.dataset.q)}));
 box.querySelectorAll('[data-sale]').forEach(i=>i.addEventListener('input',()=>{const x=D.items[+i.dataset.sale];x.sale=Math.max(0,+i.value.replace(',','.')||0);i.classList.toggle('bad',x.sale<wholeU(x));saveD();sumBox();upd(+i.dataset.sale)}))}
function upd(k){const x=D.items[k],r=$i('kbIt').querySelectorAll('.kb-itt')[k];if(r)r.innerHTML=`<b>${M(x.sale*x.q)}</b><small>+${M((x.sale-wholeU(x))*x.q)}</small>`}
function sumBox(){
 const b=$i('kbSum');if(!b)return;
 const sale=D.items.reduce((a,x)=>a+x.sale*x.q,0),whole=D.items.reduce((a,x)=>a+wholeU(x)*x.q,0),n=D.items.reduce((a,x)=>a+x.q,0);
 b.innerHTML=`<h3>Підсумок</h3><dl class="kb-dl tight"><dt>Товарів</dt><dd>${n}</dd><dt>Сума для клієнта</dt><dd><b>${M(sale)}</b></dd><dt>Оптова ціна ≈</dt><dd>${M(whole)}</dd></dl>
 <div class="kb-earn"><span>Ваш заробіток</span><b>${M(sale-whole)}</b><small>орієнтовно · рівень ${E(me.level||'Starter')}, −${margin()}%</small></div>
 <p class="kb-err" id="kbOE" role="alert"></p>
 <button class="btn kb-wide" id="kbSend" ${D.items.length?'':'disabled'}>Надіслати замовлення</button>
 <p class="kb-small">Менеджер перевірить наявність і підтвердить точну суму. Доставку оплачує клієнт за тарифами пошти.</p>`}
async function send(){
 const f=$i('kbO'),el=f.elements,er=m=>{$i('kbOE').textContent=m};
 if(!D.items.length)return er(ERR.items);
 const low=D.items.find(x=>x.sale<wholeU(x));if(low)return er(`«${low.name.slice(0,40)}»: ціна для клієнта нижча за оптову.`);
 for(const [n,m] of [['client',ERR.client],['phone',ERR.phone],['city',ERR.city],['branch','Вкажіть відділення або поштомат.']]){
  const v=el[n].value.trim();if(!v||(n=='phone'&&v.replace(/\D/g,'').length<10)||(n=='client'&&v.length<2)){el[n].classList.add('bad');el[n].focus();return er(m)}}
 const b=$i('kbSend');busy(b,1);okey=okey||Date.now().toString(36)+Math.random().toString(36).slice(2,8);
 const r=await api({action:'p_order',token,key:okey,order:{items:D.items.map(x=>({id:x.id,name:x.name,sku:x.sku,q:x.q,price:x.price,sale:x.sale})),
  client:el.client.value,phone:el.phone.value,city:el.city.value,branch:el.branch.value,delivery:D.delivery,pay:D.pay,source:el.source.value,note:el.note.value}});
 busy(b,0);
 if(!r.ok){if(r.error=='auth')return out(ERR.auth);
  er(errMsg(r.error)+' ');const a=document.createElement('a');a.href=tgLink(orderText());a.target='_blank';a.rel='noopener';a.textContent='Надіслати менеджеру в Telegram';$i('kbOE').append(a);return}
 okey='';sent=r.id;if(r.order&&!r.dup)orders.unshift(r.order);LS.set('pk_orders',orders);
 D={items:[],client:'',phone:'',city:'',branch:'',delivery:D.delivery,pay:'Накладений платіж',source:'',note:''};saveD();draw();refresh(true)}
function orderText(){return `Замовлення від партнера ${me.name} (${me.id})\n${D.items.map((x,i)=>`${i+1}. ${x.name}${x.sku?' ('+x.sku+')':''} × ${x.q} — ${x.sale} грн/шт`).join('\n')}\nКлієнт: ${D.client}, ${D.phone}\nДоставка: ${D.delivery}, ${D.city}, ${D.branch}\nОплата: ${D.pay}${D.note?'\nКоментар: '+D.note:''}`}

/* ---------- інструкції ---------- */
function vLearn(){
 const a=me.anketa&&me.anketa.answers||null,seen=new Set();
 const uniq=L=>L.filter(p=>{const k=p[2]||p[0];if(seen.has(k))return false;seen.add(k);return true});
 const card=(p,sub,hot)=>`<a class="kb-pdf${hot?' hot':''}" href="partner/${p[2]||p[0]}.pdf" target="_blank" rel="noopener"><i>PDF</i><span><b>${E(p[1])}</b><small>${E(sub)}</small></span></a>`;
 const yes=a?uniq(PL.filter(p=>a[p[0]]&&a[p[0]].has)):[],no=a?uniq([...START.map(id=>PL.find(p=>p[0]==id)),...PL].filter(p=>!(a[p[0]]&&a[p[0]].has))):uniq([...START.map(id=>PL.find(p=>p[0]==id)),...PL]);
 $i('kbP').innerHTML=`<div class="kb-card"><div class="kb-ch"><h3>Почніть звідси</h3></div><div class="kb-pdfs">
  <a class="kb-pdf hot" href="partner/shpargalka.pdf" target="_blank" rel="noopener"><i>PDF</i><span><b>Шпаргалка: схема роботи</b><small>4 кроки й розрахунок заробітку</small></span></a>
  <a class="kb-pdf hot" href="partner/start.pdf" target="_blank" rel="noopener"><i>PDF</i><span><b>Старт партнера</b><small>Перший тиждень і вибір каналів</small></span></a></div></div>
 ${a?'':`<div class="kb-banner">${ico('info')}<span><b>Заповніть анкету</b> — і тут залишаться лише інструкції під ваші платформи: що вже є та з чого почати.</span><a class="btn sm" href="anketa.html?kab=1">Заповнити</a></div>`}
 ${yes.length?`<div class="kb-card"><div class="kb-ch"><h3>Ваші платформи — як рости</h3><a class="kb-link" href="anketa.html?kab=1">Оновити анкету</a></div><div class="kb-pdfs">${yes.map(p=>{const x=a[p[0]];return card(p,[x.aud?'аудиторія '+x.aud:'',x.exp=='Є'?'є досвід продажів':'без досвіду продажів'].filter(Boolean).join(' · '),1)}).join('')}</div></div>`:''}
 <div class="kb-card"><div class="kb-ch"><h3>${a?(yes.length?'Нові канали з нуля':'Канали з нуля'):'Інструкції по всіх платформах'}</h3>${a&&!yes.length?'<a class="kb-link" href="anketa.html?kab=1">Оновити анкету</a>':''}</div>
  <p class="kb-small" style="margin:-4px 0 12px">Для старту досить двох: дошки оголошень і однієї соцмережі. Перші в списку — найпростіші для новачка.</p>
  <div class="kb-pdfs">${no.map((p,k)=>card(p,k<2&&!yes.length?'рекомендуємо для старту':'покроково з нуля',k<2&&!yes.length)).join('')}</div></div>
 ${grow()}`}

/* ---------- профіль ---------- */
function vProfile(){
 const since=me.created?new Date(me.created).toLocaleDateString('uk-UA',{day:'numeric',month:'long',year:'numeric'}):'';
 $i('kbP').innerHTML=`<div class="kb-cols">
 <form class="kb-card" id="kbPr" novalidate><h3>Профіль</h3>
  <label class="kb-f">Ім’я<input name="name" value="${E(me.name)}" autocomplete="name"></label>
  <div class="kb-2"><label class="kb-f">Місто<input name="city" value="${E(me.city)}" autocomplete="address-level2"></label>
  <label class="kb-f">Telegram або Viber<input name="msg" value="${E(me.msg)}"></label></div>
  <label class="kb-f">Реквізити для виплат <small>IBAN або картка й ПІБ отримувача</small><textarea name="payout" rows="2">${E(me.payout)}</textarea></label>
  <p class="kb-err" id="kbPE" role="alert"></p><button class="btn" id="kbPS">Зберегти</button></form>
 <div class="kb-side">
  <div class="kb-card"><h3>Акаунт</h3><dl class="kb-dl"><dt>ID партнера</dt><dd>${E(me.id)}</dd><dt>Логін</dt><dd>+${E(me.phone)}</dd><dt>Рівень</dt><dd>${E(me.level||'Starter')} · маржа ≈ ${margin()}%</dd>${since?`<dt>Партнер з</dt><dd>${E(since)}</dd>`:''}<dt>Анкета</dt><dd>${me.anketaAt?'заповнена · <a href="anketa.html?kab=1">оновити</a>':'<a href="anketa.html?kab=1">заповнити</a>'}</dd></dl>
   <button type="button" class="btn ghost sm" data-out style="margin-top:12px">Вийти з кабінету</button></div>
  <div class="kb-card"><h3>Telegram-бот Samostroy Drop</h3>${me.tg?`<p class="kb-small">✓ Підключено${me.tgName?' ('+E(me.tgName)+')':''}. Статуси замовлень, ТТН і виплати приходять у бот, а замовлення можна оформлювати прямо в Telegram.</p>${me.bot?`<a class="btn ghost sm" href="https://t.me/${E(me.bot)}" target="_blank" rel="noopener" style="margin-top:10px">Відкрити бота</a>`:''}`
   :`<p class="kb-small">Отримуйте статуси замовлень, ТТН і виплати в Telegram і оформлюйте замовлення з телефона за хвилину.</p><button type="button" class="btn sm" data-tglink style="margin-top:10px">Підключити Telegram</button>`}</div>
  <form class="kb-card" id="kbPw" novalidate><h3>Змінити пароль</h3>
   <label class="kb-f">Поточний пароль<input name="old" type="password" autocomplete="current-password"></label>
   <label class="kb-f">Новий пароль <small>щонайменше 6 символів</small><input name="nw" type="password" autocomplete="new-password"></label>
   <p class="kb-err" id="kbWE" role="alert"></p><button class="btn ghost" id="kbWS">Змінити пароль</button></form>
 </div></div>`;
 $i('kbPr').addEventListener('submit',async e=>{e.preventDefault();const el=e.target.elements;if(el.name.value.trim().length<2){$i('kbPE').textContent=ERR.name;return}
  const b=$i('kbPS');busy(b,1);const r=await api({action:'p_profile',token,name:el.name.value,city:el.city.value,msg:el.msg.value,payout:el.payout.value});busy(b,0);
  if(!r.ok){$i('kbPE').textContent=errMsg(r.error);return}keep(r);note('Збережено');draw()});
 $i('kbPw').addEventListener('submit',async e=>{e.preventDefault();const el=e.target.elements;if(el.nw.value.length<6){$i('kbWE').textContent=ERR.password;return}
  const b=$i('kbWS');busy(b,1);const r=await api({action:'p_profile',token,oldPassword:el.old.value,newPassword:el.nw.value});busy(b,0);
  if(!r.ok){$i('kbWE').textContent=r.error=='wrong'?'Поточний пароль невірний.':errMsg(r.error);return}e.target.reset();$i('kbWE').textContent='';note('Пароль змінено')})}

/* ---------- мої товари: обране для продажу ---------- */
// зберігається в акаунті партнера (бачить і сайт, і Telegram Mini App) + копія в браузері й у списку «Товари для продажу»
const FK='pk_favs';
let FAV=null,favT=null,MF={q:'',c:''},PK={q:'',c:'',av:1,n:48},pickIO=null;
function favs(){
 if(FAV)return FAV;
 const has=!!me&&Array.isArray(me.favs),srv=has?me.favs.map(String):[],loc=LS.get(FK,[]),pl=(LS.get('partner_v2',{}).list)||[];
 // один раз переносимо обране з цього браузера (і зі списку «Товари для продажу») в акаунт; далі джерело — акаунт
 if(has&&LS.get('pk_favs_m','')==me.id)FAV=srv;
 else{FAV=[...new Set([...srv,...loc,...pl].map(String))];if(has){LS.set('pk_favs_m',me.id);if(FAV.length!=srv.length)favSave(true)}}
 return FAV}
const isFav=id=>favs().includes(String(id));
function favSave(soon){
 LS.set(FK,FAV);const pv=LS.get('partner_v2',{});pv.list=FAV.slice();LS.set('partner_v2',pv);
 clearTimeout(favT);favT=setTimeout(async()=>{if(!token){favT=null;return}const r=await api({action:'p_favs',token,favs:FAV});favT=null;if(r.ok&&me){me.favs=r.favs;LS.set('pk_me',me)}},soon?1500:700)}
function favToggle(id){id=String(id);const L=favs(),i=L.indexOf(id);if(i>=0)L.splice(i,1);else L.unshift(id);favSave();return i<0}
const shortT=p=>{let t=p.name.replace(/\s+/g,' ').trim();return t.length>70?t.slice(0,69).replace(/\s+\S*$/,'')+'…':t};
const adT=p=>`${shortT(p)}\n\nЦіна: ${M(Math.ceil(p.price))}\n${p.av?'✓ В наявності':'⏳ Під замовлення'}\n\n🚚 Відправка в день замовлення Новою Поштою або Укрпоштою\n💳 Оплата при отриманні з оглядом на відділенні\n📏 Напишіть розміри — допоможу порахувати потрібну кількість`;
function kcopy(t,msg){const ok=()=>note(msg||'Скопійовано');const fb=()=>{const a=document.createElement('textarea');a.value=t;a.style.cssText='position:fixed;opacity:0';document.body.append(a);a.select();try{document.execCommand('copy');ok()}catch(x){note('Не вдалося скопіювати')}a.remove()};try{navigator.clipboard.writeText(t).then(ok,fb)}catch(x){fb()}}
const catN=c=>typeof cname=='function'?cname(c):c;
const ready=()=>typeof all!='undefined'&&all.length>0;
function vMine(){
 const P=$i('kbP');
 if(!ready()){P.innerHTML=`<div class="kb-card kb-none"><p>Завантажуємо каталог…</p></div>`;return}
 const L=favs().map(id=>prod(id)).filter(Boolean),gone=favs().length-L.length;
 if(!L.length){P.innerHTML=`<div class="kb-card kb-mine0">${ico('heart')}<h2>Тут будуть товари, які ви продаєте</h2>
  <p>Каталог великий — оберіть ті позиції, з якими працюєте, і вони завжди будуть під рукою: ціни й наявність зі складу, ваш заробіток, тексти оголошень і швидке замовлення.</p>
  <button type="button" class="btn" data-pick>${ico('plus')}Обрати зараз</button> <a class="btn ghost" href="v/edit.html">🏪 Створити вітрину</a>${gone?`<p class="kb-small">${gone} обраних товарів більше немає в каталозі.</p>`:''}</div>`;return}
 const cats=[...new Set(L.map(p=>p.cat))],q=MF.q.trim().toLowerCase();
 if(MF.c&&!cats.includes(MF.c))MF.c='';
 const S2=L.filter(p=>(!MF.c||p.cat==MF.c)&&(!q||(p.name+' '+(p.sku||'')).toLowerCase().includes(q)));
 const out=L.filter(p=>!p.av),m=margin();
 P.innerHTML=`<div class="kb-card"><div class="kb-ch"><div><h3>Мої товари <span class="kb-small">· ${L.length}</span></h3><p class="kb-small" style="margin:2px 0 0">Ціни й наявність оновлюються зі складу автоматично.</p></div>
  <div class="kb-acts"><a class="btn ghost sm" href="v/edit.html">🏪 Моя вітрина</a><button type="button" class="btn ghost sm" data-copyall>${ico('list')}Тексти всіх</button><button type="button" class="btn sm" data-pick>${ico('plus')}Додати товари</button></div></div>
  ${out.length?`<div class="kb-banner warn">${ico('info')}<span><b>${out.length} ${pl(out.length,'товар закінчився','товари закінчились','товарів закінчились')}</b> — призупиніть оголошення: ${E(out.slice(0,3).map(shortT).join('; '))}${out.length>3?'…':''}</span></div>`:''}
  ${L.length>6?`<div class="kb-mtools"><div class="kb-srch sm">${ico('search')}<input id="kbMq" type="search" placeholder="Пошук серед моїх товарів" value="${E(MF.q)}" autocomplete="off"></div>
  ${cats.length>1?`<div class="kb-chips">${[['','Усі',L.length],...cats.map(c=>[c,catN(c),L.filter(p=>p.cat==c).length])].map(([k,l,n])=>`<button type="button" data-mc="${E(k)}" aria-pressed="${MF.c==k}">${E(l)}<i>${n}</i></button>`).join('')}</div>`:''}</div>`:''}
  <div class="kb-mine">${S2.map(p=>{const w=p.price*(1-m/100);return `<article class="kb-mi${p.av?'':' off'}">
   <button type="button" class="kb-mimg" data-p="${E(p.id)}" aria-label="Відкрити: ${E(p.name)}">${p.imgs&&p.imgs[0]?`<img src="${E(p.imgs[0])}" alt="" loading="lazy">`:''}<span class="kb-av ${p.av?'on':''}">${p.av?(p.qty>0&&p.qty<=10?'лишилось '+p.qty:'в наявності'):'немає'}</span></button>
   <button type="button" class="kb-unfav" data-unfav="${E(p.id)}" aria-label="Прибрати з моїх товарів" title="Прибрати">${ico('x')}</button>
   <div class="kb-mb"><b>${E(p.name)}</b><small>${E(p.sku||'')} · ${E(catN(p.cat))}</small>
    <dl><dt>Рекомендована</dt><dd>${M(p.price)}</dd><dt>Ваша оптова ≈</dt><dd>${M(w)}</dd><dt>Заробіток</dt><dd class="g">+${M(p.price-w)}</dd></dl>
    <div class="kb-mact"><button type="button" class="btn sm" data-ford="${E(p.id)}"${p.av?'':' disabled'}>${ico('plus')}В замовлення</button><button type="button" class="btn ghost sm" data-ftxt="${E(p.id)}">Текст</button></div></div></article>`}).join('')||'<p class="kb-none">Нічого не знайдено</p>'}</div>
  <p class="kb-small" style="margin-top:12px">Фото, повні описи й експорт у таблицю — на сторінці <a href="partners.html">«Товари для продажу»</a> (там ваш список теж збережено).</p></div>`;
 const i=$i('kbMq');if(i)i.addEventListener('input',()=>{MF.q=i.value;const pos=i.selectionStart;vMine();const j=$i('kbMq');j.focus();j.setSelectionRange(pos,pos)})}

/* повноекранний вибір товарів */
function pickOpen(){
 let d=$i('kbPick');
 if(!d){d=document.createElement('dialog');d.id='kbPick';d.className='kb-pick';d.setAttribute('aria-label','Обрати товари для продажу');document.body.append(d);
  d.addEventListener('close',()=>{clearTimeout(favT);if(token&&FAV)favSave(false);document.documentElement.classList.remove('kb-lock');if(tab=='mine'||tab=='home')draw()});
  d.addEventListener('click',pickClick);d.addEventListener('input',e=>{if(e.target.id=='kbPq'){PK.q=e.target.value;PK.n=48;pickGrid()}})}
 PK.n=48;
 d.innerHTML=`<div class="kb-pt"><div class="kb-pth"><div><h2>Оберіть товари для продажу</h2><p>Натисніть <b>+</b> на товарі — він з’явиться в «Мої товари». Ще раз — прибрати.</p></div>
  <button type="button" class="btn" data-pdone>Готово<i id="kbPn"></i></button></div>
  <div class="kb-ptools"><div class="kb-srch">${ico('search')}<input id="kbPq" type="search" placeholder="Назва або артикул: 3D панель, PET плитка, SW-…" value="${E(PK.q)}" autocomplete="off"></div>
  <label class="kb-chk"><input type="checkbox" id="kbPav"${PK.av?' checked':''}> Лише в наявності</label></div>
  <div class="kb-chips" id="kbPc"></div></div>
  <div class="kb-pg" id="kbPg"></div>`;
 document.documentElement.classList.add('kb-lock');
 try{d.showModal()}catch(e){d.setAttribute('open','')}
 $i('kbPav').addEventListener('change',e=>{PK.av=e.target.checked?1:0;PK.n=48;pickChips();pickGrid()});
 pickChips();pickGrid();setTimeout(()=>{const q=$i('kbPq');q&&q.focus({preventScroll:true})},60)}
let RANK=null;
// спершу найбільші категорії (3D панелі, плівка, плитка…), усередині — як у каталозі
function pickList(){const w=PK.q.trim().toLowerCase().replace(/[x*×]/g,'х').split(/\s+/).filter(Boolean);
 if(!RANK){const c={};all.forEach(p=>c[p.cat]=(c[p.cat]||0)+1);RANK=c}
 return all.filter(p=>(!PK.av||p.av)&&(!w.length||w.every(x=>(p.name+' '+(p.sku||'')).toLowerCase().replace(/[x*×]/g,'х').includes(x))))
  .map((p,i)=>[p,i]).sort((a,b)=>(RANK[b[0].cat]-RANK[a[0].cat])||(a[0].cat<b[0].cat?-1:a[0].cat>b[0].cat?1:0)||a[1]-b[1]).map(x=>x[0])}
function pickChips(){const L=pickList(),cnt={};L.forEach(p=>cnt[p.cat]=(cnt[p.cat]||0)+1);
 const cs=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]);if(PK.c&&!cnt[PK.c])PK.c='';
 $i('kbPc').innerHTML=[['','Усі',L.length],['__fav','Обрані',favs().length],...cs.map(c=>[c,catN(c),cnt[c]])].map(([k,l,n])=>`<button type="button" data-pc="${E(k)}" aria-pressed="${PK.c==k}">${E(l)}<i>${n}</i></button>`).join('');
 const n=$i('kbPn');if(n)n.textContent=favs().length?' · '+favs().length:''}
function pickGrid(){
 const g=$i('kbPg');if(!g)return;
 let L=PK.c=='__fav'?favs().map(prod).filter(Boolean):pickList();if(PK.c&&PK.c!='__fav')L=L.filter(p=>p.cat==PK.c);
 const S2=L.slice(0,PK.n),m=margin();
 g.innerHTML=S2.length?`<div class="kb-pgrid">${S2.map(p=>{const on=isFav(p.id);return `<div class="kb-pk${on?' on':''}${p.av?'':' off'}"><button type="button" class="kb-pim" data-fav="${E(p.id)}" aria-pressed="${on}" aria-label="${on?'Прибрати':'Додати'}: ${E(p.name)}">${p.imgs&&p.imgs[0]?`<img src="${E(p.imgs[0])}" alt="" loading="lazy">`:''}<span class="kb-plus" aria-hidden="true">${ico(on?'check':'plus')}</span>${p.av?'':'<em>немає</em>'}</button>
  <div class="kb-pb"><b title="${E(p.name)}">${E(p.name)}</b><span><strong>${M(p.price)}</strong><small>+${M(p.price*m/100)}</small></span></div></div>`}).join('')}</div>
  ${L.length>S2.length?`<button type="button" class="btn ghost kb-pmore" data-pmore>Показати ще · ${L.length-S2.length}</button>`:''}`:`<div class="kb-none"><p>${PK.c=='__fav'?'Ви ще нічого не обрали.':'Нічого не знайдено. Спробуйте інше слово або приберіть «Лише в наявності».'}</p></div>`;
 if(pickIO)pickIO.disconnect();const mb=g.querySelector('[data-pmore]');
 if(mb&&'IntersectionObserver' in window){pickIO=new IntersectionObserver(es=>{if(es[0].isIntersecting){PK.n+=48;pickGrid()}},{root:$i('kbPick'),rootMargin:'600px'});pickIO.observe(mb)}}
function pickClick(e){
 const b=e.target.closest('[data-fav],[data-pc],[data-pdone],[data-pmore]');if(!b)return;const d=b.dataset;
 if(d.pdone!==undefined)return $i('kbPick').close();
 if(d.pmore!==undefined){PK.n+=48;return pickGrid()}
 if(d.pc!==undefined){PK.c=d.pc;PK.n=48;pickChips();pickGrid();$i('kbPg').scrollIntoView({block:'start'});return}
 if(d.fav){const on=favToggle(d.fav),card=b.closest('.kb-pk');card.classList.toggle('on',on);b.setAttribute('aria-pressed',on);
  b.querySelector('.kb-plus').innerHTML=ico(on?'check':'plus');card.classList.remove('pop');void card.offsetWidth;card.classList.add('pop');
  const n=$i('kbPn');if(n)n.textContent=favs().length?' · '+favs().length:'';const c=$i('kbPc').querySelector('[data-pc="__fav"] i');if(c)c.textContent=favs().length}}
function toOrder(id){const p=prod(id);if(!p)return;const x=D.items.find(i=>i.id==id);
 if(x)x.q++;else D.items.push({id:p.id,name:p.name,sku:p.sku||'',price:+p.price,sale:Math.ceil(+p.price),q:1,img:p.imgs&&p.imgs[0]||''});
 saveD();sent=null;go('order');note('Додано в замовлення: '+shortT(p))}
document.addEventListener('click',e=>{const t=e.target.closest('[data-pick],[data-unfav],[data-ford],[data-ftxt],[data-copyall],[data-mc]');if(!t||!app.contains(t))return;const d=t.dataset;
 if(d.pick!==undefined)return ready()?pickOpen():note('Каталог ще завантажується — спробуйте за секунду');
 if(d.unfav){favToggle(d.unfav);return draw()}
 if(d.ford)return toOrder(d.ford);
 if(d.ftxt){const p=prod(d.ftxt);return p&&kcopy(adT(p),'Текст оголошення скопійовано')}
 if(d.copyall){const L=favs().map(prod).filter(p=>p&&p.av);return kcopy(L.map(adT).join('\n\n———————\n\n'),'Скопійовано тексти: '+L.length)}
 if(d.mc!==undefined){MF.c=d.mc;return vMine()}});

/* ---------- події ---------- */
document.addEventListener('click',e=>{
 const t=e.target.closest('[data-tab],[data-out],[data-skip],[data-flt],[data-refresh],[data-cancel],[data-kadd],[data-rm],[data-qm],[data-qp],[data-manual],[data-again],[data-eye],[data-gate-fill]');
 if(!t||!app.contains(t)&&!t.closest('#kbGate')&&!t.closest('#kbUser'))return;const d=t.dataset;
 if(d.tab!==undefined){e.preventDefault();return go(d.tab)}
 if(d.out!==undefined){api({action:'p_logout',token});return out()}
 if(d.skip!==undefined)return skip();
 if(d.flt){flt=d.flt;return draw()}
 if(d.refresh!==undefined){busy(t,1);return refresh().then(()=>busy(t,0))}
 if(d.cancel)return cancel(d.cancel,t);
 if(d.kadd)return add(d.kadd);
 if(d.rm!==undefined){D.items.splice(+d.rm,1);saveD();drawItems();return sumBox()}
 if(d.qm!==undefined||d.qp!==undefined){const k=+(d.qm??d.qp),x=D.items[k];x.q=Math.max(1,x.q+(d.qp!==undefined?1:-1));saveD();drawItems();return sumBox()}
 if(d.manual!==undefined)return manual();
 if(d.again!==undefined){sent=null;return draw()}
 if(d.eye!==undefined)return eye(t)});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-tglink]');if(!b)return;
 const w=window.open('about:blank','_blank');busy(b,1);const r=await api({action:'p_tgcode',token});busy(b,0);
 if(!r.ok){if(w)w.close();return note(r.error=='nobot'?'Бот партнерів ще налаштовується — спробуйте пізніше.':errMsg(r.error))}
 if(w)w.location.href=r.url;else location.href=r.url;note('Натисніть «Почати» в боті — і Telegram підключиться')});
document.addEventListener('click',e=>{const r=$i('kbRes');if(r&&!r.hidden&&!e.target.closest('.kb-srch'))r.hidden=true});
addEventListener('hashchange',()=>{const h=location.hash.slice(1);if(/^help(-|$)/.test(h)){if(!me)return helpPublic();if(tab!='help'){tab='help';draw()}else vHelp();return}if(!me)return;if((TABS.some(t=>t[0]==h)||h=='vit')&&h!=tab){tab=h;draw()}});
addEventListener('catalog',()=>{if(tab=='mine')draw();if(tab=='order'&&!sent){const q=$i('kbQ');if(q){q.placeholder='Назва або артикул: 3D панель, PET плитка…';q.value&&search(q.value)}}
 // оновлюємо фото й ціни в чернетці з актуального каталогу
 let ch=0;D.items.forEach(x=>{const p=x.id&&prod(x.id);if(p){if(!x.img&&p.imgs&&p.imgs[0]){x.img=p.imgs[0];ch=1}if(+p.price!=x.price){x.price=+p.price;ch=1}}});if(ch){saveD();if(tab=='order')drawItems(),sumBox()}});
$i('kbGateSkip')&&$i('kbGateSkip').addEventListener('click',skip);

/* ---------- старт ---------- */
const setTop=()=>{const h=document.querySelector('header');if(h)document.documentElement.style.setProperty('--kb-top',h.offsetHeight+'px')};setTop();addEventListener('resize',setTop);
if(!API)noApi();
else if(!token||!me){if(/^#help(-|$)/.test(location.hash))helpPublic();else authView(location.hash=='#reg'?'reg':'login')}
else{start();refresh(true).then(()=>{if(me&&SS.get('pk_seen')!='1'){SS.set('pk_seen','1');gate()}})}
})();
