/**
 * 显示格式化：ARGB→CSS 色、数值、属性名中文标签
 */

/** ARGB 数值（0xAARRGGBB）→ CSS 色；取低 24 位，不把 alpha 当色值 */
export function argbToCss(color: number | null): string | null {
  if (color === null) return null;
  return `#${(color & 0xffffff).toString(16).padStart(6, '0')}`;
}

/** 数值显示：整数直出，小数保留至 2 位并去尾零 */
export function formatNum(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 100) / 100);
}

/** 引擎数值属性 → 中文标签 */
const STAT_ZH: Record<string, string> = {
  durability: '耐久', armor_durability: '护甲耐久', repair_efficiency: '修复效率', repair_value: '修复价值',
  enchantment_value: '附魔价值', charging_value: '充能价值', rarity: '稀有度',
  harvest_speed: '挖掘速度', block_reach: '触及范围', harvest_tier: '挖掘等级',
  attack_damage: '攻击伤害', attack_speed: '攻击速度', attack_reach: '攻击距离', magic_damage: '魔法伤害',
  ranged_damage: '远程伤害', draw_speed: '拉弓速度', projectile_speed: '弹射速度', projectile_accuracy: '弹射精准',
  armor: '护甲', armor_toughness: '护甲韧性', knockback_resistance: '击退抗性', magic_armor: '魔法护甲',
};

export function statLabel(stat: string): string {
  return STAT_ZH[stat] ?? stat;
}
