import EventEmitter from 'events';
import net from 'net';


class MusicRPC extends EventEmitter {
    private socket: net.Socket | null = null;
    private buffer: Buffer = Buffer.alloc(0);
    private readonly CLIENT_ID: string;
    private connected: boolean = false;

    constructor(CLIENT_ID: string) {
        super();
        this.CLIENT_ID = CLIENT_ID;
    }

    

    public connect() {
        if (this.connected) return true;

        this.socket = new net.Socket();
        const path = process.platform === 'win32'
            ? '\\\\.\\pipe\\discord-ipc-0'
            : '/tmp/discord-ipc-0';

        this.socket.connect(path);
        this.socket.on('connect', () => {
            this.connected = true;
            this.sendHandshake();
        });
        this.socket.on('data', (data) => this.handleData(data));
    }

    private sendHandshake() {
        this.sendFrame({ v: 1, client_id: this.CLIENT_ID, op: 0 });
    }

    private sendFrame(message: any) {
        const data = JSON.stringify(message);
        const header = Buffer.alloc(8);
        header.writeUInt32LE(message.op, 0);
        header.writeUInt32LE(data.length, 4);
        this.socket?.write(Buffer.concat([header, Buffer.from(data)]));
    }

    private handleData(chunk: Buffer) {
        this.buffer = Buffer.concat([this.buffer, chunk]);
        console.log('Received data:', this.buffer.toString());
        // Handle incoming data (simplified)
    }

    // In musicRPC.ts
    public setActivity(activity: {
        type?: number;
        status_display_type?: number;
        details?: string;
        state?: string;
        timestamps?: { start?: number; end?: number };
        assets?: { large_image?: string; large_text?: string; small_image?: string; small_text?: string };
        buttons?: Array<{ label: string; url: string }>;
    }) {

        if (!this.connected) {
            return;
        }


        this.sendFrame({
            op: 1,
            cmd: 'SET_ACTIVITY',
            args: { pid: process.pid, activity },
            nonce: Date.now().toString()
        });
    };


    public async disconnect() {
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.end();
            this.socket.destroy();
            this.socket = null;
        }
        this.connected = false;
    }
}

export default MusicRPC;
