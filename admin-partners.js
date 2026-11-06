/* Адмінка → «Партнери»: проста CRM для замовлень з особистого кабінету партнерів, самих партнерів і виплат.
   Працює поверх основного скрипта admin.html (pass, esc, money, fdt, toast, copy, dr, track) і окремого скрипта Google (CFG.papi). */
window.PA=(()=>{
const PAPI=(window.CFG&&CFG.papi)||'';
const STS=['Нове','Підтверджене','Відправлене','Отримане','Виплачено','Скасоване','Повернення'];
const COL={'Нове':'var(--s-new)','Підтверджене':'var(--s-conf)','Відправлене':'var(--s-sent)','Отримане':'var(--s-done)','Виплачено':'#1f7a45','Скасоване':'var(--s-canc)','Повернення':'var(--bad)'};
const HINT={'Нове':'Зателефонуйте партнеру або клієнту й підтвердіть','Підтверджене':'Зберіть і відправте, впишіть ТТН','Відправлене':'Чекаємо, поки клієнт забере','Отримане':'Клієнт забрав — заробіток до виплати','Виплачено':'Партнеру виплачено','Скасоване':'Не відправлялось','Повернення':'Клієнт не забрав або повернув'};
const LV={Starter:10,Pro:15,Team:20};
const WORK=['Нове','Підтверджене','Відправлене'],CANC=['Скасоване','Повернення'];
const S={partners:[],orders:[],loaded:false,loading:false,at:0,err:'',sub:'orders',tab:'Нове',q:'',pid:'',n:60};
let co=null,cp=null;
const $v=()=>document.getElementById('v-partners');
const earn=o=>o.earnNow!=null?+o.earnNow:(o.earnFinal!=null?+o.earnFinal:+o.earn||0);
const pill=s=>`<span class="st" style="--c:${COL[s]||'var(--soft)'}">${esc(s)}</span>`;
const t=s=>+new Date(s)||0;
const pById=id=>S.partners.find(p=>p.id==id);
const ERRS={auth:'Пароль адмінки не збігається з ADMIN_PASS у скрипті кабінету',locked:'Забагато невдалих спроб, зачекайте 15 хвилин',net:'Немає зв’язку зі скриптом кабінету',server:'Помилка скрипта кабінету',notfound:'Запис не знайдено'};
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
 S.err='';S.loaded=true;S.partners=r.partners||[];S.orders=(r.orders||[]).sort((a,b)=>t(b.created)-t(a.created));
 badge();if(view=='partners')draw()}
function badge(){const b=document.getElementById('b-par');if(b)b.textContent=S.orders.filter(o=>o.status=='Нове').length||''}
function tick(){if(PAPI&&pass&&!S.loading&&(!S.loaded||Date.now()-S.at>60000))load(true)}

/* ---------- розрахунки ---------- */
function pStats(id){const L=S.orders.filter(o=>o.partnerId==id),live=L.filter(o=>!CANC.includes(o.status));
 return{n:L.length,live:live.length,turn:live.reduce((a,o)=>a+(+o.sale||0),0),earn:live.filter(o=>o.status=='Отримане'||o.status=='Виплачено').reduce((a,o)=>a+earn(o),0),
  due:live.filter(o=>o.status=='Отримане').reduce((a,o)=>a+earn(o),0),dueN:live.filter(o=>o.status=='Отримане').length,work:live.filter(o=>WORK.includes(o.status)).length,last:L[0]&&L[0].created}}

/* ---------- екрани ---------- */
function draw(){const v=$v();if(!v)return;
 const head=`<div class="sh"><div><h1>Партнери</h1><p>Замовлення з особистого кабінету партнерів, партнери й виплати. <a href="kabinet.html" target="_blank" rel="noopener">Кабінет партнера</a></p></div>
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
  <button class="stat${due.length?' hot':''}" data-psub="pay"><span>До виплати партнерам</span><b>${money(due.reduce((a,o)=>a+earn(o),0))}</b><small>${pl(due.length,'замовлення','замовлення','замовлень')}</small></button>
  <div class="stat"><span>Оборот партнерів за місяць</span><b>${money(mo.reduce((a,o)=>a+(+o.sale||0),0))}</b><small>${pl(mo.length,'замовлення','замовлення','замовлень')} · ${pl(act.length,'партнер','партнери','партнерів')}</small></div></div>
 <div class="chips">${[['orders','Замовлення',O.length],['people','Партнери',S.partners.length],['pay','Виплати',new Set(due.map(o=>o.partnerId)).size]].map(([k,l,n])=>`<button data-psub="${k}" class="${S.sub==k?'on':''}">${l}<i>${n}</i></button>`).join('')}</div>
 <div id="pa-body"></div>`;
 ({orders:dOrders,people:dPeople,pay:dPay})[S.sub]()}

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
 const L=Object.entries(by).map(([id,os])=>({p:pById(id)||{id,name:os[0].partner},os,sum:os.reduce((a,o)=>a+earn(o),0)})).sort((a,b)=>b.sum-a.sum);
 document.getElementById('pa-body').innerHTML=`<p class="note" style="margin-bottom:10px">Тут замовлення зі статусом «Отримане» — клієнт забрав посилку, заробіток партнера ще не виплачено. Після переказу натисніть «Позначити виплаченим» — статуси зміняться на «Виплачено», партнер побачить це в кабінеті.</p>
 ${L.length?`<div class="pa-pay">${L.map(x=>`<div class="box"><div class="pa-ph"><div><b>${esc(x.p.name)}</b><span class="note">${esc(x.p.id)}${x.p.phone?' · +'+esc(x.p.phone):''}</span></div><b class="pa-sum">${money(x.sum)}</b></div>
  <dl class="kv"><dt>Замовлення</dt><dd>${x.os.map(o=>`<button class="link" data-poid="${esc(o.id)}">${esc(o.id)}</button> ${money(earn(o))}${o.earnFinal==null?' ≈':''}`).join(', ')}</dd>
  <dt>Реквізити</dt><dd>${x.p.payout?esc(x.p.payout):'<span class="note">не вказані в профілі — уточніть у партнера</span>'}</dd></dl>
  ${x.os.some(o=>o.earnFinal==null)?'<p class="note" style="margin-top:8px">≈ — орієнтовний заробіток. Відкрийте замовлення, щоб вписати точну суму.</p>':''}
  <div class="acts" style="margin-top:12px"><button class="btn sm" data-pa="pay" data-pp="${esc(x.p.id)}">Позначити виплаченим · ${money(x.sum)}</button>${x.p.payout?`<button class="btn ghost sm" data-pa="cpay" data-pp="${esc(x.p.id)}">Копіювати реквізити</button>`:''}</div></div>`).join('')}</div>`:'<div class="box empty">Немає замовлень до виплати</div>'}`}

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
 $('#dfoot').innerHTML=`<button class="btn" id="pa-save" data-pa="osave">Зберегти</button><button class="btn ghost" data-pa="otext">Текст для складу</button>`;
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
 <div class="sec"><h3>Результати</h3><dl class="kv"><dt>Замовлень</dt><dd>${s.n} (${s.work} у роботі)</dd><dt>Оборот</dt><dd>${money(s.turn)}</dd><dt>Заробив</dt><dd>${money(s.earn)}</dd><dt>До виплати</dt><dd>${money(s.due)}</dd></dl>
  <div class="acts" style="margin-top:10px"><button class="btn ghost sm" data-pa="porders" data-pp="${esc(p.id)}">Замовлення партнера</button></div></div>
 <div class="sec"><h3>Анкета</h3>${a?`<dl class="kv">${yes.length?yes.map(([k,x])=>`<dt>${esc(k)}</dt><dd>${/^https?:/.test(x.link)?`<a href="${esc(x.link)}" target="_blank" rel="noopener">${esc(x.link)}</a>`:esc(x.link)}<br><span class="note">досвід: ${esc(x.exp||'—')} · аудиторія: ${esc(x.aud||'—')}</span></dd>`).join(''):'<dt>Платформи</dt><dd>поки немає — стартує з нуля</dd>'}
  <dt>ФОП</dt><dd>${esc(a.fop||'—')}</dd><dt>Час на день</dt><dd>${esc(a.time||'—')}</dd>${a.other?`<dt>Інше</dt><dd>${esc(a.other)}</dd>`:''}${a.note?`<dt>Коментар</dt><dd>${esc(a.note)}</dd>`:''}</dl><p class="note" style="margin-top:6px">Заповнена ${fdt(t(p.anketaAt))}</p>`:'<p class="note">Партнер ще не заповнював анкету.</p>'}</div>
 <div class="sec"><h3>Нотатка менеджера <small class="note">— партнер не бачить</small></h3><textarea id="pa-note">${esc(p.note||'')}</textarea></div>
 <div class="sec"><h3>Доступ</h3><div class="acts"><button class="btn ghost sm" data-pa="reset">Скинути пароль</button><button class="btn ${p.status=='Заблокований'?'ghost':'bad'} sm" data-pa="block">${p.status=='Заблокований'?'Розблокувати':'Заблокувати'}</button></div><p class="note" id="pa-pw" style="margin-top:8px"></p></div>`;
 $('#dfoot').innerHTML=`<button class="btn" data-pa="psave">Зберегти</button>`;
 dr(true)}
async function saveP(b,extra){if(!cp)return;b&&b.classList.add('busy');
 const r=await call({action:'a_partner',id:cp.id,level:cp.level||'Starter',note:$('#pa-note')?$('#pa-note').value:cp.note,...(extra||{})});
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
  case'pay':{const p=pById(d.pp)||{name:d.pp},L=S.orders.filter(o=>o.partnerId==d.pp&&o.status=='Отримане'),sum=L.reduce((a,o)=>a+earn(o),0);
   if(!confirm(`Позначити виплаченим ${money(sum)} партнеру ${p.name}? (${L.length} замовл.)`))return;
   b.classList.add('busy');const r=await call({action:'a_pay',partnerId:d.pp});b.classList.remove('busy');if(!r.ok)return toast(errT(r.error));
   toast(`Виплачено: ${money(r.sum)} · ${r.count} замовл.`);return load()}
  case'cpay':{const p=pById(d.pp);return p&&copy(`${p.name}\n${p.payout}`)}
  case'csv':{const q=c=>'"'+String(c??'').replace(/"/g,'""')+'"';
   const head=['№','Дата','Статус','Партнер','ID партнера','Клієнт','Телефон','Місто','Відділення','Доставка','Оплата','Товари','Сума для клієнта','Оптова ≈','Заробіток','Підтверджено','ТТН','Звідки','Виплачено'];
   const rows=S.orders.filter(o=>!S.pid||o.partnerId==S.pid).map(o=>[o.id,new Date(o.created).toLocaleString('uk-UA'),o.status,o.partner,o.partnerId,o.client,o.phone,o.city,o.branch,o.delivery,o.pay,(o.items||[]).map(x=>`${x.name} × ${x.q}`).join('\n'),o.sale,o.whole,earn(o),o.earnFinal==null?'ні':'так',o.ttn,o.source,o.paidAt?new Date(o.paidAt).toLocaleDateString('uk-UA'):''].map(q).join(';'));
   return download('partnery-zamovlennya-'+new Date().toISOString().slice(0,10)+'.csv','﻿'+[head.map(q).join(';'),...rows].join('\r\n'),'text/csv;charset=utf-8')}}});

return{render:draw,tick,load}})();
