/**
 * Tool Preview —— 当前拼装：合成贴图 + 属性 + traits + 当前评分
 * 数据流：ToolBuild → Calc（computeGearStats）→ Rating（evaluate 单件）→ UI；
 * 单件评分是群体相对退化值，仅作参考，标注注明，不重写公式。
 */
import { repo, calc, rating, assets } from '../context.js';
import { state, subscribe } from '../state.js';
import { el, clear, textureImg } from './shared.js';
import { formatNum } from '../format.js';
import { renderStats } from './stats.js';
import { allSlotViews, fillChoices, upgradeAllowed, upgradeEffects } from '../selection.js';
import { partName } from '../names.js';
import type { GearAssembly, MaterialChoice } from '../../../src/calc/index.js';
import type { Material, PartTypeId } from '../../../src/data/types.js';

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

    const { filled } = fillChoices(views, state.materialChoices);
    const assembly: GearAssembly = {
      gearType: gearTypeId,
      slots: [
        ...views.map((v) => {
          const c = filled[v.slot]!;
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

    // 合成贴图
    const texSlots = views
      .map((v) => ({ slot: v.slot, material: filled[v.slot] ? repo.getMaterial(filled[v.slot]!.id) : undefined }))
      .filter((x): x is { slot: typeof x.slot; material: Material } => !!x.material);
    const iconBox = el('div', 'preview-icon');
    if (texSlots.length > 0) iconBox.append(textureImg(assets.toolTexture(gearTypeId, texSlots), 72));
    body.append(iconBox);

    try {
      const stats = calc.computeGearStats(assembly, {
        chargeLevel: state.chargeLevel,
        damageRatio: state.damageRatio,
      });

      // 当前评分：RatingEngine.evaluate 单件（群体相对 → 退化分）
      let ratingText: string;
      try {
        const outcome = rating.evaluate([stats], 'weighted');
        const total = outcome.builds[0]?.total;
        ratingText = `当前评分 ${formatNum(total ?? 0)}（${outcome.profile?.id ?? '默认'}）`;
      } catch (err) {
        ratingText = `评分不可用：${err instanceof Error ? err.message : String(err)}`;
      }
      const rb = el('div', 'rating-box');
      rb.append(el('div', 'rating-value', ratingText));
      rb.append(el('div', 'rating-note', '单件群体相对评分，仅供参考'));
      body.append(rb);

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
