/* =========================================================
   СНК · Личный кабинет — Статистика покупателя (statisticPurchaser).
   Баланс и прогноз, плитки по картам, реализация по месяцам
   (столбцы по видам топлива), доли топлива (кольцо), итоги таблицей.
   TODO: данные — stores/statistic (баланс, месяцы) и stores/cardManagement.
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const D = window.SNC_DEMO, SNC = window.SNC;
  const nf = new Intl.NumberFormat('ru-RU');
  const money = n => new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  const A = D.account;
  const cur = D.months[D.months.length - 1];

  /* ---------- Баланс ---------- */
  $('[data-bal]').innerHTML = `${money(A.balance)}<small>₽</small>`;
  $('[data-credit]').textContent = `${money(A.credit)} ₽`;
  $('[data-signal]').textContent = `${money(A.signal)} ₽`;
  $('[data-days]').textContent = `${A.daysLeft} дн.`;
  $('[data-recommended]').textContent = `${money(A.recommended)} ₽`;
  $('[data-discount]').textContent = '3,1 %';
  $('[data-invoice-link]').href = `invoices.html?sum=${A.recommended}`;
  // шкала: от 0 до «баланс + кредит», отметка — сигнальный лимит
  const max = Math.ceil((A.balance + A.credit) / 50000) * 50000;
  const runway = $('[data-runway]');
  runway.style.setProperty('--p', 0);
  requestAnimationFrame(() => requestAnimationFrame(() => runway.style.setProperty('--p', (A.balance / max).toFixed(3))));
  $('.runway').style.setProperty('--m', `${(A.signal / max * 100).toFixed(1)}%`);
  $('[data-runway-max]').textContent = `${nf.format(max / 1000)} тыс ₽`;
  const low = A.daysLeft <= 10;
  runway.classList.toggle('is-warn', low);
  const st = $('[data-bal-st]');
  st.className = `st st--${low ? 'warn' : 'ok'}`;
  st.textContent = low ? `Хватит примерно на ${A.daysLeft} дн.` : 'Средств достаточно';

  /* ---------- Плитки: карты и транзакции ---------- */
  const work = D.cards.filter(c => c.state === 'work').length;
  const attention = D.cards.filter(c => c.st === 'warn' || c.st === 'info' || c.st === 'err').length;
  const monthTx = D.transactions.filter(t => t.date.slice(3, 10) === D.today.slice(3));
  const avg = monthTx.reduce((a, t) => a + t.cost, 0) / Math.max(1, monthTx.length);
  const spark = D.months.slice(-8).map(m => m.volume);
  const tiles = [
    { href: 'cards.html?state=work', label: '<span class="st st--ok">Карты в работе</span>', value: `${work}<small>из ${D.cards.length}</small>`, foot: `${D.cards.filter(c => c.state === 'returned').length} сданы` },
    { href: 'cards.html?attention=1', label: '<span class="st st--warn">Требуют внимания</span>', value: attention, foot: 'низкий остаток, запись, блокировка' },
    { href: 'reports/transactions.html', label: 'Транзакций в октябре', value: nf.format(monthTx.length), foot: `средний чек ${nf.format(Math.round(avg))} ₽` },
    { href: 'reports/fuel.html', label: 'Реализовано в октябре', value: `${nf.format(cur.volume)}<small>л</small>`, foot: `${money(cur.spent)} ₽`, spark }
  ];
  $('#st-kpis').innerHTML = tiles.map(t => `<a class="kpi" href="${t.href}"><span class="kpi__label">${t.label}</span><span class="kpi__value">${t.value}</span><span class="kpi__foot">${t.foot}${t.spark ? '<svg class="spark" aria-hidden="true" data-spark></svg>' : ''}</span></a>`).join('');
  const sp = $('[data-spark]'); if (sp) SNC.charts.spark(sp, spark);

  /* ---------- Реализация по месяцам: объём или стоимость ---------- */
  const labels = D.months.map(m => m.short);
  const series = metric => D.FUELS.map(f => ({
    name: f.name, color: `var(--series-${f.series})`,
    values: D.months.map(m => metric === 'volume' ? m.vol[f.id] : Math.round(m.vol[f.id] * f.price * 0.97))
  }));
  const drawMonths = metric => SNC.charts.bar($('#ch-months'), {
    title: `Реализация по месяцам 2026 года, ${metric === 'volume' ? 'литры' : 'рубли'}, по видам топлива`,
    labels, labelTitle: 'Месяц', series: series(metric), unit: metric === 'volume' ? 'л' : '₽', height: 260
  });
  drawMonths('volume');

  const drawShare = metric => {
    const s = series(metric);
    SNC.charts.donut($('#ch-share'), {
      title: `Доли видов топлива за год, ${metric === 'volume' ? '% от объёмов' : '% от стоимости'}`,
      items: s.map(x => ({ label: x.name, value: x.values.reduce((a, b) => a + b, 0), color: x.color })),
      centerLabel: metric === 'volume' ? 'литров' : 'рублей', unit: metric === 'volume' ? 'л' : '₽', size: 220
    });
    $('[data-share-l]').textContent = `${metric === 'volume' ? '% от объёмов' : '% от стоимости'} · год`;
  };
  drawShare('volume');

  const seg = $('[data-metric]');
  seg.addEventListener('click', e => {
    const b = e.target.closest('.seg__btn');
    if (!b || b.getAttribute('aria-pressed') === 'true') return;
    $$('.seg__btn', seg).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    drawMonths(b.dataset.v); drawShare(b.dataset.v);
  });

  /* ---------- Итоги таблицей ---------- */
  const sum = k => D.months.reduce((a, m) => a + m[k], 0);
  $('#tbl-months tbody').innerHTML = D.months.slice().reverse().map((m, i) => `<tr>
      <td>${m.name} 2026${i === 0 ? ' <span class="st st--info">текущий</span>' : ''}</td>
      <td class="num-cell">${money(m.paid)}</td><td class="num-cell">${money(m.spent)}</td>
      <td class="num-cell">${money(m.discount)}</td><td class="num-cell">${nf.format(m.volume)}</td></tr>`).join('');
  $('#tbl-months tfoot').innerHTML = `<tr><th scope="row">Всего</th><td class="num-cell">${money(sum('paid'))}</td><td class="num-cell">${money(sum('spent'))}</td><td class="num-cell">${money(sum('discount'))}</td><td class="num-cell">${nf.format(sum('volume'))}</td></tr>`;
})();
