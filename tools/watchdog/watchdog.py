#!/usr/bin/env python3
"""Сторож Samostroy Shop: перевіряє сайт, каталог, три скрипти Google і Telegram-ботів.
Якщо щось перестало відповідати — пише в адмін-бот. Коли запрацювало знову — теж пише.
Запускається з .github/workflows/watchdog.yml кожні 10–15 хвилин. Інструкція — tools/watchdog/ЯК-УВІМКНУТИ.md.

Секрети GitHub (Settings → Secrets and variables → Actions):
  ADMIN_BOT_TOKEN — токен адмін-бота (той самий BOT_TOKEN, що в основному скрипті)
  ADMIN_CHAT_ID   — ваш ID чату з адмін-ботом (той самий CHAT_ID; кілька — через кому)
  CLIENT_BOT_TOKEN, DROP_BOT_TOKEN — необов’язково: тоді сторож перевіряє й цих ботів.
"""
import json, os, re, sys, time, html, urllib.request, urllib.error
from datetime import datetime, timezone, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STATE = os.environ.get('WATCH_STATE', os.path.join(ROOT, '.watchdog', 'state.json'))
SITE = 'https://samostroy.shop/'
KYIV = timezone(timedelta(hours=2))
REPEAT_H = 3          # нагадувати про ту саму проблему не частіше ніж раз на 3 години
CATALOG_MAX_H = 30    # каталог має оновлюватися кожні 3 години; тривога, якщо старший за 30 годин
UA = {'User-Agent': 'SamostroyWatchdog/1.0'}


def read(path):
    with open(os.path.join(ROOT, path), encoding='utf-8') as f:
        return f.read()


def urls():
    """Адреси скриптів беремо з config.js і v/config.js — щоб не дублювати."""
    c, v = read('config.js'), read('v/config.js')
    def find(src, key):
        m = re.search(key + r"\s*:\s*'(https://script\.google\.com/[^']+)'", src)
        return m.group(1) if m else ''
    return {'main': find(c, r'\bapi'), 'partner': find(c, 'papi'), 'vitryna': find(v, r'\bapi')}


def get(url, timeout=45):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read().decode('utf-8', 'replace')


def try_twice(fn):
    """Скрипти Google інколи «прокидаються» довго — перед тривогою перевіряємо вдруге через 25 секунд."""
    ok, msg = fn()
    if ok:
        return ok, msg
    time.sleep(25)
    return fn()


def check_script(name, url, service):
    def run():
        if not url:
            return False, 'адресу не знайдено в config.js'
        try:
            st, body = get(url + ('&' if '?' in url else '?') + 'health=1')
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return False, 'адресу скрипта не знайдено (404): розгортання архівовано/видалено або в config.js інша адреса'
            if e.code in (401, 403):
                return False, f'немає доступу ({e.code}): у розгортанні «Хто має доступ» має бути «Усі»'
            return False, f'Google відповів помилкою HTTP {e.code} (часто — тимчасовий збій або вичерпано ліміт)'
        except Exception as e:
            return False, f'немає відповіді ({type(e).__name__})'
        try:
            j = json.loads(body)
        except Exception:
            low = body.lower()
            if 'accounts.google.com' in low or 'sign in' in low or 'вхід' in low:
                return False, 'просить увійти в Google — у розгортанні «Хто має доступ» має бути «Усі»'
            if 'script function not found' in low:
                return False, 'у коді немає doGet — вставлено не той код'
            return False, 'відповідає не JSON (помилка Google або скрипта)'
        if not j.get('ok'):
            return False, 'помилка скрипта: ' + str(j.get('error') or '?')[:150]
        if service and j.get('service') and j.get('service') != service:
            return False, f'за цією адресою інший скрипт ({j.get("service")})'
        return True, 'працює' + (' · таблиця відкривається' if j.get('health') else '')
    return try_twice(run)


def check_site():
    def run():
        try:
            st, body = get(SITE, 30)
            return ('Samostroy' in body, 'працює' if 'Samostroy' in body else 'сторінка відкривається, але без вмісту')
        except Exception as e:
            return False, f'не відкривається ({type(e).__name__})'
    return try_twice(run)


def check_catalog():
    try:
        st, body = get(SITE + 'app/catalog.json?t=' + str(int(time.time())), 30)
        j = json.loads(body)
        upd = datetime.strptime(j['updated'], '%Y-%m-%d %H:%M').replace(tzinfo=KYIV)
        age = (datetime.now(KYIV) - upd).total_seconds() / 3600
        n = len(j.get('items', []))
        if n < 50:
            return False, f'у каталозі лише {n} товарів'
        if age > CATALOG_MAX_H:
            return False, f'не оновлювався {int(age)} год (останнє оновлення {j["updated"]}) — перевірте GitHub → Actions → «Синхронізація товарів»'
        return True, f'оновлено {j["updated"]}, {n} товарів'
    except Exception as e:
        return False, f'не вдалося прочитати ({type(e).__name__})'


def tg(token, method, data=None):
    url = f'https://api.telegram.org/bot{token}/{method}'
    req = urllib.request.Request(url, data=json.dumps(data).encode() if data else None, headers={'Content-Type': 'application/json', **UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode())


def check_bot(token):
    if not token:
        return None
    try:
        me = tg(token, 'getMe')
        if not me.get('ok'):
            return False, 'токен не працює (бота видалено або токен змінено)'
        w = tg(token, 'getWebhookInfo').get('result', {})
        name = '@' + me['result'].get('username', '')
        if w.get('url'):
            err_at, pend = w.get('last_error_date') or 0, w.get('pending_update_count') or 0
            if pend >= 3 and err_at and time.time() - err_at < 1800:
                return False, f'{name}: повідомлення не доходять до скрипта ({pend} у черзі) — «{(w.get("last_error_message") or "")[:120]}»'
            return True, f'{name} працює'
        return True, f'{name} працює (режим опитування)'
    except Exception as e:
        return False, f'Telegram не відповідає ({type(e).__name__})'


HINT = {
    'main': 'Скрипт замовлень (таблиця із замовленнями сайту) → Apps Script → «Виконання» — там видно помилку.',
    'partner': 'Скрипт кабінету партнерів → Apps Script → «Виконання».',
    'vitryna': 'Скрипт вітрин (таблиця «Samostroy — вітрини») → Apps Script → «Виконання».',
}
TITLE = {'site': 'Сайт samostroy.shop', 'catalog': 'Каталог і ціни', 'main': 'Скрипт замовлень сайту',
         'partner': 'Скрипт кабінету партнерів', 'vitryna': 'Скрипт вітрин', 'bot_admin': 'Адмін-бот',
         'bot_client': 'Бот для клієнтів', 'bot_drop': 'Бот партнерів (Drop)'}
WHAT = {'main': 'Клієнти не можуть оформити замовлення на сайті.', 'partner': 'Партнери не можуть увійти в кабінет і оформити замовлення.',
        'vitryna': 'Вітрини партнерів не відкриваються й не приймають замовлень.', 'site': 'Сайт недоступний для покупців.',
        'catalog': 'На сайті можуть бути застарілі ціни й наявність.', 'bot_admin': 'Сповіщення про замовлення можуть не приходити.',
        'bot_client': 'Клієнти не отримують статуси в Telegram.', 'bot_drop': 'Партнери не отримують сповіщення в Telegram.'}


def kyiv_now():
    return datetime.now(KYIV).strftime('%d.%m %H:%M')


def dur(sec):
    m = int(sec // 60)
    return f'{m} хв' if m < 60 else f'{m // 60} год {m % 60} хв'


def main():
    token, chats = os.environ.get('ADMIN_BOT_TOKEN', '').strip(), [c.strip() for c in os.environ.get('ADMIN_CHAT_ID', '').split(',') if c.strip()]
    report = os.environ.get('WATCH_REPORT', '') in ('1', 'true')
    u = urls()
    res = {'site': check_site(), 'catalog': check_catalog(),
           'main': check_script('main', u['main'], 'samostroy-orders'),
           'partner': check_script('partner', u['partner'], 'samostroy-partners'),
           'vitryna': check_script('vitryna', u['vitryna'], 'samostroy-vitryny')}
    for k, env in (('bot_admin', 'ADMIN_BOT_TOKEN'), ('bot_client', 'CLIENT_BOT_TOKEN'), ('bot_drop', 'DROP_BOT_TOKEN')):
        r = check_bot(os.environ.get(env, '').strip())
        if r:
            res[k] = r
    for k, (ok, msg) in res.items():
        print(('OK  ' if ok else 'FAIL') + f' {TITLE[k]}: {msg}')

    try:
        with open(STATE, encoding='utf-8') as f:
            state = json.load(f)
    except Exception:
        state = {}
    now, msgs, changed = time.time(), [], False
    for k, (ok, msg) in res.items():
        s = state.get(k, {})
        if not ok:
            if not s.get('since'):
                s = {'since': now, 'alert': now}
                msgs.append(f'🔴 <b>{TITLE[k]}</b> — не працює\n{html.escape(msg)}\n<i>{WHAT.get(k, "")}</i>' + (f'\n➡️ {HINT[k]}' if k in HINT else ''))
            elif now - s.get('alert', 0) > REPEAT_H * 3600:
                s['alert'] = now
                msgs.append(f'🔴 <b>{TITLE[k]}</b> досі не працює ({dur(now - s["since"])})\n{html.escape(msg)}')
            s['msg'] = msg
            state[k] = s
            changed = True
        elif s.get('since'):
            msgs.append(f'🟢 <b>{TITLE[k]}</b> знову працює (не працював {dur(now - s["since"])})')
            state.pop(k, None)
            changed = True
    if report and not msgs:
        msgs.append('✅ <b>Сторож: усе працює</b>\n' + '\n'.join(f'{"✓" if ok else "✗"} {TITLE[k]}: {html.escape(m)}' for k, (ok, m) in res.items()))

    if msgs and token and chats:
        text = '🛡 <b>Сторож Samostroy</b> · ' + kyiv_now() + '\n\n' + '\n\n'.join(msgs)
        for c in chats:
            try:
                tg(token, 'sendMessage', {'chat_id': c, 'text': text[:4000], 'parse_mode': 'HTML', 'disable_web_page_preview': True})
            except Exception as e:
                print('Telegram: не вдалося надіслати', type(e).__name__, file=sys.stderr)
    elif msgs:
        print('Немає ADMIN_BOT_TOKEN / ADMIN_CHAT_ID — повідомлення не надіслано:\n' + '\n\n'.join(msgs))

    os.makedirs(os.path.dirname(STATE), exist_ok=True)
    with open(STATE, 'w', encoding='utf-8') as f:
        json.dump(state, f, ensure_ascii=False)
    out = os.environ.get('GITHUB_OUTPUT')
    if out:
        with open(out, 'a') as f:
            f.write(f'changed={"1" if changed else "0"}\n')


if __name__ == '__main__':
    main()
