import spotifyService from "../spotifyServices/SpotifyService.ts";
import DiscordRPC from "../discordServices/discordRPC.ts";
import { match } from "assert";

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

        /*
         * Spotify Commands
         */
        this.registerMultiple([["mute", true]], async () => this.discordRPC?.voice.mute());
        this.registerMultiple([["unmute", true]], async () => this.discordRPC?.voice.unmute());

        this.registerMultiple([["play", true], ["resume", true], "continue"], async () =>
            spotifyService.resumePlayback()
        );

        this.registerMultiple(
            [
                ["pause", true],
                ["stop", true],
            ],
            async () => spotifyService.pausePlayback()
        );

        this.registerMultiple(["next song", "next", ["skip", true]], async () => spotifyService.playNextSong());
        this.registerMultiple(["previous song", "previous", ["back", true]], async () =>
            spotifyService.playPreviousSong()
        );
        this.registerMultiple(["shuffle", "mix"], async () => spotifyService.toggleShuffle());
        this.registerMultiple(["repeat", "repeat playlist", "repeat album"], async () =>
            spotifyService.setRepeatMode(1)
        );
        this.registerMultiple(["repeat song", "repeat track"], async () => spotifyService.setRepeatMode(2));
        this.registerMultiple([["stop repeating", true]], async () => spotifyService.setRepeatMode(0));

        // Variable commands
        this.registerMultiple(
            ["set volume", "volume", "set volume to"],
            async (value) => {
                if (value === "max" || value === "maximum") {
                    await spotifyService.setVolume(100);
                    return;
                }
                const vol = this.numberWordToInt(value || "");
                if (!isNaN(vol) && vol >= 0 && vol <= 100) {
                    await spotifyService.setVolume(vol);
                }
            },
            true // isVariable = true
        );
        this.registerMultiple(["increase volume", "volume up"], async () => spotifyService.increaseVolume());
        this.registerMultiple(["decrease volume", "volume down"], async () => spotifyService.decreaseVolume());
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
    private registerMultiple(
        commands: (string | [string, boolean])[],
        action: (value?: string) => Promise<void>,
        isVariable: boolean = false
    ) {
        commands.forEach((cmd) => {
            if (Array.isArray(cmd)) {
                const [phrase, isWordMatch] = cmd;
                const prefix = isVariable ? "var:" : isWordMatch ? "words:" : "";
                const key = `${prefix}${phrase.toLowerCase()}`;
                this.commands.set(key, action);
            } else {
                const prefix = isVariable ? "var:" : "";
                const key = `${prefix}${cmd.toLowerCase()}`;
                this.commands.set(key, action);
            }
        });
    }

    // Processes voice commands with fallback from exact to word matching
    async processCommand(command: string) {
        const normalizedCommand = command.toLowerCase().trim();

        // Check for variable commands first
        for (const [key, func] of this.commands.entries()) {
            if (key.startsWith("var:")) {
                const varCommand = key.replace("var:", "");
                if (normalizedCommand.startsWith(varCommand)) {
                    const value = normalizedCommand.replace(varCommand, "").trim();
                    if (value) {
                        await (func as (value: string) => Promise<void>)(value);
                        return;
                    }
                }
            }
        }

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

    private numberWordToInt(string) {
        const singleDigitWords = {
            zero: 0,
            one: 1,
            two: 2,
            three: 3,
            four: 4,
            five: 5,
            six: 6,
            seven: 7,
            eight: 8,
            nine: 9,
        };
        const tensWords = {
            ten: 10,
            twenty: 20,
            thirty: 30,
            forty: 40,
            fifty: 50,
            sixty: 60,
            seventy: 70,
            eighty: 80,
            ninety: 90,
        };
        const teenWords = {
            eleven: 11,
            twelve: 12,
            thirteen: 13,
            fourteen: 14,
            fifteen: 15,
            sixteen: 16,
            seventeen: 17,
            eighteen: 18,
            nineteen: 19,
        };

        const value = string.split(" ");
        logger.log(value);

        let result: number = 0;
        for (const word of value) {
            logger.log(word);
            if (word in singleDigitWords) {
                result += singleDigitWords[word as keyof typeof singleDigitWords];
            }
            if (word in tensWords) {
                result += tensWords[word as keyof typeof tensWords];
            }
            if (word in teenWords) {
                result += teenWords[word as keyof typeof teenWords];
            }
            logger.log(result);
        }
        return result;
    }
}
