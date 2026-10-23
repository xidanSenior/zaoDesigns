/* =========================================================
   СНК · Личный кабинет — ДЕМО-ДАННЫЕ.
   Всё вымышлено: организации, люди, номера карт, адреса и суммы.
   Названия полей и статусов — из словаря боевого ЛК (lang/ru).
   Генерация детерминированная (seed), чтобы статичная разметка
   от tools/generate.mjs и скрипты экранов видели одно и то же.
   TODO: в боевой версии всё это приходит из /api (см. stores/*).
   ========================================================= */
(function (root) {
  let seed = 20261022;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const pick = a => a[Math.floor(rnd() * a.length)];
  const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const r2 = n => Math.round(n * 100) / 100;
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const dstr = d => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  const dtstr = d => `${dstr(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const TODAY = new Date(2026, 9, 22, 14, 5);
  const today = dstr(TODAY);
  const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

  /* ---------- Товары: цвет серии закреплён за видом топлива ---------- */
  const FUELS = [
    { id: 'ai92', name: 'АИ-92', price: 56.4, series: 1 },
    { id: 'ai95', name: 'АИ-95', price: 61.9, series: 2 },
    { id: 'dt', name: 'ДТ', price: 68.7, series: 3 },
    { id: 'gas', name: 'Газ (СУГ)', price: 29.8, series: 4 }
  ];
  const FUEL = Object.fromEntries(FUELS.map(f => [f.id, f]));

  /* ---------- Состояние карты (cardState.json → группы cardManagement.cardState) ---------- */
  const CARD_STATE = {
    work: { label: 'В работе', st: 'ok', full: 'Записана, не требует никаких действий' },
    write: { label: 'Требуется запись', st: 'info', full: 'Данные карты изменены — перезапишите её на ридере' },
    stop: { label: 'Остановлена', st: 'warn', full: 'В сером списке: временно блокирована по состоянию счёта' },
    activate: { label: 'Требуется активация', st: 'warn', full: 'Блокирована пользователем' },
    block: { label: 'Блокирована', st: 'err', full: 'В чёрном списке: блокирована при утере' },
    returned: { label: 'Сдана', st: 'off', full: 'Карта сдана на склад' }
  };

  /* ---------- Покупатель: подразделения, держатели, карты ---------- */
  const DIVISIONS = ['Головное', 'Автоколонна № 1', 'Автоколонна № 2', 'Филиал «Северный»'];
  const FIRST = ['Алексей', 'Иван', 'Сергей', 'Дмитрий', 'Андрей', 'Павел', 'Николай', 'Олег', 'Роман', 'Виктор', 'Максим', 'Юрий', 'Анна', 'Ольга', 'Мария'];
  const LAST = ['Иванов', 'Петров', 'Сидоров', 'Кузнецов', 'Соколов', 'Попов', 'Лебедев', 'Козлов', 'Новиков', 'Морозов', 'Волков', 'Зайцев', 'Павлов', 'Семёнов', 'Голубев', 'Виноградов'];
  const person = () => { const f = pick(FIRST), l = pick(LAST); const fem = ['Анна', 'Ольга', 'Мария'].includes(f); return `${l}${fem ? 'а' : ''} ${f[0]}.`; };
  const PLATES = () => `${pick('АВЕКМНОРСТУХ')}${int(100, 999)}${pick('АВЕКМНОРСТУХ')}${pick('АВЕКМНОРСТУХ')} 70`;

  const stateBag = [...Array(26).fill('work'), 'write', 'write', 'stop', 'stop', 'activate', 'block', 'returned', 'work', 'work', 'work'];
  const cards = stateBag.map((state, i) => {
    const n = 1700 + i * 7 + int(0, 6);
    const last4 = pad(n % 10000, 4);
    const fuel = pick(['ai92', 'ai95', 'dt', 'dt', 'ai95']);
    const limit = pick([300, 400, 500, 600, 800, 1000]);
    const spent = state === 'returned' ? 0 : Math.min(limit, r2(limit * (i % 9 === 4 ? 0.94 : rnd() * 0.85)));
    const wallets = [{ fuel, limit, spent, period: 'месяц', unit: 'л' }];
    if (rnd() > 0.6) wallets.push({ fuel: 'ai92', limit: 200, spent: r2(rnd() * 150), period: 'месяц', unit: 'л' });
    const left = wallets[0].limit - wallets[0].spent;
    const low = state === 'work' && left / wallets[0].limit < 0.1;
    return {
      id: i + 1,
      number: `7826 0100 ${pad(Math.floor(n / 10000) + 44, 4)} ${last4}`,
      short: `•• ${last4}`,
      owner: person(),
      plate: PLATES(),
      division: DIVISIONS[i % 7 === 0 ? 1 : i % 5 === 0 ? 2 : i % 11 === 3 ? 3 : 0],
      state, st: low ? 'warn' : CARD_STATE[state].st, low,
      stateLabel: CARD_STATE[state].label,
      wallets,
      dayLimit: pick([0, 0, 60, 100]),
      expires: `${pad(int(1, 12))}.${int(2027, 2029)}`,
      lastUse: state === 'returned' ? '—' : dtstr(new Date(TODAY.getTime() - int(1, 60 * 24 * 9) * 60000)),
      pin: rnd() > 0.15
    };
  });

  /* ---------- Точки обслуживания (вымышленные, Томская область) ---------- */
  const CITIES = [
    { name: 'Томск', lat: 56.48, lon: 84.95, n: 9 }, { name: 'Северск', lat: 56.60, lon: 84.88, n: 3 },
    { name: 'Асино', lat: 56.99, lon: 86.15, n: 2 }, { name: 'Колпашево', lat: 58.31, lon: 82.90, n: 2 },
    { name: 'Стрежевой', lat: 60.73, lon: 77.60, n: 2 }, { name: 'Кожевниково', lat: 56.26, lon: 83.97, n: 1 },
    { name: 'Мельниково', lat: 56.56, lon: 84.08, n: 1 }, { name: 'Зырянское', lat: 56.83, lon: 86.62, n: 1 },
    { name: 'Бакчар', lat: 57.02, lon: 82.07, n: 1 }, { name: 'Каргасок', lat: 59.06, lon: 80.86, n: 1 }
  ];
  const STREETS = ['ул. Демонстрационная', 'пр. Примерный', 'Объездная дорога', 'ул. Трассовая', 'ул. Северная', 'тракт Учебный', 'ул. Заводская'];
  const SERVICES = ['Кафе', 'Магазин', 'Автомойка', 'Подкачка шин', 'Туалет', 'Wi-Fi'];
  let sn = 0;
  const stations = CITIES.flatMap(c => Array.from({ length: c.n }, (_, k) => {
    sn++;
    const fuels = FUELS.filter(f => f.id !== 'gas' || rnd() > 0.55).map(f => f.id);
    return {
      id: sn, code: `ТО-${pad(140 + sn * 3, 4)}`, name: `АЗС № ${sn + 2}`, city: c.name,
      address: `${c.name}, ${pick(STREETS)}, ${int(1, 120)}`,
      lat: c.lat + (k ? (rnd() - 0.5) * 0.12 : 0), lon: c.lon + (k ? (rnd() - 0.5) * 0.22 : 0),
      fuels, services: SERVICES.filter(() => rnd() > 0.5),
      h24: rnd() > 0.3,
      prices: Object.fromEntries(fuels.map(f => [f, r2(FUEL[f].price + (rnd() - 0.5) * 1.2)]))
    };
  }));

  /* ---------- Транзакции покупателя за 3 месяца ---------- */
  const active = cards.filter(c => c.state !== 'returned');
  const transactions = Array.from({ length: 160 }, (_, i) => {
    const c = pick(active);
    const s = pick(stations.slice(0, 14));
    const f = c.wallets[0].fuel;
    const when = new Date(TODAY.getTime() - Math.floor(Math.pow(i / 160, 1.15) * 86 * 24 * 60) * 60000 - int(5, 50) * 60000);
    const volume = r2(int(15, 70) + rnd());
    const base = s.prices[f] || FUEL[f].price;
    const price = r2(base * 0.97);
    return {
      id: 9000 + i, date: dtstr(when), ts: when.getTime(), cardId: c.id, card: c.number, cardShort: c.short, owner: c.owner, division: c.division,
      stationId: s.id, station: s.name, stationCode: s.code, address: s.address, fuelId: f, fuel: FUEL[f].name,
      volume, basePrice: base, price, cost: r2(volume * price), discount: r2(volume * (base - price))
    };
  });

  /* ---------- Статистика по месяцам (текущий год) ---------- */
  const months = MONTHS.slice(0, TODAY.getMonth() + 1).map((m, i) => {
    const vol = Object.fromEntries(FUELS.map(f => [f.id, f.id === 'gas' ? int(0, 120) : int(f.id === 'dt' ? 2600 : 900, f.id === 'dt' ? 4200 : 2100)]));
    const partial = i === TODAY.getMonth() ? TODAY.getDate() / 31 : 1;
    Object.keys(vol).forEach(k => { vol[k] = Math.round(vol[k] * partial); });
    const spent = r2(FUELS.reduce((a, f) => a + vol[f.id] * f.price * 0.97, 0));
    return { n: i + 1, name: m, short: MONTHS_SHORT[i], vol, volume: Object.values(vol).reduce((a, b) => a + b, 0), spent, paid: r2(i === TODAY.getMonth() ? 450000 : spent * (0.9 + rnd() * 0.25)), discount: r2(spent * 0.031) };
  });

  const account = {
    contract: 'Д-2024/117', balance: 182640.55, credit: 50000, signal: 40000,
    daysLeft: 9, recommended: 420000, bonus: 0, updated: `${today} 14:00`
  };

  const contracts = [
    { id: 1, number: 'Д-2024/117', name: 'Поставка нефтепродуктов по топливным картам', start: '01.01.2024', stop: '31.12.2026', kind: 'Предоплата', balance: 182640.55, credit: 50000, state: 'Действует', st: 'ok' },
    { id: 2, number: 'Д-2025/041', name: 'Мойка и сопутствующие услуги', start: '01.03.2025', stop: '28.02.2027', kind: 'Постоплата', balance: -12480, credit: 30000, state: 'Действует', st: 'ok' },
    { id: 3, number: 'Д-2023/009', name: 'Поставка нефтепродуктов (архив)', start: '01.01.2023', stop: '31.12.2023', kind: 'Предоплата', balance: 0, credit: 0, state: 'Закрыт', st: 'off' },
    { id: 4, number: 'Д-2026/203', name: 'Талоны на топливо', start: '15.09.2026', stop: '14.09.2027', kind: 'Предоплата', balance: 64000, credit: 0, state: 'На подписании', st: 'warn' }
  ];

  const payments = Array.from({ length: 18 }, (_, i) => {
    const d = new Date(TODAY.getTime() - i * int(4, 9) * 86400000);
    const amount = pick([150000, 200000, 250000, 300000, 420000, 500000]);
    const dist = i < 2 ? 0 : i < 4 ? r2(amount * 0.4) : amount;
    return { id: i + 1, number: `ПП-${pad(4800 - i * 13, 5)}`, date: dstr(d), contract: i % 6 === 3 ? 'Д-2025/041' : 'Д-2024/117', type: i % 7 === 2 ? 'Возврат' : 'Поступление', kind: i % 5 === 1 ? 'Наличные' : 'Безналичный', amount, distributed: dist, rest: r2(amount - dist), state: dist === 0 ? 'Не распределён' : dist < amount ? 'Частично' : 'Распределён', st: dist === 0 ? 'warn' : dist < amount ? 'info' : 'ok' };
  });

  const DOC_KINDS = ['Акт сверки', 'УПД', 'Счёт-фактура', 'Отчёт о реализации', 'Акт выдачи карт'];
  const documents = Array.from({ length: 20 }, (_, i) => {
    const mi = TODAY.getMonth() - Math.floor(i / 4);
    const kind = DOC_KINDS[i % 5];
    return { id: i + 1, kind, number: `${['АС', 'УПД', 'СФ', 'ОР', 'АВ'][i % 5]}-${pad(1200 - i * 7, 5)}`, period: `${MONTHS[(mi + 12) % 12]} ${mi < 0 ? 2025 : 2026}`, date: `${pad(int(1, 5))}.${pad(((mi + 12) % 12) + 1)}.${mi < 0 ? 2025 : 2026}`, contract: 'Д-2024/117', format: kind === 'Акт выдачи карт' ? 'PDF' : pick(['PDF', 'XLSX']), size: `${int(48, 640)} КБ`, signed: i % 6 !== 1 };
  });

  const users = [
    { id: 1, name: 'Смирнова А. В.', login: 'smirnova', phone: '+7 900 000-00-11', role: 'Администратор', division: 'Все подразделения', last: `${today} 13:58`, active: true },
    { id: 2, name: 'Орлов Д. С.', login: 'orlov', phone: '+7 900 000-00-12', role: 'Бухгалтер', division: 'Все подразделения', last: '21.10.2026 17:20', active: true },
    { id: 3, name: 'Белова Н. П.', login: 'belova.ak1', phone: '+7 900 000-00-13', role: 'Менеджер подразделения', division: 'Автоколонна № 1', last: '20.10.2026 09:12', active: true },
    { id: 4, name: 'Тарасов К. Е.', login: 'tarasov.ak2', phone: '+7 900 000-00-14', role: 'Менеджер подразделения', division: 'Автоколонна № 2', last: '14.10.2026 11:40', active: true },
    { id: 5, name: 'Гусев И. А.', login: 'gusev', phone: '+7 900 000-00-15', role: 'Только просмотр', division: 'Филиал «Северный»', last: '02.09.2026 15:03', active: false }
  ];

  /* ---------- Держатель карты ---------- */
  const ownerCard = {
    number: '7826 0100 0044 4417', short: '•• 4417', owner: 'Кузнецов П. А.', kind: 'Топливная', expires: '08.2028', state: 'work',
    wallets: [
      { fuel: 'ai95', limit: 400, spent: 268.4, period: 'месяц', unit: 'л' },
      { fuel: 'ai92', limit: 100, spent: 12.5, period: 'месяц', unit: 'л' }
    ],
    bonus: 1284, bonusIn: 412, bonusOut: 180, discount: 'Накопительная скидка 3% по результатам прошлого месяца'
  };
  // покупки держателя — по его кошелькам (АИ-95 и АИ-92), объёмы легковой машины
  const ownerPurchases = transactions.filter((t, i) => i % 3 === 0).slice(0, 26).map((t, i) => {
    const f = i % 5 === 2 ? 'ai92' : 'ai95';
    const volume = r2(18 + ((i * 7) % 27) + (i % 3) * 0.37);
    const st = stations.find(s => s.id === t.stationId);
    const basePrice = st.prices[f] || FUEL[f].price, price = r2(basePrice * 0.97), cost = r2(volume * price);
    return { ...t, fuelId: f, fuel: FUEL[f].name, volume, basePrice, price, cost, discount: r2(volume * (basePrice - price)), cardShort: '•• 4417', bonusIn: Math.round(cost / 100), bonusOut: i % 8 === 3 ? Math.round(cost / 25) : 0 };
  });
  const promotions = [
    { id: 1, title: 'Двойные бонусы за АИ-95', text: 'С 1 по 31 октября за каждый литр АИ-95 начисляем 2 бонуса вместо одного.', until: '31.10.2026', kind: 'Акция', st: 'ok' },
    { id: 2, title: 'Кофе за 1 ₽ при заправке от 30 л', text: 'Покажите карту на кассе после заправки. Один напиток в день.', until: '30.11.2026', kind: 'Акция', st: 'ok' },
    { id: 3, title: 'Тариф «Дальнобой»', text: 'Скидка 1,5 ₽/л на ДТ при расходе от 1 000 л в месяц.', until: 'бессрочно', kind: 'Тариф', st: 'info' },
    { id: 4, title: 'Мойка −30% по будням', text: 'На автомойках сети с 10:00 до 16:00.', until: '15.10.2026', kind: 'Акция', st: 'off' }
  ];
  const coupons = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, code: `${int(100000, 999999)}-${int(1000, 9999)}`, fuel: pick(['АИ-92', 'АИ-95', 'ДТ']), volume: pick([10, 20, 30, 50]), until: `${pad(int(1, 28))}.${pad(int(11, 12))}.2026`, state: i < 5 ? 'Активен' : i === 5 ? 'Погашен' : 'Истёк', st: i < 5 ? 'ok' : i === 5 ? 'off' : 'warn' }));

  /* ---------- Продавец: контрагенты, операции ---------- */
  const ORG_NAMES = ['ООО «Демо-Логистик»', 'ООО «Сибирский Пример»', 'АО «Учебный Транспорт»', 'ООО «Тестовая Агрофирма»', 'ИП Образцов С. В.', 'ООО «Макет-Строй»', 'ООО «Пример Такси»', 'МУП «Демогорсвет»', 'ООО «Условная Доставка»', 'ООО «Шаблон Авто»', 'АО «Модель-Энерго»', 'ООО «Черновик Групп»', 'ООО «Эскиз Ойл»', 'ИП Пробная А. А.', 'ООО «Набросок»', 'ООО «Прототип Логистика»', 'ООО «Вариант Плюс»', 'АО «Образец»'];
  const purchasers = ORG_NAMES.map((name, i) => {
    const bal = r2((rnd() - 0.18) * 600000);
    const credit = pick([0, 0, 50000, 100000]);
    const st = bal < -credit ? 'err' : bal < 40000 ? 'warn' : 'ok';
    return { id: i + 1, name, inn: `70${pad(int(10000000, 99999999), 8)}`, contract: `Д-${pick([2024, 2025, 2026])}/${pad(int(1, 240), 3)}`, cards: int(3, 140), month: r2(rnd() * 900000), balance: bal, credit, state: st === 'err' ? 'Превышен кредит' : st === 'warn' ? 'Низкий остаток' : 'В норме', st, group: pick(['Корпоративные', 'Корпоративные', 'Такси', 'Агро', 'Бюджет']) };
  });
  const OPS = ['Выпуск карт', 'Изменение лимитов', 'Блокировка карт', 'Перенос остатков', 'Формирование отчёта', 'Сдача карт', 'Перемещение карт'];
  const operations = Array.from({ length: 22 }, (_, i) => {
    const when = new Date(TODAY.getTime() - i * int(20, 240) * 60000);
    const state = i === 0 ? 'Выполняется' : i === 3 ? 'Ошибка' : i === 1 ? 'В очереди' : 'Выполнена';
    return { id: 5200 - i, kind: OPS[i % OPS.length], purchaser: ORG_NAMES[i % 9], count: int(1, 40), user: pick(['Волкова Е.', 'Смирнова А.', 'Орлов Д.']), date: dtstr(when), state, st: { 'Выполняется': 'info', 'Ошибка': 'err', 'В очереди': 'off', 'Выполнена': 'ok' }[state], progress: i === 0 ? 64 : 100 };
  });
  const discounts = [
    { id: 1, name: 'Фиксированная процентная скидка от стоимости покупки', kind: 'Процент', value: '2%', purchasers: 6, active: true },
    { id: 2, name: 'Фиксированная скидка по точке обслуживания', kind: 'Рубли на литр', value: '0,80 ₽/л', purchasers: 3, active: true },
    { id: 3, name: 'Накопительный дисконт без сброса', kind: 'Накопительная', value: 'до 4%', purchasers: 4, active: true },
    { id: 4, name: 'Накопительный дисконт по результатам предыдущего месяца', kind: 'Накопительная', value: 'до 3%', purchasers: 9, active: true },
    { id: 5, name: 'Особая цена товара', kind: 'Цена', value: 'ДТ 66,90 ₽', purchasers: 1, active: false },
    { id: 6, name: 'Фиксированная скидка в рублях', kind: 'Рубли', value: '1,50 ₽/л', purchasers: 2, active: true }
  ];
  const sellerHours = Array.from({ length: 24 }, (_, h) => Math.max(0, Math.round((h < 6 ? 6 : h < 9 ? 40 : h < 19 ? 70 : 30) * (0.6 + rnd() * 0.7))));

  /* ---------- Точка обслуживания: смены ---------- */
  const shifts = Array.from({ length: 16 }, (_, i) => {
    const start = new Date(TODAY.getTime() - (i * 12 + 6) * 3600000);
    const coupons = int(4, 40), tickets = int(0, 18);
    return { id: 1840 - i, number: 1840 - i, operator: pick(['Оператор Л.', 'Оператор К.', 'Оператор М.']), start: dtstr(start), stop: i === 0 ? '' : dtstr(new Date(start.getTime() + 12 * 3600000)), coupons, tickets, volume: r2((coupons + tickets) * 22.5), state: i === 0 ? 'Открыта' : 'Закрыта', st: i === 0 ? 'ok' : 'off' };
  });

  const DEMO = {
    today, TODAY: TODAY.toISOString(), MONTHS, MONTHS_SHORT, FUELS, FUEL, CARD_STATE, DIVISIONS,
    cards, stations, transactions, months, account, contracts, payments, documents, users,
    ownerCard, ownerPurchases, promotions, coupons,
    purchasers, operations, discounts, sellerHours, shifts
  };
  if (typeof module === 'object' && module.exports) module.exports = DEMO;
  else root.SNC_DEMO = DEMO;
})(this);
