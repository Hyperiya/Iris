import { HoyoManager } from "../../services/hoyoServices/hoyoManager.ts";
import { ipcMain } from "electron";

let hoyoManager: HoyoManager | null = null;

let cookieString: string;
let uid: string;

export function setupHoyoHandlers() {
  ipcMain.handle("hoyo:initialize", async (_, cookie, user_id) => {
    cookieString = cookie;
    uid = user_id;
    hoyoManager = new HoyoManager(cookieString, uid);
    await hoyoManager.initialize();
    return true;
  });

  ipcMain.handle(
    "hoyo:callMethod",
    async (_, methodPath: string, ...args: any[]) => {
      try {
        if (!hoyoManager) {
          throw new Error(
            "HoyoManager not initialized. Call initialize() first."
          );
        }

        // Handle nested class calls (like starrail.getInfo())
        if (methodPath.includes(".")) {
          const [parentClass, childMethod] = methodPath.split(".");
          return await hoyoManager[parentClass][childMethod](...args);
        }

        // Direct method calls
        logger.log(`${methodPath}, args`);
        return await hoyoManager[methodPath](...args);
      } catch (error) {
        logger.error("Error calling HoyoManager method:", error);
        throw error;
      }
    }
  );
}
