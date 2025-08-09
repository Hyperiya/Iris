import { contextBridge, ipcRenderer } from 'electron';
import type { TrackMetadata, SyncedLyrics } from '../../types/lyrics.ts';

const msxAPI = {
    searchLyrics: (metadata: TrackMetadata): Promise<SyncedLyrics | undefined> =>
        ipcRenderer.invoke('msx:search', metadata)
};

contextBridge.exposeInMainWorld('msx', msxAPI);

export type MsxAPI = typeof msxAPI;
