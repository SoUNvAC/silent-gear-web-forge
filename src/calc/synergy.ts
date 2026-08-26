/**
 * Calculation Engine —— synergy（复合材质专属，SynergyUtils，pipeline.md §6）
 *
 * 仅复合材质走 synergy（materials.size() < 2 → 恒为 1，simple 材质直接跳过）。
 *
 * 常量（SynergyUtils.java:30）：a=1.1、P=0.2、b=0.015、w_r=0.001（1.21 前 0.005）、clamp[0.1, 2.0]。
 *
 *   x = |{id(m)}|                        # 去重材质种数
 *   c(cat) = #{ m : cat ∈ m.categories } # 每类别共享计数
 *   S = a·x/(x+a) + 1/(1+a)                                     (1) 基础曲线
 *     − P·1[ ∀cat, c(cat) ≠ n ]                                 (2) 无共同类别惩罚
 *     + Σ_{cat:c(cat)>1} b·c(cat)/(n−x+1)                       (3) 共享类别奖励
 *     − w_r·Σ_{m∈unique} |r₁−r(m)|·1[r_max>0]                   (4) 稀有度差异惩罚
 *     + Σ_{trait t(级 l)} Δₜ(S)                                 (5) synergy traits
 *   s = clamp(S, 0.1, 2.0)
 *
 * 应用（NumberProperty.applySynergy）：只对 isAffectedBySynergy 属性，作用于压缩后每个修正量：
 *   v' = v + |v|·(s−1)   → v>0: v·s；v<0: v·(2−s)；v=0: 0
 */
import type { StatModifier } from '../data/types.js';

export interface SynergyMaterial {
  id: string;
  categories: string[];
  /** 稀有度 stat 值（稀有度差异惩罚用；材料无 rarity 则 0，TODO 确认来源） */
  rarity: number;
}

export const SYNERGY_A = 1.1;
export const SYNERGY_P = 0.2;
export const SYNERGY_B = 0.015;
export const SYNERGY_W_R = 0.001;
export const SYNERGY_CLAMP_MIN = 0.1;
export const SYNERGY_CLAMP_MAX = 2.0;

/** 基础曲线：x=1→1.0、x=2→≈1.186、x=3→≈1.281、x→∞→≈1.576 */
export function baseSynergyCurve(x: number): number {
  return (SYNERGY_A * x) / (x + SYNERGY_A) + 1 / (1 + SYNERGY_A);
}

/** 内建 synergy traits（TraitsProvider.java:112-124）：rangeMin < S < rangeMax 时 S += 等级·multi */
export const SYNERGY_TRAIT_EFFECTS: Record<string, { multi: number; rangeMin: number; rangeMax: number }> = {
  'silentgear:crude': { multi: -0.04, rangeMin: -Infinity, rangeMax: Infinity }, // 无门槛
  'silentgear:rustic': { multi: 0.05, rangeMin: 0.749, rangeMax: 1.001 },
  'silentgear:synergistic': { multi: 0.04, rangeMin: 1, rangeMax: Infinity },
};

export interface SynergyTraitLevel {
  trait: string;
  level: number;
}

/**
 * §6.1 getSynergy。synergy trait 的 Δₜ(S) 依赖 S 自身（门槛判断），
 * 官方为迭代求不动点（设计要点：访问时现算）；这里对基准 S 一次性应用后 clamp，
 * 迭代语义未提供（TODO 确认）。
 */
export function computeSynergy(
  materials: SynergyMaterial[],
  synergyTraitLevels: SynergyTraitLevel[] = [],
): number {
  const n = materials.length;
  const unique = new Set(materials.map((m) => m.id));
  const x = unique.size;
  if (x < 2) return 1;

  // (1) 基础曲线
  let S = baseSynergyCurve(x);

  // (2) 无共同类别惩罚：没有任何类别被全部 n 个材质共有 → 减 P
  const catCount = new Map<string, number>();
  for (const m of materials) for (const c of m.categories) catCount.set(c, (catCount.get(c) ?? 0) + 1);
  const sharedByAll = [...catCount.values()].some((c) => c >= n);
  if (!sharedByAll) S -= SYNERGY_P;

  // (3) 共享类别奖励
  for (const c of catCount.values()) {
    if (c > 1) S += (SYNERGY_B * c) / (n - x + 1);
  }

  // (4) 稀有度差异惩罚（首个子材质为主材质 r₁）
  const first = materials[0]!;
  const rMax = Math.max(...materials.map((m) => m.rarity));
  if (rMax > 0) {
    for (const id of unique) {
      const m = materials.find((mm) => mm.id === id)!;
      S -= SYNERGY_W_R * Math.abs(first.rarity - m.rarity);
    }
  }

  // (5) synergy traits
  for (const t of synergyTraitLevels) {
    const eff = SYNERGY_TRAIT_EFFECTS[t.trait];
    if (!eff) continue;
    if (S <= eff.rangeMin || S >= eff.rangeMax) continue;
    S += t.level * eff.multi;
  }

  return Math.min(Math.max(S, SYNERGY_CLAMP_MIN), SYNERGY_CLAMP_MAX);
}

/** §6.2 applySynergy：对单个压缩后修正量缩放 */
export function applySynergy(mod: StatModifier, s: number, affectedBySynergy: boolean): StatModifier {
  if (!affectedBySynergy || s === 1) return mod;
  return { operation: mod.operation, value: mod.value + Math.abs(mod.value) * (s - 1) };
}
