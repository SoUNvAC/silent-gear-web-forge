import { describe, expect, it } from 'vitest';
import { loadDataFromDisk } from '../data/loadDisk.js';
import { DataRepository } from '../data/repository.js';
import { generateCandidates } from './generator.js';
import { OptimizerError } from './types.js';

const repo = new DataRepository(loadDataFromDisk({ dataDir: 'data', gearTypesJsonPath: 'src/data/gear-types.json' }));

/** pickaxe 主槽 / 杆槽的可用材质数（黑名单过滤后，与生成器同一口径） */
const pickaxeMain = repo.materialsByPartType('silentgear:main').filter((m) => repo.materialAllowedForGear(m, 'silentgear:pickaxe'));
const pickaxeRod = repo.materialsByPartType('silentgear:rod').filter((m) => repo.materialAllowedForGear(m, 'silentgear:pickaxe'));

describe('generateCandidates 候选结构', () => {
  it('pickaxe 候选数 = main×rod（黑名单后），每装配恰好 2 槽、顺序 [main, rod]、部件正确、每槽 1 材料', () => {
    const assemblies = generateCandidates(repo, 'silentgear:pickaxe');
    expect(assemblies).toHaveLength(pickaxeMain.length * pickaxeRod.length);
    for (const a of assemblies) {
      expect(a.gearType).toBe('silentgear:pickaxe');
      expect(a.slots.map((s) => s.slot)).toEqual(['silentgear:main', 'silentgear:rod']);
      expect(a.slots[0]!.part).toBe('silentgear:pickaxe_head');
      expect(a.slots[1]!.part).toBe('silentgear:rod');
      for (const s of a.slots) {
        expect(s.materials).toHaveLength(1);
        expect(typeof s.materials[0]!.id).toBe('string');
      }
    }
  });

  it('确定性：两次调用 deep-equal；槽内材质 id 码点升序（首尾断言）', () => {
    const a = generateCandidates(repo, 'silentgear:pickaxe');
    const b = generateCandidates(repo, 'silentgear:pickaxe');
    expect(a).toEqual(b);

    const sortedMain = [...pickaxeMain.map((m) => m.id)].sort();
    const sortedRod = [...pickaxeRod.map((m) => m.id)].sort();
    expect(a[0]!.slots[0]!.materials[0]!.id).toBe(sortedMain[0]); // 首候选 = 最小码点材质
    expect(a[a.length - 1]!.slots[0]!.materials[0]!.id).toBe(sortedMain[sortedMain.length - 1]);
    expect(a[0]!.slots[1]!.materials[0]!.id).toBe(sortedRod[0]);
  });

  it('不含黑名单材质（silentgear:example）', () => {
    const assemblies = generateCandidates(repo, 'silentgear:pickaxe');
    const ids = assemblies.flatMap((a) => a.slots.flatMap((s) => s.materials.map((m) => m.id)));
    expect(ids).not.toContain('silentgear:example');
  });

  it('materialPool 收窄：main=[iron,bronze]、rod=[iron] → 2 候选，材料严格落在池内', () => {
    const assemblies = generateCandidates(repo, 'silentgear:pickaxe', {
      materialPool: { 'silentgear:main': ['silentgear:iron', 'silentgear:bronze'], 'silentgear:rod': ['silentgear:iron'] },
    });
    expect(assemblies).toHaveLength(2);
    const mainIds = new Set(assemblies.map((a) => a.slots[0]!.materials[0]!.id));
    expect(mainIds).toEqual(new Set(['silentgear:bronze', 'silentgear:iron'])); // 码点升序，池序被覆盖
    for (const a of assemblies) {
      expect(a.slots[1]!.materials[0]!.id).toBe('silentgear:iron');
    }
  });

  it('grade 固定写入：grade=A → 每 MaterialChoice.grade==="A"；缺省不写 grade 字段', () => {
    const withGrade = generateCandidates(repo, 'silentgear:pickaxe', {
      materialPool: { 'silentgear:main': ['silentgear:iron'], 'silentgear:rod': ['silentgear:iron'] },
      grade: 'A',
    });
    for (const a of withGrade) {
      for (const s of a.slots) expect(s.materials[0]!.grade).toBe('A');
    }
    const bare = generateCandidates(repo, 'silentgear:pickaxe', {
      materialPool: { 'silentgear:main': ['silentgear:iron'], 'silentgear:rod': ['silentgear:iron'] },
    });
    for (const a of bare) {
      for (const s of a.slots) expect(s.materials[0]!.grade).toBeUndefined();
    }
  });

  it('三槽 gear（bow）：收窄 main/rod/cord=1 → 候选数 1，槽序 [main, rod, cord]', () => {
    const cordFirst = repo.materialsByPartType('silentgear:cord')[0]!.id;
    const assemblies = generateCandidates(repo, 'silentgear:bow', {
      materialPool: {
        'silentgear:main': ['silentgear:iron'],
        'silentgear:rod': ['silentgear:iron'],
        'silentgear:cord': [cordFirst],
      },
    });
    expect(assemblies).toHaveLength(1);
    expect(assemblies[0]!.slots.map((s) => s.slot)).toEqual(['silentgear:main', 'silentgear:rod', 'silentgear:cord']);
  });
});

describe('generateCandidates 错误路径', () => {
  it('未知 gear type → OptimizerError', () => {
    expect(() => generateCandidates(repo, 'silentgear:unknown_thing')).toThrow(OptimizerError);
    expect(() => generateCandidates(repo, 'silentgear:unknown_thing')).toThrow(/未知 gear type/);
  });

  it('抽象类型（silentgear:all / silentgear:tool）→ OptimizerError', () => {
    expect(() => generateCandidates(repo, 'silentgear:all')).toThrow(/抽象类型不可装配/);
    expect(() => generateCandidates(repo, 'silentgear:tool')).toThrow(/抽象类型不可装配/);
  });

  it('materialPool 含未知材质 → OptimizerError', () => {
    expect(() =>
      generateCandidates(repo, 'silentgear:pickaxe', { materialPool: { 'silentgear:main': ['silentgear:not_a_material'] } }),
    ).toThrow(/materialPool 含未知材质/);
  });

  it('materialPool 全黑名单 → 槽位无可用材质 → OptimizerError', () => {
    expect(() =>
      generateCandidates(repo, 'silentgear:pickaxe', {
        materialPool: { 'silentgear:main': ['silentgear:example'], 'silentgear:rod': ['silentgear:iron'] },
      }),
    ).toThrow(/无可用材质/);
  });

  it('maxCandidates 超限 → OptimizerError', () => {
    expect(() => generateCandidates(repo, 'silentgear:pickaxe', { maxCandidates: 1 })).toThrow(/超过上限/);
  });
});
