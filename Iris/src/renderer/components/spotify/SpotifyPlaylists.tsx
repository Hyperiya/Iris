import React, { useEffect, useState } from 'react';
import { Playlist } from '../../../services/spotifyServices/types/types.ts';
import { MusicNoteRounded, MenuRounded, MenuOpenRounded } from '@mui/icons-material';
import './Styles/SpotifyPlaylists.scss';
import { logger } from '../../utils/logger.ts';

interface SpotifyPlaylistsProps {
    onSelectedPlaylist: (playlistId: string) => void;
    playlists: Playlist[] | undefined;
}

const SpotifyPlaylists: React.FC<SpotifyPlaylistsProps> = ({
    onSelectedPlaylist,
    playlists
}) => {
    const [showPlaylistMenu, setShowPlaylistMenu] = useState<boolean>(false)
    const [isResizing, setIsResizing] = useState(false);

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        const handleResize = () => {
            setIsResizing(true);
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => setIsResizing(false), 50);
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timeoutId);
        };
    }, []);

    useEffect(() => {
        logger.log(playlists)
        console.log(`Iris window size: ${window.innerWidth}x${window.innerHeight}`);
    }, [playlists])

    return (
        <>
            <div className={`playlist ${showPlaylistMenu ? '' : 'hide'} ${isResizing ? 'moving' : ''}`}>
                <div className={`playlist-container`}>
                    {playlists?.map((playlist: Playlist) => (
                        <>
                            {playlist.totalLength !== 0 && (
                                <div key={playlist.link} className='playlist-item' onClick={() => onSelectedPlaylist(playlist.link)}>
                                    <div className={`playlist-img ${playlist.mosaic ? 'mosaic' : ''}`}>
                                        {playlist.picture ? (
                                            playlist.mosaic ? (
                                                (typeof playlist.picture === 'string' ? playlist.picture.split(',') : playlist.picture)
                                                    .map((imageUrl: string, index: number) => (
                                                        <img key={index} src={imageUrl} alt={playlist.name} />
                                                    ))
                                            ) : (
                                                <img src={playlist.picture as string} alt={playlist.name} />
                                            )
                                        ) : (
                                            <div className="playlist-fallback">
                                                <MusicNoteRounded />
                                            </div>
                                        )}
                                    </div>
                                    <div className='playlist-info'>
                                        <span className='playlist-name'>{playlist.name}</span>
                                        <span className='playlist-count'>{playlist.totalLength} songs</span>
                                    </div>
                                </div>
                            )}
                        </>
                    ))}
                </div>
                <div className='playlist-icon'>
                    <button onClick={() => setShowPlaylistMenu(!showPlaylistMenu)}>
                        {showPlaylistMenu ? <MenuOpenRounded /> : <MenuRounded />}
                    </button>
                </div>
            </div>
        </>
    );
};

export default SpotifyPlaylists;
