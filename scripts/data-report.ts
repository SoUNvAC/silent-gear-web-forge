/**
 * 阶段 A 数据报告：打印材料/部件/gear type 的覆盖统计与装配矩阵。
 * 运行：npm run report（package.json 里加脚本）或 npx tsx scripts/data-report.ts
 */
import { loadDataFromDisk } from '../src/data/loadDisk.js';
import { DataRepository } from '../src/data/repository.js';

const repo = new DataRepository(loadDataFromDisk({ dataDir: 'data', gearTypesJsonPath: 'src/data/gear-types.json' }));

const materials = [...repo.materials.values()];
const parts = [...repo.parts.values()];
const gearTypes = [...repo.gearTypes.values()];

console.log('==== 阶段 A 数据报告 ====\n');

console.log(`材料总数: ${materials.length}`);
const byType = new Map<string, number>();
for (const m of materials) byType.set(m.type, (byType.get(m.type) ?? 0) + 1);
console.log(`  按类型: ${[...byType.entries()].map(([t, n]) => `${t}=${n}`).join(', ')}`);
const bySlot = new Map<string, number>();
for (const m of materials) for (const s of repo.materialAssemblySlots(m)) bySlot.set(s, (bySlot.get(s) ?? 0) + 1);
console.log(`  按槽位可用数: ${[...bySlot.entries()].map(([s, n]) => `${s.replace('silentgear:', '')}=${n}`).join(', ')}`);

console.log(`\n部件总数: ${parts.length}`);
const mainParts = repo.mainParts();
console.log(`  主部件: ${mainParts.length}`);
const upgrades = parts.filter((p) => p.type === 'upgrade');
console.log(`  upgrade: ${upgrades.length}（${upgrades.map((p) => p.id.replace('silentgear:', '')).join(', ')}）`);

console.log(`\ngear type 总数: ${gearTypes.length}`);
const concrete = gearTypes.filter((g) => g.mainPart);
const abstract = gearTypes.filter((g) => !g.mainPart);
console.log(`  具体: ${concrete.length}，抽象: ${abstract.length}`);

// 装配矩阵：每个具体 gear type 的必填/可附加槽
console.log('\n==== 装配矩阵（具体 gear type）====');
for (const g of concrete.sort((a, b) => a.id.localeCompare(b.id))) {
  const req = g.requiredParts.map((s) => s.replace('silentgear:', '')).join('+');
  const add = g.addableSlots.map((s) => s.replace('silentgear:', '')).join(',');
  const arm = g.armorDurabilityMultiplier ? ` ×${g.armorDurabilityMultiplier.toFixed(2)}` : '';
  console.log(`  ${g.id.replace('silentgear:', '').padEnd(20)} 必填[${req}] 可加[${add}] 耐久=${g.durabilityStat ?? '-'}${arm}`);
}

// 主部件→材料可用性：每个 gear type 能用的 main 材料数
console.log('\n==== 主部件材料可用性（main 槽材料数 / gear type）====');
const gearMainMaterials = new Map<string, string[]>();
for (const m of materials) {
  if (!m.properties['silentgear:main']) continue;
  for (const g of concrete) {
    if (repo.materialAllowedForGear(m, g.id)) {
      const list = gearMainMaterials.get(g.id) ?? [];
      list.push(m.id);
      gearMainMaterials.set(g.id, list);
    }
  }
}
for (const g of concrete.sort((a, b) => a.id.localeCompare(b.id))) {
  console.log(`  ${g.id.replace('silentgear:', '').padEnd(20)} ${gearMainMaterials.get(g.id)?.length ?? 0} 种`);
}

// 主槽材料可用性归类：区分「黑名单全禁用」与「无主槽（仅副槽/模板/添加剂）」
const allowedIds = new Set([...gearMainMaterials.values()].flat());
const mainMaterials = materials.filter((m) => m.properties['silentgear:main']);
const blacklistedEverywhere = mainMaterials.filter((m) => !allowedIds.has(m.id));
const noMainSlot = materials.filter((m) => !m.properties['silentgear:main']);
console.log(`\n主槽材料: ${mainMaterials.length}（其中 ${mainMaterials.length - blacklistedEverywhere.length} 种至少可装配于一个 gear type）`);
console.log(`  被黑名单全禁用的主槽材料: ${blacklistedEverywhere.length ? blacklistedEverywhere.map((m) => m.id).join(', ') : '(无)'}`);
console.log(`无主槽材料（仅副槽/模板/添加剂）: ${noMainSlot.length ? noMainSlot.map((m) => m.id.replace('silentgear:', '')).join(', ') : '(无)'}`);

// 每个材料支持的最小 gear type 数（黑名单过滤后）
console.log('\n==== 数据校验抽查 ====');
for (const id of ['silentgear:iron', 'silentgear:wood/oak', 'silentgear:dimerald', 'silentgear:netherite']) {
  const m = repo.getMaterial(id)!;
  const slots = repo.materialAssemblySlots(m).map((s) => s.replace('silentgear:', ''));
  console.log(`  ${m.id.padEnd(22)} type=${m.type} 槽位[${slots.join(',')}] 父=${m.parent ?? '-'}`);
}
