/* =========================================================
   СНК · Управление продуктами — редактор страницы сайта (SitePageItem.vue + SitePageBlocks.vue).
   ?site=<id>&page=<id>. Поля страницы и «Поиск и превью страницы», блоки: добавить по типу
   из контракта, править по схеме, переставлять (перетаскивание или «Выше/Ниже»), удалить.
   Предпросмотр — сохранённое состояние; с несохранёнными правками сначала спрашиваем. TODO: API.
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const K = window.SNC_SITEKIT, SNC = window.SNC, S = K.S;
  const { esc, ico } = K;
  const site = K.site();
  const pid = Number(new URLSearchParams(location.search).get('page')) || 1;
  const page = S.sitePages.find(p => p.id === pid) || S.sitePages[0];
  const TYPES = Object.fromEntries(S.blockTypes.map(t => [t.type, t]));

  // Блоки главной — из демо-данных; у остальных страниц — по числу блоков в списке
  const CYCLE = ['rich_text', 'documents', 'contacts', 'catalog'];
  let saved = page.id === 1 ? S.pageBlocks : Array.from({ length: page.blocks }, (_, i) => ({ id: page.id * 100 + i, type: page.slug === 'equipment' && i === 1 ? 'catalog' : page.slug === 'software' && i === 1 ? 'software_catalog' : page.slug === 'cart' ? 'cart_checkout' : CYCLE[i % CYCLE.length], summary: i === 0 ? `Вводный текст страницы «${page.title}»` : 'Содержимое блока' }));
  let blocks = saved.slice();

  /* ---------- Шапка и крошки: Сайты / домен / страница ---------- */
  const back = `site.html?site=${site.id}#content/pages`;
  $$('[data-back]').forEach(a => { a.href = back; });
  const crumbs = $('.crumbs [aria-current]');
  crumbs.insertAdjacentHTML('beforebegin', `<a href="${back}">${esc(site.domain)}</a><span class="crumbs__sep" aria-hidden="true">/</span>`);
  const head = () => {
    document.title = `${page.title} · ${site.domain} · Управление продуктами СНК`;
    crumbs.textContent = page.title;
    $('[data-pg-slug]').textContent = page.slug ? `/${page.slug}` : '/ (главная)';
    $('[data-pg-site]').textContent = site.domain;
    $('[data-pg-status]').innerHTML = `<span class="st st--${page.status === 'published' ? 'ok' : 'off'}">${page.status === 'published' ? 'Опубликована' : 'Черновик'}</span>`;
    $('[data-pg-blocks]').textContent = blocks.length;
    $('[data-pg-updated]').textContent = page.updated;
  };
  head();
  $('[data-pg-host]').textContent = `${site.domain}/`;
  $('[data-contract-line]').textContent = `контракт ${S.contract.version} · рендер ${S.contract.commit}`;

  /* ---------- Поля страницы ---------- */
  const form = $('#pg-form');
  const fill = () => {
    $('#pg-slug').value = page.slug; $('#pg-title').value = page.title; $('#pg-status').value = page.status;
    $('#pg-seo-title').value = page.seoTitle || ''; $('#pg-seo-desc').value = page.seoDesc || ''; $('#pg-seo-og').value = page.seoOg || ''; $('#pg-seo-can').value = page.seoCanonical || '';
    descLen();
  };
  const descLen = () => { const n = $('#pg-seo-desc').value.trim().length; const el = $('[data-pg-desc-len]'); el.textContent = n ? `${n} из ~160 символов${n > 160 ? ' — поисковики обрежут' : ''}` : 'Пусто — общее описание сайта'; el.classList.toggle('len--over', n > 160); };
  let dirty = false;
  const setDirty = v => { dirty = v; $('.actionbar__note', form).hidden = !v; };
  form.addEventListener('input', e => { setDirty(true); if (e.target.id === 'pg-seo-desc') descLen(); if (e.target.id === 'pg-slug') e.target.setCustomValidity(''); });
  form.addEventListener('change', () => setDirty(true));
  window.addEventListener('beforeunload', e => { if (dirty || orderDirty) { e.preventDefault(); e.returnValue = ''; } });
  const save = () => new Promise(resolve => {
    const slug = $('#pg-slug');
    slug.value = slug.value.trim().toLowerCase();
    if (S.sitePages.some(p => p !== page && p.slug === slug.value)) { slug.dataset.err = 'Страница с таким адресом на этом сайте уже есть'; slug.setCustomValidity('taken'); }
    else { slug.dataset.err = 'Только строчная латиница, цифры и дефис (например about-us)'; slug.setCustomValidity(''); }
    if (!SNC.validate(form)) return resolve(false);
    const btns = $$('[type="submit"][form="pg-form"], #pg-form [type="submit"]');
    btns.forEach(b => { b.dataset.loading = 'true'; b.insertAdjacentHTML('beforeend', '<span class="spinner" aria-hidden="true"></span>'); });
    setTimeout(() => { // TODO: PUT /admin/sites/:id/pages/:pageId
      btns.forEach(b => { delete b.dataset.loading; $('.spinner', b)?.remove(); });
      Object.assign(page, { slug: slug.value, title: $('#pg-title').value.trim(), status: $('#pg-status').value, seoTitle: $('#pg-seo-title').value.trim(), seoDesc: $('#pg-seo-desc').value.trim(), seoOg: $('#pg-seo-og').value.trim(), seoCanonical: $('#pg-seo-can').value.trim(), updated: '20.10.2026 14:05' });
      setDirty(false); head(); preview();
      const how = K.touched(site);
      SNC.toast({ type: 'ok', title: 'Страница сохранена', text: page.status === 'published' ? how : 'Черновик на сайте не виден' });
      resolve(true);
    }, 600);
  });
  form.addEventListener('submit', e => { e.preventDefault(); save(); });

  /* ---------- Предпросмотр: сохранённое состояние страницы ---------- */
  const PREVIEW = { 1: '../../sncard/index.html', 2: '../../snc-service/index.html', 3: '../../zao-sncard/index.html' };
  const preview = () => {
    const why = !site.enabled ? 'Предпросмотра нет: сайт выключен и не собирается' : !K.home() ? 'Предпросмотра нет: у сайта нет опубликованной главной страницы, сайт не собирается' : '';
    $('[data-pv-tip]').dataset.tip = why || 'Открыть сохранённую версию в новой вкладке';
    $('[data-preview]').disabled = !!why;
  };
  preview();
  $('[data-preview]').addEventListener('click', async () => {
    if (dirty) {
      if (!await SNC.confirm({ title: 'Несохранённые правки', sub: page.title, icon: 'i-eye', cta: 'Сохранить и открыть', items: ['Предпросмотр показывает сохранённое состояние страницы', 'Правки сохранятся, затем откроется предпросмотр'] })) return;
      if (!await save()) return;
    }
    if (orderDirty) SNC.toast({ type: 'warn', title: 'Порядок блоков не сохранён', text: 'В предпросмотре он будет прежним.' });
    const w = window.open(PREVIEW[site.id] || PREVIEW[1], '_blank', 'noopener');
    if (!w) SNC.toast({ type: 'warn', title: 'Браузер заблокировал новое окно', text: 'Разрешите всплывающие окна для этого адреса.' });
  });

  /* ---------- Блоки ---------- */
  const list = $('[data-blocks]');
  let orderDirty = false;
  const setOrderDirty = v => { orderDirty = v; $('[data-order-note]').hidden = !v; };
  const iconBtn = (act, icon, tip, extra = '') => `<button class="icon-btn icon-btn--sm" type="button" data-act="${act}" data-tip="${esc(tip)}" aria-label="${esc(tip)}"${extra}>${ico(icon)}</button>`;
  const renderBlocks = () => {
    $('[data-pg-blocks]').textContent = blocks.length;
    list.innerHTML = blocks.length ? blocks.map((b, i) => `<li class="block" data-bid="${b.id}" draggable="true">
        <span class="block__grip" aria-hidden="true">${ico('i-grip')}</span>
        <span class="block__n mono">${String(i + 1).padStart(2, '0')}</span>
        <div class="block__main"><b>${esc(TYPES[b.type]?.title || b.type)}</b><span class="mono muted">${esc(b.type)}</span><p>${esc(b.summary)}</p></div>
        <span class="row-acts">${iconBtn('up', 'i-up', 'Выше', i === 0 ? ' disabled' : '')}${iconBtn('down', 'i-down', 'Ниже', i === blocks.length - 1 ? ' disabled' : '')}${iconBtn('edit', 'i-edit', 'Редактировать блок')}${iconBtn('del', 'i-trash', 'Удалить блок')}</span>
      </li>`).join('')
      : `<li class="empty"><svg class="empty__art" viewBox="0 0 176 112" aria-hidden="true"><rect class="bp-soft" x="40" y="12" width="96" height="22" rx="3"/><rect class="bp-soft" x="40" y="44" width="96" height="22" rx="3"/><rect class="bp" x="40" y="76" width="96" height="22" rx="3" stroke-dasharray="4 4"/><path class="bp-accent" d="M88 81v12M82 87h12"/></svg>
        <div class="empty__title">Блоков пока нет</div><p class="empty__text">Страница без блоков на сайте пустая. Начните с первого экрана или текстового блока.</p></li>`;
  };
  const moveBlock = (i, d) => { const j = i + d; if (j < 0 || j >= blocks.length) return; [blocks[i], blocks[j]] = [blocks[j], blocks[i]]; setOrderDirty(true); renderBlocks(); };
  list.addEventListener('click', async e => {
    const b = e.target.closest('[data-act]'), li = e.target.closest('[data-bid]'); if (!b || !li) return;
    const i = blocks.findIndex(x => x.id === Number(li.dataset.bid)), blk = blocks[i];
    if (b.dataset.act === 'up' || b.dataset.act === 'down') { moveBlock(i, b.dataset.act === 'up' ? -1 : 1); const nb = $(`[data-bid="${blk.id}"]`); nb.classList.add('is-changed'); ($(`[data-act="${b.dataset.act}"]:not([disabled])`, nb) || $('[data-act="edit"]', nb)).focus(); }
    if (b.dataset.act === 'edit') editBlock(blk);
    if (b.dataset.act === 'del') {
      if (!await SNC.confirm({ title: 'Удалить блок?', sub: `${TYPES[blk.type]?.title} · ${blk.summary}`, icon: 'i-trash', cta: 'Удалить', items: ['Блок пропадёт со страницы после сборки', 'Сразу после удаления его можно отменить'] })) return;
      blocks.splice(i, 1); commit();
      SNC.toast({ type: 'ok', title: 'Блок удалён', duration: 8000, action: { label: 'Вернуть', onClick: () => { blocks.splice(i, 0, blk); commit(); } } });
    }
  });
  // Сохранение состава блоков: порядок, добавление, удаление → автосборка
  const commit = (msg) => {
    saved = blocks.slice(); if (page.id === 1) S.pageBlocks.splice(0, Infinity, ...blocks);
    page.blocks = blocks.length; page.updated = '20.10.2026 14:05';
    setOrderDirty(false); renderBlocks(); head();
    const how = K.touched(site);
    if (msg) SNC.toast({ type: 'ok', title: msg, text: page.status === 'published' ? how : 'Черновик на сайте не виден' });
  };
  $('[data-order-save]').addEventListener('click', () => commit('Порядок блоков сохранён'));

  // Перетаскивание мышью; с клавиатуры — кнопки «Выше/Ниже»
  let drag = null;
  list.addEventListener('dragstart', e => { drag = e.target.closest('[data-bid]'); if (!drag) return; drag.classList.add('is-drag'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', drag.dataset.bid); });
  list.addEventListener('dragover', e => {
    if (!drag) return; e.preventDefault();
    const over = e.target.closest('[data-bid]'); if (!over || over === drag) return;
    const r = over.getBoundingClientRect();
    over[e.clientY < r.top + r.height / 2 ? 'before' : 'after'](drag);
  });
  list.addEventListener('dragend', () => {
    if (!drag) return; drag.classList.remove('is-drag');
    const order = $$('[data-bid]', list).map(li => Number(li.dataset.bid));
    const changed = order.some((id, i) => id !== blocks[i].id);
    blocks = order.map(id => blocks.find(b => b.id === id)); drag = null;
    if (changed) { setOrderDirty(true); renderBlocks(); }
  });

  /* ---------- Добавление и правка блока по схеме ---------- */
  $('[data-btypes]').innerHTML = S.blockTypes.map(t => `<button class="btype" type="button" data-btype="${t.type}"><b>${esc(t.title)}</b><span class="mono muted">${t.type}</span><small>${esc(t.text)}</small></button>`).join('');
  $('[data-block-add]').addEventListener('click', () => SNC.dialog.open('dlg-block-type'));
  $('[data-btypes]').addEventListener('click', e => {
    const b = e.target.closest('[data-btype]'); if (!b) return;
    SNC.dialog.close('dlg-block-type');
    editBlock({ id: 0, type: b.dataset.btype, summary: '' });
  });
  // Поля по типу блока — упрощённая схема контракта (в боевом SchemaForm строит форму из JSON Schema)
  const SCHEMA = {
    hero: [['title', 'Заголовок', 'text', true], ['lead', 'Подзаголовок', 'textarea'], ['button_label', 'Текст кнопки', 'text'], ['button_href', 'Ссылка кнопки', 'mono']],
    rich_text: [['html', 'Содержимое', 'textarea', true]],
    metrics: [['title', 'Заголовок', 'text'], ['items', 'Метрики — по одной в строке: «значение — подпись»', 'textarea', true]],
    history: [['title', 'Заголовок', 'text'], ['items', 'История — по строке: «год — событие»', 'textarea', true]],
    news_list: [['title', 'Заголовок', 'text'], ['category', 'Категория', 'cat'], ['limit', 'Количество новостей', 'num', true, 1, 12], ['more_label', 'Текст ссылки «Все»', 'text']],
    station_network: [['title', 'Заголовок', 'text'], ['anchor', 'Якорь секции (id)', 'mono'], ['lead_html', 'Вводный текст', 'textarea']],
    catalog: [['title', 'Заголовок', 'text'], ['page_size', 'Товаров на страницу', 'num', false, 4, 48]],
    software_catalog: [['title', 'Заголовок', 'text'], ['lead', 'Подзаголовок', 'textarea']],
    documents: [['title', 'Заголовок', 'text'], ['sections', 'Разделы (slug через запятую)', 'mono', true]],
    contacts: [['title', 'Заголовок', 'text'], ['phone', 'Телефон', 'mono'], ['phone_label', 'Подпись телефона', 'text'], ['email_label', 'Подпись почты', 'text']],
    cart_checkout: [['title', 'Заголовок', 'text', true], ['caption', 'Надпись', 'textarea']]
  };
  const bForm = $('#form-block');
  let editing = null;
  function editBlock(blk) {
    editing = blk;
    const t = TYPES[blk.type];
    $('#dlg-b-t').textContent = blk.id ? `Блок: ${t.title}` : `Новый блок: ${t.title}`;
    $('[data-b-sub]').textContent = `${blk.type} · контракт ${S.contract.version}`;
    $('[data-b-fields]').innerHTML = SCHEMA[blk.type].map(([key, label, type, req, min, max]) => {
      const id = `bf-${key}`, r = req ? ' required' : '';
      const v = blk.id ? ({ title: blk.summary.split(' · ')[0], limit: '3', html: blk.summary, items: '30 — лет на рынке\n180+ — АЗС в сети' }[key] || '') : (type === 'num' ? String(min || 1) : '');
      const ctl = type === 'textarea' ? `<textarea class="in" id="${id}"${r} style="min-height:96px">${esc(v)}</textarea>`
        : type === 'cat' ? `<select class="in" id="${id}"><option value="">Все темы</option>${S.newsCategories.map(c => `<option>${esc(c)}</option>`).join('')}</select>`
        : `<input class="in${type !== 'text' ? ' in--mono' : ''}" id="${id}"${r}${type === 'num' ? ` type="number" min="${min}" max="${max}"` : ''} value="${esc(v)}" autocomplete="off">`;
      return `<div class="fld span-${type === 'num' || type === 'cat' ? 6 : 12}"><label class="fld__label" for="${id}">${esc(label)}${req ? ' <span class="fld__req" aria-hidden="true">*</span>' : ''}</label>${ctl}${type === 'num' ? `<span class="fld__hint">От ${min} до ${max}</span>` : ''}<span class="fld__err"></span></div>`;
    }).join('');
    SNC.dialog.open('dlg-block');
    requestAnimationFrame(() => $('input, textarea, select', bForm)?.focus());
  }
  bForm.addEventListener('submit', e => {
    e.preventDefault();
    if (!SNC.validate(bForm)) return;
    const first = $('input, textarea', bForm), v = first.value.trim();
    const summary = (v || TYPES[editing.type].text).split('\n')[0].slice(0, 90);
    SNC.dialog.close('dlg-block');
    if (editing.id) { editing.summary = summary; commit('Блок сохранён'); $(`[data-bid="${editing.id}"]`).classList.add('is-changed'); return; }
    const nb = { id: Date.now(), type: editing.type, summary };
    blocks.push(nb); commit('Блок добавлен');
    $(`[data-bid="${nb.id}"]`).classList.add('is-changed');
    $(`[data-bid="${nb.id}"]`).scrollIntoView({ block: 'nearest' });
  });

  fill(); renderBlocks();
})();
