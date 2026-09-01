/**
 * 属性面板 —— final 属性网格（按 gear.propertyGroups 收窄）+ 挖掘等级 + 特质
 */
import type { GearTypeDef } from '../../../src/data/types.js';
import { GEAR_PROPERTY_GROUP_STATS } from '../../../src/data/types.js';
import type { GearStats } from '../../../src/calc/index.js';
import { displayedStatLabel, displayedStatValue, formatNum } from '../format.js';
import { el } from './shared.js';
import { traitDescription } from '../trait-desc.js';
import { traitName } from '../names.js';

function preferredStats(gearType: GearTypeDef): string[] {
  const groups = new Set(gearType.propertyGroups);
  if (groups.has('ARMOR')) return ['durability', 'armor', 'armor_toughness', 'knockback_resistance'];
  if (groups.has('PROJECTILE')) return ['durability', 'ranged_damage', 'draw_speed', 'projectile_speed'];
  if (groups.has('HARVEST')) return ['durability', 'harvest_speed', 'attack_damage', 'attack_speed'];
  if (groups.has('ATTACK')) return ['durability', 'attack_damage', 'attack_speed', 'magic_damage'];
  return ['durability', 'enchantment_value', 'rarity', 'charging_value'];
}

export function renderStats(container: HTMLElement, gearType: GearTypeDef, stats: GearStats): void {
  const tier = stats.extras['harvest_tier'] as { level_hint?: string; name?: string } | undefined;
  const shown: string[] = [];
  for (const group of gearType.propertyGroups) {
    for (const stat of GEAR_PROPERTY_GROUP_STATS[group]) {
      const value = stats.final[stat];
      if (value !== undefined && Math.abs(displayedStatValue(stat, value)) > 1e-9 && !shown.includes(stat)) shown.push(stat);
    }
  }

  const preferred = preferredStats(gearType).filter((stat) => shown.includes(stat));
  const overview = el('div', 'key-stats-grid');
  if (tier?.level_hint !== undefined) {
    const card = el('div', 'key-stat');
    card.append(el('span', 'key-stat-label', '挖掘等级'), el('strong', 'key-stat-value', tier.level_hint));
    overview.append(card);
  }
  for (const stat of preferred) {
    const raw = stats.final[stat]!;
    const value = displayedStatValue(stat, raw);
    const card = el('div', 'key-stat');
    card.append(
      el('span', 'key-stat-label', displayedStatLabel(stat)),
      el('strong', `key-stat-value${value < 0 ? ' neg' : ''}`, formatNum(value)),
    );
    overview.append(card);
  }
  if (overview.childElementCount > 0) container.append(overview);

  const detailed = shown.filter((stat) => !preferred.includes(stat));
  if (detailed.length > 0) {
    const details = el('details', 'stats-details');
    const summary = el('summary', '', `详细属性 · ${detailed.length}`);
    const grid = el('div', 'stats-grid');
    for (const stat of detailed) {
      const displayed = displayedStatValue(stat, stats.final[stat]!);
      grid.append(el('div', 'stat-name', displayedStatLabel(stat)));
      grid.append(el('div', `stat-value${displayed > 0 ? ' pos' : displayed < 0 ? ' neg' : ''}`, formatNum(displayed)));
    }
    details.append(summary, grid);
    container.append(details);
  }

  if (stats.traits.length > 0) {
    container.append(el('div', 'stats-section-title', '特质'));
    const list = el('div', 'trait-list');
    for (const t of stats.traits) {
      const chip = el('span', 'trait');
      chip.append(el('span', '', `${traitName(t.trait)} Lv.${t.level}`));
      const desc = traitDescription(t.trait);
      if (desc) {
        chip.append(el('span', 'trait-tip', desc));
      } else {
        // 官方特性 dump 未收录该特质 → 诚实占位，不臆造描述
        chip.append(el('span', 'trait-tip no-desc', '（该特质未收录在官方特性 dump 中，无描述数据）'));
      }
      list.append(chip);
    }
    container.append(list);
  }
}
