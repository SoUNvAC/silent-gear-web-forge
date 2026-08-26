/**
 * Optimizer —— 编排器（门面）
 *
 * 流水线：候选生成（Data）→ 属性计算（Calc）→ 评级（Rating）→ 选择 top/front。
 * 只做编排与选择，不复制任何评分/计算逻辑；calc/rating 全部复用，一字不改。
 *
 * v1（用户确认，2026-08-18）：只搜材质（每槽 1 材料），grade/charge 为固定配置
 * （默认 'NONE' / 0 不充能）。槽范围 = requiredParts，addon 与复合材质不枚举。
 *
 * 确定性锚点：候选序 = requiredParts 固定序 + 槽内材质码点升序；评分端稳定 sort
 * （平分保持 index 升序）→ 相同输入 → 相同输出。
 */
import { readFileSync } from 'node:fs';
import { GearCalcEngine } from '../calc/index.js';
import { RatingEngine } from '../rating/engine.js';
import type { DataRepository } from '../data/repository.js';
import type { RatingMode } from '../rating/types.js';
import { DEFAULT_MAX_CANDIDATES, generateCandidates } from './generator.js';
import type { GenerateOptions } from './generator.js';
import { OptimizerError } from './types.js';
import type { OptimizeOptions, OptimizeResult, OptBuild } from './types.js';

export interface OptimizerDeps {
  repo: DataRepository;
  /** 缺省 new GearCalcEngine(repo, loadDefaultTraitMaxLevels()) */
  calc?: GearCalcEngine;
  /** 缺省 new RatingEngine(repo)（profile 从 data/rating_data.json 加载） */
  rating?: RatingEngine;
}

/** 从 src/data/trait-max-levels.json 读默认 trait 上限（Node 端，仿 calc/rating 测试先例） */
function loadDefaultTraitMaxLevels(): Record<string, number> {
  const raw = JSON.parse(readFileSync('src/data/trait-max-levels.json', 'utf8')) as { maxLevels: Record<string, number> };
  return raw.maxLevels;
}

export class GearOptimizer {
  private readonly repo: DataRepository;
  private readonly calc: GearCalcEngine;
  private readonly rating: RatingEngine;

  constructor(deps: OptimizerDeps) {
    this.repo = deps.repo;
    this.calc = deps.calc ?? new GearCalcEngine(deps.repo, loadDefaultTraitMaxLevels());
    this.rating = deps.rating ?? new RatingEngine(deps.repo);
  }

  optimize(gearTypeId: string, mode: RatingMode, options: OptimizeOptions = {}): OptimizeResult {
    const genOpts: GenerateOptions = {
      materialPool: options.materialPool,
      grade: options.grade,
      maxCandidates: options.maxCandidates ?? DEFAULT_MAX_CANDIDATES,
    };
    const generated = generateCandidates(this.repo, gearTypeId, genOpts);
    if (generated.length === 0) throw new OptimizerError('候选集为空');

    // 每必填槽材质数（从实际生成的候选集反推，与池收窄一致；UI 展示用）
    const slotCounts: Record<string, number> = {};
    if (generated.length > 0) {
      const first = generated[0]!;
      for (let i = 0; i < first.slots.length; i++) {
        const seen = new Set<string>();
        for (const a of generated) seen.add(a.slots[i]!.materials[0]!.id);
        slotCounts[first.slots[i]!.slot] = seen.size;
      }
    }

    // Calc：全量计算（保持候选序；CalcError 直接透传 = 数据 bug 显式暴露）
    const config = { chargeLevel: options.chargeLevel ?? 0, damageRatio: options.damageRatio ?? 1 };
    const stats = generated.map((a) => this.calc.computeGearStats(a, config));

    // Rating：群体相对评分（RatingError 原样透传不包装——消息已自解释）
    const outcome = this.rating.evaluate(stats, mode, options.profile ?? null);

    // 选择 top-N / 非支配前沿
    const rankedMode = mode === 'weighted' || mode === 'lexicographic';
    const topN = options.topN ?? 10;
    const indices = rankedMode
      ? outcome.ranked!.slice(0, topN > 0 ? topN : undefined)
      : outcome.nonDominated!;
    const truncated = rankedMode && topN > 0 && indices.length < outcome.ranked!.length;

    const builds: OptBuild[] = indices.map((idx, position) => {
      const r = outcome.builds[idx]!;
      return {
        index: idx,
        assembly: generated[idx]!,
        stats: r.stats,
        scores: r.scores,
        missing: r.missing,
        total: r.total,
        rank: rankedMode ? position + 1 : null,
      };
    });

    const result: OptimizeResult = {
      gearType: gearTypeId,
      mode,
      profile: outcome.profile,
      candidateCount: generated.length,
      slotCounts,
      builds,
      truncated,
    };
    if (rankedMode) result.ranked = outcome.ranked;
    else result.nonDominated = outcome.nonDominated;
    if (options.keepFullOutcome) result.fullOutcome = outcome;
    return result;
  }
}
