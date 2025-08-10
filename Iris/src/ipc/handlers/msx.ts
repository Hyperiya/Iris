import { ipcMain } from 'electron';
import { MsXService } from '../../services/spotifyServices/MsXService.ts';
import type { TrackMetadata } from '../../types/lyrics.ts';

const msxService = new MsXService();

export function setupMsxHandlers() {
    ipcMain.handle('msx:search', async (_, metadata: TrackMetadata, preferredLanguage?: string[]) => {
        try {
            return await msxService.searchLyrics(metadata, preferredLanguage);
        } catch (error) {
            logger.error('MSX search error:', error);
            return;
        }
    });
}
