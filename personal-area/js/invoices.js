/* =========================================================
   СНК · Личный кабинет — Выписка счёта (invoices).
   Форма (договор, сумма, e-mail) и живой предпросмотр счёта:
   сумма, НДС, итог и сумма прописью. ?sum= подставляет сумму
   (переход из «Статистики» с рекомендуемой суммой).
   TODO: stores/invoices — PDF формирует сервер (pdfFile), отправка — feedback/e-mail.
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const D = window.SNC_DEMO, SNC = window.SNC, P = SNC.pa;
  const { money } = P;
  const form = $('#inv-form');
  const sum = $('#iv-sum'), contract = $('#iv-contract');
  contract.innerHTML = D.contracts.filter(c => c.st !== 'off').map(c => `<option value="${c.number}">${c.number} · ${c.name}</option>`).join('');

  /* Сумма прописью: рубли и копейки */
  const words = n => {
    const ones = [['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'], ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять']];
    const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
    const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
    const hund = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
    const forms = [['', '', ''], ['тысяча', 'тысячи', 'тысяч'], ['миллион', 'миллиона', 'миллионов'], ['миллиард', 'миллиарда', 'миллиардов']];
    const pl = (n, f) => P.plural(n, f[0], f[1], f[2]);
    const tri = (v, fem) => { const h = Math.floor(v / 100), t = Math.floor(v / 10) % 10, o = v % 10; return [hund[h], t === 1 ? teens[o] : tens[t], t === 1 ? '' : ones[fem ? 1 : 0][o]].filter(Boolean).join(' '); };
    const rub = Math.floor(n), kop = Math.round((n - rub) * 100);
    if (!rub) return `Ноль рублей ${String(kop).padStart(2, '0')} копеек`;
    const parts = []; let v = rub, i = 0;
    while (v > 0) { const t = v % 1000; if (t) parts.unshift(`${tri(t, i === 1)}${i ? ` ${pl(t, forms[i])}` : ''}`); v = Math.floor(v / 1000); i++; }
    const s = `${parts.join(' ')} ${P.plural(rub, 'рубль', 'рубля', 'рублей')} ${String(kop).padStart(2, '0')} ${P.plural(kop, 'копейка', 'копейки', 'копеек')}`.replace(/\s+/g, ' ');
    return s[0].toUpperCase() + s.slice(1);
  };
  const parse = v => Number(String(v).replace(/\s/g, '').replace(',', '.')) || 0;
  const paint = () => {
    const v = Math.round(parse(sum.value) * 100) / 100;
    $('[data-iv-sum]').textContent = money(v);
    $('[data-iv-vat]').textContent = money(v * 20 / 120);
    $('[data-iv-total]').textContent = `${money(v)} ₽`;
    $('[data-iv-words]').textContent = words(v);
    $('[data-iv-what]').textContent = `Предоплата за нефтепродукты по договору ${contract.value}`;
    $$('[data-sum]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.sum) === v)));
  };
  // ввод суммы: пробелы между разрядами
  sum.addEventListener('input', () => {
    const [i, d] = sum.value.replace(/[^\d,.]/g, '').replace('.', ',').split(',');
    sum.value = (i || '').replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (d !== undefined ? `,${d.slice(0, 2)}` : '');
    paint();
  });
  contract.addEventListener('change', paint);
  $$('[data-sum]').forEach(b => b.addEventListener('click', () => { sum.value = Number(b.dataset.sum).toLocaleString('ru-RU'); sum.closest('.fld').classList.remove('is-invalid'); paint(); }));
  const q = new URLSearchParams(location.search).get('sum');
  if (q) sum.value = Number(q).toLocaleString('ru-RU');
  paint();

  const ready = () => {
    if (!SNC.validate(form)) return false;
    if (parse(sum.value) <= 0) { const f = sum.closest('.fld'); f.classList.add('is-invalid'); f.querySelector('.fld__err').textContent = 'Сумма должна быть больше нуля'; sum.focus(); return false; }
    return true;
  };
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!ready()) return;
    const btn = $('.btn--submit', form);
    btn.dataset.state = 'loading';
    setTimeout(() => {
      btn.dataset.state = 'success';
      SNC.toast({ type: 'ok', title: `Счёт ${$('[data-iv-num]').textContent} сформирован`, text: `${money(parse(sum.value))} ₽. Файл PDF скачивается; копия — в «Документах».` });
      setTimeout(() => { btn.dataset.state = 'idle'; }, 1600);
    }, 900);
  });
  $('[data-send]').addEventListener('click', () => {
    const mail = $('#iv-email');
    if (!ready()) return;
    if (!mail.value.trim()) { const f = mail.closest('.fld'); f.classList.add('is-invalid'); f.querySelector('.fld__err').textContent = 'Укажите e-mail, куда отправить счёт'; mail.focus(); return; }
    if (!SNC.validate(mail.closest('.fld'))) return;
    SNC.toast({ type: 'ok', title: 'Счёт отправлен', text: `На ${mail.value.trim()}` });
  });
})();
