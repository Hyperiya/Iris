import net from 'net';
import { EventEmitter } from 'events';
import { VoiceChannelSelectType } from './types.ts'
import Store from 'electron-store';


interface RpcMessage {
    op: number;
    cmd?: string;
    evt?: string;
    data?: any;
}

interface TokenStore {
    access_token: string;
    refresh_token: string;
    expires_at: number;
}

class DiscordRPC extends EventEmitter {
    private socket: net.Socket | null;
    private buffer: Buffer;
    private readonly CLIENT_ID: string
    private readonly CLIENT_SECRET: string

    private store: Store = new Store();
    public subscribedEvents: Set<string> = new Set();

    public voice: VoiceManager;

    constructor(CLIENT_ID: string, CLIENT_SECRET?: string) {
        super();
        this.socket = new net.Socket();
        this.buffer = Buffer.alloc(0);

        this.setupSocket();

        this.CLIENT_ID = CLIENT_ID || ''
        this.CLIENT_SECRET = CLIENT_SECRET || ''

        this.voice = new VoiceManager(this)

    }
    
    public generateNonce(): string {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    async connect() {
        if (this.CLIENT_ID === '' || this.CLIENT_SECRET === '') return;
        
        const attemptConnection = async (): Promise<boolean> => {
            return new Promise((resolve) => {
                let currentPipe = 0;
                const maxPipes = 10;
                let connected = false;
                
                const tryConnect = (pipeNum: number) => {
                    if (connected) return;
                    
                    // Create a new socket for each attempt
                    if (this.socket) {
                        this.socket.removeAllListeners();
                        this.socket.destroy();
                    }
                    this.socket = new net.Socket();
                    
                    // Setup socket listeners
                    this.socket.once('connect', () => {
                        connected = true;
                        logger.log('Connected to Discord IPC pipe:', pipeNum);
                        this.setupSocket(); // Only setup full listeners after successful connection
                        resolve(true);
                    });
        
                    this.socket.once('error', (err) => {
                        logger.log(`Failed to connect to pipe ${pipeNum}:`, err.message);
                        
                        // Clean up failed connection attempt
                        this.socket?.removeAllListeners();
                        this.socket?.destroy();
                        
                        // Try next pipe
                        if (currentPipe < maxPipes - 1) {
                            currentPipe++;
                            tryConnect(currentPipe);
                        } else {
                            resolve(false); // Changed from reject to resolve(false)
                        }
                    });
        
                    const currentPath = process.platform === 'win32'
                        ? `\\\\?\\pipe\\discord-ipc-${pipeNum}`
                        : `/tmp/discord-ipc-${pipeNum}`;
        
                    logger.log(`Attempting to connect to pipe ${pipeNum}:`, currentPath);
                    
                    try {
                        this.socket.connect(currentPath);
                    } catch (err) {
                        // If connect throws synchronously, clean up and try next pipe
                        logger.error(`Error connecting to pipe ${pipeNum}:`, err);
                        this.socket?.removeAllListeners();
                        this.socket?.destroy();
                        
                        if (currentPipe < maxPipes - 1) {
                            currentPipe++;
                            tryConnect(currentPipe);
                        } else {
                            resolve(false); // Changed from reject to resolve(false)
                        }
                    }
                };
        
                // Start with pipe 0
                logger.log('Starting Discord IPC connection attempts');
                tryConnect(currentPipe);
            });
        };
        
        // Keep trying until connected
        while (true) {
            const connected = await attemptConnection();
            if (connected) return true;
            
            logger.log('Failed to connect to Discord. Retrying in 60 seconds...');
            await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 60 seconds
        }    
    }
    
    private setupSocket() {
        if (!this.socket) return;
        
        this.socket
            .on('ready', () => this.handleConnect())
            .on('data', (data) => this.handleData(data))
            .on('close', () => {
                logger.log('Socket closed');
                this.emit('close');
            })
            .on('error', (err) => {
                logger.log('Socket error:', err);
                this.emit('error', err);
            });
    }
    


    private async handleConnect() {
        logger.log('Connected to Discord IPC');
        await this.sendHandshake();
    }

    private async sendHandshake() {
        return new Promise((resolve, reject) => {
            const handshakePayload = {
                v: 1,
                client_id: this.CLIENT_ID,
                nonce: this.generateNonce(),
                op: 0
            };

            logger.log('Sending handshake payload:', handshakePayload);
            this.sendFrame(handshakePayload);

            // Set up a timeout for handshake response

            // Wait for handshake response
            this.once('ready', () => {
                resolve(true);
                this.authorize();
            });
        });
    }

    public async revokeAllTokens() {
        const tokens = {
            access_token: this.store.get('access_token') as string,
            refresh_token: this.store.get('refresh_token') as string,
            expires_at: this.store.get('expires_at') as number
        }

        // Revoke acccess token
        await fetch("https://discord.com/api/v10/oauth2/token", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                token: tokens.access_token as string
            })
        });

        // Revoke Refresh Token =
        await fetch("https://discord.com/api/v10/oauth2/token", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                token: tokens.refresh_token as string
            })
        });

        await this.store.delete('access_token');
        await this.store.delete('refresh_token');
        await this.store.delete('expires_at');

        await window.electron.restart();
    }

    private async authorize() {
        const tokens:TokenStore = {
            access_token: this.store.get('access_token') as string,
            refresh_token: this.store.get('refresh_token') as string,
            expires_at: this.store.get('expires_at') as number
        }

        logger.log(`access tokens: ${tokens.access_token}, ${tokens.refresh_token}, ${tokens.expires_at}`)

        if (tokens.access_token !== undefined && tokens.expires_at > Date.now() && tokens.refresh_token !== undefined) {
            logger.log('skippy')
            this.authenticate(tokens.access_token);
            return;
        } else if (false || tokens.refresh_token !== undefined && tokens.expires_at < Date.now()) {
            logger.log('refreshing')
            const response = await fetch("https://discord.com/api/v10/oauth2/token", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: tokens.refresh_token,
                    client_id: this.CLIENT_ID,
                    client_secret: this.CLIENT_SECRET,
                })
            });
            const data = await response.json();
            this.store.delete('access_token')
            this.store.delete('refresh_token')
            this.store.delete('expires_at')

            this.store.set('access_token', data.access_token);
            this.store.set('refresh_token', data.refresh_token);
            this.store.set('expires_at', Date.now() + data.expires_in);

            this.authenticate(data.access_token);
            return;
        }

        // After handshake is successful, you'll receive a READY event
        // Then you should send IDENTIFY
        this.once('codeReceived', (code) => {
            logger.log('getting token');
            this.getToken(code)
        });



        const identifyPayload = {
            op: 1, // FRAME opcode
            cmd: 'AUTHORIZE',
            nonce: this.generateNonce(),
            args: {
                client_id: this.CLIENT_ID,
                client_secret: this.CLIENT_SECRET,
                scopes: ['rpc', 'rpc.notifications.read', 'rpc.voice.write', 'rpc.voice.read', 'messages.read'],
                v: 1
            }
        };


        this.sendFrame(identifyPayload);
        // Handlemessage Takes it from here to get the code by codeReceived

    }

    private async getToken(code: string) {
        const response = await fetch("https://discord.com/api/oauth2/token", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: this.CLIENT_ID,
                client_secret: this.CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: 'http://localhost',
                scope: 'identify'
            })
        });
        const data = await response.json();
        logger.log(JSON.stringify(data, null, 2))
        /*
        {
        "token_type": "Bearer",
        "access_token": "---------------------------",
        "expires_in": 604800,
        "refresh_token": "-----------------------------",
        "scope": "messages.read rpc rpc.notifications.read"
        }
        */
        this.store.set('access_token', data.access_token);
        this.store.set('refresh_token', data.refresh_token);

        // I prefer doing this, because it just makes things easier in the long run
        this.store.set('expires_at', Date.now() + data.expires_in);
        data.access_token && this.authenticate(data.access_token);
    }


    private async authenticate(code: string) {

        this.once('authenticated', () => {
            logger.log('subscribing')
            this.subscribe();
        });

        const authenticatePayload = {
            op: 1, // FRAME opcode
            cmd: 'AUTHENTICATE',
            nonce: this.generateNonce(),
            args: {
                access_token: code
            }
        };

        logger.log('Sending authenticate payload')
        this.sendFrame(authenticatePayload);
    }

    private async sendFrame(message: RpcMessage) {
        const data = JSON.stringify(message);
        const header = Buffer.alloc(8);
        header.writeUInt32LE(message.op, 0);
        header.writeUInt32LE(data.length, 4);

        this.socket!.write(Buffer.concat([header, Buffer.from(data)]));
    }

    private async handleData(chunk: Buffer) {
        this.buffer = Buffer.concat([this.buffer, chunk]);

        while (this.buffer.length >= 8) {
            const opcode = this.buffer.readUInt32LE(0);
            const length = this.buffer.readUInt32LE(4);
            const totalLength = 8 + length;

            if (this.buffer.length < totalLength) break;

            const payload = JSON.parse(this.buffer.subarray(8, totalLength).toString());

            logger.log('Received payload:', JSON.stringify(payload, null, 2));
            this.handleMessage(opcode, payload);

            this.buffer = this.buffer.subarray(totalLength);
        }
    }

    private async handleMessage(opcode: number, data: any) {
        logger.log('Handling message with opcode:', opcode, 'and data:', data);
        switch (opcode) {
            case 1: // Event
                return this.handleEvent(data);
            case 2: // Error
                return this.handleError(data);
            default:
                logger.log('Unknown opcode:', opcode);
        }
    }

    private async handleEvent(data: RpcMessage) {
        // Handle command responses first
        if (data.cmd === 'AUTHORIZE' && data.data?.code) {
            this.emit('codeReceived', data.data.code);
            return;
        }

        if (data.cmd === 'AUTHENTICATE') {
            logger.log('authenticated')
            this.emit('authenticated');
            return;
        }

        else if (data.cmd && data.evt == null) {
            this.emit('data', data);
        }

        // Handle dispatched events
        if (data.evt) {
            if (data.evt === 'READY' && data.cmd === 'DISPATCH') {
                this.emit('ready');
                return;
            }

            // Check if we're subscribed to this event
            else if (this.subscribedEvents.has(data.evt)) {
                this.emit('data', data);
            }
        }
    }

    public async sendCommand(command: any, args?: any) {
        const payload = {
            op: 1,
            cmd: command,
            nonce: this.generateNonce(),
            ...(args && { args }),  // Simply check if args exists
        }

        try {
            this.sendFrame(payload);
            logger.log(payload)
            logger.log(`Sent ${command}`);
        } catch (error) {
            logger.error(`Failed to send ${command}:`, error);
        }
    }

    private handleError(data: any) {
        const errorMessage = data.data?.message || data.message || 'Unknown RPC error';
        this.emit('error', new Error(errorMessage));
    }

    private async subscribe() {
        // Now subscribe to events
        await Promise.all([
            this.subscribeToEvent('NOTIFICATION_CREATE'),
            this.voice.voiceCallEventWorkflow(),
        ]);

        this.emit('subscribed');
    }

    public async subscribeToEvent(event: string, args?: any) {
        if (this.subscribedEvents.has(event)) return;

        const payload = {
            op: 1,
            cmd: 'SUBSCRIBE',
            evt: event,
            ...(args && { args }),  // Simply check if args exists
            nonce: this.generateNonce(),
            client_id: this.CLIENT_ID
        };

        try {
            this.sendFrame(payload);
            logger.log(payload)
            this.subscribedEvents.add(event);
            logger.log(`Subscribed to ${event}`);
        } catch (error) {
            logger.error(`Failed to subscribe to ${event}:`, error);
        }
    }

    public async unsubscribeFromEvent(event: string, args?: any) {
        if (!this.subscribedEvents.has(event)) return;

        const payload = {
            op: 1,
            cmd: 'UNSUBSCRIBE',
            ...(args && { args }),  // Simply check if args exists
            evt: event,
            nonce: this.generateNonce(),
            client_id: this.CLIENT_ID
        };

        try {
            this.sendFrame(payload);
            this.subscribedEvents.delete(event);
            logger.log(`Unsubscribed from ${event}`);
        } catch (error) {
            logger.error(`Failed to unsubscribe from ${event}:`, error);
        }
    }

    public async selectTextChannel(channel_id: string){ 
        const payload = {
            op: 1,
            cmd: 'SELECT_TEXT_CHANNEL',
            args: {
                channel_id: channel_id,
                timeout: 4000,
            },
            nonce: this.generateNonce(),
            client_id: this.CLIENT_ID
        };

        try {
            this.sendFrame(payload);
        } catch (error) {
            logger.error(`Failed to send SELECT_TEXT_CHANNEL:`, error);
        }
    }

    async disconnect() {
        if (this.socket) {
            // Remove all listeners to prevent memory leaks
            this.socket.removeAllListeners();

            // End the socket connection gracefully
            this.socket.end();

            // Destroy the socket
            this.socket.destroy();

            // Clear the socket reference
            this.socket = null;
        }

        // Remove all EventEmitter listeners
        this.removeAllListeners();
    }
}

class VoiceManager {
    private rpc: DiscordRPC;
    private channel_id: string = '';

    constructor(rpc: DiscordRPC) {
        this.rpc = rpc;
    }

    public async voiceCallEventWorkflow() {
        this.rpc.on('data', (data: VoiceChannelSelectType) => {
            if (data.evt === 'VOICE_CHANNEL_SELECT') {
                if (data.data.channel_id == null) {
                    logger.log('leaving call')
                    this.unsubscribeFromVoiceEvents(this.channel_id)
                } else {
                    logger.log(`joined ${data.data.channel_id}`)
                    this.channel_id = data.data.channel_id
                    this.subscribeToVoiceEvents(this.channel_id)
                    this.rpc.sendCommand('GET_VOICE_SETTINGS')
                }
            }
        })
        this.rpc.subscribeToEvent('VOICE_CHANNEL_SELECT');
    }

    private async subscribeToVoiceEvents(channel_id: string, guild_id?: string) {

        const args = {
            channel_id: channel_id,
        }

        await Promise.all([
            // These are events to see if a user is muted or such
            this.rpc.subscribeToEvent('VOICE_STATE_UPDATE', args),
            this.rpc.subscribeToEvent('VOICE_STATE_CREATE', args),
            this.rpc.subscribeToEvent('VOICE_STATE_DELETE', args),

            // If user is speaking
            this.rpc.subscribeToEvent('SPEAKING_START', args),
            this.rpc.subscribeToEvent('SPEAKING_STOP', args),

            // Current user voice state
            this.rpc.subscribeToEvent('VOICE_SETTINGS_UPDATE')
        ]);
    }

    private async unsubscribeFromVoiceEvents(channel_id: string) {

        const args = {
            channel_id: channel_id,
        }

        await Promise.all([
            this.rpc.unsubscribeFromEvent('VOICE_STATE_UPDATE', args),
            this.rpc.unsubscribeFromEvent('VOICE_STATE_CREATE', args),
            this.rpc.unsubscribeFromEvent('VOICE_STATE_DELETE', args),

            this.rpc.unsubscribeFromEvent('SPEAKING_START', args),
            this.rpc.unsubscribeFromEvent('SPEAKING_STOP', args),

            this.rpc.unsubscribeFromEvent('VOICE_SETTINGS_UPDATE'),
        ]);
    }

    public async mute() {
        const args = {
            mute: true
        }
        this.rpc.sendCommand('SET_VOICE_SETTINGS', args)
    }

    public async unmute() {
        const args = {
            mute: false
        }
        this.rpc.sendCommand('SET_VOICE_SETTINGS', args)
    }

    public async deafen() {
        const args = {
            deaf: true
        }
        this.rpc.sendCommand('SET_VOICE_SETTINGS', args)
    }

    public async undeafen() {
        const args = {
            deaf: false
        }
        this.rpc.sendCommand('SET_VOICE_SETTINGS', args)
    }

    public async leaveCall() {
        const args = {
            channel_id: null
        }
        this.rpc.sendCommand('SELECT_VOICE_CHANNEL', args)
    }

    public async joinCall(channel_id: string) {
        const args = {
            channel_id: channel_id,
            force: true
        }
        this.rpc.sendCommand('SELECT_VOICE_CHANNEL', args)
    }

    public async getVoiceSettings() {
        this.rpc.sendCommand('GET_VOICE_SETTINGS')
    }

    public async getVoiceChannel() {
        this.rpc.sendCommand('GET_SELECTED_VOICE_CHANNEL')
    }
}


// Usage

export default DiscordRPC;