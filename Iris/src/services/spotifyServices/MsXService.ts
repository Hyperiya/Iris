import type { SyncedLyrics, TrackMetadata } from './types/lyrics.ts';

export class MsXService {
    private baseUrl = 'https://apic-desktop.musixmatch.com/ws/1.1/';
    private token?: string;

    async searchLyrics(metadata: TrackMetadata, preferredLanguage?: string[]): Promise<SyncedLyrics> {
        let result: SyncedLyrics = [];

        try {
            const token = await this.getToken();
            if (!token) return result;

            const params = {
                format: 'json',
                namespace: 'lyrics_richsynched',
                optional_calls: 'track.richsync',
                subtitle_format: 'mxm',
                q_artist: metadata.artist,
                q_track: metadata.title,
                q_album: metadata.album,
                q_duration: `${metadata.length}`,
                f_subtitle_length: `${metadata.length}`,
                f_subtitle_length_max_deviation: '40',
            };

            const apiResult = await this.queryMusixmatch('macro.subtitles.get', params);
            if (apiResult) {
                result = this.parseSyncedLyrics(apiResult);

                // Get translations if preferred language is set
                if (preferredLanguage) {
                    const trackId = apiResult.message?.body?.macro_calls?.['matcher.track.get']?.message?.body?.track?.track_id;
                    if (trackId) {
                        const translations = await this.queryTranslation(trackId, preferredLanguage, metadata.title);
                        if (translations && translations.length > 0) {
                            translations.forEach((translation: any, index: number) => {
                                if (result[index]) {
                                    result[index].text = translation.translation.description;
                                }
                            });
                        } else {
                            logger.warn(`No translations found for "${metadata.title}"`);
                        }
                    }
                }
            }
        } catch (error) {
            logger.error('Error fetching Musixmatch lyrics:', error);
        }

        return result;
    }


    private async getToken(): Promise<string | undefined> {
        if (this.token) return this.token;

        const result = await this.queryMusixmatch('token.get', {}, false);
        const token = result?.message?.body?.user_token;

        if (token?.length && token !== 'UpgradeOnlyUpgradeOnlyUpgradeOnlyUpgradeOnly') {
            this.token = token;
            return token;
        }

        return undefined;
    }

    private async queryMusixmatch(method: string, params: any = {}, useToken = true): Promise<any> {
        const token = useToken ? await this.getToken() : undefined;

        const urlParams = new URLSearchParams({
            app_id: 'web-desktop-app-v1.0',
            t: Math.random().toString(36).replace(/[^a-z]+/g, '').slice(2, 10),
            ...(token && { usertoken: token }),
            ...params
        });

        try {
            const response = await fetch(`${this.baseUrl}${method}?${urlParams}`, {
                headers: {
                    'Cookie': 'x-mxm-user-id=',
                    'Authority': 'apic-desktop.musixmatch.com',
                }
            });

            return await response.json();
        } catch (error) {
            logger.error(`Musixmatch request failed for ${method}:`, error);
            return undefined;
        }
    }

    private parseSyncedLyrics(result: any): SyncedLyrics {
        const richsync = result.message?.body?.macro_calls?.['track.richsync.get']?.message?.body?.richsync;
        const subtitle = result.message?.body?.macro_calls?.['track.subtitles.get']?.message?.body?.subtitle_list?.[0]?.subtitle;

        if (richsync?.richsync_body) {
            return JSON.parse(richsync.richsync_body).map((v: any) => ({
                text: v.x,
                time: Math.round(v.ts * 1000),
                duration: Math.round((v.te - v.ts) * 1000),
                karaoke: v.l.map((x: any) => ({
                    text: x.c,
                    start: Math.round((v.ts + x.o) * 1000)
                }))
            }));
        } else if (subtitle?.subtitle_body) {
            return JSON.parse(subtitle.subtitle_body).map((v: any) => ({
                time: Math.round(v.time.total * 1000),
                text: v.text,
            }));
        }

        return [];
    }

    async queryTranslation(trackId: string, language: string[], songTitle:string): Promise<any> {
        const queryParams = {
            format: 'json',
            comment_format: 'text',
            part: 'user',
            track_id: trackId,
            translation_fields_set: 'minimal',
            selected_language: language[0], // You can make this configurable
        };


        logger.log(`Querying translations with params for song "${songTitle}":`, queryParams);
        const result = await this.queryMusixmatch('crowd.track.translations.get', queryParams);
        return result?.message?.body?.translations_list;
    }
}
