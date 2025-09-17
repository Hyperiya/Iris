import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    build: {
        outDir: path.resolve(__dirname, ".vite/build"),
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
                "events",
                "path",
                "util",
                "child_process",
                "url",
                "http",
                "https",
                "crypto",
                "os",
                "process",
                "assert",
                "node:fs",
                "node:util",
                "node:path",
                "node:child_process",
                "node:url",
                "node:http",
                "node:https",
                "node:crypto",
                "node:os",
                "node:process",
                "node:assert",
            ],

            output: {
                format: "es",
            },
        },
        emptyOutDir: false,
        minify: false,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src"),
        },
    },
});
