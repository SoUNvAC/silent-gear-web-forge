/**
 * 引擎上下文 —— main.ts 构造后注入，组件从这里取 repo/calc/rating/optimizer/assets
 */
import type { DataRepository } from '../../src/data/repository.js';
import type { GearCalcEngine } from '../../src/calc/index.js';
import type { RatingEngine } from '../../src/rating/index.js';
import type { GearOptimizer } from '../../src/optimizer/index.js';
import type { AssetRegistry } from './assets/registry.js';

export let repo!: DataRepository;
export let calc!: GearCalcEngine;
export let rating!: RatingEngine;
export let optimizer!: GearOptimizer;
export let assets!: AssetRegistry;

export function initContext(
  r: DataRepository,
  c: GearCalcEngine,
  rt: RatingEngine,
  o: GearOptimizer,
  a: AssetRegistry,
): void {
  repo = r;
  calc = c;
  rating = rt;
  optimizer = o;
  assets = a;
}
