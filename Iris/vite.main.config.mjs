import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    outDir: ".vite/build",
    target: "es2020",
    lib: {
      entry: path.resolve(__dirname, "src/main.ts"),
      formats: ["es"],
      fileName: () => "main.js",
    },
    rollupOptions: {
      external: [
        "electron",
        "fs",
        "path",
        "util",
        "child_process",
        "url",
        "node:fs",
        "node:util",
        "node:path",
        "node:child_process",
        "node:url"
      ],

      output: {
        format: "es",
      },
    },
    emptyOutDir: false,
    minify: false,
  },
  resolve: {
    // Add any resolve configurations if needed
  },
});
