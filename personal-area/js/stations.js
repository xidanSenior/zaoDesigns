/* =========================================================
   СНК · Личный кабинет — Точки обслуживания (gasStations).
   Карта-схема Томской области на SVG (без тайлов и библиотек),
   два масштаба — область и Томск; список с поиском и фильтрами,
   карточка точки с ценами и услугами. Выбор синхронизирован.
   TODO: в боевой версии — Яндекс Карты (composables/useYandexMaps.ts)
   и stores/gasStations; цены — из API.
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const D = window.SNC_DEMO, SNC = window.SNC, P = SNC.pa;
  const { esc, money } = P;
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ST = D.stations;

  /* ---------- Проекция: равнопромежуточная, сжатие по долготе cos(φ) ---------- */
  const W = 1000, H = 760;
  const LAT0 = 61.2, LAT1 = 55.9, LON0 = 76.6, LON1 = 87.4;
  const k = Math.cos(58.5 * Math.PI / 180);
  const sx = (W - 80) / ((LON1 - LON0) * k), sy = (H - 80) / (LAT0 - LAT1);
  const s = Math.min(sx, sy);
  const X = lon => 40 + (lon - LON0) * k * s;
  const Y = lat => 40 + (LAT0 - lat) * s;
  const VIEW = { region: [0, 0, W, H], city: (() => { const cx = X(84.93), cy = Y(56.54); return [cx - 44, cy - 34, 88, 68]; })() };

  const CITIES = [['Томск', 56.48, 84.95], ['Северск', 56.60, 84.88], ['Асино', 56.99, 86.15], ['Колпашево', 58.31, 82.90], ['Стрежевой', 60.73, 77.60], ['Каргасок', 59.06, 80.86], ['Кожевниково', 56.26, 83.97], ['Бакчар', 57.02, 82.07], ['Зырянское', 56.83, 86.62], ['Мельниково', 56.56, 84.08]];
  const C = Object.fromEntries(CITIES.map(([n, la, lo]) => [n, [X(lo), Y(la)]]));
  const road = (...names) => `M${names.map(n => C[n].map(v => v.toFixed(1)).join(',')).join('L')}`;

  const svgMap = () => {
    const ticks = [];
    for (let lon = 77; lon <= 87; lon++) ticks.push(`<path class="map__grid" d="M${X(lon).toFixed(1)},32V${H - 32}" opacity=".5"/><text class="map__tick" x="${(X(lon) + 3).toFixed(1)}" y="${H - 36}">${lon}°E</text>`);
    for (let lat = 56; lat <= 61; lat++) ticks.push(`<path class="map__grid" d="M32,${Y(lat).toFixed(1)}H${W - 32}" opacity=".5"/><text class="map__tick" x="36" y="${(Y(lat) - 4).toFixed(1)}">${lat}°N</text>`);
    // Обь — пунктиром с юго-востока на северо-запад, Томь — к Томску
    const ob = `M${X(84.2).toFixed(1)},${Y(55.95).toFixed(1)} Q${X(83.2).toFixed(1)},${Y(57.4).toFixed(1)} ${C['Колпашево'].join(',')} T${C['Каргасок'].join(',')} T${X(77.9).toFixed(1)},${Y(60.85).toFixed(1)}`;
    const tom = `M${X(85.6).toFixed(1)},${Y(55.95).toFixed(1)} Q${X(85.1).toFixed(1)},${Y(56.3).toFixed(1)} ${C['Томск'].join(',')} T${X(84.6).toFixed(1)},${Y(56.9).toFixed(1)}`;
    const roads = [road('Кожевниково', 'Мельниково', 'Томск', 'Асино', 'Зырянское'), road('Томск', 'Северск'), road('Томск', 'Бакчар', 'Колпашево', 'Каргасок', 'Стрежевой')];
    return `<svg viewBox="${VIEW.region.join(' ')}" id="map-svg" role="group" aria-label="Карта-схема точек обслуживания">
      <rect class="map__frame" x="24" y="24" width="${W - 48}" height="${H - 48}"/>
      ${ticks.join('')}
      <path class="map__river" d="${ob}"/><path class="map__river" d="${tom}"/>
      ${roads.map(d => `<path class="map__road" d="${d}"/>`).join('')}
      ${CITIES.map(([n]) => `<text class="map__city" x="${(C[n][0] + 10).toFixed(1)}" y="${(C[n][1] - 10).toFixed(1)}" data-city="${n}">${n}</text>`).join('')}
      <g id="map-pts">${ST.map(st => `<g class="map__pt" data-id="${st.id}" tabindex="0" role="button" aria-label="${esc(st.name)}, ${esc(st.address)}"><circle class="map__pin" cx="${X(st.lon).toFixed(1)}" cy="${Y(st.lat).toFixed(1)}" r="6"/></g>`).join('')}</g>
      <text class="map__tick" x="${W - 36}" y="40" text-anchor="end">ТОМСКАЯ ОБЛАСТЬ · СХЕМА</text>
    </svg>`;
  };
  const mapEl = $('#stn-map');
  mapEl.innerHTML = svgMap();
  const svg = $('#map-svg');

  /* Масштаб: плавная смена viewBox; метки и точки не раздуваются */
  let zoom = 'region', vb = VIEW.region.slice(), anim = 0;
  // Размеры меток, точек и линий — в экранных пикселях при любом масштабе (u = единиц viewBox на 1 px)
  const applyVB = v => {
    svg.setAttribute('viewBox', v.map(n => n.toFixed(2)).join(' '));
    const r = svg.getBoundingClientRect();
    const u = r.width && r.height ? Math.max(v[2] / r.width, v[3] / r.height) : v[2] / W;
    const px = n => (n * u).toFixed(3);
    $$('.map__pin', svg).forEach(c => { c.setAttribute('r', px(7)); c.style.strokeWidth = px(c.closest('.is-active') ? 2 : 1.5); });
    $$('.map__city', svg).forEach(t => { t.style.fontSize = `${px(12)}px`; t.setAttribute('dx', px(4)); });
    $$('.map__tick', svg).forEach(t => { t.style.fontSize = `${px(10.5)}px`; });
    $$('.map__road', svg).forEach(p => { p.style.strokeWidth = px(2.5); });
    $$('.map__grid, .map__frame, .map__river', svg).forEach(p => { p.style.strokeWidth = px(1); });
  };
  window.addEventListener('resize', () => applyVB(vb), { passive: true });
  const setZoom = z => {
    zoom = z;
    $$('#stn-zoom .seg__btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.z === z)));
    const from = vb.slice(), to = VIEW[z];
    cancelAnimationFrame(anim);
    if (REDUCED) { vb = to.slice(); applyVB(vb); return; }
    const t0 = performance.now(), dur = 520;
    const ease = t => 1 - Math.pow(1 - t, 3);
    const step = t => {
      const p = Math.min(1, (t - t0) / dur), e = ease(p);
      vb = from.map((v, i) => v + (to[i] - v) * e);
      applyVB(vb);
      if (p < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  };
  $('#stn-zoom').addEventListener('click', e => { const b = e.target.closest('[data-z]'); if (b && b.dataset.z !== zoom) setZoom(b.dataset.z); });
  applyVB(vb);

  /* ---------- Фильтры ---------- */
  const fuelsOn = new Set();
  $('#stn-fuels').innerHTML = D.FUELS.map(f => `<button class="fchip fuel-${f.series}" type="button" aria-pressed="false" data-fuel="${f.id}"><i aria-hidden="true"></i>${esc(f.name)}</button>`).join('');
  const q = $('#stn-q'), h24 = $('#stn-24');
  const match = st => {
    const text = `${st.name} ${st.code} ${st.address}`.toLowerCase();
    return (!q.value.trim() || text.includes(q.value.trim().toLowerCase())) && (!h24.checked || st.h24) && [...fuelsOn].every(f => st.fuels.includes(f));
  };

  /* ---------- Список ---------- */
  const list = $('#stn-list');
  let active = null;
  const paint = () => {
    const shown = ST.filter(match);
    $('#stn-n').textContent = `${shown.length} из ${ST.length}`;
    list.innerHTML = shown.length ? shown.map(st => `<button class="stn" type="button" data-id="${st.id}" aria-pressed="${active === st.id}">
        <span class="stn__name">${esc(st.name)}<span class="mono">${esc(st.code)}</span></span>
        <span class="stn__h">${st.h24 ? '24 ч' : '7:00–23:00'}</span>
        <span class="stn__addr">${esc(st.address)}</span>
        <span class="stn__fuels">${st.fuels.map(f => `<span class="fuel-${P.fuel(f).series}"><i aria-hidden="true"></i>${esc(P.fuel(f).name)} ${money(st.prices[f])}</span>`).join('')}</span>
      </button>`).join('')
      : `<div class="empty" style="padding:32px 16px"><svg class="empty__art" viewBox="0 0 176 112" aria-hidden="true"><rect class="bp-soft" x="8" y="8" width="160" height="96" rx="4"/><path class="bp" d="M30 84 70 40l30 26 46-38"/><circle class="bp-accent" cx="70" cy="40" r="5"/></svg><div class="empty__title">Точек не найдено</div><p class="empty__text">Под выбранные условия не подходит ни одна точка. Уберите часть фильтров.</p><div class="empty__actions"><button class="btn btn--outline btn--sm" type="button" data-reset>Сбросить фильтры</button></div></div>`;
    $$('.map__pt', svg).forEach(g => { const st = ST.find(x => x.id === Number(g.dataset.id)); g.classList.toggle('is-dim', !match(st)); g.classList.toggle('is-active', active === st.id); });
    const on = $('.map__pt.is-active', svg);
    if (on && on !== on.parentNode.lastElementChild) { const had = document.activeElement === on; on.parentNode.append(on); if (had) on.focus({ preventScroll: true }); } // выбранная — поверх соседних
    applyVB(vb);
  };
  q.addEventListener('input', paint);
  h24.addEventListener('change', paint);
  $('#stn-fuels').addEventListener('click', e => {
    const b = e.target.closest('[data-fuel]');
    if (!b) return;
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    on ? fuelsOn.add(b.dataset.fuel) : fuelsOn.delete(b.dataset.fuel);
    paint();
  });
  list.addEventListener('click', e => {
    if (e.target.closest('[data-reset]')) { q.value = ''; h24.checked = false; fuelsOn.clear(); $$('#stn-fuels [data-fuel]').forEach(b => b.setAttribute('aria-pressed', 'false')); paint(); return; }
    const b = e.target.closest('.stn');
    if (b) select(Number(b.dataset.id), 'list');
  });

  /* ---------- Выбор точки: подсветка, карточка, приближение ---------- */
  const pop = $('#stn-pop');
  const select = (id, from) => {
    active = id;
    const st = ST.find(x => x.id === id);
    if (['Томск', 'Северск'].includes(st.city) && zoom !== 'city') setZoom('city');
    if (!['Томск', 'Северск'].includes(st.city) && zoom !== 'region') setZoom('region');
    pop.innerHTML = `<div class="stn-pop__head"><div><b style="font-size:16px;font-weight:800">${esc(st.name)}</b> <span class="mono muted" style="font-size:12px">${esc(st.code)}</span><p class="muted" style="font-size:13px">${esc(st.address)} · ${st.h24 ? 'круглосуточно' : '7:00–23:00'}</p></div>
        <button class="icon-btn icon-btn--sm" type="button" data-pop-close aria-label="Закрыть карточку точки"><svg class="ico" aria-hidden="true"><use href="#i-x"/></svg></button></div>
      <div class="stn-pop__prices">${st.fuels.map(f => `<div class="fuel-${P.fuel(f).series}"><small><i aria-hidden="true"></i>${esc(P.fuel(f).name)}</small><b>${money(st.prices[f])}</b></div>`).join('')}</div>
      ${st.services.length ? `<div class="stn-pop__svc">${st.services.map(x => `<span class="tag">${esc(x)}</span>`).join('')}</div>` : ''}
      <div style="display:flex;gap:8px"><button class="btn btn--outline btn--xs" type="button" data-demo-toast="info|Маршрут|Откроется в Яндекс Картах — в боевой версии."><svg class="ico" aria-hidden="true"><use href="#i-pin"/></svg><span>Маршрут</span></button></div>`;
    pop.hidden = false;
    paint();
    if (from === 'map') list.querySelector(`[data-id="${id}"]`)?.scrollIntoView({ block: 'nearest', behavior: REDUCED ? 'auto' : 'smooth' });
    if (!REDUCED) pop.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
  };
  pop.addEventListener('click', e => { if (e.target.closest('[data-pop-close]')) { pop.hidden = true; active = null; paint(); } });
  svg.addEventListener('click', e => { const g = e.target.closest('.map__pt'); if (g) select(Number(g.dataset.id), 'map'); });
  svg.addEventListener('keydown', e => { const g = e.target.closest('.map__pt'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(Number(g.dataset.id), 'map'); } });
  // подсказка у точки на карте
  $$('.map__pt', svg).forEach(g => { const st = ST.find(x => x.id === Number(g.dataset.id)); g.dataset.tip = `${st.name} · ${st.address}`; });

  $('[data-count]').textContent = ST.length;
  paint();
})();
