/* =========================================================
   СНК · Личный кабинет — Протокол транзакций (transactionReportOwner).
   Период (не длиннее 3 месяцев, как в боевом — periodLengthError),
   фильтры по топливу и подразделению, итоги плитками и строкой ИТОГО.
   TODO: stores/reports — запрос протокола за период; выгрузка — exportReports.
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const D = window.SNC_DEMO, SNC = window.SNC, P = SNC.pa;
  const { esc, nf, money } = P;
  const dt = $('#tx-table');
  const tbody = $('tbody', dt), tfoot = $('tfoot', dt);
  const f = d => d.toLocaleDateString('ru-RU');
  let start = new Date(2026, 9, 1), end = new Date(2026, 9, 22, 23, 59);
  let fuels = [], divs = [];

  tbody.innerHTML = D.transactions.map(t => `<tr data-ts="${t.ts}" data-fuel="${t.fuelId}" data-div="${esc(t.division)}">
      <td class="mono" data-v="${t.ts}">${t.date}</td>
      <td class="mono" data-v="${t.card}"><a href="../cards.html?card=${t.cardId}">${esc(t.card)}</a><span class="cell-sub" style="font-family:var(--font-sans)">${esc(t.owner)}</span></td>
      <td>${esc(t.division)}</td>
      <td>${esc(t.station)}<span class="cell-sub">${esc(t.address)}</span></td>
      <td><span class="wallet__name fuel-${P.fuel(t.fuelId).series}" style="font-weight:600"><i aria-hidden="true"></i>${esc(t.fuel)}</span></td>
      <td class="num-cell" data-v="${t.volume}">${nf.format(t.volume)}</td>
      <td class="num-cell" data-v="${t.basePrice}">${money(t.basePrice)}</td>
      <td class="num-cell" data-v="${t.price}">${money(t.price)}</td>
      <td class="num-cell" data-v="${t.cost}">${money(t.cost)}</td>
      <td class="num-cell" data-v="${t.discount}">${money(t.discount)}</td>
    </tr>`).join('');
  SNC.initTable(dt);

  const byRow = new Map(D.transactions.map(t => [String(t.ts), t]));
  const test = tr => {
    const ts = Number(tr.dataset.ts);
    return ts >= start.getTime() && ts <= end.getTime() && (!fuels.length || fuels.includes(tr.dataset.fuel)) && (!divs.length || divs.includes(tr.dataset.div));
  };
  const totals = () => {
    const rows = dt.snc.visible.map(tr => byRow.get(tr.dataset.ts));
    const s = k => rows.reduce((a, t) => a + t[k], 0);
    const vol = s('volume'), cost = s('cost'), disc = s('discount');
    $('#tx-kpis').innerHTML = [
      ['Транзакций', nf.format(rows.length), `${new Set(rows.map(t => t.cardId)).size} карт`],
      ['Объём', `${nf.format(Math.round(vol))}<small>л</small>`, `средняя заправка ${nf.format(Math.round(vol / Math.max(1, rows.length)))} л`],
      ['Стоимость', `${nf.format(Math.round(cost))}<small>₽</small>`, `${money(cost / Math.max(1, vol))} ₽ за литр`],
      ['Скидка', `${nf.format(Math.round(disc))}<small>₽</small>`, `${(disc / Math.max(1, cost + disc) * 100).toFixed(1).replace('.', ',')} % от цены без скидки`]
    ].map(([l, v, foot]) => `<div class="kpi"><span class="kpi__label">${l}</span><span class="kpi__value">${v}</span><span class="kpi__foot">${foot}</span></div>`).join('');
    tfoot.innerHTML = rows.length ? `<tr><th scope="row" colspan="5">ИТОГО за ${f(start)} — ${f(end)}</th><td class="num-cell">${nf.format(Math.round(vol * 100) / 100)}</td><td></td><td></td><td class="num-cell">${money(cost)}</td><td class="num-cell">${money(disc)}</td></tr>` : '';
    $('[data-period-v]').textContent = `${f(start).slice(0, 5)}–${f(end).slice(0, 5)}`;
  };
  const apply = () => { dt.snc.setFilter(test); totals(); };
  $('#tx-period').addEventListener('change', e => {
    const s = e.detail.start, en = e.detail.end;
    const days = (en - s) / 86400000;
    const err = $('[data-period-err]');
    if (days > 92) {
      err.innerHTML = '<div class="banner banner--warn" role="alert"><svg class="ico" aria-hidden="true"><use href="#i-warn"/></svg><div class="banner__text">Период не должен превышать 3 месяца<small>Выберите период короче — например, квартал. Для годовых итогов откройте «Статистику».</small></div></div>';
      return;
    }
    err.innerHTML = '';
    start = s; end = new Date(en.getFullYear(), en.getMonth(), en.getDate(), 23, 59);
    apply();
  });
  $('#tx-fuel').addEventListener('change', e => { fuels = e.detail.values; apply(); });
  $('#tx-div').addEventListener('change', e => { divs = e.detail.values; apply(); });
  $('[data-dt-search]', dt).addEventListener('input', () => setTimeout(totals));
  dt.addEventListener('dt:reset-filters', () => { ['#tx-fuel', '#tx-div'].forEach(s => $(`${s} [data-clear]`)?.click()); fuels = []; divs = []; apply(); });
  $('[data-export]').addEventListener('click', () => SNC.toast({ type: 'info', title: 'Протокол формируется', text: `${dt.snc.visible.length} транзакций за ${f(start)} — ${f(end)}. Файл XLSX появится в «Документах» и скачается автоматически.` }));
  apply();
})();
