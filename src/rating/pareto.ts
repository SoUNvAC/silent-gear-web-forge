/**
 * Rating Engine —— Pareto 模式
 *
 * 支配：a 支配 b ⟺ 对每个「a、b 都有的」criterion，a ≥ b 且至少一个严格 >。
 * 缺失属性不参与支配比较（属性集不同的两个候选互不可比）；
 * 共同属性为空 → 互不支配。
 *
 * 输出非支配前沿（不被任何候选支配的下标集合）。
 */
import type { PropertyCriterion, ScoredBuild } from './types.js';

/** a 是否支配 b */
export function dominates(a: ScoredBuild, b: ScoredBuild, criteria: PropertyCriterion[]): boolean {
  let strictlyBetter = false;
  let compared = false;
  for (const c of criteria) {
    const av = a.scores[c.property];
    const bv = b.scores[c.property];
    if (av === undefined || bv === undefined) continue; // 不共现 → 不参与
    compared = true;
    if (av < bv) return false;
    if (av > bv) strictlyBetter = true;
  }
  return compared && strictlyBetter;
}

/** 非支配前沿：不被任何候选支配的下标（原始输入位置） */
export function paretoFront(scored: ScoredBuild[], criteria: PropertyCriterion[]): number[] {
  const dominated = new Set<number>();
  for (const a of scored) {
    for (const b of scored) {
      if (a.index === b.index) continue;
      if (dominates(a, b, criteria)) dominated.add(b.index);
    }
  }
  return scored.map((s) => s.index).filter((i) => !dominated.has(i));
}
