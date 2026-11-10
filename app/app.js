/* Samostroy Drop — Mini App партнера в Telegram: вхід через Telegram, дашборд заробітку, нове замовлення
   з каталогу, статуси й ТТН, товари для продажу з текстами оголошень, профіль.
   Сервер — скрипт кабінету партнерів (CFG.papi, tools/partner-api/Code.gs). Каталог — app/catalog.json (оновлює tools/site.py). */
(()=>{
'use strict';
const tg=window.Telegram&&Telegram.WebApp||null;
const inTg=!!(tg&&tg.initData);
const ver=v=>!!(tg&&tg.isVersionAtLeast&&tg.isVersionAtLeast(v));
const API=(window.CFG&&CFG.papi)||'',MGR=(window.CFG&&CFG.tg)||'manager_samostroy_shop',BOT=(window.CFG&&CFG.dropBot)||'';
const SITE='https://samostroy.shop/';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const M=n=>Math.round(+n||0).toLocaleString('uk-UA').replace(/\s/g,' ')+' ₴';
const ico=n=>`<svg class="i" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
const pl=(n,a,b,c)=>{const m=n%10,h=n%100;return m==1&&h!=11?a:m>=2&&m<=4&&(h<10||h>=20)?b:c};
const fdate=s=>{const d=new Date(s);return isNaN(d)?'':d.toLocaleDateString('uk-UA',{day:'numeric',month:'short'})+', '+d.toLocaleTimeString('uk-UA',{hour:'2-digit',minute:'2-digit'})};

/* ---------- довідники (як у веб-кабінеті) ---------- */
const ST={'Нове':['Нове','#e07b0e'],'Підтверджене':['Підтверджене','#2563eb'],'Відправлене':['У дорозі','#7c3aed'],'Отримане':['До виплати','#2f8a4c'],
 'Виплачено':['Виплачено','#1f6b3a'],'Скасоване':['Скасоване','#8a939b'],'Повернення':['Повернення','#d1432b']};
const FLOW=['Нове','Підтверджене','Відправлене','Отримане','Виплачено'],FLOWL=['Прийнято','Підтверджено','В дорозі','Отримано','Виплачено'];
const WORK=['Нове','Підтверджене','Відправлене'],CANC=['Скасоване','Повернення'];
const LV=[['Starter',0,10],['Pro',20000,15],['Team',80000,20]];
const PL=[['sait','Свій сайт'],['google','Google'],['instagram','Instagram'],['tiktok','TikTok'],['facebook','Facebook'],['youtube','YouTube'],['threads','Threads'],['pinterest','Pinterest'],
 ['telegram','Telegram'],['viber','Viber'],['olx','OLX'],['besplatka','Besplatka'],['obyava','Obyava'],['prom','Prom.ua'],['rozetka','Rozetka'],['epicentr','Епіцентр'],['allo','Allo']];
const ERR={wrong:'Невірний телефон або пароль.',exists:'Цей номер уже зареєстровано. Увійдіть з паролем від кабінету на сайті.',locked:'Забагато спроб. Спробуйте через 15 хвилин.',
 blocked:'Кабінет призупинено. Напишіть менеджеру.',auth:'Сесія завершилась.',net:'Немає зв’язку. Перевірте інтернет і спробуйте ще раз.',
 password:'Пароль — щонайменше 6 символів.',phone:'Перевірте номер телефону.',name:'Вкажіть ім’я.',items:'Додайте хоча б один товар.',client:'Вкажіть ПІБ клієнта.',
 city:'Вкажіть місто доставки.',rate:'Забагато реєстрацій. Спробуйте пізніше.',server:'Помилка сервера. Спробуйте ще раз або напишіть менеджеру.',
 state:'Замовлення вже в роботі — скасувати його може менеджер.',notfound:'Замовлення не знайдено.',bad:'Перевірте дані.',
 tgauth:'Не вдалося підтвердити вхід через Telegram. Закрийте застосунок і відкрийте знову.',tgold:'Застосунок відкрито надто давно. Закрийте й відкрийте його знову.',
 nobot:'Бот ще налаштовується. Спробуйте трохи пізніше або напишіть менеджеру.',noapi:'Кабінет ще не підключено.'};
const errMsg=e=>ERR[e]||('Помилка: '+e);
const earn=o=>o.earnNow!=null?+o.earnNow:(o.earnFinal!=null?+o.earnFinal:+o.earn||0);
const pill=s=>{const x=ST[s]||[s,'#8a939b'];return `<span class="st" style="--c:${x[1]}">${E(x[0])}</span>`};
const first=n=>String(n||'').trim().split(/\s+/)[0]||'партнере';
const tgUid=()=>String(tg&&tg.initDataUnsafe&&tg.initDataUnsafe.user&&tg.initDataUnsafe.user.id||'');

/* ---------- стан ---------- */
let token=LS.get('da_token',''),me=LS.get('da_me',null),orders=LS.get('da_orders',[]),route='home',arg='',prevRoute='home';
let CAT=null,byId=new Map(),catP=null;
const O={flt:'all',q:''},C={q:'',c:'',n:30};
const blank=()=>({items:[],client:'',phone:'',city:'',branch:'',delivery:'Нова Пошта',pay:'Накладений платіж',source:'',note:''});
let D=Object.assign(blank(),LS.get('da_draft',{})),step=1,sent=null,okey='';
const saveD=()=>LS.set('da_draft',D);
const lvl=()=>LV.find(l=>l[0]==(me&&me.level))||LV[0];
const margin=()=>me&&me.margin?+me.margin:lvl()[2];
const wholeU=x=>x.price*(1-margin()/100);

async function api(b){
 if(!API)return{ok:false,error:'noapi'};
 const ac=new AbortController(),t=setTimeout(()=>ac.abort(),30000);
 try{const r=await fetch(API,{method:'POST',body:JSON.stringify(b),signal:ac.signal,redirect:'follow'});return await r.json()}
 catch(e){return{ok:false,error:'net'}}finally{clearTimeout(t)}}
function keep(r){
 if(r.token){token=r.token;LS.set('da_token',token);LS.set('da_uid',tgUid());
  // той самий вхід для сторінок сайту в цьому вікні (анкета зберігається в кабінет)
  LS.set('pk_token',token)}
 if(r.me){me=r.me;LS.set('da_me',me);LS.set('pk_me',me)}
 if(r.orders){orders=r.orders;LS.set('da_orders',orders)}}
function forget(){token='';me=null;orders=[];['da_token','da_me','da_orders','da_uid','pk_token','pk_me'].forEach(LS.del)}

/* ---------- Telegram: кнопки, вібрація, повідомлення ---------- */
const hap=(t='light')=>{try{if(!tg||!tg.HapticFeedback)return;if(t=='ok'||t=='error'||t=='warning')tg.HapticFeedback.notificationOccurred(t=='ok'?'success':t);else if(t=='sel')tg.HapticFeedback.selectionChanged();else tg.HapticFeedback.impactOccurred(t)}catch(e){}};
function toast(m){const e=$('#toast');e.textContent=m;e.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('on'),2200)}
const useMB=()=>inTg&&tg.MainButton&&ver('6.1');
const useBB=()=>inTg&&tg.BackButton&&ver('6.1');
let mainFn=null,backFn=null;
function mainBtn(text,fn,o={}){
 if(useMB()){const B=tg.MainButton;if(mainFn)B.offClick(mainFn);mainFn=()=>{if(!B.isProgressVisible)fn()};B.onClick(mainFn);
  B.setParams({text,color:'#f08a1c',text_color:'#1f2328',is_active:!o.off,is_visible:true});o.busy?B.showProgress(false):B.hideProgress();return}
 const b=$('#fbMain');b.textContent=text;b.disabled=!!o.off||!!o.busy;b.hidden=false;b.onclick=()=>fn();$('#fb').hidden=false;document.body.classList.add('fbon')}
function mainBusy(on){if(useMB()){on?tg.MainButton.showProgress(false):tg.MainButton.hideProgress()}else{const b=$('#fbMain');b.disabled=on;b.style.opacity=on?.6:''}}
function mainOff(){if(useMB()){if(mainFn)tg.MainButton.offClick(mainFn);mainFn=null;tg.MainButton.hide()}else{$('#fbMain').hidden=true;fbSync()}}
function backBtn(fn){
 if(useBB()){if(backFn)tg.BackButton.offClick(backFn);backFn=fn;tg.BackButton.onClick(fn);tg.BackButton.show();return}
 const b=$('#fbBack');b.hidden=false;b.onclick=fn;$('#fb').hidden=false;document.body.classList.add('fbon')}
function backOff(){if(useBB()){if(backFn)tg.BackButton.offClick(backFn);backFn=null;tg.BackButton.hide()}else{$('#fbBack').hidden=true;fbSync()}}
function fbSync(){const on=!$('#fbMain').hidden||!$('#fbBack').hidden;$('#fb').hidden=!on;document.body.classList.toggle('fbon',on)}
function ask(msg,ok){if(inTg&&ver('6.2'))tg.showConfirm(msg,y=>{if(y)ok()});else if(confirm(msg))ok()}
function openUrl(u){if(inTg&&tg.openLink)tg.openLink(u);else window.open(u,'_blank','noopener')}
function openTg(u){if(inTg&&tg.openTelegramLink)tg.openTelegramLink(u);else window.open(u,'_blank','noopener')}
const mgrUrl=t=>`https://t.me/${MGR}${t?'?text='+encodeURIComponent(t):''}`;
function copy(t,msg){const ok=()=>{hap('ok');toast(msg||'Скопійовано')};
 (navigator.clipboard&&window.isSecureContext?navigator.clipboard.writeText(t):Promise.reject()).then(ok,()=>{const a=document.createElement('textarea');a.value=t;a.style.cssText='position:fixed;opacity:0';document.body.append(a);a.select();try{document.execCommand('copy');ok()}catch(e){toast('Не вдалося скопіювати')}a.remove()})}

/* ---------- каталог ---------- */
function loadCat(){
 if(catP)return catP;
 catP=fetch('catalog.json?d='+new Date().toISOString().slice(0,13),{cache:'default'}).then(r=>r.json()).then(j=>{
  const f=j.f;CAT={cats:j.cats||[],updated:j.updated,items:j.items.map(a=>{const o={};f.forEach((k,i)=>o[k]=a[i]);o.av=!!o.av;o.key=(o.name+' '+o.sku).toLowerCase().replace(/[x*×]/g,'х');return o})};
  byId=new Map(CAT.items.map(p=>[p.id,p]));
  // ціни в чернетці — актуальні з каталогу
  let ch=0;D.items.forEach(x=>{const p=x.id&&byId.get(x.id);if(p&&+p.price!=x.price){x.price=+p.price;ch=1}if(p&&!x.img&&p.img){x.img=p.img;ch=1}});if(ch)saveD();
  return CAT}).catch(()=>{catP=null;return null});
 return catP}
/* «Мої товари» — спільні з веб-кабінетом (зберігаються в акаунті) */
let favT=null;
const favL=()=>me&&Array.isArray(me.favs)?me.favs.map(String):LS.get('da_favs',[]);
const isFav=id=>favL().includes(String(id));
function favToggle(id){id=String(id);const L=favL(),i=L.indexOf(id);if(i>=0)L.splice(i,1);else L.unshift(id);
 if(me){me.favs=L;LS.set('da_me',me)}LS.set('da_favs',L);
 clearTimeout(favT);favT=setTimeout(async()=>{const r=await api({action:'p_favs',token,favs:L});if(r.ok&&me){me.favs=r.favs;LS.set('da_me',me)}},700);return i<0}
const catName=s=>{const c=CAT&&CAT.cats.find(x=>x[0]==s);return c?c[1]:''};
function findP(q,cat,lim){
 const w=q.trim().toLowerCase().replace(/[x*×]/g,'х').split(/\s+/).filter(Boolean);
 let L=CAT.items;if(cat=='__fav'){const F=favL();L=F.map(id=>byId.get(id)).filter(Boolean)}else if(cat)L=L.filter(p=>p.cat==cat);if(w.length)L=L.filter(p=>w.every(x=>p.key.includes(x)));
 return lim?L.slice(0,lim):L}
const adText=p=>`${p.name}\n\n💰 Ціна: ${Math.ceil(p.price)} грн\n${p.av?'✅ В наявності':'⏳ Під замовлення'}\n🚚 Відправка Новою поштою по всій Україні в день замовлення\n💳 Оплата при отриманні або на картку\n\n📩 Пишіть — підкажу, скільки потрібно на вашу площу.`;

/* ---------- старт ---------- */
function boot(){
 if(tg){try{tg.ready();tg.expand();if(ver('7.7'))tg.disableVerticalSwipes();if(ver('6.1')){tg.setHeaderColor('secondary_bg_color');tg.setBackgroundColor('secondary_bg_color')}}catch(e){}
  document.documentElement.classList.add('tg');
  try{tg.onEvent('activated',()=>refresh(true))}catch(e){}}
 parseHash();
 if(!API)return screenMsg('Кабінет ще не підключено','Спробуйте трохи пізніше або напишіть менеджеру.',[['Написати менеджеру',()=>openTg(mgrUrl())]]);
 if(!inTg)return notTg();
 if(token&&me&&LS.get('da_uid','')==tgUid()){start();refresh(true,1);return}
 auth()}
async function auth(){
 $('#app').innerHTML=`<div class="boot"><b class="brand">SAMOSTROY<i>DROP</i></b><span class="spin"></span></div>`;
 const r=await api({action:'tg_auth',initData:tg.initData});
 if(!r.ok){if(r.error=='blocked')return screenMsg('Кабінет призупинено','Напишіть менеджеру, щоб відновити доступ.',[['Написати менеджеру',()=>openTg(mgrUrl())]]);
  return screenMsg('Не вдалося увійти',errMsg(r.error),[['Спробувати ще раз',auth],['Написати менеджеру',()=>openTg(mgrUrl())]])}
 if(!r.linked){forget();return welcome(r.tg||{})}
 keep(r);start()}
function parseHash(){const h=decodeURIComponent(location.hash.slice(1));
 if(/^o=/.test(h)){route='order';arg=h.slice(2)}else if(['home','orders','new','cat','profile'].includes(h))route=h;}
async function refresh(quiet,first){
 if(!token)return;const r=await api({action:'p_me',token});
 if(!r.ok){if(r.error=='auth'){forget();return auth()}if(r.error=='blocked'){forget();return auth()}if(!quiet)toast(errMsg(r.error));return}
 const before=JSON.stringify(orders.map(o=>[o.id,o.status,o.ttn,o.comment]));keep(r);
 if(first||before!=JSON.stringify(orders.map(o=>[o.id,o.status,o.ttn,o.comment])))if(['home','orders','order','profile'].includes(route))draw()}
function start(){
 $('#nav').hidden=false;draw();
 clearInterval(start.t);start.t=setInterval(()=>{if(!document.hidden)refresh(true)},90000);
 if(!start.v){start.v=1;document.addEventListener('visibilitychange',()=>{if(!document.hidden&&token)refresh(true)})}}
function screenMsg(t,s,btns=[]){
 $('#nav').hidden=true;mainOff();backOff();
 $('#app').innerHTML=`<div class="wel"><b class="brand">SAMOSTROY<i>DROP</i></b><h1 class="h1">${E(t)}</h1><p>${E(s)}</p><div class="mt">${btns.map((b,i)=>`<button class="btn ${i?'ghost':''}" data-mb="${i}">${E(b[0])}</button>`).join('')}</div></div>`;
 $$('[data-mb]').forEach(b=>b.onclick=()=>btns[+b.dataset.mb][1]())}
function notTg(){
 $('#nav').hidden=true;
 $('#app').innerHTML=`<div class="wel"><b class="brand">SAMOSTROY<i>DROP</i></b><h1 class="h1">Кабінет партнера в Telegram</h1>
 <p>Ця сторінка відкривається з бота партнерів у Telegram. Там можна оформлювати замовлення клієнтів, бачити статуси, ТТН і заробіток.</p>
 <div class="mt">${BOT?`<a class="btn wide" href="https://t.me/${E(BOT)}">Відкрити бота в Telegram</a>`:''}<a class="btn ${BOT?'ghost':''} wide" href="../kabinet.html" style="margin-top:8px">Кабінет на сайті</a></div></div>`}

/* ---------- вхід і реєстрація ---------- */
let W={mode:'',name:'',phone:'',city:'',err:''};
function welcome(u){
 $('#nav').hidden=true;mainOff();backOff();W.name=W.name||u.name||'';
 $('#app').innerHTML=`<div class="wel"><b class="brand">SAMOSTROY<i>DROP</i></b>
 <h1 class="h1">Заробляйте на продажу матеріалів для ремонту — без складу й вкладень</h1>
 <p>Ви знаходите клієнта, ми пакуємо й відправляємо. Ваш заробіток — різниця між вашою ціною й оптовою.</p>
 <ul class="ben"><li><span class="ic">${ico('grid')}</span><div><b>1 100+ товарів з фото й текстами</b><span>3D панелі, PET і вінілова плитка, плівка, шпалери, підлога</span></div></li>
 <li><span class="ic">${ico('truck')}</span><div><b>Відправляємо від вашого імені</b><span>Нова Пошта або Укрпошта, оплата при отриманні</span></div></li>
 <li><span class="ic">${ico('wallet')}</span><div><b>Маржа 10–20% і більше</b><span>Ставите свою ціну — бачите заробіток одразу</span></div></li></ul>
 <button class="btn" data-w="reg">Стати партнером</button><button class="btn ghost" data-w="login">У мене вже є кабінет на сайті</button>
 <p class="small" style="text-align:center;margin-top:10px">Питання? <a href="#" data-w="mgr">Напишіть менеджеру</a></p></div>`;
 $$('[data-w]').forEach(b=>b.onclick=e=>{e.preventDefault();const w=b.dataset.w;if(w=='mgr')return openTg(mgrUrl());W.mode=w;W.err='';authForm()})}
function authForm(){
 const reg=W.mode=='reg';
 $('#app').innerHTML=`<div class="wel" style="padding-top:6px"><h1 class="h1" style="font-size:21px">${reg?'Реєстрація партнера':'Вхід у наявний кабінет'}</h1>
 <p style="margin-bottom:16px">${reg?'1 хвилина — і можна надсилати замовлення. Анкету про ваші платформи заповните пізніше.':'Увійдіть номером телефону й паролем від кабінету на сайті — Telegram підключиться до нього, і всі замовлення будуть тут.'}</p>
 <form id="af" novalidate>
 ${reg?`<label class="f"><span>Ваше ім’я</span><input name="name" autocomplete="name" value="${E(W.name)}"></label>`:''}
 <label class="f"><span>Телефон${reg?' — буде логіном для сайту':''}</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+380" value="${E(W.phone)}"></label>
 ${inTg&&ver('6.9')?`<button type="button" class="phbtn" data-contact>${ico('phone')}Взяти номер з Telegram</button>`:''}
 ${reg?`<label class="f"><span>Місто</span><input name="city" autocomplete="address-level2" value="${E(W.city)}"></label>
 <label class="f"><span>Пароль для входу на сайті — необов’язково</span><input name="password" type="password" autocomplete="new-password" placeholder="можна задати пізніше в профілі"></label>`
 :`<label class="f"><span>Пароль</span><input name="password" type="password" autocomplete="current-password"></label>
 <p class="small" style="margin:-4px 2px 12px">Забули пароль? <a href="#" data-forgot>Менеджер надішле тимчасовий</a></p>`}
 <p class="err" id="aerr">${E(W.err)}</p>
 ${reg?'<p class="small">Реєструючись, ви погоджуєтесь з умовами партнерської програми. Дані бачить лише менеджер Samostroy Shop.</p>':''}
 </form>
 <button class="lnk mt" data-sw>${reg?'Вже є кабінет? Увійти':'Ще немає кабінету? Зареєструватися'}</button></div>`;
 const f=$('#af');
 f.addEventListener('input',e=>{const n=e.target.name;if(n&&n in W)W[n]=e.target.value;e.target.closest('.f')&&e.target.closest('.f').classList.remove('bad')});
 f.addEventListener('submit',e=>{e.preventDefault();authSend()});
 $('[data-sw]').onclick=()=>{W.mode=reg?'login':'reg';W.err='';authForm()};
 const fg=$('[data-forgot]');if(fg)fg.onclick=e=>{e.preventDefault();openTg(mgrUrl('Добрий день! Не пам’ятаю пароль від кабінету партнера, допоможіть, будь ласка.'))};
 const cb=$('[data-contact]');if(cb)cb.onclick=()=>{tg.requestContact((ok,res)=>{const ph=ok&&res&&res.responseUnsafe&&res.responseUnsafe.contact&&res.responseUnsafe.contact.phone_number;
  if(ph){W.phone='+'+String(ph).replace(/\D/g,'');f.elements.phone.value=W.phone;hap('ok')}else if(ok)toast('Номер надіслано. Якщо поле порожнє — впишіть його вручну')})};
 backBtn(()=>welcome({}));
 mainBtn(reg?'Створити кабінет':'Увійти й підключити Telegram',authSend)}
async function authSend(){
 const f=$('#af');if(!f)return;const el=f.elements,reg=W.mode=='reg',err=m=>{$('#aerr').textContent=m;hap('error')};
 const bad=n=>{const x=el[n].closest('.f');x&&x.classList.add('bad');el[n].focus()};
 if(reg&&el.name.value.trim().length<2){bad('name');return err(ERR.name)}
 if(el.phone.value.replace(/\D/g,'').length<10){bad('phone');return err(ERR.phone)}
 const pw=el.password.value;
 if((!reg||pw)&&pw.length<6){bad('password');return err(reg?ERR.password:'Введіть пароль.')}
 mainBusy(true);
 const r=await api(reg?{action:'tg_register',initData:tg.initData,name:el.name.value,phone:el.phone.value,city:el.city.value,password:pw}
  :{action:'tg_login',initData:tg.initData,phone:el.phone.value,password:pw});
 mainBusy(false);
 if(!r.ok){if(r.error=='exists'){W.mode='login';W.err=ERR.exists;return authForm()}return err(errMsg(r.error))}
 hap('ok');keep(r);mainOff();backOff();route=reg?'home':'home';start();toast(reg?'Кабінет створено. Вітаємо!':'Telegram підключено до кабінету')}

/* ---------- каркас ---------- */
function go(r,a=''){
 if(r=='new'&&route!='new'){step=D.items.length?step:1;sent=null}
 prevRoute=['order','new'].includes(route)?prevRoute:route;route=r;arg=a;
 try{history.replaceState(null,'','#'+(r=='order'?'o='+a:r))}catch(e){}
 closeSheet(true);draw();scrollTo(0,0)}
function draw(){
 if(!me)return;
 mainOff();backOff();
 const flow=route=='new'||route=='order';
 $('#nav').hidden=flow;document.body.classList.toggle('flow',flow);
 $$('#nav [data-go]').forEach(b=>b.classList.toggle('on',b.dataset.go==route));
 const nW=orders.filter(o=>WORK.includes(o.status)).length;$('#navN').textContent=nW||'';
 ({home:vHome,orders:vOrders,order:vOrder,new:vNew,cat:vCat,profile:vProfile}[route]||vHome)()}
$('#nav').addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(!b)return;hap('sel');go(b.dataset.go)});

/* ---------- головна ---------- */
function stats(){
 const live=orders.filter(o=>!CANC.includes(o.status)),now=new Date(),ms=new Date(now.getFullYear(),now.getMonth(),1);
 const sum=(L,f)=>L.reduce((a,o)=>a+f(o),0),mL=live.filter(o=>new Date(o.created)>=ms);
 return{live,work:live.filter(o=>WORK.includes(o.status)),due:live.filter(o=>o.status=='Отримане'),paid:live.filter(o=>o.status=='Виплачено'),
  mL,mTurn:sum(mL,o=>+o.sale||0),mEarn:sum(mL.filter(o=>o.status=='Отримане'||o.status=='Виплачено'),earn),mAll:sum(mL,earn),sum}}
function months(){const now=new Date(),R=[];
 for(let k=5;k>=0;k--){const a=new Date(now.getFullYear(),now.getMonth()-k,1),b=new Date(now.getFullYear(),now.getMonth()-k+1,1);
  const L=orders.filter(o=>!CANC.includes(o.status)&&new Date(o.created)>=a&&new Date(o.created)<b);
  R.push({l:a.toLocaleDateString('uk-UA',{month:'short'}).replace('.',''),ok:L.filter(o=>o.status=='Отримане'||o.status=='Виплачено').reduce((s,o)=>s+earn(o),0),w:L.filter(o=>WORK.includes(o.status)).reduce((s,o)=>s+earn(o),0)})}
 return R}
function oCard(o){
 const its=(o.items||[]).map(x=>x.name+(x.q>1?' × '+x.q:'')).join('; ');
 return `<button class="oc" data-o="${E(o.id)}"><div class="r1"><b>№ ${E(o.id)}</b><span>${fdate(o.created)}</span>${pill(o.status)}</div>
 <div class="r2"><div class="t"><b>${E(o.client)}</b><p>${E(its)}</p></div><div class="m"><span>${M(o.sale)}</span><b class="${CANC.includes(o.status)?'off':''}">+${M(earn(o))}</b></div></div>
 ${o.ttn||o.comment?`<div class="r3">${o.ttn?`${ico('truck')}ТТН ${E(o.ttn)}`:`${ico('chat')}${E(o.comment.slice(0,70))}`}</div>`:''}</button>`}
function vHome(){
 const s=stats(),mn=new Date().toLocaleDateString('uk-UA',{month:'long'}),L=lvl(),nx=LV[LV.indexOf(L)+1],R=months(),mx=Math.max(1,...R.map(r=>r.ok+r.w));
 const pct=nx?Math.min(100,Math.round(s.mTurn/nx[1]*100)):100,sent=orders.filter(o=>o.status=='Відправлене'&&o.ttn);
 $('#app').innerHTML=`<div class="hello"><span class="ava">${E(first(me.name).slice(0,1).toUpperCase())}</span><div class="sp"><div class="h1">Вітаємо, ${E(first(me.name))}!</div><span class="lv">${E(L[0])} · маржа <b>${margin()}%</b></span></div></div>
 <div class="hero"><span>Заробіток за ${E(mn)}</span><b>${M(s.mEarn)}</b><small>${s.mAll>s.mEarn?`ще ${M(s.mAll-s.mEarn)} — у замовленнях в роботі`:s.live.length?'з замовлень, які клієнти вже забрали':'оформіть перше замовлення — ми все відправимо самі'}</small>
  <button class="btn" data-go2="new">${ico('plus')}Нове замовлення</button></div>
 <div class="kpi"><div><span>Очікується</span><b>${M(s.sum(s.work,earn))}</b><small>${s.work.length} в роботі</small></div>
  <div><span>До виплати</span><b>${M(s.sum(s.due,earn))}</b><small>${s.due.length?s.due.length+' отрим.':'поки 0'}</small></div>
  <div><span>Виплачено</span><b>${M(s.sum(s.paid,earn))}</b><small>усього</small></div></div>
 ${!me.anketaAt?`<div class="banner">${ico('info')}<div><b>Заповніть анкету партнера</b><span>3 хвилини — і отримаєте інструкції саме під ваші платформи: OLX, Instagram, TikTok…</span><br><button class="btn sm" data-anketa>Заповнити анкету</button></div></div>`:''}
 ${sent.length?`<div class="h3">У дорозі</div>${sent.slice(0,3).map(oCard).join('')}`:''}
 <div class="card"><div class="row"><b class="h2 sp">Заробіток за 6 місяців</b></div>
  <div class="bars">${R.map(r=>`<div class="bar"><div class="col"><b style="height:${(r.ok/mx*100).toFixed(1)}%"></b><b class="w" style="height:${(r.w/mx*100).toFixed(1)}%"></b></div><span>${E(r.l)}</span></div>`).join('')}</div>
  <div class="leg"><span><i></i>отримано</span><span><i class="w"></i>в роботі</span></div>
  ${nx?`<div class="prog"><div class="row"><span>До рівня <b style="color:var(--tx)">${nx[0]}</b> (${nx[2]}%)</span><span>${M(s.mTurn)} з ${M(nx[1])}</span></div><i><b style="width:${pct}%"></b></i></div>`:'<p class="small mt">У вас найвищий рівень — дякуємо за роботу!</p>'}</div>
 <div class="h3">Останні замовлення</div>
 ${orders.length?orders.filter(o=>!sent.includes(o)).slice(0,4).map(oCard).join('')+(orders.length>4?`<button class="more" data-go2="orders">Усі замовлення (${orders.length})</button>`:'')
  :`<div class="card empty">${ico('box')}<b>Замовлень ще немає</b>Знайдіть товар у розділі «Товари», скопіюйте текст оголошення й розмістіть його. Коли клієнт замовить — оформіть тут.<br><button class="btn sm" data-go2="cat">Обрати товари</button></div>`}
 <div class="h3">Інструменти</div>
 <div class="tiles"><button class="tile" data-go2="cat">${ico('grid')}<b>Товари й тексти</b><small>Ціни, фото, готові оголошення</small></button>
  <button class="tile" data-url="${SITE}academy.html">${ico('book')}<b>Академія</b><small>Як отримати перші замовлення</small></button>
  <button class="tile" data-url="${SITE}course-dropshipping.html">${ico('spark')}<b>Курс «Дропшипінг з нуля»</b><small>23 короткі уроки</small></button>
  <button class="tile" data-mgr>${ico('chat')}<b>Менеджер</b><small>Відповімо в робочий час</small></button></div>`}

/* ---------- замовлення ---------- */
const GR=[['all','Усі',()=>1],['work','В роботі',o=>WORK.includes(o.status)],['due','До виплати',o=>o.status=='Отримане'],['paid','Виплачено',o=>o.status=='Виплачено'],['canc','Скасовані',o=>CANC.includes(o.status)]];
function vOrders(){
 const q=O.q.trim().toLowerCase(),base=orders.filter(o=>!q||[o.id,o.client,o.city,o.ttn,o.phone,(o.items||[]).map(x=>x.name).join(' ')].join(' ').toLowerCase().includes(q));
 const f=(GR.find(g=>g[0]==O.flt)||GR[0])[2],L=base.filter(f);
 $('#app').innerHTML=`<div class="row" style="margin:2px 2px 12px"><h1 class="h1 sp">Замовлення</h1><button class="btn ghost sm" data-refresh aria-label="Оновити">${ico('refresh')}</button></div>
 ${orders.length>5?`<div class="srch">${ico('search')}<input id="oq" type="search" placeholder="Клієнт, №, ТТН, товар" value="${E(O.q)}"></div>`:''}
 <div class="chips">${GR.map(([k,l,fn])=>`<button data-flt="${k}" class="${O.flt==k?'on':''}">${l}<i>${base.filter(fn).length}</i></button>`).join('')}</div>
 <div id="ol">${L.length?L.map(oCard).join(''):`<div class="card empty">${ico('box')}<b>${orders.length?'Тут порожньо':'Замовлень ще немає'}</b>${orders.length?'Спробуйте інший фільтр.':'Оформіть перше — це займе хвилину.'}${orders.length?'':'<br><button class="btn sm" data-go2="new">Нове замовлення</button>'}</div>`}</div>
 <p class="small" style="text-align:center;margin:8px 0">Статуси й ТТН оновлює менеджер — сповіщення прийдуть у чат з ботом.</p>`;
 const i=$('#oq');if(i)i.addEventListener('input',()=>{O.q=i.value;const p=i.selectionStart;vOrders();const j=$('#oq');j.focus();j.setSelectionRange(p,p)})}
function vOrder(){
 const o=orders.find(x=>x.id==arg);
 backBtn(()=>go(prevRoute&&prevRoute!='order'?prevRoute:'orders'));
 if(!o){$('#app').innerHTML=`<div class="card empty">${ico('box')}<b>Замовлення ${E(arg)} не знайдено</b>Можливо, його ще не завантажено.<br><button class="btn sm" data-refresh>Оновити</button></div>`;return}
 const k=FLOW.indexOf(o.status),canc=CANC.includes(o.status),its=o.items||[];
 $('#app').innerHTML=`<div class="row" style="margin:2px 2px 12px"><div class="sp"><h1 class="h1">№ ${E(o.id)}</h1><span class="sub">${fdate(o.created)}${o.via=='Telegram'?' · з Telegram':''}</span></div>${pill(o.status)}</div>
 <div class="card">${canc?`<div class="canc">${ico('x')}${o.status=='Скасоване'?'Замовлення скасовано':'Повернення: клієнт не забрав посилку'}</div>`
  :`<div class="steps"><span class="fill" style="width:${Math.max(0,k)/4*80}%"></span>${FLOWL.map((l,i)=>`<div class="${i<=k?'on':''}${i==k?' cur':''}"><i>${i<=k?ico('check'):''}</i>${l}</div>`).join('')}</div>`}</div>
 ${o.ttn?`<div class="card"><div class="h3" style="margin-top:0">ТТН</div><div class="ttn"><b>${E(o.ttn)}</b><button data-copy="${E(o.ttn)}" aria-label="Копіювати ТТН">${ico('copy')}</button><button data-url="${E(trackUrl(o))}" aria-label="Відстежити">${ico('link')}</button></div>
  <div class="acts mt"><button class="btn sm ghost" data-copy="${E(clientMsg(o))}" data-cm="Текст для клієнта скопійовано">${ico('copy')}Текст для клієнта</button></div></div>`:''}
 ${o.comment?`<div class="com"><small>Коментар менеджера</small>${E(o.comment)}</div><div style="height:10px"></div>`:''}
 <div class="card"><div class="h3" style="margin-top:0">Товари</div>${its.map(x=>{const p=x.id&&byId.get(x.id);const img=x.img||p&&p.img;return `<div class="it">${img?`<img src="${E(img)}" alt="" loading="lazy">`:'<span class="ph"></span>'}<div class="t"><b>${E(x.name)}</b><small>${x.sku?E(x.sku)+' · ':''}${x.q} × ${M(x.sale)}</small></div><div class="s">${M(x.sale*x.q)}</div></div>`}).join('')}
  <div class="earn mt"><span>Ваш заробіток<small>${o.earnFinal!=null?'підтверджено менеджером':'орієнтовно'}</small></span><b>${CANC.includes(o.status)?'—':'+'+M(earn(o))}</b></div></div>
 <div class="card"><div class="h3" style="margin-top:0">Клієнт і доставка</div><dl class="kv"><dt>Отримувач</dt><dd>${E(o.client)}</dd><dt>Телефон</dt><dd><a href="tel:+${E(o.phone)}">+${E(o.phone)}</a></dd>
  <dt>Доставка</dt><dd>${E(o.delivery||'—')}</dd><dt>Куди</dt><dd>${E([o.city,o.branch].filter(Boolean).join(', '))}</dd><dt>Оплата</dt><dd>${E(o.pay||'—')}</dd><dt>Сума для клієнта</dt><dd><b>${M(o.sale)}</b></dd>${o.source?`<dt>Звідки клієнт</dt><dd>${E(o.source)}</dd>`:''}${o.note?`<dt>Ваш коментар</dt><dd>${E(o.note)}</dd>`:''}</dl></div>
 <div class="list"><button class="li" data-repeat>${'<span class="ic">'+ico('refresh')+'</span>'}<span class="t"><b>Повторити замовлення</b><small>Ті самі товари — новий клієнт</small></span>${ico('chev')}</button>
  <button class="li" data-mgr="${E(o.id)}"><span class="ic">${ico('chat')}</span><span class="t"><b>Питання щодо замовлення</b><small>Написати менеджеру</small></span>${ico('chev')}</button>
  ${o.status=='Нове'?`<button class="li" data-cancel><span class="ic" style="background:color-mix(in srgb,var(--bad) 12%,var(--card))"><svg class="i" style="color:var(--bad)"><use href="#i-x"/></svg></span><span class="t"><b style="color:var(--bad)">Скасувати замовлення</b><small>Поки менеджер його не підтвердив</small></span></button>`:''}</div>`}
function trackUrl(o){const n=String(o.ttn||'').replace(/\s/g,'');return /укр/i.test(o.delivery||'')?'https://track.ukrposhta.ua/tracking_UA.html?barcode='+encodeURIComponent(n):'https://novaposhta.ua/tracking/?cargo_number='+encodeURIComponent(n)}
const clientMsg=o=>`Добрий день, ${first(o.client)}! Ваше замовлення відправлено.\nТТН ${o.delivery||'Нова Пошта'}: ${o.ttn}\nВідстежити: ${trackUrl(o)}\nСума до сплати при отриманні: ${Math.round(o.sale)} грн${/перед/i.test(o.pay||'')?' (оплачено)':''}.\nДякую за замовлення!`;
async function cancelO(){const o=orders.find(x=>x.id==arg);if(!o)return;
 ask('Скасувати замовлення № '+o.id+'?',async()=>{const r=await api({action:'p_cancel',token,id:o.id});
  if(!r.ok){hap('error');return toast(errMsg(r.error))}const i=orders.findIndex(x=>x.id==o.id);if(i>=0)orders[i]=r.order;LS.set('da_orders',orders);hap('ok');toast('Замовлення скасовано');draw()})}
function repeatO(){const o=orders.find(x=>x.id==arg);if(!o)return;
 const go2=()=>{D=blank();D.items=(o.items||[]).map(x=>{const p=x.id&&byId.get(x.id);return{id:x.id,name:x.name,sku:x.sku||'',price:p?+p.price:+x.price,sale:+x.sale,q:+x.q||1,img:x.img||p&&p.img||''}});D.delivery=o.delivery||'Нова Пошта';D.pay=o.pay||'Накладений платіж';D.source=o.source||'';saveD();step=1;sent=null;go('new')};
 if(D.items.length)ask('У чернетці вже є товари. Замінити їх товарами з цього замовлення?',go2);else go2()}

/* ---------- нове замовлення ---------- */
function vNew(){
 if(sent)return vSent();
 loadCat();
 backBtn(()=>{if(step>1){step--;draw();scrollTo(0,0)}else go(prevRoute||'home')});
 const head=`<div class="stepper">${[1,2,3].map(i=>`<span class="${i<=step?'on':''}"></span>`).join('')}</div>`;
 if(step==1){
  const n=D.items.reduce((a,x)=>a+x.q,0);
  $('#app').innerHTML=`${head}<div class="row" style="margin:0 2px 4px"><h1 class="h1 sp">Товари</h1>${D.items.length?'<button class="lnk" data-clear>Очистити</button>':''}</div><p class="sub" style="margin:0 2px 12px">Крок 1 з 3 · оберіть товари й поставте свою ціну</p>
  <div class="card" id="cart">${D.items.length?`<div class="cart">${D.items.map(ciHtml).join('')}</div>`:`<div class="empty" style="padding:18px 8px">${ico('box')}<b>Додайте товари</b>Знайдіть за назвою або артикулом</div>`}
   <button class="addp" data-pick>${ico('plus')}${D.items.length?'Додати ще товар':'Обрати товар з каталогу'}</button></div>
  <button class="lnk" data-manual style="margin:2px 4px 12px;font-size:14px">Немає в каталозі? Додати вручну</button>
  ${D.items.length?sumHtml():''}`;
  bindCart();
  mainBtn(D.items.length?`Далі: клієнт і доставка · ${n} шт`:'Оберіть товар',()=>{if(!D.items.length)return pickSheet();const low=D.items.find(x=>x.sale<wholeU(x));if(low){hap('error');return toast(`«${low.name.slice(0,30)}…»: ціна нижча за оптову ${M(wholeU(low))}`)}step=2;draw();scrollTo(0,0)},{off:false});
  return}
 if(step==2){
  const src=sources();
  $('#app').innerHTML=`${head}<h1 class="h1" style="margin:0 2px 4px">Клієнт і доставка</h1><p class="sub" style="margin:0 2px 12px">Крок 2 з 3 · дані отримувача посилки</p>
  <form id="cf" class="card" novalidate>
   <label class="f"><span>ПІБ клієнта</span><input name="client" autocomplete="off" value="${E(D.client)}" placeholder="Прізвище Ім’я"></label>
   <label class="f"><span>Телефон клієнта</span><input name="phone" type="tel" inputmode="tel" autocomplete="off" placeholder="+380" value="${E(D.phone)}"></label>
   <span class="small" style="display:block;margin:0 2px 5px">Служба доставки</span>${seg('delivery',['Нова Пошта','Укрпошта'])}
   <div class="f2"><label class="f"><span>Місто</span><input name="city" autocomplete="off" value="${E(D.city)}"></label>
   <label class="f"><span>${D.delivery=='Укрпошта'?'Індекс / відділення':'Відділення / поштомат'}</span><input name="branch" autocomplete="off" placeholder="№ 12" value="${E(D.branch)}"></label></div>
   <span class="small" style="display:block;margin:0 2px 5px">Оплата</span>${seg('pay',['Накладений платіж','Передоплата'])}
   <label class="f"><span>Звідки клієнт</span><select name="source"><option value="">Не вказано</option>${src.map(p=>`<option${D.source==p?' selected':''}>${E(p)}</option>`).join('')}<option${D.source=='Інше'?' selected':''}>Інше</option></select></label>
   <label class="f" style="margin-bottom:0"><span>Коментар для менеджера</span><input name="note" autocomplete="off" placeholder="Колір, терміновість, побажання" value="${E(D.note)}"></label>
   <p class="err" id="cerr"></p></form>`;
  const f=$('#cf');
  f.addEventListener('input',e=>{const n=e.target.name;if(n&&n in D){D[n]=e.target.value;saveD()}const x=e.target.closest('.f');x&&x.classList.remove('bad')});
  f.addEventListener('change',e=>{const n=e.target.name;if(n&&n in D){D[n]=e.target.value;saveD()}});
  f.addEventListener('submit',e=>{e.preventDefault();toStep3()});
  $$('#cf [data-seg]').forEach(b=>b.onclick=()=>{D[b.dataset.seg]=b.dataset.v;saveD();hap('sel');const y=scrollY;draw();scrollTo(0,y)});
  mainBtn('Далі: перевірка',toStep3);return}
 // крок 3
 const sale=D.items.reduce((a,x)=>a+x.sale*x.q,0),whole=D.items.reduce((a,x)=>a+wholeU(x)*x.q,0);
 $('#app').innerHTML=`${head}<h1 class="h1" style="margin:0 2px 4px">Перевірте замовлення</h1><p class="sub" style="margin:0 2px 12px">Крок 3 з 3 · після відправки менеджер підтвердить наявність</p>
 <div class="card"><div class="row"><b class="h2 sp">Товари</b><button class="lnk" data-step="1">Змінити</button></div>${D.items.map(x=>`<div class="it">${x.img?`<img src="${E(x.img)}" alt="">`:'<span class="ph"></span>'}<div class="t"><b>${E(x.name)}</b><small>${x.q} × ${M(x.sale)}</small></div><div class="s">${M(x.sale*x.q)}<small>+${M((x.sale-wholeU(x))*x.q)}</small></div></div>`).join('')}</div>
 <div class="card"><div class="row" style="margin-bottom:10px"><b class="h2 sp">Отримувач</b><button class="lnk" data-step="2">Змінити</button></div>
  <dl class="kv"><dt>Клієнт</dt><dd>${E(D.client)}</dd><dt>Телефон</dt><dd>${E(D.phone)}</dd><dt>Доставка</dt><dd>${E(D.delivery)}</dd><dt>Куди</dt><dd>${E(D.city+', '+D.branch)}</dd><dt>Оплата</dt><dd>${E(D.pay)}</dd>${D.note?`<dt>Коментар</dt><dd>${E(D.note)}</dd>`:''}</dl></div>
 <div class="card sum"><dl class="kv"><dt>Сума для клієнта</dt><dd><b>${M(sale)}</b></dd><dt>Оптова ціна ≈</dt><dd>${M(whole)}</dd></dl>
  <div class="earn mt"><span>Ваш заробіток<small>орієнтовно · ${E(me.level||'Starter')}, −${margin()}%</small></span><b>+${M(sale-whole)}</b></div>
  <p class="small mt">${D.pay=='Накладений платіж'?`Клієнт сплачує ${M(sale)} при отриманні + доставку за тарифами пошти.`:'Клієнт оплачує на рахунок магазину — реквізити надішле менеджер.'}</p></div>
 <p class="err" id="serr"></p>`;
 mainBtn('Надіслати замовлення · '+M(sale),sendO)}
const seg=(n,opts)=>`<div class="seg">${opts.map(o=>`<button type="button" data-seg="${n}" data-v="${E(o)}" class="${D[n]==o?'on':''}">${E(o)}</button>`).join('')}</div>`;
function sources(){const a=me&&me.anketa&&me.anketa.answers||{},yes=PL.filter(p=>a[p[0]]&&a[p[0]].has).map(p=>p[1]);return [...yes,...PL.map(p=>p[1]).filter(p=>!yes.includes(p))]}
function ciHtml(x,k){const w=wholeU(x);return `<div class="ci" data-k="${k}">${x.img?`<img src="${E(x.img)}" alt="" loading="lazy">`:'<span class="ph"></span>'}
 <div class="t"><b>${E(x.name)}</b><small>рекомендована ${M(x.price)} · оптова ≈ ${M(w)}</small></div><button class="rm" data-rm="${k}" aria-label="Прибрати">${ico('trash')}</button>
 <div class="ctl"><div class="qty"><button data-qm="${k}" aria-label="Менше">${ico('minus')}</button><input inputmode="numeric" data-q="${k}" value="${x.q}" aria-label="Кількість"><button data-qp="${k}" aria-label="Більше">${ico('plus')}</button></div>
 <label class="pr ${x.sale<w?'bad':''}">ціна<input inputmode="decimal" data-sale="${k}" value="${x.sale}" aria-label="Ваша ціна для клієнта">₴</label>
 <div class="tot">${M(x.sale*x.q)}<small>+${M((x.sale-w)*x.q)}</small></div></div></div>`}
function sumHtml(){const sale=D.items.reduce((a,x)=>a+x.sale*x.q,0),whole=D.items.reduce((a,x)=>a+wholeU(x)*x.q,0);
 return `<div class="earn" id="sumb"><span>Сума для клієнта ${M(sale)}<small>ваш заробіток орієнтовно</small></span><b>+${M(sale-whole)}</b></div>`}
function bindCart(){
 const c=$('#cart');if(!c)return;
 const upd=k=>{const x=D.items[k],row=c.querySelector(`.ci[data-k="${k}"]`),w=wholeU(x);if(row){row.querySelector('.tot').innerHTML=`${M(x.sale*x.q)}<small>+${M((x.sale-w)*x.q)}</small>`;row.querySelector('.pr').classList.toggle('bad',x.sale<w)}
  const s=$('#sumb');if(s)s.outerHTML=sumHtml();const n=D.items.reduce((a,y)=>a+y.q,0);if(useMB())tg.MainButton.setText(`Далі: клієнт і доставка · ${n} шт`);else $('#fbMain').textContent=`Далі: клієнт і доставка · ${n} шт`};
 c.querySelectorAll('[data-q]').forEach(i=>i.addEventListener('input',()=>{const k=+i.dataset.q;D.items[k].q=Math.max(1,Math.min(9999,parseInt(i.value)||1));saveD();upd(k)}));
 c.querySelectorAll('[data-sale]').forEach(i=>i.addEventListener('input',()=>{const k=+i.dataset.sale;D.items[k].sale=Math.max(0,+i.value.replace(',','.').replace(/[^\d.]/g,'')||0);saveD();upd(k)}));
 c.querySelectorAll('[data-qm],[data-qp]').forEach(b=>b.onclick=()=>{const k=+(b.dataset.qm??b.dataset.qp),x=D.items[k];x.q=Math.max(1,x.q+(b.dataset.qm!=null?-1:1));hap('sel');saveD();c.querySelector(`[data-q="${k}"]`).value=x.q;upd(k)});
 c.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{D.items.splice(+b.dataset.rm,1);saveD();hap('light');draw()})}
function addItem(p,q=1){const x=D.items.find(i=>i.id==p.id);if(x)x.q+=q;else D.items.push({id:p.id,name:p.name,sku:p.sku||'',price:+p.price,sale:Math.ceil(+p.price),q,img:p.img||''});saveD()}
function toStep3(){
 const f=$('#cf'),el=f.elements,er=m=>{$('#cerr').textContent=m;hap('error')},bad=n=>{el[n].closest('.f').classList.add('bad');el[n].focus()};
 if(el.client.value.trim().length<2){bad('client');return er(ERR.client)}
 if(el.phone.value.replace(/\D/g,'').length<10){bad('phone');return er(ERR.phone)}
 if(!el.city.value.trim()){bad('city');return er(ERR.city)}
 if(!el.branch.value.trim()){bad('branch');return er('Вкажіть відділення або поштомат.')}
 step=3;draw();scrollTo(0,0)}
async function sendO(){
 if(!D.items.length){step=1;return draw()}
 mainBusy(true);okey=okey||Date.now().toString(36)+Math.random().toString(36).slice(2,8);
 const r=await api({action:'p_order',token,key:okey,via:'tg',order:{items:D.items.map(x=>({id:x.id,name:x.name,sku:x.sku,q:x.q,price:x.price,sale:x.sale})),
  client:D.client,phone:D.phone,city:D.city,branch:D.branch,delivery:D.delivery,pay:D.pay,source:D.source,note:D.note}});
 mainBusy(false);
 if(!r.ok){hap('error');if(r.error=='auth'){forget();return auth()}$('#serr').textContent=errMsg(r.error);return}
 hap('ok');okey='';sent=r.id;
 if(r.order){orders=[r.order,...orders.filter(o=>o.id!=r.order.id)];LS.set('da_orders',orders)}else refresh(true);
 D=Object.assign(blank(),{delivery:D.delivery,pay:D.pay});saveD();step=1;draw();scrollTo(0,0)}
function vSent(){
 $('#app').innerHTML=`<div class="card done"><div class="ok">${ico('check')}</div><h1 class="h1">Замовлення № ${E(sent)} надіслано</h1><p class="sub">Сповіщення про статус і ТТН прийдуть у чат з ботом.</p>
 <ol class="next"><li><b>Менеджер підтверджує</b>Перевіряє наявність — зазвичай протягом години в робочий час.</li><li><b>Ми відправляємо</b>У день замовлення. ТТН з’явиться в замовленні — перешліть її клієнту.</li><li><b>Клієнт забирає посилку</b>Заробіток переходить «до виплати».</li></ol></div>
 <div class="acts col"><button class="btn" data-again>${ico('plus')}Ще одне замовлення</button><button class="btn ghost" data-o="${E(sent)}">Відкрити замовлення</button></div>`;
 backBtn(()=>{sent=null;go('home')});mainOff()}

/* ---------- вибір товару (аркуш) ---------- */
let PQ={q:'',c:''};
async function pickSheet(){
 openSheet(`<div class="sh-top"><b class="h2">Додати товар</b><button class="sh-x" data-close aria-label="Закрити">${ico('x')}</button></div>
 <div class="srch">${ico('search')}<input id="pq" type="search" placeholder="Назва або артикул: 3D панель, плитка…" value="${E(PQ.q)}" autocomplete="off"></div>
 <div class="chips" id="pcs"></div><div id="pl"><div class="skel"></div><div class="skel"></div></div>`);
 const c=await loadCat();if(!$('#pl'))return;
 if(!c){$('#pl').innerHTML=`<div class="empty">Не вдалося завантажити каталог.<br><button class="btn sm" data-pick>Спробувати ще раз</button></div>`;return}
 if(PQ.c===''&&!PQ.t&&favL().length){PQ.c='__fav';PQ.t=1}
 const chips=()=>{$('#pcs').innerHTML=(favL().length?`<button data-pc="__fav" class="${PQ.c=='__fav'?'on':''}">★ Мої<i>${favL().length}</i></button>`:'')+`<button data-pc="" class="${PQ.c?'':'on'}">Усі</button>`+c.cats.map(x=>`<button data-pc="${E(x[0])}" class="${PQ.c==x[0]?'on':''}">${E(x[1])}</button>`).join('')};
 const list=()=>{const L=findP(PQ.q,PQ.c,60);$('#pl').innerHTML=L.length?L.map(p=>{const inC=D.items.some(i=>i.id==p.id);return `<button class="pick" data-add="${E(p.id)}"${p.av?'':' disabled'}>${p.img?`<img src="${E(p.img)}" alt="" loading="lazy">`:'<span class="ph"></span>'}<span class="t"><b>${E(p.name)}</b><small>${E(p.sku)}${p.av?'':' · немає в наявності'}</small></span><span class="p">${M(p.price)}<small>+${M(p.price-wholeU(p))}</small></span><span class="add ${inC?'in':''}">${ico(inC?'check':'plus')}</span></button>`}).join('')+(L.length==60?'<p class="small" style="text-align:center;padding:10px">Показано 60 — уточніть пошук</p>':''):'<div class="empty">Нічого не знайдено. Спробуйте інше слово або артикул.</div>'};
 chips();list();
 const i=$('#pq');i.addEventListener('input',()=>{PQ.q=i.value;if(PQ.c=='__fav'&&PQ.q.trim()){PQ.c='';chips()}list()});
 $('#pcs').onclick=e=>{const b=e.target.closest('[data-pc]');if(!b)return;PQ.c=b.dataset.pc;hap('sel');chips();list()};
 $('#pl').onclick=e=>{const b=e.target.closest('[data-add]');if(!b)return;const p=byId.get(b.dataset.add);if(!p)return;addItem(p);hap('light');
  const a=b.querySelector('.add');a.classList.add('in');a.innerHTML=ico('check');toast('Додано: '+p.name.slice(0,40));underSheet()}}
// оновити кошик під відкритим аркушем, не закриваючи його
function underSheet(){if(route=='new'&&step==1){draw();mainOff();backBtn(()=>closeSheet())}}
function manualItem(){
 openSheet(`<div class="sh-top"><b class="h2">Товар вручну</b><button class="sh-x" data-close aria-label="Закрити">${ico('x')}</button></div>
 <form id="mf" class="card" novalidate><label class="f"><span>Назва (як у прайсі)</span><input name="n" autocomplete="off"></label>
 <label class="f"><span>Рекомендована ціна за 1 шт, ₴</span><input name="p" inputmode="decimal" autocomplete="off"></label>
 <button class="btn wide">Додати</button></form>`);
 $('#mf').onsubmit=e=>{e.preventDefault();const n=e.target.n.value.trim(),p=+e.target.p.value.replace(',','.').replace(/[^\d.]/g,'');
  if(n.length<3)return toast('Вкажіть назву товару');if(!p)return toast('Вкажіть ціну числом');
  D.items.push({id:'',name:n,sku:'',price:p,sale:Math.ceil(p),q:1,img:''});saveD();closeSheet()}}

/* ---------- товари для продажу ---------- */
async function vCat(){
 $('#app').innerHTML=`<div class="row" style="margin:2px 2px 4px"><h1 class="h1 sp">Товари</h1></div><p class="sub" style="margin:0 2px 12px">Ціни зі складу, ваш заробіток і готові тексти оголошень</p>
 <div class="srch">${ico('search')}<input id="cq" type="search" placeholder="Пошук: 3D панель, плитка, SW-…" value="${E(C.q)}" autocomplete="off"></div>
 <div class="chips" id="ccs"></div><div id="cg"><div class="grid"><div class="skel" style="height:220px"></div><div class="skel" style="height:220px"></div></div></div>`;
 const c=await loadCat();if(route!='cat')return;
 if(!c){$('#cg').innerHTML=`<div class="card empty">Не вдалося завантажити каталог.<br><button class="btn sm" data-go2="cat">Спробувати ще раз</button></div>`;return}
 if(!C.t&&favL().length){C.c='__fav';C.t=1}
 const chips=()=>{const nf=favL().length;if(C.c=='__fav'&&!nf)C.c='';$('#ccs').innerHTML=(nf?`<button data-cc="__fav" class="${C.c=='__fav'?'on':''}">★ Мої<i>${nf}</i></button>`:'')+`<button data-cc="" class="${C.c?'':'on'}">Усі<i>${c.items.length}</i></button>`+c.cats.map(x=>`<button data-cc="${E(x[0])}" class="${C.c==x[0]?'on':''}">${E(x[1])}<i>${x[2]}</i></button>`).join('')};
 const grid=()=>{const L=findP(C.q,C.c),S=L.slice(0,C.n);
  $('#cg').innerHTML=L.length?`<div class="grid">${S.map(p=>`<button class="pc ${p.av?'':'off'}" data-p="${E(p.id)}"><span class="im">${p.img?`<img src="${E(p.img)}" alt="" loading="lazy">`:''}${p.av?'':'<span class="out">немає</span>'}</span><span class="bd"><b>${E(p.name)}</b><span class="p">${M(p.price)}</span><small>заробіток від ${M(p.price-wholeU(p))}</small></span></button>`).join('')}</div>
   ${L.length>S.length?`<button class="more" id="cmore">Показати ще (${L.length-S.length})</button>`:''}<p class="small" style="text-align:center;margin:10px 0">Каталог оновлено ${E(c.updated)}</p>`:'<div class="card empty">Нічого не знайдено</div>';
  const m=$('#cmore');if(m){m.onclick=()=>{C.n+=30;grid()};if('IntersectionObserver' in window){const io=new IntersectionObserver(es=>{if(es[0].isIntersecting){io.disconnect();C.n+=30;grid()}},{rootMargin:'400px'});io.observe(m)}}};
 chips();grid();
 const i=$('#cq');i.addEventListener('input',()=>{C.q=i.value;C.n=30;if(C.c=='__fav'&&C.q.trim()){C.c='';chips()}grid()});
 $('#ccs').onclick=e=>{const b=e.target.closest('[data-cc]');if(!b)return;C.c=b.dataset.cc;C.n=30;hap('sel');chips();grid();scrollTo(0,0)}}
function prodSheet(id){
 const p=byId.get(id);if(!p)return;const w=wholeU(p),inC=D.items.find(i=>i.id==p.id);
 openSheet(`<div class="sh-top"><b class="h2" style="font-size:15px">${E(catName(p.cat)||'Товар')}</b><button class="sh-x" data-close aria-label="Закрити">${ico('x')}</button></div>
 ${p.img?`<div class="pimg"><img src="${E(p.img)}" alt=""></div>`:''}
 <b class="h2">${E(p.name)}</b><p class="small" style="margin-top:4px">${E(p.sku)} · ${p.av?(p.qty>0?`в наявності: ${p.qty} шт`:'в наявності'):'немає в наявності'}</p>
 <div class="price3"><div><span>Рекомендована</span><b>${M(p.price)}</b></div><div><span>Ваша оптова ≈</span><b>${M(w)}</b></div><div class="g"><span>Заробіток</span><b>+${M(p.price-w)}</b></div></div>
 <p class="small" style="margin:-4px 2px 12px">Можете продавати дорожче — різниця теж ваша. Оптова ціна залежить від рівня (${E(me.level||'Starter')}, −${margin()}%).</p>
 <div class="acts col"><button class="btn line" data-fv="${E(p.id)}">${isFav(p.id)?'★ У моїх товарах — прибрати':'☆ Додати в мої товари'}</button>${p.av?`<button class="btn" data-padd="${E(p.id)}">${ico(inC?'check':'plus')}${inC?'Вже в замовленні · ще 1':'Додати в замовлення'}</button>`:''}<button class="btn ghost" data-copy="${E(adText(p))}" data-cm="Текст оголошення скопійовано">${ico('copy')}Текст оголошення</button></div>
 <div class="list mt"><button class="li" data-url="${SITE}p/${encodeURIComponent(p.id)}.html"><span class="ic">${ico('link')}</span><span class="t"><b>Сторінка товару</b><small>Опис, характеристики, усі фото</small></span>${ico('chev')}</button>
 ${p.img?`<button class="li" data-url="${E(p.img)}"><span class="ic">${ico('grid')}</span><span class="t"><b>Відкрити фото</b><small>Збережіть для оголошення</small></span>${ico('chev')}</button>`:''}
 <button class="li" data-copy="${SITE}p/${encodeURIComponent(p.id)}.html" data-cm="Посилання скопійовано"><span class="ic">${ico('copy')}</span><span class="t"><b>Копіювати посилання</b><small>Щоб показати клієнту</small></span></button></div>`)}

/* ---------- профіль ---------- */
function vProfile(){
 const L=lvl();
 $('#app').innerHTML=`<div class="hello"><span class="ava">${E(first(me.name).slice(0,1).toUpperCase())}</span><div class="sp"><div class="h1">${E(me.name)}</div><span class="sub">${E(me.id)} · +${E(me.phone)}</span></div></div>
 <div class="card"><div class="row"><div class="sp"><b class="h2">Рівень ${E(L[0])}</b><p class="small">Маржа ≈ ${margin()}% від рекомендованої ціни</p></div><span class="lv"><b>${margin()}%</b></span></div>
  <p class="small mt">Starter 10% → Pro 15% (від ${M(20000)} обороту на місяць) → Team 20% (від ${M(80000)}). Рівень підвищує менеджер, коли оборот стабільний.</p></div>
 <div class="h3">Мої дані</div>
 <form id="pf" class="card" novalidate>
  <label class="f"><span>Ім’я</span><input name="name" value="${E(me.name)}"></label>
  <div class="f2"><label class="f"><span>Місто</span><input name="city" value="${E(me.city||'')}"></label><label class="f"><span>Telegram / Viber</span><input name="msg" value="${E(me.msg||'')}"></label></div>
  <label class="f"><span>Реквізити для виплат</span><textarea name="payout" placeholder="Номер картки або IBAN, ПІБ отримувача">${E(me.payout||'')}</textarea></label>
  <button class="btn wide">Зберегти</button></form>
 <div class="h3">Анкета й навчання</div>
 <div class="list"><button class="li" data-anketa><span class="ic">${ico('info')}</span><span class="t"><b>Анкета партнера</b><small>${me.anketaAt?'Заповнена — можна оновити':'Ще не заповнена'}</small></span>${ico('chev')}</button>
  <button class="li" data-url="${SITE}partners.html"><span class="ic">${ico('grid')}</span><span class="t"><b>Товари для продажу на сайті</b><small>Повні тексти й усі фото</small></span>${ico('chev')}</button>
  <button class="li" data-url="${SITE}academy.html"><span class="ic">${ico('book')}</span><span class="t"><b>Академія партнера</b></span>${ico('chev')}</button>
  <button class="li" data-url="${SITE}course-sales3.html"><span class="ic">${ico('spark')}</span><span class="t"><b>Курс «Продажі 3.0»</b><small>Скрипти відповідей клієнтам</small></span>${ico('chev')}</button></div>
 <div class="h3">Вхід на сайті</div>
 <form id="pwf" class="card" novalidate><p class="small" style="margin-bottom:10px">Кабінет є й на сайті samostroy.shop/kabinet.html — логін ваш телефон. Задайте пароль, щоб входити з комп’ютера.</p>
  <label class="f"><span>Новий пароль</span><input name="pw" type="password" autocomplete="new-password" minlength="6"></label><button class="btn ghost wide">Зберегти пароль</button></form>
 <div class="list"><button class="li" data-mgr><span class="ic">${ico('chat')}</span><span class="t"><b>Написати менеджеру</b><small>@${E(MGR)}</small></span>${ico('chev')}</button>
  <button class="li" data-unlink><span class="ic" style="background:color-mix(in srgb,var(--bad) 12%,var(--card))"><svg class="i" style="color:var(--bad)"><use href="#i-lock"/></svg></span><span class="t"><b style="color:var(--bad)">Відв’язати Telegram</b><small>Кабінет і замовлення залишаться</small></span></button></div>
 <p class="small" style="text-align:center;margin:14px 0 4px">Samostroy Drop · партнер з ${me.created?new Date(me.created).toLocaleDateString('uk-UA'):''}</p>`;
 $('#pf').onsubmit=async e=>{e.preventDefault();const el=e.target.elements,b=e.target.querySelector('.btn');b.classList.add('busy');
  const r=await api({action:'p_profile',token,name:el.name.value,city:el.city.value,msg:el.msg.value,payout:el.payout.value});b.classList.remove('busy');
  if(!r.ok){hap('error');return toast(errMsg(r.error))}keep(r);hap('ok');toast('Збережено')};
 $('#pwf').onsubmit=async e=>{e.preventDefault();const v=e.target.pw.value;if(v.length<6){hap('error');return toast(ERR.password)}const b=e.target.querySelector('.btn');b.classList.add('busy');
  const r=await api({action:'p_profile',token,newPassword:v});b.classList.remove('busy');if(!r.ok){hap('error');return toast(errMsg(r.error))}e.target.pw.value='';hap('ok');toast('Пароль збережено. Логін на сайті — ваш телефон')}}

/* ---------- аркуш ---------- */
function openSheet(html){const s=$('#sheet');s.querySelector('.sheet-in').innerHTML=html;s.hidden=false;document.body.style.overflow='hidden';
 mainOff();backBtn(()=>closeSheet())}
function closeSheet(silent){const s=$('#sheet');if(s.hidden)return;s.hidden=true;document.body.style.overflow='';
 if(silent)return;backOff();if(route=='new'||route=='order')draw()}

/* ---------- події ---------- */
document.addEventListener('click',e=>{
 const b=e.target.closest('button,a,[data-close]');if(!b)return;const d=b.dataset;
 if(d.close!==undefined)return closeSheet();
 if(d.go2){hap('sel');return go(d.go2)}
 if(d.o){hap('light');return go('order',d.o)}
 if(d.flt){O.flt=d.flt;hap('sel');return vOrders()}
 if(d.refresh!==undefined){b.classList.add('busy');return refresh(false,1).then(()=>{b.classList.remove('busy');toast('Оновлено')})}
 if(d.copy!==undefined)return copy(d.copy,d.cm);
 if(d.url)return openUrl(d.url);
 if(d.mgr!==undefined)return openTg(mgrUrl(d.mgr?`Добрий день! Питання щодо замовлення № ${d.mgr} (партнер ${me&&me.id}).`:''));
 if(d.anketa!==undefined){LS.set('pk_token',token);LS.set('pk_me',me);location.href='../anketa.html?kab=1&app=1';return}
 if(d.cancel!==undefined)return cancelO();
 if(d.repeat!==undefined)return repeatO();
 if(d.again!==undefined){sent=null;step=1;return draw()}
 if(d.pick!==undefined)return pickSheet();
 if(d.manual!==undefined)return manualItem();
 if(d.clear!==undefined)return ask('Прибрати всі товари з чернетки?',()=>{D.items=[];saveD();draw()});
 if(d.step){step=+d.step;draw();return scrollTo(0,0)}
 if(d.p)return prodSheet(d.p);
 if(d.fv){const on=favToggle(d.fv);hap(on?'ok':'light');b.textContent=on?'★ У моїх товарах — прибрати':'☆ Додати в мої товари';toast(on?'Додано в «Мої товари»':'Прибрано з «Моїх товарів»');if(route=='cat'&&C.c=='__fav'){const y=scrollY;vCat().then(()=>scrollTo(0,y))}return}
 if(d.padd){const p=byId.get(d.padd);if(p){addItem(p);hap('ok');closeSheet(true);backOff();step=1;sent=null;go('new');toast('Додано в замовлення')}return}
 if(d.unlink!==undefined)return ask('Відв’язати Telegram від кабінету? Сповіщення в бот більше не приходитимуть.',async()=>{const r=await api({action:'tg_unlink',token});if(!r.ok)return toast(errMsg(r.error));forget();$('#nav').hidden=true;welcome({})});
});
window.addEventListener('hashchange',()=>{const r=route,a=arg;parseHash();if(me&&(r!=route||a!=arg))draw()});

boot();
})();
