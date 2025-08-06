var interval: number = 100
const workerCode =
  `
self.onmessage = function(e) {
  if (e.data === 'start') {
    setInterval(() => {
      self.postMessage('tick');
    }, ${interval}); // Interval
  }
};
`
  ;
/*
Hyperiya comments are back
This worker is just to get the song progress *really* often because (as stated far below) get onsongprogress is slow when tabbed out.
*/

interface progressManager {
  progress: number
  prevProgress: number
}

class Iris {
  // Websocket to send info back to the app
  private ws: WebSocket | null = null;

  // In case connections fail, made a few vars with this kinda stuff
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private isServerCheckInProgress = false;

  private progressWorker: Worker | null = null;

  private wasAutoSwitchedThisSong: boolean = false;
  private timingSwitch: boolean = false;

  private progress: progressManager = {
    progress: 0,
    prevProgress: 0
  }

  private duration = {
    duration: 0,
    prevDuration: 0
  }

  private loopSwitch: boolean = false

  constructor() {
    this.main();
  }



  private setupProgressWorker() {
    // Create a Blob containing the worker code
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);

    // Create and start the worker
    this.progressWorker = new Worker(workerUrl);

    Spicetify.Player.addEventListener('onplaypause', (event) => {
      if (event?.data.isPaused) this.timingSwitch = true
    })



    // Listen for worker messages
    this.progressWorker.onmessage = () => {
      if (
        this.duration.prevDuration - this.progress.prevProgress >= 1000 
        && this.progress.progress <= 500 
        && Spicetify.Player.getRepeat() === 2) this.loopSwitch = true;

      let subtract
      if (this.wasAutoSwitchedThisSong && !this.timingSwitch && !this.loopSwitch) {
        subtract = -750
      } else if (this.loopSwitch && !this.timingSwitch) {
        subtract = -750
      } else {
        subtract = 0
      }
      const progress = Math.max((Spicetify.Player.getProgress() + subtract), 0);
      const duration = Spicetify.Player.getDuration();
      this.progress.prevProgress = this.progress.progress
      this.progress.progress = progress

      console.log(JSON.stringify({
        type: 'progress',
        data: {
          progress,
          duration,
          percentage: (progress / duration) * 100
        }
      }));


      this.sendMessage(JSON.stringify({
        type: 'progress',
        data: {
          progress,
          duration,
          percentage: (progress / duration) * 100
        }
      }));
    };

    // Start the worker
    this.progressWorker.postMessage('start');

    // Clean up the URL
    URL.revokeObjectURL(workerUrl);
  }

  private convertSpotifyImageUriToUrl(uri: string): string {
    // Extract the image ID from the URI
    const imageId = uri.split(':').pop();
    if (!imageId) return '';

    return `https://i.scdn.co/image/${imageId}`;
  }

  private startProgressTracking() {
    if (!this.progressWorker) {
      this.setupProgressWorker();
    }
  }

  private stopProgressTracking() {
    if (this.progressWorker) {
      this.progressWorker.terminate();
      this.progressWorker = null;
    }
  }


  private async checkServerAvailable(): Promise<boolean> {
    try {
      // Checking if the server is actually alive before attempting connection
      const response = await fetch('http://127.0.0.1:5001/health', {
        method: 'HEAD',
        mode: 'no-cors'
      });
      return true;
    } catch (error) {
      // it'll fail if its not up, so we'll just return false
      return false;
    }
  }


  private async connectWebSocket() {
    // If we're already checking, don't start another check
    if (this.isServerCheckInProgress) {
      return;
    }

    this.isServerCheckInProgress = true;

    try {
      // Check if server is available before attempting connection
      const isAvailable = await this.checkServerAvailable();
      if (!isAvailable) {
        console.log('Server not available, waiting...');
        this.isServerCheckInProgress = false;
        // Try again in 5 seconds
        setTimeout(() => this.connectWebSocket(), 5000);
        return;
      }

      this.ws = new WebSocket('ws://localhost:5001');

      this.ws.onopen = () => {
        console.log('Connected to WebSocket server');
        this.reconnectAttempts = 0; // Reset attempts on successful connection
        this.isServerCheckInProgress = false;
        Spicetify.showNotification("WebSocket Connected!");
      };

      this.ws.onmessage = async (event) => {
        console.log('Received in app.tsx:', event.data);
        // Handle incoming messages here

        const data = JSON.parse(event.data);
        console.log(`data: ${data}`)



        // Handle structured messages with type and action
        switch (data.type) {
          case 'playback':
            switch (data.action) {
              case 'volume':
                Spicetify.Player.setVolume(data.value / 100);
                break;
              case 'seek':
                console.log(data.value)
                Spicetify.Player.seek(data.value)
                break;
              case 'play':
                Spicetify.Player.play();
                break;
              case 'play-uri':
                Spicetify.Player.playUri(data.value)
                break;
              case 'pause':
                Spicetify.Player.pause();
                break;
              case 'next':
                Spicetify.Player.next();
                break;
              case 'prev':
                Spicetify.Player.back();
                break;
              case 'toggle':
                Spicetify.Player.togglePlay();
                break;
              case 'shuffle':
                Spicetify.Player.toggleShuffle();
                break;
              case 'setRepeat':
                // Convert RepeatState string to Spicetify number value
                let repeatValue: number;
                switch (data.value) {
                  case 'off':
                    repeatValue = 0;
                    break;
                  case 'context':
                    repeatValue = 1;
                    break;
                  case 'track':
                    repeatValue = 2;
                    break;
                  default:
                    repeatValue = 0;
                }

                // Set the repeat state
                Spicetify.Player.setRepeat(repeatValue);

                // Send back confirmation
                this.sendMessage(JSON.stringify({
                  type: 'response',
                  action: 'repeatState',
                  data: {
                    state: data.value
                  }
                }));
                break;
              case 'toggleRepeat':
                const currentState = Spicetify.Player.getRepeat();
                let newState;

                // Toggle between states: off -> context -> track -> off
                switch (currentState) {
                  case 0: // off
                    newState = 1; // context (playlist/album repeat)
                    break;
                  case 1: // context
                    newState = 2; // track (single song repeat)
                    break;
                  case 2: // track
                    newState = 0; // off
                    break;
                  default:
                    newState = 0;
                }

                Spicetify.Player.setRepeat(newState);

                // Send back the new state
                this.sendMessage(JSON.stringify({
                  type: 'response',
                  action: 'repeatState',
                  data: {
                    state: newState === 0 ? 'off' :
                      newState === 1 ? 'context' :
                        'track'
                  }
                }));
                break;
              default:
                console.log('Unknown playback action:', data.action);
            }
            break;
          case 'info':
            switch (data.action) {
              case 'token':
                this.sendMessage(JSON.stringify({
                  type: 'response',
                  action: 'token',
                  data: {
                    token: Spicetify.Platform.Session.accessToken,
                    expiration: Spicetify.Platform.Session.accessTokenExpirationTimestampMs
                  }
                }))
                break;
              case 'next':
                // Handle getting next track info
                const nextTrack = Spicetify.Queue.nextTracks[0]['contextTrack']['metadata'];
                console.log(`Next Tracks: ${JSON.stringify(Spicetify.Queue.nextTracks[0]['contextTrack']['metadata'], null, 2)}`);


                this.sendMessage(JSON.stringify({
                  type: 'response',
                  action: 'next',
                  data: {
                    name: nextTrack.title,
                    artist: nextTrack.artist_name,
                    album: nextTrack.album_title,
                    duration: nextTrack.duration,
                    album_cover: this.convertSpotifyImageUriToUrl(nextTrack.image_xlarge_url),
                    year: nextTrack.album_name || 'Unknown',
                  }
                }));
                break;
              case 'current':
                /*
                {
                  "type": "track",
                  "uri": "spotify:track:2EiJ8L7AFkiKXHqqU6x96K",
                  "uid": "5d7691ae0c51fde1",
                  "name": "Red Light",
                  "mediaType": "audio",
                  "duration": {
                    "milliseconds": 124000
                  },
                  "album": {
                    "type": "album",
                    "uri": "spotify:album:3Ow1LjWwNkxd2VpJiS9gdc",
                    "name": "Red Light",
                    "images": [
                      {
                        "url": "spotify:image:ab67616d00001e02b805db0afcb1e919ebf1548b",
                        "label": "standard"
                      },
                      {
                        "url": "spotify:image:ab67616d00004851b805db0afcb1e919ebf1548b",
                        "label": "small"
                      },
                      {
                        "url": "spotify:image:ab67616d0000b273b805db0afcb1e919ebf1548b",
                        "label": "large"
                      },
                      {
                        "url": "spotify:image:ab67616d0000b273b805db0afcb1e919ebf1548b",
                        "label": "xlarge"
                      }
                    ]
                  },
                  "artists": [
                    {
                      "type": "artist",
                      "uri": "spotify:artist:5pTDhtjL1lF9Mft8TYCjv6",
                      "name": "QKReign"
                    },
                    {
                      "type": "artist",
                      "uri": "spotify:artist:3BTY807ipaaT6QHW1tHTt0",
                      "name": "RJ Pasin"
                    }
                  ],
                  "isLocal": false,
                  "isExplicit": false,
                  "is19PlusOnly": false,
                  "hasAssociatedVideo": false,
                  "provider": "context",
                  "metadata": {
                    "album_uri": "spotify:album:3Ow1LjWwNkxd2VpJiS9gdc",
                    "interaction_id": "6A8D174C-8117-48E7-B813-93E6494DAE44",
                    "canvas.id": "ffa63edec79b4d21ba10b2e647ad5f06",
                    "context_uri": "spotify:playlist:1ZV8LNpHE9A9fP6cojtj0T",
                    "collection.can_add": "true",
                    "canvas.artist.name": "QKReign",
                    "actions.skipping_next_past_track": "resume",
                    "popularity": "66",
                    "album_disc_number": "1",
                    "canvas.type": "VIDEO_LOOPING_RANDOM",
                    "collection.can_ban": "true",
                    "canvas.url": "https://canvaz.scdn.co/upload/artist/5pTDhtjL1lF9Mft8TYCjv6/video/ffa63edec79b4d21ba10b2e647ad5f06.cnvs.mp4",
                    "canvas.entityUri": "spotify:track:2EiJ8L7AFkiKXHqqU6x96K",
                    "entity_uri": "spotify:playlist:1ZV8LNpHE9A9fP6cojtj0T",
                    "image_small_url": "spotify:image:ab67616d00004851b805db0afcb1e919ebf1548b",
                    "collection.in_collection": "false",
                    "album_disc_count": "1",
                    "collection.artist.is_banned": "false",
                    "duration": "124000",
                    "canvas.artist.avatar": "https://open.spotify.com/image/ab6761610000f17883629564c38a28c28771d0e1",
                    "image_url": "spotify:image:ab67616d00001e02b805db0afcb1e919ebf1548b",
                    "artist_name": "QKReign",
                    "canvas.fileId": "368cdaff8a813ed9b5aa840a099613f0",
                    "marked_for_download": "false",
                    "album_title": "Red Light",
                    "original_index": "46",
                    "canvas.uploadedBy": "artist",
                    "title": "Red Light",
                    "artist_name:1": "RJ Pasin",
                    "album_track_count": "0",
                    "image_large_url": "spotify:image:ab67616d0000b273b805db0afcb1e919ebf1548b",
                    "has_lyrics": "true",
                    "album_track_number": "1",
                    "image_xlarge_url": "spotify:image:ab67616d0000b273b805db0afcb1e919ebf1548b",
                    "artist_uri:1": "spotify:artist:3BTY807ipaaT6QHW1tHTt0",
                    "page_instance_id": "ABC83BF4-39FD-460E-8913-743124D45CF5",
                    "added_at": "1739610556",
                    "album_artist_name": "QKReign",
                    "canvas.explicit": "false",
                    "canvas.canvasUri": "spotify:canvas:7Mp16wHJy24S8bYkiMAM2G",
                    "canvas.artist.uri": "spotify:artist:5pTDhtjL1lF9Mft8TYCjv6",
                    "iteration": "4",
                    "artist_uri": "spotify:artist:5pTDhtjL1lF9Mft8TYCjv6",
                    "track_player": "audio",
                    "collection.is_banned": "false",
                    "actions.skipping_prev_past_track": "resume"
                  },
                  "images": [
                    {
                      "url": "spotify:image:ab67616d00001e02b805db0afcb1e919ebf1548b",
                      "label": "standard"
                    },
                    {
                      "url": "spotify:image:ab67616d00004851b805db0afcb1e919ebf1548b",
                      "label": "small"
                    },
                    {
                      "url": "spotify:image:ab67616d0000b273b805db0afcb1e919ebf1548b",
                      "label": "large"
                    },
                    {
                      "url": "spotify:image:ab67616d0000b273b805db0afcb1e919ebf1548b",
                      "label": "xlarge"
                    }
                  ]
                }
                */


                // Handle getting current track info
                const currentTrack = Spicetify.Player.data.item;
                this.duration.duration = currentTrack.duration.milliseconds;

                console.log(`current track: ${currentTrack}`)
                this.sendMessage(JSON.stringify({
                  type: 'response',
                  action: 'current',
                  data: {
                    name: currentTrack?.name || 'No Song Playing',
                    artist: currentTrack?.artists?.[0]?.name || 'Unknown Artist',
                    album: currentTrack?.album?.name || 'Unknown',
                    duration_ms: currentTrack?.duration || 0,
                    album_cover: this.convertSpotifyImageUriToUrl(currentTrack.metadata.image_xlarge_url),
                    year: currentTrack.album.name || 'Unknown',
                    volume: Spicetify.Player.getVolume(),
                    is_playing: Spicetify.Player.isPlaying(),
                    repeat_state: Spicetify.Player.getRepeat(),
                    shuffle_state: Spicetify.Player.getShuffle(),
                    progress_ms: Spicetify.Player.getProgress(),
                    progress_percentage: Spicetify.Player.getProgressPercent() * 100
                  }
                }));

                break;
            }
        }
      };


      this.ws.onclose = () => {
        console.log('WebSocket connection closed');
        this.isServerCheckInProgress = false;
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isServerCheckInProgress = false;
        // Don't try to reconnect here - let onclose handle it
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.isServerCheckInProgress = false;
      this.handleReconnect();
    }
  }

  private async handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
      console.log(`Attempting to reconnect in ${delay}ms... (Attempt ${this.reconnectAttempts})`);

      setTimeout(() => {
        this.connectWebSocket();
      }, delay);
    } else {
      console.log('Max reconnection attempts reached. Will try again when server becomes available.');
      this.reconnectAttempts = 0; // Reset attempts
      // Check periodically if server becomes available
      setTimeout(() => {
        this.connectWebSocket();
      }, 5000); // Check every 5 seconds
    }
  }

  public async main() {
    // Wait for Spicetify to be ready
    while (!Spicetify?.showNotification) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Initialize WebSocket connection
    await this.connectWebSocket();
    await this.establishListeners()
    // Show initial message
    Spicetify.showNotification("Hello from Iris!");
  }

  // Method to safely send messages
  public async sendMessage(message: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
    }
  }

  private async establishListeners() {

    this.startProgressTracking();

    /*
    Deprecated- Short lived due to electron's background tab throttling, slowing the messages

    this.listenForProgressChange(); 
    */
    this.listenForSongChange();
    this.listenForPlayPause();
  }

  private async listenForSongChange() {
    this.duration.prevDuration = Spicetify.Player.getDuration();
    console.log('starting songchange eventlistener')

    Spicetify.Player.addEventListener("songchange", (event) => {
      this.loopSwitch=false;
      console.log('songchange event triggered');
      // Check if previous song ended naturally (within 1.5s of its end)

      console.log(`song: ${this.progress.prevProgress}`)
      if (this.progress.prevProgress > (this.duration.prevDuration - 3550)) {
        console.log('Song ended naturally')
        this.wasAutoSwitchedThisSong = true;
        setTimeout(() => {
          // Reset after 2 seconds
        }, 2000);
      } else {
        this.wasAutoSwitchedThisSong = false;
        console.log('Song ended abruptly')
      };

      

      const currentTrack = Spicetify.Player.data.item;

      console.log(JSON.stringify(currentTrack, null, 2))


      // Fetch album details to get release date

      console.log(`Song ended: Previous Duration: ${this.duration.prevDuration}`)
      console.log(`Song ended: Previous Progress: ${this.progress}`)

      // Store current values for next change
      this.duration.prevDuration = Spicetify.Player.getDuration();
    });
  }


  private async listenForPlayPause() {
    Spicetify.Player.addEventListener('onplaypause', (event) => {
      const isPlaying = Spicetify.Player.isPlaying();
    })
  }

  // Clean up method
  public cleanup() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

const iris = new Iris();
export default iris;




