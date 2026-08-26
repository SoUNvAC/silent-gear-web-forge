/**
 * Calculation Engine —— trait 聚合（TraitListProperty.computeTraits，attachable-parts-reference.md §4）
 *
 * 同名 trait 等级相加 → 除以 min(全部trait实例数/2, 携带该trait的实例数) → clamp 到 maxLevel。
 *
 * divisor = min(N/2, C)：
 *   N = 全装备 trait 实例总数（所有槽位所有 trait，含 upgrade 部件固定 trait）
 *   C = 携带该 trait 的实例数（§4 算例：main malleable 3 + tip malleable 2，全装备 3 实例
 *       → divisor = min(3/2, 2) = 1.5 → level = round(5/1.5) = 3）
 * 下界 max(1, ·) 仅兜底 N=1 退化情形（文档公式 0.5 会把单源等级放大一倍，与 §7 算例矛盾）；
 * N≥2 时按文档公式精确计算。
 */
export interface SourceTrait {
  trait: string;
  level: number;
  /** 携带该 trait 的实例来源（材质 id / upgrade 部件 id）；仅溯源用，聚合公式按实例数计 */
  materialId: string;
}

export interface AggregatedTrait {
  trait: string;
  level: number;
}

export function aggregateTraits(sourceTraits: SourceTrait[], maxLevels: Record<string, number>): AggregatedTrait[] {
  const groups = new Map<string, { sum: number; count: number }>();
  for (const t of sourceTraits) {
    let g = groups.get(t.trait);
    if (!g) {
      g = { sum: 0, count: 0 };
      groups.set(t.trait, g);
    }
    g.sum += t.level;
    g.count += 1;
  }

  const out: AggregatedTrait[] = [];
  for (const [trait, g] of groups) {
    // §4：divisor = min(N/2, C)，N = 全部实例总数，C = 携带该 trait 的实例数
    const divisor = Math.max(1, Math.min(sourceTraits.length / 2, g.count));
    const maxLevel = maxLevels[trait] ?? Infinity; // 未知 trait 不 clamp（TODO：补充数据）
    const level = Math.min(Math.max(1, Math.round(g.sum / divisor)), maxLevel);
    out.push({ trait, level });
  }
  return out.sort((a, b) => a.trait.localeCompare(b.trait));
}
