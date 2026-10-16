import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname),
  optimizeDeps: {
    entries: ['index.html'],
    exclude: ['nodemailer']
  },
  server: {
    port: 3000,
    open: false,
    watch: {
      usePolling: true,
      ignored: ['**/api/**', '**/scripts/**']
    },
    proxy: {
      '/api/send-email': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
