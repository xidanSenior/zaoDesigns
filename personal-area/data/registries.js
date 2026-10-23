/* =========================================================
   СНК · Личный кабинет — описания реестров (шаблон «Реестр»).
   Формат — как в management/data/registries.js:
     rows(D)   — строки из data/demo.js (D), плоские объекты с id; _href — ссылка из названия
     columns   — колонки (типы — см. js/cells.js)
     filters   — фильтры в панели таблицы: key поля строки, title
     create    — { label, title, noun, fields } или null, если реестр только для чтения
     menu      — false: у строк нет меню действий
   Правка: этот файл → node personal-area/tools/generate.mjs
   ========================================================= */
(function (root) {
  const fuelName = (D, id) => D.FUEL[id]?.name || id;

  const REG = {
    /* ---------------- Покупатель ---------------- */
    'purchaser/contracts.html': {
      sub: 'Договоры с продавцом: срок, схема оплаты, баланс и кредитный лимит.',
      select: false,
      rows: D => D.contracts.map(c => ({ ...c, period: `${c.start} — ${c.stop}` })),
      columns: [
        { key: 'number', title: 'Договор', type: 'main', sub: 'name', subMono: false, sort: 'text' },
        { key: 'period', title: 'Срок действия', type: 'mono', sort: 'text' },
        { key: 'kind', title: 'Оплата', type: 'text', sort: 'text' },
        { key: 'balance', title: 'Баланс, ₽', type: 'money', sort: 'num' },
        { key: 'credit', title: 'Кредит, ₽', type: 'money', sort: 'num' },
        { key: 'state', title: 'Состояние', type: 'status', sort: 'text' }
      ],
      filters: [{ key: 'state', title: 'Все состояния' }],
      create: null
    },
    'purchaser/payments.html': {
      sub: 'Поступления по договорам и их распределение по картам.',
      rows: D => D.payments.map(p => ({ ...p })),
      columns: [
        { key: 'number', title: 'Документ', type: 'main', sub: 'date', sort: 'text' },
        { key: 'contract', title: 'Договор', type: 'mono', sort: 'text' },
        { key: 'type', title: 'Тип', type: 'text', sort: 'text', sub: 'kind', subMono: false },
        { key: 'amount', title: 'Сумма, ₽', type: 'money', sort: 'num' },
        { key: 'distributed', title: 'Распределено, ₽', type: 'money', sort: 'num' },
        { key: 'rest', title: 'Остаток, ₽', type: 'money', sort: 'num' },
        { key: 'state', title: 'Распределение', type: 'status', sort: 'text' },
        { key: 'dist', title: '', type: 'button', action: 'distribute', label: 'Распределить' }
      ],
      filters: [{ key: 'contract', title: 'Все договоры' }, { key: 'state', title: 'Любое распределение' }],
      create: { label: 'Добавить платёж', title: 'Новый платёж', noun: 'Платёж', fields: [
        { key: 'number', label: 'Номер документа', type: 'mono', span: 6, required: true, placeholder: 'ПП-00000' },
        { key: 'contract', label: 'Договор', type: 'select', span: 6, required: true, options: D => D.contracts.filter(c => c.st !== 'off').map(c => c.number) },
        { key: 'amount', label: 'Сумма, ₽', type: 'num', span: 6, required: true, placeholder: '0,00', pattern: '[0-9 ]+([,.][0-9]{1,2})?', err: 'Сумма — число, до 2 знаков после запятой' },
        { key: 'kind', label: 'Вид', type: 'select', span: 6, options: () => ['Безналичный', 'Наличные'] },
        { key: 'note', label: 'Примечание', type: 'textarea', span: 12 }
      ] }
    },
    'purchaser/documents.html': {
      sub: 'Закрывающие документы, акты сверки и отчёты продавца. Подписанные электронной подписью отмечены.',
      rows: D => D.documents.map(d => ({ ...d })),
      columns: [
        { key: 'kind', title: 'Документ', type: 'main', sub: 'number', sort: 'text' },
        { key: 'period', title: 'Период', type: 'text', sort: 'text' },
        { key: 'date', title: 'Дата', type: 'date', sort: 'num' },
        { key: 'contract', title: 'Договор', type: 'mono', sort: 'text' },
        { key: 'signed', title: 'ЭП', type: 'bool', yes: 'Подписан', no: 'Без подписи', sort: 'num' },
        { key: 'format', title: 'Файл', type: 'mono', sub: 'size', sort: 'text' },
        { key: 'dl', title: '', type: 'button', action: 'download', label: 'Скачать' }
      ],
      filters: [{ key: 'kind', title: 'Все документы' }, { key: 'period', title: 'Все периоды' }],
      menu: false,
      create: null
    },
    'purchaser/reports/balances.html': {
      sub: 'Остатки лимитов по каждой карте и кошельку на текущий момент.',
      rows: D => D.cards.filter(c => c.state !== 'returned').flatMap(c => c.wallets.map((w, i) => ({ id: `${c.id}-${i}`, number: c.number, owner: c.owner, division: c.division, fuel: fuelName(D, w.fuel), limit: w.limit, spent: w.spent, rest: Math.round((w.limit - w.spent) * 100) / 100, period: w.period, state: c.stateLabel, st: c.st, _href: `../cards.html?card=${c.id}` }))),
      columns: [
        { key: 'number', title: 'Карта', type: 'main', sub: 'owner', subMono: false, sort: 'text' },
        { key: 'division', title: 'Подразделение', type: 'text', sort: 'text' },
        { key: 'fuel', title: 'Кошелёк', type: 'text', sort: 'text' },
        { key: 'limit', title: 'Лимит, л', type: 'num', sort: 'num' },
        { key: 'spent', title: 'Израсходовано, л', type: 'num', sort: 'num' },
        { key: 'rest', title: 'Остаток, л', type: 'num', sort: 'num' },
        { key: 'state', title: 'Карта', type: 'status', sort: 'text' }
      ],
      filters: [{ key: 'division', title: 'Все подразделения' }, { key: 'fuel', title: 'Все кошельки' }],
      menu: false,
      create: null
    },
    'purchaser/users.html': {
      sub: 'Сотрудники, у которых есть доступ к кабинету организации, и их права.',
      rows: D => D.users.map(u => ({ ...u })),
      columns: [
        { key: 'name', title: 'Пользователь', type: 'main', sub: 'login', sort: 'text' },
        { key: 'phone', title: 'Телефон', type: 'mono', sort: 'text' },
        { key: 'role', title: 'Права', type: 'text', sort: 'text' },
        { key: 'division', title: 'Подразделение', type: 'text', sort: 'text' },
        { key: 'last', title: 'Последний вход', type: 'date', sort: 'num' },
        { key: 'active', title: 'Доступ', type: 'bool', yes: 'Активен', no: 'Отключён', sort: 'num' }
      ],
      filters: [{ key: 'role', title: 'Все права' }],
      create: { label: 'Добавить пользователя', title: 'Новый пользователь', noun: 'Пользователь', fields: [
        { key: 'name', label: 'ФИО', type: 'text', span: 12, required: true },
        { key: 'login', label: 'Логин', type: 'mono', span: 6, required: true, pattern: '[a-z0-9._-]{3,32}', err: 'Латиница, цифры, точка, дефис — от 3 символов' },
        { key: 'phone', label: 'Телефон', type: 'mono', span: 6, required: true, placeholder: '+7 900 000-00-00', pattern: '\\+7 ?[0-9]{3} ?[0-9]{3}-?[0-9]{2}-?[0-9]{2}', err: 'Формат: +7 900 000-00-00' },
        { key: 'role', label: 'Права', type: 'select', span: 6, required: true, options: () => ['Администратор', 'Бухгалтер', 'Менеджер подразделения', 'Только просмотр'] },
        { key: 'division', label: 'Подразделение', type: 'select', span: 6, options: D => ['Все подразделения', ...D.DIVISIONS] },
        { key: 'active', label: 'Доступ к кабинету включён', type: 'switch', span: 12 }
      ] }
    },

    /* ---------------- Держатель карты ---------------- */
    'owner/purchases.html': {
      sub: 'Заправки и покупки по карте •• 4417: цена, скидка и бонусы по каждой.',
      select: false, menu: false,
      rows: D => D.ownerPurchases.map(t => ({ id: t.id, date: t.date, station: t.station, address: t.address, fuel: t.fuel, volume: t.volume, price: t.price, cost: t.cost, discount: t.discount, bonusIn: t.bonusIn, bonusOut: t.bonusOut })),
      columns: [
        { key: 'date', title: 'Дата/время', type: 'date', sort: 'num' },
        { key: 'station', title: 'Точка обслуживания', type: 'main', sub: 'address', subMono: false, sort: 'text' },
        { key: 'fuel', title: 'Наименование', type: 'text', sort: 'text' },
        { key: 'volume', title: 'Объём, л', type: 'num', sort: 'num' },
        { key: 'price', title: 'Цена, ₽', type: 'money', sort: 'num' },
        { key: 'cost', title: 'Стоимость, ₽', type: 'money', sort: 'num' },
        { key: 'discount', title: 'Скидка, ₽', type: 'money', sort: 'num' },
        { key: 'bonusIn', title: 'Начислено', type: 'num', sort: 'num' },
        { key: 'bonusOut', title: 'Списано', type: 'num', sort: 'num' }
      ],
      filters: [{ key: 'fuel', title: 'Все товары' }],
      create: null
    },
    'owner/documents.html': {
      sub: 'Документы по карте: правила программы, отчёты о покупках.',
      select: false, menu: false,
      rows: D => D.documents.filter(d => ['Отчёт о реализации', 'Акт выдачи карт'].includes(d.kind)).map(d => ({ ...d })),
      columns: [
        { key: 'kind', title: 'Документ', type: 'main', sub: 'number', sort: 'text' },
        { key: 'period', title: 'Период', type: 'text', sort: 'text' },
        { key: 'format', title: 'Файл', type: 'mono', sub: 'size', sort: 'text' },
        { key: 'dl', title: '', type: 'button', action: 'download', label: 'Скачать' }
      ],
      filters: [],
      create: null
    },
    'owner/promotions.html': {
      sub: 'Акции и тарифы, которые действуют по вашей карте.',
      select: false, menu: false,
      rows: D => D.promotions.map(p => ({ ...p, state: p.st === 'off' ? 'Завершена' : p.kind === 'Тариф' ? 'Подключён' : 'Действует' })),
      columns: [
        { key: 'title', title: 'Предложение', type: 'main', sub: 'text', subMono: false, sort: 'text' },
        { key: 'kind', title: 'Вид', type: 'text', sort: 'text' },
        { key: 'until', title: 'Действует до', type: 'mono', sort: 'text' },
        { key: 'state', title: 'Состояние', type: 'status', sort: 'text' }
      ],
      filters: [{ key: 'kind', title: 'Акции и тарифы' }],
      create: null
    },
    'owner/coupons.html': {
      sub: 'Электронные купоны на топливо. Покажите код оператору — он погасит купон на кассе.',
      select: false, menu: false,
      rows: D => D.coupons.map(c => ({ ...c })),
      columns: [
        { key: 'code', title: 'Код купона', type: 'mono', sort: 'text' },
        { key: 'fuel', title: 'Топливо', type: 'main', sort: 'text' },
        { key: 'volume', title: 'Объём, л', type: 'num', sort: 'num' },
        { key: 'until', title: 'Действует до', type: 'date', sort: 'num' },
        { key: 'state', title: 'Состояние', type: 'status', sort: 'text' },
        { key: 'qr', title: '', type: 'button', action: 'show', label: 'Показать код' }
      ],
      filters: [{ key: 'state', title: 'Все купоны' }],
      create: null
    },

    /* ---------------- Продавец ---------------- */
    'seller/purchasers.html': {
      sub: 'Контрагенты-покупатели: договор, карты, расход за месяц и состояние счёта.',
      rows: D => D.purchasers.map(p => ({ ...p })),
      columns: [
        { key: 'name', title: 'Контрагент', type: 'main', sub: 'inn', sort: 'text' },
        { key: 'contract', title: 'Договор', type: 'mono', sort: 'text' },
        { key: 'group', title: 'Группа', type: 'text', sort: 'text' },
        { key: 'cards', title: 'Карт', type: 'num', sort: 'num' },
        { key: 'month', title: 'Расход за месяц, ₽', type: 'money', sort: 'num' },
        { key: 'balance', title: 'Баланс, ₽', type: 'money', sort: 'num' },
        { key: 'state', title: 'Счёт', type: 'status', sort: 'text' }
      ],
      filters: [{ key: 'group', title: 'Все группы' }, { key: 'state', title: 'Любой счёт' }],
      import: true,
      create: { label: 'Добавить контрагента', title: 'Новый контрагент', noun: 'Контрагент', fields: [
        { key: 'name', label: 'Название', type: 'text', span: 12, required: true },
        { key: 'inn', label: 'ИНН', type: 'mono', span: 6, required: true, pattern: '[0-9]{10}|[0-9]{12}', err: 'ИНН — 10 или 12 цифр' },
        { key: 'contract', label: 'Договор', type: 'mono', span: 6, required: true, placeholder: 'Д-2026/000' },
        { key: 'group', label: 'Группа', type: 'select', span: 6, options: () => ['Корпоративные', 'Такси', 'Агро', 'Бюджет'] },
        { key: 'credit', label: 'Кредитный лимит, ₽', type: 'num', span: 6, placeholder: '0' }
      ] }
    },
    'seller/cards.html': {
      sub: 'Карты всех контрагентов: состояние, держатель, последнее использование.',
      rows: D => D.cards.map((c, i) => ({ id: c.id, number: c.number, owner: c.owner, purchaser: D.purchasers[i % 6].name, state: c.stateLabel, st: CARD_ST(c), lastUse: c.lastUse, expires: c.expires })),
      columns: [
        { key: 'number', title: 'Карта', type: 'main', sub: 'owner', subMono: false, sort: 'text' },
        { key: 'purchaser', title: 'Контрагент', type: 'text', sort: 'text' },
        { key: 'expires', title: 'Действует до', type: 'mono', sort: 'text' },
        { key: 'lastUse', title: 'Последнее использование', type: 'date', sort: 'num' },
        { key: 'state', title: 'Состояние', type: 'status', sort: 'text' }
      ],
      filters: [{ key: 'purchaser', title: 'Все контрагенты' }, { key: 'state', title: 'Все состояния' }],
      create: null
    },
    'seller/discounts.html': {
      sub: 'Виды скидок и число контрагентов, которым они назначены.',
      rows: D => D.discounts.map(d => ({ ...d })),
      columns: [
        { key: 'name', title: 'Скидка', type: 'main', sort: 'text' },
        { key: 'kind', title: 'Вид', type: 'text', sort: 'text' },
        { key: 'value', title: 'Размер', type: 'mono', sort: 'text' },
        { key: 'purchasers', title: 'Контрагентов', type: 'num', sort: 'num' },
        { key: 'active', title: 'Применяется', type: 'bool', yes: 'Да', no: 'Нет', sort: 'num' }
      ],
      filters: [{ key: 'kind', title: 'Все виды' }],
      create: { label: 'Добавить скидку', title: 'Новая скидка', noun: 'Скидка', fields: [
        { key: 'name', label: 'Название', type: 'text', span: 12, required: true },
        { key: 'kind', label: 'Вид', type: 'select', span: 6, required: true, options: () => ['Процент', 'Рубли на литр', 'Накопительная', 'Цена'] },
        { key: 'value', label: 'Размер', type: 'mono', span: 6, required: true, placeholder: '2% или 0,80 ₽/л' },
        { key: 'active', label: 'Применять сразу', type: 'switch', span: 12 }
      ] }
    },
    'seller/operations.html': {
      sub: 'Фоновые операции: выпуск и блокировка карт, переносы, отчёты. Долгие операции выполняются в очереди — страницу можно закрыть.',
      select: false, menu: false,
      rows: D => D.operations.map(o => ({ ...o, title: `${o.kind} № ${o.id}`, stateText: o.st === 'info' ? `${o.state} · ${o.progress}%` : o.state })),
      columns: [
        { key: 'title', title: 'Операция', type: 'main', sub: 'date', sort: 'text' },
        { key: 'purchaser', title: 'Контрагент', type: 'text', sort: 'text' },
        { key: 'count', title: 'Объектов', type: 'num', sort: 'num' },
        { key: 'user', title: 'Запустил', type: 'text', sort: 'text' },
        { key: 'stateText', title: 'Состояние', type: 'status', sort: 'text' },
        { key: 're', title: '', type: 'button', action: 'retry', label: 'Повторить' }
      ],
      filters: [{ key: 'kind', title: 'Все операции' }, { key: 'state', title: 'Все состояния' }],
      create: null
    },
    'seller/users.html': {
      sub: 'Сотрудники продавца с доступом к кабинету.',
      rows: D => D.users.slice(0, 3).map(u => ({ ...u, division: 'Отдел продаж' })),
      columns: [
        { key: 'name', title: 'Пользователь', type: 'main', sub: 'login', sort: 'text' },
        { key: 'phone', title: 'Телефон', type: 'mono', sort: 'text' },
        { key: 'role', title: 'Права', type: 'text', sort: 'text' },
        { key: 'last', title: 'Последний вход', type: 'date', sort: 'num' },
        { key: 'active', title: 'Доступ', type: 'bool', yes: 'Активен', no: 'Отключён', sort: 'num' }
      ],
      filters: [],
      create: { label: 'Добавить пользователя', title: 'Новый пользователь', noun: 'Пользователь', fields: [
        { key: 'name', label: 'ФИО', type: 'text', span: 12, required: true },
        { key: 'login', label: 'Логин', type: 'mono', span: 6, required: true, pattern: '[a-z0-9._-]{3,32}', err: 'Латиница, цифры, точка, дефис — от 3 символов' },
        { key: 'phone', label: 'Телефон', type: 'mono', span: 6, required: true, placeholder: '+7 900 000-00-00' },
        { key: 'role', label: 'Права', type: 'select', span: 12, options: () => ['Администратор', 'Менеджер', 'Только просмотр'] }
      ] }
    },

    /* ---------------- Точка обслуживания ---------------- */
    'station/shifts.html': {
      sub: 'Смены точки: погашенные купоны и талоны, отпущенный объём.',
      select: false, menu: false,
      rows: D => D.shifts.map(s => ({ ...s, title: `Смена № ${s.number}`, period: s.stop ? `${s.start} — ${s.stop.slice(11)}` : `с ${s.start}` })),
      columns: [
        { key: 'title', title: 'Смена', type: 'main', sub: 'period', sort: 'text' },
        { key: 'operator', title: 'Оператор', type: 'text', sort: 'text' },
        { key: 'coupons', title: 'Купонов', type: 'num', sort: 'num' },
        { key: 'tickets', title: 'Талонов', type: 'num', sort: 'num' },
        { key: 'volume', title: 'Отпущено, л', type: 'num', sort: 'num' },
        { key: 'state', title: 'Состояние', type: 'status', sort: 'text' }
      ],
      filters: [{ key: 'operator', title: 'Все операторы' }],
      create: null
    }
  };
  function CARD_ST(c) { return c.st; }

  const API = { REG };
  if (typeof module === 'object' && module.exports) module.exports = API;
  else root.SNC_REG = API;
})(this);
