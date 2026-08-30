/**
 * AssetRegistry —— 组件唯一取贴图入口（零硬编码路径）
 *
 * 职责：
 *   - materialIcon(id)     → 真实物品贴图 URL，无则 fragment 灰度底按 displayColor tint
 *   - partSlotTexture(...) → 该槽部件图层按材质色 multiply tint（灰度蒙版着色）
 *   - toolTexture(...)     → 部件图层栈式合成（固定背景 + MAIN 垫底 → 合成格顺序，coating 盖主层 / 高光 / 灰模兜底）
 *   - traitTexture(id)     → 8×8 程序化 glyph（无真实贴图，纯视觉占位）
 *   - preload()            → 启动时预载全部 795 张贴图，合成全程同步
 *
 * 视觉层不参与任何属性计算（数据流仍 ToolBuild→Calc→Rating→UI）。
 */
import type { Material, PartTypeId, GearTypeDef } from '../../../src/data/types.js';
import { textureUrl, FILE_RELS } from './textures.js';
import {
  materialIconRel,
  resolveLayerRel,
  isFragmentRel,
  traitSeed,
  gearPartDrawOrder,
  gearFamilyDir,
} from './resolve.js';
import { argbToCss } from '../format.js';

/** 纹理类型：材质 display.main_texture_type（决定 hc/lc 图层）；缺省 HIGH_CONTRAST */
export type MaterialTextureType = 'HIGH_CONTRAST' | 'LOW_CONTRAST';

/** 合成的槽描述 */
export interface ToolSlotTex {
  slot: PartTypeId;
  material: Material;
}

/** 取贴图结果的统一形态：真实彩色贴图 = URL；灰度蒙版 tint 后 = canvas */
export type AssetSource = string | HTMLCanvasElement;

const TILE = 16;
const FALLBACK_COLOR = '#8b8b8b';
/** 工具合成固定背景：深蓝石墨（高级感），始终同一底色，不随材料/轮廓变化（与 style.css --tool-bg 同值） */
const TOOL_BG = '#1b222c';

/** #RRGGBB → [r,g,b]（tintedLayer 逐像素乘色用） */
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export class AssetRegistry {
  private readonly textureTypeById: ReadonlyMap<string, MaterialTextureType>;
  private readonly images = new Map<string, HTMLImageElement>();
  private readonly cache = new Map<string, AssetSource>();

  constructor(textureTypeById: ReadonlyMap<string, MaterialTextureType>) {
    this.textureTypeById = textureTypeById;
  }

  /** 预载全部贴图到 Image 缓存（toolTexture 合成需同步取图） */
  async preload(): Promise<void> {
    await Promise.all(
      [...FILE_RELS].map((rel) => {
        const url = textureUrl(rel);
        if (!url) return Promise.resolve();
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve(); // 失败不阻塞，合成时跳过该层
          img.src = url;
          this.images.set(rel, img);
        });
      }),
    );
  }

  private hcFor(material: Material): boolean {
    return this.textureTypeById.get(material.id) !== 'LOW_CONTRAST';
  }

  /** 单层独立 canvas：灰模 drawImage + 材质色 multiply 着色（空槽/单槽预览用） */
  private tinted(rel: string, material: Material): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = TILE;
    c.height = TILE;
    const ctx = c.getContext('2d');
    if (ctx) this.drawTinted(ctx, rel, material);
    return c;
  }

  /** 把图层画进目标 ctx：灰模 drawImage + 材质色 multiply 着色；贴图未就绪兜底纯色块 */
  private drawTinted(ctx: CanvasRenderingContext2D, rel: string, material: Material): void {
    const img = this.images.get(rel);
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, 0, 0, TILE, TILE);
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = argbToCss(material.displayColor) ?? FALLBACK_COLOR;
      ctx.fillRect(0, 0, TILE, TILE);
      ctx.globalCompositeOperation = 'source-over'; // 复位，下一层照常覆盖
    } else {
      ctx.fillStyle = argbToCss(material.displayColor) ?? FALLBACK_COLOR;
      ctx.fillRect(0, 0, TILE, TILE);
    }
  }

  /** 未染色灰模（缺件兜底）：直接 drawImage，不 tint（main_generic_lc / rod_generic_lc 等） */
  private drawUntinted(ctx: CanvasRenderingContext2D, rel: string): void {
    const img = this.images.get(rel);
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, 0, 0, TILE, TILE);
    }
  }

  /**
   * 逐像素 tint 层（工具合成用）：灰模 RGB × 材质色，保留 alpha —— 透明区透出背景，
   * 与游戏 renderColoredSprite 读 FastColor 乘到 quad 一致。多层叠放不会重新染下层。
   */
  private tintedLayer(rel: string, colorMat: Material): HTMLCanvasElement {
    const img = this.images.get(rel);
    const c = document.createElement('canvas');
    c.width = TILE;
    c.height = TILE;
    const ctx = c.getContext('2d');
    if (ctx && img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, 0, 0, TILE, TILE);
      try {
        const data = ctx.getImageData(0, 0, TILE, TILE);
        const [r, g, b] = hexToRgb(argbToCss(colorMat.displayColor) ?? FALLBACK_COLOR);
        const px = data.data;
        for (let i = 0; i < px.length; i += 4) {
          if (px[i + 3] === 0) continue; // 透明像素跳过，保留背景
          px[i] = (px[i]! * r) / 255;
          px[i + 1] = (px[i + 1]! * g) / 255;
          px[i + 2] = (px[i + 2]! * b) / 255;
        }
        ctx.putImageData(data, 0, 0);
      } catch {
        /* getImageData 异常（跨域等）：保留原灰模，不阻塞 */
      }
    } else if (ctx) {
      // 贴图未就绪兜底：纯色块（视觉占位，不影响数据）
      ctx.fillStyle = argbToCss(colorMat.displayColor) ?? FALLBACK_COLOR;
      ctx.fillRect(0, 0, TILE, TILE);
    }
    return c;
  }

  /** 材质图标：真实物品贴图 URL；无则 fragment 灰度底 tint；再无则纯色块 */
  materialIcon(material: Material): AssetSource {
    const key = `icon:${material.id}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const rel = materialIconRel(material.id, FILE_RELS, material.categories);
    let src: AssetSource;
    if (rel === null) {
      src = this.tinted('', material); // 无任何贴图 → 纯色块
    } else if (isFragmentRel(rel)) {
      src = this.tinted(rel, material);
    } else {
      src = textureUrl(rel) ?? this.tinted('', material);
    }
    this.cache.set(key, src);
    return src;
  }

  /** 某槽部件图层（按材质色 tint 的 canvas）；无图层 → null（组件画空槽） */
  partSlotTexture(gearTypeId: string, partType: PartTypeId, material: Material): HTMLCanvasElement | null {
    const key = `slot:${gearTypeId}:${partType}:${material.id}`;
    const hit = this.cache.get(key);
    if (hit) return hit as HTMLCanvasElement;
    const rel = resolveLayerRel(gearTypeId, partType, this.hcFor(material), FILE_RELS);
    if (rel === null) return null;
    const out = this.tinted(rel, material);
    this.cache.set(key, out);
    return out;
  }

  /** 缺件灰模兜底：缺 main/rod/fletching/setting 时强制先画未染色灰模，保证形状可见（JEI/创造口径） */
  private static readonly GRAY_FALLBACK_PARTS: ReadonlySet<PartTypeId> = new Set([
    'silentgear:main',
    'silentgear:rod',
    'silentgear:fletching',
    'silentgear:setting',
  ]);

  /**
   * 工具合成贴图（游戏规则）：
   *  ⓪ 固定高级感背景铺底（TOOL_BG），轮廓外区域恒为同一色，不随材料/装备类型变化；
   *  ① 绘制序 = 该类型部件序（MAIN 垫底 → requiredParts → addableSlots，去重），后画盖先画；
   *  ② 每层灰模 × 该部件【主材质色】（tintedLayer 保留 alpha，透明区透出背景，不染下层）；
   *  ③ coating 只染色：有 coating 时 MAIN 层颜色改用 coating 色（GearItemRenderer.java:333-336），
   *     coating 槽自身不叠 coating_material 贴图；
   *  ④ HIGH_CONTRAST：MAIN 画 main_generic_hc + _highlight 两片；LOW_CONTRAST 只画 main_generic_lc；
   *  ⑤ 缺件兜底：缺 main/rod/fletching/setting 先画未染色灰模。
   */
  toolTexture(gearType: GearTypeDef, slots: readonly ToolSlotTex[]): HTMLCanvasElement {
    const key = `tool:${gearType.id}:${slots.map((s) => `${s.slot}:${s.material.id}`).join(',')}`;
    const hit = this.cache.get(key);
    if (hit) return hit as HTMLCanvasElement;
    const c = document.createElement('canvas');
    c.width = TILE;
    c.height = TILE;
    const ctx = c.getContext('2d');
    const layer = new Map<PartTypeId, ToolSlotTex>();
    for (const s of slots) layer.set(s.slot, s);
    if (ctx) {
      // ⓪ 固定背景铺底
      ctx.fillStyle = TOOL_BG;
      ctx.fillRect(0, 0, TILE, TILE);
      const order = gearPartDrawOrder(gearType.requiredParts, gearType.addableSlots);
      // ⑤ 缺件灰模兜底：未染色灰模画在背景上
      for (const partType of order) {
        if (AssetRegistry.GRAY_FALLBACK_PARTS.has(partType) && !layer.has(partType)) {
          const rel = resolveLayerRel(gearType.id, partType, false, FILE_RELS);
          if (rel) this.drawUntinted(ctx, rel);
        }
      }
      // ①-④ 彩色图层栈（tintedLayer 保留 alpha，透明区透出背景）
      const coating = layer.get('silentgear:coating');
      for (const partType of order) {
        const s = layer.get(partType);
        if (!s) continue;
        // ③' 涂层只染色：coating 槽自身不叠贴图，仅把 MAIN 层颜色换成 coating 色
        if (partType === 'silentgear:coating') continue;
        const hc = this.hcFor(s.material); // 图层 hc/lc 由该部件材质 main_texture_type 决定
        const rel = resolveLayerRel(gearType.id, partType, hc, FILE_RELS);
        if (!rel) continue;
        // ③ coating 盖主层：MAIN 层颜色改用 coating 色
        const colorMat = partType === 'silentgear:main' && coating ? coating.material : s.material;
        ctx.drawImage(this.tintedLayer(rel, colorMat), 0, 0, TILE, TILE);
        // ④ HIGH_CONTRAST：MAIN 高光片盖在主体上（家族 _highlight，同色 tint）
        if (partType === 'silentgear:main' && hc) {
          const hl = `item/${gearFamilyDir(gearType.id)}/_highlight.png`;
          if (FILE_RELS.has(hl)) ctx.drawImage(this.tintedLayer(hl, colorMat), 0, 0, TILE, TILE);
        }
      }
    }
    this.cache.set(key, c);
    return c;
  }

  /** trait 图标：8×8 程序化 glyph（hash 种子，视觉占位；无真实贴图） */
  traitTexture(traitId: string): HTMLCanvasElement {
    const key = `trait:${traitId}`;
    const hit = this.cache.get(key);
    if (hit) return hit as HTMLCanvasElement;
    const c = document.createElement('canvas');
    c.width = 8;
    c.height = 8;
    const ctx = c.getContext('2d');
    if (ctx) {
      const seed = traitSeed(traitId);
      const hue = seed % 360;
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, 8, 8);
      // 简单像素纹：对角线 + 噪点（确定性）
      ctx.fillStyle = `hsl(${hue} 60% 60%)`;
      for (let i = 0; i < 8; i++) {
        if (seed & (1 << i)) ctx.fillRect(i, (seed >> 3) % 8, 1, 1);
      }
      for (let i = 0; i < 3; i++) {
        const x = (seed >> (4 + i * 2)) % 8;
        const y = (seed >> (5 + i * 2)) % 8;
        ctx.fillRect(x, y, 2, 1);
      }
    }
    this.cache.set(key, c);
    return c;
  }
}
