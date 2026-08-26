/**
 * Web UI 入口 —— fetch 数据 bundle → 构造五层引擎 + AssetRegistry → 挂载六面板
 * 材质纹理类型（hc/lc）从 bundle 原始 JSON 读，零核心改动。
 */
import './style.css';
import { DataRepository } from '../../src/data/repository.js';
import type { DataInput } from '../../src/data/repository.js';
import { GearCalcEngine } from '../../src/calc/index.js';
import { RatingEngine, transformUserRatingData } from '../../src/rating/index.js';
import { GearOptimizer } from '../../src/optimizer/index.js';
import { TRAIT_MAX_LEVELS, RATING_DATA } from './shim/node-fs.js';
import { AssetRegistry } from './assets/registry.js';
import type { MaterialTextureType } from './assets/registry.js';
import { initContext } from './context.js';
import { initBestWorker } from './best-worker-client.js';
import { update } from './state.js';
import { setTraitDescriptions } from './trait-desc.js';
import { mountBestBuild } from './components/best-build.js';
import { mountToolSelector } from './components/tool-selector.js';
import { mountAssembly } from './components/assembly.js';
import { mountMaterialSelector } from './components/material-selector.js';
import { mountPreview } from './components/preview.js';
import { mountInventory } from './components/inventory.js';

const boot = document.getElementById('boot');

function panel(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (!node) throw new Error(`缺少面板元素 #${id}`);
  return node;
}

async function main(): Promise<void> {
  const res = await fetch('/data/data-input.json');
  if (!res.ok) throw new Error(`加载数据失败: HTTP ${res.status}`);
  const dataInput = (await res.json()) as DataInput;

  // trait 中文描述（来自 traits_list_chs.md 权威 dump，缺省静默 = 悬浮显示占位）
  try {
    const tres = await fetch('/data/trait-descriptions.json');
    if (tres.ok) setTraitDescriptions((await tres.json()) as Record<string, string>);
  } catch {
    /* 描述文件缺失不阻塞 UI */
  }

  const repo = new DataRepository(dataInput);
  const calc = new GearCalcEngine(repo, TRAIT_MAX_LEVELS);
  const rating = new RatingEngine(repo, transformUserRatingData(RATING_DATA));
  const optimizer = new GearOptimizer({ repo, calc, rating });

  // 材质 display.main_texture_type（hc/lc 图层选择）—— bundle 原始 JSON，零核心改动
  const textureTypeById = new Map<string, MaterialTextureType>();
  for (const { id, raw } of dataInput.materials) {
    const tt = (raw as { display?: { main_texture_type?: unknown } }).display?.main_texture_type;
    if (tt === 'HIGH_CONTRAST' || tt === 'LOW_CONTRAST') textureTypeById.set(id, tt);
  }

  const assets = new AssetRegistry(textureTypeById);
  await assets.preload();

  initContext(repo, calc, rating, optimizer, assets);
  // Best Build 计算进 Web Worker（寻优 2-3s 不再卡 UI）；init 在首次 update({gearTypeId})
  // 触发的首次 computeBest 之前完成——postMessage FIFO，compute 消息排在 init 后执行
  initBestWorker(dataInput);

  if (boot) boot.remove();
  mountBestBuild(panel('best-build'));
  mountToolSelector(panel('tool-selector'));
  mountAssembly(panel('assembly'));
  mountMaterialSelector(panel('material-selector'));
  mountPreview(panel('preview'));
  mountInventory(panel('inventory'));

  // 默认选中镐（装配自动兜底每槽首材质）
  update({ gearTypeId: 'silentgear:pickaxe' });
}

main().catch((err) => {
  if (boot) {
    boot.classList.add('error-box');
    boot.textContent = err instanceof Error ? err.message : String(err);
  }
});
