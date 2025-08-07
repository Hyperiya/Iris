import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    outDir: '.vite/build',
    target: "es2020",
    lib: {
      entry: path.resolve(__dirname, 'src/main.ts'),
      formats: ['es'],
      fileName: () => 'main.js'
    },
    rollupOptions: {
      external: ['electron'],
      output: {
        format: 'es',
        entryFileNames: '[name].js'
      }
    },
    emptyOutDir: false,
    minify: process.env.NODE_ENV === 'production'
  },
  resolve: {
    // Add any resolve configurations if needed
  },
});
