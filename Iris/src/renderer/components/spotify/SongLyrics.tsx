import "./Styles/SongLyrics.scss";
import React, { useState, useEffect, useRef, useMemo } from "react";
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

interface LyricsLine {
    time: number;
    text: string;
    blank?: boolean;
}

const SongLyrics: React.FC<SongLyricsProps> = ({ currentSong, currentTime, viewState, colors, onSeek }) => {
    const [lyrics, setLyrics] = useState<Array<LyricsLine>>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
    // Add this after the currentLyricIndex useEffect
    const currentLyricProgress = useMemo(() => {
        if (currentLyricIndex >= 0 && lyrics[currentLyricIndex]) {
            const currentLyric = lyrics[currentLyricIndex];
            const nextLyric = lyrics[currentLyricIndex + 1];

            if (nextLyric) {
                const lyricDuration = nextLyric.time - currentLyric.time;
                const elapsed = currentTime - currentLyric.time;
                return Math.max(0, Math.min(1, elapsed / lyricDuration));
            }
        }
        return 0;
    }, [currentLyricIndex, currentTime, lyrics]);

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
        const checkGap = (lyricsData: Array<LyricsLine>) => {
            const gapThreshold: number = 4000;

            if (lyricsData[0].time >= gapThreshold) {
                lyricsData.unshift({ time: 0, text: "", blank: true });
            }

            // Process blanks: mark satisfactory ones, remove others (iterate backwards)
            for (let i = lyricsData.length - 1; i >= 1; i--) {
                if (lyricsData[i].text === "") {
                    const nextLyric = lyricsData[i + 1];
                    const gap = nextLyric ? nextLyric.time - lyricsData[i].time : 0;

                    if (gap >= gapThreshold) {
                        lyricsData[i].blank = true; // Mark as satisfactory blank
                    } else {
                        lyricsData.splice(i, 1); // Remove unsatisfactory blank
                    }
                }
            }
        };

        const fetchLyrics = async () => {
            const requestId = `${currentSong.name}-${currentSong.artist}`;
            currentRequestRef.current = requestId;

            setLoading(true);
            setError(null);

            try {
                const [msxResult, lrcResult] = await Promise.allSettled([
                    window.msx.searchLyrics(
                        {
                            artist: currentSong.artist,
                            title: currentSong.name,
                            album: currentSong.album,
                            length: currentSong.length || 0,
                        },
                        window.settings.get("music.preferredLanguage")
                    ),
                    window.lrc.searchLyrics({
                        artist: currentSong.artist,
                        track: currentSong.name,
                        album: currentSong.album,
                    }),
                ]);

                let lyricsData;

                // Check MSX first
                if (msxResult.status === "fulfilled" && msxResult.value && msxResult.value.length > 0) {
                    lyricsData = msxResult.value;
                }
                // Fallback to LRC
                else if (lrcResult.status === "fulfilled" && lrcResult.value && lrcResult.value.length > 0) {
                    lyricsData = lrcResult.value;
                }

                if (currentRequestRef.current === requestId) {
                    if (lyricsData && lyricsData.length > 0) {
                        checkGap(lyricsData);
                        logger.log("Lyrics found:", lyricsData);
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
    const isProgrammaticScrollRef = useRef(false);

    useEffect(() => {
        const handleScroll = () => {
            if (isProgrammaticScrollRef.current) {
                isProgrammaticScrollRef.current = false;
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

        if (currentLyricIndex >= 0 && lyricsMenu && !isUserScrolling) {
            const currentLyricElement = lyricsMenu.children[currentLyricIndex] as HTMLElement;
            if (currentLyricElement) {
                // Use manual scroll instead of scrollIntoView
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
            }
        }

        return () => {
            if (lyricsMenu) {
                lyricsMenu.removeEventListener("scroll", handleScroll);
            }
            if (userScrollTimeoutRef.current) {
                clearTimeout(userScrollTimeoutRef.current);
            }
        };
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

    const getDotOpacity = (dotIndex: number, progress: number) => {
        const dotProgress = progress * 3; // Scale to 0-3 range
        const dotStart = dotIndex; // Dot 0 starts at 0, dot 1 at 1, dot 2 at 2

        if (dotProgress <= dotStart) return 0.3; // Not reached yet
        if (dotProgress >= dotStart + 1) return 1; // Fully visible

        // Partially visible - interpolate between 0.3 and 1
        const partialProgress = dotProgress - dotStart;
        return 0.3 + 0.7 * partialProgress;
    };

    const getDotScale = (dotIndex: number, progress: number) => {
        const dotProgress = progress * 3; // Scale to 0-3 range
        const dotStart = dotIndex; // Dot 0 starts at 0, dot 1 at 1, dot 2 at 2

        if (dotProgress <= dotStart) return 0.8; // Not reached yet - smaller
        if (dotProgress >= dotStart + 1) return 1.2; // Fully visible - larger

        // Partially visible - interpolate between 0.8 and 1.2
        const partialProgress = dotProgress - dotStart;
        return 0.8 + 0.3 * partialProgress;
    };

    return (
        <div className={`lyrics-container ${viewState === ViewState.SPOTIFY_FULL ? "shown" : ""}`} style={lyricsStyle}>
            <div className="lyrics-menu" ref={lyricsMenuRef}>
                {lyrics.map((lyric, index) => (
                    <div
                        key={index}
                        className={`lyric ${index === currentLyricIndex ? "current-lyric" : ""} ${index === currentLyricIndex - 1 ? "prev-lyric" : ""} ${index === currentLyricIndex + 1 ? "next-lyric" : ""} clickable`}
                        onClick={() => handleLyricClick(lyric.time)}
                    >
                        {lyric.blank ? (
                            <div className="blank-progress-dots">
                                {[0, 1, 2].map((dotIndex) => (
                                    <div
                                        key={dotIndex}
                                        className="dot"
                                        style={
                                            {
                                                "--dot-radius": "1vw",
                                                opacity:
                                                    index === currentLyricIndex
                                                        ? getDotOpacity(dotIndex, currentLyricProgress)
                                                        : 0.3,
                                                transform: `scale(${index === currentLyricIndex ? getDotScale(dotIndex, currentLyricProgress) : 0.8})`,
                                            } as React.CSSProperties
                                        }
                                    />
                                ))}
                            </div>
                        ) : (
                            lyric.text
                        )}
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
