import path from "path";
import { fileURLToPath } from "url";

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
      name: "@reforged/maker-appimage",
      config: {
        options: {
          bin: "iris", // Add this line
          categories: ["AudioVideo", "Audio", "Player"],
          icon: path.join(process.cwd(), "src", "assets", "icons", "Iris.svg"),
        },
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
