import { ipcMain } from "electron";
import { IrisVA } from "../../services/VAServices/IrisVA.ts";

export function setupIrisVAHandlers(irisVA: IrisVA | null) {
    if (!irisVA) return;
    ipcMain.handle("irisVA:start", () => {
            if (irisVA) {
                irisVA.startVA(); // Don't return or await this
                return true; // Return success indicator
            }
            return false;
    });

    ipcMain.handle("irisVA:checkForModel", async () => {
        if (!irisVA) throw new Error("IrisVA not initialized");
        return await irisVA.checkForModel();
    });

    ipcMain.handle("irisVA:downloadModel", async () => {
        if (!irisVA) throw new Error("IrisVA not initialized");
        return await irisVA.downloadVoskModel();
    });
    ipcMain.handle("irisVA:stop", async () => {
        if (!irisVA) throw new Error("IrisVA not initialized");
        irisVA.stopVA();
    });
}
