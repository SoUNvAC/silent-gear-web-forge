/**
 * Material Inventory —— 底部全部材料列表，点击切换拥有（未拥有 = 灰度）
 * 默认全部拥有（用户手动管理，localStorage 持久化，不臆造数据源）。
 */
import { repo, assets } from '../context.js';
import { materialName, materialNameEn } from '../names.js';
import { el, clear, textureImg } from './shared.js';
import { isOwned, toggleOwned, subscribeOwned } from '../owned.js';

export function mountInventory(mount: HTMLElement): void {
  const title = el('div', 'panel-title');
  const body = el('div', 'inventory-panel-body');
  mount.append(title, body);
  let expanded = false;
  let query = '';
  let filter: 'all' | 'owned' | 'missing' = 'all';

  const render = (): void => {
    clear(body);
    const all = [...repo.materials.values()].sort((a, b) => a.id.localeCompare(b.id));
    const owned = all.filter((m) => isOwned(m.id)).length;

    title.replaceChildren();
    const titleCopy = el('div', 'inventory-title-copy');
    titleCopy.append(el('span', '', '材料库存'), el('span', 'inv-count', `${owned}/${all.length} 已拥有`));
    const toggle = el('button', 'mc-btn inventory-toggle', expanded ? '收起库存' : '管理库存');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.addEventListener('click', () => {
      expanded = !expanded;
      render();
    });
    title.append(titleCopy, toggle);

    if (!expanded) {
      body.append(el('div', 'inventory-collapsed-copy', '库存只影响智能推荐；需要排除未拥有材料时再展开管理。'));
      return;
    }

    const controls = el('div', 'inventory-controls');
    const search = el('input', 'inventory-search');
    search.type = 'search';
    search.placeholder = '搜索库存材料…';
    search.value = query;
    search.addEventListener('input', () => {
      query = search.value;
      render();
      const next = body.querySelector<HTMLInputElement>('.inventory-search');
      next?.focus();
      next?.setSelectionRange(query.length, query.length);
    });
    controls.append(search);
    const filters = el('div', 'filter-toggle');
    for (const option of [
      { value: 'all' as const, label: '全部' },
      { value: 'owned' as const, label: '已拥有' },
      { value: 'missing' as const, label: '未拥有' },
    ]) {
      const button = el('button', `mc-btn${filter === option.value ? ' on' : ''}`, option.label);
      button.type = 'button';
      button.addEventListener('click', () => {
        filter = option.value;
        render();
      });
      filters.append(button);
    }
    controls.append(filters);
    body.append(controls);

    const needle = query.trim().toLowerCase();
    const visible = all.filter((m) => {
      if (filter === 'owned' && !isOwned(m.id)) return false;
      if (filter === 'missing' && isOwned(m.id)) return false;
      return !needle || materialName(m.id).toLowerCase().includes(needle) || materialNameEn(m.id).toLowerCase().includes(needle) || m.id.toLowerCase().includes(needle);
    });
    const grid = el('div', 'inventory-body');

    for (const m of visible) {
      const item = el('button', 'inv-item' + (isOwned(m.id) ? '' : ' unowned'));
      item.append(textureImg(assets.materialIcon(m), 28));
      item.append(el('span', '', materialName(m.id)));
      item.title = `${materialName(m.id)}（${isOwned(m.id) ? '已拥有' : '未拥有'}，点击切换）`;
      item.addEventListener('click', () => toggleOwned(m.id));
      grid.append(item);
    }
    if (visible.length === 0) grid.append(el('div', 'mat-empty', '没有匹配的库存材料'));
    body.append(grid);
  };

  subscribeOwned(render);
  render();
}
