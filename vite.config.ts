import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://www.hbfctl.com.cn',
        changeOrigin: true,
      },
      // '/api': {
      //   target: 'http://localhost:3000',  // 改为本地后端
      //   changeOrigin: true,
      //   rewrite: (path) => path.replace(/^\/api/, ''),
      // }
    },
  },
})
