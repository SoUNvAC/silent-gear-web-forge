import { describe, expect, it } from 'vitest';
import { aggregateTraits } from './traits.js';

const MAX = { 'silentgear:malleable': 5, 'silentgear:flexible': 5, 'silentgear:gold_digger': 3 };

describe('aggregateTraits', () => {
  it('单源保持原等级（§7：malleable 3 / flexible 2）', () => {
    const out = aggregateTraits(
      [
        { trait: 'silentgear:malleable', level: 3, materialId: 'silentgear:iron' },
        { trait: 'silentgear:flexible', level: 2, materialId: 'silentgear:iron' },
      ],
      MAX,
    );
    expect(out).toEqual([
      { trait: 'silentgear:flexible', level: 2 },
      { trait: 'silentgear:malleable', level: 3 },
    ]);
  });

  it('多源：同名相加 ÷ max(1, min(N/2, C))（N = 全部实例总数）', () => {
    // 两个材质各带 malleable 3 → sum=6, N=2（全装备仅这 2 实例）, C=2 → divisor=max(1,min(1,2))=1 → 6 → clamp 5
    const out = aggregateTraits(
      [
        { trait: 'silentgear:malleable', level: 3, materialId: 'silentgear:a' },
        { trait: 'silentgear:malleable', level: 3, materialId: 'silentgear:b' },
      ],
      MAX,
    );
    expect(out).toEqual([{ trait: 'silentgear:malleable', level: 5 }]);
  });

  it('§4 算例：main malleable 3 + tip malleable 2，全装备 3 实例 → divisor=1.5 → level=3', () => {
    // 第三个实例来自别处（例如 binding 的 flexible）：N=3, C(malleable)=2
    // → divisor = min(3/2, 2) = 1.5 → round(5/1.5) = 3
    const out = aggregateTraits(
      [
        { trait: 'silentgear:malleable', level: 3, materialId: 'silentgear:iron' },
        { trait: 'silentgear:malleable', level: 2, materialId: 'silentgear:diamond' },
        { trait: 'silentgear:flexible', level: 4, materialId: 'silentgear:vine' },
      ],
      MAX,
    );
    expect(out).toEqual([
      { trait: 'silentgear:flexible', level: 4 }, // min(3/2,1)=1 → 4
      { trait: 'silentgear:malleable', level: 3 },
    ]);
  });

  it('clamp 到 maxLevel', () => {
    const out = aggregateTraits([{ trait: 'silentgear:gold_digger', level: 99, materialId: 'silentgear:x' }], MAX);
    expect(out).toEqual([{ trait: 'silentgear:gold_digger', level: 3 }]);
  });
});
