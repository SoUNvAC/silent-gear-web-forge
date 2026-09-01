import { beforeAll, describe, expect, it } from 'vitest';
import { loadDataFromDisk } from '../../src/data/loadDisk.js';
import { DataRepository } from '../../src/data/repository.js';
import { RatingEngine, transformUserRatingData } from '../../src/rating/index.js';
import { readFileSync } from 'node:fs';
import {
  availableRatingPresets,
  buildRatingPresetProfile,
  normalizedWeightSummary,
} from './rating-presets.js';

let repo: DataRepository;
let rating: RatingEngine;

beforeAll(() => {
  repo = new DataRepository(loadDataFromDisk({ dataDir: 'data', gearTypesJsonPath: 'src/data/gear-types.json' }));
  const ratingData = JSON.parse(readFileSync('data/rating_data.json', 'utf8'));
  rating = new RatingEngine(repo, transformUserRatingData(ratingData));
});

function ids(gearTypeId: string): string[] {
  return availableRatingPresets(repo, gearTypeId).map((preset) => preset.id);
}

function weights(gearTypeId: string, preset: Parameters<typeof buildRatingPresetProfile>[2]): Record<string, number> {
  const profile = buildRatingPresetProfile(repo, gearTypeId, preset, rating.resolveProfile(gearTypeId));
  return Object.fromEntries(normalizedWeightSummary(profile).map((item) => [item.property, item.weight]));
}

describe('推荐预设按装备家族开放', () => {
  it('采掘工具只有高挖掘，没有高伤害/高护甲', () => {
    expect(ids('silentgear:pickaxe')).toEqual(['balanced', 'durability', 'mining']);
  });

  it('武器只有高伤害；即使继承 tool 也不能出现高挖掘', () => {
    expect(ids('silentgear:sword')).toEqual(['balanced', 'durability', 'damage']);
    expect(ids('silentgear:bow')).toEqual(['balanced', 'durability', 'damage']);
  });

  it('护甲只有高护甲', () => {
    expect(ids('silentgear:helmet')).toEqual(['balanced', 'durability', 'armor']);
  });
});

describe('推荐预设生成显式权重 profile', () => {
  it('高挖掘把 100% 有效权重交给挖掘速度', () => {
    const w = weights('silentgear:pickaxe', 'mining');
    expect(w.harvest_speed).toBeCloseTo(1);
    expect(w.harvest_tier).toBeUndefined();
  });

  it('近战与远程武器使用各自伤害属性', () => {
    expect(weights('silentgear:sword', 'damage').attack_damage).toBeCloseTo(1);
    const bow = weights('silentgear:bow', 'damage');
    expect(bow.ranged_damage).toBeCloseTo(1);
    expect(bow.attack_damage).toBeUndefined();
  });

  it('护甲的高耐久与高护甲分别提升正确属性', () => {
    expect(weights('silentgear:helmet', 'durability').armor_durability).toBeCloseTo(1);
    expect(weights('silentgear:helmet', 'armor').armor).toBeCloseTo(1);
  });

  it('每份聚焦 profile 的数值权重归一为 1', () => {
    const total = normalizedWeightSummary(
      buildRatingPresetProfile(repo, 'silentgear:pickaxe', 'mining', rating.resolveProfile('silentgear:pickaxe')),
    ).reduce((sum, item) => sum + item.weight, 0);
    expect(total).toBeCloseTo(1);
  });
});
