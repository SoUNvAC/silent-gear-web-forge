/**
 * DOM 助手（零框架薄 UI 的工具箱）
 */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function clear(node: HTMLElement): void {
  node.replaceChildren();
}

export interface SelectOption {
  value: string;
  label: string;
}

export function makeSelect(opts: SelectOption[], value: string, onChange: (v: string) => void): HTMLSelectElement {
  const s = el('select');
  for (const o of opts) {
    const option = document.createElement('option');
    option.value = o.value;
    option.textContent = o.label;
    s.append(option);
  }
  s.value = value;
  s.addEventListener('change', () => onChange(s.value));
  return s;
}

/** 材质色块（displayColor 已转 CSS 色；null → 灰底） */
export function colorChip(css: string | null): HTMLElement {
  const c = el('span', 'material-chip');
  if (css) c.style.backgroundColor = css;
  return c;
}

/** AssetSource（URL 或 canvas）→ 像素 <img>；image-rendering: pixelated 在 CSS 统一 */
export function textureImg(src: string | HTMLCanvasElement, sizePx: number): HTMLImageElement {
  const img = el('img', 'mc-texture');
  img.style.width = `${sizePx}px`;
  img.style.height = `${sizePx}px`;
  img.src = typeof src === 'string' ? src : src.toDataURL();
  return img;
}

export function numInput(value: number, min: number, max: number, onChange: (v: number) => void): HTMLInputElement {
  const i = el('input');
  i.type = 'number';
  i.min = String(min);
  i.max = String(max);
  i.value = String(value);
  i.addEventListener('change', () => {
    const n = Number(i.value);
    if (!Number.isNaN(n)) onChange(n);
  });
  return i;
}
