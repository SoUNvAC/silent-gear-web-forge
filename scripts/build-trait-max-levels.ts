/**
 * traits_list.md → src/data/trait-max-levels.json
 * 提取每个 trait 的 ID 与 Max Level（Pass1 traits 聚合公式的 clamp 上界）。
 * 源：data/traits_list.md（sgear_traits dump_md，SG 3.6.6）
 * 运行：npm run build:traits
 */
import { readFileSync, writeFileSync } from 'node:fs';

const text = readFileSync('data/traits_list.md', 'utf8');
const lines = text.split('\n');
const maxLevels: Record<string, number> = {};
let curId: string | null = null;

for (const line of lines) {
  const idM = line.match(/^- ID: `([^`]+)`$/);
  if (idM) {
    curId = idM[1] ?? null;
    continue;
  }
  if (curId) {
    const lvlM = line.match(/^- Max Level: (\d+)$/);
    if (lvlM) {
      maxLevels[curId] = Number(lvlM[1]);
      curId = null;
    }
  }
}

if (curId !== null) throw new Error(`未闭合的 trait 块：最后一个 ID=${curId} 后没有 Max Level`);
const out = { version: 'sg-3.6.6', source: 'data/traits_list.md', count: Object.keys(maxLevels).length, maxLevels };
writeFileSync('src/data/trait-max-levels.json', JSON.stringify(out, null, 2) + '\n');
console.log(`写入 src/data/trait-max-levels.json：${Object.keys(maxLevels).length} 个 trait`);
