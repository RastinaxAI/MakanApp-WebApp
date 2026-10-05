import { defineConfig } from 'vite';

export default defineConfig({
  appType: 'spa',
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    reportCompressedSize: true,
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  server: { port: 5173 },
  preview: { port: 4173 },
});