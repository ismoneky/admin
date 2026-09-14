import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/test': {
        target: 'https://www.hbfctl.com.cn/',
        changeOrigin: true,
      },
      // '/api': {
      //   target: 'https://www.hbfctl.com.cn',
      //   changeOrigin: true,
      // },
      
    },
  },
})
