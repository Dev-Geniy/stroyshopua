/* Адмінка → «Блог»: написання й публікація статей з одного поля за інструкцією.
   Стаття перевіряється перед публікацією: якщо формат порушено, кнопка «Опублікувати» не працює.
   Публікація — запис у blog.json на GitHub через ключ із Налаштувань (як і відгуки); сайт сам створює сторінку за 2–3 хв.
   Працює поверх основного скрипта admin.html ($, esc, toast, store, gh, ghGet, ghPut, ghTok, ghErr, download, SITE). */
window.BL=(()=>{
const RUBRICS=['Стіни','Підлога','Плитка','Плівка й шпалери','Декор і дзеркала','Дім і меблі','Ремонт своїми руками','Покупцям','Бізнес і співпраця'];
const KEYS={'заголовок':'title','опис':'desc','рубрика':'category','товари':'cats','теги':'tags','адреса':'slug','дата':'date','seo-заголовок':'seo_title','кнопки':'links'};
const LIM={title:[30,120,40,90],desc:[70,200,120,170],words:100};
const DRAFT='adm_blog_draft';
const S={list:null,sha:null,loading:false,err:'',sub:'list',q:'',edit:null,cats:null,urls:null,cover:null,res:null,tab:'check',done:null};
const $v=()=>document.getElementById('v-blog');
const today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Kyiv'});

/* ---------- довідники: категорії товарів (з shop.js) і адреси сайту (з sitemap.xml) ---------- */
async function refs(){
 if(!S.cats){try{const t=await(await fetch('shop.js?t='+Date.now(),{cache:'no-store'})).text();
  S.cats=[...t.matchAll(/^\['([\w-]+)','(\w+)','([^']*)','([^']*)',/gm)].map(m=>({slug:m[1],name:m[3]}))}catch(e){S.cats=[]}}
 if(!S.urls){try{const t=await(await fetch('sitemap.xml?t='+Date.now(),{cache:'no-store'})).text();
  S.urls=new Set([...t.matchAll(/<loc>https:\/\/samostroy\.shop\/([^<]*)<\/loc>/g)].map(m=>m[1]))}catch(e){S.urls=null}}}
async function loadList(fresh){
 if(S.loading)return;S.loading=true;S.err='';
 try{
  if(ghTok()){const r=await ghGet('blog.json');if(!r)throw 0;S.list=JSON.parse(r.text||'[]');S.sha=r.sha}
  else{const r=await fetch('blog.json?t='+Date.now(),{cache:'no-store'});S.list=await r.json();S.sha=null}
  S.list.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 }catch(e){S.err='Не вдалося завантажити статті. Перевірте інтернет'+(ghTok()?' і ключ GitHub':'')+'.'}
 S.loading=false;if(view=='blog')draw()}

/* ---------- транслітерація для адреси ---------- */
const TR={а:'a',б:'b',в:'v',г:'h',ґ:'g',д:'d',е:'e',є:'ye',ж:'zh',з:'z',и:'y',і:'i',ї:'yi',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ь:'',ю:'yu',я:'ya',ы:'y',э:'e',ё:'yo',ъ:''};
function slugify(t){let s=String(t).toLowerCase().replace(/[’'ʼ`"«»]/g,'').split('').map(c=>TR[c]??c).join('').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
 if(s.length>70){s=s.slice(0,70);s=s.slice(0,s.lastIndexOf('-')>30?s.lastIndexOf('-'):70)}return s}

/* ---------- шаблон, інструкція й завдання для ШІ ---------- */
const TPL=`Заголовок: {{Заголовок статті, 40–90 символів}}
Опис: {{1–2 речення для Google: про що стаття й чим корисна, 120–170 символів}}
Рубрика: {{одна рубрика зі списку}}
Товари: {{1–4 адреси категорій через кому, напр.: 3d-paneli, pet-plytka}}
Теги: {{3–6 ключових фраз через кому}}
---
{{Вступ: 2–3 речення — про що стаття і кому вона допоможе.}}

## {{Перший підзаголовок}}
{{Абзац тексту. Абзаци розділяйте порожнім рядком.}}
- {{пункт списку}}
- {{пункт списку}}

## {{Другий підзаголовок}}
1. {{перший крок}}
2. {{другий крок}}

> {{Порада — виділений блок}}

Готові матеріали — у розділі [3D панелі](c/3d-paneli.html).

=== Питання й відповіді ===
П: {{Питання?}}
В: {{Відповідь у 1–3 речення.}}`;
function aiTask(){const cats=(S.cats||[]).map(c=>`${c.slug} — ${c.name}`).join('\n');
 return `Напиши статтю для блогу інтернет-магазину Samostroy Shop (samostroy.shop) — самоклеючі матеріали для ремонту своїми руками без майстра: 3D панелі, PET і вінілова плитка, плівка, шпалери, підлога, екошкіра, дзеркала тощо.

Тема: [ВПИШІТЬ ТЕМУ]

Вимоги до тексту:
- українською мовою, просто й по-людськи, для людей, які роблять ремонт самі;
- 300–700 слів, 3–6 підзаголовків, списки й покрокові інструкції там, де доречно;
- лише перевірені загальні поради; не вигадуй ціни, гарантії й характеристики конкретних товарів;
- 1–3 посилання на категорії магазину у форматі [назва](c/адреса.html) з переліку нижче.

Відповідь — СУВОРО в такому форматі, без жодного тексту до чи після:

Заголовок: заголовок статті, 40–90 символів
Опис: 1–2 речення для Google, 120–170 символів
Рубрика: одна з: ${RUBRICS.join(', ')}
Товари: 1–4 адреси категорій з переліку нижче, через кому
Теги: 3–6 ключових фраз малими літерами через кому
---
Вступ 2–3 речення.

## Підзаголовок
Абзаци розділяй порожнім рядком.
- пункт списку
1. крок інструкції
> порада (виділений блок)
**жирний текст** і [посилання](c/адреса.html)

=== Питання й відповіді ===
П: питання?
В: відповідь 1–3 речення.
(2–4 пари П/В)

Правила формату: не використовуй "# " (одна решітка), "####", "* " чи "+ " для списків, HTML-теги, таблиці й зображення. Кожен рядок "П:" має одразу наступний рядок "В:".

Адреси категорій (адреса — назва):
${cats}`}
function help(){
 return `<div class="bl-help">
 <p><b>Як написати статтю:</b> натисніть «Вставити шаблон», замініть усі <code>{{…}}</code> своїм текстом і натисніть «Опублікувати». Або скопіюйте «Завдання для ШІ», вставте в ChatGPT чи Claude, допишіть тему — і вставте відповідь у поле.</p>
 <div class="acts"><button class="btn ghost sm" data-bl="tpl">Вставити шаблон</button><button class="btn ghost sm" data-bl="ctpl">Копіювати шаблон</button><button class="btn ghost sm" data-bl="ai">Копіювати завдання для ШІ</button></div>
 <h4>1. Шапка — поля «Назва: значення»</h4>
 <table class="bl-t"><tr><td><code>Заголовок:</code></td><td>обов’язково, 40–90 символів</td></tr>
 <tr><td><code>Опис:</code></td><td>обов’язково, 120–170 символів — це текст під посиланням у Google</td></tr>
 <tr><td><code>Рубрика:</code></td><td>обов’язково, одна з: ${RUBRICS.map(r=>`<button type="button" class="bl-ins" data-ins="${esc(r)}">${esc(r)}</button>`).join(' ')}</td></tr>
 <tr><td><code>Товари:</code></td><td>1–4 адреси категорій через кому — під статтею з’являться товари з них (список нижче)</td></tr>
 <tr><td><code>Теги:</code></td><td>3–6 ключових фраз через кому</td></tr>
 <tr><td><code>Адреса:</code></td><td>необов’язково — латиницею через дефіс; інакше створиться із заголовка</td></tr>
 <tr><td><code>Дата:</code></td><td>необов’язково, РРРР-ММ-ДД; інакше сьогодні</td></tr>
 <tr><td><code>SEO-заголовок:</code></td><td>необов’язково — інший заголовок для вкладки й Google, до 70 символів</td></tr>
 <tr><td><code>Кнопки:</code></td><td>необов’язково — кнопки під статтею: <code>dropshipping.html | Умови дропшипінгу; academy.html | Академія</code></td></tr></table>
 <p>Після шапки — рядок <code>---</code>.</p>
 <h4>2. Текст статті</h4>
 <table class="bl-t"><tr><td><code>## Підзаголовок</code></td><td>розділ (хоча б один обов’язковий)</td></tr>
 <tr><td><code>### Підрозділ</code></td><td>менший підзаголовок</td></tr>
 <tr><td>порожній рядок</td><td>новий абзац</td></tr>
 <tr><td><code>- пункт</code></td><td>список</td></tr>
 <tr><td><code>1. крок</code></td><td>нумерований список</td></tr>
 <tr><td><code>&gt; порада</code></td><td>виділений блок-порада</td></tr>
 <tr><td><code>**слово**</code></td><td>жирний</td></tr>
 <tr><td><code>[текст](c/3d-paneli.html)</code></td><td>посилання: категорія <code>c/…</code>, стаття <code>blog/…</code>, товар <code>p/…</code>, сторінка <code>dropshipping.html</code> або повна адреса <code>https://…</code></td></tr></table>
 <p>Не можна: <code># </code> (одна решітка — це заголовок сторінки), <code>####</code>, списки через <code>*</code> чи <code>+</code>, HTML-теги.</p>
 <h4>3. Питання й відповіді (необов’язково)</h4>
 <p>Рядок <code>=== Питання й відповіді ===</code>, далі пари рядків <code>П: питання?</code> і <code>В: відповідь</code>. Вони з’являться під статтею й у Google.</p>
 <h4>Категорії товарів</h4>
 <input type="search" id="bl-cq" placeholder="Пошук категорії" aria-label="Пошук категорії">
 <div class="bl-cats" id="bl-cl">${catList('')}</div>
 </div>`}
function catList(q){q=q.trim().toLowerCase();return(S.cats||[]).filter(c=>!q||(c.slug+' '+c.name).toLowerCase().includes(q)).map(c=>`<button type="button" class="bl-ins" data-ins="${esc(c.slug)}" title="Вставити адресу"><code>${esc(c.slug)}</code> ${esc(c.name)}</button>`).join('')||'<p class="note">Нічого не знайдено</p>'}

/* ---------- розбір і перевірка ---------- */
function parse(src){
 const L=String(src).replace(/\r/g,'').split('\n'),E=[],W=[],a={},seen={};
 const err=(ln,m)=>E.push({ln,m}),warn=(ln,m)=>W.push({ln,m});
 let i=0;while(i<L.length&&!L[i].trim())i++;
 let sep=-1;
 for(;i<L.length;i++){const s=L[i].trim();
  if(/^-{3,}$/.test(s)){sep=i;break}
  if(!s)continue;
  const m=s.match(/^([^:]{2,20}):\s*(.*)$/);
  if(!m){err(i+1,'У шапці кожен рядок має бути «Назва: значення». Якщо шапка закінчилась — поставте рядок ---');continue}
  const k=KEYS[m[1].trim().toLowerCase()];
  if(!k){err(i+1,`Невідоме поле «${m[1].trim()}». Дозволені: Заголовок, Опис, Рубрика, Товари, Теги, Адреса, Дата, SEO-заголовок, Кнопки`);continue}
  if(seen[k]){err(i+1,`Поле «${m[1].trim()}» вказано двічі`);continue}
  seen[k]=i+1;a[k]=m[2].trim()}
 if(sep<0){err(L.length,'Немає рядка --- між шапкою й текстом статті');return{a,E,W,L}}
 // текст і FAQ
 let fq=-1;for(let j=sep+1;j<L.length;j++)if(/^={3,}\s*(питання|faq)/i.test(L[j].trim())){fq=j;break}
 const bodyL=L.slice(sep+1,fq<0?L.length:fq);
 a.body=bodyL.join('\n').replace(/^\n+|\s+$/g,'');a._b0=sep+2;
 a.faq=[];
 if(fq>=0){let q=null,ql=0;
  for(let j=fq+1;j<L.length;j++){const s=L[j].trim();if(!s)continue;
   let m;
   if(m=s.match(/^(П|Q|Питання)\s*[:.]\s*(.*)$/i)){if(q!==null)err(ql,'Питання без відповіді: після «П:» потрібен рядок «В:»');q=m[2].trim();ql=j+1;if(!q)err(j+1,'Порожнє питання');else if(!/\?$/.test(q))warn(j+1,'Питання краще закінчувати знаком «?»')}
   else if(m=s.match(/^(В|A|Відповідь)\s*[:.]\s*(.*)$/i)){if(q===null){err(j+1,'Відповідь без питання: перед «В:» потрібен рядок «П:»');continue}
    const x=m[2].trim();if(x.split(/\s+/).length<4)err(j+1,'Відповідь занадто коротка — щонайменше одне повне речення');a.faq.push([q,x]);q=null}
   else if(a.faq.length&&q===null){a.faq[a.faq.length-1][1]+=' '+s}
   else err(j+1,'У блоці питань кожен рядок починається з «П:» або «В:»')}
  if(q!==null)err(ql,'Питання без відповіді: після «П:» потрібен рядок «В:»');
  if(!a.faq.length)err(fq+1,'Блок питань порожній — додайте пари «П:»/«В:» або приберіть рядок ===');
  if(a.faq.length>10)err(fq+1,'Забагато питань — до 10')}
 return{a,E,W,L,fq}}

function validate(src){
 const P=parse(src),{a,E,W,L}=P,err=(ln,m)=>E.push({ln,m}),warn=(ln,m)=>W.push({ln,m}),ln=k=>{const r=new RegExp('^\\s*'+Object.keys(KEYS).find(x=>KEYS[x]==k)+'\\s*:','i');const i=L.findIndex(l=>r.test(l));return i<0?1:i+1};
 if(/\{\{|\}\}/.test(src)){const i=L.findIndex(l=>/\{\{|\}\}/.test(l));err(i+1,'Залишились підказки з шаблону {{…}} — замініть їх своїм текстом')}
 // шапка
 const len=(k,name)=>{const v=a[k]||'',[mn,mx,wmn,wmx]=LIM[k];if(!v)return err(ln(k),`Не заповнено поле «${name}»`);
  if(v.length<mn||v.length>mx)err(ln(k),`«${name}»: ${v.length} символів, потрібно ${mn}–${mx}`);else if(v.length<wmn||v.length>wmx)warn(ln(k),`«${name}»: ${v.length} символів, найкраще ${wmn}–${wmx}`)};
 len('title','Заголовок');len('desc','Опис');
 if(!a.category)err(ln('category'),'Не заповнено поле «Рубрика»');
 else{const r=RUBRICS.find(x=>x.toLowerCase()==a.category.toLowerCase());if(!r)err(ln('category'),`Рубрика «${a.category}» не існує. Оберіть одну з: ${RUBRICS.join(', ')}`);else a.category=r}
 a.cats=(a.cats||'').split(/[,;]/).map(s=>s.trim().replace(/^c\//,'').replace(/\.html$/,'')).filter(Boolean);
 if(S.cats&&S.cats.length)a.cats.forEach(c=>{if(!S.cats.some(x=>x.slug==c)){const g=S.cats.filter(x=>x.slug.includes(c.split('-')[0])).slice(0,3).map(x=>x.slug);err(ln('cats'),`Категорії «${c}» немає${g.length?'. Можливо: '+g.join(', '):'. Див. список праворуч'}`)}});
 if(!a.cats.length)warn(ln('cats'),'Не вказано «Товари» — під статтею не буде товарів із магазину');
 if(a.cats.length>4)err(ln('cats'),'«Товари»: до 4 категорій');
 a.tags=(a.tags||'').split(',').map(s=>s.trim()).filter(Boolean);
 if(a.tags.length<2)err(ln('tags'),'«Теги»: щонайменше 2 фрази через кому');else if(a.tags.length>10)err(ln('tags'),'«Теги»: не більше 10');
 a.tags.forEach(t=>{if(t.length>40)err(ln('tags'),`Тег «${t.slice(0,20)}…» задовгий — до 40 символів`)});
 a.tags=a.tags.map(t=>t.toLowerCase());
 if(a.slug){if(!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.slug))err(ln('slug'),'«Адреса»: лише малі латинські літери, цифри й дефіси, напр. yak-poklyeyity-plytku');else if(a.slug.length>80)err(ln('slug'),'«Адреса» задовга — до 80 символів')}
 else if(a.title)a.slug=slugify(a.title);
 if(a.slug&&S.list){const ex=S.list.find(x=>x.slug==a.slug);if(ex&&(!S.edit||S.edit!=a.slug))err(ln(a.slug&&L.some(l=>/^\s*адреса\s*:/i.test(l))?'slug':'title'),`Стаття з адресою «${a.slug}» уже є: «${ex.title}». Змініть заголовок або вкажіть інше поле «Адреса»`)}
 if(S.edit&&a.slug&&a.slug!=S.edit)warn(ln('slug'),`Адреса зміниться з «${S.edit}» на «${a.slug}» — старе посилання на статтю перестане працювати`);
 if(a.date){if(!/^\d{4}-\d{2}-\d{2}$/.test(a.date)||isNaN(new Date(a.date)))err(ln('date'),'«Дата»: формат РРРР-ММ-ДД, напр. '+today());else if(a.date>today())err(ln('date'),'«Дата» в майбутньому — стаття публікується одразу, вкажіть сьогоднішню або минулу дату')}
 if(a.seo_title&&a.seo_title.length>70)warn(ln('seo_title'),`«SEO-заголовок»: ${a.seo_title.length} символів — Google покаже ~60`);
 if(a.links){const out=[];a.links.split(';').map(s=>s.trim()).filter(Boolean).forEach(p=>{const m=p.split('|').map(s=>s.trim());
   if(m.length!=2||!m[0]||!m[1])return err(ln('links'),`«Кнопки»: формат «адреса | текст», кнопки через «;» — «${p.slice(0,40)}»`);
   if(m[1].length>40)err(ln('links'),`Текст кнопки «${m[1].slice(0,20)}…» задовгий — до 40 символів`);
   const u=checkUrl(m[0]);if(u)err(ln('links'),'«Кнопки»: '+u);out.push([m[0].replace(/^https:\/\/samostroy\.shop\//,'').replace(/^\//,''),m[1]])});
  if(out.length>3)err(ln('links'),'«Кнопки»: не більше 3');a.links=out}
 // текст
 const b0=a._b0||1;let words=0,h2=0,heads={};
 if(a.body!==undefined){
  const BL=String(a.body).split('\n');let inList=false;
  BL.forEach((l,k)=>{const n=b0+k,s=l.trim();if(!s)return;
   words+=(s.match(/[\p{L}\d]+/gu)||[]).length;
   if(/^#\s/.test(s))err(n,'«# » — одна решітка не використовується: заголовок сторінки береться з поля «Заголовок». Використовуйте «## »');
   else if(/^#{4,}/.test(s))err(n,'«####» не підтримується — використовуйте «## » або «### »');
   else if(/^#{2,3}[^#\s]/.test(s))err(n,'Після «##» потрібен пробіл: «## Підзаголовок»');
   else if(/^#{2,3}\s*$/.test(s))err(n,'Порожній підзаголовок');
   if(/^##\s/.test(s)){h2++;const t=s.slice(3).trim().toLowerCase();if(heads[t])warn(n,'Підзаголовок повторюється');heads[t]=1;if(t.length>90)warn(n,'Підзаголовок задовгий')}
   if(/^[*+]\s/.test(s))err(n,'Списки пишуться через «- » (дефіс і пробіл), а не «*» чи «+»');
   if(/^\d+\)\s/.test(s))err(n,'Нумерований список: «1. крок», а не «1) крок»');
   if(/<\/?[a-z][^>]*>/i.test(s))err(n,'HTML-теги не дозволені — використовуйте розмітку з інструкції');
   if(/^\|.*\|$/.test(s))err(n,'Таблиці не підтримуються — зробіть список');
   if(/!\[/.test(s))err(n,'Зображення в тексті не підтримуються — обкладинку завантажте окремо');
   const st=(s.match(/\*\*/g)||[]).length;if(st%2)err(n,'Незакритий **жирний** — кількість «**» у рядку має бути парною');
   if(/(^|[^*])\*[^*\s][^*]*\*(?!\*)/.test(s.replace(/\*\*/g,'')))warn(n,'Одинарні *зірочки* не підтримуються — для виділення «**жирний**»');
   const tmp=s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,(m0,t,u)=>{const e=checkUrl(u);if(e)err(n,`Посилання «${t.slice(0,30)}»: ${e}`);return ''});
   if(/\]\s*\(/.test(tmp))err(n,'Неправильне посилання — формат [текст](адреса): без пробілу між ] і (, адреса без пробілів');
   if(/(^|\s)https?:\/\/\S+/.test(tmp))warn(n,'Голе посилання — краще оформити як [текст](адреса)');
   if(/[ыэъё]/i.test(s))warn(n,'Є російські літери (ы, э, ъ, ё) — перевірте мову');
  });
  if(!a.body.trim())err(b0,'Порожній текст статті');
  else{if(words<LIM.words)err(b0,`Текст статті закороткий: ${words} слів, потрібно щонайменше ${LIM.words}`);else if(words<150)warn(b0,`${words} слів — коротка стаття; розгорнутіші (200–600 слів) частіше потрапляють у пошук`);
   if(!h2)err(b0,'Додайте хоча б один підзаголовок «## »')}
 }
 (a.faq||[]).forEach(([q,x])=>{if(/[ыэъё]/i.test(q+x))warn(P.fq+1,'У питаннях є російські літери (ы, э, ъ, ё)')});
 a.words=words;E.sort((x,y)=>x.ln-y.ln);W.sort((x,y)=>x.ln-y.ln);
 return{a,E,W}}
function checkUrl(u){
 if(/^https?:\/\//.test(u)){if(!/^https:\/\//.test(u))return 'використовуйте https://';if(!/^https:\/\/samostroy\.shop\//.test(u))return '';u=u.replace(/^https:\/\/samostroy\.shop\//,'')}
 u=u.replace(/^\.\//,'').replace(/^\//,'').replace(/[?#].*$/,'');
 if(/^(tel:|mailto:)/.test(u)||u==''||u=='.')return '';
 if(/^https?:/.test(u))return '';
 if(!/\.html$/.test(u)&&!/\.(pdf|jpg|png|webp)$/.test(u))return `адреса «${u}» має закінчуватись на .html (напр. c/3d-paneli.html)`;
 let m;
 if(m=u.match(/^c\/([\w-]+)\.html$/)){if(S.cats&&S.cats.length&&!S.cats.some(c=>c.slug==m[1]))return `категорії «${m[1]}» немає`;return ''}
 if(m=u.match(/^blog\/([\w-]+)\.html$/)){if(S.list&&!S.list.some(x=>x.slug==m[1])&&m[1]!=S.edit)return `статті «${m[1]}» немає`;return ''}
 if(S.urls&&!S.urls.has(u)&&!/^partner\//.test(u)&&!['kabinet.html','anketa.html','partners.html','admin.html'].includes(u))return `сторінки «${u}» немає на сайті`;
 return ''}

/* ---------- Markdown → HTML (як на сайті) ---------- */
function md(src){
 const inl=s=>esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,(m,t,u)=>`<a href="${u}" target="_blank" rel="noopener">${t}</a>`);
 const out=[];let lst=null,para=[];
 const flush=()=>{if(para.length){out.push('<p>'+inl(para.join(' '))+'</p>');para=[]}if(lst){out.push(`</${lst}>`);lst=null}};
 for(const line of String(src).split('\n')){const s=line.trim();
  if(!s){flush();continue}
  if(s.startsWith('### ')){flush();out.push(`<h3>${inl(s.slice(4))}</h3>`);continue}
  if(s.startsWith('## ')){flush();out.push(`<h2>${inl(s.slice(3))}</h2>`);continue}
  if(s.startsWith('> ')){flush();out.push(`<div class="bl-tip">${inl(s.slice(2))}</div>`);continue}
  const m=s.match(/^(-|\d+\.)\s+(.*)/);
  if(m){const t=m[1]=='-'?'ul':'ol';if(para.length){out.push('<p>'+inl(para.join(' '))+'</p>');para=[]}
   if(lst!=t){if(lst)out.push(`</${lst}>`);out.push(`<${t}>`);lst=t}out.push(`<li>${inl(m[2])}</li>`);continue}
  if(lst){out.push(`</${lst}>`);lst=null}para.push(s)}
 flush();return out.join('\n')}

/* ---------- стаття ↔ текст поля ---------- */
function toText(x){
 const h=[`Заголовок: ${x.title}`,`Опис: ${x.desc}`,`Рубрика: ${x.category}`,`Товари: ${(x.cats||[]).join(', ')}`,`Теги: ${(x.tags||[]).join(', ')}`,`Адреса: ${x.slug}`,`Дата: ${x.date}`];
 if(x.seo_title)h.push(`SEO-заголовок: ${x.seo_title}`);
 if(x.links&&x.links.length)h.push(`Кнопки: ${x.links.map(l=>l[0]+' | '+l[1]).join('; ')}`);
 return h.join('\n')+'\n---\n'+String(x.body||'').trim()+(x.faq&&x.faq.length?'\n\n=== Питання й відповіді ===\n'+x.faq.map(([q,a])=>`П: ${q}\nВ: ${a}`).join('\n'):'')}
function toObj(a,orig){
 const o={slug:a.slug,title:a.title,desc:a.desc,category:a.category,cats:a.cats,tags:a.tags,date:a.date||(orig&&orig.date)||today(),body:a.body.trim(),faq:a.faq};
 if(a.links&&a.links.length)o.links=a.links;
 if(a.seo_title)o.seo_title=a.seo_title;
 if(orig){for(const k in orig)if(!(k in o)&&!['links','seo_title','updated'].includes(k))o[k]=orig[k];o.updated=today()}
 return o}

/* ---------- екрани ---------- */
function draw(){const v=$v();if(!v)return;
 const head=`<div class="sh"><div><h1>Блог</h1><p>Пишіть статті в одному полі за інструкцією — перевірка не дасть опублікувати статтю з помилками формату. <a href="${SITE}blog.html" target="_blank" rel="noopener">Блог на сайті</a></p></div>
  <div class="sh-a"><button class="btn sm" data-bl="new">Нова стаття</button></div></div>
 ${ghTok()?'':`<div class="warn" style="margin-bottom:12px"><b>Для публікації в 1 клік потрібен ключ GitHub</b><span>Той самий, що для відгуків: Налаштування → «Ключ GitHub» (Contents: Read and write). Без ключа можна написати й перевірити статтю та завантажити оновлений blog.json, щоб завантажити його на GitHub вручну.</span><div class="acts"><a class="btn sm" href="#settings">До налаштувань</a></div></div>`}
 <div class="chips"><button data-blsub="list" class="${S.sub=='list'?'on':''}">Статті<i>${S.list?S.list.length:'…'}</i></button><button data-blsub="edit" class="${S.sub=='edit'?'on':''}">${S.edit?'Редагування':'Редактор'}</button></div>
 <div id="bl-body"></div>`;
 v.innerHTML=head;
 if(S.sub=='list')dList();else dEdit()}
function dList(){const b=document.getElementById('bl-body');
 if(!S.list){b.innerHTML=S.err?`<div class="box"><p>${esc(S.err)}</p><div class="acts" style="margin-top:10px"><button class="btn sm" data-bl="reload">Спробувати ще раз</button></div></div>`:'<div class="box empty">Завантаження…</div>';if(!S.err)loadList();return}
 const q=S.q.trim().toLowerCase(),L=S.list.filter(x=>!q||(x.title+' '+x.slug+' '+x.category+' '+(x.tags||[]).join(' ')).toLowerCase().includes(q));
 b.innerHTML=`<div class="tools"><input class="sr" id="bl-q" type="search" placeholder="Пошук статті: назва, рубрика, тег" value="${esc(S.q)}" aria-label="Пошук статей"></div>
 <div class="list">${L.length?`<div class="row head bl-row"><span>Дата</span><span>Стаття</span><span>Рубрика</span><span>Дії</span></div>`+L.map(x=>`<div class="row bl-row">
  <span class="dt">${esc(x.date)}${x.updated?`<small class="note">ред. ${esc(x.updated)}</small>`:''}</span>
  <span class="cu"><b>${esc(x.title)}</b><span>blog/${esc(x.slug)}.html</span></span>
  <span class="dt">${esc(x.category)}</span>
  <span class="bl-act"><button class="btn ghost sm" data-bled="${esc(x.slug)}">Редагувати</button><a class="btn ghost sm" href="${SITE}blog/${esc(x.slug)}.html" target="_blank" rel="noopener">Відкрити</a><a class="btn ghost sm" href="${SITE}blog/${esc(x.slug)}.html#avtor" target="_blank" rel="noopener" title="ШІ-рерайт і публікація на інших сайтах">Поширити</a></span></div>`).join(''):'<div class="empty">Нічого не знайдено</div>'}</div>`;
 const i=document.getElementById('bl-q');i.addEventListener('input',()=>{S.q=i.value;const p=i.selectionStart;dList();const j=document.getElementById('bl-q');j.focus();j.setSelectionRange(p,p)})}
function dEdit(){const b=document.getElementById('bl-body');
 if(S.done){const d=S.done;b.innerHTML=`<div class="box bl-done"><h3>✓ ${d.del?'Статтю знято з сайту':'Статтю опубліковано'}</h3>
  <p>${d.del?'Сторінка зникне з сайту й карти сайту за 2–3 хвилини.':`Сторінка з’явиться на сайті за 2–3 хвилини — разом з блогом, картою сайту й повідомленням для Google і Bing.`}</p>
  ${d.del?'':`<p><a href="${SITE}blog/${esc(d.slug)}.html" target="_blank" rel="noopener"><b>${SITE}blog/${esc(d.slug)}.html</b></a></p>`}
  <div class="acts">${d.del?'':`<a class="btn" href="${SITE}blog/${esc(d.slug)}.html#avtor" target="_blank" rel="noopener">Поширити на інших сайтах</a>`}<button class="btn ghost" data-bl="new">Нова стаття</button><button class="btn ghost" data-blsub="list">До списку</button></div></div>`;return}
 const draft=S.edit?null:store.get(DRAFT);
 b.innerHTML=`<div class="bl-ed">
 <div class="bl-l">
  ${S.edit?`<p class="note" style="margin-bottom:8px">Редагуєте: <b>${esc(S.edit)}</b> · <button class="link" data-bl="new">скасувати й почати нову</button></p>`:''}
  <textarea id="bl-t" spellcheck="true" aria-label="Текст статті у форматі з інструкції" placeholder="Натисніть «Вставити шаблон» праворуч або вставте статтю у форматі з інструкції"></textarea>
  <div class="bl-meta" id="bl-meta"></div>
  <div class="bl-cov"><label>Обкладинка (необов’язково) <input type="file" id="bl-img" accept="image/jpeg,image/png,image/webp"></label><span class="note">Обріжеться до 1200×630 — так вона виглядатиме в Google і соцмережах. Без обкладинки буде загальна картинка блогу.</span><img id="bl-pv" alt="" hidden></div>
  <div class="acts" style="margin-top:12px"><button class="btn" id="bl-pub" data-bl="pub">Опублікувати</button><button class="btn ghost" data-bl="dl">Завантажити blog.json</button>${S.edit?`<button class="btn bad" data-bl="del">Зняти з сайту</button>`:''}</div>
 </div>
 <div class="bl-r">
  <div class="tabs">${[['check','Перевірка'],['view','Перегляд'],['help','Інструкція']].map(([k,l])=>`<button data-bltab="${k}" class="${S.tab==k?'on':''}">${l}</button>`).join('')}</div>
  <div class="box" id="bl-pane"></div>
 </div></div>`;
 const t=document.getElementById('bl-t');
 t.value=S.edit?toText(S.list.find(x=>x.slug==S.edit)||{}):(draft||'');
 let tm=null;t.addEventListener('input',()=>{if(!S.edit)store.set(DRAFT,t.value);clearTimeout(tm);tm=setTimeout(check,300)});
 document.getElementById('bl-img').addEventListener('change',e=>cover(e.target.files[0]));
 if(!t.value&&S.tab=='check')S.tab='help';
 check()}
function check(){const t=document.getElementById('bl-t');if(!t)return;
 S.res=t.value.trim()?validate(t.value):null;const r=S.res;
 const m=document.getElementById('bl-meta'),btn=document.getElementById('bl-pub');
 if(r){const a=r.a;m.innerHTML=`<span>${a.words||0} слів</span><span>заголовок ${(a.title||'').length}/90</span><span>опис ${(a.desc||'').length}/170</span><span>${a.faq?a.faq.length:0} питань</span>${a.slug?`<span>blog/${esc(a.slug)}.html</span>`:''}`;
  btn.disabled=r.E.length>0;btn.title=r.E.length?'Спочатку виправте помилки формату':''}
 else{m.innerHTML='';btn.disabled=true}
 pane()}
function pane(){const p=document.getElementById('bl-pane');if(!p)return;const r=S.res;
 document.querySelectorAll('[data-bltab]').forEach(b=>b.classList.toggle('on',b.dataset.bltab==S.tab));
 if(S.tab=='help'){p.innerHTML=help();const q=document.getElementById('bl-cq');q&&q.addEventListener('input',()=>{document.getElementById('bl-cl').innerHTML=catList(q.value)});return}
 if(!r){p.innerHTML='<p class="note">Поле порожнє. Відкрийте «Інструкцію» і натисніть «Вставити шаблон».</p>';return}
 if(S.tab=='check'){
  p.innerHTML=(r.E.length?`<div class="bl-st bad"><b>✕ ${r.E.length} ${pl0(r.E.length,'помилка','помилки','помилок')} — стаття не опублікується</b><span>Натисніть на помилку, щоб перейти до рядка.</span></div>`:`<div class="bl-st ok"><b>✓ Формат правильний — можна публікувати</b>${r.W.length?'<span>Нижче — поради, вони не заважають публікації.</span>':''}</div>`)+
  (r.E.length?`<ul class="bl-is">${r.E.map(x=>`<li class="er"><button type="button" data-ln="${x.ln}">рядок ${x.ln}</button>${esc(x.m)}</li>`).join('')}</ul>`:'')+
  (r.W.length?`<h4 style="margin-top:12px">Поради</h4><ul class="bl-is">${r.W.map(x=>`<li class="wn"><button type="button" data-ln="${x.ln}">рядок ${x.ln}</button>${esc(x.m)}</li>`).join('')}</ul>`:'')+
  (!r.E.length&&r.a.title?`<h4 style="margin-top:14px">Так стаття виглядатиме в Google</h4><div class="bl-g"><span>samostroy.shop › blog › ${esc(r.a.slug||'')}</span><b>${esc((r.a.seo_title||r.a.title).slice(0,62))}${(r.a.seo_title||r.a.title).length>62?'…':''}</b><p>${esc(r.a.desc.slice(0,165))}${r.a.desc.length>165?'…':''}</p></div>`:'');
  return}
 const a=r.a;
 p.innerHTML=`<article class="bl-pvw"><p class="note">${esc(a.category||'')} · ${esc(a.date||today())}</p><h1>${esc(a.title||'Без заголовка')}</h1><p class="lead">${esc(a.desc||'')}</p>${S.cover?`<img src="${S.cover}" alt="">`:''}${md(a.body||'')}
 ${a.faq&&a.faq.length?`<h2>Питання й відповіді</h2>${a.faq.map(([q,x])=>`<details open><summary>${esc(q)}</summary><p>${esc(x)}</p></details>`).join('')}`:''}
 ${a.links&&a.links.length?`<p>${a.links.map(l=>`<span class="btn ghost sm">${esc(l[1])}</span>`).join(' ')}</p>`:''}</article>`}
const pl0=(n,a,b,c)=>{const m=n%10,h=n%100;return m==1&&h!=11?a:m>=2&&m<=4&&(h<12||h>14)?b:c};
function goLine(n){const t=document.getElementById('bl-t');const L=t.value.split('\n');let i=0;for(let k=0;k<n-1&&k<L.length;k++)i+=L[k].length+1;
 t.focus();t.setSelectionRange(i,i+(L[n-1]||'').length);const lh=parseFloat(getComputedStyle(t).lineHeight)||22;t.scrollTop=Math.max(0,(n-4)*lh)}
function insert(txt){const t=document.getElementById('bl-t');if(!t)return;const s=t.selectionStart,e=t.selectionEnd;t.setRangeText(txt,s,e,'end');t.focus();t.dispatchEvent(new Event('input'))}

/* ---------- обкладинка ---------- */
function cover(f){S.cover=null;const pv=document.getElementById('bl-pv');pv.hidden=true;if(!f)return;
 if(f.size>15e6){toast('Файл завеликий — до 15 МБ');return}
 const img=new Image(),u=URL.createObjectURL(f);img.onload=()=>{const W=1200,H=630,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
  const k=Math.max(W/img.width,H/img.height),w=img.width*k,h=img.height*k;x.fillStyle='#fff';x.fillRect(0,0,W,H);x.drawImage(img,(W-w)/2,(H-h)/2,w,h);
  S.cover=c.toDataURL('image/jpeg',.86);pv.src=S.cover;pv.hidden=false;URL.revokeObjectURL(u);if(S.tab=='view')pane()};
 img.onerror=()=>toast('Не вдалося відкрити зображення');img.src=u}

/* ---------- публікація ---------- */
async function publish(b,del){
 await refs();if(!S.list)await loadList();
 const t=document.getElementById('bl-t');
 let r=null;if(!del){r=validate(t.value);S.res=r;S.tab='check';check();if(r.E.length){toast('Виправте помилки формату — стаття не опублікована');return}}
 if(!ghTok()){toast('Додайте ключ GitHub у Налаштуваннях або завантажте blog.json');return}
 b.classList.add('busy');
 try{
  if(!del&&S.cover){const path=`blog/img/${r.a.slug}.jpg`,ex=await gh('/contents/'+path+'?ref=main');
   const up=await gh('/contents/'+path,{method:'PUT',body:JSON.stringify({message:'Обкладинка статті: '+r.a.title,content:S.cover.split(',')[1],branch:'main',...(ex.ok&&ex.j.sha?{sha:ex.j.sha}:{})})});
   if(!up.ok){toast(ghErr(up));return}}
  for(let i=0;i<3;i++){
   const g=await ghGet('blog.json');if(!g){toast(ghErr({status:0}));return}
   let list;try{list=JSON.parse(g.text||'[]')}catch(e){toast('blog.json на GitHub пошкоджено — напишіть розробнику');return}
   let msg;
   if(del){list=list.filter(x=>x.slug!=S.edit);msg='Знято з сайту статтю: '+S.edit}
   else{const orig=S.edit?list.find(x=>x.slug==S.edit):null;
    if(!S.edit&&list.some(x=>x.slug==r.a.slug)){toast('Стаття з такою адресою вже є — змініть заголовок або «Адреса»');return}
    if(S.edit&&r.a.slug!=S.edit&&list.some(x=>x.slug==r.a.slug)){toast('Нова адреса вже зайнята іншою статтею');return}
    const o=toObj(r.a,orig),idx=S.edit?list.findIndex(x=>x.slug==S.edit):-1;
    if(idx>=0)list[idx]=o;else list.unshift(o);msg=(S.edit?'Оновлено статтю: ':'Нова стаття в блозі: ')+o.title}
   const p=await ghPut('blog.json',JSON.stringify(list,null,1)+'\n',g.sha,msg);
   if(p.ok){S.list=list.sort((x,y)=>String(y.date).localeCompare(String(x.date)));S.sha=p.j.content.sha;
    S.done={slug:del?S.edit:r.a.slug,del};if(!del&&!S.edit)store.del(DRAFT);S.edit=null;S.cover=null;draw();toast(del?'Статтю знято':'Опубліковано');return}
   if(p.status!=409&&p.status!=422){toast(ghErr(p));return}}
  toast('Файл щойно змінився — спробуйте ще раз')
 }finally{b.classList.remove('busy')}}
async function dl(){await refs();const t=document.getElementById('bl-t'),r=validate(t.value);S.res=r;S.tab='check';check();
 if(r.E.length)return toast('Спочатку виправте помилки формату');
 if(!S.list)await loadList();const list=(S.list||[]).filter(x=>x.slug!=(S.edit||r.a.slug));list.unshift(toObj(r.a,S.edit?S.list.find(x=>x.slug==S.edit):null));
 download('blog.json',JSON.stringify(list,null,1)+'\n','application/json');toast('Завантажте файл на GitHub: Add file → Upload files')}

/* ---------- події ---------- */
document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-bl],[data-blsub],[data-bltab],[data-bled],[data-ln],[data-ins]');if(!b||!b.closest('#v-blog'))return;const d=b.dataset;
 if(d.blsub){S.sub=d.blsub;S.done=null;return draw()}
 if(d.bltab){S.tab=d.bltab;return pane()}
 if(d.bled){await refs();S.edit=d.bled;S.sub='edit';S.done=null;S.cover=null;S.tab='check';return draw()}
 if(d.ln)return goLine(+d.ln);
 if(d.ins)return insert(d.ins);
 switch(d.bl){
  case'new':S.edit=null;S.sub='edit';S.done=null;S.cover=null;S.tab='help';return draw();
  case'reload':return loadList(true);
  case'tpl':{const t=document.getElementById('bl-t');if(t.value.trim()&&!confirm('Замінити текст у полі шаблоном?'))return;t.value=TPL;t.dispatchEvent(new Event('input'));S.tab='check';check();t.focus();return}
  case'ctpl':return copy(TPL);
  case'ai':await refs();return copy(aiTask());
  case'pub':return publish(b);
  case'del':if(!confirm('Зняти статтю «'+S.edit+'» з сайту? Сторінка зникне, посилання на неї перестане працювати.'))return;return publish(b,true);
  case'dl':return dl()}});

function render(){refs().then(()=>{if(S.sub=='edit'&&document.getElementById('bl-t'))check()});if(!S.list&&!S.loading)loadList();draw()}
return{render,validate,parse,toText,slugify,md,_S:S}})();
