import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, 'API_')
  const target = process.env.API_BASE || env.API_BASE || 'http://127.0.0.1:8080'
  const proxy = {
    '/api': { target, changeOrigin: true },
    '/uploads': { target, changeOrigin: true }
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'), // تعریف alias برای src
        '@tailwindConfig': path.resolve(__dirname, 'tailwind.config.js'),
      },
    },

    server: { port: 5173, proxy },
    preview: { port: 5173, allowedHosts: ['dash.technosara.com'], proxy },

    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    }
  }
})
