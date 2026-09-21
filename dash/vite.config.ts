import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'API_');
  const target = process.env.API_BASE || env.API_BASE || 'http://127.0.0.1:8080';
  const proxy = { '/api': { target, changeOrigin: false } };
  return {
    plugins: [vue()],
    resolve: { alias: { '~': fileURLToPath(new URL('./app', import.meta.url)) } },
    server: { port: 3001, proxy },
    preview: { port: 3001, proxy },
    build: { outDir: 'dist' },
  };
});
