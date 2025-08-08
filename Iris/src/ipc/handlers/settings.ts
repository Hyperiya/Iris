// src/ipc/handlers/settings.ts
import { BrowserWindow, ipcMain } from 'electron';
import settingsUtil from '../../utils/settingsUtil.ts';


export function setupSettingsHandlers(mainWindow: BrowserWindow) {
    settingsUtil.setMainWindow(mainWindow);

    ipcMain.on('settings:get', (event, key: string) => {
        event.returnValue = settingsUtil.get(key);
    });

    ipcMain.on('settings:set', (event, key: string, value: any) => {
        settingsUtil.set(key, value);
        event.returnValue = true;
    });

    ipcMain.on('settings:getAll', (event) => {
        event.returnValue = settingsUtil.getAll();
    });
}
