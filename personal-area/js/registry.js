/* =========================================================
   СНК · Личный кабинет — поведение шаблона «Реестр».
   Описание раздела — в <script id="reg-def"> (генерирует tools/generate.mjs
   из data/registries.js). Фильтры, создание и правка в модалке,
   удаление с подтверждением и отменой, выгрузка. Строки — js/cells.js.
   TODO: в боевой версии — запросы к API вместо правки DOM.
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const SNC = window.SNC, CELLS = window.SNC_CELLS;
  const defEl = $('#reg-def');
  const dt = $('#reg-table');
  if (!defEl || !dt || !dt.snc) return;
  const DEF = JSON.parse(defEl.textContent);
  const tbody = $('tbody', dt);
  const rows = () => $$('tbody > tr', dt);
  const data = tr => JSON.parse(tr.dataset.row || '{}');
  const mainCol = DEF.columns.find(c => c.type === 'main') || DEF.columns[0];
  const nameOf = tr => ($(`td.cell-main`, tr)?.dataset.v) || tr.cells[DEF.select ? 1 : 0]?.textContent.trim();
  const count = () => { const c = $('[data-reg-count]'); if (c) c.textContent = rows().length; };
  const flash = el => { el.classList.remove('is-changed'); void el.offsetWidth; el.classList.add('is-changed'); };
  const plural = (n, one, few, many) => n % 10 === 1 && n % 100 !== 11 ? one : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? few : many;

  /* ---------- Фильтры ---------- */
  const F = {};
  const resetBtn = $('[data-reset-filters]', dt);
  const apply = () => {
    dt.snc.setFilter(tr => Object.entries(F).every(([k, vals]) => !vals.length || vals.includes(tr.getAttribute(`data-f-${k}`))));
    resetBtn.hidden = !Object.values(F).some(v => v.length);
  };
  $$('[data-filter]', dt).forEach(sel => {
    F[sel.dataset.filter] = [];
    sel.addEventListener('change', e => { if (e.detail) { F[sel.dataset.filter] = e.detail.values; apply(); } });
  });
  const reset = () => { $$('[data-filter] [data-clear]', dt).forEach(b => b.click()); apply(); };
  resetBtn?.addEventListener('click', reset);
  dt.addEventListener('dt:reset-filters', reset);

  /* ---------- Создание и правка ---------- */
  const dlg = $('#dlg-reg');
  const form = $('#form-reg');
  let editing = null;
  const openForm = tr => {
    if (DEF.create?.open) { window.location.href = DEF.create.open; return; }
    if (!dlg) return;
    editing = tr || null;
    form.reset();
    $$('.fld', form).forEach(f => { f.classList.remove('is-invalid'); const e = $('.fld__err', f); if (e) e.textContent = ''; });
    $('#dlg-reg-t').textContent = tr ? `${DEF.noun}: ${nameOf(tr)}` : DEF.create.title;
    $('[data-reg-submit]').textContent = tr ? 'Сохранить изменения' : `Добавить`;
    if (tr) {
      const d = data(tr);
      DEF.create.fields.forEach(f => {
        const el = form.elements[f.key];
        if (!el) return;
        if (f.type === 'switch') el.checked = !!d[f.key];
        else el.value = d[f.key] ?? '';
      });
    }
    SNC.dialog.open('dlg-reg');
    requestAnimationFrame(() => form.querySelector('input:not([type="checkbox"]), select, textarea')?.focus());
  };
  $('[data-reg-create]')?.addEventListener('click', () => openForm(null));

  // значения формы → строка реестра (для колонок, которых нет в форме, — «—» или прежнее значение)
  const toRow = (base) => {
    const r = { ...base };
    DEF.create.fields.forEach(f => {
      const el = form.elements[f.key];
      if (!el) return;
      if (f.type === 'switch') r[f.key] = el.checked;
      else if (f.type === 'num') r[f.key] = Number(String(el.value).replace(/\s/g, '').replace(',', '.')) || 0;
      else r[f.key] = el.value.trim();
    });
    DEF.columns.forEach(c => {
      if (r[c.key] === undefined) r[c.key] = c.type === 'num' ? 0 : c.type === 'status' ? 'Новый' : '—';
      if (c.type === 'status' && !r[c.stKey || 'st']) r[c.stKey || 'st'] = 'info';
    });
    return r;
  };
  form?.addEventListener('submit', e => {
    e.preventDefault();
    if (!SNC.validate(form)) return;
    const b = $('[type="submit"]', form);
    b.dataset.loading = 'true'; b.insertAdjacentHTML('beforeend', '<span class="spinner" aria-hidden="true"></span>');
    setTimeout(() => { // TODO: сохранение на сервере
      delete b.dataset.loading; $('.spinner', b)?.remove();
      const base = editing ? { ...data(editing), ...Object.fromEntries(DEF.columns.map(c => [c.key, undefined])) } : { id: `new-${Date.now()}` };
      // для правки берём видимые значения из ячеек, чтобы не потерять колонки вне формы
      if (editing) DEF.columns.forEach((c, i) => { const td = editing.cells[i + (DEF.select ? 1 : 0)]; if (td && base[c.key] === undefined) base[c.key] = c.type === 'num' || c.type === 'money' ? Number(td.dataset.v) : c.type === 'bool' ? td.dataset.v === '1' : td.dataset.v ?? td.textContent.trim(); if (c.type === 'status') base[c.stKey || 'st'] = (td?.querySelector('.st')?.className.match(/st--(\w+)/) || [])[1]; });
      const r = toRow(base);
      const html = CELLS.row(DEF, r);
      const tmp = document.createElement('tbody'); tmp.innerHTML = html;
      const tr = tmp.firstElementChild;
      if (editing) { editing.replaceWith(tr); } else { tbody.prepend(tr); }
      dt.snc.paint();
      flash(tr);
      SNC.dialog.close('dlg-reg');
      count();
      SNC.toast({ type: 'ok', title: editing ? 'Изменения сохранены' : `${DEF.noun} — добавлено`, text: r[mainCol.key] });
      editing = null;
    }, 700);
  });

  /* ---------- Удаление с отменой ---------- */
  let toDelete = [];
  const askDelete = trs => {
    toDelete = trs;
    const n = trs.length;
    $('#dlg-del-t').textContent = n === 1 ? `Удалить «${nameOf(trs[0])}»?` : `Удалить ${n} ${plural(n, 'запись', 'записи', 'записей')}?`;
    $('[data-del-who]').textContent = DEF.title;
    $('[data-del-cta]').textContent = n === 1 ? 'Удалить' : `Удалить ${n}`;
    SNC.dialog.open('dlg-reg-del');
  };
  $('#form-reg-del')?.addEventListener('submit', e => {
    e.preventDefault();
    const removed = toDelete.map(tr => ({ tr, next: tr.nextElementSibling }));
    removed.forEach(({ tr }) => tr.remove());
    SNC.dialog.close('dlg-reg-del');
    $('[data-dt-clear]', dt)?.click();
    dt.snc.paint(); count();
    const n = removed.length;
    SNC.toast({
      type: 'ok', title: n === 1 ? 'Удалено' : `Удалено ${n} ${plural(n, 'запись', 'записи', 'записей')}`,
      action: { label: 'Вернуть', onClick: () => { removed.reverse().forEach(({ tr, next }) => { if (next && next.parentNode) next.before(tr); else tbody.append(tr); $('.col-check input', tr) && ($('.col-check input', tr).checked = false); }); dt.snc.paint(); count(); SNC.toast({ type: 'info', title: 'Удаление отменено' }); } },
      duration: 8000
    });
  });

  /* ---------- Меню строки, кнопки строки, массовые действия ---------- */
  dt.addEventListener('rowmenu', e => {
    const { action, row } = e.detail;
    if (action === 'edit') openForm(row);
    if (action === 'delete') askDelete([row]);
    if (action === 'copy') navigator.clipboard?.writeText(nameOf(row)).then(
      () => SNC.toast({ type: 'ok', title: 'Название скопировано' }),
      () => SNC.toast({ type: 'err', title: 'Не удалось скопировать', text: 'Браузер запретил доступ к буферу обмена.' }));
  });
  dt.addEventListener('click', e => {
    const b = e.target.closest('[data-row-action]');
    if (!b) return;
    const tr = b.closest('tr');
    if (b.dataset.rowAction === 'build') {
      b.dataset.loading = 'true'; b.insertAdjacentHTML('beforeend', '<span class="spinner" aria-hidden="true" style="border-color:rgba(31,41,51,.2);border-top-color:var(--text)"></span>');
      setTimeout(() => { delete b.dataset.loading; $('.spinner', b)?.remove(); SNC.toast({ type: 'ok', title: `Отчёт «${nameOf(tr)}» сформирован`, text: `За ${window.SNC_TODAY || 'сегодня'}. Файл скачается автоматически.` }); }, 1100); // TODO: формирование на сервере
    }
    // Действия ЛК: скачать документ, повторить операцию, распределить платёж, показать купон
    const MSG = {
      download: () => ({ type: 'ok', title: 'Документ скачивается', text: nameOf(tr) }),
      retry: () => ({ type: 'info', title: 'Операция поставлена в очередь', text: `${nameOf(tr)}. Результат появится в этом журнале.` }),
      distribute: () => ({ type: 'info', title: 'Распределение платежа', text: `${nameOf(tr)}: выберите карты и суммы — экран из шаблона «Мастер».` }),
      show: () => ({ type: 'info', title: `Купон ${nameOf(tr)}`, text: 'Покажите код оператору на кассе.' })
    };
    if (MSG[b.dataset.rowAction]) {
      b.dataset.loading = 'true';
      setTimeout(() => { delete b.dataset.loading; SNC.toast(MSG[b.dataset.rowAction]()); }, 500); // TODO: запрос к API
    }
  });
  const selected = () => rows().filter(tr => $('.col-check input', tr)?.checked);
  $('[data-reg-delete-selected]', dt)?.addEventListener('click', () => askDelete(selected()));
  $('[data-reg-export-selected]', dt)?.addEventListener('click', () => SNC.toast({ type: 'info', title: 'Выгрузка готовится', text: `${selected().length} ${plural(selected().length, 'строка', 'строки', 'строк')}. Файл скачается автоматически.` }));
  $('[data-reg-export]')?.addEventListener('click', () => SNC.toast({ type: 'info', title: 'Выгрузка готовится', text: `${dt.snc.visible.length} ${plural(dt.snc.visible.length, 'строка', 'строки', 'строк')} с учётом фильтров. Файл скачается автоматически.` })); // TODO
  $('[data-reg-import]')?.addEventListener('click', () => SNC.toast({ type: 'info', title: 'Загрузка из файла', text: 'Выберите файл XLSX по шаблону — появится в боевой версии.' }));

  apply();
})();
