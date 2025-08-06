import fs from 'fs'
import path from 'path'
import { ipcMain, app } from 'electron';
import { exec } from 'child_process';

export function setupSpicetifyHandlers() {
  const getAssetPath = () => {
    if (process.env.NODE_ENV === 'development') {
      return path.join(app.getAppPath(), 'src', 'assets', 'extension', 'iris-link.js');
    }
    // In production, assets are typically in a different location
    return path.join(process.resourcesPath, 'assets', 'extension', 'iris-link.js');
  };

  // Spicetify Extention Installer
  ipcMain.handle('install-spicetify-extension', async () => {
    try {
      if (process.platform !== 'win32') {
        throw new Error('This feature is only available on Windows (For now!)');
      }

      const appDataPath = app.getPath('appData');
      const extensionsPath = path.join(appDataPath, 'spicetify', 'Extensions');
      const extensionFile = 'iris-link.js';
      const extensionDestPath = path.join(extensionsPath, extensionFile);

      // Get the source path from our assets
      const sourcePath = getAssetPath();

      console.log('Source path:', sourcePath);
      console.log('Destination path:', extensionDestPath);

      // Check if source exists
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Extension file not found at: ${sourcePath}`);
      }

      // Create Extensions directory if it doesn't exist
      if (!fs.existsSync(extensionsPath)) {
        await fs.promises.mkdir(extensionsPath, { recursive: true });
      }

      // Copy the extension file
      await fs.promises.copyFile(sourcePath, extensionDestPath);

      await exec(`spicetify config extensions ${extensionFile}`); 

      // Run spicetify apply
      await new Promise((resolve, reject) => {
        exec('spicetify apply', (error, stdout, stderr) => {
          if (error) {
            console.error('Error running spicetify apply:', error);
            reject(error);
          } else {
            console.log('Spicetify apply output:', stdout);
            resolve(stdout);
          }
        });
      });

      return { success: true, message: 'Extension installed successfully!' };
    } catch (error: any) {
      console.error('Installation error:', error);
      return {
        success: false,
        message: `Installation failed: ${error.message}`
      };
    }
  });

}
