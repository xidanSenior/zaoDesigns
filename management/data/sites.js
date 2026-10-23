/* =========================================================
   СНК · Управление продуктами — демо-данные разделов, добавленных позже:
   «СНК-Личный кабинет» (копии ЛК), «Сайты» (Администрирование)
   и вкладки карточки организации «Обновления», «Офисное ПО», «Внешние ТО».
   Отдельный файл, чтобы не сдвигать генератор случайных чисел в data/demo.js.
   Все значения вымышлены. TODO: API — /pa/copies, /admin/sites/*, /admin/organizations/*.
   ========================================================= */
(function (root) {
  /* ---------- СНК-Личный кабинет: копии ЛК организации ----------
     status: active | none | revoked; online: true | false | null (брокер не ответил);
     admin: копия поддерживает вход в админку из management; probeFailed: не ответила на проверку версии */
  const paCopies = [
    { guid: 'a1f3-0001', org: 1, placeKey: 101, comment: 'ЛК водителей «Демо-Ойл»', computerId: '7F3A-91C2-44DE-0B18-6A2F', status: 'active', online: true, admin: true, version: '3.4.2', lastSeenAt: '20.10.2026 13:52' },
    { guid: 'a1f3-0002', org: 1, placeKey: 102, comment: 'ЛК корпоративных клиентов', computerId: '2B90-11AF-7C33-D401-E95B', status: 'active', online: true, admin: false, version: '3.1.0', lastSeenAt: '20.10.2026 12:10' },
    { guid: 'a1f3-0003', org: 1, placeKey: 103, comment: 'Резервная копия', computerId: '90CD-5E12-0A7B-338F-1C64', status: 'active', online: false, admin: true, version: '3.4.2', lastSeenAt: '17.10.2026 09:41' },
    { guid: 'a1f3-0004', org: 2, placeKey: 201, comment: 'ЛК «Пример-Трейд»', computerId: '4C1E-A082-6B5D-7E90-23F1', status: 'active', online: true, admin: true, version: '3.4.1', lastSeenAt: '20.10.2026 13:58', probeFailed: true },
    { guid: 'a1f3-0005', org: 3, placeKey: 301, comment: 'ЛК «Тестовая сеть»', computerId: 'D7E2-3390-B1A4-5C06-8F2D', status: 'active', online: null, admin: true, version: '3.4.2', lastSeenAt: '20.10.2026 11:03' },
    { guid: 'a1f3-0006', org: 3, placeKey: 302, comment: '', computerId: null, status: 'none', online: null, admin: false, version: '', lastSeenAt: '' },
    { guid: 'a1f3-0007', org: 4, placeKey: 401, comment: 'ЛК ИП Образцов', computerId: 'E013-77B2-9D4C-A6F0-51B8', status: 'revoked', online: false, admin: false, version: '2.9.7', lastSeenAt: '02.09.2026 16:20' }
  ];
  const paHistory = {
    operations: [
      ['20.10.2026 13:40', 'Обновление ЛК до 3.4.2', 'Петров И. С.', 'Выполнено'],
      ['14.10.2026 10:05', 'Перезапуск копии', 'Смирнова А. В.', 'Выполнено'],
      ['02.10.2026 17:22', 'Обновление ЛК до 3.4.1', 'Петров И. С.', 'Копия не ответила']
    ],
    connections: [
      ['20.10.2026 13:52', 'Подключение копии', '10.20.4.17'],
      ['20.10.2026 08:01', 'Отключение: перезапуск службы', '10.20.4.17'],
      ['19.10.2026 21:14', 'Подключение копии', '10.20.4.17'],
      ['17.10.2026 09:41', 'Код подключения выдан', '—']
    ],
    admin: [
      ['20.10.2026 13:44', 'Открыл админку', 'Петров И. С.', '—'],
      ['20.10.2026 13:46', 'Карта: статус (вкл./выкл.)', 'Петров И. С.', 'Выполнено'],
      ['20.10.2026 13:47', 'SmartCaptcha: видимость для авторизации', 'Петров И. С.', 'Неверные данные'],
      ['20.10.2026 13:51', 'Сессия закрыта: закрыта вкладка админки', 'Петров И. С.', '—']
    ]
  };

  /* ---------- Карточка организации ---------- */
  // Управление обновлениями: группы «для всех рабочих мест» и «индивидуальные обновления ТО»
  const orgUpdates = [
    { id: 1, group: 'all', feature: 'СНК-АЗС', version: '4.12.0', name: 'Стабильные', number: '4120', date: '31.12.2026', confirmed: true },
    { id: 2, group: 'all', feature: 'СНК-Офис', version: '3.8.1', name: 'Стабильные', number: '3081', date: '31.12.2026', confirmed: true },
    { id: 3, group: 'all', feature: 'СНК-ЛК-Офис', version: '2.6.0', name: 'Исправленные', number: '2060', date: '15.11.2026', confirmed: false },
    { id: 4, group: 'one', feature: 'СНК-АЗС', version: '4.13.0-beta.2', name: 'Бета', number: '4132', date: '01.11.2026', place: 'АЗС № 3 · ТО-0003', confirmed: false },
    { id: 5, group: 'one', feature: 'СНК-АЗС', version: '4.11.3', name: 'Исправленные', number: '4113', date: '30.11.2026', place: 'АЗС № 12 · ТО-0012', confirmed: true }
  ];
  const updateOps = [
    ['20.10.2026 10:12', 'Разрешение обновления', 'СНК-АЗС 4.12.0', 'Организация', 'Петров И. С.', 'Плановое обновление сети'],
    ['14.10.2026 15:40', 'Пропуск версии', 'СНК-АЗС 4.11.4', 'Рабочие места: 2', 'Смирнова А. В.', '—'],
    ['01.10.2026 09:03', 'Отмена разрешения', 'СНК-Офис 3.8.0', 'Организация', 'Петров И. С.', 'Ошибка печати отчётов']
  ];
  // Офисное ПО: основные рабочие места и дополнительные под ними
  const SOFT_TYPES = { 200: 'СНК-Офис', 6900: 'СНК-ЛК-Офис', 1800: 'СНК-ПЦ', 700: 'СНК-АСН', 9905: 'СНК-Личный кабинет' };
  const officeSoft = [
    { id: 1, type: 200, computerId: '6A10-22F3-90BC-1D47-E0A5', hasp: '1203 4410', comment: 'Бухгалтерия, центральный офис', children: [
      { id: 11, type: 200, computerId: '6A10-22F3-90BC-1D47-E0A6', hasp: '1203 4411', comment: 'Рабочее место оператора' },
      { id: 12, type: 200, computerId: null, hasp: '1203 4412', comment: 'Ноутбук руководителя' }
    ] },
    { id: 2, type: 1800, computerId: '0F55-AB12-34CD-90EE-7710', hasp: '1203 5501', comment: 'Процессинговый центр', children: [] },
    { id: 3, type: 700, computerId: 'C3B0-7E41-5A92-0D16-2F88', hasp: '1203 6602', comment: 'Учёт нефтепродуктов', children: [] },
    { id: 4, type: 9905, computerId: '7F3A-91C2-44DE-0B18-6A2F', hasp: '1203 7701', comment: 'ЛК водителей', paLink: 'active', children: [] },
    { id: 5, type: 6900, computerId: '2B90-11AF-7C33-D401-E95B', hasp: '1203 7702', comment: 'ЛК корпоративных клиентов', children: [] }
  ];
  // Внешние ТО: рабочие места СНК-ВС ПЦ и СНК-ВС ЕБС
  const externalServices = [
    { id: 1, type: 'СНК-ВС ПЦ', name: 'Шлюз процессинга «Демо-Карт»', hasp: '1203 8801', shopKey: '000417' },
    { id: 2, type: 'СНК-ВС ЕБС', name: 'Единая бонусная система', hasp: '1203 8802', shopKey: '000418' },
    { id: 3, type: 'СНК-ВС ПЦ', name: 'Шлюз «Тест-Флот»', hasp: '—', shopKey: '000512' }
  ];

  /* ---------- Сайты ----------
     build: success | running | queued | failed | never; stale — правки новее последней сборки */
  const sites = [
    { id: 1, domain: 'sncard.ru', legalName: 'ООО «Сибнефтекарт»', enabled: true, build: 'success', builtAt: '20.10.2026 11:42', took: 72, stale: false, subscribers: 214, releaseNews: true, locale: 'ru' },
    { id: 2, domain: 'snc-service.ru', legalName: 'ООО «СНК-Сервис»', enabled: true, build: 'success', builtAt: '19.10.2026 18:05', took: 64, stale: true, subscribers: 38, releaseNews: false, locale: 'ru' },
    { id: 3, domain: 'zao-sncard.ru', legalName: 'АО «НПФ «Сибнефтекарт»', enabled: true, build: 'failed', builtAt: '20.10.2026 09:17', took: 21, stale: true, subscribers: 0, releaseNews: false, locale: 'ru' },
    { id: 4, domain: 'demo-oil.example', legalName: 'ООО «Демо-Ойл»', enabled: false, build: 'never', builtAt: '', took: 0, stale: false, subscribers: 0, releaseNews: false, locale: 'ru' }
  ];
  const contract = { version: 'v14', commit: '8f2c1ad', source: 'от builder-worker' };

  // Меню сайта: type page | external | section | anchor | catalog
  const siteMenu = [
    { id: 1, label: 'О компании', type: 'page', target: 'o-kompanii', children: [
      { id: 11, label: 'История', type: 'anchor', target: 'history' },
      { id: 12, label: 'Реквизиты', type: 'page', target: 'rekvizity' }
    ] },
    { id: 2, label: 'Оборудование', type: 'catalog', target: 'equipment', children: [] },
    { id: 3, label: 'Программное обеспечение', type: 'section', target: 'software', children: [
      { id: 31, label: 'СНК-АЗС', type: 'page', target: 'software/snk-azs' },
      { id: 32, label: 'СНК-Офис', type: 'page', target: 'software/snk-ofis' }
    ] },
    { id: 4, label: 'Новости', type: 'page', target: 'news', children: [] },
    { id: 5, label: 'Карта АЗС', type: 'anchor', target: 'map', children: [] },
    { id: 6, label: 'Личный кабинет', type: 'external', target: 'https://lk.sncard.ru', children: [] }
  ];
  const sitePages = [
    { id: 1, slug: '', title: 'Главная', status: 'published', blocks: 6, updated: '20.10.2026 11:30' },
    { id: 2, slug: 'o-kompanii', title: 'О компании', status: 'published', blocks: 4, updated: '12.10.2026 16:02' },
    { id: 3, slug: 'rekvizity', title: 'Реквизиты', status: 'published', blocks: 1, updated: '01.09.2026 10:15' },
    { id: 4, slug: 'equipment', title: 'Оборудование', status: 'published', blocks: 2, updated: '15.10.2026 09:48' },
    { id: 5, slug: 'software', title: 'Программное обеспечение', status: 'published', blocks: 2, updated: '15.10.2026 09:50' },
    { id: 6, slug: 'news', title: 'Новости', status: 'published', blocks: 1, updated: '03.08.2026 12:00' },
    { id: 7, slug: 'contacts', title: 'Контакты', status: 'published', blocks: 2, updated: '18.10.2026 14:21' },
    { id: 8, slug: 'cart', title: 'Корзина', status: 'draft', blocks: 1, updated: '19.10.2026 17:40' },
    { id: 9, slug: 'vakansii', title: 'Вакансии', status: 'draft', blocks: 0, updated: '20.10.2026 10:02' }
  ];
  // Типы блоков из контракта builder-worker и пример содержимого главной
  const blockTypes = [
    { type: 'hero', title: 'Первый экран', text: 'Заголовок, подзаголовок и кнопка' },
    { type: 'rich_text', title: 'Текстовый блок', text: 'Свободный текст с заголовками и ссылками' },
    { type: 'metrics', title: 'Метрики', text: 'Цифры компании с подписями' },
    { type: 'history', title: 'История', text: 'Ключевые годы на шкале' },
    { type: 'news_list', title: 'Список новостей', text: 'Последние новости выбранной темы' },
    { type: 'station_network', title: 'Сеть АЗС', text: 'Карта станций из справочника' },
    { type: 'catalog', title: 'Каталог оборудования', text: 'Категории и товары справочника' },
    { type: 'software_catalog', title: 'Каталог ПО', text: 'Продукты ПО раздела' },
    { type: 'documents', title: 'Библиотека документов', text: 'Документы по разделам' },
    { type: 'contacts', title: 'Контакты', text: 'Отделы, телефоны и почта' },
    { type: 'cart_checkout', title: 'Оформление заказа', text: 'Состав корзины и реквизиты' }
  ];
  const pageBlocks = [
    { id: 1, type: 'hero', summary: 'Топливные карты и автоматизация АЗС · кнопка «Стать клиентом»' },
    { id: 2, type: 'metrics', summary: '4 метрики: 30 лет на рынке, 180+ АЗС в сети…' },
    { id: 3, type: 'rich_text', summary: '«Сибнефтекарт» — разработчик систем для топливного рынка…' },
    { id: 4, type: 'station_network', summary: 'Станции из справочника · легенда: офис, АЗС, связь' },
    { id: 5, type: 'news_list', summary: 'Тема: все · 3 новости · ссылка «Все новости»' },
    { id: 6, type: 'contacts', summary: '3 отдела · телефон и почта приёмной' }
  ];
  const newsCategories = ['Компания', 'Обновления', 'Партнёрам'];
  const siteNews = [
    { id: 1, publishedAt: '20.10.2026', title: 'Вышла версия СНК-АЗС 4.12', category: 'Обновления', slug: 'snk-azs-4-12', status: 'published', notified: true },
    { id: 2, publishedAt: '14.10.2026', title: 'Новый офис в Северске', category: 'Компания', slug: 'novyj-ofis-v-severske', status: 'published', notified: true },
    { id: 3, publishedAt: '02.10.2026', title: 'Условия партнёрской программы на 2027 год', category: 'Партнёрам', slug: 'partnerskaya-programma-2027', status: 'published', notified: false },
    { id: 4, publishedAt: '', title: 'График работы в ноябрьские праздники', category: '', slug: 'grafik-noyabr', status: 'draft', notified: false },
    { id: 5, publishedAt: '', title: 'СНК-Офис 3.9: отчёт по инкассации', category: 'Обновления', slug: 'snk-ofis-3-9', status: 'draft', notified: false }
  ];
  const catalog = {
    categories: [
      { id: 1, slug: 'trk', title: 'Топливораздаточные колонки', summary: 'ТРК и комплектующие' },
      { id: 2, slug: 'terminaly', title: 'Платёжные терминалы', summary: 'Терминалы самообслуживания и POS' },
      { id: 3, slug: 'urovnemery', title: 'Уровнемеры', summary: 'Системы измерения в резервуарах' }
    ],
    products: [
      { id: 1, category: 'Платёжные терминалы', name: 'Терминал самообслуживания ТС-4', description: 'Приём карт и наличных, уличное исполнение', price: 389000 },
      { id: 2, category: 'Платёжные терминалы', name: 'POS-терминал оператора', description: 'Для кассы АЗС, печать чеков', price: 48500 },
      { id: 3, category: 'Уровнемеры', name: 'Уровнемер магнитострикционный', description: 'Точность ±1 мм, датчик воды', price: 126000 },
      { id: 4, category: 'Топливораздаточные колонки', name: 'Контроллер ТРК КУ-2', description: 'Управление 2 сторонами колонки', price: null }
    ],
    documents: [
      { id: 1, title: 'Руководство оператора СНК-АЗС', description: 'Работа со сменой и продажами', fileUrl: '/uploads/docs/operator-azs.pdf' },
      { id: 2, title: 'Требования к оборудованию АЗС', description: 'Минимальные характеристики ПК и сети', fileUrl: '/uploads/docs/hw-requirements.pdf' },
      { id: 3, title: 'Договор-оферта на обслуживание', description: 'Редакция от 01.09.2026', fileUrl: '/uploads/docs/oferta.pdf' }
    ],
    partners: [
      { id: 1, name: 'Демо-Карт', logoUrl: 'demo-kart.svg', url: 'https://demo-kart.example' },
      { id: 2, name: 'Пример-Процессинг', logoUrl: 'primer-processing.svg', url: 'https://primer.example' },
      { id: 3, name: 'Тест-Флот', logoUrl: '', url: 'https://test-flot.example' }
    ],
    stations: [
      { id: 1, slug: 'tomsk-01', place: 'Томск', address: 'ул. Демонстрационная, 12' },
      { id: 2, slug: 'tomsk-02', place: 'Томск', address: 'пр. Образцовый, 44' },
      { id: 3, slug: 'seversk-01', place: 'Северск', address: 'ул. Примерная, 3' },
      { id: 4, slug: 'asino-01', place: 'Асино', address: 'тракт Проектный, 1' }
    ],
    software: [
      { id: 1, section: 'software', name: 'СНК-АЗС', slug: 'snk-azs', price: null },
      { id: 2, section: 'software', name: 'СНК-Офис', slug: 'snk-ofis', price: 54000 },
      { id: 3, section: 'software', name: 'СНК-Личный кабинет', slug: 'snk-lk', price: null }
    ]
  };
  const redirects = [
    { id: 1, fromPath: '/index.php?Itemid=42', toPath: '/o-kompanii', code: 301 },
    { id: 2, fromPath: '/about', toPath: '/o-kompanii', code: 301 },
    { id: 3, fromPath: '/price', toPath: '/equipment', code: 302 },
    { id: 4, fromPath: '/kontakty', toPath: '/contacts', code: 301 }
  ];
  const siteSettings = {
    brand: { name: 'Сибнефтекарт', sub: 'Системы для топливного рынка', short: 'СНК' },
    contacts: { address: '634009, г. Томск, ул. Демонстрационная, 10', phones: ['+7 (3822) 00-00-00', '+7 (3822) 00-00-01'], emails: ['info@sncard.ru', 'sales@sncard.ru'], schedule: 'Пн–Пт 9:00–18:00', lat: '56.4846', lng: '84.9476' },
    seo: { titleSuffix: 'Сибнефтекарт', description: 'Топливные карты, автоматизация АЗС и программное обеспечение для топливного рынка Сибири.', ogImage: '/uploads/og/sncard-1200x630.png' },
    footer: {
      legal: [['Политика конфиденциальности', 'privacy'], ['Пользовательское соглашение', 'terms']],
      cookie: ['Правила использования cookies', 'cookie-policy'],
      subscribe: { title: 'Новости компании на почту', consent: 'Я согласен получать письма и принимаю', consentLink: 'условия рассылки', consentPage: 'newsletter-terms' },
      phoneNote: 'Звонок по России бесплатный',
      requisites: [['ОГРН', '1027000000000'], ['ИНН', '7017000000']]
    },
    modules: { cart: true, newsletter: true, release_news: true, metrika: false, metrikaId: '' }
  };

  const SITES = { paCopies, paHistory, orgUpdates, updateOps, SOFT_TYPES, officeSoft, externalServices, sites, contract, siteMenu, sitePages, blockTypes, pageBlocks, newsCategories, siteNews, catalog, redirects, siteSettings };
  if (typeof module === 'object' && module.exports) module.exports = SITES;
  else root.SNC_SITES = SITES;
})(this);
