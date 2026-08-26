/**
 * Calculation Engine —— PropertyKey：/gear 后缀解析与 gear type 父链兜底（官方 PropertyKey.java:68/97-119）
 *
 * 材料 JSON 里 `attack_speed/axe` 这类带 / 的键被解析为「限定 gear type」。
 * 查询时先查精确 key，再沿 gear type 父链向上兜底：
 *   做镐子查 attack_speed/pickaxe → 兜底命中 attack_speed/all（无后缀键）；
 *   attack_speed/axe 只对斧生效。
 */
import type { DataRepository } from '../data/repository.js';

/** 拆开 stat 键：attack_speed/axe → { property: 'attack_speed', gearType: 'axe' } */
export interface ParsedPropertyKey {
  property: string;
  /** null = 无后缀（= all 通用）；否则为限定的 gear type id 去命名空间后的裸名 */
  gearType: string | null;
}

export function parsePropertyKey(key: string): ParsedPropertyKey {
  const slash = key.indexOf('/');
  if (slash === -1) return { property: key, gearType: null };
  return { property: key.slice(0, slash), gearType: key.slice(slash + 1) };
}

/** 去命名空间：silentgear:axe → axe（材料 JSON 的 /gear 后缀键是裸名，如 attack_speed/axe） */
function bareName(id: string): string {
  const i = id.indexOf(':');
  return i === -1 ? id : id.slice(i + 1);
}

/**
 * gear type G 的祖先链（含自身，向上到 all），最具体在前。
 * 仓库内 id 带命名空间（silentgear:axe），但材料 JSON 的 /gear 后缀是裸名，
 * 故链上统一转裸名供 mostSpecificStatKey 匹配。
 */
export function gearTypeAncestorChain(repo: DataRepository, gearTypeId: string): string[] {
  const chain: string[] = [];
  const seen = new Set<string>();
  let cur: string | null = gearTypeId;
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    chain.push(bareName(cur));
    cur = repo.getGearType(cur)?.parent ?? null;
  }
  return chain;
}

/**
 * 从属性表（材料槽位 map 或部件 properties）为属性 property 在 G 的祖先链下解析最具体的键。
 * 先查 property/G、property/parent(G)、…、property/all，最后回退无后缀 property。
 * 返回 null = 该属性表里没有适用于 G 的键（如 pickaxe 下只存在 attack_speed/axe）。
 */
export function mostSpecificStatKey(props: Record<string, unknown>, property: string, ancestorChain: string[]): string | null {
  for (const g of ancestorChain) {
    const k = `${property}/${g}`;
    if (k in props) return k;
  }
  if (property in props) return property;
  return null;
}
