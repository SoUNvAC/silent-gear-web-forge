import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadDataFromDisk } from '../data/loadDisk.js';
import { DataRepository } from '../data/repository.js';
import { GearCalcEngine, CalcError } from './engine.js';
import type { GearAssembly } from './engine.js';

const repo = new DataRepository(loadDataFromDisk({ dataDir: 'data', gearTypesJsonPath: 'src/data/gear-types.json' }));
const maxLevels = (JSON.parse(readFileSync('src/data/trait-max-levels.json', 'utf8')) as { maxLevels: Record<string, number> }).maxLevels;
const engine = new GearCalcEngine(repo, maxLevels);

/** §7：铁镐（铁镐头 + 铁杆） */
function ironPickaxe(grade?: 'A'): GearAssembly {
  return {
    gearType: 'silentgear:pickaxe',
    slots: [
      { slot: 'silentgear:main', part: 'silentgear:pickaxe_head', materials: [{ id: 'silentgear:iron', grade }] },
      { slot: 'silentgear:rod', part: 'silentgear:rod', materials: [{ id: 'silentgear:iron' }] },
    ],
  };
}

describe('GearCalcEngine §7 铁镐算例', () => {
  it('裸奔版（无 grade / 无充能）——§7.1', () => {
    const s = engine.computeGearStats(ironPickaxe());
    expect(s.final.durability).toBeCloseTo(250, 6);
    expect(s.final.harvest_speed).toBeCloseTo(6.0, 6);
    expect(s.final.attack_damage).toBeCloseTo(3.0, 6); // 2.0 AVERAGE + 镐头 1.0 ADD
    expect(s.final.attack_speed).toBeCloseTo(1.2, 6); // iron 0.0 AVERAGE（attack_speed/axe 对镐不生效）+ 镐头 1.2
    expect(s.final.enchantment_value).toBeCloseTo(14, 6);
    expect(s.final.repair_efficiency).toBeCloseTo(1.0, 6);
    // traits
    expect(s.traits).toEqual([
      { trait: 'silentgear:flexible', level: 2 },
      { trait: 'silentgear:malleable', level: 3 },
    ]);
    // harvest_tier 透传
    expect((s.extras.harvest_tier as { name: string; level_hint: string }).name).toBe('iron');
    expect((s.extras.harvest_tier as { level_hint: string }).level_hint).toBe('2');
  });

  it('完整版（镐头铁 grade A + starcharged II）——§7.2', () => {
    const s = engine.computeGearStats(ironPickaxe('A'), { chargeLevel: 2 });
    // q = 2 × 0.7 = 1.4
    expect(s.final.durability).toBeCloseTo(358.8, 1); // 250 → 262.5 → ×1.25^1.4
    expect(s.final.attack_damage).toBeCloseTo(4.5, 6); // 2.0→2.1→+1.4=3.5 → +镐头 1.0
    expect(s.final.harvest_speed).toBeCloseTo(10.5, 6); // 6.0→6.3→+4.2
    expect(s.final.attack_speed).toBeCloseTo(1.2, 6); // 不变（不受 grade/充能影响）
    expect(s.final.enchantment_value).toBeCloseTo(16.8, 1); // 14→14.7→×1.1^1.4
    expect(s.final.charging_value).toBeCloseTo(0, 6); // starcharged 删除自身修正
    expect(s.final.repair_efficiency).toBeCloseTo(1.0, 6);
  });

  it('裸奔 charging_value 保留 0.7（无充能时不删除）', () => {
    const s = engine.computeGearStats(ironPickaxe());
    expect(s.final.charging_value).toBeCloseTo(0.7, 6);
  });

  it('Pass3 final = Pass1 base（无 bonus 时）', () => {
    const s = engine.computeGearStats(ironPickaxe());
    expect(s.base).toEqual(s.final);
    expect(s.bonus).toEqual({});
  });
});

describe('GearCalcEngine 校验与特殊机制', () => {
  it('黑名单材料拒绝：example（blacklist all）', () => {
    const assembly: GearAssembly = {
      gearType: 'silentgear:pickaxe',
      slots: [{ slot: 'silentgear:main', part: 'silentgear:pickaxe_head', materials: [{ id: 'silentgear:example' }] }],
    };
    expect(() => engine.computeGearStats(assembly)).toThrow(CalcError);
  });

  it('部件 part_type 与槽位不符 → 报错', () => {
    const assembly: GearAssembly = {
      gearType: 'silentgear:pickaxe',
      slots: [{ slot: 'silentgear:rod', part: 'silentgear:pickaxe_head', materials: [{ id: 'silentgear:iron' }] }],
    };
    expect(() => engine.computeGearStats(assembly)).toThrow(/part_type/);
  });

  it('护甲耐久特殊：helmet durability = 倍率 11 × armor_durability(AVERAGE)', () => {
    const assembly: GearAssembly = {
      gearType: 'silentgear:helmet',
      slots: [{ slot: 'silentgear:main', part: 'silentgear:helmet_plates', materials: [{ id: 'silentgear:iron' }] }],
    };
    const s = engine.computeGearStats(assembly);
    // iron main armor_durability 15 → durability = 11 × 15 = 165（ADD/MULTIPLY 交互 TODO 注）
    expect(s.final.durability).toBeCloseTo(11 * 15, 6);
    // armor_durability 本身按普通属性输出
    expect(s.final.armor_durability).toBeCloseTo(15, 6);
  });

  it('axe 下 attack_speed/axe 生效（-0.1 覆盖无后缀 0.0）', () => {
    // iron main: attack_speed 0 + attack_speed/axe −0.1；axe_head ADD +1.0 → 0.9
    const assembly: GearAssembly = {
      gearType: 'silentgear:axe',
      slots: [
        { slot: 'silentgear:main', part: 'silentgear:axe_head', materials: [{ id: 'silentgear:iron' }] },
        { slot: 'silentgear:rod', part: 'silentgear:rod', materials: [{ id: 'silentgear:iron' }] },
      ],
    };
    const s = engine.computeGearStats(assembly);
    expect(s.final.attack_speed).toBeCloseTo(0.9, 6); // −0.1(AVERAGE/axe) + 1.0(ADD)
  });

  it('crude 门槛：MaterialChoice.crude=true 才触发 ×0.8（synergy 属性，new_1 §1）', () => {
    const assembly: GearAssembly = {
      gearType: 'silentgear:pickaxe',
      slots: [
        { slot: 'silentgear:main', part: 'silentgear:pickaxe_head', materials: [{ id: 'silentgear:iron', crude: true }] },
        { slot: 'silentgear:rod', part: 'silentgear:rod', materials: [{ id: 'silentgear:iron' }] },
      ],
    };
    const s = engine.computeGearStats(assembly);
    // attack_damage 2.0 →×0.8=1.6 → + 镐头 ADD 1.0 = 2.6；harvest_speed 6.0 → 4.8
    expect(s.final.attack_damage).toBeCloseTo(2.6, 6);
    expect(s.final.harvest_speed).toBeCloseTo(4.8, 6);
    // 非 synergy 属性不受 crude：attack_speed 0（+镐头 1.2）→ 1.2
    expect(s.final.attack_speed).toBeCloseTo(1.2, 6);
    // 不带 crude 标记（目录材料默认）→ 不触发
    const plain = engine.computeGearStats(ironPickaxe());
    expect(plain.final.attack_damage).toBeCloseTo(3.0, 6);
  });

  it('附属槽：铁镐 + 钻石 tip → harvest_tier 抬到 diamond(3)（取所有槽位最佳档，§3.1）', () => {
    const assembly: GearAssembly = {
      gearType: 'silentgear:pickaxe',
      slots: [
        { slot: 'silentgear:main', part: 'silentgear:pickaxe_head', materials: [{ id: 'silentgear:iron' }] },
        { slot: 'silentgear:rod', part: 'silentgear:rod', materials: [{ id: 'silentgear:iron' }] },
        { slot: 'silentgear:tip', part: 'silentgear:tip', materials: [{ id: 'silentgear:diamond' }] },
      ],
    };
    const s = engine.computeGearStats(assembly);
    expect((s.extras.harvest_tier as { name: string }).name).toBe('diamond');
    expect((s.extras.harvest_tier as { level_hint: string }).level_hint).toBe('3');
    // 低阶 tip（iron=2）不改变主槽 iron=2
    const low: GearAssembly = { ...assembly, slots: [...assembly.slots.slice(0, 2), { slot: 'silentgear:tip', part: 'silentgear:tip', materials: [{ id: 'silentgear:iron' }] }] };
    const sl = engine.computeGearStats(low);
    expect((sl.extras.harvest_tier as { level_hint: string }).level_hint).toBe('2');
  });

  it('附属槽：coating netherite 抬挖掘等级到 4（coating 段自带 tier，§3.3）', () => {
    const assembly: GearAssembly = {
      gearType: 'silentgear:pickaxe',
      slots: [
        { slot: 'silentgear:main', part: 'silentgear:pickaxe_head', materials: [{ id: 'silentgear:iron' }] },
        { slot: 'silentgear:rod', part: 'silentgear:rod', materials: [{ id: 'silentgear:iron' }] },
        { slot: 'silentgear:coating', part: 'silentgear:coating', materials: [{ id: 'silentgear:netherite' }] },
      ],
    };
    const s = engine.computeGearStats(assembly);
    expect((s.extras.harvest_tier as { level_hint: string }).level_hint).toBe('4');
  });

  it('升级部件：spoon（仅 pickaxe）→ 耐久 ×base 0.2、稀有度 +10、spoon 1（§5）', () => {
    const assembly: GearAssembly = {
      gearType: 'silentgear:pickaxe',
      slots: [
        { slot: 'silentgear:main', part: 'silentgear:pickaxe_head', materials: [{ id: 'silentgear:iron' }] },
        { slot: 'silentgear:rod', part: 'silentgear:rod', materials: [{ id: 'silentgear:iron' }] },
        { slot: 'silentgear:misc_upgrade', part: 'silentgear:spoon_upgrade', materials: [] },
      ],
    };
    const s = engine.computeGearStats(assembly);
    // §7.1 铁镐耐久 250 → ×(1+0.2)=300；稀有度 = iron main 20 + ADD 10 = 30（base 已含 upgrade 修正）
    expect(s.final.durability).toBeCloseTo(300, 6);
    expect(s.final.rarity).toBeCloseTo(30, 6);
    expect(s.final.rarity).toBeCloseTo(s.base.rarity!, 6); // Pass3 = Pass1（rarity 无 trait bonus）
    expect(s.traits).toContainEqual({ trait: 'silentgear:spoon', level: 1 });
    // 原材质 trait 不受 upgrade 干扰（全装备实例数 N 变大的稀释上限为 1）
    expect(s.traits).toContainEqual({ trait: 'silentgear:malleable', level: 3 });
  });

  it('升级部件：magnetic（所有装备）→ magnetic 5（§5）', () => {
    const assembly: GearAssembly = {
      gearType: 'silentgear:pickaxe',
      slots: [
        { slot: 'silentgear:main', part: 'silentgear:pickaxe_head', materials: [{ id: 'silentgear:iron' }] },
        { slot: 'silentgear:rod', part: 'silentgear:rod', materials: [{ id: 'silentgear:iron' }] },
        { slot: 'silentgear:misc_upgrade', part: 'silentgear:magnetic_upgrade', materials: [] },
      ],
    };
    const s = engine.computeGearStats(assembly);
    expect(s.traits).toContainEqual({ trait: 'silentgear:magnetic', level: 5 });
  });

  it('升级部件：spoon 装在 sword → CalcError（可用装备不符，§5）', () => {
    const assembly: GearAssembly = {
      gearType: 'silentgear:sword',
      slots: [
        { slot: 'silentgear:main', part: 'silentgear:sword_blade', materials: [{ id: 'silentgear:iron' }] },
        { slot: 'silentgear:rod', part: 'silentgear:rod', materials: [{ id: 'silentgear:iron' }] },
        { slot: 'silentgear:misc_upgrade', part: 'silentgear:spoon_upgrade', materials: [] },
      ],
    };
    expect(() => engine.computeGearStats(assembly)).toThrow(/不适用于/);
  });

  it('Pass2：bronze SHARP 1 的 bonus（0.125×1×damageRatio×base）进 final（new_1 §4）', () => {
    const assembly: GearAssembly = {
      gearType: 'silentgear:pickaxe',
      slots: [
        { slot: 'silentgear:main', part: 'silentgear:pickaxe_head', materials: [{ id: 'silentgear:bronze' }] },
        { slot: 'silentgear:rod', part: 'silentgear:rod', materials: [{ id: 'silentgear:iron' }] },
      ],
    };
    const s = engine.computeGearStats(assembly);
    expect(s.traits.some((t) => t.trait === 'silentgear:sharp' && t.level === 1)).toBe(true);
    // damageRatio=1（默认新装）：bonus = 0.125 × 1 × 1 × base
    const b = s.base.attack_damage!;
    expect(s.bonus.attack_damage).toBeCloseTo(0.125 * b, 6);
    expect(s.bonus.harvest_speed).toBeCloseTo(0.125 * s.base.harvest_speed!, 6);
    expect(s.final.attack_damage).toBeCloseTo(b + s.bonus.attack_damage!, 6);
    // 半耐久 damageRatio=0.5 → bonus 减半
    const s50 = engine.computeGearStats(assembly, { damageRatio: 0.5 });
    expect(s50.bonus.attack_damage).toBeCloseTo(0.125 * s50.base.attack_damage! * 0.5, 6);
  });
});

describe('GearCalcEngine trait 条件求值门控（attachable-parts-reference.md §4）', () => {
  it('turtle material_count 2：单材无 turtle、复合 2 材有 turtle', () => {
    const single: GearAssembly = {
      gearType: 'silentgear:pickaxe',
      slots: [
        { slot: 'silentgear:main', part: 'silentgear:pickaxe_head', materials: [{ id: 'silentgear:turtle' }] },
        { slot: 'silentgear:rod', part: 'silentgear:rod', materials: [{ id: 'silentgear:iron' }] },
      ],
    };
    expect(engine.computeGearStats(single).traits.some((t) => t.trait === 'silentgear:turtle')).toBe(false);

    const compound: GearAssembly = {
      gearType: 'silentgear:pickaxe',
      slots: [
        { slot: 'silentgear:main', part: 'silentgear:pickaxe_head', materials: [{ id: 'silentgear:turtle' }, { id: 'silentgear:iron' }] },
        { slot: 'silentgear:rod', part: 'silentgear:rod', materials: [{ id: 'silentgear:iron' }] },
      ],
    };
    expect(engine.computeGearStats(compound).traits).toContainEqual({ trait: 'silentgear:turtle', level: 1 });
  });

  it('snow_walker gear_type boots：pickaxe 主槽无、boots 主槽有', () => {
    const leatherPickaxe: GearAssembly = {
      gearType: 'silentgear:pickaxe',
      slots: [
        { slot: 'silentgear:main', part: 'silentgear:pickaxe_head', materials: [{ id: 'silentgear:leather' }] },
        { slot: 'silentgear:rod', part: 'silentgear:rod', materials: [{ id: 'silentgear:iron' }] },
      ],
    };
    expect(engine.computeGearStats(leatherPickaxe).traits.some((t) => t.trait === 'silentgear:snow_walker')).toBe(false);

    const leatherBoots: GearAssembly = {
      gearType: 'silentgear:boots',
      slots: [{ slot: 'silentgear:main', part: 'silentgear:boot_plates', materials: [{ id: 'silentgear:leather' }] }],
    };
    expect(engine.computeGearStats(leatherBoots).traits).toContainEqual({ trait: 'silentgear:snow_walker', level: 1 });
  });

  it('prismarine coating aquatic：单材 level5（ratio 1 通过 level5、not 否决 level3）；半复合 level3', () => {
    const single: GearAssembly = {
      gearType: 'silentgear:pickaxe',
      slots: [
        { slot: 'silentgear:main', part: 'silentgear:pickaxe_head', materials: [{ id: 'silentgear:iron' }] },
        { slot: 'silentgear:rod', part: 'silentgear:rod', materials: [{ id: 'silentgear:iron' }] },
        { slot: 'silentgear:coating', part: 'silentgear:coating', materials: [{ id: 'silentgear:prismarine' }] },
      ],
    };
    const s = engine.computeGearStats(single);
    const aquatic = s.traits.find((t) => t.trait === 'silentgear:aquatic');
    expect(aquatic?.level).toBe(5);

    const half: GearAssembly = {
      gearType: 'silentgear:pickaxe',
      slots: [
        { slot: 'silentgear:main', part: 'silentgear:pickaxe_head', materials: [{ id: 'silentgear:iron' }] },
        { slot: 'silentgear:rod', part: 'silentgear:rod', materials: [{ id: 'silentgear:iron' }] },
        { slot: 'silentgear:coating', part: 'silentgear:coating', materials: [{ id: 'silentgear:prismarine' }, { id: 'silentgear:iron' }] },
      ],
    };
    const s2 = engine.computeGearStats(half);
    const aquatic2 = s2.traits.find((t) => t.trait === 'silentgear:aquatic');
    expect(aquatic2?.level).toBe(3);
  });

  it('diamond lustrous or(count 3, ratio 0.5)：单材 ratio 通过 → lustrous 1', () => {
    const assembly: GearAssembly = {
      gearType: 'silentgear:pickaxe',
      slots: [
        { slot: 'silentgear:main', part: 'silentgear:pickaxe_head', materials: [{ id: 'silentgear:diamond' }] },
        { slot: 'silentgear:rod', part: 'silentgear:rod', materials: [{ id: 'silentgear:iron' }] },
      ],
    };
    expect(engine.computeGearStats(assembly).traits).toContainEqual({ trait: 'silentgear:lustrous', level: 1 });
  });

  it('复合集成：[iron,iron] main S=1 同单材；[iron,diamond] S≠1', () => {
    const single: GearAssembly = {
      gearType: 'silentgear:pickaxe',
      slots: [
        { slot: 'silentgear:main', part: 'silentgear:pickaxe_head', materials: [{ id: 'silentgear:iron' }] },
        { slot: 'silentgear:rod', part: 'silentgear:rod', materials: [{ id: 'silentgear:iron' }] },
      ],
    };
    const samePair: GearAssembly = {
      gearType: 'silentgear:pickaxe',
      slots: [
        { slot: 'silentgear:main', part: 'silentgear:pickaxe_head', materials: [{ id: 'silentgear:iron' }, { id: 'silentgear:iron' }] },
        { slot: 'silentgear:rod', part: 'silentgear:rod', materials: [{ id: 'silentgear:iron' }] },
      ],
    };
    const diffPair: GearAssembly = {
      gearType: 'silentgear:pickaxe',
      slots: [
        { slot: 'silentgear:main', part: 'silentgear:pickaxe_head', materials: [{ id: 'silentgear:iron' }, { id: 'silentgear:diamond' }] },
        { slot: 'silentgear:rod', part: 'silentgear:rod', materials: [{ id: 'silentgear:iron' }] },
      ],
    };

    // [iron,iron]：x=1 → S=1 → 耐久同单材
    expect(engine.computeGearStats(samePair).final.durability).toBeCloseTo(engine.computeGearStats(single).final.durability!, 6);

    // [iron,diamond]：S≠1（无共享类别 → 减 P、稀有度差惩罚）→ 耐久 ≠ 单材 iron 主槽
    const sDiff = engine.computeGearStats(diffPair);
    expect(sDiff.final.durability).not.toBeCloseTo(engine.computeGearStats(single).final.durability!, 6);

    // 公开 API computeCompoundSynergy：单材=1、同材质对=1、异材质对≠1
    expect(engine.computeCompoundSynergy(single.slots[0]!)).toBe(1);
    expect(engine.computeCompoundSynergy(samePair.slots[0]!)).toBe(1);
    expect(engine.computeCompoundSynergy(diffPair.slots[0]!)).not.toBe(1);
  });
});
