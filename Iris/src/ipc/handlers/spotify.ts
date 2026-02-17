import { ipcMain } from "electron";
import spotifyService from "../../services/mediaServices/SpotifyService.ts";
import { LrcLibApi } from "../../services/mediaServices/LrcLibService.ts";

const lrcLibApi = new LrcLibApi();

export function setupSpotifyHandlers(mainWindow) {
    ipcMain.handle("spotify:play", () => spotifyService.resumePlayback());
    ipcMain.handle("spotify:pause", () => spotifyService.pausePlayback());
    ipcMain.handle("spotify:next", () => spotifyService.playNextSong());
    ipcMain.handle("spotify:previous", () => spotifyService.playPreviousSong());
    ipcMain.handle("spotify:toggleShuffle", () => spotifyService.toggleShuffle());
    ipcMain.handle("spotify:toggleRepeat", () => spotifyService.toggleRepeatMode());
    ipcMain.handle("spotify:setRepeat", (_, mode) => spotifyService.setRepeatMode(mode));

    // Volume controls
    ipcMain.handle("spotify:setVolume", (_, volume) => spotifyService.setVolume(volume));
    ipcMain.handle("spotify:increaseVolume", () => spotifyService.increaseVolume());
    ipcMain.handle("spotify:decreaseVolume", () => spotifyService.decreaseVolume());

    // Track info
    ipcMain.handle("spotify:getCurrentTrack", () => spotifyService.getCurrentTrack());
    ipcMain.handle("spotify:getNextSong", () => spotifyService.getNextSong());
    ipcMain.handle("spotify:getPlaylists", () => spotifyService.getPlaylists());

    // Other
    ipcMain.handle("spotify:seek", (_, position) => spotifyService.seek(position));
    ipcMain.handle("spotify:playUri", (_, uri) => spotifyService.playUri(uri));

    // Websocket Start
    ipcMain.handle("spotify:startLink", (_) => spotifyService.createWebSocketServer(mainWindow))

    ipcMain.handle("lrc:search", async (_, params: { artist: string; track: string; album: string }) => {
        try {
            const response = await lrcLibApi.searchLyrics({
                artist: params.artist,
                track: params.track,
                album: params.album,
            });
            return response;
        } catch (error) {
            logger.error("Error searching lyrics:", error);
            throw error;
        }
    });

    ipcMain.handle("lrc:parse-lyrics", async (_, syncedLyrics: string) => {
        try {
            const response = await lrcLibApi.parseSyncedLyrics(syncedLyrics);
            return response;
        } catch (error) {
            logger.error("Error parsing lyrics:", error);
            throw error;
        }
    });
}

