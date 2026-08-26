/**
 * Rating Engine —— Lexicographic 模式
 *
 * 按 criterion 优先级（priority，1 = 最优先；未给则按 criteria 数组序）逐项比较 0..1 分：
 * 第一处差异决定胜负；缺失属性排在有值之后。
 */
import type { PropertyCriterion, ScoredBuild } from './types.js';

/** 解析比较顺序：priority 升序，未给 priority 的按数组序（按位置兜底，保持稳定） */
export function orderedCriteria(criteria: PropertyCriterion[]): PropertyCriterion[] {
  return [...criteria]
    .map((c, i) => ({ c, prio: c.priority ?? i + 1, pos: i }))
    .sort((a, b) => a.prio - b.prio || a.pos - b.pos)
    .map((x) => x.c);
}

/** a 是否在 b 之前（更好）；0 = 无法区分 */
export function compareScoredBuilds(a: ScoredBuild, b: ScoredBuild, criteria: PropertyCriterion[]): number {
  for (const c of orderedCriteria(criteria)) {
    const av = a.scores[c.property];
    const bv = b.scores[c.property];
    if (av === undefined && bv === undefined) continue;
    if (av === undefined) return 1; // a 缺该属性 → a 排后（更差）
    if (bv === undefined) return -1; // b 缺该属性 → b 排后 → a 在前
    if (av !== bv) return av > bv ? -1 : 1;
  }
  return 0;
}

/** 排序：最优 → 最差，返回输入下标 */
export function lexicographicRank(scored: ScoredBuild[], criteria: PropertyCriterion[]): number[] {
  return [...scored]
    .sort((a, b) => compareScoredBuilds(a, b, criteria))
    .map((s) => s.index);
}
