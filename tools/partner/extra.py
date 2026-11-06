# -*- coding: utf-8 -*-
"""Стартовий PDF для партнера і шпаргалка «Схема роботи»."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from build import *  # noqa
from reportlab.pdfgen import canvas as cv

def build_start(out):
    doc = Doc(out, 'Старт партнера: з чого почати', 'Як ми працюємо, які канали обрати першими і що зробити за перший тиждень', 'Почніть тут', 'Старт партнера')
    s = [P('Ви продаєте — ми зберігаємо, пакуємо й відправляємо. Вам не потрібні склад, закупівля чи вкладення: лише телефон, 30–60 хвилин на день і бажання відповідати клієнтам швидше за інших.', 'lead')]
    s += [h2('Що ви отримуєте від нас'), callout(bullets([
        'Каталог понад 1 000 товарів у наявності з фото, описами й готовими текстами оголошень — samostroy.shop/partners.html. Ціни й наявність оновлюються кожні 3 години.',
        'Пакування й відправку в день замовлення Новою Поштою або Укрпоштою, ТТН і контроль доставки.',
        'Обмін і повернення беремо на себе.',
        'Навчання: академія партнера (samostroy.shop/academy.html) і курси «Дропшипінг з нуля» та «Продажі 3.0».',
        f'Особистого менеджера в Telegram {TG}: прайс з оптовими цінами, підбір товарів під ваш канал, перевірка перших оголошень.',
        'PDF-курс для кожної платформи, яку ви обрали в анкеті.']))]
    rows = [[Paragraph('<font name="GB">Ваша мета</font>', ST['p']), Paragraph('<font name="GB">Почніть з</font>', ST['p'])],
            [P('Перші замовлення вже цього тижня, без бюджету'), P('OLX + чати міста в Telegram')],
            [P('Охоплення без вкладень, свій бренд'), P('TikTok + Instagram Reels')],
            [P('Покупці старшого віку у вашому місті'), P('Facebook (групи, Marketplace) + Viber')],
            [P('Стабільний потік замовлень, є ФОП'), P('Prom.ua')],
            [P('Власний бізнес на роки'), P('Свій сайт + Google')]]
    t = Table(rows, colWidths=[(W - 2 * M) * .55, (W - 2 * M) * .45])
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), PAPER), ('LINEBELOW', (0, 0), (-1, -2), 0.5, LINE), ('BOX', (0, 0), (-1, -1), 0.5, LINE),
                           ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6), ('LEFTPADDING', (0, 0), (-1, -1), 8), ('VALIGN', (0, 0), (-1, -1), 'TOP')]))
    s += [KeepTogether([h2('Які канали обрати першими'), P('Правило старту: одна дошка оголошень + одна соцмережа + Telegram або Viber для зв’язку з клієнтами. Більше трьох каналів на початку — розпорошення.', 'p'), Spacer(1, 8), t])]
    s += [CondPageBreak(70 * mm), h2('Перший тиждень: чек-лист'), steps([
        ('Заповніть анкету партнера', 'samostroy.shop/anketa.html — після неї ви отримаєте персональний план і потрібні PDF.'),
        ('Отримайте прайс від менеджера', 'Оптові ціни, ваш рівень (Starter, Pro, Team) і як рахується заробіток.'),
        ('Оберіть 10 товарів', 'Ходові позиції з великою наявністю: 3D панелі, PET плитка, самоклеюча плівка, підлога-пазл.'),
        ('Створіть 2 канали', 'За таблицею вище. Інструкції — у PDF вашої платформи.'),
        ('Опублікуйте перші 10 оголошень або відео', 'Фото й тексти — з розділу «Товари для продажу». Своя ціна — ваша вигода.'),
        ('Підготуйте шаблони відповідей', 'Ціна, кількість на площу, доставка й оплата.'),
        ('Передайте перше замовлення', f'Менеджеру {TG} за шаблоном — далі все робимо ми.'),
    ])]
    rows = [['10 хв', 'Відповісти на всі повідомлення й коментарі'], ['15 хв', 'Нове оголошення, відео або допис'],
            ['10 хв', 'Корисні коментарі в групах і чужих гілках'], ['5 хв', 'Передати замовлення менеджеру, переслати ТТН клієнтам']]
    t = Table([[Paragraph(f'<font name="UB" color="#f08a1c">{a}</font>', ST['p']), P(b)] for a, b in rows], colWidths=[22 * mm, W - 2 * M - 22 * mm])
    t.setStyle(TableStyle([('LINEBELOW', (0, 0), (-1, -2), 0.5, LINE), ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6), ('LEFTPADDING', (0, 0), (-1, -1), 0)]))
    s += [KeepTogether([h2('Щоденна рутина на 40 хвилин'), t])]
    s += [KeepTogether([h2('Гроші й податки'), callout(bullets([
        'Ви продаєте за своєю ціною, ми утримуємо оптову, різницю виплачуємо вам — за запитом або за домовленістю раз на тиждень чи місяць.',
        'Закон № 4903-IX про оподаткування доходів з цифрових платформ (OLX, Prom та інших) набрав чинності 23 жовтня 2026 року; основні зміни щодо податків для фізосіб діють з 1 січня 2027 року. Платформи передаватимуть дані про доходи продавців.',
        'Prom, Rozetka й Епіцентр працюють лише з ФОП або юрособами. Для регулярних продажів зручно мати ФОП — групу єдиного податку оберіть разом з бухгалтером.',
        'Це загальна інформація, а не податкова консультація: перед стартом уточніть свою ситуацію в бухгалтера.'], mark='•'), bg=PAPER, bar=SOFT)] + help_box())]
    doc.build(s)

def fmt(n): return f'{n:,}'.replace(',', ' ')

def build_cheat(out, per=2500):
    c = cv.Canvas(out, pagesize=A4)
    c.setTitle('Шпаргалка партнера: схема роботи'); c.setAuthor('Samostroy Shop')
    c.setFillColor(DARK); c.rect(0, H - 62 * mm, W, 62 * mm, stroke=0, fill=1)
    c.setFillColor(OR); c.rect(0, H - 62 * mm, W, 2.2 * mm, stroke=0, fill=1)
    c.setFont('UB', 9); c.setFillColor(colors.white); c.drawString(M, H - 16 * mm, 'SAMOSTROY SHOP')
    c.setFont('G', 9); c.setFillColor(colors.HexColor('#a3acb4')); c.drawString(M + c.stringWidth('SAMOSTROY SHOP', 'UB', 9) + 3 * mm, H - 16 * mm, '·  Шпаргалка партнера')
    c.setFont('UB', 24); c.setFillColor(colors.white); c.drawString(M, H - 33 * mm, 'Схема роботи')
    c.setFillColor(OR); c.drawString(M, H - 44 * mm, '4 кроки до заробітку')
    c.setFont('G', 10.5); c.setFillColor(colors.HexColor('#c9cfd4')); c.drawString(M, H - 53 * mm, 'Без складу, без закупівлі, без вкладень. Ви продаєте — ми відправляємо.')
    steps4 = [('Виставив товар', 'Беріть фото й тексти у розділі «Товари для продажу» і ставте свою ціну на OLX, Prom, в Instagram, TikTok.'),
              ('Отримав замовлення', 'Клієнт пише вам. Уточніть ПІБ, телефон, місто й відділення пошти.'),
              ('Передав нам', 'Надіслали замовлення в особистому кабінеті або менеджеру в Telegram — ми пакуємо й відправляємо в день замовлення.'),
              ('Забрав різницю', 'Клієнт заплатив вашу ціну, ми утримали оптову — різниця ваша.')]
    cw, ch, gap = (W - 2 * M - 6 * mm) / 2, 40 * mm, 6 * mm
    y0 = H - 70 * mm
    for i, (t, d) in enumerate(steps4):
        x = M + (i % 2) * (cw + gap); y = y0 - (i // 2) * (ch + gap) - ch
        c.setFillColor(PAPER); c.roundRect(x, y, cw, ch, 4 * mm, stroke=0, fill=1)
        c.setFillColor(OR); c.circle(x + 11 * mm, y + ch - 11 * mm, 6.5 * mm, stroke=0, fill=1)
        c.setFillColor(colors.white); c.setFont('UB', 15); c.drawCentredString(x + 11 * mm, y + ch - 13.6 * mm, str(i + 1))
        c.setFillColor(INK); c.setFont('UB', 12.5); c.drawString(x + 21 * mm, y + ch - 13 * mm, t)
        c.setFont('G', 9.5); c.setFillColor(SOFT); yy = y + ch - 24 * mm
        for ln in simpleSplit(d, 'G', 9.5, cw - 14 * mm):
            c.drawString(x + 7 * mm, yy, ln); yy -= 12.5
        if i % 2 == 0:
            c.setFillColor(OR); c.setFont('DJ', 14); c.drawCentredString(x + cw + gap / 2, y + ch / 2 - 4, '→')
    # розрахунок
    y = y0 - 2 * ch - gap - 14 * mm
    c.setFillColor(INK); c.setFont('UB', 15); c.drawString(M, y, 'Скільки це грошей')
    c.setFont('G', 9.5); c.setFillColor(SOFT); c.drawString(M, y - 6 * mm, f'Приклад: з одного замовлення ви заробляєте {fmt(per)} грн.')
    sc = [('Навіть при найгіршому розкладі', '1 замовлення раз на 3 дні', 10), ('Замовлення щодня', '1 замовлення на день', 30)]
    bw = (W - 2 * M - 6 * mm) / 2; bh = 58 * mm; by = y - 12 * mm - bh
    for i, (h, sub, n) in enumerate(sc):
        x = M + i * (bw + 6 * mm)
        dark = i == 1
        c.setFillColor(DARK if dark else ORL); c.roundRect(x, by, bw, bh, 4 * mm, stroke=0, fill=1)
        c.setFillColor(OR); c.setFont('GB', 9); c.drawString(x + 7 * mm, by + bh - 10 * mm, h.upper())
        c.setFillColor(colors.HexColor('#c9cfd4') if dark else SOFT); c.setFont('G', 9.5); c.drawString(x + 7 * mm, by + bh - 16 * mm, sub)
        c.setFillColor(colors.white if dark else INK); c.setFont('G', 12)
        c.drawString(x + 7 * mm, by + bh - 26 * mm, f'{n} замовлень × {fmt(per)} грн =')
        c.setFont('UB', 26); c.setFillColor(OR if dark else INK); c.drawString(x + 7 * mm, by + bh - 40 * mm, f'{fmt(n * per)} грн')
        c.setFont('G', 9.5); c.setFillColor(colors.HexColor('#c9cfd4') if dark else SOFT)
        c.drawString(x + 7 * mm, by + bh - 47 * mm, 'на місяць')
        c.setFont('GB', 9.5); c.drawString(x + 7 * mm, by + 6 * mm, f'За рік: {fmt(n * per * 12)} грн')
    # смуга-порівняння
    yb = by - 14 * mm
    c.setFont('G', 9); c.setFillColor(SOFT); c.drawString(M, yb, 'Різниця між «раз на 3 дні» і «щодня» — лише в активності: більше оголошень і відео = більше замовлень.')
    yb -= 7 * mm; full = W - 2 * M
    c.setFillColor(LINE); c.roundRect(M, yb, full, 4 * mm, 2 * mm, stroke=0, fill=1)
    c.setFillColor(OR); c.roundRect(M, yb, full / 3, 4 * mm, 2 * mm, stroke=0, fill=1)
    c.setFont('GB', 8); c.setFillColor(INK); c.drawString(M, yb - 5 * mm, '10 замовлень'); c.drawRightString(W - M, yb - 5 * mm, '30 замовлень')
    # підвал
    c.setFont('G', 7.5); c.setFillColor(SOFT)
    note = 'Розрахунок — приклад, а не гарантія доходу. Реальний заробіток залежить від ваших цін, товарів, рівня партнера, витрат на рекламу, комісій платформ і податків.'
    yy = 26 * mm
    for ln in simpleSplit(note, 'G', 7.5, W - 2 * M): c.drawString(M, yy, ln); yy -= 10
    c.setStrokeColor(LINE); c.setLineWidth(0.6); c.line(M, 14 * mm, W - M, 14 * mm)
    c.setFont('GB', 9); c.setFillColor(INK)
    c.drawString(M, 9 * mm, f'Почати: {SITE}/kabinet.html  ·  Telegram {TG}  ·  {PHONE}')
    c.save()

if __name__ == '__main__':
    out = sys.argv[1]
    build_start(os.path.join(out, 'start.pdf')); build_cheat(os.path.join(out, 'shpargalka.pdf'))
    print('ok')
