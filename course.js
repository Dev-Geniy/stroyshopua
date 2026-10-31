/* Двигун курсів Samostroy Academy: уроки, міні-тести, прогрес у браузері, підсумковий тест і сертифікат.
   Підключається після shop.js; курс викликає Course({...}) зі своїми уроками.
   Будівельні блоки уроків — у CK (щоб не конфліктувати з іменами shop.js). */
(()=>{
let S={ans:{}};const QUIZ={};
const ico=n=>`<svg class="i"><use href="#i-${n}"/></svg>`;
const CK=window.CK={
 ico,
 q(id,qt,opts,ok,why){QUIZ[id]=ok;const a=S.ans[id],done=a!=null;
  return `<div class="ac-q${done?' is-done':''}" data-q="${id}"><p class="ac-qt">${ico('quiz')}<span>${qt}</span></p><div class="ac-opts">${opts.map((o,i)=>`<button type="button" class="ac-opt${done?(i==ok?' ok':i==a?' bad':' dim'):''}" data-cs="ans" data-qid="${id}" data-x="${i}" ${done?'disabled':''}>${o}</button>`).join('')}</div>${done?`<div class="ac-why ${a==ok?'ok':'bad'}"><b>${a==ok?'Правильно!':'Не зовсім.'}</b> ${why}</div>`:''}</div>`},
 lead:t=>`<p class="ac-lead">${t}</p>`,
 h:t=>`<h3 class="ac-h">${t}</h3>`,
 p:t=>`<p>${t}</p>`,
 tips:(L,c=3)=>`<div class="ac-grid${c}">${L.map(([a,b])=>`<div class="ac-tip"><b>${a}</b><span>${b}</span></div>`).join('')}</div>`,
 list:L=>`<ul class="ac-check">${L.map(x=>`<li>${x}</li>`).join('')}</ul>`,
 steps:L=>`<ol class="cs-path">${L.map(([a,b])=>`<li><b>${a}</b><span>${b}</span></li>`).join('')}</ol>`,
 chat:L=>`<div class="cs-chat">${L.map(([w,t])=>`<p class="${w=='c'?'cl':'me'}">${t}</p>`).join('')}</div>`,
 vs:(bad,good,note,labels)=>`<div class="cs-vs"><div class="bad"><span>${(labels||[])[0]||'Так втрачають клієнта'}</span>${Array.isArray(bad)?CK.chat(bad):`<div class="cs-txt">${bad}</div>`}</div><div class="good"><span>${(labels||[])[1]||'Так продають'}</span>${Array.isArray(good)?CK.chat(good):`<div class="cs-txt">${good}</div>`}</div></div>${note?`<p class="ac-note">${note}</p>`:''}`,
 script:(t,b)=>`<div class="cs-sc"><b>${t}</b><pre>${esc(b)}</pre><button type="button" class="btn sm ghost" data-cs="copy">Скопіювати</button></div>`,
 rule:t=>`<div class="ac-route">${t}</div>`,
 acc:L=>`<div class="cs-obj">${L.map(([a,b],i)=>`<details${i==0?' open':''}><summary>${a}</summary>${CK.script('',b)}</details>`).join('')}</div>`};

window.Course=function(cfg){
 const KEY=cfg.key,$i=id=>document.getElementById(id);
 S=Object.assign({cur:0,done:{},ans:{},name:'',fin:''},ls.get(KEY,{}));
 const save=()=>ls.set(KEY,S);
 const PASS=cfg.pass||Math.ceil(cfg.fin.length*.8);
 const MOD=[...cfg.mods,{t:'Фініш',L:[{id:'fin',t:'Підсумковий тест',m:Math.max(3,Math.ceil(cfg.fin.length/2)),final:1,html:()=>finHTML()}]}];
 const STEPS=MOD.flatMap((m,mi)=>m.L.map(l=>({...l,mi})));
 const TOTAL=STEPS.filter(s=>!s.final).length;
 STEPS.forEach(s=>{if(!s.final){s.html();s.ok=()=>[...s.html().matchAll(/data-q="([^"]+)"/g)].every(m=>S.ans[m[1]]!=null)}});
 const today=()=>new Date().toLocaleDateString('uk-UA');
 const okFin=()=>cfg.fin.filter(f=>S.ans[f[0]]==f[3]).length;
 const plural=n=>{const a=n%10,b=n%100;return a==1&&b!=11?'урок':a>=2&&a<=4&&(b<12||b>14)?'уроки':'уроків'};

 function finHTML(){
  const left=STEPS.filter(s=>!s.final&&!S.done[s.id]),fdone=cfg.fin.every(f=>S.ans[f[0]]!=null),ok=okFin(),pass=ok>=PASS;
  const all=Object.keys(QUIZ).filter(k=>S.ans[k]!=null&&!cfg.fin.some(f=>f[0]==k)),aok=all.filter(k=>S.ans[k]==QUIZ[k]).length;
  return `<h2>Підсумковий тест</h2>
  ${left.length?CK.rule(`Ще не пройдені уроки: ${left.map(s=>`<button type="button" class="link" data-cs="go" data-v="${STEPS.indexOf(s)}">${s.t}</button>`).join(', ')}. Тест можна пройти вже зараз.`):''}
  ${CK.lead(`${cfg.fin.length} питань з усього курсу. Для сертифіката потрібно ${PASS} правильних відповідей.`)}
  ${cfg.fin.map(f=>CK.q(...f)).join('')}
  ${fdone?(pass?`<div class="cs-cert">
    <span class="cs-cl">Samostroy Shop · Академія партнера</span><b class="cs-ct">Сертифікат</b><span>підтверджує, що</span>
    <input id="csName" class="cs-name" placeholder="Ваше ім’я та прізвище" value="${esc(S.name)}" aria-label="Ваше ім’я для сертифіката">
    <span>успішно завершив(ла) курс</span><b class="cs-cc">«${cfg.title}»</b>
    <span class="cs-cd">Результат: ${ok} з ${cfg.fin.length} у підсумковому тесті · ${S.fin||today()}</span></div>
   <div class="cs-acts"><button type="button" class="btn" data-cs="print">Зберегти сертифікат (PDF)</button>${cfg.next||''}</div>`
   :CK.rule(`Правильних відповідей: <b>${ok} з ${cfg.fin.length}</b>. Перегляньте пояснення вище й пройдіть тест ще раз — у вас вийде! <button type="button" class="link" data-cs="retest">Пройти тест заново</button>`)):''}
  ${fdone?`<div class="ac-sum cs-sum"><div><span>Відповіді в уроках</span><b>${aok} з ${all.length} правильних</b></div>${(cfg.after||[]).map(([a,b])=>`<div><span>${a}</span><b>${b}</b></div>`).join('')}<div><span>Почати спочатку</span><b><button type="button" class="link" data-cs="reset">Скинути прогрес курсу</button></b></div></div>`:''}`}

 const stage=$i('acStage'),nav=$i('acNav');
 const doneN=()=>STEPS.filter(s=>!s.final&&S.done[s.id]).length;
 function mark(){const s=STEPS[S.cur];if(!s.final&&s.ok()&&!S.done[s.id]){S.done[s.id]=1;save()}if(s.final&&okFin()>=PASS&&!S.fin){S.fin=today();save()}}
 function render(scroll){
  S.cur=Math.min(Math.max(0,S.cur|0),STEPS.length-1);const s=STEPS[S.cur];mark();
  const ok=s.final||s.ok();
  stage.innerHTML=`<div class="ac-sh"><span>${s.final?'Фініш':`${MOD[s.mi].t} · Урок ${S.cur+1} з ${TOTAL}`} · ≈${s.m} хв</span></div>
   <div class="ac-body">${s.html()}</div>
   ${s.final?'':`<div class="ac-foot">${S.cur?`<button type="button" class="btn ghost" data-cs="prev">Назад</button>`:'<span></span>'}<div class="ac-fr"><span class="ac-hint">${ok?'':'Дайте відповідь на питання, щоб продовжити'}</span><button type="button" class="btn" data-cs="next" ${ok?'':'disabled'}>${S.cur==STEPS.length-2?'До підсумкового тесту':'Наступний урок'}</button></div></div>`}`;
  drawNav();
  const nm=$i('csName');if(nm)nm.oninput=()=>{S.name=nm.value;save()};
  if(location.hash.startsWith('#l=')||scroll)history.replaceState(null,'',location.pathname+location.search+(S.cur?'#l='+s.id:''));
  if(scroll)$i('learn').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'})}
 function drawNav(){
  const d=doneN(),pct=Math.round(d/TOTAL*100);
  nav.innerHTML=`<div class="ac-prog"><span><b>${pct}%</b> пройдено · ${d} з ${TOTAL} ${plural(TOTAL)}</span><div class="ac-pb"><i style="width:${pct}%"></i></div></div><ol>${MOD.map((m,mi)=>`<li class="cs-mh">${mi+1<MOD.length?`Модуль ${mi+1}. `:''}${m.t}</li>`+m.L.map(l=>{const i=STEPS.findIndex(s=>s.id==l.id),ok=l.final?!!S.fin:S.done[l.id];return `<li><button type="button" class="${i==S.cur?'cur':''}${ok?' ok':''}" data-cs="go" data-v="${i}" ${i==S.cur?'aria-current="step"':''}><i>${ok?ico('check'):l.final?'★':i+1}</i><span>${l.t}</span></button></li>`}).join('')).join('')}</ol>`;
  const c=nav.querySelector('.cur'),ol=nav.querySelector('ol');
  if(c&&getComputedStyle(ol).display=='flex')ol.scrollLeft=c.parentNode.offsetLeft-ol.offsetLeft-12;
  else if(c&&nav.scrollHeight>nav.clientHeight){const top=c.offsetTop-nav.clientHeight/2;if(Math.abs(nav.scrollTop-top)>nav.clientHeight/2)nav.scrollTop=top}
  const r=$i('csRoute');if(r)r.innerHTML=MOD.map((m,mi)=>{const dn=m.L.filter(l=>l.final?S.fin:S.done[l.id]).length,all=m.L.length,full=dn==all,fin=m.L[0].final;
   return `<li class="${full?'ok':''}"><i>${full?ico('check'):fin?'★':mi+1}</i><span>${m.t}</span><em>${fin?(S.fin?'складено':'тест'):`${dn}/${all} ${plural(all)}`}</em></li>`}).join('');
  const hp=$i('csPct');if(hp){hp.textContent=pct+'%';$i('csBar').style.width=pct+'%'}
  const st=$i('csStart');if(st)st.textContent=d==0&&!S.cur?'Почати курс':S.fin?'Мій сертифікат':`Продовжити: ${STEPS[S.cur].t}`}
 function copy(t){const ok=()=>toast('Скопійовано');
  const fb=()=>{const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();try{document.execCommand('copy');ok()}catch(x){}a.remove()};
  try{navigator.clipboard.writeText(t).then(ok,fb)}catch(x){fb()}}

 stage.addEventListener('click',e=>{
  const b=e.target.closest('[data-cs]');if(!b)return;const D=b.dataset,s=STEPS[S.cur];
  switch(D.cs){
   case'ans':{if(S.ans[D.qid]!=null)return;S.ans[D.qid]=+D.x;save();
    if(s.final){const y=scrollY;render(false);return scrollTo(0,y)}
    const tmp=document.createElement('div');tmp.innerHTML=s.html();const nb=tmp.querySelector(`[data-q="${D.qid}"]`),box=b.closest('.ac-q');if(box&&nb)box.replaceWith(nb);
    mark();const nx=stage.querySelector('[data-cs=next]');if(nx&&s.ok()){nx.disabled=false;stage.querySelector('.ac-hint').textContent=''}return drawNav()}
   case'copy':{const pre=b.parentNode.querySelector('pre');return pre&&copy(pre.textContent)}
   case'next':if(!s.final&&!s.ok())return;S.cur++;save();return render(true);
   case'prev':S.cur--;save();return render(true);
   case'go':S.cur=+D.v;save();return render(true);
   case'retest':cfg.fin.forEach(f=>delete S.ans[f[0]]);save();return render(false);
   case'print':if(!S.name.trim()){toast('Впишіть ім’я — воно з’явиться на сертифікаті');$i('csName').focus();return}document.body.classList.add('cs-print');print();setTimeout(()=>document.body.classList.remove('cs-print'),500);return;
   case'reset':if(!confirm(`Скинути прогрес курсу «${cfg.title}»?`))return;Object.assign(S,{cur:0,done:{},ans:{},fin:''});save();return render(true);
  }});
 nav.addEventListener('click',e=>{const b=e.target.closest('[data-cs=go]');if(!b)return;S.cur=+b.dataset.v;save();render(true)});
 const sb=$i('csStart');if(sb)sb.addEventListener('click',e=>{e.preventDefault();render(true)});
 addEventListener('afterprint',()=>document.body.classList.remove('cs-print'));
 // посилання на конкретний урок: page.html#l=m1l2
 const fromHash=()=>{const m=location.hash.match(/^#l=([\w-]+)/);if(!m)return false;const i=STEPS.findIndex(s=>s.id==m[1]);if(i<0)return false;S.cur=i;save();return true};
 const jump=fromHash();render(jump);
 addEventListener('hashchange',()=>{if(fromHash())render(true)});
};
})();
