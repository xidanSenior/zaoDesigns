/* =========================================================
   СНК · Управление продуктами — общее для экранов «Сайты»:
   статус сборки (SiteBuildStatus.vue), пересборка с живым ходом,
   текущий сайт из ?site=, подтверждения включения/выключения.
   В боевом статус сборки приходит по websocket (NATS); здесь — таймеры. TODO: API /admin/sites/*.
   ========================================================= */
(() => {
  'use strict';

  const S = window.SNC_SITES, SNC = window.SNC;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ico = id => `<svg class="ico" aria-hidden="true"><use href="#${id}"/></svg>`;

  // Правки, сделанные на других экранах прототипа (включение, сборка), живут до закрытия вкладки
  const KEY = 'snc-mgmt-sites';
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (saved) saved.forEach(x => { const s = S.sites.find(y => y.id === x.id); if (s) Object.assign(s, x); else S.sites.push(x); });
  } catch (e) { /* без хранилища — демо-значения */ }
  const persist = () => { try { sessionStorage.setItem(KEY, JSON.stringify(S.sites)); } catch (e) { /* не страшно */ } };

  // Список, который должен пережить переход между экранами (страницы сайта, блоки): восстановить и вернуть «сохранить»
  const keep = (name, arr) => {
    const k = `${KEY}-${name}`;
    try { const v = JSON.parse(sessionStorage.getItem(k) || 'null'); if (Array.isArray(v)) arr.splice(0, arr.length, ...v); } catch (e) { /* демо-значения */ }
    return () => { try { sessionStorage.setItem(k, JSON.stringify(arr)); } catch (e) { /* не страшно */ } };
  };

  const BADGE = {
    queued: ['В очереди', 'info'], running: ['Пересборка', 'info'], success: ['Собрано', 'ok'],
    failed: ['Ошибка сборки', 'err'], never: ['Не собрано', 'off']
  };
  const dur = s => s < 60 ? `${s} с` : `${Math.floor(s / 60)} мин ${s % 60} с`;
  const stamp = s => s.builtAt ? `${s.builtAt}${s.took ? ` (за ${dur(s.took)})` : ''}` : 'ещё не собирался';
  const badge = s => { const [label, tone] = BADGE[s.build]; return `<span class="st st--${tone}${s.build === 'running' ? ' is-pulse' : ''}">${label}</span>`; };
  const now = () => { const d = new Date(); const p = n => String(n).padStart(2, '0'); return `20.10.2026 ${p(d.getHours())}:${p(d.getMinutes())}`; };
  const home = () => S.sitePages.find(p => p.slug === '' && p.status === 'published');

  // Почему сайт нельзя собрать — то же, что disabled у кнопки «Пересобрать» в боевом
  const blockReason = s => !s.enabled ? 'Сайт выключен — включите и сохраните, чтобы собрать'
    : !home() ? 'Сайт не собрать: нет опубликованной главной страницы'
    : ['queued', 'running'].includes(s.build) ? 'Сборка уже идёт' : '';

  /* Пересборка: очередь → сборка → результат. onTick(site) — перерисовать то, что зависит от статуса */
  const listeners = new Set();
  const emit = s => { persist(); listeners.forEach(fn => fn(s)); };
  function rebuild(s) {
    s.build = 'queued'; emit(s);
    setTimeout(() => { s.build = 'running'; emit(s); }, 900);
    setTimeout(() => {
      // demo: zao-sncard.ru падает со сборкой, пока не поправят блок — видно состояние ошибки
      const fail = s.id === 3 && !s._fixed;
      s.build = fail ? 'failed' : 'success'; s.builtAt = now(); s.took = fail ? 19 : 58 + s.id * 3; s.stale = fail;
      emit(s);
      SNC.toast(fail
        ? { type: 'err', title: `${s.domain}: ошибка сборки`, text: 'Блок «Сеть АЗС» на главной не прошёл проверку схемы. Лог сборки — в статусе сайта.' }
        : { type: 'ok', title: `${s.domain} собран и опубликован`, text: `За ${dur(s.took)}` });
    }, 3600);
  }
  const askRebuild = async s => {
    if (!await SNC.confirm({ title: 'Пересобрать сайт?', sub: s.domain, icon: 'i-refresh', cta: 'Пересобрать',
      items: [`Сайт ${s.domain} будет заново собран из текущего содержимого и опубликован на хостинге`, 'Ход сборки виден в колонке «Сборка» и в статусе сайта', 'Посетители до конца сборки видят прежнюю версию'] })) return false;
    rebuild(s); SNC.toast({ type: 'info', title: 'Пересборка запущена', text: s.domain, duration: 2500 });
    return true;
  };
  const askToggle = async (s, on) => {
    const ok = await SNC.confirm(on
      ? { title: 'Включить сайт?', sub: s.domain, icon: 'i-globe', cta: 'Включить', items: [`Сайт ${s.domain} будет включён`, 'Если у него опубликована главная страница, он сразу пересоберётся и опубликуется на хостинге'] }
      : { title: 'Выключить сайт?', sub: s.domain, icon: 'i-globe', cta: 'Выключить', items: ['Новые сборки запускаться не будут, кнопки «Пересобрать» погаснут', 'Уже опубликованная версия остаётся на хостинге', 'Рассылка и новости о выпуске на этот сайт не уходят'] });
    if (!ok) return false;
    s.enabled = on; emit(s);
    SNC.toast({ type: 'ok', title: on ? 'Сайт включён' : 'Сайт выключен', text: s.domain });
    if (on && home()) rebuild(s);
    return true;
  };

  /* Статус сборки для шапки сайта: значок, дата, предупреждение «на сайте старая версия», лог */
  function statusHtml(s) {
    const why = blockReason(s);
    const stale = s.build === 'never' ? 'Сайт ещё ни разу не собирался — опубликованной версии нет.' : s.stale && s.build !== 'running' && s.build !== 'queued' ? 'Правки новее последней успешной сборки — на сайте пока старая версия.' : '';
    return `<div class="bstat" data-bstat>
      <div class="bstat__main">${badge(s)}<span class="mono muted">${s.build === 'running' ? 'идёт пересборка…' : s.build === 'queued' ? 'в очереди на пересборку' : esc(stamp(s))}</span></div>
      ${stale ? `<p class="bstat__stale">${ico('i-warn')}${stale}</p>` : ''}
      <div class="bstat__acts">
        ${s.build === 'failed' ? `<button class="btn btn--ghost btn--xs" type="button" data-build-log><span>Показать лог</span></button>` : ''}
        <span data-tip="${esc(why || 'Пересобрать сайт')}"><button class="btn btn--outline btn--xs" type="button" data-rebuild ${why ? 'disabled' : ''}>${ico('i-refresh')}<span>Пересобрать</span></button></span>
      </div></div>`;
  }
  const log = s => `[11:41:02] builder-worker: сайт ${s.domain}, контракт блоков ${S.contract.version}
[11:41:03] страницы: ${S.sitePages.filter(p => p.status === 'published').length} опубликовано
[11:41:09] рендер «/» … блок station_network #4
[11:41:09] ОШИБКА: points[3].lat — обязательное поле (схема station_network)
[11:41:09] сборка остановлена, на хостинге остаётся версия от 18.10.2026 17:02`;

  const siteId = Number(new URLSearchParams(location.search).get('site')) || 1;
  const site = () => S.sites.find(s => s.id === siteId) || S.sites[0];

  const savePages = keep('pages', S.sitePages);
  const saveBlocks = keep('blocks', S.pageBlocks);

  /* Правка содержимого включённого сайта запускает автосборку; если сборка уже идёт — правки попадут в следующую;
     выключенный сайт только помечается «есть несобранные правки». Возвращает текст для тоста. */
  const touched = s => {
    savePages(); saveBlocks();
    if (!blockReason(s)) { rebuild(s); return 'Сайт пересобирается — изменения появятся через минуту'; }
    s.stale = true; emit(s);
    if (['queued', 'running'].includes(s.build)) return 'Сборка уже идёт — правки попадут в следующую, запустите её после окончания';
    return !s.enabled ? 'Сайт выключен: изменения появятся после включения и сборки' : 'Сайт не собирается: нет опубликованной главной страницы';
  };

  window.SNC_SITEKIT = { S, esc, ico, badge, stamp, dur, rebuild, askRebuild, askToggle, blockReason, statusHtml, log, site, home, onChange: fn => listeners.add(fn), persist, savePages, saveBlocks, touched, BADGE };
})();
