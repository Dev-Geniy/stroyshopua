/* Згенеровані сторінки: галерея товару, «У кошик» до завантаження каталогу, «Поділитися»,
   фільтр і пошук у блозі, форма відгуку. Працює поверх shop.js. */
(()=>{
const $i=id=>document.getElementById(id);

/* галерея на сторінці товару */
document.addEventListener('click',e=>{const b=e.target.closest('[data-big]');if(!b)return;
 const m=$i('ppMain');if(m)m.src=b.dataset.big;document.querySelectorAll('.pp-th button').forEach(x=>x.classList.toggle('on',x==b))});

/* «У кошик» натиснули раніше, ніж завантажився каталог: чекаємо й додаємо */
let failed=false;
addEventListener('catalogfail',()=>{failed=true});
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-add]');if(!b||loaded)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(failed){const n=(b.closest('.sc,.pp')||document).querySelector('h1,b');tg('Вітаю! Хочу замовити: '+(n?n.textContent:'')+'\n'+location.href);return}
 if(b.classList.contains('busy'))return;b.classList.add('busy');
 const go=()=>{b.classList.remove('busy');if(loaded&&byId.get(b.dataset.add)){add(b.dataset.add,+b.dataset.n||1);panel(true)}};
 addEventListener('catalog',go,{once:true});
 addEventListener('catalogfail',()=>{b.classList.remove('busy');toast('Не вдалося завантажити каталог. Напишіть менеджеру — оформимо замовлення.')},{once:true})},true);

/* поділитися посиланням на товар */
document.addEventListener('click',e=>{const b=e.target.closest('[data-share]');if(!b)return;
 const url=b.dataset.share,title=b.dataset.title||document.title;
 if(navigator.share){navigator.share({title,url}).catch(()=>{});return}
 try{navigator.clipboard.writeText(url).then(()=>toast('Посилання скопійовано'),()=>prompt('Скопіюйте посилання:',url))}catch(x){prompt('Скопіюйте посилання:',url)}});

/* «Поділитися статтею» для всіх відвідувачів */
const canShare=!!navigator.share&&matchMedia('(pointer:coarse)').matches;
document.querySelectorAll('[data-native]').forEach(b=>{b.hidden=!canShare});
const nativeShare=b=>navigator.share({title:b.dataset.title,text:b.dataset.title,url:b.dataset.url}).catch(()=>{});
document.addEventListener('click',e=>{
 const n=e.target.closest('[data-native]');if(n){nativeShare(n);return}
 const t=e.target.closest('[data-topshare]');
 if(t){e.preventDefault();if(canShare){nativeShare(t);return}const s=$i('share');if(s){s.scrollIntoView({behavior:'smooth',block:'center'});s.classList.remove('flash');void s.offsetWidth;s.classList.add('flash')}return}
 const c=e.target.closest('[data-copyshare]');
 if(c){const txt=c.dataset.title+'\n'+c.dataset.url,ok=()=>{toast('Скопійовано заголовок і посилання');c.classList.add('ok');c.textContent='Скопійовано ✓';setTimeout(()=>{c.classList.remove('ok');c.textContent='Копіювати посилання'},2500)};
  try{navigator.clipboard.writeText(txt).then(ok,()=>prompt('Скопіюйте:',txt))}catch(x){prompt('Скопіюйте:',txt)}return}
 /* соцмережі: на комп’ютері — у невеликому вікні, на телефоні — у застосунку */
 const a=e.target.closest('[data-sh]');if(!a||/^(viber|mailto):/.test(a.href)||matchMedia('(max-width:760px)').matches)return;
 const w=window.open(a.href,'share','width=620,height=640');if(w){try{w.opener=null}catch(x){}e.preventDefault()}});

/* інструмент автора на сторінці статті: ШІ-рерайт і публікація на інших сайтах (лише після входу в адмінку на цьому пристрої) */
(()=>{const t=$i('baTools');if(!t)return;let done=false;
 const load=()=>{if(done)return;let on=false;try{on=localStorage.getItem('adm_tools')=='1'}catch(x){}
  if(!on&&location.hash!='#avtor')return;done=true;const s=document.createElement('script');s.src=t.dataset.src;s.defer=true;document.body.appendChild(s)};
 load();addEventListener('hashchange',load)})();

/* блог: рубрики й пошук */
const grid=$i('blGrid');
if(grid){
 let cat='',q='';const cards=[...grid.querySelectorAll('.bl-card')];
 const run=()=>{const w=q.toLowerCase().split(/\s+/).filter(Boolean);let n=0;
  cards.forEach(c=>{const ok=(!cat||c.dataset.c==cat)&&w.every(x=>c.dataset.s.includes(x));c.hidden=!ok;if(ok)n++});
  $i('blEmpty').hidden=n>0;$i('blCnt').textContent=cat||q?`Знайдено: ${n}`:''};
 $i('blCats').addEventListener('click',e=>{const b=e.target.closest('[data-cat]');if(!b)return;cat=b.dataset.cat;
  $i('blCats').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x==b));run()});
 let t;$i('blQ').addEventListener('input',e=>{clearTimeout(t);t=setTimeout(()=>{q=e.target.value.trim();run()},120)});
 // старі посилання blog.html#post=slug ведуть на сторінку статті
 const m=location.hash.match(/^#post=(.+)$/);if(m)location.replace('blog/'+encodeURIComponent(decodeURIComponent(m[1]))+'.html');
}

/* відгук: потрапляє в адмінку (тип «Відгук»), публікується після перевірки */
const f=$i('rvForm');
if(f){let key='';
 /* фото «до» і «після»: стискаємо в браузері (до 1600 px) і одразу вантажимо на imgbb, щоб до відправки все було готово */
 const PH={},phBox=$i('rvPh');
 if(phBox&&!CFG.imgbb){phBox.hidden=true;const n=$i('rvPhNote');if(n)n.closest('label').hidden=true}
 const shrink=file=>new Promise(res=>{if(!/^image\/(jpe?g|png|webp|bmp)$/i.test(file.type))return res(file);
  const u=URL.createObjectURL(file),im=new Image();
  im.onload=()=>{const k=Math.min(1,1600/Math.max(im.naturalWidth,im.naturalHeight)),c=document.createElement('canvas');
   c.width=Math.round(im.naturalWidth*k);c.height=Math.round(im.naturalHeight*k);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);
   c.toBlob(b=>res(b&&b.size<file.size?b:file),'image/jpeg',.85)};
  im.onerror=()=>{URL.revokeObjectURL(u);res(file)};im.src=u});
 const upload=async file=>{const fd=new FormData(),b=await shrink(file);fd.append('image',b,b===file?(file.name||'photo.jpg'):'photo.jpg');
  const r=await fetch('https://api.imgbb.com/1/upload?key='+encodeURIComponent(CFG.imgbb),{method:'POST',body:fd});
  const j=await r.json().catch(()=>null);if(!j||!j.success||!j.data||!j.data.url)throw new Error('imgbb');return j.data.url};
 const slotSet=(s,cls,msg)=>{s.classList.remove('on','err','busy');cls.split(' ').filter(Boolean).forEach(c=>s.classList.add(c));s.querySelector('small').textContent=msg};
 f.querySelectorAll('.rv-slot').forEach(s=>{const k=s.dataset.k,inp=s.querySelector('input');
  inp.addEventListener('change',()=>{const file=inp.files&&inp.files[0];inp.value='';if(!file)return;
   if(!/^image\//.test(file.type))return slotSet(s,'err','Це не фото — оберіть зображення');
   if(file.size>30*1024*1024)return slotSet(s,'err','Файл завеликий — до 30 МБ');
   const old=s.querySelector('img');if(old)old.remove();
   const im=document.createElement('img');im.alt='';im.src=URL.createObjectURL(file);im.onload=()=>URL.revokeObjectURL(im.src);s.prepend(im);
   slotSet(s,'on busy','Завантаження…');
   const job={url:''};PH[k]=job;
   job.p=upload(file).then(u=>{if(PH[k]!==job)return;job.url=u;slotSet(s,'on','Готово ✓')})
    .catch(()=>{if(PH[k]!==job)return;delete PH[k];im.remove();slotSet(s,'err','Не вдалося — спробуйте ще раз')})});
  s.querySelector('.rv-x').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();delete PH[k];const im=s.querySelector('img');if(im)im.remove();slotSet(s,'','Додати фото')})});
 f.addEventListener('submit',async e=>{e.preventDefault();
  const nm=$i('rvName'),ph=$i('rvPhone'),tx=$i('rvText'),hint=$i('rvHint');
  const bad=(el,m)=>{el.classList.add('err');hint.textContent=m;el.focus();el.addEventListener('input',()=>{el.classList.remove('err');hint.textContent=''},{once:true})};
  if(!nm.value.trim())return bad(nm,'Вкажіть ім’я');
  if(!phoneOk(ph.value))return bad(ph,'Вкажіть телефон, щоб ми могли підтвердити покупку');
  if(tx.value.trim().length<10)return bad(tx,'Напишіть кілька слів про покупку');
  const rate=+(f.querySelector('[name=rate]:checked')||{}).value||5;
  const parts=[`Оцінка: ${rate}/5`];if($i('rvCity').value.trim())parts.push(`Місто: ${$i('rvCity').value.trim()}`);
  if($i('rvProd').value.trim())parts.push(`Товар: ${$i('rvProd').value.trim()}`);
  const b=$i('rvBtn');b.classList.add('busy');
  const busy=Object.values(PH).filter(j=>!j.url);if(busy.length){hint.textContent='Зачекайте, завантажуємо фото…';await Promise.allSettled(busy.map(j=>j.p));hint.textContent=''}
  const pb=PH.before&&PH.before.url,pa=PH.after&&PH.after.url,pn=($i('rvPhNote')||{value:''}).value.trim();
  if(pb)parts.push(`Фото до: ${pb}`);if(pa)parts.push(`Фото після: ${pa}`);if((pb||pa)&&pn)parts.push(`Коментар до фото: ${pn}`);
  parts.push(`Відгук: ${tx.value.trim()}`);
  const msg=`⭐ Відгук (${rate}/5)\nІм’я: ${nm.value.trim()}\nТелефон: ${ph.value}\n`+parts.slice(1).join('\n');
  const ok=()=>{f.innerHTML=`<div class="done"><div class="ic"><svg class="i"><use href="#i-check"/></svg></div><h3>Дякуємо за відгук!</h3>${pb||pa?'<p>Відгук і фото отримали — з’являться на сайті після перевірки.</p>':`<p>Він з’явиться на сайті після перевірки. Маєте фото результату? Надішліть його менеджеру — додамо до відгуку.</p><a class="btn" href="https://t.me/${CFG.tg}" target="_blank" rel="noopener">Надіслати фото</a>`}</div>`};
  if(!CFG.api){b.classList.remove('busy');tg(msg);return ok()}
  key=key||okey();
  let r=null;try{r=await api({action:'order',order:{type:'Відгук',name:nm.value.trim(),phone:ph.value,city:$i('rvCity').value.trim(),pay:'',delivery:'',items:leadItems(parts),page:location.href,lang,key,hp:$i('rvHp').value}})}catch(x){}
  b.classList.remove('busy');
  if(r&&r.ok)return ok();
  hint.innerHTML='Не вдалося надіслати через сайт. <button type="button" class="link" id="rvTg">Надіслати в Telegram</button>';
  $i('rvTg').onclick=()=>tg(msg)});
}
})();
