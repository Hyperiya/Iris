import spotifyService from "../spotifyServices/SpotifyService.ts";
import DiscordRPC from "../discordServices/discordRPC.ts";



export class CommandProcessor {
    private commands = new Map<string, () => Promise<void>>();

    constructor(private discordRPC: DiscordRPC | null) {
        this.registerCommands();
    }

    private async registerCommands() {
        /*
         * Discord Commands
         */
        this.registerMultiple(["leave call", "hang up", "disconnect"], async () => this.discordRPC?.voice.leaveCall());
        this.registerMultiple(["deafen"], async () => this.discordRPC?.voice.deafen());
        this.registerMultiple(["undeafen"], async () => this.discordRPC?.voice.undeafen());
        this.registerMultiple(["mute"], async () => this.discordRPC?.voice.mute());
        this.registerMultiple(["unmute"], async () => this.discordRPC?.voice.unmute());

        this.registerMultiple(["play music", "play", "resume"], () => spotifyService?.resumePlayback());
        this.registerMultiple(["pause music", "pause", "stop"], () => spotifyService?.pausePlayback());
        this.registerMultiple(["next song", "next track", "next"], () => spotifyService?.playNextSong());
        this.registerMultiple(["previous song", "last song", "prevous song", "previous track", "previous"], () => spotifyService?.playPreviousSong());

    }

    private registerMultiple(commands: string[], action: () => Promise<void>) {
        commands.forEach((cmd) => this.commands.set(cmd.toLowerCase(), action));
    }

    async processCommand(command: string) {
        const normalizedCommand = command.toLowerCase().trim();
        const commandFunction = this.commands.get(normalizedCommand);

        if (commandFunction) {
            await commandFunction();
        } else {
            console.log(`Unknown command: ${command}`);
        }
    }
}
