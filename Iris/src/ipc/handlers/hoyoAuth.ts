import { ipcMain } from 'electron';
import { HoyolabAuth } from '../../services/hoyoServices/auth.ts';

export function setupHoyoAuthHandlers () {
  ipcMain.handle('hoyo:login', async (event, username, password) => {
    try {
      const auth = new HoyolabAuth();
      const result = await auth.login(username, password);
      return result;
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  });
  
  ipcMain.handle('hoyo:getSToken', async (event, username, password) => {
    try {
      const auth = new HoyolabAuth();
      const result = await auth.getSToken(username, password);
      return result;
    } catch (error) {
      logger.error('getSToken error:', error);
      throw error;
    }
  });
}
