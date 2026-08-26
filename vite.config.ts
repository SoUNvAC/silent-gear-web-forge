/**
 * Vite 配置 —— Web UI（根目录配置，root 指向 web/）
 *
 * 浏览器兼容关键点：把核心层的 `node:fs` import alias 到 web/src/shim/node-fs.ts
 * （静态内联 3 个小型 JSON，提供同步 readFileSync）。核心 src/ 零改动。
 * alias 在 dev（esbuild）与 build（rollup）均在 builtin externalize 之前生效
 * （Vite 5.4.21/7 源码级确认：preAlias/alias 先于 vite:resolve 的 node 内置外置）。
 */
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'web',
  resolve: {
    alias: {
      'node:fs': fileURLToPath(new URL('./web/src/shim/node-fs.ts', import.meta.url)),
    },
  },
});
