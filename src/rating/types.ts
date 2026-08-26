/**
 * Rating Engine —— 核心类型
 *
 * 回答「对当前目标多好」，与 Calculation Engine 完全分离：
 *   Calc 输出 GearStats（真实属性）→ Rating 对候选 Build 集合做相对评分。
 * 评级必须支持 Weighted / Lexicographic / Pareto 三种模式（dev-principle #6），
 * 不同 Tool Type 用不同默认评价档案（RatingProfile）。
 */
import type { GearStats } from '../calc/engine.js';

export class RatingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RatingError';
  }
}

/** 评价模式 */
export type RatingMode = 'weighted' | 'lexicographic' | 'pareto';

/** 属性方向（本属性集几乎全为越高越好，默认 higher） */
export type ScoreDirection = 'higher' | 'lower';

/** 数值来源：final（默认，GearStats.final 键）/ tier（harvest_tier 等级，extras）/ trait（恒 0 分占位） */
export type CriterionSource = 'final' | 'tier' | 'trait';

/** 单个评价标准（criterion） */
export interface PropertyCriterion {
  /** 属性名（GearStats.final 的键，如 'harvest_speed'；source='tier' 时为 'harvest_tier'） */
  property: string;
  /** 方向；默认 higher */
  direction?: ScoreDirection;
  /** Weighted 模式权重；默认 1 */
  weight?: number;
  /** Lexicographic 优先级，1 = 最优先；未给则按 criteria 数组序 */
  priority?: number;
  /**
   * 数值来源（默认 final）：
   *   final —— stats.final[property]
   *   tier  —— stats.extras.harvest_tier.level_hint 数值化（挖掘等级）
   *   trait —— 恒 0 分（不同 trait 不可量化，Q3 决策），权重计入但不贡献分数
   */
  source?: CriterionSource;
}

/**
 * 单个 Tool Type 的评价档案（数据源 src/data/rating-profiles.json）。
 * matches 用命名空间 id（如 'silentgear:harvest_tool'），沿父链判定归属（repo.gearTypeMatches）；
 * 文件序 = 特异性优先，取第一个命中。
 */
export interface RatingProfile {
  id: string;
  /** 适用 gear type id 或祖先 id；非空 */
  matches: string[];
  /** 评价标准列表；空 = 该类型无可评属性（如 curio 仅 SPECIAL 组，trait 计分恒 0） */
  criteria: PropertyCriterion[];
  /** trait 价值表：不同 trait 不可量化 → 恒 0，不参与评分（TODO：等可量化数据） */
  traitCriteria?: null;
}

/** rating-profiles.json 的根结构 */
export interface RatingProfilesFile {
  version: number;
  source: string;
  profiles: RatingProfile[];
}

/** 群体相对评分后的单个候选（scores 是 0..1 相对分，非原始属性值） */
export interface ScoredBuild {
  /** 输入 builds 中的位置 */
  index: number;
  stats: GearStats;
  /** 0..1 分，键 = criterion property；缺失属性不出现在这里 */
  scores: Record<string, number>;
  /** 该 build 缺失的 criterion 属性（未计分） */
  missing: string[];
}

/** 单次评价的输出（builds 与输入对齐，index 指回输入位置） */
export interface RatedBuild extends ScoredBuild {
  /** Weighted 模式总分（0..1）；其余模式为 0（不使用） */
  total: number;
}

export interface RatingOutcome {
  mode: RatingMode;
  /** 命中的 profile（可能为 null：调用方显式传 profile 时也可能为 null 之外的解析结果） */
  profile: RatingProfile | null;
  builds: RatedBuild[];
  /** Weighted / Lexicographic：最优 → 最差的下标排序 */
  ranked?: number[];
  /** Pareto：非支配前沿下标（未被任何候选支配） */
  nonDominated?: number[];
}
