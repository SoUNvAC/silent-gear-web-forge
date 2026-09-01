import { describe, expect, it } from 'vitest';
import { displayedStatLabel, displayedStatValue } from './format.js';

describe('Minecraft 面板属性口径', () => {
  it('攻击伤害加玩家基础 1，内部引擎值不变', () => {
    expect(displayedStatValue('attack_damage', 5)).toBe(6);
    expect(displayedStatLabel('attack_damage')).toBe('攻击伤害（手持）');
  });

  it('最大耐久按游戏写入物品的口径取整', () => {
    expect(displayedStatValue('durability', 358.76)).toBe(359);
    expect(displayedStatLabel('durability')).toBe('最大耐久');
  });

  it('攻击速度等其他属性保持内部最终值', () => {
    expect(displayedStatValue('attack_speed', 1.6)).toBe(1.6);
    expect(displayedStatLabel('attack_speed')).toBe('攻击速度');
  });
});
