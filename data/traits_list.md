# Traits

Generated in-game by `sgear_traits dump_md` command on 2026/08/18 17:34:28

This data may or may not be accurate depending on the mod pack you are playing and the mods or data packs installed.

## Data Sources

The following mods and data packs have added traits to the output. Running the dump command yourself may produce different results.

- Silent Gear (silentgear) 3.6.6

## Trait Types

These are trait serializers. You can define custom instances of these types using data packs.
Code for traits and their serializers can be found in `net.silentchaos512.gear.gear.trait`.

Note that "simple" traits are often used where custom code is required.
They are not especially useful when just defined by a data pack.

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

## List of Traits
### [Accelerate](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/accelerate.json)
- Gains harvest speed, attack speed, and ranged speed as damaged
- Found On:
  - Materials: **Azure Electrum** _(Main, Tool Rod)_, **Fine Silk Cloth** _(Grip)_
- Conditions: (Gear Type: tool)
- ID: `silentgear:accelerate`
- Type: `silentgear:stat_modifier`
- Max Level: 5
- Extra Info:
  - Attack Speed: 0.01 * level * damage
  - Harvest Speed: 2.0 * level * damage
  - Ranged Speed: 0.01 * level * damage

### [Adamant](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/adamant.json)
- Armor increases damage resistance, tools deal more damage to mobs with a base health of more than 10 hearts
- Found On:
  - Materials: **Invar** _(Main)_, **Nickel** _(Main)_
- ID: `silentgear:adamant`
- Type: `silentgear:wielder_effect`
- Max Level: 5
- Extra Info:
  - armor
    - Resistance: [1, 1, 1, 2] (by armor piece count)

### [Ancient](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/ancient.json)
- Increases XP dropped by blocks and mobs
- Found On:
  - Materials: **Dimerald** _(Tool Rod)_, **End Stone** _(Main, Tool Rod)_, **Phantom Membrane** _(Grip)_, **Stone** _(Main)_
- Conditions: (Gear Type: tool)
- ID: `silentgear:ancient`
- Type: `silentgear:simple_trait`
- Max Level: 5

### [Aquatic](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/aquatic.json)
- Full set of armor gives water breathing, deals more damage to aquatic mobs
- Found On:
  - Materials: **Lead** _(Main)_, **Prismarine** _(Coating)_
- ID: `silentgear:aquatic`
- Type: `silentgear:wielder_effect`
- Max Level: 5
- Extra Info:
  - armor
    - Water Breathing: [1] (requires full set of armor)

### [Bastion](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/bastion.json)
- Provides bonus armor
- Found On:
  - Materials: **Diamond** _(Adornment)_
- Conditions: ((Gear Type: armor OR Gear Type: curio))
- ID: `silentgear:bastion`
- Type: `silentgear:attribute`
- Max Level: 5
- Extra Info:
  - all
    - minecraft:generic.armor: ADDITION [1.0, 2.0, 3.0, 4.0, 5.0]

### [Bending](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/bending.json)
- Gear sometimes takes extra damage (cancels with Flexible)
- Found On:
  - Materials: **Azure Silver** _(Tool Rod)_, **Copper** _(Tool Rod)_, **Gold** _(Tool Rod)_, **Netherrack** _(Tool Rod)_, **Rough Wood** _(Tool Rod)_
- ID: `silentgear:bending`
- Type: `silentgear:durability`
- Max Level: 5
- Cancels With: `silentgear:flexible`
- Extra Info:
  - -1.0 damage with a 7% chance per level

### [Bounce](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/bounce.json)
- Boots negate fall damage, armor knocks back attackers
- Found On:
  - Materials: **Slime** _(Lining)_
- Conditions: (Gear Type: armor)
- ID: `silentgear:bounce`
- Type: `silentgear:simple_trait`
- Max Level: 1

### [Brilliant](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/brilliant.json)
- Shiny! Piglin like.
- Found On:
  - Materials: **Blaze Gold** _(Coating, Main)_, **Gold** _(Coating, Main)_
- ID: `silentgear:brilliant`
- Type: `silentgear:simple_trait`
- Max Level: 1

### [Brittle](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/brittle.json)
- Gear sometimes takes extra damage (cancels with Malleable)
- Found On:
  - Materials: **Basalt** _(Main, Tool Rod)_, **Blackstone** _(Main, Tool Rod)_, **Diamond** _(Main, Tool Rod, Tip Upgrade)_, **Dimerald** _(Main, Tool Rod)_, **Emerald** _(Main, Tool Rod, Tip Upgrade)_, **Flint** _(Tool Rod)_, **Obsidian** _(Tool Rod)_, **Quartz** _(Tool Rod)_, **Sandstone** _(Tool Rod)_, **Stone** _(Tool Rod)_, **Terracotta** _(Main, Tool Rod)_
- ID: `silentgear:brittle`
- Type: `silentgear:durability`
- Max Level: 5
- Cancels With: `silentgear:malleable`
- Extra Info:
  - 1.0 damage with a 10% chance per level

### [Bulky](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/bulky.json)
- TODO, not tested
- Found On:
  - Materials: Nothing
- Conditions: (Gear Type: tool)
- ID: `silentgear:bulky`
- Type: `silentgear:stat_modifier`
- Max Level: 5
- Extra Info:
  - Attack Speed: -0.075 * level * damage

### [Chilled](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/chilled.json)
- Deals more damage to Nether and fire-immune mobs
- Found On:
  - Materials: Nothing
- Conditions: (Gear Type: weapon)
- ID: `silentgear:chilled`
- Type: `silentgear:damage_type`
- Max Level: 5

### [Chipping](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/chipping.json)
- Reduces armor or increases harvest speed as gear is damaged
- Found On:
  - Materials: **Basalt** _(Main, Tool Rod)_, **Bone** _(Main)_, **Obsidian** _(Tool Rod)_, **Quartz** _(Tip Upgrade)_, **Terracotta** _(Main)_
- ID: `silentgear:chipping`
- Type: `silentgear:stat_modifier`
- Max Level: 5
- Extra Info:
  - Armor: -0.075 * level * damage * value
  - Harvest Speed: 0.25 * level * damage * value

### [Confetti!](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/confetti.json)
- I like big boom boom
- Found On:
  - Materials: Nothing
- Conditions: (Gear Type: weapon)
- ID: `silentgear:confetti`
- Type: `silentgear:simple_trait`
- Max Level: 5

### [Crackler](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/crackler.json)
- Creates and places basalt at the cost of durability
- Found On:
  - Materials: Nothing
- Conditions: (Gear Type: tool)
- ID: `silentgear:crackler`
- Type: `silentgear:block_placer`
- Max Level: 1
- Extra Info:
  - Places: minecraft:basalt
  - Durability Cost: 3

### [Crude](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/crude.json)
- Reduces synergy (cancels with Synergy Boost)
- Found On:
  - Materials: **Rough Wood** _(Tool Rod)_
- ID: `silentgear:crude`
- Type: `silentgear:synergy`
- Max Level: 5
- Cancels With: `silentgear:synergistic`, `silentgear:rustic`
- Extra Info:
  - Please read [this page](https://github.com/SilentChaos512/Silent-Gear/wiki/Synergy) for more information on synergy
  - -0.04 synergy if greater than 0%

### [Crushing](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/crushing.json)
- Increases armor or decreases attack damage as gear is damaged
- Found On:
  - Materials: **Obsidian** _(Main)_, **Quartz** _(Main)_, **Stone** _(Tool Rod)_, **Terracotta** _(Tool Rod)_
- ID: `silentgear:crushing`
- Type: `silentgear:stat_modifier`
- Max Level: 5
- Extra Info:
  - Armor: 0.05 * level * damage * value
  - Attack Damage: -0.1667 * level * damage * value

### [Cure Poison](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/cure_poison.json)
- Removes poison effect when equipped
- Found On:
  - Materials: Nothing
- ID: `silentgear:cure_poison`
- Type: `silentgear:cancel_effects`
- Max Level: 1
- Extra Info:
  - Cancels these effects: `minecraft:poison`

### [Cure Wither](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/cure_wither.json)
- Removes wither effect when equipped
- Found On:
  - Materials: Nothing
- ID: `silentgear:cure_wither`
- Type: `silentgear:cancel_effects`
- Max Level: 1
- Extra Info:
  - Cancels these effects: `minecraft:wither`

### [Cursed](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/cursed.json)
- Reduces luck, how unfortunate
- Found On:
  - Materials: **Amethyst** _(Adornment)_
- ID: `silentgear:cursed`
- Type: `silentgear:attribute`
- Max Level: 7
- Cancels With: `silentgear:lucky`
- Extra Info:
  - Please see the extra info on the Lucky trait and this wiki page: https://minecraft.gamepedia.com/Luck
  - all
    - minecraft:generic.luck: ADDITION [-0.5, -1.0, -1.5, -2.0, -3.0, -4.0, -5.0]

### [Eroded](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/eroded.json)
- Increases harvest speed and reduces attack damage as gear is damaged
- Found On:
  - Materials: **Netherrack** _(Main, Tool Rod)_, **Redstone Alloy** _(Main)_
- Conditions: (Gear Type: tool)
- ID: `silentgear:eroded`
- Type: `silentgear:stat_modifier`
- Max Level: 5
- Cancels With: `silentgear:jagged`
- Extra Info:
  - Attack Damage: -0.15 * level * damage * value
  - Harvest Speed: 0.15 * level * damage * value

### [Fiery](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/fiery.json)
- Adds Fire Aspect or Flame to appropriate gear
- Found On:
  - Materials: **Blaze Gold** _(Tip Upgrade)_, **Crimson Iron** _(Tip Upgrade)_
- Conditions: (Gear Type: weapon)
- ID: `silentgear:fiery`
- Type: `silentgear:enchantment`
- Max Level: 2
- Extra Info:
  - ranged_weapon
    - minecraft:flame: [1]
  - melee_weapon
    - minecraft:fire_aspect: [1, 2]

### [Fireproof](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/fireproof.json)
- Cannot be destroyed when dropped in fire or lava
- Found On:
  - Materials: **Netherite** _(Coating)_
- ID: `silentgear:fireproof`
- Type: `silentgear:simple_trait`
- Max Level: 1
- Extra Info:
  - The item cannot be destroyed by fire or lava

### [Flame Ward](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/flame_ward.json)
- Gives fire resistance on armor (full set only)
- Found On:
  - Materials: **Crimson Steel** _(Main)_
- Conditions: (Gear Type: armor)
- ID: `silentgear:flame_ward`
- Type: `silentgear:wielder_effect`
- Max Level: 1
- Extra Info:
  - The item cannot be destroyed by fire or lava
  - armor
    - Fire Resistance: [1] (requires full set of armor)

### [Flammable](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/flammable.json)
- Takes damage when on fire and can be used as fuel
- Found On:
  - Materials: **Wooden** _(Main)_
- ID: `silentgear:flammable`
- Type: `silentgear:simple_trait`
- Max Level: 1

### [Flexible](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/flexible.json)
- Gear occasionally takes less damage (cancels with Brittle)
- Found On:
  - Materials: **Azure Electrum** _(Tool Rod)_, **Bamboo** _(Tool Rod)_, **Blaze Gold** _(Tool Rod)_, **Blaze Rod** _(Tool Rod)_, **Bone** _(Tool Rod)_, **Bronze** _(Tool Rod)_, **Crimson Iron** _(Tool Rod)_, **Crimson Steel** _(Tool Rod)_, **End Rod** _(Tool Rod)_, **Fine Silk** _(Binding, Cord, Cord)_, **Fine Silk Cloth** _(Lining)_, **Flax** _(Binding)_, **Fluffy String** _(Binding)_, **Iron** _(Tool Rod)_, **Leather** _(Grip, Lining)_, **Netherrack** _(Main)_, **Netherwood** _(Main, Tool Rod)_, **Phantom Membrane** _(Lining)_, **Signalum** _(Main, Tool Rod)_, **Sinew** _(Binding, Cord, Cord)_, **String** _(Binding)_, **Titanium** _(Tool Rod)_, **Wooden** _(Tool Rod)_, **Wool** _(Grip, Lining)_
- ID: `silentgear:flexible`
- Type: `silentgear:durability`
- Max Level: 5
- Cancels With: `silentgear:bending`
- Extra Info:
  - -1.0 damage with a 7% chance per level

### [Floatstoner](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/floatstoner.json)
- Creates and places end stone at the cost of durability
- Found On:
  - Materials: Nothing
- Conditions: (Gear Type: tool)
- ID: `silentgear:floatstoner`
- Type: `silentgear:block_placer`
- Max Level: 1
- Extra Info:
  - Places: minecraft:end_stone
  - Durability Cost: 3

### [Gold Digger](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/gold_digger.json)
- Sometimes increases nugget drops when mining
- Found On:
  - Materials: **Dimerald** _(Main)_, **Tyrian Steel** _(Tip Upgrade)_
- Conditions: (Gear Type: harvest_tool)
- ID: `silentgear:gold_digger`
- Type: `silentgear:bonus_drops`
- Max Level: 5
- Extra Info:
  - 15% chance per level of dropping 50% more of `silentgear:gold_digger` (tag)

### [Greedy](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/greedy.json)
- Increases the mining speed for ores
- Found On:
  - Materials: **Blaze Gold** _(Main)_
- ID: `silentgear:greedy`
- Type: `silentgear:block_mining_speed`
- Max Level: 5

### [Hard](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/hard.json)
- Increases harvest speed or decreases ranged damage as item is damaged (cancels with Soft)
- Found On:
  - Materials: **Blackstone** _(Main, Tool Rod)_, **Compressed Iron** _(Main)_, **Crimson Iron** _(Main)_, **Crimson Steel** _(Main)_, **Refined Obsidian** _(Main, Tool Rod)_, **Titanium** _(Main, Tool Rod)_
- Conditions: (Gear Type: tool)
- ID: `silentgear:hard`
- Type: `silentgear:stat_modifier`
- Max Level: 5
- Cancels With: `silentgear:soft`
- Extra Info:
  - Ranged Damage: -0.1 * level * damage * value
  - Harvest Speed: 0.05 * level * damage * value

### [Heavy](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/heavy.json)
- Armor decreases movement speed
- Found On:
  - Materials: Nothing
- Conditions: (Gear Type: armor)
- ID: `silentgear:heavy`
- Type: `silentgear:attribute`
- Max Level: 5
- Cancels With: `silentgear:light`
- Extra Info:
  - armor/head
    - minecraft:generic.movement_speed: MULTIPLY_BASE [-0.01, -0.02, -0.03, -0.04, -0.05]
  - armor/feet
    - minecraft:generic.movement_speed: MULTIPLY_BASE [-0.01, -0.02, -0.03, -0.04, -0.05]
  - armor/legs
    - minecraft:generic.movement_speed: MULTIPLY_BASE [-0.01, -0.02, -0.03, -0.04, -0.05]
  - armor/chest
    - minecraft:generic.movement_speed: MULTIPLY_BASE [-0.01, -0.02, -0.03, -0.04, -0.05]

### [Holy](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/holy.json)
- Deals extra damage to the undead
- Found On:
  - Materials: **Lapis Lazuli** _(Tip Upgrade)_
- Conditions: (Gear Type: weapon)
- ID: `silentgear:holy`
- Type: `silentgear:damage_type`
- Max Level: 5

### [Ignite](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/ignite.json)
- Lights blocks on fire at a small durability cost
- Found On:
  - Materials: Nothing
- Conditions: (Gear Type: tool)
- ID: `silentgear:ignite`
- Type: `silentgear:block_placer`
- Max Level: 1
- Extra Info:
  - Places: minecraft:fire
  - Durability Cost: 1

### [Imperial](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/imperial.json)
- Sometimes increases gem drops when mining
- Found On:
  - Materials: **Dimerald** _(Tip Upgrade)_, **Tyrian Steel** _(Tip Upgrade)_
- Conditions: (Gear Type: harvest_tool)
- ID: `silentgear:imperial`
- Type: `silentgear:bonus_drops`
- Max Level: 5
- Extra Info:
  - 8% chance per level of dropping 100% more of `silentgear:imperial_drops` (tag)

### [Indestructible](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/indestructible.json)
- Prevents durability loss
- Found On:
  - Materials: Nothing
- ID: `silentgear:indestructible`
- Type: `silentgear:simple_trait`
- Max Level: 1
- Extra Info:
  - The damage (durability lost) of the item will remain the same as when the trait was added
  - The item can still be repaired if desired

### [Jabberwocky](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/jabberwocky.json)
- ’Twas brillig, and the slithy toves / Did gyre and gimble in the wabe
- Found On:
  - Materials: Nothing
- Conditions: (Gear Type: harvest_tool)
- ID: `silentgear:jabberwocky`
- Type: `silentgear:simple_trait`
- Max Level: 1
- Extra Info:
Something may happen if you mine certain blocks with this

### [Jagged](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/jagged.json)
- Increases attack damage or decreased ranged damage as item is damaged
- Found On:
  - Materials: **Blackstone** _(Main, Tool Rod)_, **End Stone** _(Main)_, **Flint** _(Main, Tool Rod)_, **Netherwood** _(Main)_, **Obsidian** _(Main)_, **Quartz** _(Main, Tip Upgrade)_, **Wooden** _(Main)_
- ID: `silentgear:jagged`
- Type: `silentgear:stat_modifier`
- Max Level: 5
- Cancels With: `silentgear:eroded`
- Extra Info:
  - Attack Damage: 0.1667 * level * damage * value
  - Ranged Damage: -0.1667 * level * damage * value

### [Kitty Vision](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/kitty_vision.json)
- Gives night vision on helmets and curios
- Found On:
  - Materials: **Dimerald** _(Adornment)_
- Conditions: ((Gear Type: helmet OR Gear Type: curio))
- ID: `silentgear:kitty_vision`
- Type: `silentgear:wielder_effect`
- Max Level: 1
- Extra Info:
  - helmet
    - Night Vision: [1] (by trait level)
  - curio
    - Night Vision: [1] (by trait level)

### [Light](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/light.json)
- Armor increases movement speed
- Found On:
  - Materials: **Azure Electrum** _(Main)_, **Phantom Membrane** _(Lining)_
- Conditions: (Gear Type: armor)
- ID: `silentgear:light`
- Type: `silentgear:attribute`
- Max Level: 5
- Cancels With: `silentgear:heavy`
- Extra Info:
  - armor/head
    - minecraft:generic.movement_speed: MULTIPLY_BASE [0.01, 0.02, 0.03, 0.04, 0.05]
  - armor/feet
    - minecraft:generic.movement_speed: MULTIPLY_BASE [0.01, 0.02, 0.03, 0.04, 0.05]
  - armor/legs
    - minecraft:generic.movement_speed: MULTIPLY_BASE [0.01, 0.02, 0.03, 0.04, 0.05]
  - armor/chest
    - minecraft:generic.movement_speed: MULTIPLY_BASE [0.01, 0.02, 0.03, 0.04, 0.05]

### [Lucky](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/lucky.json)
- Adds luck when held (this is not Fortune)
- Found On:
  - Materials: **Fine Silk** _(Binding)_, **Lapis Lazuli** _(Adornment, Tip Upgrade)_
- ID: `silentgear:lucky`
- Type: `silentgear:attribute`
- Max Level: 7
- Cancels With: `silentgear:cursed`
- Extra Info:
  - **Luck has nothing to do with the Fortune enchantment!** It affects loot from some loot tables, but not most. It does not increase drops from normal ores. Please read here for more information: https://minecraft.gamepedia.com/Luck
  - all
    - minecraft:generic.luck: ADDITION [0.5, 1.0, 1.5, 2.0, 3.0, 4.0, 5.0]

### [Lustrous](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/lustrous.json)
- Tools gain a large harvest speed boost when in light
- Found On:
  - Materials: **Bismuth** _(Main)_, **Bismuth Brass** _(Main)_, **Bismuth Steel** _(Main)_, **Diamond** _(Main, Tool Rod, Tip Upgrade)_, **Electrum** _(Tool Rod)_, **Glowstone** _(Tip Upgrade)_, **Refined Glowstone** _(Main, Tool Rod)_, **Signalum** _(Main, Tool Rod)_
- Conditions: (Gear Type: harvest_tool)
- ID: `silentgear:lustrous`
- Type: `silentgear:simple_trait`
- Max Level: 5

### [Magmatic](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/magmatic.json)
- Auto-smelting
- Found On:
  - Materials: **Crimson Steel** _(Tip Upgrade)_
- Conditions: (Gear Type: harvest_tool)
- ID: `silentgear:magmatic`
- Type: `silentgear:simple_trait`
- Max Level: 1
- Extra Info:
Smelted drops are not affected by fortune to prevent item duplication

### [Magnetic](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/magnetic.json)
- Pulls in nearby items
- Found On:
  - Materials: **Compressed Iron** _(Tool Rod)_, **Iron** _(Main, Tool Rod)_, **Refined Iron** _(Tool Rod)_
- ID: `silentgear:magnetic`
- Type: `silentgear:simple_trait`
- Max Level: 5
- Extra Info:
Higher levels increase range

### [Malleable](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/malleable.json)
- Gear sometimes takes less damage (cancels with Brittle)
- Found On:
  - Materials: **Aluminum** _(Main, Tool Rod)_, **Aluminum Steel** _(Main, Tool Rod)_, **Azure Electrum** _(Main, Tip Upgrade)_, **Azure Silver** _(Main, Tip Upgrade)_, **Bismuth** _(Main, Tool Rod)_, **Bismuth Brass** _(Main, Tool Rod)_, **Bismuth Steel** _(Main, Tool Rod)_, **Blaze Gold** _(Main)_, **Blaze Rod** _(Tool Rod)_, **Brass** _(Main, Tool Rod)_, **Compressed Iron** _(Main, Tool Rod)_, **Crimson Iron** _(Main)_, **Crimson Steel** _(Main)_, **Electrum** _(Main)_, **End Stone** _(Tool Rod)_, **Enderium** _(Main, Tool Rod)_, **Gold** _(Main, Tip Upgrade)_, **High-Carbon Steel** _(Main)_, **Invar** _(Main, Tool Rod)_, **Iron** _(Main, Tip Upgrade)_, **Lead** _(Main)_, **Lumium** _(Main, Tool Rod)_, **Nickel** _(Main, Tool Rod)_, **Osmium** _(Main, Tool Rod)_, **Platinum** _(Main, Tool Rod)_, **Redstone Alloy** _(Main, Tool Rod)_, **Refined Glowstone** _(Main, Tool Rod)_, **Refined Iron** _(Main, Tool Rod)_, **Refined Obsidian** _(Main, Tool Rod)_, **Silver** _(Main, Tool Rod)_, **Steel** _(Main, Tool Rod)_, **Tin** _(Main, Tool Rod)_, **Titanium** _(Main)_, **Uranium** _(Main, Tool Rod)_, **Zinc** _(Main, Tool Rod)_
- ID: `silentgear:malleable`
- Type: `silentgear:durability`
- Max Level: 5
- Cancels With: `silentgear:brittle`
- Extra Info:
  - -1.0 damage with a 10% chance per level

### [Mighty](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/mighty.json)
- Gives strength and/or haste on tools based on trait level
- Found On:
  - Materials: **Quartz** _(Adornment)_
- Conditions: ((Gear Type: tool OR Gear Type: curio))
- ID: `silentgear:mighty`
- Type: `silentgear:wielder_effect`
- Max Level: 5
- Extra Info:
  - tool
    - Strength: [0, 0, 1, 1, 2] (by trait level)
    - Haste: [1, 1, 1, 2, 3] (by trait level)
  - curio
    - Haste: [1, 1, 2, 2, 3] (by trait level)

### [Moonwalker](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/moonwalker.json)
- I don't believe in gravity!
- Found On:
  - Materials: **Azure Silver** _(Main)_
- Conditions: ((Gear Type: boots OR Gear Type: curio))
- ID: `silentgear:moonwalker`
- Type: `silentgear:attribute`
- Max Level: 5
- Extra Info:
  - all
    - forge:entity_gravity: MULTIPLY_BASE [-0.15, -0.3, -0.45000002, -0.6, -0.75]

### [Multi-break](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/multi_break.json)
- TODO, not coded
- Found On:
  - Materials: Nothing
- ID: `silentgear:multi_break`
- Type: `silentgear:simple_trait`
- Max Level: 5
- Extra Info:
  - This trait has never been coded ~~and has almost achieved meme status~~
  - Intended effect: mine multiple blocks like vein miner

### [Organic](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/organic.json)
- Gains enchantability, but loses magic damage as the item is damaged
- Found On:
  - Materials: Nothing
- ID: `silentgear:organic`
- Type: `silentgear:stat_modifier`
- Max Level: 5
- Cancels With: `silentgear:eroded`
- Extra Info:
  - Enchantment Value: 0.1 * level * damage * value
  - Magic Damage: -0.15 * level * damage * value

### [Racker](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/racker.json)
- Places netherrack at the cost of durability
- Found On:
  - Materials: Nothing
- Conditions: (Gear Type: tool)
- ID: `silentgear:racker`
- Type: `silentgear:block_placer`
- Max Level: 1
- Extra Info:
  - Places: minecraft:netherrack
  - Durability Cost: 3

### [Reach](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/reach.json)
- Increases block reach distance
- Found On:
  - Materials: **Blaze Rod** _(Tool Rod)_, **Emerald** _(Adornment)_
- ID: `silentgear:reach`
- Type: `silentgear:attribute`
- Max Level: 5
- Extra Info:
  - all
    - forge:block_reach: ADDITION [0.5, 1.0, 1.5, 2.0, 3.0]

### [Red Card](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/red_card.json)
- trait.silentgear.red_card.desc
- Found On:
  - Materials: Nothing
  - Parts: **Red Card**
- ID: `silentgear:red_card`
- Type: `silentgear:simple_trait`
- Max Level: 1

### [Refractive](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/refractive.json)
- Place phantom lights when used
- Found On:
  - Materials: **End Rod** _(Tool Rod)_, **Glowstone** _(Tip Upgrade)_, **Lumium** _(Main, Tool Rod)_, **Refined Glowstone** _(Tip Upgrade)_
- Conditions: (Gear Type: tool)
- ID: `silentgear:refractive`
- Type: `silentgear:block_placer`
- Max Level: 1
- Extra Info:
  - Places: silentgear:phantom_light
  - Durability Cost: 5

### [Renew](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/renew.json)
- Slowly repairs the item over time
- Found On:
  - Materials: **Amethyst** _(Main)_, **Phantom Membrane** _(Main)_
- ID: `silentgear:renew`
- Type: `silentgear:self_repair`
- Max Level: 5
- Extra Info:
  - 1.8% chance per level of restoring 1 durability each second
  - Only works if equipped or in a player's inventory

### [Road Maker](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/road_maker.json)
- Turns dirt-like blocks into grass paths
- Found On:
  - Materials: Nothing
  - Parts: **Road Maker Upgrade**
- ID: `silentgear:road_maker`
- Type: `silentgear:block_filler`
- Max Level: 1
- Extra Info:
  - Fills with: minecraft:dirt_path
  - Replaces
    - Block: minecraft:grass_block
    - Does not replace tile entities
  - Fill Area
    - X: 3 (+1)
    - Y: 1 (+0)
    - Z: 3 (+1)
    - On sneak: PASS
  - Durability Cost: 0.5

### [Rustic](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/rustic.json)
- Increases synergy if it's 100% or less
- Found On:
  - Materials: **Terracotta** _(Main)_
- ID: `silentgear:rustic`
- Type: `silentgear:synergy`
- Max Level: 5
- Cancels With: `silentgear:synergistic`
- Extra Info:
  - Please read [this page](https://github.com/SilentChaos512/Silent-Gear/wiki/Synergy) for more information on synergy
  - +0.05 synergy if between 74% and 100%

### [Sharp](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/sharp.json)
- Gain harvest speed and attack damage as durability is lost
- Found On:
  - Materials: **Bronze** _(Main)_
- Conditions: (Gear Type: tool)
- ID: `silentgear:sharp`
- Type: `silentgear:stat_modifier`
- Max Level: 5
- Extra Info:
  - Attack Damage: 0.125 * level * damage * value
  - Harvest Speed: 0.125 * level * damage * value

### [Silky](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/silky.json)
- Adds Silk Touch to harvest tools
- Found On:
  - Materials: **Amethyst** _(Tip Upgrade)_, **Brass** _(Main)_
- Conditions: (Gear Type: harvest_tool)
- ID: `silentgear:silky`
- Type: `silentgear:enchantment`
- Max Level: 1
- Extra Info:
  - harvest_tool
    - minecraft:silk_touch: [1]

### [Snow Walker](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/snow_walker.json)
- Walk on powder snow without sinking
- Found On:
  - Materials: **Fine Silk Cloth** _(Main)_, **Leather** _(Main)_, **Wool** _(Main)_
- ID: `silentgear:snow_walker`
- Type: `silentgear:simple_trait`
- Max Level: 1
- Extra Info:
Allows the player to walk on powder snow without sinking. This will work on any armor or curio.

### [Soft](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/soft.json)
- Reduces harvest speed as tool is damaged (cancels with Hard)
- Found On:
  - Materials: **Aluminum** _(Main)_, **Azure Silver** _(Main, Tip Upgrade)_, **Blaze Gold** _(Coating, Tip Upgrade)_, **Copper** _(Main, Tool Rod)_, **Electrum** _(Main)_, **Gold** _(Coating, Main, Tip Upgrade)_, **Lead** _(Tool Rod)_, **Platinum** _(Main, Tool Rod)_, **Silver** _(Main, Tool Rod)_, **Tin** _(Main, Tool Rod)_, **Zinc** _(Main, Tool Rod)_
- Conditions: (Gear Type: tool)
- ID: `silentgear:soft`
- Type: `silentgear:stat_modifier`
- Max Level: 5
- Cancels With: `silentgear:hard`
- Extra Info:
  - Harvest Speed: -0.15 * level * damage * value

### [Spoon](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/spoon.json)
- Pickaxes can mine soil
- Found On:
  - Materials: Nothing
  - Parts: **Spoon Upgrade**
- Conditions: (Gear Type: pickaxe)
- ID: `silentgear:spoon`
- Type: `silentgear:simple_trait`
- Max Level: 1

### [Stellar](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/stellar.json)
- Armor gives speed and jump boost, items slowly repair themselves
- Found On:
  - Materials: **Refined Iron** _(Main)_
- ID: `silentgear:stellar`
- Type: `silentgear:stellar`
- Max Level: 5
- Extra Info:
  - Has a 2% chance per level to restore 1 durability each second
  - armor
    - Speed: [0, 1, 2, 3] (by armor piece count)
    - Jump Boost: [1, 2, 3, 4] (by armor piece count)

### [Sturdy](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/sturdy.json)
- Gear frequently takes less damage
- Found On:
  - Materials: **Crimson Steel** _(Tool Rod)_, **End Rod** _(Tool Rod)_, **Tyrian Steel** _(Main, Tool Rod)_
- ID: `silentgear:sturdy`
- Type: `silentgear:durability`
- Max Level: 5
- Cancels With: `silentgear:brittle`
- Extra Info:
  - -1.0 damage with a 17% chance per level

### [Swift Swim](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/swift_swim.json)
- Increases swim speed
- Found On:
  - Materials: **Prismarine** _(Adornment)_
- ID: `silentgear:swift_swim`
- Type: `silentgear:attribute`
- Max Level: 5
- Extra Info:
  - all
    - forge:swim_speed: ADDITION [0.2, 0.4, 0.6, 0.8, 1.0]

### [Synergistic](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/synergistic.json)
- Gear gets a synergy bonus (if base value is more than 100%)
- Found On:
  - Materials: **Aluminum** _(Main, Tool Rod)_, **Aluminum Steel** _(Main, Tool Rod)_, **Emerald** _(Main, Tip Upgrade)_
- ID: `silentgear:synergistic`
- Type: `silentgear:synergy`
- Max Level: 5
- Cancels With: `silentgear:crude`
- Extra Info:
  - Please read [this page](https://github.com/SilentChaos512/Silent-Gear/wiki/Synergy) for more information on synergy
  - +0.04 synergy if greater than 100%

### [Terminus](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/terminus.json)
- Creates and places stone blocks when used
- Found On:
  - Materials: Nothing
- Conditions: (Gear Type: tool)
- ID: `silentgear:terminus`
- Type: `silentgear:block_placer`
- Max Level: 1
- Extra Info:
  - Places: minecraft:stone
  - Durability Cost: 3

### [Turtle](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/turtle.json)
- Hold your breath for longer
- Found On:
  - Materials: **Turtle** _(Main)_
- Conditions: ((Gear Type: helmet OR Gear Type: curio))
- ID: `silentgear:turtle`
- Type: `silentgear:simple_trait`
- Max Level: 1

### [Venom](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/venom.json)
- Poisons the target when attacked
- Found On:
  - Materials: Nothing
- Conditions: (Gear Type: tool)
- ID: `silentgear:venom`
- Type: `silentgear:target_effect`
- Max Level: 5
- Extra Info:
  - tool
    - Level 1:
      - effect.minecraft.poison, Duration: 80
    - Level 2:
      - effect.minecraft.poison, Duration: 160
    - Level 3:
      - effect.minecraft.poison, Duration: 240
    - Level 4:
      - effect.minecraft.poison, Duration: 320
    - Level 5:
      - effect.minecraft.poison, Duration: 400

### [Void Ward](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/void_ward.json)
- Saves the wearer from falling out of the world
- Found On:
  - Materials: **Tyrian Steel** _(Main)_
- Conditions: (Gear Type: armor)
- ID: `silentgear:void_ward`
- Type: `silentgear:simple_trait`
- Max Level: 1
- Extra Info:
When void damage is taken, the player is launched upward and given a levitation and slow falling effect

### [Vulcan](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/vulcan.json)
- Places obsidian at a high durability cost
- Found On:
  - Materials: **Refined Obsidian** _(Tip Upgrade)_
- Conditions: (Gear Type: tool)
- ID: `silentgear:vulcan`
- Type: `silentgear:block_placer`
- Max Level: 1
- Extra Info:
  - Places: minecraft:obsidian
  - Durability Cost: 20
  - Cooldown: 100

### [Widen](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/widen.json)
- Increases the effect radius of hammers and excavators
- Found On:
  - Materials: Nothing
  - Parts: **Wide Plate**
- Conditions: (Gear Type: harvest_tool)
- ID: `silentgear:widen`
- Type: `silentgear:simple_trait`
- Max Level: 3
- Extra Info:
  - Adds the trait level to the effect radius
  - Level 1 = 5x5, 2 = 7x7, 3 = 9x9

### [trait.silentgear.nc_radiation_protection](https://github.com/SilentChaos512/Silent-Gear/tree/1.18.x/src/generated/resources/data/silentgear/silentgear_traits/nc_radiation_protection.json)
- trait.silentgear.nc_radiation_protection.desc
- Found On:
  - Materials: Nothing
- ID: `silentgear:nc_radiation_protection`
- Type: `silentgear:nbt`
- Max Level: 5

