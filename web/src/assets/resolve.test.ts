/**
 * resolve.ts 纯函数单测 —— 图层解析 / 物品贴图约定 / 家族目录 / trait 种子
 */
import { describe, expect, it } from 'vitest';
import {
  gearFamilyDir,
  partLayerBaseName,
  gearPartDrawOrder,
  resolveLayerRel,
  materialIconRel,
  isFragmentRel,
  traitSeed,
} from './resolve.js';

/** 真实贴图相对路径子集（来自 assets/item/，与实际文件一致） */
const FILES: string[] = [
  'item/pickaxe/main_generic_hc.png',
  'item/pickaxe/main_generic_lc.png',
  'item/pickaxe/rod_generic_hc.png',
  'item/pickaxe/rod_generic_lc.png',
  'item/pickaxe/grip_wool.png',
  'item/pickaxe/binding_generic.png',
  'item/pickaxe/main.png',
  'item/bow/bowstring_string.png',
  'item/bow/main_generic_hc.png',
  'item/bow/rod_generic_hc.png',
  'item/shield/main_generic_hc.png',
  'item/shield/rod_generic_lc.png',
  'item/part/cord.png',
  'item/part/dummy_icon_main.png',
  'item/fragment/metal.png',
  'item/fragment/wood.png',
  'item/fragment/cloth.png',
  'item/fragment/dust.png',
  'item/azure_electrum_ingot.png',
  'item/azure_electrum_dust.png',
  'item/netherwood_stick.png',
];
const FILE_SET = new Set(FILES);

describe('gearFamilyDir', () => {
  it('id 末段 = 家族目录', () => {
    expect(gearFamilyDir('silentgear:pickaxe')).toBe('pickaxe');
    expect(gearFamilyDir('silentgear:bow')).toBe('bow');
  });
});

describe('partLayerBaseName', () => {
  it('main/rod 分 hc/lc', () => {
    expect(partLayerBaseName('silentgear:main', true)).toBe('main_generic_hc.png');
    expect(partLayerBaseName('silentgear:main', false)).toBe('main_generic_lc.png');
    expect(partLayerBaseName('silentgear:rod', false)).toBe('rod_generic_lc.png');
  });
  it('cord/fletching/setting 等固定图层名', () => {
    expect(partLayerBaseName('silentgear:cord', true)).toBe('bowstring_string.png');
    expect(partLayerBaseName('silentgear:fletching', false)).toBe('fletching_generic.png');
    expect(partLayerBaseName('silentgear:setting', true)).toBe('setting.png');
  });
});

describe('resolveLayerRel', () => {
  it('精确命中家族图层', () => {
    expect(resolveLayerRel('silentgear:pickaxe', 'silentgear:main', true, FILE_SET)).toBe(
      'item/pickaxe/main_generic_hc.png',
    );
  });
  it('家族无 rod_generic_lc（shield 仅 lc）时 hc→lc 兜底', () => {
    // shield 只有 rod_generic_lc；请求 hc → 应落到 lc
    expect(resolveLayerRel('silentgear:shield', 'silentgear:rod', true, FILE_SET)).toBe(
      'item/shield/rod_generic_lc.png',
    );
  });
  it('家族缺层 → part/ 通用部件贴图兜底', () => {
    // bow 无 setting 图层 → part/setting 也不在集合 → 应落到 dummy_icon_main
    expect(resolveLayerRel('silentgear:bow', 'silentgear:binding', true, FILE_SET)).toBe(
      'item/part/dummy_icon_main.png',
    );
  });
  it('bow 的 cord = bowstring_string', () => {
    expect(resolveLayerRel('silentgear:bow', 'silentgear:cord', true, FILE_SET)).toBe(
      'item/bow/bowstring_string.png',
    );
  });
});

describe('materialIconRel', () => {
  it('金属命中 ingot 物品贴图', () => {
    expect(materialIconRel('silentgear:azure_electrum', FILE_SET, ['metal'])).toBe(
      'item/azure_electrum_ingot.png',
    );
  });
  it('wood 变体无物品贴图 → fragment/wood 兜底', () => {
    expect(materialIconRel('silentgear:wood/oak', FILE_SET, ['wood'])).toBe('item/fragment/wood.png');
  });
  it('netherwood 命中 stick', () => {
    expect(materialIconRel('silentgear:netherwood', FILE_SET, ['wood'])).toBe('item/netherwood_stick.png');
  });
  it('fragment 底可被识别为需 tint', () => {
    expect(isFragmentRel('item/fragment/wood.png')).toBe(true);
    expect(isFragmentRel('item/azure_electrum_ingot.png')).toBe(false);
    expect(isFragmentRel(null)).toBe(false);
  });
});

describe('gearPartDrawOrder（MAIN 垫底 + 合成格顺序）', () => {
  it('工具：main→rod→tip→binding→grip→coating（MAIN 永远垫底）', () => {
    const order = gearPartDrawOrder(
      ['silentgear:main', 'silentgear:rod'],
      ['silentgear:tip', 'silentgear:binding', 'silentgear:grip', 'silentgear:coating'],
    );
    expect(order).toEqual([
      'silentgear:main',
      'silentgear:rod',
      'silentgear:tip',
      'silentgear:binding',
      'silentgear:grip',
      'silentgear:coating',
    ]);
  });
  it('弓：cord 在 requiredParts 又在 addableSlots → 去重保留 required 位置（rod 后）', () => {
    const order = gearPartDrawOrder(
      ['silentgear:main', 'silentgear:rod', 'silentgear:cord'],
      ['silentgear:tip', 'silentgear:binding', 'silentgear:grip', 'silentgear:coating', 'silentgear:cord'],
    );
    expect(order).toEqual([
      'silentgear:main',
      'silentgear:rod',
      'silentgear:cord',
      'silentgear:tip',
      'silentgear:binding',
      'silentgear:grip',
      'silentgear:coating',
    ]);
  });
  it('箭：fletching 在 rod 后、tip 前', () => {
    const order = gearPartDrawOrder(
      ['silentgear:main', 'silentgear:rod', 'silentgear:fletching'],
      ['silentgear:tip', 'silentgear:binding', 'silentgear:coating', 'silentgear:fletching'],
    );
    expect(order).toEqual([
      'silentgear:main',
      'silentgear:rod',
      'silentgear:fletching',
      'silentgear:tip',
      'silentgear:binding',
      'silentgear:coating',
    ]);
  });
  it('curio：setting 随 requiredParts，binding 在 coating 前', () => {
    const order = gearPartDrawOrder(
      ['silentgear:main', 'silentgear:setting'],
      ['silentgear:tip', 'silentgear:binding', 'silentgear:coating'],
    );
    expect(order).toEqual([
      'silentgear:main',
      'silentgear:setting',
      'silentgear:tip',
      'silentgear:binding',
      'silentgear:coating',
    ]);
  });
  it('main 强制垫底：requiredParts 里没有也排最前', () => {
    const order = gearPartDrawOrder(['silentgear:rod'], ['silentgear:tip']);
    expect(order[0]).toBe('silentgear:main');
  });
  it('trait 种子确定性且互异', () => {
    const a = traitSeed('silentgear:versatile');
    const b = traitSeed('silentgear:versatile');
    const c = traitSeed('silentgear:flexible');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
