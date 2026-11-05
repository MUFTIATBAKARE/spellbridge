import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  resolve: {
    preserveSymlinks: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    open: false,
  },
});

