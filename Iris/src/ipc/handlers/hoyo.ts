import { HoyoManager } from '../../services/hoyoServices/hoyoManager.ts';
import { ipcMain } from 'electron';

let hoyoManager: HoyoManager | null = null;

let cookieString: string
let uid: string

export function setupHoyoHandlers() {
    ipcMain.handle('hoyo:initialize', async (_, cookie, user_id) => {
        cookieString = cookie
        uid = user_id
        hoyoManager = new HoyoManager(cookieString, uid);
        await hoyoManager.initialize();
        return true;
    });

    ipcMain.handle('hoyo:callMethod', async (_, className: string, methodName: string, ...args: any[]) => {
        try {
            if (!hoyoManager) {
                // Initialize if not exists
                return;
            }

            // Handle nested class calls (like starrail.getInfo())
            if (className.includes('.')) {
                const [parentClass, childMethod] = className.split('.');
                return await hoyoManager[parentClass][childMethod](...args);
            }


            // Direct method calls
            console.log(`${className}.${methodName}, args`)
            return await hoyoManager[methodName](...args);
        } catch (error) {
            console.error('Error calling HoyoManager method:', error);
            throw error;
        }
    });
}

