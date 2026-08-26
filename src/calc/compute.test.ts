import { describe, expect, it } from 'vitest';
import type { StatModifier } from '../data/types.js';
import { computeProperty } from './compute.js';

const m = (operation: StatModifier['operation'], value: number): StatModifier => ({ operation, value });

describe('computeProperty（五运算顺序）', () => {
  it('纯 AVERAGE：B=0 + 加权平均', () => {
    expect(computeProperty([m('AVERAGE', 250)], 0, -Infinity, Infinity)).toBe(250);
  });

  it('MAX：把低于 MAX 的结果抬到 MAX', () => {
    expect(computeProperty([m('AVERAGE', 5), m('MAX', 8)], 0, -Infinity, Infinity)).toBe(8);
    expect(computeProperty([m('AVERAGE', 10), m('MAX', 8)], 0, -Infinity, Infinity)).toBe(10);
  });

  it('MULTIPLY_BASE：加法叠加，作用在 f0', () => {
    // f0=10 → 10×(1+0.1+0.2) ≈ 13（1+0.1+0.2 非精确二进制值）
    expect(computeProperty([m('AVERAGE', 10), m('MULTIPLY_BASE', 0.1), m('MULTIPLY_BASE', 0.2)], 0, -Infinity, Infinity)).toBeCloseTo(13, 12);
  });

  it('MULTIPLY_TOTAL：乘法叠加，作用在含 mul1 的总额', () => {
    // f0=10 → ×(1+0.1) → 11 → ×(1+0.5)×(1+0.2) = 11×1.5×1.2 = 19.8
    expect(computeProperty([m('AVERAGE', 10), m('MULTIPLY_BASE', 0.1), m('MULTIPLY_TOTAL', 0.5), m('MULTIPLY_TOTAL', 0.2)], 0, -Infinity, Infinity)).toBeCloseTo(19.8, 10);
  });

  it('ADD 最后加（在 mul1/mul2 之后）', () => {
    // f0=10 → ×(1+1.0)=20 → +5 = 25
    expect(computeProperty([m('AVERAGE', 10), m('MULTIPLY_BASE', 1.0), m('ADD', 5)], 0, -Infinity, Infinity)).toBe(25);
  });

  it('clamp 收尾', () => {
    expect(computeProperty([m('AVERAGE', 100)], 0, -3.9, 4.0)).toBe(4.0);
    expect(computeProperty([m('AVERAGE', -100)], 0, -3.9, 4.0)).toBe(-3.9);
  });

  it('无修正 → 0（B=0）', () => {
    expect(computeProperty([], 0, -Infinity, Infinity)).toBe(0);
  });
});
