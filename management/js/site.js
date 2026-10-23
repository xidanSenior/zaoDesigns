/* =========================================================
   СНК · Управление продуктами — экран сайта (SitesLayout + SiteContentLayout + SiteSettingsLayout).
   ?site=<id>#<раздел>/<вкладка>: «Контент» — меню, страницы, новости, справочники, редиректы;
   «Настройки» — общее, тема, контакты, поиск и превью, модули, подвал (у каждой вкладки своё «Сохранить»).
   Наверху — статус сборки; правка включённого сайта запускает автосборку. TODO: API /admin/sites/:id/*.
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const K = window.SNC_SITEKIT, SNC = window.SNC, S = K.S;
  const { esc, ico } = K;
  const site = K.site();
  const set = S.siteSettings;

  /* ---------- Шапка: сайт, переключатель сайтов, статус сборки ---------- */
  document.title = `${site.domain} · Сайты · Управление продуктами СНК`;
  $('.crumbs [aria-current]').textContent = site.domain;
  $('[data-site-domain]').textContent = site.domain;
  $('[data-site-open]').href = `https://${site.domain}`;
  $('[data-site-legal]').textContent = site.legalName;
  const head = () => {
    $('[data-site-state]').innerHTML = `<span class="st st--${site.enabled ? 'ok' : 'off'}">${site.enabled ? 'Сайт включён' : 'Сайт выключен'}</span>`;
    $('[data-site-pages]').textContent = S.sitePages.length;
    $('[data-site-subs]').textContent = site.subscribers;
    $('[data-bstat-host]').innerHTML = K.statusHtml(site);
  };
  head();
  K.onChange(s => { if (s.id === site.id) head(); });
  const pick = $('[data-site-pick]');
  pick.innerHTML = S.sites.map(s => `<option value="${s.id}"${s.id === site.id ? ' selected' : ''}>${esc(s.domain)}</option>`).join('');
  // выбор сайта сохраняет раздел и вкладку — как выбор сайта в шапке боевого приложения
  pick.addEventListener('change', async () => {
    if (!await leaveOk()) { pick.value = site.id; return; }
    dirty.clear();
    location.href = `site.html?site=${pick.value}${location.hash}`;
  });
  $('[data-bstat-host]').addEventListener('click', e => {
    if (e.target.closest('[data-rebuild]')) K.askRebuild(site);
    if (e.target.closest('[data-build-log]')) { $('[data-log-sub]').textContent = `${site.domain} · ${site.builtAt}`; $('[data-log]').textContent = K.log(site); SNC.dialog.open('drawer-log'); }
  });

  /* ---------- Несохранённые изменения на вкладках настроек и в меню ---------- */
  const dirty = new Set();
  const markDirty = (id, on) => {
    on ? dirty.add(id) : dirty.delete(id);
    const note = $(`#p-${id} .actionbar__note`); if (note) note.hidden = !on;
  };
  const leaveOk = async () => !dirty.size || SNC.confirm({ title: 'Несохранённые изменения', sub: 'На вкладке есть несохранённые изменения.', icon: 'i-warn', cta: 'Уйти без сохранения', items: ['Изменения на вкладке пропадут', 'Чтобы их сохранить, нажмите «Остаться», затем «Сохранить»'] });
  window.addEventListener('beforeunload', e => { if (dirty.size) { e.preventDefault(); e.returnValue = ''; } });

  // Уйти без сохранения: черновики меню и модулей возвращаются к сохранённым, формы перерисовываются
  function discardAll() {
    [...dirty].forEach(id => {
      markDirty(id, false);
      if (id === 'menu') menu = JSON.parse(JSON.stringify(S.siteMenu));
      if (id === 'modules') mods = draftMods();
      render[id]?.();
    });
  }

  /* ---------- Раздел и вкладка: #content/pages, #settings/seo ---------- */
  const lists = { content: $('[data-tabs="content"]'), settings: $('[data-tabs="settings"]') };
  const lastTab = { content: 'pages', settings: 'general' };
  let section = 'content';
  const showSection = (sec, tab) => {
    section = sec;
    $$('[data-section]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.section === sec)));
    Object.entries(lists).forEach(([k, l]) => {
      l.hidden = k !== sec;
      if (k !== sec) $$('[role="tab"]', l).forEach(t => { $(`#${t.getAttribute('aria-controls')}`).hidden = true; });
    });
    ($(`#t-${tab || lastTab[sec]}`) || $('[role="tab"]', lists[sec])).click();
  };
  $$('[data-section]').forEach(b => b.addEventListener('click', async () => {
    if (b.dataset.section === section || !await leaveOk()) return;
    discardAll();
    showSection(b.dataset.section);
  }));
  // Уход с вкладки с несохранёнными правками — подтверждение до переключения
  Object.values(lists).forEach(l => l.addEventListener('click', async e => {
    const t = e.target.closest('[role="tab"]');
    if (!t || t.getAttribute('aria-selected') === 'true' || !dirty.size || t.dataset.go) { if (t) delete t.dataset.go; return; }
    e.stopImmediatePropagation();
    if (!await leaveOk()) return;
    discardAll();
    t.dataset.go = '1'; t.click();
  }, true));
  Object.entries(lists).forEach(([sec, l]) => l.addEventListener('tabs:change', e => {
    if (l.hidden) return;
    const id = e.detail.tab.id.slice(2);
    lastTab[sec] = id;
    history.replaceState(null, '', `#${sec}/${id}`);
  }));

  /* ---------- Общие помощники ---------- */
  const tag = (t, tone = 'off') => `<span class="st st--${tone}">${esc(t)}</span>`;
  const iconBtn = (act, icon, tip, extra = '') => `<button class="icon-btn icon-btn--sm" type="button" data-act="${act}" data-tip="${esc(tip)}" aria-label="${esc(tip)}"${extra}>${ico(icon)}</button>`;
  const table = (cap, cols, rows, empty) => rows.length
    ? `<div class="dt"><div class="dt__scroll"><table class="table"><caption class="sr-only">${esc(cap)}</caption><thead><tr>${cols.map(c => `<th scope="col"${c.cls ? ` class="${c.cls}"` : ''}>${c.t ? esc(c.t) : '<span class="sr-only">Действия</span>'}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div></div>`
    : `<div class="dt"><div class="empty"><svg class="empty__art" viewBox="0 0 176 112" aria-hidden="true"><rect class="bp-soft" x="8" y="8" width="160" height="96" rx="4"/><path class="bp" d="M28 30h120M28 50h120M28 70h72"/><path class="bp-accent" d="M120 70h28M134 56v28"/></svg><div class="empty__title">${empty}</div></div></div>`;
  const bar = (text, actions) => `<div class="tab-intro"><p class="muted">${text}</p><div class="tab-intro__acts">${actions}</div></div>`;
  const banner = (tone, icon, text, small = '') => `<div class="banner banner--${tone}" role="status">${ico(icon)}<div class="banner__text">${text}${small ? `<small>${small}</small>` : ''}</div></div>`;
  const changed = (title, text = '') => {
    const how = K.touched(site);
    SNC.toast({ type: 'ok', title, text: text || how });
  };
  const undoToast = (title, undo) => SNC.toast({ type: 'ok', title, action: { label: 'Вернуть', onClick: undo }, duration: 8000 });
  const move = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return false; [arr[i], arr[j]] = [arr[j], arr[i]]; return true; };

  /* ---------- Универсальная модалка записи ----------
     fields: { key, label, type: text|mono|textarea|select|switch|num, value, required, span, options, hint, pattern, err, placeholder, show(values) } */
  const fForm = $('#form-edit');
  let fCtx = null;
  const fieldHtml = f => {
    const id = `fe-${f.key}`, span = `span-${f.span || 12}`, req = f.required ? ' required' : '';
    const label = `<label class="fld__label" for="${id}">${esc(f.label)}${f.required ? ' <span class="fld__req" aria-hidden="true">*</span>' : ''}</label>`;
    const hint = f.hint ? `<span class="fld__hint">${esc(f.hint)}</span>` : '';
    const attrs = `id="${id}" name="${f.key}"${req}${f.pattern ? ` pattern="${esc(f.pattern)}"` : ''}${f.err ? ` data-err="${esc(f.err)}"` : ''}${f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : ''}`;
    let ctl;
    if (f.type === 'switch') return `<div class="fld ${span}" data-key="${f.key}"><label class="sw"><input type="checkbox" ${attrs}${f.value ? ' checked' : ''}><span class="sw__track"></span>${esc(f.label)}</label>${hint}</div>`;
    if (f.type === 'select') ctl = `<select class="in" ${attrs}>${f.options.map(o => { const [v, t] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}"${String(v) === String(f.value ?? '') ? ' selected' : ''}>${esc(t)}</option>`; }).join('')}</select>`;
    else if (f.type === 'textarea') ctl = `<textarea class="in" ${attrs} style="min-height:${f.rows || 96}px">${esc(f.value ?? '')}</textarea>`;
    else ctl = `<input class="in${f.type === 'mono' || f.type === 'num' ? ' in--mono' : ''}" ${attrs}${f.type === 'num' ? ' inputmode="decimal"' : ''} value="${esc(f.value ?? '')}" autocomplete="off" spellcheck="false">`;
    return `<div class="fld ${span}" data-key="${f.key}">${label}${ctl}${hint}<span class="fld__err"></span></div>`;
  };
  const values = () => Object.fromEntries($$('[name]', fForm).map(el => [el.name, el.type === 'checkbox' ? el.checked : el.value.trim()]));
  const syncShow = () => { if (!fCtx) return; const v = values(); fCtx.fields.forEach(f => { if (!f.show) return; const box = $(`[data-key="${f.key}"]`, fForm); const on = f.show(v); box.hidden = !on; $$('input, select, textarea', box).forEach(el => { el.disabled = !on; }); }); };
  const edit = ctx => {
    fCtx = ctx;
    $('#dlg-edit-t').textContent = ctx.title;
    $('[data-edit-sub]').textContent = ctx.sub || site.domain;
    $('[data-edit-cta]').textContent = ctx.cta || 'Сохранить';
    $('[data-edit-fields]').innerHTML = ctx.fields.map(fieldHtml).join('') + (ctx.note ? `<p class="span-12 fld__hint dlg-note">${esc(ctx.note)}</p>` : '');
    syncShow();
    SNC.dialog.open('dlg-edit');
    requestAnimationFrame(() => $('input:not([type=checkbox]), select, textarea', fForm)?.focus());
  };
  fForm.addEventListener('change', syncShow);
  fForm.addEventListener('input', e => { if (e.target.setCustomValidity) e.target.setCustomValidity(''); });
  fForm.addEventListener('submit', e => {
    e.preventDefault();
    const v = values();
    // проверки, которых нет в HTML: занятый адрес, цикл редиректов… — текст ошибки в поле
    const errs = fCtx.check?.(v) || {};
    $$('[name]', fForm).forEach(el => { const msg = errs[el.name]; if (msg) { el.dataset.err = msg; el.setCustomValidity(msg); } });
    if (!SNC.validate(fForm)) return;
    SNC.dialog.close('dlg-edit');
    fCtx.save(v);
  });

  const render = {};

  // ===== Контент и настройки дописываются ниже =====
  /* ================= КОНТЕНТ ================= */
  const pageBySlug = slug => S.sitePages.find(p => p.slug === slug);
  const pageOptions = () => [['', 'Главная'], ...S.sitePages.filter(p => p.slug).map(p => [p.slug, `${p.title} · /${p.slug}`])];
  const slugOk = '[a-z0-9]+(-[a-z0-9]+)*(/[a-z0-9]+(-[a-z0-9]+)*)*';

  /* ---------- Меню: дерево пунктов, порядок, дочерние пункты ---------- */
  const MENU_TYPES = { page: 'Страница', external: 'Внешняя ссылка', section: 'Раздел', anchor: 'Якорь секции', catalog: 'Каталог (из справочника)' };
  let menu = JSON.parse(JSON.stringify(S.siteMenu));
  const menuTarget = it => {
    if (it.type === 'page') { const p = pageBySlug(it.target); return p ? `<span class="mono">/${esc(it.target)}</span>` : `<span class="st st--plain st--warn">Страница не найдена: пункт ведёт в никуда</span>`; }
    if (it.type === 'anchor') return `<span class="mono">#${esc(it.target)}</span>`;
    if (it.type === 'catalog') return `<span class="mono">/${esc(it.target)}</span> <span class="muted">· подпункты — категории справочника</span>`;
    return `<span class="mono">${esc(it.target)}</span>`;
  };
  const menuItem = (it, i, list, parent) => `<li class="mtree__item" data-mid="${it.id}">
      <div class="mtree__row${parent ? ' mtree__row--child' : ''}">
        <span class="mtree__label">${esc(it.label)}</span><span class="mtree__type">${MENU_TYPES[it.type]}</span><span class="mtree__target">${menuTarget(it)}</span>
        <span class="row-acts">
          ${iconBtn('up', 'i-up', 'Выше', i === 0 ? ' disabled' : '')}${iconBtn('down', 'i-down', 'Ниже', i === list.length - 1 ? ' disabled' : '')}
          ${parent ? '' : iconBtn('child', 'i-plus', 'Дочерний пункт')}${iconBtn('edit', 'i-edit', 'Редактировать пункт')}${iconBtn('del', 'i-trash', 'Удалить')}
        </span>
      </div>
      ${!parent && it.children?.length ? `<ol class="mtree mtree--sub">${it.children.map((c, j, l) => menuItem(c, j, l, it)).join('')}</ol>` : ''}
    </li>`;
  render.menu = () => {
    $('#p-menu').innerHTML = bar('Пункты меню в шапке сайта. Подпункты раскрываются при наведении; у пункта «Каталог» подпункты — категории справочника, они добавляются сами.',
      `<button class="btn btn--outline btn--sm" type="button" data-menu-add>${ico('i-plus')}<span>Добавить пункт</span></button>`)
      + `<div class="panel">${menu.length ? `<ol class="mtree">${menu.map((it, i, l) => menuItem(it, i, l)).join('')}</ol>` : '<div class="empty"><div class="empty__title">Меню пустое — добавьте пункты</div></div>'}
      <div class="actionbar"><span class="actionbar__note" hidden>Есть несохранённые изменения</span><button class="btn btn--ghost btn--sm" type="button" data-menu-reset><span>Отменить</span></button><button class="btn btn--primary btn--sm" type="button" data-menu-save><span>Сохранить</span></button></div></div>`;
    markDirty('menu', dirty.has('menu'));
  };
  const findMenu = id => { for (const it of menu) { if (it.id === id) return [it, menu]; const c = (it.children || []).find(x => x.id === id); if (c) return [c, it.children, it]; } return []; };
  const menuDialog = (it, parent) => edit({
    title: it ? 'Редактировать пункт' : parent ? `Дочерний пункт «${parent.label}»` : 'Добавить пункт',
    fields: [
      { key: 'label', label: 'Название', type: 'text', required: true, value: it?.label },
      { key: 'type', label: 'Тип', type: 'select', span: 6, value: it?.type || 'page', options: Object.entries(MENU_TYPES).filter(([k]) => !parent || k !== 'catalog') },
      { key: 'page', label: 'Страница сайта', type: 'select', span: 6, value: it?.type === 'page' ? it.target : '', options: pageOptions(), show: v => v.type === 'page' },
      { key: 'url', label: 'Ссылка (URL)', type: 'mono', span: 6, required: true, value: it?.type === 'external' ? it.target : '', pattern: 'https?://.+', err: 'Полный адрес, например https://lk.sncard.ru', placeholder: 'https://', show: v => v.type === 'external' },
      { key: 'anchor', label: 'Якорь секции', type: 'mono', span: 6, required: true, value: it?.type === 'anchor' ? it.target : '', hint: 'id секции на главной, например map', pattern: '[a-z0-9-]+', err: 'Латиница, цифры и дефис', show: v => v.type === 'anchor' },
      { key: 'section', label: 'Раздел (slug)', type: 'mono', span: 6, required: true, value: ['section', 'catalog'].includes(it?.type) ? it.target : '', pattern: slugOk, err: 'Латиница, цифры и дефис', hint: 'Подпункты — категории справочника, добавляются автоматически', show: v => v.type === 'section' || v.type === 'catalog' }
    ],
    save: v => {
      const target = { page: v.page, external: v.url, anchor: v.anchor, section: v.section, catalog: v.section }[v.type];
      if (it) Object.assign(it, { label: v.label, type: v.type, target });
      else (parent ? parent.children : menu).push({ id: Date.now(), label: v.label, type: v.type, target, children: [] });
      markDirty('menu', true); render.menu();
    }
  });
  $('#p-menu').addEventListener('click', e => {
    if (e.target.closest('[data-menu-add]')) return menuDialog();
    if (e.target.closest('[data-menu-save]')) { S.siteMenu.splice(0, S.siteMenu.length, ...JSON.parse(JSON.stringify(menu))); markDirty('menu', false); changed('Меню сохранено'); return; }
    if (e.target.closest('[data-menu-reset]')) { menu = JSON.parse(JSON.stringify(S.siteMenu)); markDirty('menu', false); render.menu(); return; }
    const b = e.target.closest('[data-act]'), li = e.target.closest('[data-mid]'); if (!b || !li) return;
    const [it, list] = findMenu(Number(li.dataset.mid)), i = list.indexOf(it);
    const act = b.dataset.act;
    if (act === 'up' || act === 'down') { move(list, i, act === 'up' ? -1 : 1); markDirty('menu', true); render.menu(); $(`[data-mid="${it.id}"] [data-act="${act}"]`)?.focus(); $(`[data-mid="${it.id}"] > .mtree__row`).classList.add('is-changed'); }
    if (act === 'child') menuDialog(null, it);
    if (act === 'edit') menuDialog(it);
    if (act === 'del') { list.splice(i, 1); markDirty('menu', true); render.menu(); undoToast(`Пункт «${it.label}» удалён`, () => { list.splice(i, 0, it); render.menu(); }); }
  });

  /* ---------- Страницы ---------- */
  render.pages = () => {
    $('[data-count="pages"]').textContent = S.sitePages.length;
    $('#p-pages').innerHTML = bar('Страница собирается из блоков. Черновик на сайте не виден; опубликованная появляется после сборки.',
      `<button class="btn btn--primary btn--sm" type="button" data-page-add>${ico('i-plus')}<span>Добавить страницу</span></button>`)
      + table('Страницы сайта', [{ t: 'Адрес' }, { t: 'Заголовок' }, { t: 'Блоков', cls: 'num-cell' }, { t: 'Статус' }, { t: 'Изменена' }, { cls: 'col-actions3' }],
        S.sitePages.map(p => `<tr data-pid="${p.id}"><td class="mono">${p.slug ? `/${esc(p.slug)}` : '<span class="st st--plain st--info">главная</span>'}</td>
          <td class="cell-main"><a href="site-page.html?site=${site.id}&page=${p.id}">${esc(p.title)}</a></td><td class="num-cell">${p.blocks}</td>
          <td>${p.status === 'published' ? tag('Опубликована', 'ok') : tag('Черновик')}</td><td class="mono muted">${esc(p.updated)}</td>
          <td class="col-actions3"><span class="row-acts">${iconBtn('pub', p.status === 'published' ? 'i-eye-off' : 'i-eye', p.status === 'published' ? 'Вернуть в черновик' : 'Опубликовать')}
            <a class="icon-btn icon-btn--sm" href="site-page.html?site=${site.id}&page=${p.id}" data-tip="Страница: поля и блоки" aria-label="Редактировать ${esc(p.title)}">${ico('i-edit')}</a>${iconBtn('del', 'i-trash', 'Удалить страницу')}</span></td></tr>`), 'Страниц пока нет');
  };
  $('#p-pages').addEventListener('click', async e => {
    if (e.target.closest('[data-page-add]')) return edit({
      title: 'Добавить страницу', cta: 'Создать', note: 'Страница создаётся черновиком. Блоки добавите в редакторе страницы.',
      fields: [
        { key: 'slug', label: 'Адрес (slug)', type: 'mono', pattern: slugOk, err: 'Только строчная латиница, цифры и дефис (например about-us)', hint: 'Латиница, цифры и дефис. Пустой адрес — главная страница сайта', placeholder: 'about-us' },
        { key: 'title', label: 'Заголовок', type: 'text', required: true }
      ],
      check: v => (pageBySlug(v.slug) ? { slug: 'Страница с таким адресом на этом сайте уже есть' } : {}),
      save: v => {
        const p = { id: Math.max(0, ...S.sitePages.map(x => x.id)) + 1, slug: v.slug, title: v.title, status: 'draft', blocks: 0, updated: '20.10.2026 14:05' };
        S.sitePages.push(p); K.savePages(); render.pages(); head();
        $(`tr[data-pid="${p.id}"]`).classList.add('is-changed');
        SNC.toast({ type: 'ok', title: 'Страница создана', text: `${p.title} — черновик`, action: { label: 'Открыть', onClick: () => { location.href = `site-page.html?site=${site.id}&page=${p.id}`; } } });
      }
    });
    const b = e.target.closest('[data-act]'), tr = e.target.closest('tr[data-pid]'); if (!b || !tr) return;
    const p = S.sitePages.find(x => x.id === Number(tr.dataset.pid)), i = S.sitePages.indexOf(p);
    if (b.dataset.act === 'pub') {
      const pub = p.status !== 'published';
      if (!await SNC.confirm({ title: 'Смена статуса страницы', sub: p.title, icon: pub ? 'i-eye' : 'i-eye-off', cta: pub ? 'Опубликовать' : 'Вернуть в черновик',
        items: pub ? [`Страница «${p.title}» появится на ${site.domain} после сборки`, 'Пункты меню, которые ведут на неё, заработают'] : [`Страница «${p.title}» пропадёт с сайта после сборки`, 'Ссылки и пункты меню на неё станут вести в никуда', !p.slug ? 'Это главная: без неё сайт не собирается' : 'Блоки и поля страницы сохранятся'].filter(Boolean) })) return;
      p.status = pub ? 'published' : 'draft'; render.pages();
      changed('Статус страницы изменён');
    }
    if (b.dataset.act === 'del') {
      if (!await SNC.confirm({ title: 'Удалить страницу?', sub: p.title, icon: 'i-trash', cta: 'Удалить', items: ['Страница удалится вместе со всеми её блоками', 'Пункты меню на неё станут вести в никуда — проверьте вкладку «Меню»', 'Сразу после удаления его можно отменить'] })) return;
      S.sitePages.splice(i, 1); K.savePages(); render.pages(); head();
      undoToast('Страница удалена', () => { S.sitePages.splice(i, 0, p); K.savePages(); render.pages(); head(); });
    }
  });

  /* ---------- Новости и темы ---------- */
  const translit = s => s.toLowerCase().replace(/[а-яё]/g, c => ({ а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'j', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' }[c])).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
  let cats = [...S.newsCategories];
  render.news = () => {
    $('[data-count="news"]').textContent = S.siteNews.length;
    $('#p-news').innerHTML = banner('info', 'i-info', 'Новости о выпуске ПО создаются в «Выпуск обновления»', `Они выходят на сайте, где включён модуль «Новость о выпуске ПО»${site.releaseNews ? ' — сейчас это этот сайт' : ''}.`)
      + bar('Лента /news: вкладки — темы новостей. Новость создаётся черновиком; при публикации письмо получают подписчики, если включена рассылка.',
        `<button class="btn btn--outline btn--sm" type="button" data-dialog="dlg-cats">${ico('i-book')}<span>Темы</span></button><button class="btn btn--primary btn--sm" type="button" data-news-add>${ico('i-plus')}<span>Добавить новость</span></button>`)
      + table('Новости сайта', [{ t: 'Дата публикации' }, { t: 'Заголовок' }, { t: 'Тема' }, { t: 'Адрес' }, { t: 'Статус' }, { cls: 'col-actions3' }],
        S.siteNews.map(n => `<tr data-nid="${n.id}"><td class="mono">${n.publishedAt || '—'}</td><td class="cell-main">${esc(n.title)}</td><td>${n.category ? esc(n.category) : '<span class="muted">без темы</span>'}</td><td class="mono muted">/news#${esc(n.slug)}</td>
          <td>${n.status === 'published' ? tag('Опубликована', 'ok') : tag('Черновик')}${n.notified ? ` <span class="mail-mark" role="img" data-tip="Разослана подписчикам" aria-label="Разослана подписчикам">${ico('i-ok')}</span>` : ''}</td>
          <td class="col-actions3"><span class="row-acts">${iconBtn('pub', n.status === 'published' ? 'i-eye-off' : 'i-eye', n.status === 'published' ? 'Снять с публикации' : 'Опубликовать')}${iconBtn('edit', 'i-edit', 'Редактировать новость')}${iconBtn('del', 'i-trash', 'Удалить новость')}</span></td></tr>`), 'Новостей пока нет');
  };
  const newsDialog = n => edit({
    title: n ? 'Новость' : 'Добавить новость', cta: n ? 'Сохранить' : 'Создать черновик',
    note: n ? '' : 'Новость сохранится черновиком. Адрес и краткий текст для карточки сайт сделает сам. Опубликовать её — и разослать письмо подписчикам — можно в списке новостей.',
    fields: [
      { key: 'title', label: 'Заголовок', type: 'text', required: true, value: n?.title },
      { key: 'category', label: 'Тема', type: 'select', value: n?.category || '', options: [['', 'Без темы — только во вкладке «Все»'], ...cats], hint: cats.length ? 'Вкладка ленты /news; темы правятся кнопкой «Темы» над списком' : 'У сайта нет тем — добавьте их кнопкой «Темы»' },
      { key: 'body', label: 'Текст новости', type: 'textarea', rows: 160, required: !n, value: n ? 'Текст новости…' : '' }
    ],
    save: v => {
      if (n) { Object.assign(n, { title: v.title, category: v.category }); render.news(); if (n.status === 'published') changed('Новость сохранена'); else SNC.toast({ type: 'ok', title: 'Новость сохранена' }); return; }
      const x = { id: Date.now(), publishedAt: '', title: v.title, category: v.category, slug: translit(v.title), status: 'draft', notified: false };
      S.siteNews.unshift(x); render.news(); $(`tr[data-nid="${x.id}"]`).classList.add('is-changed');
      SNC.toast({ type: 'ok', title: 'Черновик новости создан', text: 'Опубликуйте его кнопкой в строке.' });
    }
  });
  // Что будет с письмом подписчикам — как newsPublish.ts в боевом
  const mailLine = n => n.notified ? 'Письмо по этой новости уже отправлялось — повторно не уйдёт'
    : !site.enabled ? 'Сайт выключен — новость появится после включения, писем не будет'
    : !set.modules.newsletter ? 'Рассылка у сайта выключена — писем не будет'
    : site.subscribers ? `Письмо получат подписчики сайта: ${site.subscribers}` : 'У сайта пока нет подписчиков — писем не будет';
  $('#p-news').addEventListener('click', async e => {
    if (e.target.closest('[data-news-add]')) return newsDialog();
    const b = e.target.closest('[data-act]'), tr = e.target.closest('tr[data-nid]'); if (!b || !tr) return;
    const n = S.siteNews.find(x => x.id === Number(tr.dataset.nid)), i = S.siteNews.indexOf(n);
    if (b.dataset.act === 'edit') newsDialog(n);
    if (b.dataset.act === 'pub') {
      const pub = n.status !== 'published';
      if (!await SNC.confirm({ title: 'Смена статуса новости', sub: n.title, icon: pub ? 'i-eye' : 'i-eye-off', cta: pub ? 'Опубликовать' : 'Снять с публикации',
        items: pub ? [`Новость появится в ленте на ${site.domain}`, mailLine(n)] : ['Новость исчезнет с сайта после сборки', 'Письмо, если оно уже ушло, не отзывается'] })) return;
      n.status = pub ? 'published' : 'draft';
      if (pub) { n.publishedAt = '20.10.2026'; if (site.enabled && set.modules.newsletter && site.subscribers) n.notified = true; }
      render.news(); changed('Статус новости изменён', pub && n.notified ? `Письмо уходит подписчикам: ${site.subscribers}` : '');
    }
    if (b.dataset.act === 'del') {
      if (!await SNC.confirm({ title: 'Удалить новость?', sub: n.title, icon: 'i-trash', cta: 'Удалить', items: ['Новость пропадёт из ленты и из админки', 'Сразу после удаления его можно отменить'] })) return;
      S.siteNews.splice(i, 1); render.news(); undoToast('Новость удалена', () => { S.siteNews.splice(i, 0, n); render.news(); });
    }
  });
  // Темы новостей: порядок, добавление, удаление (тему с новостями убрать нельзя)
  let draftCats = [];
  const drawCats = () => {
    $('[data-cats]').innerHTML = draftCats.map((c, i) => {
      const used = S.siteNews.filter(n => n.category === c).length;
      return `<li class="olist__item" data-ci="${i}"><span>${esc(c)}</span><span class="muted mono">${used ? `${used} нов.` : ''}</span><span class="row-acts">${iconBtn('up', 'i-up', 'Выше', i === 0 ? ' disabled' : '')}${iconBtn('down', 'i-down', 'Ниже', i === draftCats.length - 1 ? ' disabled' : '')}
        <span data-tip="${used ? 'У темы есть новости — сначала смените им тему' : 'Убрать тему'}"><button class="icon-btn icon-btn--sm" type="button" data-act="rm" aria-label="Убрать тему ${esc(c)}"${used ? ' disabled' : ''}>${ico('i-x')}</button></span></span></li>`;
    }).join('') || '<li class="muted">Тем нет — новости показываются только во вкладке «Все»</li>';
  };
  $('#dlg-cats').addEventListener('click', e => {
    const b = e.target.closest('[data-act]'), li = e.target.closest('[data-ci]');
    if (b && li) { const i = Number(li.dataset.ci); if (b.dataset.act === 'rm') draftCats.splice(i, 1); else move(draftCats, i, b.dataset.act === 'up' ? -1 : 1); drawCats(); }
    if (e.target.closest('[data-cat-add]')) {
      const inp = $('#cat-new'), v = inp.value.trim();
      if (!v) { inp.focus(); return; }
      if (draftCats.some(c => c.toLowerCase() === v.toLowerCase())) { SNC.toast({ type: 'warn', title: 'Такая тема уже есть' }); return; }
      draftCats.push(v); inp.value = ''; drawCats(); inp.focus();
    }
    if (e.target.closest('[data-cats-save]')) { cats = [...draftCats]; S.newsCategories.splice(0, Infinity, ...cats); SNC.dialog.close('dlg-cats'); changed('Темы новостей сохранены'); }
  });
  $('#cat-new').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('[data-cat-add]').click(); } });
  document.addEventListener('click', e => { if (e.target.closest('[data-dialog="dlg-cats"]')) { draftCats = [...cats]; drawCats(); } }, true);

  /* ---------- Справочники ---------- */
  const KINDS = {
    categories: { tab: 'Категории', add: 'Добавить категорию', edit: 'Категория', main: 'title', cols: [['slug', 'Адрес (slug)', 'mono'], ['title', 'Название', 'main'], ['summary', 'Описание категории']],
      fields: x => [{ key: 'slug', label: 'Адрес (slug)', type: 'mono', required: true, span: 6, value: x?.slug, pattern: slugOk, err: 'Только латиница в нижнем регистре, цифры и дефис' }, { key: 'title', label: 'Название', type: 'text', required: true, span: 6, value: x?.title }, { key: 'summary', label: 'Описание категории', type: 'textarea', value: x?.summary }] },
    products: { tab: 'Товары', add: 'Добавить товар', edit: 'Товар', main: 'name', cols: [['category', 'Категория'], ['name', 'Название', 'main'], ['description', 'Описание'], ['price', 'Цена', 'money']],
      fields: x => [{ key: 'name', label: 'Название', type: 'text', required: true, value: x?.name }, { key: 'category', label: 'Категория', type: 'select', span: 6, value: x?.category || '', options: [['', 'Без категории'], ...S.catalog.categories.map(c => c.title)] }, { key: 'price', label: 'Цена, ₽', type: 'num', span: 6, value: x?.price ?? '', pattern: '[0-9]+([.,][0-9]{1,2})?', err: 'Цена не может быть отрицательной', hint: 'Пусто — «цена по запросу»' }, { key: 'description', label: 'Описание', type: 'textarea', value: x?.description }, { key: 'inStock', label: 'В наличии', type: 'switch', span: 6, value: true }, { key: 'isNew', label: 'Новинка', type: 'switch', span: 6 }] },
    documents: { tab: 'Документы', add: 'Добавить документ', edit: 'Документ', main: 'title', cols: [['title', 'Заголовок', 'main'], ['description', 'Описание'], ['fileUrl', 'Файл', 'mono']],
      fields: x => [{ key: 'title', label: 'Заголовок', type: 'text', required: true, value: x?.title }, { key: 'description', label: 'Описание', type: 'text', value: x?.description }, { key: 'fileUrl', label: 'Файл', type: 'mono', required: true, value: x?.fileUrl, placeholder: 'Загрузите файл или вставьте ссылку' }] },
    partners: { tab: 'Партнёры', add: 'Добавить партнёра', edit: 'Партнёр', main: 'name', cols: [['name', 'Название', 'main'], ['logoUrl', 'Логотип', 'mono'], ['url', 'Ссылка', 'mono']],
      fields: x => [{ key: 'name', label: 'Название', type: 'text', required: true, value: x?.name }, { key: 'logoUrl', label: 'Логотип', type: 'mono', span: 6, value: x?.logoUrl, placeholder: 'Загрузите файл или вставьте ссылку' }, { key: 'url', label: 'Ссылка', type: 'mono', span: 6, value: x?.url, pattern: 'https?://.+', err: 'Полный адрес, например https://partner.ru' }] },
    stations: { tab: 'Станции', add: 'Добавить станцию', edit: 'Станция', main: 'place', cols: [['slug', 'Адрес (slug)', 'mono'], ['place', 'Место', 'main'], ['address', 'Адрес']],
      fields: x => [{ key: 'slug', label: 'Код станции', type: 'mono', required: true, span: 6, value: x?.slug, pattern: slugOk, err: 'Латиница, цифры и дефис' }, { key: 'place', label: 'Место', type: 'text', required: true, span: 6, value: x?.place }, { key: 'address', label: 'Адрес', type: 'text', required: true, value: x?.address }, { key: 'lat', label: 'Широта', type: 'num', required: true, span: 6, value: '56.48', pattern: '-?([0-8]?[0-9]([.,][0-9]+)?|90)', err: 'Широта от −90 до 90' }, { key: 'lng', label: 'Долгота', type: 'num', required: true, span: 6, value: '84.95', pattern: '-?(1[0-7][0-9]|[0-9]?[0-9])([.,][0-9]+)?', err: 'Долгота от −180 до 180' }, { key: 'approx', label: 'Координаты приблизительные', type: 'switch' }] },
    software: { tab: 'ПО', add: 'Добавить продукт', edit: 'Продукт ПО', main: 'name', cols: [['section', 'Раздел (slug страницы)', 'mono'], ['name', 'Название', 'main'], ['slug', 'Адрес (slug)', 'mono'], ['price', 'Цена', 'money']],
      note: 'Продукт показывается на /раздел/адрес, если страница раздела опубликована и на ней стоит блок «Каталог ПО».',
      fields: x => [{ key: 'section', label: 'Раздел (slug страницы)', type: 'mono', required: true, span: 6, value: x?.section || 'software', pattern: slugOk, err: 'Укажите раздел — slug страницы раздела' }, { key: 'slug', label: 'Адрес (slug)', type: 'mono', required: true, span: 6, value: x?.slug, pattern: slugOk, err: 'Латиница, цифры и дефис' }, { key: 'name', label: 'Название', type: 'text', required: true, value: x?.name }, { key: 'price', label: 'Цена, ₽', type: 'num', span: 6, value: x?.price ?? '', hint: 'Пусто — «цена по запросу»' }, { key: 'published', label: 'Опубликован', type: 'switch', span: 6, value: true }],
      check: (v, x) => (v.section === 'equipment' ? { section: 'Раздел equipment занят каталогом оборудования' } : S.catalog.software.some(y => y !== x && y.section === v.section && y.slug === v.slug) ? { slug: 'Продукт с таким адресом в этом разделе уже есть' } : {}) }
  };
  let kind = 'products';
  const money = n => (n === null || n === '' || n === undefined ? '<span class="muted">по запросу</span>' : `${new Intl.NumberFormat('ru-RU').format(n)} ₽`);
  render.catalog = () => {
    const k = KINDS[kind], rows = S.catalog[kind];
    $('#p-catalog').innerHTML = (['categories', 'products', 'stations'].includes(kind) ? banner('warn', 'i-warn', 'Общий справочник организации', 'Категории, товары и станции общие для всех сайтов организации: правка здесь меняет их на каждом сайте и пересобирает все сайты.') : '')
      + `<div class="tab-intro"><div class="seg seg--scroll" role="group" aria-label="Справочник">${Object.entries(KINDS).map(([key, x]) => `<button class="seg__btn" type="button" data-kind="${key}" aria-pressed="${key === kind}">${x.tab} <span class="mono muted">${S.catalog[key].length}</span></button>`).join('')}</div>
        <div class="tab-intro__acts"><button class="btn btn--primary btn--sm" type="button" data-cat-row-add>${ico('i-plus')}<span>${k.add}</span></button></div></div>`
      + (k.note ? `<p class="muted dt__note">${k.note}</p>` : '')
      + table(k.tab, [...k.cols.map(([, t, type]) => ({ t, cls: type === 'money' ? 'num-cell' : '' })), { cls: 'col-actions4' }],
        rows.map((x, i) => `<tr data-xi="${i}">${k.cols.map(([key, , type]) => type === 'main' ? `<td class="cell-main">${esc(x[key])}</td>` : type === 'money' ? `<td class="num-cell">${money(x[key])}</td>` : `<td${type === 'mono' ? ' class="mono"' : ''}>${x[key] ? esc(x[key]) : '<span class="muted">—</span>'}</td>`).join('')}
          <td class="col-actions4"><span class="row-acts">${iconBtn('up', 'i-up', 'Выше', i === 0 ? ' disabled' : '')}${iconBtn('down', 'i-down', 'Ниже', i === rows.length - 1 ? ' disabled' : '')}${iconBtn('edit', 'i-edit', 'Редактировать')}${iconBtn('del', 'i-trash', 'Удалить запись')}</span></td></tr>`), 'Записей пока нет');
  };
  const catDialog = x => {
    const k = KINDS[kind];
    edit({ title: x ? k.edit : k.add, cta: x ? 'Сохранить' : 'Добавить', fields: k.fields(x),
      check: v => ({ ...(k.check?.(v, x) || {}), ...(kind === 'categories' && S.catalog.categories.some(y => y !== x && y.slug === v.slug) ? { slug: 'Категория с таким адресом уже есть' } : {}), ...(kind === 'stations' && S.catalog.stations.some(y => y !== x && y.slug === v.slug) ? { slug: 'Станция с таким кодом уже есть' } : {}) }),
      save: v => {
        if (v.price !== undefined) v.price = v.price === '' ? null : Number(String(v.price).replace(',', '.'));
        if (x) Object.assign(x, v); else S.catalog[kind].push({ id: Date.now(), ...v });
        render.catalog(); changed('Запись сохранена', ['categories', 'products', 'stations'].includes(kind) ? 'Пересобираются все сайты организации' : '');
      } });
  };
  $('#p-catalog').addEventListener('click', async e => {
    const kb = e.target.closest('[data-kind]'); if (kb) { kind = kb.dataset.kind; render.catalog(); $(`[data-kind="${kind}"]`).focus(); return; }
    if (e.target.closest('[data-cat-row-add]')) return catDialog();
    const b = e.target.closest('[data-act]'), tr = e.target.closest('tr[data-xi]'); if (!b || !tr) return;
    const rows = S.catalog[kind], i = Number(tr.dataset.xi), x = rows[i], k = KINDS[kind];
    if (b.dataset.act === 'up' || b.dataset.act === 'down') { move(rows, i, b.dataset.act === 'up' ? -1 : 1); render.catalog(); $(`tr[data-xi="${i + (b.dataset.act === 'up' ? -1 : 1)}"]`)?.classList.add('is-changed'); changed('Порядок сохранён'); }
    if (b.dataset.act === 'edit') catDialog(x);
    if (b.dataset.act === 'del') {
      if (kind === 'categories' && S.catalog.products.some(p => p.category === x.title)) { SNC.toast({ type: 'err', title: 'Категорию не удалить', text: 'В категории есть товары — сначала перенесите или удалите их.' }); return; }
      if (!await SNC.confirm({ title: 'Удалить запись?', sub: x[k.main], icon: 'i-trash', cta: 'Удалить', items: [`Запись пропадёт из справочника «${k.tab}»`, 'Блоки страниц, которые её показывают, перестанут её выводить', 'Сразу после удаления его можно отменить'] })) return;
      rows.splice(i, 1); render.catalog(); undoToast('Запись удалена', () => { rows.splice(i, 0, x); render.catalog(); });
    }
  });

  /* ---------- Редиректы: проверки как redirectValidation.ts ---------- */
  const RESERVED = /^\/(_nuxt|_preview|uploads)(\/|$)|^\/(sitemap\.xml|robots\.txt|\.htaccess|404\.html|200\.html|_payload\.json)$/i;
  const norm = p => decodeURI(p).toLowerCase().replace(/\/+$/, '') || '/';
  render.redirects = () => {
    $('[data-count="redirects"]').textContent = S.redirects.length;
    $('#p-redirects').innerHTML = banner('info', 'i-info', 'Правило нужно, только если адрес страницы изменился', 'Старые адреса вида /страница.html перенаправляются на /страница сами. Правила начнут работать после следующей сборки сайта.')
      + bar('Перенаправления со старых адресов — чтобы ссылки из поисковиков и закладок не вели на 404.', `<button class="btn btn--primary btn--sm" type="button" data-red-add>${ico('i-plus')}<span>Добавить правило</span></button>`)
      + table('Редиректы', [{ t: 'Старый адрес' }, { t: 'Новый адрес' }, { t: 'Код' }, { cls: 'col-actions2' }],
        S.redirects.map(r => `<tr data-rid="${r.id}"><td class="mono">${esc(r.fromPath)}</td><td class="mono">${esc(r.toPath)}</td><td>${tag(r.code === 301 ? '301 — постоянный' : '302 — временный', r.code === 301 ? 'info' : 'off')}</td>
          <td class="col-actions2"><span class="row-acts">${iconBtn('edit', 'i-edit', 'Правило редиректа')}${iconBtn('del', 'i-trash', 'Удалить правило')}</span></td></tr>`), 'Правил пока нет');
  };
  const redDialog = r => edit({
    title: r ? 'Правило редиректа' : 'Добавить правило', cta: r ? 'Сохранить' : 'Добавить',
    fields: [
      { key: 'fromPath', label: 'Старый адрес', type: 'mono', required: true, value: r?.fromPath, hint: 'Путь на старом сайте, начиная со слеша (например /index.php?Itemid=42)', pattern: '/[^\\s"\\\\#]*', err: 'Путь внутри сайта: начинается со слеша, без пробелов, кавычек, \\ и #' },
      { key: 'toPath', label: 'Новый адрес', type: 'mono', required: true, value: r?.toPath, hint: 'Путь на новом сайте, начиная со слеша (например /o-kompanii)', pattern: '/[^\\s"\\\\]*', err: 'Путь внутри сайта: начинается со слеша, без пробелов, кавычек и \\' },
      { key: 'code', label: 'Код', type: 'select', value: r?.code || 301, options: [[301, '301 — постоянный'], [302, '302 — временный']] }
    ],
    check: v => {
      const e = {};
      if (/^\/\//.test(v.fromPath)) e.fromPath = 'Путь внутри сайта: начинается с одного слеша (адреса вида //host ведут на другой сайт)';
      else if (RESERVED.test(v.fromPath.split('?')[0])) e.fromPath = 'Это служебный адрес сайта — редирект с него запрещён';
      else if (S.redirects.some(x => x !== r && norm(x.fromPath) === norm(v.fromPath))) e.fromPath = 'Правило для этого старого адреса на сайте уже есть (регистр, слеш в конце и %-кодировка не различаются)';
      if (/^\/\//.test(v.toPath)) e.toPath = 'Путь внутри сайта: начинается с одного слеша';
      else if (!e.fromPath && norm(v.fromPath) === norm(v.toPath.split('#')[0])) e.toPath = 'Правило поймает собственный новый адрес — получится бесконечный редирект';
      else if (S.redirects.some(x => x !== r && norm(x.fromPath) === norm(v.toPath) && norm(x.toPath) === norm(v.fromPath))) e.toPath = 'Правило замыкает цикл с другими редиректами сайта — получится бесконечный редирект';
      return e;
    },
    save: v => {
      const x = { fromPath: v.fromPath, toPath: v.toPath, code: Number(v.code) };
      if (r) Object.assign(r, x); else S.redirects.push({ id: Date.now(), ...x });
      render.redirects(); changed('Правило сохранено', 'Начнёт работать после сборки сайта');
    }
  });
  $('#p-redirects').addEventListener('click', async e => {
    if (e.target.closest('[data-red-add]')) return redDialog();
    const b = e.target.closest('[data-act]'), tr = e.target.closest('tr[data-rid]'); if (!b || !tr) return;
    const r = S.redirects.find(x => x.id === Number(tr.dataset.rid)), i = S.redirects.indexOf(r);
    if (b.dataset.act === 'edit') redDialog(r);
    if (b.dataset.act === 'del') {
      if (!await SNC.confirm({ title: 'Удалить правило?', sub: r.fromPath, icon: 'i-trash', cta: 'Удалить', items: [`Адрес ${r.fromPath} после сборки будет отвечать 404`, 'Сразу после удаления его можно отменить'] })) return;
      S.redirects.splice(i, 1); render.redirects(); undoToast('Правило удалено', () => { S.redirects.splice(i, 0, r); render.redirects(); });
    }
  });
  /* ================= НАСТРОЙКИ =================
     Каждая вкладка — отдельная форма: вводная строка и «Сохранить» в одном ряду, проверка при сохранении. */
  const fld = (id, label, ctl, { span = 12, req = false, hint = '' } = {}) => `<div class="fld span-${span}"><label class="fld__label" for="${id}">${label}${req ? ' <span class="fld__req" aria-hidden="true">*</span>' : ''}</label>${ctl}${hint ? `<span class="fld__hint">${hint}</span>` : ''}<span class="fld__err"></span></div>`;
  const inp = (id, v = '', extra = '') => `<input class="in" id="${id}" value="${esc(v)}" autocomplete="off"${extra}>`;
  const mono = (id, v = '', extra = '') => `<input class="in in--mono" id="${id}" value="${esc(v)}" autocomplete="off" spellcheck="false"${extra}>`;
  const settingsForm = (id, intro, body) => `<form class="panel set-form" data-set="${id}" novalidate>
      <div class="set-form__head"><p class="muted">${intro}</p><span class="actionbar__note" hidden>Есть несохранённые изменения</span><button class="btn btn--primary btn--sm" type="submit"><span>Сохранить</span></button></div>
      <div class="panel__body">${body}</div></form>`;
  const sec = (title, text, body) => `<section class="fsec"><div><h2 class="fsec__title">${title}</h2>${text ? `<p class="fsec__text">${text}</p>` : ''}</div><div class="form-grid">${body}</div></section>`;
  // Список строк с «Добавить» и «Убрать»: телефоны, email, правовые ссылки, реквизиты
  const rowsEditor = (name, rows, cols, addLabel) => `<div class="rows-ed span-12" data-rows="${name}">
      <div class="rows-ed__list">${rows.map(r => rowLine(name, r, cols)).join('')}</div>
      <button class="btn btn--ghost btn--xs" type="button" data-row-add="${name}">${ico('i-plus')}<span>${addLabel}</span></button>
      <template>${rowLine(name, cols.map(() => ''), cols)}</template></div>`;
  function rowLine(name, r, cols) {
    const vals = Array.isArray(r) ? r : [r];
    return `<div class="rows-ed__row">${cols.map((c, i) => `<input class="in${c.mono ? ' in--mono' : ''}" aria-label="${esc(c.label)}" placeholder="${esc(c.label)}" value="${esc(vals[i] ?? '')}" data-col="${i}" autocomplete="off">`).join('')}<button class="icon-btn icon-btn--sm" type="button" data-row-rm aria-label="Убрать строку">${ico('i-x')}</button></div>`;
  }
  const readRows = (form, name) => $$(`[data-rows="${name}"] .rows-ed__row`, form).map(r => $$('input', r).map(i => i.value.trim())).filter(r => r.some(Boolean));

  /* ---------- Общее ---------- */
  render.general = () => {
    $('#p-general').innerHTML = settingsForm('general', 'Домен, включение и юридическое лицо сайта; название и подпись в шапке.',
      sec('Сайт', '', fld('g-domain', 'Домен', mono('g-domain', site.domain, ' required pattern="([a-z0-9\\-]+\\.)+[a-z]{2,}" data-err="Домен латиницей, например snc-service.ru"'), { span: 6, req: true })
        + fld('g-locale', 'Локаль по умолчанию', `<select class="in" id="g-locale"><option value="ru"${site.locale === 'ru' ? ' selected' : ''}>Русский (ru)</option><option value="en"${site.locale === 'en' ? ' selected' : ''}>English (en)</option></select>`, { span: 6 })
        + `<div class="fld span-12"><label class="sw"><input type="checkbox" id="g-enabled"${site.enabled ? ' checked' : ''}><span class="sw__track"></span>Сайт включён</label><span class="fld__hint">Выключенный сайт не собирается; опубликованная версия остаётся на хостинге.</span></div>`
        + fld('g-legal', 'Юридическое лицо', inp('g-legal', site.legalName, ' required'), { req: true, hint: 'Например, АО «НПФ «Сибнефтекарт». На сайте — в © подвала, заголовке и разметке для поисковиков; в письмах подписчикам — отправитель и подпись.' }))
      + sec('Шапка', 'Название и подпись рядом с логотипом; краткое название — в штампе страниц.', fld('g-name', 'Название в шапке', inp('g-name', set.brand.name, ' required'), { span: 6, req: true })
        + fld('g-sub', 'Подпись', inp('g-sub', set.brand.sub), { span: 6 }) + fld('g-short', 'Краткое название (штамп страниц)', inp('g-short', set.brand.short, ' maxlength="12"'), { span: 6 })));
  };
  /* ---------- Тема ---------- */
  render.theme = () => {
    const logo = `<svg viewBox="0 0 120 48" aria-hidden="true"><path d="M38 11H22.5A12.5 12.5 0 0 0 10 23.5v1A12.5 12.5 0 0 0 22.5 37H38 M48 11v26 M72 11v26 M48 24h24 M84 11v26 M106 11L86.5 24 106 37" fill="none" stroke="#D32F2F" stroke-width="6" stroke-linecap="square"/></svg>`;
    const up = (id, title, hint, preview, accept) => `<div class="span-6 asset"><span class="fld__label">${title}</span><div class="asset__box" data-preview="${id}">${preview}</div>
      <div class="asset__acts"><label class="btn btn--outline btn--xs file-btn"><input type="file" accept="${accept}" data-asset="${id}">${ico('i-upload')}<span>Загрузить</span></label><button class="btn btn--ghost btn--xs" type="button" data-asset-clear="${id}"><span>Убрать файл</span></button></div><span class="fld__hint">${hint}</span></div>`;
    $('#p-theme').innerHTML = settingsForm('theme', 'Логотип в шапке и подвале и значок вкладки браузера.',
      sec('Оформление', '', up('logo', 'Логотип', 'SVG или PNG, высота от 48 px. В шапке масштабируется по высоте.', logo, '.svg,.png') + up('favicon', 'Фавикон', 'SVG или PNG 32×32. Показывается во вкладке браузера и в закладках.', '<img src="../../sncard/favicon.svg" alt="" width="32" height="32">', '.svg,.png,.ico')));
  };
  /* ---------- Контакты ---------- */
  render.contacts = () => {
    const c = set.contacts;
    $('#p-contacts').innerHTML = settingsForm('contacts', 'Адрес, телефоны и почта — в подвале, блоке «Контакты» и разметке для поисковиков. На первую почту приходят заказы из корзины.',
      sec('Адрес и время работы', '', fld('c-address', 'Адрес', inp('c-address', c.address)) + fld('c-schedule', 'Расписание', inp('c-schedule', c.schedule), { span: 6 })
        + fld('c-lat', 'Широта', mono('c-lat', c.lat, ' pattern="-?([0-8]?[0-9]([.,][0-9]+)?|90)" data-err="Широта от −90 до 90" inputmode="decimal"'), { span: 3 }) + fld('c-lng', 'Долгота', mono('c-lng', c.lng, ' pattern="-?(1[0-7][0-9]|[0-9]?[0-9])([.,][0-9]+)?" data-err="Долгота от −180 до 180" inputmode="decimal"'), { span: 3 }))
      + sec('Телефоны', '', rowsEditor('phones', c.phones, [{ label: 'Телефон', mono: true }], 'Добавить телефон'))
      + sec('Email', '', rowsEditor('emails', c.emails, [{ label: 'Email', mono: true }], 'Добавить email')));
  };
  /* ---------- Поиск и превью: поля слева, превью справа ---------- */
  const suffixed = (t, suf) => !suf || t.includes(suf.replace(/^[\s|/—-]+/, '')) ? t : /^[|/—-]/.test(suf.trim()) ? `${t} ${suf.trim()}` : `${t} — ${suf.trim()}`;
  render.seo = () => {
    const s = set.seo;
    $('#p-seo').innerHTML = settingsForm('seo', 'Как страницы сайта выглядят в поисковой выдаче Яндекса и Google и в превью ссылок в мессенджерах. Здесь — общие значения; у отдельной страницы их можно заменить в её настройках.',
      `<div class="seo-grid"><div>${sec('Для всего сайта', '',
        fld('seo-suffix', 'Окончание заголовка страниц', inp('seo-suffix', s.titleSuffix, ' placeholder="Например: СНК-Сервис"'), { hint: 'Дописывается к названию страницы: «Контакты» → «Контакты — Сибнефтекарт». Пробелы и тире расставляются сами; другой разделитель («|», «/») можно поставить в начале. Не дописывается к странице со своим заголовком для поиска.' })
        + fld('seo-desc', 'Описание по умолчанию', `<textarea class="in" id="seo-desc" style="min-height:96px">${esc(s.description)}</textarea>`, { hint: 'Текст под заголовком в выдаче и в превью ссылки. Лучше 1–2 предложения, до 160 символов: длиннее поисковики обрезают.' })
        + `<div class="fld span-12"><span class="len" data-len="desc"></span></div>`
        + fld('seo-og', 'Картинка для превью ссылки', mono('seo-og', s.ogImage, ' placeholder="Загрузите файл или вставьте ссылку"'), { hint: 'JPG или PNG, 1200×630. SVG мессенджеры не показывают.' }))}</div>
      <aside class="seo-prev" aria-labelledby="seo-prev-h"><div class="seo-prev__head"><h3 class="fsec__title" id="seo-prev-h">Так увидят страницу</h3>
        <select class="in" data-seo-page aria-label="Страница для превью">${S.sitePages.filter(p => p.status === 'published').map(p => `<option value="${p.id}"${p.slug === 'contacts' ? ' selected' : ''}>${esc(p.title)}</option>`).join('')}</select></div>
        <div data-seo-out></div><p class="muted dt__note">Примерно: каждый поисковик и мессенджер оформляет превью по-своему, Яндекс может подставить свой текст описания.</p></aside></div>`);
    drawSeo();
  };
  const drawSeo = () => {
    const out = $('[data-seo-out]'); if (!out) return;
    const p = S.sitePages.find(x => x.id === Number($('[data-seo-page]').value)) || S.sitePages[0];
    const title = suffixed(p.title, $('#seo-suffix').value), desc = $('#seo-desc').value.trim(), og = $('#seo-og').value.trim();
    const lenNote = (n, lim, what) => `<span class="len${n > lim ? ' len--over' : ''}">${what}: ${n} из ~${lim}${n > lim ? ' — обрежется' : ''}</span>`;
    $('[data-len="desc"]').outerHTML = `<span class="len${desc.length > 160 ? ' len--over' : ''}" data-len="desc">${desc.length} из ~160 символов${desc.length > 160 ? ' — поисковики обрежут' : ''}</span>`;
    const img = !og ? '<div class="msg-card__noimg">Картинки нет — ссылка будет без превью-картинки</div>' : /\.svg$/i.test(og) ? '<div class="msg-card__noimg is-warn">SVG мессенджеры не показывают — загрузите JPG или PNG</div>' : '<div class="msg-card__img" aria-hidden="true"></div>';
    out.innerHTML = `<div class="sub-h">Поисковая выдача</div>
      <div class="serp"><span class="serp__url mono">${esc(site.domain)}${p.slug ? ` › ${esc(p.slug)}` : ''}</span><span class="serp__title">${esc(title.length > 60 ? `${title.slice(0, 58)}…` : title)}</span><span class="serp__desc">${desc ? esc(desc.length > 160 ? `${desc.slice(0, 157)}…` : desc) : '<i class="muted">Описания нет: поисковик подберёт текст со страницы сам</i>'}</span></div>
      <div class="lens">${lenNote(title.length, 60, 'Заголовок')}${lenNote(desc.length, 160, 'Описание')}</div>
      <div class="sub-h">Превью ссылки в мессенджере</div>
      <div class="msg-card">${img}<div class="msg-card__body"><span class="mono muted">${esc(site.domain)}</span><b>${esc(title)}</b><span>${esc(desc)}</span></div></div>
      <ul class="seo-src"><li>Заголовок — название страницы и окончание с этой вкладки</li><li>${desc ? 'Описание — общее, с этой вкладки' : 'Описания нет'}</li><li>${og ? 'Картинка — общая, с этой вкладки' : 'Картинки нет'}</li></ul>
      <a class="link-more" href="site-page.html?site=${site.id}&page=${p.id}">Открыть настройки страницы</a>`;
  };
  $('#p-seo').addEventListener('input', drawSeo);
  $('#p-seo').addEventListener('change', drawSeo);
  /* ---------- Модули: список слева, что даёт и что нужно — справа ---------- */
  let mod = 'cart';
  const draftMods = () => ({ ...set.modules, release_news: site.releaseNews });
  let mods = draftMods();
  const MODS = {
    cart: { title: 'Корзина', line: 'Заказ оборудования из каталога без оплаты',
      gives: ['Кнопка корзины в шапке сайта', 'Кнопки «В корзину» на страницах каталога', 'Оформление заказа на странице корзины: состав, реквизиты, подтверждение', 'Заказ приходит письмом и в системе не хранится. Оплаты на сайте нет'],
      checks: () => [[S.sitePages.some(p => p.slug === 'cart' && p.status === 'published'), 'Опубликована страница с адресом cart и блоком оформления заказа — на неё ведёт кнопка корзины', 'content/pages', 'Страницы'],
        [S.sitePages.some(p => p.slug === 'equipment' && p.status === 'published'), 'Опубликована страница каталога с адресом equipment — кнопки «В корзину» есть только в каталоге', 'content/pages', 'Страницы'],
        [set.contacts.emails.length > 0, 'Указана почта на вкладке «Контакты» — туда приходят заказы', 'settings/contacts', 'Контакты']],
      off: 'Кнопок корзины нет, сайт не принимает заказы.', foot: 'Если на сервере задан общий адрес для заказов, письма уходят только на него, а не на почту сайта.' },
    newsletter: { title: 'Рассылка', line: 'Подписка в подвале и письма о новых новостях',
      gives: ['Форма подписки в подвале сайта', 'Подписка подтверждается по ссылке из письма', 'Когда новость публикуется, подписчики получают её письмом', 'Отписаться можно по ссылке в любом письме'],
      checks: () => [[!!(set.footer.subscribe.consent && set.footer.subscribe.consentLink && set.footer.subscribe.consentPage), 'Заполнены текст согласия, текст ссылки и страница условий на вкладке «Подвал» — без них формы на сайте нет', 'settings/footer', 'Подвал']],
      extra: () => `<p class="mod-extra">Подписчиков: <b class="mono">${site.subscribers}</b></p>`,
      off: 'Формы нет, письма не уходят. Подписчики сохраняются и снова получат письма, если рассылку включить.' },
    release_news: { title: 'Новость о выпуске ПО', line: 'Сюда публикуются новости о выпуске ПО — только на одном сайте',
      gives: ['Новость из «Выпуск обновления» публикуется на этом сайте с темой «Обновления»', 'Если включена рассылка, её получат подписчики', 'При сохранении тема «Обновления» добавляется в темы новостей'],
      checks: () => [],
      extra: () => { const other = S.sites.find(s => s.releaseNews && s.id !== site.id); const cur = site.releaseNews ? 'Сейчас новости о выпуске публикуются на этом сайте' : other ? `Сейчас новости о выпуске публикуются на ${other.domain}` : 'Сейчас новости о выпуске не публикуются ни на одном сайте';
        const note = mods.release_news && !site.releaseNews && other ? 'После сохранения они будут публиковаться здесь, а с того сайта флаг снимется.' : !mods.release_news && site.releaseNews ? 'После сохранения новости о выпуске не будут публиковаться ни на одном сайте.' : '';
        return `<p class="mod-extra">${cur}${note ? `<br><span class="st st--plain st--warn">${note}</span>` : ''}</p>`; },
      off: 'Новости о выпуске сюда не публикуются.' },
    metrika: { title: 'Яндекс Метрика', line: 'Статистика посещений сайта',
      gives: ['Посещаемость, источники переходов и поисковые запросы — в кабинете Яндекс Метрики', 'Карта кликов и переходы по внешним ссылкам', 'Считаются только посетители, принявшие cookies'],
      checks: () => [[/^\d+$/.test(mods.metrikaId || ''), 'Указан номер счётчика', null], [!!set.footer.cookie[1], 'Указана ссылка на правила cookies в «Подвале» — на неё ведёт уведомление о cookies', 'settings/footer', 'Подвал']],
      extra: () => fld('m-id', 'Номер счётчика', mono('m-id', mods.metrikaId, ' inputmode="numeric" pattern="[0-9]{5,10}" data-err="Только цифры, например 98765432" placeholder="98765432"'), { hint: 'Из кабинета metrika.yandex.ru, «Настройка» счётчика. Счётчик ставится только посетителям, которые приняли cookies. Вебвизор выключен.' }),
      off: 'Счётчика на сайте нет. Номер сохраняется и снова заработает, если включить модуль.' }
  };
  const needs = key => MODS[key].checks().some(([ok]) => !ok);
  render.modules = () => {
    const m = MODS[mod], checks = m.checks();
    $('#p-modules').innerHTML = settingsForm('modules', 'Модули добавляют сайту возможности. Включите модуль в списке, справа — что он даёт и что ему нужно. На сайте изменения появятся после сохранения и пересборки.',
      `<div class="mods"><ul class="mods__list" aria-label="Возможности сайта">${Object.entries(MODS).map(([k, x]) => `<li class="mods__item${k === mod ? ' is-current' : ''}">
          <button class="mods__pick" type="button" data-mod="${k}" aria-pressed="${k === mod}"><b>${x.title}</b><small>${x.line}</small><span class="st st--plain st--${mods[k] ? (needs(k) ? 'warn' : 'ok') : 'off'}">${mods[k] ? (needs(k) ? 'включён · чего-то не хватает' : 'включён') : 'выключен'}</span></button>
          <label class="sw"><input type="checkbox" data-mod-on="${k}"${mods[k] ? ' checked' : ''}><span class="sw__track"></span><span class="sr-only">${x.title}</span></label></li>`).join('')}</ul>
        <div class="mods__detail" aria-live="polite"><h2 class="panel__title">${m.title}</h2>
          <div class="sub-h">Что даёт на сайте</div><ul class="mods__gives">${m.gives.map(g => `<li>${g}</li>`).join('')}</ul>
          ${m.extra ? m.extra() : ''}
          ${checks.length ? `<div class="sub-h">Что нужно, чтобы заработало</div><ul class="checks">${checks.map(([ok, t, link, lt]) => `<li class="${ok ? 'is-ok' : 'is-miss'}">${ico(ok ? 'i-ok' : 'i-warn')}<span>${t}${!ok && link ? ` · <a href="#${link}" data-goto="${link}">${lt}</a>` : ''}</span></li>`).join('')}</ul>` : ''}
          <div class="sub-h">Когда выключен</div><p class="muted">${m.off}</p>${m.foot ? `<p class="muted dt__note">${m.foot}</p>` : ''}</div></div>`);
    markDirty('modules', dirty.has('modules'));
  };
  $('#p-modules').addEventListener('click', e => {
    const p = e.target.closest('[data-mod]'); if (p) { mod = p.dataset.mod; render.modules(); $(`[data-mod="${mod}"]`).focus(); }
    const g = e.target.closest('[data-goto]');
    if (g) { e.preventDefault(); const [s2, t2] = g.dataset.goto.split('/'); leaveOk().then(ok => { if (!ok) return; discardAll(); mods = draftMods(); showSection(s2, t2); }); }
  });
  $('#p-modules').addEventListener('change', e => {
    const t = e.target.closest('[data-mod-on]'); if (!t) return;
    mods[t.dataset.modOn] = t.checked; mod = t.dataset.modOn; markDirty('modules', true); render.modules();
    $(`[data-mod-on="${mod}"]`).focus();
  });
  $('#p-modules').addEventListener('input', e => { if (e.target.id === 'm-id') { mods.metrikaId = e.target.value.trim(); } });
  /* ---------- Подвал ---------- */
  render.footer = () => {
    const f = set.footer, pages = S.sitePages.map(p => p.slug).filter(Boolean);
    $('#p-footer').innerHTML = settingsForm('footer', 'Правовые ссылки, уведомление о cookies, форма подписки и нижняя строка подвала.',
      sec('Правовые ссылки', 'Ссылки в нижней части подвала. Страница — slug страницы сайта или полный адрес.', rowsEditor('legal', f.legal, [{ label: 'Название' }, { label: 'Страница / адрес', mono: true }], 'Добавить ссылку'))
      + sec('Cookie-уведомление', 'Плашка для новых посетителей со ссылкой на правила; без согласия не ставятся счётчики.', fld('f-ck-l', 'Название', inp('f-ck-l', f.cookie[0]), { span: 6 }) + fld('f-ck-p', 'Страница / адрес', mono('f-ck-p', f.cookie[1], ` list="f-pages"`), { span: 6 }))
      + sec('Подписка на новости', 'Форма работает, когда включён модуль «Рассылка» и заполнены согласие, ссылка и страница условий.', fld('f-sb-t', 'Заголовок формы', inp('f-sb-t', f.subscribe.title)) + fld('f-sb-c', 'Текст согласия', inp('f-sb-c', f.subscribe.consent), { span: 6 })
        + fld('f-sb-l', 'Текст ссылки на условия', inp('f-sb-l', f.subscribe.consentLink), { span: 6 }) + fld('f-sb-p', 'Страница условий', mono('f-sb-p', f.subscribe.consentPage, ` list="f-pages"`), { span: 6 }))
      + sec('Нижняя строка', '', `<p class="span-12 fld__hint">© ${new Date().getFullYear()} ${esc(site.legalName)} — после © выводится юридическое лицо сайта (вкладка «Общее»)</p>` + fld('f-phone', 'Подпись под телефоном', inp('f-phone', f.phoneNote), { span: 6 })
        + rowsEditor('req', f.requisites, [{ label: 'Реквизит (ОГРН, ИНН…)' }, { label: 'Значение', mono: true }], 'Добавить реквизит'))
      + `<datalist id="f-pages">${pages.map(p => `<option value="${esc(p)}">`).join('')}</datalist>`);
  };

  /* ---------- Поведение всех форм настроек ---------- */
  const main = $('#main');
  main.addEventListener('input', e => { const f = e.target.closest('form[data-set]'); if (f) markDirty(f.dataset.set, true); });
  main.addEventListener('change', e => { const f = e.target.closest('form[data-set]'); if (f && !e.target.closest('[data-seo-page]')) markDirty(f.dataset.set, true); });
  main.addEventListener('click', e => {
    const add = e.target.closest('[data-row-add]');
    if (add) { const box = add.closest('[data-rows]'); $('.rows-ed__list', box).insertAdjacentHTML('beforeend', $('template', box).innerHTML); $('.rows-ed__row:last-child input', box).focus(); markDirty(add.closest('form').dataset.set, true); }
    const rm = e.target.closest('[data-row-rm]');
    if (rm) { const f = rm.closest('form'); rm.closest('.rows-ed__row').remove(); markDirty(f.dataset.set, true); }
    const clr = e.target.closest('[data-asset-clear]');
    if (clr) { $(`[data-preview="${clr.dataset.assetClear}"]`).innerHTML = '<span class="muted">Файла нет</span>'; markDirty('theme', true); }
  });
  main.addEventListener('change', e => {
    const a = e.target.closest('[data-asset]'); if (!a || !a.files[0]) return;
    const file = a.files[0];
    if (file.size > 2 * 1024 * 1024) { SNC.toast({ type: 'err', title: 'Файл больше 2 МБ', text: file.name }); a.value = ''; return; }
    $(`[data-preview="${a.dataset.asset}"]`).innerHTML = `<img src="${URL.createObjectURL(file)}" alt="${esc(file.name)}">`;
  });
  // Сохранение вкладки: проверка, спиннер, применение к демо-данным, автосборка
  const apply = {
    general: f => { const was = site.enabled; Object.assign(site, { domain: $('#g-domain', f).value.trim(), legalName: $('#g-legal', f).value.trim(), enabled: $('#g-enabled', f).checked, locale: $('#g-locale', f).value }); Object.assign(set.brand, { name: $('#g-name', f).value.trim(), sub: $('#g-sub', f).value.trim(), short: $('#g-short', f).value.trim() }); K.persist(); $('[data-site-domain]').textContent = site.domain; $('[data-site-legal]').textContent = site.legalName; return was !== site.enabled; },
    contacts: f => { Object.assign(set.contacts, { address: $('#c-address', f).value.trim(), schedule: $('#c-schedule', f).value.trim(), lat: $('#c-lat', f).value.trim(), lng: $('#c-lng', f).value.trim(), phones: readRows(f, 'phones').map(r => r[0]), emails: readRows(f, 'emails').map(r => r[0]) }); },
    seo: f => { Object.assign(set.seo, { titleSuffix: $('#seo-suffix', f).value.trim(), description: $('#seo-desc', f).value.trim(), ogImage: $('#seo-og', f).value.trim() }); },
    modules: () => { const other = S.sites.find(s => s.releaseNews && s.id !== site.id); if (mods.release_news && other) other.releaseNews = false; site.releaseNews = mods.release_news; if (mods.release_news && !S.newsCategories.includes('Обновления')) S.newsCategories.push('Обновления'); const { release_news: _r, ...rest } = mods; Object.assign(set.modules, rest); K.persist(); },
    footer: f => { set.footer.legal = readRows(f, 'legal'); set.footer.requisites = readRows(f, 'req'); set.footer.cookie = [$('#f-ck-l', f).value.trim(), $('#f-ck-p', f).value.trim()]; Object.assign(set.footer.subscribe, { title: $('#f-sb-t', f).value.trim(), consent: $('#f-sb-c', f).value.trim(), consentLink: $('#f-sb-l', f).value.trim(), consentPage: $('#f-sb-p', f).value.trim() }); set.footer.phoneNote = $('#f-phone', f).value.trim(); },
    theme: () => {}
  };
  main.addEventListener('submit', async e => {
    const f = e.target.closest('form[data-set]'); if (!f) return;
    e.preventDefault();
    const id = f.dataset.set;
    // Метрика без номера счётчика: открываем её подробности и показываем ошибку в поле (форма перерисована — берём новую)
    if (id === 'modules' && mods.metrika && !/^\d{5,10}$/.test(mods.metrikaId || '')) { mod = 'metrika'; render.modules(); const m = $('#m-id'); m.required = true; SNC.validate($('form[data-set="modules"]')); return; }
    if (!SNC.validate(f)) { SNC.toast({ type: 'err', title: 'Проверьте поля на вкладке' }); return; }
    if (id === 'modules' && mods.release_news && !site.releaseNews) {
      const other = S.sites.find(s => s.releaseNews && s.id !== site.id);
      if (other && !await SNC.confirm({ title: 'Перенос новостей о выпуске ПО', sub: `${other.domain} → ${site.domain}`, icon: 'i-update', cta: 'Перенести', items: [`Новости о выпуске ПО сейчас публикуются на ${other.domain}`, `Дальше они будут выходить на ${site.domain}`, `На ${other.domain} флаг снимется при сохранении; уже опубликованные новости там останутся`] })) return;
    }
    const b = $('[type="submit"]', f);
    b.dataset.loading = 'true'; b.insertAdjacentHTML('beforeend', '<span class="spinner" aria-hidden="true"></span>');
    setTimeout(() => { // TODO: PUT /admin/sites/:id/settings/<вкладка>
      delete b.dataset.loading; $('.spinner', b)?.remove();
      const toggled = apply[id](f);
      markDirty(id, false); head();
      if (toggled) { SNC.toast({ type: 'ok', title: site.enabled ? 'Сайт включён' : 'Сайт выключен' }); if (site.enabled && !K.blockReason(site)) K.rebuild(site); }
      else changed('Настройки сайта сохранены');
      if (id === 'modules') render.modules();
    }, 700);
  });

  /* ---------- Старт: раздел и вкладка из адреса ---------- */
  Object.values(render).forEach(fn => fn());
  const [sec0, tab0] = (location.hash.slice(1) || 'content/pages').split('/');
  showSection(lists[sec0] ? sec0 : 'content', $(`#t-${tab0}`) ? tab0 : null);
  // «Назад» в браузере и ссылки вида #settings/footer переключают раздел и вкладку без перезагрузки
  window.addEventListener('hashchange', async () => {
    const [s, t] = location.hash.slice(1).split('/');
    if (!lists[s] || !$(`#t-${t}`) || $(`#t-${t}`).getAttribute('aria-selected') === 'true' && section === s) return;
    if (!await leaveOk()) { history.replaceState(null, '', `#${section}/${lastTab[section]}`); return; }
    discardAll();
    showSection(s, t);
  });
})();
