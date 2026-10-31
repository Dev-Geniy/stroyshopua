/* Франшиза: калькулятор частки партнера й окупності внеску, заявка (Google Таблиця → Telegram, запасний канал — Telegram). */
(()=>{
const $i=id=>document.getElementById(id),usd=n=>Math.round(n).toLocaleString('uk-UA').replace(/ /g,' ')+' $',FEE=6000;
const P=$i('frP');
function calc(){const p=+P.value,roy=p*.15,mine=p-roy,m=Math.ceil(FEE/mine);
 $i('frPO').textContent=usd(p);$i('frMine').textContent=usd(mine);$i('frRoy').textContent=usd(roy);$i('frYear').textContent=usd(mine*12);
 $i('frPay').textContent=m>24?'понад 2 роки':`≈ ${m} міс.`}
P.addEventListener('input',calc);calc();
const f=$i('frForm');let key='';
f.addEventListener('submit',async e=>{
 e.preventDefault();
 const nm=$i('fName'),ph=$i('fPhone'),hint=$i('fHint');
 const bad=(el,m)=>{el.classList.add('err');hint.textContent=m;el.focus();el.addEventListener('input',()=>{el.classList.remove('err');hint.textContent=''},{once:true})};
 if(!nm.value.trim())return bad(nm,'Вкажіть, як до вас звертатися');
 if(!phoneOk(ph.value))return bad(ph,'Вкажіть телефон, щоб ми могли з вами зв’язатися');
 const v=n=>f.querySelector(`[name=${n}]:checked`).value;
 const parts=['Франшиза / White Label',`досвід: ${v('fExp')}`,`старт: ${v('fWhen')}`];
 if($i('fCity').value)parts.push(`регіон: ${$i('fCity').value}`);
 if($i('fTg').value)parts.push(`Telegram: ${$i('fTg').value}`);
 parts.push(`розрахунок на сайті: чистий прибуток ${usd(+P.value)}/міс`);
 if($i('fCom').value)parts.push(`коментар: ${$i('fCom').value}`);
 const msg=`🏢 Заявка на франшизу\nІм’я: ${nm.value.trim()}\nТелефон: ${ph.value}\n`+parts.slice(1).join('\n');
 const ok=id=>{f.innerHTML=`<div class="done"><div class="ic"><svg class="i"><use href="#i-check"/></svg></div><h3>Заявку${id?' №'+esc(id):''} отримано</h3><p>Зв’яжемося з вами, щоб домовитися про консультацію. Терміново — пишіть у Telegram.</p><a class="btn" href="https://t.me/manager_samostroy_shop" target="_blank" rel="noopener">Написати в Telegram</a></div>`};
 if(!CFG.api){tg(msg);return ok('')}
 const b=$i('fBtn');b.classList.add('busy');key=key||okey();
 let r=null;try{r=await api({action:'order',order:{type:'Франшиза',name:nm.value.trim(),phone:ph.value,city:$i('fCity').value,pay:'',delivery:'',items:leadItems(parts),page:location.href,lang,key,hp:$i('fHp').value}})}catch(x){}
 b.classList.remove('busy');
 if(r&&r.ok)return ok(r.id);
 hint.innerHTML='Не вдалося надіслати через сайт. <button type="button" class="link" id="fTgB">Надіслати в Telegram</button> — текст уже готовий.';
 $i('fTgB').onclick=()=>tg(msg)});
})();
