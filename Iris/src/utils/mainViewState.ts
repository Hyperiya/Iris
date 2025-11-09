// This util gives the ability to change the viewstate in renderer from main, used in CommandProcessor.ts
import { BrowserWindow } from 'electron';

class ViewStateManager {
    private mainWindow: BrowserWindow | null = null;

    setMainWindow(window: BrowserWindow) {
        this.mainWindow = window;
    }

    setViewState(viewState: string) {
        this.mainWindow?.webContents.send('view-state-change', viewState);
    }
}

export enum ViewState {
    NEUTRAL = "NEUTRAL",
    SPOTIFY_FULL = "SPOTIFY_FULL",
    RIGHT_FULL = "RIGHT_FULL"
}

export const viewStateManager = new ViewStateManager();
