import { contextBridge, ipcRenderer } from 'electron';
import type { TrackMetadata, SyncedLyrics } from '../../services/spotifyServices/types/lyrics.ts';

const msxAPI = {
    searchLyrics: (metadata: TrackMetadata, prefferredLangauge: string[]): Promise<SyncedLyrics | undefined> =>
        ipcRenderer.invoke('msx:search', metadata, prefferredLangauge)
};

contextBridge.exposeInMainWorld('msx', msxAPI);

export type MsxAPI = typeof msxAPI;
