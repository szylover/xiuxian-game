import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React 及第三方依赖单独 chunk，版本不变时永久缓存
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          // 游戏数据 JSON 单独 chunk，仅数据变更时才失效
          if (id.includes('/src/data/')) {
            return 'game-data';
          }
        },
      },
    },
  },
});
