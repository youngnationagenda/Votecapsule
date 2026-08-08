import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      // Resolve workspace package from TypeScript source — avoids needing a pre-built dist
      '@vote-capsule/types': resolve(__dirname, '../../packages/types/src/index.ts'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api/identity': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/identity/, '/api/v1'),
      },
      '/api/tenant': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tenant/, '/api/v1'),
      },
      '/api/trust': {
        target: 'http://localhost:3003',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/trust/, '/api/v1/trust'),
      },
      '/api/geography': {
        target: 'http://localhost:3004',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/geography/, '/api/v1/geography'),
      },
      '/api/evidence': {
        target: 'http://localhost:3005',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/evidence/, '/api/v1/evidence'),
      },
      '/api/ai': {
        target: 'http://localhost:3006',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ai/, '/api/v1/ai'),
      },
      '/api/workflow': {
        target: 'http://localhost:3007',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/workflow/, '/api/v1/workflow'),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
          charts: ['recharts'],
        },
      },
    },
  },
});
