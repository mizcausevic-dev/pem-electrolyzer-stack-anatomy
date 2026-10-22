import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the same build works on GitHub Pages project paths and any static host.
  base: './',
  build: {
    target: 'es2022',
    sourcemap: false,
    assetsInlineLimit: 0,
  },
});
