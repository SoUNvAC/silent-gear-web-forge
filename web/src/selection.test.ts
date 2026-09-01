/**
 * 装配选择辅助 —— buildChoicesFromBuild（点击 Best Build 卡片 → materialChoices 映射）
 *
 * 纯函数测试：单材/复合（主材入口 + 完整子材料）/附属槽/升级件不覆盖。
 */
import { describe, expect, it } from 'vitest';
import { buildChoicesFromBuild, buildCompoundChoicesFromBuild, fillChoices } from './selection.js';
import type { PartTypeId } from '../../src/data/types.js';
import type { CandidateSlotView } from '../../src/optimizer/index.js';

/** 构造最小 CandidateSlotView（fillChoices 只读 slot + materials） */
function view(slot: PartTypeId, ids: string[]): CandidateSlotView {
  return { slot, materials: ids.map((id) => ({ id })) } as unknown as CandidateSlotView;
}

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

  it('复合槽的单材入口取主材 materials[0]', () => {
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

describe('buildCompoundChoicesFromBuild', () => {
  it('完整保留复合槽，忽略单材与升级槽', () => {
    const compounds = buildCompoundChoicesFromBuild([
      {
        slot: 'silentgear:main',
        materials: [
          { id: 'silentgear:iron', grade: 'A' },
          { id: 'silentgear:diamond', grade: 'A' },
        ],
      },
      { slot: 'silentgear:rod', materials: [{ id: 'silentgear:iron' }] },
      { slot: 'silentgear:misc_upgrade', materials: [{ id: 'silentgear:iron' }, { id: 'silentgear:diamond' }] },
    ]);
    expect(compounds).toEqual({
      'silentgear:main': [
        { id: 'silentgear:iron', grade: 'A' },
        { id: 'silentgear:diamond', grade: 'A' },
      ],
    });
  });
});

describe('fillChoices（必填兜底 / 附属空选）', () => {
  const CORE = new Set<PartTypeId>(['silentgear:main']);
  const views = (): CandidateSlotView[] => [
    view('silentgear:main', ['silentgear:iron', 'silentgear:steel']),
    view('silentgear:coating', ['silentgear:prismarine']),
  ];

  it('必填槽空选择 → 兜底首候选', () => {
    const { filled, changed } = fillChoices(views(), {}, CORE);
    expect(filled['silentgear:main']).toEqual({ id: 'silentgear:iron' });
    expect(changed).toBe(true);
  });

  it('附属槽默认空选：无选择不补', () => {
    const { filled, changed } = fillChoices(views(), { 'silentgear:main': { id: 'silentgear:iron' } }, CORE);
    expect(filled['silentgear:coating']).toBeUndefined();
    expect(changed).toBe(false);
  });

  it('附属槽已选有效材料 → 保留', () => {
    const { filled, changed } = fillChoices(
      views(),
      { 'silentgear:main': { id: 'silentgear:iron' }, 'silentgear:coating': { id: 'silentgear:prismarine' } },
      CORE,
    );
    expect(filled['silentgear:coating']).toEqual({ id: 'silentgear:prismarine' });
    expect(changed).toBe(false);
  });

  it('附属槽失效材料 → 清空（空选）', () => {
    const { filled, changed } = fillChoices(
      views(),
      { 'silentgear:main': { id: 'silentgear:iron' }, 'silentgear:coating': { id: 'silentgear:stone' } },
      CORE,
    );
    expect(filled['silentgear:coating']).toBeUndefined();
    expect(changed).toBe(true);
  });

  it('必填槽已选 → 保留原选择与品级', () => {
    const { filled, changed } = fillChoices(views(), { 'silentgear:main': { id: 'silentgear:steel', grade: 'S' } }, CORE);
    expect(filled['silentgear:main']).toEqual({ id: 'silentgear:steel', grade: 'S' });
    expect(changed).toBe(false);
  });
});
