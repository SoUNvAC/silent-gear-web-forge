import { describe, expect, it } from 'vitest';
import type { PropertyCriterion } from './types.js';
import { scoreBuilds } from './score.js';
import { dominates, paretoFront } from './pareto.js';
import { mkStats } from './fixtures.js';

const criteria: PropertyCriterion[] = [
  { property: 'harvest_speed', direction: 'higher' },
  { property: 'durability', direction: 'higher' },
];

describe('dominates', () => {
  it('a ≥ b 全部且至少一个严格 > → a 支配 b', () => {
    const [a, b] = scoreBuilds(
      [
        mkStats('silentgear:pickaxe', { harvest_speed: 8, durability: 500 }),
        mkStats('silentgear:pickaxe', { harvest_speed: 6, durability: 300 }),
      ],
      criteria,
    );
    expect(dominates(a!, b!, criteria)).toBe(true);
    expect(dominates(b!, a!, criteria)).toBe(false);
  });

  it('全相等 → 互不支配', () => {
    const [a, b] = scoreBuilds(
      [
        mkStats('silentgear:pickaxe', { harvest_speed: 6, durability: 300 }),
        mkStats('silentgear:pickaxe', { harvest_speed: 6, durability: 300 }),
      ],
      criteria,
    );
    expect(dominates(a!, b!, criteria)).toBe(false);
    expect(dominates(b!, a!, criteria)).toBe(false);
  });

  it('互有优劣（trade-off）→ 互不支配', () => {
    const [a, b] = scoreBuilds(
      [
        mkStats('silentgear:pickaxe', { harvest_speed: 8, durability: 100 }),
        mkStats('silentgear:pickaxe', { harvest_speed: 4, durability: 500 }),
      ],
      criteria,
    );
    expect(dominates(a!, b!, criteria)).toBe(false);
    expect(dominates(b!, a!, criteria)).toBe(false);
  });

  it('缺失属性不参与比较：共现属性上分低者仍被支配', () => {
    // A 有 x=满分但缺 y；B 有 y=满分但缺 x → 无共现属性 → 互不支配
    const [a, b] = scoreBuilds(
      [
        mkStats('silentgear:pickaxe', { harvest_speed: 8 }),
        mkStats('silentgear:pickaxe', { durability: 500 }),
      ],
      criteria,
    );
    expect(dominates(a!, b!, criteria)).toBe(false);
    expect(dominates(b!, a!, criteria)).toBe(false);
  });
});

describe('paretoFront 非支配前沿', () => {
  it('经典两点前沿：A(1,0)、B(0,1) 互不支配 → 都在前沿', () => {
    const scored = scoreBuilds(
      [
        mkStats('silentgear:pickaxe', { harvest_speed: 8, durability: 100 }),
        mkStats('silentgear:pickaxe', { harvest_speed: 4, durability: 500 }),
      ],
      criteria,
    );
    expect(paretoFront(scored, criteria)).toEqual([0, 1]);
  });

  it('被支配点剔除：A(1,1) 支配其余 → 前沿只剩 A', () => {
    const scored = scoreBuilds(
      [
        mkStats('silentgear:pickaxe', { harvest_speed: 8, durability: 500 }),
        mkStats('silentgear:pickaxe', { harvest_speed: 6, durability: 300 }),
        mkStats('silentgear:pickaxe', { harvest_speed: 4, durability: 100 }),
      ],
      criteria,
    );
    expect(paretoFront(scored, criteria)).toEqual([0]);
  });

  it('中间点在前沿上（无支配）', () => {
    // (1,0) (0.5,0.5) (0,1)：三点互不支配
    const scored = scoreBuilds(
      [
        mkStats('silentgear:pickaxe', { harvest_speed: 8, durability: 100 }),
        mkStats('silentgear:pickaxe', { harvest_speed: 6, durability: 300 }),
        mkStats('silentgear:pickaxe', { harvest_speed: 4, durability: 500 }),
      ],
      criteria,
    );
    expect(paretoFront(scored, criteria)).toEqual([0, 1, 2]);
  });

  it('单 build：自己不被支配 → 在前沿', () => {
    const scored = scoreBuilds([mkStats('silentgear:pickaxe', { harvest_speed: 6, durability: 250 })], criteria);
    expect(paretoFront(scored, criteria)).toEqual([0]);
  });
});
