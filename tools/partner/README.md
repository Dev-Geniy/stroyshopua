# PDF-курси для партнерів

Тексти всіх PDF — у `content.py` (один блок = одна платформа). Стартовий PDF і шпаргалка — у `extra.py`.

Перезібрати всі файли в папку `partner/` на сайті:

```
python3 tools/partner/build.py partner
python3 tools/partner/extra.py partner
```

Потрібен Python з `reportlab`. Шрифти Golos Text і Unbounded (ліцензія OFL) лежать у `fonts/`.
Анкета, яка видає ці PDF, — `anketa.html`.
