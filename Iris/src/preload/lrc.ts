import { contextBridge, ipcRenderer } from 'electron';

const lrcAPI = {
    parseSyncedLyrics: (lyrics: string) => ipcRenderer.invoke('lrc:parse-lyrics', lyrics),
    searchLyrics: (params: any) => ipcRenderer.invoke('lrc:search', params)
};

contextBridge.exposeInMainWorld('lrc', lrcAPI);
export type LrcAPI = typeof lrcAPI;
