/**
 * Best Build 跨充能探索 —— UI 编排公开引擎 API（零引擎改动，不重写任何公式）
 *
 * 关键正确性问题：Rating 加权总分是「群体相对 min-max 归一化」（src/rating/score.ts），
 * 不同 charge 等级分别 evaluate 产生的总分不在同一群体内 → 不可跨组比较大小。
 * 本模块把「候选 × 每个 charge 等级」的 GearStats 全部塞进一次 evaluate —— 单一评分群体，
 * 总分跨 charge 直接可比 → 能直接揭示用户说的现象：
 * 「次材料高 charge value，charge III 之后反超优材料」（实测 axe 真实发生：
 * charge 0 最优 refined_obsidian+flint → charge 3 反超为 tyrian_steel+titanium）。
 *
 * 仅用公开引擎 API：generateCandidates（候选集）+ computeGearStats（真实属性）
 * + evaluate（群体评分）。计算量 ≈ 候选 × 等级数（pickaxe 全池 × 4 ≈ 3s，rAF 忙态遮蔽）。
 */
import { repo, calc, rating, optimizer } from './context.js';
import { generateCandidates, resolveSlotPart } from '../../src/optimizer/index.js';
import type { OptBuild, CandidateSlotView } from '../../src/optimizer/index.js';
import type { DataRepository } from '../../src/data/repository.js';
import type { GearTypeDef, PartTypeId } from '../../src/data/types.js';
import type { GradeLevel, GearStats, GearAssembly } from '../../src/calc/index.js';
import type { RatingProfile } from '../../src/rating/index.js';
import { addonSlotViews } from './selection.js';
import { isOwned } from './owned.js';

/** 充能等级（Silent Gear 0..3；charge III 反超现象在 Lv.3 出现） */
export const CHARGE_LEVELS = [0, 1, 2, 3] as const;

/** 带充能等级的 Build（跨充能队列用；在 OptBuild 基础上加 chargeLevel） */
export interface ChargeBuild extends OptBuild {
  chargeLevel: number;
}

export interface AcrossChargesResult {
  builds: ChargeBuild[];
  profile: RatingProfile | null;
}

/**
 * 拥有权白名单池：每槽只留「已拥有」材质（视觉层 owned.ts → 搜索层）。
 * 槽位池为空 = 显式传空数组 → generateCandidates 报「无可用材质」（用户全点灭该槽的诚实错误）。
 */
export function ownedMaterialPool(
  repo: DataRepository,
  gearType: GearTypeDef,
  slots: readonly PartTypeId[],
): Partial<Record<PartTypeId, string[]>> {
  const pool: Partial<Record<PartTypeId, string[]>> = {};
  for (const slot of slots) {
    const ids = repo
      .materialsByPartType(slot)
      .filter((m) => repo.materialAllowedForGear(m, gearType.id) && isOwned(m.id))
      .map((m) => m.id)
      .sort(); // 码点升序，与 generator 确定性序一致
    pool[slot] = ids;
  }
  return pool;
}

/**
 * 跨 charge 最优队列：候选集一次生成 → 每候选 × 每 charge 各算一份 GearStats
 * → 单一群体 evaluate → 全局 ranked 前 topN（rank 1..N 按全局名次）。
 */
export function bestAcrossCharges(
  gearType: GearTypeDef,
  grade: GradeLevel,
  damageRatio: number,
  topN: number,
  chargeLevels: readonly number[] = CHARGE_LEVELS,
  materialPool?: Partial<Record<PartTypeId, string[]>>,
): AcrossChargesResult {
  const assemblies = generateCandidates(repo, gearType.id, { grade, materialPool });
  if (assemblies.length === 0) throw new Error('候选集为空');

  const allStats: GearStats[] = [];
  const meta: { assembly: (typeof assemblies)[number]; chargeLevel: number }[] = [];
  for (const lv of chargeLevels) {
    for (const a of assemblies) {
      allStats.push(calc.computeGearStats(a, { chargeLevel: lv, damageRatio }));
      meta.push({ assembly: a, chargeLevel: lv });
    }
  }

  const outcome = rating.evaluate(allStats, 'weighted');
  const ranked = outcome.ranked ?? [];
  const builds: ChargeBuild[] = ranked.slice(0, topN).map((idx, position) => {
    const r = outcome.builds[idx]!;
    const m = meta[idx]!;
    return {
      index: idx,
      assembly: m.assembly,
      stats: r.stats,
      scores: r.scores,
      missing: r.missing,
      total: r.total,
      rank: position + 1,
      chargeLevel: m.chargeLevel,
    };
  });
  return { builds, profile: outcome.profile };
}

/**
 * 附属全组合 × 核心 Top-K —— 「考虑附属加成」勾选框驱动（attachable-parts-reference.md §6）。
 *
 * 搜索策略（与 plan 一致：核心 Top-K + 附属全组合）：
 *   1. 每附属槽恰选 1 种材质（勾选框语义即「考虑附属加成」，不含空槽）→ 笛卡尔积 = 附属组合；
 *   2. 核心 Top-K：每 charge 先用 optimizer.optimize（只搜 requiredParts）取前 K 个核心 Build；
 *   3. 每核心 × 每附属组合 → 完整装配 computeGearStats（附属材质同样吃 grade/充能，§2.2）；
 *   4. 全部塞进一次 rating.evaluate —— 单一评分群体，总分跨 charge 直接可比（与 bestAcrossCharges 同口径）。
 *
 * 预算护栏：核心 Top-K 动态收窄，保证 核心 × 组合 × charge ≤ ADDONS_CANDIDATE_BUDGET，
 * 防浏览器挂死（pickaxe 组合 20×6×4×4=1920，全 4 charge 下 K 自动降到 3）。
 */
export const ADDONS_CANDIDATE_BUDGET = 30_000;
export const ADDONS_CORE_MAX = 12;

/**
 * 复合搜索预算：单个必填槽恰好 2 材料对后，全部复合装配候选数 ≤ 该值。
 * 注：预算按「复合装配数」计（非 × chargeCount）——charge 倍数计入总 stats 估算
 * （plan 内 90k stats 估算的前提就是 pickaxe 13k 复合装配不触发收缩）。
 */
export const COMPOUND_CANDIDATE_BUDGET = 30_000;
/** 复合材质集来源：单材 ranked 前 K 个 build 覆盖的每槽 distinct 材质 */
export const COMPOUND_SET_SOURCE_K = 12;

/** 每必填槽的复合候选材质集（rank 升序去重，首现序 = 越高 rank 越靠前） */
export interface CompoundSlotSet {
  slot: PartTypeId;
  set: string[];
}

/** 附属槽笛卡尔积：每槽恰选 1 种材质，返回组合列表（每个组合 = 若干附加槽位） */
function addonCombinations(views: CandidateSlotView[], grade: GradeLevel): GearAssembly['slots'][] {
  let combos: GearAssembly['slots'][] = [[]];
  for (const v of views) {
    const next: GearAssembly['slots'][] = [];
    for (const prefix of combos) {
      for (const m of v.materials) {
        next.push([...prefix, { slot: v.slot, part: v.part.id, materials: [{ id: m.id, ...(grade !== 'NONE' ? { grade } : {}) }] }]);
      }
    }
    combos = next;
  }
  return combos;
}

/** 核心 Top-K：使 核心 × 组合 × charge ≤ 预算；K ≥ 1 */
function addonCoreK(combos: number, chargeCount: number): number {
  return Math.max(1, Math.min(ADDONS_CORE_MAX, Math.floor(ADDONS_CANDIDATE_BUDGET / (combos * chargeCount))));
}

/** 附属组合（每槽恰 1 材质，按拥有权收窄；整槽全未拥有 → 去掉该附属槽）——从 bestWithAddons 提取，行为不变 */
export function ownedAddonCombos(
  gearType: GearTypeDef,
  materialPool: Partial<Record<PartTypeId, string[]>> | undefined,
  grade: GradeLevel,
): GearAssembly['slots'][] {
  let addonSlots = addonSlotViews(repo, gearType);
  if (materialPool) {
    addonSlots = addonSlots
      .map((v) => ({ ...v, materials: v.materials.filter((m) => materialPool[v.slot]?.includes(m.id)) }))
      .filter((v) => v.materials.length > 0);
  }
  return addonCombinations(addonSlots, grade);
}

/**
 * 核心 × 附属组合 × charge → 单一评分群体 → topN（从 bestWithAddons 提取的共享尾段）。
 * 迭代序保持 charge-major（与旧行为一致）。
 */
export function attachAddonsToCores(
  gearType: GearTypeDef,
  grade: GradeLevel,
  damageRatio: number,
  cores: { assembly: GearAssembly; chargeLevel: number }[],
  combos: GearAssembly['slots'][],
  topN: number,
): AcrossChargesResult {
  const allStats: GearStats[] = [];
  const meta: { assembly: GearAssembly; chargeLevel: number }[] = [];
  const lvs = [...new Set(cores.map((c) => c.chargeLevel))].sort((a, b) => a - b);
  for (const lv of lvs) {
    for (const core of cores) {
      if (core.chargeLevel !== lv) continue;
      for (const addon of combos) {
        const assembly: GearAssembly = { gearType: gearType.id, slots: [...core.assembly.slots, ...addon] };
        allStats.push(calc.computeGearStats(assembly, { chargeLevel: lv, damageRatio }));
        meta.push({ assembly, chargeLevel: lv });
      }
    }
  }
  if (allStats.length === 0) throw new Error('附属组合为空');

  const outcome = rating.evaluate(allStats, 'weighted');
  const ranked = outcome.ranked ?? [];
  const builds: ChargeBuild[] = ranked.slice(0, topN).map((idx, position) => {
    const r = outcome.builds[idx]!;
    const m = meta[idx]!;
    return {
      index: idx,
      assembly: m.assembly,
      stats: r.stats,
      scores: r.scores,
      missing: r.missing,
      total: r.total,
      rank: position + 1,
      chargeLevel: m.chargeLevel,
    };
  });
  return { builds, profile: outcome.profile };
}

export function bestWithAddons(
  gearType: GearTypeDef,
  grade: GradeLevel,
  damageRatio: number,
  topN: number,
  chargeLevels: readonly number[] = CHARGE_LEVELS,
  materialPool?: Partial<Record<PartTypeId, string[]>>,
): AcrossChargesResult {
  const combos = ownedAddonCombos(gearType, materialPool, grade);
  const coreK = addonCoreK(combos.length, chargeLevels.length);

  const cores: { assembly: GearAssembly; chargeLevel: number }[] = [];
  for (const lv of chargeLevels) {
    const core = optimizer.optimize(gearType.id, 'weighted', { topN: coreK, grade, chargeLevel: lv, damageRatio, materialPool });
    for (const b of core.builds) cores.push({ assembly: b.assembly, chargeLevel: lv });
  }
  if (cores.length === 0) throw new Error('核心候选为空');
  return attachAddonsToCores(gearType, grade, damageRatio, cores, combos, topN);
}

// ---------------------------------------------------------------------------
// 复合材质（synergy）搜索 —— v1「顶级材质集内精确复合」（用户确认策略）
// 只搜单材 ranked 前 K 个 build 覆盖的每槽材质集内的 2 材料对；恰一个必填槽复合，
// 其余槽单材 from pools。全池精确复合不可行（pickaxe main C(113,2)=6,328 对）。
// ---------------------------------------------------------------------------

/** 必填槽全量允许池（黑名单过滤 + 码点升序，materialPool 缺省回退用） */
function fullPools(repo: DataRepository, gearType: GearTypeDef): Partial<Record<PartTypeId, string[]>> {
  const pools: Partial<Record<PartTypeId, string[]>> = {};
  for (const slot of gearType.requiredParts) {
    pools[slot] = repo
      .materialsByPartType(slot)
      .filter((m) => repo.materialAllowedForGear(m, gearType.id))
      .map((m) => m.id)
      .sort();
  }
  return pools;
}

/** 每必填槽的顶级材质集：按 build rank 升序首现去重（rank 越高越靠前） */
export function perSlotTopSets(
  gearType: GearTypeDef,
  topBuilds: { assembly: GearAssembly }[],
): CompoundSlotSet[] {
  const sets: CompoundSlotSet[] = [];
  for (const slot of gearType.requiredParts) {
    const seen: string[] = [];
    for (const b of topBuilds) {
      const mc = b.assembly.slots.find((s) => s.slot === slot)?.materials[0];
      if (mc && !seen.includes(mc.id)) seen.push(mc.id);
    }
    sets.push({ slot, set: seen });
  }
  return sets;
}

/** 复合候选总数：Σ_s C(|set_s|,2) × Π_{t≠s} |pool_t|（恰一个槽复合的装配数） */
export function compoundTotal(
  gearType: GearTypeDef,
  sets: CompoundSlotSet[],
  pools: Partial<Record<PartTypeId, string[]>>,
): number {
  const poolSizes = gearType.requiredParts.map((slot) => (pools[slot] ?? []).length);
  let total = 0;
  for (let i = 0; i < gearType.requiredParts.length; i++) {
    const k = sets[i]!.set.length;
    const pairs = (k * (k - 1)) / 2;
    if (pairs === 0) continue;
    const rest = poolSizes.reduce((acc, n, j) => (j === i ? acc : acc * n), 1);
    total += pairs * rest;
  }
  return total;
}

/**
 * 预算收缩：compoundTotal > COMPOUND_CANDIDATE_BUDGET 时确定性收缩最大集
 * （pop 末位 = 最低 rank 材质，>2 才 pop；等大取 requiredParts 靠前者）。
 * 仍超 → 抛诚实错误（病理池，v1 不做更精细收缩）。
 */
export function shrinkCompoundSets(
  gearType: GearTypeDef,
  sets: CompoundSlotSet[],
  pools: Partial<Record<PartTypeId, string[]>>,
): CompoundSlotSet[] {
  const result: CompoundSlotSet[] = sets.map((s) => ({ slot: s.slot, set: [...s.set] }));
  while (compoundTotal(gearType, result, pools) > COMPOUND_CANDIDATE_BUDGET) {
    const maxIdx = result.reduce((best, s, i, arr) => (s.set.length > arr[best]!.set.length ? i : best), 0);
    const target = result[maxIdx]!;
    if (target.set.length <= 2) throw new Error('复合搜索超预算且无法收缩（材质集均 ≤2），请收窄 materialPool');
    target.set.pop();
  }
  return result;
}

/**
 * 复合装配生成：恰一个必填槽为 2 材料无序对（set 序 i<j，主材 = 较高 rank 的 set[i]），
 * 其余槽单材 from pools。确定性序：复合槽按 requiredParts 序 → 对内按 set 序 → 其余槽交叉按 pool 序。
 */
export function generateCompoundAssemblies(
  gearType: GearTypeDef,
  sets: CompoundSlotSet[],
  pools: Partial<Record<PartTypeId, string[]>>,
  grade: GradeLevel,
): GearAssembly[] {
  const slots = gearType.requiredParts;
  const gradeOpt = grade !== 'NONE' ? { grade } : {};
  const parts = slots.map((slot) => resolveSlotPart(repo, gearType, slot));
  const out: GearAssembly[] = [];

  for (let ci = 0; ci < slots.length; ci++) {
    const compoundSlot = slots[ci]!;
    const set = sets[ci]!.set;
    const others = slots.filter((_, si) => si !== ci).map((slot) => ({ slot, pool: pools[slot] ?? [] }));

    for (let i = 0; i < set.length; i++) {
      for (let j = i + 1; j < set.length; j++) {
        // 其余槽交叉按 pool 序（与 generator 同确定性序：槽序 → 每槽池序）
        let combos: { slot: PartTypeId; materialId: string }[][] = [[]];
        for (const o of others) {
          const next: { slot: PartTypeId; materialId: string }[][] = [];
          for (const prefix of combos) {
            for (const materialId of o.pool) next.push([...prefix, { slot: o.slot, materialId }]);
          }
          combos = next;
        }
        for (const combo of combos) {
          const assignments: GearAssembly['slots'] = [];
          for (let si = 0; si < slots.length; si++) {
            if (si === ci) {
              assignments.push({
                slot: compoundSlot,
                part: parts[ci]!.id,
                materials: [{ id: set[i]!, ...gradeOpt }, { id: set[j]!, ...gradeOpt }],
              });
            } else {
              const o = combo.find((c) => c.slot === slots[si])!;
              assignments.push({ slot: slots[si]!, part: parts[si]!.id, materials: [{ id: o.materialId, ...gradeOpt }] });
            }
          }
          out.push({ gearType: gearType.id, slots: assignments });
        }
      }
    }
  }
  return out;
}

/**
 * 复合材质 + 附属跨充能探索 ——「考虑复合材质（synergy）」勾选框驱动。
 *
 * 流程（plan §3）：
 *   1. 单材基线：generateCandidates → ×charges → 单一 evaluate（这份 stats 同时供
 *      顶级材质集提取和最终群体，不重复计算）；
 *   2. sets = perSlotTopSets(ranked 前 K)；pools = 每必填槽 owned/full 池；
 *      shrinkCompoundSets 预算收缩；
 *   3. generateCompoundAssemblies（恰一个必填槽为 2 材料对）；
 *   4. 最终单一评分群体 = 单材 stats ∪ 复合 stats（跨 charges）→ evaluate；
 *   5. addons=true：ownedAddonCombos + addonCoreK → 取 ranked 前 coreK 个 core
 *      → attachAddonsToCores（共享尾段）。
 */
export function bestWithCompound(
  gearType: GearTypeDef,
  grade: GradeLevel,
  damageRatio: number,
  topN: number,
  chargeLevels: readonly number[] = CHARGE_LEVELS,
  materialPool?: Partial<Record<PartTypeId, string[]>>,
  addons = false,
): AcrossChargesResult {
  const assemblies = generateCandidates(repo, gearType.id, { grade, materialPool });
  if (assemblies.length === 0) throw new Error('候选集为空');

  const allStats: GearStats[] = [];
  const meta: { assembly: GearAssembly; chargeLevel: number }[] = [];
  for (const lv of chargeLevels) {
    for (const a of assemblies) {
      allStats.push(calc.computeGearStats(a, { chargeLevel: lv, damageRatio }));
      meta.push({ assembly: a, chargeLevel: lv });
    }
  }
  const baseline = rating.evaluate(allStats, 'weighted');
  const ranked = baseline.ranked ?? [];

  // 顶级材质集 + 预算收缩
  const sets = perSlotTopSets(gearType, ranked.slice(0, COMPOUND_SET_SOURCE_K).map((idx) => ({ assembly: meta[idx]!.assembly })));
  const pools: Partial<Record<PartTypeId, string[]>> = {};
  for (const slot of gearType.requiredParts) pools[slot] = materialPool?.[slot] ?? fullPools(repo, gearType)[slot]!;
  const shrunk = shrinkCompoundSets(gearType, sets, pools);

  // 复合装配 × charges，追加进同一评分群体
  const compoundAssemblies = generateCompoundAssemblies(gearType, shrunk, pools, grade);
  const finalStats = [...allStats];
  const finalMeta = [...meta];
  for (const lv of chargeLevels) {
    for (const a of compoundAssemblies) {
      finalStats.push(calc.computeGearStats(a, { chargeLevel: lv, damageRatio }));
      finalMeta.push({ assembly: a, chargeLevel: lv });
    }
  }

  if (addons) {
    const combos = ownedAddonCombos(gearType, materialPool, grade);
    const coreK = addonCoreK(combos.length, chargeLevels.length);
    const outcome = rating.evaluate(finalStats, 'weighted');
    const cores = (outcome.ranked ?? []).slice(0, coreK).map((idx) => ({
      assembly: finalMeta[idx]!.assembly,
      chargeLevel: finalMeta[idx]!.chargeLevel,
    }));
    if (cores.length === 0) throw new Error('核心候选为空');
    return attachAddonsToCores(gearType, grade, damageRatio, cores, combos, topN);
  }

  const outcome = rating.evaluate(finalStats, 'weighted');
  const finalRanked = outcome.ranked ?? [];
  const builds: ChargeBuild[] = finalRanked.slice(0, topN).map((idx, position) => {
    const r = outcome.builds[idx]!;
    const m = finalMeta[idx]!;
    return {
      index: idx,
      assembly: m.assembly,
      stats: r.stats,
      scores: r.scores,
      missing: r.missing,
      total: r.total,
      rank: position + 1,
      chargeLevel: m.chargeLevel,
    };
  });
  return { builds, profile: outcome.profile };
}
