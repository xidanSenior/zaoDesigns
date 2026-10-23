/* =========================================================
   СНК · Личный кабинет — Реестр карт покупателя (cardManagement).
   Плитки-фильтры по состоянию, таблица с остатком лимита, выбор строк
   и групповые операции, drawer карты (кошельки, транзакции, события),
   изменение лимита и блокировка с подтверждением.
   «Живые» изменения остатков — имитация таймером (TODO: NATS / опрос API).
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const D = window.SNC_DEMO, SNC = window.SNC, P = SNC.pa;
  const { esc, nf, money } = P;
  const cards = D.cards.map(c => ({ ...c, wallets: c.wallets.map(w => ({ ...w })) }));
  const byId = id => cards.find(c => c.id === Number(id));
  const dt = $('#cards-table');
  const tbody = $('tbody', dt);

  /* ---------- Строки ---------- */
  const cbox = label => `<label class="cb"><input type="checkbox" aria-label="${esc(label)}"><span class="cb__box"><svg viewBox="0 0 12 12"><path class="cb__tick" d="M2.5 6.2l2.3 2.3L9.5 3.5"/><path class="cb__dash" d="M3 6h6"/></svg></span></label>`;
  const stOf = c => c.low ? { st: 'warn', label: 'Мало лимита' } : { st: D.CARD_STATE[c.state].st, label: D.CARD_STATE[c.state].label };
  const dkey = s => { const m = String(s).match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/); return m ? `${m[3]}${m[2]}${m[1]}${m[4]}${m[5]}` : '0'; };
  const rowHtml = c => {
    const s = stOf(c);
    const w = c.wallets[0];
    return `<tr data-id="${c.id}" data-state="${c.state}" data-attn="${s.st === 'warn' || s.st === 'info' || s.st === 'err' ? 1 : 0}" data-div="${esc(c.division)}">
      <td class="col-check">${cbox(`Выбрать карту ${c.short}`)}</td>
      <td class="cell-main" data-v="${c.number}"><button class="link-btn mono" type="button" data-open style="font-weight:600">${esc(c.number)}</button><span class="cell-sub">${esc(c.owner)} · <span class="mono">${esc(c.plate)}</span></span></td>
      <td>${esc(c.division)}</td>
      <td data-v="${P.rest(w).p.toFixed(3)}" data-cell="lim">${c.state === 'returned' ? '<span class="muted">—</span>' : P.lim(w)}</td>
      <td class="num-cell" data-v="${c.dayLimit}">${c.dayLimit ? nf.format(c.dayLimit) : '<span class="muted">—</span>'}</td>
      <td class="mono" data-v="${dkey(c.lastUse)}">${esc(c.lastUse)}</td>
      <td data-v="${s.st}" data-cell="st"><span class="st st--${s.st}" data-tip="${esc(D.CARD_STATE[c.state].full)}">${esc(s.label)}</span></td>
      <td class="col-actions"><button class="icon-btn icon-btn--sm" type="button" data-row-menu aria-label="Действия с картой ${c.short}"><svg class="ico" aria-hidden="true"><use href="#i-more"/></svg></button></td>
    </tr>`;
  };
  tbody.innerHTML = cards.map(rowHtml).join('');
  SNC.initTable(dt);
  const repaintRow = c => {
    const old = $(`tr[data-id="${c.id}"]`, tbody);
    const checked = $('.col-check input', old)?.checked;
    old.insertAdjacentHTML('afterend', rowHtml(c));
    const tr = old.nextElementSibling; old.remove();
    if (checked) $('.col-check input', tr).checked = true;
    tr.classList.remove('is-changed'); void tr.offsetWidth; tr.classList.add('is-changed');
    dt.snc.paint(); kpis();
  };

  /* ---------- Плитки-фильтры ---------- */
  const TILES = [
    { k: 'all', label: 'Все карты', test: () => true },
    { k: 'work', label: '<span class="st st--ok">В работе</span>', test: c => c.state === 'work' && !c.low },
    { k: 'attn', label: '<span class="st st--warn">Требуют внимания</span>', test: c => { const s = stOf(c).st; return s === 'warn' || s === 'info'; }, foot: 'мало лимита, запись, активация' },
    { k: 'block', label: '<span class="st st--err">Блокированы</span>', test: c => c.state === 'block' || c.state === 'stop' },
    { k: 'returned', label: '<span class="st st--off">Сданы</span>', test: c => c.state === 'returned' }
  ];
  let tile = new URLSearchParams(location.search).get('attention') ? 'attn' : (new URLSearchParams(location.search).get('state') === 'work' ? 'work' : 'all');
  let divs = [];
  const kpiEl = $('#cards-kpis');
  function kpis() {
    kpiEl.innerHTML = TILES.map(t => `<button class="kpi${t.k === tile && t.k !== 'all' ? ' is-active' : ''}" type="button" data-tile="${t.k}" aria-pressed="${t.k === tile}"><span class="kpi__label">${t.label}</span><span class="kpi__value">${cards.filter(t.test).length}</span><span class="kpi__foot">${t.foot || (t.k === 'all' ? `${D.DIVISIONS.length} подразделения` : 'нажмите, чтобы показать')}</span></button>`).join('');
  }
  const apply = () => {
    const t = TILES.find(x => x.k === tile);
    dt.snc.setFilter(tr => { const c = byId(tr.dataset.id); return t.test(c) && (!divs.length || divs.includes(c.division)); });
    $('[data-reset-filters]', dt).hidden = tile === 'all' && !divs.length;
  };
  kpiEl.addEventListener('click', e => {
    const b = e.target.closest('[data-tile]');
    if (!b) return;
    tile = b.dataset.tile === tile ? 'all' : b.dataset.tile;
    kpis(); apply();
    SNC.announce(`Показаны: ${TILES.find(x => x.k === tile).label.replace(/<[^>]+>/g, '')}`);
  });
  $('#f-div').addEventListener('change', e => { divs = e.detail.values; apply(); });
  const resetAll = () => { tile = 'all'; $('#f-div [data-clear]')?.click(); divs = []; kpis(); apply(); };
  $('[data-reset-filters]', dt).addEventListener('click', resetAll);
  dt.addEventListener('dt:reset-filters', resetAll);
  kpis(); apply();
  $('[data-total]').textContent = cards.length;

  /* ---------- Drawer карты ---------- */
  const drw = $('#drw-card');
  const d = k => $(`[data-d="${k}"]`, drw);
  let current = null;
  const EVENTS = c => [
    [`${D.today} 09:12`, 'Лимит АИ-95 записан на карту', 'Смирнова А.'],
    ['18.10.2026 16:40', 'Изменён основной лимит: 400 → 500 л', 'Смирнова А.'],
    ['02.10.2026 08:01', 'Новый период: лимиты обнулены', 'система'],
    [c.state === 'block' ? '30.09.2026 11:20' : '14.09.2026 10:05', c.state === 'block' ? 'Карта заблокирована: утеряна' : 'Установлен ПИН-код', 'Смирнова А.', c.state === 'block']
  ];
  function openCard(id, opener) {
    const c = byId(id); current = c;
    const s = stOf(c);
    $('#drw-card-t').textContent = c.number;
    d('sub').innerHTML = `<span class="st st--${s.st}">${esc(s.label)}</span> · ${esc(c.division)}`;
    d('banner').innerHTML = c.low ? `<div class="banner banner--warn" role="status"><svg class="ico" aria-hidden="true"><use href="#i-warn"/></svg><div class="banner__text">Основной лимит почти исчерпан<small>Осталось ${nf.format(P.rest(c.wallets[0]).left)} л до конца месяца. Увеличьте лимит или перенесите остаток с другой карты.</small></div><button class="btn btn--outline btn--xs" type="button" data-act="limit">Изменить лимит</button></div>`
      : c.state === 'write' ? `<div class="banner banner--info" role="status"><svg class="ico" aria-hidden="true"><use href="#i-info"/></svg><div class="banner__text">${esc(D.CARD_STATE.write.full)}<small>Карта перезапишется автоматически при следующей заправке на точке с онлайн-ридером.</small></div></div>`
      : ['block', 'stop'].includes(c.state) ? `<div class="banner banner--err" role="status"><svg class="ico" aria-hidden="true"><use href="#i-block"/></svg><div class="banner__text">${esc(D.CARD_STATE[c.state].full)}<small>Карта не обслуживается на точках.</small></div></div>` : '';
    d('face').innerHTML = P.face(c, { small: true });
    d('kv').innerHTML = [
      ['Держатель', esc(c.owner)], ['Госномер', `<span class="mono">${esc(c.plate)}</span>`], ['Подразделение', esc(c.division)],
      ['ПИН-код', c.pin ? 'установлен' : '<span class="st st--warn">не установлен</span>'], ['Доп. лимит', c.dayLimit ? `${c.dayLimit} л/сут` : 'нет'], ['Последнее использование', `<span class="mono">${esc(c.lastUse)}</span>`]
    ].map(([k, v]) => `<div class="kv"><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    d('wallets').innerHTML = c.state === 'returned' ? '<p class="muted">Карта сдана — кошельков нет.</p>' : c.wallets.map(P.wallet).join('');
    const tx = D.transactions.filter(t => t.cardId === c.id).slice(0, 10);
    d('txc').textContent = tx.length;
    d('tx').innerHTML = tx.length ? tx.map(t => `<tr><td class="mono">${t.date}</td><td>${esc(t.station)}<span class="cell-sub">${esc(t.address)}</span></td><td>${esc(t.fuel)}</td><td class="num-cell">${nf.format(t.volume)}</td><td class="num-cell">${money(t.cost)}</td></tr>`).join('') : '<tr><td colspan="5"><div class="empty" style="padding:24px"><div class="empty__title">Транзакций нет</div><p class="empty__text">За последние три месяца картой не пользовались.</p></div></td></tr>';
    d('events').innerHTML = EVENTS(c).map(([t, txt, who, err]) => `<li${err ? ' class="is-err"' : ''}><p>${esc(txt)}</p><span class="mono muted" style="font-size:12px">${t} · ${esc(who)}</span></li>`).join('');
    const blocked = ['block', 'stop', 'activate'].includes(c.state);
    d('foot').innerHTML = c.state === 'returned' ? '<button class="btn btn--ghost btn--sm" type="button" data-close>Закрыть</button>'
      : `${blocked ? `<button class="btn btn--outline btn--sm" type="button" data-act="unblock"${c.state === 'block' ? ' disabled data-tip="Карта в чёрном списке — разблокировать нельзя, выпустите новую"' : ''}><span>Разблокировать</span></button>` : '<button class="btn btn--ghost btn--sm" type="button" data-act="block"><svg class="ico" aria-hidden="true"><use href="#i-block"/></svg><span>Заблокировать</span></button>'}
         <button class="btn btn--outline btn--sm" type="button" data-act="pin"><span>Установить ПИН-код</span></button>
         <button class="btn btn--primary btn--sm" type="button" data-act="limit"><span>Изменить лимит</span></button>`;
    // первая вкладка при каждом открытии
    $('#tc-w', drw).click();
    SNC.dialog.open('drw-card', opener);
  }
  tbody.addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (b) openCard(b.closest('tr').dataset.id, b); });
  if (new URLSearchParams(location.search).get('card')) openCard(new URLSearchParams(location.search).get('card'));
  drw.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const a = b.dataset.act;
    if (a === 'limit') openLimit([current]);
    if (a === 'block') openBlock([current]);
    if (a === 'pin') pin(current);
    if (a === 'unblock') { current.state = 'work'; repaintRow(current); openCard(current.id); SNC.toast({ type: 'ok', title: `Карта ${current.short} разблокирована`, text: 'Начнёт обслуживаться через 1–5 минут.' }); }
  });

  /* ---------- Меню строки ---------- */
  dt.addEventListener('rowmenu', e => {
    const c = byId(e.detail.row.dataset.id);
    ({ open: () => openCard(c.id), limit: () => openLimit([c]), block: () => openBlock([c]), pin: () => pin(c), owner: () => SNC.toast({ type: 'info', title: 'Изменить имя владельца', text: `Карта ${c.short}: поле редактируется в карточке — в боевой версии.` }) })[e.detail.action]?.();
  });
  const pin = c => SNC.toast({ type: 'ok', title: 'ПИН-код отправлен держателю', text: `SMS с новым ПИН-кодом карты ${c.short} уйдёт на телефон водителя. Карта перезапишется при заправке.` });

  /* ---------- Выбранные строки и групповые операции ---------- */
  const selected = () => $$('tbody > tr', dt).filter(tr => $('.col-check input', tr)?.checked).map(tr => byId(tr.dataset.id));
  const needPick = () => { SNC.toast({ type: 'info', title: 'Выберите карты', text: 'Отметьте карты в таблице — групповая операция применится к ним.' }); $('tbody .col-check input:not([hidden])', dt)?.focus(); };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-group]');
    if (!b) return;
    const list = selected();
    if (!list.length) return needPick();
    if (b.dataset.group === 'limit') openLimit(list);
    if (b.dataset.group === 'block') openBlock(list);
    if (b.dataset.group === 'return') SNC.confirm({
      title: `Сдать ${list.length} ${P.plural(list.length, 'карту', 'карты', 'карт')}?`, sub: list.slice(0, 3).map(c => c.short).join(', ') + (list.length > 3 ? '…' : ''),
      items: ['Карты перестанут работать сразу после операции', 'Остатки лимитов вернутся на баланс договора', 'Будет сформирован акт приёма-передачи — он появится в «Документах»'],
      cta: 'Сдать карты', icon: 'i-trash'
    }).then(ok => { if (!ok) return; list.forEach(c => { c.state = 'returned'; repaintRow(c); }); $('[data-dt-clear]', dt).click(); SNC.toast({ type: 'ok', title: 'Запрос принят', text: 'Ход выполнения — в «Журнале операций».' }); });
  });
  $('[data-export]').addEventListener('click', () => SNC.toast({ type: 'info', title: 'Выгрузка готовится', text: `${dt.snc.visible.length} ${P.plural(dt.snc.visible.length, 'карта', 'карты', 'карт')} с учётом фильтров. Файл XLSX скачается автоматически.` }));
  $('[data-export-selected]').addEventListener('click', () => SNC.toast({ type: 'info', title: 'Выгрузка готовится', text: `${selected().length} ${P.plural(selected().length, 'карта', 'карты', 'карт')}.` }));

  /* ---------- Лимит ---------- */
  let limitFor = [];
  const formLimit = $('#form-limit');
  function openLimit(list) {
    limitFor = list.filter(c => c.state !== 'returned');
    if (!limitFor.length) return SNC.toast({ type: 'info', title: 'Нечего менять', text: 'У сданных карт нет кошельков.' });
    const one = limitFor.length === 1 ? limitFor[0] : null;
    $('[data-limit-who]').textContent = one ? `Карта ${one.number} · ${one.owner}` : `${limitFor.length} ${P.plural(limitFor.length, 'карта', 'карты', 'карт')}: одинаковый лимит для всех`;
    const fuels = [...new Set(limitFor.flatMap(c => c.wallets.map(w => w.fuel)))];
    $('#lm-fuel').innerHTML = fuels.map(f => `<option value="${f}">${esc(P.fuel(f).name)}</option>`).join('');
    $('#lm-main').value = one ? one.wallets[0].limit : '';
    $('#lm-day').value = one && one.dayLimit ? one.dayLimit : '';
    $$('.fld', formLimit).forEach(f => f.classList.remove('is-invalid'));
    SNC.dialog.open('dlg-limit');
    $('#lm-main').focus();
  }
  formLimit.addEventListener('submit', e => {
    e.preventDefault();
    if (!SNC.validate(formLimit)) return;
    const val = Number($('#lm-main').value), day = Number($('#lm-day').value || 0), f = $('#lm-fuel').value;
    limitFor.forEach(c => {
      const w = c.wallets.find(x => x.fuel === f);
      if (w) w.limit = val;
      c.dayLimit = day;
      c.low = c.state === 'work' && P.rest(c.wallets[0]).low;
      repaintRow(c);
    });
    SNC.dialog.close('dlg-limit');
    if (drw.open && current) openCard(current.id);
    SNC.toast({ type: 'ok', title: 'Лимит сохранён', text: `${P.fuel(f).name}: ${nf.format(val)} л на месяц · ${limitFor.length} ${P.plural(limitFor.length, 'карта', 'карты', 'карт')}. Запишется на карты в течение 5 минут.` });
  });

  /* ---------- Блокировка ---------- */
  let blockFor = [];
  const formBlock = $('#form-block');
  function openBlock(list) {
    blockFor = list.filter(c => !['block', 'returned'].includes(c.state));
    if (!blockFor.length) return SNC.toast({ type: 'info', title: 'Карты уже заблокированы или сданы' });
    $('#dlg-block-t').textContent = blockFor.length === 1 ? 'Заблокировать карту?' : `Заблокировать ${blockFor.length} ${P.plural(blockFor.length, 'карту', 'карты', 'карт')}?`;
    $('[data-block-who]').textContent = blockFor.slice(0, 3).map(c => `${c.short} · ${c.owner}`).join(', ') + (blockFor.length > 3 ? ` и ещё ${blockFor.length - 3}` : '');
    $('[data-block-cta]').textContent = blockFor.length === 1 ? 'Заблокировать' : `Заблокировать ${blockFor.length}`;
    formBlock.reset();
    SNC.dialog.open('dlg-block');
  }
  formBlock.addEventListener('submit', e => {
    e.preventDefault();
    const lost = formBlock.reason.value === 'lost';
    const prev = blockFor.map(c => [c, c.state]);
    blockFor.forEach(c => { c.state = lost ? 'block' : 'activate'; c.low = false; repaintRow(c); });
    SNC.dialog.close('dlg-block');
    if (drw.open && current) openCard(current.id);
    SNC.toast({
      type: 'ok', title: lost ? 'Карты в чёрном списке' : 'Карты заблокированы', text: `${blockFor.length} ${P.plural(blockFor.length, 'карта', 'карты', 'карт')}. Перестанут обслуживаться через 1–5 минут.`,
      action: lost ? null : { label: 'Вернуть', onClick: () => { prev.forEach(([c, s]) => { c.state = s; c.low = s === 'work' && P.rest(c.wallets[0]).low; repaintRow(c); }); SNC.toast({ type: 'info', title: 'Блокировка отменена' }); } }
    });
  });

  /* ---------- Живые данные: заправка уменьшает остаток ---------- */
  const tick = () => {
    if (document.hidden) return;
    const pool = cards.filter(c => c.state === 'work');
    const c = pool[Math.floor(Math.random() * pool.length)];
    const w = c.wallets[0];
    const vol = Math.min(w.limit - w.spent, Math.round(20 + Math.random() * 35));
    if (vol <= 0) return;
    w.spent = Math.round((w.spent + vol) * 100) / 100;
    c.lastUse = `${D.today} ${new Date().toTimeString().slice(0, 5)}`;
    const wasLow = c.low; c.low = P.rest(w).low;
    repaintRow(c);
    if (drw.open && current?.id === c.id) openCard(c.id);
    if (c.low && !wasLow) SNC.toast({ type: 'warn', title: `Карта ${c.short}: осталось меньше 10%`, text: `${P.fuel(w.fuel).name}: ${nf.format(P.rest(w).left)} л до конца месяца.`, action: { label: 'Изменить лимит', onClick: () => openLimit([c]) } });
    else SNC.announce(`Заправка по карте ${c.short}: ${vol} литров`);
  };
  setInterval(tick, 14000); // TODO: подписка на события транзакций
})();
