export interface LyricLine {
  time: number;
  text: string;
  duration?: number;
  translation?: string;
  karaoke?: KaraokeSegment[];
}

export interface KaraokeSegment {
  text: string;
  start: number;
}

export type SyncedLyrics = readonly LyricLine[];

export interface TrackMetadata {
  artist: string;
  title: string;
  album?: string;
  length: number;
}
