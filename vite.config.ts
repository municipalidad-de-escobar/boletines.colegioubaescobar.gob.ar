import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      // Firebase signInWithPopup needs to poll window.closed across origins
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Firebase loaded at login, not on app boot
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          // PDF printing loaded on demand
          'pdf-libs': ['react-to-print'],
          // CSV parsing loaded on demand
          'csv-libs': ['papaparse'],
          // React core
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Mantine UI
          'ui-vendor': ['@mantine/core', '@mantine/hooks', '@mantine/dates'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
