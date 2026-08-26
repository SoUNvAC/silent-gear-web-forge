/**
 * gear-types-reference.md → src/data/gear-types.json 转换脚本
 *
 * 数据全部来源于 data/gear-types-reference.md（源码静态分析整理）：
 *   §1  GearType 字段（armorDurabilityMultiplier / animationFrames）
 *   §3  继承树 + 属性组（方括号 = 显式声明，未列继承父类）+ 护甲倍率
 *   §5.1 必填槽位表
 *   §5.2 可附加槽位表（含 elytra / fishing_rod 特例）
 *   §5.3 gear type ↔ 主部件绑定表
 *
 * 对账：scripts/gear-types.reconcile.test.ts 会重新解析 markdown 逐项核对，防转录失真。
 * 备注：markdown §5.1 未单列 trident，按 GearTool（非 GearRangedWeapon）归类 main+rod。
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** gear-types.json 的条目（裸名，parser 负责加命名空间） */
interface Entry {
  parent: string | null;
  propertyGroups?: string[];
  mainPart?: string | null;
  requiredParts?: string[];
  addableSlots?: string[];
  durabilityStat?: 'DURABILITY' | 'ARMOR_DURABILITY';
  armorDurabilityMultiplier?: number | null;
  animationFrames?: number;
}

// §5.2 可附加槽：按装备类别
const TOOL_SLOTS = ['tip', 'binding', 'grip', 'coating']; // tip/binding=all, grip=tool, coating=all(除 elytra)
const RANGED_SLOTS = ['tip', 'binding', 'grip', 'coating', 'cord']; // cord=ranged_weapon
const ARMOR_SLOTS = ['tip', 'binding', 'coating', 'lining']; // lining=armor
const CURIO_SLOTS = ['tip', 'binding', 'coating'];
const ARROW_SLOTS = ['tip', 'binding', 'coating', 'fletching']; // fletching=projectile
const ELYTRA_SLOTS = ['tip', 'binding', 'lining']; // coating 黑名单、lining 特例放行
const FISHING_SLOTS = ['tip', 'binding', 'grip', 'coating', 'cord']; // cord 特例放行

function melee(mainPart: string): Entry {
  return { parent: 'melee_weapon', mainPart, requiredParts: ['main', 'rod'], addableSlots: TOOL_SLOTS, durabilityStat: 'DURABILITY' };
}
function harvest(mainPart: string): Entry {
  return { parent: 'harvest_tool', mainPart, requiredParts: ['main', 'rod'], addableSlots: TOOL_SLOTS, durabilityStat: 'DURABILITY' };
}
function ranged(mainPart: string): Entry {
  return { parent: 'ranged_weapon', mainPart, requiredParts: ['main', 'rod', 'cord'], addableSlots: RANGED_SLOTS, durabilityStat: 'DURABILITY', animationFrames: 4 };
}
function armorItem(mainPart: string, mult: number): Entry {
  return { parent: 'armor', mainPart, requiredParts: ['main'], addableSlots: ARMOR_SLOTS, durabilityStat: 'ARMOR_DURABILITY', armorDurabilityMultiplier: mult };
}

const gearTypes: Record<string, Entry> = {
  // ---- 抽象类型（§3 继承树；仅 parent + 显式属性组）----
  all: { parent: null, propertyGroups: ['SPECIAL', 'GENERAL'] },
  tool: { parent: 'all', propertyGroups: ['SPECIAL', 'GENERAL', 'HARVEST', 'ATTACK'] },
  weapon: { parent: 'tool' },
  melee_weapon: { parent: 'weapon' },
  ranged_weapon: { parent: 'weapon', propertyGroups: ['SPECIAL', 'GENERAL', 'PROJECTILE'] },
  hybrid_weapon: { parent: 'weapon', propertyGroups: ['SPECIAL', 'GENERAL', 'ATTACK', 'PROJECTILE'] },
  harvest_tool: { parent: 'tool' },
  armor: { parent: 'all', propertyGroups: ['SPECIAL', 'GENERAL', 'ARMOR'] },
  curio: { parent: 'all', propertyGroups: ['SPECIAL'] },
  projectile: { parent: 'all', propertyGroups: ['SPECIAL', 'GENERAL', 'PROJECTILE'] },

  // ---- 近战武器（§5.1 普通工具/近战 = main+rod；§5.3 主部件绑定）----
  sword: melee('sword_blade'),
  katana: melee('katana_blade'),
  machete: melee('machete_blade'),
  knife: melee('knife_blade'),
  dagger: melee('dagger_blade'),
  spear: melee('spear_tip'),
  mace: melee('mace_core'),

  // ---- 混合武器（§5.1 未单列，按 GearTool 归类）----
  trident: { parent: 'hybrid_weapon', mainPart: 'trident_prongs', requiredParts: ['main', 'rod'], addableSlots: TOOL_SLOTS, durabilityStat: 'DURABILITY' },

  // ---- 远程武器（§5.1 远程 = main+rod+cord）----
  bow: ranged('bow_limbs'),
  crossbow: ranged('crossbow_limbs'),
  slingshot: ranged('slingshot_limbs'),

  // ---- 采集工具（§5.1 普通工具 = main+rod）----
  pickaxe: harvest('pickaxe_head'),
  shovel: harvest('shovel_head'),
  axe: harvest('axe_head'),
  hoe: harvest('hoe_head'),
  hammer: { parent: 'pickaxe', mainPart: 'hammer_head', requiredParts: ['main', 'rod'], addableSlots: TOOL_SLOTS, durabilityStat: 'DURABILITY' },
  excavator: { parent: 'shovel', mainPart: 'excavator_head', requiredParts: ['main', 'rod'], addableSlots: TOOL_SLOTS, durabilityStat: 'DURABILITY' },
  saw: { parent: 'axe', mainPart: 'saw_blade', requiredParts: ['main', 'rod'], addableSlots: TOOL_SLOTS, durabilityStat: 'DURABILITY' },
  sickle: { parent: 'harvest_tool', mainPart: 'sickle_blade', requiredParts: ['main', 'rod'], addableSlots: TOOL_SLOTS, durabilityStat: 'DURABILITY' },
  mattock: harvest('mattock_head'),
  paxel: harvest('paxel_head'),
  prospector_hammer: { parent: 'pickaxe', mainPart: 'prospector_hammer_head', requiredParts: ['main', 'rod'], addableSlots: TOOL_SLOTS, durabilityStat: 'DURABILITY' },
  shears: harvest('shear_blades'),

  // ---- 其他 tool 子类 ----
  fishing_rod: { parent: 'tool', mainPart: 'fishing_reel_and_hook', requiredParts: ['main', 'rod', 'cord'], addableSlots: FISHING_SLOTS, durabilityStat: 'DURABILITY' },
  shield: { parent: 'tool', mainPart: 'shield_plate', requiredParts: ['main', 'rod'], addableSlots: TOOL_SLOTS, durabilityStat: 'ARMOR_DURABILITY', armorDurabilityMultiplier: 337 / 15 },

  // ---- 护甲（§1/§3 倍率；§5.1 = main）----
  helmet: armorItem('helmet_plates', 11),
  chestplate: armorItem('chestplate_plates', 16),
  leggings: armorItem('legging_plates', 15),
  boots: armorItem('boot_plates', 13),
  elytra: { parent: 'armor', mainPart: 'elytra_wings', requiredParts: ['main', 'binding'], addableSlots: ELYTRA_SLOTS, durabilityStat: 'ARMOR_DURABILITY', armorDurabilityMultiplier: 25 },

  // ---- 饰品（§5.1 curio = main+setting）----
  ring: { parent: 'curio', mainPart: 'ring_shank', requiredParts: ['main', 'setting'], addableSlots: CURIO_SLOTS },
  bracelet: { parent: 'curio', mainPart: 'bracelet_band', requiredParts: ['main', 'setting'], addableSlots: CURIO_SLOTS },
  necklace: { parent: 'curio', mainPart: 'necklace_chain', requiredParts: ['main', 'setting'], addableSlots: CURIO_SLOTS },

  // ---- 弹药（§5.1 arrow = main+rod+fletching，可再装 tip）----
  arrow: { parent: 'projectile', mainPart: 'arrow_heads', requiredParts: ['main', 'rod', 'fletching'], addableSlots: ARROW_SLOTS, durabilityStat: 'DURABILITY' },
};

// 自检：具体类型必须有主部件和必填槽
for (const [name, e] of Object.entries(gearTypes)) {
  const concrete = e.requiredParts !== undefined || e.mainPart !== undefined;
  if (concrete && (!e.mainPart || (e.requiredParts ?? []).length === 0)) {
    throw new Error(`gear type 配置不完整: ${name}`);
  }
}

const payload = {
  version: '3.6.6',
  source: 'data/gear-types-reference.md',
  baseValue: 0,
  gearTypes,
};

const outPath = join(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', 'src', 'data', 'gear-types.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`✓ 已生成 ${outPath}（${Object.keys(gearTypes).length} 个 gear type）`);
