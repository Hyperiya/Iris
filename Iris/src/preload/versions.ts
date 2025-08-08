import { contextBridge } from 'electron';

const versions = {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron,
}

contextBridge.exposeInMainWorld('versions', versions);
export type VersionsAPI = typeof versions;