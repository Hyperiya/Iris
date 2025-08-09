import './Styles/SongLyrics.scss';
import React, { useState, useEffect } from 'react';
import { ViewState } from '../../../types/viewState.ts'

interface SongLyricsProps {
  currentSong: {
    name: string;
    artist: string;
    album: string;
    length?: number; // Optional length in milliseconds
  };
  currentTime: number;
  viewState: ViewState;
  colors?: string[];  // Add this line
  onSeek: (time: number) => void;  // Add this new prop
}

const SongLyrics: React.FC<SongLyricsProps> = ({
  currentSong,
  currentTime,
  viewState,
  colors,
  onSeek
}) => {
  const [lyrics, setLyrics] = useState<Array<{ time: number, text: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
  const [prevLyricIndex, setPrevLyricIndex] = useState(-1);

  const lyricsStyle = {
    '--average-color': colors?.[0] || '#ffffff',
    '--brighter-color': colors?.[1] || '#cccccc',
    '--dimmer-color': colors?.[4] || '#999999',
  } as React.CSSProperties;

  const handleLyricClick = (time: number) => {
    onSeek(time);
  };

  useEffect(() => {
    const fetchLyrics = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('Fetching lyrics for:', {
          track: currentSong.name,
          artist: currentSong.artist,
          album: currentSong.album
        });

        let lyricsData;

        const msxLyrics = await window.msx.searchLyrics({
          artist: currentSong.artist,
          title: currentSong.name,
          album: currentSong.album,
          length: currentSong.length || 0
        }, window.settings.get('music.prefferredLangauge'));

        if (msxLyrics && msxLyrics.length > 0) {
          lyricsData = msxLyrics;
        } else {
          const lrcLyrics = await window.lrc.searchLyrics({
            artist: currentSong.artist,
            track: currentSong.name,
            album: currentSong.album
          });

          if (lrcLyrics?.syncedLyrics) {
            lyricsData = await window.lrc.parseSyncedLyrics(lrcLyrics.syncedLyrics);
          }
        }

        console.log('Lyrics data received:', lyricsData);

        if (lyricsData && lyricsData.length > 0) {
          setLyrics(lyricsData);
        } else {
          setError('No lyrics found');
        }
      } catch (err) {
        console.error('Error fetching lyrics:', err);
        setError('No lyrics found');
      } finally {
        setLoading(false);
      }
    };

    if (currentSong.name && currentSong.artist) {
      fetchLyrics();
    }
  }, [currentSong.name, currentSong.artist, currentSong.album]);


  useEffect(() => {
    if (lyrics.length > 0) {
      // Store previous index before updating
      setPrevLyricIndex(currentLyricIndex);

      const index = lyrics.findIndex((lyric, i) => {
        const nextLyric = lyrics[i + 1];
        return (
          currentTime >= lyric.time &&
          (!nextLyric || currentTime < nextLyric.time)
        );
      });
      setCurrentLyricIndex(index);
    }
  }, [currentTime, lyrics]);

  if (loading) {
    return (
      <div className={`lyrics-container ${viewState === ViewState.SPOTIFY_FULL ? 'shown' : ''}`}>
        <div className="lyrics-menu">
          <div className="lyric current-lyric">
            Loading lyrics...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`lyrics-container ${viewState === ViewState.SPOTIFY_FULL ? 'shown' : ''}`}>
        <div className="lyrics-menu">
          <div className="lyric current-lyric">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`lyrics-container ${viewState === ViewState.SPOTIFY_FULL ? 'shown' : ''}`}
      style={lyricsStyle}>
      <div className="lyrics-menu">
        {currentLyricIndex > 0 && (
          <div
            key={`prev-${currentLyricIndex}`}
            className="lyric  secondary-lyric prev-lyric clickable"
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
          {currentLyricIndex >= 0 ? lyrics[currentLyricIndex].text : '♪'}
        </div>

        {currentLyricIndex < lyrics.length - 1 && (
          <div
            key={`next-${currentLyricIndex}`}
            className="lyric secondary-lyric next-lyric clickable"
            onClick={() => handleLyricClick(lyrics[currentLyricIndex + 1].time)}
          >
            {lyrics[currentLyricIndex + 1].text}
          </div>
        )}
      </div>
    </div>
  );
};

export default SongLyrics;