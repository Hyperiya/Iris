import { BrowserWindow, ipcMain } from 'electron';
import { SnapshotManager } from '../../utils/snapshotUtil.ts';


export function setupSnapshotHandler(snapshotManager: SnapshotManager | null) {
    // Add IPC handlers for snapshot management
    ipcMain.handle('snapshot:create', () => {
        if (snapshotManager) {
            const loadedModules = ['main', 'renderer', 'preload']; // Example
            snapshotManager.createSnapshot(loadedModules);
            return true;
        }
        return false;
    });

    ipcMain.handle('snapshot:delete', () => {
        if (snapshotManager) {
            snapshotManager.deleteSnapshot();
            return true;
        }
        return false;
    });

    ipcMain.handle('snapshot:status', () => {
        if (snapshotManager) {
            return {
                exists: snapshotManager.hasValidSnapshot(),
                info: snapshotManager.getSnapshotInfo ? snapshotManager.getSnapshotInfo() : null
            };
        }
        return { exists: false, info: null };
    });
}
