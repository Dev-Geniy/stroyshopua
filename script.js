/* ============================================================
   🟧 1. ГЛОБАЛЬНЫЕ НАСТРОЙКИ
============================================================ */
const TELEGRAM_USERNAME = 'manager_samostroy_shop';
const XML_FEED_URL = 'products.xml';

/* ============================================================
   🟧 2. КАТЕГОРИИ ПО КЛЮЧЕВЫМ СЛОВАМ (по заголовкам товаров)
   name — то, что пишется на кнопке
   keywords — слова, которые ищем в title
============================================================ */
const CATEGORY_KEYWORDS = [
  
  //3D Панелі
  { name: '3D панелі', keywords: ['3D панель', 'Панель стеніва', '3D'] },
  { name: 'Декоративні 3D панелі', keywords: ['Декоративна 3D панель'] },
  { name: 'ПВХ панелі і плити', keywords: ['ПВХ панель', 'ПВХ плита', 'ПВХ'] },
  { name: 'Стенові панелі', keywords: ['Панель стінова', 'Панель-рейка', 'Панель рейка'] },
  
  //Покриття вінілове
  { name: 'Покриття вінілове', keywords: ['Покриття вінілове самоклеюче'] },
  
  //Плитка
  { name: 'Плитка', keywords: ['Вінілова плитка', 'Вінілова плита', 'ПВХ плитка', 'Поліуретанова плитка', 'Алюмінієва плитка', 'LVT плитка', 'Плитка під ковролін'] },
  { name: 'Плитка вінілова', keywords: ['Вінілова плитка', 'Вінілова плита'] },
  { name: 'ПВХ плитка', keywords: ['ПВХ плитка'] },
  { name: 'Поліуретанова плитка', keywords: ['Поліуретанова плитка'] },
  { name: 'Алюмінієва плитка', keywords: ['Алюмінієва плитка'] },
  { name: 'LVT плитка', keywords: ['LVT плитка'] },
  { name: 'Плитка під ковролін', keywords: ['плитка під ковролін'] },
  
  //PET плитка
  { name: 'PET плитка', keywords: ['Стінова PET плитка', 'PET мозаіка', 'PET плитка у рулоні'] },
  { name: 'PET мозаіка', keywords: ['PET мозаіка'] },
  { name: 'PET плитка у рулоні', keywords: ['PET плитка у рулоні'] },
  { name: 'Профілі та декор', keywords: ['Профіль', 'Рейка декоративна', 'Молдинг'] },
  
  //Плінтуси
  { name: 'Плінтуси', keywords: ['Плінтус РР', 'Плінтус вініловий', 'Плінтус'] },
  
  //Самоклеюча плівка
  { name: 'Самоклеюча плівка', keywords: ['Плівка самоклеюча', 'Плівка', 'Плівка віконна'] },
  
  //Теплі шпалери
  { name: 'Шпалери', keywords: ['Шпалери'] },
  { name: 'Теплі шпалери', keywords: ['Теплі шпалери'] },
  
  //Мозаїка з декоративного скла
  { name: 'Мозаїка з декоративного скла', keywords: ['Мозаїка з декоративного скла'] },
  
  //Вінілові покриття
  { name: 'Підлогове вінілове покриття', keywords: ['Вінілове покриття', 'Напольное виниловое покрытие'] },
  { name: 'Покриття вінілове самоклеюче 3D рейки', keywords: ['Покриття вінілове самоклеюче 3D рейки'] },
  
  //Підлога-пазл
  { name: 'Підлога-пазл', keywords: ['Підлога пазл', 'Підлога-пазл', 'Підлога-пазл плюшевий'] },
  { name: 'Підлога-пазл плюшевий', keywords: ['Підлога-пазл плюшевий'] },
  
  //Килимки
  { name: 'Килимки термо (дитячі)', keywords: ['Килимок дитячий', 'Термокилимок', 'Килимок', 'Дитячий', ] },
  { name: 'Килимки вологопоглинаючі', keywords: ['Вологопоглинаючий килимок', ] },

  //Дзеркала
  { name: 'Дзеркала', keywords: ['Дзеркало', 'Дзеркала', 'Дзеркало акрилове', 'Дзеркальний декор'] },
  
  //Екошкіра
  { name: 'Екошкіра у рулоні ', keywords: ['Екошкіра', 'Шкіра'] },
  
  //Екошкіра
  { name: 'Манікюр', keywords: ['Манікюр'] },
  
  //Контейнери
  { name: 'Контейнери для зберігання', keywords: ['Контейнер для зберігання'] },
  
    //Меблі
  { name: 'Меблі для дому та саду', keywords: ['Набір мебелів складний', 'Меблі', 'Тумба', 'Стелаж', 'Садовий стіл', 'Стіл','Етажерка','Полиця-органайзер','Шафа', 'Надувне крісло', 'Надувний диван', 'Набір мебелів','Комплект надувних меблів'
    ] },
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
    title:'Уценка Ковролін SoftLux 4м — кремовий',
    category: getCategoryFromTitle('Ковролін SoftLux 4м — кремовий'),
    price:279,
    sku:14417,
    img:'https://i.ibb.co/PZGTwyqp/unnamed.jpg',
    unit:'м',
    short:'М’який і зносостійкий ковролін для житлових кімнат.',
    full:'Ковролін SoftLux — щільний, приємний на дотик матеріал. Оптимальний для спальні та вітальні.'
  },
    {
    id:2,
    title:'Уценка Ковролін SoftLux 4м — кремовий',
    category: getCategoryFromTitle('Ковролін SoftLux 4м — кремовий'),
    price:279,
    sku:14417,
    img:'https://i.ibb.co/PZGTwyqp/unnamed.jpg',
    unit:'м',
    short:'М’який і зносостійкий ковролін для житлових кімнат.',
    full:'Ковролін SoftLux — щільний, приємний на дотик матеріал. Оптимальний для спальні та вітальні.'
  },
    {
    id:3,
    title:'Уценка Ковролін SoftLux 4м — кремовий',
    category: getCategoryFromTitle('Ковролін SoftLux 4м — кремовий'),
    price:279,
    sku:14417,
    img:'https://i.ibb.co/PZGTwyqp/unnamed.jpg',
    unit:'м',
    short:'М’який і зносостійкий ковролін для житлових кімнат.',
    full:'Ковролін SoftLux — щільний, приємний на дотик матеріал. Оптимальний для спальні та вітальні.'
  },
    {
    id:4,
    title:'Уценка Ковролін SoftLux 4м — кремовий',
    category: getCategoryFromTitle('Ковролін SoftLux 4м — кремовий'),
    price:279,
    sku:14417,
    img:'https://i.ibb.co/PZGTwyqp/unnamed.jpg',
    unit:'м',
    short:'М’який і зносостійкий ковролін для житлових кімнат.',
    full:'Ковролін SoftLux — щільний, приємний на дотик матеріал. Оптимальний для спальні та вітальні.'
  },
    {
    id:5,
    title:'Уценка Ковролін SoftLux 4м — кремовий',
    category: getCategoryFromTitle('Ковролін SoftLux 4м — кремовий'),
    price:279,
    sku:14417,
    img:'https://i.ibb.co/PZGTwyqp/unnamed.jpg',
    unit:'м',
    short:'М’який і зносостійкий ковролін для житлових кімнат.',
    full:'Ковролін SoftLux — щільний, приємний на дотик матеріал. Оптимальний для спальні та вітальні.'
  },
    {
    id:6,
    title:'Уценка Ковролін SoftLux 4м — кремовий',
    category: getCategoryFromTitle('Ковролін SoftLux 4м — кремовий'),
    price:279,
    sku:14417,
    img:'https://i.ibb.co/PZGTwyqp/unnamed.jpg',
    unit:'м',
    short:'М’який і зносостійкий ковролін для житлових кімнат.',
    full:'Ковролін SoftLux — щільний, приємний на дотик матеріал. Оптимальний для спальні та вітальні.'
  },
    {
    id:7,
    title:'Уценка Ковролін SoftLux 4м — кремовий',
    category: getCategoryFromTitle('Ковролін SoftLux 4м — кремовий'),
    price:279,
    sku:14417,
    img:'https://i.ibb.co/PZGTwyqp/unnamed.jpg',
    unit:'м',
    short:'М’який і зносостійкий ковролін для житлових кімнат.',
    full:'Ковролін SoftLux — щільний, приємний на дотик матеріал. Оптимальний для спальні та вітальні.'
  },
    {
    id:8,
    title:'Уценка Ковролін SoftLux 4м — кремовий',
    category: getCategoryFromTitle('Ковролін SoftLux 4м — кремовий'),
    price:279,
    sku:14417,
    img:'https://i.ibb.co/PZGTwyqp/unnamed.jpg',
    unit:'м',
    short:'М’який і зносостійкий ковролін для житлових кімнат.',
    full:'Ковролін SoftLux — щільний, приємний на дотик матеріал. Оптимальний для спальні та вітальні.'
  },
    {
    id:9,
    title:'Уценка Ковролін SoftLux 4м — кремовий',
    category: getCategoryFromTitle('Ковролін SoftLux 4м — кремовий'),
    price:279,
    sku:14417,
    img:'https://i.ibb.co/PZGTwyqp/unnamed.jpg',
    unit:'м',
    short:'М’який і зносостійкий ковролін для житлових кімнат.',
    full:'Ковролін SoftLux — щільний, приємний на дотик матеріал. Оптимальний для спальні та вітальні.'
  },
  {
    id:10,
    title:'Уценка Плівка біла матова 0.45м',
    category: getCategoryFromTitle('Плівка біла матова 0.45м'),
    price:59,
    sku:14418,
    img:'https://i.ibb.co/PZGTwyqp/unnamed.jpg',
    unit:'м',
    short:'Самоклейна плівка для меблів і декору.',
    full:'Матовий білий відтінок, підходить для фасадів меблів, дверей, підвіконь. Легко клеїться без бульбашок.'
  },
  {
    id:11,
    title:'Шпалери Modern Stone',
    category: getCategoryFromTitle('Шпалери Modern Stone'),
    price:129,
    sku:14419,
    img:'https://i.ibb.co/PZGTwyqp/unnamed.jpg',
    unit:'м',
    short:'Шпалери з ефектом натурального каменю.',
    full:'Текстурована поверхня під камінь. Підходить для акцентних стін у вітальні, коридорі, кухні.'
  },
  {
    id:12,
    title:'Плитка самоклейка 20×20',
    category: getCategoryFromTitle('Плитка самоклейка 20×20'),
    price:250,
    sku:14420,
    img:'https://i.ibb.co/PZGTwyqp/unnamed.jpg',
    unit:'шт',
    short:'Самоклейні плитки для швидкого оновлення кухні чи ванної.',
    full:'Водостійка поверхня, підходить для фартухів на кухні та зон навколо умивальника.'
  },
  {
    id:13,
    title:'Плитка самоклейка 20×20',
    category: getCategoryFromTitle('Плитка самоклейка 20×20'),
    price:250,
    sku:14420,
    img:'https://i.ibb.co/PZGTwyqp/unnamed.jpg',
    unit:'шт',
    short:'Самоклейні плитки для швидкого оновлення кухні чи ванної.',
    full:'Водостійка поверхня, підходить для фартухів на кухні та зон навколо умивальника.'
  },
  {
    id:14,
    title:'Плитка самоклейка 20×20',
    category: getCategoryFromTitle('Плитка самоклейка 20×20'),
    price:250,
    sku:14420,
    img:'https://i.ibb.co/PZGTwyqp/unnamed.jpg',
    unit:'шт',
    short:'Самоклейні плитки для швидкого оновлення кухні чи ванної.',
    full:'Водостійка поверхня, підходить для фартухів на кухні та зон навколо умивальника.'
  },
  {
    id:15,
    title:'Плитка самоклейка 20×20',
    category: getCategoryFromTitle('Плитка самоклейка 20×20'),
    price:250,
    sku:14420,
    img:'https://i.ibb.co/PZGTwyqp/unnamed.jpg',
    unit:'шт',
    short:'Самоклейні плитки для швидкого оновлення кухні чи ванної.',
    full:'Водостійка поверхня, підходить для фартухів на кухні та зон навколо умивальника.'
  },
  {
    id:16,
    title:'Уценка Ковролін SoftLux 4м — кремовий',
    category: getCategoryFromTitle('Ковролін SoftLux 4м — кремовий'),
    price:279,
    sku:14417,
    img:'https://i.ibb.co/PZGTwyqp/unnamed.jpg',
    unit:'м',
    short:'М’який і зносостійкий ковролін для житлових кімнат.',
    full:'Ковролін SoftLux — щільний, приємний на дотик матеріал. Оптимальний для спальні та вітальні.'
  },
    {
    id:17,
    title:'Уценка Ковролін SoftLux 4м — кремовий',
    category: getCategoryFromTitle('Ковролін SoftLux 4м — кремовий'),
    price:279,
    sku:14417,
    img:'https://i.ibb.co/PZGTwyqp/unnamed.jpg',
    unit:'м',
    short:'М’який і зносостійкий ковролін для житлових кімнат.',
    full:'Ковролін SoftLux — щільний, приємний на дотик матеріал. Оптимальний для спальні та вітальні.'
  },
    {
    id:18,
    title:'Уценка Ковролін SoftLux 4м — кремовий',
    category: getCategoryFromTitle('Ковролін SoftLux 4м — кремовий'),
    price:279,
    sku:14417,
    img:'https://i.ibb.co/PZGTwyqp/unnamed.jpg',
    unit:'м',
    short:'М’який і зносостійкий ковролін для житлових кімнат.',
    full:'Ковролін SoftLux — щільний, приємний на дотик матеріал. Оптимальний для спальні та вітальні.'
  },
    {
    id:19,
    title:'Уценка Ковролін SoftLux 4м — кремовий',
    category: getCategoryFromTitle('Ковролін SoftLux 4м — кремовий'),
    price:279,
    sku:14417,
    img:'https://i.ibb.co/PZGTwyqp/unnamed.jpg',
    unit:'м',
    short:'М’який і зносостійкий ковролін для житлових кімнат.',
    full:'Ковролін SoftLux — щільний, приємний на дотик матеріал. Оптимальний для спальні та вітальні.'
  },
    {
    id:20,
    title:'Уценка Ковролін SoftLux 4м — кремовий',
    category: getCategoryFromTitle('Ковролін SoftLux 4м — кремовий'),
    price:279,
    sku:14417,
    img:'https://i.ibb.co/PZGTwyqp/unnamed.jpg',
    unit:'м',
    short:'М’який і зносостійкий ковролін для житлових кімнат.',
    full:'Ковролін SoftLux — щільний, приємний на дотик матеріал. Оптимальний для спальні та вітальні.'
  },
    {
    id:21,
    title:'Уценка Ковролін SoftLux 4м — кремовий',
    category: getCategoryFromTitle('Ковролін SoftLux 4м — кремовий'),
    price:279,
    sku:14417,
    img:'https://i.ibb.co/PZGTwyqp/unnamed.jpg',
    unit:'м',
    short:'М’який і зносостійкий ковролін для житлових кімнат.',
    full:'Ковролін SoftLux — щільний, приємний на дотик матеріал. Оптимальний для спальні та вітальні.'
  },
    {
    id:22,
    title:'Уценка Ковролін SoftLux 4м — кремовий',
    category: getCategoryFromTitle('Ковролін SoftLux 4м — кремовий'),
    price:279,
    sku:14417,
    img:'https://i.ibb.co/PZGTwyqp/unnamed.jpg',
    unit:'м',
    short:'М’який і зносостійкий ковролін для житлових кімнат.',
    full:'Ковролін SoftLux — щільний, приємний на дотик матеріал. Оптимальний для спальні та вітальні.'
  },
    {
    id:23,
    title:'Уценка Ковролін SoftLux 4м — кремовий',
    category: getCategoryFromTitle('Ковролін SoftLux 4м — кремовий'),
    price:279,
    sku:14417,
    img:'https://i.ibb.co/PZGTwyqp/unnamed.jpg',
    unit:'м',
    short:'М’який і зносостійкий ковролін для житлових кімнат.',
    full:'Ковролін SoftLux — щільний, приємний на дотик матеріал. Оптимальний для спальні та вітальні.'
  },
    {
    id:24,
    title:'Уценка Ковролін SoftLux 4м — кремовий',
    category: getCategoryFromTitle('Ковролін SoftLux 4м — кремовий'),
    price:279,
    sku:14417,
    img:'https://i.ibb.co/PZGTwyqp/unnamed.jpg',
    unit:'м',
    short:'М’який і зносостійкий ковролін для житлових кімнат.',
    full:'Ковролін SoftLux — щільний, приємний на дотик матеріал. Оптимальний для спальні та вітальні.'
  },
  {
    id:25,
    title:'Уценка Плівка біла матова 0.45м',
    category: getCategoryFromTitle('Плівка біла матова 0.45м'),
    price:59,
    sku:14418,
    img:'https://i.ibb.co/PZGTwyqp/unnamed.jpg',
    unit:'м',
    short:'Самоклейна плівка для меблів і декору.',
    full:'Матовий білий відтінок, підходить для фасадів меблів, дверей, підвіконь. Легко клеїться без бульбашок.'
  },
  {
    id:26,
    title:'Шпалери Modern Stone',
    category: getCategoryFromTitle('Шпалери Modern Stone'),
    price:129,
    sku:14419,
    img:'https://i.ibb.co/PZGTwyqp/unnamed.jpg',
    unit:'м',
    short:'Шпалери з ефектом натурального каменю.',
    full:'Текстурована поверхня під камінь. Підходить для акцентних стін у вітальні, коридорі, кухні.'
  },
  {
    id:12,
    title:'Плитка самоклейка 20×20',
    category: getCategoryFromTitle('Плитка самоклейка 20×20'),
    price:250,
    sku:14420,
    img:'https://i.ibb.co/PZGTwyqp/unnamed.jpg',
    unit:'шт',
    short:'Самоклейні плитки для швидкого оновлення кухні чи ванної.',
    full:'Водостійка поверхня, підходить для фартухів на кухні та зон навколо умивальника.'
  },
  {
    id:27,
    title:'Плитка самоклейка 20×20',
    category: getCategoryFromTitle('Плитка самоклейка 20×20'),
    price:250,
    sku:14420,
    img:'https://i.ibb.co/PZGTwyqp/unnamed.jpg',
    unit:'шт',
    short:'Самоклейні плитки для швидкого оновлення кухні чи ванної.',
    full:'Водостійка поверхня, підходить для фартухів на кухні та зон навколо умивальника.'
  },
  {
    id:14,
    title:'Плитка самоклейка 20×20',
    category: getCategoryFromTitle('Плитка самоклейка 20×20'),
    price:250,
    sku:14420,
    img:'https://i.ibb.co/PZGTwyqp/unnamed.jpg',
    unit:'шт',
    short:'Самоклейні плитки для швидкого оновлення кухні чи ванної.',
    full:'Водостійка поверхня, підходить для фартухів на кухні та зон навколо умивальника.'
  },
  {
    id:28,
    title:'Плитка самоклейка 20×20',
    category: getCategoryFromTitle('Плитка самоклейка 20×20'),
    price:250,
    sku:14420,
    img:'https://i.ibb.co/PZGTwyqp/unnamed.jpg',
    unit:'шт',
    short:'Самоклейні плитки для швидкого оновлення кухні чи ванної.',
    full:'Водостійка поверхня, підходить для фартухів на кухні та зон навколо умивальника.'
  }
];

let PRODUCTS = [...DEFAULT_PRODUCTS];


/* ============================== 
+++ ДЛЯ ОБРЕЗКИ ПО 25 ТОВАРОВ 
============================== */

// Сколько товаров показывать за один раз
const PAGE_SIZE = 25;

// Отфильтрованный список (после категорий и поиска)
let FILTERED_PRODUCTS = [];

// Сколько сейчас показано на экране
let visibleCount = PAGE_SIZE;

// Обновление вида товаров с учётом visibleCount
function updateProductsView() {
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  if (!FILTERED_PRODUCTS) FILTERED_PRODUCTS = [];

  // Берем только нужный кусок массива
  const toShow = FILTERED_PRODUCTS.slice(0, visibleCount);

  // Рендерим как раньше, только не весь список, а кусок
  renderProducts(toShow);

  // Управляем видимостью кнопки "Показати ще"
  if (loadMoreBtn) {
    if (visibleCount >= FILTERED_PRODUCTS.length) {
      loadMoreBtn.style.display = 'none';   // Уже нечего догружать
    } else {
      loadMoreBtn.style.display = 'inline-flex'; // Еще есть товары
    }
  }
}

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

function renderSaleProducts(){
  const saleBox = document.getElementById('saleSlider');
  if(!saleBox) return;

  const saleItems = PRODUCTS.filter(p =>
    p.title.toLowerCase().includes('уцен')
  );

  saleBox.innerHTML = '';

  saleItems.forEach(p => {
    const card = document.createElement('div');
    card.className = 'sale-card';
    card.innerHTML = `
      <img src="${p.img}">
      <div class="sale-card-title">${p.title}</div>
      <div class="sale-card-price">${money(p.price)}</div>
    `;
    card.addEventListener('click', ()=> openProductModal(p.id));
    saleBox.appendChild(card);
  });
}


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

// Кнопка "Показати ще"
const loadMoreBtn = document.getElementById('loadMoreBtn');
if (loadMoreBtn) {
  loadMoreBtn.addEventListener('click', () => {
    visibleCount += PAGE_SIZE;         // плюс ещё 25
    updateProductsView();              // перерисовали
  });
}

function highlightSale(text){
  if(!text) return text;
  return text.replace(/Уценка/gi, '<span class="badge-sale">Уценка</span>');
}

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
      <div class="product-title">${highlightSale(p.title)}</div>
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
    // Анимация появления карточек
requestAnimationFrame(() => {
  document.querySelectorAll('.product-card').forEach(card => {
    setTimeout(() => card.classList.add('show'), 50);
  });
});

    lucide.createIcons();
  }
}

function hideLoader() {
  const loader = document.getElementById('loader');
  if (loader) loader.classList.add('hide');
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
  if (q) {
    list = list.filter(p => p.title.toLowerCase().includes(q));
  }

  // Сохраняем отфильтрованный список и сбрасываем счётчик видимых товаров
  FILTERED_PRODUCTS = list;
  visibleCount = PAGE_SIZE;

  // Обновляем отображение товаров
  updateProductsView();
}

/* ============================================================
   🟧 10. СОБЫТИЯ ФИЛЬТРОВ
============================================================ */
document.getElementById('searchInput').addEventListener('input', filterProducts);

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
      <img src="${item.img}" 
           alt="${item.title}" 
           style="width:100%;border-radius:10px;margin-bottom:8px;">

      <strong>${item.title}</strong><br>

      ${item.qty} × ${item.price} грн = ${item.qty * item.price} грн

      <button style="
          float:right;
          border:0;
          background:none;
          color:var(--danger);
          cursor:pointer;
          font-size:18px
      " data-id="${item.id}" class="js-remove-cart">×</button>
    `;

    box.appendChild(div);
  });

  document.getElementById('cartTotal').textContent = money(total);
  document.getElementById('cartCount').textContent = cart.reduce((s,i)=>s+i.qty,0);

  /* -----------------------------------------------
     🟧 АНИМАЦИЯ КНОПКИ КОРЗИНЫ
  ------------------------------------------------ */
  const cartBtn = document.querySelector('.cart-btn');

  // Всплеск при добавлении товара (bubble)
  cartBtn.classList.remove('cart-added');
  void cartBtn.offsetWidth; // перезапуск CSS-анимации
  cartBtn.classList.add('cart-added');

  // Пульсация, если корзина не пустая
  if (cart.length > 0) {
    cartBtn.classList.add('cart-has-items');
  } else {
    cartBtn.classList.remove('cart-has-items');
  }
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

/**
 * Красиво форматируем длинное описание:
 * - абзацы
 * - маркеры списков (- • — *)
 * - нумерованные списки (1., 2) 
 * - заголовки (строки, заканчивающиеся ':')
 */
function formatDescription(text){
  if (!text) return '';

  // Нормализуем переносы строк и пробелы
  text = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00A0/g, ' ')
    .trim();

  const lines = text.split('\n');
  const htmlParts = [];

  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) {
      htmlParts.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      htmlParts.push('</ol>');
      inOl = false;
    }
  };

  for (let rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Заголовок (строка, заканчивающаяся двоеточием)
    if (/^[A-Za-zА-Яа-яЁёЇїІіЄєҐґ0-9].*:\s*$/.test(line)) {
      closeLists();
      const title = line.replace(/:\s*$/, '');
      htmlParts.push(`<h3>${title}</h3>`);
      continue;
    }

    // Маркированный список: "-", "–", "•", "*"
    const bulletMatch = line.match(/^[-–•*]\s+(.+)/);
    if (bulletMatch) {
      if (!inUl) {
        closeLists();
        htmlParts.push('<ul>');
        inUl = true;
      }
      htmlParts.push(`<li>${bulletMatch[1]}</li>`);
      continue;
    }

    // Нумерованный список: "1.", "2)", "3 "
    const numMatch = line.match(/^(\d+)[\).\s]\s*(.+)/);
    if (numMatch) {
      if (!inOl) {
        closeLists();
        htmlParts.push('<ol>');
        inOl = true;
      }
      htmlParts.push(`<li>${numMatch[2]}</li>`);
      continue;
    }

    // Обычный абзац
    closeLists();
    htmlParts.push(`<p>${line}</p>`);
  }

  // Закрываем открытые списки
  closeLists();

  return htmlParts.join('');
}

function openProductModal(id){
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;
  currentProductId = id;

  modalImage.src = p.img;
  modalCategory.textContent = p.category || '';
  modalTitle.innerHTML = highlightSale(p.title);
  modalSku.textContent = p.sku;
  modalPrice.textContent = money(p.price);

  // Короткое описание как есть
  modalShort.innerHTML = p.short;

  // Детальное описание — с красивым форматированием
  modalFull.innerHTML = formatDescription(p.full);

  modalQtyInput.value = 1;
  modalFull.style.display = 'none'; // по умолчанию скрыто

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

document.getElementById('modalQtyUp').addEventListener('click', () => {
  let v = parseFloat(modalQtyInput.value || '1') + 1;
  if (v < 1) v = 1;
  modalQtyInput.value = v;
});

document.getElementById('modalQtyDown').addEventListener('click', () => {
  let v = parseFloat(modalQtyInput.value || '1') - 1;
  if (v < 1) v = 1;
  modalQtyInput.value = v;
});

document.getElementById('modalAddToCart').addEventListener('click', () => {
  if (currentProductId == null) return;
  const qty = parseFloat(modalQtyInput.value || '1');
  addToCart(currentProductId, qty);
  closeProductModal();
});

document.getElementById('modalToggleFull').addEventListener('click', () => {
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
  const service = document.getElementById('checkoutService').value;

  let text = 'Samostroy Shop 🛒 Нове замовлення, сайт: http://www.samostroy.shop';
  text += `👤 Ім’я: ${name}%0A`;
  text += `📞 Телефон: ${phone}%0A`;
  text += `🏙 Місто: ${city}%0A`;
  text += `📦 Відділення НП: ${post}%0A%0A`;
  text += 'Товари:%0A';
  text += `🚚 Доставка: ${service}%0A`;

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
   17. 🟧 HERO SLIDER — авто + клики по точкам
============================================================ */
document.addEventListener('DOMContentLoaded', () => {

  const slides = document.querySelectorAll('.hero-slide');
  const dotsWrap = document.getElementById('heroDots');

  let currentSlide = 0;
  let sliderTimer = null;

  if (!slides.length || !dotsWrap) return;

  // создаём точки
  dotsWrap.innerHTML = Array.from(slides).map((_, i) => `
    <button class="hero-dot ${i === 0 ? 'active' : ''}" data-index="${i}" type="button"></button>
  `).join('');

  const dots = dotsWrap.querySelectorAll('.hero-dot');

  function showSlide(index) {
    currentSlide = (index + slides.length) % slides.length;

    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));

    slides[currentSlide].classList.add('active');
    dots[currentSlide].classList.add('active');
  }

  // клики по точкам
  dotsWrap.addEventListener('click', (e) => {
    const dot = e.target.closest('.hero-dot');
    if (!dot) return;

    showSlide(+dot.dataset.index);
    restartAuto();
  });

  function startAuto() {
    sliderTimer = setInterval(() => showSlide(currentSlide + 1), 7000);
  }
  function restartAuto() {
    clearInterval(sliderTimer);
    startAuto();
  }

  startAuto();
});

if (window.lucide) lucide.createIcons();

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
  
  
await loadProductsFromXML(); // грузим products.xml
renderCategories();          // рисуем кнопки категорий
renderSaleProducts();        // Загрузка акционных
filterProducts();            // она сама заполнит FILTERED_PRODUCTS и вызовет updateProductsView() // показываем товары
updateCartUI();              // корзина
hideLoader();                // прячем анимацию после загрузки товаров

  if (window.lucide) {
    lucide.createIcons();
  }
})();

/* ============================================================
   🟧 19. СКРОЛИНГ УЦЕНЁННЫХ ТОВАРОВ
============================================================ */
const burgerBtn = document.getElementById("burgerBtn");
const mobileMenu = document.getElementById("mobileMenu");

// Открыть / закрыть
burgerBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  mobileMenu.classList.toggle("show");
});

// Закрытие при клике на ссылку
document.querySelectorAll(".mobile-menu a").forEach(link => {
  link.addEventListener("click", () => {
    mobileMenu.classList.remove("show");
  });
});

// Закрытие при клике вне меню
document.addEventListener("click", (e) => {
  if (!mobileMenu.contains(e.target) && !burgerBtn.contains(e.target)) {
    mobileMenu.classList.remove("show");
  }
});

// ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") mobileMenu.classList.remove("show");
});

/* ========= SMOOTH SCROLL (к началу секции) ========= */

document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener("click", function(e) {
    const target = document.querySelector(this.getAttribute("href"));
    if (!target) return;

    e.preventDefault();

    window.scrollTo({
      top: target.offsetTop - 110,
      behavior: "smooth"
    });
  });
});

/* ===== СЛАЙДЕР НА УЦЕНЁННЫХ ТОВАРАХ ===== */
const saleSlider = document.getElementById('saleSlider');

document.getElementById('saleLeft').addEventListener('click', () => {
  saleSlider.scrollBy({ left: -220, behavior: 'smooth' });
});

document.getElementById('saleRight').addEventListener('click', () => {
  saleSlider.scrollBy({ left: 220, behavior: 'smooth' });
});

// СТАТІ
/* ============================
   LOAD BLOG PREVIEW
============================ */
async function loadBlogPreview() {
  try {
    const res = await fetch("blog.json");
    const posts = await res.json();

    const box = document.getElementById("homeBlogList");
    if (!box) return;

    const preview = posts.slice(0, 3); // показуємо тільки перші 3 статті

    box.innerHTML = preview.map(p => `
      <article class="home-blog-card" onclick="location.href='${p.url}'">
        <div class="home-blog-card-title">${p.title}</div>
        <div class="home-blog-card-desc">${p.desc}</div>
        <div class="home-blog-card-link">Читати →</div>
      </article>
    `).join("");
  } catch (e) {
    console.warn("Блог недоступний");
  }
}

loadBlogPreview();


// =========================
// NEWYEAR START (REMOVE LATER)
// =========================
(function () {
  // Сезон каждый год: 15 Dec - 15 Jan (включительно)
  function isNewYearSeason(d) {
    const m = d.getMonth(); // 0=Jan ... 11=Dec
    const day = d.getDate();
    return (m === 11 && day >= 15) || (m === 0 && day <= 15);
  }

  const now = new Date();
  if (!isNewYearSeason(now)) {
    document.documentElement.classList.remove("ny");
    return;
  }
  document.documentElement.classList.add("ny");

  // Год у логотипа: декабрь -> следующий год, январь -> текущий
  const nyYear =
    now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  const logo = document.querySelector(".ac-logo");
  if (logo) logo.setAttribute("data-ny-year", String(nyYear));

  // SVG лампочка
  function bulbSVG() {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path class="ny-glass" d="M12 3c-3.6 0-6.5 2.8-6.5 6.4 0 2.3 1.1 3.9 2.5 5.2.9.8 1.6 1.7 1.8 2.8h4.4c.2-1.1.9-2 1.8-2.8 1.4-1.3 2.5-2.9 2.5-5.2C18.5 5.8 15.6 3 12 3z"/>
        <path class="ny-stroke" d="M12 3c-3.6 0-6.5 2.8-6.5 6.4 0 2.3 1.1 3.9 2.5 5.2.9.8 1.6 1.7 1.8 2.8h4.4c.2-1.1.9-2 1.8-2.8 1.4-1.3 2.5-2.9 2.5-5.2C18.5 5.8 15.6 3 12 3z"/>
        <path class="ny-stroke" d="M9.2 18.4h5.6"/>
        <path class="ny-stroke" d="M9.8 21h4.4"/>
      </svg>
    `;
  }

  // SVG снежинка
  function snowflakeSVG() {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2v20M4 6l16 12M20 6L4 18M6 4l2 2M18 4l-2 2M6 20l2-2M18 20l-2-2M2 12h3M19 12h3"/>
      </svg>
    `;
  }

  // ============ ГИРЛЯНДА (ТОЛЬКО ВИЗУАЛ, БЕЗ КЛИКОВ) ============
  const garland = document.querySelector(".ny-garland");
  if (garland && !garland.querySelector(".ny-garland-row")) {
    // Важно: гирлянда не перехватывает клики вообще
    garland.style.pointerEvents = "none";

    const row = document.createElement("div");
    row.className = "ny-garland-row";

    const colors = [
      "#ff4e6d",
      "#5ce3a0",
      "#38bdf8",
      "#ffb347",
      "#a855f7",
      "#f97316",
      "#ffffff",
    ];

    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    const count = isMobile ? 14 : 22;

    for (let i = 0; i < count; i++) {
      const b = document.createElement("div");
      b.className = "ny-bulb";

      const r = Math.random();
      if (r < 0.3) b.classList.add("ny-fast");
      else if (r < 0.65) b.classList.add("ny-slow");

      b.style.setProperty("--ny-drop", `${Math.round(Math.random() * 6 - 3)}px`);
      b.style.setProperty("--ny-rot", `${Math.round(Math.random() * 10 - 5)}deg`);
      b.style.setProperty("--ny-wave", `${(2.8 + Math.random() * 2.0).toFixed(2)}s`);
      b.style.setProperty("--ny-blink", `${(0.9 + Math.random() * 3.0).toFixed(2)}s`);

      const c = colors[i % colors.length];
      b.style.setProperty("--ny-c", c);
      b.style.animationDelay = `${(i * 0.1 + Math.random() * 0.25).toFixed(2)}s`;

      b.innerHTML = bulbSVG();
      row.appendChild(b);
    }

    garland.appendChild(row);

    // ВАЖНО: никаких addEventListener("click") тут нет — только визуал
  }

  // ============ СНЕГ ============
  const snow = document.querySelector(".ny-snow");
  if (snow && !snow.querySelector(".ny-flake")) {
    const isMobile = window.matchMedia("(max-width: 640px)").matches;

    // ультра-лайт: минимум элементов
    const flakesCount = isMobile ? 5 : 9;

    for (let i = 0; i < flakesCount; i++) {
      const f = document.createElement("div");
      f.className = "ny-flake";

      // внутренний слой для sway (дешево)
      f.innerHTML = `<div class="ny-flake-inner">${snowflakeSVG()}</div>`;

      const left = Math.random() * 100;
      const size =
        (isMobile ? 10 : 12) + Math.random() * (isMobile ? 8 : 12);
      const op = 0.16 + Math.random() * 0.16;
      const dur =
        (isMobile ? 11 : 12) + Math.random() * (isMobile ? 8 : 12);
      const sway = 10 + Math.random() * 18;
      const swayDur = 3.6 + Math.random() * 3.6;

      // дрейф по x
      const x = Math.random() * 30 - 15;
      const x2 = x + (Math.random() * 50 - 25);
      const r2 = 360 + Math.round(Math.random() * 360);

      f.style.left = `${left}%`;
      f.style.setProperty("--ny-size", `${size.toFixed(1)}px`);
      f.style.setProperty("--ny-op", op.toFixed(2));
      f.style.setProperty("--ny-dur", `${dur.toFixed(2)}s`);
      f.style.setProperty("--ny-sway", `${sway.toFixed(1)}px`);
      f.style.setProperty("--ny-sway-dur", `${swayDur.toFixed(2)}s`);
      f.style.setProperty("--ny-x", `${x.toFixed(1)}px`);
      f.style.setProperty("--ny-x2", `${x2.toFixed(1)}px`);
      f.style.setProperty("--ny-r2", `${r2}deg`);

      // разнесём старт
      const delay = Math.random() * (isMobile ? 4 : 6);
      f.style.animationDelay = `${delay.toFixed(2)}s`;

      snow.appendChild(f);
    }
  }
})();
// =========================
// NEWYEAR END (REMOVE LATER)
// =========================

// =========================
// FAQ accordion
// =========================
(function initFAQ(){
  const items = document.querySelectorAll('.faq-item');
  if(!items.length) return;

  items.forEach(item => {
    const btn = item.querySelector('.faq-q');
    const ans = item.querySelector('.faq-a');
    if(!btn || !ans) return;

    // на всякий случай
    ans.hidden = true;
    btn.setAttribute('aria-expanded', 'false');

    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');

      // если хочешь, чтобы открывался только один — раскомментируй блок:
      /*
      items.forEach(i => {
        i.classList.remove('is-open');
        const b = i.querySelector('.faq-q');
        const a = i.querySelector('.faq-a');
        if(b) b.setAttribute('aria-expanded', 'false');
        if(a) a.hidden = true;
      });
      */

      if(isOpen){
        item.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
        ans.hidden = true;
      } else {
        item.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
        ans.hidden = false;
      }

      // обновим иконки lucide после смены состояния (на всякий случай)
      if(window.lucide) window.lucide.createIcons();
    });
  });
})();
