/**
 * Web 数据 bundle 生成脚本
 *
 * 1) 磁盘原始数据（silentgear_materials / silentgear_parts / gear-types.json）打包成
 *    单个 JSON：web/public/data/data-input.json（DataInput 形状，浏览器 fetch 后直接
 *    new DataRepository(input)）。
 * 2) 解析 data/traits_list_chs.md（游戏 sgear_traits dump_md 生成，权威源）→
 *    web/public/data/trait-descriptions.json（trait id → 中文描述），供 UI 悬浮显示。
 *
 * 与 Node 端 loadDataFromDisk 同一数据源、同一形状 —— 浏览器与 Node 共用一个 Registry。
 */
import { mkdirSync, writeFileSync, statSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { loadDataFromDisk } from '../src/data/loadDisk.js';

// ---- 1) 主数据 bundle（DataInput 形状，零改动） ----
const input = loadDataFromDisk({ dataDir: 'data', gearTypesJsonPath: 'src/data/gear-types.json' });
const outPath = 'web/public/data/data-input.json';

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(input), 'utf8');

const bytes = statSync(outPath).size;
console.log(
  `✓ 已生成 ${outPath}（materials=${input.materials.length}, parts=${input.parts.length}, ${(bytes / 1024 / 1024).toFixed(2)} MB）`,
);

// ---- 2) trait 中文描述（来自 traits_list_chs.md 权威 dump） ----
// 格式：`### [名称](.../silentgear_traits/<id>.json)` 后紧跟首条 `- 描述` 行。
// id 取 URL 尾段 .json 文件名（括号内显示名与 id 不一定一致，如 "Gold Digger"→gold_digger）。
const chsMd = readFileSync('data/traits_list_chs.md', 'utf8').split(/\r?\n/);
const traitDescriptions: Record<string, string> = {};
for (let i = 0; i < chsMd.length; i++) {
  const head = chsMd[i]!.match(/^### \[[^\]]+\]\(.*\/([^/]+)\.json\)/);
  if (!head) continue;
  const id = `silentgear:${head[1]}`;
  for (let j = i + 1; j < chsMd.length; j++) {
    if (/^### /.test(chsMd[j]!)) break;
    const bm = chsMd[j]!.match(/^- (.+)$/);
    if (bm) {
      traitDescriptions[id] = bm[1]!.trim().replace(/\*\*/g, '');
      break;
    }
  }
}
const descOut = 'web/public/data/trait-descriptions.json';
writeFileSync(descOut, JSON.stringify(traitDescriptions, null, 2), 'utf8');
console.log(`✓ 已生成 ${descOut}（traits=${Object.keys(traitDescriptions).length}）`);
