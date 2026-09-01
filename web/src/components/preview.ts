/**
 * Tool Preview —— 当前拼装：关键属性 + traits（合成贴图见同侧结果栏）。
 */
import { repo, calc } from '../context.js';
import { state, subscribe } from '../state.js';
import { el, clear } from './shared.js';
import { renderStats } from './stats.js';
import { allSlotViews, fillChoices, upgradeAllowed, upgradeEffects } from '../selection.js';
import { gearTypeName, materialName, partName } from '../names.js';
import type { GearAssembly, MaterialChoice } from '../../../src/calc/index.js';
import type { PartTypeId } from '../../../src/data/types.js';

export function mountPreview(mount: HTMLElement): void {
  const title = el('div', 'panel-title');
  title.append(el('span', '', '当前拼装'), el('span', 'hint', '实时属性'));
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

    const { filled } = fillChoices(views, state.materialChoices, new Set(gearType.requiredParts));
    // 附属槽空选：未选的槽不装（不进装配/贴图/属性），必填槽已被 fillChoices 兜底
    const chosen = views.filter((v) => filled[v.slot] !== undefined);
    const assembly: GearAssembly = {
      gearType: gearTypeId,
      slots: [
        ...chosen.map((v) => {
          const c = filled[v.slot]!;
          const compound = state.compoundChoices[v.slot];
          if (compound && compound.length >= 2) {
            return { slot: v.slot, part: v.part.id, materials: compound.map((mc) => ({ ...mc })) };
          }
          const m: MaterialChoice = { id: c.id };
          // 品级逐槽：从该槽选择读品级（grade 缺省 / NONE = 不附加）；不再用全局 state.grade
          if (c.grade && c.grade !== 'NONE') m.grade = c.grade;
          return { slot: v.slot, part: v.part.id, materials: [m] };
        }),
        // 升级部件走 upgrade 通道：数值修正进全局池、固定 trait 进聚合池（§5）
        ...state.upgrades
          .map((pid) => repo.getPart(pid))
          .filter((p): p is NonNullable<typeof p> => !!p && upgradeAllowed(repo, gearTypeId, p))
          .map((p) => ({ slot: 'silentgear:misc_upgrade' as PartTypeId, part: p.id, materials: [] })),
      ],
    };

    try {
      const stats = calc.computeGearStats(assembly, {
        chargeLevel: state.chargeLevel,
        damageRatio: state.damageRatio,
      });

      const summary = el('div', 'build-summary');
      const summaryCopy = el('div', 'build-summary-copy');
      summaryCopy.append(el('strong', '', gearTypeName(gearTypeId)));
      const materialText = assembly.slots
        .filter((s) => s.materials.length > 0)
        .map((s) => s.materials.map((m) => materialName(m.id)).join('+'))
        .join(' · ');
      summaryCopy.append(el('span', '', materialText || '尚未装配材料'));
      summary.append(summaryCopy);
      if (state.chargeLevel > 0) summary.append(el('span', 'build-charge', `星光充能 Lv.${state.chargeLevel}`));
      body.append(summary);

      renderStats(body, gearType, stats);

      // 升级部件：已接入 upgrade 通道（数值 + trait 计入以上属性），悬浮看固定效果
      if (state.upgrades.length > 0) {
        const un = el('div', 'upgrades-note');
        un.append(el('div', 'slot-section-title', '升级部件'));
        const chips = el('div', 'upgrade-chips static');
        for (const pid of state.upgrades) {
          const p = repo.getPart(pid);
          if (p) {
            const chip = el('span', 'upgrade-chip on', partName(p.id));
            const tip = el('div', 'mc-tooltip');
            tip.append(el('span', '', upgradeEffects(p)));
            chip.append(tip);
            chips.append(chip);
          }
        }
        un.append(chips);
        un.append(el('div', 'hint-text', '升级部件已计入以上属性（upgrade 通道）'));
        body.append(un);
      }
    } catch (err) {
      body.append(el('div', 'error-box', err instanceof Error ? err.message : String(err)));
    }
  };

  subscribe(render);
  render();
}
