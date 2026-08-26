import { describe, expect, it } from 'vitest';
import { propertyDef } from './propertyDefs.js';

describe('propertyDefs clamp 表（new_1 §3 GearProperties.java）', () => {
  it('四个属性有非平凡下限', () => {
    expect(propertyDef('attack_speed')).toMatchObject({ clampMin: -3.9, clampMax: 4.0 });
    expect(propertyDef('block_reach')).toMatchObject({ clampMin: -100, clampMax: 100 });
    expect(propertyDef('attack_reach')).toMatchObject({ clampMin: -100, clampMax: 100 });
    expect(propertyDef('draw_speed')).toMatchObject({ clampMin: -10, clampMax: 10 });
  });

  it('其余数值属性 [0, 2³¹−1]', () => {
    expect(propertyDef('attack_damage')).toMatchObject({ clampMin: 0, clampMax: 2147483647 });
    expect(propertyDef('durability')).toMatchObject({ clampMin: 0, clampMax: 2147483647 });
    expect(propertyDef('harvest_speed')).toMatchObject({ clampMin: 0, clampMax: 2147483647 });
    expect(propertyDef('enchantment_value')).toMatchObject({ clampMin: 0, clampMax: 2147483647 });
  });

  it('armor_durability max = (2³¹−1)/16', () => {
    expect(propertyDef('armor_durability')).toMatchObject({ clampMin: 0, clampMax: 2147483647 / 16 });
  });

  it('baseValue 全 0（default 只是缺省查询值，不进 compute）', () => {
    expect(propertyDef('repair_efficiency').baseValue).toBe(0);
    expect(propertyDef('projectile_speed').baseValue).toBe(0);
  });

  it('grade/synergy 关系（§5.4）：grade 属性、synergy-only、都不受', () => {
    expect(propertyDef('attack_damage').isAffectedByGrades).toBe(true);
    expect(propertyDef('attack_speed').isAffectedByGrades).toBe(false);
    expect(propertyDef('projectile_speed').isAffectedBySynergy).toBe(true);
    expect(propertyDef('projectile_speed').isAffectedByGrades).toBe(false);
    expect(propertyDef('repair_efficiency').isAffectedBySynergy).toBe(false);
  });
});
