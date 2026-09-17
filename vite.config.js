import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";

// 后端地址：本地 wrangler pages dev 默认 8788，或设为线上已部署的 Cloudflare Pages 域名
const BACKEND_TARGET = process.env.FLAREDRIVE_BACKEND || "http://localhost:8788";

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      // API 请求 → wrangler pages dev（或线上生产）
      // 只有真正的后端功能走代理
      "/api": {
        target: BACKEND_TARGET,
        changeOrigin: true,
      },
      // R2 原始文件下载直链
      "/raw": {
        target: BACKEND_TARGET,
        changeOrigin: true,
      },
    },
  },
  build: {
    target: "es2020",
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        admin: resolve(__dirname, "admin.html"),
      },
      output: {
        manualChunks: {
          vendor: ["vue", "axios"],
        },
      },
    },
  },
});
