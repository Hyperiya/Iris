// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

// src/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
});

contextBridge.exposeInMainWorld('electron', {
  restart: () => ipcRenderer.invoke('restart-app'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  log: (message: any) => ipcRenderer.send('console-log', message),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  deviceName: () => ipcRenderer.invoke('device-name'),
  onNotification: (callback: (notification: any) => void) => {
    ipcRenderer.on('discord-notification', (_, notification) => {
      callback(notification);
    });
  },
  window: {
    windowTitle: (title: string) => ipcRenderer.invoke('window-title', title),
    minimize: () => ipcRenderer.invoke('window-minimize'),
    maximize: () => ipcRenderer.invoke('window-maximize'),
    unmaximize: () => ipcRenderer.invoke('window-unmaximize'),
    close: () => ipcRenderer.invoke('window-close'),
    isFullScreen: () => ipcRenderer.invoke('window-is-fullscreen'),
    onFullScreen: (callback: () => void) => ipcRenderer.on('fullscreen-change', callback),
    removeFullScreenListener: () => ipcRenderer.removeAllListeners('fullscreen-change'),
    fullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
    toggleClickThrough: (enable) => ipcRenderer.invoke('toggle-click-through', enable),
  },
});

contextBridge.exposeInMainWorld('snapshot', {
  create: () => ipcRenderer.invoke('snapshot:create'),
  delete: () => ipcRenderer.invoke('snapshot:delete'),
  getStatus: () => ipcRenderer.invoke('snapshot:status'),
});

contextBridge.exposeInMainWorld('spotify', {
  spicetify: {
    installExtension: () => ipcRenderer.invoke('install-spicetify-extension')
  },
  spotifyLink: () => ipcRenderer.invoke('spotify-link'),
});

contextBridge.exposeInMainWorld('discord', {
  connect: (id: string, secret: string) => ipcRenderer.invoke('discord:connect', id, secret),
  disconnect: () => ipcRenderer.invoke('discord:disconnect'),
  onData: (callback: (notification: any) => void) => {
    ipcRenderer.on('discord:data', (_, notification) => callback(notification));
  },
  removeDataListener: () => {
    ipcRenderer.removeAllListeners('discord:data');
  },
  subscribe: (event: string, args?: any) => ipcRenderer.invoke('discord:subscribe', event, args),
  unsubscribe: (event: string, args?: any) => ipcRenderer.invoke('discord:unsubscribe', event, args),
  revokeAllTokens: () => ipcRenderer.invoke('discord:revoke'),
  selectTextChannel: (channel_id:string) => ipcRenderer.invoke('discord:text', { action: 'selectTextChannel'}, { channel_id } ),
  voice: {
    mute: () => ipcRenderer.invoke('discord:voice', { action: 'mute' }),
    unmute: () => ipcRenderer.invoke('discord:voice', { action: 'unmute' }),
    deafen: () => ipcRenderer.invoke('discord:voice', { action: 'deafen' }),
    undeafen: () => ipcRenderer.invoke('discord:voice', { action: 'undeafen' }),
    leave: () => ipcRenderer.invoke('discord:voice', { action: 'leave' }),
    join: (channel_id: string) => ipcRenderer.invoke('discord:voice',
      { action: 'join' },
      { channel_id }
    ),
    getVoiceChannel: () => ipcRenderer.invoke('discord:voice', { action: 'getVoiceChannel' }),
    getVoiceSettings: () => ipcRenderer.invoke('discord:voice', { action: 'getVoiceSettings' }),
  }
});


contextBridge.exposeInMainWorld('hoyoAPI', {
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
});

contextBridge.exposeInMainWorld('lrc', {
  parseSyncedLyrics: (lyrics: string) => ipcRenderer.invoke('lrc:parse-lyrics', lyrics),
  searchLyrics: (params: any) => ipcRenderer.invoke('lrc:search', params)
})

contextBridge.exposeInMainWorld('loading', {
  // For showing/hiding the loading screen
  showLoading: (message?: string) => ipcRenderer.invoke('loading:show', message),
  updateLoading: (progress: number, message?: string) => ipcRenderer.invoke('loading:update', progress, message),
  hideLoading: () => ipcRenderer.invoke('loading:hide'),
  
  // For listening to loading events
  onLoadingUpdate: (callback: (progress: number, message: string) => void) => {
    ipcRenderer.on('loading:update', (_, progress, message) => callback(progress, message));
    return () => ipcRenderer.removeAllListeners('loading:update');
  }
});

// I realized I don't need this in preload/renderer right now, but I might need it later.  

contextBridge.exposeInMainWorld('musicRPC', {
  connect: (clientId: string) => ipcRenderer.invoke('musicRPC:connect', clientId),
  setActivity: (activity: {
    details?: string;
    state?: string;
    assets?: { large_image?: string; large_text?: string };
  }) => ipcRenderer.invoke('musicRPC:setActivity', activity),
  disconnect: () => ipcRenderer.invoke('musicRPC:disconnect'),
});
