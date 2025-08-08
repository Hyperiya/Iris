// lrclib-api.ts

/**
 * Interface for LrcLib API response
 */
interface LrcLibResponse {
  id: number;
  artist: string;
  track: string;
  album: string;
  plaintext: string;
  syncedLyrics: string | null;
  instrumental: boolean;
  lang: string;
}

/**
 * Interface for search query parameters
 */
interface SearchParams {
  artist: string;
  track: string;
  album?: string;
}

/**
 * Main class for interacting with the LrcLib API
 */
export class LrcLibApi {
  private baseUrl = 'https://lrclib.net/api';

  /**
   * Search for lyrics by artist and track
   * @param params Search parameters (artist, track, optional album)
   * @returns Promise with the search results
   */
  async searchLyrics(params: { artist: string; track: string; album?: string }): Promise<LrcLibResponse> {
    try {
      // Clean up and encode parameters
      const cleanArtist = params.artist.trim().replace(/\s+/g, '+');
      const cleanTrack = params.track.trim().replace(/\s+/g, '+');

      console.log('Search parameters:', cleanArtist, cleanTrack);

      // First attempt with album if provided
      if (params.album) {
        const cleanAlbum = params.album.trim().replace(/\s+/g, '+');
        const urlWithAlbum = `${this.baseUrl}/get?artist_name=${cleanArtist}&track_name=${cleanTrack}&album_name=${cleanAlbum}`;

        console.log('Trying first attempt with album:', urlWithAlbum);

        try {
          const response = await fetch(urlWithAlbum);
          if (response.ok) {
            const data = await response.json();
            console.log('Found lyrics with album!');
            return data;
          }
        } catch (error) {
          console.log('First attempt failed, trying without album...');
        }
      }

      // Second attempt without album
      const urlWithoutAlbum = `${this.baseUrl}/get?artist_name=${cleanArtist}&track_name=${cleanTrack}`;
      console.log('Trying second attempt without album:', urlWithoutAlbum);

      try {
        const response = await fetch(urlWithoutAlbum);
        if (response.ok) {
          const data = await response.json();
          console.log('Found lyrics without album!');
          return data;
        }
      } catch (error) {
        console.log('Second attempt failed, trying with primary artist only...');
      }

      // Third attempt with only the first artist (if multiple artists)
      if (params.artist.includes(',') || params.artist.includes('&') || params.artist.includes('feat.')) {
        const primaryArtist = params.artist
          .split(/,|\&|feat\./)[0]  // Split on ',', '&', or 'feat.'
          .trim()
          .replace(/\s+/g, '+');

        const urlPrimaryArtist = `${this.baseUrl}/get?artist_name=${primaryArtist}&track_name=${cleanTrack}`;
        console.log('Trying third attempt with primary artist:', urlPrimaryArtist);

        const response = await fetch(urlPrimaryArtist);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error Response, third:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
          });
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Found lyrics with primary artist!');
        return data;
      }

      const url = `${this.baseUrl}/search?q=${cleanTrack}+${cleanArtist}+${params.album}`;

      const response = await fetch(url)

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      } else {
        return response.json()
      }
    } catch (error) {
      console.error('Error fetching lyrics:', error);
      throw error;
    }
  }


  parseSyncedLyrics(syncedLyrics: string): Array<{ time: number, text: string }> {
    if (!syncedLyrics) return [];

    const lines = syncedLyrics.split('\n');
    const result: Array<{ time: number, text: string }> = [];

    for (const line of lines) {
      // Match the timestamp format [mm:ss.xx]
      const match = line.match(/\[(\d+):(\d+)\.(\d+)\](.*)/);

      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const hundredths = parseInt(match[3], 10);
        const text = match[4].trim();

        // Convert to milliseconds
        const time = (minutes * 60 + seconds) * 1000 + hundredths * 10;

        result.push({ time, text });
      }
    }

    return result.sort((a, b) => a.time - b.time);
  }




  /**
   * Get lyrics by ID
   * @param id Lyrics ID
   * @returns Promise with the lyrics data
   */
  async getLyricsById(id: number): Promise<LrcLibResponse> {
    const url = `${this.baseUrl}/get/${id}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return await response.json() as LrcLibResponse;
    } catch (error) {
      console.error('Error fetching lyrics by ID:', error);
      throw error;
    }
  }

  /**
   * Format synced lyrics into a structured format
   * @param syncedLyrics Raw synced lyrics string
   * @returns Array of timestamped lyrics
   */
}