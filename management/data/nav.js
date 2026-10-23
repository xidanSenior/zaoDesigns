/* =========================================================
   СНК · Управление продуктами — карта разделов (сайдбар, крошки, заглушки).
   Структура повторяет маршруты боевого приложения management.sncard.ru.
   Правка: этот файл → node management/tools/generate.mjs
   Поля пункта:
     page  — путь страницы от management/ (он же адрес в прототипе)
     title — название раздела (из словаря боевого приложения)
     icon  — id символа из спрайта
     tpl   — шаблон, из которого собирается экран (для заглушек и итоговой карты)
     code  — код раздела для штампа в шапке страницы
   ========================================================= */
(function (root) {
  const TPL = {
    monitoring: { name: 'Мониторинг', text: 'плитки с цифрами и таблица или карта с живыми статусами' },
    registry: { name: 'Реестр', text: 'таблица с поиском, фильтрами и сортировкой, создание и правка в модалке, удаление с подтверждением' },
    card: { name: 'Карточка с вкладками', text: 'шапка объекта и вкладки с таблицами и сведениями' },
    form: { name: 'Форма', text: 'форма с секциями, проверкой полей и липкой панелью «Сохранить»' },
    analytics: { name: 'Аналитика', text: 'выбор периода, плитки с цифрами, графики и таблица' },
    tree: { name: 'Дерево', text: 'дерево с отметками и поиском' },
    document: { name: 'Документ', text: 'шапка документа и табличная часть с итогами' },
    dashboard: { name: 'Дашборд', text: 'обзор по продуктам и быстрые переходы' }
  };

  const PRODUCTS = [
    {
      id: 'azs', code: 'АЗС', title: 'СНК-АЗС', home: 'azs/monitoring.html',
      groups: [
        { title: 'Точки обслуживания', items: [
          { page: 'azs/monitoring.html', title: 'Мониторинг ТО', icon: 'i-monitor', tpl: 'monitoring', code: 'АЗС-01' },
          { page: 'azs/information.html', title: 'Информация по ТО', icon: 'i-station', tpl: 'card', code: 'АЗС-02' }
        ] },
        { title: 'Мобильные сервисы', items: [
          { page: 'azs/services-activity.html', title: 'Активность ТО', icon: 'i-activity', tpl: 'monitoring', code: 'АЗС-03' },
          { page: 'azs/requests.html', title: 'Контроль заявок', icon: 'i-requests', tpl: 'registry', code: 'АЗС-04' },
          { page: 'azs/statistic.html', title: 'Статистика', icon: 'i-chart', tpl: 'analytics', code: 'АЗС-05' }
        ] }
      ]
    },
    {
      id: 'office', code: 'ОФ', title: 'СНК-Офис', home: 'office/shift.html',
      groups: [
        { title: 'Смены', items: [
          { page: 'office/shift.html', title: 'Информация по смене', icon: 'i-shift', tpl: 'card', code: 'ОФ-01' }
        ] },
        { title: 'Справочники', items: [
          { page: 'office/catalogue/service-points.html', title: 'Точки обслуживания', icon: 'i-station', tpl: 'registry', code: 'ОФ-11' },
          { page: 'office/catalogue/goods.html', title: 'Товары', icon: 'i-box', tpl: 'registry', code: 'ОФ-12' },
          { page: 'office/catalogue/legal-entities.html', title: 'Юридические лица', icon: 'i-org', tpl: 'registry', code: 'ОФ-13' },
          { page: 'office/catalogue/statements.html', title: 'Ведомости', icon: 'i-report', tpl: 'registry', code: 'ОФ-14' },
          { page: 'office/catalogue/cash-collectors.html', title: 'Инкассаторы', icon: 'i-users', tpl: 'registry', code: 'ОФ-15' },
          { page: 'office/catalogue/cash-collection-directions.html', title: 'Направления инкассации', icon: 'i-log', tpl: 'registry', code: 'ОФ-16' },
          { page: 'office/catalogue/operators.html', title: 'Операторы', icon: 'i-user', tpl: 'registry', code: 'ОФ-17' },
          { page: 'office/catalogue/contractors.html', title: 'Поставщики', icon: 'i-org', tpl: 'registry', code: 'ОФ-18' },
          { page: 'office/catalogue/cargo-carriers.html', title: 'Грузоперевозчики', icon: 'i-box', tpl: 'registry', code: 'ОФ-19' },
          { page: 'office/catalogue/shippers.html', title: 'Грузоотправители (грузополучатели)', icon: 'i-box', tpl: 'registry', code: 'ОФ-20' }
        ] },
        { title: 'Управление складом', items: [
          { page: 'office/warehouse/orders.html', title: 'Поставки ТМЦ', icon: 'i-download', tpl: 'registry', code: 'ОФ-31' },
          { page: 'office/warehouse/movements.html', title: 'Перемещение ТМЦ', icon: 'i-arrow', tpl: 'registry', code: 'ОФ-32' },
          { page: 'office/warehouse/write-offs.html', title: 'Списание ТМЦ', icon: 'i-trash', tpl: 'registry', code: 'ОФ-33' },
          { page: 'office/warehouse/postings.html', title: 'Оприходование ТМЦ', icon: 'i-upload', tpl: 'registry', code: 'ОФ-34' },
          { page: 'office/warehouse/price-lists.html', title: 'Прайс-листы', icon: 'i-report', tpl: 'registry', code: 'ОФ-35' }
        ] },
        { title: 'Аналитика и отчёты', items: [
          { page: 'office/analytics.html', title: 'Динамика реализации', icon: 'i-chart', tpl: 'analytics', code: 'ОФ-41' },
          { page: 'office/reports.html', title: 'Отчёты', icon: 'i-report', tpl: 'registry', code: 'ОФ-42' }
        ] }
      ]
    },
    {
      id: 'pa', code: 'ЛК', title: 'СНК-Личный кабинет', home: 'pa/copies.html',
      groups: [
        { title: 'Копии личного кабинета', items: [
          { page: 'pa/copies.html', title: 'Копии ЛК', icon: 'i-copies', tpl: 'registry', code: 'ЛК-01' }
        ] }
      ]
    },
    {
      id: 'admin', code: 'АДМ', title: 'Администрирование', home: 'admin/organizations.html',
      groups: [
        { title: 'Клиенты', items: [
          { page: 'admin/organizations.html', title: 'Организации', icon: 'i-org', tpl: 'registry', code: 'АДМ-01' },
          { page: 'admin/users.html', title: 'Пользователи', icon: 'i-users', tpl: 'registry', code: 'АДМ-02' },
          { page: 'admin/issuers.html', title: 'Эмитенты', icon: 'i-key', tpl: 'registry', code: 'АДМ-03' },
          { page: 'admin/services.html', title: 'Внешние ТО', icon: 'i-station', tpl: 'registry', code: 'АДМ-04' },
          { page: 'admin/licenses.html', title: 'Лицензии', icon: 'i-lock', tpl: 'registry', code: 'АДМ-05' },
          { page: 'admin/catalogues.html', title: 'Справочник сервисов', icon: 'i-book', tpl: 'registry', code: 'АДМ-06' }
        ] },
        { title: 'Обновления', items: [
          { page: 'admin/version-release.html', title: 'Выпуск обновления', icon: 'i-update', tpl: 'form', code: 'АДМ-11' },
          { page: 'admin/upload-release.html', title: 'Загрузка обновления', icon: 'i-upload', tpl: 'form', code: 'АДМ-12' },
          { page: 'admin/app-update.html', title: 'Обновление приложения', icon: 'i-refresh', tpl: 'form', code: 'АДМ-13' },
          { page: 'admin/change-log.html', title: 'Журнал изменений', icon: 'i-log', tpl: 'registry', code: 'АДМ-14' }
        ] },
        { title: 'Сервис', items: [
          { page: 'admin/create-news.html', title: 'Создание новости', icon: 'i-edit', tpl: 'form', code: 'АДМ-21' },
          { page: 'admin/config.html', title: 'Конфигурация', icon: 'i-settings', tpl: 'form', code: 'АДМ-22' }
        ] },
        { title: 'Сайты', items: [
          { page: 'admin/sites.html', title: 'Сайты', icon: 'i-globe', tpl: 'registry', code: 'АДМ-31' }
        ] }
      ]
    }
  ];

  // Общие страницы вне продуктов
  const COMMON = [
    { page: 'dashboard.html', title: 'Главная', icon: 'i-home', tpl: 'dashboard', code: 'ГЛ-00' },
    { page: 'profile.html', title: 'Профиль пользователя', icon: 'i-user', tpl: 'form', code: 'ПР-00' }
  ];

  // Страницы вне меню: карточки и формы. parent — раздел, который подсвечивается в меню
  const EXTRA = [
    { page: 'admin/organization.html', title: 'Карточка организации', parent: 'admin/organizations.html', tpl: 'card', code: 'АДМ-01.1' },
    { page: 'admin/specification.html', title: 'Спецификация', parent: 'admin/organizations.html', tpl: 'form', code: 'АДМ-01.2' },
    { page: 'admin/site.html', title: 'Сайт', parent: 'admin/sites.html', tpl: 'card', code: 'АДМ-31.1' },
    { page: 'admin/site-page.html', title: 'Страница сайта', parent: 'admin/sites.html', tpl: 'form', code: 'АДМ-31.2' },
    { page: 'admin/permissions.html', title: 'Привилегии пользователя', parent: 'admin/users.html', tpl: 'tree', code: 'АДМ-02.1' },
    { page: 'office/warehouse/document.html', title: 'Документ', parent: 'office/warehouse/orders.html', tpl: 'document', code: 'ОФ-3x.1' },
    { page: '404.html', title: 'Страница не найдена', parent: null, tpl: 'form', code: '404' }
  ];

  const NAV = { TPL, PRODUCTS, COMMON, EXTRA };
  if (typeof module === 'object' && module.exports) module.exports = NAV;
  else root.SNC_NAV = NAV;
})(this);
