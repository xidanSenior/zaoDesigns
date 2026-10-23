/* =========================================================
   СНК · Личный кабинет — карта разделов (сайдбар, крошки, заглушки).
   Структура повторяет меню боевого ЛК 3.0 (go-personal-area-3,
   frontend/src/components/layout/MenuNavigation.vue) по ролям пользователя.
   В боевом приложении роль одна на учётную запись; в прототипе роли
   переключаются в сайдбаре, чтобы показать все кабинеты.
   Правка: этот файл → node personal-area/tools/generate.mjs
   Поля пункта:
     page  — путь страницы от personal-area/ (он же адрес в прототипе)
     title — название раздела (из словаря боевого ЛК, lang/ru)
     icon  — id символа из спрайта
     tpl   — шаблон, из которого собирается экран
     code  — код раздела для штампа в шапке страницы
     route — имя маршрута боевого ЛК (frontend/src/router/index.ts)
   ========================================================= */
(function (root) {
  const TPL = {
    overview: { name: 'Обзор', text: 'плитки с цифрами, графики и таблица по месяцам' },
    registry: { name: 'Реестр', text: 'таблица с поиском, фильтрами и сортировкой, действия со строками' },
    card: { name: 'Карточка', text: 'шапка объекта, кошельки и лимиты, вкладки с таблицами' },
    form: { name: 'Форма', text: 'форма с секциями, проверкой полей и липкой панелью «Сохранить»' },
    wizard: { name: 'Мастер', text: 'пошаговая форма со степпером и итоговым подтверждением' },
    report: { name: 'Отчёт', text: 'выбор периода и фильтров, итоги, график и таблица с выгрузкой' },
    map: { name: 'Карта', text: 'карта-схема точек и список с фильтрами' }
  };

  // «Роли» — аналог продуктов в management/: у каждой свой набор разделов
  const PRODUCTS = [
    {
      id: 'purchaser', code: 'ЮЛ', title: 'Покупатель', who: 'ООО «Демо-Логистик»', user: { initials: 'АС', name: 'А. Смирнова' },
      home: 'purchaser/statistic.html',
      groups: [
        { title: 'Карты', items: [
          { page: 'purchaser/statistic.html', title: 'Статистика', icon: 'i-chart', tpl: 'overview', code: 'ПК-01', route: 'statisticPurchaser' },
          { page: 'purchaser/cards.html', title: 'Реестр карт', icon: 'i-card', tpl: 'registry', code: 'ПК-02', route: 'cardManagement' },
          { page: 'purchaser/transfer-cards.html', title: 'Перемещение карт', icon: 'i-transfer', tpl: 'wizard', code: 'ПК-03', route: 'transferCards' },
          { page: 'purchaser/transfer-balances.html', title: 'Перенос остатков', icon: 'i-swap', tpl: 'wizard', code: 'ПК-04', route: 'transferBalances' },
          { page: 'purchaser/transfer-coupons.html', title: 'Перемещение талонов', icon: 'i-coupon', tpl: 'wizard', code: 'ПК-05', route: 'transferCoupons' }
        ] },
        { title: 'Финансы', items: [
          { page: 'purchaser/contracts.html', title: 'Договоры', icon: 'i-book', tpl: 'registry', code: 'ПК-11', route: 'contractsPurchaser' },
          { page: 'purchaser/payments.html', title: 'Платежи', icon: 'i-payment', tpl: 'registry', code: 'ПК-12', route: 'payments' },
          { page: 'purchaser/invoices.html', title: 'Выписка счёта', icon: 'i-invoice', tpl: 'form', code: 'ПК-13', route: 'invoices' },
          { page: 'purchaser/documents.html', title: 'Документы', icon: 'i-report', tpl: 'registry', code: 'ПК-14', route: 'documents' }
        ] },
        { title: 'Отчётность', items: [
          { page: 'purchaser/reports/fuel.html', title: 'По типам топлива', icon: 'i-fuel', tpl: 'report', code: 'ПК-21', route: 'fuelReportMenu' },
          { page: 'purchaser/reports/transactions.html', title: 'Протокол транзакций', icon: 'i-log', tpl: 'report', code: 'ПК-22', route: 'transactionReportOwner' },
          { page: 'purchaser/reports/balances.html', title: 'Остатки по картам', icon: 'i-wallet', tpl: 'registry', code: 'ПК-23', route: 'cardBalances' }
        ] },
        { title: 'Организация', items: [
          { page: 'stations.html', title: 'Точки обслуживания', icon: 'i-map', tpl: 'map', code: 'ОБ-01', route: 'gasStations' },
          { page: 'purchaser/users.html', title: 'Пользователи', icon: 'i-users', tpl: 'registry', code: 'ПК-31', route: 'userAccounts' },
          { page: 'purchaser/requisites.html', title: 'Реквизиты', icon: 'i-org', tpl: 'form', code: 'ПК-32', route: 'contractorRequisites' }
        ] }
      ]
    },
    {
      id: 'owner', code: 'ДК', title: 'Держатель карты', who: 'Карта •• 4417', user: { initials: 'ПК', name: 'П. Кузнецов' },
      home: 'owner/card.html',
      groups: [
        { title: 'Моя карта', items: [
          { page: 'owner/card.html', title: 'Информация по карте', icon: 'i-card', tpl: 'card', code: 'ДК-01', route: 'ownerInformation' },
          { page: 'owner/purchases.html', title: 'Покупки', icon: 'i-cart', tpl: 'registry', code: 'ДК-02', route: 'transactionReportOwner' },
          { page: 'owner/documents.html', title: 'Документы', icon: 'i-report', tpl: 'registry', code: 'ДК-03', route: 'documents' }
        ] },
        { title: 'Бонусы и предложения', items: [
          { page: 'owner/bonuses.html', title: 'Поделиться бонусами', icon: 'i-gift', tpl: 'form', code: 'ДК-11', route: 'transferBonuses' },
          { page: 'owner/promotions.html', title: 'Акции', icon: 'i-star', tpl: 'registry', code: 'ДК-12', route: 'promotions' },
          { page: 'owner/coupons.html', title: 'Купоны', icon: 'i-coupon', tpl: 'registry', code: 'ДК-13', route: 'coupons' }
        ] },
        { title: 'Сервис', items: [
          { page: 'stations.html', title: 'Точки обслуживания', icon: 'i-map', tpl: 'map', code: 'ОБ-01', route: 'gasStations' }
        ] }
      ]
    },
    {
      id: 'seller', code: 'ПР', title: 'Продавец', who: 'АО «Демо-Нефтепродукт»', user: { initials: 'ЕВ', name: 'Е. Волкова' },
      home: 'seller/dashboard.html',
      groups: [
        { title: 'Обзор', items: [
          { page: 'seller/dashboard.html', title: 'Операционный монитор', icon: 'i-monitor', tpl: 'overview', code: 'ПР-01', route: 'sellerDashboard' }
        ] },
        { title: 'Контрагенты', items: [
          { page: 'seller/purchasers.html', title: 'Список контрагентов', icon: 'i-org', tpl: 'registry', code: 'ПР-11', route: 'fuelInformation' },
          { page: 'seller/cards.html', title: 'Карты контрагентов', icon: 'i-card', tpl: 'registry', code: 'ПР-12', route: 'sellerCards' },
          { page: 'seller/discounts.html', title: 'Скидки', icon: 'i-percent', tpl: 'registry', code: 'ПР-13', route: 'discountTable' }
        ] },
        { title: 'Сервис', items: [
          { page: 'seller/operations.html', title: 'Журнал операций', icon: 'i-history', tpl: 'registry', code: 'ПР-21', route: 'backgroundOperations' },
          { page: 'stations.html', title: 'Точки обслуживания', icon: 'i-map', tpl: 'map', code: 'ОБ-01', route: 'gasStations' },
          { page: 'seller/users.html', title: 'Список пользователей', icon: 'i-users', tpl: 'registry', code: 'ПР-22', route: 'userAccounts' }
        ] }
      ]
    },
    {
      id: 'station', code: 'ТО', title: 'Точка обслуживания', who: 'АЗС № 14 · ТО-0142', user: { initials: 'ОП', name: 'Оператор смены' },
      home: 'station/shifts.html',
      groups: [
        { title: 'Смены', items: [
          { page: 'station/shifts.html', title: 'Смены', icon: 'i-shift', tpl: 'registry', code: 'ТО-01', route: 'shiftsInformation' }
        ] },
        { title: 'Гашение', items: [
          { page: 'station/use-coupons.html', title: 'Гашение купонов', icon: 'i-scan', tpl: 'form', code: 'ТО-11', route: 'useCoupons' },
          { page: 'station/use-tickets.html', title: 'Гашение талонов', icon: 'i-coupon', tpl: 'form', code: 'ТО-12', route: 'useCoupons' }
        ] }
      ]
    }
  ];

  // Общие страницы вне ролей
  const COMMON = [
    { page: 'profile.html', title: 'Профиль пользователя', icon: 'i-user', tpl: 'form', code: 'ПФ-00', route: 'profile' }
  ];

  // Страницы вне меню. parent — раздел, который подсвечивается в меню
  const EXTRA = [
    { page: '404.html', title: 'Страница не найдена', parent: null, tpl: 'form', code: '404' }
  ];

  const NAV = { TPL, PRODUCTS, COMMON, EXTRA };
  if (typeof module === 'object' && module.exports) module.exports = NAV;
  else root.SNC_NAV = NAV;
})(this);
