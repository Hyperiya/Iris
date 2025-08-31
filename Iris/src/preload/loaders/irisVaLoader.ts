import { contextBridge, ipcRenderer } from "electron";

const irisVaLoader = {
    downloadModel: async (): Promise<string> => {
        return await ipcRenderer.invoke("irisVA:downloadModel");
    },
    start: async () => {
        console.log("starting VA");
        return await ipcRenderer.invoke("irisVA:start");
    },
    stop: async () => {
        return await ipcRenderer.invoke("irisVA:stop");
    },
    checkForModel: async (): Promise<boolean> => {
        return await ipcRenderer.invoke("irisVA:checkForModel");
    },
    onWaiting: (callback) => ipcRenderer.on('va:waiting', callback),
    onReset: (callback) => ipcRenderer.on('va:resetting', callback),
    onCommand: (callback) => ipcRenderer.on('va:command', callback)
};

contextBridge.exposeInMainWorld("irisVA", irisVaLoader);
export type IrisVaAPI = typeof irisVaLoader;
