#!/usr/bin/env python3
"""Конвертер фіду постачальника DROPOFFICE (YML) у каталог сайту.

Запуск:  python3 tools/sync_feed.py шлях/до/dropoffice.xml
Створює:
  products.xml          — каталог у форматі, який читають усі сторінки сайту
  catalog/ru/<id>.html  — російські описи товарів (підвантажуються лише для RU-версії)
Налаштування цін — tools/feed-settings.json.
Запускається автоматично GitHub Actions (.github/workflows/sync-feed.yml).
"""
import html
import json
import math
import os
import re
import sys
import xml.etree.ElementTree as ET
from xml.sax.saxutils import escape

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://samostroy.shop/'
MIN_OFFERS = 300  # захист: якщо постачальник віддав порожній/битий фід — нічого не перезаписуємо

# Категорія постачальника (categoryId) → розділ сайту (slug із CATS у shop.js).
# Нові категорії постачальника, яких тут немає, сайт розкладе сам за назвою товару.
CAT_MAP = {
    # 3D та декоративні панелі
    '89190870': '3d-paneli', '95118316': '3d-paneli', '95118314': '3d-paneli', '95118364': '3d-paneli',
    '92050378': '3d-paneli', '89190869': '3d-paneli', '95118365': '3d-paneli', '89190871': '3d-paneli',
    '95118313': '3d-paneli', '95118370': '3d-paneli', '95118366': '3d-paneli', '95118312': '3d-paneli',
    '95118311': '3d-paneli', '95118367': '3d-paneli', '91008800': '3d-paneli', '88452547': '3d-paneli',
    # стінові панелі
    '105': 'stinovi-paneli', '131': 'stinovi-paneli', '192': 'stinovi-paneli', '193': 'stinovi-paneli',
    '194': 'stinovi-paneli',
    # ПВХ
    '95118295': 'pvh-paneli-plyty', '95118363': 'pvh-paneli-plyty', '95118349': 'pvh-paneli-plyty',
    '95118350': 'pvh-paneli-plyty', '95118320': 'pvh-paneli-plyty', '95118310': 'pvh-plytka',
    # плитка
    '95118345': 'plytka-vinilova', '95118346': 'plytka-vinilova', '95118347': 'plytka-vinilova',
    '95118318': 'plytka-vinilova', '191': 'plytka-vinilova', '92886686': 'plytka-vinilova',
    '95118319': 'plytka-vinilova',
    '95118322': 'plytka-pid-kovrolin', '125': 'plytka-pid-kovrolin', '126': 'plytka-pid-kovrolin',
    '127': 'plytka-pid-kovrolin', '128': 'plytka-pid-kovrolin',
    '95118323': 'alyuminiyeva-plytka', '95118321': 'poliuretanova-plytka', '95118334': 'lvt-plytka',
    '95118339': 'kompozytna-plytka',
    '95118336': 'pet-plytka', '95118342': 'pet-plytka', '110': 'pet-plytka',
    '95118343': 'pet-plytka-rulon', '123': 'pet-plytka-rulon', '95118344': 'pet-mozayika',
    # підлога
    '95118356': 'pidlogove-vinilove-pokryttya', '109': '3d-reyky', '121': '3d-reyky', '137': '3d-reyky',
    '95118290': 'plintusy',
    # стіни
    '95118294': 'shpalery', '95118357': 'shpalery', '95118359': 'shpalery', '95118358': 'tepli-shpalery',
    '95118297': 'samokleyucha-plivka', '95118362': 'samokleyucha-plivka', '95118360': 'samokleyucha-plivka',
    '95118361': 'samokleyucha-plivka', '115': 'samokleyucha-plivka', '116': 'samokleyucha-plivka',
    '108': 'samokleyucha-plivka', '129': 'samokleyucha-plivka', '130': 'samokleyucha-plivka',
    '183': 'shtukaturka', '184': 'shtukaturka', '185': 'shtukaturka', '114': 'mozayika-sklo',
    # профілі й декор
    '95118326': 'profili-dekor', '95118351': 'profili-dekor', '95118353': 'profili-dekor',
    '95118352': 'profili-dekor', '107': 'profili-dekor', '124': 'profili-dekor', '95118348': 'profili-dekor',
    '186': 'profili-dekor', '187': 'profili-dekor', '189': 'profili-dekor', '190': 'profili-dekor',
    '119': 'dzerkalnyi-dekor', '120': 'akrylovi-dzerkala', '95118298': 'akrylovi-dzerkala',
    # дім і діти
    '88277606': 'termokylymky', '95118327': 'vologopoglynayuchi-kylymky', '95118338': 'ekoshkira',
    '138': 'satyn', '95118292': 'manikyur', '117': 'konteynery', '106': 'stelazhi', '118': 'stelazhi',
    '95118333': 'skladni-mebli', '113': 'naduvni-mebli', '195': 'stolyky',
}
# пазли постачальник тримає в одній категорії — плюшеві/EVA сайт розрізнить за назвою
BY_NAME = {'95118329'}

JUNK_KW = re.compile(r'^(дроп\w*|дропш\w*|гурт\w*|опт\w*|товарка|оптом)$', re.I)


def load_settings():
    p = os.path.join(ROOT, 'tools', 'feed-settings.json')
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def retail(price, cat_id, s):
    pct = s.get('category_markup_percent', {}).get(cat_id, s.get('markup_percent', 0))
    v = price * (1 + pct / 100.0)
    step = s.get('round_up_to', 1) or 1
    v = math.ceil(v / step - 1e-9) * step
    if s.get('price_ending_9') and v >= 20:
        v = math.ceil((v + 1) / 10) * 10 - 1
    return max(v, price)


def clean_html(h):
    """Прибирає службові теги з опису (html/head/style/meta/script), залишає зміст."""
    h = h or ''
    h = re.sub(r'(?is)<(head|style|script|title)[^>]*>.*?</\1>', '', h)
    h = re.sub(r'(?is)</?(html|body|meta|link|!doctype)[^>]*>', '', h)
    h = re.sub(r'(?i)\s(style|class|id|lang|dir|data-[\w-]+)="[^"]*"', '', h)
    h = h.replace('\xa0', ' ')
    h = re.sub(r'\n{3,}', '\n\n', h).strip()
    return h


def cdata(s):
    return '<![CDATA[' + s.replace(']]>', ']]&gt;') + ']]>'


def strip_sku(name):
    return re.sub(r'\s*SW-\d+\s*$', '', name or '').strip()


def keywords(o):
    seen, out = set(), []
    for tag in ('keywords_ua', 'keywords'):
        for k in (o.findtext(tag) or '').split(','):
            k = re.sub(r'\s+', ' ', k).strip()
            if not k or JUNK_KW.match(k) or k.lower() in seen:
                continue
            seen.add(k.lower())
            out.append(k)
    return ', '.join(out)


def main(src):
    s = load_settings()
    root = ET.parse(src).getroot()
    cats = {c.get('id'): (c.get('parentId'), (c.text or '').strip()) for c in root.iter('category')}

    def cat_path(cid):
        path, seen = [], set()
        while cid and cid in cats and cid not in seen:
            seen.add(cid)
            path.append(cats[cid][1])
            cid = cats[cid][0]
        return ' > '.join(reversed(path))

    offers = list(root.iter('offer'))
    if len(offers) < MIN_OFFERS:
        sys.exit(f'Фід містить лише {len(offers)} товарів — схоже на збій постачальника, каталог не оновлено.')

    ru_dir = os.path.join(ROOT, 'catalog', 'ru')
    os.makedirs(ru_dir, exist_ok=True)
    keep_ru = set()
    items, stats = [], {'all': 0, 'av': 0, 'skipped': 0}
    T = '\t\t\t\t\t'

    for o in offers:
        oid = (o.get('id') or '').strip()
        name_ua = (o.findtext('name_ua') or o.findtext('name') or '').strip()
        name_ru = (o.findtext('name') or '').strip()
        try:
            price = float((o.findtext('price') or '0').replace(',', '.'))
        except ValueError:
            price = 0
        if not oid or not name_ua or price <= 0:
            stats['skipped'] += 1
            continue
        cid = (o.findtext('categoryId') or '').strip()
        qty_txt = (o.findtext('quantity_in_stock') or '').strip()
        qty = int(qty_txt) if qty_txt.lstrip('-').isdigit() else None
        av = (o.get('available') or 'true').lower() == 'true' and (qty is None or qty > 0)
        pics = [p.text.strip() for p in o.findall('picture') if p.text and p.text.strip()]
        pics = list(dict.fromkeys(pics))
        params = [((p.get('name') or '').strip(), (p.text or '').strip()) for p in o.findall('param')]
        params = [(a, re.sub(r'\s+', ' ', b)) for a, b in params if a and b]
        color = next((b for a, b in params if a == 'Колір'), '')
        vendor = (o.findtext('vendor') or '').strip()
        sku = (o.findtext('vendorCode') or '').strip()
        sell = retail(price, cid, s)
        desc_ua = clean_html(o.findtext('description_ua') or o.findtext('description'))
        desc_ru = clean_html(o.findtext('description'))
        if desc_ru and desc_ru != desc_ua:
            keep_ru.add(oid)
            fp = os.path.join(ru_dir, oid + '.html')
            old = open(fp, encoding='utf-8').read() if os.path.exists(fp) else None
            if old != desc_ru:
                with open(fp, 'w', encoding='utf-8') as f:
                    f.write(desc_ru)

        L = ['\t\t\t\t<item>', f'{T}<g:id>{escape(oid)}</g:id>', f'{T}<g:identifier_exists>no</g:identifier_exists>',
             f'{T}<g:title>{escape(name_ua)}</g:title>']
        if name_ru and strip_sku(name_ru) != strip_sku(name_ua):
            L.append(f'{T}<g:title_ru>{escape(strip_sku(name_ru))}</g:title_ru>')
        if desc_ua:
            L.append(f'{T}<g:description>{cdata(desc_ua)}</g:description>')
        L.append(f'{T}<g:link>{SITE}?p={escape(oid)}</g:link>')
        if pics:
            L.append(f'{T}<g:image_link>{escape(pics[0])}</g:image_link>')
            L += [f'{T}<g:additional_image_link>{escape(p)}</g:additional_image_link>' for p in pics[1:]]
        L.append(f'{T}<g:availability>{"in stock" if av else "out of stock"}</g:availability>')
        L.append(f'{T}<g:price>{sell:.2f} UAH</g:price>')
        L.append(f'{T}<g:condition>new</g:condition>')
        if cid in CAT_MAP and cid not in BY_NAME:
            L.append(f'{T}<g:cat>{CAT_MAP[cid]}</g:cat>')
        if cid in cats:
            L.append(f'{T}<g:product_type>{escape(cat_path(cid))}</g:product_type>')
        if sku:
            L.append(f'{T}<g:mpn>{escape(sku)}</g:mpn>')
        if qty is not None:
            L.append(f'{T}<g:quantity>{qty}</g:quantity>')
        if vendor:
            L.append(f'{T}<g:brand>{escape(vendor)}</g:brand>')
        if color:
            L.append(f'{T}<g:color>{escape(color)}</g:color>')
        kw = keywords(o)
        if kw:
            L.append(f'{T}<g:keywords>{escape(kw)}</g:keywords>')
        for a, b in params:
            L += [f'{T}<g:product_detail>', f'{T}\t<g:product_name>{escape(a)}</g:product_name>',
                  f'{T}\t<g:product_value>{escape(b)}</g:product_value>', f'{T}</g:product_detail>']
        L.append('\t\t\t\t</item>')
        items.append('\n'.join(L))
        stats['all'] += 1
        stats['av'] += av

    # прибрати російські описи товарів, яких більше немає у фіді
    for fn in os.listdir(ru_dir):
        if fn.endswith('.html') and fn[:-5] not in keep_ru:
            os.remove(os.path.join(ru_dir, fn))

    out = ("<?xml version='1.0' encoding='UTF-8'?>\n"
           '\t<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n\t\t<channel>\n'
           '\t\t\t<title>Samostroy Shop</title>\n\t\t\t<link>https://samostroy.shop/</link>\n'
           '\t\t\t<description>Каталог Samostroy Shop</description>\n'
           + '\n'.join(items) + '\n\t\t</channel>\n\t</rss>\n')
    tmp = os.path.join(ROOT, 'products.xml.tmp')
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write(out)
    ET.parse(tmp)  # перевірка, що XML валідний
    os.replace(tmp, os.path.join(ROOT, 'products.xml'))
    print(f"Товарів: {stats['all']}, у наявності: {stats['av']}, пропущено: {stats['skipped']}, "
          f"RU-описів: {len(keep_ru)}, націнка: {s.get('markup_percent', 0)}%")


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'dropoffice.xml')
