#!/usr/bin/env python3
"""Генератор статичних сторінок Samostroy Shop (для пошуковиків і прев'ю в месенджерах).

Створює:
  p/<id>.html        — сторінка кожного товару (назва, ціна, фото, характеристики, опис, Product schema)
  c/<slug>.html      — сторінка кожної категорії зі списком товарів
  blog.html          — список статей; blog/<slug>.html — кожна стаття (з blog.json)
  reviews.html       — відгуки покупців (з reviews.json) і форма відгуку
  404.html           — сторінка «не знайдено»
  sitemap.xml, robots.txt, llms.txt
  catalog-report.json — звіт по каталогу для адмінки (зміни цін, наявності, нові товари)

Запуск: python3 tools/site.py [--changed файл]   (файл отримає список змінених адрес для IndexNow)
Запускається автоматично після кожної синхронізації фіду (.github/workflows/sync-feed.yml).
"""
import datetime
import hashlib
import html
import json
import os
import re
import sys
import urllib.parse
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://samostroy.shop/'
G = '{http://base.google.com/ns/1.0}'
NOW = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=2)))
TODAY = NOW.strftime('%Y-%m-%d')
TG = 'manager_samostroy_shop'
PHONE = '+380984927948'
SAME_AS = ['https://t.me/samostroy_shop', 'https://www.tiktok.com/@stroyshop_ua', 'https://www.instagram.com/samostroy.shop']
RETURNS_URL = SITE + 'povernennya.html'
RETURNS_UPDATED = '2026-11-01'   # дата редакції правил повернення (змінюйте разом із tools/povernennya.md)
# Політика повернення для Google: використаний товар не приймається; нерозпакований — 14 днів поштою,
# зворотна доставка за рахунок покупця; брак — безкоштовно.
RETURN_POLICY = {"@type": "MerchantReturnPolicy", "applicableCountry": "UA", "returnPolicyCountry": "UA",
                 "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow", "merchantReturnDays": 14,
                 "returnMethod": "https://schema.org/ReturnByMail", "itemCondition": "https://schema.org/NewCondition",
                 "refundType": "https://schema.org/FullRefund", "returnFees": "https://schema.org/ReturnFeesCustomerResponsibility",
                 "customerRemorseReturnFees": "https://schema.org/ReturnFeesCustomerResponsibility",
                 "itemDefectReturnFees": "https://schema.org/FreeReturn", "merchantReturnLink": RETURNS_URL}
CHANGED = []          # адреси, що змінилися (для IndexNow)
WRITTEN = set()       # файли, згенеровані цим запуском


def P(*a):
    return os.path.join(ROOT, *a)


def read(path):
    with open(P(path), encoding='utf-8') as f:
        return f.read()


def ver(path):
    with open(P(path), 'rb') as f:
        return hashlib.md5(f.read()).hexdigest()[:8]


def write(path, content, url=None):
    """Пише файл лише якщо вміст змінився; запам'ятовує змінену адресу для IndexNow."""
    WRITTEN.add(path)
    full = P(path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    old = None
    if os.path.exists(full):
        with open(full, encoding='utf-8') as f:
            old = f.read()
    if old == content:
        return False
    with open(full, 'w', encoding='utf-8') as f:
        f.write(content)
    # нова версія лише файлів стилів/скриптів (?v=…) — не зміна сторінки: не чіпаємо дату в карті сайту й не турбуємо пошуковики
    if url and not (old is not None and re.sub(r'\?v=[0-9a-f]{6,}', '', old) == re.sub(r'\?v=[0-9a-f]{6,}', '', content)):
        CHANGED.append(url)
    return True


e = lambda s: html.escape(str(s or ''), quote=True)
money = lambda n: f'{round(n):,}'.replace(',', ' ') + ' ₴'


def clip(s, n):
    s = re.sub(r'\s+', ' ', s or '').strip()
    return s if len(s) <= n else s[:n - 1].rsplit(' ', 1)[0].rstrip(',.;:—-') + '…'


def plural(n, one, few, many):
    a, b = n % 10, n % 100
    return one if a == 1 and b != 11 else few if 2 <= a <= 4 and not 12 <= b <= 14 else many


# ---------------------------------------------------------------- довідники з shop.js
JS = read('shop.js')
CATS = []      # (slug, group, ua, ru, regex)
for m in re.finditer(r"^\['([\w-]+)','(\w+)','([^']*)','([^']*)',/(.+)/\],?\s*$", JS, re.M):
    try:
        rx = re.compile(m.group(5))
    except re.error:
        rx = re.compile(re.escape(m.group(3).lower()))
    CATS.append((m.group(1), m.group(2), m.group(3), m.group(4), rx))
CAT = {c[0]: c for c in CATS}
GROUPS = json.loads(re.search(r"const GROUPS=(\[.*?\]);", JS).group(1).replace("'", '"'))
GNAME = {g[0]: g[1] for g in GROUPS}
ORDER = json.loads(re.sub(r'(\w+):\[', r'"\1":[', re.search(r"const ORDER=(\{.*?\});", JS).group(1)).replace("'", '"'))
SEO = {}
seo_src = JS[JS.index('const SEO={'):]
seo_src = seo_src[:seo_src.index('};') + 2]
for m in re.finditer(r"^'([\w:-]+)':\['(.*?)','(.*?)'\],?(?:\}\;)?\s*$", seo_src, re.M):
    SEO[m.group(1)] = (m.group(2), m.group(3))


def classify(name):
    low = name.lower()
    for c in CATS:
        if c[4].search(low):
            return c[0]
    return 'inshe'


# ---------------------------------------------------------------- опис: лише безпечні теги
class Clean(HTMLParser):
    OK = {'p': 'p', 'ul': 'ul', 'ol': 'ol', 'li': 'li', 'strong': 'strong', 'b': 'strong', 'em': 'em', 'i': 'em',
          'br': 'br', 'h1': 'h3', 'h2': 'h3', 'h3': 'h3', 'h4': 'h3', 'h5': 'h3', 'div': 'p', 'table': 'p', 'tr': 'p'}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out, self.stack = [], []

    def handle_starttag(self, tag, attrs):
        t = self.OK.get(tag)
        if not t:
            return
        if t == 'br':
            self.out.append('<br>')
            return
        self.out.append(f'<{t}>')
        self.stack.append(t)

    def handle_endtag(self, tag):
        t = self.OK.get(tag)
        if t and t != 'br' and t in self.stack:
            while self.stack:
                x = self.stack.pop()
                self.out.append(f'</{x}>')
                if x == t:
                    break

    def handle_data(self, data):
        self.out.append(html.escape(data, quote=False))

    def result(self):
        while self.stack:
            self.out.append(f'</{self.stack.pop()}>')
        s = ''.join(self.out)
        s = re.sub(r'<(p|h3|li)>\s*</\1>', '', s)
        s = re.sub(r'(<br>\s*){3,}', '<br><br>', s)
        return s.strip()


def clean_html(h):
    c = Clean()
    c.feed(h or '')
    return c.result()


def text_of(h):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', h or ''))).strip()


# ---------------------------------------------------------------- товари
def load_products():
    root = ET.parse(P('products.xml')).getroot()
    out = []
    for i, it in enumerate(root.iter('item')):
        f = lambda t: (it.findtext(G + t) or '').strip()
        raw = f('title')
        try:
            price = float(re.sub(r'[^\d.]', '', f('price')) or 0)
        except ValueError:
            price = 0
        if not raw or price <= 0:
            continue
        m = re.search(r'\s*(SW-\d+)-?\s*$', raw, re.I)
        name = raw[:m.start()].strip() if m else raw
        sku = m.group(1) if m else f('mpn')
        imgs = [x for x in [f('image_link')] + [(x.text or '').strip() for x in it.findall(G + 'additional_image_link')] if x]
        imgs = list(dict.fromkeys(imgs))
        par = []
        for d in it.findall(G + 'product_detail'):
            a, b = (d.findtext(G + 'product_name') or '').strip(), (d.findtext(G + 'product_value') or '').strip()
            if a and b:
                par.append((a, b))
        cat = f('cat') if f('cat') in CAT else classify(name)
        qty = f('quantity')
        out.append(dict(id=f('id') or f'p{i}', name=name, sku=sku, price=price, imgs=imgs,
                        av='out' not in f('availability').lower(), cat=cat, par=par, brand=f('brand'),
                        desc=f('description'), qty=int(qty) if qty.lstrip('-').isdigit() else None,
                        ptype=f('product_type'), sale=bool(re.search(r'уцінк|уценк', name, re.I)), i=i,
                        n=int((re.search(r'\d+', sku or '') or [0])[0]) if sku else 0))
    return out


# ---------------------------------------------------------------- оболонка сторінки
SHELL = read('tools/shell.html')
TOP = SHELL.split('<!--TOP-->')[1].split('<!--BOTTOM-->')[0].strip()
BOTTOM = SHELL.split('<!--BOTTOM-->')[1].split('<!--END-->')[0].strip()
V = {k: ver(k) for k in ('shop.css', 'shop.js', 'config.js', 'page.css', 'page.js')}
ORG = {"@type": "OnlineStore", "@id": SITE + "#store", "name": "Samostroy Shop", "url": SITE,
       "logo": SITE + "samostroy-shop-logo.jpg", "image": SITE + "og/home.jpg", "telephone": PHONE,
       "description": "Матеріали для ремонту своїми руками: самоклеючі 3D панелі, PET, вінілова й алюмінієва плитка, плівка, шпалери, підлога-пазл, екошкіра, дзеркала.",
       "areaServed": "UA", "currenciesAccepted": "UAH", "paymentAccepted": "Cash on delivery, Card",
       "address": {"@type": "PostalAddress", "addressCountry": "UA"}, "sameAs": SAME_AS}


def head(title, desc, url, img, w=1200, h=630, alt='', typ='website', extra='', robots='index,follow,max-image-preview:large', css=''):
    return f'''<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<base href="/">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="robots" content="{robots}">
<link rel="canonical" href="{e(url)}">
<meta name="theme-color" content="#2b3138">
<meta property="og:type" content="{typ}">
<meta property="og:site_name" content="Samostroy Shop">
<meta property="og:locale" content="uk_UA">
<meta property="og:locale:alternate" content="ru_UA">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{e(url)}">
<meta property="og:image" content="{e(img)}">
<meta property="og:image:width" content="{w}">
<meta property="og:image:height" content="{h}">
<meta property="og:image:alt" content="{e(alt or title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(title)}">
<meta name="twitter:description" content="{e(desc)}">
<meta name="twitter:image" content="{e(img)}">
<link rel="icon" type="image/png" href="favicon.png">
<link rel="apple-touch-icon" href="favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://kabinet.dropoffice.com.ua">
<link href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600&family=Unbounded:wght@500;700&display=swap" rel="stylesheet">
{extra}
<script type="application/ld+json" id="ld"></script>
<link rel="stylesheet" href="shop.css?v={V['shop.css']}">
<link rel="stylesheet" href="page.css?v={V['page.css']}">{css}
</head>'''


def ld(*items):
    return '<script type="application/ld+json">' + json.dumps({"@context": "https://schema.org", "@graph": [ORG] + list(items)}, ensure_ascii=False) + '</script>'


def crumbs_ld(items):
    return {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate(items)]}


def crumbs_html(items):
    return '<nav class="crumbs" aria-label="Breadcrumb">' + ''.join(
        f'<span><a href="{e(u.replace(SITE, "") or "./")}">{e(n)}</a></span>' if i < len(items) - 1 else f'<span>{e(n)}</span>'
        for i, (n, u) in enumerate(items)) + '</nav>'


def page(hd, main, name, title, desc, url, scripts='', noindex=False):
    pg = {"cats": [], "name": name, "listTitle": name, "url": url, "title": title, "desc": desc, "info": True, "faq": []}
    if noindex:
        pg["noindex"] = True
    return (hd + '\n<body>' + TOP[len('<body>'):] + '\n' + main + '\n' + BOTTOM +
            f'\n<script src="config.js?v={V["config.js"]}"></script>\n<script>window.PAGE={json.dumps(pg, ensure_ascii=False)}</script>\n'
            f'<script src="shop.js?v={V["shop.js"]}"></script>\n<script src="page.js?v={V["page.js"]}"></script>{scripts}\n</body>\n</html>\n')


def card(p):
    """Статична картка товару: посилання на сторінку товару + кнопка «У кошик»."""
    img = p['imgs'][0] if p['imgs'] else ''
    return (f'<article class="sc"><a href="p/{e(p["id"])}.html"><span class="im"><img loading="lazy" decoding="async" src="{e(img)}" alt="{e(p["name"])}" width="400" height="400"></span>'
            f'<b>{e(p["name"])}</b></a><div class="sc-f"><span class="sc-p">{money(p["price"])}</span>'
            + (f'<button type="button" class="btn sm" data-add="{e(p["id"])}">У кошик</button>' if p['av'] else '<span class="sc-out">Немає в наявності</span>')
            + '</div></article>')


# ---------------------------------------------------------------- сторінка товару
UNITS = {'Ширина': ' мм', 'Довжина': ' мм', 'Висота': ' мм', 'Товщина': ' мм', 'Глибина': ' мм',
         'Площа, що покривається панеллю': ' м²', 'Площа, що покривається пачкою': ' м²'}


def product_page(p, by_cat, art_by_cat):
    c = CAT.get(p['cat'], ('inshe', 'dim', 'Інше', 'Другое', None))
    grp = c[1]
    url = f'{SITE}p/{p["id"]}.html'
    img = p['imgs'][0] if p['imgs'] else SITE + 'og/home.jpg'
    avt = 'В наявності' if p['av'] else 'Немає в наявності'
    title = clip(f'{p["name"]} — купити, ціна {money(p["price"])}', 95)
    desc_txt = text_of(p['desc'])
    desc = clip(f'{p["name"]}. Ціна {money(p["price"])}, {avt.lower()}. Відправка в день замовлення по Україні, оплата при отриманні. '
                + (f'Артикул {p["sku"]}. ' if p['sku'] else '') + desc_txt, 200)
    cr = [('Головна', SITE), (GNAME.get(grp, 'Каталог'), f'{SITE}?g={grp}'), (c[2], f'{SITE}c/{c[0]}.html'), (p['name'], url)]
    offer = {"@type": "Offer", "url": url, "priceCurrency": "UAH", "price": f'{p["price"]:.2f}',
             "availability": "https://schema.org/" + ("InStock" if p['av'] else "OutOfStock"),
             "itemCondition": "https://schema.org/NewCondition", "seller": {"@id": SITE + "#store"},
             "priceValidUntil": f'{NOW.year + 1}-12-31',
             "shippingDetails": {"@type": "OfferShippingDetails", "shippingDestination": {"@type": "DefinedRegion", "addressCountry": "UA"},
                                 "deliveryTime": {"@type": "ShippingDeliveryTime", "handlingTime": {"@type": "QuantitativeValue", "minValue": 0, "maxValue": 1, "unitCode": "DAY"},
                                                  "transitTime": {"@type": "QuantitativeValue", "minValue": 1, "maxValue": 3, "unitCode": "DAY"}}},
             "hasMerchantReturnPolicy": RETURN_POLICY}
    prod = {"@type": "Product", "@id": url + "#product", "name": p['name'], "sku": p['sku'] or p['id'], "mpn": p['sku'] or p['id'],
            "image": p['imgs'][:8], "description": clip(desc_txt or p['name'], 1000), "category": c[2],
            "brand": {"@type": "Brand", "name": p['brand'] or 'Samostroy Shop'}, "offers": offer}
    extra = ld(crumbs_ld(cr), prod) + f'''
<meta property="product:price:amount" content="{p["price"]:.2f}">
<meta property="product:price:currency" content="UAH">
<meta property="product:availability" content="{'in stock' if p['av'] else 'out of stock'}">
<meta property="product:condition" content="new">'''
    hd = head(title, desc, url, img, 1200, 1200, p['name'], 'product', extra)
    pars = [(a, b + (UNITS[a] if a in UNITS and re.fullmatch(r'[\d.,\s]+', b) else '')) for a, b in p['par'] if a not in ('Стан',)]
    if p['brand']:
        pars.insert(0, ('Бренд', p['brand']))
    if p['sku']:
        pars.insert(0, ('Артикул', p['sku']))
    rel = [x for x in by_cat.get(p['cat'], []) if x['id'] != p['id'] and x['av']][:6]
    arts = art_by_cat.get(p['cat'], [])[:3] or art_by_cat.get('g:' + grp, [])[:3]
    low = f'<span class="pp-low">Залишилось {p["qty"]} шт.</span>' if p['av'] and p['qty'] and 0 < p['qty'] <= 10 else ''
    tgtext = f'Вітаю! Питання щодо товару: {p["name"]}' + (f' ({p["sku"]})' if p['sku'] else '') + f'\n{url}'
    thumbs = ''.join(f'<button type="button" class="{"on" if i == 0 else ""}" data-big="{e(s)}" aria-label="Фото {i + 1}"><img loading="lazy" src="{e(s)}" alt="" width="80" height="80"></button>' for i, s in enumerate(p['imgs'][:10]))
    main = f'''<main id="top" class="pp-page">
<div class="w">
{crumbs_html(cr)}
<article class="pp">
 <div class="pp-gal">
  <img class="pp-main" id="ppMain" src="{e(img)}" alt="{e(p['name'])}" width="800" height="800" fetchpriority="high">
  {f'<div class="pp-th">{thumbs}</div>' if len(p['imgs']) > 1 else ''}
 </div>
 <div class="pp-info">
  <h1>{e(p['name'])}</h1>
  <p class="pp-av {'ok' if p['av'] else 'no'}">{avt}{low}{f' <span class="soft">· Артикул {e(p["sku"])}</span>' if p['sku'] else ''}</p>
  <div class="pp-price">{money(p['price'])}</div>
  <div class="pp-acts">
   {f'<button type="button" class="btn" data-add="{e(p["id"])}">У кошик</button>' if p['av'] else ''}
   <a class="btn ghost" href="https://t.me/{TG}?text={e(tgtext)}" target="_blank" rel="noopener">{'Запитати менеджера' if p['av'] else 'Дізнатися про надходження'}</a>
   <button type="button" class="btn ghost pp-share" data-share="{e(url)}" data-title="{e(p['name'])}" aria-label="Поділитися">Поділитися</button>
  </div>
  <ul class="pp-g"><li>Відправка в день замовлення Новою Поштою або Укрпоштою</li><li>Оплата при отриманні з оглядом на відділенні</li><li>Допоможемо порахувати кількість під ваші розміри</li></ul>
  {f'<h2 class="pp-h">Характеристики</h2><dl class="params">' + ''.join(f'<dt>{e(a)}</dt><dd>{e(b)}</dd>' for a, b in pars) + '</dl>' if pars else ''}
 </div>
</article>
{f'<section class="pp-sec"><h2>Опис</h2><div class="desc pp-desc">{clean_html(p["desc"])}</div></section>' if p['desc'] else ''}
{f'<section class="pp-sec"><h2>Схожі товари</h2><div class="sg">' + ''.join(card(x) for x in rel) + f'</div><p class="pp-more"><a class="btn ghost" href="c/{c[0]}.html">Усі товари: {e(c[2])}</a></p></section>' if rel else ''}
{f'<section class="pp-sec"><h2>Корисні статті</h2><div class="bl-mini">' + ''.join(f'<a href="blog/{a["slug"]}.html"><b>{e(a["title"])}</b><span>{e(a["desc"])}</span></a>' for a in arts) + '</div></section>' if arts else ''}
</div>
</main>'''
    return page(hd, main, p['name'], title, desc, url)


# ---------------------------------------------------------------- сторінка категорії
def category_page(slug, items, art_by_cat):
    c = CAT[slug]
    grp = c[1]
    url = f'{SITE}c/{slug}.html'
    av = [x for x in items if x['av']]
    items = sorted(items, key=lambda x: (not x['av'], x['sale'], x['i']))
    minp = min((x['price'] for x in av), default=0)
    seo = SEO.get(slug)
    h1 = seo[0] if seo else c[2]
    title = clip(f'{h1} — купити в Україні, ціна від {money(minp)}', 90) if minp else h1
    desc = clip(f'{h1}: {len(av)} {plural(len(av), "товар", "товари", "товарів")} у наявності, ціни від {money(minp)}. '
                'Відправка в день замовлення, оплата при отриманні, допомога з розрахунком кількості. ' + text_of(seo[1] if seo else ''), 200)
    img = next((x['imgs'][0] for x in av if x['imgs']), SITE + 'og/home.jpg')
    cr = [('Головна', SITE), (GNAME.get(grp, 'Каталог'), f'{SITE}?g={grp}'), (c[2], url)]
    lst = {"@type": "CollectionPage", "name": h1, "url": url, "description": desc, "inLanguage": "uk",
           "mainEntity": {"@type": "ItemList", "numberOfItems": len(items),
                          "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": f'{SITE}p/{x["id"]}.html', "name": x['name']} for i, x in enumerate(items[:30])]}}
    hd = head(title, desc, url, img, 1200, 1200, h1, extra=ld(crumbs_ld(cr), lst))
    sibs = [s for s in ORDER.get(grp, []) if s in CAT and s != slug and s != 'inshe']
    arts = art_by_cat.get(slug, [])[:4] or art_by_cat.get('g:' + grp, [])[:4]
    main = f'''<main id="top" class="cp-page">
<div class="w">
{crumbs_html(cr)}
<header class="cp-h"><h1>{e(h1)}</h1>
<p class="cp-meta">{len(av)} {plural(len(av), "товар", "товари", "товарів")} у наявності{f' · від {money(minp)}' if minp else ''} · <a href="?c={slug}">Відкрити з фільтрами й сортуванням</a></p></header>
{f'<nav class="cp-sib" aria-label="Інші категорії">' + ''.join(f'<a href="c/{s}.html">{e(CAT[s][2])}</a>' for s in sibs) + '</nav>' if sibs else ''}
<div class="sg">{''.join(card(x) for x in items)}</div>
{f'<section class="cp-seo txt">{seo[1]}</section>' if seo else ''}
{f'<section class="pp-sec"><h2>Корисні статті</h2><div class="bl-mini">' + ''.join(f'<a href="blog/{a["slug"]}.html"><b>{e(a["title"])}</b><span>{e(a["desc"])}</span></a>' for a in arts) + '</div></section>' if arts else ''}
</div>
</main>'''
    return page(hd, main, c[2], title, desc, url)


# ---------------------------------------------------------------- блог
def md(src):
    """Мінімальний Markdown: ## / ###, абзаци, - списки, 1. списки, > порада, **жирний**, [посилання](url)."""
    def inline(s):
        s = html.escape(s, quote=False)
        s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
        s = re.sub(r'\[([^\]]+)\]\(([^)\s]+)\)', lambda m: f'<a href="{m.group(2)}">{m.group(1)}</a>', s)
        return s
    out, lst, para = [], None, []

    def flush():
        nonlocal lst, para
        if para:
            out.append('<p>' + inline(' '.join(para)) + '</p>')
            para = []
        if lst:
            out.append(f'</{lst}>')
            lst = None
    for line in src.replace('\r', '').split('\n'):
        s = line.strip()
        if not s:
            flush()
            continue
        if s.startswith('### '):
            flush(); out.append(f'<h3>{inline(s[4:])}</h3>'); continue
        if s.startswith('## '):
            flush(); out.append(f'<h2>{inline(s[3:])}</h2>'); continue
        if s.startswith('> '):
            flush(); out.append(f'<div class="ba-tip">{inline(s[2:])}</div>'); continue
        m = re.match(r'^(-|\d+\.)\s+(.*)', s)
        if m:
            t = 'ul' if m.group(1) == '-' else 'ol'
            if para:
                out.append('<p>' + inline(' '.join(para)) + '</p>'); para = []
            if lst != t:
                if lst:
                    out.append(f'</{lst}>')
                out.append(f'<{t}>'); lst = t
            out.append(f'<li>{inline(m.group(2))}</li>')
            continue
        if lst:
            out.append(f'</{lst}>'); lst = None
        para.append(s)
    flush()
    return '\n'.join(out)


def clean_articles(raw):
    """Пропускає статті з помилками в blog.json, щоб одна бита стаття не зупинила оновлення всього сайту."""
    out, seen = [], set()
    for i, a in enumerate(raw if isinstance(raw, list) else []):
        try:
            assert isinstance(a, dict)
            for k in ('slug', 'title', 'desc', 'category', 'date', 'body'):
                assert isinstance(a.get(k), str) and a[k].strip(), k
            assert re.fullmatch(r'[a-z0-9]+(-[a-z0-9]+)*', a['slug']), 'slug'
            assert a['slug'] not in seen, 'дубль slug'
            datetime.date.fromisoformat(a['date'])
            a['cats'] = [c for c in a.get('cats') or [] if isinstance(c, str) and c in CAT]
            a['tags'] = [t for t in a.get('tags') or [] if isinstance(t, str)]
            a['faq'] = [[str(q), str(x)] for q, x in (a.get('faq') or []) if q and x]
            if a.get('links'):
                a['links'] = [(str(u), str(t)) for u, t in a['links'] if u and t]
        except Exception as ex:
            print(f'blog.json: статтю №{i + 1} ({a.get("slug") if isinstance(a, dict) else "?"}) пропущено — {ex}', file=sys.stderr)
            continue
        seen.add(a['slug'])
        out.append(a)
    return out


SHARE_ICON = '<svg class="i" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>'


def share_bar(a, url):
    """Кнопки «Поділитися» під статтею для всіх відвідувачів: звичайні посилання (працюють і без JavaScript),
    на телефоні — ще й системне меню «Поділитися». До адреси додається коротка мітка ?ref=…, щоб в аналітиці
    було видно замовлення з поділених статей (canonical сторінки лишається без мітки — для Google це та сама сторінка)."""
    q = lambda s: urllib.parse.quote(s, safe='')
    t = a['title']
    img = SITE + cover(a)
    r = lambda code: f'{url}?ref={code}'
    nets = [('Telegram', 'tg', f'https://t.me/share/url?url={q(r("tg"))}&text={q(t)}'),
            ('Viber', 'vb', f'viber://forward?text={q(t + chr(10) + r("vb"))}'),
            ('Facebook', 'fb', f'https://www.facebook.com/sharer/sharer.php?u={q(r("fb"))}'),
            ('WhatsApp', 'wa', f'https://wa.me/?text={q(t + chr(10) + r("wa"))}'),
            ('Threads', 'th', f'https://www.threads.net/intent/post?text={q(t + chr(10) + r("th"))}'),
            ('Pinterest', 'pin', f'https://pinterest.com/pin/create/button/?url={q(r("pin"))}&media={q(img)}&description={q(t)}'),
            ('LinkedIn', 'li', f'https://www.linkedin.com/sharing/share-offsite/?url={q(r("li"))}'),
            ('X', 'x', f'https://x.com/intent/post?url={q(r("x"))}&text={q(t)}'),
            ('Email', 'mail', f'mailto:?subject={q(t)}&body={q(a["desc"] + chr(10) + chr(10) + r("mail"))}')]
    return (f'<section class="ba-share" id="share" aria-label="Поділитися статтею"><b>Сподобалась стаття? Поділіться з тими, хто робить ремонт</b><div class="ba-sh">'
            + f'<button type="button" class="ba-nat" data-native data-title="{e(t)}" data-text="{e(a["desc"])}" data-url="{e(r("app"))}" hidden>{SHARE_ICON}Поділитися…</button>'
            + ''.join(f'<a href="{e(u)}" data-sh="{n}" target="_blank" rel="noopener nofollow">{n}</a>' for n, c, u in nets)
            + f'<button type="button" data-copyshare data-title="{e(t)}" data-url="{e(r("link"))}">Копіювати посилання</button></div></section>'
            + f'<div id="baTools" data-slug="{e(a["slug"])}" data-src="share-tools.js?v={ver("share-tools.js") if os.path.exists(P("share-tools.js")) else "1"}" hidden></div>')


def read_time(a):
    words = len(re.findall(r'\w+', a['body'] + ' '.join(q + ' ' + x for q, x in a.get('faq', []))))
    return max(2, round(words / 180))


def cover(a):
    return f'blog/img/{a["slug"]}.jpg' if os.path.exists(P('blog', 'img', a['slug'] + '.jpg')) else 'og/blog.jpg'


def blog_card(a, h='h3'):
    return (f'<a class="bl-card" href="blog/{a["slug"]}.html" data-c="{e(a["category"])}" data-s="{e((a["title"] + " " + a["desc"] + " " + " ".join(a.get("tags", []))).lower())}">'
            f'<span class="im"><img loading="lazy" decoding="async" src="{cover(a)}" alt="" width="600" height="315"></span>'
            f'<span class="tx"><em>{e(a["category"])} · {a["rt"]} хв</em><{h}>{e(a["title"])}</{h}><span>{e(a["desc"])}</span></span></a>')


def article_page(a, arts, by_cat):
    url = f'{SITE}blog/{a["slug"]}.html'
    img = SITE + cover(a)
    title = a.get('seo_title') or a['title']
    cr = [('Головна', SITE), ('Блог', SITE + 'blog.html'), (a['title'], url)]
    post = {"@type": "BlogPosting", "@id": url + "#article", "headline": clip(a['title'], 110), "description": a['desc'], "image": img,
            "datePublished": a['date'], "dateModified": a.get('updated', a['date']), "inLanguage": "uk", "url": url,
            "author": {"@type": "Organization", "name": "Samostroy Shop", "url": SITE}, "publisher": {"@id": SITE + "#store"},
            "mainEntityOfPage": url, "articleSection": a['category'], "keywords": ', '.join(a.get('tags', [])), "wordCount": len(re.findall(r'\w+', a['body']))}
    items = [crumbs_ld(cr), post]
    if a.get('faq'):
        items.append({"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": x}} for q, x in a['faq']]})
    extra = ld(*items) + f'\n<meta property="article:published_time" content="{a["date"]}">\n<meta property="article:section" content="{e(a["category"])}">'
    hd = head(title, a['desc'], url, img, 1200, 630, a['title'], 'article', extra)
    prods = []
    for cslug in a.get('cats', []):
        prods += [x for x in by_cat.get(cslug, []) if x['av'] and x['imgs']][:4]
    prods = prods[:4]
    rel = [x for x in arts if x['slug'] != a['slug'] and (x['category'] == a['category'] or set(x.get('cats', [])) & set(a.get('cats', [])))][:3]
    if len(rel) < 3:
        rel += [x for x in arts if x['slug'] != a['slug'] and x not in rel][:3 - len(rel)]
    links = a.get('links') or ([(f'c/{a["cats"][0]}.html', f'Дивитися товари: {CAT[a["cats"][0]][2]}')] if a.get('cats') and by_cat.get(a['cats'][0]) else [])
    faq = ''.join(f'<details><summary>{e(q)}</summary><p>{e(x)}</p></details>' for q, x in a.get('faq', []))
    d = datetime.date.fromisoformat(a['date'])
    months = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня']
    main = f'''<main id="top" class="ba-page">
<div class="w">
{crumbs_html(cr)}
<article class="ba">
 <p class="ba-m">{e(a['category'])} · <time datetime="{a['date']}">{d.day} {months[d.month - 1]} {d.year}</time> · {a['rt']} хв читання</p>
 <h1>{e(a['title'])}</h1>
 <p class="lead">{e(a['desc'])}</p>
 <div class="ba-top"><a class="ba-tsh" href="#share" data-topshare data-title="{e(a['title'])}" data-text="{e(a['desc'])}" data-url="{e(url)}?ref=app">{SHARE_ICON}Поділитися</a></div>
 <img class="ba-cover" src="{cover(a)}" alt="{e(a['title'])}" width="1200" height="630">
 <div class="ba-txt">{md(a['body'])}</div>
 {f'<section class="faq ba-faq"><h2>Питання й відповіді</h2>{faq}</section>' if faq else ''}
 {share_bar(a, url)}
 <aside class="ba-ask"><div><b>{e(a.get('cta_title') or 'Підберемо матеріал під ваш ремонт')}</b><span>{e(a.get('cta_text') or 'Надішліть фото чи розміри — менеджер порахує кількість і підкаже, що підійде.')}</span></div>
  <div class="acts"><a class="btn" href="https://t.me/{TG}?text={e('Вітаю! Прочитав(ла) статтю «' + a['title'] + '». Питання:')}" target="_blank" rel="noopener">Написати в Telegram</a>{''.join(f'<a class="btn ghost" href="{e(u)}">{e(t)}</a>' for u, t in links)}</div></aside>
</article>
{f'<section class="pp-sec"><h2>Товари до статті</h2><div class="sg">' + ''.join(card(x) for x in prods) + '</div></section>' if prods else ''}
{f'<section class="pp-sec"><h2>Читайте також</h2><div class="bl-grid">' + ''.join(blog_card(x) for x in rel) + '</div></section>' if rel else ''}
</div>
</main>'''
    return page(hd, main, 'Блог', title, a['desc'], url)


def blog_index(arts):
    url = SITE + 'blog.html'
    title = 'Блог Samostroy Shop — ремонт своїми руками: інструкції й поради'
    desc = 'Як обрати й поклеїти 3D панелі, PET і вінілову плитку, плівку, шпалери, екошкіру й дзеркала. Розрахунок кількості, підготовка поверхні, а також дропшипінг, опт і співпраця.'
    cats = {}
    for a in arts:
        cats[a['category']] = cats.get(a['category'], 0) + 1
    lst = {"@type": "Blog", "name": "Блог Samostroy Shop", "url": url, "inLanguage": "uk", "publisher": {"@id": SITE + "#store"},
           "blogPost": [{"@type": "BlogPosting", "headline": clip(a['title'], 110), "url": f'{SITE}blog/{a["slug"]}.html', "datePublished": a['date']} for a in arts[:40]]}
    hd = head(title, desc, url, SITE + 'og/blog.jpg', alt='Блог Samostroy Shop', extra=ld(crumbs_ld([('Головна', SITE), ('Блог', url)]), lst))
    main = f'''<main id="top" class="bl-page">
<section class="w hero lhero bl-hero">
 <div>
  {crumbs_html([('Головна', SITE), ('Блог', url)])}
  <h1>Блог: ремонт своїми руками</h1>
  <p class="lead">Короткі практичні інструкції: як обрати матеріал, підготувати поверхню, поклеїти без майстра й не помилитися з кількістю. А ще — як заробляти на продажу товарів для ремонту.</p>
 </div>
 <div class="bl-search"><label class="bl-s"><svg class="i"><use href="#i-search"/></svg><input type="search" id="blQ" placeholder="Пошук: плівка, фартух, ванна, дропшипінг" aria-label="Пошук статей"></label><p class="soft">Не знайшли відповідь? <a href="https://t.me/{TG}" target="_blank" rel="noopener">Напишіть менеджеру</a> — підкажемо.</p></div>
</section>
<section class="w bl-list">
 <div class="bl-cats" id="blCats"><button type="button" class="on" data-cat="">Усі <i>{len(arts)}</i></button>{''.join(f'<button type="button" data-cat="{e(k)}">{e(k)} <i>{n}</i></button>' for k, n in sorted(cats.items(), key=lambda x: -x[1]))}</div>
 <p class="bl-cnt" id="blCnt" aria-live="polite"></p>
 <div class="bl-grid" id="blGrid">{''.join(blog_card(a, 'h2') for a in arts)}</div>
 <p class="bl-empty" id="blEmpty" hidden>Нічого не знайдено. Спробуйте інше слово.</p>
</section>
</main>'''
    return page(hd, main, 'Блог', title, desc, url)


# ---------------------------------------------------------------- відгуки
def udate(iso):
    """2026-11-01 → 1 листопада 2026"""
    try:
        d = datetime.date.fromisoformat(str(iso)[:10])
    except ValueError:
        return iso
    return f"{d.day} {['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'][d.month - 1]} {d.year}"


def stars(n):
    n = max(1, min(5, int(n or 5)))
    return f'<span class="stars" aria-label="Оцінка {n} з 5">' + '★' * n + f'<i>{"★" * (5 - n)}</i></span>'


def reviews_page():
    try:
        revs = [r for r in json.loads(read('reviews.json')) if r.get('text')]
    except Exception:
        revs = []
    revs.sort(key=lambda r: r.get('date', ''), reverse=True)
    url = SITE + 'reviews.html'
    avg = sum(int(r.get('rating', 5)) for r in revs) / len(revs) if revs else 0
    title = 'Відгуки покупців Samostroy Shop' + (f' — {avg:.1f} з 5'.replace('.', ',') if revs else '')
    desc = (f'{len(revs)} {plural(len(revs), "відгук", "відгуки", "відгуків")} покупців про самоклеючі матеріали для ремонту, доставку й сервіс Samostroy Shop. Залиште свій відгук.'
            if revs else 'Відгуки покупців Samostroy Shop про самоклеючі матеріали для ремонту, доставку й сервіс. Купували в нас? Залиште відгук — ми читаємо кожен.')
    hd = head(title, desc, url, SITE + 'og/reviews.jpg', alt='Відгуки покупців Samostroy Shop',
              extra=ld(crumbs_ld([('Головна', SITE), ('Відгуки', url)]), {"@type": "WebPage", "name": title, "url": url, "description": desc, "inLanguage": "uk"}))
    lst = ''.join(f'''<article class="rv"><header><b>{e(r.get('name') or 'Покупець')}</b>{f'<span class="soft">{e(r.get("city"))}</span>' if r.get('city') else ''}{stars(r.get('rating'))}</header>
<p>{e(r['text'])}</p>{f'<p class="rv-p">Товар: {e(r.get("product"))}</p>' if r.get('product') else ''}{f'<div class="rv-a"><b>Відповідь магазину</b><p>{e(r.get("answer"))}</p></div>' if r.get('answer') else ''}<time datetime="{e(r.get('date', ''))}">{e(udate(r.get('date', '')))}</time></article>''' for r in revs)
    main = f'''<main id="top" class="rv-page">
<section class="w hero lhero rv-hero">
 <div>
  {crumbs_html([('Головна', SITE), ('Відгуки', url)])}
  <h1>Відгуки покупців</h1>
  <p class="lead">Що кажуть покупці про матеріали, доставку й допомогу з вибором. Ми публікуємо всі відгуки про реальні замовлення — і позитивні, і критичні.</p>
  <div class="acts"><a class="btn" href="reviews.html#write">Залишити відгук</a><a class="btn ghost" href="./">До каталогу</a></div>
 </div>
 <div class="rv-sum">{f'<b>{avg:.1f}</b>'.replace('.', ',') + f'{stars(round(avg))}<span>{len(revs)} {plural(len(revs), "відгук", "відгуки", "відгуків")}</span>' if revs else '<b>Будьте першим</b><span>Купували в нас? Розкажіть, як усе пройшло, — це допоможе іншим покупцям.</span>'}</div>
</section>
<section class="w rv-list" id="list">{lst or '<p class="rv-empty">Поки що тут порожньо — ми лише почали збирати відгуки на сайті. Ваш може стати першим.</p>'}</section>
<section class="w sec" id="write">
 <div class="apply">
  <div><h2>Залишити відгук</h2><p class="lead2">Розкажіть про товар, доставку чи консультацію. Відгук з’явиться на сайті після перевірки менеджером — зазвичай протягом дня.</p>
   <ol><li>Оцініть від 1 до 5</li><li>Опишіть, що купували й як усе пройшло</li><li>Додайте фото результату — надішліть його менеджеру в Telegram</li></ol></div>
  <form class="af" id="rvForm" novalidate>
   <fieldset class="full"><legend>Оцінка</legend><div class="rv-rate" role="radiogroup" aria-label="Оцінка">{''.join(f'<label><input type="radio" name="rate" value="{i}"{" checked" if i == 5 else ""}><span>★</span></label>' for i in range(5, 0, -1))}</div></fieldset>
   <label>Ім’я<input id="rvName" autocomplete="given-name" required></label>
   <label>Місто (необов’язково)<input id="rvCity" autocomplete="address-level2"></label>
   <label class="full">Телефон — не публікується, лише щоб підтвердити покупку<input id="rvPhone" type="tel" autocomplete="tel" inputmode="tel" placeholder="+380" required></label>
   <label class="full">Що купували (необов’язково)<input id="rvProd" placeholder="Напр.: 3D панелі під цеглу, PET плитка"></label>
   <label class="full">Ваш відгук<textarea id="rvText" required minlength="10" placeholder="Як вам товар, доставка й спілкування з менеджером?"></textarea></label>
   <input id="rvHp" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
   <div class="hint full" id="rvHint"></div>
   <button class="btn" id="rvBtn" type="submit">Надіслати відгук</button>
   <p class="note2">Публікуємо ім’я, місто, оцінку й текст. Телефон бачить лише менеджер.</p>
  </form>
 </div>
</section>
</main>'''
    return page(hd, main, 'Відгуки', title, desc, url)


RETURNS_FAQ = [
    ('Я зняв плівку з однієї панелі, щоб перевірити клей. Решту можна повернути?',
     'Панель зі знятою плівкою повернути не можна. Інші — так, якщо вони в цілій заводській упаковці, не розпаковувались і з дня отримання минуло не більше 14 днів. Зворотну доставку оплачує покупець.'),
    ('Після ремонту залишилися зайві панелі. Їх можна повернути?',
     'Якщо вони не розпаковані, упаковка ціла й з дня отримання минуло не більше 14 днів — так. Розпаковані чи нарізані залишки не повертаються.'),
    ('Колір виявився не таким, як на фото. Що робити?',
     'Якщо прийшла інша модель чи колір, ніж ви замовили, — замінимо за наш рахунок. Незначна різниця відтінку з фото на екрані не є браком; нерозпакований товар у такому разі можна повернути протягом 14 днів, оплативши зворотну доставку.'),
    ('Хто оплачує доставку при поверненні?',
     'Якщо товар бракований, не той, що ви замовили, або пошкоджений у дорозі — доставку в обидва боки оплачуємо ми. Якщо нерозпакований товар просто не підійшов — зворотну доставку оплачує покупець.'),
    ('Коли я отримаю гроші?',
     'Протягом 7 днів після того, як ми отримаємо й перевіримо товар. Кошти повертаємо на вашу банківську картку.'),
]


def returns_page():
    url = RETURNS_URL
    title = 'Обмін і повернення товару — Samostroy Shop'
    desc = ('Умови обміну й повернення самоклеючих матеріалів у Samostroy Shop: використаний товар не повертається, '
            'брак і пересорт замінюємо за свій рахунок, огляд на відділенні перед оплатою, строки й порядок повернення коштів.')
    cr = [('Головна', SITE), ('Обмін і повернення', url)]
    store = {"@type": "OnlineStore", "@id": SITE + "#store", "name": "Samostroy Shop", "url": SITE, "telephone": PHONE,
             "hasMerchantReturnPolicy": RETURN_POLICY}
    web = {"@type": "WebPage", "@id": url + "#page", "name": 'Обмін і повернення товару', "url": url, "description": desc,
           "inLanguage": "uk", "dateModified": RETURNS_UPDATED, "about": {"@id": SITE + "#store"}}
    faq_ld = {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": x}} for q, x in RETURNS_FAQ]}
    hd = head(title, desc, url, SITE + 'og/povernennya.jpg', alt='Обмін і повернення — Samostroy Shop', extra=ld(crumbs_ld(cr), web, store, faq_ld))
    ic = lambda i: f'<svg class="i"><use href="#i-{i}"/></svg>'
    faq = ''.join(f'<details><summary>{e(q)}</summary><p>{e(x)}</p></details>' for q, x in RETURNS_FAQ)
    main = f'''<main id="top" class="ba-page">
<div class="w">
{crumbs_html(cr)}
<article class="ba pol">
 <p class="ba-m">Правила магазину · Редакція від <time datetime="{RETURNS_UPDATED}">{udate(RETURNS_UPDATED)}</time></p>
 <h1>Обмін і повернення товару</h1>
 <p class="lead">Самоклеючі матеріали після зняття захисної плівки, монтажу чи нарізання поверненню не підлягають. Перевірте замовлення до початку робіт — а брак і пересорт ми замінимо за свій рахунок.</p>
 <div class="pol-sum">
  <div class="no">{ic('x')}<b>Використаний товар не повертається</b><span>Знята плівка, наклеєно чи нарізано — клей одноразовий, товар уже не відновити.</span></div>
  <div>{ic('check')}<b>Брак і пересорт — за наш рахунок</b><span>Замінимо, довкладемо або повернемо кошти. Доставку оплачуємо ми.</span></div>
  <div>{ic('check')}<b>Огляд перед оплатою</b><span>Перевірте посилку на відділенні. Пошкоджена — не забирайте, складіть акт.</span></div>
  <div>{ic('check')}<b>Нерозпакований — 14 днів</b><span>Ціла заводська упаковка, плівка не знята. Зворотну доставку оплачує покупець.</span></div>
 </div>
 <div class="ba-txt">{md(read('tools/povernennya.md'))}</div>
 <section class="faq ba-faq"><h2>Питання й відповіді</h2>{faq}</section>
 <aside class="ba-ask"><div><b>Сумніваєтеся щодо кольору чи кількості?</b><span>Напишіть до замовлення — надішлемо живі фото й порахуємо матеріал під ваші розміри, щоб нічого не довелося повертати.</span></div>
  <div class="acts"><a class="btn" href="https://t.me/{TG}?text={e('Вітаю! Питання щодо обміну чи повернення:')}" target="_blank" rel="noopener">Написати в Telegram</a><a class="btn ghost" href="blog/dostavka-i-oplata.html">Доставка й оплата</a></div></aside>
</article>
</div>
</main>'''
    return page(hd, main, 'Обмін і повернення', title, desc, url)


def not_found_page():
    url = SITE + '404.html'
    title = 'Сторінку не знайдено — Samostroy Shop'
    desc = 'Такої сторінки немає або товар більше не продається. Скористайтеся пошуком чи каталогом Samostroy Shop.'
    hd = head(title, desc, url, SITE + 'og/home.jpg', robots='noindex,follow')
    main = f'''<main id="top" class="nf-page">
<section class="w nf">
 <p class="nf-c">404</p>
 <h1 id="nfT">Сторінку не знайдено</h1>
 <p class="lead" id="nfL">Можливо, посилання застаріло або товар уже не продається. Знайдіть потрібне через пошук чи каталог.</p>
 <form class="nf-s" action="./" method="get"><input type="search" name="q" placeholder="Пошук: 3D панель, PET плитка, артикул" aria-label="Пошук товарів"><button class="btn">Знайти</button></form>
 <nav class="cp-sib">{''.join(f'<a href="?g={g[0]}">{e(g[1])}</a>' for g in GROUPS)}<a href="blog.html">Блог</a><a href="https://t.me/{TG}" target="_blank" rel="noopener">Написати менеджеру</a></nav>
</section>
</main>'''
    return page(hd, main, 'Не знайдено', title, desc, url, noindex=True, scripts=
                '\n<script>if(/^\\/p\\//.test(location.pathname)){document.getElementById("nfT").textContent="Цей товар більше не продається";document.getElementById("nfL").textContent="Подивіться схожі товари в каталозі або напишіть менеджеру — підберемо заміну."}</script>')


# ---------------------------------------------------------------- звіт по каталогу для адмінки
def catalog_report(prods):
    state_path = P('tools', 'catalog-state.json')
    try:
        with open(state_path, encoding='utf-8') as f:
            st = json.load(f)
    except Exception:
        st = {'items': {}, 'log': []}
    prev = st.get('items', {})
    cur = {p['id']: [round(p['price'], 2), 1 if p['av'] else 0, p['qty'] if p['qty'] is not None else -1, p['name'], p['cat']] for p in prods}
    ev = {'date': NOW.strftime('%Y-%m-%d %H:%M'), 'new': [], 'gone': [], 'up': [], 'down': [], 'back': [], 'out': []}
    if prev:
        for i, v in cur.items():
            o = prev.get(i)
            if not o:
                ev['new'].append([i, v[3], v[0]])
                continue
            if v[0] > o[0]:
                ev['up'].append([i, v[3], o[0], v[0]])
            elif v[0] < o[0]:
                ev['down'].append([i, v[3], o[0], v[0]])
            if v[1] and not o[1]:
                ev['back'].append([i, v[3]])
            if o[1] and not v[1]:
                ev['out'].append([i, v[3]])
        ev['gone'] = [[i, o[3]] for i, o in prev.items() if i not in cur]
    log = st.get('log', [])
    if any(ev[k] for k in ('new', 'gone', 'up', 'down', 'back', 'out')):
        log = ([ev] + log)[:40]
    by = {}
    for p in prods:
        b = by.setdefault(p['cat'], {'cat': p['cat'], 'name': CAT.get(p['cat'], (0, 0, 'Інше'))[2], 'group': CAT.get(p['cat'], (0, 'dim'))[1], 'all': 0, 'av': 0, 'min': 0, 'max': 0, 'sum': 0})
        b['all'] += 1
        if p['av']:
            b['av'] += 1
            b['sum'] += p['price']
            b['min'] = p['price'] if not b['min'] else min(b['min'], p['price'])
            b['max'] = max(b['max'], p['price'])
    cats = sorted(by.values(), key=lambda x: -x['all'])
    for b in cats:
        b['avg'] = round(b['sum'] / b['av']) if b['av'] else 0
        del b['sum']
    rep = {'updated': NOW.strftime('%Y-%m-%d %H:%M'), 'total': len(prods), 'available': sum(1 for p in prods if p['av']),
           'noPhoto': sum(1 for p in prods if not p['imgs']), 'noDesc': sum(1 for p in prods if not p['desc']),
           'low': [[p['id'], p['name'], p['qty'], p['price']] for p in sorted(prods, key=lambda x: x['qty'] or 0) if p['av'] and p['qty'] and 0 < p['qty'] <= 10][:60],
           'cats': cats, 'log': log}
    write('tools/catalog-state.json', json.dumps({'items': cur, 'log': log}, ensure_ascii=False, separators=(',', ':')))
    rep['idcat'] = {p['id']: p['cat'] for p in prods}
    # час оновлення змінюємо лише коли змінилися самі дані — щоб не робити зайвих комітів
    try:
        prev_rep = json.loads(read('catalog-report.json'))
        if {k: v for k, v in prev_rep.items() if k != 'updated'} == {k: v for k, v in rep.items() if k != 'updated'}:
            rep['updated'] = prev_rep.get('updated', rep['updated'])
    except Exception:
        pass
    write('catalog-report.json', json.dumps(rep, ensure_ascii=False, separators=(',', ':')))


# ---------------------------------------------------------------- sitemap, robots, llms.txt
def sitemap(prods, cats, arts):
    old = {}
    try:
        for m in re.finditer(r'<loc>([^<]+)</loc><lastmod>([^<]+)</lastmod>', read('sitemap.xml')):
            old[m.group(1)] = m.group(2)
    except Exception:
        pass
    changed = set(CHANGED)
    lm = lambda u: TODAY if u in changed or u not in old else old[u]
    static = [('', 'daily', '1.0'), ('vinil.html', 'weekly', '0.8'), ('pazl-pidloga.html', 'weekly', '0.8'), ('mebli.html', 'weekly', '0.8'),
              ('kylimky.html', 'weekly', '0.8'), ('ekoshkira.html', 'weekly', '0.8'), ('dzerkala.html', 'weekly', '0.8'), ('opt.html', 'monthly', '0.7'),
              ('dropshipping.html', 'monthly', '0.8'), ('academy.html', 'monthly', '0.7'), ('course-dropshipping.html', 'monthly', '0.6'),
              ('course-sales3.html', 'monthly', '0.6'), ('partners.html', 'weekly', '0.6'), ('lk.html', 'monthly', '0.5'), ('postachalniky.html', 'monthly', '0.6'),
              ('franchise.html', 'monthly', '0.5'), ('jobs.html', 'weekly', '0.5'), ('blog.html', 'weekly', '0.7'), ('reviews.html', 'weekly', '0.6'), ('povernennya.html', 'monthly', '0.4'), ('bio.html', 'monthly', '0.3')]
    rows = []
    for path, fr, pr in static:
        u = SITE + path
        mod = old.get(u, TODAY)
        rows.append(f'<url><loc>{u}</loc><lastmod>{mod}</lastmod><changefreq>{fr}</changefreq><priority>{pr}</priority></url>')
    for g in GROUPS:
        u = f'{SITE}?g={g[0]}'
        rows.append(f'<url><loc>{u.replace("&", "&amp;")}</loc><lastmod>{old.get(u, TODAY)}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>')
    for s in cats:
        u = f'{SITE}c/{s}.html'
        rows.append(f'<url><loc>{u}</loc><lastmod>{lm(u)}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>')
    for a in arts:
        u = f'{SITE}blog/{a["slug"]}.html'
        rows.append(f'<url><loc>{u}</loc><lastmod>{lm(u)}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority>'
                    f'<image:image><image:loc>{SITE}{cover(a)}</image:loc></image:image></url>')
    for p in prods:
        u = f'{SITE}p/{p["id"]}.html'
        imgs = ''.join(f'<image:image><image:loc>{e(x)}</image:loc></image:image>' for x in p['imgs'][:3])
        rows.append(f'<url><loc>{u}</loc><lastmod>{lm(u)}</lastmod><changefreq>weekly</changefreq><priority>{"0.7" if p["av"] else "0.3"}</priority>{imgs}</url>')
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n  '
           + '\n  '.join(rows) + '\n</urlset>\n')
    write('sitemap.xml', xml)
    write('robots.txt', f'''User-agent: *
Allow: /
Disallow: /admin.html
Disallow: /jobs-drop.html
Disallow: /tools/
Disallow: /catalog/

Sitemap: {SITE}sitemap.xml
''')


def llms(cats, arts):
    lines = ['# Samostroy Shop', '', '> Інтернет-магазин самоклеючих матеріалів для ремонту своїми руками з доставкою по Україні: 3D панелі, PET, вінілова й алюмінієва плитка, самоклеюча плівка, шпалери, підлога-пазл, килимки, екошкіра, дзеркала, меблі. Відправка в день замовлення, оплата при отриманні. Також — дропшипінг без вкладень, опт, співпраця з постачальниками й франшиза.', '',
             '## Магазин', f'- [Каталог]({SITE}): усі товари з цінами й наявністю']
    lines += [f'- [{CAT[s][2]}]({SITE}c/{s}.html)' for s in cats]
    lines += ['', '## Співпраця', f'- [Дропшипінг]({SITE}dropshipping.html): продаж товарів без складу й вкладень', f'- [Оптовим покупцям]({SITE}opt.html)',
              f'- [Постачальникам]({SITE}postachalniky.html)', f'- [Франшиза / White Label]({SITE}franchise.html)', f'- [Академія партнера]({SITE}academy.html)',
              f'- [Товари для продажу]({SITE}partners.html)', f'- [Вакансії]({SITE}jobs.html)', '', '## Блог']
    lines += [f'- [{a["title"]}]({SITE}blog/{a["slug"]}.html): {a["desc"]}' for a in arts]
    lines += ['', '## Контакти', f'- Телефон: {PHONE}', f'- Telegram: https://t.me/{TG}', f'- Відгуки: {SITE}reviews.html', f'- Обмін і повернення: {RETURNS_URL} — використаний (розпакований, наклеєний, нарізаний) товар не повертається; брак і пересорт замінюємо за свій рахунок; нерозпакований — 14 днів', '']
    write('llms.txt', '\n'.join(lines))


# ---------------------------------------------------------------- запуск
def main():
    prods = load_products()
    by_cat = {}
    for p in prods:
        by_cat.setdefault(p['cat'], []).append(p)
    for L in by_cat.values():
        L.sort(key=lambda x: (not x['av'], x['sale'], len(x['imgs']) < 3, x['i']))
    arts = clean_articles(json.loads(read('blog.json')))
    for a in arts:
        a['rt'] = read_time(a)
    arts.sort(key=lambda a: a['date'], reverse=True)
    art_by_cat = {}
    for a in arts:
        for c in a.get('cats', []):
            art_by_cat.setdefault(c, []).append(a)
            if c in CAT:
                art_by_cat.setdefault('g:' + CAT[c][1], []).append(a)

    for p in prods:
        write(f'p/{p["id"]}.html', product_page(p, by_cat, art_by_cat), f'{SITE}p/{p["id"]}.html')
    cats = [s for g in GROUPS for s in ORDER.get(g[0], []) if s in CAT and by_cat.get(s)]
    cats += [s for s in by_cat if s in CAT and s not in cats and s != 'inshe']
    for s in cats:
        write(f'c/{s}.html', category_page(s, by_cat[s], art_by_cat), f'{SITE}c/{s}.html')
    for a in arts:
        write(f'blog/{a["slug"]}.html', article_page(a, arts, by_cat), f'{SITE}blog/{a["slug"]}.html')
    write('blog.html', blog_index(arts), SITE + 'blog.html')
    write('reviews.html', reviews_page(), SITE + 'reviews.html')
    write('povernennya.html', returns_page(), RETURNS_URL)
    write('404.html', not_found_page())
    # прибрати сторінки товарів, категорій і статей, яких більше немає
    for d in ('p', 'c', 'blog'):
        if os.path.isdir(P(d)):
            for fn in os.listdir(P(d)):
                if fn.endswith('.html') and f'{d}/{fn}' not in WRITTEN:
                    os.remove(P(d, fn))
                    CHANGED.append(f'{SITE}{d}/{fn}')
    catalog_report(prods)
    sitemap(prods, cats, arts)
    llms(cats, arts)
    if '--changed' in sys.argv:
        with open(sys.argv[sys.argv.index('--changed') + 1], 'w') as f:
            f.write('\n'.join(CHANGED))
    print(f'Товарів: {len(prods)}, категорій: {len(cats)}, статей: {len(arts)}, змінено адрес: {len(CHANGED)}')


if __name__ == '__main__':
    main()
