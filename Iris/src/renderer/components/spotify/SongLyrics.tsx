import './Styles/SongLyrics.scss';
import React, { useState, useEffect } from 'react';
import { ViewState } from '../../../types/viewState.ts'

interface SongLyricsProps {
  currentSong: {
    name: string;
    artist: string;
    album: string;
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
  const [lyrics, setLyrics] = useState<Array<{time: number, text: string}>>([]);
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
        
        
        // Log the search parameters
        console.log('Fetching lyrics for:', {
          track: currentSong.name,
          artist: currentSong.artist,
          album: currentSong.album
        });

        const lyricsData = await window.lrc.searchLyrics({
          artist: currentSong.artist,
          track: currentSong.name,
          album: currentSong.album
        });

        console.log('Lyrics data received:', lyricsData);

        if (lyricsData.syncedLyrics) {
          const parsedLyrics = window.lrc.parseSyncedLyrics(lyricsData.syncedLyrics);
          console.log('Parsed synced lyrics:', parsedLyrics);
          setLyrics(await parsedLyrics);
        } else if (lyricsData.plaintext) {
          // Fallback to plain text if no synced lyrics
          const plainLyrics = lyricsData.plaintext.split('\n').map((text:any, index:any) => ({
            time: index * 5000, // Space lines 5 seconds apart
            text: text.trim()
          }));
          setLyrics(plainLyrics);
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

    // Only fetch if we have both song name and artist
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