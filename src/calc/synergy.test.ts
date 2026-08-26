import { describe, expect, it } from 'vitest';
import { applySynergy, baseSynergyCurve, computeSynergy } from './synergy.js';

const mat = (id: string, categories: string[], rarity = 0) => ({ id, categories, rarity });
const B2 = baseSynergyCurve(2); // ≈1.18587（x=2 基础曲线）

describe('baseSynergyCurve（§6.1 曲线锚点）', () => {
  it('x=1 → 1.0', () => {
    expect(baseSynergyCurve(1)).toBeCloseTo(1.0, 10);
  });
  it('x=2 → ≈1.186', () => {
    expect(B2).toBeCloseTo(1.186, 3);
  });
  it('x=3 → ≈1.281', () => {
    expect(baseSynergyCurve(3)).toBeCloseTo(1.281, 3);
  });
  it('x→∞ → ≈1.576', () => {
    expect(baseSynergyCurve(100000)).toBeCloseTo(1.576, 3);
  });
});

describe('computeSynergy', () => {
  it('单一材质 → 恒为 1（simple 跳过）', () => {
    expect(computeSynergy([mat('a', ['metal'])])).toBe(1);
  });

  it('两材质无共同类别 → 减无共同类别惩罚', () => {
    // x=2 基础 B2，无共有类别 → −0.2
    const s = computeSynergy([mat('a', ['metal']), mat('b', ['wood'])]);
    expect(s).toBeCloseTo(B2 - 0.2, 8);
  });

  it('两材质有共同类别 → 无惩罚 + 共享类别奖励', () => {
    // metal 共享（count=2≥n）→ 无惩罚；奖励 b·c/(n−x+1)=0.015·2/1=0.03
    const s = computeSynergy([mat('a', ['metal', 'intermediate']), mat('b', ['metal', 'common'])]);
    expect(s).toBeCloseTo(B2 + 0.03, 8);
  });

  it('稀有度差异惩罚（首材质为主）', () => {
    // metal 共享 → 无惩罚 + 奖励 0.03；|20−30|×0.001=0.01
    const s = computeSynergy([mat('a', ['metal'], 20), mat('b', ['metal'], 30)]);
    expect(s).toBeCloseTo(B2 + 0.03 - 0.01, 8);
  });

  it('clamp 到 [0.1, 2.0]', () => {
    const s = computeSynergy([mat('a', ['x'], 1000), mat('b', ['y'], 0)]);
    expect(s).toBeGreaterThanOrEqual(0.1);
    expect(s).toBeLessThanOrEqual(2.0);
  });

  it('synergy traits：crude −0.04/级（无门槛）', () => {
    const s = computeSynergy([mat('a', ['metal']), mat('b', ['metal'])], [{ trait: 'silentgear:crude', level: 2 }]);
    expect(s).toBeCloseTo(B2 + 0.03 - 0.08, 8);
  });

  it('synergy traits：rustic 门槛 (0.749, 1.001)——基准 B2+0.03≈1.216 不在区间内', () => {
    const s = computeSynergy([mat('a', ['metal']), mat('b', ['metal'])], [{ trait: 'silentgear:rustic', level: 1 }]);
    expect(s).toBeCloseTo(B2 + 0.03, 8);
  });

  it('synergy traits：synergistic 门槛 (1, ∞)', () => {
    const s = computeSynergy([mat('a', ['metal']), mat('b', ['metal'])], [{ trait: 'silentgear:synergistic', level: 1 }]);
    expect(s).toBeCloseTo(B2 + 0.03 + 0.04, 8);
  });
});

describe('applySynergy', () => {
  it('v>0 → v·s', () => {
    expect(applySynergy({ operation: 'AVERAGE', value: 100 }, 1.5, true).value).toBe(150);
  });
  it('v<0 → v·(2−s)', () => {
    expect(applySynergy({ operation: 'AVERAGE', value: -100 }, 1.5, true).value).toBe(-50);
  });
  it('v=0 → 0', () => {
    expect(applySynergy({ operation: 'AVERAGE', value: 0 }, 1.5, true).value).toBe(0);
  });
  it('不受影响属性 / s=1 → 不变', () => {
    expect(applySynergy({ operation: 'AVERAGE', value: 10 }, 1.5, false).value).toBe(10);
    expect(applySynergy({ operation: 'AVERAGE', value: 10 }, 1, true).value).toBe(10);
  });
});
