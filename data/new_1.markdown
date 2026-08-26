# Silent Gear — 数值细节速查（crude / getPrimaryMod / clamp / getBonusProperties / material_ratio）

> 面向开发者的五份数值细节参考，全部由源码静态分析整理。
> 这是 `gear-computation-pipeline.md` 的补充章（§8 之后的内容，可独立阅读）。
>
> 主要文件：
> - `Config.java` — crudeMixerPropertyMultiplier 配置
> - `gear/material/modifier/CrudeMaterialModifier.java` / `block/alloymaker/entity/CrudeMixerBlockEntity.java` — crude 修正器
> - `api/property/NumberProperty.java` — getPrimaryMod / 加权平均
> - `setup/gear/GearProperties.java` — 各属性 clamp 上下限
> - `api/property/GearData.java` — Pass 2 bonus 调用点
> - `gear/trait/effect/NumberPropertyModifierTraitEffect.java` — getBonusProperties 唯一实现
> - `gear/trait/condition/MaterialRatioTraitCondition.java` / `api/traits/TraitInstance.java` — material_ratio 条件

---

## 1. crudeMixerPropertyMultiplier：数值 0.8 + 生效三门槛

### 1.1 配置值

| 项 | 值 | 来源 |
|---|---|---|
| 默认值 | **0.8** | `Config.java:173` |
| 取值范围 | `[0.0, 2.0]` | `Config.java:173` `defineInRange` |
| 配置段 | `compounds` | `Config.java` |

### 1.2 作用公式

`CrudeMaterialModifier.modifyProperties`（`CrudeMaterialModifier.java:44-49`）——只对 `isAffectedBySynergy()` 的属性生效：

```
multiplier = 配置值 − 1 = 0.8 − 1 = −0.2
v' = v + |v|·multiplier        （统一公式，IMaterialModifier.java:43）
```

| v 的符号 | 效果 |
|---|---|
| v > 0 | v' = 0.8v（主数值打八折） |
| v < 0 | v' = 1.2v（负修正更负） |
| v = 0 | 不变 |

配置值换算：`1.0` = 不改写；`0.0` → 正值归零；`2.0` → 正值翻倍。

### 1.3 为什么"整体不生效"——三道门槛

1. **CRUDE 数据组件只在粗制合金炉的产物上**。全仓库唯一写 `SgDataComponents.CRUDE` 的地方是
   `CrudeMixerBlockEntity.applyModifiers`（`CrudeMixerBlockEntity.java:19`）——即粗制合金炉（Crude Mixer）这台机器的产物。
   `CrudeMaterialModifier.setOn` 是公开 API 但**没有任何调用者**。
   用普通合金炉 / JEI / 创造模式 / give 命令得到的材料不带该组件 → 修正器从未挂上。
2. **只缩放 12 个 `isAffectedBySynergy` 属性**（见 `gear-computation-pipeline.md` §5.4 表）。
   `attack_speed`、`block_reach`、`draw_speed`、`repair_*`、`charging_value`、`rarity` 等一律不碰。
3. **同名的 crude trait**（`TraitsProvider.java:112`，`SynergyTraitEffect(-0.04)`）只走 synergy 路径，
   而 `SynergyUtils.getSynergy` 在 `materials.size() < 2` 时直接 return 1——单材质（simple）装备上恒不生效；
   且 `cancelsWith` rustic / synergistic。

> 结论：要让 crude 生效，材料必须真的从粗制合金炉产出，且只影响 synergy 属性。

---

## 2. getPrimaryMod：首个非负修正值，非正则回落 1

`NumberProperty.java:181-191`：

```java
private static float getPrimaryMod(Iterable<NumberPropertyValue> modifiers, Operation op) {
    float primaryMod = -1f;
    for (NumberPropertyValue mod : modifiers) {
        if (mod.operation() == op) {
            if (primaryMod < 0f) {
                primaryMod = mod.value();
            }
        }
    }
    return primaryMod > 0 ? primaryMod : 1;
}
```

精确语义：
- 按顺序扫同操作类型的修正，**取第一个 ≥ 0 的值**（前值 < 0 时才覆盖，一旦非负即停止）。
- 若首值恰为 **0** → 停在 0，但 `0 > 0` 为假 → 返回 **1**。
- 若**全部为负** → 返回 **1**。

使用点（都作为加权平均的参考主值）：

| 调用处 | 用途 | 权重 |
|---|---|---|
| `compressModifiers`（`:167`） | 同 op 合并 | `1 + v/(1+|primary|)` |
| `getWeightedAverage`（`:194`） | AVERAGE 加权平均 | 同上 |

一个大的正修正成为"主材质"，把均值拉向它——这是"主材质主导"的实现。

---

## 3. 属性 clamp 上下限完整表（`GearProperties.java`）

构造参数顺序 `Builder(default, base, min, max)`。所有数值属性 `base = 0`（计算起点，`NumberProperty.compute` 用）；
`default` 只是**查询缺省属性**时的回退值（`GearPropertiesData.getNumber` / `MaterialInstance.getProperty`），不进计算。

| 属性 | default | base | **min** | **max** | grade | synergy |
|---|---|---|---|---|---|---|
| durability | 0 | 0 | 0 | 2³¹−1 | ✔ | ✔ |
| armor_durability | 0 | 0 | 0 | (2³¹−1)/16 | ✔ | ✔ |
| repair_efficiency | 1 | 0 | 0 | 1000 | ✘ | ✘ |
| repair_value | 1 | 0 | 0 | 1000 | ✘ | ✘ |
| enchantment_value | 0 | 0 | 0 | 2³¹−1 | ✔ | ✔ |
| charging_value | 0 | 0 | 0 | 2³¹−1 | ✘ | ✘ |
| rarity | 0 | 0 | 0 | 2³¹−1 | ✘ | ✘ |
| harvest_tier | ZERO | — | — | —（非数值，取最佳档） | ✘ | ✘ |
| harvest_speed | 0 | 0 | 0 | 2³¹−1 | ✔ | ✔ |
| **block_reach** | 0 | 0 | **−100** | **100** | ✘ | ✘ |
| attack_damage | 0 | 0 | 0 | 2³¹−1 | ✔ | ✔ |
| **attack_speed** | 0 | 0 | **−3.9** | **4.0** | ✘ | ✘ |
| **attack_reach** | 0 | 0 | **−100** | **100** | ✘ | ✘ |
| magic_damage | 0 | 0 | 0 | 2³¹−1 | ✔ | ✔ |
| ranged_damage | 0 | 0 | 0 | 2³¹−1 | ✔ | ✔ |
| **draw_speed** | 0 | 0 | **−10** | **10** | ✘ | ✘ |
| projectile_speed | 1 | 0 | 0 | 2³¹−1 | ✘ | ✔ |
| projectile_accuracy | 1 | 0 | 0 | 10000 | ✘ | ✘ |
| armor | 0 | 0 | 0 | 2³¹−1 | ✔ | ✔ |
| armor_toughness | 0 | 0 | 0 | 2³¹−1 | ✔ | ✔ |
| knockback_resistance | 0 | 0 | 0 | 2³¹−1 | ✔ | ✔ |
| magic_armor | 0 | 0 | 0 | 2³¹−1 | ✔ | ✔ |

要点：
- **只有 4 个属性有非平凡下限**：`block_reach`、`attack_reach` ∈ [−100, 100]，`attack_speed` ∈ [−3.9, 4.0]，`draw_speed` ∈ [−10, 10]。其余全部 `[0, +∞)`。
- clamp 只在 `compute` 末尾 `clampResult=true` 时执行（`NumberProperty.java:142`）；中间各操作符的修正量本身不 clamp。
- `harvest_tier` 非数值属性（`HarvestTierProperty`，取最佳档位），无 clamp。

---

## 4. Trait getBonusProperties：唯一实现 + 逐属性公式 + 来源

### 4.1 来源：Pass 1 base 的 TRAITS 列表

Pass 2 的 trait 列表取自 **Pass 1 base 快照里的 `TRAITS`**（`GearData.java:222`），
即 `TraitListProperty.computeTraits` 聚合后、又经 gear 级 `conditionsMatch` 过滤过的结果（`TraitListProperty.java:112`）。

### 4.2 调用点（`GearData.calculateBonusProperties`，`GearData.java:219-249`）

- 遍历 `SgRegistries.GEAR_PROPERTY` 中每个在 base 里存在的属性（`TRAITS` 除外）
- 对每个有效 trait：`trait.getTrait().getBonusProperties(level, player, property, baseValue, damageRatio)`
- `damageRatio = clamp(损坏值 / 基础耐久, 0, 1)`（`:226`，基础耐久 = `gearType.getBaseDurability`）
- 另叠加配置全局倍率 `Config.Common.getPropertyBonusMultiplier(property)`（`:242`）

### 4.3 唯一实现

`NumberPropertyModifierTraitEffect.getBonusProperties`（`NumberPropertyModifierTraitEffect.java:75-91`）；
`TraitEffect` 基类返回空，其余 trait effect（Durability/Synergy 等）都不重写。
**装备上如果全是"耐久/synergy"类 trait，Pass 2 bonus 天然为空——这是设计行为，不是 bug。**

### 4.4 公式（`StatMod.getAddedValue`，`:125-134`）

```
addedValue = base_multiplier × level
           × damageRatio            （若 multiply_damage_ratio = true）
           × originalValue          （若 multiply_original_value = true，即 base 快照里该属性值）
→ 返回单个 ADD 修正，进 Pass 3 的 compute：最后一步 add + clamp
```

JSON 字段（`property_modifiers`）：`{ "<属性id>": { "base_multiplier": f, "multiply_damage_ratio": bool, "multiply_original_value": bool } }`。

### 4.5 内置使用该 effect 的 trait 全表（`TraitsProvider.java:360-457`）

`(mult, orig)` = `(multiply_damage_ratio, multiply_original_value)`

| trait | 属性 | base_multiplier | mult | orig |
|---|---|---|---|---|
| **ACCELERATE** | harvest_speed | 2.0 | ✔ | ✘ |
| | attack_speed | 0.01 | ✔ | ✘ |
| | draw_speed | 0.01 | ✔ | ✘ |
| **BULKY** | attack_speed | −0.075 | ✔ | ✘ |
| **CHIPPING** | armor | −0.075 | ✔ | ✔ |
| | harvest_speed | 0.25 | ✔ | ✔ |
| **CRUSHING** | armor | 0.05 | ✔ | ✔ |
| | attack_damage | −0.1667 | ✔ | ✔ |
| **DULLING** | attack_damage | −1.0 | ✔ | ✘ |
| | harvest_speed | −1.0 | ✔ | ✘ |
| **ERODED** | attack_damage | −0.15 | ✔ | ✔ |
| | harvest_speed | 0.15 | ✔ | ✔ |
| **HARD** | harvest_speed | 0.05 | ✔ | ✔ |
| | ranged_damage | −0.1 | ✔ | ✔ |
| **JAGGED** | attack_damage | 0.1667 | ✔ | ✔ |
| | ranged_damage | −0.1667 | ✔ | ✔ |
| **ORGANIC** | enchantment_value | 0.1 | ✔ | ✔ |
| | magic_damage | −0.15 | ✔ | ✔ |
| **SHARP** | harvest_speed | 0.125 | ✔ | ✔ |
| | attack_damage | 0.125 | ✔ | ✔ |
| **SOFT** | harvest_speed | −0.15 | ✔ | ✔ |

例：满耐久镐（damageRatio = 1）带 **SHARP 5**、材质 attack_damage base = 3.0
→ `0.125 × 5 × 1 × 3.0 = 1.875` 作为 ADD 加进最终值。

---

## 5. material_ratio 条件语义：组件级比例闸，随 context 收缩

### 5.1 注册与字段

- 注册名 `"material_ratio"`（`TraitConditions.java:20-21`）
- JSON 字段 `ratio`（float，`MaterialRatioTraitCondition.java:24`）

### 5.2 matches（`MaterialRatioTraitCondition.java:39-51`）

```
count = #(当前 context 组件中 valid 且携带该 trait 的组件数)   // 每个组件至多计一次
ratio = count / components.size()
通过 ⟺  ratio ≥ requiredRatio
```

### 5.3 reduce（`:54-64`）——条件随 context 收缩

| context | 结果 |
|---|---|
| Gear / Part | 移除（`Optional.empty`） |
| Material + 复合材质（compound） | 移除 |
| Material + simple 材质 | 保留 |

### 5.4 求值链

`TraitListProperty.reduce`（`:128`）对每个 `TraitInstance` 调 `reduceConditions(context)`（`TraitInstance.java:168`）：
先 `matches` 全量求值，再逐个 reduce（`condition.reduce(...).ifPresent(...)`）。

- **复合材质（合金）**：`CompoundMaterial.java:147` 用 `ComputeContext.material(...)` 先归约一次，
  `components` = **合金的子材质** → 比例 = "合金里多少比例的组份带这个 trait"。求值后被移除，到部件层不再拦截。
- **simple 材质**：条件保留到部件层（`CoreGearPart.java:141`），`components` = **该部件上的所有材质**，
  比例 = "部件里多少比例的材料带这个 trait"；到 gear 层被移除。

### 5.5 内置用法（`MaterialsProvider.java`）

挂材质 trait 上的实例：ACCELERATE 3 @ 0.35、MOONWALKER 4 @ 0.5、BRILLIANT 1 @ 0.7、
SILKY 1 @ 0.66、HOLY 1 @ 0.75、LUSTROUS / STURDY / SOFT 等 @ 0.5。

组合花样（`:548-549`）：

```
AQUATIC 5  @ material_ratio 0.67       ← 合金里 ≥67% 组份带 aquatic → 给 5 级
AQUATIC 3  @ Not(material_ratio 0.67)  ← 否则只给 3 级
```

辅助 `Or(material_count, material_ratio)`（`:2008`）：材质数达标 **或** 比例达标，二者其一即可。

---

## 附：与 `gear-computation-pipeline.md` 的衔接

| 本文件章节 | 对应主文档 |
|---|---|
| §1 crude | 主文档 §5.3（补充三门槛 + 0.8 数值） |
| §2 getPrimaryMod | 主文档 §3 第 5 步 compress 的补充 |
| §3 clamp 表 | 主文档 §4 公式末行的"clamp 到属性 min/max"展开 |
| §4 getBonusProperties | 主文档 §4 Pass 2 的展开 |
| §5 material_ratio | 主文档 §3 第 3 步 reduce() 的展开 |

---

*本文档由源码静态分析整理，适用于当前仓库代码。若后续版本改动注册或计算逻辑，请以
`GearData.java` / `NumberProperty.java` / `GearProperties.java` / `MaterialRatioTraitCondition.java` 为准。*
