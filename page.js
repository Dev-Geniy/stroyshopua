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
 f.addEventListener('submit',async e=>{e.preventDefault();
  const nm=$i('rvName'),ph=$i('rvPhone'),tx=$i('rvText'),hint=$i('rvHint');
  const bad=(el,m)=>{el.classList.add('err');hint.textContent=m;el.focus();el.addEventListener('input',()=>{el.classList.remove('err');hint.textContent=''},{once:true})};
  if(!nm.value.trim())return bad(nm,'Вкажіть ім’я');
  if(!phoneOk(ph.value))return bad(ph,'Вкажіть телефон, щоб ми могли підтвердити покупку');
  if(tx.value.trim().length<10)return bad(tx,'Напишіть кілька слів про покупку');
  const rate=+(f.querySelector('[name=rate]:checked')||{}).value||5;
  const parts=[`Оцінка: ${rate}/5`];if($i('rvCity').value.trim())parts.push(`Місто: ${$i('rvCity').value.trim()}`);
  if($i('rvProd').value.trim())parts.push(`Товар: ${$i('rvProd').value.trim()}`);parts.push(`Відгук: ${tx.value.trim()}`);
  const msg=`⭐ Відгук (${rate}/5)\nІм’я: ${nm.value.trim()}\nТелефон: ${ph.value}\n`+parts.slice(1).join('\n');
  const ok=()=>{f.innerHTML=`<div class="done"><div class="ic"><svg class="i"><use href="#i-check"/></svg></div><h3>Дякуємо за відгук!</h3><p>Він з’явиться на сайті після перевірки. Маєте фото результату? Надішліть його менеджеру — додамо до відгуку.</p><a class="btn" href="https://t.me/${CFG.tg}" target="_blank" rel="noopener">Надіслати фото</a></div>`};
  if(!CFG.api){tg(msg);return ok()}
  const b=$i('rvBtn');b.classList.add('busy');key=key||okey();
  let r=null;try{r=await api({action:'order',order:{type:'Відгук',name:nm.value.trim(),phone:ph.value,city:$i('rvCity').value.trim(),pay:'',delivery:'',items:leadItems(parts),page:location.href,lang,key,hp:$i('rvHp').value}})}catch(x){}
  b.classList.remove('busy');
  if(r&&r.ok)return ok();
  hint.innerHTML='Не вдалося надіслати через сайт. <button type="button" class="link" id="rvTg">Надіслати в Telegram</button>';
  $i('rvTg').onclick=()=>tg(msg)});
}
})();
