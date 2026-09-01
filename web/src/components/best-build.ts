/**
 * Best Build —— 顶部 PvZ 风格卡牌队列 + 品级/充能探索
 * 卡片极简：序号 + 合成图标 + 总分（+ 充能等级徽章）；鼠标悬浮卡片 → 该组合完整详情。
 *
 * 充能探索：默认「全部(0-3)」模式走 best-queue 的单一评分群体（bestAcrossCharges），
 * 总分跨 charge 直接可比 → 可看到「次材料高 charge value，charge III 反超优材料」；
 * 切到具体等级走 optimizer.optimize 单次。两者都只用公开引擎 API，引擎零改动。
 * 三槽类型全池超候选上限 → 捕获 OptimizerError 显示提示，不白屏。
 */
import { repo, calc, rating, assets } from '../context.js';
import { state, update, subscribe } from '../state.js';
import type { ChargeMode } from '../state.js';
import { gearTypeName, materialName, slotName, traitName } from '../names.js';
import { el, clear, textureImg, makeSelect } from './shared.js';
import { displayedStatLabel, displayedStatValue, formatNum } from '../format.js';
import type { OptBuild } from '../../../src/optimizer/index.js';
import type { RatingProfile } from '../../../src/rating/index.js';
import type { GradeLevel } from '../../../src/calc/index.js';
import { gearTypeAncestorChain } from '../../../src/calc/index.js';
import { ownedMaterialPool, CHARGE_LEVELS } from '../best-queue.js';
import type { ChargeBuild } from '../best-queue.js';
import { computeBestAsync } from '../best-worker-client.js';
import type { BestComputeRequest } from '../best-worker-client.js';
import { buildChoicesFromBuild, buildCompoundChoicesFromBuild } from '../selection.js';
import { notOwnedIds } from '../owned.js';
import { GRADE_LEVELS } from '../grade.js';
import type { Material, PartTypeId } from '../../../src/data/types.js';
import {
  availableRatingPresets,
  buildRatingPresetProfile,
  normalizedWeightSummary,
  ratingPresetLabel,
} from '../rating-presets.js';

/** 队列长度（PvZ 种子槽 6 → 12，用户要求不只 6 个选项） */
const TOP_N = 12;

interface CachedBest {
  builds: ChargeBuild[];
  profile: RatingProfile | null;
}

const cache = new Map<string, CachedBest>();
const errCache = new Map<string, string>();

function cacheKey(): string {
  // 拥有权指纹进键：库存点灭材质后键变化 → 旧结果不复用（配合「刷新」按钮强制重算）
  return `${state.gearTypeId}|${state.grade}|${state.bestChargeMode}|${state.bestConsiderAddons}|${state.bestConsiderCompound}|${state.bestRatingPreset}|${notOwnedIds().join(',')}`;
}

/** 计算令牌：结果回来时若已过期（换类型/改配置触发了新计算），只入缓存不刷新 UI */
let latestToken = 0;

function computeBest(gearTypeId: string): void {
  // 捕获发起时刻的配置，结果回来时用同一口径（防执行时状态已变导致键/结果不一致）
  const grade = state.grade;
  const damageRatio = state.damageRatio;
  const mode = state.bestChargeMode;
  const addons = state.bestConsiderAddons;
  const compound = state.bestConsiderCompound;
  const preset = state.bestRatingPreset;
  // 内部缓存键与 cacheKey() 同口径（含拥有权指纹 + 附属 + 复合）——修掉旧版「内部键缺指纹 → 命中陈旧缓存」隐患
  const key = `${gearTypeId}|${grade}|${mode}|${addons}|${compound}|${preset}|${notOwnedIds().join(',')}`;
  const cached = cache.get(key);
  if (cached) {
    update({ bestBuilds: cached.builds, bestProfile: cached.profile, bestRunning: false, bestError: null });
    return;
  }
  const err = errCache.get(key);
  if (err !== undefined) {
    update({ bestBuilds: null, bestProfile: null, bestRunning: false, bestError: err });
    return;
  }
  // 先置忙态：主线程立刻画出 spinner「计算中…」，重活全在 worker 里（rAF 动画不阻塞）
  update({ bestRunning: true, bestBuilds: null, bestProfile: null, bestError: null });
  const token = ++latestToken;

  try {
    const gearType = repo.getGearType(gearTypeId);
    if (!gearType) throw new Error(`未知装备类型: ${gearTypeId}`);
    const profile = buildRatingPresetProfile(repo, gearTypeId, preset, rating.resolveProfile(gearTypeId));
    // 拥有权白名单池在**主线程**算（worker 无 localStorage → isOwned 恒 true，不能自己判断拥有权）；
    // 附属模式并入 addableSlots。这步是纯数组查询，µs 级，不会卡。
    const slotIds: PartTypeId[] = addons
      ? [...gearType.requiredParts, ...gearType.addableSlots]
      : [...gearType.requiredParts];
    const pool = ownedMaterialPool(repo, gearType, slotIds);
    for (const slot of gearType.requiredParts) {
      if ((pool[slot] ?? []).length === 0) {
        throw new Error(`槽位 ${slotName(slot)} 无已拥有材质，无法生成最优解（在下方材料库存点选启用）`);
      }
    }
    const lvs: readonly number[] = mode === 'all' ? CHARGE_LEVELS : [Number(mode)];
    const kind: BestComputeRequest['kind'] = compound ? 'compound' : addons ? 'addons' : mode === 'all' ? 'across' : 'single';
    computeBestAsync({ kind, gearTypeId, grade, damageRatio, topN: TOP_N, chargeLevels: lvs, materialPool: pool, addons, profile })
      .then((r) => {
        // 结果入缓存（key 是发起时口径，缓存本身有效）；过期 → 不刷新 UI（新请求在跑）
        cache.set(key, r);
        if (token !== latestToken) return;
        update({ bestBuilds: r.builds, bestProfile: r.profile, bestRunning: false, bestError: null });
      })
      .catch((e: Error) => {
        const msg = e instanceof Error ? e.message : String(e);
        errCache.set(key, msg);
        if (token !== latestToken) return;
        update({ bestBuilds: null, bestProfile: null, bestRunning: false, bestError: msg });
      });
  } catch (err) {
    // 主线程侧同步错误（未知装备类型 / 整槽无已拥有材质）：无需等 worker
    const msg = err instanceof Error ? err.message : String(err);
    errCache.set(key, msg);
    update({ bestBuilds: null, bestProfile: null, bestRunning: false, bestError: msg });
  }
}

/**
 * 点击卡片 → 把该结果的完整槽位材料写进下方装配，预览实时重算。
 * 动态复合槽保留全部子材料；升级件不动（Best Build 不搜升级件）。
 * 充能等级同步到该卡所在等级 → 预览属性与卡片对得上（'all' 模式各卡等级不同）。
 */
function applyBuild(b: ChargeBuild, gearTypeId: string): void {
  update({
    materialChoices: buildChoicesFromBuild(b.assembly.slots),
    compoundChoices: buildCompoundChoicesFromBuild(b.assembly.slots),
    selectedSlot: null,
    chargeLevel: b.chargeLevel,
    mobileStep: 'result',
  });
}

/** 关键属性行（按 profile 优先级取前 3；trait 恒 0 分跳过） */
function coreStatRows(b: OptBuild, profile: RatingProfile | null): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (const c of (profile?.criteria ?? []).slice(0, 3)) {
    if (c.source === 'trait') continue;
    if (c.source === 'tier') {
      const tier = b.stats.extras['harvest_tier'] as { level_hint?: string } | undefined;
      if (tier?.level_hint !== undefined) out.push(statRow('挖掘等级', tier.level_hint));
      continue;
    }
    const v = b.stats.final[c.property];
    if (v === undefined) continue;
    out.push(statRow(displayedStatLabel(c.property), formatNum(displayedStatValue(c.property, v))));
  }
  return out;
}

function recommendationReason(profile: RatingProfile | null): string {
  const labels: string[] = [];
  for (const c of profile?.criteria ?? []) {
    if (c.source === 'trait') continue;
    const label = c.source === 'tier' ? '挖掘等级' : displayedStatLabel(c.property);
    if (!labels.includes(label)) labels.push(label);
    if (labels.length === 2) break;
  }
  return labels.length > 0 ? `侧重 ${labels.join(' · ')}` : '按综合属性排序';
}

function materialSummary(b: ChargeBuild): string {
  return b.assembly.slots
    .filter((s) => s.materials.length > 0)
    .map((s) => `${slotName(s.slot)} ${s.materials.map((m) => materialName(m.id)).join('+')}`)
    .join(' · ');
}

function statRow(k: string, v: string): HTMLElement {
  const d = el('div', 'pp-stat');
  d.append(el('span', 'k', k), el('span', 'v', v));
  return d;
}

/** 悬浮详情内容（卡片 hover 显示该组合完整信息） */
function popoverContent(gearTypeId: string, b: ChargeBuild): HTMLElement[] {
  const out: HTMLElement[] = [];

  const head = el('div', 'pp-head');
  head.append(el('span', 'pp-type', gearTypeName(gearTypeId)));
  head.append(el('span', 'pp-score', `总分 ${formatNum(b.total)}`));
  if (state.bestChargeMode === 'all') {
    head.append(el('span', 'pp-charge', `⚡充能 Lv.${b.chargeLevel}`));
  }
  out.push(head);
  out.push(el('div', 'pp-profile', `评分目标：${ratingPresetLabel(state.bestRatingPreset)}`));

  out.push(el('div', 'pp-sec', '槽位材料'));
  for (const s of b.assembly.slots) {
    const mats = s.materials.map((mc) => repo.getMaterial(mc.id)).filter((m): m is Material => m !== undefined);
    const row = el('div', 'pp-row');
    // 复合槽（materials ≥2）渲染全部子材质图标；卡图标仍是 materials[0]（视觉主材，近似）
    for (const mat of mats) {
      const tex = assets.partSlotTexture(gearTypeId, s.slot, mat) ?? assets.materialIcon(mat);
      row.append(textureImg(tex, 16));
    }
    row.append(el('span', 'pp-k', `${slotName(s.slot)}`));
    row.append(el('span', 'pp-v', mats.length > 0 ? mats.map((m) => materialName(m.id)).join(' + ') : '?'));
    if (s.materials.length >= 2) {
      const sVal = calc.computeCompoundSynergy(s, gearTypeAncestorChain(repo, gearTypeId));
      row.append(el('span', 'pp-syn', `S=${sVal.toFixed(3)}`));
    }
    out.push(row);
  }

  const stats = coreStatRows(b, state.bestProfile);
  if (stats.length > 0) {
    out.push(el('div', 'pp-sec', '关键属性'));
    const g = el('div', 'pp-stats');
    for (const d of stats) g.append(d);
    out.push(g);
  }

  if (b.stats.traits.length > 0) {
    out.push(el('div', 'pp-sec', '特质'));
    const t = el('div', 'pp-traits');
    for (const tr of b.stats.traits) {
      const chip = el('span', 'pp-trait');
      chip.append(textureImg(assets.traitTexture(tr.trait), 10));
      chip.append(el('span', '', `${traitName(tr.trait)} Lv.${tr.level}`));
      t.append(chip);
    }
    out.push(t);
  }
  return out;
}

/** 品级 + 充能模式控制行（随 render 重建，select 值恒与 state 同步） */
function controlsRow(): HTMLElement {
  const row = el('div', 'bb-controls');
  row.append(el('label', '', '品级'));
  row.append(
    makeSelect(
      GRADE_LEVELS.map((g) => ({ value: g, label: g })),
      state.grade,
      (v) => update({ grade: v as GradeLevel }),
    ),
  );
  row.append(el('label', '', '星光充能'));
  row.append(
    makeSelect(
      [{ value: 'all', label: '自动选择' }, ...CHARGE_LEVELS.map((lv) => ({ value: String(lv), label: `Lv.${lv}` }))],
      state.bestChargeMode,
      (v) => update({ bestChargeMode: v as ChargeMode }),
    ),
  );
  // 「考虑附属加成」：核心 Top-K × 附属槽全组合（单一评分群体，§6）
  const check = el('label', 'bb-check');
  const cb = el('input');
  cb.type = 'checkbox';
  cb.checked = state.bestConsiderAddons;
  cb.addEventListener('change', () => update({ bestConsiderAddons: cb.checked }));
  check.append(cb);
  check.append(el('span', '', '包含附属部件'));
  const tip = el('div', 'mc-tooltip');
  tip.append(el('span', '', '搜索范围含 tip/binding/coating 等附属槽（核心 Top-K × 附属全组合）'));
  check.append(tip);
  row.append(check);
  // 「考虑复合材质」：单材最优解里的顶级材质集内精确复合对（synergy 生效，每槽 2 材料）
  const check2 = el('label', 'bb-check');
  const cb2 = el('input');
  cb2.type = 'checkbox';
  cb2.checked = state.bestConsiderCompound;
  cb2.addEventListener('change', () => update({ bestConsiderCompound: cb2.checked }));
  check2.append(cb2);
  check2.append(el('span', '', '包含复合材料'));
  const tip2 = el('div', 'mc-tooltip');
  tip2.append(el('span', '', '复合只搜单材料最优解里的顶级材质（每槽 2 材料对，synergy 系数 S 生效；预算护栏 3 万）'));
  check2.append(tip2);
  row.append(check2);
  // 手动刷新：库存点灭材质后，旧结果缓存键含拥有权指纹已失效；刷新 = 清缓存 + 按当前库存重算
  const refresh = el('button', 'bb-btn', '刷新');
  refresh.type = 'button';
  refresh.disabled = state.bestRunning;
  refresh.title = '重新计算（应用当前材料库存：未拥有的材质不会出现在最优解）';
  refresh.addEventListener('click', () => {
    cache.clear();
    errCache.clear();
    if (state.gearTypeId) computeBest(state.gearTypeId);
  });
  row.append(refresh);
  return row;
}

function presetSelector(gearTypeId: string): HTMLElement {
  const wrap = el('div', 'rating-presets');
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', '推荐目标');
  for (const preset of availableRatingPresets(repo, gearTypeId)) {
    const button = el('button', `rating-preset${state.bestRatingPreset === preset.id ? ' active' : ''}`);
    button.type = 'button';
    button.title = preset.description;
    button.setAttribute('aria-pressed', String(state.bestRatingPreset === preset.id));
    button.append(el('strong', '', preset.label), el('span', '', preset.description));
    button.addEventListener('click', () => {
      if (state.bestRatingPreset !== preset.id) update({ bestRatingPreset: preset.id });
    });
    wrap.append(button);
  }
  return wrap;
}

function weightSummary(profile: RatingProfile | null): HTMLElement {
  const wrap = el('div', 'rating-weight-summary');
  wrap.append(el('span', 'rating-weight-title', '当前权重'));
  for (const item of normalizedWeightSummary(profile).slice(0, 5)) {
    const label = item.property === 'harvest_tier' ? '挖掘等级' : displayedStatLabel(item.property);
    wrap.append(el('span', 'rating-weight-chip', `${label} ${Math.round(item.weight * 100)}%`));
  }
  return wrap;
}

export function mountBestBuild(mount: HTMLElement): void {
  const title = el('div', 'panel-title');
  title.append(el('span', '', '智能推荐'), el('span', 'hint', '根据当前库存与装备权重计算'));
  const body = el('div', 'panel-body');
  mount.append(title, body);
  let showAll = false;
  let settingsOpen = false;

  // 弹层挂 body + fixed 定位：队列有 overflow-x:auto，挂在队列内会被裁掉
  const popover = el('div', 'pz-popover');
  document.body.append(popover);
  let hideTimer: number | undefined;

  const showPop = (card: HTMLElement, b: ChargeBuild, gearTypeId: string): void => {
    if (hideTimer !== undefined) window.clearTimeout(hideTimer);
    popover.replaceChildren(...popoverContent(gearTypeId, b));
    const c = card.getBoundingClientRect(); // 视口坐标，直接喂 fixed
    let left = c.left + c.width / 2;
    left = Math.max(180, Math.min(window.innerWidth - 180, left));
    popover.style.left = `${left}px`;
    popover.style.top = `${c.bottom + 8}px`;
    popover.style.display = 'block';
  };
  const hidePop = (): void => {
    // 小延时：卡间小缝隙不闪没
    if (hideTimer !== undefined) window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      popover.style.display = 'none';
    }, 150);
  };

  const render = (): void => {
    hidePop();
    clear(body);
    const gearTypeId = state.gearTypeId;
    if (!gearTypeId) {
      body.append(el('div', 'hint-text', '← 先选装备类型'));
      return;
    }
    const gearType = repo.getGearType(gearTypeId);
    if (!gearType) return;

    const activeProfile = buildRatingPresetProfile(repo, gearTypeId, state.bestRatingPreset, rating.resolveProfile(gearTypeId));
    body.append(presetSelector(gearTypeId), weightSummary(activeProfile));

    const settings = el('details', 'bb-settings') as HTMLDetailsElement;
    settings.open = settingsOpen;
    settings.append(el('summary', '', '推荐设置'));
    settings.append(controlsRow());
    settings.addEventListener('toggle', () => {
      settingsOpen = settings.open;
    });
    body.append(settings);

    if (state.bestRunning) {
      const busyMsg = state.bestConsiderCompound
        ? '复合材质搜索中（单材最优解 × 顶级材质集内复合对' +
          (state.bestConsiderAddons ? ' × 附属组合' : '') +
          (state.bestChargeMode === 'all' ? ' × Lv.0-3' : '') +
          '，约 5-15 秒）…'
        : state.bestConsiderAddons
          ? '附属全组合搜索中（核心 Top-K × 附属槽全组合' +
            (state.bestChargeMode === 'all' ? ' × Lv.0-3' : '') +
            '，约 5-12 秒）…'
          : state.bestChargeMode === 'all'
            ? '跨充能探索中（候选 × Lv.0-3 单一评分群体，约 3 秒）…'
            : '计算最佳拼装中…';
      // spinner + 文案：计算在 worker 里跑，主线程动画照常（不再冻结 2-3 秒）
      const busy = el('div', 'busy');
      busy.append(el('span', 'busy-spinner'));
      busy.append(el('span', 'busy-text', busyMsg));
      body.append(busy);
      return;
    }
    if (state.bestError) {
      const box = el('div', 'error-box', state.bestError);
      box.append(el('div', 'hint-text', '提示：三槽类型（弓/弩/弹弓/钓竿）全池超候选上限，暂不提供 Best Build。'));
      body.append(box);
      return;
    }
    const builds = state.bestBuilds;
    if (!builds || builds.length === 0) {
      body.append(el('div', 'hint-text', '等待计算…'));
      return;
    }

    const intro = el('div', 'recommendation-intro');
    intro.append(
      el('strong', '', `为${gearTypeName(gearTypeId)}找到 ${builds.length} 个候选方案`),
      el('span', '', `${recommendationReason(state.bestProfile)}；分数是候选之间的相对比较。`),
    );
    body.append(intro);

    const queue = el('div', 'recommendation-grid');

    builds.slice(0, showAll ? TOP_N : 3).forEach((b, i) => {
      const card = el('article', 'recommendation-card');
      card.tabIndex = 0;
      card.append(el('span', 'pz-rank' + (i === 0 ? ' r1' : ''), String(i + 1)));

      // 卡图标只取每槽首材质（视觉主材；复合槽的 A+B 详情见悬浮弹层）
      const slots = b.assembly.slots
        .map((s) => ({ slot: s.slot, material: s.materials[0] ? repo.getMaterial(s.materials[0]!.id) : undefined }))
        .filter((s): s is { slot: typeof s.slot; material: NonNullable<typeof s.material> } => !!s.material);
      const iconBox = el('span', 'pz-icon');
      if (slots.length > 0) iconBox.append(textureImg(assets.toolTexture(gearType, slots), 40));
      card.append(iconBox);
      const copy = el('div', 'recommendation-copy');
      copy.append(el('strong', '', i === 0 ? `${ratingPresetLabel(state.bestRatingPreset)}首选` : `备选方案 ${i + 1}`));
      copy.append(el('span', 'recommendation-materials', materialSummary(b)));
      copy.append(el('span', 'recommendation-reason', recommendationReason(state.bestProfile)));
      card.append(copy);

      const score = el('div', 'recommendation-score');
      score.append(el('span', '', '相对评分'), el('strong', '', String(Math.round(b.total * 100))));
      card.append(score);
      // 跨充能模式下每张卡标出它是哪个 charge 等级的最优（同一材质不同等级）
      if (state.bestChargeMode === 'all') card.append(el('span', 'pz-charge', `充能 ${b.chargeLevel}`));

      const apply = el('button', 'mc-btn recommendation-apply', '应用方案');
      apply.type = 'button';
      apply.addEventListener('click', () => applyBuild(b, gearTypeId));
      card.append(apply);

      card.addEventListener('mouseenter', () => showPop(card, b, gearTypeId));
      card.addEventListener('mouseleave', hidePop);
      card.addEventListener('focus', () => showPop(card, b, gearTypeId));
      card.addEventListener('blur', hidePop);
      queue.append(card);
    });
    queue.addEventListener('mouseleave', hidePop);
    body.append(queue);

    if (builds.length > 3) {
      const more = el('button', 'mc-btn recommendation-more', showAll ? '收起备选方案' : `查看全部 ${builds.length} 个方案`);
      more.type = 'button';
      more.addEventListener('click', () => {
        showAll = !showAll;
        render();
      });
      body.append(more);
    }
  };

  // 换类型 / 品级 / 充能模式 → 重新计算（diff 键防无关状态误触发）
  let lastKey = '';
  subscribe(() => {
    const key = cacheKey();
    if (key !== lastKey) {
      lastKey = key;
      if (state.gearTypeId) computeBest(state.gearTypeId);
    }
  });
  // 仅队列相关内容变化才重渲染（选材等无关操作不打断悬浮详情）
  let lastSig = '';
  subscribe(() => {
    const sig = [
      state.gearTypeId,
      state.bestRatingPreset,
      state.bestRunning,
      state.bestError,
      state.bestBuilds
        ? state.bestBuilds
            .map((b) => `${b.chargeLevel}:${b.total}:${b.assembly.slots.map((s) => s.materials.map((mc) => mc.id).join('+')).join('|')}`)
            .join(';')
        : '',
    ].join('|');
    if (sig !== lastSig) {
      lastSig = sig;
      render();
    }
  });
  render();
}
