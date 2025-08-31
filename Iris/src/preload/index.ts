import './loaders/discordLoader.ts';
import './loaders/electronLoader.ts';
import './loaders/hoyoLoader.ts';
import './loaders/loadingLoader.ts';
import './loaders/lrcLoader.ts';
import './loaders/musicRpcLoader.ts';
import './loaders/settingsLoader.ts';
import './loaders/snapshotLoader.ts';
import './loaders/spotifyLoader.ts';
import './loaders/versionsLoader.ts';
import './loaders/msxLoader.ts';
import './loaders/devLoader.ts';
import './loaders/irisVaLoader.ts';
// In preload/index.ts
export type { ElectronAPI } from './loaders/electronLoader.ts';
export type { DiscordAPI } from './loaders/discordLoader.ts';
export type { SpotifyAPI } from './loaders/spotifyLoader.ts';
export type { MusicRPCAPI } from './loaders/musicRpcLoader.ts';
export type { SettingsAPI } from './loaders/settingsLoader.ts';
export type { LoadingAPI } from './loaders/loadingLoader.ts';
export type { LrcAPI } from './loaders/lrcLoader.ts';
export type { HoyoAPI } from './loaders/hoyoLoader.ts';
export type { SnapshotAPI } from './loaders/snapshotLoader.ts';
export type { MsxAPI } from './loaders/msxLoader.ts';
export type { DevAPI } from './loaders/devLoader.ts';
export type { IrisVaAPI } from './loaders/irisVaLoader.ts';

/*
Hyperiya here-
I made this index file & the loaders avoid bloating the preload file over expansion of the project
Whenever I make a new IPC, I put it in a new file, import it, import the type I generated, and go on.
(2025-08-30 20:38:51)
*/