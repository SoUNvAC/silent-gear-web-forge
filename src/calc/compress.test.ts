import { describe, expect, it } from 'vitest';
import type { StatModifier } from '../data/types.js';
import { compressModifiers, getModifierWeight, getPrimaryMod, weightedAverage } from './compress.js';

const m = (operation: StatModifier['operation'], value: number): StatModifier => ({ operation, value });

describe('compressModifiers', () => {
  it('单修正 → 恒等', () => {
    const out = compressModifiers([m('AVERAGE', 250)]);
    expect(out.get('AVERAGE')?.value).toBe(250);
  });

  it('同 op 加权平均：数值大的修正占主导', () => {
    // primary=首值 250：w1=1+250/251≈1.996，w2=1+59/251≈1.235
    const out = compressModifiers([m('AVERAGE', 250), m('AVERAGE', 59)]);
    const v = out.get('AVERAGE')!.value;
    expect(v).toBeGreaterThan(154.5); // 高于简单平均
    expect(v).toBeCloseTo((250 * getModifierWeight(250, 250) + 59 * getModifierWeight(59, 250)) / (getModifierWeight(250, 250) + getModifierWeight(59, 250)), 10);
  });

  it('MAX 直接取最大（不平均）', () => {
    const out = compressModifiers([m('MAX', 5), m('MAX', 8)]);
    expect(out.get('MAX')?.value).toBe(8);
  });

  it('不同 op 分组，互不合并；同 op 加权平均成一个', () => {
    const out = compressModifiers([m('AVERAGE', 10), m('ADD', 1), m('ADD', 2)]);
    expect(out.get('AVERAGE')?.value).toBe(10);
    // ADD [1,2]：primary=首值 1 → w1=1+1/2=1.5, w2=1+2/2=2 → (1.5+4)/3.5≈1.571
    expect(out.get('ADD')?.value).toBeCloseTo((1.5 + 4) / 3.5, 10);
  });
});

describe('weightedAverage', () => {
  it('空 → 0', () => {
    expect(weightedAverage([])).toBe(0);
  });

  it('负值权重允许 <1（v 为负时），结果保留负修正', () => {
    // getPrimaryMod([-2,-1]) = 1（全负 → 1，NumberProperty.java:181-191）
    // w1=1+(-2)/2=0，w2=1+(-1)/2=0.5 → avg = (-2·0 + -1·0.5)/0.5 = -1
    expect(weightedAverage([m('AVERAGE', -2), m('AVERAGE', -1)])).toBeCloseTo(-1, 10);
  });
});

describe('getPrimaryMod（NumberProperty.java:181-191，new_1 §2）', () => {
  it('首值为正 → 取首值', () => {
    expect(getPrimaryMod([m('AVERAGE', 250), m('AVERAGE', 59)])).toBe(250);
  });
  it('跳过负数，取首个 ≥0 的值', () => {
    expect(getPrimaryMod([m('AVERAGE', -5), m('AVERAGE', 3), m('AVERAGE', 1)])).toBe(3);
  });
  it('首值为 0 → 返回 1', () => {
    expect(getPrimaryMod([m('AVERAGE', 0), m('AVERAGE', 5)])).toBe(1);
  });
  it('全部为负 → 返回 1', () => {
    expect(getPrimaryMod([m('AVERAGE', -2), m('AVERAGE', -1)])).toBe(1);
  });
  it('空列表 → 返回 1', () => {
    expect(getPrimaryMod([])).toBe(1);
  });
});
