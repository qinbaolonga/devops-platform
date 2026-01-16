import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('代理请求:', req.method, req.url, '-> http://localhost:3000' + proxyReq.path)
          })
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('代理响应:', req.url, '状态:', proxyRes.statusCode)
          })
          proxy.on('error', (err, req, res) => {
            console.log('代理错误:', req.url, err.message)
          })
        }
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})