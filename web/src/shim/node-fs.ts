/**
 * 浏览器端 node:fs 内联 shim
 *
 * vite.config.ts 把 `node:fs` alias 到本模块。核心层（bonus.ts / optimizer/engine.ts /
 * rating/profiles.ts）的 readFileSync 在这里由静态 import 的小型 JSON 提供 —— 核心零改动，
 * 浏览器 bundle 不再触发 Node 文件系统。
 *
 * 三个 JSON 都很小（≤3.5KB），静态内联进 bundle 无体积负担。其余路径显式抛错（fail loud），
 * 避免静默空数据掩盖缺文件。
 */
import type { TraitBonusProperties } from '../../../src/calc/bonus.js';
import type { UserRatingData } from '../../../src/rating/profiles.js';
import traitBonusPropertiesJson from '../../../src/data/trait-bonus-properties.json';
import traitMaxLevelsJson from '../../../src/data/trait-max-levels.json';
import ratingDataJson from '../../../data/rating_data.json';

const FILES: Record<string, string> = {
  'src/data/trait-bonus-properties.json': JSON.stringify(traitBonusPropertiesJson),
  'src/data/trait-max-levels.json': JSON.stringify(traitMaxLevelsJson),
  'data/rating_data.json': JSON.stringify(ratingDataJson),
};

/** 同步读文件：只服务上面三个已知路径，其余显式抛错 */
export function readFileSync(path: string, _encoding?: string): string {
  const content = FILES[path];
  if (content === undefined) throw new Error(`[web fs shim] 未内联文件: ${path}`);
  return content;
}

/** GearCalcEngine 默认 trait 上限（src/data/trait-max-levels.json 的 maxLevels 字段） */
export const TRAIT_MAX_LEVELS: Record<string, number> = (
  traitMaxLevelsJson as { maxLevels: Record<string, number> }
).maxLevels;

/** Pass2 bonus 数据（bonus.ts BONUS_PROPERTIES 同源） */
export const TRAIT_BONUS_PROPERTIES: TraitBonusProperties = (
  traitBonusPropertiesJson as { traits: TraitBonusProperties }
).traits;

/** 用户评级数据（data/rating_data.json）→ transformUserRatingData 构造 RatingEngine profiles */
export const RATING_DATA: UserRatingData = ratingDataJson as UserRatingData;
