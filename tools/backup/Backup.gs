/**
 * Samostroy Shop — щотижнева резервна копія Google-таблиць.
 *
 * Що робить: раз на тиждень зберігає кожну таблицю зі списку TABLES як файл Excel (.xlsx)
 * у папку Google Диска «Samostroy — резервні копії». Старі копії понад KEEP видаляє в кошик.
 * Якщо задано TG_TOKEN і TG_CHAT — надсилає звіт у Telegram (і повідомлення, якщо щось не вдалося).
 *
 * Запуск — див. tools/backup/ЯК-ЗАПУСТИТИ.md. Коротко: вставити цей код у новий проєкт
 * на script.google.com, вписати адреси таблиць нижче й один раз запустити функцію «setup».
 */

/* ================== НАЛАШТУВАННЯ (можна змінювати) ================== */

// Адреси таблиць (просто скопіюйте з адресного рядка браузера). Назва в лапках — як буде названо файл копії.
const TABLES = [
  ['Samostroy — замовлення', 'ВСТАВТЕ_СЮДИ_АДРЕСУ_ОСНОВНОЇ_ТАБЛИЦІ'],
  ['Samostroy — партнери',   'ВСТАВТЕ_СЮДИ_АДРЕСУ_ТАБЛИЦІ_ПАРТНЕРІВ'],
];

const FOLDER_NAME = 'Samostroy — резервні копії'; // папка на Google Диску (створиться сама)
const KEEP = 12;                                   // скільки останніх копій кожної таблиці зберігати (12 = ~3 місяці)
const WEEKDAY = 'MONDAY';                          // день копіювання: MONDAY, TUESDAY, … SUNDAY
const HOUR = 4;                                    // година (за часом проєкту, налаштуйте Київ у параметрах проєкту)

// Telegram (необов’язково). Можна взяти ті самі значення, що в основному скрипті. Порожньо = без сповіщень.
const TG_TOKEN = '';
const TG_CHAT = '';
const TG_ONLY_ERRORS = false; // true = писати в Telegram лише якщо копія не вдалася

/* ===================================================================== */


/** Запустіть ОДИН раз: створює щотижневий розклад і одразу робить першу копію. */
function setup() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'backupNow')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('backupNow')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay[WEEKDAY])
    .atHour(HOUR)
    .create();
  const res = backupNow();
  Logger.log('Розклад створено: щотижня, ' + WEEKDAY + ' о ' + HOUR + ':00. ' + res);
}

/** Робить копію всіх таблиць зараз. Можна запускати вручну будь-коли. */
function backupNow() {
  const folder = getFolder_();
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH-mm');
  const ok = [], bad = [];

  TABLES.forEach(([name, link]) => {
    try {
      const id = sheetId_(link);
      if (!id) throw new Error('не вписано адресу таблиці');
      const blob = exportXlsx_(id).setName(name + ' — ' + stamp + '.xlsx');
      const file = folder.createFile(blob);
      const removed = cleanup_(folder, name);
      ok.push('✅ ' + name + ' (' + Math.max(1, Math.round(file.getSize() / 1024)) + ' КБ' + (removed ? ', видалено старих: ' + removed : '') + ')');
    } catch (e) {
      bad.push('❌ ' + name + ': ' + (e && e.message ? e.message : e));
    }
  });

  const text = '💾 Резервна копія таблиць Samostroy — ' + stamp + '\n' + ok.concat(bad).join('\n') +
    '\nПапка: ' + folder.getUrl();
  if (bad.length || !TG_ONLY_ERRORS) tg_(text);
  if (bad.length && !ok.length) throw new Error(text); // Google також надішле лист про помилку
  return text;
}

/* ---------- службові функції ---------- */

function sheetId_(link) {
  const s = String(link || '').trim();
  const m = s.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
  if (m) return m[1];
  return /^[a-zA-Z0-9_-]{20,}$/.test(s) ? s : '';
}

function exportXlsx_(id) {
  const url = 'https://docs.google.com/spreadsheets/d/' + id + '/export?format=xlsx';
  for (let i = 0; i < 3; i++) {
    const r = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true,
    });
    const code = r.getResponseCode();
    if (code === 200) return r.getBlob();
    if (code === 404 || code === 403) throw new Error('немає доступу до таблиці — перевірте адресу і що вона у вашому акаунті');
    Utilities.sleep(5000 * (i + 1)); // тимчасова помилка Google — повторюємо
  }
  throw new Error('Google не віддав файл, спробую наступного тижня');
}

function getFolder_() {
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}

/** Лишає KEEP найновіших копій цієї таблиці, решту — в кошик (звідти ще 30 днів можна відновити). */
function cleanup_(folder, name) {
  const files = [];
  const it = folder.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    if (f.getName().indexOf(name + ' — ') === 0) files.push(f);
  }
  files.sort((a, b) => b.getDateCreated() - a.getDateCreated());
  const old = files.slice(Math.max(1, KEEP));
  old.forEach(f => f.setTrashed(true));
  return old.length;
}

function tg_(text) {
  if (!TG_TOKEN || !TG_CHAT) return;
  try {
    UrlFetchApp.fetch('https://api.telegram.org/bot' + TG_TOKEN + '/sendMessage', {
      method: 'post',
      payload: { chat_id: TG_CHAT, text: text, disable_web_page_preview: 'true' },
      muteHttpExceptions: true,
    });
  } catch (e) { /* без Telegram копія все одно зроблена */ }
}
