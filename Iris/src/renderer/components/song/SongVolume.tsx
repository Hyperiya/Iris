import React, { useState, useRef, useEffect } from 'react';
import './Styles/SongVolume.scss';
import { VolumeDownRounded, VolumeUpRounded } from '@mui/icons-material';

interface SongVolumeProps {
    volume: number;
    onVolumeChange: (volume: number) => void;
}

const SongVolume: React.FC<SongVolumeProps> = ({
    volume,
    onVolumeChange,
}) => {
    const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        console.log('volume changed, ' , Number(event.target.value));
        onVolumeChange(Number(event.target.value));
    };

    const handleVolumeIconClick = (icon: 'up' | 'down') => {
        if (icon === 'down') {
            onVolumeChange(0);
        } else {
            onVolumeChange(100);
        }
    };


    useEffect(() => {
        const slider = document.querySelector('.volume-slider') as HTMLElement;
        if (slider) {
            slider.style.setProperty('--volume-percentage', `${volume}%`);
        }
    }, [volume]);
    
    
    return (
        <div className="volume-control-wrapper">
            <VolumeDownRounded
                className="volume-icon"
                onClick={() => handleVolumeIconClick('down')}
            />
            <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={handleVolumeChange}
                className="volume-slider"
                aria-label="Volume"
            />
            <VolumeUpRounded
                className="volume-icon"
                onClick={() => handleVolumeIconClick('up')}
            />
        </div>
    );
};

export default SongVolume;
