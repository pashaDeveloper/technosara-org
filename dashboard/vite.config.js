import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'API_');
  const target = process.env.API_BASE || env.API_BASE || 'http://127.0.0.1:8080';
  const proxy = { '/api': { target, changeOrigin: false }, '/uploads': { target } };
  return {
    plugins: [react()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)), '@tailwindConfig': fileURLToPath(new URL('./tailwind.config.js', import.meta.url)) } },
    server: { port: 5173, proxy },
    preview: { port: 5173, proxy },
  };
});
