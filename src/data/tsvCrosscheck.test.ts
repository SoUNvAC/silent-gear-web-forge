/**
 * TSV 交叉校验（material_export.tsv ↔ 材料 JSON）
 *
 * TSV 是有损渲染（已知差异，见下），JSON 是权威源。本测试只做「能对上的必须对上」，
 * 对不上的要么是已知有损编码（decoder 已处理），要么是真实数据差异（测试会失败暴露）。
 *
 * 已知有损编码（已记录在案）：
 *   - Armor Durability "15x" / Ranged Damage "1x" / Ranged Speed "0.1x" / Projectile Speed "1x"
 *     = 「值×」渲染，数值本身 = JSON 值（对比时剥掉尾部 x）
 *   - Projectile Accuracy "110%" = 值×100 渲染 → 除以 100 后对比
 *   - MULTIPLY_TOTAL "x1.2" = 「×factor」渲染 → factor = 1 + value
 *   - "Ranged Speed" 列标签错误，实际是 draw_speed（文档 §数据源）
 *   - 列值为空 = 该 stat 不在材料 JSON（或该部件类型行不含此 stat）
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadDataFromDisk } from './loadDisk.js';
import { DataRepository } from './repository.js';
import type { StatEntry, StatModifier } from './types.js';

const repo = new DataRepository(loadDataFromDisk({ dataDir: 'data', gearTypesJsonPath: 'src/data/gear-types.json' }));

type Row = string[];
const lines = readFileSync('data/material_export.tsv', 'utf8').trim().split('\n');
const header = lines[0]!.split('\t').map((c) => c.replace(/\r$/, ''));
const rows: Row[] = lines.slice(1).map((l) => l.split('\t').map((c) => c.replace(/\r$/, '')));

function tsvRow(id: string, type: string): Row | undefined {
  return rows.find((r) => r[header.indexOf('ID')] === id && r[header.indexOf('Type')] === type);
}

/** 把 TSV 渲染值解码为数值；列不存在/空返回 undefined */
function decodeTsv(col: string, id: string, tsvType: string): number | undefined {
  const row = tsvRow(id, tsvType);
  const idx = header.indexOf(col);
  if (!row || idx === -1) return undefined;
  const raw = row[idx];
  if (!raw || raw === '') return undefined;
  // "x1.2" → 1.2；"15x" → 15；"110%" → 110；"2" → 2
  const trimmed = raw.replace(/^x/, '').replace(/x$/, '').replace(/%$/, '');
  const n = Number(trimmed);
  return Number.isNaN(n) ? undefined : n;
}

/** 从 JSON 提取某 stat 的单个数值（仅 AVERAGE/ADD 单值；多修饰符数组返回 undefined） */
function jsonSingleValue(entry: StatEntry | undefined): number | undefined {
  if (!entry) return undefined;
  if (Array.isArray(entry) || typeof entry === 'object' && !('operation' in entry)) {
    // StatModifier[] 或 harvest_tier / traits
    if (Array.isArray(entry)) return undefined;
    return undefined;
  }
  const mod = entry as StatModifier;
  if (mod.operation === 'AVERAGE' || mod.operation === 'ADD') return mod.value;
  return undefined;
}

/** Main 槽位 + 可绝对值对比的列（TSV 列名 → stat 键） */
const MAIN_COLUMNS: Array<[string, string]> = [
  ['Durability', 'durability'],
  ['Enchantment Value', 'enchantment_value'],
  ['Charging Value', 'charging_value'],
  ['Rarity', 'rarity'],
  ['Harvest Speed', 'harvest_speed'],
  ['Attack Damage', 'attack_damage'],
  ['Magic Damage', 'magic_damage'],
  ['Attack Speed', 'attack_speed'],
  ['Armor', 'armor'],
  ['Armor Toughness', 'armor_toughness'],
  ['Knockback Resistance', 'knockback_resistance'],
  ['Magic Armor', 'magic_armor'],
];

describe('TSV 交叉校验 —— 样本材料 Main 行', () => {
  const samples = [
    { id: 'silentgear:iron', name: 'iron' },
    { id: 'silentgear:aluminum', name: 'aluminum' },
    { id: 'silentgear:diamond', name: 'diamond' },
    { id: 'silentgear:wood', name: 'wood' },
    { id: 'silentgear:wood/oak', name: 'wood/oak' },
    { id: 'silentgear:stone', name: 'stone' },
    { id: 'silentgear:wool', name: 'wool' },
    { id: 'silentgear:dimerald', name: 'dimerald' },
  ];

  it('样本材料在 TSV 中都有 Main 行，且可绝对值与 JSON 一致', () => {
    const failures: string[] = [];
    for (const { id, name } of samples) {
      const row = tsvRow(id, 'Main');
      expect(row, `${name} 缺少 Main 行`).toBeDefined();
      const mat = repo.getMaterial(id)!;
      const mainProps = mat.properties['silentgear:main'] ?? {};
      for (const [col, statKey] of MAIN_COLUMNS) {
        const tsvVal = decodeTsv(col, id, 'Main');
        const jsonVal = jsonSingleValue(mainProps[statKey]);
        if (tsvVal === undefined || jsonVal === undefined) continue; // 有一方缺 → 跳过
        if (Math.abs(tsvVal - jsonVal) > 1e-6) {
          failures.push(`${name}.${statKey}: TSV=${tsvVal} JSON=${jsonVal}`);
        }
      }
    }
    expect(failures, `TSV 与 JSON 不一致：\n${failures.join('\n')}`).toEqual([]);
  });

  it('已知有损列：Armor Durability（值×）、Projectile Accuracy（%）与 JSON 一致', () => {
    for (const id of ['silentgear:iron', 'silentgear:aluminum', 'silentgear:diamond', 'silentgear:wood']) {
      const mat = repo.getMaterial(id)!;
      const mainProps = mat.properties['silentgear:main'] ?? {};
      // armor_durability "15x" → 15
      const adur = decodeTsv('Armor Durability', id, 'Main')!;
      expect(adur, `${id} armor_durability`).toBeCloseTo(jsonSingleValue(mainProps.armor_durability)!, 5);
      // projectile_accuracy "110%" → 1.1
      const pacc = decodeTsv('Projectile Accuracy', id, 'Main');
      const jpacc = jsonSingleValue(mainProps.projectile_accuracy);
      if (pacc !== undefined && jpacc !== undefined) {
        expect(pacc / 100, `${id} projectile_accuracy`).toBeCloseTo(jpacc, 5);
      }
    }
  });

  it('特殊列：Ranged Damage / Ranged Speed（=draw_speed）/ Projectile Speed 剥 x 后与 JSON 一致', () => {
    for (const id of ['silentgear:iron', 'silentgear:diamond']) {
      const mat = repo.getMaterial(id)!;
      const mainProps = mat.properties['silentgear:main'] ?? {};
      for (const [col, statKey] of [
        ['Ranged Damage', 'ranged_damage'],
        ['Ranged Speed', 'draw_speed'],
        ['Projectile Speed', 'projectile_speed'],
      ] as const) {
        const tsv = decodeTsv(col, id, 'Main');
        const json = jsonSingleValue(mainProps[statKey]);
        if (tsv !== undefined && json !== undefined) expect(tsv, `${id}.${statKey}`).toBeCloseTo(json, 5);
      }
    }
  });

  it('MULTIPLY_TOTAL 渲染 x1.2：铝 rod durability / 钻石 rod harvest_speed', () => {
    const aluminumRod = repo.getMaterial('silentgear:aluminum')!.properties['silentgear:rod']!;
    expect(decodeTsv('Durability', 'silentgear:aluminum', 'Tool Rod')).toBeCloseTo(1.2, 5);
    expect((aluminumRod.durability as StatModifier).operation).toBe('MULTIPLY_TOTAL');
    expect((aluminumRod.durability as StatModifier).value).toBeCloseTo(0.2, 5);

    const diamondRod = repo.getMaterial('silentgear:diamond')!.properties['silentgear:rod']!;
    expect(decodeTsv('Harvest Speed', 'silentgear:diamond', 'Tool Rod')).toBeCloseTo(1.2, 5);
    expect((diamondRod.harvest_speed as StatModifier).operation).toBe('MULTIPLY_TOTAL');
    expect((diamondRod.harvest_speed as StatModifier).value).toBeCloseTo(0.2, 5);
  });

  it('只支持 coating 的材料（netherite）没有 Main 行，但有 Coating 行', () => {
    expect(tsvRow('silentgear:netherite', 'Main')).toBeUndefined();
    expect(tsvRow('silentgear:netherite', 'Coating')).toBeDefined();
    const netherite = repo.getMaterial('silentgear:netherite')!;
    expect(netherite.properties['silentgear:main']).toBeUndefined();
    expect(netherite.properties['silentgear:coating']).toBeDefined();
  });

  it('变体行 Parent 与 JSON parent 一致（wood/oak → silentgear:wood）', () => {
    const oakRow = tsvRow('silentgear:wood/oak', 'Main')!;
    expect(oakRow[header.indexOf('Parent')]).toBe('silentgear:wood');
    expect(repo.getMaterial('silentgear:wood/oak')!.parent).toBe('silentgear:wood');
  });
});
