import { describe, expect, it } from 'vitest';
import type { PropertyCriterion } from './types.js';
import { scoreBuilds, scorePropertyValues } from './score.js';
import { mkStats } from './fixtures.js';

const mkTier = (level: string | number) => ({ harvest_tier: { name: 'x', level_hint: String(level) } });

describe('scorePropertyValues 群体相对归一化', () => {
  it('higher：min-max 线性归一化到 0..1', () => {
    expect(scorePropertyValues([2, 6, 10], 'higher')).toEqual([0, 0.5, 1]);
  });
  it('lower：倒转（值越小分越高）', () => {
    expect(scorePropertyValues([10, 6, 2], 'lower')).toEqual([0, 0.5, 1]);
  });
  it('max === min：集合内无差异 → 全 1', () => {
    expect(scorePropertyValues([5, 5, 5], 'higher')).toEqual([1, 1, 1]);
  });
  it('负值也按线性区间归一', () => {
    expect(scorePropertyValues([-4, 0, 2], 'higher')).toEqual([0, 4 / 6, 1]);
  });
  it('空集合 → []', () => {
    expect(scorePropertyValues([], 'higher')).toEqual([]);
  });
});

describe('scoreBuilds 逐 criterion 群体评分 + 缺失属性', () => {
  const criteria: PropertyCriterion[] = [
    { property: 'harvest_speed', direction: 'higher' },
    { property: 'durability', direction: 'higher' },
    { property: 'armor', direction: 'higher' }, // 对挖矿工具候选集合不存在
  ];

  it('正常集合：每 build 得 0..1 相对分，scores 与输入对齐', () => {
    const builds = [
      mkStats('silentgear:pickaxe', { harvest_speed: 4, durability: 250 }),
      mkStats('silentgear:pickaxe', { harvest_speed: 8, durability: 500 }),
      mkStats('silentgear:pickaxe', { harvest_speed: 6, durability: 100 }),
    ];
    const scored = scoreBuilds(builds, criteria);
    expect(scored).toHaveLength(3);
    // harvest_speed [4,8,6] → [0, 1, 0.5]
    expect(scored[0]!.scores.harvest_speed).toBeCloseTo(0, 8);
    expect(scored[1]!.scores.harvest_speed).toBeCloseTo(1, 8);
    expect(scored[2]!.scores.harvest_speed).toBeCloseTo(0.5, 8);
    // durability [250,500,100] → [0.375, 1, 0]
    expect(scored[0]!.scores.durability).toBeCloseTo(0.375, 8);
    expect(scored[1]!.scores.durability).toBeCloseTo(1, 8);
    expect(scored[2]!.scores.durability).toBeCloseTo(0, 8);
  });

  it('缺失属性（armor）不进该 build 的 scores，记录到 missing，不按 0 计', () => {
    const builds = [
      mkStats('silentgear:pickaxe', { harvest_speed: 4, durability: 250 }),
      mkStats('silentgear:pickaxe', { harvest_speed: 8, durability: 500 }),
    ];
    const scored = scoreBuilds(builds, criteria);
    for (const s of scored) {
      expect('armor' in s.scores).toBe(false);
      expect(s.missing).toContain('armor');
    }
    // 其余属性正常评分
    expect(scored[0]!.scores.harvest_speed).toBeCloseTo(0, 8);
    expect(scored[1]!.scores.harvest_speed).toBeCloseTo(1, 8);
  });

  it('所有 build 都缺某属性 → 该属性无人计分，全部进 missing', () => {
    const builds = [mkStats('silentgear:pickaxe', { harvest_speed: 4 }), mkStats('silentgear:pickaxe', { harvest_speed: 6 })];
    const scored = scoreBuilds(builds, criteria);
    expect(scored.every((s) => s.missing.includes('durability') && s.missing.includes('armor'))).toBe(true);
    expect(scored[1]!.scores.harvest_speed).toBeCloseTo(1, 8);
  });

  it('单 build 集合退化：所有属性 max===min → 全 1', () => {
    const scored = scoreBuilds([mkStats('silentgear:pickaxe', { harvest_speed: 6, durability: 250 })], criteria);
    expect(scored[0]!.scores.harvest_speed).toBeCloseTo(1, 8);
    expect(scored[0]!.scores.durability).toBeCloseTo(1, 8);
    expect(scored[0]!.missing).toContain('armor');
  });
});

describe('scoreBuilds 特殊来源：tier / trait', () => {
  it('tier：从 extras.harvest_tier.level_hint 数值化参与 min-max', () => {
    const scored = scoreBuilds(
      [
        mkStats('silentgear:pickaxe', { durability: 100 }, mkTier(2)),
        mkStats('silentgear:pickaxe', { durability: 500 }, mkTier(4)),
      ],
      [{ property: 'harvest_tier', source: 'tier' }],
    );
    expect(scored[0]!.scores.harvest_tier).toBeCloseTo(0, 8);
    expect(scored[1]!.scores.harvest_tier).toBeCloseTo(1, 8);
    expect(scored[0]!.missing).toEqual([]);
  });

  it('tier 缺失（无 extras.harvest_tier）→ 进 missing，不按 0 计', () => {
    const scored = scoreBuilds(
      [
        mkStats('silentgear:pickaxe', { durability: 100 }),
        mkStats('silentgear:pickaxe', { durability: 500 }, mkTier(3)),
      ],
      [{ property: 'harvest_tier', source: 'tier' }],
    );
    expect(scored[0]!.missing).toContain('harvest_tier');
    expect('harvest_tier' in scored[0]!.scores).toBe(false);
    expect(scored[1]!.scores.harvest_tier).toBeCloseTo(1, 8);
  });

  it('trait：恒 0 分（不是 min-max 的 max==min→1）', () => {
    const scored = scoreBuilds(
      [mkStats('silentgear:pickaxe', {}), mkStats('silentgear:pickaxe', {})],
      [{ property: 'traits', source: 'trait', weight: 0.1 }],
    );
    expect(scored[0]!.scores.traits).toBeCloseTo(0, 8);
    expect(scored[1]!.scores.traits).toBeCloseTo(0, 8);
    expect(scored[0]!.missing).toEqual([]); // trait 恒存在
  });
});
