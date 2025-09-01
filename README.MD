![Iris](https://github.com/Hyperiya/Iris/blob/350b11a1268595e40dbd0e3094945166cdad0aca/Iris/src/assets/icons/IrisWideTransparent.png "Iris")
# Iris: A Modern Desktop Integration Hub for Discord, Spotify, and Hoyoverse Games

Iris is an Electron-based desktop application that seamlessly integrates Discord, Spotify, and Hoyoverse game services into an interface. It provides real-time music controls, game status tracking, and Discord voice chat management with a sleek, modern design.

Features:
- Spotify integration with real-time playback controls, lyrics display, and dynamic background theming based on album artwork
- Discord voice chat management with mute/deafen controls and user status tracking
- Hoyoverse game tracking for Genshin Impact, Honkai: Star Rail, and Zenless Zone Zero with real-time resin/stamina monitoring
- Customizable modular interface that allows users to enable/disable specific features
- System-native window controls with frameless design
- Voice Assistant for Discord and Spotify

## Examples
![Image 1](https://github.com/Hyperiya/Iris/blob/da18eed75956b7928aeb049c36602955208145f8/Examples/image.png)
![Image 2](https://github.com/Hyperiya/Iris/blob/da18eed75956b7928aeb049c36602955208145f8/Examples/image2.png)
![Image 3](https://github.com/Hyperiya/Iris/blob/da18eed75956b7928aeb049c36602955208145f8/Examples/iris_69Iy4UD0lD.png)
![Image 4](https://github.com/Hyperiya/Iris/blob/da18eed75956b7928aeb049c36602955208145f8/Examples/iris_E2PDZnuHfR.png)
![Image 5](https://github.com/Hyperiya/Iris/blob/da18eed75956b7928aeb049c36602955208145f8/Examples/iris_JdUeIJzDIa.png)
![Image 6](https://github.com/Hyperiya/Iris/blob/da18eed75956b7928aeb049c36602955208145f8/Examples/iris_t9hXk70aar.png)
![Image 7](https://github.com/Hyperiya/Iris/blob/da18eed75956b7928aeb049c36602955208145f8/Examples/iris_yTjK48g3Nl.png)

## Repository Structure
```
.
├── App/                          # Main application directory
│   ├── src/                      # Source code directory
│   │   ├── main.ts               # Electron main process entry point
│   │   ├── preload.ts            # Preload script for IPC bridge
│   │   ├── renderer/             # React renderer components
│   │   │   ├── components/       # UI components organized by feature
│   │   │   └── App.tsx           # Main React application component
│   │   ├── services/             # Service layer for external integrations
│   │   │   ├── discordServices/  # Discord RPC and voice chat integration
│   │   │   ├── hoyoServices/     # Hoyoverse API integration
│   │   │   └── spotifyServices/  # Spotify playback and control
│   │   ├── ipc/ 
│   │   │   ├── handlers/         # Files for functions that create IPC for each different service
│   │   │   └── index.ts          # Combines all functions into one for main.ts to call
│   │   └── utils/                # Utility functions and helpers
│   ├── forge.config.js           # Electron Forge build configuration
│   └── package.json              # Project dependencies and scripts
└── extension/                    # Spicetify extension for Spotify integration
```

## Usage Instructions
### Prerequisites
- Spotify desktop client with Spicetify installed*
- Discord desktop client*
- Valid Hoyoverse account*

(*- If you don't have any of these at all, this app won't be of any use for you whatsoever.)

### Compiling the Application yourself
```bash
# Clone the repository
git clone https://github.com/Hyperiya/Iris
cd Iris/Iris

# Install dependencies
npm install

# Compile application
npm run make
```

```bash
# Install Spicetify extension
cd Iris-Extension/iris-link
npm install

# Compile the extention yourself
npm run build
```

### Quick Start
1. (If applicable) Start the application in development mode:
```bash
cd App
npm start
```

2. Enable desired modules in the settings menu (accessible via the gear icon in the titlebar)

3. Connect your accounts:
   - Spotify: Click the button to install the extention, ensuring you have Spicetify, and that it works properly. If you compiled the extention yourself, make sure that the extention is applied.
   - Discord: Enter in your client ID and client Secret from https://discord.com/developers/applications (Make a new application) and grant permissions when prompted
   - Hoyoverse: Log in through the settings menu

## Voice Commands

Iris supports voice commands (when enabled) using the wake word "Hey Iris" followed by any of these commands:

### Discord Commands
| Command | Aliases | Action |
|---------|---------|--------|
| `leave call` | hang up, disconnect | Leave current voice channel |
| `deafen` | stephen, duffin, devon, death and, and, death in | Deafen yourself |
| `undeafen` | under often, under and, under fun, under under oven | Undeafen yourself |
| `mute` | *word matching* | Mute your microphone |
| `unmute` | *word matching* | Unmute your microphone |

### Spotify Commands
| Command | Aliases | Action |
|---------|---------|--------|
| `play` | resume, continue | Resume playback |
| `pause` | stop | Pause playback |
| `next song` | next, skip | Skip to next track |
| `previous song` | previous, back | Go to previous track |
| `shuffle` | mix | Toggle shuffle mode |
| `repeat` | repeat playlist, repeat album | Repeat playlist/album |
| `repeat song` | repeat track | Repeat current track |
| `stop repeating` | | Turn off repeat |

### Command Types
- **Exact Match**: Command must be spoken exactly as listed
- **Word Match** (*italicized*): All words must be present but can be in any order with additional words
- **Aliases**: Alternative phrases that trigger the same action

### Examples
- "Hey Iris play" → Resumes Spotify playback
- "Hey Iris please play some music" → Also resumes playback (word matching)
- "Hey Iris stephen" → Deafens you in Discord (common misheard word)

> **Note**: Many Discord commands have multiple aliases due to speech recognition challenges with technical terms like "deafen" and "undeafen".

### More Detailed Examples
#### Spotify Controls
```typescript
// Control playback
await spotifyService.playPause();
await spotifyService.seek(timeInMs);
await spotifyService.setVolume(volumeLevel);
```

#### Discord Voice Integration
```typescript
// Join voice channel
window.discord.voice.join(channelId);

// Toggle audio states
window.discord.voice.mute();
window.discord.voice.deafen();
```

### Troubleshooting
#### Common Issues
1. Spotify Connection Failed
   - Ensure Spicetify is properly installed
   - Check if the Spotify client is running
   - Verify the extension is built and installed correctly

2. Discord RPC Not Working
   - Restart Discord client
   - Check if Discord is running with proper permissions
   - Verify the Discord application ID is correct

3. Hoyoverse API Errors
   - Verify login credentials
   - Check network connectivity
   - Ensure correct server region is selected

## Data Flow
Iris manages real-time data flow between multiple services through WebSocket connections and IPC channels.

```ascii
[Spotify Client] <-> [Spicetify Extension] <-> [WebSocket] <-> [Electron Main] <-> [React UI]
[Discord Client] <-> [Discord RPC] <-> [IPC Bridge] <-> [Electron Main] <-> [React UI]
[Hoyoverse API] <-> [HTTP Client] <-> [Service Layer] <-> [Electron Main] <-> [React UI]
```

Key interactions:
- Spotify playback state is synchronized through WebSocket connection
- Discord voice states are managed through RPC and IPC channels
- Hoyoverse game data is fetched through authenticated HTTP requests
- UI updates are managed through React state management
- Theme colors are dynamically extracted from album artwork

# License
Iris © 2025 is licensed under CC BY-NC-SA 4.0 