/**
 * Optimizer —— 候选生成器（纯函数，Data 层只读）
 *
 * v1 搜索范围（用户确认）：只搜材质维度。
 *   - 槽范围 = gear.requiredParts（addableSlots/addon 不枚举 —— 实测空间 ×15,435 不可行，v2 再议）；
 *   - 每槽恰好 1 个部件（主槽 = gearType.mainPart，其余槽 = partsByPartType 中唯一 core part）；
 *   - 材质 = materialsByPartType 全量，黑名单（materialAllowedForGear）过滤 + materialPool 交集；
 *   - 槽内材质按 id 码点升序 → 确定性候选序（评分端稳定排序，平分保持 index 升序）。
 *
 * materialPool 校验、黑名单过滤、码点排序全部前置：computeGearStats 的 CalcError 仅作理论兜底，
 * 正常路径永不触发。
 */
import type { DataRepository } from '../data/repository.js';
import type { GearTypeDef, Material, Part, PartTypeId } from '../data/types.js';
import type { GearAssembly } from '../calc/engine.js';
import type { GradeLevel } from '../calc/modifier.js';
import { OptimizerError } from './types.js';

/** 候选数硬上限缺省值（防浏览器挂死；三槽类型如 bow ≈ 6.3 万，超出需收窄 materialPool） */
export const DEFAULT_MAX_CANDIDATES = 50_000;

export interface GenerateOptions {
  /** 材质池按槽限制；缺省该槽全量 */
  materialPool?: Partial<Record<PartTypeId, string[]>>;
  /** 每材料 grade；缺省 'NONE'（不写入 MaterialChoice，calc 兜底） */
  grade?: GradeLevel;
  /** 候选数硬上限；缺省 DEFAULT_MAX_CANDIDATES */
  maxCandidates?: number;
}

/** 单个必填槽的候选视图（部件固定 1 个，材质列表已过滤 + 码点升序） */
export interface CandidateSlotView {
  slot: PartTypeId;
  part: Part;
  materials: Material[];
}

/** 主槽用 gearType.mainPart（已命名空间）；其余槽取 partsByPartType 中唯一 core 部件 */
export function resolveSlotPart(repo: DataRepository, gearType: GearTypeDef, slot: PartTypeId): Part {
  if (slot === 'silentgear:main') {
    const part = gearType.mainPart ? repo.getPart(gearType.mainPart) : undefined;
    if (!part) throw new OptimizerError(`主槽部件缺失: ${gearType.id} 的 mainPart=${gearType.mainPart}`);
    return part;
  }
  const cores = repo.partsByPartType(slot).filter((p) => p.type === 'core');
  if (cores.length !== 1) {
    throw new OptimizerError(`槽位 ${slot} 应有唯一 core 部件，实际 ${cores.length} 个（数据异常）`);
  }
  return cores[0]!;
}

/** 槽内材质：黑名单过滤 → materialPool 交集（黑名单权威，静默剔除）→ id 码点升序 */
function materialsForSlot(
  repo: DataRepository,
  gearTypeId: string,
  slot: PartTypeId,
  pool?: Partial<Record<PartTypeId, string[]>>,
): Material[] {
  const all = repo.materialsByPartType(slot).filter((m) => repo.materialAllowedForGear(m, gearTypeId));
  const wanted = pool?.[slot];
  let list: Material[];
  if (wanted) {
    for (const id of wanted) {
      if (!repo.getMaterial(id)) throw new OptimizerError(`materialPool 含未知材质: ${id}（槽位 ${slot}）`);
    }
    const byId = new Map(all.map((m) => [m.id, m]));
    list = wanted.map((id) => byId.get(id)).filter((m): m is Material => m !== undefined);
  } else {
    list = all;
  }
  // 码点升序（不用 localeCompare，跨 ICU 环境稳定）
  return list.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** 逐必填槽构建候选视图（并做全部前置校验）；槽位过滤后为空 → 抛错（比空候选集更有诊断价值） */
export function buildSlotViews(repo: DataRepository, gearType: GearTypeDef, opts?: GenerateOptions): CandidateSlotView[] {
  const views: CandidateSlotView[] = [];
  for (const slot of gearType.requiredParts) {
    const part = resolveSlotPart(repo, gearType, slot);
    const materials = materialsForSlot(repo, gearType.id, slot, opts?.materialPool);
    if (materials.length === 0) {
      throw new OptimizerError(`槽位 ${slot} 无可用材质（黑名单/materialPool 过滤后为空），请检查 materialPool`);
    }
    views.push({ slot, part, materials });
  }
  return views;
}

/** 入口：校验 gearType 具体可装配 → buildSlotViews → 笛卡尔积 → GearAssembly[]（确定性顺序） */
export function generateCandidates(repo: DataRepository, gearTypeId: string, opts?: GenerateOptions): GearAssembly[] {
  const gearType = repo.getGearType(gearTypeId);
  if (!gearType) throw new OptimizerError(`未知 gear type: ${gearTypeId}`);
  if (gearType.mainPart === null) throw new OptimizerError(`抽象类型不可装配: ${gearTypeId}`);

  const views = buildSlotViews(repo, gearType, opts);

  const total = views.reduce((acc, v) => acc * v.materials.length, 1);
  const maxCandidates = opts?.maxCandidates ?? DEFAULT_MAX_CANDIDATES;
  if (total > maxCandidates) {
    throw new OptimizerError(`候选数 ${total} 超过上限 ${maxCandidates}，请收窄 materialPool`);
  }

  // 迭代式笛卡尔积：外层槽先变化（views 顺序固定 → 候选序确定）
  let combos: Material[][] = [[]];
  for (const view of views) {
    const next: Material[][] = [];
    for (const prefix of combos) {
      for (const m of view.materials) next.push([...prefix, m]);
    }
    combos = next;
  }

  const grade = opts?.grade && opts.grade !== 'NONE' ? opts.grade : undefined;
  return combos.map((mats) => ({
    gearType: gearTypeId,
    slots: mats.map((m, i) => ({
      slot: views[i]!.slot,
      part: views[i]!.part.id,
      materials: [{ id: m.id, ...(grade ? { grade } : {}) }],
    })),
  }));
}
