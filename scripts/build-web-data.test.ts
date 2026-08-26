/**
 * Web 数据 bundle 往返验证
 *
 * 浏览器端拿 data-input.json → new DataRepository(parsed) 必须与 Node 端磁盘 repo 完全一致
 * （同一数据源、同一 Registry）。测两条：
 *   1. loadDataFromDisk 结果 JSON 序列化→解析 往返后，repo 关键查询与磁盘 repo 逐项相等；
 *   2. 实际生成的 web/public/data/data-input.json（build:web-data 产物）存在、可解析、同构。
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { loadDataFromDisk } from '../src/data/loadDisk.js';
import { DataRepository } from '../src/data/repository.js';
import { GearCalcEngine } from '../src/calc/index.js';
import { RatingEngine, transformUserRatingData } from '../src/rating/index.js';
import { GearOptimizer } from '../src/optimizer/index.js';

const DISK = () => new DataRepository(loadDataFromDisk({ dataDir: 'data', gearTypesJsonPath: 'src/data/gear-types.json' }));
const FROM_BUNDLE = () => new DataRepository(JSON.parse(readFileSync('web/public/data/data-input.json', 'utf8')));

describe('Web 数据 bundle', () => {
  it('build:web-data 产物存在且非空', () => {
    expect(existsSync('web/public/data/data-input.json')).toBe(true);
    const bytes = Buffer.byteLength(readFileSync('web/public/data/data-input.json', 'utf8'));
    expect(bytes).toBeGreaterThan(100_000);
  });

  it('bundle 重建 repo 与磁盘 repo 完全一致（材料/部件/gearTypes 数量与抽样属性）', () => {
    const disk = DISK();
    const bundle = FROM_BUNDLE();
    expect(bundle.materials.size).toBe(disk.materials.size);
    expect(bundle.parts.size).toBe(disk.parts.size);
    expect(bundle.gearTypes.size).toBe(disk.gearTypes.size);

    for (const id of ['silentgear:iron', 'silentgear:diamond', 'silentgear:wood/oak', 'silentgear:basalt']) {
      const a = disk.getMaterial(id)!;
      const b = bundle.getMaterial(id)!;
      expect(b.id).toBe(a.id);
      expect(b.name).toBe(a.name);
      expect(b.displayColor).toBe(a.displayColor);
      expect(b.gearTypeBlacklist).toEqual(a.gearTypeBlacklist);
      expect(b.properties['silentgear:main']?.['harvest_speed']).toEqual(a.properties['silentgear:main']?.['harvest_speed']);
    }

    // 主部件绑定一致性（gearType ↔ part）
    expect(bundle.getGearType('silentgear:pickaxe')?.mainPart).toBe(disk.getGearType('silentgear:pickaxe')?.mainPart);
    expect(bundle.parts.get('silentgear:pickaxe_head')?.partType).toBe(disk.parts.get('silentgear:pickaxe_head')?.partType);
  });

  it('bundle → 引擎管线冒烟（与 main.ts 完全相同的装配路径，锁定 Stage D demo 结果）', () => {
    // main.ts 路径：fetch bundle → 三个引擎 → optimize
    const dataInput = JSON.parse(readFileSync('web/public/data/data-input.json', 'utf8'));
    const repo = new DataRepository(dataInput);
    const maxLevels = (JSON.parse(readFileSync('src/data/trait-max-levels.json', 'utf8')) as { maxLevels: Record<string, number> }).maxLevels;
    const ratingData = JSON.parse(readFileSync('data/rating_data.json', 'utf8'));
    const calc = new GearCalcEngine(repo, maxLevels);
    const rating = new RatingEngine(repo, transformUserRatingData(ratingData));
    const optimizer = new GearOptimizer({ repo, calc, rating });

    const r = optimizer.optimize('silentgear:pickaxe', 'weighted', { topN: 1 });
    expect(r.candidateCount).toBe(9605); // 全池（黑名单后 main×rod）
    expect(r.truncated).toBe(true);
    const top = r.builds[0]!;
    expect(top.assembly.slots[0]!.materials[0]!.id).toBe('silentgear:azure_electrum');
    expect(top.assembly.slots[1]!.materials[0]!.id).toBe('silentgear:basalt');
    expect(Number.isFinite(top.total)).toBe(true);
  });
});
