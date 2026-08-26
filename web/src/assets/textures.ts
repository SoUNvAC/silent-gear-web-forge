/**
 * 贴图挂载 —— import.meta.glob 把 assets/item/**\/*.png 变成 URL map
 *
 * dev：key = /@fs/...（或 /C:/...），build：key = 产物相对路径；
 * 统一取 `assets/` 之后段做相对路径键（如 `item/pickaxe/main_generic_hc.png`），
 * 与 resolve.ts 的 rel 格式一致。真实彩色贴图 / 灰度蒙版都经此解析，组件零硬编码路径。
 */
const globUrls = import.meta.glob('../../../assets/item/**/*.png', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const urlByRel = new Map<string, string>();
for (const [key, url] of Object.entries(globUrls)) {
  const rel = key.split('/assets/')[1];
  if (rel) urlByRel.set(rel, url);
}

/** 相对路径（item/...）→ 浏览器 URL */
export function textureUrl(rel: string): string | undefined {
  return urlByRel.get(rel);
}

/** 全部相对路径集合（resolve 层探测用） */
export const FILE_RELS: ReadonlySet<string> = new Set(urlByRel.keys());
