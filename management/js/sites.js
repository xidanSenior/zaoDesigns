/* =========================================================
   СНК · Управление продуктами — «Сайты»: список сайтов (SitesList.vue).
   Домен со ссылкой на сайт, юрлицо, включение с подтверждением,
   живой статус сборки, пересборка одного и всех, добавление сайта,
   статус контракта блоков с загрузкой манифеста. TODO: API /admin/sites.
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const K = window.SNC_SITEKIT, SNC = window.SNC, S = K.S;
  const { esc, ico } = K;
  const tbody = $('#sites-table tbody');

  const row = s => {
    const why = K.blockReason(s);
    return `<tr data-site="${s.id}">
      <td class="cell-main"><span class="site-dom"><a href="site.html?site=${s.id}">${esc(s.domain)}</a><a class="icon-btn icon-btn--sm" href="https://${esc(s.domain)}" target="_blank" rel="noopener noreferrer" data-tip="Открыть сайт в новом окне" aria-label="Открыть ${esc(s.domain)} в новом окне">${ico('i-external')}</a></span></td>
      <td>${esc(s.legalName)}</td>
      <td data-v="${s.enabled ? 1 : 0}"><span class="st st--${s.enabled ? 'ok' : 'off'}">${s.enabled ? 'Включён' : 'Выключен'}</span></td>
      <td><label class="sw"><input type="checkbox" data-toggle${s.enabled ? ' checked' : ''}><span class="sw__track"></span><span class="sr-only">Сайт ${esc(s.domain)} включён</span></label></td>
      <td>${K.badge(s)}${s.stale && !['queued', 'running', 'never'].includes(s.build) ? `<span class="stale-dot" role="img" data-tip="Правки новее последней сборки — на сайте старая версия" aria-label="Есть несобранные правки">${ico('i-warn')}</span>` : ''}</td>
      <td class="mono muted">${s.build === 'running' ? 'идёт…' : esc(s.builtAt || '—')}</td>
      <td class="col-actions3"><span class="row-acts">
        <span data-tip="${esc(why || 'Пересобрать')}"><button class="icon-btn icon-btn--sm" type="button" data-rebuild ${why ? 'disabled' : ''} aria-label="Пересобрать ${esc(s.domain)}">${ico('i-refresh')}</button></span>
        <a class="icon-btn icon-btn--sm" href="site.html?site=${s.id}#content/pages" data-tip="Страницы сайта" aria-label="Страницы ${esc(s.domain)}">${ico('i-file')}</a>
        <a class="icon-btn icon-btn--sm" href="site.html?site=${s.id}#settings/general" data-tip="Настройки сайта" aria-label="Настройки ${esc(s.domain)}">${ico('i-settings')}</a>
      </span></td></tr>`;
  };
  const render = () => {
    tbody.innerHTML = S.sites.length ? S.sites.map(row).join('') : `<tr><td colspan="7"><div class="empty"><div class="empty__title">Сайтов пока нет</div><p class="empty__text">Добавьте первый сайт — домен и юрлицо, остальное настроите потом.</p></div></td></tr>`;
    $('[data-s-total]').textContent = S.sites.length;
    $('[data-s-on]').textContent = S.sites.filter(s => s.enabled).length;
  };
  // при смене статуса перерисовываем одну строку, а не всю таблицу — фокус и наведение не теряются
  K.onChange(s => {
    const tr = $(`tr[data-site="${s.id}"]`);
    if (!tr) return render();
    tr.outerHTML = row(s);
    $(`tr[data-site="${s.id}"]`).classList.add('is-changed');
    $('[data-s-on]').textContent = S.sites.filter(x => x.enabled).length;
  });

  tbody.addEventListener('click', e => {
    const tr = e.target.closest('tr[data-site]'); if (!tr) return;
    const s = S.sites.find(x => x.id === Number(tr.dataset.site));
    if (e.target.closest('[data-rebuild]')) K.askRebuild(s);
    const t = e.target.closest('[data-toggle]');
    if (t) { e.preventDefault(); K.askToggle(s, !s.enabled); } // переключатель — только после подтверждения
  });

  $('[data-rebuild-all]').addEventListener('click', async () => {
    const ready = S.sites.filter(s => !K.blockReason(s));
    if (!ready.length) { SNC.toast({ type: 'info', title: 'Нечего собирать', text: 'Нет включённых сайтов с опубликованной главной.' }); return; }
    if (!await SNC.confirm({ title: 'Собрать все сайты?', sub: `Сайтов к сборке: ${ready.length}`, icon: 'i-refresh', cta: 'Собрать все',
      items: [`Пересоберутся: ${ready.map(s => s.domain).join(', ')}`, 'Выключенные сайты и сайты без опубликованной главной пропускаются', 'Сборки идут по очереди; ход — в колонке «Сборка»'] })) return;
    ready.forEach((s, i) => setTimeout(() => K.rebuild(s), i * 400));
    SNC.toast({ type: 'info', title: `Запущена пересборка сайтов: ${ready.length}` });
  });

  /* ---------- Контракт блоков ---------- */
  $('[data-contract-line]').textContent = `Контракт блоков ${S.contract.version} · рендер ${S.contract.commit} · ${S.contract.source}`;
  $('[data-contract-upload]').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    if (!/\.json$/i.test(f.name)) { SNC.toast({ type: 'err', title: 'Не удалось загрузить манифест', text: 'Нужен файл .json от builder-worker.' }); return; }
    S.contract.version = 'v15'; S.contract.source = 'загружен вручную';
    $('[data-contract-line]').textContent = `Контракт блоков ${S.contract.version} · рендер ${S.contract.commit} · ${S.contract.source}`;
    SNC.toast({ type: 'ok', title: 'Манифест принят', text: f.name });
    e.target.value = '';
  });

  /* ---------- Добавление сайта ---------- */
  const form = $('#form-site-add');
  const dom = $('#sa-domain');
  dom.addEventListener('input', () => { dom.setCustomValidity(''); });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const v = dom.value.trim().toLowerCase();
    dom.value = v;
    if (S.sites.some(s => s.domain === v)) { dom.dataset.err = 'Сайт с таким доменом уже существует'; dom.setCustomValidity('taken'); }
    else { dom.dataset.err = 'Домен латиницей, например snc-service.ru'; dom.setCustomValidity(''); }
    if (!SNC.validate(form)) return;
    const s = { id: Math.max(...S.sites.map(x => x.id)) + 1, domain: v, legalName: $('#sa-legal').value.trim(), enabled: $('#sa-enabled').checked, build: 'never', builtAt: '', took: 0, stale: false, subscribers: 0, releaseNews: false, locale: 'ru' };
    S.sites.push(s); K.persist();
    SNC.dialog.close('dlg-site-add'); form.reset();
    render();
    $(`tr[data-site="${s.id}"]`).classList.add('is-changed');
    SNC.toast({ type: 'ok', title: 'Сайт создан', text: `${s.domain}: добавьте главную страницу в «Контент → Страницы»`, action: { label: 'Открыть', onClick: () => { location.href = `site.html?site=${s.id}#content/pages`; } } });
  });

  render();
})();
