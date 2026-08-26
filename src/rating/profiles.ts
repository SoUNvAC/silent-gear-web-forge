/**
 * Rating Engine —— Profile 加载与转换（Parser + Validator）
 *
 * 权威数据源 = 用户提供的 data/rating_data.json（具体装备 → 属性权重），
 * 本模块把它转换成内部 RatingProfile[]：
 *
 * 1. 用户面向的属性名 → 引擎数值属性（映射决策，用户已确认）：
 *    mining_speed        → harvest_speed
 *    harvest_level       → harvest_tier 的等级（extras.harvest_tier.level_hint 数值化）
 *    traits              → 恒 0 分占位（不同 trait 不可量化，Q3 决策）
 *    range_efficiency    → 剔除（引擎无数值属性，用户决策）
 *    projectile_range    → 剔除（引擎无数值属性，用户决策）
 *    bow/crossbow attack_speed → draw_speed（拉弓速度，用户确认）
 * 2. 每个具体装备一个 profile（matches = 自身，祖先链优先命中）；
 * 3. 家族兜底 profile（该族已给装备的权重平均）+ 全局 default（全部平均）；
 *    这些派生 profile 非用户原始数据，仅保证未列出的装备可评。
 *
 * priority 由权重降序推导（权重越高优先级越高），与 Weighted 模式口径一致。
 * 未知属性名 → 抛 RatingError（暴露数据笔误，而不是静默丢失权重）。
 */
import { readFileSync } from 'node:fs';
import { RatingError } from './types.js';
import type { CriterionSource, PropertyCriterion, RatingProfile, RatingProfilesFile } from './types.js';

/** 用户评价标准文件（data/rating_data.json）：裸工具 id → 属性名 → 权重 */
export type UserRatingData = Record<string, Record<string, number>>;

/** 用户面向名称 → 引擎解析结果 */
interface StatResolution {
  property: string;
  source: CriterionSource;
}

/** 别名 / 特殊解析（key = 用户面向名称；undefined = 直接透传；null = 剔除） */
const STAT_RESOLUTIONS: Record<string, StatResolution | null> = {
  mining_speed: { property: 'harvest_speed', source: 'final' },
  harvest_level: { property: 'harvest_tier', source: 'tier' },
  traits: { property: 'traits', source: 'trait' },
  range_efficiency: null, // 引擎无数值属性（用户决策：剔除）
  projectile_range: null, // 引擎无数值属性（用户决策：剔除）
};

/** 弓类（PROJECTILE 组，无 ATTACK）：attack_speed → draw_speed（用户确认） */
const RANGED_BARE_IDS = new Set(['bow', 'crossbow']);

/** 引擎可评的数值属性（GearStats.final 键；harvest_tier 走 source='tier'） */
const ENGINE_STATS = new Set([
  'durability', 'armor_durability', 'repair_efficiency', 'repair_value', 'enchantment_value', 'charging_value', 'rarity',
  'harvest_speed', 'block_reach',
  'attack_damage', 'attack_speed', 'attack_reach', 'magic_damage',
  'ranged_damage', 'draw_speed', 'projectile_speed', 'projectile_accuracy',
  'armor', 'armor_toughness', 'knockback_resistance', 'magic_armor',
]);

/** 解析用户面向名称 → 引擎；null = 剔除（用户决策）；未知名称抛错（暴露笔误） */
function resolveStat(bareId: string, stat: string): StatResolution | null {
  if (stat === 'attack_speed' && RANGED_BARE_IDS.has(bareId)) return { property: 'draw_speed', source: 'final' };
  const r = STAT_RESOLUTIONS[stat];
  if (r !== undefined) return r;
  if (!ENGINE_STATS.has(stat)) throw new RatingError(`未知属性名: ${stat}（在 ${bareId} 中）`);
  return { property: stat, source: 'final' };
}

/** 单装备权重表 → criteria（权重降序，priority = 名次 1..n；剔除项跳过） */
function toCriteria(bareId: string, weights: Record<string, number>): PropertyCriterion[] {
  const rows: { w: number; c: PropertyCriterion }[] = [];
  for (const [stat, weight] of Object.entries(weights)) {
    const res = resolveStat(bareId, stat);
    if (res === null) continue; // 剔除（用户决策）
    rows.push({ w: weight, c: { property: res.property, source: res.source, weight } });
  }
  rows.sort((a, b) => b.w - a.w);
  return rows.map(({ c }, i) => ({ ...c, priority: i + 1 }));
}

/**
 * 多份 criteria 按（source, property）取权重算术平均 → 家族/全局兜底 profile。
 * divisor = 参与平均的 profile 总数；无某属性的 profile 按 0 计入（标准均值）。
 */
function averageCriteria(members: PropertyCriterion[][], divisor: number): PropertyCriterion[] {
  const key = (c: PropertyCriterion) => `${c.source ?? 'final'}:${c.property}`;
  const sum = new Map<string, { total: number; c: PropertyCriterion }>();
  for (const list of members) {
    const seen = new Set<string>();
    for (const c of list) {
      const k = key(c);
      if (seen.has(k)) continue; // 同一列表内不重复
      seen.add(k);
      const cur = sum.get(k) ?? { total: 0, c };
      cur.total += c.weight ?? 1;
      sum.set(k, cur);
    }
  }
  const rows = [...sum.values()].map(({ total, c }) => ({
    w: total / divisor,
    c: { ...c, weight: total / divisor },
  }));
  rows.sort((a, b) => b.w - a.w);
  return rows.map(({ c }, i) => ({ ...c, priority: i + 1 }));
}

/** 已给具体装备的家族归属（未给的族成员走祖先链落到这些 family profile） */
const FAMILIES: Record<string, string[]> = {
  melee_weapon: ['sword'],
  harvest_tool: ['axe', 'pickaxe', 'shovel', 'hoe', 'hammer', 'paxel'],
  ranged_weapon: ['bow', 'crossbow'],
  armor: ['helmet', 'chestplate', 'leggings', 'boots'],
};

/** 从用户文件加载 + 转换 + 校验 */
export function loadRatingProfiles(userDataPath = 'data/rating_data.json'): RatingProfile[] {
  const raw = JSON.parse(readFileSync(userDataPath, 'utf8')) as unknown;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new RatingError(`${userDataPath}: 必须为「装备 id → 属性权重」对象`);
  }
  return transformUserRatingData(raw as UserRatingData);
}

/** 用户权重表（内存）→ 内部 RatingProfile[]：具体 + 家族 + default，全部校验 */
export function transformUserRatingData(userData: UserRatingData): RatingProfile[] {
  if (Object.keys(userData).length === 0) throw new RatingError('rating 数据为空');

  const profiles: RatingProfile[] = [];

  // 具体装备 profile（用户权重，权威）
  for (const [bareId, weights] of Object.entries(userData)) {
    if (typeof weights !== 'object' || weights === null || Array.isArray(weights)) {
      throw new RatingError(`profile ${bareId}: 权重表必须为「属性名 → 权重」对象`);
    }
    profiles.push({ id: bareId, matches: [`silentgear:${bareId}`], criteria: toCriteria(bareId, weights) });
  }

  // 家族兜底 profile（该族已给装备的平均，absent 按 0 计）
  for (const [family, members] of Object.entries(FAMILIES)) {
    const present = members.filter((m) => m in userData);
    const lists = present.map((m) => toCriteria(m, userData[m]!));
    if (lists.length === 0) continue;
    profiles.push({ id: family, matches: [`silentgear:${family}`], criteria: averageCriteria(lists, present.length) });
  }

  // 全局兜底（全部已给装备的平均）
  const allBare = Object.keys(userData);
  const allLists = allBare.map((id) => toCriteria(id, userData[id]!));
  profiles.push({ id: 'default', matches: ['silentgear:all'], criteria: averageCriteria(allLists, allBare.length) });

  return validateProfiles(profiles);
}

/** 校验内部 RatingProfile[]（id 唯一 / matches 非空 / criteria（source,property）唯一） */
export function validateProfiles(profiles: RatingProfile[]): RatingProfile[] {
  if (!Array.isArray(profiles)) throw new RatingError('profiles 必须为数组');
  const seen = new Set<string>();
  for (const p of profiles) {
    if (typeof p.id !== 'string' || p.id === '') throw new RatingError('profile id 不能为空');
    if (seen.has(p.id)) throw new RatingError(`profile id 重复: ${p.id}`);
    seen.add(p.id);

    if (!Array.isArray(p.matches) || p.matches.length === 0) throw new RatingError(`profile ${p.id} 的 matches 不能为空`);
    for (const m of p.matches) {
      if (typeof m !== 'string' || m === '') throw new RatingError(`profile ${p.id} 的 matches 含空 id`);
    }

    if (!Array.isArray(p.criteria)) throw new RatingError(`profile ${p.id} 的 criteria 必须为数组`);
    const props = new Set<string>();
    for (const c of p.criteria) {
      const key = `${c.source ?? 'final'}:${c.property}`;
      if (typeof c.property !== 'string' || c.property === '') throw new RatingError(`profile ${p.id} 的 criterion 属性不能为空`);
      if (props.has(key)) throw new RatingError(`profile ${p.id} 的 criterion 属性重复: ${key}`);
      props.add(key);
    }
  }
  return profiles;
}

/** 内部结构校验（RatingProfilesFile 形态，供手写数据/测试用） */
export function validateRatingProfiles(file: RatingProfilesFile): RatingProfile[] {
  if (typeof file.version !== 'number') throw new RatingError('rating-profiles: version 必须为数字');
  if (typeof file.source !== 'string') throw new RatingError('rating-profiles: source 必须为字符串');
  return validateProfiles(file.profiles);
}
