import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://imfu5lsjndb37dohb67aaconwy0zimhy.lambda-url.ap-south-1.on.aws',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/parse': {
        target: 'https://tf7hw5m2253i2atsm2q3mke5em0jmxfh.lambda-url.ap-south-1.on.aws',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/parse/, '')
      }
    },
  },
});