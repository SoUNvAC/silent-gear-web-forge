/**
 * trait 中文描述注册表 —— 数据来自 data/traits_list_chs.md（游戏 dump 权威源），
 * 由 scripts/build-web-data.ts 生成 web/public/data/trait-descriptions.json。
 */
let descriptions: Readonly<Record<string, string>> = {};

/** main.ts 启动时注入 fetch 到的描述表 */
export function setTraitDescriptions(map: Readonly<Record<string, string>>): void {
  descriptions = map;
}

/** trait id → 中文描述；无权威数据 → undefined（UI 显示诚实占位） */
export function traitDescription(id: string): string | undefined {
  return descriptions[id];
}
