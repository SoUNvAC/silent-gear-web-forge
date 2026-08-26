/**
 * AssetRegistry —— 组件唯一取贴图入口（零硬编码路径）
 *
 * 职责：
 *   - materialIcon(id)     → 真实物品贴图 URL，无则 fragment 灰度底按 displayColor tint
 *   - partSlotTexture(...) → 该槽部件图层按材质色 multiply tint（灰度蒙版着色）
 *   - toolTexture(...)     → 部件图层栈式合成（rod→main→…→cord，官方 tint 模型）
 *   - traitTexture(id)     → 8×8 程序化 glyph（无真实贴图，纯视觉占位）
 *   - preload()            → 启动时预载全部 795 张贴图，合成全程同步
 *
 * 视觉层不参与任何属性计算（数据流仍 ToolBuild→Calc→Rating→UI）。
 */
import type { Material, PartTypeId } from '../../../src/data/types.js';
import { textureUrl, FILE_RELS } from './textures.js';
import {
  materialIconRel,
  resolveLayerRel,
  isFragmentRel,
  traitSeed,
  LAYER_DRAW_ORDER,
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

  private tinted(rel: string, material: Material): HTMLCanvasElement {
    const img = this.images.get(rel);
    const c = document.createElement('canvas');
    c.width = TILE;
    c.height = TILE;
    const ctx = c.getContext('2d');
    if (!ctx) return c;
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, 0, 0, TILE, TILE);
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = argbToCss(material.displayColor) ?? FALLBACK_COLOR;
      ctx.fillRect(0, 0, TILE, TILE);
    } else {
      // 贴图未就绪兜底：纯色块（视觉占位，不影响数据）
      ctx.fillStyle = argbToCss(material.displayColor) ?? FALLBACK_COLOR;
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

  /** 工具合成贴图：按 LAYER_DRAW_ORDER 栈式叠加各槽 tint 图层 */
  toolTexture(gearTypeId: string, slots: readonly ToolSlotTex[]): HTMLCanvasElement {
    const key = `tool:${gearTypeId}:${slots.map((s) => `${s.slot}:${s.material.id}`).join(',')}`;
    const hit = this.cache.get(key);
    if (hit) return hit as HTMLCanvasElement;
    const c = document.createElement('canvas');
    c.width = TILE;
    c.height = TILE;
    const ctx = c.getContext('2d');
    const layer = new Map<PartTypeId, ToolSlotTex>();
    for (const s of slots) layer.set(s.slot, s);
    if (ctx) {
      for (const partType of LAYER_DRAW_ORDER) {
        const s = layer.get(partType);
        if (!s) continue;
        const tex = this.partSlotTexture(gearTypeId, partType, s.material);
        if (tex) ctx.drawImage(tex, 0, 0, TILE, TILE);
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
