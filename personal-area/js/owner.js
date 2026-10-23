/* =========================================================
   СНК · Личный кабинет — Информация по карте (ownerInformation).
   Лицевая сторона карты, кошельки, бонусы, последние покупки,
   QR-код для оплаты с таймером 60 с, блокировка карты.
   TODO: stores/ownerInfo, stores/qrButton (QR — с сервера), stores/blockCard.
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const D = window.SNC_DEMO, SNC = window.SNC, P = SNC.pa;
  const { esc, nf, money } = P;
  const card = { ...D.ownerCard, wallets: D.ownerCard.wallets.map(w => ({ ...w })) };

  $('#own-face').innerHTML = P.face(card);
  $('#own-wallets').innerHTML = card.wallets.map(P.wallet).join('');
  $('#own-bonus').textContent = nf.format(card.bonus);
  $('#own-buys tbody').innerHTML = D.ownerPurchases.slice(0, 6).map(t => `<tr>
      <td class="mono">${t.date}</td><td>${esc(t.station)}<span class="cell-sub">${esc(t.address)}</span></td>
      <td><span class="wallet__name fuel-${P.fuel(t.fuelId).series}" style="font-weight:600"><i aria-hidden="true"></i>${esc(t.fuel)}</span></td>
      <td class="num-cell">${nf.format(t.volume)}</td><td class="num-cell">${money(t.cost)}</td>
      <td class="num-cell"><span class="delta delta--good">+${t.bonusIn}</span>${t.bonusOut ? ` <span class="mono">−${t.bonusOut}</span>` : ''}</td></tr>`).join('');
  $('#own-promo').innerHTML = D.promotions.filter(p => p.st !== 'off').slice(0, 2).map(p => `<a class="quick__item" href="promotions.html"><svg class="ico" aria-hidden="true"><use href="#i-${p.kind === 'Тариф' ? 'percent' : 'gift'}"/></svg><span>${esc(p.title)}<small>${p.kind === 'Тариф' ? 'тариф' : `до ${esc(p.until)}`}</small></span></a>`).join('');

  /* ---------- QR-код ----------
     Узор детерминированный от номера и времени (заглушка). Три «глаза» по углам — как у настоящего QR. */
  const svg = $('#qr-svg'), box = $('#qr-box'), over = $('#qr-over'), ring = $('#qr-ring'), tEl = $('#qr-t');
  const L = 2 * Math.PI * 11;
  ring.style.strokeDasharray = L;
  let tId = 0;
  const draw = seed => {
    let s = seed;
    const r = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
    const eye = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7" fill="var(--text)"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="var(--bg)"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="var(--text)"/>`;
    const inEye = (x, y) => (x < 8 && y < 8) || (x > 20 && y < 8) || (x < 8 && y > 20);
    let cells = '';
    for (let y = 0; y < 29; y++) for (let x = 0; x < 29; x++) if (!inEye(x, y) && r() > 0.52) cells += `M${x},${y}h1v1h-1z`;
    svg.innerHTML = `<rect width="29" height="29" fill="var(--bg)"/><path d="${cells}" fill="var(--text)"/>${eye(0, 0)}${eye(22, 0)}${eye(0, 22)}<rect x="12" y="12" width="5" height="5" rx="1" fill="var(--bg)"/><rect x="13" y="13" width="3" height="3" fill="var(--accent)"/>`;
  };
  const start = () => {
    clearInterval(tId);
    draw(Date.now() % 100000);
    box.classList.remove('is-expired'); over.hidden = true;
    let left = 60;
    const paint = () => {
      ring.style.strokeDashoffset = String(L * (1 - left / 60));
      tEl.textContent = left > 0 ? `Действует ${left} сек.` : 'QR-код больше не действует — обновите его';
    };
    paint();
    tId = setInterval(() => {
      left--;
      paint();
      if (left === 10) SNC.announce('QR-код перестанет действовать через 10 секунд');
      if (left <= 0) { clearInterval(tId); box.classList.add('is-expired'); over.hidden = false; $('[data-qr-refresh]').focus(); }
    }, 1000);
  };
  $('[data-qr]').addEventListener('click', e => { start(); SNC.dialog.open('dlg-qr', e.currentTarget); });
  $('[data-qr-refresh]').addEventListener('click', start);
  $('#dlg-qr').addEventListener('close', () => clearInterval(tId));

  /* ---------- Блокировка ---------- */
  $('[data-block]').addEventListener('click', () => SNC.confirm({
    title: 'Заблокировать карту?', sub: `${card.number} · ${card.owner}`,
    items: ['Карта перестанет обслуживаться на всех точках через 1–5 минут', 'Остатки лимитов и бонусы сохранятся', 'Разблокировать карту сможет организация-владелец или служба поддержки'],
    cta: 'Заблокировать', icon: 'i-block'
  }).then(ok => {
    if (!ok) return;
    card.state = 'block';
    $('#own-face').innerHTML = P.face(card);
    const st = $('#own-st'); st.className = 'st st--err'; st.textContent = 'Карта заблокирована';
    const b = $('[data-block]'); b.disabled = true; b.querySelector('span').textContent = 'Заблокирована';
    $('[data-qr]').disabled = true;
    SNC.toast({ type: 'ok', title: 'Карта заблокирована', text: 'Если карта найдётся, позвоните 8 800 250-05-34 — её разблокируют.' });
  }));
})();
