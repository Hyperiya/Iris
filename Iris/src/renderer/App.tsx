/*
Hyperiya here-
I don't do comments for tsx/jsx.
Sorry, it's just a lot to do and I can't be bothered.
*/

import React, { useState, useEffect } from "react";
import { EnabledModules } from "../utils/settingsUtil.ts";
import { ViewState } from "../types/viewState.ts";

import { logger } from "./utils/logger.ts";

import Titlebar from "./components/Titlebar.tsx";
import Settings from "./components/Settings.tsx";
import SpotifyMain from "./components/spotify/SpotifyMain.tsx";
import HoyoMain from "./components/hoyo/HoyoMain.tsx";
import DiscordMain from "./components/discord/DiscordMain.tsx";
import AppSelector from "./components/AppSelector.tsx";
import LoadingScreen from "./components/LoadingScreen.tsx";
import { LoadingProvider, useLoading } from "./context/LoadingContext.tsx";
import WakeBorder from "./components/voice/WakeBorder.tsx";

import "../index.scss";
import "./App.scss";

interface AppProps {}

function AppContent() {
    const [showFullscreenTip, setShowFullscreenTip] = useState(false);

    const [showSettings, setShowSettings] = useState<boolean>(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [enabledModules, setEnabledModules] = useState<EnabledModules>(() => {
        const savedModules = window.settings.get("ui.modules");
        return savedModules;
    });

    const [viewState, setViewState] = useState<ViewState>(() => {
        if (!enabledModules.hoyolab) {
            return ViewState.SPOTIFY_FULL;
        } else if (!enabledModules.spotify) {
            return ViewState.RIGHT_FULL;
        }
        return ViewState.NEUTRAL;
    });

    const [hide, setHide] = useState<boolean>(() => {
        if (!enabledModules.hoyolab || !enabledModules.spotify) {
            return true;
        }
        return false;
    });

    const [isIrisEnabled, setIsIrisEnabled] = useState<boolean>(
        () => Boolean(window.settings.get("voiceAssistant.enabled")) || false
    );

    const { isLoading, progress, message } = useLoading();

    useEffect(() => {
        const loadSettings = async () => {
            const savedModules = await window.settings.get("ui.modules");
            setEnabledModules(savedModules);
        };
        loadSettings();
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            const isDocFullscreen = !!document.fullscreenElement;
            window.electron.window.isFullScreen().then((isElectronFullscreen: boolean) => {
                setIsFullScreen(isDocFullscreen || isElectronFullscreen);
            });
        };

        window.electron.window.onFullScreen(handleFullscreenChange);

        // Initial check
        handleFullscreenChange();

        return () => {
            window.electron.window.removeFullScreenListener();
        };
    }, []);

    useEffect(() => {
        const handleSettingsChange = (key: string, value: any) => {
            if (key === "voiceAssistant.enabled") {
                setIsIrisEnabled(value);
            }
        };

        // Listen for settings changes
        window.settings.onChange(handleSettingsChange);

        return () => {
            // Cleanup
            window.settings.removeChangeListener();
        };
    }, []);

    useEffect(() => {
        if (isIrisEnabled) {
            window.irisVA.start();
            logger.log("iris enabled");
        } else {
            logger.log("iris not enabled");
        }
    }, []);

    const handleOutsideClick = (e: React.MouseEvent) => {
        // Only close if clicking the container itself, not its children
        if (e.target === e.currentTarget) {
            setShowSettings(false);
        }
    };

    useEffect(() => {
        window.electron.onOpenSettings(() => {
            // Open your settings modal/page
            setShowSettings(true);
        });
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            const isDocFullscreen = !!document.fullscreenElement;
            window.electron.window.isFullScreen().then((isElectronFullscreen: boolean) => {
                const isFullscreen = isDocFullscreen || isElectronFullscreen;
                setIsFullScreen(isFullscreen);

                // Show tip on first fullscreen
                if (isFullscreen && !window.settings.get("ui.hasSeenFullscreenTip")) {
                    setShowFullscreenTip(true);
                    window.settings.set("ui.hasSeenFullscreenTip", true);
                }
            });
        };

        window.electron.window.onFullScreen(handleFullscreenChange);
        handleFullscreenChange();
    }, []);

    return (
        <>
            <LoadingScreen isVisible={isLoading} progress={progress} message={message} />
            <div
                className={`App ${isFullScreen ? "fullscreen" : ""}`}
                onClick={showSettings ? handleOutsideClick : undefined}
            >
                {true && (
                    <div className={`fullscreen-tip ${showFullscreenTip ? "show" : "hide"}`}>
                        <div className="tip-content">
                            <h3>Fullscreen Mode</h3>
                            <p>
                                Press <kbd>F11</kbd> to exit fullscreen
                            </p>
                            <button onClick={() => setShowFullscreenTip(false)}>Got it!</button>
                        </div>
                    </div>
                )}
                <Titlebar isSettings={showSettings} setIsSettings={setShowSettings} />

                <div className={`content-wrapper ${viewState}`}>
                    <WakeBorder />
                    <div className="top-bar">
                        <AppSelector viewState={viewState} setViewState={setViewState} hide={hide} />
                    </div>
                        {showSettings && (
                            <div className="settings-backdrop" onClick={handleOutsideClick}>
                                <Settings isSettings={showSettings} setIsSettings={setShowSettings} />
                            </div>
                        )}

                    {enabledModules.discord && <DiscordMain />}

                    {enabledModules.spotify && (
                        <div className={`spotify-section ${viewState === ViewState.SPOTIFY_FULL ? "full" : ""}`}>
                            <SpotifyMain ViewState={viewState} />
                        </div>
                    )}
                    {enabledModules.hoyolab && (
                        <div
                            className={`right-section ${
                                viewState === ViewState.RIGHT_FULL
                                    ? "full"
                                    : viewState === ViewState.SPOTIFY_FULL
                                    ? "hidden"
                                    : ""
                            }`}
                        >
                            <HoyoMain ViewState={viewState} />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export function App({}: AppProps) {
    return (
        <LoadingProvider>
            <AppContent />
        </LoadingProvider>
    );
}

export default App;
