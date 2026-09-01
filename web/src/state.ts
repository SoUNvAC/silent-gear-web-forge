/**
 * AppState + 迷你 pub/sub（零框架 UI 的状态源）
 *
 * 组件通过 subscribe 订阅、update(patch) 触发重渲染；state 是模块级 let，组件只读。
 * 数据流：装配（materialChoices）→ Calc → Rating → UI；Best Build 由 Optimizer 引擎产出。
 */
import type { PartTypeId } from '../../src/data/types.js';
import type { GradeLevel, MaterialChoice } from '../../src/calc/index.js';
import type { RatingProfile } from '../../src/rating/index.js';
import type { ChargeBuild } from './best-queue.js';
import type { RatingPresetId } from './rating-presets.js';

export type OwnershipFilter = 'all' | 'owned' | 'missing';

/** Best Build 充能模式：'all' = 跨充能探索（单一评分群体，总分可比）；'0'..'3' = 只看该等级 */
export type ChargeMode = 'all' | '0' | '1' | '2' | '3';
export type MobileStep = 'assembly' | 'materials' | 'result';

export interface AppState {
  /** 当前装配的装备类型（null = 未选） */
  gearTypeId: string | null;
  /** 每必填槽选中的材料 + 该槽品级（MaterialChoice：品级逐槽，与游戏一致；grade 缺省 = NONE） */
  materialChoices: Partial<Record<PartTypeId, MaterialChoice>>;
  /** Best Build 应用后的动态复合材料子材料；仅 materials.length >= 2 的槽存在。 */
  compoundChoices: Partial<Record<PartTypeId, MaterialChoice[]>>;
  /** Best Build 搜索的全局品级（独立配置，不进装配计算；装配每槽品级见 materialChoices[slot].grade） */
  grade: GradeLevel;
  chargeLevel: number;
  damageRatio: number;
  /** 窄屏工作流当前步骤；桌面布局忽略。 */
  mobileStep: MobileStep;
  /** 当前选中的装配槽（Material Selector 的作用目标）；null = 未选 */
  selectedSlot: PartTypeId | null;
  /** 材料选择器搜索词 */
  search: string;
  /** 材料过滤器 */
  ownershipFilter: OwnershipFilter;
  /** 顶部 Best Build 队列（Optimizer weighted 按分降序前 N + 命中 profile） */
  bestBuilds: ChargeBuild[] | null;
  /** Best Build 充能模式（跨充能探索 / 固定某级） */
  bestChargeMode: ChargeMode;
  /** Best Build 「考虑附属加成」勾选框 */
  bestConsiderAddons: boolean;
  /** Best Build 「考虑复合材质（synergy）」勾选框（顶级材质集内精确复合搜索） */
  bestConsiderCompound: boolean;
  /** 智能推荐目标预设；会生成显式 RatingProfile 覆盖默认权重。 */
  bestRatingPreset: RatingPresetId;
  bestProfile: RatingProfile | null;
  bestRunning: boolean;
  bestError: string | null;
  /** 选中的升级部件 id（misc_upgrade；走 upgrade 通道，算法落地前不进 calc） */
  upgrades: string[];
}

export const initialState: AppState = {
  gearTypeId: null,
  materialChoices: {},
  compoundChoices: {},
  grade: 'NONE',
  chargeLevel: 0,
  damageRatio: 1,
  mobileStep: 'assembly',
  selectedSlot: null,
  search: '',
  ownershipFilter: 'all',
  bestBuilds: null,
  bestChargeMode: 'all',
  bestConsiderAddons: false,
  bestConsiderCompound: false,
  bestRatingPreset: 'balanced',
  bestProfile: null,
  bestRunning: false,
  bestError: null,
  upgrades: [],
};

type Listener = () => void;
const listeners = new Set<Listener>();

export let state: AppState = { ...initialState };

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function update(patch: Partial<AppState>): void {
  state = { ...state, ...patch };
  for (const fn of [...listeners]) fn();
}

/** 换装备类型时清空装配选择与 Best Build */
export function resetSelection(): void {
  update({
    materialChoices: {},
    compoundChoices: {},
    selectedSlot: null,
    mobileStep: 'assembly',
    search: '',
    bestBuilds: null,
    bestProfile: null,
    bestError: null,
    bestRunning: false,
    bestRatingPreset: 'balanced',
    upgrades: [],
  });
}
