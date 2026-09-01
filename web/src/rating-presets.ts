import type { DataRepository } from '../../src/data/repository.js';
import { GEAR_PROPERTY_GROUP_STATS } from '../../src/data/types.js';
import type { GearTypeDef } from '../../src/data/types.js';
import type { PropertyCriterion, RatingProfile } from '../../src/rating/index.js';

export type RatingPresetId = 'balanced' | 'durability' | 'mining' | 'damage' | 'armor';

export interface RatingPresetDefinition {
  id: RatingPresetId;
  label: string;
  description: string;
}

export const RATING_PRESETS: readonly RatingPresetDefinition[] = [
  { id: 'balanced', label: '综合推荐', description: '沿用该装备的默认综合权重' },
  { id: 'durability', label: '高耐久', description: '耐久严格优先，其他属性不改变排名' },
  { id: 'mining', label: '高挖掘', description: '挖掘速度严格优先' },
  { id: 'damage', label: '高伤害', description: '武器伤害严格优先' },
  { id: 'armor', label: '高护甲', description: '护甲值严格优先' },
] as const;

export function ratingPresetLabel(id: RatingPresetId): string {
  return RATING_PRESETS.find((preset) => preset.id === id)?.label ?? '综合推荐';
}

export function isFocusedRatingProfile(profile: RatingProfile | null | undefined): boolean {
  return profile?.id.startsWith('preset:') ?? false;
}

export function availableRatingPresets(repo: DataRepository, gearTypeId: string): RatingPresetDefinition[] {
  const gearType = repo.getGearType(gearTypeId);
  if (!gearType) return RATING_PRESETS.filter((preset) => preset.id === 'balanced');

  return RATING_PRESETS.filter((preset) => {
    if (preset.id === 'balanced') return true;
    if (preset.id === 'durability') return gearType.durabilityStat !== null;
    if (preset.id === 'mining') return repo.gearTypeMatches(gearTypeId, 'silentgear:harvest_tool');
    if (preset.id === 'damage') return repo.gearTypeMatches(gearTypeId, 'silentgear:weapon');
    return repo.gearTypeMatches(gearTypeId, 'silentgear:armor');
  });
}

function availableStats(gearType: GearTypeDef): Set<string> {
  return new Set(gearType.propertyGroups.flatMap((group) => GEAR_PROPERTY_GROUP_STATS[group]));
}

function targetWeights(gearType: GearTypeDef, preset: RatingPresetId): Map<string, number> {
  if (preset === 'durability') {
    return new Map([[gearType.durabilityStat === 'ARMOR_DURABILITY' ? 'armor_durability' : 'durability', 1]]);
  }
  if (preset === 'mining') return new Map([['harvest_speed', 1]]);
  if (preset === 'armor') return new Map([['armor', 1]]);
  if (preset === 'damage') {
    const hasAttack = gearType.propertyGroups.includes('ATTACK');
    const hasProjectile = gearType.propertyGroups.includes('PROJECTILE');
    if (hasAttack && hasProjectile) return new Map([['attack_damage', 0.5], ['ranged_damage', 0.5]]);
    if (hasProjectile) return new Map([['ranged_damage', 1]]);
    return new Map([['attack_damage', 1]]);
  }
  return new Map();
}

function withPriorities(criteria: PropertyCriterion[]): PropertyCriterion[] {
  return [...criteria]
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
    .map((criterion, index) => ({ ...criterion, priority: index + 1 }));
}

/**
 * 聚焦预设把全部有效权重交给目标属性。原 profile 的其余数值项以 0 权重保留，
 * 便于结果详情继续展示，但绝不会为了次要属性牺牲目标属性。
 */
export function buildRatingPresetProfile(
  repo: DataRepository,
  gearTypeId: string,
  preset: RatingPresetId,
  baseProfile: RatingProfile | null,
): RatingProfile | null {
  const gearType = repo.getGearType(gearTypeId);
  if (!gearType || !baseProfile) return baseProfile;
  if (preset === 'balanced' || !availableRatingPresets(repo, gearTypeId).some((item) => item.id === preset)) {
    return { ...baseProfile, criteria: baseProfile.criteria.map((criterion) => ({ ...criterion })) };
  }

  const allowed = availableStats(gearType);
  const targets = new Map([...targetWeights(gearType, preset)].filter(([property]) => allowed.has(property)));
  if (targets.size === 0) return { ...baseProfile, criteria: baseProfile.criteria.map((criterion) => ({ ...criterion })) };

  const targetTotal = [...targets.values()].reduce((sum, weight) => sum + weight, 0);
  const remainder = Math.max(0, 1 - targetTotal);
  const secondary = baseProfile.criteria.filter(
    (criterion) =>
      criterion.source !== 'trait' &&
      allowed.has(criterion.property) &&
      !targets.has(criterion.property) &&
      (criterion.weight ?? 1) > 0,
  );
  const secondaryTotal = secondary.reduce((sum, criterion) => sum + (criterion.weight ?? 1), 0);

  const criteria: PropertyCriterion[] = [...targets].map(([property, weight]) => ({
    property,
    source: property === 'harvest_tier' ? 'tier' : 'final',
    weight: secondaryTotal > 0 ? weight : weight / targetTotal,
  }));
  if (secondaryTotal > 0) {
    for (const criterion of secondary) {
      criteria.push({ ...criterion, weight: remainder * ((criterion.weight ?? 1) / secondaryTotal) });
    }
  }

  return {
    id: `preset:${preset}:${gearTypeId}`,
    matches: [gearTypeId],
    criteria: withPriorities(criteria),
  };
}

export function normalizedWeightSummary(profile: RatingProfile | null): { property: string; weight: number }[] {
  const numeric = (profile?.criteria ?? []).filter((criterion) => criterion.source !== 'trait' && (criterion.weight ?? 1) > 0);
  const total = numeric.reduce((sum, criterion) => sum + (criterion.weight ?? 1), 0);
  if (total === 0) return [];
  return numeric
    .map((criterion) => ({ property: criterion.property, weight: (criterion.weight ?? 1) / total }))
    .sort((a, b) => b.weight - a.weight);
}
