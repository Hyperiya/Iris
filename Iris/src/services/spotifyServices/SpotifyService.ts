import { BrowserWindow } from "electron";
import { isEqual, omit } from "lodash";
import { logger } from "../../renderer/utils/logger.ts";
import { Song, RepeatState, Token, Playlist, originalPlaylist } from "./types/types.ts";
import MusicRPC from "../discordServices/musicRPC.ts";
import WebSocket, { WebSocketServer } from "ws";
import * as http from "http";
import { EventEmitter } from "events";

class SpotifyService extends EventEmitter {
    private existingTrackData: Song | null = null;

    private wss: WebSocketServer | null = null;
    private healthServer: http.Server | null = null;
    private clients = new Set<WebSocket>();
    private mainWindow: undefined | BrowserWindow;

    private token: string = "";
    private tokenExpire: number = 0;
    private tokenTime: number = 0;

    private _currentProgress: {
        progress_ms: number;
        duration_ms: number;
        percentage: number;
    } | null = null;
    private RPC = new MusicRPC("1403055837311926443");

    private prevVolume;

    get currentProgress() {
        try {
            return this._currentProgress;
        } catch (error) {
            logger.error("Error in currentProgress getter:", error);
            return null;
        }
    }

    constructor() {
        super();
        this.RPC.connect();
    }

    public createWebSocketServer(mainWindow: BrowserWindow) {
        this.mainWindow = mainWindow;
        if (this.wss) {
            logger.log("WebSocket server already running");
            return;
        }

        this.wss = new WebSocketServer({ port: 5001 });

        this.wss.on("listening", () => {
            logger.log("WebSocket server is listening on port 5001");
        });

        this.wss.on("connection", async (ws: WebSocket) => {
            await this.clients.add(ws);
            logger.log("New Spicetify client connected");
            this.emit("connection");

            ws.on("message", async (message) => {
                try {
                    const messageString = message.toString("utf8");

                    // Check if message is valid before parsing
                    if (!messageString || messageString === "undefined") {
                        logger.warn("Received invalid message:", messageString);
                        return;
                    }

                    const parsedMessage = JSON.parse(messageString);
                    logger.log(parsedMessage);

                    if (parsedMessage.type === "progress") {
                        this.handleProgress(parsedMessage);
                    } else {
                        this.emit("response", parsedMessage);
                    }
                    // Handle the parsed message...
                } catch (error) {
                    logger.error("Error handling message:", error);
                    logger.log("Raw message:", message.toString());
                }
            });

            ws.on("close", () => {
                this.clients.delete(ws);
                logger.log("Client disconnected");
            });

            ws.on("error", (error) => {
                logger.error("WebSocket error:", error);
                this.clients.delete(ws);
            });

            // Send initial connection confirmation
            ws.send("Connected to Electron WebSocket Server");
        });

        this.wss.on("error", (error) => {
            logger.error("WebSocket server error:", error);
        });

        const healthServer = http.createServer((req, res) => {
            if (req.url === "/health") {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ status: "ok" }));
            } else {
                res.writeHead(404);
                res.end();
            }
        });

        healthServer.listen(5002, "127.0.0.1", () => {
            logger.log("Health check server listening on port 5002");
        });
    }

    // private connectWebSocket() {
    //     try {
    //         this.ws = new WebSocket(this.WS_URL);

    //         this.ws.onopen = () => {
    //             logger.log("SpotifyService WebSocket connected");
    //             this.reconnectAttempts = 0; // Reset attempts on successful connection
    //         };

    //         this.ws.onclose = (event) => {
    //             logger.log("SpotifyService WebSocket closed:", event);
    //             if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
    //                 this.reconnectAttempts++;
    //                 const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    //                 logger.log(`Attempting to reconnect in ${delay}ms...`);
    //                 setTimeout(() => this.connectWebSocket(), delay);
    //             }
    //         };

    //         this.ws.onerror = (error) => {
    //             logger.error("SpotifyService WebSocket error:", error);
    //         };

    //         this.ws.onmessage = (event) => {
    //             try {
    //                 // This is for the progress update thingies)

    //                 // Use a try-catch block to handle potential JSON parsing errors
    //                 let response;
    //                 try {
    //                     response = JSON.parse(event.data);
    //                 } catch (parseError) {
    //                     logger.error("Error parsing WebSocket message:", parseError);
    //                     return; // Exit the function if parsing fails
    //                 }

    //                 if (response.type === "progress") this.handleProgress(response);
    //                 // Handle any responses from app.tsx here if needed
    //             } catch (error) {
    //                 logger.error("Error processing WebSocket message:", error);
    //             }
    //         };
    //         logger.log("SpotifyService WebSocket created:", this.ws);
    //     } catch (error) {
    //         logger.error("Failed to create WebSocket:", error);
    //     }
    // }

    // public async startLinkWs() {
    //     if (!window.electron) {
    //         logger.error("Electron API is not available");
    //         return;
    //     }

    //     await window.spotify.spotifyLink();
    //     await this.connectWebSocket();
    // }

    private sendWsMessage(message: any): void {
        if (this.clients.size === 0) {
            // logger.warn("No Spicetify clients connected");
            return;
        }

        const messageStr = JSON.stringify(message);
        this.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageStr);
            }
        });
    }

    async handleMessage(message: string) {
        try {
            const data = message;
            return data;
        } catch (error) {
            logger.error("Error in handleMessage:", error);
            return { error: "Failed to process message" };
        }
    }

    // In SpotifyService.ts methods
    async getCurrentTrack(): Promise<Song> {
        try {
            this.sendWsMessage({
                type: "info",
                action: "current",
            });

            return new Promise((resolve, reject) => {
                const responseHandler = (response: any) => {
                    clearTimeout(timeoutId);
                    try {
                        if (response.type === "response" && response.action === "current") {
                            const song: Song = {
                                name: response.data.name,
                                artist: response.data.artist,
                                album_cover: response.data.album_cover || null,
                                year: response.data.year,
                                album: response.data.album,
                                duration_ms: response.data.duration_ms,
                                progress_ms: response.data.progress_ms,
                                is_playing: response.data.is_playing,
                                volume: response.data.volume,
                                repeat_state: response.data.repeat_state,
                                shuffle_state: response.data.shuffle_state,
                            };

                            // Handle RPC logic here...
                            this.existingTrackData = song;
                            resolve(song);
                        }
                    } catch (error) {
                        reject(error);
                    }
                };

                this.once("response", responseHandler);

                const timeoutId = setTimeout(() => {
                    this.off("response", responseHandler);
                    reject(new Error("Timeout"));
                }, 5000);
            });
        } catch (error) {
            logger.error("Error fetching current track:", error);
            throw error;
        }
    }

    async getNextSong(): Promise<Song> {
        try {
            this.sendWsMessage({
                type: "info",
                action: "next",
            });

            return new Promise((resolve, reject) => {
                const responseHandler = (response: any) => {
                    clearTimeout(timeoutId);
                    try {
                        if (response.type === "response" && response.action === "next") {
                            const song: Song = {
                                name: response.data.name,
                                artist: response.data.artist,
                                album_cover: response.data.album_cover || null,
                                year: response.data.year,
                                album: response.data.album,
                                duration_ms: response.data.duration,
                                is_playing: false, // Since it's the next song
                            };

                            resolve(song);
                        }
                    } catch (error) {
                        reject(error);
                    }
                };

                this.once("response", responseHandler);

                const timeoutId = setTimeout(() => {
                    this.off("response", responseHandler);
                    reject(new Error("Timeout waiting for next song info"));
                }, 500);
            });
        } catch (error) {
            logger.error("Error fetching next song:", error);
            throw error;
        }
    }

    /*
    Not many comments here, but basically i'm sending a type (info or playback) of the request i'm sending, then the app.tsx extention automatically sorts between the two types
    and sends the appropriate response for what I need.
    */

    async increaseVolume(): Promise<void> {
        const track = await this.getCurrentTrack();

        const volume = track?.volume;

        if (volume) this.setVolume(volume + 10);
    }

    async decreaseVolume(): Promise<void> {
        const track = await this.getCurrentTrack();

        const volume = track?.volume;

        if (volume) this.setVolume(volume - 10);
    }

    async playNextSong(): Promise<void> {
        try {
            this.sendWsMessage({
                type: "playback",
                action: "next",
            });
        } catch (error) {
            logger.error("Error playing next song:", error);
            throw error;
        }
    }

    async playUri(uri: string): Promise<void> {
        try {
            this.sendWsMessage({
                type: "playback",
                action: "play-uri",
                value: uri,
            });
        } catch (error) {
            logger.error("Error playing URI:", error);
            throw error;
        }
    }

    async playPreviousSong(): Promise<void> {
        try {
            this.sendWsMessage({
                type: "playback",
                action: "prev",
            });
        } catch (error) {
            logger.error("Error playing previous song:", error);
            throw error;
        }
    }

    async pausePlayback(): Promise<void> {
        try {
            // Send message through WebSocket
            this.sendWsMessage({
                type: "playback",
                action: "pause",
            });
        } catch (error) {
            logger.error("Error pausing playback:", error);
            throw error;
        }
    }

    async muteVolume(): Promise<void> {
        this.prevVolume = (await this.getCurrentTrack()).volume;
        this.setVolume(0);
    }

    async unmuteVolume(): Promise<void> {
        this.setVolume(this.prevVolume);
    }

    async resumePlayback(): Promise<void> {
        try {
            // Send message through WebSocket
            this.sendWsMessage({
                type: "playback",
                action: "play",
            });
        } catch (error) {
            logger.error("Error resuming playback:", error);
            throw error;
        }
    }

    async setVolume(volume: number): Promise<void> {
        try {
            this.sendWsMessage({
                type: "playback",
                action: "volume",
                value: volume,
            });
        } catch (error) {
            logger.error("Error setting volume:", error);
            throw error;
        }
    }

    // Seeking using Ws Message
    async seek(position: number): Promise<void> {
        try {
            this.sendWsMessage({
                type: "playback",
                action: "seek",
                value: position,
            });
        } catch (error) {
            logger.error("Error seeking position:", error);
            throw error;
        }
    }

    async toggleShuffle(): Promise<void> {
        try {
            // Send message through WebSocket
            this.sendWsMessage({
                type: "playback",
                action: "shuffle",
            });
        } catch (error) {
            logger.error("Error toggling shuffle:", error);
            throw error;
        }
    }

    async toggleRepeatMode(): Promise<void> {
        try {
            // Send message through WebSocket
            this.sendWsMessage({
                type: "playback",
                action: "toggleRepeat",
            });
        } catch (error) {
            logger.error("Error toggling repeat mode:", error);
            throw error;
        }
    }

    /**
     * Set a specific repeat mode
     */
    /**
     * Change Repeat mode
     * @param mode `0` No repeat. `1` Repeat all. `2` Repeat one track.
     */
    async setRepeatMode(mode: RepeatState | number): Promise<void> {
        try {
            this.sendWsMessage({
                type: "playback",
                action: "setRepeat",
                value: mode,
            });
        } catch (error) {
            logger.error("Error setting repeat mode:", error);
            throw error;
        }
    }

    async getPlaylists(): Promise<Playlist[]> {
        try {
            logger.log("Getting playlists");
            this.sendWsMessage({
                type: "info",
                action: "playlists",
            });

            return new Promise((resolve, reject) => {
                const responseHandler = (response: any) => {
                    clearTimeout(timeoutId);
                    try {
                        if (this.clients.size === 0) {
                            new Promise<void>((resolve) => {
                                this.once("connection", () => {
                                    logger.log("Client reconnected, retrying getPlaylists");
                                    resolve();
                                });
                            });
                        }

                        if (response.type === "response" && response.action === "playlists") {
                            const playlists: Playlist[] = response.data.map((playlist: any) => ({
                                link: playlist.link,
                                name: playlist.name,
                                totalLength: playlist.totalLength,
                                picture: playlist.picture,
                                mosaic: playlist.mosaic,
                            }));

                            resolve(playlists);
                        }
                    } catch (error) {
                        reject(error);
                    }
                };

                this.once("response", responseHandler);

                const timeoutId = setTimeout(() => {
                    this.off("response", responseHandler);
                    reject(new Error("Timeout waiting for playlists"));
                }, 5000);
            });
        } catch (error) {
            logger.error("Error getting playlists:", error);
            throw error;
        }
    }

    async getToken(): Promise<Token> {
        try {
            this.sendWsMessage({
                type: "info",
                action: "token",
            });

            return new Promise((resolve, reject) => {
                if (this.token && this.tokenTime + this.tokenExpire >= Date.now()) {
                    resolve({
                        token: this.token,
                        tokenExpire: this.tokenExpire,
                        tokenTime: this.tokenTime,
                    });
                    return;
                }

                const messageHandler = (response: any) => {
                    try {
                        // Check if this is the response we're waiting for
                        if (response.type === "response" && response.action === "token") {
                            // Remove the message handler
                            this.clients.forEach((client) => {
                                client.removeListener("message", messageHandler);
                            });

                            this.token = response.data.token;
                            this.tokenExpire = response.data.expiration;
                            this.tokenTime = Date.now() * 1000;

                            resolve({
                                token: this.token,
                                tokenExpire: this.tokenExpire,
                                tokenTime: this.tokenTime,
                            });
                        }
                    } catch (error) {
                        reject(error);
                    }
                };

                // Add temporary message handler
                this.clients.forEach((client) => {
                    client.on("message", messageHandler);
                });

                // Add timeout to prevent hanging
                setTimeout(() => {
                    this.clients.forEach((client) => {
                        client.removeListener("message", messageHandler);
                    });

                    reject(new Error("Timeout waiting for token"));
                }, 5000); // 5 second timeout
            });
        } catch (error) {
            logger.error("Error getting token:", error);
            throw error;
        }
    }

    // Track Progress?
    private handleProgress = (message: any) => {
        try {
            if (message.type === "progress" && message.data) {
                this._currentProgress = {
                    progress_ms: message.data.progress,
                    duration_ms: message.data.duration,
                    percentage: message.data.percentage,
                };
                this.mainWindow?.webContents.send("spotify:progress-update", this._currentProgress);
                // logger.log('Progress updated:', this._currentProgress);
            }
        } catch (error) {
            logger.error("Error handling progress:", error);
        }
    };
    public cleanup() {
        return new Promise<void>((resolve) => {
            if (this.wss) {
                // Close all client connections
                this.clients.forEach((client) => {
                    client.close();
                });
                this.clients.clear();

                // Close WebSocket server
                this.wss.close(() => {
                    logger.log("WebSocket server closed");
                    this.wss = null;
                });
            }

            if (this.healthServer) {
                this.healthServer.close(() => {
                    logger.log("Health check server closed");
                    this.healthServer = null;
                });
            }

            resolve();
        });
    }
}

const spotifyService = new SpotifyService();
export default spotifyService;
