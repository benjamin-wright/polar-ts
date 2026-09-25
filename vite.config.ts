import { defineConfig } from 'vite';

// base is relative so the same build resolves assets when published under a
// subpath (prod /polar/, QA /polar-qa/).
export default defineConfig({
  base: './',
  build: {
    assetsInlineLimit: 0,
    target: 'es2022',
    rollupOptions: {
      input: {
        main: 'index.html',
        dev: 'dev/index.html',
      },
    },
  },
});
