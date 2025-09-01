import settingsUtil from "../../utils/settingsUtil.ts";
import type { AppSettings } from "../../utils/settingsUtil.ts";

import { CommandProcessor } from "./CommandProcessor.ts";

import { app, BrowserWindow } from "electron";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import path from "path";
import fs from "fs";

import https from "https";

import yauzl from "yauzl";

type VoiceAssistantSettings = AppSettings["voiceAssistant"];

enum executables {
    windows = "IrisVA.exe",
    linux_x86 = "IrisVAx86",
    linux_x86_64 = "IrisVAx86_64",
}

export class IrisVA {
    private settings: VoiceAssistantSettings;
    private binaryPath: string;
    private globalDisable: boolean = false; // Disables VA if platform/arch unsupported
    private irisVA: ChildProcessWithoutNullStreams | undefined | null;

    constructor(
        private commandProcessor: CommandProcessor | null,
        private mainWindow: BrowserWindow
    ) {
        this.settings = settingsUtil.get("voiceAssistant");
        this.binaryPath = this.getBinaryPath();
    }

    private getModelPath(): string {
        const userDataPath = app.getPath("userData");
        const modelPath = path.join(userDataPath, "voskModel");
        return modelPath;
    }

    private getBinaryPath(): string {
        let folderName: string;
        let executableName: string;

        // Get platform/arch at runtime to avoid undefined values
        const platform = process.platform;
        const arch = process.arch;

        logger.log("Platform:", platform, "Arch:", arch); // Add this debug

        if (platform === "win32") {
            folderName = "windows";
            executableName = executables.windows;
        } else if (platform === "linux") {
            if (arch === "x64") {
                folderName = "linux_x86_64";
                executableName = executables.linux_x86_64;
            } else if (arch === "ia32") {
                folderName = "linux_x86";
                executableName = executables.linux_x86;
            } else {
                this.globalDisable = true;
                return "";
            }
        } else {
            this.globalDisable = true;
            return "";
        }

        const basePath = app.isPackaged ? process.resourcesPath : app.getAppPath();

        logger.log("binary path:", path.join(basePath, "binaries", folderName, executableName));
        return path.join(basePath, "binaries", folderName, executableName);
    }

    private getVoskApiUrl(): string {
        const platform = process.platform;
        const arch = process.arch;
        logger.log(platform, arch);
        if (platform === "win32") {
            return "https://github.com/alphacep/vosk-api/releases/download/v0.3.45/vosk-win64-0.3.45.zip";
        } else if (platform === "linux") {
            if (arch === "x64") {
                return "https://github.com/alphacep/vosk-api/releases/download/v0.3.45/vosk-linux-x86_64-0.3.45.zip";
            } else if (arch === "ia32") {
                return "https://github.com/alphacep/vosk-api/releases/download/v0.3.45/vosk-linux-x86-0.3.45.zip";
            }
        }
        this.globalDisable = true;
        return "";
    }

    private async extractZip(zipPath: string, extractDir: string): Promise<void> {
        return new Promise((resolve, reject) => {
            yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
                if (err) return reject(err);

                zipfile.readEntry();

                zipfile.on("entry", (entry) => {
                    if (/\/$/.test(entry.fileName)) {
                        // Directory entry
                        const dirPath = path.join(extractDir, entry.fileName);
                        fs.mkdirSync(dirPath, { recursive: true });
                        zipfile.readEntry();
                    } else {
                        // File entry
                        zipfile.openReadStream(entry, (err, readStream) => {
                            if (err) return reject(err);

                            const filePath = path.join(extractDir, entry.fileName);
                            fs.mkdirSync(path.dirname(filePath), {
                                recursive: true,
                            });

                            const writeStream = fs.createWriteStream(filePath);
                            readStream.pipe(writeStream);

                            writeStream.on("close", () => zipfile.readEntry());
                        });
                    }
                });

                zipfile.on("end", () => {
                    logger.log(`Extracted ${zipPath}`);
                    resolve();
                });
            });
        });
    }

    private async moveContentsToRoot(sourceDir: string, targetDir: string): Promise<void> {
        const items = fs.readdirSync(sourceDir);

        for (const item of items) {
            const sourcePath = path.join(sourceDir, item);
            const targetPath = path.join(targetDir, item);

            if (fs.statSync(sourcePath).isDirectory()) {
                if (!fs.existsSync(targetPath)) {
                    fs.mkdirSync(targetPath, {
                        recursive: true,
                    });
                }
                await this.moveContentsToRoot(sourcePath, targetPath);
            } else {
                fs.copyFileSync(sourcePath, targetPath);
            }
        }
    }

    private async symlinkModelFiles(): Promise<void> {
        if (process.platform !== "win32") return;

        const modelDir = this.getModelPath();
        const executableDir = path.join(this.getBinaryPath(), '..');

        logger.log(`Attempting symlinks from ${modelDir} to ${executableDir}`);

        if (!fs.existsSync(modelDir)) return;

        const items = fs.readdirSync(modelDir).filter((item) => fs.statSync(path.join(modelDir, item)).isFile());

        for (const item of items) {
            const sourcePath = path.join(modelDir, item);
            const targetPath = path.join(executableDir, item);

            if (!fs.existsSync(targetPath)) {
                try {
                    fs.symlinkSync(sourcePath, targetPath, "file");
                    logger.log(`Symlinked ${item} successfully`);
                } catch (error) {
                    logger.log(`Symlink failed for ${item}:`, error);
                    fs.copyFileSync(sourcePath, targetPath);
                    logger.log(`Copied ${item} instead`);
                }
            }
        }
    }

    private async downloadFile(url: string, filePath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(filePath);

            const download = (downloadUrl: string) => {
                https
                    .get(downloadUrl, (response) => {
                        // Handle GitHub redirects for release downloads
                        if (response.statusCode === 302 || response.statusCode === 301) {
                            const redirectUrl = response.headers.location;
                            if (redirectUrl) {
                                logger.log(`Redirecting to: ${redirectUrl}`);
                                download(redirectUrl);
                                return;
                            }
                        }

                        if (response.statusCode !== 200) {
                            reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                            return;
                        }

                        const totalSize = parseInt(response.headers["content-length"] || "0");
                        let downloadedSize = 0;

                        response.pipe(file);

                        response.on("data", (chunk) => {
                            downloadedSize += chunk.length;
                            const progress = Math.round((downloadedSize / totalSize) * 100);
                            logger.log(`Download progress: ${progress}%`);
                        });

                        file.on("finish", () => {
                            file.close();
                            resolve();
                        });
                    })
                    .on("error", (err) => {
                        fs.unlink(filePath, () => {});
                        reject(err);
                    });
            };

            download(url);
        });
    }

    private async checkRequiredFiles(modelDir: string): Promise<boolean> {
        if (
            fs.existsSync(path.join(modelDir, "am")) &&
            fs.existsSync(path.join(modelDir, "conf")) &&
            fs.existsSync(path.join(modelDir, "ivector")) &&
            fs.existsSync(path.join(modelDir, "graph")) &&
            (fs.existsSync(path.join(modelDir, "libvosk.so")) || fs.existsSync(path.join(modelDir, "libvosk.dll")))
        ) {
            return true;
        }
        return false;
    }

    public async checkForModel(): Promise<boolean> {
        const modelDir = this.getModelPath();
        if ((await this.checkRequiredFiles(modelDir)) === true) {
            return true;
        }
        return false;
    }

    // Downloads and extracts Vosk speech recognition model and API
    public async downloadVoskModel(): Promise<string | void> {
        try {
            const modelDir = this.getModelPath();
            const modelUrl = "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip";
            const voskApiUrl = this.getVoskApiUrl();
            logger.log(`api url: ${voskApiUrl}`);

            const modelZipPath = path.join(modelDir, "model.zip");
            const apiZipPath = path.join(modelDir, "vosk-api.zip");
            const tempDir = path.join(modelDir, "temp");

            // Create directories
            if (!fs.existsSync(modelDir)) {
                fs.mkdirSync(modelDir, {
                    recursive: true,
                });
            }

            // Check if already downloaded
            if (
                fs.existsSync(path.join(modelDir, "am")) &&
                (fs.existsSync(path.join(modelDir, "libvosk.so")) || fs.existsSync(path.join(modelDir, "libvosk.dll")))
            ) {
                logger.log("Vosk model and API already exist");
                await this.symlinkModelFiles();
                return;
            }

            logger.log("Downloading Vosk model...");
            await this.downloadFile(modelUrl, modelZipPath);

            logger.log("Downloading Vosk API...");
            await this.downloadFile(voskApiUrl, apiZipPath);

            logger.log("Extracting model...");
            fs.mkdirSync(tempDir, { recursive: true });
            await this.extractZip(modelZipPath, tempDir);

            // Extract nested folder contents to model root directory
            const modelSubDir = fs.readdirSync(tempDir).find((dir) => dir.startsWith("vosk-"));
            if (modelSubDir) {
                await this.moveContentsToRoot(path.join(tempDir, modelSubDir), modelDir);
            }

            logger.log("Extracting API...");
            const apiTempDir = path.join(modelDir, "api-temp");
            fs.mkdirSync(apiTempDir, { recursive: true });
            await this.extractZip(apiZipPath, apiTempDir);

            // Move API contents to root
            const apiSubDir = fs.readdirSync(apiTempDir).find((dir) => dir.startsWith("vosk-"));
            if (apiSubDir) {
                await this.moveContentsToRoot(path.join(apiTempDir, apiSubDir), modelDir);
            }

            // Cleanup
            fs.rmSync(tempDir, {
                recursive: true,
                force: true,
            });
            fs.rmSync(apiTempDir, {
                recursive: true,
                force: true,
            });
            fs.unlinkSync(modelZipPath);
            fs.unlinkSync(apiZipPath);

            // Create symlinks to executable directory
            await this.symlinkModelFiles();

            return `Successfully installed Vosk model to ${modelDir}!`;
        } catch (error) {
            return `Error:, ${error}`;
        }
    }

    public async checkCompatibility(): Promise<boolean> {
        if (this.globalDisable) {
            return false;
        }

        return true;
    }

    // Spawns the Rust voice assistant binary and sets up event handlers
    public startVA() {
        try {
            const args = ["--device", this.settings.device || "default", "--model", this.getModelPath()];
            logger.log("Starting voice assistant with args:", args);
            this.irisVA = spawn(this.binaryPath, args);

            this.irisVA.stdout.on("data", (data) => {
                const output = data.toString(); // Convert Buffer to string
                logger.log(`data: ${data}`);
                this.handleVoiceAssistantData(output);
            });

            this.irisVA.stderr.on("data", (data) => {
                logger.log(`stderr: ${data}`);
            });

            this.irisVA.on("close", (code) => {
                logger.log(`child process exited with code ${code}`);
            });
        } catch (error) {
            logger.error("Failed to start voice assistant:", error);
        }
    }

    public stopVA() {
        if (this.irisVA) {
            this.irisVA.kill();
            this.irisVA = null;
        }
    }

    // Parses voice assistant output and triggers appropriate actions
    private async handleVoiceAssistantData(data: string) {
        const lines = data.split("\n");

        for (const line of lines) {
            const tag = line.match(/\[(\w+)\]/)?.[1];

            switch (tag) {
                case "DEVICE":
                    const device = line.match(/\[DEVICE\]\((.+?)\)/)?.[1];
                    logger.log("Using device:", device);
                    break;
                case "LISTENING":
                    logger.log("Voice assistant is listening...");
                    break;
                case "SWAP":
                    logger.log("Recognizer swapped");
                    break;
                case "WAITING":
                    logger.log("Waiting for command...");
                    this.mainWindow?.webContents.send("va:waiting");
                    break;
                case "COMMAND":
                    this.mainWindow?.webContents.send("va:command");
                    // Strip wake word and process the actual command
                    const command = line
                        .match(/\[COMMAND\]\((.+?)\)/)?.[1]
                        .replaceAll("hey iris", "")
                        .trim();
                    logger.log("Command detected:", command);
                    this.commandProcessor?.processCommand(command || "");
                    break;
                case "PROCESSED":
                    logger.log("Command processed");
                    break;
                case "RESETTING":
                    logger.log("Voice assistant resetting");
                    this.mainWindow?.webContents.send("va:resetting");
                    break;
                case "ERR":
                    logger.error("Voice assistant error:", line);
                    break;
            }
        }
    }
}
