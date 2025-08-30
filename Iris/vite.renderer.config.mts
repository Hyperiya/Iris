import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: './',
  root: path.join(__dirname, 'src'),
  publicDir: false, // Don't use a separate public dir
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.scss'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'assets': path.resolve(__dirname, 'src/assets')
    }
  },
  build: {
    outDir: path.join(__dirname, '.vite/renderer'),
    emptyOutDir: true,
    target: 'esnext',
    assetsDir: 'assets'
  },
  server: {
    port: 3000,
    strictPort: true,
    host: true
  }
});
