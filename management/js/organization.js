/* =========================================================
   СНК · Управление продуктами — карточка организации (Администрирование).
   ?org=<id>. Вкладки: сведения, договоры со спецификациями, лицензии,
   Hasp-ключи (активация мастером из трёх шагов), пользователи, точки,
   перекодировка топлива, сервисы партнёра, управление обновлениями,
   офисное ПО и внешние ТО. TODO: API.
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const D = window.SNC_DEMO, S = window.SNC_SITES, SNC = window.SNC;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nf = new Intl.NumberFormat('ru-RU');

  // без ?org — организация из переключателя в верхней панели
  const oid = Number(new URLSearchParams(location.search).get('org')) || Number(SNC.org.id) || 1;
  const org = D.ORGS_ALL.find(o => o.id === oid) || D.ORGS[0];
  const idx = D.ORGS_ALL.indexOf(org);
  const isClient = [1, 2].includes(org.type), isPartner = org.type === 4, isService = org.type === 3;

  /* ---------- Вкладки по типу организации — как правила маршрутов боевого приложения ----------
     клиент: всё, кроме квот; партнёр: информация, договоры, пользователи, квоты по клиентам;
     сервис: карточки нет — управление в «Справочнике сервисов». */
  const hideTab = id => { const t = $(`#t-${id}`); if (t) { t.hidden = true; $(`#p-${id}`).hidden = true; } };
  if (!isClient) { ['upd', 'lic', 'hasp', 'azs', 'soft', 'ext', 'fuel', 'svc'].forEach(hideTab); $('[data-dialog="dlg-activate"]').hidden = true; }
  if (isPartner) $('#t-quota').hidden = false;
  if (isService) {
    ['info', 'contracts', 'users', 'quota'].forEach(hideTab);
    $('[data-f-href="newspec"]').hidden = true;
    $('.tabs').insertAdjacentHTML('beforebegin', `<div class="banner banner--info" role="status"><svg class="ico" aria-hidden="true"><use href="#i-info"/></svg><div class="banner__text">${esc(org.name)} — сервис<small>У сервисов нет договоров, точек и пользователей кабинета. Подключение и состояние сервиса — в справочнике сервисов.</small></div><a class="btn btn--outline btn--xs" href="catalogues.html">Справочник сервисов</a></div>`);
    $('.tabs').hidden = true;
  }
  const stations = D.stations.filter(s => s.org === org.id);
  const contracts = D.contracts.filter(c => c.org === org.id);
  const lic = D.licenses.filter(l => l.org === org.id);
  const hasps = D.hasps.filter(h => h.org === org.id);
  const users = D.users.filter(u => u.org === org.id);
  document.title = `${org.name} · Карточка организации · Управление продуктами СНК`;
  $('.crumbs [aria-current]').textContent = org.name;

  const set = (k, v) => $$(`[data-f="${k}"]`).forEach(el => { el.textContent = v; });
  const inn = `70170000${String(idx + 1).padStart(2, '0')}`;
  set('name', org.name); set('inn', `ИНН ${inn} · ${D.ORG_TYPES[org.type]}`); set('since', ['2019', '2021', '2022', '2024'][idx] || '2024');
  set('stations', isClient ? stations.length : '—'); set('lic', isClient ? lic.reduce((a, l) => a + l.total, 0) : '—');
  $('[data-f-href="newspec"]').href = `specification.html?contract=${contracts[0]?.id || ''}`;
  if (!contracts.length) $('[data-f-href="newspec"]').hidden = true; // спецификация — только к договору
  const count = (k, v) => { const el = $(`[data-count="${k}"]`); if (el) el.textContent = v; };
  count('contracts', contracts.length); count('users', users.length); count('azs', stations.length);

  /* ---------- Информация ---------- */
  const kv = [['Полное название', esc(org.name)], ['ИНН / КПП', `<span class="mono">${inn} / 7017010${String(idx + 1).padStart(2, '0')}</span>`], ['Юридический адрес', `634009, г. Томск, ул. Демонстрационная, ${10 + idx}`],
    ['E-mail для уведомлений', `<span class="mono">office@${['demo-oil', 'primer-trade', 'test-set', 'obraztsov', 'demo-zapravka', 'primer-pay'][idx]}.example</span>`], ['Телефон', '<span class="mono">+7 (3822) 00-00-0' + idx + '</span>'], ['Менеджер СНК', 'Смирнова А. В.'],
    ['Тип', D.ORG_TYPES[org.type]], ['Продукты', [...new Set(lic.map(l => l.product))].join(', ') || '—'], ...(isClient ? [['Точек обслуживания', `${stations.length}, в сети ${stations.filter(s => s.state === 1).length}`]] : [])];
  $('#info-kv').innerHTML = kv.map(([k, v]) => `<div class="kv"><dt>${k}</dt><dd>${v}</dd></div>`).join('');

  /* ---------- Договоры и спецификации ---------- */
  $('#contracts').innerHTML = `<div class="dt__bar"><p class="muted" style="font-size:13px;margin-right:auto">Спецификации определяют, какие лицензии и ключи входят в договор.</p><button class="btn btn--outline btn--xs" type="button" data-demo-toast="info|Договор создаётся в СЭД|После подписания он появится здесь автоматически."><svg class="ico" aria-hidden="true"><use href="#i-plus"/></svg><span>Добавить договор</span></button></div>
    <div class="dt__scroll"><table class="table"><caption class="sr-only">Договоры организации</caption>
    <thead><tr><th class="col-expand" scope="col"><span class="sr-only">Спецификации</span></th><th scope="col">Договор</th><th scope="col">Предмет</th><th scope="col">Дата</th><th scope="col" class="num-cell">Спецификаций</th><th scope="col">Состояние</th></tr></thead>
    <tbody>${contracts.map(c => {
      const sp = D.specs.filter(s => s.contract === c.id);
      return `<tr><td class="col-expand"><button class="row-toggle" type="button" aria-expanded="${c === contracts[0]}" aria-label="Спецификации договора ${esc(c.number)}"><svg aria-hidden="true"><use href="#i-chevron-right"/></svg></button></td>
        <td class="cell-main mono">${esc(c.number)}</td><td>${esc(c.subject)}</td><td class="mono">${c.date}</td><td class="num-cell">${sp.length}</td><td><span class="st st--${c.st}">${c.state}</span></td></tr>
        <tr class="row-detail"${c === contracts[0] ? '' : ' hidden'}><td colspan="6"><div class="specs">
          ${sp.map(s => `<a class="spec" href="specification.html?spec=${s.id}"><span class="mono">№ ${s.number}</span><span>от ${s.date}</span><span class="mono">${nf.format(s.total)} ₽</span><span class="muted">${s.items} поз.</span><span class="st st--${s.state === 'Действует' ? 'ok' : 'off'}">${s.state}</span><svg class="ico" aria-hidden="true"><use href="#i-arrow"/></svg></a>`).join('')}
          <a class="spec spec--add" href="specification.html?contract=${c.id}"><svg class="ico" aria-hidden="true"><use href="#i-plus"/></svg>Новая спецификация к договору ${esc(c.number)}</a>
        </div></td></tr>`;
    }).join('')}</tbody></table></div>`;
  $('#contracts').addEventListener('click', e => {
    const t = e.target.closest('.row-toggle'); if (!t) return;
    const open = t.getAttribute('aria-expanded') !== 'true';
    t.setAttribute('aria-expanded', String(open));
    t.closest('tr').nextElementSibling.hidden = !open;
  });

  /* ---------- Лицензии: метры занятости ---------- */
  $('#lic').innerHTML = lic.map(l => {
    const p = Math.round(l.used / l.total * 100);
    const st = p >= 100 ? 'err' : p >= 85 ? 'warn' : 'ok';
    return `<article class="panel lic"><div class="panel__body">
      <div class="lic__head"><h3>${esc(l.product)}</h3><span class="mono muted">до ${l.until}</span></div>
      <div class="lic__nums"><span class="kpi__value">${l.used}<small>из ${l.total}</small></span><span class="st st--plain st--${st}">${p >= 100 ? 'Свободных нет' : `свободно ${l.total - l.used}`}</span></div>
      <div class="meter meter--${st}" role="meter" aria-valuemin="0" aria-valuemax="${l.total}" aria-valuenow="${l.used}" aria-label="Занято лицензий ${esc(l.product)}"><i style="--p:${Math.min(1, l.used / l.total)}"></i></div>
      <button class="btn btn--outline btn--xs" type="button" data-demo-toast="ok|Заявка на лицензии отправлена|Менеджер СНК свяжется с организацией и подготовит спецификацию.">Запросить ещё</button>
    </div></article>`;
  }).join('');

  /* ---------- Hasp-ключи ---------- */
  const renderHasp = () => {
    count('hasp', hasps.filter(h => h.st === 'warn').length || '');
    $('#hasp').innerHTML = hasps.length ? `<div class="dt__scroll"><table class="table"><caption class="sr-only">Hasp-ключи организации</caption>
      <thead><tr><th scope="col">Ключ</th><th scope="col">Тип</th><th scope="col">Точка</th><th scope="col">Действует до</th><th scope="col">Состояние</th><th class="col-btn" scope="col"><span class="sr-only">Действие</span></th></tr></thead>
      <tbody>${hasps.map(h => `<tr data-hasp="${h.number}"><td class="cell-main mono">${h.number}</td><td>${h.kind}</td><td>${h.station ? `<a href="../azs/information.html?to=${h.station}">${esc(h.stationName)}</a>` : '<span class="muted">не привязан</span>'}</td><td class="mono">${h.until}</td><td><span class="st st--${h.st}">${h.state}</span></td>
        <td class="col-btn">${h.st === 'warn' ? `<button class="btn btn--primary btn--xs" type="button" data-act-key="${h.number}"><span>Активировать</span></button>` : ''}</td></tr>`).join('')}</tbody></table></div>`
      : '<div class="empty"><div class="empty__title">Ключей пока нет</div><p class="empty__text">Ключи появятся после подписания спецификации с лицензиями СНК-АЗС.</p></div>';
  };
  renderHasp();

  /* ---------- Активация ключа ---------- */
  const dlg = $('#dlg-activate');
  const stepper = $('[data-stepper]', dlg);
  $('#act-keys').innerHTML = hasps.filter(h => h.st === 'warn').map(h => `<option value="${h.number}">`).join('');
  $('#act-to').insertAdjacentHTML('beforeend', stations.map(s => `<option value="${s.id}">${esc(s.name)} · ${s.code}${D.hasps.some(h => h.station === s.id) ? ' — уже есть ключ' : ''}</option>`).join(''));
  const openAct = key => {
    $('#act-key').value = key || ''; $('#act-to').value = '';
    $$('.fld', dlg).forEach(f => { f.classList.remove('is-invalid'); const e = $('.fld__err', f); if (e) e.textContent = ''; });
    stepper.snc.go(0);
    SNC.dialog.open('dlg-activate');
  };
  $('#hasp').addEventListener('click', e => { const b = e.target.closest('[data-act-key]'); if (b) openAct(b.dataset.actKey); });
  $('[data-dialog="dlg-activate"]').addEventListener('click', () => stepper.snc.go(0));
  stepper.addEventListener('click', e => {
    if (e.target.closest('[data-step-next]') && stepper.snc.step === 2) {
      const s = D.stations.find(x => x.id === Number($('#act-to').value));
      $('#act-summary').innerHTML = [['Ключ', `<span class="mono">${esc($('#act-key').value)}</span>`], ['Тип', $('input[name="act-kind"]:checked').value], ['Точка', s ? `${esc(s.name)} <span class="mono muted">${s.code}</span>` : '—'], ['Организация', esc(org.name)]].map(([k, v]) => `<div class="kv"><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    }
    const fin = e.target.closest('[data-activate]');
    if (!fin) return;
    fin.dataset.loading = 'true'; fin.insertAdjacentHTML('beforeend', '<span class="spinner" aria-hidden="true"></span>');
    setTimeout(() => { // TODO: активация на сервере лицензирования
      delete fin.dataset.loading; $('.spinner', fin)?.remove();
      const num = $('#act-key').value.trim();
      const s = D.stations.find(x => x.id === Number($('#act-to').value));
      let h = hasps.find(x => x.number === num);
      if (!h) { h = { number: num, org: org.id }; hasps.unshift(h); }
      Object.assign(h, { station: s.id, stationName: `${s.name} · ${s.code}`, kind: $('input[name="act-kind"]:checked').value, state: 'Активен', st: 'ok', until: '30.09.2027' });
      renderHasp();
      SNC.dialog.close('dlg-activate');
      $('#t-hasp').click();
      const row = $(`tr[data-hasp="${num}"]`); row?.classList.add('is-changed');
      SNC.toast({ type: 'ok', title: `Ключ ${num} активирован`, text: `${s.name}. Лицензия действует до 30.09.2027.` });
    }, 900);
  });

  /* ---------- Пользователи и точки ---------- */
  $('#users').innerHTML = `<div class="dt__scroll"><table class="table"><caption class="sr-only">Пользователи организации</caption><thead><tr><th scope="col">Пользователь</th><th scope="col">E-mail</th><th scope="col">Роль</th><th scope="col" class="num-cell">ТО</th><th scope="col">Последний вход</th><th scope="col">Состояние</th></tr></thead>
    <tbody>${users.map(u => `<tr><td class="cell-main"><a href="permissions.html?user=${u.id}">${esc(u.name)}</a><span class="cell-sub mono">${u.login}</span></td><td class="mono">${u.email}</td><td>${u.role}</td><td class="num-cell">${u.poses}</td><td class="mono">${u.last}</td><td><span class="st st--${u.st}">${u.state}</span></td></tr>`).join('')}</tbody></table></div>`;
  $('#azs').innerHTML = `<div class="dt__scroll"><table class="table"><caption class="sr-only">Точки организации</caption><thead><tr><th scope="col">Точка</th><th scope="col">Адрес</th><th scope="col">Версия</th><th scope="col">Состояние</th></tr></thead>
    <tbody>${stations.map(s => `<tr><td class="cell-main"><a href="../azs/information.html?to=${s.id}">${esc(s.name)}</a><span class="cell-sub mono">${s.code}</span></td><td>${esc(s.address)}</td><td class="mono">${s.version}</td><td><span class="st st--${D.STATE[s.state].st}">${D.STATE[s.state].short || D.STATE[s.state].label}</span></td></tr>`).join('')}</tbody></table></div>`;

  /* ---------- Перекодировка топлива ---------- */
  const fuelRow = f => `<tr><td class="mono">${esc(f.code)}</td><td>${f.source}</td><td><select class="in" aria-label="Вид топлива для кода ${esc(f.code)}" style="height:32px;max-width:200px">${D.FUELS.map(x => `<option${x === f.fuel ? ' selected' : ''}>${x}</option>`).join('')}</select></td>
    <td class="col-actions"><button class="icon-btn icon-btn--sm" type="button" data-fuel-del aria-label="Удалить правило ${esc(f.code)}"><svg class="ico" aria-hidden="true"><use href="#i-trash"/></svg></button></td></tr>`;
  const ft = $('#fuelmap tbody');
  ft.innerHTML = D.fuelMap.map(fuelRow).join('');
  ft.addEventListener('change', () => SNC.toast({ type: 'ok', title: 'Правило сохранено', text: 'Точки получат его при ближайшей синхронизации справочников.' }));
  ft.addEventListener('click', e => {
    const b = e.target.closest('[data-fuel-del]'); if (!b) return;
    const tr = b.closest('tr'), next = tr.nextElementSibling;
    tr.remove();
    SNC.toast({ type: 'ok', title: 'Правило удалено', action: { label: 'Вернуть', onClick: () => (next ? next.before(tr) : ft.append(tr)) } });
  });
  $('[data-fuel-add]').addEventListener('click', () => { ft.insertAdjacentHTML('afterbegin', fuelRow({ code: String(10 + ft.rows.length), source: 'Код ТРК', fuel: 'АИ-92' })); ft.firstElementChild.classList.add('is-changed'); ft.firstElementChild.querySelector('select').focus(); });

  /* ---------- Сервисы партнёра ---------- */
  $('#svc').innerHTML = `<div class="dt__scroll"><table class="table"><caption class="sr-only">Сервисы партнёра</caption><thead><tr><th scope="col">Сервис</th><th scope="col">Тип</th><th scope="col">Приём заявок</th></tr></thead>
    <tbody>${D.services.map((s, i) => `<tr><td class="cell-main">${esc(s.name)}</td><td>${s.kind}</td><td><label class="sw"><input type="checkbox" data-svc="${esc(s.name)}"${(i + idx) % 4 !== 3 ? ' checked' : ''}><span class="sw__track"></span><span class="sr-only">Приём заявок от ${esc(s.name)}</span></label></td></tr>`).join('')}</tbody></table></div>`;
  $('#svc').addEventListener('change', e => { const c = e.target.closest('[data-svc]'); if (c) SNC.toast({ type: 'ok', title: c.checked ? `${c.dataset.svc}: заявки принимаются` : `${c.dataset.svc}: приём заявок остановлен` }); });

  /* ---------- Управление обновлениями ----------
     Версии, доступные организации: «для всех рабочих мест» и индивидуальные обновления ТО.
     Разрешение и отмена — с подтверждением; история операций — в drawer. */
  const ico = id => `<svg class="ico" aria-hidden="true"><use href="#${id}"/></svg>`;
  const updates = S.orgUpdates.map(u => ({ ...u }));
  const updRow = u => `<tr data-upd="${u.id}"><td class="cell-main">${esc(u.feature)}${u.place ? `<span class="cell-sub">${esc(u.place)}</span>` : ''}</td><td class="mono">${esc(u.version)}</td><td>${esc(u.name)}</td><td class="mono">${u.number}</td><td class="mono">${u.date}</td>
    <td><span class="st st--${u.confirmed ? 'ok' : 'warn'}">${u.confirmed ? 'Подтверждено' : 'Не подтверждено'}</span></td>
    <td class="col-actions"><button class="icon-btn icon-btn--sm" type="button" data-upd-cancel data-tip="Отменить обновление" aria-label="Отменить обновление ${esc(u.feature)} ${esc(u.version)}">${ico('i-x')}</button></td></tr>`;
  const updGroup = (key, title, text, actions) => {
    const list = updates.filter(u => u.group === key);
    return `<section class="panel upd-group" aria-labelledby="upd-${key}"><div class="panel__head"><div><h2 class="panel__title" id="upd-${key}">${title}</h2><p class="muted dt__note">${text}</p></div><div class="panel__tools">${actions}</div></div>
      ${list.length ? `<div class="dt__scroll"><table class="table"><caption class="sr-only">${title}</caption><thead><tr><th scope="col">Лицензия</th><th scope="col">Версия</th><th scope="col">Наименование</th><th scope="col">Номер</th><th scope="col">Доступно до</th><th scope="col">Статус</th><th class="col-actions" scope="col"><span class="sr-only">Действия</span></th></tr></thead>
      <tbody>${list.map(updRow).join('')}</tbody></table></div>` : '<div class="empty"><div class="empty__title">Обновлений нет</div><p class="empty__text">Здесь появятся версии, которые СНК выпустит для этой организации.</p></div>'}</section>`;
  };
  const renderUpd = () => {
    count('upd', updates.filter(u => !u.confirmed).length || '');
    $('#upd').innerHTML = `<div class="dt__bar upd-bar"><p class="muted dt__note">Доступные версии программных продуктов и распределение их по рабочим местам. Точки установят разрешённую версию после закрытия смены.</p>
        <button class="btn btn--outline btn--xs" type="button" data-dialog="drawer-upd-ops">${ico('i-history')}<span>История операций</span></button></div>
      ${updGroup('all', 'Версии доступны для всех рабочих мест', 'Разрешённая версия ставится на все рабочие места, у которых известна установленная версия.', `<button class="btn btn--primary btn--xs" type="button" data-upd-all>${ico('i-update')}<span>Установить для всех мест</span></button>`)}
      ${updGroup('one', 'Индивидуальные обновления ТО', 'Версия только для отдельных точек — например, чтобы проверить бета-версию.', `<button class="btn btn--outline btn--xs" type="button" data-upd-one>${ico('i-plus')}<span>Индивидуальное обновление</span></button><button class="btn btn--ghost btn--xs" type="button" data-upd-cancel-all><span>Отменить все</span></button>`)}`;
  };
  renderUpd();
  const restore = list => { updates.push(...list); updates.sort((a, b) => a.id - b.id); renderUpd(); };
  $('#upd').addEventListener('click', async e => {
    const tr = e.target.closest('tr[data-upd]'), u = tr && updates.find(x => x.id === Number(tr.dataset.upd));
    if (e.target.closest('[data-upd-cancel]') && u) {
      if (!await SNC.confirm({ title: 'Отменить обновление?', sub: `${u.feature} ${u.version}${u.place ? ` · ${u.place}` : ''}`, icon: 'i-update', cta: 'Отменить обновление', items: ['Рабочие места не получат эту версию', 'Уже установленная версия на точках останется', 'Операция попадёт в историю'] })) return;
      updates.splice(updates.indexOf(u), 1); renderUpd();
      SNC.toast({ type: 'ok', title: 'Обновление отменено', text: `${u.feature} ${u.version}`, action: { label: 'Вернуть', onClick: () => restore([u]) } });
    }
    if (e.target.closest('[data-upd-all]')) {
      const pending = updates.filter(x => x.group === 'all' && !x.confirmed);
      if (!pending.length) { SNC.toast({ type: 'info', title: 'Все версии уже разрешены' }); return; }
      if (!await SNC.confirm({ title: 'Разрешить обновление?', sub: org.name, icon: 'i-update', cta: 'Разрешить', items: [`${pending.map(x => `${x.feature} ${x.version}`).join(', ')} — установится на все рабочие места, у которых известна установленная версия`, 'Точки обновятся после закрытия смены', 'Отменить разрешение можно до начала установки'] })) return;
      pending.forEach(x => { x.confirmed = true; }); renderUpd();
      SNC.toast({ type: 'ok', title: 'Обновление распределено', text: org.name });
    }
    if (e.target.closest('[data-upd-one]')) SNC.toast({ type: 'info', title: 'Индивидуальное обновление', text: 'В боевом — модалка: поиск точки и выбор версии из доступных.' });
    if (e.target.closest('[data-upd-cancel-all]')) {
      const one = updates.filter(x => x.group === 'one');
      if (!one.length || !await SNC.confirm({ title: 'Отменить обновления?', sub: `Индивидуальных обновлений: ${one.length}`, icon: 'i-update', cta: 'Отменить все', items: ['Точки не получат индивидуальные версии', 'Версии «для всех рабочих мест» не изменятся'] })) return;
      one.forEach(x => updates.splice(updates.indexOf(x), 1)); renderUpd();
      SNC.toast({ type: 'ok', title: 'Индивидуальные обновления отменены', action: { label: 'Вернуть', onClick: () => restore(one) } });
    }
  });
  $('#upd-ops').innerHTML = `<div class="dt__scroll"><table class="table"><caption class="sr-only">История операций с обновлениями</caption><thead><tr><th scope="col">Дата</th><th scope="col">Операция</th><th scope="col">Обновление</th><th scope="col">Область</th><th scope="col">Пользователь</th><th scope="col">Обоснование</th></tr></thead>
    <tbody>${S.updateOps.map(r => `<tr>${r.map((v, i) => `<td${i === 0 || i === 2 ? ' class="mono"' : ''}>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

  /* ---------- Офисное ПО ----------
     Основные рабочие места (СНК-Офис, СНК-ЛК-Офис, СНК-ПЦ, СНК-АСН, СНК-Личный кабинет) и дополнительные под ними.
     Действия: дополнительное место, конфигурационный файл, подключение копии ЛК к management. */
  const soft = S.officeSoft.map(x => ({ ...x, children: x.children.map(c => ({ ...c })) }));
  const cidCell = v => v ? `<span class="mono" data-tip="${esc(v)}">${esc(v.slice(0, 9))}…</span>` : '<span class="muted">не привязан</span>';
  const softRow = (x, child) => `<tr data-soft="${x.id}"${child ? ' class="tree-child"' : ''}>
    <td class="cell-main">${esc(S.SOFT_TYPES[x.type])}${child ? '<span class="cell-sub">дополнительное место</span>' : ''}</td>
    <td>${cidCell(x.computerId)}</td><td class="mono">${esc(x.hasp)}</td><td>${esc(x.comment)}</td>
    <td class="col-actions2"><span class="row-acts">
      ${!child && x.type === 200 ? `<button class="icon-btn icon-btn--sm" type="button" data-soft-add data-tip="Добавить дополнительное рабочее место" aria-label="Добавить дополнительное рабочее место">${ico('i-plus')}</button>` : ''}
      ${x.type === 9905 ? `<button class="icon-btn icon-btn--sm" type="button" data-soft-pa data-tip="Подключение к management" aria-label="Подключение копии ЛК к management">${ico('i-external')}</button>` : ''}
      <button class="icon-btn icon-btn--sm" type="button" data-soft-cfg data-tip="Получить конфигурационный файл" aria-label="Получить конфигурационный файл: ${esc(x.comment)}">${ico('i-download')}</button>
    </span></td></tr>`;
  const renderSoft = () => {
    count('soft', soft.reduce((a, x) => a + 1 + x.children.length, 0));
    $('#soft').innerHTML = `<div class="dt__bar"><p class="muted dt__note">Рабочие места офисных программ организации. Конфигурационный файл привязывает программу к организации и Hasp-ключу.</p>
        <button class="btn btn--outline btn--xs" type="button" data-soft-new>${ico('i-plus')}<span>Добавить рабочее место</span></button></div>
      <div class="dt__scroll"><table class="table"><caption class="sr-only">Офисное ПО</caption><thead><tr><th scope="col">Тип</th><th scope="col">Идентификатор ПК</th><th scope="col">Hasp-ключи</th><th scope="col">Комментарий</th><th class="col-actions2" scope="col"><span class="sr-only">Действия</span></th></tr></thead>
      <tbody>${soft.map(x => softRow(x) + x.children.map(c => softRow(c, true)).join('')).join('')}</tbody></table></div>`;
  };
  renderSoft();
  $('#soft').addEventListener('click', e => {
    const tr = e.target.closest('tr[data-soft]');
    if (e.target.closest('[data-soft-cfg]')) SNC.toast({ type: 'ok', title: 'Конфигурационный файл скачан', text: 'Положите его в папку программы и перезапустите её.' });
    if (e.target.closest('[data-soft-pa]')) location.href = '../pa/copies.html';
    if (e.target.closest('[data-soft-new]')) SNC.toast({ type: 'info', title: 'Новое рабочее место', text: 'В боевом — модалка: тип программы, Hasp-ключ и комментарий.' });
    if (e.target.closest('[data-soft-add]') && tr) {
      const p = soft.find(x => x.id === Number(tr.dataset.soft));
      p.children.push({ id: Date.now(), type: p.type, computerId: null, hasp: '—', comment: 'Новое рабочее место' });
      renderSoft();
      $(`tr[data-soft="${p.children.at(-1).id}"]`).classList.add('is-changed');
      SNC.toast({ type: 'ok', title: 'Рабочее место добавлено', text: 'Идентификатор ПК привяжется при первом запуске программы.' });
    }
  });

  /* ---------- Внешние ТО: рабочие места СНК-ВС ПЦ и СНК-ВС ЕБС ---------- */
  count('ext', S.externalServices.length);
  $('#ext').innerHTML = `<div class="dt__bar"><p class="muted dt__note">Шлюзы процессинга и бонусных систем, которые работают от имени организации.</p>
      <button class="btn btn--outline btn--xs" type="button" data-demo-toast="info|Новый внешний ТО|В боевом — модалка: тип, наименование, Hasp-ключ и код у эмитента.">${ico('i-plus')}<span>Добавить</span></button></div>
    <div class="dt__scroll"><table class="table"><caption class="sr-only">Внешние ТО</caption><thead><tr><th scope="col">Тип</th><th scope="col">Наименование</th><th scope="col">Hasp-ключи</th><th scope="col">Код у эмитента</th><th class="col-actions2" scope="col"><span class="sr-only">Действия</span></th></tr></thead>
    <tbody>${S.externalServices.map(x => `<tr><td>${esc(x.type)}</td><td class="cell-main">${esc(x.name)}</td><td class="mono">${esc(x.hasp)}</td><td class="mono">${esc(x.shopKey)}</td>
      <td class="col-actions2"><span class="row-acts"><button class="icon-btn icon-btn--sm" type="button" data-demo-toast="info|Редактирование внешнего ТО|${esc(x.name)}" data-tip="Редактировать" aria-label="Редактировать ${esc(x.name)}">${ico('i-edit')}</button>
      <button class="icon-btn icon-btn--sm" type="button" data-demo-toast="ok|Конфигурационный файл скачан|${esc(x.name)}" data-tip="Получить конфигурационный файл" aria-label="Получить конфигурационный файл: ${esc(x.name)}">${ico('i-download')}</button></span></td></tr>`).join('')}</tbody></table></div>`;

  /* ---------- Пустые разделы (у партнёров и новых организаций) ---------- */
  const empty = (sel, title, text) => { $(sel).innerHTML = `<div class="empty"><div class="empty__title">${title}</div><p class="empty__text">${text}</p></div>`; };
  if (!contracts.length) empty('#contracts', 'Договоров пока нет', 'Договор появится здесь после подписания в СЭД. Спецификации и лицензии привязываются к договору.');
  if (!users.length) empty('#users', 'Пользователей пока нет', 'Пригласите сотрудника организации в разделе «Пользователи» — после первого входа он появится здесь.');

  /* ---------- Квоты по клиентам (только партнёр) ----------
     Сколько лицензий мобильных сервисов партнёр может распределить каждому клиенту. */
  if (isPartner) {
    const q = D.ORGS.map((c, i) => ({ c, quota: [20, 12, 8, 4][i], used: [14, 12, 3, 0][i] }));
    $('#quota').innerHTML = `<div class="dt__bar"><p class="muted" style="font-size:13px;margin-right:auto">Квоты на подключение точек клиентов к сервису ${esc(org.short)}.</p></div>
      <div class="dt__scroll"><table class="table"><caption class="sr-only">Квоты по клиентам</caption><thead><tr><th scope="col">Клиент</th><th scope="col">Тип</th><th scope="col" style="width:160px">Квота, точек</th><th scope="col" class="num-cell">Использовано</th><th scope="col" style="width:200px">Заполнение</th></tr></thead>
      <tbody>${q.map(({ c, quota, used }) => { const p = Math.min(1, used / quota), st = p >= 1 ? 'err' : p >= .85 ? 'warn' : 'ok'; return `<tr><td class="cell-main"><a href="organization.html?org=${c.id}">${esc(c.name)}</a></td><td>${D.ORG_TYPES[c.type]}</td>
        <td><div class="num" style="width:130px;height:34px"><button type="button" data-step="-1" aria-label="Меньше"><svg class="ico" aria-hidden="true"><use href="#i-minus"/></svg></button><input type="number" min="${used}" max="999" value="${quota}" aria-label="Квота для ${esc(c.name)}" data-quota><button type="button" data-step="1" aria-label="Больше"><svg class="ico" aria-hidden="true"><use href="#i-plus"/></svg></button></div></td>
        <td class="num-cell">${used}</td><td><div class="meter meter--${st}" role="meter" aria-valuemin="0" aria-valuemax="${quota}" aria-valuenow="${used}" aria-label="Заполнение квоты ${esc(c.name)}"><i style="--p:${p}"></i></div></td></tr>`; }).join('')}</tbody></table></div>`;
    $$('#quota .num').forEach(n => { const inp = $('input', n); $$('[data-step]', n).forEach(b => b.addEventListener('click', () => { inp.value = Math.max(Number(inp.min), (Number(inp.value) || 0) + Number(b.dataset.step)); inp.dispatchEvent(new Event('change', { bubbles: true })); })); });
    let t = null;
    $('#quota').addEventListener('change', e => { if (!e.target.closest('[data-quota]')) return; clearTimeout(t); t = setTimeout(() => SNC.toast({ type: 'ok', title: 'Квота сохранена', text: e.target.getAttribute('aria-label').replace('Квота для ', '') }), 500); });
  }

  const tab = location.hash && $(`${location.hash}[role="tab"]`);
  if (tab) tab.click();
})();
