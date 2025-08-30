import { ipcMain } from 'electron';
import SpotifyService from '../../services/spotifyServices/SpotifyService.ts';
import WebSocket, { WebSocketServer } from 'ws';
import { LrcLibApi } from '../../services/spotifyServices/LrcLibService.ts';
import * as http from 'http';


let wss: WebSocketServer | null = null;
let healthServer: http.Server | null = null;
const clients = new Set<WebSocket>();

function createWebSocketServer() {
    if (wss) {
        logger.log('WebSocket server already running');
        return;
    }

    wss = new WebSocketServer({ port: 5001 });

    wss.on('listening', () => {
        logger.log('WebSocket server is listening on port 5001');
    });

    const handleSpicetifyMessage = (message: string): Promise<any> => {
        return new Promise((resolve) => {
            // You can route different message types here
            SpotifyService.handleMessage(message)
                .then(result => resolve(result))
                .catch(error => resolve({ error: error.message }));
        });
    };

    wss.on('connection', async (ws: WebSocket) => {
        await clients.add(ws);
        logger.log('New Spicetify client connected');

        ws.on('message', async (message) => {
            try {
                const messageString = message.toString();
                const messageStr = message.toString();

                clients.forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(messageStr);
                    }
                });

                const response = await handleSpicetifyMessage(messageString);

                // Echo back the message
                // ws.send(`Server received: ${messageString}`);
            } catch (error) {
                logger.error('Error handling message:', error);
            }
        });

        ws.on('close', () => {
            clients.delete(ws);
            logger.log('Client disconnected');
        });

        ws.on('error', (error) => {
            logger.error('WebSocket error:', error);
            clients.delete(ws);

        });

        // Send initial connection confirmation
        ws.send('Connected to Electron WebSocket Server');
    });

    wss.on('error', (error) => {
        logger.error('WebSocket server error:', error);
    });

    const healthServer = http.createServer((req, res) => {
        if (req.url === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
        } else {
            res.writeHead(404);
            res.end();
        }
    });

    healthServer.listen(5002, '127.0.0.1', () => {
        logger.log('Health check server listening on port 5002');
    });
}

export function setupSpotifyHandlers() {
    ipcMain.handle('spotify-link', async () => {
        await createWebSocketServer()
    })

    ipcMain.handle('spotify:start-link', async () => {
        try {
            await SpotifyService.startLinkWs();
            return true;
        } catch (error) {
            logger.error('Failed to start Spotify link:', error);
            throw error;
        }
    })

    ipcMain.handle('lrc:search', async (_, params: { artist: string, track: string, album: string }) => {
        try {
            const lrcLibApi = new LrcLibApi();
            const response = await lrcLibApi.searchLyrics({
                artist: params.artist,
                track: params.track,
                album: params.album
            });
            return response;
        } catch (error) {
            logger.error('Error searching lyrics:', error);
            throw error;
        }
    })

    ipcMain.handle('lrc:parse-lyrics', async (_, syncedLyrics: string) => {
        try {
            const lrcLibApi = new LrcLibApi();
            const response = await lrcLibApi.parseSyncedLyrics(syncedLyrics);
            return response;
        } catch (error) {
            logger.error('Error parsing lyrics:', error);
            throw error;
        }
    })
}

export function cleanupSpotifyHandlers() {
    return new Promise<void>((resolve) => {
        if (wss) {
            // Close all client connections
            clients.forEach(client => {
                client.close();
            });
            clients.clear();

            // Close WebSocket server
            wss.close(() => {
                logger.log('WebSocket server closed');
                wss = null;
            });
        }

        if (healthServer) {
            healthServer.close(() => {
                logger.log('Health check server closed');
                healthServer = null;
            });
        }

        resolve();
    });
}
