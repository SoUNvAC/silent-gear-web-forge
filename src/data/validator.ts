/**
 * Data Layer —— 结构校验器
 * parser 对 JSON 做「读到什么就验什么」；校验失败抛 ValidationError，携带路径便于定位。
 */
import { OPERATIONS } from './types.js';
import type { HarvestTier, StatModifier, TraitCondition, TraitInstance } from './types.js';

export class ValidationError extends Error {
  readonly path: string;
  constructor(path: string, message: string) {
    super(`[${path}] ${message}`);
    this.name = 'ValidationError';
    this.path = path;
  }
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function assertRecord(path: string, v: unknown): asserts v is Record<string, unknown> {
  if (!isRecord(v)) throw new ValidationError(path, `期望对象，实际 ${typeof v}`);
}

export function assertString(path: string, v: unknown): asserts v is string {
  if (typeof v !== 'string') throw new ValidationError(path, `期望字符串，实际 ${typeof v}`);
}

export function assertNumber(path: string, v: unknown): asserts v is number {
  if (typeof v !== 'number' || Number.isNaN(v)) throw new ValidationError(path, `期望数值，实际 ${typeof v}`);
}

export function assertBoolean(path: string, v: unknown): asserts v is boolean {
  if (typeof v !== 'boolean') throw new ValidationError(path, `期望布尔，实际 ${typeof v}`);
}

/** 从 "silentgear:simple" 之类去掉命名空间 */
export function stripNamespace(v: string): string {
  return v.includes(':') ? v.slice(v.indexOf(':') + 1) : v;
}

/** 校验 stat 修饰符对象 {operation, value} */
export function parseStatModifier(path: string, v: unknown): StatModifier {
  assertRecord(path, v);
  const op = v.operation;
  const val = v.value;
  if (typeof op !== 'string' || !(OPERATIONS as readonly string[]).includes(op)) {
    throw new ValidationError(path, `未知 operation: ${String(op)}`);
  }
  assertNumber(path + '.value', val);
  return { operation: op as StatModifier['operation'], value: val };
}

/** harvest_tier 对象结构 */
export function parseHarvestTier(path: string, v: unknown): HarvestTier {
  assertRecord(path, v);
  assertString(path + '.name', v.name);
  assertString(path + '.level_hint', v.level_hint);
  assertString(path + '.incorrect_blocks_for_tool', v.incorrect_blocks_for_tool);
  return {
    name: v.name,
    level_hint: v.level_hint,
    incorrect_blocks_for_tool: v.incorrect_blocks_for_tool,
  };
}

function isTraitConditionShape(v: unknown): v is TraitCondition {
  return isRecord(v) && typeof v.type === 'string';
}

/** trait 条件可嵌套（or / not 含 values 数组） */
export function parseTraitCondition(path: string, v: unknown): TraitCondition {
  if (!isTraitConditionShape(v)) throw new ValidationError(path, 'trait 条件需含 type 字段');
  const cond: TraitCondition = { type: v.type };
  if (v.values !== undefined) {
    if (!Array.isArray(v.values)) throw new ValidationError(path + '.values', '期望数组');
    cond.values = v.values.map((c, i) => parseTraitCondition(`${path}.values[${i}]`, c));
  }
  if (v.ratio !== undefined) { assertNumber(path + '.ratio', v.ratio); cond.ratio = v.ratio; }
  if (v.count !== undefined) { assertNumber(path + '.count', v.count); cond.count = v.count; }
  if (v.gear_type !== undefined) { assertString(path + '.gear_type', v.gear_type); cond.gear_type = v.gear_type; }
  if (v.value !== undefined) cond.value = parseTraitCondition(`${path}.value`, v.value);
  return cond;
}

/**
 * 属性值归一化：把 JSON 原始值规约为 StatEntry。
 * 规则（官方 NumberProperty / MaterialData）：
 *   - 键 "traits"     → TraitInstance[]（数组）
 *   - 键 "harvest_tier" → HarvestTier 对象
 *   - 键 "additive"   → boolean（SPECIAL 组添加剂标记）
 *   - 其他数值键     → 裸数字=AVERAGE | {operation,value} | StatModifier[]
 */
export function normalizeStatEntry(key: string, path: string, v: unknown): import('./types.js').StatEntry {
  if (key === 'traits') {
    if (!Array.isArray(v)) throw new ValidationError(path, `traits 期望数组，实际 ${typeof v}`);
    return v.map((t, i) => parseTraitInstance(`${path}[${i}]`, t));
  }
  if (key === 'harvest_tier') return parseHarvestTier(path, v);
  if (key === 'additive') {
    if (typeof v !== 'boolean') throw new ValidationError(path, `additive 期望布尔，实际 ${typeof v}`);
    return v;
  }
  if (typeof v === 'number') {
    if (Number.isNaN(v)) throw new ValidationError(path, 'NaN');
    return { operation: 'AVERAGE', value: v }; // 官方：裸数字默认 AVERAGE
  }
  if (Array.isArray(v)) {
    return v.map((m, i) => parseStatModifier(`${path}[${i}]`, m));
  }
  if (isRecord(v)) {
    // 对象但不是 {operation,value}？报错暴露未知结构，避免静默吞数据
    if (typeof v.operation !== 'string') {
      throw new ValidationError(path, `未知 stat 结构（键 ${key}）：${JSON.stringify(v).slice(0, 80)}`);
    }
    return parseStatModifier(path, v);
  }
  throw new ValidationError(path, `无法识别的 stat 值（键 ${key}）：${String(v)}`);
}

/** traits 数组元素 {trait, level, conditions} */
export function parseTraitInstance(path: string, v: unknown): TraitInstance {
  assertRecord(path, v);
  assertString(path + '.trait', v.trait);
  assertNumber(path + '.level', v.level);
  const conditions = v.conditions;
  if (conditions === undefined) {
    throw new ValidationError(path + '.conditions', 'trait 缺少 conditions 字段');
  }
  if (!Array.isArray(conditions)) throw new ValidationError(path + '.conditions', '期望数组');
  return {
    trait: v.trait,
    level: v.level,
    conditions: conditions.map((c, i) => parseTraitCondition(`${path}.conditions[${i}]`, c)),
  };
}
