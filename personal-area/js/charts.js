/* =========================================================
   СНК · Личный кабинет — графики (SVG, без зависимостей).
   Правила (скилл dataviz): тонкие метки, столбец ≤ 24 px со скруглённым концом
   и прямым основанием, линия 2 px, точки ≥ 8 px с кольцом цвета фона,
   зазор 2 px между сегментами, одна ось Y, тихая сетка, текст — цветом текста,
   легенда при ≥ 2 сериях, подсказка при наведении, таблица-дубль для скринридера.
   Цвета серий — --series-1…4 из styles.css (проверены валидатором).
   SNC.charts.bar(el, cfg) · .donut(el, cfg) · .line(el, cfg)
   ========================================================= */
(() => {
  'use strict';

  const SNC = window.SNC = window.SNC || {};
  const fmt = new Intl.NumberFormat('ru-RU');
  const NS = 'http://www.w3.org/2000/svg';
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const color = i => `var(--series-${(i % 4) + 1})`;

  /* Круглые деления оси: 0 / 50 / 100 … */
  function niceMax(v, ticks = 4) {
    if (v <= 0) return { max: ticks, step: 1 };
    const raw = v / ticks;
    const pow = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map(m => m * pow).find(s => s >= raw);
    return { max: Math.ceil(v / step) * step, step }; // ось заканчивается у ближайшего деления над данными
  }
  const compact = n => Math.abs(n) >= 1e6 ? `${fmt.format(+(n / 1e6).toFixed(1))} млн` : Math.abs(n) >= 1e4 ? `${fmt.format(+(n / 1e3).toFixed(1))} тыс` : fmt.format(n);
  // деления одной оси — в одном формате: если верх ≥ 10 000, все в тысячах
  const tickFmt = max => max >= 1e6 ? v => `${fmt.format(+(v / 1e6).toFixed(1))} млн` : max >= 1e4 ? v => (v ? `${fmt.format(+(v / 1e3).toFixed(1))} тыс` : '0') : v => fmt.format(v);

  /* Столбец со скруглённым концом 4 px и прямым основанием */
  const barPath = (x, y, w, h, r = 4) => {
    if (h <= 0) return '';
    r = Math.min(r, w / 2, h);
    return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
  };

  /* Общие части: подсказка, легенда, таблица-дубль, перерисовка по ширине */
  function frame(el, cfg, draw) {
    el.classList.add('chart');
    el.innerHTML = '';
    const svgWrap = document.createElement('div');
    svgWrap.setAttribute('role', 'img');
    svgWrap.setAttribute('aria-label', cfg.title || 'График');
    const tip = document.createElement('div');
    tip.className = 'chart-tip'; tip.setAttribute('aria-hidden', 'true');
    el.append(svgWrap, tip);
    if (cfg.legend !== false && cfg.series && cfg.series.length > 1) {
      const lg = document.createElement('div');
      lg.className = 'legend-row'; lg.style.marginTop = '12px';
      lg.innerHTML = cfg.series.map((s, i) => `<span><i class="${cfg.kind === 'line' ? 'is-line' : ''}" style="background:${s.color || color(i)}"></i>${esc(s.name)}</span>`).join('');
      el.append(lg);
    }
    if (cfg.table !== false) {
      const d = document.createElement('details');
      d.className = 'chart-table';
      const cols = cfg.series ? cfg.series.map(s => s.name) : ['Значение'];
      const rows = cfg.labels.map((l, i) => `<tr><td>${esc(l)}</td>${(cfg.series || [{ values: cfg.values }]).map(s => `<td class="num-cell">${fmt.format(s.values[i])}</td>`).join('')}</tr>`).join('');
      d.innerHTML = `<summary>Показать таблицей</summary><div class="dt__scroll"><table class="table"><thead><tr><th>${esc(cfg.labelTitle || '')}</th>${cols.map(c => `<th class="num-cell">${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
      el.append(d);
    }
    const showTip = (x, y, title, rows) => {
      tip.innerHTML = `<div class="chart-tip__title">${esc(title)}</div>${rows.map(r => `<div class="chart-tip__row"><i style="background:${r.color}"></i><span>${esc(r.name)}</span><b>${fmt.format(r.value)}${r.unit ? ` ${esc(r.unit)}` : ''}</b></div>`).join('')}`;
      const w = el.clientWidth, tw = tip.offsetWidth || 160;
      tip.style.left = `${Math.max(0, Math.min(w - tw, x - tw / 2))}px`;
      tip.style.top = `${Math.max(0, y - tip.offsetHeight - 12)}px`;
      tip.classList.add('is-visible');
    };
    const hideTip = () => tip.classList.remove('is-visible');
    const render = () => {
      const w = Math.max(240, svgWrap.clientWidth || el.clientWidth);
      svgWrap.innerHTML = '';
      const svg = document.createElementNS(NS, 'svg');
      svgWrap.append(svg);
      draw({ svg, w, showTip, hideTip, el });
    };
    render();
    let last = el.clientWidth;
    // при перерисовке с новыми данными старый наблюдатель отключается — иначе ресайз вернёт старый график
    el._snc_ro?.disconnect();
    el._snc_ro = new ResizeObserver(() => { if (Math.abs(el.clientWidth - last) > 4) { last = el.clientWidth; render(); } });
    el._snc_ro.observe(el);
  }
  const node = (parent, tag, attrs = {}) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); parent.append(n); return n; };

  /* Сетка и ось Y */
  function axes(svg, { w, h, padL, padB, padT, max, step }) {
    const g = node(svg, 'g', { class: 'chart__grid' });
    const f = tickFmt(max);
    for (let v = 0; v <= max + 1e-9; v += step) {
      const y = padT + (h - padT - padB) * (1 - v / max);
      if (v > 0) node(g, 'line', { x1: padL, x2: w, y1: y, y2: y });
      const t = node(svg, 'text', { x: padL - 8, y: y + 4, 'text-anchor': 'end', class: 'chart__tick' });
      t.textContent = f(v);
    }
    node(svg, 'line', { x1: padL, x2: w, y1: h - padB, y2: h - padB, class: 'chart__base' });
  }

  /* ---------- Столбцы (одна серия или стопка) ---------- */
  function bar(el, cfg) {
    cfg.kind = 'bar';
    const series = cfg.series || [{ name: cfg.name || '', values: cfg.values }];
    cfg.series = cfg.series || null;
    frame(el, { ...cfg, series: cfg.series }, ({ svg, w, showTip, hideTip }) => {
      const h = cfg.height || 240, padL = 44, padB = 26, padT = 12;
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      const totals = cfg.labels.map((_, i) => series.reduce((s, x) => s + x.values[i], 0));
      const { max, step } = niceMax(Math.max(...totals));
      axes(svg, { w, h, padL, padB, padT, max, step });
      const n = cfg.labels.length;
      const band = (w - padL - 8) / n;
      const bw = Math.min(24, band * 0.62);
      const yOf = v => padT + (h - padT - padB) * (1 - v / max);
      const every = Math.ceil(n / Math.floor((w - padL) / 36));
      const bars = [];
      cfg.labels.forEach((lab, i) => {
        const x = padL + 4 + band * i + (band - bw) / 2;
        let acc = 0;
        const g = node(svg, 'g', { class: 'chart__bar' });
        series.forEach((s, si) => {
          const v = s.values[i];
          if (!v) return;
          const y0 = yOf(acc), y1 = yOf(acc + v);
          const top = si === series.length - 1 || series.slice(si + 1).every(x => !x.values[i]);
          const hh = Math.max(0, y0 - y1 - (si > 0 ? 2 : 0)); // зазор 2 px между сегментами
          node(g, 'path', { d: top ? barPath(x, y1, bw, hh) : `M${x},${y1}h${bw}v${hh}h${-bw}Z`, fill: s.color || color(si) });
          acc += v;
        });
        if (i % every === 0) { const t = node(svg, 'text', { x: x + bw / 2, y: h - 8, 'text-anchor': 'middle', class: 'chart__tick' }); t.textContent = lab; }
        const hit = node(svg, 'rect', { x: padL + band * i, y: padT, width: band, height: h - padT - padB, class: 'chart__hit' });
        bars.push(g);
        hit.addEventListener('pointerenter', () => {
          el.classList.add('is-hovering'); bars.forEach(b => b.classList.toggle('is-hot', b === g));
          const box = svg.getBoundingClientRect(), k = box.width / w;
          showTip((x + bw / 2) * k, yOf(totals[i]) * k, `${cfg.labelTitle ? `${cfg.labelTitle} ` : ''}${lab}`,
            series.map((s, si) => ({ name: s.name || 'Значение', value: s.values[i], color: s.color || color(si), unit: cfg.unit })));
        });
        hit.addEventListener('pointerleave', () => { el.classList.remove('is-hovering'); g.classList.remove('is-hot'); hideTip(); });
      });
      // подпись только у максимума — не число на каждом столбце
      if (cfg.labelMax !== false) {
        const mi = totals.indexOf(Math.max(...totals));
        const x = padL + 4 + band * mi + band / 2;
        const t = node(svg, 'text', { x, y: yOf(totals[mi]) - 6, 'text-anchor': 'middle', class: 'chart__label' });
        t.textContent = fmt.format(totals[mi]);
      }
      if (!REDUCED && cfg.animate !== false) bars.forEach((b, i) => b.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 520, delay: i * 18, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' }));
      bars.forEach(b => { b.style.transformOrigin = `0 ${h - padB}px`; });
    });
  }

  /* ---------- Кольцо: доли одного целого ---------- */
  function donut(el, cfg) {
    cfg.kind = 'donut';
    const items = cfg.items;
    frame(el, { ...cfg, labels: items.map(i => i.label), values: items.map(i => i.value), series: null, legend: false }, ({ svg, showTip, hideTip }) => {
      const S = 200, R = 88, r = 62, cx = S / 2, cy = S / 2;
      svg.setAttribute('viewBox', `0 0 ${S} ${S}`);
      svg.style.maxWidth = `${cfg.size || 200}px`;
      svg.style.margin = '0 auto';
      const total = items.reduce((s, x) => s + x.value, 0) || 1;
      const gap = 2 / R; // зазор 2 px между сегментами
      let a = -Math.PI / 2;
      const arcs = [];
      items.forEach((it, i) => {
        const span = (it.value / total) * Math.PI * 2;
        if (!it.value) return;
        const a0 = a + (items.length > 1 ? gap / 2 : 0), a1 = a + span - (items.length > 1 ? gap / 2 : 0);
        const large = a1 - a0 > Math.PI ? 1 : 0;
        const p = (rad, ang) => `${cx + rad * Math.cos(ang)},${cy + rad * Math.sin(ang)}`;
        const d = `M${p(R, a0)}A${R},${R} 0 ${large} 1 ${p(R, a1)}L${p(r, a1)}A${r},${r} 0 ${large} 0 ${p(r, a0)}Z`;
        const path = node(svg, 'path', { d, fill: it.color || color(i), class: 'chart__arc' });
        arcs.push(path);
        const mid = (a0 + a1) / 2;
        path.addEventListener('pointerenter', () => {
          el.classList.add('is-hovering'); arcs.forEach(x => x.classList.toggle('is-hot', x === path));
          const box = svg.getBoundingClientRect(), k = box.width / S, off = svg.getBoundingClientRect().left - el.getBoundingClientRect().left;
          showTip(off + (cx + R * Math.cos(mid)) * k, (cy + R * Math.sin(mid)) * k, it.label, [{ name: `${Math.round(it.value / total * 100)}%`, value: it.value, color: it.color || color(i), unit: cfg.unit }]);
        });
        path.addEventListener('pointerleave', () => { el.classList.remove('is-hovering'); path.classList.remove('is-hot'); hideTip(); });
        a += span;
      });
      const t1 = node(svg, 'text', { x: cx, y: cy + 4, 'text-anchor': 'middle', class: 'chart__center' });
      t1.textContent = compact(cfg.centerValue ?? total);
      const t2 = node(svg, 'text', { x: cx, y: cy + 24, 'text-anchor': 'middle', class: 'chart__center-sub' });
      t2.textContent = cfg.centerLabel || 'всего';
      if (!REDUCED && cfg.animate !== false) arcs.forEach((p, i) => p.animate([{ opacity: 0, transform: 'rotate(-8deg)' }, { opacity: 1, transform: 'none' }], { duration: 480, delay: i * 60, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' }));
      arcs.forEach(p => { p.style.transformOrigin = `${cx}px ${cy}px`; });
    });
    // Легенда кольца — с долями, текст цветом текста
    const lg = document.createElement('div');
    lg.className = 'legend-row'; lg.style.cssText = 'margin-top:14px;display:grid;gap:8px';
    const total = items.reduce((s, x) => s + x.value, 0) || 1;
    // для статусов — условный знак (.st), чтобы смысл не держался на одном цвете
    const key = (it, i) => it.status ? `<span class="st st--plain st--${it.status}" aria-hidden="true"></span>` : `<i style="background:${it.color || color(i)}"></i>`;
    lg.innerHTML = items.map((it, i) => `<span style="display:grid;grid-template-columns:10px 1fr auto auto;gap:8px;align-items:center">${key(it, i)}${esc(it.label)}<b class="mono" style="font-weight:500;color:var(--text)">${fmt.format(it.value)}</b><span class="mono" style="width:40px;text-align:right">${Math.round(it.value / total * 100)}%</span></span>`).join('');
    const tbl = el.querySelector('.chart-table');
    if (tbl) tbl.before(lg); else el.append(lg);
  }

  /* ---------- Линия: изменение во времени ---------- */
  function line(el, cfg) {
    cfg.kind = 'line';
    frame(el, cfg, ({ svg, w, showTip, hideTip }) => {
      const h = cfg.height || 260, padL = 52, padB = 26, padT = 16, padR = 8;
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      const all = cfg.series.flatMap(s => s.values);
      const { max, step } = niceMax(Math.max(...all));
      axes(svg, { w: w - padR, h, padL, padB, padT, max, step });
      const n = cfg.labels.length;
      const xOf = i => padL + 8 + (w - padL - padR - 16) * (n === 1 ? 0.5 : i / (n - 1));
      const yOf = v => padT + (h - padT - padB) * (1 - v / max);
      const every = Math.ceil(n / Math.floor((w - padL) / 64));
      // последняя подпись — только если не налезает на предыдущую
      cfg.labels.forEach((l, i) => { if (i % every === 0 || (i === n - 1 && i % every >= every / 2)) { const t = node(svg, 'text', { x: xOf(i), y: h - 8, 'text-anchor': 'middle', class: 'chart__tick' }); t.textContent = l; } });
      const lines = [];
      cfg.series.forEach((s, si) => {
        const c = s.color || color(si);
        const d = s.values.map((v, i) => `${i ? 'L' : 'M'}${xOf(i)},${yOf(v)}`).join('');
        if (cfg.series.length === 1) node(svg, 'path', { d: `${d}L${xOf(n - 1)},${h - padB}L${xOf(0)},${h - padB}Z`, fill: c, class: 'chart__area' });
        const p = node(svg, 'path', { d, stroke: c, class: 'chart__line' });
        lines.push(p);
        node(svg, 'circle', { cx: xOf(n - 1), cy: yOf(s.values[n - 1]), r: 4, fill: c, class: 'chart__dot' }); // конечная точка
      });
      const cross = node(svg, 'line', { y1: padT, y2: h - padB, class: 'chart__cross', opacity: 0 });
      const dots = cfg.series.map((s, si) => node(svg, 'circle', { r: 4.5, fill: s.color || color(si), class: 'chart__dot', opacity: 0 }));
      const hit = node(svg, 'rect', { x: padL, y: padT, width: w - padL, height: h - padT - padB, class: 'chart__hit' });
      hit.addEventListener('pointermove', e => {
        const box = svg.getBoundingClientRect(), k = box.width / w;
        const x = (e.clientX - box.left) / k;
        const i = Math.max(0, Math.min(n - 1, Math.round((x - xOf(0)) / ((xOf(n - 1) - xOf(0)) / Math.max(1, n - 1)))));
        cross.setAttribute('x1', xOf(i)); cross.setAttribute('x2', xOf(i)); cross.setAttribute('opacity', 1);
        dots.forEach((d, si) => { d.setAttribute('cx', xOf(i)); d.setAttribute('cy', yOf(cfg.series[si].values[i])); d.setAttribute('opacity', 1); });
        const topV = Math.max(...cfg.series.map(s => s.values[i]));
        showTip(xOf(i) * k, yOf(topV) * k, cfg.labels[i], cfg.series.map((s, si) => ({ name: s.name, value: s.values[i], color: s.color || color(si), unit: cfg.unit })));
      });
      hit.addEventListener('pointerleave', () => { cross.setAttribute('opacity', 0); dots.forEach(d => d.setAttribute('opacity', 0)); hideTip(); });
      if (!REDUCED && cfg.animate !== false) lines.forEach(p => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: 900, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }).onfinish = () => { p.style.strokeDasharray = ''; }; });
    });
  }

  /* Спарклайн для KPI-плитки: 12 точек, тихий цвет, последняя — акцент */
  function spark(svgEl, values) {
    const W = 88, H = 24, max = Math.max(...values), min = Math.min(...values);
    const x = i => 2 + (W - 6) * i / (values.length - 1);
    const y = v => H - 3 - (H - 6) * ((v - min) / ((max - min) || 1));
    svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svgEl.innerHTML = `<path d="${values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join('')}"/><circle cx="${x(values.length - 1)}" cy="${y(values[values.length - 1])}" r="3"/>`;
  }

  SNC.charts = { bar, donut, line, spark };
})();
