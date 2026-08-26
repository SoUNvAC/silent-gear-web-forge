/**
 * Data Layer —— Repository（Registry）
 *
 * 职责：
 *   1. 接收原始数据输入（材料/部件 JSON 原文 + gear-types.json），全部解析为类型化模型；
 *   2. 解析材料变体继承（官方 MaterialData 合并语义：槽位 × stat 键，子覆盖父）；
 *   3. 建索引：按 id / part_type / gear_type 查询。
 *
 * 浏览器与 Node 共用：上层只需提供 DataInput（Node 用 loadDataFromDisk 从 data/ 目录读）。
 */
import { parseMaterial } from './parser/materialParser.js';
import { parsePart } from './parser/partParser.js';
import { parseGearTypesJson, gearTypeMatches } from './parser/gearTypeParser.js';
import { ValidationError } from './validator.js';
import type { GearTypeDef, Material, MaterialSource, Part, PartTypeId } from './types.js';
import { ALL_PART_TYPE_IDS } from './types.js';

/** 数据输入：未解析的原始 JSON */
export interface DataInput {
  materials: { id: string; raw: unknown }[];
  parts: { id: string; raw: unknown }[];
  gearTypesRaw: unknown;
}

/** 装配槽位（misc_upgrade 不是组装槽，走 upgrade 通道） */
export const ASSEMBLY_SLOTS: readonly PartTypeId[] = ALL_PART_TYPE_IDS.filter(
  (p) => p !== 'silentgear:misc_upgrade',
);

export class DataRepository {
  readonly materials: Map<string, Material>;
  readonly parts: Map<string, Part>;
  readonly gearTypes: Map<string, GearTypeDef>;

  constructor(input: DataInput) {
    // ---- 材料：解析 + 继承合并 ----
    const sourceMap = new Map<string, MaterialSource>();
    for (const { id, raw } of input.materials) {
      if (sourceMap.has(id)) throw new ValidationError(id, '重复材料 id');
      sourceMap.set(id, parseMaterial(raw, id));
    }
    const materials = new Map<string, Material>();
    const memo = new Map<string, MaterialSource>();
    for (const id of sourceMap.keys()) {
      materials.set(id, resolveInheritance(sourceMap, id, memo, new Set<string>()));
    }
    this.materials = materials;

    // ---- 部件 ----
    const parts = new Map<string, Part>();
    for (const { id, raw } of input.parts) {
      if (parts.has(id)) throw new ValidationError(id, '重复部件 id');
      parts.set(id, parsePart(raw, id));
    }
    this.parts = parts;

    // ---- gear types ----
    const gearTypes = new Map<string, GearTypeDef>();
    for (const def of parseGearTypesJson(input.gearTypesRaw)) gearTypes.set(def.id, def);
    this.gearTypes = gearTypes;
  }

  // ---------- 索引查询 ----------

  getMaterial(id: string): Material | undefined {
    return this.materials.get(id);
  }

  getPart(id: string): Part | undefined {
    return this.parts.get(id);
  }

  getGearType(id: string): GearTypeDef | undefined {
    return this.gearTypes.get(id);
  }

  /** 支持某槽位的材料（继承解析后，该槽位有非空属性表） */
  materialsByPartType(partType: PartTypeId): Material[] {
    const out: Material[] = [];
    for (const m of this.materials.values()) {
      if (m.properties[partType] && Object.keys(m.properties[partType]!).length > 0) out.push(m);
    }
    return out;
  }

  /** 某槽位的部件 */
  partsByPartType(partType: PartTypeId): Part[] {
    const out: Part[] = [];
    for (const p of this.parts.values()) if (p.partType === partType) out.push(p);
    return out;
  }

  /** 主部件（part_type = main） */
  mainParts(): Part[] {
    return this.partsByPartType('silentgear:main');
  }

  /** 某 gear type 绑定的主部件（markdown §5.3 表） */
  mainPartForGearType(gearTypeId: string): Part | undefined {
    const mainPartId = this.gearTypes.get(gearTypeId)?.mainPart;
    return mainPartId ? this.parts.get(mainPartId) : undefined;
  }

  /** subject 是否属于 ancestor 类型（沿父链，对应 GearType.matches） */
  gearTypeMatches(subjectId: string, ancestorId: string): boolean {
    return gearTypeMatches([...this.gearTypes.values()], subjectId, ancestorId);
  }

  /** 材料是否被某 gear type 禁用（crafting.gear_type_blacklist，按 matches 匹配） */
  materialAllowedForGear(material: Material, gearTypeId: string): boolean {
    return material.gearTypeBlacklist.every((b) => !this.gearTypeMatches(gearTypeId, b));
  }

  /** 材料的可用主装配槽位 */
  materialAssemblySlots(material: Material): PartTypeId[] {
    return ASSEMBLY_SLOTS.filter((s) => material.properties[s] && Object.keys(material.properties[s]!).length > 0);
  }
}

/**
 * 变体继承解析：沿父链深度合并。
 * 合并语义（官方 MaterialData）：按「槽位 → stat 键」子覆盖父；traits 整键替换，不追加。
 */
function resolveInheritance(
  sourceMap: Map<string, MaterialSource>,
  id: string,
  memo: Map<string, MaterialSource>,
  visiting: Set<string>,
): MaterialSource {
  const cached = memo.get(id);
  if (cached) return cached;
  if (visiting.has(id)) throw new ValidationError(id, `父链成环: ${id}`);

  const src = sourceMap.get(id);
  if (!src) throw new ValidationError(id, '材料不存在');

  visiting.add(id);
  const base = src.parent ? resolveInheritance(sourceMap, src.parent, memo, visiting) : null;
  visiting.delete(id);

  const properties: MaterialSource['properties'] = {};
  if (base) {
    for (const [slot, map] of Object.entries(base.properties)) {
      properties[slot as PartTypeId] = { ...map };
    }
  }
  for (const [slot, map] of Object.entries(src.properties)) {
    const slotKey = slot as PartTypeId;
    properties[slotKey] = { ...(properties[slotKey] ?? {}), ...map };
  }

  const resolved: MaterialSource = { ...src, properties };
  memo.set(id, resolved);
  return resolved;
}
