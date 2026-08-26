/**
 * Rating Engine —— 编排器（门面）
 *
 * 输入：候选 Build 集合（GearStats，来自 Calc Engine）+ 评级模式。
 * 输出：RatingOutcome（per-build 相对分 + 模式专属的排序/前沿）。
 *
 * 群体相对评分 → 候选集合必须 ≥1 个 build；单 build 时所有属性无差异 → 分全 1（退化）。
 * Profile 解析：对 builds[0].gearType 沿父链取第一个命中（文件序 = 特异性优先）；
 * 候选集合应同为一种 gear type（不同类型混评时以第一个为准）。
 */
import type { GearStats } from '../calc/engine.js';
import { GEAR_PROPERTY_GROUP_STATS } from '../data/types.js';
import type { DataRepository } from '../data/repository.js';
import { loadRatingProfiles } from './profiles.js';
import { scoreBuilds } from './score.js';
import { weightedTotals } from './weighted.js';
import { lexicographicRank } from './lexicographic.js';
import { paretoFront } from './pareto.js';
import { RatingError } from './types.js';
import type { RatingMode, RatingOutcome, RatingProfile, RatedBuild } from './types.js';

export class RatingEngine {
  private readonly repo: DataRepository;
  private readonly profiles: RatingProfile[];

  /** profiles 缺省从 src/data/rating-profiles.json 加载；显式传 []/null 之外的值可注入（测试/内存 profile） */
  constructor(repo: DataRepository, profiles?: RatingProfile[] | null) {
    this.repo = repo;
    this.profiles = profiles ?? loadRatingProfiles();
  }

  /** 沿父链（含自身）展开命名空间 id 列表 */
  private ancestorChain(gearTypeId: string): string[] {
    const chain: string[] = [];
    const seen = new Set<string>();
    let cur = this.repo.getGearType(gearTypeId);
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      chain.push(cur.id);
      cur = cur.parent ? this.repo.getGearType(cur.parent) : undefined;
    }
    return chain;
  }

  /**
   * 解析最具体的匹配 profile：对每个 profile，取它任一 matches 在本类型祖先链中的
   * 最深位置（越靠自身越具体，all 最深 = 兜底）；取深度最小的 profile。
   * 深度相同时按文件序（稳定）。
   */
  resolveProfile(gearTypeId: string): RatingProfile | null {
    const chain = this.ancestorChain(gearTypeId);
    let best: { profile: RatingProfile; depth: number } | null = null;
    for (const p of this.profiles) {
      let depth = Infinity;
      for (const m of p.matches) {
        const d = chain.indexOf(m);
        if (d >= 0 && d < depth) depth = d;
      }
      if (depth !== Infinity && (best === null || depth < best.depth)) best = { profile: p, depth };
    }
    return best?.profile ?? null;
  }

  /**
   * 对候选集合评分。
   * profile 缺省用 builds[0].gearType 解析；也可显式传入覆盖。
   * 无可用 profile 或 criteria 为空（如 curio：无数值属性 + trait 计分恒 0）→ 抛 RatingError。
   */
  evaluate(builds: GearStats[], mode: RatingMode, profile?: RatingProfile | null): RatingOutcome {
    if (builds.length === 0) throw new RatingError('候选集合为空：无法对空集合评分');

    const gearType = builds[0]!.gearType;

    // gear type 无可评数值属性（如 curio 仅 SPECIAL 组：additive/traits）→ 明确报错而非假 0 分
    const gearDef = this.repo.getGearType(gearType);
    if (gearDef) {
      const numericProps = gearDef.propertyGroups
        .flatMap((g) => GEAR_PROPERTY_GROUP_STATS[g])
        .filter((p) => p !== 'additive' && p !== 'traits' && p !== 'harvest_tier');
      if (numericProps.length === 0) {
        throw new RatingError(`${gearType} 无数值属性可评（仅 additive/traits/harvest_tier），无法评分`);
      }
    }
    const resolved = profile ?? this.resolveProfile(gearType);
    const criteria = resolved?.criteria ?? [];
    if (criteria.length === 0) {
      const via = resolved ? `profile ${resolved.id}` : '无匹配 profile';
      throw new RatingError(`没有可用的评价标准：${gearType} → ${via} 的 criteria 为空（trait 计分恒 0，无数值属性可评）`);
    }

    const scored = scoreBuilds(builds, criteria);

    switch (mode) {
      case 'weighted': {
        const totals = weightedTotals(scored, criteria);
        const rated: RatedBuild[] = scored.map((s, i) => ({ ...s, total: totals[i]! }));
        const ranked = [...rated].sort((a, b) => b.total - a.total).map((r) => r.index);
        return { mode, profile: resolved, builds: rated, ranked };
      }
      case 'lexicographic': {
        const rated: RatedBuild[] = scored.map((s) => ({ ...s, total: 0 }));
        const ranked = lexicographicRank(scored, criteria);
        return { mode, profile: resolved, builds: rated, ranked };
      }
      case 'pareto': {
        const rated: RatedBuild[] = scored.map((s) => ({ ...s, total: 0 }));
        const nonDominated = paretoFront(scored, criteria);
        return { mode, profile: resolved, builds: rated, nonDominated };
      }
    }
  }
}
