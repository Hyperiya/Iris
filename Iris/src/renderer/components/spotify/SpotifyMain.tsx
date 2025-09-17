import React, { useEffect, useState, useRef, useCallback } from "react";

import SongInfo from "./SongInfo.tsx";
import SongControls from "./SongControls.tsx";
import SongUpcoming from "./SongUpcoming.tsx";
import SongBackground from "./SongBackground.tsx";
import SongLyrics from "./SongLyrics.tsx";

import Iris from "../../../assets/icons/Iris.png";

import "./Styles/Main.scss";
import { Song } from "../../../services/spotifyServices/types/types.ts";
import { ViewState } from "../../../types/viewState.ts";
import { ColorExtractor } from "../../../utils/ColorExtractor.ts";
import SpotifyPlaylists from "./SpotifyPlaylists.tsx";
import { Playlist } from "../../../services/spotifyServices/types/types.ts";

interface SpotifyMainProps {
    ViewState: ViewState;
}

window.spotify.startLink();

const SpotifyMain: React.FC<SpotifyMainProps> = (viewState) => {
    const [currentTrackData, setCurrentTrackData] = useState<Song>({
        name: "",
        artist: "",
        album_cover: "",
        year: "",
        is_playing: false,
        progress_ms: 0,
        duration_ms: 0,
        volume: 0,
        repeat_state: 0,
    });

    const [nextTrackData, setNextTrackData] = useState<Song>({
        name: "",
        artist: "",
        album_cover: "",
    });

    const [localProgress, setLocalProgress] = useState<number>(0);

    const [hasInitialData, setHasInitialData] = useState(false);

    const manualStateUpdateRef = useRef<number>(0);
    const isMountedRef = useRef<boolean>(true);

    const progressRef = useRef<number>(0); // Add a ref to track between renders
    const [playlists, setPlaylists] = useState<Playlist[] | undefined>();

    // NextTrack tracking
    const initialNextTrack = useCallback(async () => {
        // console.log("initialNextTrack called");
        try {
            const nextTrack = await window.spotify.getNextSong();
            // console.log(`next track:${nextTrack}`)
            setNextTrackData(nextTrack);
        } catch (error) {
            console.error("Error fetching next track:", error);
        }
    }, []);

    useEffect(() => {
        async () => {
            const playlists = await window.spotify.getPlaylists();
            setPlaylists(playlists);
        };
        setInterval(async () => {
            const playlists = await window.spotify.getPlaylists();
            setPlaylists(playlists);
        }, 10000);
    }, []);

    // CurrentTrack Tracking
    useEffect(() => {
        isMountedRef.current = true;

        const fetchCurrentTrack = async () => {
            try {
                if (Date.now() - manualStateUpdateRef.current < 2000) return;

                const track = await window.spotify.getCurrentTrack();

                if (track) {
                    setCurrentTrackData((prev) => {
                        if (
                            prev.name === track.name &&
                            prev.artist === track.artist &&
                            prev.year === track.year &&
                            prev.album === track.album &&
                            prev.duration_ms === track.duration_ms &&
                            prev.is_playing === track.is_playing &&
                            prev.volume === track.volume &&
                            prev.repeat_state === track.repeat_state &&
                            prev.shuffle_state === track.shuffle_state
                        ) {
                            window.electron.window.windowTitle(`Iris - ${prev.name}, ${prev.artist}`);
                            return prev;
                        }
                        // Exclude progress_ms from the update
                        const { progress_ms, ...trackWithoutProgress } = track;
                        return { ...prev, ...trackWithoutProgress };
                    });
                    if (!hasInitialData) setHasInitialData(true);
                }
            } catch (error) {
                console.error("Error fetching track:", error);
            }
        };

        fetchCurrentTrack();

        const pollInterval = setInterval(fetchCurrentTrack, 500);

        return () => {
            isMountedRef.current = false;
            clearInterval(pollInterval);
        };
    }, [currentTrackData.is_playing, currentTrackData.duration_ms]);

    useEffect(() => {
        // Immediate sync with current progress
        if (window.spotify.currentProgress().progress_ms) {
            setLocalProgress(window.spotify.currentProgress().progress_ms);
        }
    }, []); // Run once on mount

    // Regular progress tracking effect
    useEffect(() => {
        let timeoutId: NodeJS.Timeout | undefined;
        var justInTimeout: boolean = false;

        const updateProgress = async () => {
            const timeSinceManualUpdate = Date.now() - manualStateUpdateRef.current;
            if (timeSinceManualUpdate < 1000) {
                const remainingWait = 200 - timeSinceManualUpdate;

                if (timeoutId) clearTimeout(timeoutId);

                justInTimeout = true;
                // Wait for the remaining time
                await new Promise((resolve) => setTimeout(resolve, remainingWait));
            } else {
                if (justInTimeout) {
                    justInTimeout = false;
                }
            }

            const serviceProgress = window.spotify.currentProgress() ?? 0;

            if (serviceProgress.progress_ms !== progressRef.current) {
                progressRef.current = serviceProgress.progress_ms;
                setLocalProgress(serviceProgress.progress_ms);
            }
        };

        // Run immediately
        updateProgress();

        const interval = setInterval(updateProgress, 100);
        return () => {
            clearInterval(interval);
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, []); // Remove localProgress from dependencies

    useEffect(() => {
        initialNextTrack();
        const debounceTimeout = setTimeout(async () => {
            try {
                const nextTrack = await window.spotify.getNextSong();
                // console.log(`next track:${nextTrack}`)
                setNextTrackData((prev) => {
                    if (prev.name === nextTrack.name && prev.artist === nextTrack.artist) return prev;
                    return nextTrack;
                });
            } catch (error) {
                console.error("Error fetching next track:", error);
            }
        }, 300);

        return () => clearTimeout(debounceTimeout);
    }, [currentTrackData.name, initialNextTrack]);

    const handleSeek = async (seekTime: number) => {
        try {
            const boundedSeekTime = Math.min(seekTime, currentTrackData.duration_ms || 0);
            manualStateUpdateRef.current = Date.now();
            setLocalProgress(boundedSeekTime);
            await window.spotify.seek(boundedSeekTime);
        } catch (error) {
            console.error("Failed to seek:", error);
        }
    };

    // Getting Avg Colors
    const [colors, setColors] = useState<string[]>([]);

    useEffect(() => {
        const getColors = async () => {
            try {
                const palette = await ColorExtractor.from(currentTrackData.album_cover || Iris);
                const extractedColors = [
                    palette.Vibrant?.hex, // [0]
                    palette.LightVibrant?.hex, // [1]
                    palette.DarkVibrant?.hex, // [2]
                    palette.Muted?.hex, // [3]
                    palette.LightMuted?.hex, // [4]
                    palette.DarkMuted?.hex, // [5]
                ].filter((color): color is string => !!color);

                setColors(extractedColors); // Set the state with extracted colors
            } catch (error) {
                console.error("Error extracting colors:", error);
            }
        };

        getColors();
    }, [currentTrackData.album_cover]);

    return (
        <div className="spotify">
            <SongBackground coverUrl={currentTrackData.album_cover || Iris} />
                <div className="song-info">
                    <SongInfo
                        currentSong={{
                            name: currentTrackData.name || "No track playing",
                            artist: currentTrackData.artist || "No artist",
                            album_cover: currentTrackData.album_cover || Iris,
                            year: currentTrackData.year || "N/A",
                            album: currentTrackData.album || "N/A",
                        }}
                        colors={colors}
                        volume={currentTrackData.volume || 0}
                        onVolumeChange={async (volume: number) => {
                            manualStateUpdateRef.current = Date.now();
                            setCurrentTrackData((prev) => ({ ...prev, volume }));
                            await window.spotify.setVolume(volume);
                        }}
                    />
                    <SongControls
                        isPlaying={currentTrackData.is_playing || false}
                        currentTime={
                            Date.now() - manualStateUpdateRef.current < 200
                                ? localProgress
                                : window.spotify.currentProgress().progress_ms ?? 0
                        }
                        duration={currentTrackData.duration_ms || 0}
                        onPlay={() => {
                            manualStateUpdateRef.current = Date.now();
                            setCurrentTrackData((prev) => ({ ...prev, is_playing: true }));
                            window.spotify.resumePlayback();
                        }}
                        onPause={() => {
                            manualStateUpdateRef.current = Date.now();
                            setCurrentTrackData((prev) => ({ ...prev, is_playing: false }));
                            window.spotify.pausePlayback();
                        }}
                        onBack={async () => {
                            try {
                                setCurrentTrackData((prev) => ({ ...prev, is_playing: true }));
                                await window.spotify.playPreviousSong();
                                // Add delay and fetch
                                const track = await window.spotify.getCurrentTrack();
                                if (track) {
                                    setCurrentTrackData(track);
                                    setCurrentTrackData((prev) => ({ ...prev, is_playing: true }));
                                }
                            } catch (error) {
                                console.error("Error during back operation:", error);
                            }
                        }}
                        onNext={async () => {
                            try {
                                setCurrentTrackData((prev) => ({ ...prev, is_playing: true }));
                                await window.spotify.playNextSong();
                                // Add delay and fetch
                                const track = await window.spotify.getCurrentTrack();
                                if (track) {
                                    setCurrentTrackData(track);
                                    setCurrentTrackData((prev) => ({ ...prev, is_playing: true }));
                                }
                            } catch (error) {
                                console.error("Error during back operation:", error);
                            }
                        }}
                        onShuffle={async () => {
                            manualStateUpdateRef.current = Date.now();
                            setCurrentTrackData((prev) => ({ ...prev, shuffle_state: !prev.shuffle_state }));
                            await window.spotify.toggleShuffle();
                        }}
                        onLoop={async () => {
                            manualStateUpdateRef.current = Date.now();
                            setCurrentTrackData((prev) => ({
                                ...prev,
                                repeat_state: ((prev.repeat_state ?? 0) + 1) % 3,
                            }));
                            await window.spotify.toggleRepeat();
                        }}
                        onSeek={handleSeek}
                        albumCover={currentTrackData.album_cover || Iris}
                        colors={colors}
                        shuffle={currentTrackData.shuffle_state || false}
                        loop={currentTrackData.repeat_state || 0}
                    />
                </div>
                <div id="right-edge">
                    <SongUpcoming
                        nextSong={{
                            id: "1",
                            title: nextTrackData.name || "No upcoming track",
                            artist: nextTrackData.artist || "None",
                            albumCover: nextTrackData.album_cover || Iris,
                        }}
                    />
                    <SpotifyPlaylists
                        playlists={playlists}
                        onSelectedPlaylist={(playlistId: string) => window.spotify.playUri(playlistId)}
                    />
                </div>
                {hasInitialData && (
                    <div className="song-lyrics">
                        <SongLyrics
                            currentSong={{
                                name: currentTrackData.name || "",
                                artist: currentTrackData.artist || "",
                                album: currentTrackData.album || "",
                                length: currentTrackData.duration_ms || 0,
                            }}
                            currentTime={
                                Date.now() - manualStateUpdateRef.current < 200
                                    ? localProgress
                                    : window.spotify.currentProgress().progress_ms ?? 0
                            }
                            viewState={viewState.ViewState}
                            colors={colors}
                            onSeek={handleSeek}
                        />
                    </div>
                )}
            </div>
    );
};

export default SpotifyMain;
