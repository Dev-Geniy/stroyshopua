/* Налаштування магазину — спільні для всіх сторінок сайту. Змінюйте лише значення в лапках. */
/* ================== НАЛАШТУВАННЯ (можна змінювати) ================== */
var CFG={
 site:'https://samostroy.shop/',
 xml:'products.xml',                                   // файл з товарами поруч з index.html
 xmlBackup:'https://raw.githubusercontent.com/Dev-Geniy/stroyshopua/main/products.xml',
 tg:'manager_samostroy_shop',                          // Telegram менеджера (без @)
 viber:'+380752193207',                                // номер Viber. Порожньо '' = кнопку сховано
 phone:'+380752193207',
 step:24,                                              // скільки товарів показувати за раз
 samplesNote:'',                                       // напр. 'Зразки 3 матеріалів — 50 грн'. Порожньо = без ціни
 quizBonus:'',                                         // напр. 'Знижка 5% на перше замовлення після підбору'. Порожньо = без бонусу
 videos:[],                                            // [['Монтаж 3D панелей','https://www.tiktok.com/@stroyshop_ua/video/...']]
 reviews:[],                                          // [['фото.jpg','Кухня, PET плитка, Дніпро']]
 imgbb:'15e623a143a716e907d3402a0e84ce78',                // ключ imgbb.com для фото «до/після» у відгуках. Порожньо = без завантаження фото
 papi:'https://script.google.com/macros/s/AKfycbxEYmnhjGKGAZz-3RwFFQTR7XItSeFp8xPlrVQfFtrh-6L0reedHd-C21a0_HZ227mI/exec',                                              // адреса скрипта особистого кабінету партнерів (tools/partner-api/ЯК-ЗАПУСТИТИ.md). Порожньо = кабінет показує заглушку
 api:'https://script.google.com/macros/s/AKfycbzeYmkpMqlVwH6RsNc67d3YDuFGinnPmfy6UnWcW0FYEUpaoforC5m-GF4T1NVEMonn4w/exec'                                                // адреса скрипта Google (див. інструкцію). Порожньо = замовлення лише через Telegram
};
/* ===================================================================== */
