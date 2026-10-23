/* =========================================================
   СНК · Личный кабинет — Гашение купонов и талонов (useCoupons).
   Одна страница на оба вида: <body data-kind="coupon|ticket">.
   Камера (в прототипе — имитация распознавания), ручной ввод кода,
   проверка, погашение с подтверждением и отменой, список за смену.
   TODO: composables/useBarcodeScanner (zxing-wasm), stores/useCoupons.
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const D = window.SNC_DEMO, SNC = window.SNC, P = SNC.pa;
  const { esc, nf } = P;
  const TICKET = document.body.dataset.kind === 'ticket';
  const NOUN = TICKET ? { one: 'талон', One: 'Талон', gen: 'талона', acc: 'талон' } : { one: 'купон', One: 'Купон', gen: 'купона', acc: 'купон' };
  const scan = $('#scan'), cam = $('[data-cam]'), hint = $('[data-scan-hint]');
  const code = $('#cp-code'), res = $('#cp-result'), used = $('#cp-used tbody');
  const usedCodes = new Set(['1111111111']);
  let n = 0, camTimer = 0;

  // ввод кода: 000000-0000
  code.addEventListener('input', () => {
    const d = code.value.replace(/\D/g, '').slice(0, 10);
    code.value = d.length > 6 ? `${d.slice(0, 6)}-${d.slice(6)}` : d;
  });

  /* ---------- Камера: имитация — через 2,5 с «распознаёт» код ---------- */
  const stopCam = () => {
    clearTimeout(camTimer);
    scan.classList.remove('is-live');
    cam.setAttribute('aria-pressed', 'false');
    cam.querySelector('span').textContent = 'Включить камеру';
    hint.textContent = 'Камера выключена. Включите её или введите код ниже';
  };
  cam.addEventListener('click', () => {
    if (cam.getAttribute('aria-pressed') === 'true') return stopCam();
    scan.classList.add('is-live');
    cam.setAttribute('aria-pressed', 'true');
    cam.querySelector('span').textContent = 'Выключить камеру';
    hint.textContent = 'Наведите камеру на QR-код — он распознается сам';
    camTimer = setTimeout(() => {
      const c = `${String(100000 + Math.floor(Math.random() * 899999))}-${String(1000 + Math.floor(Math.random() * 8999))}`;
      code.value = c;
      stopCam();
      SNC.announce(`Распознан код ${c}`);
      check(c);
    }, 2500);
  });

  /* ---------- Проверка ---------- */
  const fuels = ['АИ-92', 'АИ-95', 'ДТ'];
  const check = c => {
    const digits = c.replace(/\D/g, '');
    if (digits === '0000000000') {
      res.innerHTML = `<div class="banner banner--err" role="alert"><svg class="ico" aria-hidden="true"><use href="#i-alert"/></svg><div class="banner__text">${NOUN.One} не найден<small>Проверьте код: ${esc(c)}. Если код верный, ${NOUN.one} выпущен другим продавцом — его здесь погасить нельзя.</small></div></div>`;
      return;
    }
    const k = Number(digits.slice(-3));
    const info = { code: c, fuel: fuels[k % 3], volume: [10, 20, 30, 50][k % 4], until: `${String(1 + (k % 28)).padStart(2, '0')}.12.2026`, owner: TICKET ? 'ООО «Демо-Логистик»' : 'Кузнецов П. А.' };
    const isUsed = usedCodes.has(digits);
    res.innerHTML = `<div style="display:grid;gap:14px">
      <div class="coupon-tkt${isUsed ? ' is-used' : ''}">
        <span class="coupon-tkt__code">${esc(c)}</span>
        <span class="coupon-tkt__vol">${nf.format(info.volume)}<small>л</small></span>
        <span><span class="wallet__name fuel-${P.fuel({ 'АИ-92': 'ai92', 'АИ-95': 'ai95', 'ДТ': 'dt' }[info.fuel]).series}"><i aria-hidden="true"></i>${esc(info.fuel)}</span></span>
      </div>
      <dl class="info-grid" style="grid-template-columns:1fr 1fr;gap:12px 20px">
        <div class="kv"><dt>Действует до</dt><dd class="mono">${info.until}</dd></div>
        <div class="kv"><dt>${TICKET ? 'Владелец талона' : 'Держатель'}</dt><dd>${esc(info.owner)}</dd></div>
      </dl>
      ${isUsed
        ? `<div class="banner banner--warn" role="alert"><svg class="ico" aria-hidden="true"><use href="#i-warn"/></svg><div class="banner__text">${NOUN.One} уже погашен<small>Повторно отпустить топливо по нему нельзя.</small></div></div>`
        : `<div class="banner banner--info" role="status"><svg class="ico" aria-hidden="true"><use href="#i-ok"/></svg><div class="banner__text">${NOUN.One} действует<small>Отпустите ${nf.format(info.volume)} л ${esc(info.fuel)}, затем погасите ${NOUN.acc}.</small></div></div>
           <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn--ghost btn--sm" type="button" data-cancel>Отмена</button><button class="btn btn--primary btn--sm" type="button" data-use><span>Погасить ${NOUN.acc}</span></button></div>`}
    </div>`;
    $('[data-cancel]', res)?.addEventListener('click', reset);
    $('[data-use]', res)?.addEventListener('click', () => use(info, digits));
    $('[data-use]', res)?.focus();
  };
  const reset = () => { code.value = ''; res.innerHTML = '<div class="empty" style="padding:32px 8px"><div class="empty__title">Можно проверять следующий</div><p class="empty__text">Отсканируйте или введите код.</p></div>'; code.focus(); };

  /* ---------- Погашение ---------- */
  const use = (info, digits) => SNC.confirm({
    title: `Погасить ${NOUN.acc} на ${info.volume} л ${info.fuel}?`, sub: info.code,
    items: [`${NOUN.One} станет недействительным`, `Погашение попадёт в отчёт смены № 1840`, 'Отменить можно в течение 8 секунд'], cta: 'Погасить', icon: 'i-coupon'
  }).then(ok => {
    if (!ok) return;
    usedCodes.add(digits); n++;
    $('[data-used-n]').textContent = n;
    used.querySelector('[data-empty]')?.remove();
    const time = new Date().toTimeString().slice(0, 5);
    used.insertAdjacentHTML('afterbegin', `<tr data-code="${digits}" class="is-changed"><td class="mono">${time}</td><td class="mono">${esc(info.code)}</td><td>${esc(info.fuel)}</td><td class="num-cell">${nf.format(info.volume)}</td><td>Оператор смены</td></tr>`);
    reset();
    SNC.toast({
      type: 'ok', title: `${NOUN.One} погашен`, text: `${info.code} · ${info.volume} л ${info.fuel}`, duration: 8000,
      action: { label: 'Вернуть', onClick: () => { usedCodes.delete(digits); n--; $('[data-used-n]').textContent = n; used.querySelector(`[data-code="${digits}"]`)?.remove(); SNC.toast({ type: 'info', title: 'Погашение отменено' }); } }
    });
  });

  $('#code-form').addEventListener('submit', e => {
    e.preventDefault();
    if (!SNC.validate(e.target)) return;
    check(code.value);
  });

  if (TICKET) {
    $('[data-kind-title]').textContent = 'Гашение талонов';
    $('[data-kind-code]').textContent = 'ТО-12';
    $('#h-scan').textContent = 'Код талона';
    document.title = document.title.replace('купонов', 'талонов');
  }
})();
