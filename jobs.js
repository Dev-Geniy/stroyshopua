/* Сторінка вакансій: список ролей, підбір ролі за 3 питання, відгук (Google Таблиця → Telegram, запасний канал — Telegram).
   Працює поверх shop.js. Щоб додати чи закрити вакансію — змініть масив JOBS. */
(()=>{
const $i=id=>document.getElementById(id);
const JOBS=[
 {id:'sales',t:'Менеджер з продажу (онлайн)',tags:['Дистанційно або офіс','5/2 або гнучко','Можна без досвіду'],
  short:'Відповідаєте на заявки з сайту, Telegram і Viber, допомагаєте підібрати матеріал і оформлюєте замовлення.',
  do:['Обробляєте вхідні заявки й дзвінки — швидко й по-людськи','Рахуєте кількість матеріалу під розміри клієнта й підбираєте варіанти','Оформлюєте замовлення, передаєте на склад, надсилаєте ТТН','Повертаєтесь до клієнтів, які «подумають», і просите відгуки'],
  need:['Грамотна українська, приємна й впевнена комунікація','Уважність до деталей: розміри, кількість, адреса','Готовність навчатися: товар і скрипти покажемо','Плюс — досвід продажів у чатах чи по телефону'],
  fit:'Вам подобається допомагати людям і доводити розмову до результату.'},
 {id:'partners',t:'Менеджер з роботи з партнерами (опт і дропшипінг)',tags:['Дистанційно або офіс','5/2'],
  short:'Підключаєте й супроводжуєте партнерів-дропшиперів і оптових клієнтів, допомагаєте їм продавати більше.',
  do:['Консультуєте нових партнерів і проводите їх через старт','Надсилаєте прайси, фото й матеріали, приймаєте замовлення партнерів','Ведете оптових клієнтів: умови, наявність, відвантаження','Помічаєте, що заважає партнерам продавати, й пропонуєте рішення'],
  need:['Досвід у продажах, B2B чи клієнтському сервісі','Системність: CRM чи таблиці, нагадування, звітність','Вміння пояснювати просто й домовлятися','Плюс — розуміння дропшипінгу чи маркетплейсів'],
  fit:'Вам цікаво вибудовувати довгі стосунки й рости разом з клієнтами.'},
 {id:'smm',t:'Контент-менеджер / SMM',tags:['Дистанційно','Гнучкий графік'],
  short:'Створюєте відео «до/після», Reels і TikTok, оформлюєте соцмережі й картки товарів, щоб вони продавали.',
  do:['Знімаєте й монтуєте короткі відео з товаром: монтаж, «до/після», ідеї','Ведете Instagram, TikTok і Telegram за контент-планом','Готуєте фото й тексти для карток товарів і партнерських матеріалів','Аналізуєте, що набирає охоплення й заявки, і масштабуєте це'],
  need:['Портфоліо: відео, сторінки чи пости, які ви робили','Впевнене володіння CapCut, Canva або аналогами','Розуміння трендів коротких відео','Плюс — досвід з товарами для дому чи ремонту'],
  fit:'Ви бачите історію в кожному товарі й любите, коли контент приносить продажі.'},
 {id:'open',t:'Відкрита заявка',tags:['Будь-який формат'],open:1,
  short:'Не знайшли свою роль, але хочете в команду? Розкажіть, чим можете бути корисні — ми зберігаємо такі заявки й пишемо, коли з’являється відповідна задача.',
  do:[],need:[],fit:''}];

/* ---------- список вакансій ---------- */
$i('jbList').innerHTML=JOBS.map((j,i)=>j.open?
 `<div class="jb-job open"><div class="jb-jh"><div><h3>${j.t}</h3><p>${j.short}</p></div><button type="button" class="btn ghost" data-job="${j.id}">Залишити заявку</button></div></div>`:
 `<details class="jb-job"${i==0?' open':''}><summary class="jb-jh"><div><h3>${j.t}</h3><div class="jb-tags">${j.tags.map(t=>`<span>${t}</span>`).join('')}</div><p>${j.short}</p></div><span class="jb-tg" aria-hidden="true"></span></summary>
  <div class="jb-jb"><div><h4>Чим займатиметесь</h4><ul class="ac-check">${j.do.map(x=>`<li>${x}</li>`).join('')}</ul></div><div><h4>Кого шукаємо</h4><ul class="ac-check">${j.need.map(x=>`<li>${x}</li>`).join('')}</ul></div>
  <div class="jb-fit"><span>Це ваше, якщо</span><b>${j.fit}</b><button type="button" class="btn" data-job="${j.id}">Відгукнутися</button></div></div></details>`).join('');
$i('jRole').innerHTML=JOBS.map(j=>`<option value="${j.id}">${j.t}</option>`).join('');
function pick(id){$i('jRole').value=id;$i('apply').scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>$i('jName').focus({preventScroll:true}),500)}
document.addEventListener('click',e=>{const b=e.target.closest('[data-job]');if(b){e.preventDefault();pick(b.dataset.job)}});

/* ---------- підбір ролі ---------- */
const QZ=[
 ['Що вам найбільше подобається в роботі?',[['Спілкуватися з людьми й допомагати їм вирішити задачу',{sales:2,partners:1}],['Вибудовувати довгі стосунки й домовлятися',{partners:2,sales:1}],['Створювати контент: фото, відео, тексти',{smm:2}]]],
 ['Що з цього про вас?',[['Швидко відповідаю й доводжу розмову до результату',{sales:2}],['Люблю порядок: таблиці, нагадування, звіти',{partners:2}],['Знімаю й монтую відео для себе чи інших',{smm:2}]]],
 ['Ваш досвід?',[['Поки немає — хочу навчитися',{sales:2}],['Продажі чи робота з клієнтами',{sales:1,partners:2}],['Соцмережі, дизайн чи відео',{smm:2}]]]];
let qa=[];
function drawQuiz(){
 const el=$i('jbQuiz');
 if(qa.length<QZ.length){const [qt,opts]=QZ[qa.length];
  el.innerHTML=`<div class="jb-q"><span class="jb-qn">Питання ${qa.length+1} з ${QZ.length}</span><div class="ac-pb"><i style="width:${qa.length/QZ.length*100}%"></i></div><h3>${qt}</h3><div class="jb-opts">${opts.map((o,i)=>`<button type="button" data-qa="${i}">${o[0]}</button>`).join('')}</div>${qa.length?'<button type="button" class="link" data-qa="back">Назад</button>':''}</div>`;return}
 const sc={};qa.forEach((a,k)=>Object.entries(QZ[k][1][a][1]).forEach(([r,v])=>sc[r]=(sc[r]||0)+v));
 const best=Object.entries(sc).sort((a,b)=>b[1]-a[1])[0][0],j=JOBS.find(x=>x.id==best);
 el.innerHTML=`<div class="jb-q jb-res"><span class="jb-qn">Вам найбільше підходить</span><h3>${j.t}</h3><p>${j.short}</p><div class="jb-ra"><button type="button" class="btn" data-job="${j.id}">Відгукнутися</button><button type="button" class="btn ghost" data-qa="more">Деталі вакансії</button><button type="button" class="link" data-qa="again">Пройти ще раз</button></div></div>`;
 el.dataset.best=best}
$i('jbQuiz').addEventListener('click',e=>{const b=e.target.closest('[data-qa]');if(!b)return;const v=b.dataset.qa;
 if(v=='back')qa.pop();else if(v=='again')qa=[];
 else if(v=='more'){const i=JOBS.findIndex(x=>x.id==$i('jbQuiz').dataset.best),d=document.querySelectorAll('.jb-job')[i];if(d){d.open=true;d.scrollIntoView({behavior:'smooth',block:'start'})}return}
 else qa.push(+v);drawQuiz()});
drawQuiz();

/* ---------- лічильник товарів і розмітка вакансій для Google ---------- */
const avn=()=>{const n=all.filter(p=>p.av).length;document.querySelectorAll('[data-avn]').forEach(e=>e.textContent=n)};
addEventListener('catalog',avn);if(loaded)avn();
const ld=document.createElement('script');ld.type='application/ld+json';
ld.textContent=JSON.stringify({'@context':'https://schema.org','@graph':JOBS.filter(j=>!j.open).map(j=>({'@type':'JobPosting',title:j.t,description:`<p>${j.short}</p><p><b>Чим займатиметесь:</b></p><ul>${j.do.map(x=>`<li>${x}</li>`).join('')}</ul><p><b>Кого шукаємо:</b></p><ul>${j.need.map(x=>`<li>${x}</li>`).join('')}</ul>`,
 datePosted:'2026-10-31',employmentType:'FULL_TIME',hiringOrganization:{'@type':'Organization',name:'Samostroy Shop',sameAs:'https://samostroy.shop/',logo:'https://samostroy.shop/samostroy-shop-logo.jpg'},
 jobLocationType:'TELECOMMUTE',applicantLocationRequirements:{'@type':'Country',name:'Україна'},directApply:true}))});
document.head.appendChild(ld);

/* ---------- відгук ---------- */
const f=$i('jbForm');let key='';
f.addEventListener('submit',async e=>{
 e.preventDefault();
 const nm=$i('jName'),ph=$i('jPhone'),hint=$i('jHint');
 const bad=(el,m)=>{el.classList.add('err');hint.textContent=m;el.focus();el.addEventListener('input',()=>{el.classList.remove('err');hint.textContent=''},{once:true})};
 if(!nm.value.trim())return bad(nm,'Вкажіть, як до вас звертатися');
 if(!phoneOk(ph.value))return bad(ph,'Вкажіть телефон, щоб ми могли з вами зв’язатися');
 const role=JOBS.find(j=>j.id==$i('jRole').value),v=n=>f.querySelector(`[name=${n}]:checked`).value;
 const parts=[`Вакансія: ${role.t}`,`досвід: ${v('jExp')}`,`формат: ${v('jFmt')}`];
 if($i('jCity').value)parts.push(`місто: ${$i('jCity').value}`);
 if($i('jTg').value)parts.push(`Telegram: ${$i('jTg').value}`);
 if($i('jUrl').value)parts.push(`резюме: ${$i('jUrl').value}`);
 if($i('jAbout').value)parts.push(`про себе: ${$i('jAbout').value}`);
 const msg=`👤 Відгук на вакансію\nІм’я: ${nm.value.trim()}\nТелефон: ${ph.value}\n`+parts.join('\n');
 const ok=id=>{f.innerHTML=`<div class="done"><div class="ic"><svg class="i"><use href="#i-check"/></svg></div><h3>Дякуємо, відгук${id?' №'+esc(id):''} отримано</h3><p>Ми повернемося протягом робочого дня. Терміново — напишіть у Telegram.</p><a class="btn" href="https://t.me/manager_samostroy_shop" target="_blank" rel="noopener">Написати в Telegram</a></div>`};
 if(!CFG.api){tg(msg);return ok('')}
 const b=$i('jBtn');b.classList.add('busy');key=key||okey();
 let r=null;try{r=await api({action:'order',order:{type:'Вакансія',name:nm.value.trim(),phone:ph.value,city:$i('jCity').value,pay:'',delivery:'',items:leadItems(parts),page:location.href,lang,key,hp:$i('jHp').value}})}catch(x){}
 b.classList.remove('busy');
 if(r&&r.ok)return ok(r.id);
 hint.innerHTML='Не вдалося надіслати через сайт. <button type="button" class="link" id="jTgB">Надіслати в Telegram</button> — текст уже готовий.';
 $i('jTgB').onclick=()=>tg(msg)});
})();
