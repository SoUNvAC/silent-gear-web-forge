import { describe, expect, it } from 'vitest';
import { loadDataFromDisk } from './loadDisk.js';
import { DataRepository } from './repository.js';

const repo = new DataRepository(loadDataFromDisk({ dataDir: 'data', gearTypesJsonPath: 'src/data/gear-types.json' }));

describe('Repository —— 全量加载（阶段 A 验收）', () => {
  it('材料 132、部件 48、gear type 44', () => {
    expect(repo.materials.size).toBe(132);
    expect(repo.parts.size).toBe(48);
    expect(repo.gearTypes.size).toBe(44);
  });

  it('变体继承：wood/crimson 的数值继承 wood，traits 整键替换', () => {
    const wood = repo.getMaterial('silentgear:wood')!;
    const crimson = repo.getMaterial('silentgear:wood/crimson')!;
    expect(wood.properties['silentgear:main']?.durability).toEqual({ operation: 'AVERAGE', value: 59 });
    // 数值继承
    expect(crimson.properties['silentgear:main']?.durability).toEqual({ operation: 'AVERAGE', value: 59 });
    expect(crimson.properties['silentgear:main']?.harvest_speed).toEqual(wood.properties['silentgear:main']?.harvest_speed);
    // traits 整键替换：crimson 只有 jagged L1（父有 flammable L1 + jagged L1）
    const crimsonTraits = crimson.properties['silentgear:main']?.traits as Array<{ trait: string; level: number }>;
    expect(crimsonTraits).toEqual([{ conditions: [], level: 1, trait: 'silentgear:jagged' }]);
  });

  it('变体继承：wood/oak = wood（空 properties 全继承）', () => {
    const wood = repo.getMaterial('silentgear:wood')!;
    const oak = repo.getMaterial('silentgear:wood/oak')!;
    expect(oak.properties).toEqual(wood.properties);
    expect(oak.parent).toBe('silentgear:wood');
  });

  it('无父材料（wood/rough）不继承任何东西', () => {
    const rough = repo.getMaterial('silentgear:wood/rough')!;
    expect(rough.parent).toBeNull();
    // rough 只有 rod 槽（含 crude trait），没有 main 槽
    expect(rough.properties['silentgear:main']).toBeUndefined();
    expect(rough.properties['silentgear:rod']).toBeDefined();
  });

  it('主部件绑定完整：每个具体 gear type 的主部件都存在且 gear_type 匹配', () => {
    for (const def of repo.gearTypes.values()) {
      if (!def.mainPart) continue; // 抽象类型
      const part = repo.parts.get(def.mainPart)!;
      expect(part, `主部件缺失: ${def.mainPart}`).toBeDefined();
      expect(part.partType).toBe('silentgear:main');
      expect(part.gearType, `${def.id} 绑定 ${def.mainPart} 的 gear_type`).toBe(def.id);
    }
    expect(repo.mainParts()).toHaveLength(34);
  });

  it('gearTypeMatches：hammer 属于 pickaxe（沿父链）', () => {
    expect(repo.gearTypeMatches('silentgear:hammer', 'silentgear:pickaxe')).toBe(true);
    expect(repo.gearTypeMatches('silentgear:sword', 'silentgear:tool')).toBe(true);
    expect(repo.gearTypeMatches('silentgear:sword', 'silentgear:ranged_weapon')).toBe(false);
  });

  it('材料黑名单：example 材料对所有装备禁用（silentgear:all）', () => {
    const example = repo.getMaterial('silentgear:example')!;
    expect(example.gearTypeBlacklist).toEqual(['silentgear:all']);
    expect(repo.materialAllowedForGear(example, 'silentgear:sword')).toBe(false);
    const iron = repo.getMaterial('silentgear:iron')!;
    expect(repo.materialAllowedForGear(iron, 'silentgear:sword')).toBe(true);
  });

  it('索引：materialsByPartType 结果与材料槽位覆盖一致', () => {
    const rodMaterials = repo.materialsByPartType('silentgear:rod');
    // 全部 rod 材料都出现在材料表且 rod 槽非空
    for (const m of rodMaterials) {
      expect(m.properties['silentgear:rod']).toBeDefined();
    }
    // 抽样：iron 有 rod，example 有 rod（example 材料 10 槽全有）
    expect(rodMaterials.some((m) => m.id === 'silentgear:iron')).toBe(true);
    // 独立材料 wood/rough 只有 rod 槽，应出现在 rod 索引
    expect(rodMaterials.some((m) => m.id === 'silentgear:wood/rough')).toBe(true);
    // fletching 材料很少（feather/leaves/paper/flax? 以 JSON 为准，>0 即可）
    expect(repo.materialsByPartType('silentgear:fletching').length).toBeGreaterThan(0);
  });

  it('材料可用装配槽位：iron 支持 main/rod/tip，木棍类只 rod', () => {
    const iron = repo.getMaterial('silentgear:iron')!;
    expect(repo.materialAssemblySlots(iron).sort()).toEqual(['silentgear:main', 'silentgear:rod', 'silentgear:tip']);
    const blazeRod = repo.getMaterial('silentgear:blaze_rod')!;
    expect(repo.materialAssemblySlots(blazeRod)).toEqual(['silentgear:rod']);
  });

  it('材料 id 无重复、全部可解析', () => {
    // loadDataFromDisk 已去重校验；这里确认关键材料都在
    for (const id of ['silentgear:iron', 'silentgear:aluminum', 'silentgear:wood/oak', 'silentgear:terracotta/red', 'silentgear:wool/black', 'silentgear:netherite', 'silentgear:dimerald', 'silentgear:crude_alloy']) {
      expect(repo.getMaterial(id), `缺少材料 ${id}`).toBeDefined();
    }
  });
});
