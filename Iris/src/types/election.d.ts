import { AppSettings } from "../utils/settingsUtil.ts";
import type * as PreloadTypes from '../preload/index.ts';

// Type helper to get nested property types
type NestedKeyOf<ObjectType extends object> = {
    [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

type SettingValue<T extends NestedKeyOf<AppSettings>> =
    T extends `${infer K}.${infer Rest}`
    ? K extends keyof AppSettings
    ? Rest extends NestedKeyOf<AppSettings[K]>
    ? SettingValue<Rest>
    : never
    : never
    : T extends keyof AppSettings
    ? AppSettings[T]
    : never;

    
declare global {
    interface Window {
        irisVA: PreloadTypes.IrisVaAPI;
        musicRPC: PreloadTypes.MusicRPCAPI;
        electron: PreloadTypes.ElectronAPI;
        discord: PreloadTypes.DiscordAPI;
        settings: PreloadTypes.SettingsAPI;
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
