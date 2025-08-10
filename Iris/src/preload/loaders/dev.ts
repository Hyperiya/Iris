import { contextBridge } from 'electron';

const dev = {
    enabled: process.env.DEBUG_MODE?.trim() === 'true' || (global as any).DEBUG_MODE === true,
    hoyo: {
        online: process.env.HOYO_ONLINE?.trim() === 'true' || (global as any).HOYO_ONLINE === true,
    }
}

export type DevAPI = typeof dev;

contextBridge.exposeInMainWorld('dev', dev);
