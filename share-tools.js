/* Інструмент автора на сторінці статті блогу (бачить лише той, хто увійшов в адмінку на цьому пристрої).
   1) ШІ Pollinations (без ключа) пише НОВУ версію статті для зовнішнього майданчика — розділ за розділом,
      щоб текст не дублював сайт, але зберіг зміст. Посилання на магазин, дропшипінг, академію й курси
      вставляються шаблоном (ШІ їх не вигадує).
   2) Telegra.ph — публікація в 1 клік через офіційний API. Medium, Blogger, LinkedIn, Tumblr — текст
      копіюється з форматуванням і відкривається редактор майданчика. Короткі пости — для Facebook, Telegram, Threads, Instagram, Viber.
   Підключається з page.js, дані статті — з blog.json. */
(()=>{
const box=document.getElementById('baTools');if(!box)return;
const SITE='https://samostroy.shop/',AI='https://text.pollinations.ai/openai',TGPH='https://api.telegra.ph/';
const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const say=m=>{if(typeof toast=='function')toast(m);else alert(m)};
let admin=false;try{admin=localStorage.getItem('adm_tools')=='1'}catch(e){}
const slug=box.dataset.slug,URL0=`${SITE}blog/${slug}.html`;

const L={shop:SITE,drop:SITE+'dropshipping.html',acad:SITE+'academy.html',c1:SITE+'course-dropshipping.html',c2:SITE+'course-sales3.html',lk:SITE+'lk.html'};
const PL={
 telegraph:{n:'Telegra.ph',kind:'full',how:'Публікується автоматично в 1 клік. Сторінки Telegra.ph індексує Google, їх зручно поширювати в Telegram.'},
 medium:{n:'Medium',kind:'full',open:'https://medium.com/new-story',how:'Текст скопіюється з форматуванням → у редакторі Medium натисніть Ctrl+V. Заголовок — першим рядком.'},
 blogger:{n:'Blogger',kind:'full',open:'https://www.blogger.com/',how:'Створіть блог (один раз) → «Нова публікація» → вставте Ctrl+V. Безкоштовно, від Google.'},
 linkedin:{n:'LinkedIn',kind:'full',open:'https://www.linkedin.com/article/new/',how:'Відкриється редактор статті LinkedIn → вставте Ctrl+V. Добре заходять статті про бізнес і дропшипінг.'},
 tumblr:{n:'Tumblr',kind:'full',open:'https://www.tumblr.com/new/text',how:'Відкриється новий текстовий пост → вставте Ctrl+V.'},
 facebook:{n:'Facebook',kind:'post',max:900,how:'Текст скопіюється → відкриється вікно «Поділитися» з посиланням на статтю → вставте текст Ctrl+V.'},
 telegram:{n:'Telegram',kind:'post',max:900,how:'Відкриється Telegram з готовим текстом і посиланням — оберіть свій канал або чат.'},
 threads:{n:'Threads',kind:'post',max:480,how:'Відкриється Threads з готовим текстом.'},
 instagram:{n:'Instagram',kind:'post',max:1500,how:'Текст скопіюється для підпису до фото чи Reels. Посилання в Instagram не клікабельні — пишемо «посилання в шапці профілю».'},
 viber:{n:'Viber',kind:'post',max:700,how:'Відкриється Viber з готовим текстом — оберіть спільноту чи чат.'}};
let A=null,cur='telegraph',abort=null;

/* ---------- стилі ---------- */
const css=document.createElement('style');css.textContent=`
#baTools{margin:22px 0 0;border:2px dashed color-mix(in srgb,var(--orange) 55%,var(--line));border-radius:var(--r);padding:20px;background:var(--panel)}
#baTools h2{font-size:20px;margin:0 0 4px}#baTools .st-n{font-size:14px;color:var(--soft);margin:0 0 14px}
.st-pl{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 4px}.st-pl small{width:100%;font-size:12px;color:var(--soft);margin-top:6px}
.st-pl button{border:1.5px solid var(--line);background:var(--wall);border-radius:999px;padding:6px 14px;font:500 14px var(--f-b);cursor:pointer;color:var(--ink)}
.st-pl button.on{background:var(--slate);border-color:var(--slate);color:#fff}.st-pl button i{font-style:normal;color:var(--ok);margin-left:6px}
.st-how{font-size:14px;color:var(--soft);margin:10px 0}
.st-acts{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
.st-acts .btn{min-height:40px}
#baTools textarea{width:100%;min-height:380px;border:1.5px solid var(--line);border-radius:var(--r-s);background:var(--wall);padding:12px;font:14px/1.6 ui-monospace,Menlo,Consolas,monospace;color:var(--ink);resize:vertical}
.st-prog{display:grid;gap:6px;margin:10px 0;font-size:14px}.st-prog i{display:block;height:6px;border-radius:3px;background:var(--wall);overflow:hidden}.st-prog i b{display:block;height:100%;background:var(--orange);transition:width .3s}
.st-stat{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:13px;color:var(--soft);margin:6px 0}
.st-stat b{color:var(--ink)}.st-stat .good{color:var(--ok)}.st-stat .low{color:var(--bad)}
.st-w{list-style:none;padding:0;margin:8px 0;display:grid;gap:4px}.st-w li{font-size:13px;background:color-mix(in srgb,var(--orange) 10%,transparent);border-left:3px solid var(--orange);border-radius:4px;padding:6px 10px}
.st-w li.bad{background:color-mix(in srgb,var(--bad) 10%,transparent);border-left-color:var(--bad)}
.st-done{background:color-mix(in srgb,var(--ok) 12%,transparent);border-radius:var(--r-s);padding:10px 12px;font-size:14px;margin:8px 0}.st-done a{font-weight:600;word-break:break-all}
.st-hist{font-size:13px;color:var(--soft);margin-top:12px}.st-hist a{color:var(--orange-d)}
.st-pv{border:1px solid var(--line);border-radius:var(--r-s);padding:14px 16px;max-height:520px;overflow:auto;font-size:15px;line-height:1.6;background:var(--wall)}
.st-pv h1{font-size:22px;margin:0 0 8px}.st-pv h2{font-size:18px;margin:16px 0 6px}.st-pv h3{font-size:16px;margin:12px 0 4px}.st-pv ul,.st-pv ol{padding-left:20px}.st-pv a{color:var(--orange-d)}
`;document.head.appendChild(css);
box.hidden=false;
if(!admin){box.innerHTML='<h2>Інструмент автора</h2><p class="st-n">Щоб переписати й опублікувати статтю на інших сайтах, увійдіть в адмінку на цьому пристрої, а потім відкрийте статтю знову.</p><a class="btn ghost" href="admin.html#blog">Увійти в адмінку</a>';return}

/* ---------- ШІ ---------- */
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function ai(system,user,sig){
 for(let i=0;i<6;i++){
  if(sig&&sig.aborted)throw new Error('abort');
  try{const r=await fetch(AI,{method:'POST',headers:{'Content-Type':'application/json'},signal:sig,
    body:JSON.stringify({model:'openai',messages:[{role:'system',content:system},{role:'user',content:user}],referrer:'samostroy.shop',private:true})});
   if(r.ok){const j=await r.json();const t=j&&j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content;if(t&&t.trim())return clean(t)}
   const ra=+(r.headers.get('Retry-After')||0);await sleep((ra||8+i*6)*1000)}
  catch(e){if(e.name=='AbortError'||(sig&&sig.aborted))throw new Error('abort');await sleep(6000+i*4000)}}
 throw new Error('ШІ не відповідає. Спробуйте за кілька хвилин.')}
function clean(t){return String(t).replace(/^```[a-z]*\n?|```$/gim,'').replace(/^(ось|нижче)[^\n]{0,80}:\s*\n/i,'')
 .replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/https?:\/\/\S+/g,'').replace(/[ \t]+$/gm,'').trim()}
const RULES=`Правила:
- Лише літературна українська мова. Без російських слів, суржику й англійських слів.
- Передай ті самі факти, цифри й поради. НЕ додавай нових фактів, цифр, матеріалів, брендів чи властивостей.
- Пиши ІНШИМИ словами: синоніми, інша будова кожного речення, інший порядок думок; об’єднуй або розбивай речення. Жодне речення не має збігатися з оригіналом більш ніж на 4 слова поспіль.
- Без посилань і без пояснень від себе. Відповідай лише готовим текстом.`;
const SYS_SEC=`Ти — редактор українського блогу про ремонт своїми руками. Пишеш власний текст на основі фрагмента статті для іншого сайту.
${RULES}
- Підзаголовок "## ..." (якщо є) сформулюй по-новому й залиш з "## ". Списки залиш списками ("- " або "1. "), але пункти переформулюй. **Жирний** можна залишити.`;
const SYS_HEAD=`Ти — редактор українського блогу про ремонт своїми руками.
${RULES}
Формат відповіді: перший рядок — новий заголовок (до 90 символів, без лапок і без "#"), далі порожній рядок, далі новий вступ із 2–3 речень.`;
const SYS_FAQ=`Ти — редактор українського блогу про ремонт своїми руками.
${RULES}
Перепиши питання й відповіді своїми словами. Формат: для кожної пари рядок "**Питання?**", а наступний рядок — відповідь. Між парами — порожній рядок.`;
const SYS_POST=n=>`Ти — SMM-редактор магазину матеріалів для ремонту своїми руками. Пишеш короткий пост для ${n} українською.
${RULES}
- Структура: цікавий перший рядок-гачок; 3–5 коротких корисних порад або фактів зі статті (можна списком з "— "); заклик прочитати повну інструкцію.
- Розмовний, дружній тон. 1–3 доречні емодзі. Без хештегів.`;

/* ---------- шаблони посилань (варіанти — щоб тексти на різних майданчиках не були однаковими) ---------- */
const pick=(arr,k)=>arr[(k+slug.length)%arr.length];
function catLink(){const c=(A.cats||[])[0];if(!c)return null;let name=c;try{const x=(typeof CATS!='undefined'?CATS:[]).find(r=>r[0]==c);if(x)name=x[2]}catch(e){}return `[${name.toLowerCase()}](${SITE}c/${c}.html)`}
function links(k){const cl=catLink();return{
 shop1:pick([`Усе необхідне для такого ремонту без майстра можна знайти в [магазині самоклеючих матеріалів Samostroy Shop](${L.shop}).`,`Матеріали, про які йдеться, є в [інтернет-магазині Samostroy Shop](${L.shop}) — з доставкою по всій Україні.`,`Підібрати матеріали для ремонту своїми руками допоможе [Samostroy Shop](${L.shop}) — там зібрано все для швидкого оновлення інтер’єру.`],k),
 shop2:cl?pick([`Готові варіанти дивіться в розділі ${cl} магазину [Samostroy Shop](${L.shop}).`,`Порівняти фактури й ціни можна в каталозі: ${cl} на [samostroy.shop](${L.shop}).`,`Щоб одразу обрати потрібне, відкрийте розділ ${cl} у [магазині для ремонту без майстра](${L.shop}).`],k)
  :pick([`Порівняти фактури й ціни можна в [каталозі Samostroy Shop](${L.shop}).`,`Повний асортимент — у [магазині матеріалів для ремонту своїми руками](${L.shop}).`],k),
 orig:pick([`Детальніше, з фото й підбіркою товарів, — в [оригінальній статті на сайті Samostroy Shop](${URL0}).`,`Повну інструкцію з прикладами читайте [на сайті Samostroy Shop](${URL0}).`,`Більше деталей і готові рішення — у [повній версії статті](${URL0}).`],k),
 drop:pick([`До речі, на таких товарах можна заробляти: [партнерська програма дропшипінгу Samostroy Shop](${L.drop}) дає змогу відкрити свій онлайн-магазин за 10 хвилин без вкладень і складу. Підходить і новачкам, які шукають підробіток в інтернеті, і вже розкрученим магазинам.`,
  `Хочете не лише робити ремонт, а й заробляти на ньому? Приєднуйтесь до [програми дропшипінгу Samostroy Shop](${L.drop}): продаєте товари онлайн за своєю ціною, а пакування й відправку беремо на себе. Старт — за 10 хвилин і без вкладень, для новачків і для досвідчених магазинів.`,
  `Якщо у вас є свій магазин, сторінка в соцмережах або ви просто хочете підробіток онлайн — подивіться [партнерську програму дропшипінгу](${L.drop}). Свій магазин можна відкрити за 10 хвилин без вкладень: ви продаєте, ми відправляємо.`],k),
 acad:pick([`## Як навчитися заробляти на продажу товарів для ремонту\nУ Samostroy Shop є [безкоштовна академія партнера](${L.acad}), де пояснюють, як почати продавати онлайн навіть без досвіду.`,
  `## Безкоштовне навчання для тих, хто хоче продавати онлайн\nНавчитися заробляти на дропшипінгу можна в [безкоштовній академії Samostroy Shop](${L.acad}) — коротко, по кроках і на реальних прикладах.`,
  `## Хочете заробляти онлайн? Почніть з безкоштовної академії\n[Академія партнера Samostroy Shop](${L.acad}) — безкоштовні уроки для тих, хто хоче відкрити свій онлайн-магазин без вкладень.`],k)+
  `\n- [Дропшипінг з нуля](${L.c1}) — як запустити продажі без складу й закупівлі: вибір товарів, перші оголошення й перші замовлення.\n- [Продажі 3.0](${L.c2}) — як відповідати клієнтам, працювати із запереченнями й доводити розмову до покупки.\n- [Де і як продавати](${L.lk}) — практичний план: які майданчики обрати й що зробити першого тижня, щоб застосувати знання на практиці.`}}

/* ---------- збирання нової версії статті ---------- */
function sections(body){const p=String(body).split(/\n(?=## )/);let intro='';if(p.length&&!/^## /.test(p[0].trim()))intro=p.shift().trim();return{intro,secs:p.map(s=>s.trim()).filter(Boolean)}}
async function rewriteFull(k,prog,sig){
 const{intro,secs}=sections(A.body),total=secs.length+1+(A.faq&&A.faq.length?1:0);let n=0;const step=t=>prog(++n,total,t);
 step('Заголовок і вступ');
 const h=await ai(SYS_HEAD,`Заголовок: ${A.title}\nОпис: ${A.desc}\nВступ: ${intro||A.desc}`,sig);
 const hl=h.split('\n'),title=hl[0].replace(/^#+\s*|^["«]|["»]$/g,'').trim(),introNew=hl.slice(1).join('\n').trim();
 const out=[];
 for(let i=0;i<secs.length;i++){step(`Розділ ${i+1} з ${secs.length}`);await sleep(1500);out.push(await ai(SYS_SEC,secs[i],sig))}
 let faq='';if(A.faq&&A.faq.length){step('Питання й відповіді');await sleep(1500);faq=await ai(SYS_FAQ,A.faq.map(([q,a])=>`${q}\n${a}`).join('\n\n'),sig)}
 const ln=links(k),mid=Math.max(0,Math.floor(out.length/2)-1),parts=[`# ${title}`,introNew,ln.shop1];
 out.forEach((s,i)=>{parts.push(fixHead(s));if(i==mid)parts.push(ln.shop2)});
 if(faq)parts.push('## '+pick(['Часті питання','Відповіді на популярні питання','Що ще варто знати'],k)+'\n'+faq);
 parts.push(ln.orig,ln.drop,ln.acad);
 return parts.filter(Boolean).join('\n\n')}
function fixHead(s){return s.replace(/^#{1}\s(?!#)/gm,'## ').replace(/^#{4,}\s*/gm,'### ')}
async function rewritePost(k,prog,sig){
 const p=PL[cur];prog(1,1,'Пишемо пост');
 let t=await ai(SYS_POST(p.n),`Стаття «${A.title}».\n${A.desc}\n\n${A.body.slice(0,3500)}`,sig);
 t=t.replace(/^#+\s*/gm,'').replace(/\*\*/g,'');
 const tags=(A.tags||[]).slice(0,5).map(x=>'#'+x.replace(/[^\p{L}\d]+/gu,'')).join(' ');
 if(cur=='instagram')t+=`\n\nПовна інструкція й матеріали — за посиланням у шапці профілю 👆\n\n${tags} #ремонтсвоїмируками #samostroyshop`;
 else if(cur=='threads')t+=`\n\nПовна інструкція: ${URL0}`;
 else t+=`\n\n👉 Повна інструкція: ${URL0}\n🛒 Матеріали для ремонту без майстра: ${L.shop}`+(cur=='telegram'||cur=='facebook'?`\n💼 Заробляйте з нами на дропшипінгу: ${L.drop}`:'');
 return t.trim()}

/* ---------- свій текст із ChatGPT / Claude ---------- */
function extTask(){const p=PL[cur];
 const src=`# ${A.title}\n\n${A.body}`+(A.faq&&A.faq.length?'\n\n## Питання й відповіді\n'+A.faq.map(([q,a])=>`**${q}**\n${a}`).join('\n\n'):'');
 if(p.kind=='post')return `Напиши короткий пост для ${p.n} українською (до ${p.max} символів) за мотивами статті нижче.\n${SYS_POST(p.n).split('\n').slice(1).join('\n')}\n- Не додавай посилань — їх додамо самі.\n\nСтаття:\n${src}`;
 return `Перепиши статтю нижче для публікації на іншому сайті (${p.n}), щоб текст не дублював оригінал, але зберіг увесь зміст.\n${RULES}\n- Новий заголовок і новий вступ, інші підзаголовки, інший порядок викладу там, де це логічно.\n- Обсяг — приблизно як оригінал.\n- Формат відповіді — лише Markdown: перший рядок "# Заголовок", підзаголовки "## ", списки "- " або "1. ", **жирний**. Без посилань — їх додамо самі.\n\nОригінал:\n${src}`}
function addLinks(t,k){const ln=links(k),has=u=>t.includes('('+u+')');let parts=t.trim().split(/\n{2,}/);
 if(!/^#\s/.test(parts[0]))parts.unshift('# '+A.title);
 if(PL[cur].kind=='post'){const add=[];if(!t.includes(URL0))add.push(cur=='instagram'?'Повна інструкція — за посиланням у шапці профілю 👆':`👉 Повна інструкція: ${URL0}`);if(cur!='instagram'&&cur!='threads'&&!t.includes(L.shop))add.push(`🛒 Матеріали для ремонту без майстра: ${L.shop}`);return parts.slice(/^#\s/.test(parts[0])?1:0).concat(add).join('\n\n')}
 if(!has(L.shop)){parts.splice(Math.min(2,parts.length),0,ln.shop1);parts.splice(Math.max(3,Math.floor(parts.length/2)+1),0,ln.shop2)}
 if(!t.includes(URL0))parts.push(ln.orig);if(!has(L.drop))parts.push(ln.drop);if(!has(L.acad))parts.push(ln.acad);
 return parts.join('\n\n')}

/* ---------- перевірка результату ---------- */
const words=t=>String(t).toLowerCase().match(/[\p{L}\d’ʼ']+/gu)||[];
function uniq(t){const sh=w=>{const s=new Set();for(let i=0;i+2<w.length;i++)s.add(w[i]+' '+w[i+1]+' '+w[i+2]);return s};
 const strip=x=>String(x).replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/https?:\/\/\S+/g,'');
 const o=sh(words(strip(A.body+' '+(A.faq||[]).flat().join(' ')))),n=sh(words(strip(t)));if(!n.size)return 0;let c=0;n.forEach(x=>{if(o.has(x))c++});return Math.round(100*(1-c/n.size))}
const RU=/(^|[^\p{L}])(который|которая|которые|также|если|чтобы|нужно|можно|очень|сейчас|здесь|его|будет|только|когда|где|или|потолок|обои|стена|стены|плёнка|пленка)(?=[^\p{L}]|$)/iu;
function problems(t){const W=[];
 const lines=t.split('\n');lines.forEach((l,i)=>{if(!l.trim())return;
  const ex=l.trim().slice(0,70);
  if(/[ыэъё]/i.test(l))W.push(['bad',`Російські літери: «${ex}»`]);
  else if(RU.test(l))W.push(['',`Можливе російське слово: «${ex}»`]);
  if(/[а-яіїєґ][a-z]|[a-z][а-яіїєґ]/i.test(l.replace(/\[[^\]]*\]\([^)]*\)/g,'')))W.push(['bad',`Змішані латиниця й кирилиця в слові: «${ex}»`]);
  if(/�/.test(l))W.push(['bad',`Битий символ: «${ex}»`])});
 for(const [k,u] of [['магазин',L.shop],['дропшипінг',L.drop],['академію',L.acad],['оригінал статті',URL0]])if(PL[cur].kind=='full'&&!t.includes(u))W.push(['',`Немає посилання на ${k}`]);
 if(PL[cur].max&&t.length>PL[cur].max+400)W.push(['',`Задовгий пост для ${PL[cur].n}: ${t.length} символів`]);
 return W.slice(0,12)}

/* ---------- Markdown → HTML і → вузли Telegra.ph ---------- */
function inlineNodes(s){const out=[];const re=/\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;let i=0,m;
 while(m=re.exec(s)){if(m.index>i)out.push(s.slice(i,m.index));
  if(m[1])out.push({tag:'strong',children:inlineNodes(m[1])});else out.push({tag:'a',attrs:{href:abs(m[3])},children:[m[2]]});i=re.lastIndex}
 if(i<s.length)out.push(s.slice(i));return out}
const abs=u=>/^https?:/.test(u)?u:SITE+u.replace(/^\.?\//,'');
function blocks(md){const B=[];let lst=null,para=[];const fl=()=>{if(para.length){B.push({t:'p',x:para.join(' ')});para=[]}if(lst){B.push(lst);lst=null}};
 for(const line of md.split('\n')){const s=line.trim();if(!s){fl();continue}
  let m;
  if(m=s.match(/^(#{1,3})\s+(.*)/)){fl();B.push({t:'h'+m[1].length,x:m[2]});continue}
  if(s.startsWith('> ')){fl();B.push({t:'q',x:s.slice(2)});continue}
  if(m=s.match(/^(-|—|\d+\.)\s+(.*)/)){const t=/\d/.test(m[1])?'ol':'ul';if(para.length){B.push({t:'p',x:para.join(' ')});para=[]}if(!lst||lst.t!=t){if(lst)B.push(lst);lst={t,li:[]}}lst.li.push(m[2]);continue}
  if(lst){B.push(lst);lst=null}para.push(s)}
 fl();return B}
function toHtml(md){const inl=s=>E(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,(m,t,u)=>`<a href="${E(abs(u))}">${t}</a>`);
 return blocks(md).map(b=>b.t=='p'?`<p>${inl(b.x)}</p>`:b.t=='q'?`<blockquote>${inl(b.x)}</blockquote>`:b.t=='ul'||b.t=='ol'?`<${b.t}>${b.li.map(x=>`<li>${inl(x)}</li>`).join('')}</${b.t}>`:`<${b.t}>${inl(b.x)}</${b.t}>`).join('\n')}
function toNodes(md){return blocks(md).filter(b=>b.t!='h1').map(b=>b.t=='p'?{tag:'p',children:inlineNodes(b.x)}:b.t=='q'?{tag:'blockquote',children:inlineNodes(b.x)}:
 b.t=='ul'||b.t=='ol'?{tag:b.t,children:b.li.map(x=>({tag:'li',children:inlineNodes(x)}))}:{tag:b.t=='h2'?'h3':'h4',children:inlineNodes(b.x)})}
const titleOf=md=>{const m=md.match(/^#\s+(.+)$/m);return(m?m[1]:A.title).trim().slice(0,250)};
const bodyOf=md=>md.replace(/^#\s+.+\n*/m,'');

/* ---------- Telegra.ph ---------- */
async function tg(method,params){const f=new URLSearchParams(params);const r=await fetch(TGPH+method,{method:'POST',body:f});const j=await r.json();if(!j.ok)throw new Error('Telegra.ph: '+j.error);return j.result}
async function tgToken(){let t=LS.get('tgph_token','');if(t)return t;const r=await tg('createAccount',{short_name:'SamostroyShop',author_name:'Samostroy Shop',author_url:SITE});LS.set('tgph_token',r.access_token);return r.access_token}
async function publishTg(md,b){
 const nodes=toNodes(bodyOf(md)),c=JSON.stringify(nodes);if(c.length>64000)return say('Текст задовгий для Telegra.ph (до 64 КБ)');
 b.classList.add('busy');
 try{const token=await tgToken(),H=hist(),prev=H.telegraph&&H.telegraph.path;
  const p={access_token:token,title:titleOf(md),author_name:'Samostroy Shop',author_url:SITE,content:c,return_content:'false'};
  const r=prev?await tg('editPage/'+prev,p):await tg('createPage',p);
  save('telegraph',{url:r.url,path:r.path});draw();say(prev?'Сторінку в Telegra.ph оновлено':'Опубліковано в Telegra.ph')}
 catch(e){say(e.message)}finally{b.classList.remove('busy')}}

/* ---------- історія публікацій (у цьому браузері) ---------- */
const hist=()=>LS.get('st_hist',{})[slug]||{};
function save(p,x){const H=LS.get('st_hist',{});H[slug]=H[slug]||{};H[slug][p]={...(H[slug][p]||{}),...x,at:new Date().toISOString().slice(0,10)};LS.set('st_hist',H)}
const dkey=()=>`st_draft_${slug}_${cur}`;

/* ---------- копіювання ---------- */
async function copyRich(md){const html=toHtml(md),txt=md.replace(/\*\*/g,'').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,(m,t,u)=>`${t} (${abs(u)})`);
 try{if(window.ClipboardItem){await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([txt],{type:'text/plain'})})]);return true}}catch(e){}
 try{await navigator.clipboard.writeText(txt);return true}catch(e){return false}}
async function copyText(t){try{await navigator.clipboard.writeText(t);return true}catch(e){prompt('Скопіюйте текст:',t);return false}}

/* ---------- інтерфейс ---------- */
let busy=false,view='edit';
function draw(){const p=PL[cur],H=LS.get('st_hist',{})[slug]||{},d=LS.get(dkey(),'');
 const chip=k=>`<button type="button" data-stp="${k}" class="${cur==k?'on':''}">${PL[k].n}${H[k]?'<i>✓</i>':''}</button>`;
 box.innerHTML=`<h2>Поширити на інших сайтах</h2>
 <p class="st-n">Бачите лише ви (вхід в адмінку). ШІ напише нову версію статті своїми словами — щоб текст не дублював сайт для Google, — а посилання на магазин, дропшипінг, академію й курси додадуться автоматично. Для кожного майданчика створюйте окрему версію.</p>
 <div class="st-pl"><small>Повна стаття</small>${Object.keys(PL).filter(k=>PL[k].kind=='full').map(chip).join('')}<small>Короткий пост</small>${Object.keys(PL).filter(k=>PL[k].kind=='post').map(chip).join('')}</div>
 <p class="st-how">${E(p.how)}</p>
 ${H[cur]&&H[cur].url?`<div class="st-done">Опубліковано ${E(H[cur].at)}: <a href="${E(H[cur].url)}" target="_blank" rel="noopener">${E(H[cur].url)}</a></div>`:H[cur]?`<div class="st-done">Ви вже готували текст для ${E(p.n)} ${E(H[cur].at)}.</div>`:''}
 <div id="stWork">${d?editor(d):`<div class="st-acts"><button type="button" class="btn" data-go>Створити версію безкоштовним ШІ</button><button type="button" class="btn ghost" data-ext>Копіювати завдання для ChatGPT / Claude</button><button type="button" class="btn ghost" data-own>Вставити свій текст</button></div>
 <p class="st-how"><b>Безкоштовний ШІ</b> (Pollinations) — ${p.kind=='full'?'2–4 хвилини, статтю переписує по розділах':'до хвилини'}; текст потребує уважної вичитки. <b>ChatGPT чи Claude</b> пишуть краще: скопіюйте завдання, вставте туди, а відповідь — сюди через «Вставити свій текст». Посилання на магазин, дропшипінг, академію й курси додадуться автоматично.</p>`}</div>
 ${Object.keys(H).length?`<p class="st-hist">Історія цієї статті: ${Object.entries(H).map(([k,x])=>`${PL[k]?PL[k].n:k} — ${x.url?`<a href="${E(x.url)}" target="_blank" rel="noopener">${E(x.at)}</a>`:E(x.at)}`).join(' · ')}</p>`:''}`}
function editor(t){const u=uniq(t),W=problems(t),p=PL[cur],n=words(t).length;
 return `<div class="st-stat"><span>Унікальність: <b class="${u>=70?'good':u<50?'low':''}">${u}%</b> ${u>=70?'— добре':u<50?'— замало, перепишіть ще раз':'— прийнятно'}</span><span><b>${n}</b> слів</span>${p.kind=='post'?`<span><b>${t.length}</b> символів</span>`:''}</div>
 ${W.length?`<ul class="st-w">${W.map(([c,m])=>`<li class="${c}">${E(m)}</li>`).join('')}</ul>`:''}
 <p class="st-how"><b>Обов’язково прочитайте й виправте текст перед публікацією</b> — безкоштовний ШІ іноді помиляється в словах чи фактах.</p>
 <div class="st-acts"><button type="button" class="btn ghost sm" data-stv="edit"${view=='edit'?' disabled':''}>Редагувати</button><button type="button" class="btn ghost sm" data-stv="view"${view=='view'?' disabled':''}>Перегляд</button></div>
 ${view=='view'?`<div class="st-pv">${toHtml(t)}</div>`:`<textarea id="stT" aria-label="Текст для ${E(p.n)}">${E(t)}</textarea>`}
 <div class="st-acts">${cur=='telegraph'?`<button type="button" class="btn" data-pub>${hist().telegraph?'Оновити в Telegra.ph':'Опублікувати в Telegra.ph'}</button>`:p.kind=='full'?`<button type="button" class="btn" data-open>1. Копіювати текст</button><a class="btn ghost" href="${E(p.open)}" target="_blank" rel="noopener" data-mark>2. Відкрити ${E(p.n)} ↗</a><button type="button" class="btn ghost" data-html>Копіювати HTML</button>`:cur=='instagram'?`<button type="button" class="btn" data-open>Копіювати текст</button>`:cur=='facebook'?`<a class="btn" href="#" target="_blank" rel="noopener" data-post>Копіювати текст і відкрити Facebook ↗</a>`:`<a class="btn" href="#" target="_blank" rel="noopener" data-post>Відкрити ${E(p.n)} з готовим текстом ↗</a>`}
 <button type="button" class="btn ghost" data-links>Додати посилання</button><button type="button" class="btn ghost" data-go>Переписати ще раз</button><button type="button" class="btn ghost" data-clear>Видалити чернетку</button></div>`}
function postUrl(t){const q=encodeURIComponent;
 return cur=='telegram'?`https://t.me/share/url?url=${q(URL0)}&text=${q(t.replace(URL0,'').trim())}`:cur=='threads'?`https://www.threads.net/intent/post?text=${q(t)}`:
  cur=='viber'?`viber://forward?text=${q(t)}`:cur=='facebook'?`https://www.facebook.com/sharer/sharer.php?u=${q(URL0)}`:''}
const val=()=>{const t=document.getElementById('stT');return t?t.value:LS.get(dkey(),'')};
async function go(b){if(busy)return;busy=true;abort=new AbortController();
 const w=document.getElementById('stWork'),k=Object.keys(PL).indexOf(cur);
 w.innerHTML=`<div class="st-prog"><span id="stPs">Запускаємо ШІ…</span><i><b id="stPb" style="width:3%"></b></i></div><div class="st-acts"><button type="button" class="btn ghost sm" data-stop>Зупинити</button></div>`;
 const prog=(n,t,txt)=>{const s=document.getElementById('stPs'),bb=document.getElementById('stPb');if(s)s.textContent=`${txt}… (${n} з ${t})`;if(bb)bb.style.width=Math.round((n-.5)/t*100)+'%'};
 try{const t=PL[cur].kind=='full'?await rewriteFull(k,prog,abort.signal):await rewritePost(k,prog,abort.signal);LS.set(dkey(),t);save(cur,{});view='edit';draw();say('Готово — перевірте текст')}
 catch(e){if(e.message!='abort')say(e.message);draw()}finally{busy=false;abort=null}}
box.addEventListener('input',e=>{if(e.target.id=='stT'){LS.set(dkey(),e.target.value)}});
let tm=null;box.addEventListener('input',e=>{if(e.target.id!='stT')return;clearTimeout(tm);tm=setTimeout(()=>{const ta=document.getElementById('stT');if(!ta)return;const s=box.querySelector('.st-stat'),w=box.querySelector('.st-w');const tmp=document.createElement('div');tmp.innerHTML=editor(ta.value);
 const ns=tmp.querySelector('.st-stat'),nw=tmp.querySelector('.st-w');if(s&&ns)s.replaceWith(ns);if(w)w.remove();if(nw)box.querySelector('.st-stat').after(nw)},600)});
box.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b||!box.contains(b))return;const d=b.dataset;
 if(d.stp){if(busy)return say('Зачекайте, ШІ ще пише текст');cur=d.stp;view='edit';return draw()}
 if(d.stv){LS.set(dkey(),val());view=d.stv;return draw()}
 if(d.go!==undefined){if(LS.get(dkey(),'')&&!confirm('Замінити поточний текст новою версією?'))return;return go(b)}
 if(d.stop!==undefined){abort&&abort.abort();return}
 if(d.ext!==undefined){await copyText(extTask());return say('Завдання скопійовано — вставте в ChatGPT чи Claude, а відповідь — через «Вставити свій текст»')}
 if(d.own!==undefined){LS.set(dkey(),' ');view='edit';draw();const t=document.getElementById('stT');if(t){t.value='';t.placeholder='Вставте сюди текст від ChatGPT чи Claude і натисніть «Додати посилання»';t.focus()}save(cur,{});return}
 if(d.clear!==undefined){if(!confirm('Видалити чернетку для '+PL[cur].n+'?'))return;localStorage.removeItem(dkey());return draw()}
 const t=val();LS.set(dkey(),t);
 if(d.pub!==undefined){const W=problems(t).filter(x=>x[0]=='bad');if(W.length&&!confirm('У тексті є позначені помилки. Опублікувати все одно?'))return;return publishTg(t,b)}
 if(d.links!==undefined){const k=Object.keys(PL).indexOf(cur),n=addLinks(t,k);LS.set(dkey(),n);view='edit';draw();return say(n==t?'Посилання вже є':'Посилання додано')}
 if(d.html!==undefined){await copyText(toHtml(bodyOf(t)));return say('HTML скопійовано')}
 if(d.open!==undefined){const ok=PL[cur].kind=='full'?await copyRich(t):await copyText(t);save(cur,{});return say(ok?(PL[cur].kind=='full'?'Скопійовано з форматуванням — тепер «Відкрити» і вставте Ctrl+V':'Текст скопійовано'):'Не вдалося скопіювати — виділіть текст вручну')}});
/* посилання «Відкрити …»: адреса з актуальним текстом підставляється в момент кліку (посилання браузер не блокує) */
box.addEventListener('click',e=>{const a=e.target.closest('a[data-post],a[data-mark]');if(!a)return;const t=val();LS.set(dkey(),t);
 if(a.dataset.post!==undefined){a.href=postUrl(t);if(cur=='facebook')copyText(t).then(()=>say('Текст скопійовано — вставте його у вікні Facebook'));if(cur=='viber'){a.removeAttribute('target')}}
 save(cur,{})});

/* ---------- старт ---------- */
box.innerHTML='<p class="st-n">Завантажуємо статтю…</p>';
fetch('blog.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()).then(list=>{A=list.find(x=>x.slug==slug);if(!A){box.innerHTML='<p class="st-n">Статтю ще не знайдено в blog.json — зачекайте 2–3 хвилини після публікації.</p>';return}
 draw();if(location.hash=='#avtor')box.scrollIntoView({behavior:'smooth',block:'start'})}).catch(()=>{box.innerHTML='<p class="st-n">Не вдалося завантажити статтю. Оновіть сторінку.</p>'});
})();
