import { ipcMain } from 'electron';
import { MsXService } from '../../services/mediaServices/MsXService.ts';
import type { TrackMetadata } from '../../services/mediaServices/types/lyrics.ts';

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
