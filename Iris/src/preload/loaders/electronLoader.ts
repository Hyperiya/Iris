import { contextBridge, ipcRenderer } from "electron";

const electronAPI = {
    restart: () => ipcRenderer.invoke("restart-app"),
    openExternal: (url: string) => ipcRenderer.invoke("open-external", url),
    log: (message: any) => ipcRenderer.send("console-log", message),
    getAppPath: () => ipcRenderer.invoke("get-app-path"),
    deviceName: () => ipcRenderer.invoke("device-name"),
    onNotification: (callback: (notification: any) => void) => {
        ipcRenderer.on("discord-notification", (_, notification) => {
            callback(notification);
        });
    },
    onOpenSettings: (callback: () => void) => {
        ipcRenderer.on("open-settings", callback);
    },
    onViewStateChange: (callback: (viewState: string) => void) => {
        ipcRenderer.on("view-state-change", (_, viewState) => {
            callback(viewState);
        });
    },
    removeViewStateListener: () => ipcRenderer.removeAllListeners("view-state-change"),

    window: {
        windowTitle: (title: string) => ipcRenderer.invoke("window-title", title),
        minimize: () => ipcRenderer.invoke("window-minimize"),
        maximize: () => ipcRenderer.invoke("window-maximize"),
        unmaximize: () => ipcRenderer.invoke("window-unmaximize"),
        close: () => ipcRenderer.invoke("window-close"),
        isFullScreen: () => ipcRenderer.invoke("window-is-fullscreen"),
        onFullScreen: (callback: () => void) => ipcRenderer.on("fullscreen-change", callback),
        removeFullScreenListener: () => ipcRenderer.removeAllListeners("fullscreen-change"),
        fullscreen: () => ipcRenderer.invoke("toggle-fullscreen"),
        toggleClickThrough: (enable) => ipcRenderer.invoke("toggle-click-through", enable),
    },
};
contextBridge.exposeInMainWorld("electron", electronAPI);
export type ElectronAPI = typeof electronAPI;
