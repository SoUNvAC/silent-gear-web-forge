import { describe, expect, it } from 'vitest';
import type { PropertyCriterion } from './types.js';
import { scoreBuilds } from './score.js';
import { compareScoredBuilds, lexicographicRank, orderedCriteria } from './lexicographic.js';
import { mkStats } from './fixtures.js';

describe('lexicographic 逐项定序', () => {
  const criteria: PropertyCriterion[] = [
    { property: 'harvest_speed', direction: 'higher', priority: 1 },
    { property: 'durability', direction: 'higher', priority: 2 },
  ];

  it('priority-1 差异决定胜负，忽略 priority-2', () => {
    // A：harvest_speed 好但 durability 差；B：harvest_speed 差但 durability 好 → A 在前
    const scored = scoreBuilds(
      [
        mkStats('silentgear:pickaxe', { harvest_speed: 8, durability: 100 }),
        mkStats('silentgear:pickaxe', { harvest_speed: 4, durability: 500 }),
      ],
      criteria,
    );
    expect(compareScoredBuilds(scored[0]!, scored[1]!, criteria)).toBe(-1);
    expect(compareScoredBuilds(scored[1]!, scored[0]!, criteria)).toBe(1);
    expect(lexicographicRank(scored, criteria)).toEqual([0, 1]);
  });

  it('priority-1 相等时用 priority-2 比较', () => {
    const scored = scoreBuilds(
      [
        mkStats('silentgear:pickaxe', { harvest_speed: 6, durability: 100 }),
        mkStats('silentgear:pickaxe', { harvest_speed: 6, durability: 500 }),
      ],
      criteria,
    );
    expect(lexicographicRank(scored, criteria)).toEqual([1, 0]);
  });

  it('缺失 priority-1 属性的 build 排最后', () => {
    const scored = scoreBuilds(
      [
        mkStats('silentgear:pickaxe', { harvest_speed: 4, durability: 500 }),
        mkStats('silentgear:pickaxe', { durability: 300 }), // 缺 harvest_speed
        mkStats('silentgear:pickaxe', { harvest_speed: 8, durability: 100 }),
      ],
      criteria,
    );
    expect(lexicographicRank(scored, criteria)).toEqual([2, 0, 1]);
  });

  it('未给 priority → 按 criteria 数组序（不依赖 priority 字段）', () => {
    const orderOnly: PropertyCriterion[] = [
      { property: 'attack_damage' },
      { property: 'attack_speed' },
    ];
    // attack_damage 优先于 attack_speed
    const scored = scoreBuilds(
      [
        mkStats('silentgear:sword', { attack_damage: 4, attack_speed: 2 }),
        mkStats('silentgear:sword', { attack_damage: 8, attack_speed: 1 }),
      ],
      orderOnly,
    );
    expect(lexicographicRank(scored, orderOnly)).toEqual([1, 0]);
  });
});

describe('orderedCriteria 优先级排序', () => {
  it('priority 升序，稳定性按位置', () => {
    const out = orderedCriteria([
      { property: 'b', priority: 2 },
      { property: 'a', priority: 1 },
      { property: 'c' },
    ]);
    expect(out.map((c) => c.property)).toEqual(['a', 'b', 'c']);
  });
});
