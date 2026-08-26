import { describe, expect, it } from 'vitest';
import type { PropertyCriterion } from './types.js';
import { scoreBuilds } from './score.js';
import { weightedTotals } from './weighted.js';
import { mkStats } from './fixtures.js';

describe('weightedTotals', () => {
  const criteria: PropertyCriterion[] = [
    { property: 'harvest_speed', direction: 'higher', weight: 2 },
    { property: 'durability', direction: 'higher', weight: 1 },
  ];

  it('Σ(w·s)/Σw：A(1,0)=2/3、B(0,1)=1/3', () => {
    const scored = scoreBuilds(
      [
        mkStats('silentgear:pickaxe', { harvest_speed: 8, durability: 100 }),
        mkStats('silentgear:pickaxe', { harvest_speed: 4, durability: 500 }),
      ],
      criteria,
    );
    // harvest_speed [8,4] → [1,0]；durability [100,500] → [0,1]
    const totals = weightedTotals(scored, criteria);
    expect(totals[0]).toBeCloseTo(2 / 3, 8);
    expect(totals[1]).toBeCloseTo(1 / 3, 8);
  });

  it('权重影响：权重 2 的属性决定排序（A 1×2+0×1 > B 0×2+1×1）', () => {
    const scored = scoreBuilds(
      [
        mkStats('silentgear:pickaxe', { harvest_speed: 8, durability: 100 }),
        mkStats('silentgear:pickaxe', { harvest_speed: 4, durability: 500 }),
      ],
      criteria,
    );
    const totals = weightedTotals(scored, criteria);
    expect(totals[0]! > totals[1]!).toBe(true);
  });

  it('缺失属性：权重剔除后在现存 criterion 间重新归一（不按 0 惩罚）', () => {
    // A 只有 harvest_speed=8（缺失 durability，权重 1 被剔除）；B 两者都有但 durability 差
    const scored = scoreBuilds(
      [
        mkStats('silentgear:pickaxe', { harvest_speed: 8 }),
        mkStats('silentgear:pickaxe', { harvest_speed: 4, durability: 500 }),
      ],
      criteria,
    );
    const totals = weightedTotals(scored, criteria);
    // A：只按 harvest_speed 权重 2 → (2×1)/2 = 1；B：(2×0 + 1×1)/3 = 1/3
    expect(totals[0]).toBeCloseTo(1, 8);
    expect(totals[1]).toBeCloseTo(1 / 3, 8);
  });

  it('单 build：全 1 → total 1', () => {
    const scored = scoreBuilds([mkStats('silentgear:pickaxe', { harvest_speed: 6, durability: 250 })], criteria);
    expect(weightedTotals(scored, criteria)[0]).toBeCloseTo(1, 8);
  });

  it('无任何属性存在 → 0', () => {
    const scored = scoreBuilds([mkStats('silentgear:pickaxe', {})], [{ property: 'armor', weight: 3 }]);
    expect(weightedTotals(scored, criteria)[0]).toBeCloseTo(0, 8);
  });
});
