import { describe, expect, it } from 'vitest';
import { loadRatingProfiles, transformUserRatingData, validateProfiles, validateRatingProfiles } from './profiles.js';
import { RatingError } from './types.js';
import type { RatingProfile, RatingProfilesFile } from './types.js';

describe('loadRatingProfiles（用户 data/rating_data.json 转换）', () => {
  const profiles = loadRatingProfiles();
  const byId = new Map(profiles.map((p) => [p.id, p]));

  it('产出 13 具体装备 + 4 家族 + 1 default = 18 个 profile，id 唯一', () => {
    expect(profiles.length).toBe(18);
    expect(new Set(profiles.map((p) => p.id)).size).toBe(18);
  });

  it('sword：权重降序 → priority；traits 为恒 0 分来源', () => {
    const sword = byId.get('sword')!;
    expect(sword.matches).toEqual(['silentgear:sword']);
    expect(sword.criteria.map((c) => c.property)).toEqual(['attack_damage', 'attack_speed', 'durability', 'attack_reach', 'traits']);
    expect(sword.criteria[0]).toMatchObject({ property: 'attack_damage', weight: 0.45, priority: 1 });
    expect(sword.criteria[3]).toMatchObject({ property: 'attack_reach', weight: 0.05, priority: 4 });
    expect(sword.criteria[4]).toMatchObject({ property: 'traits', weight: 0.05, priority: 5, source: 'trait' });
  });

  it('pickaxe：mining_speed→harvest_speed、harvest_level→harvest_tier(tier 源)', () => {
    const pickaxe = byId.get('pickaxe')!;
    expect(pickaxe.criteria[0]).toMatchObject({ property: 'harvest_speed', weight: 0.45, priority: 1 });
    expect(pickaxe.criteria[1]).toMatchObject({ property: 'harvest_tier', weight: 0.25, priority: 2, source: 'tier' });
    expect(pickaxe.criteria[2]).toMatchObject({ property: 'durability', weight: 0.2, priority: 3 });
    expect(pickaxe.criteria[3]).toMatchObject({ property: 'traits', weight: 0.1, priority: 4, source: 'trait' });
  });

  it('bow：attack_speed→draw_speed；projectile_range 被剔除', () => {
    const bow = byId.get('bow')!;
    expect(bow.criteria.map((c) => c.property)).toEqual(['ranged_damage', 'draw_speed', 'durability', 'traits']);
    expect(bow.criteria[1]).toMatchObject({ property: 'draw_speed', weight: 0.25, priority: 2 });
    expect(bow.criteria.every((c) => c.property !== 'projectile_range' && c.property !== 'attack_speed')).toBe(true);
  });

  it('hammer：range_efficiency 被剔除（用户决策）', () => {
    const hammer = byId.get('hammer')!;
    expect(hammer.criteria.map((c) => c.property)).toEqual(['harvest_speed', 'harvest_tier', 'durability', 'traits']);
    expect(hammer.criteria.every((c) => c.property !== 'range_efficiency')).toBe(true);
  });

  it('家族兜底（harvest_tool）= 该族已给装备权重平均', () => {
    const ht = byId.get('harvest_tool')!;
    expect(ht.matches).toEqual(['silentgear:harvest_tool']);
    const harvestSpeed = ht.criteria.find((c) => c.property === 'harvest_speed');
    // (0.15+0.45+0.45+0.35+0.35+0.30)/6
    expect(harvestSpeed?.weight).toBeCloseTo(2.05 / 6, 8);
    expect(harvestSpeed?.priority).toBe(1);
  });

  it('default = 全部平均，匹配 silentgear:all，criteria 非空', () => {
    const def = byId.get('default')!;
    expect(def.matches).toEqual(['silentgear:all']);
    expect(def.criteria.length).toBeGreaterThan(0);
  });

  it('未知属性名 → 抛错（暴露笔误而非静默丢权重）', () => {
    expect(() => transformUserRatingData({ sword: { attack_damage: 0.5, speed_of_justice: 0.5 } })).toThrow(/未知属性名/);
  });
  it('权重表不是对象 → 抛错', () => {
    expect(() => transformUserRatingData({ sword: [] as unknown as Record<string, number> })).toThrow(/权重表/);
  });
});

describe('validateRatingProfiles / validateProfiles', () => {
  const goodProfile: RatingProfile = { id: 'p', matches: ['silentgear:all'], criteria: [{ property: 'durability' }] };
  const file: RatingProfilesFile = { version: 1, source: 'test', profiles: [goodProfile] };

  it('合法输入原样返回', () => {
    expect(validateRatingProfiles(file)).toEqual([goodProfile]);
  });

  it('version 非数字 → 抛错', () => {
    expect(() => validateRatingProfiles({ ...file, version: 'x' as unknown as number })).toThrow(RatingError);
  });

  it('profile id 重复 → 抛错', () => {
    expect(() => validateProfiles([goodProfile, goodProfile])).toThrow(/重复/);
  });

  it('matches 为空 → 抛错', () => {
    const p: RatingProfile = { id: 'p', matches: [], criteria: [{ property: 'durability' }] };
    expect(() => validateProfiles([p])).toThrow(/matches/);
  });

  it('criteria（source,property）重复 → 抛错', () => {
    const p: RatingProfile = {
      id: 'p',
      matches: ['silentgear:all'],
      criteria: [
        { property: 'durability' },
        { property: 'durability' },
      ],
    };
    expect(() => validateProfiles([p])).toThrow(/重复/);
  });
});
