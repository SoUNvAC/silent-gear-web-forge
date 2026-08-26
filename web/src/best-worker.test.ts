/**
 * Best Build worker 派发逻辑 —— 测试 dispatchBestCompute（worker 在 node 里不可实例化，
 * 但派发是纯同步函数：setupWorkerEngines 建引擎 + initContext，与 best-queue.test.ts 同装配路径）。
 *
 * 覆盖：single 模式 chargeLevel 盖章 + rank/总分降序；across 模式跨 charge 单一群体；
 * 未知装备类型抛诚实错误；compound 小池 pass-through。
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { loadDataFromDisk } from '../../src/data/loadDisk.js';
import { setupWorkerEngines, dispatchBestCompute } from './best-worker.js';
import type { BestComputeRequest } from './best-worker.js';

let pool: NonNullable<BestComputeRequest['materialPool']>;

beforeAll(() => {
  setupWorkerEngines(loadDataFromDisk({ dataDir: 'data', gearTypesJsonPath: 'src/data/gear-types.json' }));
  pool = { 'silentgear:main': ['silentgear:iron', 'silentgear:steel'], 'silentgear:rod': ['silentgear:basalt'] };
});

describe('dispatchBestCompute single 模式', () => {
  it('固定 chargeLevel 盖章 + rank 连续 + 总分非增', () => {
    const r = dispatchBestCompute({
      kind: 'single',
      gearTypeId: 'silentgear:pickaxe',
      grade: 'NONE',
      damageRatio: 1,
      topN: 4,
      chargeLevels: [2],
      materialPool: pool,
    });
    expect(r.builds.length).toBeGreaterThan(0);
    r.builds.forEach((b, i) => {
      expect(b.chargeLevel).toBe(2);
      expect(b.rank).toBe(i + 1);
      if (i > 0) expect(b.total).toBeLessThanOrEqual(r.builds[i - 1]!.total);
    });
  });
});

describe('dispatchBestCompute across 模式', () => {
  it('跨充能单一评分群体，chargeLevel 只落在探索范围内', () => {
    const r = dispatchBestCompute({
      kind: 'across',
      gearTypeId: 'silentgear:pickaxe',
      grade: 'NONE',
      damageRatio: 1,
      topN: 6,
      chargeLevels: [0, 1, 2, 3],
      materialPool: pool,
    });
    expect(r.builds.length).toBeGreaterThan(0);
    for (const b of r.builds) {
      expect([0, 1, 2, 3]).toContain(b.chargeLevel);
      expect(b.rank).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('dispatchBestCompute compound 模式', () => {
  it('小池 pass-through 不抛错，返回队列', () => {
    const r = dispatchBestCompute({
      kind: 'compound',
      gearTypeId: 'silentgear:pickaxe',
      grade: 'NONE',
      damageRatio: 1,
      topN: 4,
      chargeLevels: [0, 1],
      materialPool: pool,
    });
    expect(r.builds.length).toBeGreaterThan(0);
  });
});

describe('dispatchBestCompute 错误路由', () => {
  it('未知装备类型抛诚实错误（worker 里会转成 error 消息）', () => {
    expect(() =>
      dispatchBestCompute({
        kind: 'single',
        gearTypeId: 'silentgear:does_not_exist',
        grade: 'NONE',
        damageRatio: 1,
        topN: 4,
        chargeLevels: [0],
        materialPool: pool,
      }),
    ).toThrow(/未知装备类型/);
  });
});
