/**
 * Data Layer —— 部件 JSON parser
 * 解析单个部件文件（data/silentgear_parts/<id>.json），产出 Part。
 */
import type { Part, PartTypeId } from '../types.js';
import { ALL_PART_TYPE_IDS } from '../types.js';
import { ValidationError, assertRecord, assertString, assertBoolean, normalizeStatEntry, stripNamespace } from '../validator.js';

/**
 * 解析单个部件 JSON。
 * @param raw JSON 解析后的对象
 * @param id  部件命名空间 id，如 silentgear:sword_blade
 */
export function parsePart(raw: unknown, id: string): Part {
  assertRecord('$', raw);

  const typeField = raw.type;
  assertString('$.type', typeField);
  const type = typeField === 'silentgear:upgrade' ? 'upgrade' : 'core';
  if (typeField !== 'silentgear:core' && typeField !== 'silentgear:upgrade') {
    throw new ValidationError('$.type', `未知部件类型: ${typeField}`);
  }

  const gearType = raw.gear_type;
  assertString('$.gear_type', gearType);

  const partTypeField = raw.part_type;
  assertString('$.part_type', partTypeField);
  const partType = partTypeField as PartTypeId;
  if (!(ALL_PART_TYPE_IDS as readonly string[]).includes(partTypeField)) {
    throw new ValidationError('$.part_type', `未知 part_type: ${partTypeField}`);
  }

  const properties: Part['properties'] = {};
  if (raw.properties !== undefined) {
    assertRecord('$.properties', raw.properties);
    for (const [statKey, statVal] of Object.entries(raw.properties)) {
      properties[statKey] = normalizeStatEntry(statKey, `$.properties.${statKey}`, statVal);
    }
  }

  // upgrade 部件的适用装备类型：对象 {match_parents, types}
  let upgradeGearTypes: Part['upgradeGearTypes'];
  if (raw.upgrade_gear_types !== undefined) {
    assertRecord('$.upgrade_gear_types', raw.upgrade_gear_types);
    const matchParents = raw.upgrade_gear_types.match_parents;
    assertBoolean('$.upgrade_gear_types.match_parents', matchParents);
    const types = raw.upgrade_gear_types.types;
    if (!Array.isArray(types) || !types.every((t) => typeof t === 'string')) {
      throw new ValidationError('$.upgrade_gear_types.types', '期望字符串数组');
    }
    upgradeGearTypes = { match_parents: matchParents, types: [...types] };
  }

  return { id, type, gearType, partType, properties, upgradeGearTypes };
}

/** 从部件 id 推导展示名（去掉命名空间） */
export function partDisplayName(id: string): string {
  return stripNamespace(id);
}
