import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadDataFromDisk } from '../data/loadDisk.js';
import { DataRepository } from '../data/repository.js';
import { GearCalcEngine } from '../calc/engine.js';
import type { GearAssembly } from '../calc/engine.js';
import { RatingEngine } from './engine.js';
import type { RatingProfile } from './types.js';
import { mkStats } from './fixtures.js';

const repo = new DataRepository(loadDataFromDisk({ dataDir: 'data', gearTypesJsonPath: 'src/data/gear-types.json' }));
const engine = new RatingEngine(repo);

// 确定性注入 profile（真实评分数学与数据文件解耦）
const twoCrit: RatingProfile = {
  id: 'test2',
  matches: ['silentgear:pickaxe'],
  criteria: [
    { property: 'harvest_speed', weight: 2, priority: 1 },
    { property: 'durability', weight: 1, priority: 2 },
  ],
};

describe('RatingEngine.resolveProfile 沿父链解析（具体装备优先）', () => {
  it('已给具体装备 → 自身 profile', () => {
    expect(engine.resolveProfile('silentgear:pickaxe')?.id).toBe('pickaxe');
    expect(engine.resolveProfile('silentgear:sword')?.id).toBe('sword');
    expect(engine.resolveProfile('silentgear:bow')?.id).toBe('bow');
    expect(engine.resolveProfile('silentgear:helmet')?.id).toBe('helmet');
    expect(engine.resolveProfile('silentgear:hammer')?.id).toBe('hammer'); // 比 pickaxe 更深
  });
  it('子类沿祖先链落到具体 profile（excavator→shovel、saw→axe、prospector_hammer→pickaxe）', () => {
    expect(engine.resolveProfile('silentgear:excavator')?.id).toBe('shovel');
    expect(engine.resolveProfile('silentgear:saw')?.id).toBe('axe');
    expect(engine.resolveProfile('silentgear:prospector_hammer')?.id).toBe('pickaxe');
  });
  it('未给的族成员落到家族平均（katana→melee_weapon、slingshot→ranged_weapon、elytra→armor）', () => {
    expect(engine.resolveProfile('silentgear:katana')?.id).toBe('melee_weapon');
    expect(engine.resolveProfile('silentgear:slingshot')?.id).toBe('ranged_weapon');
    expect(engine.resolveProfile('silentgear:elytra')?.id).toBe('armor');
  });
  it('无分组祖先的类型（fishing_rod/shield/ring/arrow）落到 default', () => {
    expect(engine.resolveProfile('silentgear:fishing_rod')?.id).toBe('default');
    expect(engine.resolveProfile('silentgear:shield')?.id).toBe('default');
    expect(engine.resolveProfile('silentgear:ring')?.id).toBe('default');
    expect(engine.resolveProfile('silentgear:arrow')?.id).toBe('default');
  });
  it('未知 gear type → null', () => {
    expect(engine.resolveProfile('silentgear:unknown_thing')).toBeNull();
  });
});

describe('RatingEngine.evaluate（注入 profile，确定性数学）', () => {
  const bare = mkStats('silentgear:pickaxe', { durability: 250, harvest_speed: 6, attack_damage: 3, attack_speed: 1.2, enchantment_value: 14 });
  const complete = mkStats('silentgear:pickaxe', { durability: 358.8, harvest_speed: 10.5, attack_damage: 4.5, attack_speed: 1.2, enchantment_value: 16.8 });

  it('weighted：Σ(w·s)/Σw，完整版排第一；builds 与输入对齐', () => {
    const out = engine.evaluate([bare, complete], 'weighted', twoCrit);
    expect(out.mode).toBe('weighted');
    expect(out.profile).toBe(twoCrit);
    expect(out.ranked).toEqual([1, 0]);
    expect(out.builds[0]!.total).toBeCloseTo(0, 6);
    expect(out.builds[1]!.total).toBeCloseTo(1, 6);
    expect(out.builds[0]!.index).toBe(0);
    expect(out.builds[1]!.index).toBe(1);
  });

  it('lexicographic：按 priority 定序，完整版 harvest_speed 优先', () => {
    const out = engine.evaluate([bare, complete], 'lexicographic', twoCrit);
    expect(out.ranked).toEqual([1, 0]);
  });

  it('pareto：完整版支配裸奔 → 裸奔不在前沿', () => {
    const out = engine.evaluate([bare, complete], 'pareto', twoCrit);
    expect(out.nonDominated).toEqual([1]);
  });

  it('单 build 退化：总分 1，ranked [0]', () => {
    const out = engine.evaluate([bare], 'weighted', twoCrit);
    expect(out.ranked).toEqual([0]);
    expect(out.builds[0]!.total).toBeCloseTo(1, 6);
  });

  it('trait 权重计入但恒 0 分：总分被稀释，不达 1（Q3 占位）', () => {
    const p: RatingProfile = {
      id: 't',
      matches: ['silentgear:pickaxe'],
      criteria: [
        { property: 'harvest_speed', weight: 0.45, priority: 1 },
        { property: 'durability', weight: 0.2, priority: 2 },
        { property: 'traits', weight: 0.1, priority: 3, source: 'trait' },
      ],
    };
    const out = engine.evaluate([bare, complete], 'weighted', p);
    expect(out.builds[0]!.total).toBeCloseTo(0, 6);
    expect(out.builds[1]!.total).toBeCloseTo(0.65 / 0.75, 6); // (0.45·1+0.2·1+0.1·0)/0.75
  });

  it('tier 来源：harvest_tier 等级参与评分；缺失的 build 权重被剔除', () => {
    const p: RatingProfile = {
      id: 'tier',
      matches: ['silentgear:pickaxe'],
      criteria: [
        { property: 'harvest_tier', weight: 1, priority: 1, source: 'tier' },
        { property: 'durability', weight: 1, priority: 2 },
      ],
    };
    const a = mkStats('silentgear:pickaxe', { durability: 100 }, { harvest_tier: { name: 'iron', level_hint: '2' } });
    const b = mkStats('silentgear:pickaxe', { durability: 500 }, { harvest_tier: { name: 'diamond', level_hint: '4' } });
    const out = engine.evaluate([a, b], 'weighted', p);
    expect(out.builds[0]!.scores.harvest_tier).toBeCloseTo(0, 6); // 2/4 → 0
    expect(out.builds[1]!.scores.harvest_tier).toBeCloseTo(1, 6); // 4/4 → 1
    expect(out.builds[0]!.total).toBeCloseTo(0, 6);
    expect(out.builds[1]!.total).toBeCloseTo(1, 6);
  });
});

describe('RatingEngine.evaluate 错误路径', () => {
  it('空候选集合 → 抛错', () => {
    expect(() => engine.evaluate([], 'weighted', twoCrit)).toThrow(/空/);
  });
  it('无匹配 profile（注入空列表）→ 抛错', () => {
    const empty = new RatingEngine(repo, []);
    expect(() => empty.evaluate([mkStats('silentgear:pickaxe', { harvest_speed: 6 })], 'weighted')).toThrow(/无匹配 profile/);
  });
  it('curio 无数值属性（仅 SPECIAL 组）→ 抛错而非假 0 分', () => {
    expect(() => engine.evaluate([mkStats('silentgear:ring', {})], 'weighted')).toThrow(/无数值属性可评/);
  });
});

describe('端到端：Calc Engine → Rating Engine（§7 铁镐候选集，真实 profile）', () => {
  const maxLevels = (JSON.parse(readFileSync('src/data/trait-max-levels.json', 'utf8')) as { maxLevels: Record<string, number> }).maxLevels;
  const calc = new GearCalcEngine(repo, maxLevels);
  const rating = new RatingEngine(repo);

  function ironPickaxe(grade?: 'A'): GearAssembly {
    return {
      gearType: 'silentgear:pickaxe',
      slots: [
        { slot: 'silentgear:main', part: 'silentgear:pickaxe_head', materials: [{ id: 'silentgear:iron', grade }] },
        { slot: 'silentgear:rod', part: 'silentgear:rod', materials: [{ id: 'silentgear:iron' }] },
      ],
    };
  }

  it('三把铁镐（裸奔 / grade A+充能2 / 青铜头）三模式全链路可跑，且符合支配关系', () => {
    const stats = [
      calc.computeGearStats(ironPickaxe()),
      calc.computeGearStats(ironPickaxe('A'), { chargeLevel: 2 }),
      calc.computeGearStats({
        gearType: 'silentgear:pickaxe',
        slots: [
          { slot: 'silentgear:main', part: 'silentgear:pickaxe_head', materials: [{ id: 'silentgear:bronze' }] },
          { slot: 'silentgear:rod', part: 'silentgear:rod', materials: [{ id: 'silentgear:iron' }] },
        ],
      }),
    ];

    // profile 解析到具体装备 pickaxe
    const w = rating.evaluate(stats, 'weighted');
    expect(w.profile?.id).toBe('pickaxe');
    // 完整版（grade A+充能）在 harvest_speed/durability 上支配裸奔 → weighted 总分严格更高
    expect(w.builds[1]!.total).toBeGreaterThan(w.builds[0]!.total);
    expect(new Set(w.ranked)).toEqual(new Set([0, 1, 2]));

    // lexicographic：priority-1 = harvest_speed，完整版 10.5 最高 → 排第一（结构保证）
    const l = rating.evaluate(stats, 'lexicographic');
    expect(l.ranked![0]).toBe(1);

    // pareto：完整版支配裸奔 → 裸奔不在前沿；完整版在前沿（harvest_speed 无人能超）
    const p = rating.evaluate(stats, 'pareto');
    expect(p.nonDominated).toContain(1);
    expect(p.nonDominated).not.toContain(0);
  });
});
