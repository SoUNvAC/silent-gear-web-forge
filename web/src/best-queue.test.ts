/**
 * Best Build 复合材质（synergy）搜索 —— bestWithCompound 测试
 *
 * 与 main.ts 完全相同的装配路径（loadDataFromDisk → repo/calc/rating/optimizer → initContext），
 * best-queue 模块从 context 取引擎实例。测试：纯 helper（perSlotTopSets/compoundTotal/
 * shrinkCompoundSets/generateCompoundAssemblies）+ 小池 e2e + 确定性 + 全池预算不抛错。
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadDataFromDisk } from '../../src/data/loadDisk.js';
import { DataRepository } from '../../src/data/repository.js';
import { GearCalcEngine } from '../../src/calc/index.js';
import { RatingEngine, transformUserRatingData } from '../../src/rating/index.js';
import { GearOptimizer } from '../../src/optimizer/index.js';
import { initContext } from './context.js';
import {
  COMPOUND_CANDIDATE_BUDGET,
  bestWithCompound,
  compoundTotal,
  generateCompoundAssemblies,
  perSlotTopSets,
  shrinkCompoundSets,
} from './best-queue.js';
import type { CompoundSlotSet } from './best-queue.js';
import type { GearTypeDef } from '../../src/data/types.js';

let repo: DataRepository;
let calc: GearCalcEngine;
let pickaxe: GearTypeDef;

beforeAll(() => {
  repo = new DataRepository(loadDataFromDisk({ dataDir: 'data', gearTypesJsonPath: 'src/data/gear-types.json' }));
  const maxLevels = (JSON.parse(readFileSync('src/data/trait-max-levels.json', 'utf8')) as { maxLevels: Record<string, number> }).maxLevels;
  const ratingData = JSON.parse(readFileSync('data/rating_data.json', 'utf8'));
  calc = new GearCalcEngine(repo, maxLevels);
  const rating = new RatingEngine(repo, transformUserRatingData(ratingData));
  const optimizer = new GearOptimizer({ repo, calc, rating });
  initContext(repo, calc, rating, optimizer, {} as never);
  pickaxe = repo.getGearType('silentgear:pickaxe')!;
});

const slot = (id: string, materials: string[]) => ({
  slot: id as 'silentgear:main' | 'silentgear:rod',
  part: id === 'silentgear:main' ? 'silentgear:pickaxe_head' : 'silentgear:rod',
  materials: materials.map((m) => ({ id: m })),
});

describe('perSlotTopSets', () => {
  it('按 build rank 序首现去重，取每槽 distinct 材质', () => {
    const builds = [
      { assembly: { gearType: pickaxe.id, slots: [slot('silentgear:main', ['silentgear:iron']), slot('silentgear:rod', ['silentgear:basalt'])] } },
      { assembly: { gearType: pickaxe.id, slots: [slot('silentgear:main', ['silentgear:steel']), slot('silentgear:rod', ['silentgear:basalt'])] } },
      { assembly: { gearType: pickaxe.id, slots: [slot('silentgear:main', ['silentgear:iron']), slot('silentgear:rod', ['silentgear:flint'])] } },
    ];
    expect(perSlotTopSets(pickaxe, builds)).toEqual([
      { slot: 'silentgear:main', set: ['silentgear:iron', 'silentgear:steel'] },
      { slot: 'silentgear:rod', set: ['silentgear:basalt', 'silentgear:flint'] },
    ]);
  });
});

describe('compoundTotal', () => {
  it('Σ_s C(|set_s|,2) × Π_{t≠s} |pool_t|', () => {
    const sets: CompoundSlotSet[] = [
      { slot: 'silentgear:main', set: ['a', 'b', 'c'] },
      { slot: 'silentgear:rod', set: ['d', 'e'] },
    ];
    const pools = { 'silentgear:main': ['a', 'b', 'c', 'd', 'e'], 'silentgear:rod': ['d', 'e', 'f'] };
    // C(3,2)=3 × rod pool 3 = 9；C(2,2)=1 × main pool 5 = 5 → 14
    expect(compoundTotal(pickaxe, sets, pools)).toBe(14);
  });

  it('空材质集槽位贡献 0（C(k,2)=0）', () => {
    const sets: CompoundSlotSet[] = [{ slot: 'silentgear:main', set: [] }, { slot: 'silentgear:rod', set: ['a', 'b'] }];
    const pools = { 'silentgear:main': ['x'], 'silentgear:rod': ['a', 'b', 'c'] };
    // C(0,2)=0 × 3 + C(2,2)=1 × 1 = 1
    expect(compoundTotal(pickaxe, sets, pools)).toBe(1);
  });
});

describe('shrinkCompoundSets', () => {
  it('超预算时收缩最大集，结果 ≤ 预算且各集 ≥2、确定性', () => {
    const sets: CompoundSlotSet[] = [
      { slot: 'silentgear:main', set: Array.from({ length: 20 }, (_, i) => `m${i}`) },
      { slot: 'silentgear:rod', set: Array.from({ length: 20 }, (_, i) => `r${i}`) },
    ];
    const pools = { 'silentgear:main': Array.from({ length: 200 }, (_, i) => `p${i}`), 'silentgear:rod': Array.from({ length: 200 }, (_, i) => `q${i}`) };
    const shrunk = shrinkCompoundSets(pickaxe, sets, pools);
    expect(compoundTotal(pickaxe, shrunk, pools)).toBeLessThanOrEqual(COMPOUND_CANDIDATE_BUDGET);
    for (const s of shrunk) expect(s.set.length).toBeGreaterThanOrEqual(2);
    expect(shrunk).toEqual(shrinkCompoundSets(pickaxe, sets, pools)); // 确定性
  });

  it('集合均 ≤2 仍超预算 → 诚实报错（病理池）', () => {
    const sets: CompoundSlotSet[] = [
      { slot: 'silentgear:main', set: ['a', 'b'] },
      { slot: 'silentgear:rod', set: ['c', 'd'] },
    ];
    const pools = { 'silentgear:main': Array.from({ length: 20_000 }, (_, i) => `p${i}`), 'silentgear:rod': Array.from({ length: 20_000 }, (_, i) => `q${i}`) };
    // C(2,2)=1 × 20000 + 1 × 20000 = 40000 > 30000，无法再收缩
    expect(() => shrinkCompoundSets(pickaxe, sets, pools)).toThrow(/无法收缩/);
  });
});

describe('generateCompoundAssemblies', () => {
  it('恰一个必填槽为 2 材料对（主材 = set 序靠前），其余槽单材 from pools', () => {
    const sets: CompoundSlotSet[] = [
      { slot: 'silentgear:main', set: ['silentgear:iron', 'silentgear:steel'] },
      { slot: 'silentgear:rod', set: ['silentgear:basalt'] },
    ];
    const pools = { 'silentgear:main': ['silentgear:iron', 'silentgear:steel'], 'silentgear:rod': ['silentgear:basalt'] };
    const out = generateCompoundAssemblies(pickaxe, sets, pools, 'NONE');
    expect(out).toHaveLength(1);
    expect(out[0]!.slots[0]!.materials.map((m) => m.id)).toEqual(['silentgear:iron', 'silentgear:steel']);
    expect(out[0]!.slots[1]!.materials.map((m) => m.id)).toEqual(['silentgear:basalt']);
  });

  it('两槽都有 ≥2 材质集时生成 双槽复合对 且确定性序', () => {
    const sets: CompoundSlotSet[] = [
      { slot: 'silentgear:main', set: ['a', 'b'] },
      { slot: 'silentgear:rod', set: ['c', 'd'] },
    ];
    const pools = { 'silentgear:main': ['a', 'b'], 'silentgear:rod': ['c', 'd'] };
    const out = generateCompoundAssemblies(pickaxe, sets, pools, 'NONE');
    // 复合槽 main：C(2,2)=1 对 × rod pool 2 = 2；复合槽 rod：C(2,2)=1 对 × main pool 2 = 2 → 4
    expect(out).toHaveLength(4);
    // 复合槽 main 的两个装配（rod 交叉 c/d）
    expect(out[0]!.slots[0]!.materials.map((m) => m.id)).toEqual(['a', 'b']);
    expect(out[0]!.slots[1]!.materials.map((m) => m.id)).toEqual(['c']);
    expect(out[1]!.slots[0]!.materials.map((m) => m.id)).toEqual(['a', 'b']);
    expect(out[1]!.slots[1]!.materials.map((m) => m.id)).toEqual(['d']);
    // 复合槽 rod 的两个装配（main 交叉 a/b）
    expect(out[2]!.slots[1]!.materials.map((m) => m.id)).toEqual(['c', 'd']);
    expect(out[2]!.slots[0]!.materials.map((m) => m.id)).toEqual(['a']);
  });
});

describe('bestWithCompound', () => {
  it('小池 e2e：返回主槽 2 材料复合 build，且确定性', () => {
    const pool = { 'silentgear:main': ['silentgear:iron', 'silentgear:steel'], 'silentgear:rod': ['silentgear:iron', 'silentgear:basalt'] };
    const r1 = bestWithCompound(pickaxe, 'NONE', 1, 12, [0, 1, 2, 3], pool);
    expect(r1.builds.length).toBeGreaterThan(0);
    const compound = r1.builds.find((b) => b.assembly.slots[0]!.materials.length === 2);
    expect(compound).toBeDefined();
    expect(Number.isFinite(compound!.total)).toBe(true);
    // 确定性：两次运行 JSON 相等
    const r2 = bestWithCompound(pickaxe, 'NONE', 1, 12, [0, 1, 2, 3], pool);
    expect(JSON.stringify(r2)).toBe(JSON.stringify(r1));
  });

  it('全池（不传 materialPool）单 charge 不超预算不抛错，返回 topN', () => {
    const r = bestWithCompound(pickaxe, 'NONE', 1, 3, [0]);
    expect(r.builds).toHaveLength(3);
    for (const b of r.builds) expect(b.rank).toBeGreaterThan(0);
  });

  it('addons=true 走附加通道（小池）不抛错', () => {
    const pool = { 'silentgear:main': ['silentgear:iron'], 'silentgear:rod': ['silentgear:iron'] };
    const r = bestWithCompound(pickaxe, 'NONE', 1, 3, [0], pool, true);
    expect(r.builds.length).toBeGreaterThan(0);
  });
});
