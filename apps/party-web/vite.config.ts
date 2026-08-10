import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { port: 3101 },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          redux:  ['@reduxjs/toolkit', 'react-redux'],
          query:  ['@tanstack/react-query'],
          charts: ['recharts'],
          utils:  ['axios', 'date-fns', 'clsx', 'tailwind-merge', 'lucide-react'],
        },
      },
    },
  },
});
