import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, __dirname, 'API_')
  const apiBase = (process.env.API_BASE || env.API_BASE || '').trim().replace(/\/+$/, '')
  const target = apiBase || 'http://127.0.0.1:8080'
  const proxy = {
    '/api': { target, changeOrigin: true },
    '/uploads': { target, changeOrigin: true }
  }

  return {
    define: {
      __DASHBOARD_API_BASE__: JSON.stringify(command === 'build' ? apiBase : ''),
    },
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
