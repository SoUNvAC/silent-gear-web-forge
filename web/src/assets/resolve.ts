/**
 * Asset 解析 —— 纯函数（无 DOM / 无 canvas），可单测
 *
 * 输入：文件相对路径集合（'item/...'，来自 textures.ts 的 glob 键）+ 数据对象
 * 输出：图层 / 物品图标的相对路径。组件经 AssetRegistry 拿最终 URL，零硬编码路径。
 *
 * 贴图语义（已实测解码确认）：
 *   - 工具家族目录 = gear type id 末段（34 目录恰好覆盖 34 具体类型）；
 *   - 部件图层 `*_generic_hc/lc.png` 等为灰度蒙版 → 按材质 displayColor multiply 着色；
 *   - `part/fragment/*.png` 也是灰度底（无物品贴图材料的兜底图标）；
 *   - 顶层 `*_ingot/dust/...` 是真实彩色物品贴图，直接可用。
 */
import type { PartTypeId } from '../../../src/data/types.js';

/** gear type id 末段 = 工具家族目录名（silentgear:pickaxe → pickaxe） */
export function gearFamilyDir(gearTypeId: string): string {
  return gearTypeId.replace(/^silentgear:/, '');
}

/** 槽 → 部件图层裸文件名。hc/lc 由材质 display.main_texture_type 决定（HIGH_CONTRAST/LOW_CONTRAST） */
export function partLayerBaseName(partType: PartTypeId, hc: boolean): string {
  switch (partType) {
    case 'silentgear:main':
      return hc ? 'main_generic_hc.png' : 'main_generic_lc.png';
    case 'silentgear:rod':
      return hc ? 'rod_generic_hc.png' : 'rod_generic_lc.png';
    case 'silentgear:grip':
      return 'grip_wool.png';
    case 'silentgear:binding':
      return 'binding_generic.png';
    case 'silentgear:tip':
      return 'tip_sharp.png';
    case 'silentgear:setting':
      return 'setting.png';
    case 'silentgear:cord':
      return 'bowstring_string.png';
    case 'silentgear:fletching':
      return 'fletching_generic.png';
    case 'silentgear:lining':
      return 'lining_cloth.png';
    case 'silentgear:coating':
      return 'coating_material.png';
    default:
      return 'dummy_icon_main.png';
  }
}

/** 图层绘制顺序（后画者在上）；toolTexture 合成按此序 */
export const LAYER_DRAW_ORDER: readonly PartTypeId[] = [
  'silentgear:rod',
  'silentgear:main',
  'silentgear:tip',
  'silentgear:grip',
  'silentgear:binding',
  'silentgear:cord',
  'silentgear:fletching',
  'silentgear:setting',
  'silentgear:lining',
  'silentgear:coating',
];

/** 家族内图层候选：精确 → 互换 hc/lc → 裸名（部分家族只有 main.png/rod.png） */
function layerCandidates(partType: PartTypeId, hc: boolean): string[] {
  const base = partLayerBaseName(partType, hc);
  const names = [base];
  if (base.endsWith('_hc.png')) names.push(base.replace('_hc.png', '_lc.png'));
  if (base.endsWith('_lc.png')) names.push(base.replace('_lc.png', '_hc.png'));
  const bare = base.replace('_generic_hc', '').replace('_generic_lc', '');
  if (bare !== base) names.push(bare);
  return names;
}

/** 槽的跨家族通用部件贴图（part/ 目录，灰度 tint 底） */
function partGenericRel(partType: PartTypeId): string | null {
  switch (partType) {
    case 'silentgear:cord':
      return 'item/part/cord.png';
    case 'silentgear:fletching':
      return 'item/part/fletching.png';
    case 'silentgear:grip':
      return 'item/part/grip.png';
    case 'silentgear:binding':
      return 'item/part/binding.png';
    case 'silentgear:tip':
      return 'item/part/tip.png';
    case 'silentgear:setting':
      return 'item/part/setting.png';
    case 'silentgear:lining':
      return 'item/part/lining_cloth.png';
    case 'silentgear:coating':
      return 'item/part/coating_material.png';
    default:
      return null;
  }
}

/**
 * 某槽位在家族内的图层相对路径；不存在则逐级兜底
 * （hc→lc→裸名→part/ 通用→dummy_icon）。仍无 → null（合成时跳过该层）。
 */
export function resolveLayerRel(
  gearTypeId: string,
  partType: PartTypeId,
  hc: boolean,
  files: ReadonlySet<string>,
): string | null {
  const family = gearFamilyDir(gearTypeId);
  for (const name of layerCandidates(partType, hc)) {
    const rel = `item/${family}/${name}`;
    if (files.has(rel)) return rel;
  }
  const generic = partGenericRel(partType);
  if (generic && files.has(generic)) return generic;
  return files.has('item/part/dummy_icon_main.png') ? 'item/part/dummy_icon_main.png' : null;
}

/** 物品贴图探测后缀（真实彩色物品贴图约定，命中即用） */
const ITEM_SUFFIXES = [
  'ingot', 'dust', 'nugget', 'chunks', 'fiber', 'string', 'sinew',
  'cloth', 'fabric', 'shard', 'pebble', 'stick', 'rod', 'raw',
] as const;

/**
 * 材质图标相对路径：
 * 1. id 末段（变体 / 拍平为 _）逐个探测物品贴图后缀，命中即用；
 * 2. 无 → 按 categories 选 part/fragment 灰度底（registry 按 displayColor tint）。
 * 仍无 → null。
 */
export function materialIconRel(
  materialId: string,
  files: ReadonlySet<string>,
  categories: readonly string[],
): string | null {
  const stem = materialId.replace(/^silentgear:/, '').replace(/\//g, '_');
  for (const s of ITEM_SUFFIXES) {
    const rel = `item/${stem}_${s}.png`;
    if (files.has(rel)) return rel;
  }
  const plain = `item/${stem}.png`;
  if (files.has(plain)) return plain;

  const frag = categories.includes('metal')
    ? 'metal'
    : categories.includes('wood')
      ? 'wood'
      : categories.includes('cloth')
        ? 'cloth'
        : 'dust';
  const rel = `item/fragment/${frag}.png`;
  return files.has(rel) ? rel : null;
}

/** fragment 灰度底（registry 需按 displayColor tint 才可见） */
export function isFragmentRel(rel: string | null): boolean {
  return rel !== null && rel.includes('/fragment/');
}

/** trait → 确定性种子（程序化 glyph 用；无真实贴图，纯视觉占位） */
export function traitSeed(trait: string): number {
  let h = 2166136261;
  for (let i = 0; i < trait.length; i++) {
    h ^= trait.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
