import { contextBridge, ipcRenderer } from 'electron';

const discord = {
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
}

contextBridge.exposeInMainWorld('discord', discord);
export type DiscordAPI = typeof discord;
