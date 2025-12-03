import "./Styles/SongLyrics.scss";
import React, { useState, useEffect, useRef } from "react";
import { ViewState } from "../../../types/viewState.ts";
import { logger } from "../../utils/logger.ts";

interface SongLyricsProps {
    currentSong: {
        name: string;
        artist: string;
        album: string;
        length?: number; // Optional length in milliseconds
    };
    currentTime: number;
    viewState: ViewState;
    colors?: string[]; // Add this line
    onSeek: (time: number) => void; // Add this new prop
}

const SongLyrics: React.FC<SongLyricsProps> = ({ currentSong, currentTime, viewState, colors, onSeek }) => {
    const [lyrics, setLyrics] = useState<Array<{ time: number; text: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
    const lyricsMenuRef = useRef<HTMLDivElement>(null);

    const lyricsStyle = {
        "--average-color": colors?.[0] || "#ffffff",
        "--brighter-color": colors?.[1] || "#cccccc",
        "--dimmer-color": colors?.[4] || "#999999",
    } as React.CSSProperties;

    const handleLyricClick = (time: number) => {
        onSeek(time);
    };

    const currentRequestRef = useRef<string>("");

    useEffect(() => {
        const fetchLyrics = async () => {
            const requestId = `${currentSong.name}-${currentSong.artist}`;
            currentRequestRef.current = requestId;

            setLoading(true);
            setError(null);

            try {
                console.log("Fetching lyrics for:", {
                    track: currentSong.name,
                    artist: currentSong.artist,
                    album: currentSong.album,
                });

                let lyricsData;

                const msxLyrics = await window.msx.searchLyrics(
                    {
                        artist: currentSong.artist,
                        title: currentSong.name,
                        album: currentSong.album,
                        length: currentSong.length || 0,
                    },
                    window.settings.get("music.preferredLanguage")
                );

                console.log(msxLyrics);

                if (msxLyrics && msxLyrics.length > 0) {
                    lyricsData = msxLyrics;
                } else {
                    const lrcLyrics = await window.lrc.searchLyrics({
                        artist: currentSong.artist,
                        track: currentSong.name,
                        album: currentSong.album,
                    });

                    if (lrcLyrics) {
                        lyricsData = lrcLyrics;
                    }
                }

                logger.log("Lyrics data received:", lyricsData);

                if (currentRequestRef.current === requestId) {
                    if (lyricsData && lyricsData.length > 0) {
                        setLyrics(lyricsData);
                    } else {
                        setError("No lyrics found");
                    }
                }
            } catch (err) {
                if (currentRequestRef.current === requestId) {
                    setError("No lyrics found");
                }
            } finally {
                if (currentRequestRef.current === requestId) {
                    setLoading(false);
                }
            }
        };

        if (currentSong.name && currentSong.artist) {
            fetchLyrics();
        }
    }, [currentSong.name, currentSong.artist, currentSong.album]);

    useEffect(() => {
        if (lyrics.length > 0) {
            // Store previous index before updating

            const index = lyrics.findIndex((lyric, i) => {
                const nextLyric = lyrics[i + 1];
                return currentTime >= lyric.time && (!nextLyric || currentTime < nextLyric.time);
            });
            setCurrentLyricIndex(index);
        }
    }, [currentTime, lyrics]);

    const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isUserScrolling, setIsUserScrolling] = useState(false);
    const isProgrammaticScrolling = useRef(false);

    // Handle scroll event listener
    useEffect(() => {
        const handleScroll = () => {
            if (isProgrammaticScrolling.current) {
                isProgrammaticScrolling.current = false;
                return;
            }

            setIsUserScrolling(true);
            if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
            userScrollTimeoutRef.current = setTimeout(() => {
                setIsUserScrolling(false);
            }, 1000);
        };

        const lyricsMenu = lyricsMenuRef.current;
        if (lyricsMenu) {
            lyricsMenu.addEventListener("scroll", handleScroll);
        }

        return () => {
            if (lyricsMenu) {
                lyricsMenu.removeEventListener("scroll", handleScroll);
            }
            if (userScrollTimeoutRef.current) {
                clearTimeout(userScrollTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (currentLyricIndex >= 0 && !isUserScrolling) {
            const lyricsMenu = lyricsMenuRef.current;
            if (lyricsMenu) {
                const currentLyricElement = lyricsMenu.children[currentLyricIndex] as HTMLElement;
                if (currentLyricElement) {
                    requestAnimationFrame(() => {
                        isProgrammaticScrolling.current = true;
                        const containerRect = lyricsMenu.getBoundingClientRect();
                        const elementRect = currentLyricElement.getBoundingClientRect();
                        const scrollTop = lyricsMenu.scrollTop;
                        const targetScroll =
                            scrollTop +
                            (elementRect.top - containerRect.top) -
                            containerRect.height / 2 +
                            elementRect.height / 2;

                        lyricsMenu.scrollTo({
                            top: targetScroll,
                            behavior: "smooth",
                        });
                    });
                }
            }
        }
    }, [currentLyricIndex, isUserScrolling]);

    if (loading) {
        return (
            <div className={`lyrics-container ${viewState === ViewState.SPOTIFY_FULL ? "shown" : ""}`}>
                <div className="lyrics-menu error">
                    <div className="lyric current-lyric">Loading lyrics...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`lyrics-container ${viewState === ViewState.SPOTIFY_FULL ? "shown" : ""}`}>
                <div className="lyrics-menu error">
                    <div className="lyric current-lyric">{error}</div>
                </div>
            </div>
        );
    }

    return (
        <div className={`lyrics-container ${viewState === ViewState.SPOTIFY_FULL ? "shown" : ""}`} style={lyricsStyle}>
            <div className="lyrics-menu" ref={lyricsMenuRef}>
                {lyrics.map((lyric, index) => (
                    <div
                        key={index}
                        className={`lyric ${index === currentLyricIndex ? "current-lyric" : ""} ${
                            index === currentLyricIndex - 1 ? "prev-lyric" : ""
                        } ${index === currentLyricIndex + 1 ? "next-lyric" : ""} clickable`}
                        onClick={() => handleLyricClick(lyric.time)}
                    >
                        {lyric.text}
                    </div>
                ))}

                {/* {currentLyricIndex > 0 && (
                    <div
                        key={`prev-${currentLyricIndex}`}
                        className="lyric secondary-lyric prev-lyric clickable"
                        onClick={() => handleLyricClick(lyrics[currentLyricIndex - 1].time)}
                    >
                        {lyrics[currentLyricIndex - 1].text}
                    </div>
                )}

                <div
                    key={`current-${currentLyricIndex}`}
                    className="lyric current-lyric clickable"
                    onClick={() => currentLyricIndex >= 0 && handleLyricClick(lyrics[currentLyricIndex].time)}
                >
                    {currentLyricIndex >= 0 ? lyrics[currentLyricIndex].text : "♪"}
                </div>

                {currentLyricIndex < lyrics.length - 1 && (
                    <div
                        key={`next-${currentLyricIndex}`}
                        className="lyric secondary-lyric next-lyric clickable"
                        onClick={() => handleLyricClick(lyrics[currentLyricIndex + 1].time)}
                    >
                        {lyrics[currentLyricIndex + 1].text}
                    </div>
                )} */}
            </div>
        </div>
    );
};

export default SongLyrics;
