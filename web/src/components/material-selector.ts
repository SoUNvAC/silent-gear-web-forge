/**
 * Material Selector —— Search + Owned/Missing 过滤 + 品级/充能 + 材质网格
 * 材质来源 = 选中槽 buildSlotViews 的候选（黑名单过滤后真实材料）；点击赋给该槽。
 */
import { repo, assets } from '../context.js';
import { state, update, subscribe } from '../state.js';
import type { OwnershipFilter } from '../state.js';
import { materialName, materialNameEn, slotName } from '../names.js';
import { el, clear, textureImg, makeSelect } from './shared.js';
import { isOwned } from '../owned.js';
import { allSlotViews } from '../selection.js';
import type { Material } from '../../../src/data/types.js';
import type { GradeLevel } from '../../../src/calc/index.js';
import { GRADE_LEVELS } from '../grade.js';

const FILTERS: { value: OwnershipFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'owned', label: 'Owned' },
  { value: 'missing', label: 'Missing' },
];

export function mountMaterialSelector(mount: HTMLElement): void {
  const title = el('div', 'panel-title');
  title.append(el('span', '', '材料'), el('span', 'hint', '选材给槽位'));
  const body = el('div', 'panel-body');
  mount.append(title, body);

  const render = (): void => {
    clear(body);
    const gearTypeId = state.gearTypeId;
    const slot = state.selectedSlot;
    if (!gearTypeId) {
      body.append(el('div', 'hint-text', '← 先选装备类型'));
      return;
    }
    const gearType = repo.getGearType(gearTypeId);
    if (!gearType) {
      body.append(el('div', 'error-box', `未知装备类型: ${gearTypeId}`));
      return;
    }

    // 选中槽的候选材料（核心 + 附属槽都查）
    let slotMaterials: Material[] = [];
    try {
      const views = allSlotViews(repo, gearType);
      if (slot) {
        const view = views.find((v) => v.slot === slot);
        if (view) slotMaterials = view.materials;
      }
    } catch (err) {
      body.append(el('div', 'error-box', err instanceof Error ? err.message : String(err)));
      return;
    }

    // 搜索 + 过滤
    const ctrl = el('div', 'mat-controls');
    const search = el('input', 'mat-search');
    search.type = 'search';
    search.placeholder = '搜索材料…';
    search.value = state.search;
    search.addEventListener('input', () => update({ search: search.value }));
    ctrl.append(search);

    const filter = el('div', 'filter-toggle');
    for (const f of FILTERS) {
      const b = el('button', 'mc-btn' + (state.ownershipFilter === f.value ? ' on' : ''), f.label);
      b.addEventListener('click', () => update({ ownershipFilter: f.value }));
      filter.append(b);
    }
    ctrl.append(filter);
    body.append(ctrl);

    // 充能（整件固定配置，与 Optimizer 口径一致）+ 品级（该槽）同一横，不上下堆叠
    const cfgRow = el('div', 'row');
    cfgRow.append(el('label', '', '充能'));
    cfgRow.append(
      makeSelect(
        ['0', '1', '2', '3'].map((n) => ({ value: n, label: `Lv.${n}` })),
        String(state.chargeLevel),
        (v) => update({ chargeLevel: Number(v) }),
      ),
    );
    if (!slot) {
      body.append(cfgRow);
      body.append(el('div', 'mat-hint', '点击左侧装配槽位后，这里显示该槽可选材料与品级'));
      return;
    }
    // 品级逐槽：作用于选中槽的材质（每槽独立，与游戏一致）；Best Build 搜索品级是独立全局 select
    const cur = state.materialChoices[slot];
    cfgRow.append(el('label', '', '品级'));
    cfgRow.append(
      makeSelect(
        GRADE_LEVELS.map((g) => ({ value: g, label: g })),
        cur?.grade ?? 'NONE',
        (v) => {
          const choice = state.materialChoices[slot];
          const id = choice?.id ?? slotMaterials[0]?.id;
          if (!id) return;
          update({
            materialChoices: {
              ...state.materialChoices,
              [slot]: v === 'NONE' ? { id } : { id, grade: v as GradeLevel },
            },
          });
        },
      ),
    );
    // 附属槽支持空选：清空该槽选择（默认空选）
    if (!gearType.requiredParts.includes(slot)) {
      const clearBtn = el('button', 'mc-btn', '不选该槽');
      clearBtn.type = 'button';
      clearBtn.disabled = cur === undefined;
      clearBtn.title = '该槽不装材料（空选）';
      clearBtn.addEventListener('click', () => {
        const next = { ...state.materialChoices };
        delete next[slot];
        update({ materialChoices: next });
      });
      cfgRow.append(clearBtn);
    }
    body.append(cfgRow);
    body.append(el('div', 'mat-hint', `槽位：${slotName(slot)}（${slotMaterials.length} 种材料）`));

    const q = state.search.trim().toLowerCase();
    const list = slotMaterials.filter((m) => {
      if (
        q &&
        !materialName(m.id).toLowerCase().includes(q) &&
        !materialNameEn(m.id).toLowerCase().includes(q) &&
        !m.id.toLowerCase().includes(q)
      )
        return false;
      if (state.ownershipFilter === 'owned' && !isOwned(m.id)) return false;
      if (state.ownershipFilter === 'missing' && isOwned(m.id)) return false;
      return true;
    });

    if (list.length === 0) {
      body.append(el('div', 'mat-empty', '没有匹配的材料'));
      return;
    }

    const grid = el('div', 'mat-grid');
    for (const m of list) {
      const sel = state.materialChoices[slot]?.id === m.id;
      const owned = isOwned(m.id);
      const btn = el('button', `mat-btn${sel ? ' selected' : ''}${owned ? '' : ' unowned'}`);
      btn.append(textureImg(assets.materialIcon(m), 32));
      const label = el('span', 'mat-name');
      label.append(el('span', 'zh', materialName(m.id)));
      label.append(el('span', 'en', materialNameEn(m.id)));
      btn.append(label);
      btn.addEventListener('click', () => {
        // 换材料保留该槽已设品级（品级逐槽：grade 属于槽，不属于材料）
        const cur = state.materialChoices[slot];
        update({
          materialChoices: {
            ...state.materialChoices,
            [slot]: cur?.grade && cur.grade !== 'NONE' ? { id: m.id, grade: cur.grade } : { id: m.id },
          },
        });
      });
      grid.append(btn);
    }
    body.append(grid);
  };

  subscribe(render);
  render();
}
