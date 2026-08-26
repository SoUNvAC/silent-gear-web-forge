/**
 * 装配选择辅助 —— buildChoicesFromBuild（点击 Best Build 卡片 → materialChoices 映射）
 *
 * 纯函数测试：单材/复合（取主材）/附属槽/升级件不覆盖。
 */
import { describe, expect, it } from 'vitest';
import { buildChoicesFromBuild } from './selection.js';

describe('buildChoicesFromBuild', () => {
  it('单材槽映射到 materialChoices（值 = MaterialChoice {id}，品级缺省 NONE）', () => {
    const choices = buildChoicesFromBuild([
      { slot: 'silentgear:main', materials: [{ id: 'silentgear:iron' }] },
      { slot: 'silentgear:rod', materials: [{ id: 'silentgear:basalt' }] },
    ]);
    expect(choices).toEqual({
      'silentgear:main': { id: 'silentgear:iron' },
      'silentgear:rod': { id: 'silentgear:basalt' },
    });
  });

  it('复合槽只取主材 materials[0]（装配面板单材编辑器，近似）', () => {
    const choices = buildChoicesFromBuild([
      { slot: 'silentgear:main', materials: [{ id: 'silentgear:iron' }, { id: 'silentgear:steel' }] },
      { slot: 'silentgear:rod', materials: [{ id: 'silentgear:basalt' }] },
    ]);
    expect(choices['silentgear:main']).toEqual({ id: 'silentgear:iron' });
    expect(choices['silentgear:rod']).toEqual({ id: 'silentgear:basalt' });
  });

  it('附属槽照常映射（考虑附属加成模式的结果）', () => {
    const choices = buildChoicesFromBuild([
      { slot: 'silentgear:main', materials: [{ id: 'silentgear:iron' }] },
      { slot: 'silentgear:coating', materials: [{ id: 'silentgear:prismarine' }] },
    ]);
    expect(choices['silentgear:coating']).toEqual({ id: 'silentgear:prismarine' });
  });

  it('升级部件槽不覆盖（Best Build 不搜升级件，应用结果不动用户已选升级）', () => {
    const choices = buildChoicesFromBuild([
      { slot: 'silentgear:main', materials: [{ id: 'silentgear:iron' }] },
      { slot: 'silentgear:misc_upgrade', materials: [] },
    ]);
    expect(choices['silentgear:misc_upgrade']).toBeUndefined();
    expect(choices['silentgear:main']).toEqual({ id: 'silentgear:iron' });
  });

  it('主材品级随应用带入该槽（Best Build 搜索结果自带搜索品级）', () => {
    const choices = buildChoicesFromBuild([
      { slot: 'silentgear:main', materials: [{ id: 'silentgear:iron', grade: 'S' }] },
      { slot: 'silentgear:rod', materials: [{ id: 'silentgear:basalt' }] },
    ]);
    expect(choices['silentgear:main']).toEqual({ id: 'silentgear:iron', grade: 'S' });
    expect(choices['silentgear:rod']).toEqual({ id: 'silentgear:basalt' });
  });

  it("主材 grade 'NONE' 不写字段（等价未设品级）", () => {
    const choices = buildChoicesFromBuild([
      { slot: 'silentgear:main', materials: [{ id: 'silentgear:iron', grade: 'NONE' }] },
    ]);
    expect(choices['silentgear:main']).toEqual({ id: 'silentgear:iron' });
  });
});
