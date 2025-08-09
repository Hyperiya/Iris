import { ipcMain } from 'electron';
import { MsXService } from '../../services/spotifyServices/MsXService.ts';
import type { TrackMetadata } from '../../types/lyrics.ts';

const msxService = new MsXService();

export function setupMsxHandlers() {
    ipcMain.handle('msx:search', async (_, metadata: TrackMetadata) => {
        try {
            return await msxService.searchLyrics(metadata);
        } catch (error) {
            console.error('MSX search error:', error);
            return undefined;
        }
    });
}
