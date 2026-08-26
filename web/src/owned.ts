/**
 * 拥有权状态 —— 用户手动管理（默认全部拥有）
 *
 * 底部材料列表点击取消激活 = 记入 notOwned（图标灰度 = 未拥有）。
 * localStorage 持久化（用户手动状态，非数据源，不臆造）。视觉层专用，不参与计算。
 */
const STORAGE_KEY = 'sgear:owned';
const listeners = new Set<() => void>();

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

let notOwned = load();

function save(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...notOwned]));
  } catch {
    // 存储不可用（隐私模式等）→ 仅内存态
  }
}

export function isOwned(materialId: string): boolean {
  return !notOwned.has(materialId);
}

/** 未拥有材料 id（排序）—— Best Build 缓存键指纹：拥有权变化后不再复用旧结果 */
export function notOwnedIds(): string[] {
  return [...notOwned].sort();
}

export function toggleOwned(materialId: string): void {
  if (notOwned.has(materialId)) {
    notOwned.delete(materialId);
  } else {
    notOwned.add(materialId);
  }
  save();
  for (const fn of [...listeners]) fn();
}

export function subscribeOwned(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
