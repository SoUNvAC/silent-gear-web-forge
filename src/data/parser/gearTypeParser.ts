/**
 * Data Layer —— GearType parser
 * 把 src/data/gear-types.json（由 gear-types-reference.md 转换的机器可读源）解析为 GearTypeDef[]。
 * 做两件事：结构校验 + 沿父链解析「实际参与计算的属性组」。
 */
import type { GearPropertyGroup, GearTypeDef, PartTypeId } from '../types.js';
import { GEAR_PROPERTY_GROUPS } from '../types.js';
import { ValidationError, assertNumber, assertRecord, assertString } from '../validator.js';

/** gear-types.json 的原始结构（构建脚本产出的格式） */
export interface GearTypeSourceJson {
  version: string;
  source: string;
  baseValue: number;
  gearTypes: Record<string, GearTypeSourceEntry>;
}

export interface GearTypeSourceEntry {
  /** 裸名（"melee_weapon"），无父为 null */
  parent: string | null;
  /** 显式声明的属性组；省略 = 继承父类（markdown §3 方括号语义） */
  propertyGroups?: GearPropertyGroup[];
  /** 绑定主部件裸名（"sword_blade"）；抽象类型为 null */
  mainPart?: string | null;
  /** 必填槽位裸名（"main"/"rod"/…）；抽象类型为空 */
  requiredParts?: string[];
  /** 可附加槽位裸名；抽象类型为空 */
  addableSlots?: string[];
  durabilityStat?: 'DURABILITY' | 'ARMOR_DURABILITY';
  armorDurabilityMultiplier?: number | null;
  animationFrames?: number;
}

const PART_TYPE_BARE: Record<string, PartTypeId> = {
  main: 'silentgear:main',
  rod: 'silentgear:rod',
  tip: 'silentgear:tip',
  setting: 'silentgear:setting',
  grip: 'silentgear:grip',
  binding: 'silentgear:binding',
  cord: 'silentgear:cord',
  fletching: 'silentgear:fletching',
  lining: 'silentgear:lining',
  coating: 'silentgear:coating',
};

function toPartTypeId(path: string, bare: string): PartTypeId {
  const id = PART_TYPE_BARE[bare];
  if (!id) throw new ValidationError(path, `未知槽位裸名: ${bare}`);
  return id;
}

/** 解析 gear-types.json → GearTypeDef[]（属性组已沿父链解析为有效集合） */
export function parseGearTypesJson(raw: unknown): GearTypeDef[] {
  assertRecord('$', raw);
  assertString('$.version', raw.version);
  assertString('$.source', raw.source);
  assertNumber('$.baseValue', raw.baseValue);

  const entriesRaw = raw.gearTypes;
  assertRecord('$.gearTypes', entriesRaw);
  if (Object.keys(entriesRaw).length === 0) throw new ValidationError('$.gearTypes', '为空');

  const defs = new Map<string, GearTypeDef>();
  for (const [bareName, entryRaw] of Object.entries(entriesRaw)) {
    assertRecord(`$.gearTypes.${bareName}`, entryRaw);
    const entry = entryRaw as unknown as GearTypeSourceEntry;

    if (entry.parent !== undefined && entry.parent !== null) assertString(`$.gearTypes.${bareName}.parent`, entry.parent);

    let mainPart: string | null = null;
    if (entry.mainPart !== undefined && entry.mainPart !== null) {
      assertString(`$.gearTypes.${bareName}.mainPart`, entry.mainPart);
      mainPart = `silentgear:${entry.mainPart}`;
    }

    const requiredParts = (entry.requiredParts ?? []).map((p, i) =>
      toPartTypeId(`$.gearTypes.${bareName}.requiredParts[${i}]`, p),
    );
    const addableSlots = (entry.addableSlots ?? []).map((p, i) =>
      toPartTypeId(`$.gearTypes.${bareName}.addableSlots[${i}]`, p),
    );

    if (entry.propertyGroups !== undefined) {
      for (const g of entry.propertyGroups) {
        if (!(GEAR_PROPERTY_GROUPS as readonly string[]).includes(g)) {
          throw new ValidationError(`$.gearTypes.${bareName}.propertyGroups`, `未知属性组: ${g}`);
        }
      }
    }
    if (entry.durabilityStat !== undefined && entry.durabilityStat !== 'DURABILITY' && entry.durabilityStat !== 'ARMOR_DURABILITY') {
      throw new ValidationError(`$.gearTypes.${bareName}.durabilityStat`, `未知耐久口径: ${entry.durabilityStat}`);
    }
    if (entry.armorDurabilityMultiplier !== undefined && entry.armorDurabilityMultiplier !== null) {
      assertNumber(`$.gearTypes.${bareName}.armorDurabilityMultiplier`, entry.armorDurabilityMultiplier);
    }
    if (entry.animationFrames !== undefined) assertNumber(`$.gearTypes.${bareName}.animationFrames`, entry.animationFrames);
    if (entry.durabilityStat === undefined && entry.armorDurabilityMultiplier !== undefined) {
      // 允许（仅作数据完整性检查，非错误）
    }

    defs.set(bareName, {
      id: `silentgear:${bareName}`,
      parent: entry.parent === null ? null : `silentgear:${entry.parent}`,
      mainPart,
      requiredParts,
      addableSlots,
      durabilityStat: entry.durabilityStat ?? null,
      armorDurabilityMultiplier: entry.armorDurabilityMultiplier ?? null,
      animationFrames: entry.animationFrames ?? 0,
      propertyGroups: [], // 稍后统一解析
    });
  }

  // 第二遍：沿父链解析有效属性组
  for (const [bareName, def] of defs) {
    def.propertyGroups = effectivePropertyGroups(entriesRaw as Record<string, GearTypeSourceEntry>, bareName);
  }

  return [...defs.values()];
}

/**
 * 沿父链取「第一个非空声明」的属性组（GearType.relevantPropertyGroups 递归继承语义）。
 * 注：markdown §3「未列出者继承父类」= 空集合向上继承，取祖先第一个声明的完整集合，不是并集
 * （否则 bow 会继承 tool 的 ATTACK/HARVEST 组，与游戏不符）。
 */
function effectivePropertyGroups(src: Record<string, GearTypeSourceEntry>, bareName: string): GearPropertyGroup[] {
  let cur: string | null = bareName;
  const seen = new Set<string>();
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const declared = src[cur]?.propertyGroups;
    if (declared && declared.length > 0) return [...declared];
    cur = src[cur]?.parent ?? null;
  }
  if (cur && seen.has(cur)) {
    throw new ValidationError(`$.gearTypes.${bareName}`, `父链成环: ${cur}`);
  }
  return []; // 全链无声明（理论不会发生，all 总有 SPECIAL/GENERAL）
}

/**
 * matches(subject, ancestor)：沿父链判断 subject 是否属于 ancestor 类型。
 * 对应官方 GearType.matches()（CoreGearPart.canAddToGear 用）。
 */
export function gearTypeMatches(defs: readonly GearTypeDef[], subjectId: string, ancestorId: string): boolean {
  if (subjectId === ancestorId) return true;
  const byId = new Map(defs.map((d) => [d.id, d]));
  let cur: GearTypeDef | undefined = byId.get(subjectId);
  const seen = new Set<string>();
  while (cur) {
    if (cur.id === ancestorId) return true;
    if (!cur.parent || seen.has(cur.id)) return false;
    seen.add(cur.id);
    cur = byId.get(cur.parent);
  }
  return false;
}
