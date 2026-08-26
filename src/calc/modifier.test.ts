import { describe, expect, it } from 'vitest';
import type { StatModifier } from '../data/types.js';
import {
  applyPercentModifier,
  applyGrade,
  applyStarcharged,
  applyCrude,
  GRADE_BONUS_PERCENT,
  STARCHARGED_REWRITE,
  CRUDE_MIXER_PROPERTY_MULTIPLIER,
} from './modifier.js';

const m = (operation: StatModifier['operation'], value: number): StatModifier => ({ operation, value });

describe('IMaterialModifier 统一公式 v + |v|·bonus', () => {
  it('正值按比例放大', () => {
    expect(applyPercentModifier(250, 0.05)).toBe(262.5);
  });
  it('负值按绝对值缩放（变浅）', () => {
    expect(applyPercentModifier(-10, 0.05)).toBe(-9.5);
  });
  it('零不变', () => {
    expect(applyPercentModifier(0, 0.5)).toBe(0);
  });
});

describe('grade', () => {
  it('等级表：NONE=0 … MAX=30（bonusPercent）', () => {
    expect(GRADE_BONUS_PERCENT).toEqual({ NONE: 0, E: 1, D: 2, C: 3, B: 4, A: 5, S: 10, SS: 15, SSS: 25, MAX: 30 });
  });
  it('grade A（+5%）：250 → 262.5', () => {
    expect(applyGrade(m('AVERAGE', 250), 'A').value).toBe(262.5);
  });
  it('NONE 恒等', () => {
    expect(applyGrade(m('AVERAGE', 250), 'NONE')).toEqual({ operation: 'AVERAGE', value: 250 });
  });
});

describe('starcharged', () => {
  it('q = 等级 × charging_value：等级2 × 0.7 = 1.4', () => {
    // 裸值 250 → ×1.25^1.4 ≈ 341.67；§7.2 完整版是 grade 后再充能：250→262.5→358.8
    expect(STARCHARGED_REWRITE.durability!(250, 1.4, 2)).toBeCloseTo(250 * Math.pow(1.25, 1.4), 8);
    expect(STARCHARGED_REWRITE.durability!(262.5, 1.4, 2)).toBeCloseTo(358.8, 1);
  });
  it('attack_damage +q：2.1 → 3.5', () => {
    expect(applyStarcharged(m('AVERAGE', 2.1), 'attack_damage', 1.4, 2).value).toBeCloseTo(3.5, 8);
  });
  it('harvest_speed +1.5·等级·q：6.3 → 10.5', () => {
    expect(applyStarcharged(m('AVERAGE', 6.3), 'harvest_speed', 1.4, 2).value).toBeCloseTo(10.5, 8);
  });
  it('enchantment_value ×1.1^q：14.7 → ≈16.8', () => {
    expect(applyStarcharged(m('AVERAGE', 14.7), 'enchantment_value', 1.4, 2).value).toBeCloseTo(16.8, 1);
  });
  it('MULTIPLY 修正原样保留', () => {
    expect(applyStarcharged(m('MULTIPLY_TOTAL', 0.3), 'durability', 1.4, 2)).toEqual({ operation: 'MULTIPLY_TOTAL', value: 0.3 });
  });
  it('属性表外（attack_speed）不变', () => {
    expect(applyStarcharged(m('AVERAGE', 0), 'attack_speed', 1.4, 2).value).toBe(0);
  });
  it('等级 0 → 不生效', () => {
    expect(applyStarcharged(m('AVERAGE', 250), 'durability', 0, 0)).toEqual({ operation: 'AVERAGE', value: 250 });
  });
});

describe('crude', () => {
  it('multiplier = 配置 0.8 − 1 = −0.2，套统一公式', () => {
    // Config.java:173 默认 0.8：v' = v + |v|·(0.8−1) = 0.8v
    expect(applyCrude(m('AVERAGE', 100), CRUDE_MIXER_PROPERTY_MULTIPLIER).value).toBe(80);
  });
});
