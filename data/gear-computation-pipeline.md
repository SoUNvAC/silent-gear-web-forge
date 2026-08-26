# Silent Gear — 数值计算管线参考手册

> 面向开发者的完整计算架构：一件装备（如镐子）的最终属性如何从 datapack JSON 一步步算出来。
> 所有机制（material、part、grade、充能、crude、synergy、traits、三遍计算）都挂在**同一条管线**上，
> 区别只在"修正量在哪个深度被哪个改写器变形"。
>
> 主要文件：
> - `util/GearData.java` — 管线编排器（三遍计算）
> - `api/part/PartList.java` — 修正量收集入口
> - `gear/part/CoreGearPart.java` / `gear/material/MaterialInstance.java` / `gear/material/AbstractMaterial.java` — 部件/材质层
> - `gear/material/CompoundMaterial.java` — 复合材质（synergy 注入点）
> - `api/property/NumberProperty.java` — 数值合成公式
> - `api/property/GearProperty.java` / `GearPropertyMap.java` / `api/util/PropertyKey.java` — 聚合与 key 解析
> - `util/SynergyUtils.java` — synergy 计算
> - `gear/material/modifier/*.java` — grade / starcharged / crude 材质修正器

---

## 1. 总体架构：一条管线 + 多级改写器

核心思想：**"修正量"（`GearPropertyValue`，含操作标签与数值）在层与层之间流动，最终值只在管线末端计算一次并缓存**。

```
数据源(datapack JSON)                             ── 第 0 层
   ↓ 收集
MaterialInstance → PartInstance → PartList       ── 第 1 层 collect
   ↓ 每属性聚合  reduce → 事件 → compress
GearPropertyMap                                  ── 累加器
   ↓
三遍计算  base → bonus → final                   ── 第 2 层 compute
   ↓
GEAR_PROPERTIES 缓存（item data component）       ── 输出
```

触发点是 `GearData.recalculateGearData(gear, player)`（`GearData.java:90`），
Javadoc 明确要求"任何修改物品的操作都必须调用"。结果写入物品的 `GEAR_PROPERTIES` data component；
tooltip、实体属性、客户端全部读缓存，不实时重算。

**完整管线（含全部改写器）**：

```
材质 itemstack（铁锭 + grade/充能 数据组件）
  │
  ▼ MaterialInstance.getPropertyModifiers         （MaterialInstance.java:296）
  ├─ ① 裸修正 = 材质 JSON properties.<part_type>  （第 0 层，父材质回退）
  ├─ ② [grade]      v → v + |v|·(bonusPercent/100)    只限 isAffectedByGrades
  ├─ ③ [starcharged] 按属性重写（见 §5）              只限 AVERAGE/MAX/ADD
  ├─ ④ [crude]      v → v + |v|·(配置倍率−1)          只限 isAffectedBySynergy
  ▼
部件收集 CoreGearPart.getPropertyModifiers        （CoreGearPart.java:121）
  ├─ ⑤ 汇总：各材质修正 + 部件自身 properties    （部件 JSON 底子）
  ├─ ⑥ reduce → GetPropertyModifiersEvent → compressModifiers（同 op 加权平均）
  ▼
  └─ ⑦ [synergy]（仅复合材质） v → v + |v|·(s−1) （CompoundMaterial.java:160）
  ▼
三遍计算（base→bonus→final）→ GEAR_PROPERTIES 缓存
```

---

## 2. 第 0 层：数据源（三股"修正"汇流）

每个数值修正来自三个独立来源，最终都以"操作 + 值"的形式进入管线：

| 来源 | 提供者 | 结构 |
|---|---|---|
| 材质 JSON | `silentgear_materials/<mat>.json` 的 `properties.<part_type>` | 如 `"attack_damage": 2.0`（裸数字 = AVERAGE）或 `{"operation": "ADD", "value": 1.0}` |
| 部件 JSON | `silentgear_parts/<part>.json` 的 `properties` | 如镐头的 `attack_damage ADD +1.0` |
| 材质修正器 | itemstack 上的数据组件（grade/starcharged/crude） | 运行时附加，见 §5 |

材质修正的读取（`AbstractMaterial.getPropertyModifiers`，`AbstractMaterial.java:128`）：
当前材质 `properties` 无该属性时**沿材质父级回退**；属性名支持 gear type 后缀。

### 2.1 属性名 / gear type 后缀（`PropertyKey.java:97-119`）

材料 JSON 里 `attack_speed/axe` 这类带 `/` 的键，被 `PropertyKey` 解析为"限定 gear type"：

| 键 | property | gear type |
|---|---|---|
| `attack_speed` | attack_speed | `all`（通用） |
| `attack_speed/axe` | attack_speed | `axe` |
| `attack_speed/hoe` | attack_speed | `hoe` |

查询时 `GearPropertyMap.get`（`GearPropertyMap.java:206`）先查精确 key，再沿 **gear type 父链**（`PropertyKey.getParent`，`PropertyKey.java:68`）向上兜底。
例：做镐子查 `attack_speed/pickaxe` → 兜底命中 `attack_speed/all`；`attack_speed/axe` 只对斧生效。
`getMostSpecificKey`（`GearPropertyMap.java:222`）返回最终命中的 key，决定该属性以哪个 gear type 口径计算。

### 2.2 操作符（`NumberProperty.Operation`）

| 操作 | JSON | 语义 |
|---|---|---|
| AVERAGE | 裸数字 | 加权平均（默认） |
| MAX | `{"operation":"max","value":N}` | 取不小于 N |
| ADD | `{"operation":"add",...}` | 最后加 |
| MULTIPLY_BASE | `{"operation":"mul1",...}` | 对 base 乘（同 op 加法叠加） |
| MULTIPLY_TOTAL | `{"operation":"mul2",...}` | 对总额乘（同 op 乘法叠加） |

---

## 3. 第 1 层：收集（collect）

`PartList.getPropertyModifiersFromParts(gearType)`（`PartList.java:79`）：
外层遍历注册表**每个属性**，内层遍历**每个部件**，把所有修正丢进 `GearPropertyMap`。

`CoreGearPart.getPropertyModifiers`（`CoreGearPart.java:121`）内部分五步：

1. **每材质修正** `m.getPropertyModifiers(partType, key)`（含 §5 的材质修正器改写）
2. **＋ 部件自身修正** `this.properties.getValues(key)`（部件 JSON 底子，**在材质修正器之后加入**）
3. **`reduce()`**（`GearProperty.java:151`）：默认恒等；`TraitListProperty` 用于过滤 trait 条件
4. **事件** `GetPropertyModifiersEvent`（`CoreGearPart.java:142`，第三方扩展点）
5. **`compressModifiers()`**（`NumberProperty.java:146`）：**同操作类型的修正合并成一个**——
   - `MAX`：直接取最大（不平均，`NumberProperty.java:161`）
   - 其余：加权平均，权重 `1 + v/(1+|primary|)`（`NumberProperty.java:172`），数值大的修正占主导

> **复合材质**在压缩后额外套 synergy（⑦，见 §6），再返回给部件。

结果：`GearPropertyMap`（`PropertyKey → 修正列表` 的多值表）。此处仍是"修正量"，一个最终值都没算。

---

## 4. 第 2 层：三遍计算（`GearData.java:117-141`）

`tryRecalculateGearData` 的代码注释：*Calculate **base** values, then **bonuses** from traits and such, then the **final** values! All of these are stored for tooltip purposes.*

### Pass 1 — base（`GearData.java:195`）

对 `gearType.getRelevantProperties()` 每个属性执行 `NumberProperty.compute`（`NumberProperty.java:112`）：

```
f0 = baseValue（多数属性 = 0）
f0 += AVERAGE加权平均                      # 仅 AVERAGE 修正
f0  = max(f0, 各 MAX)                      # MAX 修正
f1 = f0
f1 += f0·Σ(mul1)                           # MULTIPLY_BASE：对 base 加法叠加
f1 ×= Π(1+mul2)                            # MULTIPLY_TOTAL：对总额乘法叠加
f1 += Σ(ADD)                               # ADD 最后加
final = clamp(f1, 属性min, 属性max)
```

`TRAITS` 也在这一遍算出（`TraitListProperty.computeTraits`，`TraitListProperty.java:78`）：
同名 trait 等级相加 → 除以 `min(修正数/2, 携带该trait的材质数)` → clamp 到 `maxLevel`。

产物：`GearPropertiesData`（全属性 base 快照）。

### Pass 2 — bonus（`GearData.java:219`）

从 base 快照取出 trait 列表，每个 trait 对**每个已含属性**调 `getBonusProperties(level, player, property, baseValue, damageRatio)`（`Trait.java:178`），
再叠加配置 `Config.Common.getPropertyBonusMultiplier(property)`（全局倍率）。

产物：又一个修正量表 `bonusProperties`。

### Pass 3 — final（`GearData.java:252`）

把 base 值 + bonus 修正合并进同一 key，**再跑一遍 `compute`**，得到最终值写入 `GEAR_PROPERTIES`。

> 之所以 base/bonus 分离：修正量带操作标签、无损，bonus 的 `MULTIPLY_TOTAL` 在 final pass 作用于"含 base 的总额"，
> 语义统一在 `compute` 一处规定；分开存才能让 tooltip 分开展示"基础 + 加成"。

### 收尾（`GearData.java:164`）

- 写 `DataComponents.TOOL`（挖掘等级/速度）、模型 index/key、染色
- 触发 trait 的 `onRecalculatePre/Post`
- Pre/Post 各发一次 `GearRecalculateEvent`（第三方扩展点）

---

## 5. 材质修正器（`IMaterialModifier`）

应用点：`MaterialInstance.getPropertyModifiers`（`MaterialInstance.java:296-305`），
对材质裸修正**逐个套改**，顺序 = 注册顺序 **grade → starcharged → crude**（`MaterialInstance.java:106`）。

```
v' = v + |v|·bonus        （统一公式，IMaterialModifier.java:43）
```

- `v > 0`：按比例放大/缩小
- `v < 0`：按绝对值缩放（负修正变浅）
- `v = 0`：不变

### 5.1 grade（`GradeMaterialModifier.java:47`）

- 条件：`isAffectedByGrades()`
- 参数：`bonus = grade.bonusPercent/100`；等级 NONE=0, E=1, D=2, C=3, B=4, A=5, S=10, SS=15, SSS=25, MAX=30（`MaterialGrade.java:25`）
- **只改写"材质给的修正"**（部件底子还没进管线）

### 5.2 starcharged / 充能（`StarchargedMaterialModifier.java:83`）

- 系数：`q = 充能等级 × 材质的 charging_value`（`ChargedProperties.java:4`）；`charging_value` 是普通属性，pass 1 正常算出（铁 = 0.7）
- 按属性重写（**只对 AVERAGE/MAX/ADD 修正生效**，MULTIPLY 原样保留）：

| 属性 | 新值 |
|---|---|
| durability | × 1.25^q |
| armor_durability / enchantment_value | × 1.1^q |
| harvest_speed | + 1.5·等级·q |
| attack_damage / magic_damage | + q |
| ranged_damage | + q/2 |
| armor / armor_toughness / magic_armor | + 2q |
| 其余 | 不变 |

- **删除 `charging_value` 自身修正**（`StarchargedMaterialModifier.java:37`）
- 装备含多材质时按**最低**充能等级计（`ChargedMaterialModifier.java:64`）

### 5.3 crude（`CrudeMaterialModifier.java:44`）

- 条件：`isAffectedBySynergy()`
- 参数：`bonus = 配置 crudeMixerPropertyMultiplier − 1`（crude 材质整体偏弱）

### 5.4 属性名单（grade 与 synergy 不完全相同）

依据 `GearProperties.java` 的 `.affectedByGrades(true)` / `.affectedBySynergy(true)`：

| 属性 | isAffectedByGrades | isAffectedBySynergy |
|---|---|---|
| durability | ✔ | ✔ |
| armor_durability | ✔ | ✔ |
| enchantment_value | ✔ | ✔ |
| harvest_speed | ✔ | ✔ |
| attack_damage | ✔ | ✔ |
| magic_damage | ✔ | ✔ |
| ranged_damage | ✔ | ✔ |
| armor | ✔ | ✔ |
| armor_toughness | ✔ | ✔ |
| knockback_resistance | ✔ | ✔ |
| magic_armor | ✔ | ✔ |
| **projectile_speed** | ✘ | ✔ |
| repair_efficiency / repair_value / charging_value / rarity | ✘ | ✘ |
| harvest_tier / block_reach / attack_speed / attack_reach / draw_speed / projectile_accuracy | ✘ | ✘ |
| additive / traits | ✘ | ✘ |

---

## 6. synergy（复合材质专属，`SynergyUtils.getSynergy`）

**只在 `CompoundMaterial.getPropertyModifiers` 的 compress 之后套用**（`CompoundMaterial.java:160-174`）。
simple 材质 `materials.size() < 2` → 恒为 1，直接跳过。

### 6.1 计算（`SynergyUtils.java:30`）

常量：`a=1.1`（曲线饱和系数）、`P=0.2`（无共同类别惩罚）、`b=0.015`（共享类别奖励）、
`w_r=0.001`（稀有度差异，1.21 前为 0.005）、钳制 `[0.1, 2.0]`。

```
x = |{id(m) : m ∈ M}|                          # 去重材质种数
c(cat) = #{ m : cat ∈ m.categories }           # 每类别共享计数

S =  a·x/(x+a) + 1/(1+a)                                  (1) 基础曲线
  − P·1[ ∀cat, c(cat) ≠ n ]                               (2) 无共同类别惩罚
  + Σ_{cat:c(cat)>1} b·c(cat)/(n−x+1)                     (3) 共享类别奖励
  − w_r·Σ_{m∈unique(M)} |r₁−r(m)|·1[r_max>0]              (4) 稀有度差异惩罚
  + Σ_{trait t(级 l)} Δₜ(S)                               (5) synergy traits

s = clamp(S, 0.1, 2.0)
```

基础曲线只依赖 `x`：x=1 → 1.0，x=2 → ≈1.186，x=3 → ≈1.281，x→∞ → ≈1.576。

synergy trait（`SynergyTraitEffect.java:51`）：`rangeMin < S < rangeMax` 时 `S += 等级·multi`。
内置（`TraitsProvider.java:112-124`）：`crude` −0.04/级 无门槛；`rustic` +0.05/级 门槛 (0.749, 1.001)；`synergistic` +0.04/级 门槛 (1, ∞)。

### 6.2 应用（`NumberProperty.applySynergy`，`NumberProperty.java:212`）

只对 `isAffectedBySynergy()` 属性，作用于**压缩后的每个修正量**：

```
v' = v + |v|·(s−1)      →  v>0 时 v'=v·s；v<0 时 v'=v·(2−s)；v=0 时 0
```

时机：子材质修正收集 → reduce → compress **之后**、部件底子加入**之前**。

---

## 7. 完整实例：铁镐（铁镐头 + 铁杆）

输入（真实 JSON）：iron `main` 段：durability 250、harvest_speed 6.0、attack_damage 2.0、attack_speed 0.0、
enchantment_value 14、charging_value 0.7、harvest_tier=iron/2级、traits [malleable 3]；iron `rod` 段：traits [flexible 2]。
镐头部件：attack_damage ADD +1.0、attack_speed ADD +1.2、repair_efficiency 1.0。杆部件：`{}`。

### 7.1 裸奔版（无 grade / 无充能 / simple 材质 → 无 synergy）

| 属性 | 最终值 | 分解 |
|---|---|---|
| durability | 250 | iron 250 (AVERAGE) |
| harvest_tier | iron（2 级） | iron |
| harvest_speed | 6.0 | iron 6.0 |
| attack_damage | 3.0 | iron 2.0 (AVERAGE) + 镐头 1.0 (ADD) |
| attack_speed | 1.2 | iron 0.0 (AVERAGE，`attack_speed/axe` 不生效) + 镐头 1.2 (ADD) |
| repair_efficiency | 1.0 | 镐头 |
| enchantment_value | 14 | iron |
| traits | malleable 3, flexible 2 | iron main / iron rod |

### 7.2 完整版（镐头铁 grade A + starcharged II）

grade A（+5%）先套，starcharged II（q = 2×0.7 = 1.4）后套，再进收集：

| 属性 | 裸铁 | +grade A | +starcharged II | +镐头底子 | 最终 |
|---|---|---|---|---|---|
| durability | 250 | 262.5 | ×1.25^1.4 ≈ 358.8 | — | **358.8** |
| attack_damage | 2.0 | 2.1 | +1.4 = 3.5 | ADD +1.0 | **4.5** |
| harvest_speed | 6.0 | 6.3 | +4.2 = 10.5 | — | **10.5** |
| attack_speed | 0.0 | 0.0 | 不变 | ADD +1.2 | **1.2** |
| enchantment_value | 14 | 14.7 | ×1.1^1.4 ≈ 16.8 | — | **16.8** |
| charging_value | 0.7 | — | 被 starcharged 删除 | — | **0** |
| repair_efficiency | — | — | — | 1.0 | **1.0** |

---

## 8. 设计要点

| 设计 | 效果 |
|---|---|
| "操作标签"附着在修正量上 | AVERAGE→MAX→mul1→mul2→ADD 顺序在 `NumberProperty.compute` 一处固化，任意 datapack 组合不会算错 |
| 同 op 合并（compress） | 多材质杆、多个 bonus 不把列表撑爆；加权平均模拟"主材质主导" |
| 三级改写器各自分层 | grade/充能/crude 作用材质裸修正，synergy 作用复合材质压缩后，部件底子最后加——互不污染 |
| 三遍 + 缓存 | 只改一个部件就触发全量重算，但结果缓存进组件，运行时读缓存 O(1)（`GearData.java:58` 空则自动重算） |
| 每层都是扩展点 | 材质层 `IMaterialModifier`、部件层 `GetPropertyModifiersEvent`、装备层 `GearRecalculateEvent`、属性层自定义 `GearProperty` |
| 延迟求值 | 复合材质的 synergy 不进缓存，访问材质修正时现算（`CompoundMaterial.java:135`），子材质改了无需级联重算 |

---

*本文档由源码静态分析整理，适用于当前仓库代码。若后续版本改动注册或计算逻辑，请以
`GearData.java` / `NumberProperty.java` / `MaterialInstance.java` / `SynergyUtils.java` 为准。*
