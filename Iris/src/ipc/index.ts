import { BrowserWindow } from 'electron';
import { setupWindowHandlers } from './handlers/window.ts';
import { setupDiscordHandlers } from './handlers/discord.ts';
import { setupSpotifyHandlers } from './handlers/spotify.ts';
import { setupHoyoHandlers } from './handlers/hoyo.ts';
import { setupSpicetifyHandlers } from './handlers/spicetify.ts';
import { setupHoyoAuthHandlers } from './handlers/hoyoAuth.ts';
import { setupLoadingHandlers } from './handlers/loading.ts';
import { setupSnapshotHandler } from './handlers/snapshots.ts';
import { SnapshotManager } from '../utils/snapshotUtil.ts';
import { setupMusicRPCHandlers } from './handlers/musicRpc.ts';
import { setupSettingsHandlers } from './handlers/settings.ts';
import { setupMsxHandlers } from './handlers/msx.ts';

export function setupIpcHandlers(mainWindow: BrowserWindow, snapshotManager: SnapshotManager | null) {
    setupWindowHandlers(mainWindow);
    setupDiscordHandlers(mainWindow);
    setupSpotifyHandlers();
    setupHoyoHandlers();
    setupSpicetifyHandlers();
    setupHoyoAuthHandlers();
    setupLoadingHandlers(mainWindow);
    setupSnapshotHandler(snapshotManager);
    setupMusicRPCHandlers();
    setupSettingsHandlers(mainWindow);
    setupMsxHandlers();
}
