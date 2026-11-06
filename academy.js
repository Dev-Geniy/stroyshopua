/* Академія партнера Samostroy — інтерактивний онбординг з міні-тестами.
   Працює поверх shop.js (шапка, кошик, каталог товарів, відправка заявок).
   Прогрес зберігається в браузері (localStorage), реєстрація не потрібна. */
(()=>{
const KEY='academy_v2';
const S=Object.assign({who:'',time:'',goal:0,cur:0,done:{},ans:{},picks:[],ch:[],sort:{},week:{},exp:{},grp:'stiny',sell:0,skipGoods:0},ls.get(KEY,{}));
const save=()=>ls.set(KEY,S);
const $i=id=>document.getElementById(id);
const fm=n=>money(n);
const ico=n=>`<svg class="i"><use href="#i-${n}"/></svg>`;

/* ---------- довідники ---------- */
const WHO={
 new:{t:'Я новачок',d:'Ще не продавав онлайн або тільки пробую',lvl:'Starter',m:10,goal:10000,ch:['olx','social']},
 seller:{t:'Вже продаю онлайн',d:'Є оголошення, магазин на Prom/Rozetka чи сторінка в соцмережах',lvl:'Pro',m:15,goal:30000,ch:['market','social']},
 shop:{t:'Маю магазин або команду',d:'Інтернет-магазин, офлайн-точка, студія ремонту чи кілька менеджерів',lvl:'Pro',m:15,goal:80000,ch:['site','market']}};
const TIME={a:'1–2 години на день',b:'3–4 години на день',c:'Повний робочий день'};
const CH={
 olx:{t:'Дошки оголошень',s:'OLX, Besplatka, Obyava',p:'Старт без бюджету й сайту. Перші заявки можуть прийти вже в день публікації.',c:'Оголошення треба регулярно оновлювати й додавати нові.'},
 market:{t:'Маркетплейси',s:'Prom, Rozetka та інші',p:'Готовий потік покупців, легко додати багато позицій.',c:'Комісія майданчика — закладайте її в ціну.'},
 social:{t:'Соцмережі',s:'Instagram, TikTok, Facebook, Telegram',p:'Ремонт «до/після» добре заходить у відео. Будуєте свою аудиторію.',c:'Результат росте поступово, потрібен регулярний контент.'},
 site:{t:'Свій сайт або магазин',s:'Інтернет-магазин, офлайн-точка',p:'Додаєте наш асортимент окремою категорією без викупу товару.',c:'Потрібен власний потік покупців.'}};
const LVL=[
 {k:'Starter',gate:'Без мінімального обороту',m:'Маржа в середньому до 10% на рекомендованій ціні',f:'Новачкам і тим, хто тестує нішу'},
 {k:'Pro',gate:'Оборот від 20 000–30 000 ₴ на місяць',m:'Кращі закупівельні ціни: маржа від 15%',f:'Магазинам і продавцям з регулярними замовленнями'},
 {k:'Team',gate:'Оборот від 80 000–100 000 ₴ на місяць',m:'Найвигідніші ціни, знижки й бонуси з обороту',f:'Партнерам з кількома каналами або командою'}];
const BEN={
 stiny:['Клеїться без клею й інструментів — ремонт стіни за один день','Ховає нерівності, легко миється вологою ганчіркою'],
 plytka:['Укладається без розчину й затирки — без бруду й майстрів','Не боїться вологи: підходить для кухні та ванної'],
 pidloga:['Кладеться поверх старої підлоги без спеціальних інструментів','Зносостійке покриття, яке легко доглядати'],
 dekor:['Завершує ремонт: закриває стики й торці, додає акцент','Легкий монтаж своїми руками'],
 dim:['Практична річ для дому, яку легко показати на фото','Зручно дарувати й купувати одразу кілька штук']};

/* ---------- маленькі компоненти ---------- */
const lvlOf=()=>(WHO[S.who]||WHO.new);
const margin=()=>lvlOf().m;
function quiz(id,q,opts,ok,why){
 const a=S.ans[id],done=a!=null;
 return `<div class="ac-q${done?' is-done':''}" data-q="${id}"><p class="ac-qt">${ico('quiz')}<span>${q}</span></p><div class="ac-opts">${opts.map((o,i)=>{
  const cls=done?(i==ok?' ok':i==a?' bad':' dim'):'';
  return `<button type="button" class="ac-opt${cls}" data-ac="ans" data-qid="${id}" data-x="${i}" ${done?'disabled':''}>${o}</button>`}).join('')}</div>
  ${done?`<div class="ac-why ${a==ok?'ok':'bad'}"><b>${a==ok?'Правильно!':'Не зовсім.'}</b> ${why}</div>`:''}</div>`}
const QUIZ={}; // id → правильна відповідь (для підрахунку балів)
function q(id,qt,opts,ok,why){QUIZ[id]=ok;return quiz(id,qt,opts,ok,why)}
const deep=(html)=>`<div class="ac-deep">${html}</div>`;
const tip=(t,b)=>`<div class="ac-tip"><b>${t}</b><span>${b}</span></div>`;
const task=t=>`<div class="ac-task"><span>Завдання</span>${t}</div>`;
const pickedP=()=>S.picks.map(id=>byId.get(id)).filter(Boolean);
const grpOf=p=>(catBy[p.cat]||[])[1]||'dim';

/* ---------- кроки ---------- */
const STEPS=[
{id:'start',t:'Знайомство',m:1,
 html:()=>`<h2>Розкажіть про себе</h2>
 <p class="ac-lead">Два питання — і ми підлаштуємо навчання під вас: новачкам пояснимо все з нуля, досвідченим покажемо лише суть і умови.</p>
 <h3 class="ac-h">Хто ви?</h3>
 <div class="ac-cards c3">${Object.entries(WHO).map(([k,w])=>`<button type="button" class="ac-card${S.who==k?' on':''}" data-ac="who" data-v="${k}"><b>${w.t}</b><span>${w.d}</span></button>`).join('')}</div>
 <h3 class="ac-h">Скільки часу готові приділяти?</h3>
 <div class="ac-chips">${Object.entries(TIME).map(([k,v])=>`<button type="button" class="ac-chip${S.time==k?' on':''}" data-ac="time" data-v="${k}">${v}</button>`).join('')}</div>
 ${S.who?`<h3 class="ac-h">Скільки хочете заробляти на місяць?</h3>
 <div class="ac-goal"><input type="range" id="acGoal" min="3000" max="150000" step="1000" value="${S.goal||lvlOf().goal}" aria-label="Бажаний дохід на місяць"><output id="acGoalO">${fm(S.goal||lvlOf().goal)}</output></div>
 <p class="ac-note">Ціль потрібна для вашого особистого плану в кінці: порахуємо, скільки замовлень на день для неї потрібно.</p>`:''}
 ${S.who&&S.time?`<div class="ac-route"><b>Ваш маршрут готовий.</b> ${S.who=='new'?'Пояснюємо все з нуля, з прикладами й міні-тестами після кожного кроку.':'Показуємо коротку суть і тести — детальні пояснення можна розгорнути в будь-якому кроці.'} Рекомендований старт — рівень <b>${lvlOf().lvl}</b>.</div>`:''}`,
 ok:()=>S.who&&S.time},

{id:'model',t:'Як це працює',m:2,
 html:()=>`<h2>Як працює співпраця</h2>
 <p class="ac-lead">Це дропшипінг: ви продаєте наші товари, а склад, пакування й доставку беремо на себе. Ви нічого не купуєте наперед.</p>
 <ol class="flow ac-flow">
  <li><span class="who">Ви</span><b>Розміщуєте товар</b><span>Беріть наші фото й описи та публікуйте на OLX, Prom, в Instagram чи на своєму сайті.</span></li>
  <li><span class="who">Ви</span><b>Отримуєте замовлення</b><span>Клієнт пише вам. Погоджуєте ціну й доставку та передаєте замовлення менеджеру.</span></li>
  <li><span class="who we">Ми</span><b>Пакуємо й відправляємо</b><span>У день замовлення Новою Поштою або Укрпоштою.</span></li>
  <li><span class="who we">Ми</span><b>Ведемо доставку</b><span>Даємо ТТН, стежимо за посилкою, беремо на себе обмін і повернення.</span></li>
  <li><b>Ви заробляєте</b><span>Клієнт платить вашу ціну, ми утримуємо оптову, різницю виплачуємо вам.</span></li>
 </ol>
 ${deep(`<div class="ac-grid2">${tip('Чому це вигідно','Немає вкладень у товар, складу й ризику залишків. Ви платите лише своїм часом на оголошення й спілкування з клієнтами.')}${tip('Інші формати співпраці','Хочете закуповувати партіями для свого магазину — є <a href="opt.html">оптові умови</a>. Власний бренд під ключ — <a href="franchise.html">франшиза</a>. Ця академія — про дропшипінг.')}</div>`)}
 ${task('Хто що робить? Розподіліть обов’язки: натисніть «Ви» або «Ми».')}
 <div class="ac-sort">${SORT.map(([t,w],i)=>{const a=S.sort[i];return `<div class="ac-si${a?(a==w?' ok':' bad'):''}"><span>${t}</span><div>${['you','we'].map(v=>`<button type="button" class="${a==v?'on':''}" data-ac="sort" data-x="${i}" data-v="${v}" ${a?'disabled':''}>${v=='you'?'Ви':'Ми'}</button>`).join('')}</div>${a&&a!=w?`<em>Насправді — ${w=='you'?'ви':'ми'}</em>`:''}</div>`}).join('')}</div>
 ${q('m1','Чи потрібно купувати товар наперед, щоб почати?',['Так, мінімальна партія на 5 000 ₴','Ні, ви нічого не купуєте наперед','Так, але тільки зразки'],1,'Ви продаєте товар з нашого складу. Платити наперед нічого не потрібно — ні за товар, ні за склад.')}`,
 ok:()=>SORT.every((_,i)=>S.sort[i])&&S.ans.m1!=null},

{id:'money',t:'Гроші',m:2,
 html:()=>{const p=pickedP()[0]||exampleP(),P=p?p.price:1200,m=margin(),whole=Math.round(P*(1-m/100)),sell=Math.max(P,S.sell&&S.sellFor==(p&&p.id)?S.sell:P),inc=sell-whole;
 return `<h2>Як ви заробляєте</h2>
 <p class="ac-lead">Ціну для клієнта встановлюєте ви. Ми утримуємо оптову ціну товару, а різниця — ваш дохід.</p>
 <div class="ac-money">
  <div class="ac-mp">${p?`<button type="button" class="ac-mpi" data-p="${esc(p.id)}"><img src="${esc(p.img)}" alt="" onerror="this.style.opacity=0"></button>`:''}<div><span class="soft">Приклад${p?' з каталогу':''}</span><b>${esc(p?p.name:'Комплект 3D панелей на стіну')}</b><span class="soft">Рекомендована ціна ${fm(P)}</span></div></div>
  <label class="ac-sl"><span class="row">Ваша ціна для клієнта<output id="acSellO">${fm(sell)}</output></span><input type="range" id="acSell" min="${P}" max="${Math.round(P*1.4)}" step="${P>1000?10:1}" value="${sell}" data-pid="${p?esc(p.id):''}" data-p0="${P}" data-w="${whole}"></label>
  <div class="ac-bar" aria-hidden="true"><i class="w" style="flex:${whole}">Оптова ціна — нам</i><i class="y" style="flex:${Math.max(inc,whole*.08)}">Ваш дохід</i></div>
  <div class="ac-kv"><div><span>Клієнт платить</span><b id="acK1">${fm(sell)}</b></div><div><span>Оптова ціна (≈${lvlOf().lvl})</span><b>${fm(whole)}</b></div><div class="y"><span>Ви отримуєте</span><b id="acK3">${fm(inc)}</b></div></div>
  <p class="ac-note">Розрахунок орієнтовний: для рівня ${lvlOf().lvl} маржа ≈${m}% на рекомендованій ціні. Точні оптові ціни на кожен товар менеджер надішле в прайсі.</p>
 </div>
 ${deep(`<div class="ac-grid3">${tip('1. Клієнт платить','На реквізити або післяплатою на пошті — з оглядом товару на відділенні.')}${tip('2. Ми утримуємо оптову','Зі сплаченої суми залишаємо оптову ціну товару.')}${tip('3. Різниця — вам','Виплачуємо за запитом або за домовленістю раз на тиждень чи місяць.')}</div>`)}
 ${q('g1','Клієнт заплатив 1 300 ₴. Оптова ціна товару — 1 080 ₴. Скільки отримаєте ви?',['1 300 ₴','220 ₴','108 ₴','Нічого, поки не набереться оборот'],1,'Ваш дохід — різниця між ціною клієнта й оптовою: 1 300 − 1 080 = 220 ₴.')}
 ${q('g2','Ви продали товар дорожче за рекомендовану ціну. Кому дістається різниця?',['Вам','Порівну вам і магазину','Магазину'],0,'Ціну встановлюєте ви, тож уся різниця понад оптову ціну — ваша.')}`},
 ok:()=>S.ans.g1!=null&&S.ans.g2!=null},

{id:'goods',t:'Що продавати',m:3,
 html:()=>{const L=goodsList(),P=pickedP();
 return `<h2>Оберіть товари для старту</h2>
 <p class="ac-lead">Почніть з 3 товарів: на них потренуєтесь з оголошеннями й першими замовленнями. Це справжні товари з нашого складу — ціни й наявність актуальні.</p>
 ${deep(`<div class="ac-grid3">${tip('Видно результат','Найкраще продаються товари з ефектом «до/після»: 3D панелі, PET плитка, плівка, підлога.')}${tip('Зрозуміла ціна','Для першого продажу краще товар до 1 500 ₴ — клієнту простіше вирішити.')}${tip('Є вибір','Беріть позиції з кількома кольорами чи розмірами: так одне оголошення закриє більше запитів.')}</div>`)}
 ${task(`Оберіть 3 товари. Натисніть на фото, щоб переглянути характеристики й опис. <b class="ac-cnt">${P.length} / 3</b>`)}
 ${P.length?`<div class="ac-tray">${P.map(p=>`<span>${esc(p.name.slice(0,48))}${p.name.length>48?'…':''}<button type="button" data-ac="pick" data-pid="${esc(p.id)}" aria-label="Прибрати">${ico('x')}</button></span>`).join('')}</div>`:''}
 <div class="ac-tabs">${GROUPS.map(([g])=>`<button type="button" class="${S.grp==g?'on':''}" data-ac="grp" data-v="${g}">${esc(gname(g))}</button>`).join('')}</div>
 ${L===null?`<div class="ac-goods">${'<div class="sk" style="aspect-ratio:3/4"></div>'.repeat(4)}</div>`:
  L===false?`<div class="ac-route">Каталог зараз не завантажився. Можна продовжити — товари допоможе підібрати менеджер. <button type="button" class="link" data-ac="skipgoods">Продовжити без вибору</button></div>`:
  `<div class="ac-goods">${L.map(p=>{const on=S.picks.includes(p.id);return `<div class="ac-g${on?' on':''}"><button type="button" class="im" data-p="${esc(p.id)}" aria-label="${esc(p.name)}"><img loading="lazy" src="${esc(p.img)}" alt="" onerror="this.style.opacity=0"></button><b>${esc(p.name)}</b><span class="pr">${fm(p.price)} <em>ваш дохід ≈ ${fm(p.price*margin()/100)}</em></span><button type="button" class="btn sm ${on?'':'ghost'}" data-ac="pick" data-pid="${esc(p.id)}">${on?ico('check')+'Обрано':'Обрати'}</button></div>`}).join('')}</div>`}`},
 ok:()=>S.picks.length>=3||S.skipGoods},

{id:'where',t:'Де продавати',m:2,
 html:()=>`<h2>Де шукати покупців</h2>
 <p class="ac-lead">Обмежень немає — можна продавати будь-де. Для старту оберіть 1–2 канали, в яких вам комфортно.${S.who?` Для вас ми відзначили рекомендовані.`:''}</p>
 ${task('Оберіть канали, з яких почнете.')}
 <div class="ac-cards c2">${Object.entries(CH).map(([k,c])=>{const on=S.ch.includes(k),rec=lvlOf().ch.includes(k)&&S.who;return `<button type="button" class="ac-card ch${on?' on':''}" data-ac="ch" data-v="${k}">${rec?'<i class="rec">Рекомендуємо</i>':''}<b>${c.t}</b><span>${c.s}</span><span class="pl">+ ${c.p}</span><span class="mi">− ${c.c}</span></button>`}).join('')}</div>
 ${q('w1','У вас немає бюджету на рекламу і свого сайту. Де найшвидше отримати перші заявки?',['Запустити рекламу в Google','Розмістити оголошення на OLX та інших дошках','Чекати, поки сайт підніметься в пошуку'],1,'Дошки оголошень — найшвидший старт без бюджету: публікуєте оголошення з нашими фото й описами, і заявки можуть прийти вже в перший день.')}`,
 ok:()=>S.ch.length>0&&S.ans.w1!=null},

{id:'ad',t:'Перше оголошення',m:3,
 html:()=>{const P=pickedP().length?pickedP():[exampleP()].filter(Boolean);
 return `<h2>Створіть перше оголошення</h2>
 <p class="ac-lead">Добре оголошення відповідає на питання клієнта ще до того, як він їх поставить: що це, який розмір, скільки коштує і як отримати.</p>
 ${q('a1','Яке оголошення отримає більше заявок?',[adMock(0),adMock(1)],1,'У другому є все, що шукає покупець: точна назва з розміром, кілька фото, ціна, доставка й оплата при отриманні. «Дешево, пишіть в лс» не викликає довіри.')}
 ${deep(`<div class="ac-anat">${['Назва: товар + розмір + колір/фактура','4–8 фото: загальний вигляд, фактура зблизька, в інтер’єрі','Ціна — завжди вказана','Доставка й оплата: відправка в день замовлення, оплата при отриманні','Заклик: «напишіть розміри — порахую кількість»'].map((x,i)=>`<div><b>${i+1}</b><span>${x}</span></div>`).join('')}</div>`)}
 <h3 class="ac-h">Готові тексти для ваших товарів</h3>
 <p class="ac-note">Ми склали назву й опис з характеристик товару. Скопіюйте й вставте в оголошення, ціну за потреби змініть на свою. Фото беріть з картки товару.</p>
 <div class="ac-ads">${P.map((p,k)=>{const a=adText(p);return `<div class="ac-ad"><div class="ac-adh"><img src="${esc(p.img)}" alt="" onerror="this.style.opacity=0"><b>${esc(a.title)}</b></div><pre id="acAd${k}">${esc(a.body)}</pre><div class="acts"><button type="button" class="btn sm" data-ac="copy" data-x="${k}">Скопіювати текст</button><button type="button" class="btn sm ghost" data-p="${esc(p.id)}">Фото й характеристики</button></div></div>`}).join('')}</div>
 ${q('a2','Скільки фото краще додати до оголошення?',['Одне головне фото','4–8 фото з різних ракурсів і в інтер’єрі','Фото не важливі, головне — ціна'],1,'Покупець хоче побачити фактуру, колір і як товар виглядає на стіні чи підлозі. Більше якісних фото — більше довіри й заявок.')}`},
 ok:()=>S.ans.a1!=null&&S.ans.a2!=null},

{id:'order',t:'Замовлення',m:2,
 html:()=>{const p=pickedP()[0]||exampleP();
 return `<h2>Як оформити замовлення</h2>
 <p class="ac-lead">Клієнт готовий купити? Зберіть 5 даних і надішліть менеджеру в Telegram. Далі все робимо ми.</p>
 <div class="ac-grid2">
  <div class="ac-box"><h3>Що взяти в клієнта</h3><ul class="ac-check">${['Прізвище та ім’я отримувача','Телефон','Місто й відділення Нової Пошти або Укрпошти','Товар, артикул і кількість','Оплата: післяплата чи передоплата, і сума для клієнта'].map(x=>`<li>${x}</li>`).join('')}</ul></div>
  <div class="ac-box"><h3>Шаблон для менеджера</h3><pre id="acOrd">${esc(orderTpl(p))}</pre><button type="button" class="btn sm" data-ac="copyord">Скопіювати шаблон</button></div>
 </div>
 ${deep(`<h3 class="ac-h">Що відбувається далі</h3><ol class="ac-tl">${['Менеджер підтверджує наявність','Пакуємо й відправляємо в день замовлення','Надсилаємо вам ТТН — пересилаєте її клієнту','Клієнт отримує й оплачує','Ви отримуєте свою різницю'].map(x=>`<li>${x}</li>`).join('')}</ol>${tip('Якщо товар не підійшов','Обмін і повернення бере на себе Samostroy Shop — ви не залишаєтесь сам на сам з клієнтом.')}`)}
 ${q('o1','Клієнт хоче спочатку подивитися товар. Що робимо?',['Відмовляємо — тільки передоплата','Оформлюємо післяплату: клієнт оглядає посилку на відділенні й тоді платить','Просимо приїхати на склад'],1,'Оплата при отриманні з оглядом на відділенні — звична й зручна для клієнта. Вона підвищує довіру до вас.')}
 ${q('o2','Що з цього НЕ потрібно збирати в клієнта?',['Телефон','Номер відділення пошти','Дані банківської картки','Кількість товару'],2,'Дані картки ніколи не потрібні й не повинні передаватися в чатах. Для замовлення достатньо ПІБ, телефону, відділення, товару й способу оплати.')}`},
 ok:()=>S.ans.o1!=null&&S.ans.o2!=null},

{id:'grow',t:'Рівні та ріст',m:2,
 html:()=>`<h2>Як рости разом з нами</h2>
 <p class="ac-lead">Рівень не прив’язує вас назавжди: починайте зі Starter, а з ростом обороту переходьте на кращі ціни.</p>
 <div class="ac-lvls">${LVL.map(l=>`<div class="ac-lv${l.k==lvlOf().lvl&&S.who?' on':''}">${l.k==lvlOf().lvl&&S.who?'<i class="rec">Ваш старт</i>':''}<h3>${l.k}</h3><span class="for">${l.f}</span><span class="gate">${l.gate}</span><span>${l.m}</span></div>`).join('')}</div>
 <h3 class="ac-h">Що робити, щоб рости</h3>
 <div class="ac-grid3">${(GROW[S.who]||GROW.new).map(([a,b])=>tip(a,b)).join('')}</div>
 ${q('l1','Ваш оборот — 25 000 ₴ на місяць. Який рівень вам доступний?',['Starter','Pro','Team'],1,'Pro — для партнерів з оборотом від 20 000–30 000 ₴ на місяць: кращі закупівельні ціни й маржа від 15%.')}`,
 ok:()=>S.ans.l1!=null},

{id:'plan',t:'Ваш план старту',m:2,final:1,html:()=>planHTML(),ok:()=>true}];

const SORT=[['Публікує оголошення','you'],['Пакує посилку','we'],['Відповідає клієнту','you'],['Створює ТТН і стежить за доставкою','we'],['Встановлює ціну для клієнта','you'],['Оформлює обмін і повернення','we']];
const GROW={
 new:[['Регулярність','Перші 2 тижні додавайте 2–3 нові оголошення щодня. Більше оголошень — більше заявок.'],['Швидкі відповіді','Відповідайте клієнтам протягом 15 хвилин: хто відповів першим, той і продав.'],['Відгуки','Просіть клієнтів надіслати фото «після» — це найкращий контент для наступних продажів.']],
 seller:[['Ширший асортимент','Додайте 20–50 наших позицій до свого магазину чи маркетплейсу і подивіться, що продається найкраще.'],['Ціна з комісією','Закладайте комісію майданчика й рекламу в свою ціну — рекомендовану можна підняти.'],['Вихід на Pro','Стабільні 20–30 тис. ₴ обороту на місяць відкривають кращі ціни й пріоритетне бронювання.']],
 shop:[['Окрема категорія','Додайте товари для ремонту окремою категорією у вітрину — без викупу й залишків.'],['Імпорт каталогу','Запитайте в менеджера каталог для імпорту на сайт чи маркетплейс і документи для магазину.'],['Обсяги','Від 80–100 тис. ₴ обороту — рівень Team з бонусами. Для закупівлі партіями є <a href="opt.html">оптові умови</a>.']]};

/* ---------- допоміжне для кроків ---------- */
function exampleP(){if(!loaded)return null;return all.find(p=>p.av&&p.img&&!p.sale&&['3d-paneli','pet-plytka-rulon','plytka-vinilova'].includes(p.cat)&&p.price>=500&&p.price<=1500)||all.find(p=>p.av&&p.img)||null}
function goodsList(){
 if(!loaded)return failed?false:null;
 const pool=all.filter(p=>p.av&&p.img&&grpOf(p)==S.grp&&!p.sale),by={};
 pool.forEach(p=>{(by[p.cat]=by[p.cat]||[]).push(p)});
 const cats=Object.keys(by),out=[];
 for(let i=0;out.length<12&&cats.some(c=>by[c][i]);i++)for(const c of cats)if(by[c][i]&&out.length<12)out.push(by[c][i]);
 return out}
function adMock(k){
 return k==0?`<span class="ac-adm"><span class="ph one"></span><b>Панелі для стін дешево!!!</b><span>Гарні панелі, багато кольорів. Пишіть в лс.</span></span>`
 :`<span class="ac-adm"><span class="ph"><i></i><i></i><i></i><i></i></span><b>Самоклеюча 3D панель 700×700 мм під цеглу, біла</b><span>176 ₴ · Відправка в день замовлення, оплата при отриманні. Напишіть розміри стіни — порахую кількість.</span></span>`}
function adText(p){
 const g=grpOf(p),b=BEN[g]||BEN.dim,P=p.P||{};
 const keys=['Розмір','Ширина','Довжина','Висота','Товщина','Колір','Матеріал','Площа, що покривається панеллю','Кількість в упаковці','Тип використання'];
 const units={Ширина:' мм',Довжина:' мм',Висота:' мм',Товщина:' мм','Площа, що покривається панеллю':' м²'};
 const pars=keys.filter(k=>P[k]).map(k=>`• ${k}: ${P[k]}${units[k]&&!/[a-zа-яі]/i.test(P[k])?units[k]:''}`);
 let title=p.name.replace(/\s*\(\w{1,6}\)\s*/g,' ').replace(/\s+/g,' ').trim();if(title.length>70)title=title.slice(0,69).replace(/\s+\S*$/,'')+'…';
 const body=[`${p.name}`,'',`Ціна: ${fm(p.price)}`,'',`✓ ${b[0]}`,`✓ ${b[1]}`,'',pars.length?'Характеристики:':'',...pars,pars.length?'':'',
  '🚚 Відправка в день замовлення Новою Поштою або Укрпоштою','💳 Оплата при отриманні з оглядом на відділенні','📏 Напишіть розміри — допоможу порахувати потрібну кількість'].filter((x,i,a)=>!(x===''&&a[i-1]===''));
 return{title,body:body.join('\n').replace(/\n{3,}/g,'\n\n').trim()}}
function orderTpl(p){return `Замовлення від партнера\nОтримувач: \nТелефон: \nДоставка: Нова Пошта, місто ___, відділення № ___\nТовар: ${p?p.name+(p.sku?' ('+p.sku+')':''):'назва, артикул'} × 1\nОплата: післяплата / передоплата\nСума для клієнта: ___ ₴`}
const score=()=>{const ids=Object.keys(QUIZ).filter(k=>S.ans[k]!=null);const sort=SORT.filter((x,i)=>S.sort[i]==x[1]).length;return{ok:ids.filter(k=>S.ans[k]==QUIZ[k]).length+sort,all:ids.length+Object.keys(S.sort).length}};
function needPerDay(){const P=pickedP(),avg=P.length?P.reduce((a,p)=>a+p.price,0)/P.length:1200,one=avg*margin()/100,days=S.time=='c'?24:22;return{avg,one,n:Math.max(1,Math.ceil((S.goal||lvlOf().goal)/(one*days)-1e-9))}}
function week(){const ch=S.ch.map(k=>CH[k].t).join(', ')||'обраних каналах';
 const isNew=S.who!='seller'&&S.who!='shop';
 return isNew?[['День 1','Надішліть заявку нижче й отримайте від менеджера прайс та стартовий пакет'],['День 1',`Зареєструйтесь та оформіть профіль: ${ch}`],['День 2','Опублікуйте 3–5 оголошень з обраними товарами — тексти вже готові'],['День 3–5','Додавайте 2–3 оголошення щодня й відповідайте клієнтам протягом 15 хвилин'],['День 5','Подивіться, які оголошення збирають перегляди — додайте їм фото й варіанти кольорів'],['День 7','Підсумок з менеджером: що спрацювало й які товари додати']]
 :[['День 1','Надішліть заявку й отримайте прайс з оптовими цінами та фото'],['День 1–2',`Додайте 20–50 позицій: ${ch}`],['День 2','Порахуйте ціни з урахуванням комісії та реклами'],['День 3','Передайте перше замовлення менеджеру за шаблоном'],['День 5','Проаналізуйте, які категорії дають заявки, і розширте їх'],['День 7','Обговоріть з менеджером рівень Pro/Team та документи для магазину']]}
function planText(){const n=needPerDay(),sc=score();return [`📋 План старту з Академії партнера`,`Хто я: ${(WHO[S.who]||{}).t||'—'}; час: ${TIME[S.time]||'—'}`,`Рівень: ${lvlOf().lvl}`,`Канали: ${S.ch.map(k=>CH[k].t).join(', ')||'—'}`,`Товари: ${pickedP().map(p=>p.name+(p.sku?' ('+p.sku+')':'')).join('; ')||'допоможіть підібрати'}`,`Ціль: ${fm(S.goal||lvlOf().goal)}/міс (≈${n.n} замовл./день)`,`Тест: ${sc.ok}/${sc.all}`].join('\n')}
function planHTML(){
 const n=needPerDay(),sc=score(),W=week(),undone=STEPS.filter(s=>!s.final&&!S.done[s.id]);
 return `<h2>Ваш план старту</h2>
 ${undone.length?`<div class="ac-route">Залишилось пройти: ${undone.map(s=>`<button type="button" class="link" data-ac="go" data-v="${STEPS.indexOf(s)}">${s.t}</button>`).join(', ')}. План уже можна дивитися — він доповниться, коли завершите кроки.</div>`:`<div class="ac-cert">${ico('check')}<div><b>Навчання завершено!</b><span>Ви знаєте, з чого почати і що для цього потрібно. Правильних відповідей: ${sc.ok} з ${sc.all}.</span></div></div>`}
 <div class="ac-sum">
  <div><span>Рівень на старті</span><b>${lvlOf().lvl}</b><em>маржа ≈${margin()}%</em></div>
  <div><span>Канали</span><b>${S.ch.map(k=>CH[k].t).join(', ')||'—'}</b></div>
  <div><span>Ціль на місяць</span><b>${fm(S.goal||lvlOf().goal)}</b><em>≈ ${n.n} замовл. на день при чеку ${fm(n.avg)}</em></div>
  <div><span>Товари для старту</span><b>${pickedP().length?pickedP().map(p=>`<button type="button" class="link" data-p="${esc(p.id)}">${esc(p.name.slice(0,40))}${p.name.length>40?'…':''}</button>`).join('<br>'):'підбере менеджер'}</b></div>
 </div>
 ${n.n>8?`<div class="ac-route">Щоб для цілі вистачало менше замовлень, пропонуйте комплекти: не 1 панель, а набір на всю стіну. Середній чек 1 200 ₴ замість ${fm(n.avg)} — це вже ≈ ${Math.max(1,Math.ceil((S.goal||lvlOf().goal)/(1200*margin()/100*(S.time=='c'?24:22))))} замовл. на день.</div>`:''}
 <p class="ac-note">Скільки замовлень потрібно — розрахунок орієнтовний: без реклами, комісій і податків. Результат залежить від вашої активності.</p>
 <h3 class="ac-h">Перший тиждень</h3>
 <ul class="ac-week">${W.map(([d,t],i)=>`<li><label><input type="checkbox" data-ac="wk" data-x="${i}" ${S.week[i]?'checked':''}><span><b>${d}</b>${t}</span></label></li>`).join('')}</ul>
 <div class="apply ac-apply" id="acApply">
  <div><h3>Надішліть заявку — і почнімо</h3><p class="ac-note">Менеджер зв’яжеться з вами, надішле прайс з оптовими цінами, фото й описи. Ваш план додамо до заявки автоматично.</p>
   <div class="ac-more"><b>Хочете глибше?</b><a href="course-dropshipping.html">Курс «Дропшипінг з нуля» — 24 уроки</a><a href="course-sales3.html">Курс «Продажі 3.0» — діалог і заперечення</a><a href="partners.html">Товари для продажу — каталог і готові описи</a></div></div>
  <form class="af" id="acForm" novalidate>
   <label>Ім’я<input id="acName" autocomplete="name" value="${esc(cust.fn||'')}"></label>
   <label>Телефон<input id="acPhone" type="tel" autocomplete="tel" inputmode="tel" placeholder="+380" value="${esc(cust.fp||'')}"></label>
   <label class="full">Telegram або Viber (необов’язково)<input id="acMsg" autocomplete="off" placeholder="@нік або номер"></label>
   <input id="acHp" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
   <div class="hint full" id="acHint"></div>
   <button class="btn" id="acBtn" type="submit">Надіслати заявку з планом</button>
   <p class="note2">Або <button type="button" class="link" data-ac="tgplan">надішліть план менеджеру в Telegram</button> чи зателефонуйте: <a href="tel:+380984927948">+380 98 492 79 48</a>.</p>
  </form>
 </div>
 <p class="ac-again"><button type="button" class="link" data-ac="reset">Пройти академію заново</button></p>`}

/* ---------- рендер ---------- */
let failed=false;
const stage=$i('acStage'),nav=$i('acNav');
function doneCount(){return STEPS.filter(s=>!s.final&&S.done[s.id]).length}
const TOTAL=STEPS.filter(s=>!s.final).length;
function mark(){const s=STEPS[S.cur];if(!s.final&&s.ok()&&!S.done[s.id]){S.done[s.id]=1;save()}}
function render(scroll){
 S.cur=Math.min(Math.max(0,S.cur|0),STEPS.length-1);const s=STEPS[S.cur];mark();
 const brief=(S.who=='seller'||S.who=='shop')&&!S.exp[s.id];
 stage.innerHTML=`<div class="ac-sh"><span>${s.final?'Фініш':`Крок ${S.cur+1} з ${TOTAL}`} · ≈${s.m} хв</span>${brief&&!s.final&&s.id!='start'?`<button type="button" class="link" data-ac="exp">Показати детальні пояснення</button>`:''}</div>
  <div class="ac-body${brief?' brief':''}">${s.html()}</div>
  ${s.final?'':`<div class="ac-foot">${S.cur?`<button type="button" class="btn ghost" data-ac="prev">Назад</button>`:'<span></span>'}<div class="ac-fr"><span class="ac-hint" id="acNextHint">${s.ok()?'':'Виконайте завдання, щоб продовжити'}</span><button type="button" class="btn" data-ac="next" ${s.ok()?'':'disabled'}>${S.cur==STEPS.length-2?'До мого плану':'Далі'}</button></div></div>`}`;
 drawNav();bindStage();
 if(scroll)$i('learn').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'})}
function drawNav(){
 const d=doneCount(),pct=Math.round(d/TOTAL*100);
 nav.innerHTML=`<div class="ac-prog"><span><b>${pct}%</b> пройдено</span><div class="ac-pb"><i style="width:${pct}%"></i></div></div><ol>${STEPS.map((s,i)=>`<li><button type="button" class="${i==S.cur?'cur':''}${S.done[s.id]?' ok':''}" data-ac="go" data-v="${i}" ${i==S.cur?'aria-current="step"':''}><i>${S.done[s.id]?ico('check'):s.final?'★':i+1}</i><span>${s.t}</span></button></li>`).join('')}</ol>`;
 // герой: картка маршруту й кнопка «Продовжити»
 const hl=$i('acRoute');if(hl)hl.innerHTML=STEPS.map((s,i)=>`<li class="${S.done[s.id]?'ok':''}"><i>${S.done[s.id]?ico('check'):s.final?'★':i+1}</i><span>${s.t}</span><em>${s.m} хв</em></li>`).join('');
 const hp=$i('acHeroPct');if(hp){hp.textContent=pct+'%';$i('acHeroBar').style.width=pct+'%'}
 const c=nav.querySelector('.cur');if(c&&getComputedStyle(nav.querySelector('ol')).display=='flex'){const ol=nav.querySelector('ol');ol.scrollLeft=c.parentNode.offsetLeft-ol.offsetLeft-12}
 const st=$i('acStart');if(st)st.textContent=d==0&&!S.who?'Почати навчання':d>=TOTAL?'Мій план старту':`Продовжити: ${STEPS[S.cur].t}`}
function refreshFoot(){const s=STEPS[S.cur];mark();const b=stage.querySelector('[data-ac=next]');if(b){b.disabled=!s.ok();$i('acNextHint').textContent=s.ok()?'':'Виконайте завдання, щоб продовжити'}drawNav()}
function rerender(){const y=scrollY;render(false);scrollTo(0,y)}
function bindStage(){
 const g=$i('acGoal');if(g)g.oninput=()=>{S.goal=+g.value;$i('acGoalO').textContent=fm(S.goal);save()};
 const sl=$i('acSell');if(sl)sl.oninput=()=>{const v=+sl.value,w=+sl.dataset.w;S.sell=v;S.sellFor=sl.dataset.pid;save();$i('acSellO').textContent=$i('acK1').textContent=fm(v);$i('acK3').textContent=fm(v-w);const y=stage.querySelector('.ac-bar .y');if(y)y.style.flex=Math.max(v-w,w*.08)};
 const f=$i('acForm');if(f)f.onsubmit=sendForm}

/* ---------- дії ---------- */
stage.addEventListener('click',e=>{
 const b=e.target.closest('[data-ac]');if(!b||b.dataset.ac=='wk')return;const D=b.dataset,s=STEPS[S.cur];
 switch(D.ac){
  case'who':S.who=D.v;S.goal=lvlOf().goal;save();return rerender();
  case'time':S.time=D.v;save();return rerender();
  case'ans':if(S.ans[D.qid]!=null)return;S.ans[D.qid]=+D.x;save();{const box=b.closest('.ac-q');const tmp=document.createElement('div');tmp.innerHTML=s.html();const nb=tmp.querySelector(`[data-q="${D.qid}"]`);if(box&&nb)box.replaceWith(nb)}return refreshFoot();
  case'sort':if(S.sort[D.x])return;S.sort[D.x]=D.v;save();return rerender();
  case'pick':{const i=S.picks.indexOf(D.pid);if(i>=0)S.picks.splice(i,1);else{if(S.picks.length>=3)return toast('Для старту достатньо 3 товарів — приберіть один з обраних');S.picks.push(D.pid)}S.sell=0;save();return rerender()}
  case'grp':S.grp=D.v;save();return rerender();
  case'skipgoods':S.skipGoods=1;save();return rerender();
  case'ch':{const i=S.ch.indexOf(D.v);i>=0?S.ch.splice(i,1):S.ch.push(D.v);save();return rerender()}
  case'exp':S.exp[s.id]=1;save();return rerender();
  case'copy':return copy($i('acAd'+D.x).textContent);
  case'copyord':return copy($i('acOrd').textContent);
  case'next':if(!s.ok())return;S.cur++;save();return render(true);
  case'prev':S.cur--;save();return render(true);
  case'go':S.cur=+D.v;save();return render(true);
  case'tgplan':return tg(planText());
  case'reset':if(!confirm('Почати академію заново? Ваші відповіді й вибір буде скинуто.'))return;
   Object.assign(S,{who:'',time:'',goal:0,cur:0,done:{},ans:{},picks:[],ch:[],sort:{},week:{},exp:{},sell:0,skipGoods:0});save();return render(true);
 }});
stage.addEventListener('change',e=>{const b=e.target;if(b.dataset.ac=='wk'){S.week[b.dataset.x]=b.checked;save()}});
nav.addEventListener('click',e=>{const b=e.target.closest('[data-ac=go]');if(!b)return;S.cur=+b.dataset.v;save();render(true)});
document.querySelectorAll('[data-acgo]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();if(a.dataset.acgo!='cur'){S.cur=+a.dataset.acgo;save()}render(true)}));
function copy(t){
 const ok=()=>toast('Скопійовано. Вставте текст в оголошення чи чат');
 try{navigator.clipboard.writeText(t).then(ok,()=>fallback())}catch(x){fallback()}
 function fallback(){const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();try{document.execCommand('copy');ok()}catch(x){toast('Не вдалося скопіювати — виділіть текст вручну')}a.remove()}}

/* заявка з планом: Google Таблиця (сповіщення в Telegram), запасний канал — Telegram */
let fkey='';
async function sendForm(e){
 e.preventDefault();
 const ph=$i('acPhone'),hint=$i('acHint'),f=$i('acForm');
 if(!phoneOk(ph.value)){ph.classList.add('err');hint.textContent='Вкажіть телефон, щоб менеджер міг з вами зв’язатися';ph.focus();ph.addEventListener('input',()=>{ph.classList.remove('err');hint.textContent=''},{once:true});return}
 const plan=planText(),name=$i('acName').value.trim();
 try{cust.fn=name;cust.fp=ph.value;ls.set('cust',cust)}catch(x){}
 const details=`Заявка з Академії партнера — рівень: ${lvlOf().lvl}`+($i('acMsg').value?`; зв’язок: ${$i('acMsg').value}`:'');
 const msg=`🎓 Заявка з Академії партнера\nІм’я: ${name}\nТелефон: ${ph.value}\n`+($i('acMsg').value?`Зв’язок: ${$i('acMsg').value}\n`:'')+plan;
 const ok=id=>{f.innerHTML=`<div class="done"><div class="ic">${ico('check')}</div><h3>Заявку${id?' №'+esc(id):''} отримано</h3><p>Менеджер зв’яжеться з вами найближчим часом і надішле стартовий пакет. Щоб не чекати — напишіть у Telegram.</p><button type="button" class="btn" data-ac="tgplan">Написати менеджеру</button></div>`};
 if(!CFG.api){tg(msg);return ok('')}
 const b=$i('acBtn');b.classList.add('busy');b.disabled=true;fkey=fkey||okey();
 let r=null;try{r=await api({action:'order',order:{type:'Дропшипінг',name,phone:ph.value,city:'',pay:'',delivery:'',items:leadItems([details,...plan.split('\n').slice(1)]),page:location.href,lang,key:fkey,hp:$i('acHp').value}})}catch(x){}
 b.classList.remove('busy');b.disabled=false;
 if(r&&r.ok)return ok(r.id);
 hint.innerHTML='Не вдалося надіслати через сайт. <button type="button" class="link" data-ac="tgplan">Надіслати в Telegram</button> — текст заявки вже готовий.'}

/* каталог підвантажується shop.js — оновлюємо кроки, де потрібні товари */
const needsCat=()=>['money','goods','ad','order','plan'].includes(STEPS[S.cur].id);
addEventListener('catalog',()=>{S.picks=S.picks.filter(id=>byId.has(id));save();if(needsCat())rerender();else drawNav()});
addEventListener('catalogfail',()=>{failed=true;if(needsCat())rerender()});
render(false);
})();
