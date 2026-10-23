/* =========================================================
   СНК · Личный кабинет — общие куски экранов ЛК.
   Лицевая сторона карты, кошелёк с лимитом, мини-шкала остатка,
   форматирование чисел. Подключается после js/app.js.
   ========================================================= */
(() => {
  'use strict';

  const SNC = window.SNC = window.SNC || {};
  const D = window.SNC_DEMO;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nf = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
  const money = n => new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);
  const LOGO = '<svg class="fcard__logo" viewBox="0 0 120 48" aria-hidden="true"><path d="M38 11H22.5A12.5 12.5 0 0 0 10 23.5v1A12.5 12.5 0 0 0 22.5 37H38 M48 11v26 M72 11v26 M48 24h24 M84 11v26 M106 11L86.5 24 106 37" fill="none" stroke="#D32F2F" stroke-width="6" stroke-linecap="square"/></svg>';
  const fuel = id => D.FUEL[id] || { name: id, series: 1 };

  /* Остаток кошелька: доля и признак «мало» (< 10 %) */
  const rest = w => {
    const left = Math.max(0, w.limit - w.spent);
    const p = w.limit ? left / w.limit : 0;
    return { left: Math.round(left * 100) / 100, p, low: p < 0.1 };
  };

  /* Лицевая сторона карты */
  const face = (c, { small = false, kind = 'Топливная' } = {}) => `<div class="fcard${small ? ' fcard--sm' : ''}${['block', 'returned'].includes(c.state) ? ' is-blocked' : ''}" role="img" aria-label="Карта ${esc(c.number)}, держатель ${esc(c.owner)}">
    <div class="fcard__top">${LOGO}<span class="fcard__kind">${esc(kind)}</span></div>
    <span class="fcard__chip" aria-hidden="true"></span>
    <span class="fcard__num">${esc(c.number)}</span>
    <div class="fcard__foot"><div><small>Держатель</small><b>${esc(c.owner)}</b></div><div style="text-align:right"><small>Действует до</small><b class="mono" style="font-weight:500">${esc(c.expires)}</b></div></div>
  </div>`;

  /* Кошелёк с лимитом: название, «осталось из», шкала израсходованного */
  const wallet = w => {
    const f = fuel(w.fuel), r = rest(w);
    return `<div class="wallet fuel-${f.series}">
      <span class="wallet__name"><i aria-hidden="true"></i>${esc(f.name)} <small>лимит на ${esc(w.period)}</small></span>
      <span class="wallet__nums"><b>${nf.format(r.left)}</b> из ${nf.format(w.limit)} ${esc(w.unit)}</span>
      <div class="meter${r.low ? ' meter--warn' : ''}" role="progressbar" aria-label="Остаток ${esc(f.name)}, литров" aria-valuemin="0" aria-valuemax="${w.limit}" aria-valuenow="${r.left}" style="--p:${r.p.toFixed(3)}"><i></i></div>
      <span class="wallet__foot"><span>Израсходовано ${nf.format(w.spent)} ${esc(w.unit)}</span>${r.low ? '<span class="st st--warn">Осталось меньше 10%</span>' : `<span>${Math.round(r.p * 100)}% осталось</span>`}</span>
    </div>`;
  };

  /* Мини-шкала в таблице: остаток / лимит */
  const lim = w => {
    const f = fuel(w.fuel), r = rest(w);
    return `<div class="lim fuel-${f.series}"><span class="lim__nums">${nf.format(r.left)} <small>/ ${nf.format(w.limit)} л · ${esc(f.name)}</small></span><div class="meter${r.low ? ' meter--warn' : ''}" aria-hidden="true" style="--p:${(r.p).toFixed(3)}"><i></i></div></div>`;
  };

  /* Склонение: 1 карта, 2 карты, 5 карт */
  const plural = (n, one, few, many) => n % 10 === 1 && n % 100 !== 11 ? one : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? few : many;

  SNC.pa = { esc, nf, money, fuel, rest, face, wallet, lim, plural };
})();
