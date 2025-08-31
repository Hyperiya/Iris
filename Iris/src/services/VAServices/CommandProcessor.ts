import spotifyService from "../spotifyServices/SpotifyService.ts";
import DiscordRPC from "../discordServices/discordRPC.ts";
import { clients } from "../../ipc/handlers/spotify.ts";

export class CommandProcessor {
    private commands = new Map<string, () => Promise<void>>(); // Maps command strings to action functions

    constructor(private discordRPC: DiscordRPC | null) {
        this.registerCommands();
    }

    private async registerCommands() {
        /*
         * Discord Commands
         */
        this.registerMultiple(["leave call", "hang up", "disconnect"], async () => this.discordRPC?.voice.leaveCall());

        // Deafen/undeafen have many aliases due to Vosk speech recognition errors
        this.registerMultiple(["deafen", "stephen", "duffin", "devon", "death and", "and", "death in"], async () =>
            this.discordRPC?.voice.deafen()
        );

        this.registerMultiple(["undeafen", "under often", "under and", "under fun", "under under oven"], async () =>
            this.discordRPC?.voice.undeafen()
        );
        this.registerMultiple([["mute", true]], async () => this.discordRPC?.voice.mute());
        this.registerMultiple([["unmute", true]], async () => this.discordRPC?.voice.unmute());

        this.registerMultiple([["play", true], ["resume", true], "continue"], async () =>
            this.sendSpotifyCommand("play")
        );

        this.registerMultiple(
            [
                ["pause", true],
                ["stop", true],
            ],
            async () => this.sendSpotifyCommand("pause")
        );

        /*
        SpotifyService was made when I just started this project.
        As such, I was completely idiotic and made it so that main hosts the websocket, -
        and renderer and Spotify connect to it. I've now programmed SpotifyService so far that this can't be undone -
        without rewriting a lot of code. So, I'm just going to send commands directly to the clients connected to the main process.
        (2025-08-30 20:29:53) 
        */
        this.registerMultiple(["next song", "next", ["skip", true]], async () => this.sendSpotifyCommand("next"));
        this.registerMultiple(["previous song", "previous", ["back", true]], async () =>
            this.sendSpotifyCommand("prev")
        );
        this.registerMultiple(["shuffle", "mix"], async () => this.sendSpotifyCommand("shuffle"));
        this.registerMultiple(["repeat", "repeat playlist", "repeat album"], async () =>
            this.sendSpotifyCommand("setRepeat", 1)
        );
        this.registerMultiple(["repeat song", "repeat track"], async () => this.sendSpotifyCommand("setRepeat", 2));
        this.registerMultiple(["stop repeating"], async () => this.sendSpotifyCommand("setRepeat", 0));
    }

    /**
     * Register multiple voice commands that trigger the same action
     *
     * @param commands Array of command triggers:
     *   - string: Exact match only ("play" matches only "play")
     *   - [string, true]: Word match ("play music" matches "please play some music")
     * @param action Function to execute when command is triggered
     *
     * @example
     * Exact matches only
     * this.registerMultiple(["play", "resume"], () => this.sendSpotifyCommand('play'));
     *
     *
     * Mix exact and word matches
     * this.registerMultiple([
     *   "play",              // Exact: only "play"
     *   "resume",            // Exact: only "resume"
     *   ["play music", true] // Word: "play music", "please play some music", etc.
     * ], () => this.sendSpotifyCommand('play'));
     */
    private registerMultiple(commands: (string | [string, boolean])[], action: () => Promise<void>) {
        commands.forEach((cmd) => {
            if (Array.isArray(cmd)) {
                const [phrase, isWordMatch] = cmd;
                const key = isWordMatch ? `words:${phrase.toLowerCase()}` : phrase.toLowerCase();
                this.commands.set(key, action);
            } else {
                this.commands.set(cmd.toLowerCase(), action);
            }
        });
    }

    // Sends commands directly to connected Spicetify clients via WebSocket
    private sendSpotifyCommand(action: string, value?: number | string) {
        const message = JSON.stringify({ type: "playback", action: action, ...(value !== undefined && { value }) });
        clients.forEach((client) => {
            if (client.readyState === 1) {
                // WebSocket.OPEN
                client.send(message);
            }
        });
    }

    // Processes voice commands with fallback from exact to word matching
    async processCommand(command: string) {
        const normalizedCommand = command.toLowerCase().trim();

        // First check for exact matches
        let commandFunction = this.commands.get(normalizedCommand);

        // If no exact match, check for word matches
        if (!commandFunction) {
            const commandWords = normalizedCommand.split(" ");

            for (const [key, func] of this.commands.entries()) {
                if (key.startsWith("words:")) {
                    const searchPhrase = key.replace("words:", "");
                    const searchWords = searchPhrase.split(" ");

                    // Word matching: all search words must be present in any order
                    const allWordsPresent = searchWords.every((word) => commandWords.includes(word));

                    if (allWordsPresent) {
                        commandFunction = func;
                        break;
                    }
                }
            }
        }

        if (commandFunction) {
            await commandFunction();
        } else {
            console.log(`Unknown command: ${command}`);
        }
    }
}
