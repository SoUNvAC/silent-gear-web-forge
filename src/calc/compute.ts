/**
 * Calculation Engine —— NumberProperty.compute 五运算顺序（NumberProperty.java:112）
 *
 * f0 = baseValue + AVERAGE加权平均（仅 AVERAGE 修正）
 * f0 = max(f0, 各 MAX)
 * f1 = f0 × (1 + Σ MULTIPLY_BASE)     # mul1 加法叠加，作用 f0
 * f1 = f1 × Π(1 + MULTIPLY_TOTAL)     # mul2 乘法叠加，作用含 mul1 的总额
 * f1 = f1 + Σ ADD                     # ADD 最后加
 * final = clamp(f1, min, max)
 */
import type { StatModifier } from '../data/types.js';
import { weightedAverage } from './compress.js';

export function computeProperty(
  mods: StatModifier[],
  baseValue: number,
  clampMin: number,
  clampMax: number,
): number {
  const avg = weightedAverage(mods.filter((m) => m.operation === 'AVERAGE'));
  const maxs = mods.filter((m) => m.operation === 'MAX').map((m) => m.value);
  const mul1 = mods.filter((m) => m.operation === 'MULTIPLY_BASE');
  const mul2 = mods.filter((m) => m.operation === 'MULTIPLY_TOTAL');
  const adds = mods.filter((m) => m.operation === 'ADD');

  let f0 = baseValue + avg;
  if (maxs.length) f0 = Math.max(f0, ...maxs);
  let f1 = f0 * (1 + mul1.reduce((s, m) => s + m.value, 0));
  f1 *= mul2.reduce((s, m) => s * (1 + m.value), 1);
  f1 += adds.reduce((s, m) => s + m.value, 0);

  return Math.min(Math.max(f1, clampMin), clampMax);
}
