/**
 * Trait 条件求值 —— 纯函数测试（真实数据形状，crafted context）
 * 语义权威源 = attachable-parts-reference.md §4 + data 自证：
 *   aluminum soft        ratio 0.5（单材 1≥0.5 通过）
 *   turtle               count 2（单材 1<2 失败、2 材通过）
 *   leather snow_walker  gear_type boots
 *   prismarine aquatic   ratio 0.67（level5）/ not(ratio 0.67)（level3）
 *   diamond lustrous     or(count 3, ratio 0.5)（单材 ratio 通过）
 */
import { describe, expect, it } from 'vitest';
import { evaluateTraitConditions } from './trait-conditions.js';
import type { TraitConditionContext } from './trait-conditions.js';
import type { TraitCondition } from '../data/types.js';

function ctx(overrides: Partial<TraitConditionContext> = {}): TraitConditionContext {
  return {
    gearTypeId: 'silentgear:pickaxe',
    gearTypeMatches: () => false, // 默认不匹配任何祖先（boots 等条件失败）
    slotMaterialCount: 1,
    carryingCount: 1,
    ...overrides,
  };
}

const ratio = (n: number): TraitCondition => ({ type: 'silentgear:material_ratio', ratio: n });
const count = (n: number): TraitCondition => ({ type: 'silentgear:material_count', count: n });
const gearType = (id: string): TraitCondition => ({ type: 'silentgear:gear_type', gear_type: id });

describe('evaluateTraitConditions', () => {
  it('空 conditions 恒通过', () => {
    expect(evaluateTraitConditions([], ctx())).toBe(true);
  });

  it('material_ratio：单材携带恒通过（aluminum soft ratio 0.5）', () => {
    expect(evaluateTraitConditions([ratio(0.5)], ctx())).toBe(true);
  });

  it('material_ratio 0.67：2 材复合 1 携带 → 0.5 < 0.67 失败（prismarine level5 分支）', () => {
    expect(evaluateTraitConditions([ratio(0.67)], ctx({ slotMaterialCount: 2, carryingCount: 1 }))).toBe(false);
  });

  it('material_ratio 0.5：2 材复合 1 携带 → 0.5 ≥ 0.5 通过', () => {
    expect(evaluateTraitConditions([ratio(0.5)], ctx({ slotMaterialCount: 2, carryingCount: 1 }))).toBe(true);
  });

  it('material_count 2：单材 1 < 2 失败、2 材通过（turtle）', () => {
    expect(evaluateTraitConditions([count(2)], ctx({ slotMaterialCount: 1 }))).toBe(false);
    expect(evaluateTraitConditions([count(2)], ctx({ slotMaterialCount: 2 }))).toBe(true);
  });

  it('gear_type：boots 在 pickaxe 失败、在 boots 通过（snow_walker）', () => {
    const bootsCtx = { gearTypeId: 'silentgear:boots', gearTypeMatches: (s: string, a: string) => a === 'silentgear:boots' };
    expect(evaluateTraitConditions([gearType('silentgear:boots')], ctx())).toBe(false);
    expect(evaluateTraitConditions([gearType('silentgear:boots')], ctx(bootsCtx))).toBe(true);
  });

  it('not(material_ratio 0.67)：单材内层通过 → not 失败（prismarine level3）；2 材半携带 → not 通过', () => {
    const not = { type: 'silentgear:not', value: ratio(0.67) } as TraitCondition;
    expect(evaluateTraitConditions([not], ctx({ slotMaterialCount: 1, carryingCount: 1 }))).toBe(false);
    expect(evaluateTraitConditions([not], ctx({ slotMaterialCount: 2, carryingCount: 1 }))).toBe(true);
  });

  it('or(count 3, ratio 0.5)：单材 count 失败、ratio 通过 → true（diamond）', () => {
    const or: TraitCondition = { type: 'silentgear:or', values: [count(3), ratio(0.5)] };
    expect(evaluateTraitConditions([or], ctx({ slotMaterialCount: 1, carryingCount: 1 }))).toBe(true);
    // 半复合 ratio 0.5 也通过（or 命中 ratio 分支）
    expect(evaluateTraitConditions([or], ctx({ slotMaterialCount: 2, carryingCount: 1 }))).toBe(true);
    // 3 材 1 携带：count 3 ≥ 3 通过
    expect(evaluateTraitConditions([or], ctx({ slotMaterialCount: 3, carryingCount: 1 }))).toBe(true);
  });

  it('or 全分支失败 → false', () => {
    const or: TraitCondition = { type: 'silentgear:or', values: [count(3), ratio(0.9)] };
    expect(evaluateTraitConditions([or], ctx({ slotMaterialCount: 2, carryingCount: 1 }))).toBe(false);
  });

  it('未知条件类型 fail-closed false', () => {
    expect(evaluateTraitConditions([{ type: 'silentgear:unknown' } as TraitCondition], ctx())).toBe(false);
  });

  it('多个条件全部通过才 true（and 语义）', () => {
    expect(evaluateTraitConditions([ratio(0.5), count(2)], ctx({ slotMaterialCount: 2, carryingCount: 2 }))).toBe(true);
    // ratio 0.5 恰好通过；换 0.67 → 0.5 < 0.67 失败 → and 整体 false
    expect(evaluateTraitConditions([ratio(0.67), count(2)], ctx({ slotMaterialCount: 2, carryingCount: 1 }))).toBe(false);
  });
});
