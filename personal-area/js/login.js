/* =========================================================
   СНК · Личный кабинет — экран входа.
   Сцена: схема «карта на ТРК → сервер СНК → кабинет» прорисовывается линиями,
   по маршрутам бегут пакеты данных, слои слегка следуют за курсором.
   Единственное «шоу» кабинета: экран видят раз за сессию.
   Инструменты: WAAPI для прорисовки, один rAF-цикл для пакетов и параллакса.
   Форма: три способа входа, код из SMS, регистрация по карте, состояния кнопки.
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'; // --ease группы

  /* ---------- Форма: способы входа ----------
     TODO: боевые запросы — stores/authSession (login / sms-код / refresh в cookie-режиме). */
  const err = $('#login-err');
  const SNC = window.SNC || {};
  const steps = { phone: $('#step-phone'), code: $('#step-code'), card: $('#step-card'), login: $('#step-login') };
  const show = name => {
    Object.entries(steps).forEach(([k, f]) => { f.hidden = k !== name; });
    err.hidden = true;
    $$('.field.is-invalid').forEach(f => f.classList.remove('is-invalid'));
  };
  $('[data-ways]').addEventListener('click', e => {
    const b = e.target.closest('[data-way]');
    if (!b) return;
    $$('[data-way]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    show(b.dataset.way);
    steps[b.dataset.way].querySelector('input')?.focus();
  });

  // показать / скрыть пароль
  $$('[data-eye]').forEach(eye => eye.addEventListener('click', () => {
    const inp = document.getElementById(eye.getAttribute('aria-controls'));
    const on = inp.type === 'password';
    inp.type = on ? 'text' : 'password';
    eye.setAttribute('aria-pressed', String(on));
    eye.setAttribute('aria-label', on ? 'Скрыть пароль' : 'Показать пароль');
    eye.querySelector('use').setAttribute('href', on ? '#i-eye-off' : '#i-eye');
    inp.focus();
  }));

  const fail = (msg, fields) => {
    err.querySelector('span').textContent = msg;
    err.hidden = false;
    fields.forEach(f => {
      const w = f.closest('.field') || f.closest('.login__code');
      w.classList.add('is-invalid');
      f.setAttribute('aria-invalid', 'true');
      if (!REDUCED) { w.classList.remove('is-shake'); void w.offsetWidth; w.classList.add('is-shake'); }
    });
    fields[0]?.focus();
  };
  document.addEventListener('input', e => {
    const w = e.target.closest('.field, .login__code');
    if (w) { w.classList.remove('is-invalid'); e.target.removeAttribute('aria-invalid'); }
    if (!$$('.field.is-invalid, .login__code.is-invalid').length) err.hidden = true;
  });
  // кнопка: idle → loading → success | idle
  const run = (form, check, next) => {
    const btn = $('.btn--submit', form);
    btn.dataset.state = 'loading';
    btn.setAttribute('aria-busy', 'true');
    setTimeout(() => {
      btn.removeAttribute('aria-busy');
      const problem = check();
      if (problem) { btn.dataset.state = 'idle'; return fail(...problem); }
      btn.dataset.state = 'success';
      SNC.announce?.('Готово');
      setTimeout(() => { btn.dataset.state = 'idle'; next(); }, REDUCED ? 150 : 600);
    }, 800);
  };

  /* Телефон: маска +7 000 000-00-00 */
  const phone = $('#phone');
  const digitsOf = v => v.replace(/\D/g, '').replace(/^8/, '7');
  phone.addEventListener('input', () => {
    let d = digitsOf(phone.value);
    if (d && d[0] !== '7') d = `7${d}`;
    d = d.slice(0, 11);
    const p = [d.slice(1, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)];
    phone.value = d ? `+7 ${p[0]}${p[1] ? ` ${p[1]}` : ''}${p[2] ? `-${p[2]}` : ''}${p[3] ? `-${p[3]}` : ''}` : '';
  });
  steps.phone.addEventListener('submit', e => {
    e.preventDefault();
    if (!phone.value.trim()) return fail('Введите номер телефона.', [phone]);
    if (digitsOf(phone.value).length !== 11) return fail('Номер неполный: нужно 10 цифр после +7.', [phone]);
    run(steps.phone, () => null, () => {
      $('[data-phone-echo]').textContent = phone.value;
      show('code'); timer(); $('[data-code] input').focus();
    });
  });
  $('[data-back]').addEventListener('click', () => { show('phone'); phone.focus(); });

  /* Код из SMS: 4 ячейки, автопереход, вставка целиком */
  const cells = $$('[data-code] input');
  cells.forEach((c, i) => {
    c.addEventListener('input', () => {
      c.value = c.value.replace(/\D/g, '').slice(-1);
      if (c.value && cells[i + 1]) cells[i + 1].focus();
      if (cells.every(x => x.value)) steps.code.requestSubmit();
    });
    c.addEventListener('keydown', e => { if (e.key === 'Backspace' && !c.value && cells[i - 1]) cells[i - 1].focus(); });
    c.addEventListener('paste', e => {
      const v = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 4);
      if (!v) return;
      e.preventDefault();
      cells.forEach((x, k) => { x.value = v[k] || ''; });
      (cells[v.length] || cells[3]).focus();
      if (v.length === 4) steps.code.requestSubmit();
    });
  });
  steps.code.addEventListener('submit', e => {
    e.preventDefault();
    const code = cells.map(c => c.value).join('');
    if (code.length < 4) return fail('Введите все 4 цифры кода.', cells.filter(c => !c.value));
    // TODO: проверка кода на сервере. В прототипе код «0000» — неверный.
    run(steps.code, () => code === '0000' ? ['Неверный код. Проверьте SMS или запросите код ещё раз.', cells] : null, () => { location.href = steps.code.dataset.next; });
  });
  let tId = 0;
  const timer = () => {
    clearInterval(tId);
    let left = 59;
    const btn = $('[data-resend]'), t = $('[data-resend-t]');
    btn.disabled = true; t.hidden = false;
    t.textContent = `через 0:${String(left).padStart(2, '0')}`;
    tId = setInterval(() => {
      left--;
      t.textContent = `через 0:${String(left).padStart(2, '0')}`;
      if (left <= 0) { clearInterval(tId); btn.disabled = false; t.hidden = true; }
    }, 1000);
  };
  $('[data-resend]').addEventListener('click', () => { timer(); SNC.toast?.({ type: 'info', title: 'Код отправлен повторно', text: `На ${phone.value}` }); });

  /* Карта + пароль */
  const cardnum = $('#cardnum');
  cardnum.addEventListener('input', () => { cardnum.value = cardnum.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 '); });
  steps.card.addEventListener('submit', e => {
    e.preventDefault();
    const pass = $('#cardpass');
    const empty = [cardnum, pass].filter(f => !f.value.trim());
    if (empty.length) return fail(empty.length === 2 ? 'Введите номер карты и пароль.' : empty[0] === cardnum ? 'Введите номер карты.' : 'Введите пароль.', empty);
    if (cardnum.value.replace(/\D/g, '').length !== 16) return fail('Номер карты — 16 цифр с лицевой стороны.', [cardnum]);
    run(steps.card, () => pass.value.trim().toLowerCase() === 'ошибка' ? ['Неверный номер карты или пароль.', [pass]] : null, () => { location.href = steps.card.dataset.next; });
  });

  /* Логин организации: демо-логины ведут в разные роли */
  steps.login.addEventListener('submit', e => {
    e.preventDefault();
    const login = $('#login'), pass = $('#password');
    const empty = [login, pass].filter(f => !f.value.trim());
    if (empty.length) return fail(empty.length === 2 ? 'Введите логин и пароль.' : empty[0] === login ? 'Введите логин.' : 'Введите пароль.', empty);
    const next = { seller: 'seller/dashboard.html', azs: 'station/shifts.html' }[login.value.trim().toLowerCase()] || steps.login.dataset.next;
    run(steps.login, () => pass.value.trim().toLowerCase() === 'ошибка' ? ['Неверный логин или пароль. Проверьте раскладку клавиатуры и Caps Lock.', [pass]] : null, () => { location.href = next; });
  });
  $('#password').addEventListener('keyup', e => {
    if (typeof e.getModifierState !== 'function') return;
    $('label[for="password"]').textContent = e.getModifierState('CapsLock') ? 'Пароль · включён Caps Lock' : 'Пароль';
  });

  /* Забыли пароль, регистрация */
  $('[data-forgot]').addEventListener('click', () => SNC.toast?.({ type: 'info', title: 'Новый пароль — по SMS', text: 'Войдите по телефону: код из SMS заменяет пароль. Для логина организации пароль сбрасывает её администратор.' }));
  $('[data-register]').addEventListener('click', () => SNC.dialog.open('dlg-reg'));
  $('#form-reg').addEventListener('submit', e => {
    e.preventDefault();
    if (!SNC.validate(e.target)) return;
    SNC.dialog.close('dlg-reg');
    SNC.toast({ type: 'ok', title: 'Пароль отправлен', text: 'Войдите по карте с паролем из SMS.' });
  });

  /* ---------- Сцена ---------- */
  const scene = $('.login__scene');
  const svg = $('#scene');
  if (!scene || !svg || getComputedStyle(scene).display === 'none') return;

  // 1. Прорисовка: линии в порядке потока данных — лист, ТО, сервер, узлы, связи
  const draws = $$('.ls-draw', svg);
  draws.forEach(el => { const len = Math.ceil(el.getTotalLength ? el.getTotalLength() : 1000); el.style.setProperty('--len', len); });
  const routes = $$('.ls-route', svg);
  const labels = $$('text, .ls-led, .ls-level, .ls-bar, .ls-surface, .ls-accent', svg);
  if (REDUCED) {
    scene.classList.add('is-drawn');
  } else {
    const STEP = 260;
    draws.forEach(el => {
      const len = Number(el.style.getPropertyValue('--len'));
      el.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 900, delay: 120 + Number(el.dataset.order) * STEP, easing: EASE, fill: 'forwards' });
    });
    routes.forEach(el => el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 120 + Number(el.dataset.order) * STEP, easing: 'ease-out', fill: 'backwards' }));
    labels.forEach((el, i) => el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: 700 + (i % 12) * 40, easing: 'ease-out', fill: 'backwards' }));
    setTimeout(() => {
      scene.classList.add('is-drawn');
      draws.forEach(el => el.getAnimations().forEach(a => a.cancel()));
    }, 120 + 5 * STEP + 950);
  }
  if (REDUCED) return; // без пакетов и параллакса — схема сразу в финальном виде

  // 2. Пакеты: маршрут = цепочка путей; от ТО до сервера, затем от сервера в офис
  const NS = 'http://www.w3.org/2000/svg';
  const layer = $('#packets');
  const path = id => document.getElementById(id);
  const CHAINS = [
    { parts: [path('r-to'), path('r-office')], every: [1400, 2200] },
    { parts: [path('r-n1'), path('r-office')], every: [2600, 3800] },
    { parts: [path('r-n2'), path('r-office')], every: [3000, 4400] }
  ].map(c => ({ ...c, lens: c.parts.map(p => p.getTotalLength()), next: 0 }));
  const packets = [];
  const bar = $('#bar-now');
  const arrive = () => {
    bar?.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(1.25)' }, { transform: 'scaleY(1)' }], { duration: 420, easing: EASE });
  };
  const spawn = (chain, t) => {
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('r', '4'); c.setAttribute('class', 'ls-packet');
    c.setAttribute('stroke', '#F7F8FA'); c.setAttribute('stroke-width', '2');
    layer.append(c);
    packets.push({ el: c, chain, born: t, speed: 95 + Math.random() * 40 });
  };

  // 3. Счётчик на дисплее ТРК: идёт налив
  const digits = $('#pump-digits');
  let litres = 12.4, lastDigits = 0;

  // 4. Параллакс слоёв за курсором (только мышь)
  const layers = $$('.ls-layer', svg).map(g => ({ g, depth: Number(g.dataset.depth) || 0, x: 0, y: 0 }));
  let tx = 0, ty = 0;
  if (FINE) window.addEventListener('pointermove', e => {
    tx = (e.clientX / window.innerWidth - 0.5) * 2;
    ty = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  // Единый rAF-цикл; на паузе, когда вкладка скрыта
  const t0 = performance.now() + 120 + 5 * 260 + 400; // пакеты — после прорисовки
  let raf = 0;
  const frame = t => {
    raf = requestAnimationFrame(frame);
    if (t > t0) {
      CHAINS.forEach(ch => { if (t >= ch.next) { spawn(ch, t); ch.next = t + ch.every[0] + Math.random() * (ch.every[1] - ch.every[0]); } });
    }
    for (let i = packets.length - 1; i >= 0; i--) {
      const p = packets[i];
      let d = (t - p.born) / 1000 * p.speed;
      let k = 0;
      while (k < p.chain.parts.length && d > p.chain.lens[k]) { d -= p.chain.lens[k]; k++; }
      if (k >= p.chain.parts.length) { p.el.remove(); packets.splice(i, 1); arrive(); continue; }
      const pt = p.chain.parts[k].getPointAtLength(d);
      p.el.setAttribute('cx', pt.x.toFixed(1)); p.el.setAttribute('cy', pt.y.toFixed(1));
    }
    if (t - lastDigits > 120) {
      lastDigits = t;
      litres = litres > 58 ? 0 : litres + 0.06 + Math.random() * 0.05;
      digits.textContent = litres.toFixed(2).replace('.', ',');
    }
    if (FINE) layers.forEach(l => {
      l.x += (-tx * l.depth - l.x) * 0.08;
      l.y += (-ty * l.depth - l.y) * 0.08;
      l.g.setAttribute('transform', `translate(${l.x.toFixed(2)} ${l.y.toFixed(2)})`);
    });
  };
  raf = requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else { packets.forEach(p => p.el.remove()); packets.length = 0; raf = requestAnimationFrame(frame); }
  });
})();
