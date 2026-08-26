/**
 * Rating Engine —— 统一出口
 * 只回答「对当前目标多好」（群体相对评分）；与 Calculation Engine / Optimizer 完全分离。
 */
export { RatingEngine } from './engine.js';
export { RatingError } from './types.js';
export type { RatingMode, RatingProfile, PropertyCriterion, ScoreDirection, RatedBuild, ScoredBuild, RatingOutcome, RatingProfilesFile } from './types.js';
export { loadRatingProfiles, transformUserRatingData, validateRatingProfiles, validateProfiles } from './profiles.js';
export type { UserRatingData } from './profiles.js';
export { scoreBuilds, scorePropertyValues } from './score.js';
export { weightedTotals } from './weighted.js';
export { compareScoredBuilds, lexicographicRank, orderedCriteria } from './lexicographic.js';
export { dominates, paretoFront } from './pareto.js';
