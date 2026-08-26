/**
 * Optimizer —— 核心类型
 *
 * 回答「哪些 Build 最优」，与 Calculation / Rating Engine 完全分离：
 *   Data 生成候选 → Calc 计算真实属性（GearStats）→ Rating 群体相对评分（三模式）
 *   → Optimizer 选择 top-N / 非支配前沿。
 *
 * v1 搜索范围（用户确认，2026-08-18）：
 *   1. 只搜材质维度（每槽 1 种材料），不搜复合（compound/synergy，v2 再议）；
 *   2. grade / charge 是固定配置，不是搜索维度（单调，枚举产生被支配的重复 Build）；
 *   3. 槽范围 = gear 的 requiredParts（addableSlots/addon 不枚举，空间 ×15,435 不可行）。
 */
import type { GearAssembly, GearStats } from '../calc/engine.js';
import type { GradeLevel } from '../calc/modifier.js';
import type { PartTypeId } from '../data/types.js';
import type { RatingMode, RatingOutcome, RatingProfile } from '../rating/types.js';

export class OptimizerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OptimizerError';
  }
}

/** 优化搜索配置（v1 只搜材质；grade/charge 为固定配置） */
export interface OptimizeOptions {
  /** 材质池按槽限制（键 = requiredParts 槽）；缺省该槽全量（黑名单过滤后） */
  materialPool?: Partial<Record<PartTypeId, string[]>>;
  /** 每材料 grade（固定，非搜索维度）；缺省 'NONE' */
  grade?: GradeLevel;
  /** 整件充能等级 0..3（固定）；缺省 0（不充能） */
  chargeLevel?: number;
  /** Pass2 damageRatio（固定）；缺省 1 */
  damageRatio?: number;
  /** weighted/lexicographic 返回条数；缺省 10；<=0 = 全量。pareto 忽略此字段。 */
  topN?: number;
  /** 显式 profile；缺省按 gearType 沿父链解析（RatingEngine.resolveProfile） */
  profile?: RatingProfile | null;
  /** 候选数硬上限；缺省 50_000，超出抛 OptimizerError（提示收窄 materialPool） */
  maxCandidates?: number;
  /** true 时结果附加完整 RatingOutcome（默认 false 省内存：全量 GearStats ~15MB @ 9,690 候选） */
  keepFullOutcome?: boolean;
}

/** 一条被选中的 Build（top-N / 非支配前沿） */
export interface OptBuild {
  /** 候选集位置（= RatingOutcome.builds[].index） */
  index: number;
  assembly: GearAssembly;
  stats: GearStats;
  /** 0..1 相对分，键 = criterion property */
  scores: Record<string, number>;
  /** 该 build 缺失的 criterion 属性（未计分） */
  missing: string[];
  /** Weighted 模式总分（0..1）；其余模式 0 */
  total: number;
  /** ranked 模式：全量候选中的名次 1..N；pareto 恒 null */
  rank: number | null;
}

export interface OptimizeResult {
  gearType: string;
  mode: RatingMode;
  /** 命中的 profile（null：显式传 profile 且为 null 等情形） */
  profile: RatingProfile | null;
  /** 候选集大小 */
  candidateCount: number;
  /** 每必填槽材质数（UI 展示候选池大小） */
  slotCounts: Record<PartTypeId, number>;
  /** 仅选中子集（top-N / 前沿），UI 直接渲染 */
  builds: OptBuild[];
  /** weighted/lexicographic：全量候选最优→最差下标（支持「你的 build 排 N/候选数」展示） */
  ranked?: number[];
  /** pareto：非支配前沿下标 */
  nonDominated?: number[];
  /** ranked 模式 topN < candidateCount 时为 true */
  truncated: boolean;
  /** keepFullOutcome=true 时附加的完整评分输出 */
  fullOutcome?: RatingOutcome;
}
