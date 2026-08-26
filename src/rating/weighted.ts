/**
 * Rating Engine —— Weighted 模式
 *
 * total = Σ(wᵢ·sᵢ) / Σwᵢ   （仅对存在于该 build 的 criterion 计权；缺失属性剔除后归一）
 * 单 build 集合：所有分数为 1 → total 1。
 */
import type { PropertyCriterion, ScoredBuild } from './types.js';

/** 每 build 的加权总分（0..1），与 scored 对齐 */
export function weightedTotals(scored: ScoredBuild[], criteria: PropertyCriterion[]): number[] {
  return scored.map((s) => {
    let sum = 0;
    let weightSum = 0;
    for (const c of criteria) {
      const v = s.scores[c.property];
      if (v === undefined) continue; // 缺失属性不计分，权重剔除（不再向其余权重摊派）
      const w = c.weight ?? 1;
      sum += w * v;
      weightSum += w;
    }
    return weightSum === 0 ? 0 : sum / weightSum;
  });
}
