/**
 * Material Inventory —— 底部全部材料列表，点击切换拥有（未拥有 = 灰度）
 * 默认全部拥有（用户手动管理，localStorage 持久化，不臆造数据源）。
 */
import { repo, assets } from '../context.js';
import { materialName } from '../names.js';
import { el, clear, textureImg } from './shared.js';
import { isOwned, toggleOwned, subscribeOwned } from '../owned.js';

export function mountInventory(mount: HTMLElement): void {
  const title = el('div', 'panel-title');
  const body = el('div', 'inventory-body');
  mount.append(title, body);

  const render = (): void => {
    clear(body);
    const all = [...repo.materials.values()].sort((a, b) => a.id.localeCompare(b.id));
    const owned = all.filter((m) => isOwned(m.id)).length;

    title.replaceChildren();
    title.append(el('span', '', '材料库存'), el('span', 'inv-count', `${owned}/${all.length} 拥有 · 点击切换`));

    for (const m of all) {
      const item = el('button', 'inv-item' + (isOwned(m.id) ? '' : ' unowned'));
      item.append(textureImg(assets.materialIcon(m), 28));
      item.append(el('span', '', materialName(m.id)));
      item.title = `${materialName(m.id)}（${isOwned(m.id) ? '已拥有' : '未拥有'}，点击切换）`;
      item.addEventListener('click', () => toggleOwned(m.id));
      body.append(item);
    }
  };

  subscribeOwned(render);
  render();
}
