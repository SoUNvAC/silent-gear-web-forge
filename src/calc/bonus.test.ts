import { describe, expect, it } from 'vitest';
import { computeTraitBonus } from './bonus.js';
import type { AggregatedTrait } from './traits.js';

const t = (trait: string, level: number): AggregatedTrait => ({ trait, level });

describe('computeTraitBonus（new_1 §4，NumberPropertyModifierTraitEffect）', () => {
  it('SHARP 5：0.125×5×damageRatio×base → ADD', () => {
    const bonus = computeTraitBonus([t('silentgear:sharp', 5)], { attack_damage: 3.0, harvest_speed: 6.0 }, 1);
    expect(bonus.attack_damage).toBeCloseTo(0.125 * 5 * 1 * 3.0, 10); // 1.875（§4.5 算例）
    expect(bonus.harvest_speed).toBeCloseTo(0.125 * 5 * 1 * 6.0, 10); // 3.75
  });

  it('damageRatio 缩放（半耐久 ×0.5）', () => {
    const bonus = computeTraitBonus([t('silentgear:sharp', 5)], { attack_damage: 3.0, harvest_speed: 6.0 }, 0.5);
    expect(bonus.attack_damage).toBeCloseTo(0.125 * 5 * 0.5 * 3.0, 10);
  });

  it('multiply_original_value=false 时不乘 base（ACCELERATE 2）', () => {
    const bonus = computeTraitBonus([t('silentgear:accelerate', 2)], { harvest_speed: 6.0, attack_speed: 0.2 }, 1);
    expect(bonus.harvest_speed).toBeCloseTo(2.0 * 2 * 1, 10); // 4.0，不乘 6.0
    expect(bonus.attack_speed).toBeCloseTo(0.01 * 2 * 1, 10); // 0.02
  });

  it('多个 trait 同属性相加', () => {
    // sharp 5 + soft 5 都改 harvest_speed：0.125×5×6 + (−0.15)×5×6
    const bonus = computeTraitBonus([t('silentgear:sharp', 5), t('silentgear:soft', 5)], { harvest_speed: 6.0 }, 1);
    expect(bonus.harvest_speed).toBeCloseTo((0.125 - 0.15) * 5 * 6.0, 10);
  });

  it('base 里不存在的属性跳过（GearData.java:222）', () => {
    const bonus = computeTraitBonus([t('silentgear:sharp', 5)], { harvest_speed: 6.0 }, 1);
    expect(bonus.attack_damage).toBeUndefined();
  });

  it('数据表外的 trait → 无 bonus', () => {
    expect(computeTraitBonus([t('silentgear:malleable', 5)], { attack_damage: 3.0 }, 1)).toEqual({});
  });
});
