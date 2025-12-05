import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, 'src/renderer'),
  base: './',
  build: {
    outDir: resolve(__dirname, 'dist/web'),
    emptyDirOnBuild: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/renderer/index-web.html'),
    },
  },
  server: {
    port: 5174,
  },
});
