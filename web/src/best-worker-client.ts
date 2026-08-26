/**
 * Best Build 主线程客户端 —— 封装 worker 生命周期与请求/响应路由
 *
 * initBestWorker(data)：创建 module worker + 发 init（主线程已 fetch 过 data bundle）；
 * computeBestAsync(req)：按 id 路由 result/error 到 pending promise。计算全在 worker 里跑，
 * 主线程不阻塞（rAF spinner 照常）。worker 处理消息是同步 FIFO，多个请求排队依次执行；
 * 过期结果由调用方（best-build.ts latestToken）识别丢弃，客户端只管「响应 → 对应 promise」。
 */
import type { DataInput } from '../../src/data/repository.js';
import type { AcrossChargesResult } from './best-queue.js';
import type { BestComputeRequest } from './best-worker.js';

export type { BestComputeRequest } from './best-worker.js';

interface Pending {
  resolve: (r: AcrossChargesResult) => void;
  reject: (e: Error) => void;
}

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, Pending>();

/** 初始化 worker 并载入数据（幂等：重复调用忽略）。需在首次 computeBestAsync 前调用。 */
export function initBestWorker(data: DataInput): void {
  if (worker) return;
  const w = new Worker(new URL('./best-worker.ts', import.meta.url), { type: 'module' });
  worker = w;
  w.onmessage = (ev: MessageEvent) => {
    const msg = ev.data as { type: string; id?: number; payload?: AcrossChargesResult; message?: string };
    if (msg.type !== 'result' && msg.type !== 'error') return; // 忽略 ready 等非计算消息
    const id = msg.id ?? -1;
    const p = pending.get(id);
    if (!p) return;
    pending.delete(id);
    if (msg.type === 'result' && msg.payload) p.resolve(msg.payload);
    else p.reject(new Error(msg.message ?? 'Best Build 计算失败'));
  };
  w.postMessage({ type: 'init', data });
}

/** 发起一次寻优计算（返回 Promise；请求内容全部结构化克隆） */
export function computeBestAsync(req: BestComputeRequest): Promise<AcrossChargesResult> {
  if (!worker) throw new Error('Best Build worker 未初始化（initBestWorker 未调用）');
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker!.postMessage({ type: 'compute', id, ...req });
  });
}
