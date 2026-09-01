/**
 * Best Build Web Worker —— 寻优计算移出主线程（2-3s 不卡 UI）
 *
 * 主线程只做三件快事：构造请求（含拥有权池）→ postMessage → 收结果刷新那一栏；
 * 计算在本 worker 里跑，主线程 rAF 动画照常。本 worker 持有一整套五层引擎
 * （Data→Calc→Rating→Optimizer，best-queue 从 context 取），与主线程完全独立：
 * 通过 init 消息接收 data-input bundle，内部用 shim（node:fs → 内联 JSON）建引擎。
 * 请求/响应全部结构化克隆（纯 JSON 数据，无函数/Map/Set）。
 *
 * 注意：worker 没有 localStorage → owned.ts 的 load() try/catch 静默退化 → isOwned 恒 true。
 * 拥有权白名单在**主线程**算好（ownedMaterialPool）随请求传入，worker 不感知拥有权。
 *
 * 测试性：setupWorkerEngines/dispatchBestCompute 导出，vitest（node）无 Worker 也能同步调用。
 */
import { DataRepository } from '../../src/data/repository.js';
import type { DataInput } from '../../src/data/repository.js';
import { GearCalcEngine } from '../../src/calc/index.js';
import { RatingEngine, transformUserRatingData } from '../../src/rating/index.js';
import { GearOptimizer } from '../../src/optimizer/index.js';
import { TRAIT_MAX_LEVELS, RATING_DATA } from './shim/node-fs.js';
import { initContext, repo, optimizer } from './context.js';
import type { AssetRegistry } from './assets/registry.js';
import type { GradeLevel } from '../../src/calc/index.js';
import type { PartTypeId } from '../../src/data/types.js';
import type { RatingProfile } from '../../src/rating/index.js';
import { bestAcrossCharges, bestWithAddons, bestWithCompound } from './best-queue.js';
import type { AcrossChargesResult, ChargeBuild } from './best-queue.js';

/** 主线程发来的计算请求（拥有权池已在主线程算好） */
export interface BestComputeRequest {
  /** 搜索模式：复合 / 附属全组合 / 跨充能 all / 单级充能 */
  kind: 'compound' | 'addons' | 'across' | 'single';
  gearTypeId: string;
  grade: GradeLevel;
  damageRatio: number;
  topN: number;
  chargeLevels: readonly number[];
  materialPool?: Partial<Record<PartTypeId, string[]>>;
  /** 用户在推荐区选择的显式权重 profile；所有搜索分支必须使用同一份。 */
  profile?: RatingProfile | null;
  /** 仅 compound 用：复合装配同时并入附属组合 */
  addons?: boolean;
}

export type WorkerInMessage =
  | { type: 'init'; data: DataInput }
  | ({ type: 'compute'; id: number } & BestComputeRequest);

export type WorkerOutMessage =
  | { type: 'ready' }
  | { type: 'result'; id: number; payload: AcrossChargesResult }
  | { type: 'error'; id: number; message: string };

// lib 只含 DOM（无 WebWorker lib）：worker 全局用结构化类型转码；消息形状靠联合类型保证。
// 消息处理必须同步（结构化克隆语义），下一个 message 一定在前一个算完后才触发。
const ctx = globalThis as unknown as {
  onmessage: ((ev: MessageEvent<WorkerInMessage>) => void) | null;
  postMessage: (msg: WorkerOutMessage) => void;
};

/** 建引擎 + 注入 context（init 消息处理；导出供测试复用） */
export function setupWorkerEngines(data: DataInput): void {
  const r = new DataRepository(data);
  const c = new GearCalcEngine(r, TRAIT_MAX_LEVELS);
  const rt = new RatingEngine(r, transformUserRatingData(RATING_DATA));
  const o = new GearOptimizer({ repo: r, calc: c, rating: rt });
  // worker 不渲染任何纹理 → assets 给空占位（context 仅类型引用，不会真正用到）
  initContext(r, c, rt, o, {} as AssetRegistry);
}

/** 请求派发（与主线程旧 computeBest 的四个分支同口径；导出供测试） */
export function dispatchBestCompute(req: BestComputeRequest): AcrossChargesResult {
  const gearType = repo.getGearType(req.gearTypeId);
  if (!gearType) throw new Error(`未知装备类型: ${req.gearTypeId}`);

  if (req.kind === 'single') {
    // 单级充能：optimizer.optimize 单次 → chargeLevel 盖章 + 防御性按总分降序
    const lv = req.chargeLevels[0] ?? 0;
    const r = optimizer.optimize(req.gearTypeId, 'weighted', {
      topN: req.topN,
      grade: req.grade,
      chargeLevel: lv,
      damageRatio: req.damageRatio,
      materialPool: req.materialPool,
      profile: req.profile,
    });
    if (r.builds.length === 0) throw new Error('无候选 Build');
    const builds: ChargeBuild[] = [...r.builds]
      .map((b, i) => ({ ...b, rank: i + 1, chargeLevel: lv }))
      .sort((a, b) => b.total - a.total);
    return { builds, profile: r.profile };
  }
  if (req.kind === 'compound') {
    return bestWithCompound(gearType, req.grade, req.damageRatio, req.topN, req.chargeLevels, req.materialPool, req.addons, req.profile);
  }
  if (req.kind === 'addons') {
    return bestWithAddons(gearType, req.grade, req.damageRatio, req.topN, req.chargeLevels, req.materialPool, req.profile);
  }
  return bestAcrossCharges(gearType, req.grade, req.damageRatio, req.topN, req.chargeLevels, req.materialPool, req.profile);
}

ctx.onmessage = (ev: MessageEvent<WorkerInMessage>) => {
  const msg = ev.data;
  if (msg.type === 'init') {
    setupWorkerEngines(msg.data);
    ctx.postMessage({ type: 'ready' });
    return;
  }
  if (msg.type === 'compute') {
    try {
      ctx.postMessage({ type: 'result', id: msg.id, payload: dispatchBestCompute(msg) });
    } catch (err) {
      ctx.postMessage({
        type: 'error',
        id: msg.id,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
};
