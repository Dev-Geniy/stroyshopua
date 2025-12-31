/* =========================
   Blog — Samostroy style
   ONLY SEARCH (no categories, no sort UI)
========================= */

const TELEGRAM_USERNAME = 'manager_samostroy_shop';
const BLOG_JSON_URL = 'blog.json';

let POSTS = [];
let filtered = [];
let page = 1;
const PER_PAGE = 9;

// ✅ ВАЖНО: твой input в HTML называется blogSearchInput
const SEARCH_INPUT_ID = 'blogSearchInput';

function $(id){ return document.getElementById(id); }

function showToast(msg){
  const t = $('toast');
  if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2000);
}

function hideLoader(){
  const loader = $('loader');
  if(loader) loader.classList.add('hide');
}

function openTelegram(msg){
  const url = `https://t.me/${TELEGRAM_USERNAME}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

function normalizeStr(s){
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/* -------- Date helpers -------- */
function parseDate(s){
  const v = String(s || '').trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(v + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function formatUA(d){
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yy = d.getFullYear();
  return `${dd}.${mm}.${yy}`;
}

/* -------- Content formatter -------- */
function formatContent(text){
  if(!text) return '';
  text = String(text)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00A0/g, ' ')
    .trim();

  const lines = text.split('\n');
  const htmlParts = [];

  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if(inUl){ htmlParts.push('</ul>'); inUl = false; }
    if(inOl){ htmlParts.push('</ol>'); inOl = false; }
  };

  for(const rawLine of lines){
    const line = rawLine.trim();
    if(!line) continue;

    if (/^[A-Za-zА-Яа-яЁёЇїІіЄєҐґ0-9].*:\s*$/.test(line)) {
      closeLists();
      const title = line.replace(/:\s*$/, '');
      htmlParts.push(`<h3>${escapeHtml(title)}</h3>`);
      continue;
    }

    const bullet = line.match(/^[-–•*]\s+(.+)/);
    if(bullet){
      if(!inUl){
        closeLists();
        htmlParts.push('<ul>');
        inUl = true;
      }
      htmlParts.push(`<li>${escapeHtml(bullet[1])}</li>`);
      continue;
    }

    const num = line.match(/^(\d+)[\).\s]\s*(.+)/);
    if(num){
      if(!inOl){
        closeLists();
        htmlParts.push('<ol>');
        inOl = true;
      }
      htmlParts.push(`<li>${escapeHtml(num[2])}</li>`);
      continue;
    }

    closeLists();
    htmlParts.push(`<p>${escapeHtml(line)}</p>`);
  }

  closeLists();
  return htmlParts.join('');
}

function escapeHtml(s){
  return String(s || '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

/* =========================
   ONLY SEARCH: filter + render
========================= */
function applySearch(){
  const input = $(SEARCH_INPUT_ID);
  const q = normalizeStr(input?.value);

  filtered = POSTS.filter(p => {
    if(!q) return true;

    const hay = normalizeStr([
      p.title,
      p.desc,
      p.category,
      (Array.isArray(p.tags) ? p.tags.join(' ') : ''),
      p.content,
      p.html
    ].join(' | '));

    return hay.includes(q);
  });

  // новые сверху
  filtered.sort((a,b) => {
    const da = parseDate(a.date) || new Date(0);
    const db = parseDate(b.date) || new Date(0);
    return db - da;
  });

  render();
}

function render(){
  renderMeta();
  renderGrid();
  renderPager();
  if(window.lucide) lucide.createIcons();
}

function renderMeta(){
  const meta = $('resultsMeta');
  if(!meta) return;

  const total = filtered.length;
  const q = normalizeStr($(SEARCH_INPUT_ID)?.value);

  let line = `Знайдено: ${total}`;
  if(q) line += ` • Пошук: “${q}”`;

  meta.textContent = line;
}

function renderGrid(){
  const grid = $('postsGrid');
  if(!grid) return;

  grid.innerHTML = '';

  const start = (page - 1) * PER_PAGE;
  const slice = filtered.slice(start, start + PER_PAGE);

  if(!slice.length){
    grid.innerHTML = `
      <div style="
        grid-column: 1 / -1;
        background: rgba(255,255,255,0.03);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 18px;
        color: var(--muted);
        text-align:center;
      ">
        Нічого не знайдено. Спробуй інший запит.
      </div>
    `;
    return;
  }

  slice.forEach((p, idx) => {
    const card = document.createElement('article');
    card.className = 'post-card';

    const d = parseDate(p.date);
    const dateText = d ? formatUA(d) : '—';
    const readTime = Number(p.readTime || 0) ? `${p.readTime} хв` : '—';
    const views = Number(p.views || 0);

    const cover = p.cover || 'https://via.placeholder.com/1200x800?text=Samostroy+Blog';
    const badge = (p.badge || '').trim();

    card.innerHTML = `
      <img class="post-cover" src="${cover}" alt="${escapeHtml(p.title)}">
      <div class="post-body">
        <div class="post-top">
          <div class="post-cat">${escapeHtml(p.category || 'Без категорії')}</div>
          ${badge ? `<div class="post-badge">${escapeHtml(badge)}</div>` : ``}
        </div>

        <div class="post-title">${escapeHtml(p.title || 'Стаття')}</div>
        <div class="post-desc">${escapeHtml(p.desc || '')}</div>

        <div class="post-meta">
          <span><i data-lucide="calendar"></i> ${dateText}</span>
          <span><i data-lucide="clock"></i> ${readTime}</span>
          <span><i data-lucide="eye"></i> ${views}</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => openPostModal(p.slug));

    grid.appendChild(card);
    setTimeout(() => card.classList.add('show'), 50 + idx * 35);
  });
}

function renderPager(){
  const pager = $('pager');
  if(!pager) return;

  pager.innerHTML = '';
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  if(pages <= 1) return;

  const make = (label, p, isActive=false) => {
    const b = document.createElement('button');
    b.textContent = label;
    if(isActive) b.classList.add('active');
    b.addEventListener('click', () => {
      page = p;
      render();
      const sec = $('postsSection');
      if(sec) window.scrollTo({ top: sec.offsetTop - 110, behavior:'smooth' });
    });
    return b;
  };

  pager.appendChild(make('←', Math.max(1, page - 1)));

  const windowSize = 7;
  let start = Math.max(1, page - Math.floor(windowSize/2));
  let end = Math.min(pages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);

  for(let i=start; i<=end; i++){
    pager.appendChild(make(String(i), i, i === page));
  }

  pager.appendChild(make('→', Math.min(pages, page + 1)));
}

/* =========================
   MODAL + LOCK BODY SCROLL
========================= */
const postOverlay = $('postOverlay');
const postModal = $('postModal');
const postClose = $('postClose');

let savedScrollY = 0;

function lockBodyScroll(){
  savedScrollY = window.scrollY || 0;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${savedScrollY}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
  document.body.style.overflow = 'hidden';
}

function unlockBodyScroll(){
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.width = '';
  document.body.style.overflow = '';
  window.scrollTo(0, savedScrollY);
}

function openPostModal(slug){
  const p = POSTS.find(x => x.slug === slug);
  if(!p) return;

  $('postCover').src = p.cover || 'https://via.placeholder.com/1200x800?text=Samostroy+Blog';
  $('postCategory').textContent = p.category || 'Без категорії';
  $('postTitle').textContent = p.title || 'Стаття';
  $('postExcerpt').textContent = p.desc || '';

  const d = parseDate(p.date);
  const dateText = d ? formatUA(d) : '—';

  const tags = Array.isArray(p.tags) ? p.tags : [];
  const tagsText = tags.length ? tags.join(', ') : '—';

  $('postMeta').innerHTML = `
    <span><i data-lucide="calendar"></i> ${dateText}</span>
    <span><i data-lucide="clock"></i> ${Number(p.readTime||0) ? `${p.readTime} хв` : '—'}</span>
    <span><i data-lucide="tag"></i> ${escapeHtml(tagsText)}</span>
  `;

  if(p.html && String(p.html).trim()){
    $('postContent').innerHTML = p.html;
  } else {
    $('postContent').innerHTML = formatContent(p.content || '');
  }

  const url = new URL(window.location.href);
  url.hash = `post=${encodeURIComponent(slug)}`;
  history.replaceState(null, '', url.toString());

  postModal.classList.remove('hidden');
  postOverlay.classList.remove('hidden');

  lockBodyScroll(); // ✅ вот это убирает скролл “сзади”

  if(window.lucide) lucide.createIcons();
}

function closePostModal(){
  postModal.classList.add('hidden');
  postOverlay.classList.add('hidden');

  unlockBodyScroll(); // ✅ возвращаем скролл страницы

  const url = new URL(window.location.href);
  url.hash = '';
  history.replaceState(null, '', url.toString());
}

postClose?.addEventListener('click', closePostModal);
postOverlay?.addEventListener('click', closePostModal);

document.addEventListener('keydown', (e)=>{
  if(e.key === 'Escape') closePostModal();
});

$('copyLinkBtn')?.addEventListener('click', async ()=>{
  try{
    const u = new URL(window.location.href);
    await navigator.clipboard.writeText(u.toString());
    showToast('Посилання скопійовано ✅');
  }catch{
    showToast('Не вдалося скопіювати 😕');
  }
});

/* -------- Header / burger / consult -------- */
document.querySelectorAll('.js-consult').forEach(btn=>{
  btn.addEventListener('click', ()=> openTelegram('Потрібна консультація щодо матеріалів/ремонту'));
});

const burgerBtn = $('burgerBtn');
const mobileMenu = $('mobileMenu');

burgerBtn?.addEventListener('click', (e)=>{
  e.stopPropagation();
  mobileMenu?.classList.toggle('show');
});

document.querySelectorAll('.mobile-menu a').forEach(link=>{
  link.addEventListener('click', ()=> mobileMenu?.classList.remove('show'));
});

document.addEventListener('click', (e)=>{
  if(mobileMenu && burgerBtn){
    if(!mobileMenu.contains(e.target) && !burgerBtn.contains(e.target)){
      mobileMenu.classList.remove('show');
    }
  }
});

/* -------- Smooth scroll -------- */
document.querySelectorAll('a[href^="#"]').forEach(link=>{
  link.addEventListener('click', function(e){
    const href = this.getAttribute('href');
    const target = document.querySelector(href);
    if(!target) return;

    e.preventDefault();
    window.scrollTo({ top: target.offsetTop - 110, behavior:'smooth' });
  });
});

/* -------- Random post -------- */
$('randomPostBtn')?.addEventListener('click', ()=>{
  if(!POSTS.length) return;
  const p = POSTS[Math.floor(Math.random() * POSTS.length)];
  openPostModal(p.slug);
});

/* ✅ Search events (ONLY) */
$(SEARCH_INPUT_ID)?.addEventListener('input', ()=>{
  page = 1;
  applySearch();
});

/* -------- Load blog.json -------- */
async function loadPosts(){
  try{
    const res = await fetch(BLOG_JSON_URL, { cache:'no-store' });
    if(!res.ok) throw new Error('Bad status: ' + res.status);

    const posts = await res.json();
    POSTS = (Array.isArray(posts) ? posts : []).map((p, idx) => ({
      slug: p.slug || `post-${idx+1}`,
      title: p.title || 'Стаття',
      desc: p.desc || '',
      category: p.category || 'Інше',
      tags: Array.isArray(p.tags) ? p.tags : [],
      date: p.date || '',
      readTime: Number(p.readTime || 0),
      views: Number(p.views || 0),
      badge: p.badge || '',
      cover: p.cover || '',
      url: p.url || `blog.html#post=${encodeURIComponent(p.slug || `post-${idx+1}`)}`,
      content: p.content || '',
      html: p.html || ''
    }));
  }catch(err){
    console.error('Blog load error:', err);
    POSTS = [];
    showToast('Не вдалося завантажити blog.json');
  }
}

function initHashOpen(){
  const h = window.location.hash || '';
  const m = h.match(/post=([^&]+)/);
  if(m){
    const slug = decodeURIComponent(m[1]);
    const p = POSTS.find(x => x.slug === slug);
    if(p) openPostModal(slug);
  }
}

(async function init(){
  const yearSpan = $('year');
  if(yearSpan) yearSpan.textContent = new Date().getFullYear();

  await loadPosts();

  filtered = [...POSTS].sort((a,b)=>{
    const da = parseDate(a.date) || new Date(0);
    const db = parseDate(b.date) || new Date(0);
    return db - da;
  });

  render();
  hideLoader();

  if(window.lucide) lucide.createIcons();
  initHashOpen();
})();

/* ============================================================
   🟧 NEWYEAR START (REMOVE LATER)
============================================================ */
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
