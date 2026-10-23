/* =========================================================
   СНК · Личный кабинет — Отчёт по типам топлива (fuelReportMenu).
   Месяц, показатель (литры / рубли), столбцы по подразделениям,
   кольцо долей, таблица итогов. TODO: stores/fuel — отчёт с сервера.
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const D = window.SNC_DEMO, SNC = window.SNC, P = SNC.pa;
  const { esc, nf, money } = P;
  const sel = $('#fr-month');
  sel.innerHTML = D.months.slice().reverse().map(m => `<option value="${m.n}">${m.name} 2026</option>`).join('');
  let metric = 'volume';
  // доли подразделений — фиксированные, как в демо-картах
  const SPLIT = { 'Головное': 0.46, 'Автоколонна № 1': 0.27, 'Автоколонна № 2': 0.19, 'Филиал «Северный»': 0.08 };

  const draw = () => {
    const m = D.months.find(x => x.n === Number(sel.value));
    $('[data-month-v]').textContent = `${m.name} 2026`;
    const val = f => metric === 'volume' ? m.vol[f.id] : Math.round(m.vol[f.id] * f.price * 0.97);
    const unit = metric === 'volume' ? 'л' : '₽';
    SNC.charts.bar($('#fr-div'), {
      title: `Расход по подразделениям за ${m.name.toLowerCase()}, ${unit}`, labels: D.DIVISIONS, labelTitle: 'Подразделение', unit, height: 260,
      series: D.FUELS.map(f => ({ name: f.name, color: `var(--series-${f.series})`, values: D.DIVISIONS.map(d => Math.round(val(f) * SPLIT[d])) }))
    });
    SNC.charts.donut($('#fr-share'), {
      title: `Доли видов топлива за ${m.name.toLowerCase()}`, unit, size: 210, centerLabel: metric === 'volume' ? 'литров' : 'рублей',
      items: D.FUELS.map(f => ({ label: f.name, value: val(f), color: `var(--series-${f.series})` }))
    });
    const rows = D.FUELS.map(f => ({ f, v: m.vol[f.id], c: Math.round(m.vol[f.id] * f.price * 0.97 * 100) / 100 }));
    const V = rows.reduce((a, r) => a + r.v, 0), C = rows.reduce((a, r) => a + r.c, 0);
    const pct = (a, b) => `${(a / Math.max(1, b) * 100).toFixed(1).replace('.', ',')} %`;
    $('#fr-tbl tbody').innerHTML = rows.map(r => `<tr><td><span class="wallet__name fuel-${r.f.series}"><i aria-hidden="true"></i>${esc(r.f.name)}</span></td><td class="num-cell">${nf.format(r.v)}</td><td class="num-cell">${pct(r.v, V)}</td><td class="num-cell">${money(r.c)}</td><td class="num-cell">${pct(r.c, C)}</td><td class="num-cell">${r.v ? money(r.c / r.v) : '—'}</td></tr>`).join('');
    $('#fr-tbl tfoot').innerHTML = `<tr><th scope="row">Всего</th><td class="num-cell">${nf.format(V)}</td><td class="num-cell">100 %</td><td class="num-cell">${money(C)}</td><td class="num-cell">100 %</td><td class="num-cell">${money(C / Math.max(1, V))}</td></tr>`;
  };
  sel.addEventListener('change', draw);
  $('[data-metric]').addEventListener('click', e => {
    const b = e.target.closest('.seg__btn');
    if (!b || b.getAttribute('aria-pressed') === 'true') return;
    $$('[data-metric] .seg__btn').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    metric = b.dataset.v; draw();
  });
  draw();
})();
