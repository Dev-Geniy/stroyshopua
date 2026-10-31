/* Блог Samostroy Shop: список статей, пошук і категорії, сторінка статті (#post=slug),
   товари з каталогу до статті й заклик написати менеджеру. Статті — у blog.json. Працює поверх shop.js. */
(()=>{
const $i=id=>document.getElementById(id);
const STEP=12;
// категорія статті → розділ каталогу
const CAT={'Самоклеюча плівка':['samokleyucha-plivka','?c=samokleyucha-plivka'],'Вінілові покриття':['plytka-vinilova','vinil.html'],'Шпалери':['shpalery','?c=shpalery'],'Дзеркала':['akrylovi-dzerkala','dzerkala.html'],'Екошкіра':['ekoshkira','ekoshkira.html'],'Килимки':['vologopoglynayuchi-kylymky','kylimky.html'],'Меблеві рішення':['stelazhi','mebli.html'],'Плитка':['pet-plytka','?g=plytka'],'Пазл-підлога':['pidloga-pazl-plyushevyy','pazl-pidloga.html'],'Кухня':['pet-plytka','?g=plytka'],'Ремонт':['3d-paneli','?c=3d-paneli'],'Лайфхаки ремонту':['3d-paneli','?c=3d-paneli'],'Підготовка':['samokleyucha-plivka','?c=samokleyucha-plivka'],'Поради майстра':['3d-paneli','?c=3d-paneli']};
let POSTS=[],cat='',q='',shown=STEP;
const fmtD=d=>new Date(d+'T12:00:00').toLocaleDateString('uk-UA',{day:'numeric',month:'long',year:'numeric'});
const badge=b=>b&&!/^pro$/i.test(b)?`<span class="bl-badge">${esc(b)}</span>`:'';

/* ---------- текст статті: заголовки, списки, абзаци ---------- */
const CHATTY=/^(якщо (хочеш|скажеш|напишеш|надішлеш|опишеш)|напиши|скажи|опиши)/i;
function render(txt){
 const blocks=txt.replace(/\r/g,'').trim().split(/\n\s*\n/);let ask=false;
 if(blocks.length>1&&CHATTY.test(blocks[blocks.length-1].trim())){blocks.pop();ask=true}
 const html=blocks.map(b=>{const L=b.split('\n').map(x=>x.trim()).filter(Boolean);if(!L.length)return'';
  let out='',i=0;
  const isLi=x=>/^(-|•|—)\s+/.test(x),isNum=x=>/^\d+[).]\s+/.test(x);
  if(L.length>1&&!isLi(L[0])&&!isNum(L[0])&&L[0].length<110&&!/[.!?]$/.test(L[0])){out+=`<h2>${esc(L[0])}</h2>`;i=1}
  else if(L.length==1&&L[0].length<90&&!/[.!?:]$/.test(L[0])&&!isLi(L[0])){return`<h2>${esc(L[0])}</h2>`}
  let mode='';
  const close=()=>{if(mode){out+=mode=='ul'?'</ul>':'</ol>';mode=''}};
  for(;i<L.length;i++){const x=L[i];
   if(isLi(x)){if(mode!='ul'){close();out+='<ul>';mode='ul'}out+=`<li>${fmt(x.replace(/^(-|•|—)\s+/,''))}</li>`}
   else if(isNum(x)){if(mode!='ol'){close();out+='<ol>';mode='ol'}out+=`<li>${fmt(x.replace(/^\d+[).]\s+/,''))}</li>`}
   else{close();out+=`<p>${fmt(x)}</p>`}}
  close();return out}).join('');
 return{html,ask}}
const fmt=s=>esc(s).replace(/^([^:]{2,40}):\s/,'<b>$1:</b> ');

/* ---------- список ---------- */
function list(){const w=q.toLowerCase().split(/\s+/).filter(Boolean);
 return POSTS.filter(p=>(!cat||p.category==cat)&&w.every(x=>(p.title+' '+p.desc+' '+p.tags.join(' ')+' '+p.category).toLowerCase().includes(x)))}
const bcard=p=>`<a class="bl-card" href="#post=${encodeURIComponent(p.slug)}"><span class="im"><img loading="lazy" src="${esc(p.cover)}" alt="" onerror="this.style.opacity=0">${badge(p.badge)}</span><span class="tx"><em>${esc(p.category)} · ${p.readTime} хв</em><b>${esc(p.title)}</b><span>${esc(p.desc)}</span></span></a>`;
function drawCats(){
 const c={};POSTS.forEach(p=>c[p.category]=(c[p.category]||0)+1);
 $i('blCats').innerHTML=`<button type="button" class="${!cat?'on':''}" data-cat="">Усі <i>${POSTS.length}</i></button>`+Object.entries(c).sort((a,b)=>b[1]-a[1]).map(([k,n])=>`<button type="button" class="${cat==k?'on':''}" data-cat="${esc(k)}">${esc(k)} <i>${n}</i></button>`).join('')}
function drawList(){
 const L=list();
 $i('blGrid').innerHTML=L.length?L.slice(0,shown).map(bcard).join(''):`<p class="bl-empty">Нічого не знайдено. Спробуйте інше слово або <button type="button" class="link" data-cat="">усі статті</button>.</p>`;
 $i('blMore').hidden=L.length<=shown;
 $i('blCnt').textContent=q||cat?`Знайдено: ${L.length}`:''}

/* ---------- стаття ---------- */
function openPost(slug){
 const p=POSTS.find(x=>x.slug==slug);if(!p)return showList();
 const r=render(p.content),c=CAT[p.category];
 const rel=POSTS.filter(x=>x.slug!=p.slug&&(x.category==p.category||x.tags.some(t=>p.tags.includes(t)))).slice(0,3);
 $i('blPost').innerHTML=`<nav class="crumbs"><span><a href="./">Головна</a></span><span><a href="blog.html" data-back>Блог</a></span><span>${esc(p.category)}</span></nav>
  <article class="bl-art"><div class="bl-ah"><em>${esc(p.category)} · ${fmtD(p.date)} · ${p.readTime} хв читання</em><h1>${esc(p.title)}</h1><p class="lead">${esc(p.desc)}</p></div>
  <img class="bl-cover" src="${esc(p.cover)}" alt="" onerror="this.remove()">
  <div class="bl-txt">${r.html}</div>
  <aside class="bl-ask"><div><b>${r.ask?'Підкажемо під вашу ситуацію':'Залишились питання?'}</b><span>Надішліть фото чи розміри — менеджер підбере матеріал і порахує кількість.</span></div><div class="acts"><a class="btn" href="https://t.me/${CFG.tg}?text=${encodeURIComponent('Вітаю! Прочитав(ла) статтю «'+p.title+'». Питання:')}" target="_blank" rel="noopener">Написати в Telegram</a>${c?`<a class="btn ghost" href="${c[1]}">Дивитися товари</a>`:''}</div></aside>
  ${p.tags.length?`<p class="bl-tags">${p.tags.map(t=>`<span>#${esc(t)}</span>`).join('')}</p>`:''}</article>
  <section class="bl-prod" id="blProd" hidden><h2>Товари до статті</h2><div class="grid" id="blProdG"></div></section>
  ${rel.length?`<section class="bl-rel"><h2>Читайте також</h2><div class="bl-grid">${rel.map(bcard).join('')}</div></section>`:''}`;
 $i('blHome').hidden=true;$i('blPost').hidden=false;scrollTo(0,0);meta(p);prods(p)}
function prods(p){
 const c=CAT[p.category],box=$i('blProd');if(!box||!c||!loaded)return;
 const L=all.filter(x=>x.av&&x.img&&x.cat==c[0]).slice(0,4);if(!L.length)return;
 $i('blProdG').innerHTML=L.map(card).join('');box.hidden=false}
function meta(p){
 const set=(s,a,v)=>{const m=document.head.querySelector(s);if(m)m.setAttribute(a,v)};
 if(p){document.title=`${p.title} — Блог Samostroy Shop`;set('meta[name=description]','content',p.desc);set('meta[property="og:title"]','content',p.title);set('meta[property="og:image"]','content',p.cover);
  $i('blLd').textContent=JSON.stringify({'@context':'https://schema.org','@type':'BlogPosting',headline:p.title,description:p.desc,image:p.cover,datePublished:p.date,inLanguage:'uk',author:{'@type':'Organization',name:'Samostroy Shop'},publisher:{'@type':'Organization',name:'Samostroy Shop',logo:{'@type':'ImageObject',url:'https://samostroy.shop/samostroy-shop-logo.jpg'}},mainEntityOfPage:'https://samostroy.shop/blog.html#post='+p.slug})}
 else{document.title=PAGE.title;set('meta[name=description]','content',PAGE.desc);$i('blLd').textContent=''}}
function showList(){$i('blPost').hidden=true;$i('blHome').hidden=false;meta(null)}
function route(){const m=location.hash.match(/^#post=(.+)$/);if(m)openPost(decodeURIComponent(m[1]));else showList()}

/* ---------- події ---------- */
document.addEventListener('click',e=>{
 const c=e.target.closest('[data-cat]');if(c&&c.closest('#blHome')){cat=c.dataset.cat;shown=STEP;drawCats();drawList();return}
 const b=e.target.closest('[data-back]');if(b){e.preventDefault();history.pushState(null,'',location.pathname);showList()}});
let tq;$i('blQ').addEventListener('input',e=>{clearTimeout(tq);tq=setTimeout(()=>{q=e.target.value.trim();shown=STEP;drawList()},150)});
$i('blMore').addEventListener('click',()=>{shown+=STEP;drawList()});
addEventListener('hashchange',route);
// shop.js після завантаження каталогу ставить SEO сторінки — повертаємо мета статті й показуємо товари
addEventListener('catalog',()=>setTimeout(()=>{const m=location.hash.match(/^#post=(.+)$/);if(m){const p=POSTS.find(x=>x.slug==decodeURIComponent(m[1]));if(p){meta(p);prods(p)}}},0));

fetch('blog.json',{cache:'no-cache'}).then(r=>r.json()).then(d=>{
 POSTS=d.sort((a,b)=>b.date.localeCompare(a.date));
 drawCats();drawList();route();
}).catch(()=>{$i('blGrid').innerHTML='<p class="bl-empty">Не вдалося завантажити статті. Оновіть сторінку.</p>'});
})();
