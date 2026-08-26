import { describe, expect, it } from 'vitest';
import { parsePart } from './partParser.js';
import { ValidationError } from '../validator.js';

describe('partParser', () => {
  it('主部件解析：ADD / MULTIPLY_BASE / 裸数字规约', () => {
    const p = parsePart(
      {
        type: 'silentgear:core',
        gear_type: 'silentgear:katana',
        part_type: 'silentgear:main',
        properties: {
          attack_damage: { operation: 'ADD', value: 4.0 },
          durability: { operation: 'MULTIPLY_BASE', value: 0.125 },
          repair_efficiency: 1.0,
        },
      },
      'silentgear:katana_blade',
    );
    expect(p.id).toBe('silentgear:katana_blade');
    expect(p.partType).toBe('silentgear:main');
    expect(p.properties.attack_damage).toEqual({ operation: 'ADD', value: 4 });
    expect(p.properties.durability).toEqual({ operation: 'MULTIPLY_BASE', value: 0.125 });
    expect(p.properties.repair_efficiency).toEqual({ operation: 'AVERAGE', value: 1 });
  });

  it('一个 stat 键挂多个修饰符数组（elytra armor）', () => {
    const p = parsePart(
      {
        type: 'silentgear:core',
        gear_type: 'silentgear:elytra',
        part_type: 'silentgear:main',
        properties: {
          armor: [
            { operation: 'MULTIPLY_BASE', value: -0.65 },
            { operation: 'ADD', value: -3.5 },
          ],
        },
      },
      'silentgear:elytra_wings',
    );
    expect(p.properties.armor).toEqual([
      { operation: 'MULTIPLY_BASE', value: -0.65 },
      { operation: 'ADD', value: -3.5 },
    ]);
  });

  it('upgrade 部件：upgrade_gear_types 对象', () => {
    const p = parsePart(
      {
        type: 'silentgear:upgrade',
        gear_type: 'silentgear:all',
        part_type: 'silentgear:misc_upgrade',
        properties: { durability: { operation: 'MULTIPLY_BASE', value: 0.2 } },
        upgrade_gear_types: { match_parents: false, types: ['silentgear:pickaxe'] },
      },
      'silentgear:spoon_upgrade',
    );
    expect(p.type).toBe('upgrade');
    expect(p.upgradeGearTypes).toEqual({ match_parents: false, types: ['silentgear:pickaxe'] });
  });

  it('空 properties 通用部件', () => {
    const p = parsePart(
      { type: 'silentgear:core', gear_type: 'silentgear:tool', part_type: 'silentgear:rod', properties: {} },
      'silentgear:rod',
    );
    expect(Object.keys(p.properties)).toHaveLength(0);
  });

  it('未知 part_type 报错', () => {
    expect(() =>
      parsePart({ type: 'silentgear:core', gear_type: 'silentgear:sword', part_type: 'silentgear:flange', properties: {} }, 'silentgear:x'),
    ).toThrow(ValidationError);
  });

  it('未知部件类型报错', () => {
    expect(() => parsePart({ type: 'silentgear:weird', gear_type: 'silentgear:sword', part_type: 'silentgear:main', properties: {} }, 'silentgear:x')).toThrow(
      /未知部件类型/,
    );
  });
});
