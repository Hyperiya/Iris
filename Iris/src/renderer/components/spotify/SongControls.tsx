import React, { useState, useRef, useEffect } from 'react';
import './Styles/SongControls.scss';

import { PlayArrow, Pause, SkipNextRounded, SkipPreviousRounded, ShuffleRounded, RepeatOneRounded, RepeatRounded } from '@mui/icons-material';

interface SongControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onBack: () => void;
  onShuffle: () => void;
  onLoop: () => void;
  albumCover: string;
  colors: string[];
  shuffle: boolean;
  loop: number;
}

const SongControls: React.FC<SongControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  onSeek,
  onPlay,
  onPause,
  onNext,
  onBack,
  onLoop,
  colors,
  onShuffle,
  shuffle,
  loop,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [displayTime, setDisplayTime] = useState(currentTime);

  const lyricsStyle = {
    '--average-color': colors?.[0] || '#ffffff',
    '--brighter-color': colors?.[1] || '#cccccc',
    '--dimmer-color': colors?.[5] || '#999999',
  } as React.CSSProperties;

  // Progress Bar
  useEffect(() => {
    if (!isDragging) {
      setSliderValue((currentTime / duration) * 100);
    }
  }, [currentTime, duration, isDragging]);

  // Make updateProgress accessible outside useEffect
  const updateProgressBar = (e: React.MouseEvent) => {
    if (progressBarRef.current) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;
      const percentage = Math.min(Math.max((x / width) * 100, 0), 100);
      setSliderValue(percentage);
      // Update display time while dragging
      setDisplayTime(Math.floor((percentage / 100) * duration));
    }
  };


  // weird volume slider things

  // Action Handler
  const handlePlayPause = () => {
    if (isPlaying) {
      onPause();
    } else {
      onPlay();
    }
  };

  const handleSkip = () => {
    onNext();
  }

  const handleBack = () => {
    window.electron.log(`${currentTime / 1000 < 3}`)
    if ((currentTime / 1000) < 3) {
      onBack();
      return;
    } else {
      onSeek(0);
      return;
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updateProgressBar(e);
  };


  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      updateProgressBar(e);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging) {
      updateProgressBar(e);
      const seekTime = Math.floor((sliderValue / 100) * duration);
      onSeek(seekTime);
    }
    setIsDragging(false);
    setDisplayTime(currentTime);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    updateProgressBarTouch(e);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      updateProgressBarTouch(e);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isDragging) {
      updateProgressBarTouch(e);
      const seekTime = Math.floor((sliderValue / 100) * duration);
      onSeek(seekTime);
    }
    setIsDragging(false);
    setDisplayTime(currentTime);
  };

  // Add this new function to handle touch coordinates
  const updateProgressBarTouch = (e: React.TouchEvent) => {
    if (progressBarRef.current) {
      const rect = progressBarRef.current.getBoundingClientRect();
      // For touchend, use changedTouches instead of touches
      const touch = e.type === 'touchend' ? e.changedTouches[0] : e.touches[0];
      if (!touch) return;

      const x = touch.clientX - rect.left;
      const width = rect.width;
      const percentage = Math.min(Math.max((x / width) * 100, 0), 100);
      setSliderValue(percentage);
      setDisplayTime(Math.floor((percentage / 100) * duration));
    }
  };

  useEffect(() => {
    if (!isDragging) {
      setDisplayTime(currentTime);
    }
  }, [currentTime, isDragging]);

  // Buttons
  const songButton = (
    <button
      className="song-button"
      id="play"
      onClick={handlePlayPause}
    >
      <div>
        {isPlaying ? (
          <Pause className="control-icon control-icon" />
        ) : (
          <PlayArrow className="control-icon control-icon" />
        )}
      </div>
    </button>
  );

  const skipButton = (
    <button
      className="skip-button"
      id="skip"
      onClick={handleSkip}
    >
      <div>
        <SkipNextRounded className="skip-icon control-icon" />

      </div>
    </button>
  );

  const backButton = (
    <button
      className="back-button"
      id="back"
      onClick={handleBack}
    >
      <div>
        <SkipPreviousRounded className="back-icon control-icon" />
      </div>
    </button>
  );

  const shuffleButton = (
    <button
      className="shuffle-button"
      id="shuffle"
      onClick={onShuffle}
    >
      <div>
        {(() => {
          switch (shuffle) {
            case true:
              return <ShuffleRounded className="shuffle-icon control-icon shuffled " />;
            case false:
              return <ShuffleRounded className="shuffle-icon control-icon" />;
            default:
              return <ShuffleRounded className="shuffle-icon control-icon" />;
          }
        })()}
      </div>
    </button>
  );

  const loopButton = (
    <button
      className="loop-button"
      id="loop"
      onClick={onLoop}
    >
      <div>
        {(() => {
          // console.log(`${loop} && ${typeof (loop)}`)
          switch (loop) {

            /**
             * From `spicetify.d.ts`:
             * 0: No repeat
             * 1: Repeat all
             * 2: Repeat one
             * 
             * Return current Repeat state (No repeat = 0/Repeat all = 1/Repeat one = 2).
             */
            case 0:
              return <RepeatRounded className="loop-icon control-icon none" data-state={loop} />;
            case 1:
              return <RepeatRounded className="loop-icon control-icon all" data-state={loop} />;
            case 2:
              return <RepeatOneRounded className="loop-icon control-icon one" data-state={loop} />;
            default:
              return <RepeatRounded className="loop-icon control-icon" data-state={loop} />;
          }
        })()}
      </div>
    </button>
  );
  // Misc
  const formatTime = (ms: number) => {
    const seconds = Math.floor((ms / 1000) << 0);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="song-controls"
      style={lyricsStyle}
    >
      <div className="progress-bar-wrapper">
        <div
          className="progress-bar-container"
          ref={progressBarRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <span className="time-label time-label-left">{formatTime(displayTime)}</span>

          <div className="progress-bar-background">
            <div
              className="progress-bar-fill"
              style={{ transform: `scaleX(${sliderValue / 100})` }}
            />
          </div>
          <span className="time-label time-label-right">{formatTime(duration)}</span>
        </div>
      </div>
      <div className="song-button-container">
        <div className="main-controls-row">
          {shuffleButton}
          {backButton}
          {songButton}
          {skipButton}
          {loopButton}
        </div>
        <div className="secondary-controls-row">
        </div>
      </div>
    </div>
  );
};

export default SongControls;
