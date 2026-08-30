/**
 * 工具类型选择器 —— 34 具体类型按家族分组，按钮 = 合成图标 + 中文名
 * 抽象类型（mainPart=null）不入列；图标 = 该类型默认材料（首候选）的部件图层合成。
 */
import { repo, assets } from '../context.js';
import { state, update, resetSelection, subscribe } from '../state.js';
import { familyName, gearTypeName } from '../names.js';
import { el, clear, textureImg } from './shared.js';
import { buildSlotViews } from '../../../src/optimizer/index.js';

/** 家族展示顺序（未列出的排后） */
const FAMILY_ORDER = [
  'harvest_tool', 'melee_weapon', 'hybrid_weapon', 'ranged_weapon',
  'tool', 'armor', 'curio', 'projectile',
];

/** 沿父链找到最近的抽象祖先（mainPart===null）作为家族；找不到 → 'other' */
function topFamily(id: string): string {
  const seen = new Set<string>();
  let cur = repo.getGearType(id);
  while (cur && cur.mainPart !== null && cur.parent && !seen.has(cur.parent)) {
    seen.add(cur.parent);
    const p = repo.getGearType(cur.parent);
    if (!p) break;
    cur = p;
  }
  return cur && cur.mainPart === null ? cur.id : 'other';
}

interface TypeGroup {
  family: string;
  types: { id: string; label: string }[];
}

function buildGroups(): TypeGroup[] {
  const map = new Map<string, TypeGroup>();
  for (const g of repo.gearTypes.values()) {
    if (g.mainPart === null) continue;
    const fam = topFamily(g.id);
    let grp = map.get(fam);
    if (!grp) {
      grp = { family: fam, types: [] };
      map.set(fam, grp);
    }
    grp.types.push({ id: g.id, label: gearTypeName(g.id) });
  }
  const orderIdx = new Map(FAMILY_ORDER.map((f, i) => [f, i]));
  const sorted = [...map.values()].sort((a, b) => {
    const ia = orderIdx.get(a.family) ?? 99;
    const ib = orderIdx.get(b.family) ?? 99;
    return ia - ib || a.family.localeCompare(b.family);
  });
  for (const g of sorted) g.types.sort((a, b) => a.id.localeCompare(b.id));
  return sorted;
}

/** 类型默认装配（每槽首候选）的合成图标 */
function typeIcon(gearTypeId: string): HTMLImageElement {
  const gearType = repo.getGearType(gearTypeId);
  let canvas;
  if (gearType) {
    try {
      const views = buildSlotViews(repo, gearType, {});
      const slots = views
        .map((v) => ({ slot: v.slot, material: v.materials[0] }))
        .filter((s): s is { slot: typeof s.slot; material: NonNullable<typeof s.material> } => !!s.material);
      canvas = assets.toolTexture(gearType, slots);
    } catch {
      canvas = undefined;
    }
  }
  if (!canvas) return el('img', 'mc-texture') as HTMLImageElement;
  return textureImg(canvas, 24);
}

export function mountToolSelector(mount: HTMLElement): void {
  const title = el('div', 'panel-title');
  title.append(el('span', '', '装备类型'), el('span', 'hint', '点选，换类型清空装配'));
  const body = el('div', 'panel-body');
  mount.append(title, body);

  const render = (): void => {
    clear(body);
    for (const g of buildGroups()) {
      // 横向流动行：标签 + 按钮 inline 排，自动换行填满宽度（省高度、消除右留白）
      const fam = el('div', 'family-row');
      fam.append(el('div', 'family-label', `${familyName(g.family)} · ${g.types.length}`));
      for (const t of g.types) {
        const btn = el('button', 'tool-btn' + (t.id === state.gearTypeId ? ' active' : ''));
        btn.append(typeIcon(t.id));
        btn.append(el('span', '', t.label));
        btn.addEventListener('click', () => {
          if (state.gearTypeId !== t.id) {
            // 先清空装配/旧 Best Build 状态，再换类型 —— update 会触发 computeBest → bestRunning:true，
            // 顺序反了的话 resetSelection 会把 busy 状态清掉，面板显示「等待计算…」而不是 spinner
            resetSelection();
            update({ gearTypeId: t.id });
          }
        });
        fam.append(btn);
      }
      body.append(fam);
    }
  };

  subscribe(render);
  render();
}
