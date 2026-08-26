/**
 * Tool Assembly —— 三节：核心槽 + 附属部件槽 + 升级部件
 * 槽 = MC 方块槽（part 图层按材质 tint），点击选中槽；未选槽自动兜底首候选材料。
 * 附属槽（tip/binding/grip/…）走 allSlotViews（真实 addableSlots + gear_type matches）；
 * 升级部件（misc_upgrade）走独立 upgrade 通道，算法 markdown 落地前只做选择列表。
 */
import { repo, assets } from '../context.js';
import { state, update, subscribe } from '../state.js';
import { materialName, slotName, partName } from '../names.js';
import { el, clear, textureImg } from './shared.js';
import { allSlotViews, fillChoices, upgradesForGear, upgradeEffects } from '../selection.js';
import type { CandidateSlotView } from '../../../src/optimizer/index.js';
import type { PartTypeId } from '../../../src/data/types.js';
import type { MaterialChoice } from '../../../src/calc/index.js';

/** 充能等级 → 罗马数字（Charge I/II/III；Lv.0 不显示） */
const CHARGE_ROMAN = ['', 'I', 'II', 'III'];

/** 单个槽方块（核心/附属共用）：part 图层 tint + 槽名 + 材料名 + 品级/充能徽章，点击选中 */
function slotBox(
  v: CandidateSlotView,
  filled: Partial<Record<PartTypeId, MaterialChoice>>,
  gearTypeId: string,
  selected: PartTypeId | null,
): HTMLElement {
  const choice = filled[v.slot];
  const mat = choice ? repo.getMaterial(choice.id) : undefined;
  const slot = el('button', 'slot' + (selected === v.slot ? ' selected' : ''));
  slot.addEventListener('click', () => update({ selectedSlot: v.slot }));

  const box = el('div', 'slot-box');
  if (mat) {
    const tex = assets.partSlotTexture(gearTypeId, v.slot, mat);
    if (tex) box.append(textureImg(tex, 36));
  } else {
    box.append(el('span', 'slot-empty', '?'));
  }
  slot.append(box);
  slot.append(el('div', 'slot-label', slotName(v.slot)));
  const slotMaterial = el('div', 'slot-material', mat ? materialName(mat.id) : '—');
  // 品级/充能徽章：该槽材质品级（NONE 不显示）+ 整件充能等级（Lv.0 不显示），格式「S Charge II」简洁
  const gradeTok = choice?.grade && choice.grade !== 'NONE' ? choice.grade : '';
  const chargeTok =
    state.chargeLevel > 0 ? `Charge ${CHARGE_ROMAN[state.chargeLevel] ?? String(state.chargeLevel)}` : '';
  const badge = [gradeTok, chargeTok].filter(Boolean).join(' ');
  if (badge) slotMaterial.append(el('span', 'slot-grade', ` · ${badge}`));
  slot.append(slotMaterial);

  const tip = el('div', 'mc-tooltip');
  tip.append(
    el('span', '', mat ? `${materialName(mat.id)}${badge ? `（${badge}）` : ''}` : '未选材料'),
  );
  slot.append(tip);
  return slot;
}

export function mountAssembly(mount: HTMLElement): void {
  const title = el('div', 'panel-title');
  title.append(el('span', '', '装配'), el('span', 'hint', '点槽位选材料'));
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

    const { filled, changed } = fillChoices(views, state.materialChoices);
    if (changed) {
      update({ materialChoices: filled });
      return;
    }

    const core = views.filter((v) => gearType.requiredParts.includes(v.slot));
    const addon = views.filter((v) => !gearType.requiredParts.includes(v.slot));

    // 核心槽
    body.append(el('div', 'slot-section-title', '核心部件'));
    const coreGrid = el('div', 'slot-grid');
    for (const v of core) coreGrid.append(slotBox(v, filled, gearTypeId, state.selectedSlot));
    body.append(coreGrid);

    // 附属部件槽（addableSlots − requiredParts，gear_type matches 已过滤）
    if (addon.length > 0) {
      body.append(el('div', 'slot-section-title', '附属部件'));
      const addonGrid = el('div', 'slot-grid');
      for (const v of addon) addonGrid.append(slotBox(v, filled, gearTypeId, state.selectedSlot));
      body.append(addonGrid);
    }

    // 升级部件（misc_upgrade：独立 upgrade 通道，非组装槽；按可用装备过滤，§5）
    const ups = upgradesForGear(repo, gearType);
    if (ups.length > 0) {
      body.append(el('div', 'slot-section-title', '升级部件'));
      const chips = el('div', 'upgrade-chips');
      for (const p of ups) {
        const on = state.upgrades.includes(p.id);
        const chip = el('button', 'upgrade-chip' + (on ? ' on' : ''), partName(p.id));
        chip.addEventListener('click', () => {
          const next = on ? state.upgrades.filter((u) => u !== p.id) : [...state.upgrades, p.id];
          update({ upgrades: next });
        });
        const tip = el('div', 'mc-tooltip');
        tip.append(el('span', '', upgradeEffects(p)));
        chip.append(tip);
        chips.append(chip);
      }
      body.append(chips);
    }
  };

  subscribe(render);
  render();
}
