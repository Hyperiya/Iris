import { contextBridge, ipcRenderer } from "electron";

const music = {
    connect: (clientId: string) => ipcRenderer.invoke('musicRPC:connect', clientId),
    setActivity: (activity: {
        type?: number;
        status_display_type?: number;
        details?: string;
        state?: string;
        timestamps?: { start?: number; end?: number };
        assets?: { large_image?: string; large_text?: string; small_image?: string; small_text?: string };
        buttons?: { label: string; url: string }[];
    }) => ipcRenderer.invoke('musicRPC:setActivity', activity),
    disconnect: () => ipcRenderer.invoke('musicRPC:disconnect'),
}

contextBridge.exposeInMainWorld('musicRPC', music);
export type MusicRPCAPI = typeof music;
