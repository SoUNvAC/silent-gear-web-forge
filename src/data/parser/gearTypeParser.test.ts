import { describe, expect, it } from 'vitest';
import { parseGearTypesJson, gearTypeMatches } from './gearTypeParser.js';
import type { GearTypeSourceJson } from './gearTypeParser.js';

const sample: GearTypeSourceJson = {
  version: '3.6.6',
  source: 'data/gear-types-reference.md',
  baseValue: 0,
  gearTypes: {
    all: { parent: null, propertyGroups: ['SPECIAL', 'GENERAL'] },
    tool: { parent: 'all', propertyGroups: ['SPECIAL', 'GENERAL', 'HARVEST', 'ATTACK'] },
    weapon: { parent: 'tool' },
    melee_weapon: { parent: 'weapon' },
    sword: { parent: 'melee_weapon', mainPart: 'sword_blade', requiredParts: ['main', 'rod'], addableSlots: ['tip', 'binding', 'grip', 'coating'], durabilityStat: 'DURABILITY' },
    ranged_weapon: { parent: 'weapon', propertyGroups: ['SPECIAL', 'GENERAL', 'PROJECTILE'] },
    bow: { parent: 'ranged_weapon', mainPart: 'bow_limbs', requiredParts: ['main', 'rod', 'cord'], addableSlots: ['tip', 'binding', 'grip', 'coating', 'cord'], durabilityStat: 'DURABILITY', animationFrames: 4 },
    armor: { parent: 'all', propertyGroups: ['SPECIAL', 'GENERAL', 'ARMOR'], durabilityStat: 'ARMOR_DURABILITY' },
    helmet: { parent: 'armor', mainPart: 'helmet_plates', requiredParts: ['main'], addableSlots: ['tip', 'binding', 'coating', 'lining'], durabilityStat: 'ARMOR_DURABILITY', armorDurabilityMultiplier: 11 },
  },
};

describe('gearTypeParser', () => {
  it('解析为命名空间 id，parent 也加命名空间', () => {
    const defs = parseGearTypesJson(sample);
    const sword = defs.find((d) => d.id === 'silentgear:sword');
    expect(sword?.parent).toBe('silentgear:melee_weapon');
    expect(sword?.mainPart).toBe('silentgear:sword_blade');
    expect(sword?.requiredParts).toEqual(['silentgear:main', 'silentgear:rod']);
    expect(sword?.addableSlots).toContain('silentgear:grip');
  });

  it('有效属性组沿父链解析（父组 + 自身组去重）', () => {
    const defs = parseGearTypesJson(sample);
    const sword = defs.find((d) => d.id === 'silentgear:sword');
    expect([...sword!.propertyGroups].sort()).toEqual(['ATTACK', 'GENERAL', 'HARVEST', 'SPECIAL'].sort());
    const bow = defs.find((d) => d.id === 'silentgear:bow');
    expect(bow!.propertyGroups).toContain('PROJECTILE');
    expect(bow!.propertyGroups).toContain('GENERAL');
    expect(bow!.propertyGroups).not.toContain('ATTACK');
  });

  it('animationFrames / armorDurabilityMultiplier 保留', () => {
    const defs = parseGearTypesJson(sample);
    expect(defs.find((d) => d.id === 'silentgear:bow')?.animationFrames).toBe(4);
    expect(defs.find((d) => d.id === 'silentgear:helmet')?.armorDurabilityMultiplier).toBe(11);
    expect(defs.find((d) => d.id === 'silentgear:helmet')?.durabilityStat).toBe('ARMOR_DURABILITY');
  });

  it('父链成环报错', () => {
    const cyclic = { ...sample, gearTypes: { a: { parent: 'b' }, b: { parent: 'a' } } };
    expect(() => parseGearTypesJson(cyclic)).toThrow(/成环/);
  });

  it('未知属性组报错', () => {
    const bad = { ...sample, gearTypes: { ...sample.gearTypes, x: { parent: null, propertyGroups: ['MAGIC'] } } };
    expect(() => parseGearTypesJson(bad)).toThrow(/未知属性组/);
  });
});

describe('gearTypeMatches', () => {
  const defs = parseGearTypesJson(sample);

  it('沿父链匹配（hammer → pickaxe 类关系）', () => {
    expect(gearTypeMatches(defs, 'silentgear:sword', 'silentgear:tool')).toBe(true);
    expect(gearTypeMatches(defs, 'silentgear:sword', 'silentgear:weapon')).toBe(true);
    expect(gearTypeMatches(defs, 'silentgear:sword', 'silentgear:ranged_weapon')).toBe(false);
    expect(gearTypeMatches(defs, 'silentgear:bow', 'silentgear:ranged_weapon')).toBe(true);
    expect(gearTypeMatches(defs, 'silentgear:sword', 'silentgear:sword')).toBe(true);
    expect(gearTypeMatches(defs, 'silentgear:helmet', 'silentgear:tool')).toBe(false);
    expect(gearTypeMatches(defs, 'silentgear:helmet', 'silentgear:armor')).toBe(true);
  });
});
