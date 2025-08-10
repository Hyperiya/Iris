import DiscordRPC from '../../services/discordServices/discordRPC.ts'
import { BrowserWindow, ipcMain } from 'electron';

let discordRPC: null | DiscordRPC = null;
let isConnecting = false;

export function setupDiscordHandlers(mainWindow: BrowserWindow) {
    ipcMain.handle('discord:connect', async (_, id, secret) => {
        if (isConnecting) return { success: false, error: 'Connection already in progress' };
        if (discordRPC) return { success: true }; // Already connected
        
        isConnecting = true;
        try {
            const client_id = id;
            const client_secret = secret;

            discordRPC = new DiscordRPC(String(client_id), String(client_secret));
            await discordRPC.connect();

            // Forward notifications to renderer
            discordRPC.on('data', (data) => {
                mainWindow?.webContents.send('discord:data', data);
            });
            
            isConnecting = false;
            return { success: true };
        } catch (error) {
            logger.error('Failed to connect to Discord:', error);
            isConnecting = false;
            discordRPC = null;
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('discord:status', () => {
        return { connected: !!discordRPC };
    });

    ipcMain.handle('discord:disconnect', async () => {
        try {
            if (discordRPC) {
                // Assuming your DiscordRPC class has these methods
                discordRPC.removeAllListeners('notification');
                await discordRPC.disconnect();
                discordRPC=null
            }
            return { success: true };
        } catch (error) {
            logger.error('Failed to disconnect from Discord:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('discord:revoke', async () => {
        try {
            if (discordRPC) {
                await discordRPC.revokeAllTokens();
                return { success: true };
            } else {
                return { success: false, error: 'DiscordRPC instance not initialized' };
            }
        } catch (error) {
            logger.error('Failed to revoke tokens:', error);
            return { success: false, error: error.message };
        }
    })

    ipcMain.handle('discord:subscribe', async (_, event, args?) => {
        if (!discordRPC) {
            throw new Error('Discord RPC not initialized');
        }
        try {
            await discordRPC.subscribeToEvent(event, args);
        } catch (error) {
            logger.error('Subscription error:', error);
            throw error;
        }
    })

    ipcMain.handle('discord:text', async (_, { action }, args?) => {
        return;
        if (!discordRPC) {
            throw new Error('Discord RPC not initialized');
        }

        try {
            switch (action) {
                case 'selectTextChannel':
                    if (!args || !args.channel_id) {
                        throw new Error('Channel ID is required for selectTextChannel action');
                    }
                    await discordRPC?.selectTextChannel(args.channel_id);
                    break;
                default:
                    throw new Error(`${action} is not a valid action for this function`);

            }
        }
        catch (error) {
            logger.error('Text control error:', error);
            throw error;
        }
    })

    ipcMain.handle('discord:voice', async (_, { action }, args?) => {
        if (!discordRPC) {
            throw new Error('Discord RPC not initialized');
        }

        try {
            switch (action) {
                case 'mute':
                    await discordRPC.voice.mute();
                    return { success: true };
                case 'unmute':
                    await discordRPC.voice.unmute();
                    return { success: true };
                case 'deafen':
                    await discordRPC.voice.deafen();
                    return { success: true };
                case 'undeafen':
                    await discordRPC.voice.undeafen();
                    return { success: true };
                case 'leave':
                    await discordRPC.voice.leaveCall();
                    break;
                case 'join':
                    if (!args || !args.channel_id) {
                        throw new Error('Channel ID is required for join action');
                    }
                    await discordRPC.voice.joinCall(args.channel_id);
                    break;
                case 'getVoiceChannel':
                    await discordRPC.voice.getVoiceChannel()
                    break;
                case 'getVoiceSettings':
                    await discordRPC.voice.getVoiceSettings()
                    break;

                default:
                    throw new Error(`${action} is not a valid action for this function`);
            }
        } catch (error) {
            logger.error('Voice control error:', error);
            throw error;
        }
    });
}