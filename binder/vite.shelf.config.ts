import { defineConfig, mergeConfig } from "vite";
import base from "./vite.config";

/*
 * 纸桌：手账书架用的小模块 dist/shelf.js（src/shelf.ts：生成一本合上的卡册）。在主构建之后跑（不清空 dist）。
 * 用主构建的设置（同样的字体处理、相对地址），只是入口换成 src/shelf.ts、输出固定叫 shelf.js；字体、贴图这些按普通文件输出到
 * assets/（和主构建同名同哈希，就是同一批文件），不用库模式——库模式会把字体全部内联进 JS，几十 MB。
 * three.js 不打包：手账页的地址映射给的就是 three，和书架、墙用同一份。
 */
export default mergeConfig(
  base,
  defineConfig({
    build: {
      outDir: "dist",
      emptyOutDir: false,
      copyPublicDir: false,
      target: "es2022",
      rollupOptions: {
        input: { shelf: "src/shelf.ts" },
        preserveEntrySignatures: "exports-only",
        external: ["three", /^three\//],
        output: { entryFileNames: "shelf.js" },
      },
    },
  }),
);
