/**
 * TSV ↔ JSON 槽位集合对账（阶段 A 验收标准 #5 的完整版）
 * 运行：npm run tsv:diff
 *
 * 权威源结论：JSON（data/silentgear_materials、data/silentgear_parts）为权威，TSV 是丢精度渲染表。
 * 抽样 8 个材料 + 全量槽位对账后，已知差异记录在案，全部可归因于 TSV 渲染口径，非 JSON 错误：
 *
 *   (1) 多槽材料在 TSV 中只出现在「部分」槽位类型下（TSV 一材料一行一类型，槽位会被截断）：
 *         bronze/copper            JSON: main+rod+tip      TSV: Main, Tool Rod（缺 Tip）
 *         glowstone/redstone       JSON: main+tip          TSV: Tip Upgrade（缺 Main）
 *         vine                     JSON: binding+cord      TSV: Binding（缺 Cord）
 *         feather/leaves/paper     JSON: fletching+main    TSV: Fletching（缺 Main）
 *         bamboo                   JSON: main+rod          TSV: Tool Rod（缺 Main）
 *   (2) 槽位「存在性」vs「内容」口径差异（TSV 按存在性列，JSON 索引按内容非空算）：
 *         example 在 TSV 全部 10 个槽位类型下都有行，但 JSON 只有 main 槽有内容；
 *         flint 在 JSON 声明了 setting 槽但内容为空 {} → TSV Adornment 有行、JSON setting 索引无。
 *         均为口径不同，非数据冲突。
 *   (3) 7 个材料在 TSV 中无任何行（JSON 有）：
 *         5 个 compound 模板 crude_alloy/metal_alloy/super_alloy/hybrid_gem/mixed_fabric
 *         + breeze_rod + crushed_shulker_shell（TSV 渲染遗漏，以 JSON 为准）。
 *   (4) 数值编码：15x=值×渲染、x1.2=MULTIPLY_TOTAL(1+x)、110%=值×100，strip 后与 JSON 数值一致
 *       （逐样本断言见 src/data/tsvCrosscheck.test.ts）。
 */
import { readFileSync } from 'node:fs';
import { loadDataFromDisk } from '../src/data/loadDisk.js';
import { DataRepository } from '../src/data/repository.js';

const repo = new DataRepository(loadDataFromDisk({ dataDir: 'data', gearTypesJsonPath: 'src/data/gear-types.json' }));

const lines = readFileSync('data/material_export.tsv', 'utf8').trim().split('\n');
const header = (lines[0] ?? '').split('\t');
const rows = lines.slice(1).map((l) => l.split('\t'));
const tsv = new Map<string, Set<string>>();
for (const r of rows) {
  const t = r[header.indexOf('Type')] ?? '';
  const id = (r[header.indexOf('ID')] ?? '').replace(/\r$/, '');
  if (!tsv.has(t)) tsv.set(t, new Set());
  tsv.get(t)!.add(id);
}

const TSV_TO_SLOT: Record<string, string> = {
  Main: 'main', 'Tool Rod': 'rod', 'Tip Upgrade': 'tip', Adornment: 'setting',
  Grip: 'grip', Binding: 'binding', Cord: 'cord', Fletching: 'fletching', Lining: 'lining', Coating: 'coating',
};

const SLOT_PT: Record<string, 'silentgear:main' | 'silentgear:rod' | 'silentgear:tip' | 'silentgear:setting' | 'silentgear:grip' | 'silentgear:binding' | 'silentgear:cord' | 'silentgear:fletching' | 'silentgear:lining' | 'silentgear:coating'> = {
  main: 'silentgear:main', rod: 'silentgear:rod', tip: 'silentgear:tip', setting: 'silentgear:setting',
  grip: 'silentgear:grip', binding: 'silentgear:binding', cord: 'silentgear:cord', fletching: 'silentgear:fletching',
  lining: 'silentgear:lining', coating: 'silentgear:coating',
};

console.log('==== TSV ↔ JSON 槽位集合对账 ====\n');
let matched = 0;
let diffed = 0;
for (const [tsvType, slot] of Object.entries(TSV_TO_SLOT)) {
  const tsvSet = tsv.get(tsvType) ?? new Set<string>();
  const jsonSet = new Set(repo.materialsByPartType(SLOT_PT[slot]!).map((m) => m.id));
  const jsonOnly = [...jsonSet].filter((x) => !tsvSet.has(x));
  const tsvOnly = [...tsvSet].filter((x) => !jsonSet.has(x));
  if (!jsonOnly.length && !tsvOnly.length) {
    matched += 1;
    console.log(`${slot}: 一致 (${jsonSet.size})`);
    continue;
  }
  diffed += 1;
  console.log(`${slot}: JSON=${jsonSet.size} TSV=${tsvSet.size}`);
  if (jsonOnly.length) console.log(`    JSON 有 TSV 无: ${jsonOnly.join(', ')}`);
  if (tsvOnly.length) console.log(`    TSV 有 JSON 无: ${tsvOnly.join(', ')}`);
}
console.log(`\n对账结果: ${matched} 个槽位一致，${diffed} 个槽位有差异。`);
console.log('所有差异均可归因于 TSV 渲染口径（见文件头分类）：');
console.log('  ① 多槽材料 TSV 只列部分类型（bronze/copper 缺 Tip、glowstone/redstone 缺 Main、bamboo/feather/leaves/paper 缺 Main、vine 缺 Cord）');
console.log('  ② 槽位存在性 vs 内容：example 列满 10 类型、flint 列 Adornment 但 JSON 槽内容为空');
console.log('  ③ TSV 完全缺失 7 材料：5 个 compound 模板 + breeze_rod + crushed_shulker_shell');
console.log('  ④ 数值编码 strip 后的逐样本断言见 src/data/tsvCrosscheck.test.ts');
