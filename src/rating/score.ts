/**
 * Rating Engine —— 群体相对评分（用户决策：Q2「群体相对评分」）
 *
 * 对每个 criterion 属性，在候选 Build 集合内做 min-max 归一化 → 0..1 分：
 *   min === max → 集合内无差异，给满分 1
 *   higher: score = (v − min) / (max − min)
 *   lower:  score = 1 − (v − min) / (max − min)
 *
 * 注意：单 Build 无法独立评分（无参照集合）——evaluate 的输入必须是候选集合；
 * 单 Build 展示时只显示原始属性值，不做评分（UI 层后续定）。
 *
 * 缺失属性：某 criterion 属性不在某 build 的 final 里（如给 pickaxe 评 armor）→
 * 该 build 此属性不计分（进 missing），不按 0 计（避免对「本就不该有」的属性不公平惩罚）。
 */
import type { GearStats } from '../calc/engine.js';
import type { PropertyCriterion, ScoredBuild } from './types.js';

/** 单属性 min-max 归一化（方向感知）；空集合返回 [] */
export function scorePropertyValues(values: number[], direction: 'higher' | 'lower' = 'higher'): number[] {
  if (values.length === 0) return [];
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (max === min) return values.map(() => 1); // 无差异 → 满分
  return values.map((v) => {
    const s = (v - min) / (max - min);
    return direction === 'higher' ? s : 1 - s;
  });
}

/** 按 criterion 的 source 提取数值；缺失/不可解析 → undefined */
function extractValue(stats: GearStats, c: PropertyCriterion): number | undefined {
  switch (c.source) {
    case 'trait':
      return 0; // trait 恒 0 分占位（Q3：不同 trait 不可量化）
    case 'tier': {
      const t = stats.extras?.harvest_tier as { level_hint?: unknown } | undefined;
      const v = t?.level_hint;
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) ? n : undefined;
    }
    default: {
      const v = stats.final[c.property];
      return typeof v === 'number' ? v : undefined;
    }
  }
}

/**
 * 对候选集合逐 criterion 群体归一化，产出每 build 的 0..1 相对分。
 * 返回的数组与 builds 对齐（index = 输入位置）。
 * trait 来源恒 0 分（不走 min-max：max==min 会错误地给 1）。
 */
export function scoreBuilds(builds: GearStats[], criteria: PropertyCriterion[]): ScoredBuild[] {
  const n = builds.length;
  const key = (c: PropertyCriterion) => `${c.source ?? 'final'}:${c.property}`;

  // 每个 criterion：收集集合内「有该属性」的 build 的值 + 逐 build 是否 present
  const valuesByProp = new Map<string, number[]>();
  const presentByProp = new Map<string, boolean[]>();
  for (const c of criteria) {
    const vals: number[] = [];
    const flags: boolean[] = [];
    for (const b of builds) {
      const v = extractValue(b, c);
      flags.push(v !== undefined);
      if (v !== undefined) vals.push(v);
    }
    valuesByProp.set(key(c), vals);
    presentByProp.set(key(c), flags);
  }

  const scores: Record<string, number>[] = builds.map(() => ({}));
  const missing: string[][] = builds.map(() => []);

  for (const c of criteria) {
    const flags = presentByProp.get(key(c))!;
    const isTrait = c.source === 'trait';
    const normalized = isTrait ? null : scorePropertyValues(valuesByProp.get(key(c))!, c.direction ?? 'higher');
    let vi = 0;
    for (let i = 0; i < n; i++) {
      if (flags[i]) {
        scores[i]![c.property] = isTrait ? 0 : normalized![vi]!;
        vi++;
      } else {
        missing[i]!.push(c.property);
      }
    }
  }

  return builds.map((stats, i) => ({ index: i, stats, scores: scores[i]!, missing: missing[i]! }));
}
