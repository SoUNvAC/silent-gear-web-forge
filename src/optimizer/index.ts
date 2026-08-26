/**
 * Optimizer —— 统一出口
 * 只回答「哪些 Build 最优」（编排 calc/rating 选择 top/front）；与 Calculation / Rating Engine 完全分离。
 */
export { GearOptimizer } from './engine.js';
export type { OptimizerDeps } from './engine.js';
export { OptimizerError } from './types.js';
export type { OptimizeOptions, OptimizeResult, OptBuild } from './types.js';
export { generateCandidates, buildSlotViews, resolveSlotPart, DEFAULT_MAX_CANDIDATES } from './generator.js';
export type { GenerateOptions, CandidateSlotView } from './generator.js';
