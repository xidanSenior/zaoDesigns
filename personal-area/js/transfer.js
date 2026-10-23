/* =========================================================
   СНК · Личный кабинет — Перенос остатков (transferBalances).
   Мастер из трёх шагов: карта-источник → карта-получатель и объём →
   проверка «откуда → куда» с последствиями. Объём не больше остатка.
   Шаги и проверка полей — общий степпер js/app.js; выбор карт проверяется здесь.
   TODO: stores/transferBalances — перенос на сервере, результат в «Журнале операций».
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const D = window.SNC_DEMO, SNC = window.SNC, P = SNC.pa;
  const { esc, nf } = P;
  const form = $('#xfer');
  const cards = D.cards.filter(c => !['returned', 'block'].includes(c.state));
  let fuel = 'ai95', from = null, to = null;
  const walletOf = c => c.wallets.find(w => w.fuel === fuel);

  const item = (c, name, checked, extra = '') => {
    const w = walletOf(c);
    return `<label class="pick-card"><span class="radio"><input type="radio" name="${name}" value="${c.id}"${checked ? ' checked' : ''}><span class="radio__dot"></span></span>
      <span style="min-width:0"><b class="mono" style="font-weight:500">${esc(c.number)}</b><span class="cell-sub">${esc(c.owner)} · ${esc(c.division)}${extra}</span></span>
      ${w ? P.lim(w) : '<span class="muted" style="font-size:12px">нет кошелька</span>'}</label>`;
  };
  const paintFrom = () => {
    const q = $('#x-q1').value.trim().toLowerCase();
    const list = cards.filter(c => walletOf(c) && P.rest(walletOf(c)).left > 0 && (!q || `${c.number} ${c.owner}`.toLowerCase().includes(q)));
    $('#x-from').innerHTML = list.map(c => item(c, 'from', c.id === from)).join('') || '<p class="muted" style="padding:16px">Нет карт с остатком в этом кошельке.</p>';
  };
  const paintTo = () => {
    const list = cards.filter(c => c.id !== from && walletOf(c)).sort((a, b) => P.rest(walletOf(a)).p - P.rest(walletOf(b)).p);
    $('#x-to').innerHTML = list.map(c => item(c, 'to', c.id === to, P.rest(walletOf(c)).low ? ' · <span class="st st--warn" style="padding:0 6px">мало лимита</span>' : '')).join('');
    const src = cards.find(c => c.id === from);
    const max = src ? Math.floor(P.rest(walletOf(src)).left) : 0;
    const vol = $('#x-vol');
    vol.max = max; vol.min = 1; vol.setAttribute('type', 'number');
    if (Number(vol.value) > max) vol.value = max;
    $('[data-x-max]').textContent = src ? `Можно перенести до ${nf.format(max)} л — весь остаток карты ${src.short}` : '';
  };
  $('#x-fuel').addEventListener('change', e => { fuel = e.target.value; from = null; to = null; paintFrom(); dirty(); });
  $('#x-q1').addEventListener('input', paintFrom);
  form.addEventListener('change', e => {
    if (e.target.name === 'from') { from = Number(e.target.value); $('#x-from-err').textContent = ''; }
    if (e.target.name === 'to') { to = Number(e.target.value); $('#x-to-err').textContent = ''; }
    dirty();
  });

  // Карта не выбрана — шаг не переключается (перехват до степпера)
  form.addEventListener('click', e => {
    if (!e.target.closest('[data-step-next]')) return;
    const step = form.snc?.step ?? 0;
    if (step === 0 && !from) { e.stopPropagation(); $('#x-from-err').textContent = 'Выберите карту, с которой переносится остаток'; $('#x-from input')?.focus(); return; }
    if (step === 1 && !to) { e.stopPropagation(); $('#x-to-err').textContent = 'Выберите карту, на которую переносится остаток'; $('#x-to input')?.focus(); return; }
    if (step === 0) paintTo();
    if (step === 1) setTimeout(summary);
  }, true);

  const summary = () => {
    const a = cards.find(c => c.id === from), b = cards.find(c => c.id === to);
    const v = Number($('#x-vol').value), wa = walletOf(a), wb = walletOf(b);
    const side = (k, c, w, delta) => `<div class="xfer__side"><small>${k}</small><b class="mono" style="font-weight:500">${esc(c.number)}</b><span>${esc(c.owner)}</span><span class="mono" style="font-size:13px">${esc(P.fuel(fuel).name)}: ${nf.format(P.rest(w).left)} → <b>${nf.format(Math.max(0, P.rest(w).left + delta))} л</b></span></div>`;
    $('#x-sum').innerHTML = `${side('Откуда', a, wa, -v)}<span class="xfer__arrow" aria-hidden="true"><svg class="ico" aria-hidden="true"><use href="#i-arrow"/></svg></span>${side('Куда', b, wb, v)}`;
    $('#x-cons').innerHTML = `<li>${nf.format(v)} л ${esc(P.fuel(fuel).name)} перейдут с карты ${a.short} на карту ${b.short} до конца месяца</li><li>Изменения запишутся на обе карты в течение 5 минут</li><li>Операция появится в «Журнале операций»; отменить её можно обратным переносом</li>`;
  };

  // Несохранённые изменения: предупреждение при уходе со страницы
  const note = $('.actionbar__note', form);
  let isDirty = false;
  const dirty = () => { isDirty = true; note.hidden = false; };
  window.addEventListener('beforeunload', e => { if (isDirty) { e.preventDefault(); e.returnValue = ''; } });

  form.addEventListener('submit', e => {
    e.preventDefault();
    // Enter в поле на первых шагах — это «Далее», а не перенос
    if (form.snc.step < 2) { $('[data-step-next]', form).click(); return; }
    const btn = $('[data-step-finish]', form);
    btn.dataset.loading = 'true';
    setTimeout(() => {
      delete btn.dataset.loading;
      isDirty = false; note.hidden = true;
      const a = cards.find(c => c.id === from), b = cards.find(c => c.id === to), v = Number($('#x-vol').value);
      walletOf(a).spent += v; walletOf(b).limit += v;
      SNC.toast({ type: 'ok', title: 'Остаток перенесён', text: `${nf.format(v)} л: ${a.short} → ${b.short}. Ход выполнения — в «Журнале операций».` });
      from = null; to = null; form.snc.go(0); paintFrom();
    }, 900);
  });
  paintFrom();
})();
