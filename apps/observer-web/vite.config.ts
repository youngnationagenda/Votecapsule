import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { port: 3103 },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // React runtime
          vendor: ['react', 'react-dom'],
          // Routing + state
          router: ['react-router-dom'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
          // Data fetching
          query: ['@tanstack/react-query'],
          // Charts (heavy — isolated so it only loads on chart pages)
          charts: ['recharts'],
          // Utilities
          utils: ['axios', 'date-fns', 'clsx', 'tailwind-merge', 'lucide-react'],
        },
      },
    },
  },
});
