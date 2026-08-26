/**
 * Calculation Engine —— 编排器（GearData 管线：收集 → 三遍计算）
 *
 * 输入：装配（gear type + 每槽位 part/material + grade/充能选择）→ 输出真实属性。
 * 与 Rating Engine / Optimizer 完全分离：本模块只回答「真实属性是多少」。
 *
 * 管线（gear-computation-pipeline.md §1/§3/§4）：
 *   收集（每槽位）：
 *     材质裸修正 → [grade] → [starcharged] → [crude]     （材质修正器链）
 *     复合材质（materials≥2）：compress → synergy → 部件底子加入
 *     simple 材质：直接 + 部件底子
 *     compress（同 op 压缩为一个）→ 汇入全局池
 *   三遍：Pass1 base → Pass2 bonus（trait getBonusProperties，new_1 §4）→ Pass3 final
 */
import type { Material, PartTypeId, StatEntry, StatModifier, TraitCondition } from '../data/types.js';
import { GEAR_PROPERTY_GROUP_STATS } from '../data/types.js';
import type { DataRepository } from '../data/repository.js';
import type { Part } from '../data/types.js';
import { compressModifiers, weightedAverage } from './compress.js';
import { computeTraitBonus } from './bonus.js';
import { computeProperty } from './compute.js';
import { applyCrude, applyGrade, applyStarcharged, CRUDE_MIXER_PROPERTY_MULTIPLIER } from './modifier.js';
import type { GradeLevel } from './modifier.js';
import { mostSpecificStatKey, gearTypeAncestorChain } from './propertyKey.js';
import { propertyDef } from './propertyDefs.js';
import { aggregateTraits } from './traits.js';
import type { AggregatedTrait } from './traits.js';
import { applySynergy, computeSynergy } from './synergy.js';
import type { SynergyMaterial, SynergyTraitLevel } from './synergy.js';
import { evaluateTraitConditions } from './trait-conditions.js';

export class CalcError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalcError';
  }
}

export interface MaterialChoice {
  id: string;
  /** 材料 grade（默认 NONE） */
  grade?: GradeLevel;
  /**
   * 粗制合金炉产物标记（CRUDE 数据组件，new_1 §1.3）。
   * 目录材料 JSON 不带此组件（仅 CrudeMixerBlockEntity 运行时写入）→ 默认 false 恒不触发 CrudeMaterialModifier；
   * 建模「粗制合金炉产物」时置 true（×0.8，只影响 synergy 属性）。
   */
  crude?: boolean;
}

export interface SlotAssignment {
  slot: PartTypeId;
  /** 部件 id（partType 必须 = slot） */
  part: string;
  /** 材料 id 列表；长度 ≥2 = 复合材质（走 synergy） */
  materials: MaterialChoice[];
}

export interface GearAssembly {
  gearType: string;
  slots: SlotAssignment[];
}

export interface CalcConfig {
  /** 充能（starcharged）等级 0..3；本模型为整件单一等级（多材质最低计 TODO 每材质差异） */
  chargeLevel?: number;
  /**
   * Pass2 damageRatio = clamp(损坏/基础耐久, 0, 1)（new_1 §4.2）。
   * 工具默认新装 = 1（§4.5 算例「满耐久 damageRatio=1」）。
   * TODO: 「损坏值」语义（伤害累计 vs 剩余耐久）文档示例按 1 处理，待用户确认。
   */
  damageRatio?: number;
}

export interface GearStats {
  gearType: string;
  /** Pass1 base 值 */
  base: Record<string, number>;
  /** Pass2 bonus（trait getBonusProperties + config 倍率，数据未提供 → 全 0，TODO） */
  bonus: Record<string, number>;
  /** Pass3 final = 合并 base+bonus 重跑 compute */
  final: Record<string, number>;
  /** 聚合后的 trait 列表（Pass1） */
  traits: AggregatedTrait[];
  /** 非数值属性（harvest_tier 对象 / additive 等）原样透传 */
  extras: Record<string, unknown>;
}

/** trait 解析结果（raw trait + 条件；resolveTraitsGated 过滤后仍带 conditions 便于溯源） */
interface ResolvedTrait {
  trait: string;
  level: number;
  materialId: string;
  conditions: TraitCondition[];
}

function isStatModifier(v: unknown): v is StatModifier {
  return typeof v === 'object' && v !== null && 'operation' in v;
}

/** 把 StatEntry 展开成数值修正列表（harvest_tier/traits/boolean 自动排除） */
function toModifierList(entry: StatEntry | undefined): StatModifier[] {
  if (entry === undefined) return [];
  if (Array.isArray(entry)) return entry.filter(isStatModifier);
  if (isStatModifier(entry)) return [entry];
  return [];
}

export class GearCalcEngine {
  private readonly repo: DataRepository;
  private readonly maxLevels: Record<string, number>;

  constructor(repo: DataRepository, traitMaxLevels: Record<string, number>) {
    this.repo = repo;
    this.maxLevels = traitMaxLevels;
  }

  /** 槽位属性表里解析属性 property（带 /gear 后缀兜底） */
  private resolveFromProps(props: Record<string, unknown> | undefined, property: string, chain: string[]): StatModifier[] {
    if (!props) return [];
    const key = mostSpecificStatKey(props, property, chain);
    if (!key) return [];
    return toModifierList(props[key] as StatEntry | undefined);
  }

  /** 材料的 charging_value（充能 q 用）；优先当前槽，回退 main */
  private materialChargingValue(material: Material, slot: PartTypeId, chain: string[]): number {
    const fromSlot = this.resolveFromProps(material.properties[slot], 'charging_value', chain);
    if (fromSlot.length) return weightedAverage(fromSlot);
    const fromMain = this.resolveFromProps(material.properties['silentgear:main'], 'charging_value', chain);
    return fromMain.length ? weightedAverage(fromMain) : 0;
  }

  /**
   * 单个材质的修正（裸修正 → grade → starcharged → crude）
   * crude 只对带 CRUDE 数据组件的材料（MaterialChoice.crude=true）且 synergy 属性生效（new_1 §1）。
   */
  private processMaterialMods(
    material: Material,
    slot: PartTypeId,
    property: string,
    chain: string[],
    grade: GradeLevel,
    chargeLevel: number,
    isCrude: boolean,
  ): StatModifier[] {
    if (chargeLevel > 0 && property === 'charging_value') return []; // starcharged 删除 charging_value 自身修正

    const def = propertyDef(property);
    const q = chargeLevel > 0 ? chargeLevel * this.materialChargingValue(material, slot, chain) : 0;

    return this.resolveFromProps(material.properties[slot], property, chain).map((mod) => {
      let m = mod;
      if (def.isAffectedByGrades) m = applyGrade(m, grade);
      m = applyStarcharged(m, property, q, chargeLevel);
      if (isCrude && def.isAffectedBySynergy) {
        m = applyCrude(m, CRUDE_MIXER_PROPERTY_MULTIPLIER);
      }
      return m;
    });
  }

  /** 单槽位属性池 = 材质修正（复合材质先 compress+synergy）+ 部件底子 */
  private buildSlotMods(
    slot: SlotAssignment,
    part: Part,
    property: string,
    chain: string[],
    chargeLevel: number,
  ): StatModifier[] {
    const def = propertyDef(property);

    let matMods: StatModifier[] = [];
    for (const mc of slot.materials) {
      const material = this.repo.getMaterial(mc.id);
      if (!material) throw new CalcError(`未知材料: ${mc.id}`);
      matMods = matMods.concat(this.processMaterialMods(material, slot.slot, property, chain, mc.grade ?? 'NONE', chargeLevel, mc.crude === true));
    }

    if (slot.materials.length >= 2) {
      // 复合材质：compress → synergy（部件底子加入之前，§6.2）
      // S 复用公开 computeCompoundSynergy（collectCompoundSynergy + crude/rustic/synergistic traits，
      // 后者不门控——当前数据这些 trait 的 conditions 全空，有门控语义时按 §6 再补）
      const compressed = compressModifiers(matMods);
      const s = this.computeCompoundSynergy(slot, chain);
      matMods = [...compressed.values()].map((m) => applySynergy(m, s, def.isAffectedBySynergy));
    }

    const partMods = this.resolveFromProps(part.properties, property, chain);
    return [...matMods, ...partMods];
  }

  /**
   * 复合槽公共 helper：构造 computeSynergy 的 SynergyMaterial 列表。
   * rarity 取 main 槽（§6 稀有度差异惩罚，rarity 是主材质属性），weightedAverage 同旧 buildSlotMods 逻辑。
   */
  private collectCompoundSynergy(materials: MaterialChoice[], slot: PartTypeId, chain: string[]): SynergyMaterial[] {
    return materials.map((mc) => {
      const material = this.repo.getMaterial(mc.id);
      if (!material) throw new CalcError(`未知材料: ${mc.id}`);
      return {
        id: material.id,
        categories: material.categories,
        rarity: weightedAverage(this.resolveFromProps(material.properties['silentgear:main'], 'rarity', chain)),
      };
    });
  }

  /**
   * 公开 API：复合槽的 synergy 系数 S（Best Build popover 显示用）。
   * 单材恒 1；复合槽 = collectCompoundSynergy + crude/rustic/synergistic traits。
   * chain 缺省 []：仅当调用方无法提供 gear type 祖先链时使用（rare 的 /gear 后缀键会解析不准，UI 总是传链）。
   */
  computeCompoundSynergy(slot: SlotAssignment, chain: string[] = []): number {
    if (slot.materials.length < 2) return 1;
    const synergyTraits: SynergyTraitLevel[] = [];
    for (const mc of slot.materials) {
      const material = this.repo.getMaterial(mc.id);
      if (!material) continue;
      for (const t of this.resolveTraits(material, slot.slot)) {
        if (t.trait === 'silentgear:crude' || t.trait === 'silentgear:rustic' || t.trait === 'silentgear:synergistic') {
          synergyTraits.push({ trait: t.trait, level: t.level });
        }
      }
    }
    return computeSynergy(this.collectCompoundSynergy(slot.materials, slot.slot, chain), synergyTraits);
  }

  /** 槽位材料属性里的 trait 实例（raw，含 conditions，未做条件求值） */
  private resolveTraits(material: Material, slot: PartTypeId): ResolvedTrait[] {
    const entry = material.properties[slot]?.['traits'];
    if (!Array.isArray(entry)) return [];
    return entry
      .filter((t) => typeof t === 'object' && t !== null && typeof (t as { trait?: unknown }).trait === 'string')
      .map((t) => ({
        trait: (t as { trait: string }).trait,
        level: (t as { level: number }).level,
        materialId: material.id,
        conditions: (t as { conditions?: TraitCondition[] }).conditions ?? [],
      }));
  }

  /**
   * 按条件求值门控的 trait 解析（attachable-parts-reference.md §4 + trait-conditions.ts）：
   * 复合槽里每个 trait 按「本槽携带它的子材质数 / 槽内总数」等条件决定是否生效。
   * gearTypeId 用于 gear_type 条件（snow_walker 仅 boots）。单材槽 ratio=1 恒过、count=1 不够——
   * 这恰好修掉 turtle / snow_walker / prismarine aquatic 三个单槽 bug。
   */
  private resolveTraitsGated(
    material: Material,
    slot: PartTypeId,
    slotMaterials: Material[],
    gearTypeId: string,
  ): ResolvedTrait[] {
    const slotMaterialCount = slotMaterials.length;
    const gearTypeMatches = (subjectId: string, ancestorId: string) => this.repo.gearTypeMatches(subjectId, ancestorId);
    return this.resolveTraits(material, slot).filter((t) => {
      const carryingCount = slotMaterials.filter((m) => this.resolveTraits(m, slot).some((mt) => mt.trait === t.trait)).length;
      return evaluateTraitConditions(t.conditions, { gearTypeId, gearTypeMatches, slotMaterialCount, carryingCount });
    });
  }

  /** 部件的固定 trait（attachable-parts-reference.md §5：upgrade 部件 traits 写在 properties.traits） */
  private resolvePartTraits(part: Part): ResolvedTrait[] {
    const entry = part.properties?.['traits'];
    if (!Array.isArray(entry)) return [];
    return entry
      .filter((t) => typeof t === 'object' && t !== null && typeof (t as { trait?: unknown }).trait === 'string')
      .map((t) => ({
        trait: (t as { trait: string }).trait,
        level: (t as { level: number }).level,
        materialId: part.id,
        // upgrade 部件 trait 当前数据 conditions 全空 → 不门控
        conditions: (t as { conditions?: TraitCondition[] }).conditions ?? [],
      }));
  }

  /** 收集某个属性的全局修正池（跨槽位，每槽位已压缩） */
  private collect(assembly: GearAssembly, property: string, chain: string[], chargeLevel: number): StatModifier[] {
    const pool: StatModifier[] = [];
    for (const slot of assembly.slots) {
      const part = this.repo.getPart(slot.part);
      if (!part) throw new CalcError(`未知部件: ${slot.part}`);
      if (part.partType !== slot.slot) {
        throw new CalcError(`部件 ${slot.part} 的 part_type=${part.partType} 与槽位 ${slot.slot} 不符`);
      }
      const compressed = compressModifiers(this.buildSlotMods(slot, part, property, chain, chargeLevel));
      for (const mod of compressed.values()) pool.push(mod);
    }
    return pool;
  }

  computeGearStats(assembly: GearAssembly, config: CalcConfig = {}): GearStats {
    const gearType = this.repo.getGearType(assembly.gearType);
    if (!gearType) throw new CalcError(`未知 gear type: ${assembly.gearType}`);

    // 装配校验：材料必须对该 gear type 可用（黑名单过滤）
    for (const slot of assembly.slots) {
      for (const mc of slot.materials) {
        const material = this.repo.getMaterial(mc.id);
        if (!material) throw new CalcError(`未知材料: ${mc.id}`);
        if (!this.repo.materialAllowedForGear(material, assembly.gearType)) {
          throw new CalcError(`材料 ${mc.id} 被 ${assembly.gearType} 黑名单禁用`);
        }
      }
      // 升级部件可用性（attachable-parts-reference.md §5「可用装备」列，upgradeGearTypes）
      const part = this.repo.getPart(slot.part);
      if (part?.partType === 'silentgear:misc_upgrade' && part.upgradeGearTypes) {
        const { types } = part.upgradeGearTypes;
        if (!types.some((t) => this.repo.gearTypeMatches(assembly.gearType, t))) {
          throw new CalcError(`升级部件 ${part.id} 不适用于 ${assembly.gearType}（可用: ${types.join(' / ') || '—'}）`);
        }
      }
    }

    const chain = gearTypeAncestorChain(this.repo, assembly.gearType);
    const chargeLevel = config.chargeLevel ?? 0;

    // 相关属性 = gear type 有效属性组展开
    const relevant = new Set<string>();
    for (const group of gearType.propertyGroups) {
      for (const key of GEAR_PROPERTY_GROUP_STATS[group]) relevant.add(key);
    }

    const pools = new Map<string, StatModifier[]>();
    const base: Record<string, number> = {};
    const extras: Record<string, unknown> = {};
    const sourceTraits: { trait: string; level: number; materialId: string }[] = [];

    // harvest_tier / traits 等非数值走特殊通道
    for (const prop of relevant) {
      if (prop === 'traits') {
        // 材质 trait（各槽位段，按条件求值门控）+ 部件固定 trait（upgrade 部件 §5，conditions 全空不门控），混入同一聚合池
        for (const slot of assembly.slots) {
          const part = this.repo.getPart(slot.part);
          if (part) sourceTraits.push(...this.resolvePartTraits(part));
          const slotMaterials = slot.materials
            .map((mc) => this.repo.getMaterial(mc.id))
            .filter((m): m is Material => m !== undefined);
          for (const material of slotMaterials) {
            sourceTraits.push(...this.resolveTraitsGated(material, slot.slot, slotMaterials, assembly.gearType));
          }
        }
        continue;
      }
      if (prop === 'additive') {
        // 材料可否作添加剂（SPECIAL 组布尔值），透传聚合结果（语义 TODO）
        const additives = assembly.slots
          .flatMap((s) => s.materials)
          .map((mc) => this.repo.getMaterial(mc.id)?.properties?.['silentgear:main']?.['additive'])
          .filter((v) => v !== undefined);
        if (additives.length) extras.additive = additives;
        continue;
      }
      if (prop === 'harvest_tier') {
        // 取所有槽位（含 tip/coating 等附属段）中最好的档位（attachable-parts-reference.md §3.1
        // HarvestTierProperty.compute「取所有修正中最好的档位」）；level_hint 为数字字符串。
        let best: unknown;
        let bestHint = -Infinity;
        for (const slot of assembly.slots) {
          for (const mc of slot.materials) {
            const v = this.repo.getMaterial(mc.id)?.properties[slot.slot]?.['harvest_tier'];
            if (v === undefined) continue;
            const hint = (v as { level_hint?: unknown }).level_hint;
            const n = typeof hint === 'string' ? Number(hint) : NaN;
            if (Number.isFinite(n) && n > bestHint) { bestHint = n; best = v; }
          }
        }
        if (best !== undefined) extras.harvest_tier = best;
        continue;
      }
      if (typeof propertyDef(prop).baseValue !== 'number') continue;
      pools.set(prop, this.collect(assembly, prop, chain, chargeLevel));
    }

    // Pass1：base 值
    for (const [prop, pool] of pools) {
      base[prop] = this.computeWithDurabilitySpecial(gearType, prop, pool, pools);
    }

    // Pass2：bonus（trait getBonusProperties，new_1 §4；trait 列表 = Pass1 聚合结果）
    const aggregatedTraits = aggregateTraits(sourceTraits, this.maxLevels);
    const bonus = computeTraitBonus(aggregatedTraits, base, config.damageRatio ?? 1);

    // Pass3：final = base 修正 + bonus 修正（ADD）重跑 compute
    const final: Record<string, number> = {};
    for (const prop of Object.keys(base)) {
      const pool = pools.get(prop)!;
      const bonusMods = bonus[prop] !== undefined ? [{ operation: 'ADD' as const, value: bonus[prop] }] : [];
      final[prop] = this.computeWithDurabilitySpecial(gearType, prop, [...pool, ...bonusMods], pools);
    }

    return {
      gearType: assembly.gearType,
      base,
      bonus,
      final,
      traits: aggregatedTraits,
      extras,
    };
  }

  /**
   * 护甲/盾耐久特殊：durability = 倍率 × armor_durability(AVERAGE)（倍率 helmet=11…），其余属性直接五运算。
   * 底数取自 armor_durability 池而非 durability 池（护甲材质提供的是 armor_durability，如铁 15）。
   */
  private computeWithDurabilitySpecial(
    gearType: { durabilityStat: string | null; armorDurabilityMultiplier: number | null },
    prop: string,
    pool: StatModifier[],
    pools: Map<string, StatModifier[]>,
  ): number {
    const def = propertyDef(prop);
    if (prop === 'durability' && gearType.durabilityStat === 'ARMOR_DURABILITY' && gearType.armorDurabilityMultiplier != null) {
      // 用 armor_durability 池的 AVERAGE 作底，乘护甲倍率后继续跑五运算（MAX/mul/ADD 交互 TODO 确认）
      const armorPool = pools.get('armor_durability') ?? [];
      const avg = weightedAverage(armorPool.filter((m) => m.operation === 'AVERAGE'));
      const syntheticAvg: StatModifier = { operation: 'AVERAGE', value: gearType.armorDurabilityMultiplier * (def.baseValue + avg) };
      return computeProperty([syntheticAvg, ...armorPool.filter((m) => m.operation !== 'AVERAGE')], 0, def.clampMin, def.clampMax);
    }
    return computeProperty(pool, def.baseValue, def.clampMin, def.clampMax);
  }
}
