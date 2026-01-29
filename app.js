/* ============================================================
   0) STORAGE
   ✅ FIX iPhone: fallback + safe save
============================================================ */
const LS_PROFILE_KEY = 'samostroy_partner_profile_v2';
const SS_PROFILE_KEY = 'samostroy_partner_profile_v2_ss';
const __memStore = {};

function storageSet(key, value){
  try{ localStorage.setItem(key, value); return { ok:true, where:'localStorage' }; }catch(e){}
  try{ sessionStorage.setItem(key, value); return { ok:true, where:'sessionStorage' }; }catch(e){}
  __memStore[key] = value;
  return { ok:false, where:'memory' };
}
function storageGet(key){
  try{ const v = localStorage.getItem(key); if(v) return v; }catch(e){}
  try{ const v = sessionStorage.getItem(key); if(v) return v; }catch(e){}
  return __memStore[key] || null;
}
function storageRemove(key){
  try{ localStorage.removeItem(key); }catch(e){}
  try{ sessionStorage.removeItem(key); }catch(e){}
  delete __memStore[key];
}

/* ============================================================
   1) GLOBAL
============================================================ */
const TELEGRAM_USERNAME = 'manager_samostroy_shop';
const XML_FEED_URL = 'products.xml';
const CGPRO_URL = 'https://samostroy.shop/tools/CGPRO.html';
const AI_TOOLS_URL = 'https://samostroy.shop/ai-tools.html'; // поставь нужную

function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 1800);
}
function openTelegram(msg){
  const url = `https://t.me/${TELEGRAM_USERNAME}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}
function money(n){
  const x = Number(n || 0);
  return `${x.toLocaleString('uk-UA')} грн`;
}
function escapeAttr(s){
  return String(s ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('"','&quot;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;');
}

function smoothScrollToId(id){
  const el = document.getElementById(id);
  if(!el) return;

  const topbar = document.querySelector('.topbar');
  const offset = (topbar?.offsetHeight || 0) + 12;

  const y = el.getBoundingClientRect().top + window.pageYOffset - offset;
  window.scrollTo({ top: y, behavior: 'smooth' });
}

/* ============================================================
   2) CLEAN HTML => TEXT (copy & display)
============================================================ */
function cleanHtmlToText(html){
  if(!html) return '';
  const div = document.createElement('div');
  div.innerHTML = String(html);

  div.querySelectorAll('li').forEach(li=>{
    li.innerHTML = `• ${li.textContent.trim()}`;
  });
  div.querySelectorAll('p,div').forEach(el=>{
    el.insertAdjacentText('afterend', '\n');
  });
  div.querySelectorAll('br').forEach(br=> br.replaceWith('\n'));

  let text = div.textContent || '';
  text = text
    .replace(/\u00A0/g,' ')
    .replace(/[ \t]+\n/g,'\n')
    .replace(/\n{3,}/g,'\n\n')
    .trim();
  return text;
}
function normalizeDesc(full){
  return cleanHtmlToText(full).replace(/\r\n/g,'\n').trim();
}
function shortFromFull(full){
  const t = normalizeDesc(full);
  if(!t) return 'Опис з XML-прайсу';
  return t.length > 140 ? (t.slice(0, 140).trim() + '…') : t;
}
function copyText(text){
  const s = String(text ?? '');
  if(navigator.clipboard && window.isSecureContext){
    navigator.clipboard.writeText(s).then(()=>{
      showToast('Скопійовано ✅');
    }).catch(()=>fallbackCopy(s));
  }else{
    fallbackCopy(s);
  }
}
function fallbackCopy(s){
  try{
    const ta = document.createElement('textarea');
    ta.value = s;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Скопійовано ✅');
  }catch(e){
    showToast('Не вдалося скопіювати');
  }
}

/* ============================================================
   3) CATEGORIES
============================================================ */
const CATEGORY_KEYWORDS = [
  { name: '3D панелі', keywords: ['3D панель', 'Панель стеніва', '3D', 'Декоративна 3D панель', 'Панель стінова', 'Панель-рейка', 'Панель рейка'] },
  { name: 'ПВХ панелі і плити', keywords: ['ПВХ панель', 'ПВХ плита', 'ПВХ'] },
  { name: 'Покриття вінілове', keywords: ['Покриття вінілове самоклеюче'] },
  { name: 'Плитка', keywords: ['Вінілова плитка', 'Вінілова плита', 'ПВХ плитка', 'Поліуретанова плитка', 'Алюмінієва плитка', 'LVT плитка', 'Плитка під ковролін'] },
  { name: 'PET плитка', keywords: ['Стінова PET плитка', 'PET мозаіка', 'PET плитка у рулоні'] },
  { name: 'Рейки профілі та декор', keywords: ['Профіль', 'Рейка декоративна', 'Молдинг', 'молдинг', 'Молдинги', 'рейка', 'Рейка', 'панель-рейка', 'панель рейка', 'декоративна рейка', 'Плінтус РР', 'Плінтус вініловий', 'Плінтус'] },
  { name: 'Молдинг', keywords: ['Молдинг', 'молдинг'] },
  { name: 'Штукатурка в рулонах', keywords: ['штукатурка', 'Штукатурка'] },
  { name: 'Самоклеюча плівка', keywords: ['Плівка самоклеюча', 'Плівка', 'Плівка віконна'] },
  { name: 'Шпалери', keywords: ['Шпалери'] },
  { name: 'Підлога-пазл', keywords: ['Підлога пазл', 'Підлога-пазл', 'Підлога-пазл плюшевий'] },
  { name: 'Килимки термо (дитячі)', keywords: ['Килимок дитячий', 'Термокилимок', 'Килимок', 'Дитячий'] },
  { name: 'Дзеркала', keywords: ['Дзеркало', 'Дзеркала', 'Дзеркало акрилове', 'Дзеркальний декор'] },
  { name: 'Меблі для дому та саду', keywords: ['Набір мебелів', 'Меблі', 'Тумба', 'Стелаж', 'Стіл', 'Етажерка', 'Полиця', 'Шафа', 'Крісло', 'Диван'] },
];

function getCategoryFromTitle(title){
  const lower = (title || '').toLowerCase();
  for (const group of CATEGORY_KEYWORDS){
    for (const key of group.keywords){
      if(lower.includes(String(key).toLowerCase())) return group.name;
    }
  }
  return 'Інше';
}

/* ============================================================
   4) CATEGORY IMAGES
============================================================ */
const CATEGORY_IMAGES = {
  "3D панелі": "https://i.ibb.co/CpNH3VS5/unnamed.png",
  "ПВХ панелі і плити": "https://i.ibb.co/wZXxPfvh/213124.png",
  "Покриття вінілове": "https://i.ibb.co/qMR1C83H/2026-01-22-155456.png",
  "Плитка": "https://i.ibb.co/twP9pMZ0/unnamed-1-1.png",
  "PET плитка": "https://i.ibb.co/xSj9QDvN/unnamed-1.png",
  "Рейки профілі та декор": "https://i.ibb.co/vvxkqgkX/image.png",
  "Молдинг": "https://i.ibb.co/gMbbMxYj/345345-1-345.png",
  "Штукатурка в рулонах": "https://i.ibb.co/sd5NLgbz/unnamed-2.jpg",
  "Самоклеюча плівка": "https://i.ibb.co/rGs6dDK7/unnamed.png",
  "Шпалери": "https://i.ibb.co/CpCYs6yP/unnamed-1.png",
  "Підлога-пазл": "https://i.ibb.co/kgs5SLs0/2314521.png",
  "Килимки термо (дитячі)": "https://i.ibb.co/Wpv6NpDk/2345235.png",
  "Дзеркала": "https://i.ibb.co/wZwZq5gs/unnamed-1.png",
  "Меблі для дому та саду": "https://i.ibb.co/F4mR1L0N/unnamed2344.png",
  "Інше": "https://i.ibb.co/h1CBZJzW/unnamed-2.png",
};
function getCategoryImage(name){
  return CATEGORY_IMAGES[name] || "https://via.placeholder.com/900x520?text=Category";
}

/* ============================================================
   5) PRODUCTS (default + xml)
============================================================ */
const DEFAULT_PRODUCTS = [
  {
    id: 1,
    title: 'Молдинг самоклейний 3000×8×4мм (білий)',
    category: getCategoryFromTitle('Молдинг самоклейний 3000×8×4мм (білий)'),
    price: 149,
    sku: 'MLD-3000-804-W',
    img: 'https://i.ibb.co/PZGTwyqp/unnamed.jpg',
    unit: 'шт',
    full: `Молдинг – це декоративний елемент інтер'єру.\nРозмір: 3000×8×4мм\n• Легкий монтаж\n• Естетичний вигляд\n• Легкість догляду`
  },
  {
    id: 2,
    title: 'Рейка декоративна 3D (чорна) 2.7м',
    category: getCategoryFromTitle('Рейка декоративна 3D (чорна) 2.7м'),
    price: 329,
    sku: 'REIKA-27-B',
    img: 'https://i.ibb.co/PZGTwyqp/unnamed.jpg',
    unit: 'шт',
    full: `Декоративна рейка для сучасних інтер'єрів.\n• Швидкий монтаж\n• Акцентна стіна\n• Стильний 3D ефект`
  },
  {
    id: 3,
    title: 'Штукатурка декоративна “Stone” 5кг',
    category: getCategoryFromTitle('Штукатурка декоративна “Stone” 5кг'),
    price: 399,
    sku: 'STU-5KG',
    img: 'https://i.ibb.co/PZGTwyqp/unnamed.jpg',
    unit: 'шт',
    full: `Декоративна штукатурка для внутрішніх робіт.\n• Фактура “камінь”\n• Добра адгезія\n• Стійка до стирання`
  }
];

let PRODUCTS = [...DEFAULT_PRODUCTS];

/* ============================================================
   5B) MANUAL SECTIONS (NOT from XML)
============================================================ */

// 1) Категории "Дім та сад"
const MANUAL_HOME_CATEGORIES = [
  { name: 'Електро постачання', img: 'https://i.ibb.co/PGWs1jLd/unnamed-4.jpg' },
  { name: 'Розумні Меблі',              img: 'https://i.ibb.co/NgVmTPjg/unnamed-6.jpg' },
  { name: 'Двір та сад',        img: 'https://i.ibb.co/whHrztN8/unnamed-7.jpg' },
];

const MANUAL_HOME_PRODUCTS = [
  {
    id: 10001,
    title: 'Подовжувач 5м (3 розетки)',
    category: 'Електро постачання',
    price: 199,
    sku: 'HG-ELEC-0001',
    img: 'https://via.placeholder.com/900x600?text=Product',
    unit: 'шт',
    full: 'Подовжувач для дому. 3 розетки, довжина 5м. Зручний для швидкого ремонту та побуту.'
  },
  {
    id: 10002,
    title: 'Стілець кухонний (міцний каркас)',
    category: 'Меблі',
    price: 899,
    sku: 'HG-FUR-0001',
    img: 'https://via.placeholder.com/900x600?text=Product',
    unit: 'шт',
    full: 'Зручний стілець для кухні/вітальні. Надійний каркас, легкий догляд.'
  },
];

// 2) Категории "Мода"
const MANUAL_FASHION_CATEGORIES = [
  { name: 'Одяг',       img: 'https://i.ibb.co/KxsYf5CT/unnamed-24.jpg' },
  { name: 'Дитячий одяг',  img: 'https://i.ibb.co/W4F9gwbw/unnamed-29.jpg' },
  { name: 'Взуття',     img: 'https://i.ibb.co/PZDtQ6yx/unnamed-27.jpg' },
  { name: 'Білизна',  img: 'https://i.ibb.co/cSTcyQg0/unnamed-28.jpg' },
  { name: 'Сумки та аксесуари',  img: 'https://i.ibb.co/fVS8z3VP/unnamed-26.jpg' },
  { name: 'Ювелірні вироби',  img: 'https://i.ibb.co/GfM4Qk2j/unnamed-30.jpg' }
];

const MANUAL_FASHION_PRODUCTS = [
  {
    id: 20001,
    title: 'Футболка базова (унісекс)',
    category: 'Одяг',
    price: 299,
    sku: 'FS-CLO-0001',
    img: 'https://via.placeholder.com/900x600?text=Product',
    unit: 'шт',
    full: 'Базова футболка на щодень. Універсальний крій, зручна посадка.'
  },
];

/* ====== render manual categories (same UI as main categories) ====== */
function renderManualSection(desktopId, mobileId, categories, products){
  const desk = document.getElementById(desktopId);
  const mob  = document.getElementById(mobileId);
  if(!desk || !mob) return;

  const countMap = {};
  for(const p of products){
    const c = p.category || 'Інше';
    countMap[c] = (countMap[c] || 0) + 1;
  }

  desk.innerHTML = '';
  categories.forEach(cat=>{
    const list = products.filter(p => (p.category || 'Інше') === cat.name);
    const count = countMap[cat.name] || 0;

    const card = document.createElement('div');
    card.className = 'catCard';
    card.innerHTML = `
      <div class="catArt">
        <img src="${escapeAttr(cat.img)}" alt="${escapeAttr(cat.name)}">
        <div class="shine"></div>
      </div>
      <div class="catName">
        <span>${escapeAttr(cat.name)}</span>
        <small>${count} шт</small>
      </div>
      <div class="catMeta">
        <span class="pill"><i data-lucide="expand"></i> Відкрити</span>
        <span class="pill"><i data-lucide="copy"></i> Копіювання</span>
      </div>
    `;
    card.addEventListener('click', ()=> openCategoryModal(cat.name, list));
    desk.appendChild(card);
  });

  mob.innerHTML = '';
  categories.forEach(cat=>{
    const list = products.filter(p => (p.category || 'Інше') === cat.name);
    const count = countMap[cat.name] || 0;

    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'catChip';
    row.innerHTML = `
      <span class="left">${escapeAttr(cat.name)} <small>(${count})</small></span>
      <span><i data-lucide="chevron-right"></i></span>
    `;
    row.addEventListener('click', ()=> openCategoryModal(cat.name, list));
    mob.appendChild(row);
  });

  if(window.lucide) lucide.createIcons();
}

async function loadProductsFromXML(){
  try{
    const res = await fetch(XML_FEED_URL, { cache:'no-store' });
    if(!res.ok) throw new Error('Bad status: ' + res.status);

    const text = await res.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'application/xml');

    const items = Array.from(xml.getElementsByTagName('item'));
    if(!items.length){
      PRODUCTS = [...DEFAULT_PRODUCTS];
      return;
    }

    const get = (node, tagName) => {
      const el = node.getElementsByTagName(tagName)[0];
      return el ? (el.textContent || '').trim() : '';
    };

    const placeholderImg = 'https://via.placeholder.com/900x600?text=Товар';

    const list = items.map((node, index)=>{
      const rawId = get(node,'g:id') || get(node,'id') || String(index+1);
      const numericId = Number((rawId || '').replace(/\D/g,'')) || (index+1);

      const title = get(node,'title') || get(node,'g:title') || `Товар ${numericId}`;
      const description = get(node,'description') || get(node,'g:description') || '';
      const priceText = get(node,'g:price') || '0';
      const price = parseFloat(priceText.replace(',', '.').replace(/[^\d.]/g,'')) || 0;
      const img = get(node,'g:image_link') || get(node,'g:additional_image_link') || placeholderImg;

      const availability = (get(node,'g:availability') || '').toLowerCase();
      if(availability && availability !== 'in stock') return null;

      return {
        id: numericId,
        title,
        category: getCategoryFromTitle(title),
        price,
        sku: rawId,
        img,
        unit:'шт',
        full: description || 'Детальний опис товару з XML-прайсу.'
      };
    }).filter(Boolean);

    PRODUCTS = list.length ? list : [...DEFAULT_PRODUCTS];
  }catch(err){
    console.warn('XML load error:', err);
    PRODUCTS = [...DEFAULT_PRODUCTS];
    showToast('Не вдалося прочитати products.xml — показуємо тестові товари');
  }
}

/* ============================================================
   6) NEWS
============================================================ */
const COMPANY_NEWS = [
  { title: "🔥 Новий товар Штукатурка в рулоні (сьогодні)", url: "https://samostroy.shop" },
  { title: "💰 Бонус 4.200 грн. кожному партнеру (читай умови, щоб отримати)", url: "https://samostroy.shop/pr-bonus.html" },
  { title: "✅ Ми з'явилися в Facebook", url: "https://www.facebook.com/samostroy.drop" },
  { title: "✅ Ми тепер і в Linkedin", url: "https://www.linkedin.com/in/dev-geniy/" },
  { title: "🎁 Партнерські акції — напиши менеджеру", action: () => openTelegram("Привіт! Хочу дізнатись про акції для партнерів.") },
  { title: "🧩 ТОП товари — підбірка на тиждень", action: () => openTelegram("Привіт! Хочу консультацію і підбірку ТОП товарів для швидкого старту.") },
];

function renderNews(){
  const box = document.getElementById('newsList');
  box.innerHTML = '';
  COMPANY_NEWS.forEach(n=>{
    const item = document.createElement('div');
    item.className = 'newsItem';
    item.innerHTML = `<span title="${escapeAttr(n.title)}">${n.title}</span><i data-lucide="chevron-right"></i>`;
    item.addEventListener('click', ()=>{
      if(typeof n.action === 'function') return n.action();
      if(n.url && n.url !== '#') return window.open(n.url, '_blank');
      showToast('Додай посилання для цієї новини');
    });
    box.appendChild(item);
  });
  if(window.lucide) lucide.createIcons();
}

/* ============================================================
   7) ADS LISTS 
============================================================ */
const BOARDS = [
  { name: "OLX", url: "https://www.olx.ua/" },
  { name: "Prom.ua (каталог/магазин)", url: "https://prom.ua/" },
  { name: "Facebook Marketplace", url: "https://www.facebook.com/marketplace/" },
  { name: "Telegram (канали/чати)", url: "https://t.me/" },
  { name: "Viber (спільноти)", url: "https://www.viber.com/" },
  { name: "Rozetka (витрина/продавець)", url: "https://seller.rozetka.com.ua/" },
];

const MARKETPLACES = [
  { name: "Rozetka", url: "https://rozetka.com.ua/" },
  { name: "Prom.ua", url: "https://prom.ua/" },
  { name: "EpicentrK", url: "https://epicentrk.ua/" },
  { name: "Allo", url: "https://allo.ua/" },
  { name: "Kasta", url: "https://kasta.ua/" },
  { name: "Bigl.ua", url: "https://bigl.ua/" },
];

function renderAds(){
  const boardsBox = document.getElementById('boardsList');
  const marketsBox = document.getElementById('marketsList');

  boardsBox.innerHTML = '';
  marketsBox.innerHTML = '';

  BOARDS.forEach(x=>{
    const el = document.createElement('div');
    el.className = 'adsLink';
    el.innerHTML = `<span title="${escapeAttr(x.name)}">${x.name}</span><i data-lucide="external-link"></i>`;
    el.addEventListener('click', ()=> window.open(x.url, '_blank'));
    boardsBox.appendChild(el);
  });

  MARKETPLACES.forEach(x=>{
    const el = document.createElement('div');
    el.className = 'adsLink';
    el.innerHTML = `<span title="${escapeAttr(x.name)}">${x.name}</span><i data-lucide="external-link"></i>`;
    el.addEventListener('click', ()=> window.open(x.url, '_blank'));
    marketsBox.appendChild(el);
  });

  if(window.lucide) lucide.createIcons();
}

/* ============================================================
   8) CATEGORIES UI
============================================================ */
const catsDesktopEl = document.getElementById('catsDesktop');
const catsMobileEl  = document.getElementById('catsMobile');

function uniqCategories(){
  const set = new Set(PRODUCTS.map(p => p.category || 'Інше'));
  CATEGORY_KEYWORDS.forEach(c => set.add(c.name));
  set.add('Інше');
  return Array.from(set).sort((a,b)=>a.localeCompare(b,'uk'));
}
function categoryCount(name){
  return PRODUCTS.filter(p => (p.category || 'Інше') === name).length;
}

function renderCategories(){
  const cats = uniqCategories();

  catsDesktopEl.innerHTML = '';
  cats.forEach(name=>{
    const count = categoryCount(name);
    const img = getCategoryImage(name);

    const card = document.createElement('div');
    card.className = 'catCard';
    card.innerHTML = `
      <div class="catArt">
        <img src="${escapeAttr(img)}" alt="${escapeAttr(name)}">
        <div class="shine"></div>
      </div>
      <div class="catName">
        <span>${escapeAttr(name)}</span>
        <small>${count} шт</small>
      </div>
      <div class="catMeta">
        <span class="pill"><i data-lucide="expand"></i> Відкрити</span>
        <span class="pill"><i data-lucide="copy"></i> Копіювати</span>
      </div>
    `;
    card.addEventListener('click', ()=> openCategoryModal(name));
    catsDesktopEl.appendChild(card);
  });

  catsMobileEl.innerHTML = '';
  cats.forEach(name=>{
    const count = categoryCount(name);
    const row = document.createElement('button');
    row.type='button';
    row.className='catChip';
    row.innerHTML = `
      <span class="left">${escapeAttr(name)} <small>(${count})</small></span>
      <span><i data-lucide="chevron-right"></i></span>
    `;
    row.addEventListener('click', ()=> openCategoryModal(name));
    catsMobileEl.appendChild(row);
  });

  if(window.lucide) lucide.createIcons();
}

/* ============================================================
   9) CATEGORY MODAL
============================================================ */
const catOverlay = document.getElementById('catOverlay');
const catModal   = document.getElementById('catModal');
const modalCatTitle = document.getElementById('modalCatTitle');
const modalGrid  = document.getElementById('modalGrid');
const modalEmpty = document.getElementById('modalEmpty');

const fSearch    = document.getElementById('fSearch');
const fSort      = document.getElementById('fSort');
const fPriceFrom = document.getElementById('fPriceFrom');
const fPriceTo   = document.getElementById('fPriceTo');

let modalBaseList  = [];

function anyModalOpen(){
  return (
    !catModal.classList.contains('hidden') ||
    !orderModal.classList.contains('hidden') ||
    !cabHelpModal.classList.contains('hidden') ||
    !orderTipOverlay.classList.contains('hidden') ||
    !aiModal.classList.contains('hidden')
  );
}

function syncBodyLock(){
  document.body.style.overflow = anyModalOpen() ? 'hidden' : '';
}

function openCategoryModal(name, customList){
  closeCabHelp();

  modalCatTitle.textContent = name;
  modalBaseList = Array.isArray(customList)
    ? customList
    : PRODUCTS.filter(p => (p.category || 'Інше') === name);

  fSearch.value = '';
  fSort.value = 'rel';
  fPriceFrom.value = '';
  fPriceTo.value = '';

  renderModalProducts();
  catOverlay.classList.remove('hidden');
  catModal.classList.remove('hidden');
  syncBodyLock();

  if(window.lucide) lucide.createIcons();
  setTimeout(()=>fSearch.focus(), 30);
}

function closeCategoryModal(){
  catOverlay.classList.add('hidden');
  catModal.classList.add('hidden');
  syncBodyLock();
}
document.getElementById('btnCloseModal').addEventListener('click', closeCategoryModal);
catOverlay.addEventListener('click', closeCategoryModal);

function applyFilters(list){
  let out = [...list];

  const q = fSearch.value.trim().toLowerCase();
  if(q) out = out.filter(p => (p.title||'').toLowerCase().includes(q));

  const pf = Number(fPriceFrom.value || 0);
  const pt = Number(fPriceTo.value || 0);
  if(pf > 0) out = out.filter(p => Number(p.price||0) >= pf);
  if(pt > 0) out = out.filter(p => Number(p.price||0) <= pt);

  const sort = fSort.value;
  if(sort === 'priceAsc') out.sort((a,b)=>(a.price||0)-(b.price||0));
  if(sort === 'priceDesc') out.sort((a,b)=>(b.price||0)-(a.price||0));
  if(sort === 'titleAsc') out.sort((a,b)=>(a.title||'').localeCompare(b.title||'','uk'));
  if(sort === 'titleDesc') out.sort((a,b)=>(b.title||'').localeCompare(a.title||'','uk'));
  return out;
}

function renderModalProducts(){
  const list = applyFilters(modalBaseList);

  modalGrid.innerHTML = '';
  modalEmpty.classList.toggle('hidden', list.length !== 0);
  if(!list.length) return;

  list.forEach(p=>{
    const full = normalizeDesc(p.full);
    const short = shortFromFull(p.full);

    const card = document.createElement('article');
    card.className='pCard';
    card.innerHTML = `
      <div class="pHead">
        <div class="pTitle">${escapeAttr(p.title)}</div>
        <button class="copyMini" type="button" title="Копіювати назву" data-copy="title"><i data-lucide="copy"></i></button>
      </div>

      <div class="pImg">
        <img src="${escapeAttr(p.img)}" alt="${escapeAttr(p.title)}">
      </div>

      <div class="pPriceRow">
        <div class="price">${money(p.price)}</div>
        <button class="copyMini" type="button" title="Копіювати ціну" data-copy="price"><i data-lucide="copy"></i></button>
      </div>

      <div class="pDesc">${escapeAttr(short)}</div>

      <div style="padding:0 12px 14px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btnPrimary" type="button" style="flex:1" data-copy="full"><i data-lucide="file-text"></i> Копіювати опис</button>
      </div>
    `;

    card.addEventListener('click', (e)=>{
      const btn = e.target.closest('[data-copy]');
      if(!btn) return;
      e.preventDefault();
      e.stopPropagation();

      const type = btn.dataset.copy;
      if(type === 'title') copyText(p.title || '');
      if(type === 'price') copyText(String(p.price || ''));
      if(type === 'full')  copyText(full || '');
    });

    modalGrid.appendChild(card);
  });

  if(window.lucide) lucide.createIcons();
}

[fSearch, fSort, fPriceFrom, fPriceTo].forEach(el=>{
  el.addEventListener('input', renderModalProducts);
  el.addEventListener('change', renderModalProducts);
});

document.getElementById('btnResetFilters').addEventListener('click', ()=>{
  fSearch.value='';
  fSort.value='rel';
  fPriceFrom.value='';
  fPriceTo.value='';
  renderModalProducts();
});

/* ============================================================
   10) LOGIN / PROFILE
============================================================ */
const loginPage = document.getElementById('loginPage');
const app = document.getElementById('app');

const loginForm = document.getElementById('loginForm');
const loginName = document.getElementById('loginName');
const loginAvatar = document.getElementById('loginAvatar');
const loginAvatarPreview = document.getElementById('loginAvatarPreview');

const nameFieldWrap = loginName.closest('.field');
const filePickMeta = document.getElementById('filePickMeta');
const filePickBtn  = document.getElementById('filePickBtn');

let pendingAvatarDataUrl = null;

function initials(name){
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if(!parts.length) return 'P';
  const first = parts[0][0] || '';
  const second = (parts[1]?.[0] || parts[0]?.[1] || '');
  return (first + second).toUpperCase();
}

function syncNameAttention(){
  nameFieldWrap.classList.toggle('attention', !loginName.value.trim());
}

function syncFilePickUI(fileOrFake){
  if(fileOrFake && typeof fileOrFake === 'object' && fileOrFake.name){
    filePickMeta.textContent = fileOrFake.name;
    filePickBtn.classList.remove('pulse');
  }else{
    filePickMeta.textContent = 'файл';
    filePickBtn.classList.add('pulse');
  }
}

function setLoginAvatarPreview(name, dataUrl){
  loginAvatarPreview.innerHTML = '';
  if(dataUrl){
    const img = document.createElement('img');
    img.src = dataUrl;
    loginAvatarPreview.appendChild(img);
  }else{
    const div = document.createElement('div');
    div.className = 'ph';
    div.textContent = initials(name);
    loginAvatarPreview.appendChild(div);
  }
}

async function makeAvatarDataUrl(file, size = 256, quality = 0.78){
  const url = URL.createObjectURL(file);
  try{
    const img = new Image();
    img.src = url;

    await new Promise((res, rej)=>{
      img.onload = () => res();
      img.onerror = (e) => rej(e);
    });

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;

    const side = Math.min(w, h);
    const sx = Math.floor((w - side) / 2);
    const sy = Math.floor((h - side) / 2);

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

    let q = quality;
    let dataUrl = canvas.toDataURL('image/jpeg', q);

    while (dataUrl.length > 900000 && q > 0.5){
      q -= 0.08;
      dataUrl = canvas.toDataURL('image/jpeg', q);
    }

    return dataUrl;
  } finally {
    URL.revokeObjectURL(url);
  }
}

loginName.addEventListener('input', ()=>{
  syncNameAttention();
  if(!pendingAvatarDataUrl){
    setLoginAvatarPreview(loginName.value, null);
  }
});

loginAvatar.addEventListener('change', async ()=>{
  const file = loginAvatar.files && loginAvatar.files[0];
  syncFilePickUI(file);

  if(!file){
    pendingAvatarDataUrl = null;
    setLoginAvatarPreview(loginName.value, null);
    return;
  }

  try{
    pendingAvatarDataUrl = await makeAvatarDataUrl(file, 256, 0.78);
  }catch(err){
    console.warn('Avatar convert error, fallback to FileReader:', err);
    try{
      pendingAvatarDataUrl = await new Promise((resolve, reject)=>{
        const reader = new FileReader();
        reader.onload = ()=> resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }catch(e2){
      pendingAvatarDataUrl = null;
    }
  }

  setLoginAvatarPreview(loginName.value, pendingAvatarDataUrl);
});

function saveProfile(profile){
  const payload = JSON.stringify(profile);
  const r = storageSet(LS_PROFILE_KEY, payload);
  if(!r.ok){
    storageSet(SS_PROFILE_KEY, payload);
    return false;
  }
  return true;
}
function loadProfile(){
  try{
    const raw = storageGet(LS_PROFILE_KEY) || storageGet(SS_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}
function clearProfile(){
  storageRemove(LS_PROFILE_KEY);
  storageRemove(SS_PROFILE_KEY);
}

function showLogin(){
  app.classList.add('hidden');
  loginPage.classList.remove('hidden');

  loginName.value = '';
  loginAvatar.value = '';
  pendingAvatarDataUrl = null;

  setLoginAvatarPreview('Partner', null);
  syncNameAttention();
  syncFilePickUI(null);

  syncBodyLock();
  if(window.lucide) lucide.createIcons();
}

function showApp(profile){
  loginPage.classList.add('hidden');
  app.classList.remove('hidden');

  const name = profile?.name || 'Партнер';
  document.getElementById('cabUserName').textContent = name;
  document.getElementById('cabNameUnder').textContent = name;

  const cabAvatar = document.getElementById('cabAvatar');
  cabAvatar.innerHTML = '';
  if(profile?.avatar){
    const img = document.createElement('img');
    img.src = profile.avatar;
    cabAvatar.appendChild(img);
  }else{
    const div = document.createElement('div');
    div.className = 'ph';
    div.textContent = initials(name);
    cabAvatar.appendChild(div);
  }

  document.getElementById('cabMetaLine').textContent = 'Профіль активний • Дані збережені локально';

  renderNews();
  renderAds();
  if(window.lucide) lucide.createIcons();
}

loginForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const name = loginName.value.trim();
  if(name.length < 2){
    showToast('Введи ім’я (мін. 2 символи)');
    syncNameAttention();
    return;
  }

  const profile = { name, avatar: pendingAvatarDataUrl || null, ts: Date.now() };

  let ok = saveProfile(profile);
  if(!ok && profile.avatar){
    profile.avatar = null;
    saveProfile(profile);
    showToast('Фото занадто велике — увійшли без фото ✅');
  }

  startApp(profile);
});

document.getElementById('loginDemo').addEventListener('click', ()=>{
  const profile = { name: '(Demo)', avatar: null, ts: Date.now() };
  saveProfile(profile);
  startApp(profile);
});

document.getElementById('btnLogout').addEventListener('click', ()=>{
  clearProfile();
  showToast('Ви вийшли');
  showLogin();
});

document.getElementById('btnEditProfile').addEventListener('click', ()=>{
  const prof = loadProfile();
  if(!prof){ showLogin(); return; }

  app.classList.add('hidden');
  loginPage.classList.remove('hidden');

  loginName.value = prof.name || '';
  loginAvatar.value = '';
  pendingAvatarDataUrl = prof.avatar || null;

  setLoginAvatarPreview(loginName.value, pendingAvatarDataUrl);
  syncNameAttention();
  if(prof.avatar){
    syncFilePickUI({ name: 'фото збережено' });
  }else{
    syncFilePickUI(null);
  }

  showToast('Онови дані та натисни “Увійти”');
  if(window.lucide) lucide.createIcons();
});

/* topbar links */
document.getElementById('btnTg').addEventListener('click', (e)=>{
  e.preventDefault();
  const prof = loadProfile();
  openTelegram(`Привіт! Я партнер: ${prof?.name || 'Партнер'}.`);
});
document.getElementById('btnShop').addEventListener('click', (e)=>{
  e.preventDefault();
  window.open('https://samostroy.shop', '_blank');
});

/* footer links */
document.getElementById('footShop').addEventListener('click', (e)=>{ e.preventDefault(); window.open('https://samostroy.shop','_blank'); });
document.getElementById('footTg').addEventListener('click', (e)=>{ e.preventDefault(); openTelegram('Привіт! Потрібна допомога по партнерському кабінету.'); });
document.getElementById('footCgpro').addEventListener('click', (e)=>{ e.preventDefault(); window.open(CGPRO_URL,'_blank'); });
document.getElementById('footXml').addEventListener('click', (e)=>{
  e.preventDefault();
  window.open(AI_TOOLS_URL, '_blank');
});

document.getElementById('footLogout').addEventListener('click', (e)=>{ e.preventDefault(); document.getElementById('btnLogout').click(); });

document.getElementById('toolExportProfile').addEventListener('click', ()=>{
  const prof = loadProfile();
  if(!prof){ showToast('Профіль відсутній'); return; }
  const blob = new Blob([JSON.stringify(prof, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'partner_profile.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Експортовано ✅');
});

document.getElementById('toolClearCache').addEventListener('click', ()=>{
  clearProfile();
  showToast('Кеш очищено (профіль)');
  showLogin();
});

/* ============================================================
   11) ORDER FLOW (2 steps -> Telegram prefilled)
============================================================ */
const orderOverlay = document.getElementById('orderOverlay');
const orderModal   = document.getElementById('orderModal');
const orderStepHint = document.getElementById('orderStepHint');

const orderStep1 = document.getElementById('orderStep1');
const orderStep2 = document.getElementById('orderStep2');

const oPartnerName  = document.getElementById('oPartnerName');
const oPartnerPhone = document.getElementById('oPartnerPhone');

const oClientLast  = document.getElementById('oClientLast');
const oClientFirst = document.getElementById('oClientFirst');
const oClientPhone = document.getElementById('oClientPhone');
const oCity        = document.getElementById('oCity');
const oCarrier     = document.getElementById('oCarrier');
const oBranch      = document.getElementById('oBranch');
const oProduct     = document.getElementById('oProduct');
const oSalePrice   = document.getElementById('oSalePrice');
const oNotes       = document.getElementById('oNotes');

let orderDraft = {};

function openOrderModal(){
  if(!catModal.classList.contains('hidden')) closeCategoryModal();
  closeCabHelp();

  const prof = loadProfile();
  const name = prof?.name || 'Партнер';

  orderDraft = {};
  orderStep1.classList.remove('hidden');
  orderStep2.classList.add('hidden');
  orderStepHint.textContent = 'Крок 1/2 — дані партнера (ваші).';

  oPartnerName.value = name;
  oPartnerPhone.value = '';

  oClientLast.value = '';
  oClientFirst.value = '';
  oClientPhone.value = '';
  oCity.value = '';
  oCarrier.value = 'Нова Пошта';
  oBranch.value = '';
  oProduct.value = '';
  oSalePrice.value = '';
  oNotes.value = '';

  orderOverlay.classList.remove('hidden');
  orderModal.classList.remove('hidden');
  syncBodyLock();

  if(window.lucide) lucide.createIcons();
  setTimeout(()=>oPartnerPhone.focus(), 60);
}

function closeOrderModal(){
  orderOverlay.classList.add('hidden');
  orderModal.classList.add('hidden');
  syncBodyLock();
}

document.getElementById('btnOrder').addEventListener('click', (e)=>{
  e.preventDefault();
  openOrderModal();
});

document.getElementById('btnOrderClose').addEventListener('click', closeOrderModal);
document.getElementById('btnOrderCancel1').addEventListener('click', closeOrderModal);
orderOverlay.addEventListener('click', closeOrderModal);

document.getElementById('btnOrderNext').addEventListener('click', ()=>{
  const name = oPartnerName.value.trim();
  const phone = oPartnerPhone.value.trim();

  if(name.length < 2){ showToast('Вкажи ім’я партнера'); return; }
  if(phone.length < 6){ showToast('Вкажи телефон партнера'); return; }

  orderDraft.partnerName = name;
  orderDraft.partnerPhone = phone;

  orderStep1.classList.add('hidden');
  orderStep2.classList.remove('hidden');
  orderStepHint.textContent = 'Крок 2/2 — дані клієнта та доставка.';

  if(window.lucide) lucide.createIcons();
  setTimeout(()=>oClientLast.focus(), 50);
});

document.getElementById('btnOrderBack').addEventListener('click', ()=>{
  orderStep2.classList.add('hidden');
  orderStep1.classList.remove('hidden');
  orderStepHint.textContent = 'Крок 1/2 — дані партнера (ваші).';
  setTimeout(()=>oPartnerPhone.focus(), 50);
});

document.getElementById('btnOrderSend').addEventListener('click', ()=>{
  const last  = oClientLast.value.trim();
  const first = oClientFirst.value.trim();
  const cphone = oClientPhone.value.trim();
  const city  = oCity.value.trim();
  const carrier = oCarrier.value;
  const branch  = oBranch.value.trim();
  const product = oProduct.value.trim();
  const salePrice = String(oSalePrice.value || '').trim();
  const notes = oNotes.value.trim();

  if(last.length < 2 || first.length < 2){ showToast('Вкажи ПІБ клієнта'); return; }
  if(cphone.length < 6){ showToast('Вкажи телефон клієнта'); return; }
  if(city.length < 2){ showToast('Вкажи місто'); return; }
  if(branch.length < 1){ showToast('Вкажи відділення'); return; }
  if(product.length < 2){ showToast('Вкажи товар'); return; }
  if(!salePrice || Number(salePrice) <= 0){ showToast('Вкажи ціну продажу'); return; }

  const msg =
`🧾 НОВЕ ЗАМОВЛЕННЯ (партнер)

👤 Партнер: ${orderDraft.partnerName}
📞 Тел партнера: ${orderDraft.partnerPhone}

👥 Клієнт: ${last} ${first}
📞 Тел клієнта: ${cphone}

🚚 Доставка: ${carrier}
🏙 Місто: ${city}
🏤 Відділення: ${branch}

📦 Товар: ${product}
💰 Ціна продажу: ${salePrice} грн

📝 Додатково: ${notes || '-'}
`;

  showToast('Відкриваю Telegram…');
  openTelegram(msg);
  closeOrderModal();
});

/* ============================================================
   12) CABINET HOW (overlay + modal)
============================================================ */
const cabHelpOverlay = document.getElementById('cabHelpOverlay');
const cabHelpModal   = document.getElementById('cabHelpModal');

function openCabHelp(){
  closeOrderTip();

  cabHelpOverlay.classList.remove('hidden');
  cabHelpModal.classList.remove('hidden');
  syncBodyLock();
  if(window.lucide) lucide.createIcons();
}
function closeCabHelp(){
  cabHelpOverlay.classList.add('hidden');
  cabHelpModal.classList.add('hidden');
  syncBodyLock();
}

document.getElementById('footHow').addEventListener('click', (e)=>{
  e.preventDefault();
  openCabHelp();
});
document.getElementById('btnCloseCabHelp').addEventListener('click', closeCabHelp);
cabHelpOverlay.addEventListener('click', closeCabHelp);

/* ============================================================
   13) ORDER TIP (for order modal fields)
============================================================ */
const orderTipOverlay = document.getElementById('orderTipOverlay');
const orderTipModal   = document.getElementById('orderTipModal');

function openOrderTip(){
  orderTipOverlay.classList.remove('hidden');
  orderTipModal.classList.remove('hidden');
  syncBodyLock();
  if(window.lucide) lucide.createIcons();
}
function closeOrderTip(){
  orderTipOverlay.classList.add('hidden');
  orderTipModal.classList.add('hidden');
  syncBodyLock();
}

document.getElementById('btnHelp').addEventListener('click', openOrderTip);
document.getElementById('btnHelpClose').addEventListener('click', closeOrderTip);
orderTipOverlay.addEventListener('click', closeOrderTip);

/* ============================================================
   AI MODAL (placeholder)
============================================================ */
const aiOverlay = document.getElementById('aiOverlay');
const aiModal   = document.getElementById('aiModal');

function openAiModal(){
  if(!catModal.classList.contains('hidden')) closeCategoryModal();
  if(!orderModal.classList.contains('hidden')) closeOrderModal();
  if(!cabHelpModal.classList.contains('hidden')) closeCabHelp();
  closeOrderTip();

  aiOverlay.classList.remove('hidden');
  aiModal.classList.remove('hidden');
  syncBodyLock();
  if(window.lucide) lucide.createIcons();
}
function closeAiModal(){
  aiOverlay.classList.add('hidden');
  aiModal.classList.add('hidden');
  syncBodyLock();
}

document.getElementById('btnAiClose').addEventListener('click', closeAiModal);
aiOverlay.addEventListener('click', closeAiModal);

/* ============================================================
   Quick cards events (ПК + Моб)
============================================================ */
function bindQuickNav(){
  const navCats  = document.getElementById('navCats');
  const navAds   = document.getElementById('navAds');
  const navAi    = document.getElementById('navAi');
  const navOrder = document.getElementById('navOrder');

  const mNavCats = document.getElementById('mNavCats');
  const mNavAds  = document.getElementById('mNavAds');
  const mNavAi   = document.getElementById('mNavAi');

  if(navCats)  navCats.addEventListener('click', ()=> smoothScrollToId('secCats'));
  if(navAds)   navAds.addEventListener('click', ()=> smoothScrollToId('secAds'));
  if(navAi)    navAi.addEventListener('click', openAiModal);
  if(navOrder) navOrder.addEventListener('click', openOrderModal);

  if(mNavCats) mNavCats.addEventListener('click', ()=> smoothScrollToId('secCats'));
  if(mNavAds)  mNavAds.addEventListener('click', ()=> smoothScrollToId('secAds'));
  if(mNavAi)   mNavAi.addEventListener('click', openAiModal);
}

/* ============================================================
   14) ESC handler (close topmost first)
============================================================ */
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;

  if (!cabHelpModal.classList.contains('hidden')) return closeCabHelp();
  if (!orderTipOverlay.classList.contains('hidden')) return closeOrderTip();
  if (!aiModal.classList.contains('hidden')) return closeAiModal();

  if (!orderModal.classList.contains('hidden')) return closeOrderModal();
  if (!catModal.classList.contains('hidden')) return closeCategoryModal();
});

/* ============================================================
   15) APP START
============================================================ */
function setLoader(on){
  const loader = document.getElementById('loader');
  loader.classList.toggle('hidden', !on);
}

async function startApp(profile){
  setLoader(true);

  await loadProductsFromXML();
  renderCategories();

  // ✅ ВАЖНО: теперь твои “ручные” секции реально рендерятся
  renderManualSection('homeCatsDesktop','homeCatsMobile', MANUAL_HOME_CATEGORIES, MANUAL_HOME_PRODUCTS);
  renderManualSection('fashionCatsDesktop','fashionCatsMobile', MANUAL_FASHION_CATEGORIES, MANUAL_FASHION_PRODUCTS);

  showApp(profile);

  setLoader(false);
}

/* ============================================================
   INIT
============================================================ */
(function init(){

  function initSocialAccordion(){
    const d = document.getElementById('socialDetails');
    if(!d) return;

    // на мобилке закрываем по умолчанию
    if(window.matchMedia('(max-width: 680px)').matches){
      d.removeAttribute('open');
    }else{
      d.setAttribute('open','');
    }

    // синхронизация при смене ширины экрана
    const mq = window.matchMedia('(max-width: 680px)');
    mq.addEventListener?.('change', (e)=>{
      if(e.matches) d.removeAttribute('open');
      else d.setAttribute('open','');
    });
  }

  if(window.lucide) lucide.createIcons();
  document.getElementById('year').textContent = new Date().getFullYear();
  bindQuickNav();

  initSocialAccordion();

  const prof = loadProfile();
  if(prof && prof.name){
    startApp(prof);
  }else{
    showLogin();
  }
})();

// ===================== Desktop card modals =====================
(() => {
  const openers = document.querySelectorAll('[data-ssmodal]');
  const modals  = document.querySelectorAll('.ssModal');
  let lastFocus = null;

  function openModal(id){
    const m = document.getElementById(id);
    if(!m) return;

    // close any opened
    const opened = document.querySelector('.ssModal.isOpen');
    if(opened) closeModal(opened);

    lastFocus = document.activeElement;

    m.classList.add('isOpen');
    m.setAttribute('aria-hidden', 'false');
    document.body.classList.add('ssModalLock');

    // focus close btn
    const closeBtn = m.querySelector('.ssClose');
    setTimeout(() => closeBtn && closeBtn.focus(), 30);

    // re-render lucide icons (на случай если нужно)
    if(window.lucide && lucide.createIcons) lucide.createIcons();
  }

  function closeModal(m){
    if(!m) return;
    m.classList.remove('isOpen');
    m.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('ssModalLock');
    if(lastFocus && lastFocus.focus) lastFocus.focus();
  }

  openers.forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.dataset.ssmodal));
  });

  modals.forEach(m => {
    m.addEventListener('click', (e) => {
      if(e.target.matches('[data-ssclose]') || e.target.closest('[data-ssclose]')){
        closeModal(m);
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape'){
      const opened = document.querySelector('.ssModal.isOpen');
      if(opened) closeModal(opened);
    }
  });
})();

  // ✅ Лёгкая анимация появления блока
  (() => {
    const els = document.querySelectorAll('[data-animate="in"]');
    if(!els.length) return;

    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15 });

    els.forEach(el=>io.observe(el));
  })();

// Кллик по картинке -------------------------------

(() => {
  const modal = document.getElementById('greetModal');
  const typingEl = document.getElementById('greetTyping');
  const caretEl = document.getElementById('greetCaret');

  const closeBtn = document.getElementById('greetClose');
  const actions = document.getElementById('greetActions');

  if (!modal || !typingEl || !closeBtn || !actions) return;

  let typingAbort = false;

  // ✅ Триггеры: кликаем по двум изображениям (data-greet-trigger)
  const triggers = document.querySelectorAll('[data-greet-trigger] img, [data-greet-trigger]');
  triggers.forEach(el => el.addEventListener('click', openModal));

  // ✅ Текст (українською, грамотно + вовлекающе)
  const segments = [
    { type:'text', value:
      "Вітаю! Мене звати Євген.\n\n" +
      "Радий знайомству 🤝 Якщо у вас є ідеї, пропозиції або питання щодо співпраці — напишіть мені, із задоволенням обговоримо.\n"
    },
    { type:'text', value: "Мій Telegram: " },
    { type:'link', text: "@son_of_god_evgen", href: "https://t.me/son_of_god_evgen" },
    { type:'text', value:
      "\n\n" +
      "З технічних питань, дропшиппінгу, замовлень та підтримки — звертайтесь до менеджера техпідтримки або до вашого персонального менеджера.\n\n" +
      "Коротко про нас: " },
    { type:'link', text: "Samostroy.shop", href: "https://samostroy.shop" },
    { type:'text', value:
      " — міжнародний інтернет-магазин і постачальник з партнерами по всій Україні та за її межами.\n" +
      "Ми допомагаємо партнерам зростати: будуємо процеси, підказуємо робочі моделі продажів, даємо інструменти та підтримку, щоб заробіток стабільно збільшувався.\n\n" +
      "Тут зібрано все необхідне для старту і заробітку: добірки товарів, інструкції, підказки та готові рішення.\n" +
      "Також у нас є Академія з навчанням: базовий курс допоможе новачкам стартувати з нуля, а поглиблені теми — системно прокачають тих, хто вже продає.\n\n" +
      "Буду радий бути на зв’язку. Напишіть — відповім і підкажу найкращий шлях під вашу ситуацію."
    }
  ];

  function openModal(){
    typingAbort = false;

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden','false');
    document.body.classList.add('modal-open');

    // ✅ скрываем крестик и actions до печати
    closeBtn.classList.remove('is-ready');
    actions.classList.remove('is-ready');

    // сброс текста
    typingEl.innerHTML = "";
    if (caretEl) caretEl.style.display = "inline-block";

    typeSegments(typingEl, segments, { baseSpeed: 18, jitter: 14 }).then(() => {
      if (typingAbort) return;

      // ✅ показываем кнопку + подпись и крестик после печати
      actions.classList.add('is-ready');
      closeBtn.classList.add('is-ready');

      if (caretEl) caretEl.style.display = "none";
    });
  }

  function closeModal(){
    typingAbort = true;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden','true');
    document.body.classList.remove('modal-open');
  }

  // закрытие по затемнению
  modal.addEventListener('click', (e) => {
    if (e.target && e.target.hasAttribute('data-greet-close')) closeModal();
  });

  // ✅ закрытие по кресту
  closeBtn.addEventListener('click', closeModal);

  // ESC
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
  });

  // ===== typing helpers =====
  async function typeSegments(container, segs, opts){
    const base = opts.baseSpeed ?? 18;
    const jitter = opts.jitter ?? 12;

    for (const seg of segs){
      if (typingAbort) return;

      if (seg.type === 'text'){
        await typeText(container, seg.value, base, jitter);
      } else if (seg.type === 'link'){
        await typeLink(container, seg.text, seg.href, base, jitter);
      }
    }
  }

  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
  function randDelay(base, jitter){ return base + Math.floor(Math.random() * (jitter + 1)); }

  async function typeText(container, text, base, jitter){
    for (let i=0; i<text.length; i++){
      if (typingAbort) return;

      const ch = text[i];

      if (ch === "\n"){
        container.appendChild(document.createElement("br"));

        const next = text[i+1];
        if (next === "\n"){
          container.appendChild(document.createElement("br"));
          i++;
          await sleep(220);
        } else {
          await sleep(80);
        }
      } else {
        container.appendChild(document.createTextNode(ch));
      }

      await sleep(randDelay(base, jitter));
    }
  }

  async function typeLink(container, linkText, href, base, jitter){
    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
    container.appendChild(a);

    for (let i=0; i<linkText.length; i++){
      if (typingAbort) return;
      a.appendChild(document.createTextNode(linkText[i]));
      await sleep(randDelay(base, jitter));
    }
  }
})();

/* ========================= 🅰️ℹ️ Support (Pollinations, no key) ========================= */
(() => {
  const overlay = document.getElementById("aiSupOverlay");
  const modal   = document.getElementById("aiSupModal");
  const titleEl = document.getElementById("aiSupTitle");
  const chipEl  = document.getElementById("aiSupChip");
  const chatEl  = document.getElementById("aiSupChat");
  const inputEl = document.getElementById("aiSupInput");
  const sendBtn = document.getElementById("aiSupSend");
  const closeBtn= document.getElementById("aiSupClose");
  const resetBtn= document.getElementById("aiSupReset");

  if(!overlay || !modal || !chatEl || !inputEl || !sendBtn) return;

  const COOLDOWN_MS = 6500;
  let lastCallAt = 0;
  let queue = Promise.resolve();

  const MAX_TA_H = 140;
  function autosizeTA(){
    inputEl.style.height = "auto";
    inputEl.style.height = Math.min(inputEl.scrollHeight, MAX_TA_H) + "px";
  }
  inputEl.addEventListener("input", autosizeTA);

  let state = {
    topic: "",
    kb: "",
    messages: [] // {role:'user'|'assistant', content:string}
  };

  // open from any element with data-aihelp
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-aihelp]");
    if(!btn) return;

    const cfg = {
      title: btn.dataset.aiTitle || "AI-підказка",
      topic: btn.dataset.aiTopic || "Тема",
      first: btn.dataset.aiFirst || "Поясни коротко і по кроках.",
      kbId:  btn.dataset.aiKb || ""
    };
    openSupport(cfg);
  });

  // close
  overlay.addEventListener("click", closeSupport);
  closeBtn?.addEventListener("click", closeSupport);
  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape" && !modal.classList.contains("hidden")) closeSupport();
  });

  // send
  sendBtn.addEventListener("click", sendUser);
  inputEl.addEventListener("keydown", (e) => {
    if(e.key === "Enter" && !e.shiftKey){
      e.preventDefault();
      sendUser();
    }
  });

  resetBtn?.addEventListener("click", () => {
    state.messages = [];
    renderChat(true);
    inputEl.value = "";
    autosizeTA();
    inputEl.focus();
  });

  function openSupport(cfg){
    // если открыт хаб-модал (#aiModal) — закрываем его, чтобы не было двух оверлеев
    const hub = document.getElementById("aiModal");
    const hubOv= document.getElementById("aiOverlay");
    if(hub && !hub.classList.contains("hidden")){
      hub.classList.add("hidden");
      hubOv?.classList.add("hidden");
    }

    titleEl.textContent = cfg.title;
    chipEl.textContent  = cfg.topic || "Тема";
    state.topic = cfg.topic || "";
    state.kb = readKb(cfg.kbId);

    state.messages = [];
    overlay.classList.remove("hidden");
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    addMsg("user", cfg.first);
    renderChat(true);
    askAI();

    inputEl.value = "";
    autosizeTA();
    inputEl.focus();

    if(window.lucide?.createIcons) window.lucide.createIcons();
  }

  function closeSupport(){
    overlay.classList.add("hidden");
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  function readKb(kbId){
    if(!kbId) return "";
    const tpl = document.getElementById(kbId);
    if(!tpl) return "";
    const txt = (tpl.content?.textContent || "").trim();
    return truncate(txt, 1800);
  }

  function sendUser(){
    const text = (inputEl.value || "").trim();
    if(!text) return;
    inputEl.value = "";
    autosizeTA();
    addMsg("user", text);
    renderChat(true);
    askAI();
  }

  function addMsg(role, content){
    state.messages.push({ role, content: String(content || "") });
  }

  function renderChat(scrollBottom=false){
    chatEl.innerHTML = "";
    for(const m of state.messages){
      chatEl.appendChild(renderMsg(m));
    }
    if(window.lucide?.createIcons) window.lucide.createIcons();
    if(scrollBottom) chatEl.scrollTop = chatEl.scrollHeight;
  }

  function renderMsg(m){
    const row = document.createElement("div");
    row.className = "aiMsg";

    const ava = document.createElement("div");
    ava.className = "aiAva";
    ava.innerHTML = `<i data-lucide="${m.role === "user" ? "user" : "bot"}"></i>`;

    const bub = document.createElement("div");
    bub.className = "aiBubble" + (m.role === "user" ? " user" : "");

    if(m.role === "user"){
      bub.textContent = m.content;
    }else{
      const html = renderMarkdownSafe(cleanAssistantText(m.content));
      bub.innerHTML = `<div class="md">${html}</div>`;
    }

    row.appendChild(ava);
    row.appendChild(bub);
    return row;
  }

  function cleanAssistantText(s){
    // убираем “эмодзи-цифры” как страховка
    return String(s || "")
      .replace(/[0-9]️⃣/g, "")
      .replace(/🔟/g, "10")
      .replace(/\r\n/g, "\n");
  }

  function buildSystem(){
    return [
      "Ти AI-підтримка Samostroy Partner Cabinet.",
      `Тема: ${state.topic}.`,
      "Відповідай коротко і по кроках, як наставник для новачка.",
      "Не використовуй Markdown-таблиці. Форматуй відповідь списками та короткими блоками.",
      "Не використовуй емодзі-цифри.",
      "Якщо точні ціни/тарифи невідомі — скажи, що вони змінюються і де перевірити.",
      "",
      "БАЗА ЗНАНЬ:",
      state.kb || "(база знань не задана)"
    ].join("\n");
  }

  function buildMessagesForAI(){
    // нужно: последние 3 предыдущих + текущее (итого 4)
    const tail = state.messages.slice(-4);
    const msgs = [{ role:"system", content: buildSystem() }];
    for(const m of tail){
      msgs.push({ role: m.role, content: m.content });
    }
    return msgs;
  }

  async function askAI(){
    setBusy(true);
    showTyping();

    queue = queue.then(async () => {
      const wait = COOLDOWN_MS - (Date.now() - lastCallAt);
      if(wait > 0) await new Promise(r => setTimeout(r, wait));
      lastCallAt = Date.now();

      try{
        return await pollinationsPOST(buildMessagesForAI());
      }catch(_){
        const prompt = buildPromptForGET();
        return await pollinationsGET(prompt);
      }
    }).then((answer) => {
      hideTyping();
      addMsg("assistant", (answer || "").trim() || "Вибач, не отримав відповідь. Спробуй ще раз.");
      renderChat(true);
    }).catch((err) => {
      hideTyping();
      addMsg("assistant", "Помилка: " + (err?.message || String(err)));
      renderChat(true);
    }).finally(() => {
      setBusy(false);
      inputEl.focus();
    });

    await queue;
  }

  function buildPromptForGET(){
    const tail = state.messages.slice(-4);
    let p = buildSystem() + "\n\n";
    for(const m of tail){
      p += (m.role === "user" ? "КОРИСТУВАЧ: " : "AI: ") + m.content + "\n";
    }
    p += "\nAI:";
    return truncate(p, 1800);
  }

  async function pollinationsPOST(messages){
    const r = await fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({
        model: "openai",
        temperature: 0.6,
        max_tokens: 450,
        messages
      })
    });
    if(!r.ok){
      const t = await r.text().catch(()=> "");
      throw new Error(`POST HTTP ${r.status} ${t}`.trim());
    }
    const data = await r.json();
    return data?.choices?.[0]?.message?.content || "";
  }

  async function pollinationsGET(prompt){
    const url = "https://text.pollinations.ai/" + encodeURIComponent(prompt) + "?model=mistral&temperature=0.6";
    const r = await fetch(url);
    if(!r.ok){
      const t = await r.text().catch(()=> "");
      throw new Error(`GET HTTP ${r.status} ${t}`.trim());
    }
    return await r.text();
  }

  function setBusy(b){
    sendBtn.disabled = b;
    inputEl.disabled = b;
    if(resetBtn) resetBtn.disabled = b;
  }

  function showTyping(){
    const t = document.createElement("div");
    t.className = "aiTyping";
    t.id = "aiTyping";
    t.textContent = "AI друкує…";
    chatEl.appendChild(t);
    chatEl.scrollTop = chatEl.scrollHeight;
  }
  function hideTyping(){
    const t = document.getElementById("aiTyping");
    if(t) t.remove();
  }

  function truncate(s, n){
    s = String(s || "");
    return s.length > n ? s.slice(0, n-1) + "…" : s;
  }

  /* ===== safe mini-markdown (lists, paragraphs, code, tables but we запрещаем в system) ===== */
  function escapeHtml(s){
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  function inlineFmt(text){
    let t = escapeHtml(text);
    t = t.replace(/`([^`]+)`/g, (_, c) => `<code>${escapeHtml(c)}</code>`);
    t = t.replace(/\*\*([^\*]+)\*\*/g, "<strong>$1</strong>");
    t = t.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
    return t;
  }
  function isUl(line){ return /^\s*[-•]\s+/.test(line); }
  function isOl(line){ return /^\s*\d+[.)]\s+/.test(line); }

  function renderMarkdownSafe(src){
    let s = String(src || "").replace(/\r\n/g, "\n").replace(/<br\s*\/?>/gi, "\n");
    s = s.replace(/<\/?[^>]+>/g, "");
    if(s.length > 12000) s = s.slice(0, 12000) + "…";

    const lines = s.split("\n");
    let i = 0;
    const out = [];

    while(i < lines.length){
      if(!lines[i].trim()){ i++; continue; }

      if(isUl(lines[i])){
        const items = [];
        while(i < lines.length && isUl(lines[i])){
          items.push(lines[i].replace(/^\s*[-•]\s+/, ""));
          i++;
        }
        out.push(`<ul>${items.map(x => `<li>${inlineFmt(x)}</li>`).join("")}</ul>`);
        continue;
      }

      if(isOl(lines[i])){
        const items = [];
        while(i < lines.length && isOl(lines[i])){
          items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ""));
          i++;
        }
        out.push(`<ol>${items.map(x => `<li>${inlineFmt(x)}</li>`).join("")}</ol>`);
        continue;
      }

      if(lines[i].trim().startsWith("```")){
        i++;
        const buf = [];
        while(i < lines.length && !lines[i].trim().startsWith("```")){
          buf.push(lines[i]); i++;
        }
        if(i < lines.length) i++;
        out.push(`<pre><code>${escapeHtml(buf.join("\n"))}</code></pre>`);
        continue;
      }

      const buf = [];
      while(i < lines.length && lines[i].trim() && !isUl(lines[i]) && !isOl(lines[i]) && !lines[i].trim().startsWith("```")){
        buf.push(lines[i]); i++;
      }
      out.push(`<p>${inlineFmt(buf.join("\n")).replace(/\n/g, "<br>")}</p>`);
    }

    return out.join("\n");
  }
})();

(() => {
  const root = document.getElementById('incomeCalc');
  if (!root) return;

  // --------- Options (можешь менять числа) ----------
  const marginOpts = [
    { label: '+10%', profit: 200, note: 'Базовий старт' },
    { label: '+20%', profit: 400, note: 'Сильніше' },
    { label: '+30%', profit: 600, note: 'Топ' },
    { label: '+40%', profit: 800, note: 'Максимум' },
  ];

  const posOpts = [
    { label: '10',   mult: 1.0 },
    { label: '25',   mult: 1.4 },
    { label: '50',   mult: 2.0 },
    { label: '100',  mult: 2.8 },
    { label: '500+', mult: 4.0 },
  ];

  // Режимы: “Обережно/Реалістично/Максимум”
  const modeBase = {
    safe: 0.85,
    real: 1.00,
    max:  1.25
  };

  const boosterMult = {
    channels: { safe: 1.15, real: 1.35, max: 1.60 },
    speed:    { safe: 1.10, real: 1.20, max: 1.35 },
    refresh:  { safe: 1.08, real: 1.15, max: 1.25 },
    scripts:  { safe: 1.06, real: 1.12, max: 1.20 },
  };

  // --------- State ----------
  const state = {
    mode: 'real',
    orders: 5,
    marginIdx: 1, // +20%
    posIdx: 1,    // 25
    boosters: {
      channels: false,
      speed: false,
      refresh: false,
      scripts: false
    }
  };

  // --------- Elements ----------
  const ordersRange = document.getElementById('ordersRange');
  const ordersVal   = document.getElementById('ordersVal');

  const marginLabel = document.getElementById('marginLabel');
  const marginMeta  = document.getElementById('marginMeta');

  const posLabel = document.getElementById('posLabel');
  const posMeta  = document.getElementById('posMeta');

  const kpiDay   = document.getElementById('kpiDay');
  const kpiWeek  = document.getElementById('kpiWeek');
  const kpiMonth = document.getElementById('kpiMonth');

  const kpiLevel    = document.getElementById('kpiLevel');
  const kpiLevelSub = document.getElementById('kpiLevelSub');

  const nextText = document.getElementById('nextText');
  const planList = document.getElementById('planList');

  const bChannels = document.getElementById('bChannels');
  const bSpeed    = document.getElementById('bSpeed');
  const bRefresh  = document.getElementById('bRefresh');
  const bScripts  = document.getElementById('bScripts');

  const modeBtns = root.querySelectorAll('.modeBtn');

  const canvas = document.getElementById('calcChart');
  const ctx = canvas.getContext('2d');

  // --------- Helpers ----------
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function formatUAH(n){
    const val = Math.round(n);
    return val.toLocaleString('uk-UA') + ' грн';
  }

  function animateText(el, to, fmt = formatUAH){
    const fromRaw = Number(el.dataset.num || 0);
    const toRaw = Number(to);
    el.dataset.num = String(toRaw);

    const dur = 520;
    const t0 = performance.now();

    function step(t){
      const p = clamp((t - t0) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = fromRaw + (toRaw - fromRaw) * eased;
      el.textContent = fmt(cur);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function calcDaily(){
    const m = marginOpts[state.marginIdx];
    const p = posOpts[state.posIdx];

    let mult = modeBase[state.mode] * p.mult;

    for (const key of Object.keys(state.boosters)){
      if (state.boosters[key]) mult *= boosterMult[key][state.mode];
    }

    const daily = state.orders * m.profit * mult;

    return Math.max(0, daily);
  }

  function build30DaysSeries(dailyFinal){
    // Быстрый рост в "Максимум", медленнее в "Обережно"
    const rampDays = (state.mode === 'max') ? 6 : (state.mode === 'safe' ? 14 : 9);
    const start = dailyFinal * (state.mode === 'max' ? 0.65 : (state.mode === 'safe' ? 0.80 : 0.72));

    const arr = [];
    for (let d = 1; d <= 30; d++){
      const factor = 1 - Math.exp(-d / rampDays);
      const val = start + (dailyFinal - start) * factor;
      arr.push(val);
    }
    return arr;
  }

  function sum(arr){ return arr.reduce((a,b)=>a+b,0); }

  function levelByMonth(month){
    if (month >= 100000) return {name:'Business', sub:'ти на бізнес-рівні, масштабуй команду'};
    if (month >= 60000)  return {name:'Pro',      sub:'зміцни процеси та автоматизуй відповіді'};
    if (month >= 30000)  return {name:'Grow',     sub:'додай позиції та канали, тримай регулярність'};
    if (month >= 10000)  return {name:'Stable',   sub:'закріпи стабільність: щоденний темп'};
    return {name:'Start', sub:'обери 10–25 позицій і зроби перші 5–10 оголошень'};
  }

  function bestNextStep(){
    const base = calcDaily();

    const candidates = [];

    // + позиции (если есть куда)
    if (state.posIdx < posOpts.length - 1){
      const old = state.posIdx;
      state.posIdx = old + 1;
      candidates.push({ id:'pos', title:`Підніми активні позиції до ${posOpts[state.posIdx].label}`, delta: calcDaily() - base });
      state.posIdx = old;
    }

    // бустеры
    for (const key of Object.keys(state.boosters)){
      if (!state.boosters[key]){
        state.boosters[key] = true;
        const nameMap = {
          channels: 'Додай 2 канали: дошки + маркетплейси',
          speed: 'Постав відповідь “до 5 хв” (шаблони/скрипти)',
          refresh: 'Оновлюй/публікуй щодня (регулярність)',
          scripts: 'Зроби 3–5 скриптів відповідей',
        };
        candidates.push({ id:key, title: nameMap[key], delta: calcDaily() - base });
        state.boosters[key] = false;
      }
    }

    // + маржа (если есть куда)
    if (state.marginIdx < marginOpts.length - 1){
      const old = state.marginIdx;
      state.marginIdx = old + 1;
      candidates.push({ id:'margin', title:`Підніми маржу до ${marginOpts[state.marginIdx].label}`, delta: calcDaily() - base });
      state.marginIdx = old;
    }

    candidates.sort((a,b)=>b.delta - a.delta);
    const best = candidates[0];

    if (!best || best.delta <= 0){
      return 'Ти вже налаштував сильну модель. Тримай регулярність і масштабуй позиції/канали.';
    }

    const pct = Math.round((best.delta / base) * 100);
    return `${best.title}. Це дасть приблизно <b>+${pct}%</b> до результату в цьому режимі.`;
  }

  function makePlan(){
    const items = [];

    items.push('День 1: обери нішу + 10 товарів під попит <span>(почни з простого)</span>.');
    items.push('День 2: зроби 5–10 оголошень з 2 варіантами заголовків <span>(A/B)</span>.');
    items.push('День 3: налаштуй шаблони відповідей + швидкість “до 5 хв” <span>(менше втрат)</span>.');

    if (!state.boosters.channels) items.push('День 4: додай 2-й канал: маркетплейс або ще 1 дошку <span>(масштаб)</span>.');
    else items.push('День 4: посили 2 канали — стабільні оновлення + якісні фото <span>(довіра)</span>.');

    if (!state.boosters.refresh) items.push('День 5: оновлюй оголошення щодня + додай ще 10 позицій <span>(більше показів)</span>.');
    else items.push('День 5: додай 10–25 позицій і тримай щоденний темп <span>(стабільність)</span>.');

    items.push('День 6: відфільтруй топ-товари: залиш 20% найкращих <span>(ефект Парето)</span>.');
    items.push('День 7: повтори цикл: ще +10 оголошень або +10 позицій <span>(план = результат)</span>.');

    planList.innerHTML = items.map(t => `<li>${t}</li>`).join('');
  }

  function updateLadder(monthValue){
    const items = root.querySelectorAll('.ladderItem');
    items.forEach(it => {
      const goal = Number(it.getAttribute('data-goal') || 0);
      const p = clamp((monthValue / goal) * 100, 0, 100);
      const fill = it.querySelector('.ladderFill');
      if (fill) fill.style.width = p + '%';
    });
  }

  // --------- Chart ----------
  function resizeCanvas(){
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width  = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function drawChart(series){
    resizeCanvas();
    const w = canvas.getBoundingClientRect().width;
    const h = canvas.getBoundingClientRect().height;

    ctx.clearRect(0,0,w,h);

    const pad = 14;
    const maxV = Math.max(...series) * 1.08;
    const minV = Math.min(...series) * 0.92;

    // grid
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    for (let i=0;i<=4;i++){
      const y = pad + (h - pad*2) * (i/4);
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w-pad, y); ctx.stroke();
    }

    const xStep = (w - pad*2) / (series.length - 1);

    // line
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,122,26,.92)';
    ctx.beginPath();
    series.forEach((v, i) => {
      const x = pad + i * xStep;
      const t = (v - minV) / (maxV - minV || 1);
      const y = (h - pad) - t * (h - pad*2);
      if (i === 0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    });
    ctx.stroke();

    // last point
    const last = series[series.length - 1];
    const t = (last - minV) / (maxV - minV || 1);
    const x = pad + (series.length - 1) * xStep;
    const y = (h - pad) - t * (h - pad*2);
    ctx.fillStyle = 'rgba(255,178,74,.95)';
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI*2); ctx.fill();
  }

  // --------- UI update ----------
  function syncDials(){
    const m = marginOpts[state.marginIdx];
    marginLabel.textContent = m.label;
    marginMeta.textContent  = `≈ ${m.profit} грн/замовлення`;

    const p = posOpts[state.posIdx];
    posLabel.textContent = p.label;
    posMeta.textContent  = `множник продажів ×${p.mult}`;

    ordersVal.textContent = String(state.orders);
  }

  function syncBoosters(){
    bChannels.checked = !!state.boosters.channels;
    bSpeed.checked    = !!state.boosters.speed;
    bRefresh.checked  = !!state.boosters.refresh;
    bScripts.checked  = !!state.boosters.scripts;
  }

  function updateAll(){
    syncDials();
    syncBoosters();

    const daily = calcDaily();
    const series30 = build30DaysSeries(daily);
    const month = sum(series30);
    const week  = sum(series30.slice(0,7));

    animateText(kpiDay, daily);
    animateText(kpiWeek, week);
    animateText(kpiMonth, month);

    const lvl = levelByMonth(month);
    kpiLevel.textContent = lvl.name;
    kpiLevelSub.textContent = lvl.sub;

    updateLadder(month);

    nextText.innerHTML = bestNextStep();
    makePlan();
    drawChart(series30);

    // icons if lucide exists
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  // --------- Events ----------
  ordersRange.addEventListener('input', () => {
    state.orders = Number(ordersRange.value);
    updateAll();
  });

  root.querySelectorAll('.dialBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const dial = btn.dataset.dial;
      const dir = Number(btn.dataset.dir || 0);

      if (dial === 'margin'){
        state.marginIdx = clamp(state.marginIdx + dir, 0, marginOpts.length - 1);
      } else if (dial === 'pos'){
        state.posIdx = clamp(state.posIdx + dir, 0, posOpts.length - 1);
      }
      updateAll();
    });
  });

  // wheel scroll on dial cards
  document.getElementById('marginDial').addEventListener('wheel', (e) => {
    e.preventDefault();
    state.marginIdx = clamp(state.marginIdx + (e.deltaY > 0 ? 1 : -1), 0, marginOpts.length - 1);
    updateAll();
  }, { passive:false });

  document.getElementById('posDial').addEventListener('wheel', (e) => {
    e.preventDefault();
    state.posIdx = clamp(state.posIdx + (e.deltaY > 0 ? 1 : -1), 0, posOpts.length - 1);
    updateAll();
  }, { passive:false });

  bChannels.addEventListener('change', () => { state.boosters.channels = bChannels.checked; updateAll(); });
  bSpeed.addEventListener('change',    () => { state.boosters.speed    = bSpeed.checked;    updateAll(); });
  bRefresh.addEventListener('change',  () => { state.boosters.refresh  = bRefresh.checked;  updateAll(); });
  bScripts.addEventListener('change',  () => { state.boosters.scripts  = bScripts.checked;  updateAll(); });

  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modeBtns.forEach(b => b.classList.remove('isActive'));
      btn.classList.add('isActive');
      state.mode = btn.dataset.mode || 'real';
      updateAll();
    });
  });

  window.addEventListener('resize', () => {
    // легкое обновление графика без пересчёта KPI анимации
    const daily = calcDaily();
    const series30 = build30DaysSeries(daily);
    drawChart(series30);
  });

  // init
  ordersRange.value = String(state.orders);
  updateAll();
})();



document.addEventListener('DOMContentLoaded', () => {
  // ---------- open/close ----------
  const openBtns = document.querySelectorAll('#btnSales, [data-open-sales="sales"]');
  const overlay = document.getElementById('salesOverlay');
  const modal   = document.getElementById('salesModal');
  const btnClose = document.getElementById('btnSalesClose');

  // если на странице нет модалки — просто выходим
  if (!openBtns.length || !overlay || !modal || !btnClose) return;

  const open = () => {
    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
    render();
    if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
  };

  const close = () => {
    overlay.classList.add('hidden');
    modal.classList.add('hidden');
    clearEditMode();
  };

  openBtns.forEach(b => b.addEventListener('click', open));
  btnClose.addEventListener('click', close);
  overlay.addEventListener('click', close);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) close();
  });

  // ---------- storage keys ----------
  const LS_DEALS   = 'ss_sales_deals_v2';
  const LS_DAILY   = 'ss_sales_daily_v2';
  const LS_MONTHLY = 'ss_sales_monthly_v2';

  // ---------- elements ----------
  const monthInput = document.getElementById('salesMonth');
  const searchInput = document.getElementById('salesSearch');
  const statusFilter = document.getElementById('salesStatusFilter');

  const form   = document.getElementById('salesForm');
  const tbody  = document.getElementById('salesTbody');
  const dailyTbody = document.getElementById('dailyTbody');
  const monthlyTbody = document.getElementById('monthlyTbody');

  const cards = document.getElementById('salesCards');
  const dailyCards = document.getElementById('dailyCards');
  const monthlyCards = document.getElementById('monthlyCards');

  const stOrders = document.getElementById('stOrders');
  const stRev    = document.getElementById('stRev');
  const stCost   = document.getElementById('stCost');
  const stProfit = document.getElementById('stProfit');

  const btnExportDeals = document.getElementById('salesExportDeals');
  const btnExportDaily = document.getElementById('salesExportDaily');
  const btnExportMonthly = document.getElementById('salesExportMonthly');
  const btnClearMonth = document.getElementById('salesClearMonth');

  const btnSave = document.getElementById('salesSaveBtn');
  const btnCancel = document.getElementById('salesCancelEdit');

  const fDate    = document.getElementById('fDate');
  const fChannel = document.getElementById('fChannel');
  const fItem    = document.getElementById('fItem');
  const fClient  = document.getElementById('fClient');
  const fQty     = document.getElementById('fQty');
  const fRevenue = document.getElementById('fRevenue');
  const fCost    = document.getElementById('fCost');
  const fAds     = document.getElementById('fAds');
  const fStatus  = document.getElementById('fStatus');

  // ---------- helpers ----------
  const isMobile = () => window.matchMedia('(max-width:680px)').matches;

  const todayISO = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  };

  const toMonth  = (isoDate) => (isoDate || '').slice(0,7);

  const currentMonthDefault = () => {
    const d = new Date();
    const m = String(d.getMonth()+1).padStart(2,'0');
    return `${d.getFullYear()}-${m}`;
  };

  const fmtUAH = (n) => {
    const v = Math.round(Number(n) || 0);
    return v.toLocaleString('uk-UA') + ' грн';
  };

  const num = (v) => Number(v || 0) || 0;

  const safe = (s) =>
    String(s ?? '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');

  const calcProfit = (r) => num(r.revenue) - num(r.cost) - num(r.ads);
  const calcSpend  = (r) => num(r.cost) + num(r.ads);

  const debounce = (fn, ms=120) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  // ---------- state ----------
  let deals = [];
  let editId = null;

  // ---------- load/save ----------
  const load = () => {
    try{
      deals = JSON.parse(localStorage.getItem(LS_DEALS) || '[]');
      if (!Array.isArray(deals)) deals = [];
    } catch { deals = []; }

    // normalize/migrate
    deals = deals.map(d => ({
      id: d.id ?? Date.now(),
      date: d.date || todayISO(),
      channel: d.channel || 'Інше',
      item: d.item || '',
      client: d.client || '',
      qty: Math.max(1, num(d.qty || 1)),
      revenue: Math.max(0, num(d.revenue)),
      cost: Math.max(0, num(d.cost)),
      ads: Math.max(0, num(d.ads)),
      status: d.status || 'У роботі'
    }));
  };

  const save = () => localStorage.setItem(LS_DEALS, JSON.stringify(deals));

  const getFilterMonth = () => monthInput.value || currentMonthDefault();

  const matchSearch = (d, q) => {
    if (!q) return true;
    const hay = [
      d.date, d.channel, d.item, d.client, d.status,
      String(d.qty), String(d.revenue), String(d.cost), String(d.ads)
    ].join(' ').toLowerCase();
    return hay.includes(q.toLowerCase());
  };

  const getFilteredDeals = () => {
    const m = getFilterMonth();
    const q = (searchInput.value || '').trim();
    const st = statusFilter.value;

    return deals
      .filter(d => toMonth(d.date) === m)
      .filter(d => st === 'all' ? true : d.status === st)
      .filter(d => matchSearch(d, q));
  };

  // ---------- summaries ----------
  const buildDailySummary = (list) => {
    const map = new Map();
    for (const d of list){
      const key = d.date;
      if (!map.has(key)){
        map.set(key, { date: key, orders: 0, revenue: 0, spend: 0, profit: 0 });
      }
      const x = map.get(key);
      x.orders += num(d.qty);
      x.revenue += num(d.revenue);
      x.spend += calcSpend(d);
      x.profit += calcProfit(d);
    }
    return Array.from(map.values()).sort((a,b) => (b.date||'').localeCompare(a.date||''));
  };

  const buildMonthlySummaryAll = () => {
    const map = new Map();
    for (const d of deals){
      const m = toMonth(d.date);
      if (!m) continue;
      if (!map.has(m)){
        map.set(m, { month: m, orders: 0, revenue: 0, spend: 0, profit: 0 });
      }
      const x = map.get(m);
      x.orders += num(d.qty);
      x.revenue += num(d.revenue);
      x.spend += calcSpend(d);
      x.profit += calcProfit(d);
    }
    return Array.from(map.values()).sort((a,b) => (b.month||'').localeCompare(a.month||''));
  };

  // ---------- render (stats) ----------
  const renderStats = (list) => {
    const orders = list.reduce((a,d)=> a + num(d.qty), 0);
    const rev = list.reduce((a,d)=> a + num(d.revenue), 0);
    const spend = list.reduce((a,d)=> a + calcSpend(d), 0);
    const prof = list.reduce((a,d)=> a + calcProfit(d), 0);

    stOrders.textContent = String(orders);
    stRev.textContent = fmtUAH(rev);
    stCost.textContent = fmtUAH(spend);
    stProfit.textContent = fmtUAH(prof);
  };

  // ---------- render tables ----------
  const renderDealsTable = (list) => {
    if (!tbody) return;

    if (!list.length){
      tbody.innerHTML = `<tr><td colspan="11" class="muted" style="padding:14px;">Немає записів за умовами фільтра.</td></tr>`;
      return;
    }

    tbody.innerHTML = list
      .sort((a,b) => (b.date||'').localeCompare(a.date||''))
      .map(d => {
        const p = calcProfit(d);
        const pClass = p >= 0 ? 'salesProfitPos' : 'salesProfitNeg';
        const rowClass = (editId && String(editId) === String(d.id)) ? 'salesRowEditing' : '';
        return `
          <tr data-id="${d.id}" class="${rowClass}">
            <td>${safe(d.date)}</td>
            <td>${safe(d.channel)}</td>
            <td style="max-width:320px;">
              <b style="display:block;line-height:1.25;">${safe(d.item) || '—'}</b>
            </td>
            <td style="max-width:320px;">
              <span class="muted" style="display:block;line-height:1.25;">${safe(d.client) || '—'}</span>
            </td>
            <td>${num(d.qty)}</td>
            <td>${fmtUAH(d.revenue)}</td>
            <td>${fmtUAH(d.cost)}</td>
            <td>${fmtUAH(d.ads)}</td>
            <td class="${pClass}">${fmtUAH(p)}</td>
            <td>${safe(d.status)}</td>
            <td>
              <button class="salesDel" type="button" data-del="${d.id}" title="Видалити">×</button>
            </td>
          </tr>
        `;
      }).join('');
  };

  const renderDailyTable = (daily) => {
    if (!dailyTbody) return;

    if (!daily.length){
      dailyTbody.innerHTML = `<tr><td colspan="5" class="muted" style="padding:14px;">Немає даних для підсумку за день.</td></tr>`;
      return;
    }
    dailyTbody.innerHTML = daily.map(x => `
      <tr>
        <td>${safe(x.date)}</td>
        <td><b>${x.orders}</b></td>
        <td>${fmtUAH(x.revenue)}</td>
        <td>${fmtUAH(x.spend)}</td>
        <td class="${x.profit >= 0 ? 'salesProfitPos' : 'salesProfitNeg'}">${fmtUAH(x.profit)}</td>
      </tr>
    `).join('');
  };

  const renderMonthlyTable = (months) => {
    if (!monthlyTbody) return;

    if (!months.length){
      monthlyTbody.innerHTML = `<tr><td colspan="5" class="muted" style="padding:14px;">Немає даних для підсумку за місяць.</td></tr>`;
      return;
    }
    const slice = months.slice(0, 12);
    monthlyTbody.innerHTML = slice.map(x => `
      <tr>
        <td><b>${safe(x.month)}</b></td>
        <td>${x.orders}</td>
        <td>${fmtUAH(x.revenue)}</td>
        <td>${fmtUAH(x.spend)}</td>
        <td class="${x.profit >= 0 ? 'salesProfitPos' : 'salesProfitNeg'}">${fmtUAH(x.profit)}</td>
      </tr>
    `).join('');
  };

  // ---------- render mobile cards ----------
  const renderDealsCards = (list) => {
    if (!cards) return;

    if (!list.length){
      cards.innerHTML = `<div class="muted" style="padding:10px;">Немає записів за умовами фільтра.</div>`;
      return;
    }

    cards.innerHTML = list
      .sort((a,b) => (b.date||'').localeCompare(a.date||''))
      .map(d => {
        const profit = calcProfit(d);
        const pClass = profit >= 0 ? 'salesProfitPos' : 'salesProfitNeg';

        return `
          <div class="dealCard">
            <div class="dealTop">
              <div class="dealDate">${safe(d.date)}</div>
              <div class="dealStatus">${safe(d.status)}</div>
              <div class="dealProfit ${pClass}">${fmtUAH(profit)}</div>
            </div>

            <div class="dealMain">
              <b>${safe(d.item) || '—'}</b>
              <span class="muted">${safe(d.client) || '—'}</span>
            </div>

            <div class="dealMeta">
              <span class="metaPill">Канал: <b>${safe(d.channel)}</b></span>
              <span class="metaPill">К-сть: <b>${num(d.qty)}</b></span>
              <span class="metaPill">Виручка: <b>${fmtUAH(d.revenue)}</b></span>
              <span class="metaPill">Витрати: <b>${fmtUAH(calcSpend(d))}</b></span>
            </div>

            <div class="dealBtns">
              <button class="dealBtn" type="button" data-edit="${d.id}">
                <i data-lucide="pencil"></i> Редагувати
              </button>
              <button class="dealBtn danger" type="button" data-del="${d.id}">
                <i data-lucide="trash-2"></i> Видалити
              </button>
            </div>
          </div>
        `;
      }).join('');
  };

  const renderDailyCards = (daily) => {
    if (!dailyCards) return;

    if (!daily.length){
      dailyCards.innerHTML = `<div class="muted" style="padding:10px;">Немає даних для підсумку за день.</div>`;
      return;
    }

    dailyCards.innerHTML = daily.map(x => `
      <div class="dealCard">
        <div class="dealTop">
          <div class="dealDate">${safe(x.date)}</div>
          <div class="dealStatus">День</div>
          <div class="dealProfit ${x.profit >= 0 ? 'salesProfitPos' : 'salesProfitNeg'}">${fmtUAH(x.profit)}</div>
        </div>
        <div class="dealMeta" style="margin-top:10px;">
          <span class="metaPill">Замовлення: <b>${x.orders}</b></span>
          <span class="metaPill">Виручка: <b>${fmtUAH(x.revenue)}</b></span>
          <span class="metaPill">Витрати: <b>${fmtUAH(x.spend)}</b></span>
        </div>
      </div>
    `).join('');
  };

  const renderMonthlyCards = (months) => {
    if (!monthlyCards) return;

    if (!months.length){
      monthlyCards.innerHTML = `<div class="muted" style="padding:10px;">Немає даних для підсумку за місяць.</div>`;
      return;
    }

    const slice = months.slice(0, 12);
    monthlyCards.innerHTML = slice.map(x => `
      <div class="dealCard">
        <div class="dealTop">
          <div class="dealDate">${safe(x.month)}</div>
          <div class="dealStatus">Місяць</div>
          <div class="dealProfit ${x.profit >= 0 ? 'salesProfitPos' : 'salesProfitNeg'}">${fmtUAH(x.profit)}</div>
        </div>
        <div class="dealMeta" style="margin-top:10px;">
          <span class="metaPill">Замовлення: <b>${x.orders}</b></span>
          <span class="metaPill">Виручка: <b>${fmtUAH(x.revenue)}</b></span>
          <span class="metaPill">Витрати: <b>${fmtUAH(x.spend)}</b></span>
        </div>
      </div>
    `).join('');
  };

  // ---------- edit mode ----------
  function setEditMode(id){
    const d = deals.find(x => String(x.id) === String(id));
    if (!d) return;

    editId = d.id;

    fDate.value = d.date || todayISO();
    fChannel.value = d.channel || 'Інше';
    fItem.value = d.item || '';
    fClient.value = d.client || '';
    fQty.value = Math.max(1, num(d.qty || 1));
    fRevenue.value = num(d.revenue);
    fCost.value = num(d.cost);
    fAds.value = num(d.ads);
    fStatus.value = d.status || 'У роботі';

    btnSave.innerHTML = `<i data-lucide="save"></i> Зберегти`;
    btnCancel.classList.remove('hidden');

    render();
  }

  function clearEditMode(){
    editId = null;
    btnSave.innerHTML = `<i data-lucide="save"></i> Додати`;
    btnCancel.classList.add('hidden');

    // оставим дату + канал (так быстрее заносить повторные сделки)
    fItem.value = '';
    fClient.value = '';
    fQty.value = 1;
    fRevenue.value = '';
    fCost.value = '';
    fAds.value = '';
  }

  btnCancel.addEventListener('click', clearEditMode);

  // row click / delete (desktop table)
  tbody.addEventListener('click', (e) => {
    const delBtn = e.target.closest('[data-del]');
    if (delBtn){
      e.stopPropagation();
      const id = delBtn.getAttribute('data-del');
      deals = deals.filter(d => String(d.id) !== String(id));
      save();
      render();
      return;
    }

    const row = e.target.closest('tr[data-id]');
    if (!row) return;
    setEditMode(row.getAttribute('data-id'));
  });

  // edit/delete (mobile cards)
  if (cards){
    cards.addEventListener('click', (e) => {
      const delBtn = e.target.closest('[data-del]');
      if (delBtn){
        const id = delBtn.getAttribute('data-del');
        deals = deals.filter(d => String(d.id) !== String(id));
        save();
        render();
        return;
      }
      const editBtn = e.target.closest('[data-edit]');
      if (editBtn){
        setEditMode(editBtn.getAttribute('data-edit'));
      }
    });
  }

  // add/update
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const date = fDate.value || todayISO();
    const qty = Math.max(1, num(fQty.value || 1));
    const revenue = Math.max(0, num(fRevenue.value));
    const cost = Math.max(0, num(fCost.value));
    const ads = Math.max(0, num(fAds.value));

    const item = (fItem.value || '').trim();
    const client = (fClient.value || '').trim();

    const payload = {
      date,
      channel: fChannel.value || 'Інше',
      item,
      client,
      qty,
      revenue,
      cost,
      ads,
      status: fStatus.value || 'У роботі'
    };

    if (editId){
      deals = deals.map(d => String(d.id) === String(editId) ? ({...d, ...payload}) : d);
      save();
      clearEditMode();
      monthInput.value = toMonth(date);
      render();
      return;
    }

    deals.push({ id: Date.now(), ...payload });
    save();

    // быстрое добавление
    fDate.value = date;
    fItem.value = '';
    fClient.value = '';
    fQty.value = 1;
    fRevenue.value = '';
    fCost.value = '';
    fAds.value = '';

    monthInput.value = toMonth(date);
    render();
  });

  // ---------- render main ----------
  const render = () => {
    const list = getFilteredDeals();
    renderStats(list);

    const daily = buildDailySummary(list);
    const monthly = buildMonthlySummaryAll();

    if (isMobile()){
      renderDealsCards(list);
      renderDailyCards(daily);
      renderMonthlyCards(monthly);
    } else {
      renderDealsTable(list);
      renderDailyTable(daily);
      renderMonthlyTable(monthly);

      if (cards) cards.innerHTML = '';
      if (dailyCards) dailyCards.innerHTML = '';
      if (monthlyCards) monthlyCards.innerHTML = '';
    }

    localStorage.setItem(LS_DAILY, JSON.stringify(daily));
    localStorage.setItem(LS_MONTHLY, JSON.stringify(monthly));

    if (window.lucide && typeof window.lucide.createIcons === 'function'){
      window.lucide.createIcons();
    }
  };

  // filters
  monthInput.addEventListener('change', render);
  statusFilter.addEventListener('change', render);
  searchInput.addEventListener('input', debounce(render, 120));

  // export helpers
  const downloadCSV = (filename, header, rowsArr) => {
    const lines = [header.join(',')];
    const esc = (s) => `"${String(s ?? '').replace(/"/g,'""')}"`;
    rowsArr.forEach(r => lines.push(r.map(esc).join(',')));

    const csv = lines.join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  btnExportDeals.addEventListener('click', () => {
    const list = getFilteredDeals().sort((a,b)=> (a.date||'').localeCompare(b.date||''));
    const header = ['date','channel','item','client','qty','revenue','cost','ads','profit','status'];
    const rowsArr = list.map(d => [
      d.date, d.channel, d.item, d.client,
      String(d.qty), String(d.revenue), String(d.cost), String(d.ads),
      String(calcProfit(d)), d.status
    ]);
    downloadCSV(`deals_${getFilterMonth()}.csv`, header, rowsArr);
  });

  btnExportDaily.addEventListener('click', () => {
    const list = getFilteredDeals();
    const daily = buildDailySummary(list).sort((a,b)=> (a.date||'').localeCompare(b.date||''));
    const header = ['date','orders','revenue','spend','profit'];
    const rowsArr = daily.map(x => [
      x.date, String(x.orders), String(x.revenue), String(x.spend), String(x.profit)
    ]);
    downloadCSV(`daily_${getFilterMonth()}.csv`, header, rowsArr);
  });

  btnExportMonthly.addEventListener('click', () => {
    const months = buildMonthlySummaryAll().sort((a,b)=> (a.month||'').localeCompare(b.month||''));
    const header = ['month','orders','revenue','spend','profit'];
    const rowsArr = months.map(x => [
      x.month, String(x.orders), String(x.revenue), String(x.spend), String(x.profit)
    ]);
    downloadCSV(`monthly_all.csv`, header, rowsArr);
  });

  btnClearMonth.addEventListener('click', () => {
    const m = getFilterMonth();
    const ok = confirm(`Очистити всі угоди за ${m}?`);
    if (!ok) return;

    deals = deals.filter(d => toMonth(d.date) !== m);
    save();
    clearEditMode();
    render();
  });

  // init
  load();
  monthInput.value = currentMonthDefault();
  fDate.value = todayISO();
  render();
});

  const toggle = document.getElementById('toolsToggle');
  const panel = document.getElementById('toolsPanel');
  const overlay = document.getElementById('toolsOverlay');

  function openMenu() {
    panel.classList.add('active');
    toggle.classList.add('active');
    overlay.classList.add('active');
  }

  function closeMenu() {
    panel.classList.remove('active');
    toggle.classList.remove('active');
    overlay.classList.remove('active');
  }

  toggle.onclick = () => {
    panel.classList.contains('active') ? closeMenu() : openMenu();
  };

  overlay.onclick = closeMenu;
