import { AppSettings } from "../utils/settingsUtil.ts";
import type * as PreloadTypes from '../preload/index.ts';

// Type helper to get nested property types
// Specifically for AppSettings
type NestedKeyOf<T> = T extends object ? {
  [K in keyof T]: K extends string 
    ? T[K] extends object
      ? `${K}` | `${K}.${NestedKeyOf<T[K]>}`
      : `${K}`
    : never
}[keyof T] : never;

type GetNestedValue<T, K extends string> = 
  K extends `${infer First}.${infer Rest}`
    ? First extends keyof T
      ? GetNestedValue<T[First], Rest>
      : never
    : K extends keyof T
      ? T[K]
      : never;
      
interface SettingsAPI extends Omit<PreloadTypes.SettingsAPI, 'get' | 'set'> {
  get<K extends NestedKeyOf<AppSettings>>(key: K): GetNestedValue<AppSettings, K>;
  set<K extends NestedKeyOf<AppSettings>>(key: K, value: GetNestedValue<AppSettings, K>): void;
}
    
declare global {
    interface Window {
        irisVA: PreloadTypes.IrisVaAPI;
        musicRPC: PreloadTypes.MusicRPCAPI;
        electron: PreloadTypes.ElectronAPI;
        discord: PreloadTypes.DiscordAPI;
        settings: SettingsAPI;
        loading: PreloadTypes.LoadingAPI;
        lrc: PreloadTypes.LrcAPI;
        hoyoAPI: PreloadTypes.HoyoAPI;
        spotify: PreloadTypes.SpotifyAPI;
        msx: PreloadTypes.MsxAPI;
        dev: PreloadTypes.DevAPI;
        saveDiscordTokens: (tokens: any) => void;
        loadDiscordTokens: () => any;
    }
}

export { };
