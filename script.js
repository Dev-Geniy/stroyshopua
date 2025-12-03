/* ============================================================
   🟧 1. ГЛОБАЛЬНЫЕ НАСТРОЙКИ
============================================================ */
const TELEGRAM_USERNAME = 'manager_stroyshop_ua';
const XML_FEED_URL = 'products.xml';

/* ============================================================
   🟧 2. КАТЕГОРИИ ПО КЛЮЧЕВЫМ СЛОВАМ (по заголовкам товаров)
   name — то, что пишется на кнопке
   keywords — слова, которые ищем в title
============================================================ */
const CATEGORY_KEYWORDS = [
  { name: '3D панелі', keywords: ['3D панель', 'Панель стеновая 3D'] },
  { name: 'ПВХ панелі', keywords: ['ПВХ панель', 'ПВХ плита'] },
  { name: 'Стенові панелі', keywords: ['Панель стеновая', 'Панель-рейка в рулоне', 'Панель-рейка', 'Панель рейка'] },
  { name: 'Плитка', keywords: ['Виниловая плитка', 'ПВХ плитка', 'Полиуретановая плитка', 'Алюминиевая плитка', 'LVT плитка', 'Плитка под ковролин'] },
  { name: 'PET плитка', keywords: ['PET мозаика', 'Стеновая PET плитка'] },
  { name: 'Профілі та декор', keywords: ['Профиль', 'Рейка декоративная', 'Молдинг'] },
  { name: 'Плінтуси', keywords: ['Плинтус РР', 'Плинтус виниловый', 'Плинтус', 'Плінтус'] },
  { name: 'Самоклеюча плівка', keywords: ['Самоклеющаяся пленка', 'Пленка на самоклейке', 'Пленка оконная'] },
  { name: 'Теплі та самоклейні шпалери', keywords: ['Тёплые обои', 'Самоклеющиеся обои'] },
  { name: 'Мозаїка', keywords: ['Мозаика из декоративного стекла'] },
  { name: 'Вінілові покриття', keywords: ['Покрытие виниловое', 'Напольное виниловое покрытие'] },
  { name: 'Підлога-пазл', keywords: ['Пол пазл', 'Пол-пазл', 'Пол-пазл плюшевый'] },
  { name: 'Килимки', keywords: ['Коврик детский', 'Детский термоковрик', 'Коврик', 'Влагопоглощающий коврик'] },
  { name: 'Дзеркала', keywords: ['Зеркало', 'Зеркало акриловое', 'Зеркальный декор'] },
  { name: 'Екошкіра', keywords: ['Самоклеющая экокожа'] },
  { name: 'Манікюр', keywords: ['Маникюрный набор'] },
  { name: 'Меблі й зберігання', keywords: [
      'Контейнер для хранения','Пластиковая тумба','Садовый стол','Складной стул',
      'Стеллаж','Этажерка','Полка-органайзер','Шкаф',
      'Надувное кресло','Надувной диван',
      'Набор мебели','Комплект надувной мебели'
    ] }
];

/* ============================================================
   🟧 3. ВСПОМОГАТЕЛЬНОЕ: категория по title
============================================================ */
function getCategoryFromTitle(title) {
  const lower = title.toLowerCase();
  for (const group of CATEGORY_KEYWORDS) {
    for (const key of group.keywords) {
      if (lower.includes(key.toLowerCase())) {
        return group.name;
      }
    }
  }
  return 'Інше';
}

/* ============================================================
   🟧 4. ДЕФОЛТНЫЕ ТОВАРЫ (если XML не загрузится)
============================================================ */
const DEFAULT_PRODUCTS = [
  {
    id:1,
    title:'Ковролін SoftLux 4м — кремовий',
    category: getCategoryFromTitle('Ковролін SoftLux 4м — кремовий'),
    price:279,
    sku:14417,
    img:'https://via.placeholder.com/600x400?text=Carpet',
    unit:'м',
    short:'М’який і зносостійкий ковролін для житлових кімнат.',
    full:'Ковролін SoftLux — щільний, приємний на дотик матеріал. Оптимальний для спальні та вітальні.'
  },
  {
    id:2,
    title:'Плівка біла матова 0.45м',
    category: getCategoryFromTitle('Плівка біла матова 0.45м'),
    price:59,
    sku:14418,
    img:'https://via.placeholder.com/600x400?text=Film',
    unit:'м',
    short:'Самоклейна плівка для меблів і декору.',
    full:'Матовий білий відтінок, підходить для фасадів меблів, дверей, підвіконь. Легко клеїться без бульбашок.'
  },
  {
    id:3,
    title:'Шпалери Modern Stone',
    category: getCategoryFromTitle('Шпалери Modern Stone'),
    price:129,
    sku:14419,
    img:'https://via.placeholder.com/600x400?text=Wallpaper',
    unit:'м',
    short:'Шпалери з ефектом натурального каменю.',
    full:'Текстурована поверхня під камінь. Підходить для акцентних стін у вітальні, коридорі, кухні.'
  },
  {
    id:4,
    title:'Плитка самоклейка 20×20',
    category: getCategoryFromTitle('Плитка самоклейка 20×20'),
    price:250,
    sku:14420,
    img:'https://via.placeholder.com/600x400?text=Tile',
    unit:'шт',
    short:'Самоклейні плитки для швидкого оновлення кухні чи ванної.',
    full:'Водостійка поверхня, підходить для фартухів на кухні та зон навколо умивальника.'
  }
];

let PRODUCTS = [...DEFAULT_PRODUCTS];

/* ============================================================
   🟧 5. КОРЗИНА
============================================================ */
let cart = JSON.parse(localStorage.getItem('stroy_shop_cart_v1') || '[]');

function saveCart(){
  localStorage.setItem('stroy_shop_cart_v1', JSON.stringify(cart));
}

function money(n){ return n + ' грн'; }

function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2000);
}

function openTelegram(msg){
  const url = `https://t.me/${TELEGRAM_USERNAME}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

/* ============================================================
   🟧 6. ЗАГРУЗКА ТОВАРОВ ИЗ ЛОКАЛЬНОГО XML
============================================================ */
async function loadProductsFromXML(){
  try{
    const res = await fetch(XML_FEED_URL, { cache: 'no-store' });
    if(!res.ok) throw new Error('Bad status: ' + res.status);

    const text = await res.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'application/xml');

    const items = Array.from(xml.getElementsByTagName('item'));
    if(!items.length){
      console.warn('XML: не знайдено тегів <item>. Використовую дефолтні товари.');
      PRODUCTS = [...DEFAULT_PRODUCTS];
      return;
    }

    const get = (node, tagName) => {
      const el = node.getElementsByTagName(tagName)[0];
      return el ? (el.textContent || '').trim() : '';
    };

    const placeholderImg = 'https://via.placeholder.com/600x400?text=Товар';

    PRODUCTS = items
      .map((node, index) => {
        const rawId =
          get(node, 'g:id') ||
          get(node, 'id') ||
          String(index + 1);

        const numericId = Number((rawId || '').replace(/\D/g,'')) || (index + 1);

        const title =
          get(node, 'title') ||
          get(node, 'g:title') ||
          `Товар ${numericId}`;

        const description =
          get(node, 'description') ||
          get(node, 'g:description') ||
          '';

        const priceText = get(node, 'g:price') || '0';
        const price = parseFloat(
          priceText
            .replace(',', '.')
            .replace(/[^\d.]/g, '')
        ) || 0;

        const img =
          get(node, 'g:image_link') ||
          get(node, 'g:additional_image_link') ||
          placeholderImg;

        const availability = (get(node, 'g:availability') || '').toLowerCase();

        // пропускаємо, якщо немає в наявності
        if(availability && availability !== 'in stock'){
          return null;
        }

        return {
          id: numericId,
          title,
          category: getCategoryFromTitle(title), // категория из title по ключевым словам
          price,
          sku: rawId,
          img,
          unit:'шт',
          short: description ? description.slice(0,120) : 'Товар з XML-прайсу',
          full: description || 'Детальний опис товару з XML-прайсу.'
        };
      })
      .filter(Boolean);

    if(!PRODUCTS.length){
      console.warn('XML завантажено, але товари не сформувалися. Використовую дефолтні.');
      PRODUCTS = [...DEFAULT_PRODUCTS];
    }
  }catch(err){
    console.error('Помилка завантаження XML:', err);
    PRODUCTS = [...DEFAULT_PRODUCTS];
    showToast('Не вдалося прочитати products.xml, показуємо тестові товари.');
  }
}

/* ============================================================
   🟧 7. РЕНДЕР КАТЕГОРИЙ (кнопки)
      "Усі" + все из CATEGORY_KEYWORDS
============================================================ */
const categoriesEl = document.getElementById('categories');

function renderCategories(){
  categoriesEl.innerHTML = '';

  // Кнопка "Усі"
  const btnAll = document.createElement('button');
  btnAll.className = 'category-chip active';
  btnAll.textContent = 'Усі';
  btnAll.dataset.cat = 'Усі';
  btnAll.addEventListener('click', () => {
    document.querySelectorAll('.category-chip').forEach(b => b.classList.remove('active'));
    btnAll.classList.add('active');
    filterProducts();
  });
  categoriesEl.appendChild(btnAll);

  // Остальные категории из CATEGORY_KEYWORDS
  CATEGORY_KEYWORDS.forEach(group => {
    const btn = document.createElement('button');
    btn.className = 'category-chip';
    btn.textContent = group.name;
    btn.dataset.cat = group.name;

    btn.addEventListener('click', () => {
      document.querySelectorAll('.category-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterProducts();
    });

    categoriesEl.appendChild(btn);
  });
}

/* ============================================================
   🟧 8. РЕНДЕР ТОВАРОВ
============================================================ */
const productsGrid = document.getElementById('productsGrid');

function renderProducts(list){
  productsGrid.innerHTML = '';
  list.forEach(p=>{
    const card = document.createElement('article');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="product-image-wrapper">
        <img src="${p.img}" alt="${p.title}">
        <button class="product-quick-btn js-quick-view" data-id="${p.id}">Швидкий перегляд</button>
      </div>
      <div class="product-tag">${p.category || ''}</div>
      <div class="product-title">${p.title}</div>
      <div class="product-meta">
        <span>Артикул: ${p.sku}</span>
        <span>${p.unit}</span>
      </div>
      <div class="product-bottom">
        <div class="product-price">${money(p.price)}</div>
        <div class="qty-control">
          <input type="number" class="qty-input js-qty-input" data-id="${p.id}" min="1" value="1">
          <div class="qty-arrows">
            <button class="qty-arrow js-qty-up" data-id="${p.id}"><i data-lucide="chevron-up"></i></button>
            <button class="qty-arrow js-qty-down" data-id="${p.id}"><i data-lucide="chevron-down"></i></button>
          </div>
        </div>
        <button class="btn btn-primary product-add-btn js-add-to-cart" data-id="${p.id}">
          <i data-lucide="shopping-cart"></i> У кошик
        </button>
      </div>
    `;
    productsGrid.appendChild(card);
  });

  if (window.lucide) {
    lucide.createIcons();
  }
}

/* ============================================================
   🟧 9. ФИЛЬТР ТОВАРОВ
   ВАЖНО: категория фильтрует по словам из title, а не по полю category
============================================================ */
function filterProducts(){
  let list = [...PRODUCTS];

  // ---- Категория ----
  const activeBtn = document.querySelector('.category-chip.active');
  const activeCat = activeBtn ? activeBtn.dataset.cat : 'Усі';

  if (activeCat && activeCat !== 'Усі') {
    const group = CATEGORY_KEYWORDS.find(g => g.name === activeCat);
    if (group) {
      const keysLower = group.keywords.map(k => k.toLowerCase());
      list = list.filter(p => {
        const t = p.title.toLowerCase();
        return keysLower.some(k => t.includes(k));
      });
    }
  }

  // ---- Поиск ----
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  if(q){
    list = list.filter(p=>p.title.toLowerCase().includes(q));
  }

  // ---- Цена ----
  const min = parseFloat(document.getElementById('minPrice').value || '0');
  const max = parseFloat(document.getElementById('maxPrice').value || '0');
  if(min>0) list = list.filter(p=>p.price >= min);
  if(max>0) list = list.filter(p=>p.price <= max);

  // ---- Сортировка ----
  const sort = document.getElementById('sortSelect').value;
  if(sort === 'price-asc') list.sort((a,b)=>a.price-b.price);
  if(sort === 'price-desc') list.sort((a,b)=>b.price-a.price);

  renderProducts(list);
}

/* ============================================================
   🟧 10. СОБЫТИЯ ФИЛЬТРОВ
============================================================ */
document.getElementById('searchInput').addEventListener('input', filterProducts);
document.getElementById('minPrice').addEventListener('input', filterProducts);
document.getElementById('maxPrice').addEventListener('input', filterProducts);
document.getElementById('sortSelect').addEventListener('change', filterProducts);

/* ============================================================
   🟧 11. СОБЫТИЯ В ГРИДЕ ТОВАРОВ (делегирование)
============================================================ */
productsGrid.addEventListener('click', (e)=>{
  const quick = e.target.closest('.js-quick-view');
  if(quick){
    const id = Number(quick.dataset.id);
    openProductModal(id);
    return;
  }

  const addBtn = e.target.closest('.js-add-to-cart');
  if(addBtn){
    const id = Number(addBtn.dataset.id);
    addToCart(id);
    return;
  }

  const up = e.target.closest('.js-qty-up');
  if(up){
    const id = Number(up.dataset.id);
    changeQty(id, +1);
    return;
  }

  const down = e.target.closest('.js-qty-down');
  if(down){
    const id = Number(down.dataset.id);
    changeQty(id, -1);
    return;
  }
});

function changeQty(id, delta){
  const input = document.querySelector(`.js-qty-input[data-id="${id}"]`);
  if(!input) return;
  let v = parseFloat(input.value || '1') + delta;
  if(v < 1) v = 1;
  input.value = v;
}

/* ============================================================
   🟧 12. КОРЗИНА
============================================================ */
function addToCart(id, qtyFromModal){
  const product = PRODUCTS.find(p=>p.id===id);
  if(!product) return;

  let qty;
  if(typeof qtyFromModal === 'number'){
    qty = qtyFromModal;
  }else{
    const input = document.querySelector(`.js-qty-input[data-id="${id}"]`);
    qty = parseFloat(input?.value || '1');
  }
  if(qty < 1 || isNaN(qty)) qty = 1;

  const existing = cart.find(it=>it.id===id);
  if(existing) existing.qty += qty;
  else cart.push({...product, qty});

  saveCart();
  updateCartUI();
  showToast('Товар додано у кошик');
}

function updateCartUI(){
  const box = document.getElementById('cartItems');
  box.innerHTML = '';
  let total = 0;
  cart.forEach(item=>{
    total += item.price * item.qty;
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <strong>${item.title}</strong><br>
      ${item.qty} × ${item.price} грн = ${item.qty*item.price} грн
      <button style="float:right;border:0;background:none;color:var(--danger);cursor:pointer;font-size:18px"
        data-id="${item.id}" class="js-remove-cart">×</button>
    `;
    box.appendChild(div);
  });
  document.getElementById('cartTotal').textContent = money(total);
  document.getElementById('cartCount').textContent = cart.reduce((s,i)=>s+i.qty,0);
}

document.getElementById('cartItems').addEventListener('click',(e)=>{
  const btn = e.target.closest('.js-remove-cart');
  if(!btn) return;
  const id = Number(btn.dataset.id);
  cart = cart.filter(i=>i.id!==id);
  saveCart();
  updateCartUI();
});

document.getElementById('cartClearBtn').addEventListener('click',()=>{
  cart = [];
  saveCart();
  updateCartUI();
});

/* ============================================================
   🟧 13. ОТКРЫТИЕ / ЗАКРЫТИЕ КОРЗИНЫ
============================================================ */
const cartDrawer = document.getElementById('cartDrawer');
const cartOverlay = document.getElementById('cartOverlay');

function toggleCart(open){
  if(open){
    cartDrawer.classList.add('open');
    cartOverlay.classList.remove('hidden');
  }else{
    cartDrawer.classList.remove('open');
    cartOverlay.classList.add('hidden');
  }
}

document.getElementById('openCartBtn').addEventListener('click', ()=>toggleCart(true));
document.getElementById('cartClose').addEventListener('click', ()=>toggleCart(false));
cartOverlay.addEventListener('click', ()=>toggleCart(false));

/* ============================================================
   🟧 14. МОДАЛКА ТОВАРА
============================================================ */
const productModal = document.getElementById('productModal');
const productModalOverlay = document.getElementById('productModalOverlay');
let currentProductId = null;

const modalImage = document.getElementById('modalImage');
const modalCategory = document.getElementById('modalCategory');
const modalTitle = document.getElementById('modalTitle');
const modalSku = document.getElementById('modalSku');
const modalPrice = document.getElementById('modalPrice');
const modalShort = document.getElementById('modalShort');
const modalFull = document.getElementById('modalFull');
const modalQtyInput = document.getElementById('modalQtyInput');

function openProductModal(id){
  const p = PRODUCTS.find(x=>x.id===id);
  if(!p) return;
  currentProductId = id;

  modalImage.src = p.img;
  modalCategory.textContent = p.category || '';
  modalTitle.textContent = p.title;
  modalSku.textContent = p.sku;
  modalPrice.textContent = money(p.price);
  
  modalShort.innerHTML = p.short;
  modalFull.innerHTML = p.full;
  
  modalQtyInput.value = 1;
  modalFull.style.display = 'none';

  productModal.classList.remove('hidden');
  productModalOverlay.classList.remove('hidden');

  if (window.lucide) {
    lucide.createIcons();
  }
}

function closeProductModal(){
  productModal.classList.add('hidden');
  productModalOverlay.classList.add('hidden');
}

document.getElementById('productModalClose').addEventListener('click', closeProductModal);
productModalOverlay.addEventListener('click', closeProductModal);

document.getElementById('modalQtyUp').addEventListener('click', ()=>{
  let v = parseFloat(modalQtyInput.value||'1')+1;
  if(v<1) v=1;
  modalQtyInput.value = v;
});
document.getElementById('modalQtyDown').addEventListener('click', ()=>{
  let v = parseFloat(modalQtyInput.value||'1')-1;
  if(v<1) v=1;
  modalQtyInput.value = v;
});

document.getElementById('modalAddToCart').addEventListener('click', ()=>{
  if(currentProductId==null) return;
  const qty = parseFloat(modalQtyInput.value||'1');
  addToCart(currentProductId, qty);
  closeProductModal();
});

document.getElementById('modalToggleFull').addEventListener('click', ()=>{
  modalFull.style.display = modalFull.style.display === 'block' ? 'none' : 'block';
});

/* ============================================================
   🟧 15. CHECKOUT (оформлення замовлення)
============================================================ */
const checkoutModal = document.getElementById('checkoutModal');
const checkoutOverlay = document.getElementById('checkoutOverlay');

function openCheckout(){
  if(cart.length===0){
    alert('Кошик порожній');
    return;
  }
  checkoutModal.classList.remove('hidden');
  checkoutOverlay.classList.remove('hidden');
}
function closeCheckout(){
  checkoutModal.classList.add('hidden');
  checkoutOverlay.classList.add('hidden');
}

document.getElementById('cartCheckoutBtn').addEventListener('click', openCheckout);
document.getElementById('checkoutClose').addEventListener('click', closeCheckout);
checkoutOverlay.addEventListener('click', closeCheckout);

document.getElementById('checkoutForm').addEventListener('submit',(e)=>{
  e.preventDefault();
  if(cart.length===0){
    alert('Кошик порожній');
    return;
  }
  const name = document.getElementById('checkoutName').value;
  const phone = document.getElementById('checkoutPhone').value;
  const city = document.getElementById('checkoutCity').value;
  const post = document.getElementById('checkoutPost').value;

  let text = '🛒 Нове замовлення%0A';
  text += `👤 Ім’я: ${name}%0A`;
  text += `📞 Телефон: ${phone}%0A`;
  text += `🏙 Місто: ${city}%0A`;
  text += `📦 Відділення НП: ${post}%0A%0A`;
  text += 'Товари:%0A';

  let total = 0;
  cart.forEach(item=>{
    const line = `${item.title} — ${item.qty} ${item.unit} = ${item.qty*item.price} грн`;
    total += item.qty*item.price;
    text += encodeURIComponent(line) + '%0A';
  });
  text += `%0AРазом: ${total} грн`;

  const url = `https://t.me/${TELEGRAM_USERNAME}?text=${text}`;
  window.open(url,'_blank');

  closeCheckout();
});

/* ============================================================
   🟧 16. КНОПКИ "КОНСУЛЬТАЦІЯ"
============================================================ */
document.querySelectorAll('.js-consult').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    openTelegram('Потрібна консультація щодо асортименту/ремонту');
  });
});

/* ============================================================
   🟧 17. СЛАЙДЕР HERO
============================================================ */
const slides = document.querySelectorAll('.hero-slide');
const dots = document.querySelectorAll('.hero-dot');
let currentSlide = 0;

function showSlide(i){
  slides.forEach(s=>s.classList.remove('active'));
  dots.forEach(d=>d.classList.remove('active'));
  slides[i].classList.add('active');
  dots[i].classList.add('active');
  currentSlide = i;
}
dots.forEach(d=>{
  d.addEventListener('click', ()=>showSlide(Number(d.dataset.index)));
});
setInterval(()=>{
  currentSlide = (currentSlide+1)%slides.length;
  showSlide(currentSlide);
}, 7000);

/* ============================================================
   🟧 18. СКРОЛЛ К ТОВАРАМ
============================================================ */
const scrollBtn = document.getElementById('scrollToProductsBtn');
if (scrollBtn) {
  scrollBtn.addEventListener('click', ()=>{
    document.getElementById('productsSection').scrollIntoView({behavior:'smooth'});
  });
}

/* ============================================================
   🟧 19. INIT
============================================================ */
(async function init(){
  const yearSpan = document.getElementById('year');
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  await loadProductsFromXML();   // грузим products.xml
  renderCategories();            // рисуем кнопки категорий
  renderProducts(PRODUCTS);      // показываем товары
  updateCartUI();                // корзина
  if (window.lucide) {
    lucide.createIcons();
  }
})();
