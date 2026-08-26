/**
 * Calculation Engine —— 材质修正器（IMaterialModifier 链，gear-computation-pipeline.md §5）
 *
 * 统一公式（IMaterialModifier.java:43）：v' = v + |v|·bonus
 *   - v>0：按比例放大/缩小
 *   - v<0：按绝对值缩放（负修正变浅）
 *   - v=0：不变
 *
 * 应用顺序（MaterialInstance.java:106）：grade → starcharged → crude
 * 只改写「材质给的修正」（部件底子还没进管线）。
 */
import type { StatModifier } from '../data/types.js';

/** Grade 等级 → bonusPercent（MaterialGrade.java:25） */
export const GRADE_BONUS_PERCENT = {
  NONE: 0, E: 1, D: 2, C: 3, B: 4, A: 5, S: 10, SS: 15, SSS: 25, MAX: 30,
} as const;
export type GradeLevel = keyof typeof GRADE_BONUS_PERCENT;

/** 统一公式：v + |v|·bonus */
export function applyPercentModifier(v: number, bonus: number): number {
  return v + Math.abs(v) * bonus;
}

/** grade（§5.1）：bonus = bonusPercent/100；NONE 恒等 */
export function applyGrade(mod: StatModifier, grade: GradeLevel): StatModifier {
  if (grade === 'NONE') return mod;
  return { operation: mod.operation, value: applyPercentModifier(mod.value, GRADE_BONUS_PERCENT[grade] / 100) };
}

/**
 * starcharged / 充能（§5.2，StarchargedMaterialModifier.java:83）
 * q = 充能等级 × 材质的 charging_value（ChargedProperties.java:4；charging_value 是普通属性，铁=0.7）
 * 只对 AVERAGE/MAX/ADD 修正生效，MULTIPLY 原样保留；按属性重写表：
 *   durability            × 1.25^q
 *   armor_durability / enchantment_value × 1.1^q
 *   harvest_speed         + 1.5·等级·q
 *   attack_damage / magic_damage + q
 *   ranged_damage         + q/2
 *   armor / armor_toughness / magic_armor + 2q
 */
export type StarchargedRewrite = (value: number, q: number, level: number) => number;
export const STARCHARGED_REWRITE: Partial<Record<string, StarchargedRewrite>> = {
  durability: (v, q) => v * Math.pow(1.25, q),
  armor_durability: (v, q) => v * Math.pow(1.1, q),
  enchantment_value: (v, q) => v * Math.pow(1.1, q),
  harvest_speed: (v, q, level) => v + 1.5 * level * q,
  attack_damage: (v, q) => v + q,
  magic_damage: (v, q) => v + q,
  ranged_damage: (v, q) => v + q / 2,
  armor: (v, q) => v + 2 * q,
  armor_toughness: (v, q) => v + 2 * q,
  magic_armor: (v, q) => v + 2 * q,
};

export function applyStarcharged(mod: StatModifier, property: string, q: number, level: number): StatModifier {
  if (level <= 0 || q <= 0) return mod;
  if (mod.operation === 'MULTIPLY_BASE' || mod.operation === 'MULTIPLY_TOTAL') return mod; // MULTIPLY 原样保留
  const rewrite = STARCHARGED_REWRITE[property];
  if (!rewrite) return mod;
  return { operation: mod.operation, value: rewrite(mod.value, q, level) };
}

/**
 * crude（§5.3，CrudeMaterialModifier.java:44；new_1 §1）
 * multiplier = 配置 crudeMixerPropertyMultiplier − 1（Config.java:173 默认 0.8，范围 [0,2]）→ bonus −0.2。
 * 生效前提：材质带 CRUDE 数据组件（仅粗制合金炉产物，new_1 §1.3），且属性 isAffectedBySynergy。
 */
export const CRUDE_MIXER_PROPERTY_MULTIPLIER = 0.8; // Config.java:173 默认值

export function applyCrude(mod: StatModifier, configMultiplier: number): StatModifier {
  return { operation: mod.operation, value: applyPercentModifier(mod.value, configMultiplier - 1) };
}
