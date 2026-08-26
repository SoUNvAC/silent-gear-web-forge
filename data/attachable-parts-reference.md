# Silent Gear — 附属部件属性算法参考

> 面向开发者：tip 及其同族"附属加成"部件的完整属性算法与数据。
> 覆盖 8 个**材质型附属槽位**（binding / coating / cord / fletching / grip / lining / setting / tip）
> 和 5 个**升级部件**（misc_upgrade 通道），含每个槽位各材质的具体加成数值。
> 全部由源码 + 生成数据（`src/generated/resources/.../silentgear_materials/*.json`）静态分析整理。
>
> 主要文件：
> - `data/PartsProvider.java` — 部件注册（part JSON 全为空）
> - `api/part/PartList.java` / `gear/part/CoreGearPart.java` — 收集管线
> - `api/property/NumberProperty.java` — 数值合成公式
> - `gear/material/CompoundMaterial.java` / `util/SynergyUtils.java` — 复合材质 synergy
> - `api/property/GearData.java` — 三遍计算
> - `api/property/TraitListProperty.java` / `api/traits/TraitInstance.java` — trait 汇总与条件
> - `gear/trait/condition/MaterialRatioTraitCondition.java` — material_ratio 条件

**数值记号**：`+N` = ADD（最后平加）；`×base N` = MULTIPLY_BASE（对 base 乘，多个加法叠加）；`×total N` = MULTIPLY_TOTAL（对总额乘，多个乘法叠加）；裸数字 = AVERAGE（加权平均，默认）；`tier=xxx(n)` = harvest_tier（取最佳档）。

---

## 1. 总览：两族"附属加成"

| 族 | 槽位 | 机制 |
|---|---|---|
| **材质型槽位**（和 tip 同构） | binding / coating / cord / fletching / grip / lining / setting / tip | 部件 JSON 空 → 加成全部来自**材质**的对应段 |
| **升级部件**（固定效果） | magnetic / spoon / road_maker / wide_plate / red_card | 固定物品、不拼材质，走 upgrade 通道（`PartTypes.MISC_UPGRADE`） |

本文重点讲材质型槽位（§2-§4），升级部件在 §5 收尾。

---

## 2. 统一算法骨架（所有材质型槽位共用）

### 2.1 一个"空部件"如何产生加成

1. **part JSON properties 为空**（`PartsProvider.java:43-73` 只写 `crafting(...)`，无 `numberProperty`/`trait`）。
2. 加成来自材质 JSON 的 `properties."silentgear:<槽位>"` 段——`MaterialInstance.getPropertyModifiers(partType, key)` 按槽位取对应段。
3. 段内每个键 = 一条 `NumberPropertyValue`（**操作 + 值**），和 main/rod 段的修正**进入同一条收集管线**，最终汇入同一把装备的 `GearPropertyMap`。

### 2.2 管线（与 main/rod 完全一致）

```
材质 itemstack（含 grade / 充能 / crude 数据组件）
  ├─ 材质裸修正（材质段，沿父材质回退，支持 gear type 后缀）
  ├─ grade      v' = v + |v|·(bonusPercent/100)      只限 isAffectedByGrades 属性
  ├─ starcharged 按属性重写（充能公式）                只限 AVERAGE/MAX/ADD
  └─ crude      v' = v + |v|·(配置−1)                 只限 isAffectedBySynergy 属性
      ↓
CoreGearPart.getPropertyModifiers：汇总 → reduce → 事件 → compress（同 op 加权平均）
      ↓
（复合材质）synergy 套在压缩后的修正量上
      ↓
三遍计算 base → bonus → final → GEAR_PROPERTIES 缓存
```

> 注意：附属部件的材质**同样吃 grade / 充能 / crude**。例：铁 tip 的 `durability +128`（ADD）在 grade A 下变 +134.4。

### 2.3 数值合成公式（`NumberProperty.compute`，`NumberProperty.java:112`）

所有槽位的修正都按此固定顺序计算（ADD 在最后，`×base` 在 AVERAGE 之后，`×total` 在总额上）：

```
f0 = baseValue（= 0）
f0 += AVERAGE 加权平均
f0  = max(f0, 各 MAX)
f1 = f0 × (1 + Σ ×base)          // MULTIPLY_BASE：对 base 加法叠加
f1 = f1 × Π(1 + ×total)          // MULTIPLY_TOTAL：对总额乘法叠加
f1 += Σ +N                       // ADD 最后平加
final = clamp(f1, 属性min, 属性max)
```

关键推论：
- **ADD（+N）最直白**——常数平加，不随主体属性缩放，对低数值装备收益最大。
- **×base** 作用于"AVERAGE 后的 base"，和 main/rod 的 base 同层乘法叠加。
- **×total** 作用于"含 base 的当前总额"，是全装备最后的乘法层——**coating 槽大量用它**，所以涂层能整体放大一把成品装备。
- 各槽位的差异**只是操作标签的不同**，不是独立算法；改数据包 JSON 的操作即可改变槽位行为。

---

## 3. 八个槽位：范围、算法特征、完整数据

### 3.0 槽位范围总表（`PartsProvider.java:43-73`）

| 槽位 | part gear_type | 可装的装备 | 是否可拆 | 定义该段的材质数 |
|---|---|---|---|---|
| binding 绑带 | `all` | 任意装备 | ✔ | 6 |
| coating 涂层 | `all`（crafting 黑名单 **elytra**） | 除 elytra 外任意装备 | ✔ | 4 |
| cord 弓弦 | `ranged_weapon` | 弓 / 弩 / 弹弓 | ✘ | 6 |
| fletching 箭羽 | `projectile` | 箭矢（**必装**） | ✘ | 3 |
| grip 握柄 | `tool` | 所有工具/武器 | ✔ | 4 |
| lining 衬里 | `armor` | 护甲 / 盾 | ✔ | 5 |
| setting 镶座 | `curio` | 戒指 / 手链 / 项链 | ✔ | 8 |
| tip 尖端 | `all` | 任意装备 | ✔ | 20 |

> 材质数不含 `example` / `barrier` 两个特殊材质；`main`（70）/ `rod`（57）是必装骨架，非附属。

### 3.1 tip 尖端（20 材质）——ADD 平加 + 挖掘等级

**算法特征**：绝大多数属性是 `+N` 平加；`harvest_tier` 是专属卖点——`HarvestTierProperty.compute` **取所有修正中最好的档位**，因此低阶主体 + 高阶 tip 直接提升挖掘等级；少数材料（amethyst / glowstone / redstone / lapis）用 `×total` 做成乘算或减益。

| 材质 | 属性修正 | traits |
|---|---|---|
| amethyst | durability ×total −0.25；tier=amethyst(1.5) | silky 1（ratio 0.66） |
| azure_electrum | armor_durability +11；durability +401；harvest_speed +5；tier=azure_electrum(4) | malleable 3 |
| azure_silver | armor_durability +3；attack_speed +0.2；durability +83；harvest_speed +3；tier=azure_silver(3)；magic_damage +2；rarity +31 | malleable 2, fortunate 3 |
| blaze_gold | armor_durability +3；attack_damage +1；durability +32；harvest_speed +4；tier=blaze_gold(2)；magic_damage +1；rarity +14 | soft 2, fiery 2 |
| bronze | armor_durability +2；attack_damage +0.75；attack_speed +0.1；durability +96；harvest_speed +0.75；tier=bronze(2)；rarity +6 | malleable 2 |
| copper | armor_durability +1；durability +32；harvest_speed +1；tier=copper(1.5)；rarity +4 | malleable 1, dulling 1 |
| crimson_iron | armor_durability +8；attack_damage +2；durability +224；harvest_speed +2；tier=crimson_iron(3)；rarity +10 | fiery 1 |
| crimson_steel | armor_durability +16；durability +448；tier=crimson_steel(4)；rarity +20 | magmatic 1 |
| diamond | armor_durability +9；attack_damage +2；durability +256；harvest_speed +2；tier=diamond(3)；magic_damage +1；ranged_damage +0.5；rarity +20 | brittle 2, lustrous 2 |
| dimerald | attack_damage +2；durability +360；harvest_speed +2；magic_damage +1；ranged_damage +0.5；rarity +25 | imperial 2 |
| emerald | armor_durability +12；attack_damage +1；durability +512；harvest_speed +2；tier=emerald(2)；magic_damage +2；ranged_damage +1；rarity +20 | brittle 1, synergistic 2 |
| glowstone | attack_damage +2；draw_speed ×total 0.3；harvest_speed ×total 0.4；magic_damage +2；rarity +15 | refractive 1, lustrous 4 |
| gold | armor_durability +1；draw_speed +0.2；durability +16；harvest_speed +6；magic_damage +2；rarity +30 | malleable 1, soft 3 |
| iron | armor_durability +4；attack_damage +1；draw_speed +0.2；durability +128；harvest_speed +1；tier=iron(2)；rarity +8 | malleable 2 |
| lapis_lazuli | attack_speed +0.3；harvest_speed ×total −0.1；tier=lapis_lazuli(1.5)；magic_damage +2 | holy 1（ratio 0.75）, lucky 4（ratio 0.75） |
| quartz | armor_durability +4；attack_damage +4；durability +64；harvest_speed +2；tier=quartz(2)；ranged_damage +1.5；rarity +20 | chipping 1, jagged 3 |
| redstone | attack_damage +2；attack_speed +0.3；harvest_speed ×total 0.2；ranged_damage +2；rarity +10 | — |
| refined_glowstone | harvest_speed +5 | refractive 1 |
| refined_obsidian | durability +600 | vulcan 1 |
| tyrian_steel | durability +251；tier=tyrian_steel(4)；rarity +30 | imperial 3, gold_digger 3 |

### 3.2 binding 绑带（6 材质）——×base 修缮/耐久向

**算法特征**：主流 `×base` 放大 `repair_efficiency` / `armor_durability` / `harvest_speed`（作用于 base，与主体同层），少量 `+N`；trait 几乎都是 `flexible`（柔韧）。

| 材质 | 属性修正 | traits |
|---|---|---|
| fine_silk | magic_armor +2 | lucky 1, flexible 4 |
| flax | armor_durability ×base 0.05；harvest_speed ×base 0.05 | flexible 3 |
| fluffy_string | armor_durability ×base 0.05；harvest_speed ×base −0.05 | flexible 3 |
| sinew | repair_efficiency ×base −0.05 | flexible 4 |
| string | repair_efficiency ×base 0.05 | flexible 1 |
| vine | repair_efficiency ×base 0.03 | — |

### 3.3 coating 涂层（4 材质）——唯一乘总额的槽

**算法特征**：清一色 `×total` 作用于**最终总额**（整把装备的 durability/攻击/速度等整体缩放），配合少量 `+N` 护甲类属性；甚至能带 `harvest_tier`（netherite 涂层给 4 级挖掘）。netherite 的 `durability` 是**双修正**：`×total 0.3` 与 `+2.0` 并存。gold/blaze_gold 的 `×total` 为负（整体打九折/九五折），是"镀层手感"。

| 材质 | 属性修正 | traits |
|---|---|---|
| blaze_gold | armor_durability ×total −0.05；durability ×total −0.05；rarity +20 | brilliant 1, soft 2 |
| gold | armor_durability ×total −0.1；durability ×total −0.1；rarity +10 | brilliant 1, soft 3 |
| netherite | armor_durability ×total 0.1212；armor_toughness +4；attack_damage ×total 0.3333；durability ×total 0.3 **+** +2.0；enchantment_value +5；harvest_speed ×total 0.125；tier=netherite(4)；knockback_resistance +1；magic_damage ×total 0.3333；ranged_damage ×total 0.3333 | fireproof 1 |
| prismarine | armor_durability ×total 0.125；armor_toughness +1；durability ×total 0.075；knockback_resistance +0.25 | aquatic 5（ratio 0.67）, aquatic 3（not ratio 0.67） |

### 3.4 cord 弓弦（6 材质）——远程专属 ×base

**算法特征**：`×base` 作用于 `ranged_damage` / `draw_speed`（远程武器专属两属性），简单直接。

| 材质 | 属性修正 | traits |
|---|---|---|
| fine_silk | ranged_damage ×base 0.07 | flexible 2 |
| flax | draw_speed ×base 0.2；ranged_damage ×base −0.1 | — |
| fluffy_string | draw_speed ×base −0.05；ranged_damage ×base 0.05 | — |
| sinew | ranged_damage ×base 0.2 | flexible 2 |
| string | draw_speed ×base 0.1 | — |
| vine | ranged_damage ×base −0.1 | — |

### 3.5 fletching 箭羽（3 材质）——裸 AVERAGE 的精度/速度权衡

**算法特征**：唯一用**裸数字（AVERAGE）**的槽——和 main 段同语义。三块材质构成精度↔速度的对偶：feather 高精度低速度，leaves/paper 低精度高速度。

| 材质 | 属性修正 |
|---|---|
| feather | projectile_accuracy 1.1；projectile_speed 0.9 |
| leaves | projectile_accuracy 0.9；projectile_speed 1.1 |
| paper | projectile_accuracy 0.9；projectile_speed 1.1 |

> 注：fletching 是箭矢的**必装槽**（`GearArrowItem.java:48-53`：main + rod + fletching），但机制上仍是"材质段喂属性"。

### 3.6 grip 握柄（4 材质）——手感三件套

**算法特征**：`×base` 放大 `harvest_speed` / `repair_efficiency` + `+N` 加 `attack_speed`，trait 带 `flexible` / `accelerate` / `ancient`。

| 材质 | 属性修正 | traits |
|---|---|---|
| fine_silk_cloth | harvest_speed ×base 0.15；repair_efficiency ×base 0.1 | accelerate 1 |
| leather | attack_speed +0.15；harvest_speed ×base 0.15；repair_efficiency ×base 0.1 | flexible 3 |
| phantom_membrane | attack_speed +0.2；harvest_speed ×base 0.1；repair_efficiency ×base 0.15 | ancient 2 |
| wool | attack_speed +0.2；harvest_speed ×base 0.1；repair_efficiency ×base 0.2 | flexible 2 |

### 3.7 lining 衬里（5 材质）——护甲防御三件套

**算法特征**：`+N` 平加 `magic_armor` / `armor_toughness` / `knockback_resistance`，trait 多为 `flexible` / `light` / `bounce`。

| 材质 | 属性修正 | traits |
|---|---|---|
| fine_silk_cloth | magic_armor +2 | flexible 4 |
| leather | — | flexible 4 |
| phantom_membrane | — | light 2, flexible 3 |
| slime | armor_toughness +0.5 | bounce 1 |
| wool | knockback_resistance +0.1 | flexible 2 |

### 3.8 setting 镶座（8 材质）——纯 trait 槽

**算法特征**：**只有 traits，零数值修正**（flint 连 trait 都没有）。宝石决定饰品的词缀。部分 trait 带 material_ratio 条件。

| 材质 | traits |
|---|---|
| amethyst | cursed 4 |
| diamond | bastion 1 |
| dimerald | kitty_vision 1 |
| emerald | reach 2 |
| flint | （空） |
| lapis_lazuli | lucky 3（ratio 0.75） |
| prismarine | swift_swim 3（ratio 0.67） |
| quartz | mighty 2（ratio 0.5） |

---

## 4. trait 汇总算法（`TraitListProperty.computeTraits`，`TraitListProperty.java:78`）

所有槽位的 trait（main / rod / tip / coating / …）混在一起按**同名聚合**：

```
level_total = Σ 各实例等级
divisor     = min(全部 trait 实例数 / 2, 携带该 trait 的实例数)
level       = clamp(round(level_total / divisor), 1, trait.maxLevel)
```

例：主材质 malleable 3 + tip 材质 malleable 2，全装备共 3 个 trait 实例 → `divisor = min(3/2, 2) = 1.5` → `level = round(5/1.5) = 3` → 最终 malleable 3。

**material_ratio 条件**（`MaterialRatioTraitCondition`）——出现在上表多处的 `ratio N`：
- 简单材质：`count/组件数 = 1` → 恒通过（该材质自身携带该 trait）。
- **复合（合金）材质**：`ratio = 携带该 trait 的子材质数 / 子材质总数 ≥ N` 才通过——合金里组份比例不够就失效。
- Gear / Part 层级求值后被 `reduce` 移除，不再向上拦截。

---

## 5. 升级部件（misc_upgrade 通道，`PartsProvider.java:81-107`）

固定物品、固定效果，不参与材质合成，走 upgrade 通道（`PartTypes.MISC_UPGRADE`，`maxPerItem=256`）：

| 部件 | 可用装备 | 固定属性修正 | 固定 trait |
|---|---|---|---|
| magnetic_upgrade | 所有 | — | magnetic 5 |
| spoon_upgrade | pickaxe | durability ×base 0.2；rarity +10 | spoon 1 |
| road_maker_upgrade | excavator | durability ×base 0.1；rarity +10 | road_maker 1 |
| wide_plate_upgrade | hammer / excavator | durability ×base 0.1；rarity +10 | widen 1 |
| red_card_upgrade | 所有 | rarity −5 | red_card 1 |

---

## 6. 组合规则与收益直觉

| 装备 | 骨架（必装） | 可附加槽 |
|---|---|---|
| 近战工具/武器 | main + rod | tip + binding + grip + coating |
| 弓 / 弩 / 弹弓 | main + rod + cord | tip + coating |
| 箭矢 | main + rod + fletching | tip + coating |
| 护甲 / 盾 | main | tip + lining + coating |
| 饰品（ring/bracelet/necklace） | main + setting | tip |

设计要点：
- **coating 是唯一能乘总额的槽**——同一把装备"先算 base，再被 coating 整体放大"。
- **tip 是唯一能抬挖掘等级的槽**（`harvest_tier` 取最佳档）。
- **binding / grip / cord 走 ×base**，在 base 层和主体乘算，属于"按比例增强"。
- **lining / tip 大量 +N**，属于"常数补强"，对低数值装备更划算。
- **setting 是纯 trait 槽**，选宝石=选词缀。
- 所有槽的材质都吃 grade / 充能 / crude；所有槽的修正都走同一条三遍计算管线。

---

*本文档由源码 + 生成数据静态分析整理，适用于当前仓库代码。数据源：`src/generated/resources/data/silentgear/silentgear_materials/*.json`；若改注册或计算逻辑，以 `PartsProvider.java` / `NumberProperty.java` / `GearData.java` / `GearProperties.java` 为准。*
