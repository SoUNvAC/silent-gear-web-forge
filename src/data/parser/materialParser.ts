/**
 * Data Layer —— 材料 JSON parser
 * 解析单个材料文件（data/silentgear_materials/<path>.json），产出 MaterialSource。
 * 继承合并不在本模块做（repository 统一解析）。
 */
import type { MaterialSource, MaterialType, PartTypeId } from '../types.js';
import { ALL_PART_TYPE_IDS } from '../types.js';
import { ValidationError, assertRecord, assertString, assertBoolean, normalizeStatEntry, stripNamespace } from '../validator.js';

/** 把 #AARRGGBB 颜色字符串解析为数值；null 表示未提供 */
export function parseColorString(s: string): number {
  if (!/^#[0-9a-fA-F]{8}$/.test(s)) throw new ValidationError('display.color', `非法颜色格式: ${s}`);
  return Number.parseInt(s.slice(1), 16);
}

function assertStringArray(path: string, v: unknown): asserts v is string[] {
  if (!Array.isArray(v) || !v.every((x) => typeof x === 'string')) {
    throw new ValidationError(path, '期望字符串数组');
  }
}

/**
 * 解析单个材料 JSON。
 * @param raw   JSON 解析后的对象
 * @param id    材料命名空间 id（由文件路径推导，如 silentgear:wood/oak）
 */
export function parseMaterial(raw: unknown, id: string): MaterialSource {
  assertRecord('$', raw);

  const typeField = raw.type;
  assertString('$.type', typeField);
  const type = stripNamespace(typeField) as MaterialType;

  // parent：silentgear:empty 是「无父」哨兵 → null；否则保留完整 id
  let parent: string | null = null;
  if (raw.parent !== undefined) {
    assertString('$.parent', raw.parent);
    parent = raw.parent === 'silentgear:empty' ? null : raw.parent;
  }

  const display = raw.display === undefined ? undefined : (assertRecord('$.display', raw.display), raw.display);
  let name = id;
  if (display?.name !== undefined) {
    assertRecord('$.display.name', display.name);
    assertString('$.display.name.translate', display.name.translate);
    name = display.name.translate;
  }
  let displayColor: number | null = null;
  if (display?.color !== undefined) {
    assertString('$.display.color', display.color);
    displayColor = parseColorString(display.color);
  }

  const crafting = raw.crafting === undefined ? undefined : (assertRecord('$.crafting', raw.crafting), raw.crafting);
  const categories: string[] = [];
  if (crafting?.categories !== undefined) {
    assertStringArray('$.crafting.categories', crafting.categories);
    categories.push(...crafting.categories);
  }
  const gearTypeBlacklist: string[] = [];
  if (crafting?.gear_type_blacklist !== undefined) {
    assertStringArray('$.crafting.gear_type_blacklist', crafting.gear_type_blacklist);
    gearTypeBlacklist.push(...crafting.gear_type_blacklist);
  }
  if (crafting?.can_salvage !== undefined) assertBoolean('$.crafting.can_salvage', crafting.can_salvage);

  const partSubstitutes: Record<string, unknown> = {};
  if (crafting?.part_substitutes !== undefined) {
    assertRecord('$.crafting.part_substitutes', crafting.part_substitutes);
    Object.assign(partSubstitutes, crafting.part_substitutes);
  }

  // properties：按槽位解析，stat 值归一化
  const properties: MaterialSource['properties'] = {};
  if (raw.properties !== undefined) {
    assertRecord('$.properties', raw.properties);
    for (const [slotKey, slotProps] of Object.entries(raw.properties)) {
      const partType = slotKey as PartTypeId;
      if (!(ALL_PART_TYPE_IDS as readonly string[]).includes(slotKey)) {
        throw new ValidationError(`$.properties.${slotKey}`, `未知槽位键（不在 PartTypeId 模型内）`);
      }
      assertRecord(`$.properties.${slotKey}`, slotProps);
      const map: MaterialSource['properties'][PartTypeId] = {};
      for (const [statKey, statVal] of Object.entries(slotProps)) {
        map[statKey] = normalizeStatEntry(statKey, `$.properties.${slotKey}.${statKey}`, statVal);
      }
      properties[partType] = map;
    }
  }

  return {
    id,
    type,
    parent,
    name,
    displayColor,
    categories,
    gearTypeBlacklist,
    partSubstitutes,
    properties,
  };
}
