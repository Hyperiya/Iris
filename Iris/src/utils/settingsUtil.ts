import { app } from "electron";
import { BrowserWindow } from "electron";
import { getOSLocale } from "./locale.ts";

import * as path from "path";
import * as fs from "fs";

export interface EnabledModules {
  discord: boolean;
  spotify: boolean;
  hoyolab: boolean;
}

export interface AppSettings {
  discord: {
    clientId: string;
    clientSecret: string;
  };
  hoyolab: {
    username: string;
    password: string;
    cookie?: string; // Optional, can be undefined
    uid?: string;
  };
  ui: {
    hasSeenFullscreenTip: boolean;
    modules: EnabledModules;
  };
  music: {
    preferredLanguage: string[]; // Optional, can be undefined
  };
  voiceAssistant: {
    enabled: boolean;
    device: string;
  };
}

export const DEFAULT_SETTINGS: AppSettings = {
  discord: {
    clientId: "",
    clientSecret: "",
  },
  hoyolab: {
    password: "",
    username: "",
  },
  ui: {
    hasSeenFullscreenTip: false,
    modules: {
      spotify: true,
      discord: true,
      hoyolab: true,
    },
  },
  music: {
    preferredLanguage: getOSLocale(), // Optional, can be undefined
  },
  voiceAssistant: {
    enabled: false,
    device: "",
  },
};

class SettingsService {
  private settingsPath: string;
  private settings!: AppSettings;
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    const userDataPath = app.getPath("userData");
    this.settingsPath = path.join(userDataPath, "settings.json");
    this.loadSettings();
    this.ensureSettingsFile();
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  private ensureSettingsFile() {
    if (!fs.existsSync(this.settingsPath)) {
      this.settings = DEFAULT_SETTINGS;
      this.saveSettings(); // This will definitely write the default values
    }
  }

  private loadSettings() {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, "utf8");
        const loadedSettings = JSON.parse(data);
        // Merge with defaults to ensure all properties exist
        this.settings = { ...DEFAULT_SETTINGS, ...loadedSettings };
      }
    } catch (error) {
      logger.error("Failed to load settings:", error);
      this.settings = DEFAULT_SETTINGS;
    }
  }

  private saveSettings() {
    try {
      fs.writeFileSync(
        this.settingsPath,
        JSON.stringify(this.settings, null, 2)
      );
    } catch (error) {
      logger.error("Failed to save settings:", error);
    }
  }

  // In settingsService.ts
  get<T>(key: string): T {
    // Use fs.readFileSync instead of async operations
    const keys = key.split(".");
    let value: any = this.settings;

    for (const k of keys) {
      value = value?.[k];
    }

    return value;
  }

  set(key: string, value: any) {
    const keys = key.split(".");
    let current: any = this.settings;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (k === "__proto__" || k === "constructor" || k === "prototype") {
        throw new Error("Invalid key: prototype pollution attempt");
      }
      if (!current[k]) {
        current[k] = {};
      }
      current = current[k];
    }

    const finalKey = keys[keys.length - 1];
    if (
      finalKey === "__proto__" ||
      finalKey === "constructor" ||
      finalKey === "prototype"
    ) {
      throw new Error("Invalid key: prototype pollution attempt");
    }

    current[finalKey] = value;
    this.saveSettings();

    // Emit change event
    if (this.mainWindow) {
      this.mainWindow.webContents.send("settings:changed", key, value);
    }
  }

  getAll(): AppSettings {
    return { ...this.settings };
  }
}

export default new SettingsService();
