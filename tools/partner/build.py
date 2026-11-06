# -*- coding: utf-8 -*-
"""Генерує PDF-курси для партнерів Samostroy Shop."""
import os, re, sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas as cv
from reportlab.lib.utils import simpleSplit
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table,
                                TableStyle, KeepTogether, Flowable, CondPageBreak)

sys.path.insert(0, os.path.dirname(__file__))
from content import PLATFORMS, ORDER_STEPS, ORDER_TEMPLATE, TG, PHONE, SITE

FD = os.path.join(os.path.dirname(__file__), 'fonts')
pdfmetrics.registerFont(TTFont('G', os.path.join(FD, 'Golos-400.ttf')))
pdfmetrics.registerFont(TTFont('GB', os.path.join(FD, 'Golos-600.ttf')))
pdfmetrics.registerFont(TTFont('U', os.path.join(FD, 'Unbounded-500.ttf')))
pdfmetrics.registerFont(TTFont('UB', os.path.join(FD, 'Unbounded-700.ttf')))
pdfmetrics.registerFont(TTFont('DJ', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
from reportlab.pdfbase.pdfmetrics import registerFontFamily
registerFontFamily('G', normal='G', bold='GB', italic='G', boldItalic='GB')

INK = colors.HexColor('#1b1f24'); SOFT = colors.HexColor('#5d6670'); LINE = colors.HexColor('#e3e1dc')
OR = colors.HexColor('#f08a1c'); ORL = colors.HexColor('#fff3e4'); PAPER = colors.HexColor('#f6f4f0')
OK = colors.HexColor('#2f9d5a'); BAD = colors.HexColor('#d9534f'); DARK = colors.HexColor('#1b1f24')

W, H = A4
M = 18 * mm

ST = {
 'lead': ParagraphStyle('lead', fontName='G', fontSize=12, leading=17.5, textColor=INK, spaceAfter=8),
 'p': ParagraphStyle('p', fontName='G', fontSize=10, leading=14.5, textColor=INK),
 'ps': ParagraphStyle('ps', fontName='G', fontSize=9, leading=13, textColor=SOFT),
 'h2': ParagraphStyle('h2', fontName='U', fontSize=14, leading=18, textColor=INK, spaceBefore=14, spaceAfter=8),
 'h3': ParagraphStyle('h3', fontName='GB', fontSize=10.5, leading=14, textColor=INK),
 'tpl': ParagraphStyle('tpl', fontName='G', fontSize=9.5, leading=14, textColor=INK),
 'chip': ParagraphStyle('chip', fontName='GB', fontSize=9, leading=12, textColor=OR),
 'num': ParagraphStyle('num', fontName='UB', fontSize=11, leading=14, textColor=OR, alignment=TA_CENTER),
}

EMO = re.compile('[\U0001F000-\U0001FFFF☀-➿️‍]')
def clean(s):
    s = s.replace('✅', '\x01').replace('☐', '\x02')
    s = EMO.sub('', s)
    s = s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    s = s.replace('\x01', '<font name="DJ" color="#2f9d5a">✓</font>').replace('\x02', '<font name="DJ">☐</font>')
    s = re.sub(r' +([.,!?])', r'\1', s); s = re.sub(r'  +', ' ', s)
    s = re.sub(r'[ \t]+\n', '\n', s).replace('\n', '<br/>')
    return re.sub(r'<br/>\s+', '<br/>', s).strip()

def P(t, s='p'): return Paragraph(clean(t), ST[s])

class Box(Flowable):
    """Порожній квадратик-чекбокс."""
    def __init__(self, s=11): super().__init__(); self.s = s; self.width = self.height = s
    def draw(self):
        self.canv.setStrokeColor(OR); self.canv.setLineWidth(1.2)
        self.canv.roundRect(0, 0, self.s, self.s, 2, stroke=1, fill=0)

def callout(flow, bg=ORL, bar=OR, pad=10):
    t = Table([[flow]], colWidths=[W - 2 * M])
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), bg), ('LINEBEFORE', (0, 0), (0, -1), 3, bar),
                           ('LEFTPADDING', (0, 0), (-1, -1), pad + 2), ('RIGHTPADDING', (0, 0), (-1, -1), pad),
                           ('TOPPADDING', (0, 0), (-1, -1), pad), ('BOTTOMPADDING', (0, 0), (-1, -1), pad)]))
    return t

def bullets(items, mark='•', color=OR, style='p', font='GB'):
    rows = [[Paragraph(f'<font name="{font}" color="#{color.hexval()[2:]}">{mark}</font>', ST[style]), P(i, style)] for i in items]
    t = Table(rows, colWidths=[12, W - 2 * M - 34])
    t.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 0),
                           ('RIGHTPADDING', (0, 0), (-1, -1), 0), ('BOTTOMPADDING', (0, 0), (-1, -1), 4), ('TOPPADDING', (0, 0), (-1, -1), 0)]))
    return t

def steps(items, check=True):
    rows = []
    for i, it in enumerate(items, 1):
        title, txt = it if isinstance(it, tuple) else (None, it)
        body = [Paragraph(f'{clean(title)}', ST['h3']), P(txt)] if title else [P(txt)]
        rows.append([Box() if check else '', Paragraph(str(i), ST['num']), body])
    t = Table(rows, colWidths=[18, 22, W - 2 * M - 40])
    t.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 0),
                           ('RIGHTPADDING', (0, 0), (-1, -1), 4), ('TOPPADDING', (0, 0), (-1, -1), 7),
                           ('BOTTOMPADDING', (0, 0), (-1, -1), 7), ('LINEBELOW', (0, 0), (-1, -2), 0.5, LINE),
                           ('TOPPADDING', (0, 0), (0, -1), 9)]))
    return t

def bands_for(metric):
    return ['до 10', '10–100', '100+'] if 'ідгук' in metric else ['0–1 000', '1 000–10 000', '10 000+']

# ------------------------------------------------------------------ сторінки
class Doc(BaseDocTemplate):
    def __init__(self, fn, title, subtitle, tag, short, **kw):
        super().__init__(fn, pagesize=A4, leftMargin=M, rightMargin=M, topMargin=M, bottomMargin=20 * mm,
                         title=title, author='Samostroy Shop', subject=subtitle, **kw)
        self.t, self.sub, self.tag, self.short = title, subtitle, tag, short
        hb = 78 * mm
        f1 = Frame(M, 20 * mm, W - 2 * M, H - hb - 20 * mm - 8 * mm, id='f1', leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        f2 = Frame(M, 20 * mm, W - 2 * M, H - 20 * mm - 22 * mm, id='f2', leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        self.addPageTemplates([PageTemplate('first', [f1], onPage=self.first, autoNextPageTemplate='rest'),
                               PageTemplate('rest', [f2], onPage=self.rest)])

    def foot(self, c):
        c.setStrokeColor(LINE); c.setLineWidth(0.6); c.line(M, 14 * mm, W - M, 14 * mm)
        c.setFont('G', 8); c.setFillColor(SOFT)
        c.drawString(M, 9.5 * mm, f'{SITE}  ·  Telegram {TG}  ·  {PHONE}')
        c.drawRightString(W - M, 9.5 * mm, str(c.getPageNumber()))

    def first(self, c, d):
        hb = 78 * mm
        c.setFillColor(DARK); c.rect(0, H - hb, W, hb, stroke=0, fill=1)
        c.setFillColor(OR); c.rect(0, H - hb, W, 2.2 * mm, stroke=0, fill=1)
        # «плитка» декор
        c.setFillColor(colors.HexColor('#242a31'))
        for i in range(4):
            for j in range(3):
                c.roundRect(W - M - 52 * mm + i * 13.5 * mm, H - 30 * mm - j * 13.5 * mm, 11.5 * mm, 11.5 * mm, 2, stroke=0, fill=1)
        c.setFillColor(OR); c.roundRect(W - M - 52 * mm + 3 * 13.5 * mm, H - 30 * mm, 11.5 * mm, 11.5 * mm, 2, stroke=0, fill=1)
        c.setFont('UB', 9); c.setFillColor(colors.white); c.drawString(M, H - 16 * mm, 'SAMOSTROY SHOP')
        c.setFont('G', 9); c.setFillColor(colors.HexColor('#a3acb4')); c.drawString(M + c.stringWidth('SAMOSTROY SHOP','UB',9) + 3*mm, H - 16 * mm, '·  Курс для партнерів')
        # чип
        c.setFont('GB', 8.5); tw = c.stringWidth(self.tag.upper(), 'GB', 8.5)
        c.setFillColor(OR); c.roundRect(M, H - 30 * mm, tw + 10 * mm / 2 * 2, 6.5 * mm, 3.2 * mm, stroke=0, fill=1)
        c.setFillColor(DARK); c.drawString(M + 5 * mm, H - 30 * mm + 2.2 * mm, self.tag.upper())
        # заголовок
        lines = simpleSplit(self.t, 'UB', 21, W - 2 * M - 58 * mm)
        y = H - 43 * mm
        c.setFillColor(colors.white); c.setFont('UB', 21)
        for ln in lines[:3]:
            c.drawString(M, y, ln); y -= 27
        c.setFont('G', 10); c.setFillColor(colors.HexColor('#c9cfd4'))
        for ln in simpleSplit(self.sub, 'G', 10, W - 2 * M - 58 * mm)[:2]:
            c.drawString(M, y + 6, ln); y -= 13
        self.foot(c)

    def rest(self, c, d):
        c.setFont('UB', 7.5); c.setFillColor(OR); c.drawString(M, H - 12 * mm, 'SAMOSTROY SHOP')
        c.setFont('G', 8); c.setFillColor(SOFT); c.drawRightString(W - M, H - 12 * mm, self.short)
        c.setStrokeColor(LINE); c.setLineWidth(0.6); c.line(M, H - 15 * mm, W - M, H - 15 * mm)
        self.foot(c)

def h2(t): return P(t, 'h2')

def order_section():
    s = [CondPageBreak(70 * mm), h2('Як передати замовлення нам'), steps(ORDER_STEPS, check=False), Spacer(1, 6),
         KeepTogether([P('Шаблон повідомлення менеджеру', 'h3'), Spacer(1, 4), callout(P(ORDER_TEMPLATE, 'tpl'), bg=PAPER, bar=SOFT)] + help_box())]
    return s

def help_box():
    return [Spacer(1, 14), callout(Paragraph(
        f'<font name="GB">Потрібна допомога?</font> Менеджер підкаже товари під ваш канал, надішле прайс і перевірить ваші перші оголошення. '
        f'Telegram <font name="GB">{TG}</font> · телефон <font name="GB">{PHONE}</font> · готові тексти й фото: <font name="GB">{SITE}/partners.html</font>', ST['p']))]

def build_platform(p, out):
    doc = Doc(out, p['title'], 'Покроковий план: як почати з нуля і як рости, якщо акаунт уже є', p['tag'], p['name'])
    s = [P(p['lead'], 'lead'), Paragraph(f'<font name="GB" color="#f08a1c">КОМУ ПІДХОДИТЬ.</font> {clean(p["fit"])}', ST['p']), Spacer(1, 4)]
    s += [h2('Важливо знати'), callout(bullets(p['facts']))]
    s += [CondPageBreak(60 * mm), h2('Старт з нуля: покроково'), P('Відмічайте виконані кроки — так ви бачите прогрес, а менеджер розуміє, на якому ви етапі.', 'ps'), Spacer(1, 4), steps(p['zero'])]
    # план
    rows = [[Paragraph(f'<font name="GB">{clean(a)}</font>', ST['p']), P(b)] for a, b in p['plan']]
    t = Table(rows, colWidths=[30 * mm, W - 2 * M - 30 * mm])
    t.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('BACKGROUND', (0, 0), (0, -1), PAPER),
                           ('LINEBELOW', (0, 0), (-1, -2), 0.5, LINE), ('TOPPADDING', (0, 0), (-1, -1), 6),
                           ('BOTTOMPADDING', (0, 0), (-1, -1), 6), ('LEFTPADDING', (0, 0), (-1, -1), 8), ('BOX', (0, 0), (-1, -1), 0.5, LINE)]))
    s += [KeepTogether([h2('Перші 14 днів'), t])]
    # ріст
    bl = bands_for(p['metric'])
    s += [CondPageBreak(60 * mm), h2('Акаунт уже є: як рости'), P(f'Знайдіть свій рівень за показником «{p["metric"]}» і виконайте пункти зі свого блоку.', 'ps'), Spacer(1, 6)]
    for (_, tips), lab in zip(p['grow'], bl):
        head = Paragraph(f'<font name="GB">{clean(p["metric"])}: {lab}</font>', ST['chip'])
        s += [KeepTogether([head, Spacer(1, 3), bullets(tips, mark='→', color=OR), Spacer(1, 6)])]
    # шаблони
    s += [CondPageBreak(45 * mm), h2('Готові шаблони')]
    for a, b in p['tpl']:
        s += [KeepTogether([P(a, 'h3'), Spacer(1, 4), callout(P(b, 'tpl'), bg=PAPER, bar=SOFT), Spacer(1, 8)])]
    s += [P('Емодзі додайте за смаком — у PDF їх прибрано для читабельності. Квадратні дужки [ ] замініть своїми даними.', 'ps')]
    s += [KeepTogether([h2('Типові помилки'), bullets(p['mistakes'], mark='✕', color=BAD, font='DJ')])]
    s += order_section()
    doc.build(s)

if __name__ == '__main__':
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    for p in PLATFORMS:
        build_platform(p, os.path.join(out, p['id'] + '.pdf'))
        print('ok', p['id'])
