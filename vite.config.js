import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative asset paths, so the built site works from any subpath - which is
  // what GitHub Pages does (username.github.io/repo/).
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      // Let the dev server borrow the Express API.
      '/api': {
        target: 'http://localhost:4321',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
