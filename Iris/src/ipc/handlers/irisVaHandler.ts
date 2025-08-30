import { ipcMain, BrowserWindow } from "electron";
import { IrisVA } from "../../services/VAServices/IrisVA.ts";

let irisVA: IrisVA = new IrisVA;

export function setupIrisVAHandlers() {
  ipcMain.handle("irisVA:start", async () => {
    if (!irisVA) throw new Error("IrisVA not initialized");
    irisVA.startVA();
  });

  ipcMain.handle("irisVA:checkForModel", async () => {
    if (!irisVA) throw new Error("IrisVA not initialized");
    return await irisVA.checkForModel();
  });

  ipcMain.handle("irisVA:downloadModel", async () => {
    if (!irisVA) throw new Error("IrisVA not initialized");
    return await irisVA.downloadVoskModel();
  })
}
