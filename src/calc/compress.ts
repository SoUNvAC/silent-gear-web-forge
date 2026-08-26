/**
 * Calculation Engine —— compressModifiers（NumberProperty.java:146-172）
 *
 * 同操作类型的修正合并成一个：
 *   - MAX：直接取最大（不平均，NumberProperty.java:161）
 *   - 其余：加权平均，权重 1 + v/(1+|primary|)（NumberProperty.java:172），数值大的修正占主导
 */
import type { StatModifier, StatOperation } from '../data/types.js';
import { OPERATIONS } from '../data/types.js';

/**
 * getPrimaryMod（NumberProperty.java:181-191，new_1 §2）：同操作组里取第一个值；
 * 首值 ≤ 0（含 0）或全部为负 → 返回 1。
 * 等价描述：扫同 op 修正，取首个 ≥ 0 的值；该值若恰为 0 也按 1 算。
 * 大正修正成为「主材质」，把加权平均拉向它。
 */
export function getPrimaryMod(mods: StatModifier[]): number {
  let primary = -1;
  for (const m of mods) {
    if (primary < 0) primary = m.value;
  }
  return primary > 0 ? primary : 1;
}

/** 权重 1 + v/(1+|primary|)；权重可 <1 甚至为负（mod.value 为负时） */
export function getModifierWeight(v: number, primary: number): number {
  return 1 + v / (1 + Math.abs(primary));
}

/** 加权平均（AVERAGE 用）；官方注释「总权重 > 0 才除」，总权重<=0 时退化简单平均 */
export function weightedAverage(mods: StatModifier[]): number {
  if (mods.length === 0) return 0;
  if (mods.length === 1) return mods[0]!.value; // 单修正恒等，避免 w/w 浮点漂移（10 → 10.000000000000002）
  const primary = getPrimaryMod(mods);
  let totalWeight = 0;
  let ret = 0;
  for (const m of mods) {
    const w = getModifierWeight(m.value, primary);
    totalWeight += w;
    ret += m.value * w;
  }
  if (totalWeight <= 0) return mods.reduce((s, m) => s + m.value, 0) / mods.length;
  return ret / totalWeight;
}

/** 按操作分组压缩为一个 StatModifier（每 op 至多一个） */
export function compressModifiers(mods: StatModifier[]): Map<StatOperation, StatModifier> {
  const byOp = new Map<StatOperation, StatModifier[]>();
  for (const m of mods) {
    const list = byOp.get(m.operation);
    if (list) list.push(m);
    else byOp.set(m.operation, [m]);
  }
  const out = new Map<StatOperation, StatModifier>();
  for (const op of OPERATIONS) {
    const group = byOp.get(op);
    if (!group) continue;
    if (op === 'MAX') {
      out.set(op, { operation: op, value: Math.max(...group.map((m) => m.value)) });
    } else {
      out.set(op, { operation: op, value: weightedAverage(group) });
    }
  }
  return out;
}
