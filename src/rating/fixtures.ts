/**
 * Rating Engine —— 测试用合成 GearStats 工厂（与 calc 引擎解耦的单测夹具）。
 * 只填充 Rating 关心的字段：gearType + final + extras（base/bonus 原样拷贝，traits 空）。
 */
import type { GearStats } from '../calc/engine.js';

export function mkStats(gearType: string, final: Record<string, number>, extras: Record<string, unknown> = {}): GearStats {
  return { gearType, base: { ...final }, bonus: {}, final: { ...final }, traits: [], extras };
}
