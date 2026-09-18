import { defineConfig } from 'vite';

// base is relative so the build works on GitHub Pages project sites (/<repo>/).
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        main: 'index.html',
        dev: 'dev/index.html',
      },
    },
  },
});
