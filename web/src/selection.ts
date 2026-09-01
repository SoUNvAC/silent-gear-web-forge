/**
 * 装配选择辅助 —— 自动补全 + 组装解析（Assembly / Preview / Material-Selector 共用，避免重复逻辑）
 * 附属槽位视图在此构建（只读公开 repo API，不改 Optimizer 引擎的 generateCandidates/buildSlotViews）。
 */
import type { PartTypeId, GearTypeDef, Part, StatModifier } from '../../src/data/types.js';
import type { DataRepository } from '../../src/data/repository.js';
import type { CandidateSlotView } from '../../src/optimizer/index.js';
import { buildSlotViews } from '../../src/optimizer/index.js';
import type { MaterialChoice } from '../../src/calc/index.js';
import { statLabel, formatNum } from './format.js';

/**
 * 装配选择补全。选择值 = MaterialChoice（{id, grade?}，品级缺省 NONE）。
 * 必填槽（required）无有效选择时兜底首个候选；附属槽支持**空选**——
 * 无选择保持空，无效选择直接清空，不兜底（默认空选，与游戏一致）。
 */
export function fillChoices(
  views: readonly CandidateSlotView[],
  choices: Partial<Record<PartTypeId, MaterialChoice>>,
  required: ReadonlySet<PartTypeId>,
): { filled: Partial<Record<PartTypeId, MaterialChoice>>; changed: boolean } {
  const filled = { ...choices };
  let changed = false;
  for (const v of views) {
    const existing = filled[v.slot];
    const valid = existing !== undefined && v.materials.some((m) => m.id === existing.id);
    if (valid) continue;
    if (required.has(v.slot)) {
      const first = v.materials[0];
      if (first) {
        filled[v.slot] = { id: first.id };
        changed = true;
      }
    } else if (existing !== undefined) {
      // 附属槽：失效选择 → 清空（空选）
      delete filled[v.slot];
      changed = true;
    }
  }
  return { filled, changed };
}

/** Best Build 结果装配里的一个槽（结构兼容 GearAssembly['slots']；材质自带品级） */
export interface BuildAssemblySlot {
  slot: PartTypeId;
  composition?: 'dynamic_compound' | 'compound_part';
  materials: readonly MaterialChoice[];
}

/**
 * Best Build 结果装配 → 装配面板的单材选择（materialChoices）。
 * 复合槽的单材选择器仍以主材 materials[0] 为入口；完整子材料由
 * buildCompoundChoicesFromBuild 同步保存。主材品级随应用带进该槽（Best Build 搜索结果
 * 自带搜索品级；grade 缺省 / 'NONE' 不写字段）。升级部件槽（misc_upgrade）不覆盖
 * —— Best Build 不搜升级件，应用结果不应清掉用户已选的升级。
 */
export function buildChoicesFromBuild(slots: readonly BuildAssemblySlot[]): Partial<Record<PartTypeId, MaterialChoice>> {
  const choices: Partial<Record<PartTypeId, MaterialChoice>> = {};
  for (const s of slots) {
    if (s.slot === 'silentgear:misc_upgrade') continue;
    const primary = s.materials[0];
    if (primary) {
      const c: MaterialChoice = { id: primary.id };
      if (primary.grade && primary.grade !== 'NONE') c.grade = primary.grade;
      choices[s.slot] = c;
    }
  }
  return choices;
}

/** Best Build 结果中保留完整动态复合子材料，避免点击卡片后退化成首个单材料。 */
export function buildCompoundChoicesFromBuild(
  slots: readonly BuildAssemblySlot[],
): Partial<Record<PartTypeId, MaterialChoice[]>> {
  const choices: Partial<Record<PartTypeId, MaterialChoice[]>> = {};
  for (const s of slots) {
    if (s.slot === 'silentgear:misc_upgrade' || s.materials.length < 2 || s.composition === 'compound_part') continue;
    choices[s.slot] = s.materials.map((mc) => ({ ...mc }));
  }
  return choices;
}

/**
 * 附属槽视图（addableSlots − requiredParts）。
 * 权威判据（gear-types-reference §5.2 canAddToGear）：部件 gear_type 必须 matches(装备)；
 * 材料按 gear 黑名单过滤 + id 码点升序（与 generator 的确定性序一致）。
 * 返回结构与 buildSlotViews 的 CandidateSlotView 完全一致 → fillChoices / 组件直接复用。
 */
export function addonSlotViews(repo: DataRepository, gearType: GearTypeDef): CandidateSlotView[] {
  const out: CandidateSlotView[] = [];
  for (const slot of gearType.addableSlots) {
    if (gearType.requiredParts.includes(slot)) continue;
    const part = repo.partsByPartType(slot).find((p) => repo.gearTypeMatches(gearType.id, p.gearType));
    if (!part) continue;
    const materials = repo
      .materialsByPartType(slot)
      .filter((m) => repo.materialAllowedForGear(m, gearType.id))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    if (materials.length === 0) continue;
    out.push({ slot, part, materials });
  }
  return out;
}

/** 全部槽视图 = 核心（requiredParts）+ 附属（addableSlots） */
export function allSlotViews(repo: DataRepository, gearType: GearTypeDef): CandidateSlotView[] {
  return [...buildSlotViews(repo, gearType, {}), ...addonSlotViews(repo, gearType)];
}

/** 升级部件（misc_upgrade：走 upgrade 通道，非组装槽） */
export function upgradeParts(repo: DataRepository): Part[] {
  return repo.partsByPartType('silentgear:misc_upgrade');
}

/** 升级部件是否可用于该装备（upgradeGearTypes 可用装备列，attachable-parts-reference.md §5） */
export function upgradeAllowed(repo: DataRepository, gearTypeId: string, part: Part): boolean {
  const t = part.upgradeGearTypes;
  if (!t) return true;
  return t.types.some((g) => repo.gearTypeMatches(gearTypeId, g));
}

/** 该装备可用的升级部件列表（assembly / preview 共用，保证选中的都真能生效） */
export function upgradesForGear(repo: DataRepository, gearType: GearTypeDef): Part[] {
  return upgradeParts(repo).filter((p) => upgradeAllowed(repo, gearType.id, p));
}

/** 升级部件固定效果简述（属性修正 + 固定 trait），装配悬浮 / 预览展示用 */
export function upgradeEffects(part: Part): string {
  const out: string[] = [];
  const props = part.properties ?? {};
  for (const [key, entry] of Object.entries(props)) {
    if (key === 'traits') continue;
    const mods = (Array.isArray(entry) ? entry : [entry]).filter(
      (m): m is StatModifier => typeof m === 'object' && m !== null && 'operation' in m,
    );
    for (const m of mods) out.push(`${statLabel(key)} ${formatMod(m)}`);
  }
  const traits = props['traits'];
  if (Array.isArray(traits)) {
    for (const t of traits) {
      if (typeof t !== 'object' || t === null) continue;
      const tr = t as { trait?: unknown; level?: unknown };
      if (typeof tr.trait !== 'string' || typeof tr.level !== 'number') continue;
      out.push(`${tr.trait.replace(/^[^:]+:/, '').replace(/_/g, ' ')} Lv.${tr.level}`);
    }
  }
  return out.join(' · ') || '（无固定效果）';
}

function formatMod(m: StatModifier): string {
  const v = formatNum(m.value);
  switch (m.operation) {
    case 'ADD':
      return `+${v}`;
    case 'MULTIPLY_BASE':
      return `×base ${v}`;
    case 'MULTIPLY_TOTAL':
      return `×total ${v}`;
    case 'MAX':
      return `max ${v}`;
    default:
      return v;
  }
}
