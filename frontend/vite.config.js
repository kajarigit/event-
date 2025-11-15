import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0', // Allow network access from other devices
    strictPort: false,
    open: false,
    cors: true,
    // Optional: Proxy API requests (useful if not using .env API_URL)
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    // Copy _redirects file to dist for Render SPA routing
    copyPublicDir: true,
  },
  preview: {
    port: 3000,
    host: '0.0.0.0', // Allow network access in preview mode
    strictPort: false,
  },
});
