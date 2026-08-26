/**
 * Calculation Engine —— trait 条件求值（MaterialRatioTraitCondition 等，attachable-parts-reference.md §4）
 *
 * 数据里 47 个材料 trait 实例带 conditions（35 material_ratio、7 or、3 gear_type、
 * 1 not、1 material_count）。单材料槽 ratio=1 恒通过、count=1 不够，所以此前被整体忽略
 * 只在单槽上漏了两个 trait（turtle / snow_walker / aquatic）；复合槽（槽内 ≥2 材料）必须求值。
 *
 * 语义（§4 权威 + 数据自证）：
 *   material_ratio：携带该 trait 的子材质数 / 子材质总数 ≥ ratio
 *   material_count：子材质总数 ≥ count（统计范围按槽 = part-scope，§4 全在复合材质框架下；整件 scope 待用户复核）
 *   gear_type：装备类型经 gearTypeMatches 匹配
 *   or / not：布尔组合，递归
 *   未知类型 fail-closed false（数据异常暴露而非静默通过）
 */
import type { TraitCondition } from '../data/types.js';

export interface TraitConditionContext {
  /** 当前装备类型 id（silentgear:pickaxe）—— gear_type 条件用 */
  gearTypeId: string;
  /** repo.gearTypeMatches(subjectId, ancestorId) —— gear_type 条件用 */
  gearTypeMatches: (subjectId: string, ancestorId: string) => boolean;
  /** 本槽子材质总数 —— material_ratio 分母 / material_count 计数 */
  slotMaterialCount: number;
  /** 本槽「携带本 trait」的子材质数（按材质去重）—— material_ratio 分子 */
  carryingCount: number;
}

function evaluateCondition(cond: TraitCondition, ctx: TraitConditionContext): boolean {
  switch (cond.type) {
    case 'silentgear:material_ratio':
      if (ctx.slotMaterialCount <= 0) return false;
      return ctx.carryingCount / ctx.slotMaterialCount >= (cond.ratio ?? 0);
    case 'silentgear:material_count':
      return ctx.slotMaterialCount >= (cond.count ?? 1);
    case 'silentgear:gear_type':
      return cond.gear_type !== undefined && ctx.gearTypeMatches(ctx.gearTypeId, cond.gear_type);
    case 'silentgear:or':
      return (cond.values ?? []).some((c) => evaluateCondition(c, ctx));
    case 'silentgear:not':
      return cond.value !== undefined && !evaluateCondition(cond.value, ctx);
    default:
      // fail-closed：未知条件类型按失败处理，数据异常会体现在 trait 缺失上
      return false;
  }
}

/** 空 conditions = 恒通过（目录材料绝大多数无条件） */
export function evaluateTraitConditions(conditions: TraitCondition[], ctx: TraitConditionContext): boolean {
  if (conditions.length === 0) return true;
  return conditions.every((c) => evaluateCondition(c, ctx));
}
