import { describe, expect, it } from 'vitest';
import { parseMaterial } from './materialParser.js';
import { ValidationError } from '../validator.js';

describe('materialParser', () => {
  it('裸数字统一规约 AVERAGE，对象保持 operation', () => {
    const m = parseMaterial(
      {
        type: 'silentgear:simple',
        parent: 'silentgear:empty',
        properties: {
          'silentgear:main': { durability: 250.0, attack_damage: { operation: 'ADD', value: 2.0 } },
        },
      },
      'silentgear:iron',
    );
    expect(m.properties['silentgear:main']?.durability).toEqual({ operation: 'AVERAGE', value: 250 });
    expect(m.properties['silentgear:main']?.attack_damage).toEqual({ operation: 'ADD', value: 2 });
  });

  it('silentgear:empty parent 归一为 null', () => {
    const m = parseMaterial({ type: 'silentgear:simple', parent: 'silentgear:empty' }, 'silentgear:iron');
    expect(m.parent).toBeNull();
  });

  it('真实 parent 保留完整 id', () => {
    const m = parseMaterial({ type: 'silentgear:simple', parent: 'silentgear:wood' }, 'silentgear:wood/oak');
    expect(m.parent).toBe('silentgear:wood');
  });

  it('无 parent 字段 → null', () => {
    const m = parseMaterial({ type: 'silentgear:simple' }, 'silentgear:wood/rough');
    expect(m.parent).toBeNull();
  });

  it('harvest_tier / traits 保持对象结构', () => {
    const m = parseMaterial(
      {
        type: 'silentgear:simple',
        properties: {
          'silentgear:main': {
            harvest_tier: { incorrect_blocks_for_tool: 'silentgear:incorrect_for_iron_tools', level_hint: '2', name: 'iron' },
            traits: [{ conditions: [], level: 3, trait: 'silentgear:malleable' }],
          },
        },
      },
      'silentgear:iron',
    );
    expect(m.properties['silentgear:main']?.harvest_tier).toEqual({
      incorrect_blocks_for_tool: 'silentgear:incorrect_for_iron_tools',
      level_hint: '2',
      name: 'iron',
    });
    expect(m.properties['silentgear:main']?.traits).toEqual([{ conditions: [], level: 3, trait: 'silentgear:malleable' }]);
  });

  it('trait 条件嵌套（or / material_ratio）解析', () => {
    const m = parseMaterial(
      {
        type: 'silentgear:custom_compound',
        properties: {
          'silentgear:main': {
            traits: [
              {
                conditions: [
                  { type: 'silentgear:or', values: [{ type: 'silentgear:material_count', count: 3 }, { type: 'silentgear:material_ratio', ratio: 0.5 }] },
                ],
                level: 2,
                trait: 'silentgear:gold_digger',
              },
            ],
          },
        },
      },
      'silentgear:dimerald',
    );
    const t = m.properties['silentgear:main']?.traits as Array<{ conditions: { type: string }[] }>;
    expect(t?.[0]?.conditions?.[0]?.type).toBe('silentgear:or');
  });

  it('trait 条件标量字段赋值（ratio/count/gear_type 曾只校验不赋值）', () => {
    const m = parseMaterial(
      {
        type: 'silentgear:simple',
        properties: {
          'silentgear:main': {
            traits: [
              {
                conditions: [
                  { type: 'silentgear:material_ratio', ratio: 0.67 },
                  { type: 'silentgear:material_count', count: 2 },
                  { type: 'silentgear:gear_type', gear_type: 'silentgear:boots' },
                ],
                level: 1,
                trait: 'silentgear:x',
              },
            ],
          },
        },
      },
      'silentgear:prismarine',
    );
    const t = m.properties['silentgear:main']?.traits as Array<{ conditions: Array<{ ratio?: number; count?: number; gear_type?: string }> }>;
    expect(t?.[0]?.conditions[0]?.ratio).toBe(0.67);
    expect(t?.[0]?.conditions[1]?.count).toBe(2);
    expect(t?.[0]?.conditions[2]?.gear_type).toBe('silentgear:boots');
  });

  it('trait 条件 not 的操作数 value 递归解析（prismarine coating aquatic 3）', () => {
    const m = parseMaterial(
      {
        type: 'silentgear:simple',
        properties: {
          'silentgear:coating': {
            traits: [
              { conditions: [{ type: 'silentgear:not', value: { type: 'silentgear:material_ratio', ratio: 0.67 } }], level: 3, trait: 'silentgear:aquatic' },
            ],
          },
        },
      },
      'silentgear:prismarine',
    );
    const t = m.properties['silentgear:coating']?.traits as Array<{
      conditions: Array<{ type: string; value?: { type: string; ratio?: number } }>;
    }>;
    const cond = t?.[0]?.conditions[0];
    expect(cond?.type).toBe('silentgear:not');
    expect(cond?.value?.type).toBe('silentgear:material_ratio');
    expect(cond?.value?.ratio).toBe(0.67);
  });

  it('display 颜色 #AARRGGBB 解析为数值', () => {
    const m = parseMaterial({ type: 'silentgear:simple', display: { color: '#FFFFFFFF' } }, 'silentgear:iron');
    expect(m.displayColor).toBe(0xffffffff);
  });

  it('非 8 位十六进制颜色报错', () => {
    expect(() => parseMaterial({ type: 'silentgear:simple', display: { color: '#FFF' } }, 'silentgear:x')).toThrow(ValidationError);
  });

  it('SPECIAL 组 additive 布尔值解析（glowstone/redstone 等）', () => {
    const m = parseMaterial(
      { type: 'silentgear:simple', properties: { 'silentgear:main': { additive: true, durability: 10 } } },
      'silentgear:redstone',
    );
    expect(m.properties['silentgear:main']?.additive).toBe(true);
    expect(() =>
      parseMaterial({ type: 'silentgear:simple', properties: { 'silentgear:main': { additive: 'yes' } } }, 'silentgear:x'),
    ).toThrow(/additive 期望布尔/);
  });

  it('未知 operation 报错', () => {
    expect(() =>
      parseMaterial({ type: 'silentgear:simple', properties: { 'silentgear:main': { durability: { operation: 'MAGIC', value: 1 } } } }, 'silentgear:x'),
    ).toThrow(/未知 operation/);
  });

  it('未知槽位键报错', () => {
    expect(() =>
      parseMaterial({ type: 'silentgear:simple', properties: { 'silentgear:mystery_slot': { durability: 1 } } }, 'silentgear:x'),
    ).toThrow(/未知槽位键/);
  });

  it('stat 值既非数值也非 modifier 结构时报错（暴露未知数据，不静默吞）', () => {
    expect(() =>
      parseMaterial({ type: 'silentgear:simple', properties: { 'silentgear:main': { durability: { what: 'is-this' } } } }, 'silentgear:x'),
    ).toThrow(/未知 stat 结构/);
  });
});
