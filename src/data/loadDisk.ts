/**
 * Data Layer —— Node 端磁盘加载器
 * 从 data/ 目录读原始 JSON，推导命名空间 id，组装 DataInput。
 * （浏览器端后续用打包器把同目录 JSON 内联，或从服务器 fetch——DataInput 形状不变。）
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { DataInput } from './repository.js';

const MATERIAL_NAMESPACE = 'silentgear';

/** 材料 id 由文件相对路径推导：iron.json → silentgear:iron；wood/oak.json → silentgear:wood/oak */
function walkJsonFiles(dir: string, base: string, out: { id: string; raw: unknown }[]): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walkJsonFiles(full, base, out);
    } else if (entry.endsWith('.json')) {
      const rel = relative(base, full).replace(/\.json$/, '').split(sep).join('/');
      out.push({ id: `${MATERIAL_NAMESPACE}:${rel}`, raw: JSON.parse(readFileSync(full, 'utf8')) });
    }
  }
}

export interface DiskLoadOptions {
  dataDir: string;
  gearTypesJsonPath: string;
}

export function loadDataFromDisk(opts: DiskLoadOptions): DataInput {
  const materialsDir = join(opts.dataDir, 'silentgear_materials');
  const partsDir = join(opts.dataDir, 'silentgear_parts');

  const materials: { id: string; raw: unknown }[] = [];
  walkJsonFiles(materialsDir, materialsDir, materials);

  const parts: { id: string; raw: unknown }[] = [];
  walkJsonFiles(partsDir, partsDir, parts);

  const gearTypesRaw: unknown = JSON.parse(readFileSync(opts.gearTypesJsonPath, 'utf8'));

  return { materials, parts, gearTypesRaw };
}
