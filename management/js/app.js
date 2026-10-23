/* =========================================================
   СНК · Управление продуктами — общий слой кабинета.
   Каркас (сайдбар, поиск), всплывающие панели, select и multiselect,
   выбор периода, вкладки, таблица данных, дерево, модалки и drawer,
   тосты, подсказки, загрузка файлов, числовые поля, степпер, формы.
   Без зависимостей; всё инициализируется по data-атрибутам.
   Внутри кабинета — только CSS-переходы и WAAPI, без GSAP и Lenis.
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage недоступен */ } }
  };
  const ico = id => `<svg class="ico" aria-hidden="true"><use href="#${id}"/></svg>`;
  const fmt = new Intl.NumberFormat('ru-RU');
  const SNC = window.SNC = window.SNC || {};
  SNC.fmt = fmt;

  /* ---------- Контекст организации ----------
     Как в боевом приложении (store organizationContext): выбранная организация хранится
     в браузере и фильтрует данные всех разделов (там — параметр filterOrganizationId у API).
     Клиенты (Агент, Продавец) видят СНК-АЗС и СНК-Офис; партнёры и сервисы — нет. */
  const ORG_KEY = 'snc-mgmt-org';
  SNC.org = (() => { try { return JSON.parse(localStorage.getItem(ORG_KEY)) || { id: 0 }; } catch (e) { return { id: 0 }; } })();
  SNC.org.isClient = !SNC.org.id || [1, 2].includes(Number(SNC.org.type));
  // относится ли строка к выбранной организации: data-org — id, data-f-orgname — название (реестры)
  SNC.orgMatch = el => {
    if (!SNC.org.id) return true;
    const id = el.getAttribute('data-org');
    if (id !== null) return Number(id) === Number(SNC.org.id);
    const n = el.getAttribute('data-f-orgname');
    return n === null || n === SNC.org.name;
  };

  document.documentElement.classList.add('js');

  /* ---------- Сайдбар: сворачивание (desktop) и выезд (mobile) ---------- */
  (() => {
    const shell = $('.app-shell');
    const sb = $('.sb');
    if (!shell || !sb) return;
    const KEY = 'snc-mgmt-sb';
    if (store.get(KEY) === 'min') shell.classList.add('is-collapsed');

    $$('[data-sb-collapse]').forEach(btn => {
      const sync = () => {
        const min = shell.classList.contains('is-collapsed');
        btn.setAttribute('aria-pressed', String(min));
        btn.setAttribute('aria-label', min ? 'Развернуть меню' : 'Свернуть меню');
      };
      sync();
      btn.addEventListener('click', () => {
        shell.classList.toggle('is-collapsed');
        store.set(KEY, shell.classList.contains('is-collapsed') ? 'min' : 'full');
        sync();
      });
    });
    // в свёрнутом виде подпись пункта — во всплывающей подсказке
    $$('.sb__link, .sb__product', sb).forEach(a => {
      const label = a.querySelector('.sb__label');
      if (label && !a.hasAttribute('data-tip')) a.dataset.tipCollapsed = label.textContent.trim();
    });

    let scrim = $('.sb-scrim');
    if (!scrim) { scrim = document.createElement('div'); scrim.className = 'sb-scrim'; document.body.append(scrim); }
    const burger = $('[data-sb-open]');
    const open = v => {
      sb.classList.toggle('is-open', v);
      scrim.classList.toggle('is-open', v);
      burger?.setAttribute('aria-expanded', String(v));
      if (v) sb.querySelector('a, button')?.focus();
      else burger?.focus({ preventScroll: true });
    };
    burger?.addEventListener('click', () => open(!sb.classList.contains('is-open')));
    scrim.addEventListener('click', () => open(false));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && sb.classList.contains('is-open')) open(false); });
  })();

  /* ---------- Cookie-баннер: как на сайтах группы (стили — designs/styles.css) ----------
     Выбор хранится в localStorage «snc-cookie-consent» — общий ключ с сайтами группы. */
  (() => {
    const KEY = 'snc-cookie-consent';
    const apply = v => {
      window.SNC_COOKIES = { choice: v, analytics: v === 'all' };
      document.dispatchEvent(new CustomEvent('snc:cookie-consent', { detail: window.SNC_COOKIES }));
    };
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* storage недоступен */ }
    if (saved && (saved.v === 'all' || saved.v === 'necessary')) { apply(saved.v); return; }
    window.SNC_COOKIES = { choice: null, analytics: false };
    const policy = document.querySelector('a[href$="cookies.html"]')?.getAttribute('href') || 'https://www.sncard.ru/cookie-policy';
    const box = document.createElement('section');
    box.className = 'cookie';
    box.setAttribute('aria-label', 'Уведомление об использовании cookies');
    box.innerHTML = `
      <p class="cookie__text"><span class="cookie__line cookie__line--lead">Кабинет использует cookies. Обязательные нужны для входа и работы разделов, аналитические — только с&nbsp;вашего согласия.</span> <span class="cookie__line">Подробнее — в&nbsp;<a href="${policy}">Политике использования Cookies</a>.</span></p>
      <div class="cookie__actions">
        <button class="btn btn--primary" type="button" data-cookie="all">Принять</button>
      </div>`;
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-cookie]');
      if (!b) return;
      try { localStorage.setItem(KEY, JSON.stringify({ v: b.dataset.cookie, t: new Date().toISOString() })); } catch (e2) { /* выбор действует до перезагрузки */ }
      apply(b.dataset.cookie);
      box.classList.remove('is-visible');
      setTimeout(() => box.remove(), 400);
    });
    document.body.append(box);
    requestAnimationFrame(() => requestAnimationFrame(() => box.classList.add('is-visible')));
  })();

  /* ---------- Уведомления: «Прочитать все» ---------- */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-notif-read]');
    if (!b) return;
    const pop = b.closest('.pop');
    $$('.is-unread', pop).forEach(x => x.classList.remove('is-unread'));
    const trigger = $(`[aria-controls="${pop.id}"]`);
    trigger?.querySelector('.badge')?.remove();
    trigger?.setAttribute('aria-label', 'Уведомления, новых нет');
    const n = b.previousElementSibling; if (n) n.textContent = 'новых нет';
    b.remove();
  });

  /* ---------- Глобальный поиск: переход к разделу из подсказок ---------- */
  $$('[data-gsearch]').forEach(input => {
    const go = () => {
      const opt = $$(`#${input.getAttribute('list')} option`).find(o => o.value.toLowerCase() === input.value.trim().toLowerCase());
      if (opt) window.location.href = opt.dataset.href;
    };
    input.addEventListener('change', go);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
  });

  /* ---------- Глобальный поиск: «/» или Ctrl+K ---------- */
  document.addEventListener('keydown', e => {
    const input = $('.gsearch__input');
    if (!input) return;
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if ((e.key === '/' && !typing) || (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey))) {
      e.preventDefault(); input.focus(); input.select();
    }
  });

  /* ---------- Всплывающие панели (меню, фильтры, уведомления, профиль) ----------
     <button data-pop="id" aria-expanded="false" aria-controls="id"> + <div class="pop" id="id">
     Открыта только одна; закрытие по клику снаружи и Esc с возвратом фокуса. */
  const Pop = (() => {
    let current = null;
    const close = (restore = true) => {
      if (!current) return;
      const { trigger, panel } = current;
      panel.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      panel.dispatchEvent(new CustomEvent('pop:close'));
      if (restore) trigger.focus({ preventScroll: true });
      current = null;
    };
    const open = (trigger, panel, fromKeyboard = false) => {
      if (current && current.panel === panel) return close();
      close(false);
      // с клавиатуры — без анимации: действие частое, задержка ощущается как торможение
      panel.classList.toggle('is-instant', fromKeyboard || REDUCED);
      panel.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      current = { trigger, panel };
      panel.dispatchEvent(new CustomEvent('pop:open'));
      const first = panel.querySelector('[data-autofocus], [role="menuitem"], input, .opt[aria-selected="true"], .opt, button');
      if (first && (trigger.dataset.popFocus !== 'none')) requestAnimationFrame(() => first.focus({ preventScroll: true }));
    };
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-pop]');
      // e.detail === 0 — «клик» пришёл с клавиатуры (Enter / пробел)
      if (t) { const p = document.getElementById(t.dataset.pop); if (p) { e.preventDefault(); open(t, p, e.detail === 0); } return; }
      // composedPath, а не contains: календарь перерисовывается по клику, и цель уже отцеплена от панели
      if (current && !e.composedPath().includes(current.panel)) close(false);
    });
    document.addEventListener('keydown', e => {
      if (!current) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      // стрелки по пунктам меню
      const items = $$('[role="menuitem"]:not([aria-disabled="true"])', current.panel);
      if (!items.length || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const i = items.indexOf(document.activeElement);
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1
        : e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
      items[next].focus();
    });
    return { open, close, get current() { return current; } };
  })();
  SNC.pop = Pop;

  /* ---------- Select и multiselect ----------
     <div class="sel" data-select [data-multi] [data-placeholder]>
       <button class="sel__btn" data-pop="lb1" aria-haspopup="listbox"> <span class="sel__value"></span> ▾
       <div class="pop" id="lb1"> [.opts__search input] <div class="opts" role="listbox"> .opt[role=option][data-value] */
  function initSelect(root) {
    const btn = $('.sel__btn', root);
    const pop = $('.pop', root);
    const list = $('[role="listbox"]', root);
    const search = $('.opts__search input', root);
    const multi = root.hasAttribute('data-multi');
    const placeholder = root.dataset.placeholder || 'Выберите';
    const opts = () => $$('.opt[role="option"]', list);
    const visible = () => opts().filter(o => !o.hidden && o.getAttribute('aria-disabled') !== 'true');
    if (multi) list.setAttribute('aria-multiselectable', 'true');
    btn.setAttribute('aria-haspopup', 'listbox');

    const render = () => {
      const sel = opts().filter(o => o.getAttribute('aria-selected') === 'true');
      const text = o => o.dataset.label || o.querySelector('.opt__text')?.textContent.trim() || o.textContent.trim();
      if (!multi) {
        const v = $('.sel__value', btn);
        v.textContent = sel[0] ? text(sel[0]) : placeholder;
        v.classList.toggle('is-placeholder', !sel[0]);
      } else {
        let box = $('.sel__chips', btn);
        if (!box) { box = document.createElement('span'); box.className = 'sel__chips'; btn.prepend(box); $('.sel__value', btn)?.remove(); }
        box.innerHTML = '';
        if (!sel.length) box.innerHTML = `<span class="sel__value is-placeholder">${placeholder}</span>`;
        const MAX = Number(root.dataset.chips || 2);
        sel.slice(0, MAX).forEach(o => {
          const c = document.createElement('span');
          c.className = 'chip';
          c.innerHTML = `${text(o)}<span class="chip__x" aria-hidden="true" title="Убрать «${text(o)}»">${ico('i-x')}</span>`;
          c.querySelector('.chip__x').addEventListener('click', e => { e.stopPropagation(); toggle(o); });
          box.append(c);
        });
        if (sel.length > MAX) box.insertAdjacentHTML('beforeend', `<span class="chip chip--more">+${sel.length - MAX}</span>`);
      }
      root.dataset.value = sel.map(o => o.dataset.value).join(',');
      root.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { values: sel.map(o => o.dataset.value) } }));
    };
    const toggle = o => {
      if (multi) o.setAttribute('aria-selected', String(o.getAttribute('aria-selected') !== 'true'));
      else { opts().forEach(x => x.setAttribute('aria-selected', 'false')); o.setAttribute('aria-selected', 'true'); }
      render();
      if (!multi) Pop.close();
    };
    const setActive = o => {
      opts().forEach(x => x.classList.toggle('is-active', x === o));
      if (o) { o.scrollIntoView({ block: 'nearest' }); list.setAttribute('aria-activedescendant', o.id); }
    };
    opts().forEach((o, i) => {
      o.id = o.id || `${pop.id}-o${i}`;
      o.tabIndex = -1;
      if (!o.querySelector('.opt__check')) o.insertAdjacentHTML('beforeend', `<svg class="opt__check" aria-hidden="true"><use href="#i-check"/></svg>`);
      o.addEventListener('click', () => toggle(o));
      o.addEventListener('mousemove', () => setActive(o));
    });
    list.tabIndex = -1;
    list.addEventListener('keydown', e => {
      const v = visible();
      let i = v.findIndex(o => o.classList.contains('is-active'));
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(v[Math.min(v.length - 1, i + 1)]); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (i <= 0 && search) search.focus(); else setActive(v[Math.max(0, i - 1)]); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (v[i]) toggle(v[i]); }
      else if (e.key === 'Home') { e.preventDefault(); setActive(v[0]); }
      else if (e.key === 'End') { e.preventDefault(); setActive(v[v.length - 1]); }
      else if (e.key.length === 1 && !search) { // поиск по первой букве
        const hit = v.find(o => o.textContent.trim().toLowerCase().startsWith(e.key.toLowerCase()));
        if (hit) setActive(hit);
      }
    });
    list.addEventListener('focus', () => { if (!$('.opt.is-active', list)) setActive(visible().find(o => o.getAttribute('aria-selected') === 'true') || visible()[0]); });
    search?.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      let n = 0;
      opts().forEach(o => { const hit = !q || o.textContent.toLowerCase().includes(q); o.hidden = !hit; n += hit; });
      let empty = $('.opts__empty', list);
      if (!n && !empty) { empty = document.createElement('div'); empty.className = 'opts__empty'; list.append(empty); }
      if (empty) { empty.hidden = !!n; empty.textContent = `Ничего не найдено по запросу «${search.value.trim()}»`; }
      setActive(visible()[0]);
    });
    search?.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); list.focus(); setActive(visible()[0]); }
      if (e.key === 'Enter') { e.preventDefault(); const a = $('.opt.is-active', list) || visible()[0]; if (a) toggle(a); }
    });
    pop.addEventListener('pop:open', () => { if (search) { search.value = ''; search.dispatchEvent(new Event('input')); requestAnimationFrame(() => search.focus()); } else list.focus(); });
    $('[data-clear]', pop)?.addEventListener('click', () => { opts().forEach(o => o.setAttribute('aria-selected', 'false')); render(); });
    $('[data-all]', pop)?.addEventListener('click', () => { visible().forEach(o => o.setAttribute('aria-selected', 'true')); render(); });
    // Открытие стрелкой вниз с кнопки
    btn.addEventListener('keydown', e => { if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && btn.getAttribute('aria-expanded') !== 'true') { e.preventDefault(); btn.click(); } });
    render();
  }
  $$('[data-select]').forEach(initSelect);

  /* ---------- Переключатель организации (верхняя панель) ---------- */
  (() => {
    const sw = $('#org-switch');
    if (!sw) return;
    const cur = Number(SNC.org.id || 0);
    $$('.opt', sw).forEach(o => o.setAttribute('aria-selected', String(Number(o.dataset.value) === cur)));
    initSelect(sw);
    sw.classList.toggle('is-set', cur > 0);
    $('.sel__btn', sw).setAttribute('aria-label', `Организация: ${cur ? SNC.org.name : 'все организации'}. Сменить`);
    // поиск прячет опустевшие группы
    $('.opts__search input', sw)?.addEventListener('input', () => $$('[role="group"]', sw).forEach(g => { g.hidden = !$$('.opt', g).some(o => !o.hidden); }));
    sw.addEventListener('change', e => {
      const v = Number(e.detail?.values[0] || 0);
      if (v === cur) return;
      const o = $(`.opt[data-value="${v}"]`, sw);
      const next = { id: v, type: Number(o.dataset.type), name: o.querySelector('.opt__text').textContent, short: o.dataset.label };
      try {
        if (v) localStorage.setItem(ORG_KEY, JSON.stringify(next)); else localStorage.removeItem(ORG_KEY);
        sessionStorage.setItem('snc-mgmt-org-changed', '1');
      } catch (err) { /* без хранилища выбор действует до перезагрузки */ }
      // как в боевом приложении: данные раздела запрашиваются заново уже по выбранной организации
      location.reload();
    });
    try {
      if (sessionStorage.getItem('snc-mgmt-org-changed')) {
        sessionStorage.removeItem('snc-mgmt-org-changed');
        setTimeout(() => SNC.toast({ type: 'info', title: cur ? `Показаны данные: ${SNC.org.name}` : 'Показаны данные всех организаций' }), 200);
      }
    } catch (err) { /* нет sessionStorage — без тоста */ }
  })();

  // организация уже выбрана в верхней панели — фильтр «Все организации» в таблицах лишний
  if (SNC.org.id) document.querySelectorAll('[data-filter="orgName"], #f-org').forEach(el => { el.hidden = true; });

  /* ---------- Доступ к разделам по типу организации ----------
     Партнёру и сервису недоступны СНК-АЗС, СНК-Офис и СНК-Личный кабинет (в боевом приложении — правило clientOnly
     с переходом на главную). В прототипе вместо молчаливого перехода объясняем, что делать. */
  (() => {
    if (SNC.org.isClient) return;
    const typeName = { 3: 'сервис', 4: 'партнёр' }[SNC.org.type] || 'не клиент';
    const why = `${SNC.org.name} — ${typeName}. Точки обслуживания, офисные данные и копии ЛК есть только у клиентских организаций.`;
    $$('.sb__product').forEach(a => {
      if (!/(^|\/)(azs|office|pa)\//.test(a.getAttribute('href'))) return;
      a.setAttribute('aria-disabled', 'true');
      a.dataset.tip = 'Доступно, когда выбрана клиентская организация';
      a.addEventListener('click', e => { e.preventDefault(); SNC.toast({ type: 'info', title: 'Раздел только для клиентов', text: why }); });
    });
    if (!/\/(azs|office|pa)\//.test(location.pathname)) return;
    const main = $('#main');
    if (!main) return;
    // содержимое прячем, а не удаляем: скрипты страницы продолжают работать без ошибок
    Array.from(main.children).forEach(c => { c.hidden = true; });
    main.insertAdjacentHTML('afterbegin', `<div class="dt"><div class="empty">
      <svg class="empty__art" viewBox="0 0 176 112" aria-hidden="true"><rect class="bp-soft" x="8" y="8" width="160" height="96" rx="4"/><path class="bp" d="M40 84V44h36v40M100 84V30h36v54M28 84h120"/><path class="bp-accent" d="M70 22l36 36M106 22L70 58"/></svg>
      <h1 class="empty__title">Раздел недоступен для этой организации</h1>
      <p class="empty__text">${why} Выберите клиента в переключателе организации или вернитесь на главную.</p>
      <div class="empty__actions"><button class="btn btn--primary btn--sm" type="button" data-org-open><span>Выбрать организацию</span></button><a class="btn btn--outline btn--sm" href="${$('.sb__brand')?.getAttribute('href') || 'dashboard.html'}"><span>На главную</span></a></div>
    </div></div>`);
    $('[data-org-open]', main).addEventListener('click', () => $('#org-switch .sel__btn')?.click());
  })();
  SNC.initSelect = initSelect;

  /* ---------- Выбор даты и периода ----------
     <div class="sel" data-datepicker [data-single]> кнопка + .pop с пустым .dp — календарь строится здесь */
  function initDatepicker(root) {
    const btn = $('.sel__btn', root);
    const pop = $('.pop', root);
    const single = root.hasAttribute('data-single');
    const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const d0 = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = d0(new Date());
    const add = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
    const same = (a, b) => a && b && a.getTime() === b.getTime();
    const f = d => d ? d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
    let start = root.dataset.start ? d0(new Date(root.dataset.start)) : add(today, -6);
    let end = single ? null : (root.dataset.end ? d0(new Date(root.dataset.end)) : today);
    if (single) start = root.dataset.start ? start : today;
    let view = new Date((end || start).getFullYear(), (end || start).getMonth(), 1);
    let focusDay = end || start;
    let picking = false;
    const PRESETS = [
      ['Сегодня', () => [today, today]], ['Вчера', () => [add(today, -1), add(today, -1)]],
      ['7 дней', () => [add(today, -6), today]], ['30 дней', () => [add(today, -29), today]],
      ['Этот месяц', () => [new Date(today.getFullYear(), today.getMonth(), 1), today]],
      ['Прошлый месяц', () => [new Date(today.getFullYear(), today.getMonth() - 1, 1), new Date(today.getFullYear(), today.getMonth(), 0)]]
    ];
    const label = () => {
      const v = $('.sel__value', btn);
      v.textContent = single ? f(start) : (same(start, end) ? f(start) : `${f(start)} — ${f(end)}`);
      v.classList.add('mono');
    };
    const draw = () => {
      const first = new Date(view.getFullYear(), view.getMonth(), 1);
      const shift = (first.getDay() + 6) % 7;
      let cells = '';
      ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].forEach(d => { cells += `<span class="dp__dow" aria-hidden="true">${d}</span>`; });
      for (let i = 0; i < 42; i++) {
        const d = add(first, i - shift);
        const cls = ['dp__day'];
        if (d.getMonth() !== view.getMonth()) cls.push('is-out');
        if (same(d, today)) cls.push('is-today');
        if (same(d, start)) cls.push('is-start');
        if (single ? same(d, start) : same(d, end)) cls.push('is-end');
        if (!single && end && d > start && d < end) cls.push('is-in');
        const sel = same(d, start) || same(d, end);
        cells += `<button type="button" class="${cls.join(' ')}" data-d="${d.getTime()}" tabindex="${same(d, focusDay) ? 0 : -1}" aria-pressed="${sel}" aria-label="${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}">${d.getDate()}</button>`;
      }
      const presets = single ? '' : `<div class="dp__presets" role="group" aria-label="Быстрый выбор">${PRESETS.map((p, i) => `<button type="button" class="opt" data-preset="${i}">${p[0]}</button>`).join('')}</div>`;
      $('.dp', pop).innerHTML = `${presets}
        <div class="dp__cal">
          <div class="dp__head">
            <button type="button" class="icon-btn icon-btn--sm" data-nav="-1" aria-label="Предыдущий месяц">${ico('i-chevron-left')}</button>
            <span class="dp__month" aria-live="polite">${MONTHS[view.getMonth()]} ${view.getFullYear()}</span>
            <button type="button" class="icon-btn icon-btn--sm" data-nav="1" aria-label="Следующий месяц">${ico('i-chevron-right')}</button>
          </div>
          <div class="dp__grid" role="group" aria-label="${MONTHS[view.getMonth()]} ${view.getFullYear()}">${cells}</div>
        </div>
        <div class="dp__foot"><span class="dp__range">${single ? f(start) : `${f(start)} — ${f(end || start)}`}</span>
          <span style="display:flex;gap:8px"><button type="button" class="btn btn--ghost btn--xs" data-cancel>Отмена</button><button type="button" class="btn btn--primary btn--xs" data-apply>Применить</button></span></div>`;
    };
    const focusCell = () => $(`.dp__day[data-d="${focusDay.getTime()}"]`, pop)?.focus();
    const moveFocus = d => {
      focusDay = d;
      if (d.getMonth() !== view.getMonth() || d.getFullYear() !== view.getFullYear()) view = new Date(d.getFullYear(), d.getMonth(), 1);
      draw(); focusCell();
    };
    const pick = d => {
      if (single) { start = d; }
      else if (!picking) { start = d; end = null; picking = true; }
      else { if (d < start) { end = start; start = d; } else end = d; picking = false; }
      focusDay = d; draw(); focusCell();
    };
    pop.addEventListener('click', e => {
      const day = e.target.closest('.dp__day');
      if (day) return pick(new Date(Number(day.dataset.d)));
      const nav = e.target.closest('[data-nav]');
      if (nav) { view = new Date(view.getFullYear(), view.getMonth() + Number(nav.dataset.nav), 1); focusDay = view; draw(); return; }
      const pr = e.target.closest('[data-preset]');
      if (pr) { [start, end] = PRESETS[pr.dataset.preset][1](); picking = false; view = new Date(end.getFullYear(), end.getMonth(), 1); focusDay = end; draw(); return; }
      if (e.target.closest('[data-apply]')) { if (!single && !end) end = start; label(); Pop.close(); root.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { start, end } })); }
      if (e.target.closest('[data-cancel]')) Pop.close();
    });
    pop.addEventListener('keydown', e => {
      if (!e.target.classList.contains('dp__day')) return;
      const k = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      if (k) { e.preventDefault(); moveFocus(add(focusDay, k)); }
      if (e.key === 'PageUp' || e.key === 'PageDown') { e.preventDefault(); moveFocus(new Date(focusDay.getFullYear(), focusDay.getMonth() + (e.key === 'PageUp' ? -1 : 1), focusDay.getDate())); }
    });
    btn.dataset.popFocus = 'none'; // фокус ставим сами — на выбранный день, а не на первую кнопку панели
    pop.addEventListener('pop:open', () => { draw(); requestAnimationFrame(focusCell); });
    label(); draw();
  }
  $$('[data-datepicker]').forEach(initDatepicker);
  SNC.initDatepicker = initDatepicker;

  /* ---------- Вкладки: ARIA tabs + индикатор, который перетекает ---------- */
  function initTabs(list) {
    const tabs = $$('[role="tab"]', list);
    let ink = $('.tabs__ink', list);
    if (!ink) { ink = document.createElement('span'); ink.className = 'tabs__ink'; ink.setAttribute('aria-hidden', 'true'); list.append(ink); }
    const place = (t, instant) => {
      if (instant) ink.style.transition = 'none';
      // вкладки в две строки (.tabs--wrap): индикатор опускается под строку выбранной вкладки
      const dy = t.offsetTop + t.offsetHeight - list.clientHeight;
      ink.style.transform = `translate(${t.offsetLeft}px, ${dy}px) scaleX(${t.offsetWidth})`;
      if (instant) { ink.getBoundingClientRect(); ink.style.transition = ''; }
    };
    const select = (t, focus) => {
      tabs.forEach(x => {
        const on = x === t;
        x.setAttribute('aria-selected', String(on));
        x.tabIndex = on ? 0 : -1;
        const p = document.getElementById(x.getAttribute('aria-controls'));
        if (p) p.hidden = !on;
      });
      place(t);
      if (focus) t.focus();
      list.dispatchEvent(new CustomEvent('tabs:change', { detail: { tab: t } }));
    };
    tabs.forEach(t => t.addEventListener('click', () => select(t)));
    list.addEventListener('keydown', e => {
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      const n = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (n) { e.preventDefault(); select(tabs[(i + n + tabs.length) % tabs.length], true); }
      if (e.key === 'Home') { e.preventDefault(); select(tabs[0], true); }
      if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1], true); }
    });
    const cur = tabs.find(t => t.getAttribute('aria-selected') === 'true') || tabs[0];
    select(cur);
    requestAnimationFrame(() => place(cur, true));
    new ResizeObserver(() => place(tabs.find(t => t.getAttribute('aria-selected') === 'true') || cur, true)).observe(list);
  }
  $$('.tabs[role="tablist"]').forEach(initTabs);
  SNC.initTabs = initTabs;

  /* ---------- Таблица данных ----------
     <div class="dt" data-table [data-page-size="10"]>
       .dt__bar: [data-dt-search] input, [data-dt-density] .seg, [data-dt-cols] меню колонок
       .dt__bulk [data-dt-count]; table.table; .pager (строится здесь при data-page-size) */
  function initTable(dt) {
    const table = $('table', dt);
    const tbody = table.tBodies[0];
    const scroll = $('.dt__scroll', dt);
    const bulk = $('.dt__bulk', dt);
    const all = $('thead .col-check input', table);
    const pageSize = Number(dt.dataset.pageSize || 0);
    let page = 1;
    let query = '';
    let extFilter = null; // фильтр страницы: плитки, select'ы (dt.snc.setFilter)
    const rows = () => $$(':scope > tr:not(.row-detail)', tbody);
    const detailOf = tr => tr.nextElementSibling?.classList.contains('row-detail') ? tr.nextElementSibling : null;
    // чекбокс строки — в первой ячейке; прямой доступ в ~100 раз быстрее querySelector('.col-check input')
    const boxOf = tr => { const c = tr.cells[0]; return c && c.classList.contains('col-check') ? c.getElementsByTagName('input')[0] : null; };

    // Сортировка: по data-v ячейки или по тексту; числа — как числа
    $$('thead th[data-sort]', table).forEach(th => {
      const idx = th.cellIndex;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'th-sort';
      const rest = Array.from(th.children); // фильтр и прочие элементы остаются вне кнопки: интерактив нельзя вкладывать
      b.innerHTML = `${Array.from(th.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim()}<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 2v8M3 7l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      th.innerHTML = ''; th.append(b, ...rest);
      if (!th.hasAttribute('aria-sort')) th.setAttribute('aria-sort', 'none');
      b.addEventListener('click', () => {
        const dir = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
        $$('thead th[data-sort]', table).forEach(x => x.setAttribute('aria-sort', 'none'));
        th.setAttribute('aria-sort', dir);
        const num = th.dataset.sort === 'num';
        const val = tr => { const c = tr.cells[idx]; const v = c?.dataset.v ?? c?.textContent.trim() ?? ''; return num ? parseFloat(String(v).replace(/\s/g, '').replace(',', '.')) || 0 : v.toLowerCase(); };
        // ключи считаем один раз, а не в каждом сравнении; строки переставляем одним фрагментом
        const coll = new Intl.Collator('ru', { numeric: true });
        const keyed = rows().map(tr => ({ tr, d: detailOf(tr), k: val(tr) }));
        const sgn = dir === 'ascending' ? 1 : -1;
        keyed.sort((a, b2) => sgn * (num ? a.k - b2.k : coll.compare(a.k, b2.k)));
        const frag = document.createDocumentFragment();
        keyed.forEach(({ tr, d }) => { frag.append(tr); if (d) frag.append(d); });
        tbody.append(frag);
        page = 1; paint();
        SNC.announce?.(`Сортировка: ${b.textContent.trim()}, ${dir === 'ascending' ? 'по возрастанию' : 'по убыванию'}`);
      });
    });

    // Выбор строк и массовые действия
    // Один проход по строкам: счётчики выбора и aria-selected (пишем в DOM, только если изменилось)
    const syncSel = () => {
      let n = 0, visBoxes = 0, visOn = 0;
      for (const tr of rows()) {
        const c = boxOf(tr);
        if (!c) continue;
        if (c.checked) n++;
        if (!tr.hidden) { visBoxes++; if (c.checked) visOn++; }
        const sel = String(c.checked);
        if (tr.getAttribute('aria-selected') !== sel) tr.setAttribute('aria-selected', sel);
      }
      if (all) { all.checked = visOn > 0 && visOn === visBoxes; all.indeterminate = visOn > 0 && visOn < visBoxes; }
      if (bulk) { bulk.hidden = n === 0; const c = $('[data-dt-count]', bulk); if (c) c.textContent = `Выбрано: ${n}`; }
    };
    tbody.addEventListener('change', e => { if (e.target.closest('.col-check')) syncSel(); });
    all?.addEventListener('change', () => { rows().filter(tr => !tr.hidden).forEach(tr => { const c = boxOf(tr); if (c) c.checked = all.checked; }); syncSel(); });
    $('[data-dt-clear]', dt)?.addEventListener('click', () => { rows().forEach(tr => { const c = boxOf(tr); if (c) c.checked = false; }); syncSel(); });

    // Поиск по строкам
    const search = $('[data-dt-search]', dt);
    search?.addEventListener('input', () => { query = search.value.trim().toLowerCase(); page = 1; paint(); });

    // Плотность
    $$('[data-dt-density] .seg__btn', dt).forEach(b => b.addEventListener('click', () => {
      $$('[data-dt-density] .seg__btn', dt).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      dt.classList.toggle('dt--compact', b.dataset.density === 'compact');
    }));

    // Видимые колонки: чекбоксы в меню [data-dt-cols] с data-col = индекс колонки
    $$('[data-dt-cols] input[data-col]', dt).forEach(cb => cb.addEventListener('change', () => {
      const i = Number(cb.dataset.col);
      $$('tr', table).forEach(tr => { if (tr.classList.contains('row-detail')) return; const c = tr.cells[i]; if (c) c.hidden = !cb.checked; });
    }));

    // Раскрытие строки
    tbody.addEventListener('click', e => {
      const t = e.target.closest('.row-toggle');
      if (!t) return;
      const tr = t.closest('tr'); const d = detailOf(tr);
      const open = t.getAttribute('aria-expanded') !== 'true';
      t.setAttribute('aria-expanded', String(open));
      if (d) d.hidden = !open;
    });

    // Тень у липкой колонки при горизонтальной прокрутке
    scroll?.addEventListener('scroll', () => scroll.classList.toggle('is-scrolled-x', scroll.scrollLeft > 2), { passive: true });

    // Пагинация
    let pager = $('.pager', dt);
    const paint = () => {
      // Линейно: отбор → видимый срез страницы в Set → один проход с записью только изменений.
      // (indexOf внутри цикла давал квадратичную сложность: 10 000 строк — 4 с.)
      const list = rows();
      const match = list.filter(tr => (!query || tr.textContent.toLowerCase().includes(query)) && (!extFilter || extFilter(tr)) && SNC.orgMatch(tr));
      const total = match.length;
      const pages = pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1;
      page = Math.min(page, pages);
      const shown = new Set(pageSize ? match.slice((page - 1) * pageSize, page * pageSize) : match);
      for (const tr of list) {
        const vis = shown.has(tr);
        if (tr.hidden === vis) tr.hidden = !vis;
        const d = detailOf(tr);
        if (d) { const h = !vis || tr.querySelector('.row-toggle')?.getAttribute('aria-expanded') !== 'true'; if (d.hidden !== h) d.hidden = h; }
      }
      let empty = $('.dt__empty', dt);
      if (!total) {
        if (!empty) { empty = document.createElement('div'); empty.className = 'dt__empty'; scroll.after(empty); }
        const q = search?.value.trim() || '';
        empty.innerHTML = `<div class="empty"><div class="empty__title">Ничего не найдено</div><p class="empty__text">${q ? `По запросу «${q.replace(/</g, '&lt;')}» строк нет. Проверьте написание или сбросьте поиск.` : 'Под выбранные фильтры не подходит ни одна строка. Ослабьте фильтры или сбросьте их.'}</p><div class="empty__actions"><button type="button" class="btn btn--outline btn--sm" data-dt-reset>Сбросить ${q ? 'поиск' : 'фильтры'}</button></div></div>`;
        $('[data-dt-reset]', empty).addEventListener('click', () => {
          if (q) { search.value = ''; query = ''; paint(); search.focus(); }
          else dt.dispatchEvent(new CustomEvent('dt:reset-filters'));
        });
      } else empty?.remove();
      if (pageSize && pager) {
        const from = total ? (page - 1) * pageSize + 1 : 0;
        const to = Math.min(total, page * pageSize);
        const nums = [];
        for (let p = 1; p <= pages; p++) if (p === 1 || p === pages || Math.abs(p - page) <= 1) nums.push(p); else if (nums[nums.length - 1] !== '…') nums.push('…');
        pager.innerHTML = `<span class="pager__info">${from}–${to} из ${fmt.format(total)}</span>
          <nav class="pager__pages" aria-label="Страницы таблицы">
            <button type="button" class="pager__btn" data-p="${page - 1}" ${page === 1 ? 'disabled' : ''} aria-label="Предыдущая страница">${ico('i-chevron-left')}</button>
            ${nums.map(p => p === '…' ? '<span class="pager__btn" aria-hidden="true">…</span>' : `<button type="button" class="pager__btn" data-p="${p}" ${p === page ? 'aria-current="page"' : ''}>${p}</button>`).join('')}
            <button type="button" class="pager__btn" data-p="${page + 1}" ${page === pages ? 'disabled' : ''} aria-label="Следующая страница">${ico('i-chevron-right')}</button>
          </nav>`;
      }
      syncSel();
    };
    if (pageSize && !pager) { pager = document.createElement('div'); pager.className = 'pager'; dt.append(pager); }
    pager?.addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (b && !b.disabled) { page = Number(b.dataset.p); paint(); $('[aria-current="page"]', pager)?.focus(); } });
    paint();
    dt.snc = {
      paint,
      setFilter(fn) { extFilter = fn; page = 1; paint(); },
      get visible() { return rows().filter(tr => (!query || tr.textContent.toLowerCase().includes(query)) && (!extFilter || extFilter(tr)) && SNC.orgMatch(tr)); }
    };
    dt.dispatchEvent(new CustomEvent('dt:ready'));
  }
  $$('[data-table]').forEach(initTable);
  SNC.initTable = initTable;

  /* ---------- Меню действий строки ----------
     Кнопка [data-row-menu] в строке + <template data-row-menu-tpl> внутри .dt с пунктами
     <button class="opt" role="menuitem" data-action="…">. Выбор → событие «rowmenu» на .dt
     с detail { action, row }. Одна панель на страницу, позиционируется у кнопки. */
  (() => {
    let panel = null, row = null;
    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-row-menu]');
      if (btn) {
        const dt = btn.closest('.dt');
        const tpl = $('template[data-row-menu-tpl]', dt);
        if (!tpl) return;
        e.preventDefault(); e.stopPropagation();
        if (!panel) {
          panel = document.createElement('div');
          panel.className = 'pop'; panel.id = 'row-menu-pop';
          panel.style.cssText = 'position:fixed;min-width:230px;left:0;top:0';
          document.body.append(panel);
          panel.addEventListener('click', ev => {
            const it = ev.target.closest('[data-action]');
            if (!it) return;
            Pop.close();
            row.closest('.dt').dispatchEvent(new CustomEvent('rowmenu', { detail: { action: it.dataset.action, row } }));
          });
        }
        panel.innerHTML = '';
        panel.append(tpl.content.cloneNode(true));
        row = btn.closest('tr');
        btn.setAttribute('aria-controls', panel.id);
        btn.setAttribute('aria-haspopup', 'menu');
        const r = btn.getBoundingClientRect();
        panel.classList.add('pop--right');
        panel.style.left = `${Math.max(8, r.right - 230)}px`;
        const up = r.bottom + 260 > window.innerHeight;
        panel.style.top = up ? `${r.top - 6}px` : `${r.bottom + 6}px`;
        panel.style.transform = up ? 'translateY(-100%)' : '';
        panel.style.transformOrigin = up ? 'bottom right' : 'top right';
        Pop.open(btn, panel, e.detail === 0);
      }
    }, true);
  })();

  /* ---------- Дерево с чекбоксами (привилегии) ----------
     .tree[data-tree] > .tree__row[aria-level][aria-expanded?] — плоский список строк по уровням */
  function initTree(tree) {
    const rows = () => $$('.tree__row', tree);
    const lvl = r => Number(r.getAttribute('aria-level'));
    const kids = r => { const out = []; let n = r.nextElementSibling; while (n && lvl(n) > lvl(r)) { out.push(n); n = n.nextElementSibling; } return out; };
    const parent = r => { let p = r.previousElementSibling; while (p && lvl(p) >= lvl(r)) p = p.previousElementSibling; return p; };
    const paintVis = () => {
      rows().forEach(r => {
        let p = parent(r), vis = true;
        while (p) { if (p.getAttribute('aria-expanded') === 'false') { vis = false; break; } p = parent(p); }
        if (!tree.dataset.filtering) r.hidden = !vis;
      });
    };
    tree.addEventListener('click', e => {
      const t = e.target.closest('.tree__twist');
      if (!t) return;
      const r = t.closest('.tree__row');
      r.setAttribute('aria-expanded', String(r.getAttribute('aria-expanded') !== 'true'));
      paintVis();
    });
    // Родитель: отмечен, если отмечены все дети; прочерк, если часть
    const syncParent = p => {
      const cs = kids(p).filter(k => lvl(k) === lvl(p) + 1).map(k => $('.cb input', k)).filter(Boolean);
      const pc = $('.cb input', p);
      if (!pc || !cs.length) return;
      const on = cs.filter(c => c.checked).length;
      pc.checked = on === cs.length;
      pc.indeterminate = !pc.checked && (on > 0 || cs.some(c => c.indeterminate));
    };
    tree.addEventListener('change', e => {
      const cb = e.target.closest('.cb input');
      if (!cb) return;
      const r = cb.closest('.tree__row');
      kids(r).forEach(k => { const c = $('.cb input', k); if (c && !c.disabled) { c.checked = cb.checked; c.indeterminate = false; } });
      for (let p = parent(r); p; p = parent(p)) syncParent(p);
      tree.dispatchEvent(new CustomEvent('tree:change', { bubbles: true }));
    });
    // начальное состояние — снизу вверх, чтобы прочерки дошли до корня
    rows().filter(r => r.hasAttribute('aria-expanded')).reverse().forEach(syncParent);
    // Клавиатура: стрелки по видимым строкам, вправо/влево — раскрыть/свернуть
    tree.addEventListener('keydown', e => {
      const r = e.target.closest('.tree__row');
      if (!r || e.target !== r) return;
      const vis = rows().filter(x => !x.hidden);
      const i = vis.indexOf(r);
      if (e.key === 'ArrowDown') { e.preventDefault(); vis[i + 1]?.focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); vis[i - 1]?.focus(); }
      if (e.key === 'ArrowRight' && r.hasAttribute('aria-expanded')) { e.preventDefault(); if (r.getAttribute('aria-expanded') === 'false') { r.setAttribute('aria-expanded', 'true'); paintVis(); } else vis[i + 1]?.focus(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); if (r.getAttribute('aria-expanded') === 'true') { r.setAttribute('aria-expanded', 'false'); paintVis(); } else parent(r)?.focus(); }
      if (e.key === ' ') { e.preventDefault(); const c = $('.cb input', r); if (c) { c.checked = !c.checked; c.dispatchEvent(new Event('change', { bubbles: true })); } }
    });
    rows().forEach((r, i) => { r.tabIndex = i === 0 ? 0 : -1; r.addEventListener('focus', () => rows().forEach(x => { x.tabIndex = x === r ? 0 : -1; })); });
    // Поиск: показывает совпадения и их родителей, подсвечивает найденное
    const search = $('[data-tree-search]', tree.closest('[data-tree-wrap]') || tree.parentElement);
    search?.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      rows().forEach(r => { const n = $('.tree__name', r); n.innerHTML = n.textContent; });
      if (!q) { delete tree.dataset.filtering; paintVis(); return; }
      tree.dataset.filtering = '1';
      const show = new Set();
      rows().forEach(r => {
        const n = $('.tree__name', r);
        const t = n.textContent; const i = t.toLowerCase().indexOf(q);
        if (i >= 0) {
          n.innerHTML = `${t.slice(0, i)}<mark>${t.slice(i, i + q.length)}</mark>${t.slice(i + q.length)}`;
          show.add(r); let p = parent(r); while (p) { show.add(p); p = parent(p); }
        }
      });
      rows().forEach(r => { r.hidden = !show.has(r); });
    });
    paintVis();
  }
  $$('[data-tree]').forEach(initTree);
  SNC.initTree = initTree;

  /* ---------- Модалки и drawer на <dialog> ----------
     [data-dialog="id"] открывает; [data-close] закрывает; клик по подложке закрывает
     (кроме data-static — например, форма с несохранёнными данными). */
  const openDialog = (id, opener) => {
    const d = document.getElementById(id);
    if (!d || d.open) return;
    d._opener = opener || document.activeElement;
    d.showModal();
    document.documentElement.style.overflow = 'hidden';
    d.querySelector('[data-autofocus]')?.focus();
  };
  const closeDialog = d => {
    if (!d?.open) return;
    d.close();
  };
  document.addEventListener('click', e => {
    const o = e.target.closest('[data-dialog]');
    if (o) { e.preventDefault(); openDialog(o.dataset.dialog, o); return; }
    const c = e.target.closest('[data-close]');
    if (c) { closeDialog(c.closest('dialog')); return; }
  });
  $$('dialog.dlg, dialog.drawer').forEach(d => {
    d.addEventListener('click', e => {
      if (e.target !== d) return; // клик по подложке
      if (d.hasAttribute('data-static')) { if (!REDUCED) { d.classList.remove('is-shake'); void d.offsetWidth; d.classList.add('is-shake'); } return; }
      closeDialog(d);
    });
    d.addEventListener('close', () => {
      if (!$$('dialog[open]').length) document.documentElement.style.overflow = '';
      d._opener?.focus?.({ preventScroll: true });
    });
  });
  SNC.dialog = { open: openDialog, close: id => closeDialog(document.getElementById(id)) };

  /* ---------- Подтверждение с последствиями ----------
     SNC.confirm({ title, sub, items: ['что произойдёт', …], cta, icon }) → Promise<boolean>.
     Один <dialog> на страницу, собирается при первом вызове. В боевом — ConfirmDialog со слотом message. */
  SNC.confirm = ({ title, sub = '', items = [], cta = 'Подтвердить', icon = 'i-warn' } = {}) => new Promise(resolve => {
    let d = document.getElementById('dlg-ask');
    if (!d) {
      document.body.insertAdjacentHTML('beforeend', `<dialog class="dlg dlg--sm" id="dlg-ask" role="alertdialog" aria-labelledby="dlg-ask-t" aria-describedby="dlg-ask-d">
  <form class="dlg__inner" method="dialog" novalidate>
    <div class="dlg__head" style="border-bottom:0;padding-bottom:0"><span class="confirm__ico" data-ask-ico></span>
      <div><h2 class="dlg__title" id="dlg-ask-t"></h2><p class="dlg__sub" id="dlg-ask-d"></p></div>
      <button class="icon-btn" type="button" data-close aria-label="Закрыть">${ico('i-x')}</button></div>
    <div class="dlg__body"><div class="consequences"><span class="consequences__title">Что произойдёт</span><ul></ul></div></div>
    <div class="dlg__foot"><button class="btn btn--ghost btn--sm" type="button" data-close data-autofocus>Отмена</button><button class="btn btn--primary btn--sm" type="submit" value="ok"><span></span></button></div>
  </form>
</dialog>`);
      d = document.getElementById('dlg-ask');
      d.addEventListener('click', e => { if (e.target === d) closeDialog(d); });
      d.addEventListener('close', () => {
        if (!$$('dialog[open]').length) document.documentElement.style.overflow = '';
        d._opener?.focus?.({ preventScroll: true });
        d._resolve?.(d.returnValue === 'ok'); d._resolve = null;
      });
    }
    $('[data-ask-ico]', d).innerHTML = ico(icon);
    $('#dlg-ask-t', d).textContent = title;
    $('#dlg-ask-d', d).textContent = sub; $('#dlg-ask-d', d).hidden = !sub;
    $('.consequences', d).hidden = !items.length;
    $('.consequences ul', d).innerHTML = items.map(t => `<li>${String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</li>`).join('');
    $('[type="submit"] span', d).textContent = cta;
    d.returnValue = '';
    d._resolve = resolve;
    openDialog('dlg-ask');
  });

  /* ---------- Тосты ----------
     SNC.toast({ type: 'ok'|'err'|'warn'|'info', title, text, action: { label, onClick }, duration })
     Таймер на паузе при наведении и в скрытой вкладке. Не больше трёх одновременно. */
  (() => {
    let host = $('.toasts');
    const ensure = () => {
      if (!host) {
        host = document.createElement('section');
        host.className = 'toasts';
        host.setAttribute('aria-label', 'Уведомления');
        document.body.append(host);
      }
      return host;
    };
    const ICON = { ok: 'i-ok', err: 'i-alert', warn: 'i-warn', info: 'i-info' };
    SNC.toast = ({ type = 'ok', title = '', text = '', action = null, duration = 5000 } = {}) => {
      const h = ensure();
      const t = document.createElement('div');
      t.className = `toast toast--${type} is-entering`;
      t.setAttribute('role', type === 'err' ? 'alert' : 'status');
      t.innerHTML = `${ico(ICON[type])}<div><div class="toast__title"></div>${text ? '<div class="toast__text"></div>' : ''}${action ? '<button type="button" class="toast__action"></button>' : ''}</div>
        <button type="button" class="icon-btn icon-btn--sm" aria-label="Закрыть уведомление">${ico('i-x')}</button>`;
      $('.toast__title', t).textContent = title;
      if (text) $('.toast__text', t).textContent = text;
      if (action) { const a = $('.toast__action', t); a.textContent = action.label; a.addEventListener('click', () => { action.onClick?.(); leave(); }); }
      h.append(t);
      while (h.children.length > 3) h.firstElementChild.remove();
      requestAnimationFrame(() => requestAnimationFrame(() => t.classList.remove('is-entering')));
      let left = duration, started = Date.now(), timer = null;
      const run = () => { started = Date.now(); if (left > 0 && isFinite(left)) timer = setTimeout(leave, left); };
      const pause = () => { clearTimeout(timer); left -= Date.now() - started; };
      function leave() {
        clearTimeout(timer);
        if (t.classList.contains('is-leaving')) return;
        t.classList.add('is-leaving');
        setTimeout(() => {
          // FLIP: соседи съезжают на освободившееся место плавно, а не скачком
          const sibs = Array.from(h.children).filter(x => x !== t);
          const before = sibs.map(x => x.getBoundingClientRect().top);
          t.remove();
          if (REDUCED) return;
          sibs.forEach((x, i) => {
            const dy = before[i] - x.getBoundingClientRect().top;
            if (dy) x.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 220, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
          });
        }, REDUCED ? 0 : 200);
      }
      t.addEventListener('mouseenter', pause);
      t.addEventListener('mouseleave', run);
      t.addEventListener('focusin', pause);
      document.addEventListener('visibilitychange', () => (document.hidden ? pause() : run()));
      $('.icon-btn', t).addEventListener('click', leave);
      run();
      return { close: leave };
    };
  })();

  /* ---------- Живой регион для скринридера ---------- */
  (() => {
    const r = document.createElement('div');
    r.className = 'sr-only'; r.setAttribute('aria-live', 'polite');
    document.body.append(r);
    SNC.announce = msg => { r.textContent = ''; setTimeout(() => { r.textContent = msg; }, 60); };
  })();

  /* ---------- Подсказки ----------
     [data-tip="текст"] — задержка 500 мс у первой, мгновенно у соседних в течение 400 мс.
     В свёрнутом сайдбаре подсказки берутся из data-tip-collapsed. */
  (() => {
    const tip = document.createElement('div');
    tip.className = 'tip'; tip.id = 'snc-tip'; tip.setAttribute('aria-hidden', 'true'); // роль tooltip — только пока подсказка видна
    document.body.append(tip);
    let timer = null, warmUntil = 0, owner = null;
    // подпись пункта меню, обрезанная многоточием, тоже показывается целиком
    const clipped = el => { const l = el.querySelector('.sb__label'); return !!l && l.scrollWidth > l.clientWidth; };
    const text = el => el.dataset.tip || (el.dataset.tipCollapsed && ((el.closest('.app-shell.is-collapsed') && window.innerWidth > 1023) || clipped(el)) ? el.dataset.tipCollapsed : '');
    const show = el => {
      const t = text(el); if (!t) return;
      owner = el;
      tip.textContent = t;
      const warm = Date.now() < warmUntil;
      tip.classList.toggle('is-instant', warm || REDUCED);
      const r = el.getBoundingClientRect();
      tip.style.left = '0px'; tip.style.top = '0px';
      tip.classList.add('is-visible'); tip.setAttribute('role', 'tooltip'); tip.removeAttribute('aria-hidden');
      const w = tip.offsetWidth, h = tip.offsetHeight;
      const side = el.closest('.sb') ? 'right' : 'top';
      let x = side === 'right' ? r.right + 10 : r.left + r.width / 2 - w / 2;
      let y = side === 'right' ? r.top + r.height / 2 - h / 2 : r.top - h - 8;
      if (y < 8) y = r.bottom + 8;
      x = Math.max(8, Math.min(window.innerWidth - w - 8, x));
      tip.style.left = `${x}px`; tip.style.top = `${y}px`;
      el.setAttribute('aria-describedby', tip.id);
    };
    const hide = () => {
      clearTimeout(timer);
      if (owner) { owner.removeAttribute('aria-describedby'); warmUntil = Date.now() + 400; }
      owner = null; tip.classList.remove('is-visible'); tip.removeAttribute('role'); tip.setAttribute('aria-hidden', 'true');
    };
    const enter = e => {
      const el = e.target.closest?.('[data-tip], [data-tip-collapsed]');
      if (!el || el === owner) return;
      clearTimeout(timer);
      if (Date.now() < warmUntil || e.type === 'focusin') show(el);
      else timer = setTimeout(() => show(el), 500);
    };
    document.addEventListener('pointerover', e => { if (e.pointerType === 'mouse') enter(e); });
    document.addEventListener('pointerout', e => { const el = e.target.closest?.('[data-tip], [data-tip-collapsed]'); if (el && !el.contains(e.relatedTarget)) hide(); });
    document.addEventListener('focusin', e => { if (e.target.matches?.(':focus-visible')) enter(e); });
    document.addEventListener('focusout', hide);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
    window.addEventListener('scroll', hide, { passive: true, capture: true });
  })();

  /* ---------- Загрузка файла: drag-and-drop, прогресс, проверка размера ---------- */
  function initDrop(drop) {
    const input = $('input[type="file"]', drop);
    const list = document.getElementById(drop.dataset.files) || drop.nextElementSibling;
    const maxMb = Number(drop.dataset.maxMb || 50);
    const accept = (input.accept || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const err = document.getElementById(drop.dataset.err || '');
    const size = b => b > 1048576 ? `${(b / 1048576).toFixed(1).replace('.', ',')} МБ` : `${Math.max(1, Math.round(b / 1024))} КБ`;
    const add = file => {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const bad = file.size > maxMb * 1048576 ? `Файл больше ${maxMb} МБ` : (accept.length && !accept.includes(`.${ext}`) ? `Нужен файл ${accept.join(', ')}` : '');
      const row = document.createElement('div');
      row.className = `file${bad ? ' is-error' : ''}`;
      row.innerHTML = `<span class="file__ext">${ext.slice(0, 4)}</span>
        <div style="min-width:0"><div class="file__name"></div><div class="file__meta"><span>${size(file.size)}</span><span data-state>${bad || 'Загрузка…'}</span></div><div class="bar"><i style="--p:${bad ? 1 : 0}"></i></div></div>
        <button type="button" class="icon-btn icon-btn--sm" aria-label="Убрать файл">${ico('i-x')}</button>`;
      $('.file__name', row).textContent = file.name;
      $('.icon-btn', row).addEventListener('click', () => { row.remove(); SNC.announce(`Файл ${file.name} убран`); });
      list?.append(row);
      if (bad) { SNC.announce(`${file.name}: ${bad}`); return; }
      // имитация загрузки (TODO: подключить отправку на сервер)
      let p = 0;
      const tick = () => {
        p = Math.min(1, p + 0.08 + Math.random() * 0.14);
        $('.bar > i', row).style.setProperty('--p', p);
        if (p < 1) setTimeout(tick, 180);
        else { row.classList.add('is-done'); $('[data-state]', row).textContent = 'Загружен'; SNC.announce(`Файл ${file.name} загружен`); }
      };
      setTimeout(tick, 200);
    };
    input.addEventListener('change', () => { Array.from(input.files).forEach(add); input.value = ''; if (err) err.textContent = ''; drop.classList.remove('is-invalid'); });
    ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); if (t === 'dragleave' && drop.contains(e.relatedTarget)) return; drop.classList.remove('is-over'); }));
    drop.addEventListener('drop', e => Array.from(e.dataTransfer?.files || []).forEach(add));
  }
  $$('[data-drop]').forEach(initDrop);

  /* ---------- Числовое поле со степпером ---------- */
  $$('.num').forEach(n => {
    const input = $('input', n);
    const step = Number(input.step || 1);
    const clampV = v => Math.min(Number(input.max ?? Infinity) || Infinity, Math.max(Number(input.min ?? -Infinity), v));
    $$('[data-step]', n).forEach(b => b.addEventListener('click', () => {
      input.value = clampV((Number(input.value) || 0) + step * Number(b.dataset.step));
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }));
  });

  /* ---------- Степпер многошаговой формы ----------
     [data-stepper] с .stepper__item и панелями [data-step-panel]; кнопки [data-step-next] / [data-step-prev] */
  function initStepper(root) {
    const items = $$('.stepper__item', root);
    const panels = $$('[data-step-panel]', root);
    let cur = Math.max(0, items.findIndex(i => i.classList.contains('is-current')));
    const go = (n, focus = true) => {
      cur = Math.max(0, Math.min(items.length - 1, n));
      items.forEach((it, i) => {
        it.classList.toggle('is-done', i < cur);
        it.classList.toggle('is-current', i === cur);
        const node = $('.stepper__node', it);
        node.innerHTML = i < cur ? `<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7.5l2.5 2.5L11 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>` : String(i + 1);
        it.setAttribute('aria-current', i === cur ? 'step' : 'false');
      });
      panels.forEach((p, i) => { p.hidden = i !== cur; });
      $$('[data-step-prev]', root).forEach(b => { b.hidden = cur === 0; });
      $$('[data-step-next]', root).forEach(b => { b.hidden = cur === items.length - 1; });
      $$('[data-step-finish]', root).forEach(b => { b.hidden = cur !== items.length - 1; });
      if (focus) panels[cur]?.querySelector('input, select, textarea, button')?.focus({ preventScroll: true });
    };
    root.addEventListener('click', e => {
      if (e.target.closest('[data-step-next]')) { const p = panels[cur]; if (p && !validate(p)) return; go(cur + 1); }
      if (e.target.closest('[data-step-prev]')) go(cur - 1);
    });
    go(cur, false);
    root.snc = { go: n => go(n), get step() { return cur; } };
  }
  $$('[data-stepper]').forEach(initStepper);

  /* ---------- Валидация форм: при уходе с поля и при отправке ---------- */
  const MSG = {
    valueMissing: 'Заполните поле',
    typeMismatch: 'Проверьте формат',
    patternMismatch: 'Проверьте формат',
    tooShort: el => `Не короче ${el.minLength} символов`,
    tooLong: el => `Не длиннее ${el.maxLength} символов`,
    rangeUnderflow: el => `Не меньше ${el.min}`,
    rangeOverflow: el => `Не больше ${el.max}`
  };
  const check = el => {
    const fld = el.closest('.fld');
    if (!fld) return true;
    const out = $('.fld__err', fld);
    let msg = '';
    if (!el.validity.valid) {
      const k = Object.keys(MSG).find(key => el.validity[key]);
      // data-err — подсказка формата; для пустого обязательного поля всегда «Заполните поле»
      const own = k !== 'valueMissing' && el.dataset.err;
      msg = own || (typeof MSG[k] === 'function' ? MSG[k](el) : MSG[k]) || 'Проверьте значение';
    }
    fld.classList.toggle('is-invalid', !!msg);
    el.setAttribute('aria-invalid', String(!!msg));
    if (out) { out.textContent = msg; if (!out.id) out.id = `err-${Math.random().toString(36).slice(2, 8)}`; el.setAttribute('aria-describedby', out.id); }
    return !msg;
  };
  function validate(scope) {
    const fields = $$('input, textarea, select', scope).filter(el => el.closest('.fld') && !el.disabled);
    const bad = fields.filter(el => !check(el));
    if (bad.length) {
      bad[0].focus();
      if (!REDUCED) { const f = bad[0].closest('.fld'); f.classList.remove('is-shake'); void f.offsetWidth; f.classList.add('is-shake'); }
    }
    return !bad.length;
  }
  SNC.validate = validate;
  document.addEventListener('focusout', e => { const el = e.target; if (el.matches?.('.fld input, .fld textarea') && (el.value || el.dataset.touched)) check(el); });
  document.addEventListener('input', e => { const el = e.target; el.dataset && (el.dataset.touched = '1'); if (el.closest?.('.fld.is-invalid')) check(el); });

  /* ---------- Несохранённые изменения ---------- */
  $$('form[data-dirty-watch]').forEach(form => {
    const note = $('.actionbar__note', form.closest('[data-dirty-scope]') || form);
    let dirty = false;
    const set = v => { dirty = v; if (note) note.hidden = !v; form.toggleAttribute('data-dirty', v); };
    form.addEventListener('input', () => set(true));
    form.addEventListener('change', () => set(true));
    form.addEventListener('reset', () => set(false));
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!validate(form)) return;
      const b = $('[type="submit"]', form);
      if (b) { b.dataset.loading = 'true'; b.insertAdjacentHTML('beforeend', '<span class="spinner" aria-hidden="true"></span>'); }
      // TODO: подключить сохранение на сервер
      setTimeout(() => {
        if (b) { delete b.dataset.loading; $('.spinner', b)?.remove(); }
        set(false);
        SNC.toast({ type: 'ok', title: form.dataset.okTitle || 'Изменения сохранены' });
      }, 900);
    });
    window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  });

  /* ---------- Мобильный сайдбар: закрыть смахиванием ----------
     Палец ведёт панель; отпустили — решают расстояние или скорость (быстрый взмах закрывает
     даже на коротком пути). Вправо — с трением, как упор. Только на сенсоре и узком экране. */
  (() => {
    const sb = $('.sb'), scrim = $('.sb-scrim');
    if (!sb || REDUCED) return;
    let x0 = 0, y0 = 0, t0 = 0, dx = 0, drag = false, id = null;
    sb.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' || !sb.classList.contains('is-open') || window.innerWidth > 1023 || id !== null) return;
      id = e.pointerId; x0 = e.clientX; y0 = e.clientY; t0 = performance.now(); dx = 0; drag = false;
    });
    sb.addEventListener('pointermove', e => {
      if (e.pointerId !== id) return; // второй палец не перехватывает жест
      const mx = e.clientX - x0, my = e.clientY - y0;
      if (!drag) {
        if (Math.abs(mx) < 8 || Math.abs(mx) < Math.abs(my)) return; // вертикальная прокрутка меню — не жест
        drag = true; try { sb.setPointerCapture(id); } catch (err) { /* указатель уже отпущен */ } sb.style.transition = 'none';
      }
      dx = mx < 0 ? mx : mx * 0.15;
      sb.style.transform = `translateX(${dx}px)`;
      if (scrim) scrim.style.opacity = String(Math.max(0, 1 + Math.min(0, dx) / sb.offsetWidth));
    });
    const end = e => {
      if (e.pointerId !== id) return;
      id = null;
      if (!drag) return;
      const v = Math.abs(dx) / (performance.now() - t0);
      sb.style.transition = ''; sb.style.transform = '';
      if (scrim) scrim.style.opacity = '';
      if (dx < -80 || (dx < -10 && v > 0.11)) $('[data-sb-open]')?.click();
    };
    sb.addEventListener('pointerup', end);
    sb.addEventListener('pointercancel', end);
  })();

  /* ---------- Живые данные: соединение, новая версия, поток уведомлений ----------
     Соединение — настоящие события браузера online/offline. Для показа состояний без
     отключения сети: ?demo=offline | stale | update. Поток уведомлений — имитация
     (TODO: подписка на NATS). Подписаться: document.addEventListener('snc:live', …). */
  (() => {
    const main = $('.app-main');
    if (!main) return;
    const top = $('.top', main);
    const slot = document.createElement('div');
    slot.className = 'live-banners'; slot.setAttribute('aria-live', 'polite');
    top ? top.after(slot) : main.prepend(slot);
    const banner = (kind, html) => {
      slot.querySelector(`[data-live="${kind}"]`)?.remove();
      if (!html) return;
      slot.insertAdjacentHTML('beforeend', html.replace('<div class="banner', `<div data-live="${kind}" class="banner banner--top`));
    };
    const setLive = on => {
      $$('.live').forEach(l => { if (!l.closest('.kit-section, .live-banners')) l.classList.toggle('live--off', !on); });
      document.dispatchEvent(new CustomEvent('snc:live', { detail: { online: on } }));
    };
    const offline = () => {
      banner('net', `<div class="banner banner--warn" role="status">${ico('i-wifi-off')}<div class="banner__text">Нет соединения с интернетом<small>Данные на экране не обновляются. Изменения, сделанные сейчас, могут не сохраниться — дождитесь соединения.</small></div></div>`);
      setLive(false);
    };
    const online = () => {
      if (!slot.querySelector('[data-live="net"]')) return;
      banner('net', '');
      setLive(true);
      SNC.toast({ type: 'ok', title: 'Соединение восстановлено', text: 'Данные обновлены.' });
    };
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    if (navigator.onLine === false) offline();
    const demo = new URLSearchParams(location.search).get('demo');
    if (demo === 'offline') offline();
    if (demo === 'stale') banner('stale', `<div class="banner banner--warn" role="status">${ico('i-warn')}<div class="banner__text">Не удалось обновить данные<small>Показаны данные на 14:02. Они могут быть неактуальны — кабинет повторит попытку через минуту.</small></div><button class="btn btn--ghost btn--xs" type="button" data-live-retry>Повторить сейчас</button></div>`);
    if (demo === 'update') banner('update', `<div class="banner banner--info" role="status">${ico('i-update')}<div class="banner__text">Вышла новая версия кабинета<small>Обновите страницу, чтобы получить исправления. Несохранённые формы сохраните заранее.</small></div><button class="btn btn--outline btn--xs" type="button" data-live-reload>Обновить страницу</button></div>`);
    slot.addEventListener('click', e => {
      if (e.target.closest('[data-live-reload]')) location.href = location.pathname;
      if (e.target.closest('[data-live-retry]')) { banner('stale', ''); SNC.toast({ type: 'ok', title: 'Данные обновлены' }); }
    });

    // Поток уведомлений: новое событие раз в 35–60 с, пока вкладка открыта
    const list = $('#pop-notif .notif__list');
    const btn = $('[aria-controls="pop-notif"]');
    const D = window.SNC_DEMO;
    if (!list || !btn) return;
    const prefix = ($('.sb__brand')?.getAttribute('href') || 'dashboard.html').replace('dashboard.html', '');
    const EVENTS = D ? [
      () => { const s = D.stations[Math.floor(Math.random() * D.stations.length)]; return [`${s.name} (${s.code}): смена закрыта, отчёт готов`, `${prefix}office/shift.html?to=${s.id}`]; },
      () => { const r = D.requests[Math.floor(Math.random() * 10)]; return [`Проблемная заявка № ${r.id + 40} на ${r.stationName}`, `${prefix}azs/requests.html?kind=problem`]; },
      () => [`Ключ ${D.hasps[4].number} ждёт активации`, `${prefix}admin/organization.html?org=1#t-hasp`]
    ] : [() => ['Новое событие в кабинете', '#']];
    let unread = Number(btn.querySelector('.badge')?.textContent || 0);
    const push = () => {
      if (document.hidden || slot.querySelector('[data-live="net"]')) return;
      const [text, href] = EVENTS[Math.floor(Math.random() * EVENTS.length)]();
      const d = new Date();
      list.insertAdjacentHTML('afterbegin', `<a class="notif__item is-unread" href="${href}"><div><p></p><time>Сегодня, ${d.toLocaleTimeString('ru-RU').slice(0, 5)}</time></div></a>`);
      list.firstElementChild.querySelector('p').textContent = text;
      unread++;
      let badge = btn.querySelector('.badge');
      if (!badge) { badge = document.createElement('span'); badge.className = 'badge'; badge.setAttribute('aria-hidden', 'true'); btn.append(badge); }
      badge.textContent = unread;
      btn.setAttribute('aria-label', `Уведомления, ${unread} новых`);
      if (!REDUCED) badge.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 360, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
      const head = $('#pop-notif .notif__head .mono'); if (head) head.textContent = `${unread} новых`;
      SNC.announce(`Новое уведомление: ${text}`);
    };
    // «Прочитать все» обнуляет счётчик потока
    document.addEventListener('click', e => { if (e.target.closest('[data-notif-read]')) unread = 0; });
    const loop = () => setTimeout(() => { push(); loop(); }, 35000 + Math.random() * 25000);
    loop();
  })();

  /* ---------- Прокрутка таблиц с клавиатуры ----------
     Если внутри прокручиваемой области нет ссылок и кнопок, на неё саму можно встать Tab'ом
     и листать стрелками. Проверяем после load — таблицы страниц к этому времени отрисованы. */
  window.addEventListener('load', () => {
    $$('.dt__scroll').forEach(sc => {
      if (sc.querySelector('a, button, input, select, textarea, [tabindex]')) return;
      sc.tabIndex = 0;
      sc.setAttribute('role', 'region');
      sc.setAttribute('aria-label', sc.querySelector('caption')?.textContent.trim() || 'Таблица');
    });
  });

  /* ---------- Кнопки с подтверждением-демо: [data-demo-toast] ---------- */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-demo-toast]');
    if (!b) return;
    const [type, title, text] = b.dataset.demoToast.split('|');
    SNC.toast({ type, title, text, action: b.dataset.undo ? { label: 'Вернуть', onClick: () => SNC.toast({ type: 'info', title: 'Действие отменено' }) } : null });
  });
})();
