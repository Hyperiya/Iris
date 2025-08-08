import { contextBridge, ipcRenderer } from "electron";

const spotifyAPI = {
    spicetify: {
    installExtension: () => ipcRenderer.invoke('install-spicetify-extension')
  },
  spotifyLink: () => ipcRenderer.invoke('spotify-link'),
}

contextBridge.exposeInMainWorld('spotify', spotifyAPI);
export type SpotifyAPI = typeof spotifyAPI;