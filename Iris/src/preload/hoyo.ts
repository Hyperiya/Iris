import { contextBridge, ipcRenderer } from 'electron';

const hoyoAPI = {
    login: async (username: string, password: string) => {
    return await ipcRenderer.invoke('hoyo:login', username, password);
  },
  getSToken: async (username: string, password: string) => {
    return await ipcRenderer.invoke('hoyo:getSToken', username, password);
  },
  callMethod: async (className: string, methodName: string, ...args: any[]) => {
    return await ipcRenderer.invoke('hoyo:callMethod', className, methodName, ...args);
  },
  initialize: async (cookie: string, user_id: string) => {
    return await ipcRenderer.invoke('hoyo:initialize', cookie, user_id);
  },
}
contextBridge.exposeInMainWorld('hoyoAPI', hoyoAPI);
export type HoyoAPI = typeof hoyoAPI;