/**
 * Calculation Engine —— Pass2 bonus（Trait.getBonusProperties，new_1 §4）
 *
 * 唯一实现是 NumberPropertyModifierTraitEffect（new_1 §4.3）；其余 trait effect 返回空。
 * 数据表 src/data/trait-bonus-properties.json（§4.5，TraitsProvider.java:360-457）。
 *
 * 公式（StatMod.getAddedValue，§4.4）：
 *   addedValue = base_multiplier × level
 *              × damageRatio               （若 multiply_damage_ratio = true）
 *              × base 快照值               （若 multiply_original_value = true）
 * 每个属性聚合成单个 ADD 修正，进 Pass3 compute（最后一步 add + clamp）。
 * 全局倍率 Config.Common.getPropertyBonusMultiplier(property) 配置数值未提供 → 恒 1（TODO）。
 */
import { readFileSync } from 'node:fs';
import type { AggregatedTrait } from './traits.js';

export interface BonusPropertyConfig {
  base_multiplier: number;
  multiply_damage_ratio: boolean;
  multiply_original_value: boolean;
}

/** trait id → { 属性 id → 配置 } */
export type TraitBonusProperties = Record<string, Record<string, BonusPropertyConfig>>;

export function loadTraitBonusProperties(): TraitBonusProperties {
  return (JSON.parse(readFileSync('src/data/trait-bonus-properties.json', 'utf8')) as { traits: TraitBonusProperties }).traits;
}

export const BONUS_PROPERTIES: TraitBonusProperties = loadTraitBonusProperties();

export function computeTraitBonus(
  traits: AggregatedTrait[],
  base: Record<string, number>,
  damageRatio: number,
  bonusData: TraitBonusProperties = BONUS_PROPERTIES,
): Record<string, number> {
  const bonus: Record<string, number> = {};
  for (const t of traits) {
    const propMods = bonusData[t.trait];
    if (!propMods) continue;
    for (const [prop, cfg] of Object.entries(propMods)) {
      if (!(prop in base)) continue; // 只在 base 存在的属性上生效（GearData.java:222）
      if (!cfg) continue;
      let added = cfg.base_multiplier * t.level;
      if (cfg.multiply_damage_ratio) added *= damageRatio;
      if (cfg.multiply_original_value) added *= base[prop]!; // (prop in base) 已保证存在
      bonus[prop] = (bonus[prop] ?? 0) + added;
    }
  }
  return bonus;
}
