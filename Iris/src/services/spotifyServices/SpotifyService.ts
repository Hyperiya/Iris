export enum RepeatState {
    OFF = 'off',
    CONTEXT = 'context', // Repeats the playlist/album
    TRACK = 'track'     // Repeats the current song
}

export interface Song {
    name: string;
    artist: string;
    album_cover: string | null;
    year?: string;
    is_playing?: boolean;
    progress_ms?: number;
    duration_ms?: number;
    repeat_state?: number;
    volume?: number;
    album?: string;
    shuffle_state?: boolean;

}

export interface Token {
    token: string
    tokenExpire:number
    tokenTime:number
}

// export interface LyricsResponse {
//     lyrics: string;
//     error?: string;
// }

interface ProgressData {
    progress_ms: number | null;
    duration_ms: number | null;
    percentage: number | null;
}

class SpotifyService {
    private baseUrl = 'https://api.spotify.com/v1';

    private ws: WebSocket | null = null;
    private readonly WS_URL = 'ws://localhost:5001';

    private reconnectAttempts = 0;
    private readonly MAX_RECONNECT_ATTEMPTS = 5;
    private token: string = ''
    private tokenExpire: number = 0
    private tokenTime: number = 0

    private _currentProgress: {
        progress_ms: number;
        duration_ms: number;
        percentage: number;
    } | null = null;

    private prevVolume

    get currentProgress() {
        try {
            return this._currentProgress;
        } catch (error) {
            console.error('Error in currentProgress getter:', error);
            return null;
        }
    }



    constructor() {
        console.log('SpotifyService constructed');
    }

    private connectWebSocket() {
        try {
            this.ws = new WebSocket(this.WS_URL);

            this.ws.onopen = () => {
                console.log('SpotifyService WebSocket connected');
                this.reconnectAttempts = 0; // Reset attempts on successful connection
            };

            this.ws.onclose = (event) => {
                console.log('SpotifyService WebSocket closed:', event);
                if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
                    this.reconnectAttempts++;
                    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
                    console.log(`Attempting to reconnect in ${delay}ms...`);
                    setTimeout(() => this.connectWebSocket(), delay);
                }
            };

            this.ws.onerror = (error) => {
                console.error('SpotifyService WebSocket error:', error);
            };

            this.ws.onmessage = (event) => {
                try {
                    // This is for the progress update thingies)

                    // Use a try-catch block to handle potential JSON parsing errors
                    let response;
                    try {
                        response = JSON.parse(event.data);
                    } catch (parseError) {
                        console.error('Error parsing WebSocket message:', parseError);
                        return; // Exit the function if parsing fails
                    }


                    if (response.type === 'progress') this.handleProgress(response)
                    // Handle any responses from app.tsx here if needed
                } catch (error) {
                    console.error('Error processing WebSocket message:', error);
                }
            };
            console.log('SpotifyService WebSocket created:', this.ws)
        } catch (error) {

            console.error('Failed to create WebSocket:', error);
        }
    }

    public async startLinkWs() {
        if (!window.electron) {
            console.error('Electron API is not available');
            return;
        }

        await window.spotify.spotifyLink()
        await this.connectWebSocket()
    }

    private sendWsMessage(message: any): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify(message));
            } catch (error) {
                console.error('Error sending WebSocket message:', error);
                throw error;
            }
        } else {
            console.error('WebSocket is not connected');
            throw new Error('WebSocket is not connected');
        }
    }

    async handleMessage(message: string) {
        try {
            const data = message;

            // console.log(data)
            return data

        } catch (error) {
            console.error('Error in handleMessage:', error);
            return { error: 'Failed to process message' };
        }
    }


    // In SpotifyService.ts methods
    async getCurrentTrack(): Promise<Song> {
        try {
            // Send the request for current track info
            this.sendWsMessage({
                type: 'info',
                action: 'current'
            });
            // Create a promise that will resolve when we get the response
            return new Promise((resolve, reject) => {
                const messageHandler = (event: MessageEvent) => {
                    try {
                        // console.log(`event: ${event.data}`)
                        // Use a try-catch block to handle potential JSON parsing errors
                        let response;
                        try {
                            response = JSON.parse(event.data);
                        } catch (parseError) {
                            console.error('Error parsing JSON:', parseError);
                            reject(new Error('Invalid JSON data received'));
                            return;
                        }

                        // Check if this is the response we're waiting for
                        if (response.type === 'response' && response.action === 'current') {
                            
                            console.log(`response: ${JSON.stringify(response, null, 10)}`)
                            // Remove the message handler
                            this.ws?.removeEventListener('message', messageHandler);
                            // console.log(`response: ${JSON.stringify(response, null, 10)}`)

                            // Format the data into Song interface
                            const song: Song = {
                                name: response.data.name,
                                artist: response.data.artist,
                                album_cover: response.data.album_cover || null,
                                year: response.data.year,
                                album: response.data.album,
                                duration_ms: response.data.duration_ms,
                                progress_ms: response.data.progress_ms,
                                is_playing: response.data.is_playing,
                                volume: response.data.volume * 100,
                                repeat_state: response.data.repeat_state,
                                shuffle_state: response.data.shuffle_state,
                            };
                            // console.log(`song: ${JSON.stringify(song, null, 10)}`)

                            resolve(song);
                        }
                    } catch (error) {
                        reject(error);
                    }
                };

                // Add temporary message handler
                this.ws?.addEventListener('message', messageHandler);

                // Add timeout to prevent hanging
                setTimeout(() => {
                    this.ws?.removeEventListener('message', messageHandler);
                    reject(new Error('Timeout waiting for current track info'));
                }, 5000); // 5 second timeout
            });

        } catch (error) {
            console.error('Error fetching current track:', error);
            throw error;
        }
    }


    async getNextSong(): Promise<Song> {
        try {
            // Send the request for next song info
            this.sendWsMessage({
                type: 'info',
                action: 'next'
            });

            // Create a promise that will resolve when we get the response
            return new Promise((resolve, reject) => {
                const messageHandler = (event: MessageEvent) => {
                    try {
                        let response;
                        try {
                            response = JSON.parse(event.data);
                        } catch (parseError) {
                            console.error('Error parsing JSON:', parseError);
                            return; // Skip this message if it's not valid JSON
                        }

                        // Check if this is the response we're waiting for
                        if (response.type === 'response' && response.action === 'next') {

                            // Remove the message handler
                            this.ws?.removeEventListener('message', messageHandler);

                            // Format the data into Song interface
                            const song: Song = {
                                name: response.data.name,
                                artist: response.data.artist,
                                album_cover: response.data.album_cover || null,
                                year: response.data.year,
                                album: response.data.album,
                                duration_ms: response.data.duration,
                                is_playing: false // Since it's the next song
                            };

                            resolve(song);
                        }
                    } catch (error) {
                        reject(error);
                    }
                };

                // Add temporary message handler
                this.ws?.addEventListener('message', messageHandler);

                // Add timeout to prevent hanging
                setTimeout(() => {
                    this.ws?.removeEventListener('message', messageHandler);
                    reject(new Error('Timeout waiting for next song info'));
                }, 5000); // 5 second timeout
            });

        } catch (error) {
            console.error('Error fetching next song:', error);
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
                type: 'playback',
                action: 'next'
            });
        } catch (error) {
            console.error('Error playing next song:', error);
            throw error;
        }
    }

    async playUri(uri: string): Promise<void> {
        try {
            this.sendWsMessage({
                type: 'playback',
                action: 'play-uri',
                value: uri
            });
        } catch (error) {
            console.error('Error playing URI:', error);
            throw error;
        }
    }

    async playPreviousSong(): Promise<void> {
        try {
            this.sendWsMessage({
                type: 'playback',
                action: 'prev'
            });
        } catch (error) {
            console.error('Error playing previous song:', error);
            throw error;
        }
    }

    async pausePlayback(): Promise<void> {
        try {
            // Send message through WebSocket
            this.sendWsMessage({
                type: 'playback',
                action: 'pause'
            });
        } catch (error) {
            console.error('Error pausing playback:', error);
            throw error;
        }
    }

    async muteVolume(): Promise<void> {
        this.prevVolume = (await this.getCurrentTrack()).volume;
        this.setVolume(0)
    }

    async unmuteVolume(): Promise<void> {
        this.setVolume(this.prevVolume)
    }

    async resumePlayback(): Promise<void> {
        try {
            // Send message through WebSocket
            this.sendWsMessage({
                type: 'playback',
                action: 'play'
            });
        } catch (error) {
            console.error('Error pausing playback:', error);
            throw error;
        }
    }

    async setVolume(volume: number): Promise<void> {
        try {
            this.sendWsMessage({
                type: 'playback',
                action: 'volume',
                value: volume
            });
        } catch (error) {
            console.error('Error setting volume:', error);
            throw error;
        }
    }

    // Seeking using Ws Message
    async seek(position: number): Promise<void> {
        try {
            this.sendWsMessage({
                type: 'playback',
                action: 'seek',
                value: position
            });
        } catch (error) {
            console.error('Error seeking position:', error);
            throw error;
        }
    }

    async toggleShuffle(): Promise<void> {
        try {
            // Send message through WebSocket
            this.sendWsMessage({
                type: 'playback',
                action: 'shuffle'
            });
        } catch (error) {
            console.error('Error toggling shuffle:', error);
            throw error;
        }

    }

    async toggleRepeatMode(): Promise<void> {
        try {
            // Send message through WebSocket
            this.sendWsMessage({
                type: 'playback',
                action: 'toggleRepeat'
            });
        } catch (error) {
            console.error('Error toggling repeat mode:', error);
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
                type: 'playback',
                action: 'setRepeat',
                value: mode
            });
        } catch (error) {
            console.error('Error setting repeat mode:', error);
            throw error;
        }
    }

    

    async getToken(): Promise<Token> {
        try {
            this.sendWsMessage({
                type: 'info',
                action: 'token'
            })

            return new Promise((resolve, reject) => {

                if (this.token && ((this.tokenTime + this.tokenExpire) >= Date.now())) {
                    resolve({
                        token: this.token,
                        tokenExpire: this.tokenExpire,
                        tokenTime: this.tokenTime
                    });
                    return;
                }

                const messageHandler = (event: MessageEvent) => {
                    try {
                        let response;
                        try {
                            response = JSON.parse(event.data);
                        } catch (parseError) {
                            console.error('Error parsing JSON:', parseError);
                            return; // Skip this message if it's not valid JSON
                        }

                        // Check if this is the response we're waiting for
                        if (response.type === 'response' && response.action === 'token') {

                            // Remove the message handler
                            this.ws?.removeEventListener('message', messageHandler);

                            this.token = response.data.token
                            this.tokenExpire = response.data.expiration
                            this.tokenTime = Date.now() * 1000

                            resolve({
                                token: this.token,
                                tokenExpire: this.tokenExpire,
                                tokenTime: this.tokenTime
                            });
    
                        }
                    } catch (error) {
                        reject(error);
                    }
                };

                // Add temporary message handler
                this.ws?.addEventListener('message', messageHandler);

                // Add timeout to prevent hanging
                setTimeout(() => {
                    this.ws?.removeEventListener('message', messageHandler);
                    reject(new Error('Timeout waiting for token'));
                }, 5000); // 5 second timeout
            })
        } catch (error) {
            console.error('Error getting token:', error);
            throw error;
        }
    }

    // Track Progress?
    private handleProgress = (message: any) => {
        try {
            if (message.type === 'progress' && message.data) {
                this._currentProgress = {
                    progress_ms: message.data.progress,
                    duration_ms: message.data.duration,
                    percentage: message.data.percentage
                };
                // console.log('Progress updated:', this._currentProgress);
            }
        } catch (error) {
            console.error('Error handling progress:', error);
        }
    }
}

export const spotifyService = new SpotifyService();
export default spotifyService;