import { contextBridge, ipcRenderer } from "electron";

const settings = {
    get: (key: string) => ipcRenderer.sendSync('settings:get', key),
    set: (key: string, value: any) => ipcRenderer.sendSync('settings:set', key, value),
    getAll: () => ipcRenderer.sendSync('settings:getAll'),
    onChange: (callback: (key: string, value: any) => void) => {
        ipcRenderer.on('settings:changed', (_, key, value) => callback(key, value));
    },
    removeChangeListener: () => {
        ipcRenderer.removeAllListeners('settings:changed');
    }
}

contextBridge.exposeInMainWorld('settings', settings);
export type SettingsAPI  = typeof settings;
