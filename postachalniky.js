/* Сторінка для постачальників: живі категорії каталогу, чекліст готовності, заявка постачальника.
   Працює поверх shop.js (каталог, відправка заявок через CFG.api, запасний канал — Telegram). */
(()=>{
const $i=id=>document.getElementById(id);
const READY=[
 ['doc','Сертифікати або документи на продукцію','Підготуйте сертифікати чи декларації — їх запитують оптові клієнти й магазини.'],
 ['ph','Якісні фото товарів','Потрібні фото на білому тлі й в інтер’єрі. Якщо їх мало — допоможемо з подачею.'],
 ['spec','Характеристики: розміри, матеріал, вага','Без точних розмірів покупці не можуть порахувати кількість — це знижує продажі.'],
 ['feed','XML/YML-фід або прайс з наявністю','Фід дозволяє оновлювати ціни й наявність автоматично. Підійде й таблиця.'],
 ['stock','Стабільна наявність і відвантаження 1–2 дні','Швидке відвантаження — основа хороших відгуків і повторних замовлень.'],
 ['ret','Готовність вирішувати питання браку й обміну','Погодьте, як оформлюються обмін і брак, — це важливо для довіри покупців.'],
 ['off','Офіційне оформлення співпраці й платежів','Працюємо за договором: підготуйте реквізити й форму оподаткування.']];
const KEY='supplier_ready',st=ls.get(KEY,{});
function drawReady(){
 $i('spReady').innerHTML=READY.map(([k,t])=>`<label class="sp-it${st[k]?' on':''}"><input type="checkbox" data-r="${k}" ${st[k]?'checked':''}><span>${t}</span></label>`).join('');
 upd()}
function upd(){
 const n=READY.filter(r=>st[r[0]]).length,pct=Math.round(n/READY.length*100),miss=READY.filter(r=>!st[r[0]]);
 $i('spPct').textContent=pct+'%';$i('spBar').style.width=pct+'%';
 $i('spTip').innerHTML=!miss.length?'Ви готові до підключення. Надсилайте заявку — погодимо умови й запустимо продажі.':
  n>=5?`Майже все готово. Варто підготувати: <b>${miss.map(r=>r[1].toLowerCase()).join('; ')}</b>.`:
  `<b>Що підготувати першим:</b> ${miss[0][2]}${miss.length>1?` Ще ${miss.length-1} ${miss.length-1==1?'пункт':'пункти'} можна дозібрати разом з нами.`:''}`}
$i('spReady').addEventListener('change',e=>{const k=e.target.dataset.r;if(!k)return;st[k]=e.target.checked;ls.set(KEY,st);e.target.closest('.sp-it').classList.toggle('on',e.target.checked);upd()});
drawReady();

/* категорії, які вже продаємо — з живого каталогу */
function drawCats(){
 const el=$i('spCats');const L=[];
 for(const[g]of GROUPS){const P=all.filter(p=>p.av&&cgroup(p.cat)==g);if(!P.length)continue;
  const sub=(ORDER[g]||[]).filter(c=>!VIRT[c]&&c!='inshe'&&counts[c]).slice(0,4).map(c=>cname(c));
  L.push(`<a class="sp-cat" href="./?g=${g}"><span class="im"><img loading="lazy" src="${esc((P.find(p=>p.img)||{}).img||'')}" alt="" onerror="this.style.opacity=0"></span><span class="tx"><b>${esc(gname(g))}</b><em>${P.length} товарів у наявності</em><small>${esc(sub.join(' · '))}</small></span></a>`)}
 el.innerHTML=L.join('');
 const n=all.filter(p=>p.av).length;document.querySelectorAll('[data-avn]').forEach(e=>e.textContent=n)}
addEventListener('catalog',drawCats);if(loaded)drawCats();
addEventListener('catalogfail',()=>{$i('spCats').innerHTML=`<p class="soft">Асортимент: стіни (3D панелі, ПВХ, шпалери, плівка), плитка, підлога, профілі й декор, товари для дому та меблі. <a href="./">Відкрити каталог</a></p>`});

/* заявка постачальника */
const f=$i('spForm');let key='';
f.addEventListener('submit',async e=>{
 e.preventDefault();
 const co=$i('sCo'),ph=$i('sPhone'),hint=$i('sHint');
 const bad=(el,m)=>{el.classList.add('err');hint.textContent=m;el.focus();el.addEventListener('input',()=>{el.classList.remove('err');hint.textContent=''},{once:true})};
 if(!co.value.trim())return bad(co,'Вкажіть назву компанії або бренду');
 if(!phoneOk(ph.value))return bad(ph,'Вкажіть телефон, щоб ми могли з вами зв’язатися');
 const v=n=>f.querySelector(`[name=${n}]:checked`).value,cats=[...f.querySelectorAll('[name=sCat]:checked')].map(x=>x.value).join(', ')||'не вказано';
 const ready=READY.filter(r=>st[r[0]]).map(r=>r[1]),parts=[`Постачальник — компанія: ${co.value.trim()}`,`тип: ${v('sType')}`,`формат: ${v('sFmt')}`,`категорії: ${cats}`];
 if($i('sSku').value)parts.push(`позицій: ${$i('sSku').value}`);
 if($i('sUrl').value)parts.push(`каталог: ${$i('sUrl').value}`);
 if($i('sMail').value)parts.push(`зв’язок: ${$i('sMail').value}`);
 parts.push(`готовність: ${ready.length}/${READY.length}${ready.length?' ('+ready.join('; ')+')':''}`);
 if($i('sCom').value)parts.push(`коментар: ${$i('sCom').value}`);
 const name=$i('sName').value.trim()||co.value.trim();
 const msg=`🏭 Заявка постачальника\nКомпанія: ${co.value.trim()}\nКонтакт: ${$i('sName').value.trim()||'—'}\nТелефон: ${ph.value}\n`+parts.slice(1).join('\n');
 const ok=id=>{f.innerHTML=`<div class="done"><div class="ic"><svg class="i"><use href="#i-check"/></svg></div><h3>Заявку${id?' №'+esc(id):''} отримано</h3><p>Дякуємо! Повернемося з пропозицією протягом робочого дня. Терміново — пишіть у Telegram.</p><a class="btn" href="https://t.me/manager_samostroy_shop" target="_blank" rel="noopener">Написати в Telegram</a></div>`};
 if(!CFG.api){tg(msg);return ok('')}
 const b=$i('sBtn');b.classList.add('busy');key=key||okey();
 let r=null;try{r=await api({action:'order',order:{type:'Постачальник',name,phone:ph.value,city:'',pay:'',delivery:'',items:leadItems(parts),page:location.href,lang,key,hp:$i('sHp').value}})}catch(x){}
 b.classList.remove('busy');
 if(r&&r.ok)return ok(r.id);
 hint.innerHTML='Не вдалося надіслати через сайт. <button type="button" class="link" id="sTg">Надіслати в Telegram</button> або на <a href="mailto:partner@samostroy.shop">partner@samostroy.shop</a>.';
 $i('sTg').onclick=()=>tg(msg)});
})();
