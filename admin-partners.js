/* Адмінка → «Партнери»: проста CRM для замовлень з особистого кабінету партнерів, самих партнерів і виплат.
   Працює поверх основного скрипта admin.html (pass, esc, money, fdt, toast, copy, dr, track) і окремого скрипта Google (CFG.papi). */
window.PA=(()=>{
const PAPI=(window.CFG&&CFG.papi)||'';
const STS=['Нове','Підтверджене','Відправлене','Отримане','Виплачено','Скасоване','Повернення'];
const COL={'Нове':'var(--s-new)','Підтверджене':'var(--s-conf)','Відправлене':'var(--s-sent)','Отримане':'var(--s-done)','Виплачено':'#1f7a45','Скасоване':'var(--s-canc)','Повернення':'var(--bad)'};
const HINT={'Нове':'Зателефонуйте партнеру або клієнту й підтвердіть','Підтверджене':'Зберіть і відправте, впишіть ТТН','Відправлене':'Чекаємо, поки клієнт забере','Отримане':'Клієнт забрав — заробіток до виплати','Виплачено':'Партнеру виплачено','Скасоване':'Не відправлялось','Повернення':'Клієнт не забрав або повернув'};
const LV={Starter:10,Pro:15,Team:20};
const WORK=['Нове','Підтверджене','Відправлене'],CANC=['Скасоване','Повернення'];
const S={own:[],ownTab:'На модерації',refs:[],partners:[],orders:[],loaded:false,loading:false,at:0,err:'',sub:'orders',tab:'Нове',q:'',pid:'',n:60};
let co=null,cp=null;
const $v=()=>document.getElementById('v-partners');
const earn=o=>o.earnNow!=null?+o.earnNow:(o.earnFinal!=null?+o.earnFinal:+o.earn||0);
const pill=s=>`<span class="st" style="--c:${COL[s]||'var(--soft)'}">${esc(s)}</span>`;
const t=s=>+new Date(s)||0;
const pById=id=>S.partners.find(p=>p.id==id);
const ERRS={auth:'Пароль адмінки не збігається з ADMIN_PASS у скрипті кабінету',locked:'Забагато невдалих спроб, зачекайте 15 хвилин',net:'Немає зв’язку зі скриптом кабінету',server:'Помилка скрипта кабінету',notfound:'Запис не знайдено',ref:'Такого ID запрошувача немає (або це сам партнер)'};
const errT=e=>ERRS[e]||('Помилка: '+e);

async function call(b){
 if(!PAPI)return{ok:false,error:'noapi'};
 const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),30000);
 try{const r=await fetch(PAPI,{method:'POST',body:JSON.stringify({...b,pass}),signal:ac.signal,redirect:'follow'});return await r.json()}
 catch(e){return{ok:false,error:'net'}}finally{clearTimeout(tm)}}
async function load(quiet){
 if(!PAPI||S.loading)return;S.loading=true;
 const r=await call({action:'a_list'});S.loading=false;S.at=Date.now();
 if(!r.ok){S.err=errT(r.error);if(!quiet)toast(S.err);if(view=='partners')draw();return}
 S.err='';S.loaded=true;S.partners=r.partners||[];S.refs=r.refs||[];S.cfg=r.ref||null;S.own=r.own||[];S.orders=(r.orders||[]).sort((a,b)=>t(b.created)-t(a.created));S.bot=r.bot||'';
 if(r.hidden&&window.onHidden)onHidden(r.hidden);
 badge();if(view=='partners')draw()}
function badge(){const b=document.getElementById('b-par');if(b)b.textContent=S.orders.filter(o=>o.status=='Нове').length||''}
function tick(){if(PAPI&&pass&&!S.loading&&(!S.loaded||Date.now()-S.at>60000))load(true)}

/* ---------- розрахунки ---------- */
function pStats(id){const L=S.orders.filter(o=>o.partnerId==id),live=L.filter(o=>!CANC.includes(o.status));
 return{n:L.length,live:live.length,turn:live.reduce((a,o)=>a+(+o.sale||0)-(+o.own||0),0),own:live.reduce((a,o)=>a+(+o.own||0),0),earn:live.filter(o=>o.status=='Отримане'||o.status=='Виплачено').reduce((a,o)=>a+earn(o),0),
  due:live.filter(o=>o.status=='Отримане').reduce((a,o)=>a+earn(o),0),dueN:live.filter(o=>o.status=='Отримане').length,work:live.filter(o=>WORK.includes(o.status)).length,last:L[0]&&L[0].created}}

const refDue=id=>S.refs.filter(x=>x.status=='До виплати'&&(!id||x.refId==id));
const rsum=L=>L.reduce((a,x)=>a+(+x.bonus||0),0);
/* ---------- екрани ---------- */
function draw(){const v=$v();if(!v)return;
 const head=`<div class="sh"><div><h1>Партнери</h1><p>Замовлення з особистого кабінету партнерів, партнери й виплати. <a href="kabinet.html" target="_blank" rel="noopener">Особистий кабінет партнера</a></p></div>
  <div class="sh-a">${PAPI?`<button class="btn ghost sm" data-pa="reload">Оновити</button>`:''}</div></div>`;
 if(!PAPI){v.innerHTML=head+`<div class="box"><h4>Кабінет партнерів ще не підключено</h4>
  <p class="note" style="font-size:14px;line-height:1.6">1. Створіть Google Таблицю «Samostroy — партнери» → Розширення → Apps Script.<br>2. Вставте код з файлу <b>tools/partner-api/Code.gs</b> (GitHub), задайте властивості ADMIN_PASS (як тут), TG_TOKEN і TG_CHAT.<br>3. Розгорнути → Нове розгортання → Вебзастосунок, доступ «Усі».<br>4. Вставте адресу в <b>config.js</b> → <code>papi:'…'</code>.<br>Покрокова інструкція — tools/partner-api/ЯК-ЗАПУСТИТИ.md.</p></div>`;return}
 if(!S.loaded){v.innerHTML=head+(S.err?`<div class="box"><p>${esc(S.err)}</p><div class="acts" style="margin-top:10px"><button class="btn sm" data-pa="reload">Спробувати ще раз</button></div></div>`:'<div class="box empty">Завантаження…</div>');if(!S.err)load();return}
 const O=S.orders,nNew=O.filter(o=>o.status=='Нове').length,work=O.filter(o=>WORK.includes(o.status)),due=O.filter(o=>o.status=='Отримане');
 const ms=new Date();ms.setDate(1);ms.setHours(0,0,0,0);const mo=O.filter(o=>t(o.created)>=+ms&&!CANC.includes(o.status));
 const act=S.partners.filter(p=>p.status!='Заблокований');
 v.innerHTML=head+`<div class="stats">
  <button class="stat${nNew?' hot':''}" data-psub="orders" data-pft="Нове"><span>Нові замовлення</span><b>${nNew}</b><small>${nNew?'потрібно підтвердити':'усе опрацьовано'}</small></button>
  <button class="stat" data-psub="orders" data-pft="work"><span>У роботі</span><b>${work.length}</b><small>підтверджені й у дорозі</small></button>
  <button class="stat${due.length||refDue().length?' hot':''}" data-psub="pay"><span>До виплати партнерам</span><b>${money(due.reduce((a,o)=>a+earn(o),0)+rsum(refDue()))}</b><small>${pl(due.length,'замовлення','замовлення','замовлень')}${refDue().length?' + бонуси за рекомендації':''}</small></button>
  <div class="stat"><span>Оборот партнерів за місяць</span><b>${money(mo.reduce((a,o)=>a+(+o.sale||0),0))}</b><small>${pl(mo.length,'замовлення','замовлення','замовлень')} · ${pl(act.length,'партнер','партнери','партнерів')}</small></div></div>
 <div class="chips">${[['orders','Замовлення',O.length],['people','Партнери',S.partners.length],['pay','Виплати',new Set(due.map(o=>o.partnerId).concat(refDue().map(x=>x.refId))).size]].concat(S.own.length||S.partners.some(p=>p.feat&&p.feat.own)?[['own','Власні товари',S.own.filter(x=>x.status=='На модерації').length]]:[]).map(([k,l,n])=>`<button data-psub="${k}" class="${S.sub==k?'on':''}">${l}<i>${n}</i></button>`).join('')}</div>
 <div id="pa-body"></div>`;
 ({orders:dOrders,people:dPeople,pay:dPay,own:dOwn})[S.sub]()}

function match(o,q){if(!q)return true;const qd=q.replace(/\D/g,'');
 return [o.id,o.partner,o.partnerId,o.client,o.city,o.branch,o.ttn,(o.items||[]).map(x=>x.name+' '+x.sku).join(' ')].join(' ').toLowerCase().includes(q)||(qd.length>=3&&String(o.phone).includes(qd))}
function dOrders(){
 const q=S.q.trim().toLowerCase(),base=S.orders.filter(o=>(!S.pid||o.partnerId==S.pid)&&match(o,q));
 const inTab=o=>S.tab=='all'?1:S.tab=='work'?WORK.includes(o.status):o.status==S.tab;
 const L=base.filter(inTab),p=S.pid&&pById(S.pid);
 document.getElementById('pa-body').innerHTML=`<div class="tools"><input class="sr" id="pa-q" type="search" placeholder="Пошук: №, партнер, клієнт, телефон, ТТН, товар" value="${esc(S.q)}" aria-label="Пошук замовлень партнерів">
  ${p?`<button class="btn ghost sm" data-pa="allp">Партнер: ${esc(p.name)} ✕</button>`:''}<button class="btn ghost sm" data-pa="csv">CSV</button></div>
 <div class="tabs">${[['all','Усі'],['work','У роботі'],...STS.map(s=>[s,s])].map(([k,l])=>`<button data-pft="${esc(k)}" class="${S.tab==k?'on':''}">${esc(l)}<i>${base.filter(o=>k=='all'?1:k=='work'?WORK.includes(o.status):o.status==k).length}</i></button>`).join('')}</div>
 ${S.tab in HINT?`<p class="note" style="margin:-4px 0 10px">${esc(HINT[S.tab])}</p>`:''}
 <div class="list">${L.length?`<div class="row head pa-row"><span>№</span><span>Дата</span><span>Партнер</span><span>Клієнт · товари</span><span class="sum">Сума / заробіток</span><span>Статус</span></div>`+L.slice(0,S.n).map(o=>`<button class="row pa-row${o.status=='Нове'?' new':''}" data-poid="${esc(o.id)}">
  <span class="id">${esc(o.id)}</span><span class="dt">${fdt(t(o.created))}</span>
  <span class="cu"><b>${esc(o.partner)}</b><span>${esc(o.partnerId)}${pById(o.partnerId)?' · '+esc(pById(o.partnerId).level):''}</span></span>
  <span class="it"><b class="pa-cl">${esc(o.client)} · ${esc(o.city)}</b> ${esc((o.items||[]).map(x=>clean(x.name)+(x.q>1?' ×'+x.q:'')).join('; '))}</span>
  <span class="sum">${money(o.sale)}<small class="pa-e">+${money(earn(o))}${o.earnFinal==null?' ≈':''}</small></span><span class="stc">${pill(o.status)}</span></button>`).join('')+(L.length>S.n?`<div class="row head" style="justify-content:center;display:flex"><button class="btn ghost sm" data-pa="more">Показати ще</button></div>`:''):'<div class="empty">Тут поки порожньо</div>'}</div>`;
 const i=document.getElementById('pa-q');i.addEventListener('input',()=>{S.q=i.value;S.n=60;const pos=i.selectionStart;dOrders();const j=document.getElementById('pa-q');j.focus();j.setSelectionRange(pos,pos)})}
function dPeople(){
 const q=S.q.trim().toLowerCase();
 const L=S.partners.filter(p=>!q||[p.id,p.name,p.phone,p.city,p.msg].join(' ').toLowerCase().includes(q)).map(p=>({p,s:pStats(p.id)})).sort((a,b)=>t(b.s.last||b.p.created)-t(a.s.last||a.p.created));
 document.getElementById('pa-body').innerHTML=`<div class="tools"><input class="sr" id="pa-q" type="search" placeholder="Пошук: ім’я, телефон, місто, ID" value="${esc(S.q)}" aria-label="Пошук партнерів"></div>
 <div class="list">${L.length?`<div class="row head pa-prow"><span>ID</span><span>Партнер</span><span>Рівень · замовлення</span><span class="sum">Оборот / заробіток</span><span>Анкета · статус</span></div>`+L.map(({p,s})=>`<button class="row pa-prow" data-pid="${esc(p.id)}">
  <span class="id">${esc(p.id)}</span><span class="cu"><b>${esc(p.name)}</b><span>+${esc(p.phone)}${p.city?' · '+esc(p.city):''}</span></span>
  <span class="dt"><span class="pa-lv">${esc(p.level||'Starter')}</span> ${pl(s.n,'замовлення','замовлення','замовлень')}${s.work?` · ${s.work} у роботі`:''}</span>
  <span class="sum">${money(s.turn)}<small class="pa-e">+${money(s.earn)}${s.due?` · до виплати ${money(s.due)}`:''}</small></span>
  <span class="stc">${p.anketaAt?'<span class="st" style="--c:var(--ok)">анкета</span>':'<span class="st" style="--c:var(--s-canc)">без анкети</span>'}${p.status=='Заблокований'?' <span class="st" style="--c:var(--bad)">блок</span>':''}</span></button>`).join(''):'<div class="empty">Партнерів поки немає. Посилання на реєстрацію: samostroy.shop/kabinet.html#reg</div>'}</div>`;
 const i=document.getElementById('pa-q');i.addEventListener('input',()=>{S.q=i.value;const pos=i.selectionStart;dPeople();const j=document.getElementById('pa-q');j.focus();j.setSelectionRange(pos,pos)})}
function dPay(){
 const by={};S.orders.filter(o=>o.status=='Отримане').forEach(o=>{(by[o.partnerId]=by[o.partnerId]||[]).push(o)});
 refDue().forEach(x=>{by[x.refId]=by[x.refId]||[]});
 const L=Object.entries(by).map(([id,os])=>{const rb=refDue(id);return{p:pById(id)||{id,name:os[0]?os[0].partner:(rb[0]&&rb[0].refName)||id},os,rb,sum:os.reduce((a,o)=>a+earn(o),0)+rsum(rb)}}).sort((a,b)=>b.sum-a.sum);
 document.getElementById('pa-body').innerHTML=`<p class="note" style="margin-bottom:10px">Тут замовлення зі статусом «Отримане» — клієнт забрав посилку, заробіток партнера ще не виплачено. Після переказу натисніть «Позначити виплаченим» — статуси зміняться на «Виплачено», партнер побачить це в кабінеті.</p>
 ${L.length?`<div class="pa-pay">${L.map(x=>`<div class="box"><div class="pa-ph"><div><b>${esc(x.p.name)}</b><span class="note">${esc(x.p.id)}${x.p.phone?' · +'+esc(x.p.phone):''}</span></div><b class="pa-sum">${money(x.sum)}</b></div>
  <dl class="kv">${x.os.length?`<dt>Замовлення</dt><dd>${x.os.map(o=>`<button class="link" data-poid="${esc(o.id)}">${esc(o.id)}</button> ${money(earn(o))}${o.earnFinal==null?' ≈':''}`).join(', ')}</dd>`:''}
  ${x.rb.length?`<dt>Бонуси за рекомендації</dt><dd>${x.rb.map(r=>`<button class="link" data-poid="${esc(r.order)}">${esc(r.order)}</button> ${esc(r.partner)} · ${r.pct}% — ${money(r.bonus)}`).join(', ')}</dd>`:''}
  <dt>Реквізити</dt><dd>${x.p.payout?esc(x.p.payout):'<span class="note">не вказані в профілі — уточніть у партнера</span>'}</dd></dl>
  ${x.os.some(o=>o.earnFinal==null)?'<p class="note" style="margin-top:8px">≈ — орієнтовний заробіток. Відкрийте замовлення, щоб вписати точну суму.</p>':''}
  <div class="acts" style="margin-top:12px"><button class="btn sm" data-pa="pay" data-pp="${esc(x.p.id)}">Позначити виплаченим · ${money(x.sum)}</button>${x.p.payout?`<button class="btn ghost sm" data-pa="cpay" data-pp="${esc(x.p.id)}">Копіювати реквізити</button>`:''}</div></div>`).join('')}</div>`:'<div class="box empty">Немає замовлень до виплати</div>'}`}

/* ---------- власні товари партнерів: модерація ---------- */
function dOwn(){
 const T=[['На модерації','На перевірці'],['Схвалено','Схвалені'],['Відхилено','Відхилені'],['','Усі']],L=S.own.filter(x=>!S.ownTab||x.status==S.ownTab);
 document.getElementById('pa-body').innerHTML=`<p class="note" style="margin-bottom:10px">Товари, яких немає в каталозі, — партнери додають їх самі (якщо в картці партнера увімкнено «Власні товари»). На вітрину потрапляють лише схвалені. Обираєте, хто відправляє: <b>партнер сам</b> (гроші від покупця отримує він) або <b>магазин</b> (тоді вкажіть закупівельну — заробіток партнера = ціна − закупівельна).</p>
 <div class="chips" style="margin-bottom:12px">${T.map(([k,l])=>`<button data-pa="owntab" data-ot="${esc(k)}" class="${S.ownTab==k?'on':''}">${l}<i>${S.own.filter(x=>!k||x.status==k).length}</i></button>`).join('')}</div>
 ${L.length?`<div class="pa-own">${L.map(ownBox).join('')}</div>`:'<div class="box"><p class="note">Тут порожньо.</p></div>'}`;
 document.querySelectorAll('.pa-own [data-ocost]').forEach(i=>i.addEventListener('input',()=>{const x=S.own.find(y=>y.id==i.dataset.ocost),e=document.getElementById('ow-e-'+x.id),c=+i.value||0;if(e)e.textContent=c?`Заробіток партнера з одиниці: ${money(x.price-c)}`:''}));
 document.querySelectorAll('.pa-own [name^=ow-ship-]').forEach(r=>r.addEventListener('change',()=>{const id=r.name.slice(8),w=document.getElementById('ow-cw-'+id);if(w)w.hidden=r.value!='shop'}))}
function ownBox(x){const p=pById(x.partnerId)||{name:x.partner,id:x.partnerId},shop=x.ship=='shop',pill2={'На модерації':'⏳ на перевірці','Схвалено':'✅ схвалено','Відхилено':'✖️ відхилено'}[x.status]||x.status;
 return `<div class="box pa-ob"><div class="pa-oph">${(x.photos||[]).map(u=>`<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="" loading="lazy"></a>`).join('')}</div>
 <div class="pa-obb"><div class="pa-ph"><div><b>${esc(x.name)}</b><span class="note">${esc(x.id)} · <button class="link" data-pid="${esc(p.id)}">${esc(p.name)}</button> · ${pill2}${x.status=='Схвалено'?' · '+(shop?'відправляє магазин, закупівельна '+money(x.cost):'відправляє партнер'):''}</span></div><b class="pa-sum">${money(x.price)}</b></div>
  <dl class="kv">${x.cat?`<dt>Категорія</dt><dd>${esc(x.cat)}</dd>`:''}${x.sku?`<dt>Артикул</dt><dd>${esc(x.sku)}</dd>`:''}<dt>Наявність</dt><dd>${x.av?'в наявності':'немає'}</dd>${x.desc?`<dt>Опис</dt><dd style="white-space:pre-line">${esc(x.desc)}</dd>`:''}<dt>Оновлено</dt><dd>${x.updated?fdt(t(x.updated)):'—'}</dd></dl>
  <div class="pa-om"><div class="lbl">Хто відправляє покупцю</div>
   <label class="pa-r"><input type="radio" name="ow-ship-${esc(x.id)}" value="partner"${shop?'':' checked'}> Партнер сам — оплату отримує він</label>
   <label class="pa-r"><input type="radio" name="ow-ship-${esc(x.id)}" value="shop"${shop?' checked':''}> Магазин — партнер отримує різницю</label>
   <div id="ow-cw-${esc(x.id)}"${shop?'':' hidden'}><label class="pa-r">Закупівельна за одиницю, ₴ <input data-ocost="${esc(x.id)}" id="ow-c-${esc(x.id)}" inputmode="numeric" value="${shop?x.cost:''}" style="max-width:110px"></label><span class="note" id="ow-e-${esc(x.id)}">${shop?'Заробіток партнера з одиниці: '+money(x.price-x.cost):''}</span></div>
   <input id="ow-n-${esc(x.id)}" placeholder="Коментар партнеру (для відхилення — причина)" value="${esc(x.note||'')}" style="margin-top:8px">
   <div class="acts" style="margin-top:10px"><button class="btn sm" data-pa="ownok" data-oid="${esc(x.id)}">${x.status=='Схвалено'?'Зберегти умови':'✅ Схвалити'}</button>${x.status!='Відхилено'?`<button class="btn ghost sm" data-pa="ownno" data-oid="${esc(x.id)}">${x.status=='Схвалено'?'Зняти з продажу':'✖️ Відхилити'}</button>`:''}</div></div></div></div>`}

/* ---------- картка замовлення ---------- */
function oText(o){return `Замовлення партнера № ${o.id}\n${(o.items||[]).map((x,i)=>`${i+1}. ${clean(x.name)}${x.sku?' ('+x.sku+')':''} × ${x.q} — ${money(x.sale*x.q)}`).join('\n')}\nСума для клієнта: ${money(o.sale)}${/наклад/i.test(o.pay)?` (накладений платіж ${money(o.sale)})`:''}\nОтримувач: ${o.client}, +${o.phone}\n${[o.delivery,o.city,o.branch].filter(Boolean).join(', ')}\nОплата: ${o.pay||'—'}${o.note?'\nКоментар партнера: '+o.note:''}`}
function openO(id){const o=S.orders.find(x=>x.id==id);if(!o)return;co={...o};cp=null;const p=pById(o.partnerId)||{};
 $('#dtitle').textContent='Замовлення партнера № '+o.id;$('#dsub').textContent=fdt(t(o.created))+' · '+o.partner;
 $('#dbody').innerHTML=`<div class="sec"><h3>Статус</h3><div class="seg" id="pa-seg">${STS.map(s=>`<button style="--c:${COL[s]}" data-pst="${esc(s)}" class="${o.status==s?'on':''}">${esc(s)}</button>`).join('')}</div><p class="note" id="pa-hint" style="margin-top:6px">${esc(HINT[o.status]||'')}</p></div>
 <div class="sec"><h3>Партнер</h3><dl class="kv"><dt>Партнер</dt><dd><button class="link" data-pid="${esc(o.partnerId)}">${esc(o.partner)}</button> · ${esc(o.partnerId)} · ${esc(p.level||'Starter')}</dd><dt>Телефон</dt><dd>${p.phone?`<a href="tel:+${esc(p.phone)}">+${esc(p.phone)}</a>`:'—'}</dd>${p.msg?`<dt>Зв’язок</dt><dd>${esc(p.msg)}</dd>`:''}<dt>Звідки клієнт</dt><dd>${esc(o.source||'—')}</dd></dl></div>
 <div class="sec"><h3>Клієнт і доставка</h3><dl class="kv"><dt>Отримувач</dt><dd>${esc(o.client)}</dd><dt>Телефон</dt><dd><a href="tel:+${esc(o.phone)}"><b>+${esc(o.phone)}</b></a></dd><dt>Доставка</dt><dd>${esc([o.delivery,o.city,o.branch].filter(Boolean).join(', '))}</dd><dt>Оплата</dt><dd>${esc(o.pay||'—')}</dd>${o.note?`<dt>Коментар партнера</dt><dd>${esc(o.note)}</dd>`:''}</dl></div>
 <div class="sec"><h3>Товари</h3><div class="its">${(o.items||[]).map(x=>`<div><span>${x.id?`<a href="${SITE}p/${encodeURIComponent(x.id)}.html" target="_blank" rel="noopener">${esc(clean(x.name))}</a>`:esc(x.name)}<small>${esc(x.sku||'')} · рекомендована ${money(x.price)} · партнер продає по ${money(x.sale)}</small></span><span>× ${x.q}</span><span>${money(x.sale*x.q)}</span></div>`).join('')}<div><span>Сума для клієнта</span><span></span><span>${money(o.sale)}</span></div></div></div>
 <div class="sec"><h3>Заробіток партнера</h3><dl class="kv"><dt>Оптова ≈</dt><dd>${money(o.whole)} (рівень ${esc(p.level||'Starter')}, −${LV[p.level]||10}%)</dd><dt>Заробіток ≈</dt><dd>${money(o.earn)}</dd></dl>
  <div class="f2" style="margin-top:10px"><label>Підтверджений заробіток, ₴<input id="pa-earn" inputmode="decimal" value="${o.earnFinal==null?'':esc(o.earnFinal)}" placeholder="${esc(o.earn)}"></label></div>
  <p class="note" style="margin-top:6px">Порожньо — партнер бачить орієнтовну суму. Впишіть точну після розрахунку (з урахуванням доставки чи знижок).</p></div>
 <div class="sec"><h3>ТТН</h3><div class="ttn"><input id="pa-ttn" value="${esc(o.ttn)}" inputmode="numeric" placeholder="Номер накладної"><a class="btn ghost" id="pa-trk" target="_blank" rel="noopener" href="${esc(track(o))}" ${o.ttn?'':'hidden'}>Відстежити</a></div><p class="note" style="margin-top:6px">ТТН одразу з’явиться в кабінеті партнера.</p></div>
 <div class="sec"><h3>Коментар менеджера <small class="note">— бачить партнер</small></h3><textarea id="pa-com" placeholder="Напр.: відправимо завтра зранку, колір замінили на білий">${esc(o.comment)}</textarea></div>`;
 $('#dfoot').innerHTML=`<button class="btn" id="pa-save" data-pa="osave">Зберегти</button><button class="btn ghost" data-pa="otext">Текст для складу</button><button class="btn bad dl" data-pa="odel"><svg class="i"><use href="#i-trash"/></svg>Видалити</button>`;
 $('#pa-ttn').addEventListener('input',e=>{co.ttn=e.target.value.trim();const l=$('#pa-trk');l.hidden=!co.ttn;l.href=track(co)});
 dr(true)}
async function saveO(b){if(!co)return;b.classList.add('busy');
 const ef=$('#pa-earn').value.trim().replace(',','.');
 const r=await call({action:'a_order',id:co.id,status:co.status,ttn:$('#pa-ttn').value.trim(),comment:$('#pa-com').value,earnFinal:ef===''?'':+ef||0});
 b.classList.remove('busy');if(!r.ok)return toast(errT(r.error));
 const i=S.orders.findIndex(x=>x.id==co.id);if(i>=0)S.orders[i]=r.order;badge();dr(false);draw();toast('Збережено')}

/* ---------- картка партнера ---------- */
function openP(id){const p=pById(id);if(!p)return;cp={...p};co=null;const s=pStats(id),a=p.anketa,A=a&&a.answers||{};
 const yes=Object.entries(A).filter(([,x])=>x.has);
 $('#dtitle').textContent=p.name;$('#dsub').textContent=p.id+' · з '+(p.created?new Date(p.created).toLocaleDateString('uk-UA'):'')+(p.lastLogin?' · останній вхід '+fdt(t(p.lastLogin)):'');
 $('#dbody').innerHTML=`<div class="sec"><h3>Рівень партнера</h3><div class="seg" id="pa-lv">${Object.keys(LV).map(l=>`<button style="--c:var(--slate)" data-plv="${l}" class="${(p.level||'Starter')==l?'on':''}">${l} · ${LV[l]}%</button>`).join('')}</div><p class="note" style="margin-top:6px">Маржа — від рекомендованої ціни. Від рівня залежить орієнтовний заробіток у нових замовленнях.</p></div>
 <div class="sec"><h3>Контакти</h3><dl class="kv"><dt>Телефон</dt><dd><a href="tel:+${esc(p.phone)}"><b>+${esc(p.phone)}</b></a></dd><dt>Telegram / Viber</dt><dd>${esc(p.msg||'—')}</dd><dt>Місто</dt><dd>${esc(p.city||'—')}</dd><dt>Реквізити</dt><dd>${esc(p.payout||'—')}</dd></dl></div>
 <div class="sec"><h3>Результати</h3><dl class="kv"><dt>Замовлень</dt><dd>${s.n} (${s.work} у роботі)</dd><dt>Оборот</dt><dd>${money(s.turn)}${s.own?` <span class="note">+ ${money(s.own)} власних товарів, які відправляє сам (у рівень не входять)</span>`:''}</dd><dt>Заробив</dt><dd>${money(s.earn)}</dd><dt>До виплати</dt><dd>${money(s.due)}</dd></dl>
  <div class="acts" style="margin-top:10px"><button class="btn ghost sm" data-pa="porders" data-pp="${esc(p.id)}">Замовлення партнера</button></div></div>
 <div class="sec"><h3>Анкета</h3>${a?`<dl class="kv">${yes.length?yes.map(([k,x])=>`<dt>${esc(k)}</dt><dd>${/^https?:/.test(x.link)?`<a href="${esc(x.link)}" target="_blank" rel="noopener">${esc(x.link)}</a>`:esc(x.link)}<br><span class="note">досвід: ${esc(x.exp||'—')} · аудиторія: ${esc(x.aud||'—')}</span></dd>`).join(''):'<dt>Платформи</dt><dd>поки немає — стартує з нуля</dd>'}
  <dt>ФОП</dt><dd>${esc(a.fop||'—')}</dd><dt>Час на день</dt><dd>${esc(a.time||'—')}</dd>${a.other?`<dt>Інше</dt><dd>${esc(a.other)}</dd>`:''}${a.note?`<dt>Коментар</dt><dd>${esc(a.note)}</dd>`:''}</dl><p class="note" style="margin-top:6px">Заповнена ${fdt(t(p.anketaAt))}</p>`:'<p class="note">Партнер ще не заповнював анкету.</p>'}</div>
 <div class="sec"><h3>Можливості <small class="note">— за замовчуванням вимкнені</small></h3>
  <label class="pa-r"><input type="checkbox" id="pa-f-own"${p.feat&&p.feat.own?' checked':''}> 🧩 <b>Власні товари</b> — партнер може додавати товари, яких немає в каталозі. Кожен з’являється у вкладці «Власні товари» на перевірку; на вітрину — лише після вашого схвалення.</label>
  <label class="pa-r"><input type="checkbox" id="pa-f-multi"${p.feat&&p.feat.multi?' checked':''}> 🏪 <b>Кілька вітрин</b> — партнер може створювати додаткові вітрини (до 10). Кожна нова — на перевірку в «Вітрини»; покупці бачать її лише після схвалення.</label>
    ${S.own.some(x=>x.partnerId==p.id)?`<p class="note" style="margin-top:6px">Його власних товарів: ${S.own.filter(x=>x.partnerId==p.id).length} (на перевірці ${S.own.filter(x=>x.partnerId==p.id&&x.status=='На модерації').length}).</p>`:''}</div>
 ${refSec(p)}
 <div class="sec"><h3>Нотатка менеджера <small class="note">— партнер не бачить</small></h3><textarea id="pa-note">${esc(p.note||'')}</textarea></div>
 <div class="sec"><h3>Telegram</h3><p class="note">${p.tg?`Підключено${p.tgName?': <b>'+esc(p.tgName)+'</b>':''} — партнер отримує статуси, ТТН і виплати в боті${S.bot?' @'+esc(S.bot):''}.`:'Не підключено. Партнер може відкрити бота партнерів і увійти, або натиснути «Підключити Telegram» у профілі на сайті.'}</p></div>
 <div class="sec"><h3>Доступ</h3><div class="acts"><button class="btn ghost sm" data-pa="reset">Скинути пароль</button><button class="btn ${p.status=='Заблокований'?'ghost':'bad'} sm" data-pa="block">${p.status=='Заблокований'?'Розблокувати':'Заблокувати'}</button><button class="btn bad sm" data-pa="pdel"><svg class="i"><use href="#i-trash"/></svg>Видалити партнера</button></div><p class="note" id="pa-pw" style="margin-top:8px"></p><p class="note"><a href="#help-m-temp">Як працює тимчасовий пароль</a> · <a href="#help">Довідка</a></p></div>`;
 $('#dfoot').innerHTML=`<button class="btn" data-pa="psave">Зберегти</button>`;
 dr(true)}
function refSec(p){const inv=S.partners.filter(x=>x.ref==p.id),R=S.refs.filter(x=>x.refId==p.id&&x.status!='Скасовано'),by=p.ref&&pById(p.ref);
 return `<div class="sec"><h3>Рекомендації</h3><dl class="kv"><dt>Запросив</dt><dd><input id="pa-ref" value="${esc(p.ref||'')}" placeholder="ID, напр. P1001" style="max-width:150px"> ${by?`<button class="link" data-pid="${esc(by.id)}">${esc(by.name)}</button>`:p.ref?'<span class="note">партнера не знайдено</span>':'<span class="note">ніхто</span>'}</dd>
  <dt>Запросив сам</dt><dd>${inv.length?inv.map(x=>`<button class="link" data-pid="${esc(x.id)}">${esc(x.name)}</button>`).join(', '):'—'}</dd>
  ${R.length?`<dt>Бонуси</dt><dd>нараховано ${money(rsum(R))} · до виплати ${money(rsum(R.filter(x=>x.status=='До виплати')))}</dd>`:''}</dl>
  <p class="note" style="margin-top:6px">Бонус запрошувачу — ${S.cfg?S.cfg.first:20}% від заробітку запрошеного перші ${S.cfg?S.cfg.months:6} міс., далі ${S.cfg?S.cfg.then:10}%. Нараховується сам, коли замовлення «Отримане»; виплачується разом із заробітком. Змінити запрошувача — впишіть ID і «Зберегти».</p></div>`}
async function saveP(b,extra){if(!cp)return;b&&b.classList.add('busy');
 const rf=$('#pa-ref')?$('#pa-ref').value.trim().toUpperCase():undefined;
 const r=await call({action:'a_partner',id:cp.id,level:cp.level||'Starter',note:$('#pa-note')?$('#pa-note').value:cp.note,...(rf!==undefined&&rf!==(cp.ref||'')?{ref:rf}:{}),...($('#pa-f-own')?{feat:{own:$('#pa-f-own').checked?1:0,multi:$('#pa-f-multi')&&$('#pa-f-multi').checked?1:0}}:{}),...(extra||{})});
 b&&b.classList.remove('busy');if(!r.ok){toast(errT(r.error));return false}
 const i=S.partners.findIndex(x=>x.id==cp.id);if(i>=0)S.partners[i]=r.partner;cp={...r.partner};return true}

/* ---------- події ---------- */
document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-pa],[data-pst],[data-plv],[data-pid],[data-poid],[data-psub],[data-pft]');if(!b)return;const d=b.dataset;
 if(d.psub){S.sub=d.psub;S.q='';if(d.pft)S.tab=d.pft;S.n=60;return draw()}
 if(d.pft){S.tab=d.pft;S.n=60;return dOrders()}
 if(d.poid)return openO(d.poid);
 if(d.pid)return openP(d.pid);
 if(d.pst&&co){co.status=d.pst;document.querySelectorAll('#pa-seg button').forEach(x=>x.classList.toggle('on',x==b));$('#pa-hint').textContent=HINT[co.status]||'';if(co.status=='Відправлене')$('#pa-ttn').focus();return}
 if(d.plv&&cp){cp.level=d.plv;document.querySelectorAll('#pa-lv button').forEach(x=>x.classList.toggle('on',x==b));return}
 switch(d.pa){
  case'reload':S.loaded=S.loaded&&true;return load();
  case'more':S.n+=100;return dOrders();
  case'allp':S.pid='';return draw();
  case'osave':return saveO(b);
  case'otext':return co&&copy(oText(co));
  case'odel':{if(!co||!confirm(`Видалити замовлення партнера № ${co.id} (${co.partner}, ${money(co.sale)})?\n\nЙого не буде в адмінці й у кабінеті партнера. Копія збережеться в таблиці кабінету, аркуш «Архів видаленого».`))return;
   b.classList.add('busy');const r=await call({action:'a_del_order',id:co.id});b.classList.remove('busy');if(!r.ok)return toast(r.error=='action'?'Оновіть скрипт кабінету партнерів (новий Code.gs → Нова версія)':errT(r.error));
   S.orders=S.orders.filter(x=>x.id!=co.id);co=null;badge();dr(false);draw();return toast('Замовлення видалено')}
  case'pdel':{if(!cp)return;const n=S.orders.filter(o=>o.partnerId==cp.id).length;
   if(!confirm(`Видалити партнера ${cp.name} (${cp.id})?\n\nВін не зможе увійти в кабінет і бот. ${n?`Його замовлення (${n}) залишаться в списку.`:''} Копія даних збережеться в аркуші «Архів видаленого».`))return;
   b.classList.add('busy');const r=await call({action:'a_del_partner',id:cp.id});b.classList.remove('busy');if(!r.ok)return toast(r.error=='action'?'Оновіть скрипт кабінету партнерів (новий Code.gs → Нова версія)':errT(r.error));
   S.partners=S.partners.filter(x=>x.id!=cp.id);cp=null;dr(false);draw();return toast('Партнера видалено')}
  case'psave':if(await saveP(b)){dr(false);draw();toast('Збережено')}return;
  case'porders':S.pid=d.pp;S.sub='orders';S.tab='all';S.q='';dr(false);return draw();
  case'block':{if(!cp)return;const to=cp.status=='Заблокований'?'Активний':'Заблокований';
   if(to=='Заблокований'&&!confirm('Заблокувати партнера '+cp.name+'? Він не зможе увійти в кабінет.'))return;
   if(await saveP(b,{status:to})){openP(cp.id);draw();toast(to=='Заблокований'?'Партнера заблоковано':'Партнера розблоковано')}return}
  case'reset':{if(!cp||!confirm('Скинути пароль партнеру '+cp.name+'? Старий пароль перестане працювати.'))return;
   b.classList.add('busy');const r=await call({action:'a_reset',id:cp.id});b.classList.remove('busy');if(!r.ok)return toast(errT(r.error));
   const msg=`Вітаємо! Ваш тимчасовий пароль до особистого кабінету Samostroy Shop: ${r.password}\nВхід: ${SITE}kabinet.html (логін — ваш номер телефону). Після входу змініть пароль у розділі «Профіль».`;
   $('#pa-pw').innerHTML=`Тимчасовий пароль: <b>${esc(r.password)}</b> <button class="link" data-pa="cpw">Копіювати повідомлення</button>`;$('#pa-pw').dataset.msg=msg;return}
  case'cpw':return copy($('#pa-pw').dataset.msg||'');
  case'pay':{const p=pById(d.pp)||{name:d.pp},L=S.orders.filter(o=>o.partnerId==d.pp&&o.status=='Отримане'),rb=refDue(d.pp),sum=L.reduce((a,o)=>a+earn(o),0)+rsum(rb);
   if(!confirm(`Позначити виплаченим ${money(sum)} партнеру ${p.name}? (${L.length} замовл.${rb.length?`, бонуси за рекомендації ${money(rsum(rb))}`:''})`))return;
   b.classList.add('busy');const r=await call({action:'a_pay',partnerId:d.pp});b.classList.remove('busy');if(!r.ok)return toast(errT(r.error));
   toast(`Виплачено: ${money(r.sum)} · ${r.count} замовл.${r.bonusCount?' + бонуси':''}`);return load()}
  case'cpay':{const p=pById(d.pp);return p&&copy(`${p.name}\n${p.payout}`)}
  case'owntab':S.ownTab=d.ot;return dOwn();
  case'ownok':case'ownno':{const x=S.own.find(y=>y.id==d.oid);if(!x)return;
   const ship=(document.querySelector(`[name="ow-ship-${CSS.escape(x.id)}"]:checked`)||{}).value||'partner',cost=+(document.getElementById('ow-c-'+x.id)||{}).value||0,note=(document.getElementById('ow-n-'+x.id)||{}).value||'';
   if(d.pa=='ownok'&&ship=='shop'&&!(cost>0&&cost<=x.price))return toast('Вкажіть закупівельну: більше 0 і не вище ціни для покупця');
   if(d.pa=='ownno'&&!note.trim()&&!confirm('Відхилити без пояснення? Партнеру буде легше виправити, якщо вказати причину.'))return;
   b.classList.add('busy');const r=await call({action:'a_own',id:x.id,op:d.pa=='ownok'?'approve':'reject',ship,cost,note});b.classList.remove('busy');
   if(!r.ok)return toast(r.error=='action'?'Оновіть скрипт кабінету партнерів':r.error=='cost'?'Невірна закупівельна ціна':errT(r.error));
   Object.assign(x,r.item);toast(d.pa=='ownok'?'Схвалено — партнер отримав повідомлення':'Відхилено — партнер отримав повідомлення');return draw()}
  case'csv':{const q=c=>'"'+String(c??'').replace(/"/g,'""')+'"';
   const head=['№','Дата','Статус','Партнер','ID партнера','Клієнт','Телефон','Місто','Відділення','Доставка','Оплата','Товари','Сума для клієнта','Оптова ≈','Заробіток','Підтверджено','ТТН','Звідки','Виплачено'];
   const rows=S.orders.filter(o=>!S.pid||o.partnerId==S.pid).map(o=>[o.id,new Date(o.created).toLocaleString('uk-UA'),o.status,o.partner,o.partnerId,o.client,o.phone,o.city,o.branch,o.delivery,o.pay,(o.items||[]).map(x=>`${x.name} × ${x.q}`).join('\n'),o.sale,o.whole,earn(o),o.earnFinal==null?'ні':'так',o.ttn,o.source,o.paidAt?new Date(o.paidAt).toLocaleDateString('uk-UA'):''].map(q).join(';'));
   return download('partnery-zamovlennya-'+new Date().toISOString().slice(0,10)+'.csv','﻿'+[head.map(q).join(';'),...rows].join('\r\n'),'text/csv;charset=utf-8')}}});

/* ---------- Налаштування → Telegram-бот партнерів ---------- */
let B=null;
async function bot(op,btn){
 const el=document.getElementById('s-botb');if(!el)return;
 if(!PAPI){el.innerHTML='<p class="note">Спершу підключіть кабінет партнерів (config.js → papi).</p>';return}
 if(!op&&!B)el.innerHTML='<p class="note">Перевіряю бота…</p>';
 btn&&btn.classList.add('busy');
 const r=await call({action:'a_bot',op:op||'status',url:PAPI});btn&&btn.classList.remove('busy');
 if(op=='admcode'&&r.ok&&r.url){B=B||{};B.adm=r;return botDraw()}
 if(!r.ok){if(r.error=='noadmin')return toast('Спершу підключіть чат менеджера');
  if(op&&B){toast(r.error=='tg'?'Telegram: '+(r.msg||'помилка'):errT(r.error));return}
  el.innerHTML=r.error=='action'?`<p class="note">Скрипт кабінету партнерів ще старої версії. Оновіть його за інструкцією <b>tools/partner-api/ЯК-ЗАПУСТИТИ-БОТА.md</b> (вставити новий Code.gs → Розгорнути → Керувати розгортаннями → Нова версія).</p><div class="acts" style="margin-top:10px"><button class="btn ghost sm" data-bot="status">Перевірити ще раз</button></div>`
   :`<p class="note">${esc(r.error=='tg'?'Telegram: '+(r.msg||''):errT(r.error))}</p><div class="acts" style="margin-top:10px"><button class="btn ghost sm" data-bot="status">Перевірити ще раз</button></div>`;return}
 const adm=B&&B.adm;B=r;if(adm&&op!='admclear')B.adm=adm;
 if(op=='setup')toast('Бота підключено');if(op=='poll')toast('Увімкнено резервний режим: бот перевіряє повідомлення щохвилини');if(op=='test')toast('Тестове повідомлення надіслано');
 botDraw()}
function botDraw(){
 const el=document.getElementById('s-botb'),r=B;if(!el||!r)return;
 if(!r.token){el.innerHTML=`<p class="note">Бот ще не створено. Це 5 хвилин:</p><ol class="steps">
  <li>У Telegram відкрийте <a href="https://t.me/BotFather" target="_blank" rel="noopener">@BotFather</a> → <code>/newbot</code> → назва <b>Samostroy Drop</b> → ім’я, напр. <b>SamostroyDropBot</b>. Скопіюйте токен.</li>
  <li>У скрипті кабінету партнерів: ⚙️ Налаштування проєкту → Властивості скрипта → додайте <b>DROP_BOT_TOKEN</b> = токен.</li>
  <li>Поверніться сюди й натисніть «Перевірити».</li></ol><div class="acts" style="margin-top:10px"><button class="btn sm" data-bot="status">Перевірити</button></div>`;return}
 if(!r.valid){el.innerHTML=`<p class="note">Telegram не приймає токен з DROP_BOT_TOKEN. Перевірте, що скопіювали його повністю з @BotFather.</p><div class="acts" style="margin-top:10px"><button class="btn sm" data-bot="status">Перевірити ще раз</button></div>`;return}
 const mode=r.mode=='hook'&&r.hook?'<span class="tag" style="color:var(--ok)">працює</span>':r.mode=='poll'?'<span class="tag">резервний режим · щохвилини</span>':'<span class="tag hot">не підключено</span>';
 const bad=r.mode=='hook'&&r.error;
 el.innerHTML=`<dl class="kv"><dt>Бот</dt><dd><a href="https://t.me/${esc(r.user)}" target="_blank" rel="noopener">@${esc(r.user)}</a> · ${esc(r.name)}</dd><dt>Стан</dt><dd>${mode}${r.pending?` · у черзі ${r.pending}`:''}</dd>
  <dt>Менеджер</dt><dd>${r.adminBot?'сповіщення й кнопки — в адмін-боті магазину ✓':''}${r.adminBot&&r.admins?' · ':''}${r.admins?`чатів у боті партнерів: ${r.admins}`:''}${!r.adminBot&&!r.admins?'не підключено — додайте TG_TOKEN і TG_CHAT (адмін-бот) у властивості скрипта':''}</dd><dt>Mini App</dt><dd><a href="${esc(r.app)}" target="_blank" rel="noopener">${esc(r.app.replace('https://',''))}</a></dd></dl>
  ${bad?`<div class="warn" style="margin-top:10px"><b>Telegram не може достукатися до скрипта</b><span>${esc(r.error)}${r.errorAt?' · '+esc(fdt(t(r.errorAt))):''}. Натисніть «Підключити бота» ще раз; якщо помилка повторюється — увімкніть резервний режим.</span></div>`:''}
  <div class="acts" style="margin-top:12px">${r.mode!='hook'||!r.hook||bad?`<button class="btn sm" data-bot="setup">Підключити бота</button>`:''}${r.adminBot?'':`<button class="btn ${r.admins?'ghost':''} sm" data-bot="admcode">${r.admins?'Додати ще чат менеджера':'Підключити мій Telegram для сповіщень'}</button>`}
   ${r.admins||r.adminBot?'<button class="btn ghost sm" data-bot="test">Тестове повідомлення</button>':''}<button class="btn ghost sm" data-bot="status">Оновити</button></div>
  ${B.adm?`<div class="warn" style="margin-top:12px"><b>Підключення чату менеджера (посилання діє 1 годину)</b><span>Відкрийте з того Telegram, куди мають приходити замовлення, і натисніть «Почати».</span><div class="acts"><a class="btn sm" href="${esc(B.adm.url)}" target="_blank" rel="noopener">Мій особистий чат</a><a class="btn ghost sm" href="${esc(B.adm.group)}" target="_blank" rel="noopener">Додати в групу менеджерів</a></div></div>`:''}
  <details style="margin-top:12px"><summary class="note" style="cursor:pointer">Ще</summary><div class="acts" style="margin-top:8px">
   <button class="btn ghost sm" data-bot="setup">Перепідключити вебхук</button><button class="btn ghost sm" data-bot="poll">Резервний режим</button>${r.adminBot?'<button class="btn ghost sm" data-bot="admcode">Чат менеджера й у боті партнерів</button>':''}${r.admins?'<button class="btn bad sm" data-bot="admclear">Відключити чати менеджера</button>':''}</div>
   <p class="note" style="margin-top:8px">Резервний режим — якщо бот не відповідає: скрипт сам забирає повідомлення щохвилини (відповідь до 1 хв). «Підключити бота» повертає миттєвий режим.</p></details>
  <p class="note" style="margin-top:10px">Посилання для партнерів: <a href="https://t.me/${esc(r.user)}" target="_blank" rel="noopener">t.me/${esc(r.user)}</a> — у боті вони реєструються, оформлюють замовлення й отримують статуси та ТТН.</p>`}
document.addEventListener('click',e=>{const b=e.target.closest('[data-bot]');if(!b)return;const op=b.dataset.bot;
 if(op=='admclear'&&!confirm('Відключити всі чати менеджера від бота партнерів? Сповіщення знову йтимуть основним ботом.'))return;
 bot(op=='status'?'':op,b)});

return{render:draw,tick,load,bot}})();
