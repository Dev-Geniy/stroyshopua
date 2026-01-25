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
      "Зараз ви у партнерському кабінеті — тут зібрано все необхідне для старту: добірки товарів, інструкції, підказки та готові рішення.\n" +
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
