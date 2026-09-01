/**
 * 中文显示名映射（回退英文保底）
 *
 * 材料/部件/装备类型 id 是 translate key（如 material.silentgear.iron），仓库内无翻译表。
 * 这里内置中文映射：命中即中文，未命中回退为 id 末段（英文），绝不空白。
 */

const BARE = (id: string): string => id.replace(/^silentgear:/, '');

/** 34 具体装备类型 + 家族（键 = 去掉 silentgear: 前缀的裸名） */
const GEAR_TYPE_ZH: Record<string, string> = {
  // 近战
  sword: '剑', katana: '武士刀', machete: '砍刀', knife: '小刀', dagger: '匕首', spear: '长矛', mace: '钉头锤',
  // 混合
  trident: '三叉戟',
  // 远程
  bow: '弓', crossbow: '弩', slingshot: '弹弓',
  // 采集工具
  pickaxe: '镐', shovel: '铲', axe: '斧', hoe: '锄', hammer: '锤', excavator: '挖掘机', saw: '锯',
  sickle: '镰刀', mattock: '鹤嘴锄', paxel: '帕克索', prospector_hammer: '勘探锤', shears: '剪刀',
  // 其他工具
  fishing_rod: '钓竿', shield: '盾',
  // 护甲
  helmet: '头盔', chestplate: '胸甲', leggings: '护腿', boots: '靴子', elytra: '鞘翅',
  // 饰品
  ring: '戒指', bracelet: '手镯', necklace: '项链',
  // 弹射物
  arrow: '箭矢',
};

/** 抽象家族名（类型选择器分组标题） */
const FAMILY_ZH: Record<string, string> = {
  melee_weapon: '近战武器', hybrid_weapon: '混合武器', ranged_weapon: '远程武器',
  harvest_tool: '采集工具', tool: '工具', armor: '护甲', curio: '饰品', projectile: '弹射物',
};

const COLOR_ZH: Record<string, string> = {
  black: '黑', blue: '蓝', brown: '棕', cyan: '青', gray: '灰', green: '绿', light_blue: '淡蓝',
  light_gray: '淡灰', lime: '黄绿', magenta: '品红', orange: '橙', pink: '粉红', purple: '紫',
  red: '红', white: '白', yellow: '黄',
};

/** 材料中文名（常见材料人工译名；占位/变体走生成 + 回退） */
const MATERIAL_ZH: Record<string, string> = {
  // 金属 / 矿石 / 合金
  aluminum: '铝', aluminum_steel: '铝钢', azure_electrum: '天青琥珀金', azure_silver: '天青银',
  bismuth: '铋', bismuth_brass: '铋黄铜', bismuth_steel: '铋钢', blaze_gold: '烈焰金',
  brass: '黄铜', bronze: '青铜', compressed_iron: '压缩铁', copper: '铜', crimson_iron: '绯红铁',
  crimson_steel: '绯红钢', diamond: '钻石', dimerald: '钻翠石', electrum: '琥珀金', emerald: '绿宝石',
  enderium: '末影合金', gold: '金', high_carbon_steel: '高碳钢', invar: '殷钢', iron: '铁',
  lapis_lazuli: '青金石', lead: '铅', lumium: '荧光合金', netherite: '下界合金', nickel: '镍',
  osmium: '锇', platinum: '铂', redstone_alloy: '红石合金', refined_glowstone: '精炼荧石',
  refined_iron: '精炼铁', refined_obsidian: '精炼黑曜石', signalum: '信号合金', silver: '银',
  steel: '钢', tin: '锡', titanium: '钛', turtle: '龟甲', tyrian_steel: '泰瑞安钢', uranium: '铀',
  zinc: '锌',
  // 木头
  wood: '木头', 'wood/oak': '橡木', 'wood/spruce': '云杉木', 'wood/birch': '白桦木',
  'wood/jungle': '丛林木', 'wood/acacia': '金合欢木', 'wood/dark_oak': '深色橡木',
  'wood/crimson': '绯红菌木', 'wood/warped': '诡异菌木', 'wood/rough': '粗糙木', bamboo: '竹子',
  netherwood: '下界木',
  // 石头 / 矿物
  stone: '石头', 'stone/granite': '花岗岩', 'stone/diorite': '闪长岩', 'stone/andesite': '安山岩',
  basalt: '玄武岩', blackstone: '黑石', obsidian: '黑曜石', netherrack: '下界岩', end_stone: '末地石',
  prismarine: '海晶石', quartz: '石英', amethyst: '紫水晶', flint: '燧石', sandstone: '砂岩',
  'sandstone/red': '红砂岩', glowstone: '荧石', redstone: '红石',
  // 纤维 / 布料 / 杂物
  string: '线', sinew: '筋腱', vine: '藤蔓', flax: '亚麻', fine_silk: '精丝', fine_silk_cloth: '精丝布',
  fluffy_string: '绒线', wool: '羊毛', mixed_fabric: '混纺布', leather: '皮革', feather: '羽毛',
  paper: '纸', phantom_membrane: '幻翼膜', slime: '黏液', bone: '骨头', leaves: '树叶',
  crushed_shulker_shell: '粉碎潜影壳', blaze_rod: '烈焰棒', breeze_rod: '旋风棒', end_rod: '末地烛',
  barrier: '屏障',
  // 占位（无 properties，不会进下拉；保留译名防误读）
  crude_alloy: '粗制合金', metal_alloy: '金属合金', super_alloy: '超级合金',
  hybrid_gem: '混合宝石', sheet_metal: '金属板', example: '示例',
};

// 变体色：terracotta/* 与 wool/*（16 色）
for (const [c, zh] of Object.entries(COLOR_ZH)) {
  MATERIAL_ZH[`terracotta/${c}`] = `${zh}陶瓦`;
  MATERIAL_ZH[`wool/${c}`] = `${zh}羊毛`;
}

/** 槽位中文名（11 个 PartTypeId） */
const PART_TYPE_ZH: Record<string, string> = {
  main: '本体', rod: '手柄', tip: '尖端', setting: '镶嵌', grip: '握柄', binding: '绑带',
  cord: '弓弦', fletching: '箭羽', lining: '衬里', coating: '涂层', misc_upgrade: '升级部件',
};

export function gearTypeName(id: string): string {
  return GEAR_TYPE_ZH[BARE(id)] ?? BARE(id);
}

export function familyName(id: string): string {
  return FAMILY_ZH[BARE(id)] ?? BARE(id);
}

export function materialName(id: string): string {
  const bare = BARE(id);
  return MATERIAL_ZH[bare] ?? bare;
}

/** 材料英文名（仓库无翻译表，从 id 末段机械生成：下划线/斜杠 → 空格 + 首字母大写） */
export function materialNameEn(id: string): string {
  return BARE(id)
    .replace(/[_\//]+/g, ' ')
    .replace(/(^|\s)(\S)/g, (_m, p: string, c: string) => p + c.toUpperCase());
}

export function slotName(id: string): string {
  return PART_TYPE_ZH[BARE(id)] ?? BARE(id);
}

/** 升级部件中文名（5 个 misc_upgrade；未收录 → 机械英文回退） */
const PART_ZH: Record<string, string> = {
  magnetic_upgrade: '磁力升级', red_card_upgrade: '红卡升级', road_maker_upgrade: '铺路升级',
  spoon_upgrade: '勺子升级', wide_plate_upgrade: '宽板升级',
};
export function partName(id: string): string {
  const bare = BARE(id);
  return PART_ZH[bare] ?? materialNameEn(id);
}

/** 常见特质中文名；未收录时保留可读英文，不伪造含义。 */
const TRAIT_ZH: Record<string, string> = {
  accelerate: '加速', brittle: '易碎', chipping: '崩刃', crude: '粗制', crushing: '粉碎',
  dulling: '钝化', eroded: '侵蚀', flexible: '柔韧', hard: '坚硬', jagged: '锯齿',
  light: '轻盈', lustrous: '璀璨', malleable: '可塑', organic: '有机', rustic: '质朴',
  sharp: '锋利', soft: '柔软', synergistic: '协同', magnetic: '磁力', spoon: '勺子',
};

export function traitName(id: string): string {
  const bare = BARE(id);
  return TRAIT_ZH[bare] ?? bare.replace(/_/g, ' ');
}
