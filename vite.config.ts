import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { guideDemoPlugin } from './dev/guide-demo-plugin'

export default defineConfig(({ command, mode }) => ({
  plugins: [react(), ...(command === 'serve' && mode === 'guide-demo' ? [guideDemoPlugin()] : [])],
  server: {
    proxy: mode === 'guide-demo' ? undefined : {
      '/test': {
        target: 'https://www.hbfctl.com.cn/',
        changeOrigin: true,
      },
      '/api': {
        target: 'https://www.hbfctl.com.cn',
        changeOrigin: true,
      },
    },
  },
}))
