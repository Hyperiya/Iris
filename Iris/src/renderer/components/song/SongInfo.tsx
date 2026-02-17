import React from 'react';
import './Styles/SongInfo.scss';
import SongVolume from './SongVolume.tsx'

interface Song {
  name: string;
  artist: string;
  album_cover: string;
  year: string;
  album: string;
}

interface SongInfoProps {
  currentSong: Song;
  colors: string[]
  volume: number
  onVolumeChange: (volume: number) => void
}

const SongInfo: React.FC<SongInfoProps> = ({ currentSong, colors, volume, onVolumeChange }) => {
  return (
    <div className="song-details">
      <div className='image-overlay'>
        <img
          className="song-image"
          src={currentSong?.album_cover}
          alt="Album Cover"
          id="song-image"
          draggable="false"
        />
        <SongVolume
          volume={volume}
          onVolumeChange={onVolumeChange}
        />
      </div>
      <div className="song-text">{currentSong?.name}</div>
      <div className="artist-text">{currentSong?.artist} • <span className='year-text'>{(() => {
        if (currentSong.album == currentSong.name) {
          return "Single";
        } else if (currentSong.album == currentSong.artist) {
          return currentSong.album;
        }
        return currentSong.album;
      })()}</span></div>
    </div>
  );
};

export default SongInfo;
