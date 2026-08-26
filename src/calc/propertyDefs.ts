/**
 * Calculation Engine —— 属性注册表（依据 gear-computation-pipeline.md §5.4 + GearProperties.java + new_1 §3）
 *
 * 每个数值属性的元数据：
 *   - isAffectedByGrades / isAffectedBySynergy（§5.4 表，grade 与 synergy 不完全相同）
 *   - baseValue（B）：官方全部为 0，工具的"底子"来自主部件 properties（default 只是缺省查询值，不进 compute）
 *   - clamp 上下限：完整表 new_1 §3——仅 4 属性有非平凡下限，其余 [0, 2³¹−1]
 */
import { GEAR_PROPERTY_GROUP_STATS, GEAR_PROPERTY_GROUPS } from '../data/types.js';
import type { GearPropertyGroup } from '../data/types.js';

export interface PropertyDef {
  key: string;
  group: GearPropertyGroup;
  isAffectedByGrades: boolean;
  isAffectedBySynergy: boolean;
  baseValue: number;
  clampMin: number;
  clampMax: number;
}

/** grade 与 synergy 都影响的属性（§5.4 两列都为 ✔） */
const GRADES_AND_SYNERGY = new Set([
  'durability',
  'armor_durability',
  'enchantment_value',
  'harvest_speed',
  'attack_damage',
  'magic_damage',
  'ranged_damage',
  'armor',
  'armor_toughness',
  'knockback_resistance',
  'magic_armor',
]);

/** 只受 synergy 不受 grade（§5.4 projectile_speed） */
const SYNERGY_ONLY = new Set(['projectile_speed']);

/** 非平凡 clamp（new_1 §3 GearProperties.java）：其余属性 [0, 2³¹−1] */
const CLAMPS: Record<string, { min: number; max: number }> = {
  attack_speed: { min: -3.9, max: 4.0 },
  block_reach: { min: -100, max: 100 },
  attack_reach: { min: -100, max: 100 },
  draw_speed: { min: -10, max: 10 },
};
const INT_MAX = 2147483647; // 2³¹−1

function buildDefs(): Record<string, PropertyDef> {
  const defs: Record<string, PropertyDef> = {};
  for (const group of GEAR_PROPERTY_GROUPS) {
    for (const key of GEAR_PROPERTY_GROUP_STATS[group]) {
      const isAffectedByGrades = GRADES_AND_SYNERGY.has(key);
      const isAffectedBySynergy = isAffectedByGrades || SYNERGY_ONLY.has(key);
      const c = CLAMPS[key];
      defs[key] = {
        key,
        group,
        isAffectedByGrades,
        isAffectedBySynergy,
        baseValue: 0, // 官方：所有属性 baseValue = 0
        clampMin: c?.min ?? 0,
        clampMax: c?.max ?? (key === 'armor_durability' ? INT_MAX / 16 : INT_MAX),
      };
    }
  }
  return defs;
}

export const PROPERTY_DEFS: Record<string, PropertyDef> = buildDefs();

/** 未知属性安全兜底（组=GENERAL，不受 grade/synergy，无 clamp） */
export function propertyDef(key: string): PropertyDef {
  return PROPERTY_DEFS[key] ?? {
    key,
    group: 'GENERAL',
    isAffectedByGrades: false,
    isAffectedBySynergy: false,
    baseValue: 0,
    clampMin: -Infinity,
    clampMax: Infinity,
  };
}
