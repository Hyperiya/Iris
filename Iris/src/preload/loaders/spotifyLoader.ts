import { contextBridge, ipcRenderer } from "electron";

let currentProgress: any = null;

ipcRenderer.on("spotify:progress-update", (_, progress) => {
    currentProgress = progress;
    spotifyAPI.currentProgress = progress; // Update the exposed property
});

const spotifyAPI = {
    currentProgress: null as any,
    spicetify: {
        installExtension: () => ipcRenderer.invoke("install-spicetify-extension"),
    },
    // Playback controls
    resumePlayback: () => ipcRenderer.invoke("spotify:play"),
    pausePlayback: () => ipcRenderer.invoke("spotify:pause"),
    playNextSong: () => ipcRenderer.invoke("spotify:next"),
    playPreviousSong: () => ipcRenderer.invoke("spotify:previous"),
    toggleShuffle: () => ipcRenderer.invoke("spotify:toggleShuffle"),
    toggleRepeat: () => ipcRenderer.invoke("spotify:toggleRepeat"),
    setRepeat: (mode: number) => ipcRenderer.invoke("spotify:setRepeat", mode),

    // Volume controls
    setVolume: (volume: number) => ipcRenderer.invoke("spotify:setVolume", volume),
    increaseVolume: () => ipcRenderer.invoke("spotify:increaseVolume"),
    decreaseVolume: () => ipcRenderer.invoke("spotify:decreaseVolume"),

    // Track info
    getCurrentTrack: () => ipcRenderer.invoke("spotify:getCurrentTrack"),
    getNextSong: () => ipcRenderer.invoke("spotify:getNextSong"),
    getPlaylists: () => ipcRenderer.invoke("spotify:getPlaylists"),

    // Other
    seek: (position: number) => ipcRenderer.invoke("spotify:seek", position),
    playUri: (uri: string) => ipcRenderer.invoke("spotify:playUri", uri),

    // WebSocket control
    startLink: () => ipcRenderer.invoke("spotify:startLink"),
};

contextBridge.exposeInMainWorld("spotify", spotifyAPI);
export type SpotifyAPI = typeof spotifyAPI;
