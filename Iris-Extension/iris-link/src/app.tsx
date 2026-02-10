// Constants
const WEBSOCKET_URL = "ws://localhost:5001";
const PROGRESS_UPDATE_INTERVAL = 100;
const RECONNECT_DELAY = 1000;
const MAX_RECONNECT_ATTEMPTS = 5;
const SERVER_CHECK_INTERVAL = 5000;

// Types
interface ProgressState {
    current: number;
    previous: number;
}

interface DurationState {
    current: number;
    previous: number;
}

interface WebSocketMessage {
    type: string;
    action?: string;
    value?: any;
}

// Progress tracking worker
const createProgressWorker = (interval: number) => {
    const workerCode = `
    let intervalId;
    self.onmessage = function(e) {
      if (e.data === 'start') {
        intervalId = setInterval(() => {
          self.postMessage('tick');
        }, ${interval});
      } else if (e.data === 'stop') {
        clearInterval(intervalId);
      }
    };
  `;

    const blob = new Blob([workerCode], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    URL.revokeObjectURL(workerUrl);
    return worker;
};

class IrisSpotifyExtension {
    private ws: WebSocket | null = null;
    private progressWorker: Worker | null = null;
    private reconnectAttempts = 0;
    private isServerCheckInProgress = false;
    private cleanupTimers: NodeJS.Timeout[] = [];

    // State tracking
    private progress: ProgressState = { current: 0, previous: 0 };
    private duration: DurationState = { current: 0, previous: 0 };
    private wasAutoSwitched = false;
    private timingSwitch = false;
    private loopSwitch = false;

    constructor() {
        this.initialize();
    }

    // Initialization
    private async initialize(): Promise<void> {
        await this.waitForSpicetify();
        await this.connectWebSocket();
        this.setupEventListeners();
        Spicetify.showNotification("Hello from Iris!");
    }

    private async waitForSpicetify(): Promise<void> {
        while (!Spicetify?.showNotification) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }

    // WebSocket Management
    private async connectWebSocket(): Promise<void> {
        if (this.isServerCheckInProgress) return;

        this.isServerCheckInProgress = true;

        try {
            this.ws = new WebSocket(WEBSOCKET_URL);
            this.setupWebSocketHandlers();
        } catch (error) {
            console.error("Failed to create WebSocket:", error);
            this.handleReconnect();
        }
    }

    private setupWebSocketHandlers(): void {
        if (!this.ws) return;

        this.ws.onopen = () => {
            console.log("Connected to WebSocket server");
            this.reconnectAttempts = 0;
            this.isServerCheckInProgress = false;
            Spicetify.showNotification("WebSocket Connected!");
        };

        this.ws.onmessage = (event) => this.handleWebSocketMessage(event);
        this.ws.onclose = () => this.handleWebSocketClose();
        this.ws.onerror = (error) => this.handleWebSocketError(error);
    }

    private handleWebSocketMessage(event: MessageEvent): void {
        try {
            const data: WebSocketMessage = JSON.parse(event.data);

            if (data.type === "playback") {
                this.handlePlaybackMessage(data);
            } else if (data.type === "info") {
                this.handleInfoMessage(data);
            }
        } catch (error) {
            console.error("Error parsing WebSocket message:", error);
            console.warn(JSON.parse(event.data))
        }
    }

    private handleWebSocketClose(): void {
        console.log("WebSocket connection closed");
        this.isServerCheckInProgress = false;
        this.handleReconnect();
    }

    private handleWebSocketError(error: Event): void {
        console.error("WebSocket error:", error);
        this.isServerCheckInProgress = false;
    }

    // Message Handlers
    private handlePlaybackMessage(data: WebSocketMessage): void {
        const { action, value } = data;

        switch (action) {
            case "volume":
                Spicetify.Player.setVolume(value / 100);
                break;
            case "seek":
                Spicetify.Player.seek(value);
                break;
            case "play":
                Spicetify.Player.play();
                break;
            case "play-uri":
                Spicetify.Player.playUri(value);
                break;
            case "pause":
                Spicetify.Player.pause();
                break;
            case "next":
                Spicetify.Player.next();
                break;
            case "prev":
                Spicetify.Player.back();
                break;
            case "toggle":
                Spicetify.Player.togglePlay();
                break;
            case "shuffle":
                Spicetify.Player.toggleShuffle();
                break;
            case "setRepeat":
                this.handleSetRepeat(value);
                break;
            case "toggleRepeat":
                this.handleToggleRepeat();
                break;
            default:
                console.log("Unknown playback action:", action);
        }
    }

    private handleInfoMessage(data: WebSocketMessage): void {
        const { action } = data;

        switch (action) {
            case "token":
                this.sendTokenInfo();
                break;
            case "next":
                this.sendNextTrackInfo();
                break;
            case "current":
                this.sendCurrentTrackInfo();
                break;
            case "playlists":
                this.sendPlaylists();
                break;
        }
    }

    private handleSetRepeat(value: string): void {
        const repeatMap: Record<string, number> = {
            off: 0,
            context: 1,
            track: 2,
        };

        const repeatValue = repeatMap[value] ?? 0;
        Spicetify.Player.setRepeat(repeatValue);

        this.sendMessage({
            type: "response",
            action: "repeatState",
            data: { state: value },
        });
    }

    private handleToggleRepeat(): void {
        const currentState = Spicetify.Player.getRepeat();
        const stateMap = ["off", "context", "track"];
        const newState = (currentState + 1) % 3;

        Spicetify.Player.setRepeat(newState);

        this.sendMessage({
            type: "response",
            action: "repeatState",
            data: { state: stateMap[newState] },
        });
    }

    // Info Senders
    private sendTokenInfo(): void {
        this.sendMessage({
            type: "response",
            action: "token",
            data: {
                token: Spicetify.Platform.Session.accessToken,
                expiration: Spicetify.Platform.Session.accessTokenExpirationTimestampMs,
            },
        });
    }

    private sendNextTrackInfo(): void {
        const nextTrack = Spicetify.Queue.nextTracks[0]?.contextTrack?.metadata;
        if (!nextTrack) return;

        this.sendMessage({
            type: "response",
            action: "next",
            data: {
                name: nextTrack.title,
                artist: nextTrack.artist_name,
                album: nextTrack.album_title,
                duration: nextTrack.duration,
                album_cover: this.convertSpotifyImageUri(nextTrack.image_xlarge_url),
                year: nextTrack.album_name || "Unknown",
            },
        });
    }

    // Frankly, I don't remember how i got this URL. And it's outdated as of 10/2/2026 (dd/mm/yyyy)
    private async sendPlaylists(): Promise<void> {
        const res = await Spicetify.CosmosAsync.get("sp://core-playlist/v1/rootlist");
        console.log("playlists", res);

        const processedRows = res.rows.map((playlist: any) => ({
            ...playlist,
            picture: playlist.picture?.startsWith("spotify:mosaic:")
                ? playlist.picture
                      .split(":")
                      .slice(2)
                      .map((id: number) => `https://i.scdn.co/image/${id}`)
                : playlist.picture?.startsWith("spotify:image:")
                ? this.convertSpotifyImageUri(playlist.picture)
                : playlist.picture,
            mosaic: playlist.picture?.startsWith("spotify:mosaic:"),
        }));
        console.log(processedRows);
        this.sendMessage({
            type: "response",
            action: "playlists",
            data: processedRows,
        });
    }

    private sendCurrentTrackInfo(): void {
        const currentTrack = Spicetify.Player.data.item;

        if (!currentTrack) {
            this.sendMessage({
                type: "response",
                action: "current",
                data: { name: "No Song Playing" },
            });
            return;
        }

        this.duration.current = currentTrack.duration.milliseconds;

        const volume = Spicetify.Player.getVolume();
        console.log("Volume:", volume); // Debug log

        this.sendMessage({
            type: "response",
            action: "current",
            data: {
                name: currentTrack.name,
                artist: currentTrack.artists?.[0]?.name || "Unknown Artist",
                album: currentTrack.album?.name || "Unknown",
                duration_ms: currentTrack.duration?.milliseconds || 0,
                album_cover: this.convertSpotifyImageUri(currentTrack.metadata?.image_xlarge_url || ""),
                volume: volume ? Math.round(volume * 100) : 0, // Add null check
                is_playing: Spicetify.Player.isPlaying(),
                repeat_state: Spicetify.Player.getRepeat(),
                shuffle_state: Spicetify.Player.getShuffle(),
                progress_ms: Spicetify.Player.getProgress(),
                progress_percentage: Math.round(Spicetify.Player.getProgressPercent() * 100),
                id: (currentTrack.uri || "").split(":").pop() || "",
            },
        });
    }

    // Event Listeners
    private setupEventListeners(): void {
        this.startProgressTracking();
        this.setupSongChangeListener();
    }

    private setupSongChangeListener(): void {
        this.duration.previous = Spicetify.Player.getDuration();

        Spicetify.Player.addEventListener("songchange", () => {
            this.loopSwitch = false;

            // Detect auto-switch (song ended naturally)
            if (this.progress.previous > this.duration.previous - 3550) {
                this.wasAutoSwitched = true;
                const timer = setTimeout(() => {
                    this.wasAutoSwitched = false;
                }, 2000);
                this.cleanupTimers.push(timer);
            } else {
                this.wasAutoSwitched = false;
            }

            this.duration.previous = Spicetify.Player.getDuration();
            this.timingSwitch = false;
        });

        Spicetify.Player.addEventListener("onplaypause", (event) => {
            if (event?.data.isPaused) {
                this.timingSwitch = true;
            }
        });
    }

    // Progress Tracking
    private startProgressTracking(): void {
        if (this.progressWorker) return;

        this.progressWorker = createProgressWorker(PROGRESS_UPDATE_INTERVAL);

        this.progressWorker.onmessage = () => {
            this.updateProgress();
        };

        this.progressWorker.postMessage("start");
    }

    private updateProgress(): void {
        // Handle loop detection
        if (
            this.duration.previous - this.progress.previous >= 1000 &&
            this.progress.current <= 500 &&
            Spicetify.Player.getRepeat() === 2
        ) {
            this.loopSwitch = true;
        }

        // Calculate progress with timing adjustments
        let subtract = 0;
        if ((this.wasAutoSwitched || this.loopSwitch) && !this.timingSwitch) {
            subtract = -750;
        }

        const progress = Math.max(Spicetify.Player.getProgress() + subtract, 0);
        const duration = Spicetify.Player.getDuration();

        this.progress.previous = this.progress.current;
        this.progress.current = progress;

        this.sendMessage({
            type: "progress",
            data: {
                progress,
                duration,
                percentage: (progress / duration) * 100,
            },
        });
    }

    private stopProgressTracking(): void {
        if (this.progressWorker) {
            this.progressWorker.postMessage("stop");
            this.progressWorker.terminate();
            this.progressWorker = null;
        }
    }

    // Reconnection Logic
    private handleReconnect(): void {
        if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            this.reconnectAttempts++;
            const delay = RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts - 1);
            console.log(`Reconnecting in ${delay}ms... (Attempt ${this.reconnectAttempts})`);
            this.scheduleReconnect(delay);
        } else {
            console.log("Max reconnection attempts reached. Checking server periodically...");
            this.reconnectAttempts = 0;
            this.scheduleReconnect(SERVER_CHECK_INTERVAL);
        }
    }

    private scheduleReconnect(delay: number): void {
        this.isServerCheckInProgress = false;
        setTimeout(() => this.connectWebSocket(), delay);
    }

    // Utilities
    private convertSpotifyImageUri(uri: string): string {
        const imageId = uri.split(":").pop();
        return imageId ? `https://i.scdn.co/image/${imageId}` : "";
    }

    private sendMessage(message: any): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn("WebSocket not connected. Message not sent:", message);
        }
    }

    // Cleanup
    public cleanup(): void {
        this.stopProgressTracking();

        this.cleanupTimers.forEach((timer) => clearTimeout(timer));
        this.cleanupTimers = [];

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

// Initialize extension
const iris = new IrisSpotifyExtension();
export default iris;
