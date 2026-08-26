# 特性

由游戏内 `sgear_traits dump_md` 命令生成于 2026/08/18 17:34:28

根据您游玩的模组包以及安装的模组或数据包，此数据可能准确也可能不准确。

## 数据来源

以下模组和数据包已向输出中添加特性。自行运行转储命令可能会产生不同的结果。

- Silent Gear (silentgear) 3.6.6

## 特性类型

这些是特性序列化器。您可以使用数据包定义这些类型的自定义实例。
特性和其序列化器的代码可在 `net.silentchaos512.gear.gear.trait` 中找到。

请注意，"简单"特性通常在需要自定义代码时使用。
仅通过数据包定义时，它们并不是特别有用。

- `silentgear:bonus_drops` _(net.silentchaos512.gear.gear.trait.BonusDropsTrait)_
- `silentgear:target_effect` _(net.silentchaos512.gear.gear.trait.TargetEffectTrait)_
- `silentgear:self_repair` _(net.silentchaos512.gear.gear.trait.SelfRepairTrait)_
- `silentgear:attribute` _(net.silentchaos512.gear.gear.trait.AttributeTrait)_
- `silentgear:cancel_effects` _(net.silentchaos512.gear.gear.trait.CancelEffectsTrait)_
- `silentgear:damage_type` _(net.silentchaos512.gear.gear.trait.DamageTypeTrait)_
- `silentgear:nbt` _(net.silentchaos512.gear.gear.trait.NBTTrait)_
- `silentgear:block_filler` _(net.silentchaos512.gear.gear.trait.BlockFillerTrait)_
- `silentgear:synergy` _(net.silentchaos512.gear.gear.trait.SynergyTrait)_
- `silentgear:wielder_effect` _(net.silentchaos512.gear.gear.trait.WielderEffectTrait)_
- `silentgear:stat_modifier` _(net.silentchaos512.gear.gear.trait.StatModifierTrait)_
- `silentgear:block_mining_speed` _(net.silentchaos512.gear.gear.trait.BlockMiningSpeedTrait)_
- `silentgear:simple_trait` _(net.silentchaos512.gear.gear.trait.SimpleTrait)_
- `silentgear:block_placer` _(net.silentchaos512.gear.gear.trait.BlockPlacerTrait)_
- `silentgear:stellar` _(net.silentchaos512.gear.gear.trait.StellarTrait)_
- `silentgear:enchantment` _(net.silentchaos512.gear.gear.trait.EnchantmentTrait)_
- `silentgear:durability` _(net.silentchaos512.gear.gear.trait.DurabilityTrait)_

## 特性列表
### [Accelerate](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/accelerate.json)
- 随着耐久度损失，获得挖掘速度、攻击速度和远程速度提升
- 存在于：
  - 材料：**Azure Electrum** _(主体, 工具杆)_, **Fine Silk Cloth** _(握把)_
- 条件：(装备类型: 工具)
- ID: `silentgear:accelerate`
- 类型: `silentgear:stat_modifier`
- 最大等级: 5
- 额外信息:
  - 攻击速度: 0.01 * 等级 * 耐久损失
  - 挖掘速度: 2.0 * 等级 * 耐久损失
  - 远程速度: 0.01 * 等级 * 耐久损失

### [Adamant](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/adamant.json)
- 护甲增加伤害抗性，工具对基础生命值超过10颗心的生物造成更多伤害
- 存在于：
  - 材料：**Invar** _(主体)_, **Nickel** _(主体)_
- ID: `silentgear:adamant`
- 类型: `silentgear:wielder_effect`
- 最大等级: 5
- 额外信息:
  - 护甲
    - 抗性: [1, 1, 1, 2] (按护甲件数)

### [Ancient](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/ancient.json)
- 增加方块和生物掉落的经验值
- 存在于：
  - 材料：**Dimerald** _(工具杆)_, **End Stone** _(主体, 工具杆)_, **Phantom Membrane** _(握把)_, **Stone** _(主体)_
- 条件：(装备类型: 工具)
- ID: `silentgear:ancient`
- 类型: `silentgear:simple_trait`
- 最大等级: 5

### [Aquatic](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/aquatic.json)
- 全套护甲提供水下呼吸，对水生生物造成更多伤害
- 存在于：
  - 材料：**Lead** _(主体)_, **Prismarine** _(涂层)_
- ID: `silentgear:aquatic`
- 类型: `silentgear:wielder_effect`
- 最大等级: 5
- 额外信息:
  - 护甲
    - 水下呼吸: [1] (需要全套护甲)

### [Bastion](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/bastion.json)
- 提供额外护甲值
- 存在于：
  - 材料：**Diamond** _(饰品)_
- 条件：((装备类型: 护甲 OR 装备类型: 饰品))
- ID: `silentgear:bastion`
- 类型: `silentgear:attribute`
- 最大等级: 5
- 额外信息:
  - 全部
    - minecraft:generic.armor: 增加 [1.0, 2.0, 3.0, 4.0, 5.0]

### [Bending](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/bending.json)
- 装备有时会承受额外伤害（与Flexible抵消）
- 存在于：
  - 材料：**Azure Silver** _(工具杆)_, **Copper** _(工具杆)_, **Gold** _(工具杆)_, **Netherrack** _(工具杆)_, **Rough Wood** _(工具杆)_
- ID: `silentgear:bending`
- 类型: `silentgear:durability`
- 最大等级: 5
- 与...抵消: `silentgear:flexible`
- 额外信息:
  - 有7%几率每等级承受1.0额外伤害

### [Bounce](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/bounce.json)
- 靴子抵消摔落伤害，护甲可击退攻击者
- 存在于：
  - 材料：**Slime** _(内衬)_
- 条件：(装备类型: 护甲)
- ID: `silentgear:bounce`
- 类型: `silentgear:simple_trait`
- 最大等级: 1

### [Brilliant](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/brilliant.json)
- 闪闪发光！猪灵喜欢。
- 存在于：
  - 材料：**Blaze Gold** _(涂层, 主体)_, **Gold** _(涂层, 主体)_
- ID: `silentgear:brilliant`
- 类型: `silentgear:simple_trait`
- 最大等级: 1

### [Brittle](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/brittle.json)
- 装备有时会承受额外伤害（与Malleable抵消）
- 存在于：
  - 材料：**Basalt** _(主体, 工具杆)_, **Blackstone** _(主体, 工具杆)_, **Diamond** _(主体, 工具杆, 尖端升级)_, **Dimerald** _(主体, 工具杆)_, **Emerald** _(主体, 工具杆, 尖端升级)_, **Flint** _(工具杆)_, **Obsidian** _(工具杆)_, **Quartz** _(工具杆)_, **Sandstone** _(工具杆)_, **Stone** _(工具杆)_, **Terracotta** _(主体, 工具杆)_
- ID: `silentgear:brittle`
- 类型: `silentgear:durability`
- 最大等级: 5
- 与...抵消: `silentgear:malleable`
- 额外信息:
  - 有10%几率每等级承受1.0额外伤害

### [Bulky](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/bulky.json)
- 待测试，未实装
- 存在于：
  - 材料：无
- 条件：(装备类型: 工具)
- ID: `silentgear:bulky`
- 类型: `silentgear:stat_modifier`
- 最大等级: 5
- 额外信息:
  - 攻击速度: -0.075 * 等级 * 耐久损失

### [Chilled](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/chilled.json)
- 对下界和火焰免疫生物造成更多伤害
- 存在于：
  - 材料：无
- 条件：(装备类型: 武器)
- ID: `silentgear:chilled`
- 类型: `silentgear:damage_type`
- 最大等级: 5

### [Chipping](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/chipping.json)
- 随着装备耐久度损失，减少护甲或增加挖掘速度
- 存在于：
  - 材料：**Basalt** _(主体, 工具杆)_, **Bone** _(主体)_, **Obsidian** _(工具杆)_, **Quartz** _(尖端升级)_, **Terracotta** _(主体)_
- ID: `silentgear:chipping`
- 类型: `silentgear:stat_modifier`
- 最大等级: 5
- 额外信息:
  - 护甲: -0.075 * 等级 * 耐久损失 * 数值
  - 挖掘速度: 0.25 * 等级 * 耐久损失 * 数值

### [Confetti!](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/confetti.json)
- 我喜欢大爆炸
- 存在于：
  - 材料：无
- 条件：(装备类型: 武器)
- ID: `silentgear:confetti`
- 类型: `silentgear:simple_trait`
- 最大等级: 5

### [Crackler](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/crackler.json)
- 消耗耐久度创造并放置玄武岩
- 存在于：
  - 材料：无
- 条件：(装备类型: 工具)
- ID: `silentgear:crackler`
- 类型: `silentgear:block_placer`
- 最大等级: 1
- 额外信息:
  - 放置: minecraft:basalt
  - 耐久消耗: 3

### [Crude](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/crude.json)
- 减少协同效果（与Synergy Boost抵消）
- 存在于：
  - 材料：**Rough Wood** _(工具杆)_
- ID: `silentgear:crude`
- 类型: `silentgear:synergy`
- 最大等级: 5
- 与...抵消: `silentgear:synergistic`, `silentgear:rustic`
- 额外信息:
  - 请阅读[此页面](https://github.com/SilentChaos512/Silent-Gear/wiki/Synergy)了解更多关于协同效果的信息
  - 如果大于0%，协同效果减少0.04

### [Crushing](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/crushing.json)
- 随着装备耐久度损失，增加护甲或减少攻击伤害
- 存在于：
  - 材料：**Obsidian** _(主体)_, **Quartz** _(主体)_, **Stone** _(工具杆)_, **Terracotta** _(工具杆)_
- ID: `silentgear:crushing`
- 类型: `silentgear:stat_modifier`
- 最大等级: 5
- 额外信息:
  - 护甲: 0.05 * 等级 * 耐久损失 * 数值
  - 攻击伤害: -0.1667 * 等级 * 耐久损失 * 数值

### [Cure Poison](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/cure_poison.json)
- 装备时移除中毒效果
- 存在于：
  - 材料：无
- ID: `silentgear:cure_poison`
- 类型: `silentgear:cancel_effects`
- 最大等级: 1
- 额外信息:
  - 取消以下效果: `minecraft:poison`

### [Cure Wither](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/cure_wither.json)
- 装备时移除凋零效果
- 存在于：
  - 材料：无
- ID: `silentgear:cure_wither`
- 类型: `silentgear:cancel_effects`
- 最大等级: 1
- 额外信息:
  - 取消以下效果: `minecraft:wither`

### [Cursed](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/cursed.json)
- 减少幸运值，真不幸
- 存在于：
  - 材料：**Amethyst** _(饰品)_
- ID: `silentgear:cursed`
- 类型: `silentgear:attribute`
- 最大等级: 7
- 与...抵消: `silentgear:lucky`
- 额外信息:
  - 请查看Lucky特性的额外信息和此维基页面：https://minecraft.gamepedia.com/Luck
  - 全部
    - minecraft:generic.luck: 增加 [-0.5, -1.0, -1.5, -2.0, -3.0, -4.0, -5.0]

### [Eroded](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/eroded.json)
- 随着装备耐久度损失，增加挖掘速度并减少攻击伤害
- 存在于：
  - 材料：**Netherrack** _(主体, 工具杆)_, **Redstone Alloy** _(主体)_
- 条件：(装备类型: 工具)
- ID: `silentgear:eroded`
- 类型: `silentgear:stat_modifier`
- 最大等级: 5
- 与...抵消: `silentgear:jagged`
- 额外信息:
  - 攻击伤害: -0.15 * 等级 * 耐久损失 * 数值
  - 挖掘速度: 0.15 * 等级 * 耐久损失 * 数值

### [Fiery](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/fiery.json)
- 为合适的装备添加火焰附加或火矢
- 存在于：
  - 材料：**Blaze Gold** _(尖端升级)_, **Crimson Iron** _(尖端升级)_
- 条件：(装备类型: 武器)
- ID: `silentgear:fiery`
- 类型: `silentgear:enchantment`
- 最大等级: 2
- 额外信息:
  - 远程武器
    - minecraft:flame: [1]
  - 近战武器
    - minecraft:fire_aspect: [1, 2]

### [Fireproof](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/fireproof.json)
- 丢入火或岩浆中时不会被摧毁
- 存在于：
  - 材料：**Netherite** _(涂层)_
- ID: `silentgear:fireproof`
- 类型: `silentgear:simple_trait`
- 最大等级: 1
- 额外信息:
  - 该物品不会被火或岩浆摧毁

### [Flame Ward](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/flame_ward.json)
- 护甲提供火焰抗性（仅限全套）
- 存在于：
  - 材料：**Crimson Steel** _(主体)_
- 条件：(装备类型: 护甲)
- ID: `silentgear:flame_ward`
- 类型: `silentgear:wielder_effect`
- 最大等级: 1
- 额外信息:
  - 该物品不会被火或岩浆摧毁
  - 护甲
    - 火焰抗性: [1] (需要全套护甲)

### [Flammable](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/flammable.json)
- 着火时承受伤害，且可用作燃料
- 存在于：
  - 材料：**Wooden** _(主体)_
- ID: `silentgear:flammable`
- 类型: `silentgear:simple_trait`
- 最大等级: 1

### [Flexible](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/flexible.json)
- 装备偶尔承受较少伤害（与Brittle抵消）
- 存在于：
  - 材料：**Azure Electrum** _(工具杆)_, **Bamboo** _(工具杆)_, **Blaze Gold** _(工具杆)_, **Blaze Rod** _(工具杆)_, **Bone** _(工具杆)_, **Bronze** _(工具杆)_, **Crimson Iron** _(工具杆)_, **Crimson Steel** _(工具杆)_, **End Rod** _(工具杆)_, **Fine Silk** _(绑带, 绳索, 绳索)_, **Fine Silk Cloth** _(内衬)_, **Flax** _(绑带)_, **Fluffy String** _(绑带)_, **Iron** _(工具杆)_, **Leather** _(握把, 内衬)_, **Netherrack** _(主体)_, **Netherwood** _(主体, 工具杆)_, **Phantom Membrane** _(内衬)_, **Signalum** _(主体, 工具杆)_, **Sinew** _(绑带, 绳索, 绳索)_, **String** _(绑带)_, **Titanium** _(工具杆)_, **Wooden** _(工具杆)_, **Wool** _(握把, 内衬)_
- ID: `silentgear:flexible`
- 类型: `silentgear:durability`
- 最大等级: 5
- 与...抵消: `silentgear:bending`
- 额外信息:
  - 有7%几率每等级减少1.0伤害

### [Floatstoner](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/floatstoner.json)
- 消耗耐久度创造并放置末地石
- 存在于：
  - 材料：无
- 条件：(装备类型: 工具)
- ID: `silentgear:floatstoner`
- 类型: `silentgear:block_placer`
- 最大等级: 1
- 额外信息:
  - 放置: minecraft:end_stone
  - 耐久消耗: 3

### [Gold Digger](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/gold_digger.json)
- 挖矿时有时增加金粒掉落
- 存在于：
  - 材料：**Dimerald** _(主体)_, **Tyrian Steel** _(尖端升级)_
- 条件：(装备类型: 采集工具)
- ID: `silentgear:gold_digger`
- 类型: `silentgear:bonus_drops`
- 最大等级: 5
- 额外信息:
  - 每等级有15%几率额外掉落50%的`silentgear:gold_digger`（标签）

### [Greedy](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/greedy.json)
- 增加矿石的挖掘速度
- 存在于：
  - 材料：**Blaze Gold** _(主体)_
- ID: `silentgear:greedy`
- 类型: `silentgear:block_mining_speed`
- 最大等级: 5

### [Hard](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/hard.json)
- 随着物品耐久度损失，增加挖掘速度或减少远程伤害（与Soft抵消）
- 存在于：
  - 材料：**Blackstone** _(主体, 工具杆)_, **Compressed Iron** _(主体)_, **Crimson Iron** _(主体)_, **Crimson Steel** _(主体)_, **Refined Obsidian** _(主体, 工具杆)_, **Titanium** _(主体, 工具杆)_
- 条件：(装备类型: 工具)
- ID: `silentgear:hard`
- 类型: `silentgear:stat_modifier`
- 最大等级: 5
- 与...抵消: `silentgear:soft`
- 额外信息:
  - 远程伤害: -0.1 * 等级 * 耐久损失 * 数值
  - 挖掘速度: 0.05 * 等级 * 耐久损失 * 数值

### [Heavy](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/heavy.json)
- 护甲减少移动速度
- 存在于：
  - 材料：无
- 条件：(装备类型: 护甲)
- ID: `silentgear:heavy`
- 类型: `silentgear:attribute`
- 最大等级: 5
- 与...抵消: `silentgear:light`
- 额外信息:
  - 护甲/头部
    - minecraft:generic.movement_speed: 基础倍率 [-0.01, -0.02, -0.03, -0.04, -0.05]
  - 护甲/脚部
    - minecraft:generic.movement_speed: 基础倍率 [-0.01, -0.02, -0.03, -0.04, -0.05]
  - 护甲/腿部
    - minecraft:generic.movement_speed: 基础倍率 [-0.01, -0.02, -0.03, -0.04, -0.05]
  - 护甲/胸部
    - minecraft:generic.movement_speed: 基础倍率 [-0.01, -0.02, -0.03, -0.04, -0.05]

### [Holy](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/holy.json)
- 对亡灵生物造成额外伤害
- 存在于：
  - 材料：**Lapis Lazuli** _(尖端升级)_
- 条件：(装备类型: 武器)
- ID: `silentgear:holy`
- 类型: `silentgear:damage_type`
- 最大等级: 5

### [Ignite](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/ignite.json)
- 以少量耐久消耗点燃方块
- 存在于：
  - 材料：无
- 条件：(装备类型: 工具)
- ID: `silentgear:ignite`
- 类型: `silentgear:block_placer`
- 最大等级: 1
- 额外信息:
  - 放置: minecraft:fire
  - 耐久消耗: 1

### [Imperial](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/imperial.json)
- 挖矿时有时增加宝石掉落
- 存在于：
  - 材料：**Dimerald** _(尖端升级)_, **Tyrian Steel** _(尖端升级)_
- 条件：(装备类型: 采集工具)
- ID: `silentgear:imperial`
- 类型: `silentgear:bonus_drops`
- 最大等级: 5
- 额外信息:
  - 每等级有8%几率额外掉落100%的`silentgear:imperial_drops`（标签）

### [Indestructible](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/indestructible.json)
- 防止耐久度损失
- 存在于：
  - 材料：无
- ID: `silentgear:indestructible`
- 类型: `silentgear:simple_trait`
- 最大等级: 1
- 额外信息:
  - 物品的耐久损失将保持与添加该特性时相同
  - 如有需要，该物品仍可修复

### [Jabberwocky](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/jabberwocky.json)
-  brillig时分，slithy toves / 在wabe中gyre和gimble
- 存在于：
  - 材料：无
- 条件：(装备类型: 采集工具)
- ID: `silentgear:jabberwocky`
- 类型: `silentgear:simple_trait`
- 最大等级: 1
- 额外信息:
用此特性挖掘某些方块时可能会发生某些事情

### [Jagged](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/jagged.json)
- 随着物品耐久度损失，增加攻击伤害或减少远程伤害
- 存在于：
  - 材料：**Blackstone** _(主体, 工具杆)_, **End Stone** _(主体)_, **Flint** _(主体, 工具杆)_, **Netherwood** _(主体)_, **Obsidian** _(主体)_, **Quartz** _(主体, 尖端升级)_, **Wooden** _(主体)_
- ID: `silentgear:jagged`
- 类型: `silentgear:stat_modifier`
- 最大等级: 5
- 与...抵消: `silentgear:eroded`
- 额外信息:
  - 攻击伤害: 0.1667 * 等级 * 耐久损失 * 数值
  - 远程伤害: -0.1667 * 等级 * 耐久损失 * 数值

### [Kitty Vision](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/kitty_vision.json)
- 头盔和饰品提供夜视
- 存在于：
  - 材料：**Dimerald** _(饰品)_
- 条件：((装备类型: 头盔 OR 装备类型: 饰品))
- ID: `silentgear:kitty_vision`
- 类型: `silentgear:wielder_effect`
- 最大等级: 1
- 额外信息:
  - 头盔
    - 夜视: [1] (按特性等级)
  - 饰品
    - 夜视: [1] (按特性等级)

### [Light](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/light.json)
- 护甲增加移动速度
- 存在于：
  - 材料：**Azure Electrum** _(主体)_, **Phantom Membrane** _(内衬)_
- 条件：(装备类型: 护甲)
- ID: `silentgear:light`
- 类型: `silentgear:attribute`
- 最大等级: 5
- 与...抵消: `silentgear:heavy`
- 额外信息:
  - 护甲/头部
    - minecraft:generic.movement_speed: 基础倍率 [0.01, 0.02, 0.03, 0.04, 0.05]
  - 护甲/脚部
    - minecraft:generic.movement_speed: 基础倍率 [0.01, 0.02, 0.03, 0.04, 0.05]
  - 护甲/腿部
    - minecraft:generic.movement_speed: 基础倍率 [0.01, 0.02, 0.03, 0.04, 0.05]
  - 护甲/胸部
    - minecraft:generic.movement_speed: 基础倍率 [0.01, 0.02, 0.03, 0.04, 0.05]

### [Lucky](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/lucky.json)
- 手持时增加幸运值（这不是时运）
- 存在于：
  - 材料：**Fine Silk** _(绑带)_, **Lapis Lazuli** _(饰品, 尖端升级)_
- ID: `silentgear:lucky`
- 类型: `silentgear:attribute`
- 最大等级: 7
- 与...抵消: `silentgear:cursed`
- 额外信息:
  - **幸运值与时运附魔无关！** 它会影响某些战利品表的掉落，但不是大多数。它不会增加普通矿石的掉落。请在此阅读更多信息：https://minecraft.gamepedia.com/Luck
  - 全部
    - minecraft:generic.luck: 增加 [0.5, 1.0, 1.5, 2.0, 3.0, 4.0, 5.0]

### [Lustrous](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/lustrous.json)
- 工具在光照下获得大幅挖掘速度提升
- 存在于：
  - 材料：**Bismuth** _(主体)_, **Bismuth Brass** _(主体)_, **Bismuth Steel** _(主体)_, **Diamond** _(主体, 工具杆, 尖端升级)_, **Electrum** _(工具杆)_, **Glowstone** _(尖端升级)_, **Refined Glowstone** _(主体, 工具杆)_, **Signalum** _(主体, 工具杆)_
- 条件：(装备类型: 采集工具)
- ID: `silentgear:lustrous`
- 类型: `silentgear:simple_trait`
- 最大等级: 5

### [Magmatic](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/magmatic.json)
- 自动熔炼
- 存在于：
  - 材料：**Crimson Steel** _(尖端升级)_
- 条件：(装备类型: 采集工具)
- ID: `silentgear:magmatic`
- 类型: `silentgear:simple_trait`
- 最大等级: 1
- 额外信息:
熔炼掉落物不受时运影响，以防止物品复制

### [Magnetic](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/magnetic.json)
- 吸引附近物品
- 存在于：
  - 材料：**Compressed Iron** _(工具杆)_, **Iron** _(主体, 工具杆)_, **Refined Iron** _(工具杆)_
- ID: `silentgear:magnetic`
- 类型: `silentgear:simple_trait`
- 最大等级: 5
- 额外信息:
更高等级增加范围

### [Malleable](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/malleable.json)
- 装备有时承受较少伤害（与Brittle抵消）
- 存在于：
  - 材料：**Aluminum** _(主体, 工具杆)_, **Aluminum Steel** _(主体, 工具杆)_, **Azure Electrum** _(主体, 尖端升级)_, **Azure Silver** _(主体, 尖端升级)_, **Bismuth** _(主体, 工具杆)_, **Bismuth Brass** _(主体, 工具杆)_, **Bismuth Steel** _(主体, 工具杆)_, **Blaze Gold** _(主体)_, **Blaze Rod** _(工具杆)_, **Brass** _(主体, 工具杆)_, **Compressed Iron** _(主体, 工具杆)_, **Crimson Iron** _(主体)_, **Crimson Steel** _(主体)_, **Electrum** _(主体)_, **End Stone** _(工具杆)_, **Enderium** _(主体, 工具杆)_, **Gold** _(主体, 尖端升级)_, **High-Carbon Steel** _(主体)_, **Invar** _(主体, 工具杆)_, **Iron** _(主体, 尖端升级)_, **Lead** _(主体)_, **Lumium** _(主体, 工具杆)_, **Nickel** _(主体, 工具杆)_, **Osmium** _(主体, 工具杆)_, **Platinum** _(主体, 工具杆)_, **Redstone Alloy** _(主体, 工具杆)_, **Refined Glowstone** _(主体, 工具杆)_, **Refined Iron** _(主体, 工具杆)_, **Refined Obsidian** _(主体, 工具杆)_, **Silver** _(主体, 工具杆)_, **Steel** _(主体, 工具杆)_, **Tin** _(主体, 工具杆)_, **Titanium** _(主体)_, **Uranium** _(主体, 工具杆)_, **Zinc** _(主体, 工具杆)_
- ID: `silentgear:malleable`
- 类型: `silentgear:durability`
- 最大等级: 5
- 与...抵消: `silentgear:brittle`
- 额外信息:
  - 有10%几率每等级减少1.0伤害

### [Mighty](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/mighty.json)
- 根据特性等级在工具上提供力量和/或急迫
- 存在于：
  - 材料：**Quartz** _(饰品)_
- 条件：((装备类型: 工具 OR 装备类型: 饰品))
- ID: `silentgear:mighty`
- 类型: `silentgear:wielder_effect`
- 最大等级: 5
- 额外信息:
  - 工具
    - 力量: [0, 0, 1, 1, 2] (按特性等级)
    - 急迫: [1, 1, 1, 2, 3] (按特性等级)
  - 饰品
    - 急迫: [1, 1, 2, 2, 3] (按特性等级)

### [Moonwalker](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/moonwalker.json)
- 我不相信重力！
- 存在于：
  - 材料：**Azure Silver** _(主体)_
- 条件：((装备类型: 靴子 OR 装备类型: 饰品))
- ID: `silentgear:moonwalker`
- 类型: `silentgear:attribute`
- 最大等级: 5
- 额外信息:
  - 全部
    - forge:entity_gravity: 基础倍率 [-0.15, -0.3, -0.45000002, -0.6, -0.75]

### [Multi-break](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/multi_break.json)
- 待编码，未实现
- 存在于：
  - 材料：无
- ID: `silentgear:multi_break`
- 类型: `silentgear:simple_trait`
- 最大等级: 5
- 额外信息:
  - 此特性从未被编码 ~~几乎已成为梗~~
  - 预期效果：像矿脉矿工一样挖掘多个方块

### [Organic](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/organic.json)
- 随着物品耐久度损失，获得附魔能力，但失去魔法伤害
- 存在于：
  - 材料：无
- ID: `silentgear:organic`
- 类型: `silentgear:stat_modifier`
- 最大等级: 5
- 与...抵消: `silentgear:eroded`
- 额外信息:
  - 附魔值: 0.1 * 等级 * 耐久损失 * 数值
  - 魔法伤害: -0.15 * 等级 * 耐久损失 * 数值

### [Racker](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/racker.json)
- 消耗耐久度放置下界岩
- 存在于：
  - 材料：无
- 条件：(装备类型: 工具)
- ID: `silentgear:racker`
- 类型: `silentgear:block_placer`
- 最大等级: 1
- 额外信息:
  - 放置: minecraft:netherrack
  - 耐久消耗: 3

### [Reach](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/reach.json)
- 增加方块触及距离
- 存在于：
  - 材料：**Blaze Rod** _(工具杆)_, **Emerald** _(饰品)_
- ID: `silentgear:reach`
- 类型: `silentgear:attribute`
- 最大等级: 5
- 额外信息:
  - 全部
    - forge:block_reach: 增加 [0.5, 1.0, 1.5, 2.0, 3.0]

### [Red Card](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/red_card.json)
- trait.silentgear.red_card.desc
- 存在于：
  - 材料：无
  - 部件：**Red Card**
- ID: `silentgear:red_card`
- 类型: `silentgear:simple_trait`
- 最大等级: 1

### [Refractive](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/refractive.json)
- 使用时放置幻影光源
- 存在于：
  - 材料：**End Rod** _(工具杆)_, **Glowstone** _(尖端升级)_, **Lumium** _(主体, 工具杆)_, **Refined Glowstone** _(尖端升级)_
- 条件：(装备类型: 工具)
- ID: `silentgear:refractive`
- 类型: `silentgear:block_placer`
- 最大等级: 1
- 额外信息:
  - 放置: silentgear:phantom_light
  - 耐久消耗: 5

### [Renew](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/renew.json)
- 随时间缓慢修复物品
- 存在于：
  - 材料：**Amethyst** _(主体)_, **Phantom Membrane** _(主体)_
- ID: `silentgear:renew`
- 类型: `silentgear:self_repair`
- 最大等级: 5
- 额外信息:
  - 每等级每秒有1.8%几率恢复1点耐久
  - 仅在装备或玩家背包中时生效

### [Road Maker](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/road_maker.json)
- 将泥土类方块变为草径
- 存在于：
  - 材料：无
  - 部件：**Road Maker Upgrade**
- ID: `silentgear:road_maker`
- 类型: `silentgear:block_filler`
- 最大等级: 1
- 额外信息:
  - 填充为: minecraft:dirt_path
  - 替换
    - 方块: minecraft:grass_block
    - 不替换方块实体
  - 填充区域
    - X: 3 (+1)
    - Y: 1 (+0)
    - Z: 3 (+1)
    - 潜行时: 不触发
  - 耐久消耗: 0.5

### [Rustic](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/rustic.json)
- 如果协同效果为100%或更低，则增加协同效果
- 存在于：
  - 材料：**Terracotta** _(主体)_
- ID: `silentgear:rustic`
- 类型: `silentgear:synergy`
- 最大等级: 5
- 与...抵消: `silentgear:synergistic`
- 额外信息:
  - 请阅读[此页面](https://github.com/SilentChaos512/Silent-Gear/wiki/Synergy)了解更多关于协同效果的信息
  - 如果在74%到100%之间，协同效果增加0.05

### [Sharp](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/sharp.json)
- 随着耐久度损失，获得挖掘速度和攻击伤害提升
- 存在于：
  - 材料：**Bronze** _(主体)_
- 条件：(装备类型: 工具)
- ID: `silentgear:sharp`
- 类型: `silentgear:stat_modifier`
- 最大等级: 5
- 额外信息:
  - 攻击伤害: 0.125 * 等级 * 耐久损失 * 数值
  - 挖掘速度: 0.125 * 等级 * 耐久损失 * 数值

### [Silky](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/silky.json)
- 为采集工具添加精准采集
- 存在于：
  - 材料：**Amethyst** _(尖端升级)_, **Brass** _(主体)_
- 条件：(装备类型: 采集工具)
- ID: `silentgear:silky`
- 类型: `silentgear:enchantment`
- 最大等级: 1
- 额外信息:
  - 采集工具
    - minecraft:silk_touch: [1]

### [Snow Walker](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/snow_walker.json)
- 在细雪上行走不会下陷
- 存在于：
  - 材料：**Fine Silk Cloth** _(主体)_, **Leather** _(主体)_, **Wool** _(主体)_
- ID: `silentgear:snow_walker`
- 类型: `silentgear:simple_trait`
- 最大等级: 1
- 额外信息:
允许玩家在细雪上行走而不下陷。这适用于任何护甲或饰品。

### [Soft](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/soft.json)
- 随着工具耐久度损失，减少挖掘速度（与Hard抵消）
- 存在于：
  - 材料：**Aluminum** _(主体)_, **Azure Silver** _(主体, 尖端升级)_, **Blaze Gold** _(涂层, 尖端升级)_, **Copper** _(主体, 工具杆)_, **Electrum** _(主体)_, **Gold** _(涂层, 主体, 尖端升级)_, **Lead** _(工具杆)_, **Platinum** _(主体, 工具杆)_, **Silver** _(主体, 工具杆)_, **Tin** _(主体, 工具杆)_, **Zinc** _(主体, 工具杆)_
- 条件：(装备类型: 工具)
- ID: `silentgear:soft`
- 类型: `silentgear:stat_modifier`
- 最大等级: 5
- 与...抵消: `silentgear:hard`
- 额外信息:
  - 挖掘速度: -0.15 * 等级 * 耐久损失 * 数值

### [Spoon](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/spoon.json)
- 镐可以挖掘土壤
- 存在于：
  - 材料：无
  - 部件：**Spoon Upgrade**
- 条件：(装备类型: 镐)
- ID: `silentgear:spoon`
- 类型: `silentgear:simple_trait`
- 最大等级: 1

### [Stellar](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/stellar.json)
- 护甲提供速度和跳跃提升，物品缓慢自我修复
- 存在于：
  - 材料：**Refined Iron** _(主体)_
- ID: `silentgear:stellar`
- 类型: `silentgear:stellar`
- 最大等级: 5
- 额外信息:
  - 每等级每秒有2%几率恢复1点耐久
  - 护甲
    - 速度: [0, 1, 2, 3] (按护甲件数)
    - 跳跃提升: [1, 2, 3, 4] (按护甲件数)

### [Sturdy](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/sturdy.json)
- 装备经常承受较少伤害
- 存在于：
  - 材料：**Crimson Steel** _(工具杆)_, **End Rod** _(工具杆)_, **Tyrian Steel** _(主体, 工具杆)_
- ID: `silentgear:sturdy`
- 类型: `silentgear:durability`
- 最大等级: 5
- 与...抵消: `silentgear:brittle`
- 额外信息:
  - 有17%几率每等级减少1.0伤害

### [Swift Swim](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/swift_swim.json)
- 增加游泳速度
- 存在于：
  - 材料：**Prismarine** _(饰品)_
- ID: `silentgear:swift_swim`
- 类型: `silentgear:attribute`
- 最大等级: 5
- 额外信息:
  - 全部
    - forge:swim_speed: 增加 [0.2, 0.4, 0.6, 0.8, 1.0]

### [Synergistic](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/synergistic.json)
- 如果基础值超过100%，装备获得协同效果加成
- 存在于：
  - 材料：**Aluminum** _(主体, 工具杆)_, **Aluminum Steel** _(主体, 工具杆)_, **Emerald** _(主体, 尖端升级)_
- ID: `silentgear:synergistic`
- 类型: `silentgear:synergy`
- 最大等级: 5
- 与...抵消: `silentgear:crude`
- 额外信息:
  - 请阅读[此页面](https://github.com/SilentChaos512/Silent-Gear/wiki/Synergy)了解更多关于协同效果的信息
  - 如果大于100%，协同效果增加0.04

### [Terminus](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/terminus.json)
- 使用时创造并放置石头方块
- 存在于：
  - 材料：无
- 条件：(装备类型: 工具)
- ID: `silentgear:terminus`
- 类型: `silentgear:block_placer`
- 最大等级: 1
- 额外信息:
  - 放置: minecraft:stone
  - 耐久消耗: 3

### [Turtle](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/turtle.json)
- 屏息更长时间
- 存在于：
  - 材料：**Turtle** _(主体)_
- 条件：((装备类型: 头盔 OR 装备类型: 饰品))
- ID: `silentgear:turtle`
- 类型: `silentgear:simple_trait`
- 最大等级: 1

### [Venom](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/venom.json)
- 攻击时使目标中毒
- 存在于：
  - 材料：无
- 条件：(装备类型: 工具)
- ID: `silentgear:venom`
- 类型: `silentgear:target_effect`
- 最大等级: 5
- 额外信息:
  - 工具
    - 等级 1:
      - effect.minecraft.poison, 持续时间: 80
    - 等级 2:
      - effect.minecraft.poison, 持续时间: 160
    - 等级 3:
      - effect.minecraft.poison, 持续时间: 240
    - 等级 4:
      - effect.minecraft.poison, 持续时间: 320
    - 等级 5:
      - effect.minecraft.poison, 持续时间: 400

### [Void Ward](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/void_ward.json)
- 保护穿戴者免于坠入虚空
- 存在于：
  - 材料：**Tyrian Steel** _(主体)_
- 条件：(装备类型: 护甲)
- ID: `silentgear:void_ward`
- 类型: `silentgear:simple_trait`
- 最大等级: 1
- 额外信息:
当受到虚空伤害时，玩家会被向上弹射并获得飘浮和缓降效果

### [Vulcan](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/vulcan.json)
- 以高耐久消耗放置黑曜石
- 存在于：
  - 材料：**Refined Obsidian** _(尖端升级)_
- 条件：(装备类型: 工具)
- ID: `silentgear:vulcan`
- 类型: `silentgear:block_placer`
- 最大等级: 1
- 额外信息:
  - 放置: minecraft:obsidian
  - 耐久消耗: 20
  - 冷却: 100

### [Widen](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/widen.json)
- 增加锤子和挖掘铲的效果半径
- 存在于：
  - 材料：无
  - 部件：**Wide Plate**
- 条件：(装备类型: 采集工具)
- ID: `silentgear:widen`
- 类型: `silentgear:simple_trait`
- 最大等级: 3
- 额外信息:
  - 将特性等级加到效果半径上
  - 等级 1 = 5x5, 2 = 7x7, 3 = 9x9

### [trait.silentgear.nc_radiation_protection](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/nc_radiation_protection.json)
- trait.silentgear.nc_radiation_protection.desc
- 存在于：
  - 材料：无
- ID: `silentgear:nc_radiation_protection`
- 类型: `silentgear:nbt`
- 最大等级: 5