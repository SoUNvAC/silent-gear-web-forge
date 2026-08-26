/**
 * Calculation Engine —— 统一出口
 * 只回答「真实属性是多少」；与 Rating Engine / Optimizer 完全分离。
 */
export { GearCalcEngine, CalcError } from './engine.js';
export type { GearAssembly, SlotAssignment, MaterialChoice, CalcConfig, GearStats } from './engine.js';
export { computeProperty } from './compute.js';
export { compressModifiers, weightedAverage, getModifierWeight, getPrimaryMod } from './compress.js';
export { computeTraitBonus, BONUS_PROPERTIES } from './bonus.js';
export type { BonusPropertyConfig, TraitBonusProperties } from './bonus.js';
export { applyGrade, applyStarcharged, applyCrude, applyPercentModifier, GRADE_BONUS_PERCENT } from './modifier.js';
export type { GradeLevel } from './modifier.js';
export { propertyDef, PROPERTY_DEFS } from './propertyDefs.js';
export type { PropertyDef } from './propertyDefs.js';
export { parsePropertyKey, mostSpecificStatKey, gearTypeAncestorChain } from './propertyKey.js';
export { aggregateTraits } from './traits.js';
export type { AggregatedTrait, SourceTrait } from './traits.js';
export { computeSynergy, applySynergy, baseSynergyCurve, SYNERGY_TRAIT_EFFECTS } from './synergy.js';
export type { SynergyMaterial, SynergyTraitLevel } from './synergy.js';
export { evaluateTraitConditions } from './trait-conditions.js';
export type { TraitConditionContext } from './trait-conditions.js';
