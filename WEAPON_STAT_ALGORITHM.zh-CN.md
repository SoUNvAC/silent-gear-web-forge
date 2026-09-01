# Silent Gear 4.2.1 武器数值算法链分析

> 分析对象：Minecraft 1.21.1、Silent Gear 4.2.1、仓库提交 `aa936c3e`  
> 本文只依据当前仓库源码与内置数据包。其他模组可通过 NeoForge 事件修改中间结果，服务端配置也可追加全局倍率，因此整合包中的最终值可能与本文示例不同。

## 1. 结论先行

Silent Gear 的武器数值不是“材料面板值 × 武器倍率”这么简单。完整主链是：

```text
材料 JSON 原始修饰符
  -> 动态复合材料：同运算类型压缩 + 协同系数
  -> 材料实例修饰器：等级 -> 星光充能 -> 粗制惩罚
  -> 零件：材料修饰符 + 零件固有修饰符，再压缩
  -> 装备：汇总所有零件，按固定运算顺序计算基础属性
  -> 材料特质/零件特质与全局配置追加奖励
  -> 再按同一运算顺序得到最终属性
  -> 转成 Minecraft 攻击伤害、攻击速度、弹射物伤害等实际字段
```

最重要的结论有六条：

1. **材料提供的是一组带运算类型的修饰符，不一定是最终数值。** JSON 中的裸数字默认是 `AVERAGE`；零件通常再提供 `ADD`、`MULTIPLY_BASE` 等修饰符。
2. **等级只改材料修饰符，不改武器零件的固有常数。** 例如剑刃固定 `+3` 攻击伤害不会被材料等级放大。
3. **星光充能只改特定属性和特定运算类型。** 攻击速度、拉弓速度、攻击距离都不受星光充能影响；乘法型材料修饰符也不会吃到充能加成。
4. **动态复合材料先混合、压缩并计算协同，再接受复合锭自身的等级/充能/粗制修饰。** 输入材料原有的等级和充能会被剥离，不能靠“先把原料升满再混合”叠加收益。
5. **攻击速度基本独立。** 它由材料原值、武器类型常数及升级件决定，但不受等级、协同和星光充能影响。
6. **材料还会通过特质间接改数值。** 基础属性算完后，特质和全局配置会再跑一遍奖励计算；因此只看材料 JSON 仍可能漏掉特质效果。

## 2. 术语澄清：“闪电充能”实际是星光充能

当前源码中唯一的充能材料修饰器是 `silentgear:starcharged`，实现类为 `StarchargedMaterialModifier`，更准确的中文名称是**星光充能**。仓库里没有名为 lightning/thunder charged 的材料属性修饰器。

`data/minecraft/enchantment/channeling.json` 是引雷附魔的行为定义：满足雷暴等条件时生成闪电。它不参与材料、等级、复合材料和武器面板数值计算。下文所称“充能”均指星光充能。

## 3. 数据模型：材料值其实是修饰符

### 3.1 属性键与武器类型覆盖

材料数据位于 `src/generated/resources/data/silentgear/silentgear_materials/`，零件数据位于 `.../silentgear_parts/`。

一个材料可同时声明通用值和武器类型特化值。例如铁的主材料有：

```json
{
  "attack_damage": 2.0,
  "attack_speed": 0.0,
  "attack_speed/axe": -0.1
}
```

计算斧时会优先取 `attack_speed/axe`，没有精确项才沿 `GearType` 父链回退到通用 `attack_speed`。精确项是**覆盖选择**，不是与通用项相加。

子材料也会逐属性向父材料继承：当前材料找不到该零件类型/属性的修饰符时，才读取父材料。

### 3.2 五种数字运算

裸数字等价于：

```json
{ "value": 数字, "operation": "AVERAGE" }
```

数字属性最终按以下固定次序计算。设属性基础值为 `B`，修饰符分别属于五类：

1. `AVERAGE`：先做带权平均，记为 `A`，令 `f0 = B + A`。
2. `MAX`：逐个执行 `f0 = max(f0, v)`。
3. `MULTIPLY_BASE`：令 `f1 = f0 × (1 + Σm1)`。
4. `MULTIPLY_TOTAL`：逐个执行 `f1 = f1 × (1 + m2)`，等价于乘以 `Π(1+m2)`。
5. `ADD`：最后令 `f1 = f1 + Σa`。
6. 按属性声明的最小/最大值夹紧。

即：

```text
f0 = max(B + weightedAverage(AVERAGE), 所有 MAX 值)
result = clamp(f0 × (1 + Σ MULTIPLY_BASE)
                  × Π(1 + MULTIPLY_TOTAL)
                  + Σ ADD)
```

武器相关数字属性的 `B` 均为 0；部分属性的“缺省显示值”虽为 1，但其计算基础值仍为 0。

### 3.3 同类修饰符的压缩算法

动态复合材料层和零件层都会把同一运算类型的多个数字压成一个。`MAX` 直接取最大值，其他类型使用带权平均：

```text
w_i = 1 + v_i / (1 + |p|)
C(v_1 ... v_n) = Σ(v_i × w_i) / Σw_i
```

对通常为正数的属性，`p` 就是该组第一个值。这不是普通算术平均：高数值通常获得稍高权重，因此输入顺序和第一个材料可能影响结果。

实现细节：源码的 `getPrimaryMod` 对负数会继续寻找后续值，若最终没有正数则把 `p` 回退为 1；因此含负值的混合最好按源码函数而不是按“第一个值”简化计算。

## 4. 材料如何影响武器

### 4.1 主材料与辅助零件分工

主材料通常提供：

- `attack_damage`、`attack_speed`、`magic_damage`、`ranged_damage`
- `durability`、`enchantment_value`
- 采掘、护甲、弹射物属性及特质

零件类型决定读取材料 JSON 的哪一个块：`main`、`rod`、`tip`、`coating`、`grip` 等。同一材料作为主材料、握柄或镶嵌时，提供的修饰符完全可能不同。

主武器零件还提供与材料无关的固有常数。常见近战武器如下：

| 主零件 | 攻击伤害固有修饰 | 攻击速度固有修饰 |
|---|---:|---:|
| 剑刃 | `ADD +3` | `ADD +1.6` |
| 斧头 | `ADD +5` | `ADD +1.0` |
| 镐头 | `ADD +1` | `ADD +1.2` |
| 镰刀刃 | `ADD +1` | `ADD +2.2` |
| 长矛尖 | `ADD +3` | `ADD +1.3` |
| 三叉戟尖 | `ADD +4` | `ADD +1.1` |
| 大锤头 | `ADD +4` | `ADD +0.8` |
| 武士刀刃 | `ADD +4` | `ADD +1.4` |
| 砍刀刃 | `ADD +2` | `ADD +1.8` |
| 匕首刃 | `ADD +2`，另有 `MULTIPLY_BASE -0.5` | `ADD +2.8` |
| 小刀刃 | `ADD +1`，另有 `MULTIPLY_BASE -0.5` | `ADD +2.4` |
| 狼牙棒核心 | `ADD +3` | `ADD +0.6` |

弓主零件对 `ranged_damage` 固定 `ADD +1`，弩为 `ADD +2`；它们的主要速度属性是 `draw_speed` 而非近战 `attack_speed`。

### 4.2 等级、充能不会放大零件常数

材料实例先被等级和充能修改，然后才与零件固有修饰符合并。因此一把 A 级铁剑中：

- 铁的 `attack_damage = 2` 会变为 `2.1`；
- 剑刃的 `ADD +3` 保持 `+3`；
- 它不是 `(2 + 3) × 1.05`。

### 4.3 材料特质是第二条影响路径

材料与零件还能提供 `traits`。装备重算分三遍：

1. 由所有零件算基础属性和特质列表；
2. 特质按当前等级、玩家和装备损耗比例提供奖励修饰符，同时加入配置中的全局属性倍率；
3. 把基础值当作一个 `AVERAGE` 修饰符，与奖励一起再计算最终值。

因此本文公式若用于手算，应同时检查材料 JSON 中的特质及 `silentgear_traits/` 中对应效果。NeoForge 的 `GetMaterialPropertiesEvent`、`GetPropertyModifiersEvent` 和 `GearRecalculateEvent` 也允许其他模组改写结果。

## 5. 材料等级算法

### 5.1 等级表

| 等级 | 奖励百分比 `g` |
|---|---:|
| NONE | 0% |
| E | 1% |
| D | 2% |
| C | 3% |
| B | 4% |
| A | 5% |
| S | 10% |
| SS | 15% |
| SSS | 25% |
| MAX | 30% |

注意：这些百分比不是等差增长，S 以上跳幅明显增加。

### 5.2 等级修改公式

若属性声明了 `affectedByGrades = true`，等级会逐个修改该材料的所有数字修饰符：

```text
v_grade = v + |v| × g
```

所以：

- 正数：`v_grade = v × (1+g)`；
- 负数：变得更接近 0，例如 A 级的 `-0.10 -> -0.095`，即惩罚减轻；
- `AVERAGE`、`ADD`、`MAX`、`MULTIPLY_BASE`、`MULTIPLY_TOTAL` 都会被改，但运算类型不变。

### 5.3 哪些属性吃等级

| 属性 | 受等级影响 |
|---|---|
| 耐久、护甲耐久、附魔值 | 是 |
| 采掘速度 | 是 |
| 攻击伤害、魔法伤害、远程伤害 | 是 |
| 护甲、韧性、击退抗性、魔法护甲 | 是 |
| 攻击速度、攻击距离、方块距离 | **否** |
| 拉弓速度、弹射物精准度、弹射物速度 | **否** |
| 充能值、稀有度、采掘等级、修理属性、特质 | **否** |

### 5.4 分级机的随机分布

分级机不是固定产出。设标准正态随机数为 `Z`：

```text
medianOrdinal = configuredMedian.ordinal + catalystTier - 1
selectedOrdinal = round(standardDeviation × Z + medianOrdinal)
selectedOrdinal = clamp(selectedOrdinal, E, MAX)
```

默认配置：一级催化剂中位数为 C、标准差为 1.5。因此默认中位等级为：

| 催化剂级别 | 中位等级 |
|---|---|
| 1 | C |
| 2 | B |
| 3 | A |
| 4 | S |
| 5 | SS |

内置数据包只给 1～3 级催化剂放了物品，4～5 级标签默认为空。再次分级只在随机结果高于现有等级时升级；较低或相同结果不会降级。

## 6. 星光充能算法

### 6.1 充能强度

设：

- `L`：星光充能等级，内置结构/催化剂支持 1～3；
- `c`：材料主属性中的 `charging_value`；
- `Q = L × c`：实际充能强度。

动态复合材料的 `c` 是各子材料充能值经过同类压缩后的结果，不吃协同、等级或粗制惩罚。

### 6.2 充能公式

充能只改运算类型为 `AVERAGE`、`MAX` 或 `ADD` 的数字修饰符。`MULTIPLY_BASE` 和 `MULTIPLY_TOTAL` 原样保留。

| 属性 | 充能后修饰符 |
|---|---|
| 耐久 | `v × 1.25^Q` |
| 护甲耐久 | `v × 1.10^Q` |
| 附魔值 | `v × 1.10^Q` |
| 采掘速度 | `v + 1.5 × L × Q = v + 1.5 × L² × c` |
| 攻击伤害 | `v + Q` |
| 魔法伤害 | `v + Q` |
| 远程伤害 | `v + Q/2` |
| 护甲、韧性、魔法护甲 | `v + 2Q` |
| 其他属性 | 不变 |

由此可见，材料的 `charging_value` 是潜在成长系数，不直接出现在武器面板上。高等级充能对采掘速度是二次增长，对耐久则是指数增长。

### 6.3 与等级的先后顺序

材料修饰器的注册/执行顺序固定为：

```text
GRADE -> STARCHARGED -> CRUDE
```

因此普通材料的攻击伤害修饰符是：

```text
v' = (v + |v|g) + Q
```

粗制动态复合材料在数值为正时则是：

```text
v' = 0.8 × ((复合压缩值 × 协同后) × (1+g) + Q)
```

默认配置不允许直接给零件内部材料分级或充能（两项 `can_*_parts` 都是 `false`）。它们主要作用于材料物品及动态复合锭；若配置或附属模组打开零件处理，机器每次只处理零件中的一个材料实例。

## 7. 动态复合材料算法

### 7.1 先区分两类“复合”

源码里有两种名字容易混淆的材料：

1. **动态复合材料 `silentgear:compound`**：金属合金、混合织物、混合宝石、粗制合金、超级合金。物品保存实际子材料列表，属性实时混合并计算协同。
2. **固定自定义复合材料 `silentgear:custom_compound`**：如高碳钢、Dimerald。虽然类型名包含 compound，但属性直接写在自身 JSON 中，运行时和普通固定材料一样，不会根据配方输入重新混合。

此外，合金炉若匹配到一个显式 `AlloyRecipe`，会直接返回配方指定物品/固定材料；只有没有命中特殊配方时，才创建保存输入列表的动态复合材料。

### 7.2 输入增强会被剥离

创建动态复合材料时，每个子材料都会经过 `removeEnhancements`：

- 移除等级；
- 移除星光充能；
- 移除粗制标记；
- 清空附魔。

计算动态复合属性时又会做一次相同清理作为保险。因此原料的等级和充能不会进入合金；应当在合金成品上重新分级、充能。

直接用多个材料制作普通复合零件则不同：`CompoundPartItem` 会保留零件内部各 `MaterialInstance`，若配置允许给零件处理，内部等级/充能会逐材料生效。

### 7.3 子材料属性压缩

对目标属性与零件类型，动态复合材料会：

1. 从所有有效子材料收集修饰符；
2. 按运算类型分组；
3. `MAX` 取最大，其他组用第 3.3 节的 `C(...)` 带权压缩；
4. 对标记为 `affectedBySynergy` 的属性施加协同系数 `S`。

数量与重复材料都保留。两个铁和一个钻石不是“铁、钻石各算一次”，而是三个材料实例都进入压缩；但协同基础曲线使用的是唯一材料数量。

### 7.4 协同系数

设：

- `N`：子材料实例总数；
- `u`：唯一材料 ID 数量；
- `k_j`：材料分类 `j` 在所有实例中出现的次数；
- `r_0`：第一个材料的稀有度；
- `r_i`：每一种唯一材料的稀有度。

基础协同：

```text
S_base = 1.1 × u/(u+1.1) + 1/2.1
```

然后依次调整：

```text
若没有任何分类满足 k_j = N：S -= 0.2
对每个 k_j > 1 的分类：      S += 0.015 × k_j/(N-u+1)
若最大稀有度 > 0：           S -= 0.001 × Σ_unique |r_0-r_i|
再依次执行所有协同类特质
最终 S = clamp(S, 0.1, 2.0)
```

对受协同影响的数字修饰符：

```text
v_synergy = v + |v| × (S-1)
```

也就是正数近似 `v × S`；负数在 `S>1` 时会变得更接近 0，在 `S<1` 时会变得更负，始终朝“协同高则更有利”的方向变化。

### 7.5 哪些武器属性吃协同

| 属性 | 受协同影响 |
|---|---|
| 耐久、护甲耐久、附魔值 | 是 |
| 采掘速度 | 是 |
| 攻击伤害、魔法伤害、远程伤害 | 是 |
| 弹射物速度 | 是 |
| 护甲、韧性、击退抗性、魔法护甲 | 是 |
| 攻击速度、攻击距离、拉弓速度、精准度 | **否** |
| 充能值、稀有度、采掘等级、修理属性 | **否** |

### 7.6 粗制混合器惩罚

粗制混合器给动态复合材料加 `CRUDE` 修饰器。默认配置倍率 `M = 0.8`，只作用于 `affectedBySynergy` 的数字属性：

```text
v_crude = v + |v| × (M-1)
```

所以正数变成 `0.8v`，负数变成 `1.2v`（惩罚更重）。它在等级和星光充能之后执行，因此连充能新加的数值也一起打八折。超级混合器没有这项惩罚。

### 7.7 顺序为何重要

顺序会影响：

- 带权压缩的参考值 `p`；
- 协同稀有度惩罚的基准 `r_0`；
- 动态复合物品的主材料名称和部分显示效果。

因此同一组材料以不同顺序输入，理论上可能得到略不同的属性。直接处理零件内部材料时，分级机会按等级降序重排材料；充能机会把本次处理的材料移到列表尾部，这也可能改变上述顺序效应。

## 8. 从零件到最终武器

### 8.1 零件层

对每个零件和属性：

```text
mods = 所有材料实例的属性修饰符 + 零件 JSON 固有修饰符
mods = property.reduce(mods)
触发 GetPropertyModifiersEvent
mods = 按运算类型压缩
```

这里再次说明：剑刃 `ADD +3` 与材料 `AVERAGE 2` 属于不同运算组，不会互相平均。

### 8.2 装备基础属性层

装备收集所有有效零件输出的修饰符，针对该武器类型的相关属性运行第 3.2 节公式，得到 `baseProperties` 和特质列表。

### 8.3 特质与配置奖励层

每个有效特质针对每项已有基础属性产生奖励修饰符；奖励可依赖：

- 特质等级；
- 当前玩家；
- 基础属性值；
- `damage / baseDurability` 形式的损耗比例。

随后加入 `Config.Common.getPropertyBonusMultiplier` 返回的全局修饰符，再以 `baseProperties` 为基础修饰符计算最终值，并写入物品的 `silentgear:gear_properties` 数据组件。

### 8.4 转成 Minecraft 实际攻击字段

近战武器：

```text
物品攻击伤害 ADD_VALUE = max(final attack_damage, 0)
物品攻击速度 ADD_VALUE = final attack_speed - 4
```

玩家自身基础攻击伤害通常为 1、基础攻击速度为 4。因此忽略特质额外 AttributeModifier 时：

```text
玩家手持时显示攻击伤害 ≈ 1 + final attack_damage
玩家手持时攻击速度     = final attack_speed
```

物品损坏时是例外：攻击伤害修饰固定为 1，攻击速度修饰在原值上加 0.7。

弓、弩和弹弓生成箭/弹丸后执行：

```text
projectileBaseDamage = 原版/弹药基础伤害 - 1 + final ranged_damage
```

投掷三叉戟使用：

```text
rangedMultiplier = 1 + (final ranged_damage - 1)/4
projectileAttackDamage = meleeAttackDamageModifier × rangedMultiplier
```

当前仓库会完整计算并保存 `magic_damage`，也提供读取函数，但主源码中没有找到实际把它施加到受击实体的调用；它更像供附属模组/API 使用或尚未接入的属性。

## 9. 完整手算示例

### 9.1 普通铁剑

铁作为 `main`：

```text
attack_damage = AVERAGE 2
attack_speed  = AVERAGE 0
durability    = AVERAGE 250
charging_value = 0.7
```

剑刃固有值：

```text
attack_damage = ADD 3
attack_speed  = ADD 1.6
```

所以：

```text
final attack_damage property = 2 + 3 = 5
玩家手持显示伤害             = 1 + 5 = 6
final attack_speed           = 0 + 1.6 = 1.6 次/秒
最大耐久                     = round(250) = 250
```

### 9.2 A 级、星光充能 II 的铁剑

`g = 0.05`，`L = 2`，`c = 0.7`，所以 `Q = 1.4`。

```text
材料攻击伤害：2 × 1.05 + 1.4 = 3.5
剑属性伤害：  3.5 + 3 = 6.5
玩家显示伤害：1 + 6.5 = 7.5

材料耐久：250 × 1.05 × 1.25^1.4 ≈ 358.76
最大耐久：round(358.76) = 359

攻击速度：0 + 1.6 = 1.6（等级与充能均不改变）
```

### 9.3 铁 + 钻石动态复合剑

按“铁在前、钻石在后”计算攻击伤害。两者材料伤害为 2、3：

```text
w_iron    = 1 + 2/(1+2) = 1.6666667
w_diamond = 1 + 3/(1+2) = 2
C = (2×1.6666667 + 3×2)/(1.6666667+2) = 2.5454545
```

协同：两种材料无共同分类，稀有度分别为 20、70：

```text
S_base = 1.1×2/(2+1.1) + 1/2.1 = 1.1858679
S = 1.1858679 - 0.2 - 0.001×|20-70|
  = 0.9358679
```

没有协同类特质时：

```text
复合材料攻击伤害 = 2.5454545 × 0.9358679 = 2.3822092
剑属性伤害       = 2.3822092 + 3 = 5.3822092
玩家显示伤害     ≈ 6.3822092
```

同一合金的复合 `charging_value` 由 0.7、0.8 压缩得到约 `0.7510204`。若把**成品合金**升到 A 级并做星光充能 II：

```text
Q = 2 × 0.7510204 = 1.5020408
合金材料伤害 = 2.3822092 × 1.05 + 1.5020408 = 4.0033605
普通合金剑属性伤害 = 4.0033605 + 3 = 7.0033605
玩家显示伤害 ≈ 8.0033605
```

若同样配方来自默认粗制混合器：

```text
粗制合金材料伤害 = 4.0033605 × 0.8 = 3.2026884
粗制剑属性伤害   = 3.2026884 + 3 = 6.2026884
玩家显示伤害     ≈ 7.2026884
```

这组数字也展示了为何粗制惩罚不影响剑刃固定 `+3`，却会影响合金本身的等级和充能收益。

## 10. 源码中值得注意的边界与可疑实现

### 10.1 协同恰好为 1 时可能丢失属性

`CompoundMaterial.getPropertyModifiers` 对受协同影响的属性创建一个空列表，只在 `S != 1.0f` 时填入修饰符，随后无条件返回该列表。因此当协同浮点值**恰好等于 1** 时，受协同属性会返回空集合，而不是原修饰符。

正常多材料配方通常不会精确落在 1，但单子材料的人工/命令构造、数据包材料或特质修正可能触发。按设计意图，这里更像应该在 `S == 1` 时返回 `compressedModifiers`。

### 10.2 带权压缩对负值与顺序敏感

权重直接使用 `v_i` 而不是 `|v_i|`，`getPrimaryMod` 对负数还有特殊回退行为。对攻击速度等允许负值的属性，混合结果不等于普通平均，甚至可能出现不直观权重。复刻算法时应照抄源码函数。

### 10.3 固定配方会绕过动态混合

合金机器先查显式配方；命中后直接 `recipe.assemble`，不会调用动态材料列表的 `create(materials)`。因此看到“由多种原料制成”并不能断定属性来自运行时平均，必须先检查结果材料类型和配方是否固定。

## 11. 关键源码索引

- 数字运算顺序与带权压缩：`src/main/java/net/silentchaos512/gear/api/property/NumberProperty.java` 第 112～215 行
- 属性是否受等级/协同：`src/main/java/net/silentchaos512/gear/setup/gear/GearProperties.java`
- 等级枚举、奖励与随机分布：`src/main/java/net/silentchaos512/gear/api/part/MaterialGrade.java` 第 24～105 行
- 等级修饰公式：`src/main/java/net/silentchaos512/gear/gear/material/modifier/GradeMaterialModifier.java` 第 45～53 行
- 星光充能公式：`src/main/java/net/silentchaos512/gear/gear/material/modifier/StarchargedMaterialModifier.java` 第 33～112 行
- 充能强度 `Q=L×c`：`src/main/java/net/silentchaos512/gear/api/util/ChargedProperties.java`
- 材料修饰器执行入口：`src/main/java/net/silentchaos512/gear/gear/material/MaterialInstance.java` 第 278～305 行
- 动态复合压缩与协同：`src/main/java/net/silentchaos512/gear/gear/material/CompoundMaterial.java` 第 124～175 行
- 协同完整公式：`src/main/java/net/silentchaos512/gear/util/SynergyUtils.java`
- 输入增强剥离：`src/main/java/net/silentchaos512/gear/item/CompoundMaterialItem.java` 第 38～48 行
- 粗制惩罚：`src/main/java/net/silentchaos512/gear/gear/material/modifier/CrudeMaterialModifier.java` 第 42～48 行
- 材料到零件的合并：`src/main/java/net/silentchaos512/gear/gear/part/CoreGearPart.java` 第 120～147 行
- 零件到装备的三遍重算：`src/main/java/net/silentchaos512/gear/util/GearData.java` 第 117～265 行
- Minecraft 攻击属性转换：`src/main/java/net/silentchaos512/gear/util/GearHelper.java` 第 125～199 行
- 内置材料数据：`src/generated/resources/data/silentgear/silentgear_materials/`
- 内置零件数据：`src/generated/resources/data/silentgear/silentgear_parts/`

