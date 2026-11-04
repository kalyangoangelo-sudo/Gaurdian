import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/app/',
  server: {
    port: 5173,
    proxy: {
      '/login': 'http://localhost:3001',
      '/reports': 'http://localhost:3001',
      '/cases': 'http://localhost:3001',
      '/evidence': 'http://localhost:3001',
      '/safesignal': 'http://localhost:3001',
      '/requests': 'http://localhost:3001',
      '/pair': 'http://localhost:3001',
      '/policy': 'http://localhost:3001',
      '/heartbeat': 'http://localhost:3001',
      '/device-status': 'http://localhost:3001',
      '/removal-request': 'http://localhost:3001',
      '/removal-requests': 'http://localhost:3001',
      '/organizations': 'http://localhost:3001',
      '/curiosity': 'http://localhost:3001',
      '/lessons': 'http://localhost:3001',
      '/subscriptions': 'http://localhost:3001',
      '/health': 'http://localhost:3001',
      '/auth': 'http://localhost:3001',
    },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 600,
  },
});
