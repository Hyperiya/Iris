export interface WebPlaybackTrack {
  uri: string;
  id: string;
  type: 'track' | 'episode' | 'ad';
  media_type: 'audio' | 'video';
  name: string;
  is_playable: boolean;
  album: {
    uri: string;
    name: string;
    images: Array<{ url: string }>;
  };
  artists: Array<{ uri: string; name: string }>;
}

export interface WebPlaybackState {
  context: {
    uri: string;
    metadata: any;
  };
  disallows: {
    pausing?: boolean;
    peeking_next?: boolean;
    peeking_prev?: boolean;
    resuming?: boolean;
    seeking?: boolean;
    skipping_next?: boolean;
    skipping_prev?: boolean;
  };
  paused: boolean;
  position: number;
  duration: number;
  track_window: {
    current_track: WebPlaybackTrack;
    previous_tracks: WebPlaybackTrack[];
    next_tracks: WebPlaybackTrack[];
  };
}

export enum RepeatState {
    OFF = 'off',
    CONTEXT = 'context', // Repeats the playlist/album
    TRACK = 'track'     // Repeats the current song
}

export interface Song {
    name: string;
    artist: string;
    album_cover: string | null;
    year?: string;
    is_playing?: boolean;
    progress_ms?: number;
    duration_ms?: number;
    repeat_state?: number;
    volume?: number;
    album?: string;
    shuffle_state?: boolean;

}

export interface Token {
    token: string
    tokenExpire: number
    tokenTime: number
}

export interface Playlist {
  link: string;
  name: string;
  totalLength: number;
  picture: string[] | string;
  mosaic: boolean;
}

export interface originalPlaylist {
    type?:                     string;
    rowId?:                    string;
    addTime?:                  number;
    groupLabel?:               string;
    link?:                     string;
    loadState?:                string;
    loaded?:                   boolean;
    published?:                boolean;
    followed?:                 boolean;
    browsableOffline?:         boolean;
    name?:                     string;
    collaborative?:            boolean;
    totalLength?:              number;
    description?:              string;
    descriptionFromAnnotate?:  boolean;
    picture?:                  string;
    pictureFromAnnotate?:      boolean;
    canReportAnnotationAbuse?: boolean;
    owner?:                    Owner;
    ownedBySelf?:              boolean;
    offline?:                  string;
    allows?:                   Allows;
    capabilities?:             Capabilities;
    mosaic?:                   boolean;
}

interface Allows {
    insert?: boolean;
    remove?: boolean;
}

interface Capabilities {
    canView?:                    boolean;
    canAdministratePermissions?: boolean;
    canEditMetadata?:            boolean;
    canEditItems?:               boolean;
    canCancelMembership?:        boolean;
    listAttributeCapabilities?:  ListAttributeCapabilities;
}

interface ListAttributeCapabilities {
    name?:                  AiCurationReferenceid;
    description?:           AiCurationReferenceid;
    picture?:               AiCurationReferenceid;
    collaborative?:         AiCurationReferenceid;
    deletedByOwner?:        AiCurationReferenceid;
    aiCurationReferenceId?: AiCurationReferenceid;
}

interface AiCurationReferenceid {
    canEdit?: boolean;
}

interface Owner {
    username?: string;
    link?:     string;
    name?:     string;
}
