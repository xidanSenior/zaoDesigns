/* =========================================================
   СНК · Управление продуктами — «СНК-Личный кабинет» → «Копии ЛК».
   Таблица копий выбранной организации: состояние, версия, последний вход;
   вход в админку копии (одна сессия на оператора: открыть другую — подтверждение),
   история копии в drawer (операции, подключения, действия в админке).
   Повторяет PaCopies.vue + DialogPaHistory.vue. TODO: API pa/copies, pa/admin-session.
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const D = window.SNC_DEMO, S = window.SNC_SITES, SNC = window.SNC;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ico = id => `<svg class="ico" aria-hidden="true"><use href="#${id}"/></svg>`;
  const orgName = id => (D.ORGS_ALL.find(o => o.id === id) || {}).short || '—';

  // флаги сервера management (в боевом приходят вместе со списком)
  const server = { calloutEnabled: true, adminListening: true, adminUrlAvailable: true };
  let copies = S.paCopies.filter(c => !SNC.org.id || c.org === Number(SNC.org.id));
  let session = null; // { guid, label }
  let refusal = null;
  const all = !SNC.org.id;

  const label = c => c.comment || `на месте ${c.placeKey}`;

  /* Состояние и причина неактивной кнопки — те же правила, что stateOf / hintOf в боевом */
  const stateOf = c => {
    if (c.status === 'none') return ['Не подключена', 'off'];
    if (c.status === 'revoked') return ['Отозвана', 'err'];
    if (c.online === null) return ['Неизвестно', 'off'];
    if (!c.online) return ['Не на связи', 'warn'];
    if (c.probeFailed) return ['Неизвестно', 'off'];
    if (!c.admin) return ['Обновите ЛК', 'warn'];
    return ['На связи', 'ok'];
  };
  const hintOf = c => {
    if (!server.calloutEnabled) return 'Управление копиями ЛК выключено на сервере management';
    if (!server.adminListening) return 'Вход в админку копий ЛК не запущен на сервере management — обратитесь к администратору';
    if (!server.adminUrlAvailable) return 'Откройте management по доменному имени';
    if (c.status !== 'active' || !c.online) return 'Копия не на связи';
    if (c.probeFailed) return 'Копия не ответила на проверку версии ЛК — обновите список';
    if (!c.admin) return 'Версия ЛК на копии не поддерживает управление из management';
    return '';
  };
  // Отпечаток машины: короткий в строке, полный — в подсказке и копировании (ComputerId.vue)
  const cid = id => id ? `<span class="cid"><span class="mono" data-tip="${esc(id)}">${esc(id.slice(0, 9))}…</span><button class="icon-btn icon-btn--sm" type="button" data-copy="${esc(id)}" aria-label="Скопировать идентификатор ПК">${ico('i-copy')}</button></span>` : '<span class="muted">—</span>';

  const tbody = $('#pa-table tbody');
  if (!all) document.querySelectorAll('[data-pa-orgcol]').forEach(el => el.remove());

  function render() {
    $('[data-pa-total]').textContent = copies.length;
    $('[data-pa-online]').textContent = copies.filter(c => stateOf(c)[1] === 'ok').length;
    if (!copies.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty"><svg class="empty__art" viewBox="0 0 176 112" aria-hidden="true"><rect class="bp-soft" x="30" y="22" width="84" height="62" rx="4"/><rect class="bp" x="58" y="34" width="84" height="62" rx="4"/><path class="bp-accent" d="M76 64h48"/></svg>
        <div class="empty__title">У организации нет копий ЛК</div><p class="empty__text">Копия появится здесь, когда её подключат к management в карточке организации: «Офисное ПО» → «Подключение к management».</p>
        <div class="empty__actions"><a class="btn btn--outline btn--sm" href="../admin/organization.html#t-soft"><span>Офисное ПО организации</span></a></div></div></td></tr>`;
      return;
    }
    tbody.innerHTML = copies.map(c => {
      const [st, tone] = stateOf(c), hint = hintOf(c), open = session?.guid === c.guid;
      return `<tr data-guid="${c.guid}">
        <td class="cell-main">${c.comment ? esc(c.comment) : '<span class="muted">Без названия</span>'}<span class="cell-sub mono">место ${c.placeKey}</span></td>
        ${all ? `<td>${esc(orgName(c.org))}</td>` : ''}
        <td>${cid(c.computerId)}</td>
        <td><span class="st st--${tone}">${st}</span>${open ? ' <span class="st st--plain st--info">админка открыта</span>' : ''}</td>
        <td class="mono">${esc(c.version) || '—'}</td>
        <td class="mono">${esc(c.lastSeenAt) || '—'}</td>
        <td class="col-actions2"><span class="row-acts">
          <span data-tip="${esc(hint || 'Открыть админку')}"><button class="icon-btn icon-btn--sm" type="button" data-open ${hint ? 'disabled' : ''} aria-label="Открыть админку: ${esc(label(c))}${hint ? `. Недоступно: ${esc(hint)}` : ''}">${ico('i-external')}</button></span>
          <button class="icon-btn icon-btn--sm" type="button" data-hist data-tip="История операций" aria-label="История операций: ${esc(label(c))}">${ico('i-history')}</button>
        </span></td></tr>`;
    }).join('');
  }

  function banners() {
    const host = $('[data-pa-banners]');
    host.innerHTML = (session ? `<div class="banner banner--info" role="status">${ico('i-external')}<div class="banner__text">Открыта админка копии ${esc(session.label)}<small>Вкладка админки открыта отдельно. Закройте её или завершите сессию здесь.</small></div><button class="btn btn--outline btn--xs" type="button" data-close-session><span>Завершить</span></button></div>` : '')
      + (refusal ? `<div class="banner banner--warn" role="alert">${ico('i-warn')}<div class="banner__text">${esc(refusal)}</div><button class="icon-btn icon-btn--sm" type="button" data-refusal-x aria-label="Скрыть">${ico('i-x')}</button></div>` : '');
  }

  const openAdmin = async (c, replace = false) => {
    if (session && session.guid !== c.guid && !replace) {
      const ok = await SNC.confirm({
        title: 'Открыта другая копия', icon: 'i-external', cta: 'Завершить и открыть',
        sub: `Сейчас открыта админка копии ${session.label}. Завершить её и открыть копию ${label(c)}?`,
        items: ['Сессия первой копии закроется, несохранённые в ней правки пропадут', 'Админка новой копии откроется в новой вкладке']
      });
      if (!ok) return;
    }
    // TODO: POST pa/admin-session → window.open(url); вкладку стережёт таймер (TAB_WATCH_INTERVAL_MS)
    session = { guid: c.guid, label: label(c) };
    refusal = null;
    banners(); render();
    SNC.toast({ type: 'ok', title: 'Админка копии открыта в новой вкладке', text: label(c) });
  };

  document.addEventListener('click', e => {
    const tr = e.target.closest('tr[data-guid]');
    const c = tr && copies.find(x => x.guid === tr.dataset.guid);
    if (e.target.closest('[data-open]') && c) openAdmin(c);
    if (e.target.closest('[data-hist]') && c) history(c);
    const cp = e.target.closest('[data-copy]');
    if (cp) { navigator.clipboard?.writeText(cp.dataset.copy).catch(() => {}); SNC.toast({ type: 'ok', title: 'Идентификатор ПК скопирован', duration: 2500 }); }
    if (e.target.closest('[data-close-session]')) { session = null; banners(); render(); SNC.toast({ type: 'ok', title: 'Сессия админки завершена' }); }
    if (e.target.closest('[data-refusal-x]')) { refusal = null; banners(); }
  });

  // Обновить список: копии заново опрашиваются, одна из них перестала отвечать — показываем отказ
  $('[data-pa-refresh]').addEventListener('click', e => {
    const b = e.currentTarget;
    b.dataset.loading = 'true'; b.insertAdjacentHTML('beforeend', '<span class="spinner" aria-hidden="true"></span>');
    tbody.querySelectorAll('tr').forEach(tr => tr.classList.add('is-loading'));
    setTimeout(() => {
      delete b.dataset.loading; $('.spinner', b)?.remove();
      const probe = copies.find(c => c.probeFailed);
      if (probe) { probe.probeFailed = false; probe.lastSeenAt = '20.10.2026 14:05'; }
      render();
      tbody.querySelector(`tr[data-guid="${probe?.guid}"]`)?.classList.add('is-changed');
      SNC.toast({ type: 'ok', title: 'Список обновлён', text: probe ? `${label(probe)}: проверка версии прошла` : '' });
    }, 800);
  });

  /* ---------- История копии: три журнала ---------- */
  const tbl = (cap, head, rows, empty) => rows.length ? `<div class="dt__scroll"><table class="table table--compact"><caption class="sr-only">${cap}</caption><thead><tr>${head.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map((v, i) => `<td${i === 0 ? ' class="mono"' : ''}>${v === 'Выполнено' ? '<span class="st st--ok">Выполнено</span>' : ['Копия не ответила', 'Неверные данные'].includes(v) ? `<span class="st st--err">${v}</span>` : esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
    : `<div class="empty"><div class="empty__title">${empty}</div></div>`;
  function history(c) {
    const H = S.paHistory, mine = c.status === 'active';
    $('[data-pa-hist-sub]').textContent = `${label(c)} · место ${c.placeKey}`;
    $('#p-ph-ops').innerHTML = tbl('Операции', ['Время', 'Что сделано', 'Пользователь', 'Результат'], mine ? H.operations : [], 'Действий пока не было');
    $('#p-ph-con').innerHTML = tbl('Подключения', ['Время', 'Событие', 'Адрес копии'], c.computerId ? H.connections : [], 'Подключений пока не было')
      + '<p class="muted dt__note" style="margin-top:12px">Показано не более 50 последних событий (хранятся 90 дней)</p>';
    $('#p-ph-adm').innerHTML = c.org === 4
      ? `<div class="banner banner--warn">${ico('i-lock')}<div class="banner__text">Журнал админки недоступен<small>У организации нет действующей лицензии «СНК-Личный кабинет».</small></div></div>`
      : tbl('Действия в админке', ['Время', 'Действие', 'Пользователь', 'Результат'], mine ? H.admin : [], 'Действий пока не было');
    // из раздела копий окно открывается на журнале админки — его здесь и ищут
    $('#t-ph-adm').click();
    SNC.dialog.open('drawer-pa');
  }

  banners();
  render();
})();
