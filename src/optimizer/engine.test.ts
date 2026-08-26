import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadDataFromDisk } from '../data/loadDisk.js';
import { DataRepository } from '../data/repository.js';
import { GearCalcEngine } from '../calc/index.js';
import { RatingEngine } from '../rating/engine.js';
import { GearOptimizer } from './engine.js';
import { generateCandidates } from './generator.js';
import { OptimizerError } from './types.js';

const repo = new DataRepository(loadDataFromDisk({ dataDir: 'data', gearTypesJsonPath: 'src/data/gear-types.json' }));
const optimizer = new GearOptimizer({ repo });

/**
 * 已知胜者池（pickaxe 全部评分属性上 diamond > iron > wood/oak，杆统一 iron）：
 * 码点升序 → 候选序 index 0=diamond、1=iron、2=wood/oak。
 */
const pool = {
  'silentgear:main': ['silentgear:diamond', 'silentgear:iron', 'silentgear:wood/oak'],
  'silentgear:rod': ['silentgear:iron'],
};

describe('GearOptimizer.optimize 三模式选择', () => {
  it('weighted：钻石头排第一（top-1），candidateCount=3、不截断、profile 解析到 pickaxe', () => {
    const r = optimizer.optimize('silentgear:pickaxe', 'weighted', { materialPool: pool });
    expect(r.candidateCount).toBe(3);
    expect(r.builds).toHaveLength(3); // topN 默认 10 > 3 → 不截断
    expect(r.truncated).toBe(false);
    expect(r.profile?.id).toBe('pickaxe');
    expect(r.builds[0]!.index).toBe(0);
    expect(r.builds[0]!.rank).toBe(1);
    expect(r.builds[0]!.assembly.slots[0]!.materials[0]!.id).toBe('silentgear:diamond');
    expect(r.ranked).toEqual([0, 1, 2]);
  });

  it('lexicographic：钻石头排第一', () => {
    const r = optimizer.optimize('silentgear:pickaxe', 'lexicographic', { materialPool: pool });
    expect(r.ranked![0]).toBe(0);
    expect(r.builds[0]!.index).toBe(0);
  });

  it('pareto：钻石头独占非支配前沿，rank=null，topN 忽略', () => {
    const r = optimizer.optimize('silentgear:pickaxe', 'pareto', { materialPool: pool, topN: 1 });
    expect(r.nonDominated).toEqual([0]);
    expect(r.builds).toHaveLength(1);
    expect(r.builds[0]!.index).toBe(0);
    expect(r.builds[0]!.rank).toBeNull();
  });

  it('topN 截断：topN=1 → 1 条且 truncated；topN=0 → 全量不截断', () => {
    const one = optimizer.optimize('silentgear:pickaxe', 'weighted', { materialPool: pool, topN: 1 });
    expect(one.builds).toHaveLength(1);
    expect(one.truncated).toBe(true);
    expect(one.builds[0]!.rank).toBe(1);
    expect(one.candidateCount).toBe(3);

    const all = optimizer.optimize('silentgear:pickaxe', 'weighted', { materialPool: pool, topN: 0 });
    expect(all.builds).toHaveLength(3);
    expect(all.truncated).toBe(false);
  });

  it('slotCounts 反映每槽材质池大小（收窄后）', () => {
    const r = optimizer.optimize('silentgear:pickaxe', 'weighted', { materialPool: pool });
    expect(r.slotCounts).toEqual({ 'silentgear:main': 3, 'silentgear:rod': 1 });
  });
});

describe('GearOptimizer.optimize 正确性与确定性', () => {
  it('编排交叉验证：与手动管线（generateCandidates + computeGearStats + rating.evaluate）一致', () => {
    const maxLevels = (JSON.parse(readFileSync('src/data/trait-max-levels.json', 'utf8')) as { maxLevels: Record<string, number> }).maxLevels;
    const calc = new GearCalcEngine(repo, maxLevels);
    const rating = new RatingEngine(repo);

    const generated = generateCandidates(repo, 'silentgear:pickaxe', { materialPool: pool });
    const stats = generated.map((a) => calc.computeGearStats(a, {}));
    const manual = rating.evaluate(stats, 'weighted');
    const topIdx = manual.ranked![0]!;

    const r = optimizer.optimize('silentgear:pickaxe', 'weighted', { materialPool: pool });
    expect(r.ranked).toEqual(manual.ranked);
    expect(r.builds[0]!.assembly).toEqual(generated[topIdx]);
    expect(r.builds[0]!.total).toBeCloseTo(manual.builds[topIdx]!.total, 10);
    expect(r.builds[0]!.scores).toEqual(manual.builds[topIdx]!.scores);
  });

  it('确定性：同一输入两次调用（weighted + pareto）输出 JSON 相等', () => {
    const a = optimizer.optimize('silentgear:pickaxe', 'weighted', { materialPool: pool });
    const b = optimizer.optimize('silentgear:pickaxe', 'weighted', { materialPool: pool });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));

    const c = optimizer.optimize('silentgear:pickaxe', 'pareto', { materialPool: pool });
    const d = optimizer.optimize('silentgear:pickaxe', 'pareto', { materialPool: pool });
    expect(JSON.stringify(c)).toBe(JSON.stringify(d));
  });

  it('grade/charge 固定配置注入生效：grade=A + chargeLevel=2 的 harvest_speed 显著更高', () => {
    const bare = optimizer.optimize('silentgear:pickaxe', 'weighted', { materialPool: pool });
    const boosted = optimizer.optimize('silentgear:pickaxe', 'weighted', { materialPool: pool, grade: 'A', chargeLevel: 2 });
    expect(boosted.builds[0]!.stats.final.harvest_speed!).toBeGreaterThan(bare.builds[0]!.stats.final.harvest_speed!);
    expect(boosted.builds[0]!.assembly.slots[0]!.materials[0]!.grade).toBe('A');
  });

  it('三槽 gear（bow）可跑：main/rod 收窄、cord 全量 → 候选数 6', () => {
    const r = optimizer.optimize('silentgear:bow', 'weighted', {
      materialPool: { 'silentgear:main': ['silentgear:iron'], 'silentgear:rod': ['silentgear:iron'] },
      topN: 3,
    });
    expect(r.candidateCount).toBe(6); // 1 × 1 × cord(6)
    expect(r.builds.length).toBeGreaterThan(0);
    expect(r.builds[0]!.assembly.slots.map((s) => s.slot)).toEqual(['silentgear:main', 'silentgear:rod', 'silentgear:cord']);
  });
});

describe('GearOptimizer.optimize 错误路径', () => {
  it('未知 gearType / 抽象类型 / materialPool 未知材质 / maxCandidates 超限 → OptimizerError', () => {
    expect(() => optimizer.optimize('silentgear:unknown_thing', 'weighted')).toThrow(OptimizerError);
    expect(() => optimizer.optimize('silentgear:tool', 'weighted')).toThrow(/抽象类型不可装配/);
    expect(() => optimizer.optimize('silentgear:pickaxe', 'weighted', { materialPool: { 'silentgear:main': ['silentgear:nope'] } })).toThrow(/materialPool 含未知材质/);
    expect(() => optimizer.optimize('silentgear:pickaxe', 'weighted', { maxCandidates: 1 })).toThrow(OptimizerError);
  });

  it('curio（ring）无数值属性可评 → RatingError 透传（不包装成 OptimizerError）', () => {
    expect(() => optimizer.optimize('silentgear:ring', 'weighted')).toThrow(/无数值属性可评/);
  });
});
