import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = {
  packagerConfig: {
    derefSymlinks: true,
    asar: true,
    extraResource: ["src/assets/extension"],
    appId: "hyperiya.app.iris",
    icon: path.join(process.cwd(), "src", "assets", "icons", "Iris"),
    executableName: "iris",
    name: "Iris",
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        // Add these configurations
        name: "Iris",
        authors: "Hyperiya",
        description: "Music & Game Stat Displayer",
        exe: "iris.exe",
        setupExe: "iris-setup.exe",
        setupIcon: "src/assets/icons/Iris.ico",
        iconUrl:
          "https://github.com/Hypxria/ZZZElectron/blob/8d4bfd8ba8f0e90b2d7e4c58a1522f52123235cf/App/src/assets/icons/Iris.png",
      },
    },
    {
      executableName: "iris",
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"],
    },
    {
      name: "@electron-forge/maker-deb",
      executableName: "iris",
      config: {
        options: {
          bin: "iris",
          icon: "src/assets/icons/Iris.png",
          productName: "iris",
        },
      },
    },
    {
      executableName: "iris",
      name: "@electron-forge/maker-rpm",
      config: {
        options: {
          bin: "iris",
          icon: "src/assets/icons/Iris.png",
          productName: "iris",
        },
      },
    },
  ],
  plugins: [
    /*{
      name: "@electron-forge/plugin-webpack",
      config: {
        mainConfig: {
          plugins: [
            {
              apply: (compiler) => {
                compiler.hooks.emit.tapAsync(
                  "GenerateIndexFile",
                  (compilation, callback) => {
                    // Create an ESM-compatible index.js that imports main.js
                    const indexContent = `
// This file is auto-generated to redirect to main.js
// It's ESM-compatible and imports a specific file, not a directory
export * from './main.js';
`;
                    compilation.assets["index.js"] = {
                      source: () => indexContent,
                      size: () => indexContent.length,
                    };
                    callback();
                  }
                );
              },
            },
          ],

          devtool: process.env.NODE_ENV === "production" ? false : "source-map",
          entry: "./src/main.ts",
          experiments: {
            outputModule: true,
            topLevelAwait: true,
          },
          output: {
            filename: "[name].js",
            path: path.join(process.cwd(), ".webpack", "main"),
            module: true,
            libraryTarget: "module",
            chunkFormat: "module",
          },
          module: {
            rules: [
              {
                test: /\.tsx?$/,
                exclude: /(node_modules|\.webpack)/,
                use: {
                  loader: "ts-loader",
                  options: {
                    transpileOnly: true,
                  },
                },
              },
              {
                test: /\.(ts|js)$/,
                include: [
                  path.resolve(__dirname, "src/services"),
                  path.resolve(__dirname, "src/main.ts"),
                ],
                use: {
                  loader: "ts-loader",
                  options: {
                    transpileOnly: true,
                  },
                },
              },
              {
                test: /\.(svg|png|jpg|gif|jpeg)$/,
                include: [path.resolve(__dirname, "src/assets/icons")],
                type: "asset/inline",
              },
            ],
          },
          resolve: {
            extensions: [
              ".js",
              ".ts",
              ".jsx",
              ".tsx",
              ".css",
              ".scss",
              ".json",
            ],
            preferRelative: true,
          },
        },
        preloadConfig: {
          config: {
            target: "electron-preload",
            externals: {
              child_process: "child_process",
              fs: "fs",
            },
            resolve: {
              fallback: {
                child_process: false,
                fs: false,
              },
            },
          },
        },
        renderer: {
          devtool: process.env.NODE_ENV === "production" ? false : "source-map",
          config: {
            module: {
              rules: [
                {
                  test: /\.tsx?$/,
                  exclude: [/(node_modules|\.webpack)/],
                  use: {
                    loader: "ts-loader",
                    options: {
                      transpileOnly: true,
                      compilerOptions: {
                        sourceMap: false,
                      },
                    },
                  },
                },
                {
                  test: /\.css$/,
                  use: ["style-loader", "css-loader"],
                },
                {
                  test: /\.scss$/,
                  use: ["style-loader", "css-loader", "sass-loader"],
                },
                {
                  test: /\.(jpg|png|svg|gif)$/,
                  use: {
                    loader: "file-loader",
                    options: {
                      name: "[name].[ext]",
                    },
                  },
                },
              ],
            },
            resolve: {
              extensions: [".js", ".ts", ".jsx", ".tsx", ".scss", ".css"],
              preferRelative: true,
            },
          },
          entryPoints: [
            {
              html: "./src/index.html",
              js: "./src/renderer/index.tsx",
              name: "main_window",
              preload: {
                js: "./src/preload.ts",
              },
            },
          ],
        },
      },
    },*/
    {
      name: "@electron-forge/plugin-vite",
      config: {
        // `build` can specify multiple entry builds, which can be
        // Main process, Preload scripts, Worker process, etc.
        build: [
          {
            // `entry` is an alias for `build.lib.entry`
            // in the corresponding file of `config`.
            entry: "src/main.ts",
            config: "vite.main.config.mjs",
          },
          {
            entry: "src/preload.ts",
            config: "vite.preload.config.mjs",
          },
        ],
        renderer: [
          {
            name: "main_window",
            config: "vite.renderer.config.mjs",
            js: "src/renderer/index.tsx",
            html: "src/index.html",
            preload: {
              js: "src/preload.ts",
            },
          },
        ],
      },
    },
  ],
};

export default config;
