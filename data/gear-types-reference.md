# Silent Gear — GearType 参考手册

> 面向开发者的 GearType 体系速查：数据结构、继承树、基础数值（B）、槽位映射（Tool→Slot）。
> 基于本项目源码整理，主要文件：
> - `net/silentchaos512/gear/setup/gear/GearTypes.java` — GearType 注册
> - `net/silentchaos512/gear/api/item/GearType.java` — GearType 记录类
> - `net/silentchaos512/gear/data/PartsProvider.java` — 各工具基础数值（`MAIN_PART_PROPERTIES`）
> - `net/silentchaos512/gear/setup/GearItemSets.java` — gear type ↔ 主部件绑定
> - `net/silentchaos512/gear/api/item/GearItem.java` / `GearTool.java` / `GearRangedWeapon.java` — 必填槽位

---

## 1. GearType 数据结构

`GearType` 是 Java `record`（`GearType.java:25`），字段如下：

| 字段 | 类型 | 含义 |
|---|---|---|
| `parent` | `@Nullable Supplier<GearType>` | 父类型；`matches()` 沿父链递归判断归属 |
| `animationFrames` | `int` | 模型动画帧数（弓/弩/弹弓 = 4） |
| `itemAbilities` | `Set<ItemAbility>` | 该工具可执行的方块动作（`ItemAbility`，如 `PICKAXE_DIG`） |
| `armorDurabilityMultiplier` | `float` | 护甲耐久倍率；护甲/盾的耐久用它乘 `armor_durability` |
| `durabilityStat` | `Supplier<NumberProperty>` | 耐久口径：普通工具 = `DURABILITY`；护甲/盾 = `ARMOR_DURABILITY` |
| `relevantPropertyGroups` | `Set<GearPropertyGroup>` | 参与计算的属性组（空集合 → 继承父类型） |

关键行为：
- **`matches(type)`**（`GearType.java:82`）：`this == type` 或沿 parent 链向上匹配。因此 `sword.matches(tool) == true`（sword → melee_weapon → weapon → tool），这决定了部件的 `gear_type` 能否装上该装备。
- **`getBaseDurability()`**（`GearType.java:113`）：普通工具 = `baseProperties[durability]`；护甲/盾 = `armorDurabilityMultiplier × baseProperties[armor_durability]`。
- **`relevantPropertyGroups()`**（`GearType.java:122`）：为空时递归继承父类型；`getRelevantProperties()` 展开为该类型实际参与计算的属性列表。

---

## 2. 属性组（GearPropertyGroups）与属性

`GearPropertyGroups` 是枚举（`GearPropertyGroups.java:10`）：`SPECIAL / GENERAL / HARVEST / ATTACK / PROJECTILE / ARMOR`。每个属性在注册时通过 `.group(...)` 归属（`GearProperties.java`）。

| 组 | 属性（`silentgear` 命名空间） |
|---|---|
| **SPECIAL** | `additive`、`traits` |
| **GENERAL** | `durability`、`armor_durability`、`repair_efficiency`、`repair_value`、`enchantment_value`、`charging_value`、`rarity` |
| **HARVEST** | `harvest_tier`、`harvest_speed`、`block_reach` |
| **ATTACK** | `attack_damage`、`attack_speed`、`attack_reach`、`magic_damage` |
| **PROJECTILE** | `ranged_damage`、`draw_speed`、`projectile_speed`、`projectile_accuracy` |
| **ARMOR** | `armor`、`armor_toughness`、`knockback_resistance`、`magic_armor` |

> 注意：组是动态枚举的，`getProperties()` 实时扫描 `SgRegistries.GEAR_PROPERTY`（`GearPropertyGroups.java:37`）。第三方 mod 可以自由新增属性组，但标准组只有以上 6 个。

---

## 3. GearType 继承树 + 属性组

注册见 `GearTypes.java`。方括号内为显式声明的属性组（未列出者继承父类）。

```
all  [SPECIAL, GENERAL]
├── tool  [SPECIAL, GENERAL, HARVEST, ATTACK]
│   ├── weapon  （无额外组，继承 tool）
│   │   ├── melee_weapon  （继承 weapon）
│   │   │   ├── sword          （ItemAbilities: DEFAULT_SWORD_ACTIONS）
│   │   │   ├── katana         （同上）
│   │   │   ├── machete        （SWORD_DIG, SWORD_SWEEP, AXE_DIG）
│   │   │   ├── spear          （SWORD_DIG）
│   │   │   ├── mace           （无）
│   │   │   ├── dagger         （SWORD_DIG）
│   │   │   └── knife          （SWORD_DIG）
│   │   ├── ranged_weapon  [SPECIAL, GENERAL, PROJECTILE]
│   │   │   ├── bow            （animationFrames=4）
│   │   │   ├── crossbow       （animationFrames=4）
│   │   │   └── slingshot      （animationFrames=4）
│   │   └── hybrid_weapon  [SPECIAL, GENERAL, ATTACK, PROJECTILE]
│   │       └── trident        （DEFAULT_TRIDENT_ACTIONS）
│   ├── harvest_tool  （继承 tool）
│   │   ├── pickaxe  ├─ hammer（parent=pickaxe）  ├─ prospector_hammer（parent=pickaxe）
│   │   ├── shovel   ├─ excavator（parent=shovel）
│   │   ├── axe      ├─ saw（parent=axe）
│   │   ├── hoe      ├─ sickle（parent=harvest_tool, HOE_DIG）
│   │   ├── shears
│   │   ├── mattock  （SHOVEL_DIG, AXE_DIG, HOE_DIG, HOE_TILL）
│   │   └── paxel    （AXE/PICKAXE/SHOVEL 全套动作）
│   ├── fishing_rod  [SPECIAL, GENERAL]
│   └── shield       [SPECIAL, GENERAL]  durabilityStat=ARMOR_DURABILITY, 倍率=337/15
├── armor  [SPECIAL, GENERAL, ARMOR]  durabilityStat=ARMOR_DURABILITY
│   ├── helmet      （倍率 11）
│   ├── chestplate  （倍率 16）
│   ├── leggings    （倍率 15）
│   ├── boots       （倍率 13）
│   └── elytra      （倍率 25）
├── curio  [SPECIAL]
│   ├── bracelet / necklace / ring
└── projectile  [SPECIAL, GENERAL, PROJECTILE]
    └── arrow
```

> `hammer`/`excavator`/`saw`/`prospector_hammer` 的父类型分别是 `pickaxe`/`shovel`/`axe`/`pickaxe`，因此 `hammer.matches(pickaxe) == true`。

---

## 4. B / baseValue：工具基础数值表

**GearType 本身不含任何 per-stat 基础值**——属性注册时 `baseValue` 全部为 0（如 `GearProperties.java:43`）。每个工具的"底子"实际由**主部件（main part）的 `properties`** 提供，定义在 `PartsProvider.MAIN_PART_PROPERTIES`（`PartsProvider.java:123`），并生成到 `silentgear_parts/<主部件>.json`。

合成公式（详见第 6 节）：`final = clamp( [ (0 + AVERAGE材质) × (1+Σmul1) × Π(1+mul2) ] + ΣADD )`。因此部件的 `ADD` 就是"这把工具的底子"，材质的 `AVERAGE` 是主要数值来源。

| 工具 | 主部件 JSON | 基础属性（part `properties`） |
|---|---|---|
| sword | sword_blade | attack_damage **+3.0**、attack_speed **+1.6**、repair_efficiency 1 |
| katana | katana_blade | attack_damage +4.0、attack_speed +1.4、repair 1、durability ×0.125、enchantment_value ×0.9 |
| mace | mace_core | attack_damage +3.0、attack_speed +0.6、repair 1、durability ×2 |
| dagger | dagger_blade | attack_damage +2.0、attack_speed +2.8、repair 2、attack_damage ×0.5 |
| knife | knife_blade | attack_damage +1.0、attack_speed +2.4、repair 2、attack_damage ×0.5、durability ×1.25 |
| spear | spear_tip | attack_damage +3.0、attack_speed +1.3、repair 1.25、durability ×0.8、**attack_reach +1** |
| trident | trident_prongs | attack_damage +4.0、attack_speed +1.1、ranged_damage +1、draw_speed +1 |
| pickaxe | pickaxe_head | attack_damage +1.0、attack_speed +1.2、repair 1 |
| shovel | shovel_head | attack_damage +1.5、attack_speed +1.0、repair 2 |
| axe | axe_head | attack_damage +5.0、attack_speed +1.0、repair 1 |
| hoe | hoe_head | attack_damage ×0、attack_speed +3.0、repair 1 |
| hammer | hammer_head | attack_damage +4.0、attack_speed +0.8、repair 1.5、durability ×2、harvest_speed ×0.5、enchantment_value ×0.5 |
| excavator | excavator_head | attack_damage +2.0、attack_speed +1.0、repair 2、durability ×2、harvest_speed ×0.5、enchantment_value ×0.5 |
| saw | saw_blade | attack_damage +2.0、attack_speed +1.6、repair 1.5、durability ×2、harvest_speed ×0.25、enchantment_value ×0.5 |
| sickle | sickle_blade | attack_damage +1.0、attack_speed +2.2、repair 1 |
| mattock | mattock_head | attack_damage +1.0、attack_speed +1.4、repair 1.25、durability ×1.25、harvest_speed ×0.75、enchantment_value ×0.75 |
| paxel | paxel_head | attack_damage +3.0、attack_speed +1.0、repair 1.2、durability ×1.35、harvest_speed ×0.8、enchantment_value ×0.7 |
| prospector_hammer | prospector_hammer_head | attack_damage +2.0、attack_speed +1.4、repair 1.5、durability ×0.75、harvest_speed ×0.75、enchantment_value ×0.75 |
| bow | bow_limbs | ranged_damage +1.0、draw_speed +1.0、repair 1、enchantment_value ×0.55 |
| crossbow | crossbow_limbs | ranged_damage +2.0、draw_speed +1.0、repair 1、enchantment_value ×0.55 |
| slingshot | slingshot_limbs | ranged_damage +0.5、draw_speed +1.5、repair 2、ranged_damage ×0.25、enchantment_value ×0.35 |
| shield | shield_plate | repair 1（耐久走 ARMOR_DURABILITY × 337/15） |
| fishing_rod | fishing_reel_and_hook | attack_speed +4.0、durability ×0.5、enchantment_value ×0.25、repair 1.25 |
| helmet / chestplate / leggings / boots | *_plates | 仅 repair 1（护甲值来自材质 `armor`、`armor/*`） |
| elytra | elytra_wings | armor ×0.35、armor **-3.5**、repair 1 |
| arrow | arrow_heads | 仅 enchantment_value ×0 |
| bracelet / necklace / ring | *_band/*_chain/*_shank | 无（`{}`） |

> 上表中 ×0.9 表示 `MULTIPLY_BASE -0.1`、×1.35 表示 `MULTIPLY_BASE +0.35` 等；`repair 1` 为 `AVERAGE 1.0`。

**耐久公式**：普通工具 `getBaseDurability = baseProperties[durability]`；护甲/盾 = `armorDurabilityMultiplier × baseProperties[armor_durability]`（`GearType.java:113`）。例：铁头盔基础耐久 = `11 × 铁材质的 armor_durability`。

---

## 5. Tool → Slot 映射

槽位由 **① 必填槽位** + **② 可附加槽位** 两套机制共同决定。

### 5.1 必填槽位 `getRequiredParts()`

| 类别 | 必填 part_type | 来源 |
|---|---|---|
| 普通工具 / 近战武器 | **main + rod** | `GearTool.java:22` |
| 远程武器（bow/crossbow/slingshot） | **main + rod + cord** | `GearRangedWeapon.java:19` |
| shield | **main + rod** | `GearShieldItem.java:59` |
| fishing_rod | **main + rod + cord** | `GearFishingRodItem.java:48` |
| arrow | **main + rod + fletching** | `GearArrowItem.java:42`（可再装 tip） |
| elytra | **main + binding** | `GearElytraItem.java:38` |
| curio（ring/bracelet/necklace） | **main + setting** | `GearCurioItem.java:35` |
| 护甲（helmet 等） | **main**（默认） | `GearItem.java:27` |

### 5.2 可附加槽位 = 部件 `gear_type` + `part_type`

部件自身的 `gear_type` 只要 `matches(装备的 gearType)` 就能装上（`CoreGearPart.canAddToGear`，`CoreGearPart.java:162`），填进 `part_type` 对应的槽：

| 部件 | part_type | gear_type | 可用范围 |
|---|---|---|---|
| tip | tip | `all` | 所有装备可加尖端 |
| binding | binding | `all` | 所有装备可加绑带 |
| grip | grip | `tool` | 所有工具类 |
| coating | coating | `all`（黑名单含 elytra） | 通用涂层 |
| cord | cord | `ranged_weapon` | 远程武器（钓鱼竿特例放行，`GearFishingRodItem.java:72`） |
| lining | lining | `armor` | 护甲（elytra 特例放行，`GearElytraItem.java:66`） |
| fletching | fletching | `projectile` | 箭矢 |

> 另有 `misc_upgrade` 部件类型（`PartTypes.java:71`）：`isUpgrade(true)`、`canPaint(false)`、`maxPerItem=256`、可移除。它不是组装槽，而是背包/装备上的升级部件（一次最多 256 个），逻辑走 upgrade 通道而非属性合成。

### 5.3 gear type ↔ 主部件绑定

`GearItemSets`（`GearItemSets.java:21-61`）为每个 gear type 一对一绑定 `MainPartItem`：

```
sword→sword_blade, katana→katana_blade, machete→machete_blade, knife→knife_blade,
dagger→dagger_blade, spear→spear_tip, trident→trident_prongs, mace→mace_core,
shield→shield_plate, bow→bow_limbs, crossbow→crossbow_limbs, slingshot→slingshot_limbs,
arrow→arrow_heads, pickaxe→pickaxe_head, shovel→shovel_head, axe→axe_head,
paxel→paxel_head, hammer→hammer_head, excavator→excavator_head, saw→saw_blade,
prospector_hammer→prospector_hammer_head, hoe→hoe_head, mattock→mattock_head,
sickle→sickle_blade, shears→shear_blades, fishing_rod→fishing_reel_and_hook,
helmet→helmet_plates, chestplate→chestplate_plates, leggings→legging_plates,
boots→boot_plates, elytra→elytra_wings, ring→ring_shank, bracelet→bracelet_band,
necklace→necklace_chain
```

主部件注册时的 `gear_type` 即装备类型本身（`GearItemSet.java:49`）；`PartType.MAIN` 通过 `MainPartItem.getGearType()` 反向查找某装备的主部件（`PartTypes.java:23`）。

---

## 6. 附：属性合成公式速查

普通工具属性计算（`GearData.tryRecalculateGearData`，`GearData.java:117`）：

1. **收集**：`PartList.getPropertyModifiersFromParts`（`PartList.java:79`）把每个部件的「材质修正（material JSON `properties.<part_type>`）+ 部件自身修正（part JSON `properties`）」全部汇入 `GearPropertyMap`。
2. **计算**（`NumberProperty.compute`，`NumberProperty.java:112`），操作顺序固定：

```
final = clamp(
    max( baseValue + AVERAGE加权平均 , 各 MAX )      // baseValue 对多数属性 = 0
    × (1 + Σ MULTIPLY_BASE)      // 作用于 base，多个 mul1 加法叠加
    × Π (1 + MULTIPLY_TOTAL)     // 作用于总额，多个 mul2 乘法叠加
    + Σ ADD                      // 最后加
)
```

要点：
- **AVERAGE**（JSON 裸数字的默认操作）：加权平均，权重 `1 + v/(1+|主值|)`，数值大者权重大（`NumberProperty.java:193`）。
- **MULTIPLY_BASE** 用「加 AVERAGE 之后的 base」，彼此加法叠加；**MULTIPLY_TOTAL** 用「含 mul1 的当前总额」，彼此乘法叠加；**ADD 最后加**。
- 数值上限由各属性注册的 min/max 决定（如 `attack_speed` ∈ [-3.9, 4.0]，`GearProperties.java:187`）。

---

*本文档由源码静态分析整理，适用于当前仓库代码。若后续版本改动注册或计算逻辑，请以 `GearTypes.java` / `PartsProvider.java` / `NumberProperty.java` 为准。*
