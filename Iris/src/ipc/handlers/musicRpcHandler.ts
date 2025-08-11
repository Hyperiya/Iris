// src/ipc/handlers/musicRPC.ts
import MusicRPC from '../../services/discordServices/musicRPC.ts';
import { ipcMain } from 'electron';

let musicRPC: MusicRPC | null = null;

export function setupMusicRPCHandlers() {
    ipcMain.handle('musicRPC:connect', async (_, clientId: string) => {
        try {
            if (musicRPC) {
                await musicRPC.disconnect();
            }

            musicRPC = new MusicRPC(clientId);
            musicRPC.connect();
            return { success: true };
        } catch (error) {
            logger.error('Failed to connect Music RPC:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('musicRPC:setActivity', async (_, activity) => {
        if (!musicRPC) {
            return { success: false, error: 'Music RPC not connected' };
        }

        try {
            await musicRPC.setActivity(activity);
            return { success: true };
        } catch (error) {
            logger.error('Failed to set activity:', error);
            return { success: false, error: error.message };
        }
    });


    ipcMain.handle('musicRPC:disconnect', async () => {
        if (musicRPC) {
            await musicRPC.disconnect();
            musicRPC = null;
        }
        return { success: true };
    });
}
