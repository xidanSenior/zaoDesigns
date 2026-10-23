/* =========================================================
   СНК · Личный кабинет — Операционный монитор продавца (sellerDashboard).
   Плитки дня, транзакции по часам, журнал фоновых операций,
   контрагенты с проблемным счётом, реализация год к году.
   Часы и «живые» транзакции — имитация (TODO: stores/sellerDashboard + NATS).
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const D = window.SNC_DEMO, SNC = window.SNC, P = SNC.pa;
  const { esc, nf, money } = P;
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NOW_H = 14;

  /* ---------- Плитки ---------- */
  const hours = D.sellerHours.map((v, h) => h <= NOW_H ? v : 0);
  const tx = hours.reduce((a, b) => a + b, 0);
  const litres = Math.round(tx * 38.4);
  const problem = D.purchasers.filter(p => p.st !== 'ok');
  const queue = D.operations.filter(o => o.st === 'info' || o.st === 'off').length;
  const tiles = [
    { href: 'purchasers.html', label: 'Контрагенты', value: D.purchasers.length, foot: `${nf.format(D.purchasers.reduce((a, p) => a + p.cards, 0))} карт` },
    { href: 'cards.html', label: 'Транзакций сегодня', value: `<span data-tx>${nf.format(tx)}</span>`, foot: `<span data-l>${nf.format(litres)}</span> л`, spark: true },
    { href: 'purchasers.html', label: 'Выручка сегодня', value: `${nf.format(Math.round(litres * 60.1 / 1000))}<small>тыс ₽</small>`, foot: 'по всем контрагентам' },
    { href: 'purchasers.html', label: '<span class="st st--warn">Проблемный счёт</span>', value: problem.length, foot: `${problem.filter(p => p.st === 'err').length} превысили кредит` },
    { href: 'operations.html', label: '<span class="st st--info">Операции в работе</span>', value: queue, foot: 'выполняются в очереди' }
  ];
  $('#sd-kpis').innerHTML = tiles.map(t => `<a class="kpi" href="${t.href}"><span class="kpi__label">${t.label}</span><span class="kpi__value">${t.value}</span><span class="kpi__foot">${t.foot}${t.spark ? '<svg class="spark" aria-hidden="true" data-spark></svg>' : ''}</span></a>`).join('');
  SNC.charts.spark($('[data-spark]'), hours.slice(NOW_H - 10, NOW_H + 1));

  /* ---------- По часам: прошедшие часы — цветом, текущий — акцентом ---------- */
  const drawHours = () => SNC.charts.bar($('#sd-hours'), {
    title: 'Транзакции по часам за сегодня', labels: hours.map((_, h) => String(h).padStart(2, '0')), labelTitle: 'Час',
    values: hours, unit: 'шт', height: 220, labelMax: false
  });
  drawHours();

  /* ---------- Журнал операций ---------- */
  const opsEl = $('#sd-ops');
  const opItem = o => `<li class="feed__item"><span class="st st--plain st--${o.st}" aria-hidden="true"></span><div><p><b>${esc(o.kind)}</b> · ${esc(o.purchaser)} · ${nf.format(o.count)} шт.</p>${o.st === 'info' ? `<div class="meter" style="margin:6px 0 2px;--p:${o.progress / 100}" role="progressbar" aria-label="Выполнено" aria-valuenow="${o.progress}" aria-valuemin="0" aria-valuemax="100"><i style="background:var(--st-info)"></i></div>` : ''}<time class="mono">${esc(o.date)} · ${esc(o.state.toLowerCase())}${o.st === 'info' ? ` ${o.progress}%` : ''}</time></div></li>`;
  const ops = D.operations.slice(0, 6).map(o => ({ ...o }));
  const paintOps = () => { opsEl.innerHTML = ops.map(opItem).join(''); };
  paintOps();

  /* ---------- Контрагенты с проблемным счётом ---------- */
  const why = p => p.st === 'err' ? `Баланс ${money(p.balance)} ₽ при кредите ${money(p.credit)} ₽ — карты остановлены до пополнения.` : p.balance < 0 ? `Расходуется кредит: баланс ${money(p.balance)} ₽ из ${money(-p.credit)} ₽ допустимых.` : `Остаток ${money(p.balance)} ₽ — при текущем расходе хватит на несколько дней.`;
  $('#sd-attn').innerHTML = problem.sort((a, b) => (a.st === 'err' ? 0 : 1) - (b.st === 'err' ? 0 : 1)).slice(0, 5).map(p => `<li class="attn__item">
      <span class="st st--${p.st}">${esc(p.state)}</span>
      <a class="attn__name" href="purchasers.html">${esc(p.name)} <span class="mono muted">${esc(p.contract)}</span></a>
      <span class="attn__why">${esc(why(p))}</span>
      <span class="mono muted attn__seen">${nf.format(p.cards)} карт</span>
    </li>`).join('') || '<li class="attn__more muted">Проблемных счетов нет.</li>';

  /* ---------- Год к году ---------- */
  const y26 = D.months.map(m => +(m.volume * 6.2 / 1000).toFixed(1));
  const y25 = D.MONTHS_SHORT.map((_, i) => +((y26[Math.min(i, y26.length - 2)] || 40) * (0.82 + ((i * 37) % 17) / 100)).toFixed(1));
  SNC.charts.line($('#sd-year'), {
    title: 'Реализация по месяцам, тысяч литров: 2026 и 2025', labels: D.MONTHS_SHORT, labelTitle: 'Месяц', unit: 'тыс л', height: 240,
    series: [{ name: '2026', values: D.MONTHS_SHORT.map((_, i) => y26[i] ?? null).map(v => v ?? y26[y26.length - 1]) }, { name: '2025', values: y25 }]
  });

  /* ---------- Часы и живые транзакции ---------- */
  const clock = $('[data-clock]');
  // демо-время кабинета начинается с 14:05:00 и идёт вперёд
  const t0 = Date.now(), base = new Date(2026, 9, 22, 14, 5, 0).getTime();
  setInterval(() => { clock.textContent = new Date(base + Date.now() - t0).toLocaleTimeString('ru-RU'); }, 1000);
  let t = tx, l = litres;
  const bump = el => { if (!REDUCED) el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-3px)' }, { transform: 'translateY(0)' }], { duration: 420, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }); };
  setInterval(() => {
    if (document.hidden) return;
    const n = 1 + Math.floor(Math.random() * 3);
    t += n; l += Math.round(n * (25 + Math.random() * 30));
    hours[NOW_H] += n;
    const a = $('[data-tx]'); a.textContent = nf.format(t); bump(a.closest('.kpi__value'));
    $('[data-l]').textContent = nf.format(l);
    // прогресс операции в работе
    const run = ops.find(o => o.st === 'info');
    if (run) {
      run.progress = Math.min(100, run.progress + 6);
      if (run.progress >= 100) { run.st = 'ok'; run.state = 'Выполнена'; SNC.toast({ type: 'ok', title: `${run.kind} № ${run.id} выполнена`, text: `${run.purchaser}: ${run.count} шт.` }); }
      paintOps();
    }
  }, 9000);
})();
