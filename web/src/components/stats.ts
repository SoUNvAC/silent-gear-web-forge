/**
 * 属性面板 —— final 属性网格（按 gear.propertyGroups 收窄）+ 挖掘等级 + 特质
 */
import type { GearTypeDef } from '../../../src/data/types.js';
import { GEAR_PROPERTY_GROUP_STATS } from '../../../src/data/types.js';
import type { GearStats } from '../../../src/calc/index.js';
import { formatNum, statLabel } from '../format.js';
import { el, clear } from './shared.js';
import { traitDescription } from '../trait-desc.js';

/** trait translate key → 末段英文（无中文表，回退保底） */
function traitLabel(trait: string): string {
  const bare = trait.replace(/^[^:]+:/, '');
  return bare.replace(/_/g, ' ');
}

export function renderStats(container: HTMLElement, gearType: GearTypeDef, stats: GearStats): void {
  clear(container);

  // 挖掘等级（extras.harvest_tier 是对象结构，非数值）
  const tier = stats.extras['harvest_tier'] as { level_hint?: string; name?: string } | undefined;
  if (tier && tier.level_hint !== undefined) {
    container.append(el('div', 'harvest-tier', `挖掘等级 ${tier.level_hint}`));
  }

  // 按属性组收窄：只显示 gearType 参与计算的属性
  const shown: string[] = [];
  for (const group of gearType.propertyGroups) {
    for (const stat of GEAR_PROPERTY_GROUP_STATS[group]) {
      if (stat in stats.final && !shown.includes(stat)) shown.push(stat);
    }
  }

  if (shown.length > 0) {
    container.append(el('div', 'stats-section-title', '属性'));
    const grid = el('div', 'stats-grid');
    for (const stat of shown) {
      const v = stats.final[stat];
      if (v === undefined) continue;
      grid.append(el('div', 'stat-name', statLabel(stat)));
      grid.append(el('div', `stat-value${v > 0 ? ' pos' : v < 0 ? ' neg' : ''}`, formatNum(v)));
    }
    container.append(grid);
  }

  if (stats.traits.length > 0) {
    container.append(el('div', 'stats-section-title', '特质'));
    const list = el('div', 'trait-list');
    for (const t of stats.traits) {
      const chip = el('span', 'trait');
      chip.append(el('span', '', `${traitLabel(t.trait)} Lv.${t.level}`));
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
