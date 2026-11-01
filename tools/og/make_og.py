#!/usr/bin/env python3
"""Генерує зображення 1200×630 для прев'ю в соцмережах і месенджерах (og:image) та обкладинки статей блогу.

Запуск (потрібні Python Playwright і Chromium): python3 tools/og/make_og.py [--blog-only]
Результат: og/<сторінка>.jpg і blog/img/<slug>.jpg
"""
import asyncio
import base64
import html
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LOGO = 'data:image/jpeg;base64,' + base64.b64encode(open(os.path.join(ROOT, 'logo.jpg'), 'rb').read()).decode()

# мотив праворуч: різний для кожної теми
MOTIF = {
 'brick': 'background:repeating-linear-gradient(0deg,#1f242a 0 6px,transparent 6px 64px),repeating-linear-gradient(90deg,#1f242a 0 6px,transparent 6px 128px),linear-gradient(135deg,#f08a1c,#c86a06);background-size:auto,256px 128px,auto;',
 'tile': 'background:repeating-linear-gradient(0deg,#ffffffcc 0 5px,transparent 5px 90px),repeating-linear-gradient(90deg,#ffffffcc 0 5px,transparent 5px 90px),linear-gradient(160deg,#dfe4e8,#a9b4bd);',
 'wood': 'background:repeating-linear-gradient(90deg,#00000022 0 3px,transparent 3px 96px),repeating-linear-gradient(0deg,#5a3a1e 0 2px,transparent 2px 22px),linear-gradient(90deg,#c58b52,#a46a35 40%,#c99561 70%,#8f5a2b);',
 'film': 'background:repeating-linear-gradient(135deg,#ffffff18 0 18px,transparent 18px 44px),linear-gradient(135deg,#7c8a96,#3c4650);',
 'mirror': 'background:radial-gradient(circle at 30% 30%,#ffffffee 0 14%,transparent 15%),radial-gradient(circle at 70% 62%,#ffffffaa 0 20%,transparent 21%),radial-gradient(circle at 34% 78%,#ffffff88 0 9%,transparent 10%),linear-gradient(135deg,#cfd8df,#7d8b97);',
 'soft': 'background:radial-gradient(circle at 25% 30%,#f6b86d 0 22%,transparent 23%),radial-gradient(circle at 72% 70%,#ffd9a8 0 26%,transparent 27%),linear-gradient(135deg,#f08a1c,#e66f00);',
 'grid': 'background:repeating-linear-gradient(0deg,#ffffff22 0 2px,transparent 2px 40px),repeating-linear-gradient(90deg,#ffffff22 0 2px,transparent 2px 40px),linear-gradient(135deg,#f08a1c,#c86a06);',
 'chart': 'background:linear-gradient(to top,#f08a1c 0 34%,transparent 34%) 12% 100%/16% 100% no-repeat,linear-gradient(to top,#f6a23f 0 52%,transparent 52%) 38% 100%/16% 100% no-repeat,linear-gradient(to top,#ffb766 0 70%,transparent 70%) 64% 100%/16% 100% no-repeat,linear-gradient(to top,#ffd09a 0 88%,transparent 88%) 90% 100%/16% 100% no-repeat,#3a434d;',
 'box': 'background:linear-gradient(90deg,transparent 46%,#7a4a14 46% 54%,transparent 54%),linear-gradient(0deg,transparent 40%,#7a4a14 40% 48%,transparent 48%),linear-gradient(135deg,#d9a066,#b07a3f);',
 'puzzle': 'background:radial-gradient(circle at 50% 0,#4fb39a 0 12%,transparent 13%) 0 0/120px 120px,radial-gradient(circle at 0 50%,#f08a1c 0 12%,transparent 13%) 0 0/120px 120px,repeating-conic-gradient(#4fb39a 0 25%,#f6c453 0 50%) 0 0/240px 240px;',
}
CAT_MOTIF = {'Стіни': 'brick', 'Плитка': 'tile', 'Підлога': 'wood', 'Плівка й шпалери': 'film', 'Декор і дзеркала': 'mirror',
             'Дім і меблі': 'soft', 'Ремонт своїми руками': 'grid', 'Бізнес і співпраця': 'chart', 'Покупцям': 'box'}

PAGES = [
 ('home', 'Samostroy Shop', 'Матеріали для ремонту своїми руками', ['1000+ товарів у наявності', 'Відправка в день замовлення', 'Оплата при отриманні'], 'brick'),
 ('blog', 'Блог', 'Ремонт своїми руками: інструкції й поради', ['Як обрати й поклеїти', 'Розрахунок матеріалів', 'Бізнес і співпраця'], 'grid'),
 ('reviews', 'Відгуки покупців', 'Що кажуть про матеріали, доставку й сервіс', ['Реальні замовлення', 'Залиште свій відгук'], 'soft'),
 ('dropshipping', 'Дропшипінг без вкладень', 'Продавайте товари для ремонту без складу', ['Ми пакуємо й відправляємо', 'Ціну ставите ви', 'Навчання безкоштовно'], 'chart'),
 ('academy', 'Академія партнера', 'Як почати заробляти з нами за 15 хвилин', ['8 кроків із тестами', 'Особистий план старту'], 'grid'),
 ('course-dropshipping', 'Курс «Дропшипінг з нуля»', '23 уроки з тестами й сертифікат', ['Попит, УТП, контент', 'Конверсія й масштаб'], 'chart'),
 ('course-sales3', 'Курс «Продажі 3.0»', 'Як продавати в чаті й по телефону', ['Скрипти діалогу', 'ТОП-10 заперечень'], 'chart'),
 ('partners', 'Партнерський кабінет', 'Товари, ціни й готові тексти для оголошень', ['Ваш дохід на кожен товар', 'Тексти й фото в 1 клік'], 'tile'),
 ('lk', 'Partner Hub', 'Де й як публікувати оголошення', ['OLX, Prom, Rozetka', 'Instagram, TikTok, Telegram'], 'grid'),
 ('opt', 'Оптовим покупцям', 'Самоклеючі матеріали оптом по Україні', ['Склади в Дніпрі та Вінниці', 'Договір і документи'], 'box'),
 ('postachalniky', 'Постачальникам', 'Продавайте ваші товари через Samostroy Shop', ['Сайт, партнери й опт', 'Підключення фідом'], 'box'),
 ('franchise', 'Франшиза / White Label', 'Ваш бренд будматеріалів під ключ', ['Бренд, сайт, реклама', 'Склад постачальника'], 'chart'),
 ('jobs', 'Вакансії', 'Робота в Samostroy Shop', ['Продажі, партнери, SMM', 'Дистанційно або в офісі'], 'soft'),
 ('vinil', 'Вінілові покриття', 'Плитка, LVT, 3D рейки й плінтуси', ['Самоклеюча основа', 'Не боїться вологи'], 'wood'),
 ('pazl-pidloga', 'Підлога-пазл', 'М’які модульні покриття для дитячої', ['EVA і плюш', 'Збирається без інструментів'], 'puzzle'),
 ('kylimky', 'Килимки', 'Для ванної, кухні, коридору й дитячої', ['Вологопоглинаючі', 'Дитячі термокилимки'], 'soft'),
 ('ekoshkira', 'Самоклеюча екошкіра', 'Ремонт дивана, крісла й авто без перетяжки', ['Рулони 1,37 м', 'Десятки кольорів'], 'soft'),
 ('dzerkala', 'Акрилові дзеркала', 'Самоклеючі дзеркала й дзеркальний декор', ['Безпечні й легкі', 'Клеяться без кріплень'], 'mirror'),
 ('mebli', 'Меблі й зберігання', 'Стелажі, етажерки, складні й надувні меблі', ['Для дому, дачі й балкона'], 'soft'),
 ('bio', 'Samostroy Shop', 'Магазин, співпраця й соцмережі', ['Усі посилання на одній сторінці'], 'brick'),
]


def tpl(title, sub, bullets, motif, label=''):
    tsize = 64 if len(title) <= 34 else 54 if len(title) <= 60 else 46 if len(title) <= 90 else 40
    b = ''.join(f'<li>{html.escape(x)}</li>' for x in bullets)
    return f'''<!doctype html><html><head><meta charset="utf-8"><style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{width:1200px;height:630px;background:#2b3138;color:#fff;font-family:"Inter Display","Inter",sans-serif;overflow:hidden;position:relative}}
.m{{position:absolute;right:-60px;top:-40px;width:520px;height:710px;transform:rotate(8deg);border-radius:36px;{MOTIF[motif]}box-shadow:0 0 0 14px #2b3138}}
.f{{position:absolute;right:0;top:0;width:560px;height:630px;background:linear-gradient(90deg,#2b3138 0,#2b3138cc 18%,transparent 48%)}}
.c{{position:absolute;left:72px;top:64px;bottom:64px;width:{720 if bullets or sub else 760}px;display:flex;flex-direction:column}}
.lb{{align-self:flex-start;background:#f08a1c;color:#1f2328;font-weight:700;font-size:22px;padding:8px 16px;border-radius:8px;margin-bottom:26px}}
h1{{font-weight:800;font-size:{tsize}px;line-height:1.08;letter-spacing:-.02em}}
p{{font-size:28px;color:#c3cad0;margin-top:20px;line-height:1.3;font-weight:500}}
ul{{list-style:none;margin-top:26px;display:flex;flex-direction:column;gap:10px}}
li{{font-size:24px;color:#e6eaed;padding-left:34px;position:relative;font-weight:500}}
li:before{{content:"";position:absolute;left:4px;top:9px;width:14px;height:8px;border:solid #f08a1c;border-width:0 0 3.5px 3.5px;transform:rotate(-45deg)}}
.br{{margin-top:auto;display:flex;align-items:center;gap:14px;font-weight:700;font-size:24px}}
.br img{{width:52px;height:52px;border-radius:10px;object-fit:cover}}
.br span{{color:#c3cad0;font-weight:500;font-size:20px;margin-left:8px}}
</style></head><body><div class="m"></div><div class="f"></div><div class="c">
{f'<span class="lb">{html.escape(label)}</span>' if label else ''}<h1>{html.escape(title)}</h1>{f'<p>{html.escape(sub)}</p>' if sub else ''}{f'<ul>{b}</ul>' if b else ''}
<div class="br"><img src="{LOGO}" alt="">Samostroy Shop<span>samostroy.shop</span></div></div></body></html>'''


async def main():
    from playwright.async_api import async_playwright
    blog_only = '--blog-only' in sys.argv
    jobs = []
    if not blog_only:
        for name, t, s, b, m in PAGES:
            jobs.append((os.path.join(ROOT, 'og', name + '.jpg'), tpl(t, s, b, m)))
    for a in json.load(open(os.path.join(ROOT, 'blog.json'), encoding='utf-8')):
        jobs.append((os.path.join(ROOT, 'blog', 'img', a['slug'] + '.jpg'), tpl(a['title'], '', [], CAT_MOTIF.get(a['category'], 'grid'), a['category'])))
    os.makedirs(os.path.join(ROOT, 'og'), exist_ok=True)
    os.makedirs(os.path.join(ROOT, 'blog', 'img'), exist_ok=True)
    async with async_playwright() as p:
        exe = '/usr/bin/google-chrome' if os.path.exists('/usr/bin/google-chrome') else None
        b = await p.chromium.launch(executable_path=exe, args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width': 1200, 'height': 630})
        for path, h in jobs:
            await pg.set_content(h)
            await pg.wait_for_timeout(60)
            await pg.screenshot(path=path, type='jpeg', quality=84)
        await b.close()
    print('Зображень:', len(jobs))


if __name__ == '__main__':
    asyncio.run(main())
