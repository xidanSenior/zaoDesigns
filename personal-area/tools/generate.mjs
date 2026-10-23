#!/usr/bin/env node
/* =========================================================
   СНК · Личный кабинет — генератор прототипа (без зависимостей).
   Основа — management/tools/generate.mjs. Запуск из любой папки:
     node personal-area/tools/generate.mjs

   Что делает:
   1. Во все страницы personal-area/**.html вставляет общие блоки между маркерами:
        <!-- @sprite:start -->  … <!-- @sprite:end -->   иконки (partials/sprite.html)
        <!-- @sidebar:start --> … <!-- @sidebar:end -->  сайдбар роли
        <!-- @top:start -->     … <!-- @top:end -->      верхняя панель с крошками
      Роль и раздел берутся из пути страницы (data/nav.js) или из <body data-product>.
   2. Разделы с описанием в data/registries.js собирает из шаблона «Реестр»
      (пометка <!-- @tpl:registry -->, пересобираются при каждом запуске).
      Для остальных разделов без своей страницы пишет заглушку <!-- @stub -->.
      Настоящие страницы (без пометок) не перезаписывает — только обновляет блоки.
   Сгенерированные файлы хранятся в репозитории — прототип работает без сборки.
   ========================================================= */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const NAV = require(path.join(ROOT, 'data/nav.js'));
const DEMO = require(path.join(ROOT, 'data/demo.js'));
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nf = new Intl.NumberFormat('ru-RU');

const SPRITE = read('partials/sprite.html').trimEnd();
const LOGO = '<svg viewBox="0 0 120 48" aria-hidden="true"><path d="M38 11H22.5A12.5 12.5 0 0 0 10 23.5v1A12.5 12.5 0 0 0 22.5 37H38 M48 11v26 M72 11v26 M48 24h24 M84 11v26 M106 11L86.5 24 106 37" fill="none" stroke="#D32F2F" stroke-width="6" stroke-linecap="square"/></svg>';
const ico = (id, cls = 'ico') => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
const APP = 'Личный кабинет СНК';

/* ---------- Карта разделов: страница → роль, группа, пункт ----------
   Общий раздел (например, «Точки обслуживания») есть у нескольких ролей —
   за страницей закрепляется первая роль, остальные берут её из <body data-product>. */
const INDEX = new Map();
for (const p of NAV.PRODUCTS) for (const g of p.groups) for (const it of g.items) if (!INDEX.has(it.page)) INDEX.set(it.page, { product: p, group: g, item: it });
for (const it of NAV.COMMON) INDEX.set(it.page, { product: null, group: null, item: it });
for (const it of NAV.EXTRA) {
  const parent = it.parent ? INDEX.get(it.parent) : null;
  INDEX.set(it.page, { product: parent?.product || null, group: parent?.group || null, item: it, parent: parent?.item || null, extra: true });
}
const { REG } = require(path.join(ROOT, 'data/registries.js'));
const CELLS = require(path.join(ROOT, 'js/cells.js'));

const prefixOf = page => '../'.repeat(page.split('/').length - 1);
const roleOf = id => NAV.PRODUCTS.find(x => x.id === id) || NAV.PRODUCTS[0];

/* ---------- Сайдбар ---------- */
function sidebar(page, productId) {
  const p = prefixOf(page);
  const product = roleOf(productId);
  const link = it => {
    const cur = it.page === page ? ' aria-current="page"' : '';
    const count = counts[`${product.id}:${it.page}`] || '';
    return `<a class="sb__link" href="${p}${it.page}"${cur}>${ico(it.icon)}<span class="sb__label">${esc(it.title)}</span>${count}</a>`;
  };
  const counts = {
    'purchaser:purchaser/cards.html': `<span class="sb__count" title="Карты, которым нужно внимание">${DEMO.cards.filter(c => c.st !== 'ok' && c.st !== 'off').length}</span>`,
    'seller:seller/operations.html': `<span class="sb__count" title="Операции в работе">${DEMO.operations.filter(o => o.st === 'info' || o.st === 'off').length}</span>`
  };
  return `<aside class="sb" id="sidebar" aria-label="Разделы">
  <a class="sb__brand" href="${p}${product.home}" aria-label="${APP} — главная">
    ${LOGO}
    <b class="sb__label">Личный<br>кабинет</b>
  </a>
  <nav class="sb__products" aria-label="Роль (переключатель только в прототипе)">
${NAV.PRODUCTS.map(x => `    <a class="sb__product" href="${p}${x.home}"${x.id === product.id ? ' aria-current="true"' : ''} data-role="${x.id}"><span class="sb__code" aria-hidden="true">${x.code}</span><span class="sb__label">${esc(x.title)}</span></a>`).join('\n')}
  </nav>
  <nav class="sb__nav" aria-label="Разделы: ${esc(product.title.toLowerCase())}">
${product.groups.map(g => `    <div class="sb__group">
      <span class="sb__title">${esc(g.title)}</span>
${g.items.map(it => `      ${link(it)}`).join('\n')}
    </div>`).join('\n')}
  </nav>
  <div class="sb__foot">
    <a class="sb__link" href="${p}profile.html"${page === 'profile.html' ? ' aria-current="page"' : ''}>${ico('i-settings')}<span class="sb__label">Профиль и настройки</span></a>
    <button class="sb__link sb__collapse" type="button" data-sb-collapse aria-pressed="false">${ico('i-sidebar')}<span class="sb__label">Свернуть меню</span></button>
  </div>
</aside>`;
}

/* ---------- Верхняя панель ---------- */
function topbar(page, productId) {
  const p = prefixOf(page);
  const hit = INDEX.get(page);
  const product = roleOf(productId);
  const group = product.groups.find(g => g.items.some(it => it.page === page));
  const crumbs = [`<a href="${p}${product.home}">${esc(product.title)}</a>`];
  if (group) crumbs.push(`<span class="crumbs__group">${esc(group.title)}</span>`);
  crumbs.push(`<span aria-current="page">${esc(hit?.item.title || 'Раздел')}</span>`);
  const sep = '<span class="crumbs__sep" aria-hidden="true">/</span>';
  // уведомления — по роли, из демо-данных
  const N = {
    purchaser: [
      [`Карта ${DEMO.cards.find(c => c.low)?.short || ''}: остаток лимита меньше 10%`, 'purchaser/cards.html'],
      [`Баланс договора ${DEMO.account.contract} близок к сигнальному лимиту`, 'purchaser/statistic.html'],
      ['Готов акт сверки за сентябрь', 'purchaser/documents.html']
    ],
    owner: [['Начислено 42 бонуса за покупку', 'owner/purchases.html'], ['Новая акция: двойные бонусы за АИ-95', 'owner/promotions.html']],
    seller: [[`${DEMO.purchasers.find(x => x.st === 'err')?.name}: превышен кредит`, 'seller/purchasers.html'], ['Операция «Блокировка карт» завершилась ошибкой', 'seller/operations.html'], ['Выпуск карт: 64% выполнено', 'seller/operations.html']],
    station: [['Смена № 1840 открыта', 'station/shifts.html']]
  }[product.id];
  const notif = N.map(([t, href], i) => `<a class="notif__item is-unread" href="${p}${href}"><div><p>${esc(t)}</p><time>Сегодня, ${13 - i}:${pad2(50 - i * 12)}</time></div></a>`).join('');
  const roleItems = NAV.PRODUCTS.map(r => ({ page: r.home, title: r.title }));
  const all = [...product.groups.flatMap(g => g.items), ...NAV.COMMON];
  return `<header class="top">
  <button class="icon-btn top__burger" type="button" data-sb-open aria-controls="sidebar" aria-expanded="false" aria-label="Открыть меню">${ico('i-menu')}</button>
  <nav class="crumbs" aria-label="Вы здесь">${crumbs.join(sep)}</nav>
  <span class="ctx" title="${esc(product.who)}">${ico(product.id === 'owner' ? 'i-card' : product.id === 'station' ? 'i-station' : 'i-org')}<span>${esc(product.who)}</span></span>
  <div class="top__right">
    <label class="gsearch"><span class="sr-only">Поиск по разделам</span>${ico('i-search')}<input class="gsearch__input" type="search" placeholder="Поиск по разделам" data-gsearch list="gsearch-list" autocomplete="off"><span class="kbd" aria-hidden="true">/</span></label>
    <datalist id="gsearch-list">${all.map(it => `<option value="${esc(it.title)}" data-href="${p}${it.page}"></option>`).join('')}${roleItems.filter(r => r.page !== product.home).map(r => `<option value="${esc(r.title)} — кабинет" data-href="${p}${r.page}"></option>`).join('')}</datalist>
    <div style="position:relative">
      <button class="icon-btn" type="button" data-pop="pop-notif" aria-expanded="false" aria-controls="pop-notif" aria-label="Уведомления, ${N.length} новых">${ico('i-bell')}<span class="badge" aria-hidden="true">${N.length}</span></button>
      <div class="pop pop--right notif" id="pop-notif">
        <div class="notif__head"><b>Уведомления</b><span class="mono muted" style="font-size:12px">${N.length} новых</span><button class="btn btn--ghost btn--xs" type="button" data-notif-read>Прочитать все</button></div>
        <div class="notif__list">${notif}</div>
      </div>
    </div>
    <div style="position:relative">
      <button class="user-btn" type="button" data-pop="pop-user" aria-expanded="false" aria-controls="pop-user">
        <span class="avatar" aria-hidden="true">${esc(product.user.initials)}</span>
        <span class="user-btn__name">${esc(product.user.name)}<small>${esc(product.title)}</small></span>
      </button>
      <div class="pop pop--right" id="pop-user" style="min-width:230px">
        <div class="opts" role="menu" aria-label="Профиль">
          <a class="opt" role="menuitem" href="${p}profile.html">${ico('i-user')}Профиль</a>
          <a class="opt" role="menuitem" href="${p}profile.html#t-notify">${ico('i-bell')}Уведомления и рассылки</a>
          <div class="opt-sep" role="separator"></div>
          <a class="opt" role="menuitem" href="${p}index.html">${ico('i-logout')}Выйти</a>
        </div>
      </div>
    </div>
  </div>
</header>`;
}
function pad2(n) { return String(Math.max(0, n)).padStart(2, '0'); }

/* ---------- Заглушка раздела ---------- */
function stub(page) {
  const { item, product } = INDEX.get(page);
  const p = prefixOf(page);
  const tpl = NAV.TPL[item.tpl];
  return shellPage(page, {
    title: item.title, productId: product?.id || 'purchaser',
    marker: '<!-- @stub — заглушка, tools/generate.mjs перезапишет её, пока у раздела нет своей страницы -->',
    main: `      <div class="phead">
        <div><h1 class="phead__title">${esc(item.title)}</h1><p class="phead__sub">Экран собирается из шаблона «${esc(tpl.name)}». Маршрут боевого ЛК: <span class="mono">${esc(item.route || '—')}</span>.</p></div>
        <div class="tblock" aria-label="Паспорт раздела">
          <div class="tblock__cell"><span class="tblock__k">Раздел</span><span class="tblock__v">${esc(item.code)}</span></div>
          <div class="tblock__cell"><span class="tblock__k">Шаблон</span><span class="tblock__v">${esc(tpl.name)}</span></div>
        </div>
      </div>
      <div class="dt">
        <div class="empty">
          <svg class="empty__art" viewBox="0 0 176 112" aria-hidden="true"><rect class="bp-soft" x="8" y="8" width="160" height="96" rx="4"/><path class="bp" d="M28 30h120M28 50h120M28 70h72"/><path class="bp-accent" d="M120 70h28M134 56v28"/></svg>
          <div class="empty__title">Раздел ещё не собран в прототипе</div>
          <p class="empty__text">Он строится из шаблона «${esc(tpl.name)}»: ${esc(tpl.text)}. Все компоненты шаблона уже есть в UI kit.</p>
          <div class="empty__actions"><a class="btn btn--outline btn--sm" href="${p}../management/ui-kit.html"><span>Открыть UI kit</span></a></div>
        </div>
      </div>`,
    scripts: ['js/app.js']
  });
}

/* ---------- Каркас страницы (для реестров и заглушек; ручные страницы копируют его разметку) ---------- */
function shellPage(page, { title, productId, marker, main, after = '', scripts = [] }) {
  const p = prefixOf(page);
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)} · ${APP}</title>
  <meta name="robots" content="noindex">
  <link rel="icon" href="${p}../sncard/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${p}../designs/styles.css">
  <link rel="stylesheet" href="${p}styles.css">
</head>
${marker}
<body class="app" data-product="${productId}">
<!-- @sprite:start -->
<!-- @sprite:end -->
<a class="skip-link" href="#main">К содержимому</a>
<div class="app-shell">
<!-- @sidebar:start -->
<!-- @sidebar:end -->
  <div class="app-main">
<!-- @top:start -->
<!-- @top:end -->
    <main class="app-content" id="main">
${main}
    </main>
  </div>
</div>
${after}
${scripts.map(s => `<script src="${p}${s}"></script>`).join('\n')}
</body>
</html>
`;
}

/* ---------- Шаблон «Реестр» ---------- */
function registryPage(page, def) {
  const { item, product } = INDEX.get(page);
  const rows = def.rows(DEMO);
  const create = def.create;
  const formKeys = [...new Set([...(create?.fields || []).map(f => f.key), ...(def.filters || []).map(f => f.key)])];
  const d = { ...def, formKeys };
  const noun = create?.noun || 'Запись';
  const select = def.select !== false, menu = def.menu !== false;
  const uniq = key => [...new Set(rows.map(r => r[key]).filter(v => v !== '' && v !== undefined))].sort((a, b) => String(a).localeCompare(String(b), 'ru'));
  const filterHtml = (def.filters || []).map(f => `
          <div class="sel" data-select data-multi data-chips="1" data-placeholder="${esc(f.title)}" style="width:210px" id="f-${f.key}" data-filter="${f.key}">
            <button class="sel__btn" type="button" data-pop="lb-${f.key}" aria-expanded="false" aria-controls="lb-${f.key}" aria-label="Фильтр: ${esc(f.title.toLowerCase())}"><span class="sel__value"></span>${ico('i-chevron')}</button>
            <div class="pop" id="lb-${f.key}" style="min-width:240px">
              <div class="opts" role="listbox" aria-label="${esc(f.title)}">
${uniq(f.key).map(v => `                <div class="opt" role="option" data-value="${esc(v)}" aria-selected="false"><span class="opt__text">${esc(v)}</span></div>`).join('\n')}
              </div>
              <div class="opts__foot"><button class="btn btn--ghost btn--xs" type="button" data-clear>Сбросить</button><button class="btn btn--ghost btn--xs" type="button" data-all>Выбрать все</button></div>
            </div>
          </div>`).join('');
  const th = c => {
    if (c.type === 'button') return '<th scope="col" class="col-btn"><span class="sr-only">Действие</span></th>';
    const num = c.type === 'num' || c.type === 'money';
    return `<th scope="col"${num ? ' class="num-cell"' : ''}${c.sort ? ` data-sort="${c.type === 'date' || num || c.type === 'bool' ? 'num' : 'text'}"` : ''}>${esc(c.title)}</th>`;
  };
  // Поля формы: select — нативный (в модалке надёжнее и доступнее)
  const field = f => {
    const id = `ff-${f.key}`;
    const req = f.required ? ' required' : '';
    const pat = f.pattern ? ` pattern="${esc(f.pattern)}"` : '';
    const err = f.err ? ` data-err="${esc(f.err)}"` : '';
    const ph = f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : '';
    const span = `span-${f.span || 12}`;
    const label = `<label class="fld__label" for="${id}">${esc(f.label)}${f.required ? ' <span class="fld__req" aria-hidden="true">*</span>' : ''}</label>`;
    if (f.type === 'switch') return `<div class="fld ${span}"><label class="sw"><input type="checkbox" id="${id}" name="${f.key}" checked><span class="sw__track"></span>${esc(f.label)}</label></div>`;
    if (f.type === 'select') {
      const opts = (typeof f.options === 'function' ? f.options(DEMO) : f.options) || [];
      return `<div class="fld ${span}">${label}<select class="in" id="${id}" name="${f.key}"${req}>${f.required ? '<option value="">Выберите</option>' : ''}${opts.map(o => `<option>${esc(o)}</option>`).join('')}</select><span class="fld__err"></span></div>`;
    }
    if (f.type === 'textarea') return `<div class="fld ${span}">${label}<textarea class="in" id="${id}" name="${f.key}"${req}${ph}></textarea><span class="fld__err"></span></div>`;
    const type = f.type === 'email' ? 'email' : 'text';
    const cls = f.type === 'mono' || f.type === 'num' ? 'in in--mono' : 'in';
    const im = f.type === 'num' ? ' inputmode="decimal"' : '';
    return `<div class="fld ${span}">${label}<input class="${cls}" id="${id}" name="${f.key}" type="${type}"${im}${req}${pat}${err}${ph} autocomplete="off"><span class="fld__err"></span></div>`;
  };
  const jsonDef = {
    noun, title: item.title,
    create: create ? { title: create.title, open: create.open || null, fields: create.fields.map(f => ({ key: f.key, type: f.type })) } : null,
    columns: def.columns.map(c => ({ key: c.key, title: c.title, type: c.type, sub: c.sub, subMono: c.subMono, stKey: c.stKey, yes: c.yes, no: c.no, action: c.action, label: c.label })),
    filters: def.filters || [], select, menu, formKeys
  };
  const main = `      <div class="phead">
        <div>
          <h1 class="phead__title">${esc(item.title)}</h1>
          <p class="phead__sub">${esc(def.sub)} Данные демонстрационные.</p>
        </div>
        <div class="tblock" aria-label="Паспорт раздела">
          <div class="tblock__cell"><span class="tblock__k">Раздел</span><span class="tblock__v">${esc(item.code)}</span></div>
          <div class="tblock__cell"><span class="tblock__k">Записей</span><span class="tblock__v" data-reg-count>${rows.length}</span></div>
          <div class="tblock__cell"><span class="tblock__k">Обновлено</span><span class="tblock__v">${DEMO.today}</span></div>
        </div>
        <div class="phead__actions">
${create ? `          <button class="btn btn--primary btn--sm" type="button" data-reg-create>${ico('i-plus')}<span>${esc(create.label)}</span></button>\n` : ''}${def.import ? `          <button class="btn btn--outline btn--sm" type="button" data-reg-import>${ico('i-upload')}<span>Загрузить из файла</span></button>\n` : ''}          <button class="btn btn--outline btn--sm" type="button" data-reg-export>${ico('i-download')}<span>Выгрузить в Excel</span></button>
        </div>
      </div>

      <section class="dt" data-table data-page-size="15" aria-label="${esc(item.title)}" id="reg-table">
        <div class="dt__bar">
          <label class="in-wrap"><span class="sr-only">Поиск по таблице</span>${ico('i-search')}<input class="in" type="search" placeholder="Поиск" data-dt-search></label>${filterHtml}
          <button class="btn btn--ghost btn--xs" type="button" data-reset-filters hidden>Сбросить фильтры</button>
          <span class="dt__spacer"></span>
          <div class="seg" role="group" aria-label="Плотность строк" data-dt-density>
            <button class="seg__btn" type="button" aria-pressed="true" data-density="normal">Обычно</button>
            <button class="seg__btn" type="button" aria-pressed="false" data-density="compact">Плотно</button>
          </div>
        </div>
${select ? `        <div class="dt__bulk" hidden>
          <span class="mono" data-dt-count>Выбрано: 0</span>
          <button class="btn btn--outline btn--xs" type="button" data-reg-export-selected>${ico('i-download')}<span>Выгрузить выбранные</span></button>
${create ? `          <button class="btn btn--danger btn--xs" type="button" data-reg-delete-selected><span>Удалить</span></button>\n` : ''}          <button class="btn btn--ghost btn--xs" type="button" data-dt-clear style="margin-left:auto">Снять выбор</button>
        </div>\n` : ''}        <div class="dt__scroll" style="--dt-max-h:calc(100svh - 240px)">
          <table class="table table--pin">
            <caption class="sr-only">${esc(item.title)} (демо-данные). Столбцы сортируются.</caption>
            <thead><tr>
${select ? '              <th class="col-check" scope="col"><label class="cb"><input type="checkbox" aria-label="Выбрать все на странице"><span class="cb__box"><svg viewBox="0 0 12 12"><path class="cb__tick" d="M2.5 6.2l2.3 2.3L9.5 3.5"/><path class="cb__dash" d="M3 6h6"/></svg></span></label></th>\n' : ''}${def.columns.map(c => `              ${th(c)}`).join('\n')}
${menu ? '              <th class="col-actions" scope="col"><span class="sr-only">Действия</span></th>\n' : ''}            </tr></thead>
            <tbody>
${rows.map(r => CELLS.row(d, r)).join('\n')}
            </tbody>
          </table>
        </div>
        <div class="pager"></div>
${menu ? `        <template data-row-menu-tpl>
          <div class="opts" role="menu" aria-label="Действия">
${create && !create.open ? `            <button class="opt" role="menuitem" type="button" data-action="edit">${ico('i-edit')}Редактировать</button>\n` : ''}            <button class="opt" role="menuitem" type="button" data-action="copy">${ico('i-copy')}Скопировать название</button>
${create ? `            <div class="opt-sep" role="separator"></div>\n            <button class="opt opt--danger" role="menuitem" type="button" data-action="delete">${ico('i-trash')}Удалить</button>\n` : ''}          </div>
        </template>\n` : ''}      </section>
      <script type="application/json" id="reg-def">${JSON.stringify(jsonDef).replace(/</g, '\\u003c')}</script>`;
  const after = create && !create.open ? `
<dialog class="dlg" id="dlg-reg" aria-labelledby="dlg-reg-t" data-static>
  <form class="dlg__inner" method="dialog" novalidate id="form-reg">
    <div class="dlg__head"><div><h2 class="dlg__title" id="dlg-reg-t">${esc(create.title)}</h2><p class="dlg__sub">${esc(item.title)}</p></div>
      <button class="icon-btn" type="button" data-close aria-label="Закрыть">${ico('i-x')}</button></div>
    <div class="dlg__body"><div class="form-grid">
${create.fields.map(f => `      ${field(f)}`).join('\n')}
    </div></div>
    <div class="dlg__foot"><button class="btn btn--ghost btn--sm" type="button" data-close>Отмена</button><button class="btn btn--primary btn--sm" type="submit"><span data-reg-submit>Сохранить</span></button></div>
  </form>
</dialog>` : '';
  const confirm = create ? `
<dialog class="dlg dlg--sm" id="dlg-reg-del" role="alertdialog" aria-labelledby="dlg-del-t" aria-describedby="dlg-del-d">
  <form class="dlg__inner" method="dialog" novalidate id="form-reg-del">
    <div class="dlg__head" style="border-bottom:0;padding-bottom:0">
      <span class="confirm__ico">${ico('i-trash')}</span>
      <div><h2 class="dlg__title" id="dlg-del-t">Удалить?</h2><p class="dlg__sub" id="dlg-del-d" data-del-who></p></div>
      <button class="icon-btn" type="button" data-close aria-label="Закрыть">${ico('i-x')}</button>
    </div>
    <div class="dlg__body"><div class="consequences"><span class="consequences__title">Что произойдёт</span><ul>
      <li>Запись пропадёт из раздела «${esc(item.title)}» и из выпадающих списков</li>
      <li>Документы и отчёты, где она уже использована, не изменятся</li>
      <li>Сразу после удаления его можно отменить</li></ul></div></div>
    <div class="dlg__foot"><button class="btn btn--ghost btn--sm" type="button" data-close data-autofocus>Отмена</button><button class="btn btn--primary btn--sm" type="submit"><span data-del-cta>Удалить</span></button></div>
  </form>
</dialog>` : '';
  return shellPage(page, {
    title: item.title, productId: product?.id || "purchaser",
    marker: '<!-- @tpl:registry — страница собрана tools/generate.mjs из data/registries.js; правьте описание, а не этот файл -->',
    main, after: after + confirm, scripts: ['js/cells.js', 'js/app.js', 'js/registry.js']
  });
}


/* ---------- Вставка блоков ---------- */
function setBlock(html, name, content) {
  const re = new RegExp(`(<!-- @${name}:start -->)[\\s\\S]*?(<!-- @${name}:end -->)`);
  return re.test(html) ? html.replace(re, `$1\n${content}\n$2`) : html;
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => {
    const f = path.join(dir, d.name);
    if (d.isDirectory()) return ['partials', 'tools', 'data', 'js', 'node_modules'].includes(d.name) ? [] : walk(f);
    return d.name.endsWith('.html') ? [f] : [];
  });
}

let stubs = 0, pages = 0, regs = 0;
const owned = page => { const f = path.join(ROOT, page); if (!fs.existsSync(f)) return true; const h = read(page); return h.includes('<!-- @stub') || h.includes('<!-- @tpl:registry'); };
// 1. реестры из описаний и заглушки для разделов без своей страницы
for (const page of INDEX.keys()) {
  if (!owned(page)) continue; // настоящая страница — не трогаем
  const f = path.join(ROOT, page);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  if (REG[page]) { fs.writeFileSync(f, registryPage(page, REG[page])); regs++; continue; }
  if (INDEX.get(page).extra) continue; // страницы вне меню пишутся руками
  fs.writeFileSync(f, stub(page));
  stubs++;
}
// 2. блоки во все страницы
for (const f of walk(ROOT)) {
  const page = path.relative(ROOT, f).split(path.sep).join('/');
  let html = fs.readFileSync(f, 'utf8');
  const before = html;
  const productId = (html.match(/<body[^>]*data-product="([^"]+)"/) || [])[1] || INDEX.get(page)?.product?.id || 'purchaser';
  html = setBlock(html, 'sprite', SPRITE);
  html = setBlock(html, 'sidebar', sidebar(page, productId));
  html = setBlock(html, 'top', topbar(page, productId));
  if (html !== before) { fs.writeFileSync(f, html); pages++; }
}
console.log(`Готово: реестров ${regs}, заглушек ${stubs}, обновлено страниц ${pages}. Карт в демо-данных: ${nf.format(DEMO.cards.length)}.`);
