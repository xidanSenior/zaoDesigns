/* =========================================================
   СНК · Личный кабинет — ячейки и строки реестров.
   Один модуль на двоих: tools/generate.mjs строит им статичные строки,
   js/registry.js — новые и изменённые строки в браузере. Так разметка не расходится.
   Типы колонок:
     main   — название-ссылка + подпись (col.sub) моноширинным
     text   — текст (+ col.sub)       mono — моноширинный
     num    — число по правому краю    money — сумма, 2 знака
     date   — дд.мм.гггг[ чч:мм], сортируется как дата
     status — .st со знаком: подпись row[key], знак row[col.stKey || 'st']
     bool   — .st ok/off с подписями col.yes / col.no
     button — кнопка действия строки (data-row-action = col.action)
   ========================================================= */
(function (root) {
  const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const nf = new Intl.NumberFormat('ru-RU');
  const money = n => new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);
  // «30.09.2026 14:05» → 202609301405 для сортировки
  const dateKey = s => { const m = String(s).match(/(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?/); return m ? `${m[3]}${m[2]}${m[1]}${m[4] || '00'}${m[5] || '00'}` : '0'; };

  function cell(col, row) {
    const v = row[col.key];
    const sub = col.sub && row[col.sub] !== undefined && row[col.sub] !== '' ? `<span class="cell-sub${col.subMono === false ? '' : ' mono'}">${esc(row[col.sub])}</span>` : '';
    switch (col.type) {
      case 'main': {
        const label = row._href ? `<a href="${esc(row._href)}">${esc(v)}</a>` : esc(v);
        return `<td class="cell-main" data-v="${esc(v)}">${label}${sub}</td>`;
      }
      case 'mono': return `<td class="mono" data-v="${esc(v)}">${esc(v)}${sub}</td>`;
      case 'num': return `<td class="num-cell" data-v="${Number(v) || 0}">${v === '' || v === null || v === undefined ? '—' : nf.format(v)}</td>`;
      case 'money': return `<td class="num-cell" data-v="${Number(v) || 0}">${v === '' || v === null || v === undefined ? '—' : money(v)}</td>`;
      case 'date': return `<td class="mono" data-v="${dateKey(v)}">${esc(v)}</td>`;
      case 'status': return `<td data-v="${esc(v)}"><span class="st st--${esc(row[col.stKey || 'st'] || 'off')}">${esc(v)}</span></td>`;
      case 'bool': return `<td data-v="${v ? 1 : 0}"><span class="st st--${v ? 'ok' : 'off'}">${esc(v ? (col.yes || 'Да') : (col.no || 'Нет'))}</span></td>`;
      case 'button': return `<td class="col-btn"><button class="btn btn--outline btn--xs" type="button" data-row-action="${esc(col.action)}"><span>${esc(col.label)}</span></button></td>`;
      default: return `<td data-v="${esc(v)}">${esc(v)}${sub}</td>`;
    }
  }

  const checkbox = label => `<td class="col-check"><label class="cb"><input type="checkbox" aria-label="${esc(label)}"><span class="cb__box"><svg viewBox="0 0 12 12"><path class="cb__tick" d="M2.5 6.2l2.3 2.3L9.5 3.5"/><path class="cb__dash" d="M3 6h6"/></svg></span></label></td>`;

  /* Строка реестра. def: { columns, filters, select, menu }; row — плоский объект с id */
  function row(def, r) {
    const main = def.columns.find(c => c.type === 'main') || def.columns[0];
    const data = {};
    (def.formKeys || []).forEach(k => { data[k] = r[k]; });
    data.id = r.id;
    const f = (def.filters || []).map(x => ` data-f-${x.key}="${esc(r[x.key])}"`).join('');
    return `<tr data-id="${esc(r.id)}"${f} data-row="${esc(JSON.stringify(data))}">`
      + (def.select === false ? '' : checkbox(`Выбрать: ${r[main.key]}`))
      + def.columns.map(c => cell(c, r)).join('')
      + (def.menu === false ? '' : `<td class="col-actions"><button class="icon-btn icon-btn--sm" type="button" data-row-menu aria-label="Действия: ${esc(r[main.key])}"><svg class="ico" aria-hidden="true"><use href="#i-more"/></svg></button></td>`)
      + '</tr>';
  }

  const CELLS = { esc, nf, money, dateKey, cell, row, checkbox };
  if (typeof module === 'object' && module.exports) module.exports = CELLS;
  else root.SNC_CELLS = CELLS;
})(this);
