// Settings.tsx
import { ArrowForwardIosRounded } from "@mui/icons-material";
import React, { useEffect, useState, useRef } from "react";
import { LICENSE_TEXT } from "../../assets/license/license.ts";
import "./styles/Settings.scss";
import { logger } from "../utils/logger.ts";

import Iris from "../../assets/icons/IrisWideTransparent.png";

export interface EnabledModules {
    spotify: boolean;
    discord: boolean;
    hoyolab: boolean;
}

export const DEFAULT_MODULES: EnabledModules = {
    spotify: true,
    discord: true,
    hoyolab: true,
};

interface SettingsProps {
    isSettings: boolean;
    setIsSettings: (value: boolean) => void;
}

const Settings: React.FC<SettingsProps> = ({
    isSettings,
    setIsSettings: setIsSettings,
}) => {
    const [navigationPath, setNavigationPath] = useState<string[]>([
        "Settings",
    ]);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    const generalOptions = [
        "Spotify Settings",
        "Hoyolab Settings",
        "Discord Settings",
        "Modules",
        "Voice Assistant Settings (BETA)",
    ];

    // Basic menu select
    const handleMenuSelect = (menu: string) => {
        window.electron.log(`Menu selected: ${menu}`);
        // Build the full path based on current navigation
        let newPath: string[];

        // If we're in the main menu (Settings)
        if (navigationPath.length === 1) {
            newPath = ["Settings", menu];
        }
        // If we're in a submenu (e.g., General)
        else if (navigationPath.length === 2) {
            // Keep the current path and add the new menu
            newPath = [...navigationPath, menu];
        }
        // If we're already in a sub-submenu, replace the last item
        else {
            newPath = [...navigationPath.slice(0, -1), menu];
        }

        setNavigationPath(newPath);
        setActiveMenu(menu);
    };

    // Navigation Handlers
    const handleNavigationClick = (index: number) => {
        // If clicking on 'Settings', reset to main menu
        if (index === 0) {
            setActiveMenu(null);
            setNavigationPath(["Settings"]);
            window.electron.log(`Navigation path: ${navigationPath}`);
        }
        // If clicking on a submenu, truncate the path up to that point
        else if (index < navigationPath.length) {
            const newPath = navigationPath.slice(0, index + 1);
            setActiveMenu(navigationPath[index]);
            setNavigationPath(newPath);
            window.electron.log(`Navigation path: ${newPath}`);
        }
    };

    useEffect(() => {
      
        
      
    }, [])
    

    return (
        <div
            className={`settings ${isSettings ? "show" : ""}`}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="settings-container">
                {/* Navigation header */}
                <div className="navigation-header">
                    {navigationPath.map((item, index) => (
                        <React.Fragment key={index}>
                            {index > 0 && (
                                <ArrowForwardIosRounded className="nav-arrow" />
                            )}
                            <span
                                className={`nav-item ${
                                    index === navigationPath.length - 1
                                        ? "active"
                                        : ""
                                }`}
                                onClick={() => handleNavigationClick(index)}
                                role="button"
                                tabIndex={0}
                            >
                                {item}
                            </span>
                        </React.Fragment>
                    ))}
                </div>

                {/* Main menu */}
                {navigationPath.length === 1 && (
                    <div className="main-buttons">
                        <button
                            className="settings-button"
                            onClick={() => handleMenuSelect("General")}
                        >
                            General
                        </button>
                        <button
                            className="settings-button"
                            onClick={() => handleMenuSelect("About")}
                        >
                            About
                        </button>
                    </div>
                )}

                {/* Sub menus */}
                {activeMenu === "General" && (
                    <div className="options-list">
                        {generalOptions.map((option, index) => (
                            <button
                                key={index}
                                className="settings-button"
                                onClick={() => handleMenuSelect(option)}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                )}

                {activeMenu === "Voice Assistant Settings (BETA)" && <IrisVA />}

                {/* About Menu */}
                {activeMenu === "About" && (
                    <About handleMenuSelect={handleMenuSelect} />
                )}

                {activeMenu === "License" && <License />}

                {/* Spotify Settings section */}
                {activeMenu === "Spotify Settings" && <Spotify />}

                {/* Hoyoverse Settings section */}
                {activeMenu === "Hoyolab Settings" && <Hoyo />}

                {/* Discord Settings section */}
                {activeMenu === "Discord Settings" && <Discord />}

                {activeMenu === "Modules" && (
                    <Modules
                        isSettings={isSettings}
                        setIsSettings={setIsSettings}
                    />
                )}
            </div>
        </div>
    );
};

export default Settings;

function Snapshot({}) {}

interface AboutProps {
    handleMenuSelect: (menu: string) => void;
}

function About({ handleMenuSelect }: AboutProps) {
    return (
        <div className="about-content">
            <div className="basic-details">
                <img
                    src={Iris}
                    alt="Iris"
                    className="iris-image"
                    draggable="true"
                ></img>
                <div className="name-text">
                    <span id="title">Iris </span>
                    <span id="name"> By Hyperiya</span>
                </div>
            </div>
            <p className="iris-text">
                Iris is a project created by Hyperiya (That's me!). <br />
                It is a project that aims to provide a user-friendly interface
                for the Spotify, Discord, and Hoyolab APIs. <br /> <br />
                Iris © 2025 is licensed under CC BY-NC-SA 4.0 (Creative Commons
                Attribution-NonCommercial-ShareAlike 4.0 International License).{" "}
                <br />
            </p>
            <button
                className="settings-button"
                onClick={() => handleMenuSelect("License")}
            >
                License
            </button>
        </div>
    );
}

function License() {
    return (
        <div className="about-content">
            <pre className="license-text">{LICENSE_TEXT}</pre>
        </div>
    );
}

interface SpotifyProps {}

function Spotify({}: SpotifyProps) {
    const [installStatus, setInstallStatus] = useState<string>("");
    const [isInstalling, setIsInstalling] = useState(false);

    const handleInstallExtension = async () => {
        try {
            setIsInstalling(true);
            const result = await window.spotify.spicetify.installExtension();
            setInstallStatus(result.message);
        } catch (error) {
            setInstallStatus(`Installation failed: ${error.message}`);
        } finally {
            setIsInstalling(false);
        }
    };
    return (
        <div className="settings-section">
            <h3>Spicetify Extension</h3>
            <button className="install-button" onClick={handleInstallExtension}>
                Install Spicetify Extension
            </button>
            {installStatus && (
                <div
                    className={`install-status ${
                        installStatus.includes("failed") ? "error" : "success"
                    }`}
                >
                    {installStatus}
                </div>
            )}
            {isInstalling && (
                <div className="install-status installing">Installing...</div>
            )}

            <hr />

            <h3>Preferred Language (Song Translation)</h3>
            <select
                className="base-input"
                style={{
                    cursor: "pointer",
                    backgroundColor: "#2a2a2a",
                    borderColor: "#3a3a3a",
                }}
                onChange={(e) =>
                    window.settings.set(
                        "music.preferredLanguage",
                        e.target.value.split("-") // Split 'en-us' into ['en', 'us']
                    )
                }
            >
                <option value="en-us">English</option>
                <option value="es-es">Spanish</option>
                <option value="fr-fr">French</option>
                <option value="de-de">German</option>
                <option value="ja-jp">Japanese</option>
                <option value="ko-kr">Korean</option>
                <option value="zh-cn">Chinese</option>
            </select>
        </div>
    );
}

interface HoyoProps {}

function Hoyo({}: HoyoProps) {
    const [loginStatus, setLoginStatus] = useState<string>();
    const [loggingIn, setLoggingIn] = useState<boolean>(false);
    const [username, setUsername] = useState<string>("");
    const [password, setPassword] = useState<string>("");

    const handleCredentialsHoyo = async () => {
        let result;

        window.settings.set("hoyolab.username", username);
        window.settings.set("hoyolab.password", password);

        if (!username || !password) {
            throw new Error("Username or password not found in storage");
        }

        try {
            setLoginStatus("Logging in...");
            setLoggingIn(true);
            result = await window.hoyoAPI.login(username, password);
            if (!result) {
                setLoginStatus("Login failed!");
                setLoggingIn(false);
                return;
            } else {
                setLoggingIn(false);
                console.log("Login successful:", result);
                setLoginStatus("Login Succeeded!");
            }

            const cookieString = [
                `cookie_token_v2=${result.cookies.cookie_token_v2}`,
                `account_mid_v2=${result.cookies.account_mid_v2}`,
                `account_id_v2=${result.cookies.account_id_v2}`,
                `ltoken_v2=${result.cookies.ltoken_v2}`,
                `ltmid_v2=${result.cookies.ltmid_v2}`,
                `ltuid_v2=${result.cookies.ltuid_v2}`,
            ].join("; ");

            window.hoyoAPI.initialize(cookieString, result.uid);
        } catch (error) {
            console.error("Error during login:", error);
            throw error;
        }
    };

    return (
        <div className="credentials flex-center flex-column full-width">
            <input
                type="text"
                placeholder="Hoyolab Username/Email"
                className="base-input"
                style={{ width: "90%" }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
            />
            <input
                type="password"
                placeholder="Hoyolab Password"
                className="base-input"
                style={{ width: "90%" }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <div className="save-input flex-center">
                <button
                    className="base-button"
                    style={{
                        padding: "8px 16px",
                        minWidth: "60px",
                        height: "40px",
                    }}
                    onClick={handleCredentialsHoyo}
                >
                    Save
                </button>
            </div>
            {loginStatus && !loggingIn && (
                <div
                    className={`install-status ${
                        loginStatus.toLowerCase().includes("failed")
                            ? "error"
                            : "success"
                    }`}
                >
                    {loginStatus}
                </div>
            )}

            {loggingIn && (
                <div className="install-status installing">Logging in...</div>
            )}
        </div>
    );
}

interface DiscordProps {}

function Discord({}: DiscordProps) {
    const [clientId, setClientId] = useState<string>("");
    const [clientSecret, setClientSecret] = useState<string>("");

    const handleCredentialsDiscord = () => {
        window.settings.set("discord.clientId", clientId);
        window.settings.set("discord.clientSecret", clientSecret);

        // Refreshing discord connection with the new credentials
        window.discord.disconnect();
        window.discord.connect(clientId, clientSecret);
    };

    const handleDiscordReset = async () => {
        try {
            await window.discord.revokeAllTokens();
            window.discord.disconnect();
            await window.electron.restart();
        } catch (error) {
            console.error("Error in the middle of discord reset:", error);
        }
    };

    return (
        <div className="credentials flex-center flex-column full-width">
            <input
                type="text"
                placeholder="Discord Client ID"
                className="base-input"
                style={{ width: "90%" }}
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
            />
            <input
                type="text"
                placeholder="Discord Client Secret"
                className="base-input"
                style={{ width: "90%" }}
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
            />

            <div className="save-input flex-center">
                <button
                    className="base-button"
                    style={{
                        padding: "8px 16px",
                        minWidth: "60px",
                        height: "40px",
                    }}
                    onClick={handleCredentialsDiscord}
                >
                    Save
                </button>
                <button
                    className="base-button"
                    style={{
                        padding: "8px 16px",
                        minWidth: "60px",
                        height: "40px",
                    }}
                    onClick={handleDiscordReset}
                >
                    Reset
                </button>
            </div>
        </div>
    );
}

interface ModulesProps {
    isSettings: boolean;
    setIsSettings: (value: boolean) => void;
}

function Modules({ isSettings, setIsSettings }: ModulesProps) {
    const modules: Array<keyof EnabledModules> = [
        "spotify",
        "discord",
        "hoyolab",
    ];
    const [enabledModules, setEnabledModules] =
        useState<EnabledModules>(DEFAULT_MODULES);
    const [tempModules, setTempModules] =
        useState<EnabledModules>(DEFAULT_MODULES);

    // Load settings on component mount
    useEffect(() => {
        const loadSettings = async () => {
            const savedModules = await window.settings.get("ui.modules");
            setEnabledModules(savedModules);
            setTempModules(savedModules);
        };
        loadSettings();
    }, []);

    useEffect(() => {
        if (isSettings) {
            setTempModules(enabledModules);
        }
    }, [isSettings, enabledModules]);

    const handleModuleToggle = (moduleName: keyof EnabledModules) => {
        setTempModules((prev) => ({
            ...prev,
            [moduleName]: !prev[moduleName],
        }));
    };

    const handleModuleSave = async () => {
        try {
            // Save to new settings service
            await window.settings.set("ui.modules", tempModules);
            setEnabledModules(tempModules);
            window.electron.log("Module settings saved");
            location.reload();
        } catch (error) {
            console.error("Failed to save module settings:", error);
        }
    };

    return (
        <div className="settings-section">
            <div className="module-toggles">
                {modules.map((module) => (
                    <div key={module} className="module-toggle">
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={tempModules[module]}
                                onChange={() => handleModuleToggle(module)}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                        <span className="module-name">
                            {module.charAt(0).toUpperCase() + module.slice(1)}
                        </span>
                    </div>
                ))}
            </div>

            <div className="save-input flex-center">
                <button
                    className="base-button"
                    style={{
                        padding: "8px 16px",
                        minWidth: "60px",
                        height: "40px",
                    }}
                    onClick={handleModuleSave}
                >
                    Save
                </button>
            </div>
        </div>
    );
}

function IrisVA({}) {
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDevice, setSelectedDevice] = useState<string>("");
    const [irisEnabled, setIrisEnabled] = useState<boolean>(false);
    const [irisInstalled, setIrisInstalled] = useState<boolean>(false);
    const [installStatus, setInstallStatus] = useState<string>("");
    // Audio Handlers

    const handleMicSelect = (deviceId: string) => {
        setSelectedDevice(deviceId);
        window.settings.set("voiceAssistant.device", deviceId);
        window.irisVA.stop();
        window.irisVA.start();
    };

    const getAudioDevices = async () => {
        try {
            // Request initial permission to access media devices
            await navigator.mediaDevices.getUserMedia({ audio: true });

            // Get all media devices
            const devices = await navigator.mediaDevices.enumerateDevices();

            // Filter for only audio input devices (microphones)
            const audioInputDevices = devices.filter(
                (device) => device.kind === "audioinput"
            );

            setAudioDevices(audioInputDevices);

            // Set default device if none selected
            if (!selectedDevice && audioInputDevices.length > 0) {
                setSelectedDevice(audioInputDevices[0].deviceId);
            }

            console.log("Available audio devices:", audioInputDevices);
        } catch (error) {
            console.error("Error getting audio devices:", error);
        }
    };

    useEffect(() => {
        const loadSettings = async () => {
            const selectedDeviceId =
                (await window.settings.get("voiceAssistant.device")) || "";
            const irisEnabledSetting =
                (await window.settings.get("voiceAssistant.enabled")) || false;

            setSelectedDevice(selectedDeviceId);
            setIrisEnabled(irisEnabledSetting);
        };
        loadSettings();
    }, []);

    useEffect(() => {
        if (!irisEnabled) return;
        getAudioDevices();

        // Listen for device changes (e.g., plugging in/removing a mic)
        navigator.mediaDevices.addEventListener(
            "devicechange",
            getAudioDevices
        );

        return () => {
            navigator.mediaDevices.removeEventListener(
                "devicechange",
                getAudioDevices
            );
        };
    }, [irisEnabled]);

    useEffect(() => {
        const checkModel = async () => {
            const isInstalled = await window.irisVA.checkForModel();
            setIrisInstalled(isInstalled);
        };
        checkModel();
    }, []);

    const handleIrisToggle = () => {
        setIrisEnabled((prevState) => {
            const newState = !prevState;

            window.settings.set("voiceAssistant.enabled", newState);
            if (newState === true && irisInstalled === true) {
                window.irisVA.start();
            } else if (newState === false) {
                window.irisVA.stop();
            }

            return newState;
        });
    };

    const handleModelInstall = async () => {
        setInstallStatus("Installing model...");
        setInstallStatus(await window.irisVA.downloadModel());
        setIrisEnabled(await window.irisVA.checkForModel());
    };

    const cleanMicrophoneName = (name: string) => {
        const suffixesToRemove = [
            "analog stereo",
            "mono",
            "stereo",
            "digital stereo",
            "analog",
            "digital",
        ];

        const lowerName = name.toLowerCase();

        for (const suffix of suffixesToRemove) {
            if (lowerName.endsWith(suffix)) {
                return name.slice(0, -suffix.length).trim();
            }
        }

        return name;
    };

    return (
        <div className="settings-section">
            <div className="audio-settings">
                {irisInstalled ? (
                    <>
                        <span>
                            <h3>
                                Voice Control Toggle (Unstable, high resource
                                intensity!)
                            </h3>
                        </span>
                        <div className="vc-toggle">
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={irisEnabled}
                                    onChange={handleIrisToggle}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                            <span className="module-name">
                                Toggle "Hey Iris!"
                            </span>
                        </div>
                        {irisEnabled && (
                            <>
                                <span>
                                    <h3>Input Device</h3>
                                </span>
                                <select
                                    className="base-input"
                                    style={{
                                        cursor: "pointer",
                                        backgroundColor: "#2a2a2a",
                                        borderColor: "#3a3a3a",
                                    }}
                                    value={selectedDevice}
                                    onChange={(e) =>
                                        handleMicSelect(e.target.value)
                                    }
                                >
                                    {audioDevices.map((device) => (
                                        <option
                                            key={device.deviceId}
                                            value={device.deviceId}
                                        >
                                            {cleanMicrophoneName(
                                                device.label
                                            ) ||
                                                `Microphone ${device.deviceId.slice(0, 5)}...`}
                                        </option>
                                    ))}
                                </select>
                            </>
                        )}
                    </>
                ) : (
                    <div>
                        <button
                            className="install-button"
                            onClick={handleModelInstall}
                        >
                            Install Vosk Model
                        </button>
                        {installStatus && (
                            <div
                                className={`install-status ${
                                    installStatus
                                        .toLowerCase()
                                        .includes("error")
                                        ? "error"
                                        : "success"
                                }`}
                            >
                                {installStatus}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
