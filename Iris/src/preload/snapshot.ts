import { contextBridge, ipcRenderer } from 'electron';

const snapshotAPI = {
    create: () => ipcRenderer.invoke('snapshot:create'),
    delete: () => ipcRenderer.invoke('snapshot:delete'),
    getStatus: () => ipcRenderer.invoke('snapshot:status'),
}

contextBridge.exposeInMainWorld('snapshot', snapshotAPI);
export type SnapshotAPI = typeof snapshotAPI;