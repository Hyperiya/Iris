import { contextBridge, ipcRenderer } from 'electron';

const loadingAPI = {
    showLoading: (message?: string) => ipcRenderer.invoke('loading:show', message),
    updateLoading: (progress: number, message?: string) => ipcRenderer.invoke('loading:update', progress, message),
    hideLoading: () => ipcRenderer.invoke('loading:hide'),

    // For listening to loading events
    onLoadingUpdate: (callback: (progress: number, message: string) => void) => {
        ipcRenderer.on('loading:update', (_, progress, message) => callback(progress, message));
        return () => ipcRenderer.removeAllListeners('loading:update');
    }
};

contextBridge.exposeInMainWorld('loading', loadingAPI);
export type LoadingAPI = typeof loadingAPI;