import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:5000',
      '/uploads': 'http://127.0.0.1:5000',
    },
    // Ignore OneDrive temp/lock files to prevent 500 errors during sync
    watch: {
      ignored: [
        '**/.~lock.*',
        '**/~$*',
        '**/*.tmp',
        '**/*.temp',
        '**/desktop.ini',
      ],
    },
  },
  // Increase CSS HMR stability
  css: {
    devSourcemap: false,
  },
})
