/**
 * Tool Texture Preview —— 工具贴图预览：当前拼装的合成大图
 * 数据流与「当前拼装」面板同源：allSlotViews → fillChoices → toolTexture（游戏规则逐层叠放）；
 * 只画贴图不画属性，属性/评分在「当前拼装」面板。实时订阅 state 更新。
 */
import { repo, assets } from '../context.js';
import { state, subscribe } from '../state.js';
import { el, clear, textureImg } from './shared.js';
import { allSlotViews, fillChoices } from '../selection.js';
import type { Material } from '../../../src/data/types.js';

export function mountToolPreview(mount: HTMLElement): void {
  const title = el('div', 'panel-title');
  title.append(el('span', '', '工具贴图'), el('span', 'hint', '合成预览'));
  const body = el('div', 'panel-body');
  mount.append(title, body);

  const render = (): void => {
    clear(body);
    const gearTypeId = state.gearTypeId;
    if (!gearTypeId) {
      body.append(el('div', 'hint-text', '← 先选装备类型'));
      return;
    }
    const gearType = repo.getGearType(gearTypeId);
    if (!gearType) {
      body.append(el('div', 'error-box', `未知装备类型: ${gearTypeId}`));
      return;
    }

    let views;
    try {
      views = allSlotViews(repo, gearType);
    } catch (err) {
      body.append(el('div', 'error-box', err instanceof Error ? err.message : String(err)));
      return;
    }

    // 与装配面板同口径：必填槽兜底、附属槽空选不装
    const { filled } = fillChoices(views, state.materialChoices, new Set(gearType.requiredParts));
    const chosen = views.filter((v) => filled[v.slot] !== undefined);
    const texSlots = chosen
      .map((v) => ({ slot: v.slot, material: repo.getMaterial(filled[v.slot]!.id) }))
      .filter((x): x is { slot: typeof x.slot; material: Material } => !!x.material);

    const box = el('div', 'tool-preview-canvas');
    if (texSlots.length > 0) {
      // 16×16 合成图 8× 放大，pixelated 渲染（.mc-texture 统一）
      box.append(textureImg(assets.toolTexture(gearType, texSlots), 128));
    } else {
      box.append(el('div', 'hint-text', '未装配'));
    }
    body.append(box);
  };

  subscribe(render);
  render();
}
