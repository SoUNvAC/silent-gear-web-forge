/**
 * Data Layer —— 核心数据模型
 *
 * 材料 / 部件以官方 JSON 为权威源（data/silentgear_materials、data/silentgear_parts）。
 * 统计口径（官方 NumberProperty）：
 *   - stat 原始单元 = { operation, value }，操作符 ADD / MULTIPLY_BASE / MULTIPLY_TOTAL / AVERAGE / MAX
 *   - JSON 里写裸数字 = 默认 AVERAGE（parser 统一规约，不散落在调用方）
 *   - 一个 stat 键可挂多个修饰符（数组，如 elytra_wings.armor = [{MULTIPLY_BASE -0.65},{ADD -3.5}]）
 *   - harvest_tier 是对象结构；traits 是数组结构
 *
 * 变体继承（官方 MaterialData 合并语义）：
 *   - parent = "silentgear:empty" 是「无父」哨兵，不是真实父链
 *   - 真实 parent（如 wood/oak → silentgear:wood）按「槽位 × stat 键」深度合并，子覆盖父
 *     （traits 是整键覆盖，不是追加）
 */

/** 材料 JSON 的 type 字段（去掉命名空间后的值） */
export const MATERIAL_TYPES = ['simple', 'compound', 'custom_compound', 'processed'] as const;
export type MaterialType = (typeof MATERIAL_TYPES)[number];

/** 官方 PartType 的命名空间 id（部件 JSON part_type / 材料 properties 槽位键） */
export type PartTypeId =
  | 'silentgear:main'
  | 'silentgear:rod'
  | 'silentgear:tip'
  | 'silentgear:setting'
  | 'silentgear:grip'
  | 'silentgear:binding'
  | 'silentgear:cord'
  | 'silentgear:fletching'
  | 'silentgear:lining'
  | 'silentgear:coating'
  | 'silentgear:misc_upgrade';

/** 全部 PartTypeId，用于索引 / 校验 */
export const ALL_PART_TYPE_IDS: readonly PartTypeId[] = [
  'silentgear:main',
  'silentgear:rod',
  'silentgear:tip',
  'silentgear:setting',
  'silentgear:grip',
  'silentgear:binding',
  'silentgear:cord',
  'silentgear:fletching',
  'silentgear:lining',
  'silentgear:coating',
  'silentgear:misc_upgrade',
];

export const OPERATIONS = ['ADD', 'MULTIPLY_BASE', 'MULTIPLY_TOTAL', 'AVERAGE', 'MAX'] as const;
export type StatOperation = (typeof OPERATIONS)[number];

/** 单个 stat 修饰符 */
export interface StatModifier {
  operation: StatOperation;
  value: number;
}

/** 挖掘等级：harvest_tier 的对象结构（非数值） */
export interface HarvestTier {
  name: string;
  level_hint: string;
  incorrect_blocks_for_tool: string;
}

/** trait 条件节点（材料 JSON 里的 conditions），可嵌套 */
export interface TraitCondition {
  /** "silentgear:or" | "silentgear:not" | "silentgear:material_ratio" | "silentgear:material_count" | "silentgear:gear_type" */
  type: string;
  /** "silentgear:or" 的子条件 */
  values?: TraitCondition[];
  /** "silentgear:not" 的操作数（prismarine coating aquatic 3） */
  value?: TraitCondition;
  ratio?: number;
  count?: number;
  gear_type?: string;
}

/** 材料/部件 JSON 里的单个 trait 实例 */
export interface TraitInstance {
  trait: string;
  level: number;
  conditions: TraitCondition[];
}

/**
 * 属性值（已归一化：裸数字 → AVERAGE；harvest_tier / traits / additive 保持原结构）。
 * 数组形式的 StatModifier[] 表示同一 stat 的多个修饰符（同一 op 用数组写，如 elytra armor）。
 * boolean 仅用于 SPECIAL 组的 additive（材料可否作添加剂，如 glowstone/redstone 的 true）。
 */
export type StatEntry = StatModifier | StatModifier[] | HarvestTier | TraitInstance[] | boolean;

/** 一个槽位的属性表：stat 键（可带 /gear 后缀，如 armor/helmet、attack_speed/axe）→ 值 */
export interface PropertyMap {
  [statKey: string]: StatEntry;
}

/**
 * 材料单文件解析后的形态（自身属性，未做继承合并）。
 * repository 完成继承解析后产出最终 Material（properties 为合并后结果）。
 */
export interface MaterialSource {
  id: string;
  type: MaterialType;
  /** 真实父材料 id；无父为 null（JSON 里 silentgear:empty 归一为 null） */
  parent: string | null;
  name: string;
  displayColor: number | null;
  categories: string[];
  gearTypeBlacklist: string[];
  partSubstitutes: Record<string, unknown>;
  properties: Partial<Record<PartTypeId, PropertyMap>>;
}

/** 材料（继承已解析后的最终形态） */
export interface Material {
  /** 命名空间 id，由文件路径推导，如 "silentgear:wood/oak" */
  id: string;
  type: MaterialType;
  /** 真实父材料 id；无父为 null（JSON 里 silentgear:empty 归一为 null） */
  parent: string | null;
  /** display.name.translate，如 "material.silentgear.iron" */
  name: string;
  /** display.color 解析后的 ARGB 数值（#FFFFFFFF → 0xFFFFFFFF）；缺省 null */
  displayColor: number | null;
  categories: string[];
  gearTypeBlacklist: string[];
  /** crafting.part_substitutes（保留原始结构，装配阶段用于替换配方） */
  partSubstitutes: Record<string, unknown>;
  /** 继承解析后的属性（按槽位） */
  properties: Partial<Record<PartTypeId, PropertyMap>>;
}

/** 部件 */
export interface Part {
  id: string;
  type: 'core' | 'upgrade';
  gearType: string;
  partType: PartTypeId;
  properties: PropertyMap;
  /** 仅 upgrade 部件有 */
  upgradeGearTypes?: { match_parents: boolean; types: string[] };
}

/** GearType 属性组（GearPropertyGroups 枚举） */
export const GEAR_PROPERTY_GROUPS = ['SPECIAL', 'GENERAL', 'HARVEST', 'ATTACK', 'PROJECTILE', 'ARMOR'] as const;
export type GearPropertyGroup = (typeof GEAR_PROPERTY_GROUPS)[number];

/** 属性组 → 属性名（官方 GearPropertyGroups.java） */
export const GEAR_PROPERTY_GROUP_STATS: Record<GearPropertyGroup, readonly string[]> = {
  SPECIAL: ['additive', 'traits'],
  GENERAL: ['durability', 'armor_durability', 'repair_efficiency', 'repair_value', 'enchantment_value', 'charging_value', 'rarity'],
  HARVEST: ['harvest_tier', 'harvest_speed', 'block_reach'],
  ATTACK: ['attack_damage', 'attack_speed', 'attack_reach', 'magic_damage'],
  PROJECTILE: ['ranged_damage', 'draw_speed', 'projectile_speed', 'projectile_accuracy'],
  ARMOR: ['armor', 'armor_toughness', 'knockback_resistance', 'magic_armor'],
};

/** 耐久口径 */
export const DURABILITY_STATS = ['DURABILITY', 'ARMOR_DURABILITY'] as const;
export type DurabilityStat = (typeof DURABILITY_STATS)[number];

/** GearType 定义（gear-types.json 机器可读源，源自 gear-types-reference.md） */
export interface GearTypeDef {
  id: string;
  /** 真实父 gear type；根 "silentgear:all" 为 null */
  parent: string | null;
  /** 绑定的主部件 id；抽象类型（all 等）为 null */
  mainPart: string | null;
  /** 必填槽位（markdown §5.1） */
  requiredParts: PartTypeId[];
  /** 可附加槽位（markdown §5.2，含 elytra/fishing_rod 特例） */
  addableSlots: PartTypeId[];
  durabilityStat: DurabilityStat | null;
  /** 护甲耐久倍率；非护甲为 null */
  armorDurabilityMultiplier: number | null;
  animationFrames: number;
  /** 该类型实际参与计算的属性组（继承父类解析后） */
  propertyGroups: GearPropertyGroup[];
}
