import { CookieManager } from './CookieManager.ts';
import { generateDynamicSecret, generateCnDynamicSecret, DS_SALT } from './ds.ts';
import { genshinNotes, zenlessBattery, genshinInfo, genshinEvents, starrailBattery, starrailInfo, starrailEvents, zenlessInfo, baseInfo } from './gameResponseTypes/index.ts';
import { Region, Game, GameRecord, DSHeaders } from './types.ts';
import axios, { AxiosResponse } from 'axios';

const CN_REGIONS = ['prod_gf_sg', 'prod_official_cht', 'os_cht'];

export class HoyoManager {
  // API endpoints
  public readonly userInfoUrl = "https://bbs-api-os.hoyolab.com/game_record/card/wapi/getGameRecordCard";

  // ZZZ
  public readonly zzzInfoUrl = "https://sg-public-api.hoyolab.com/event/game_record_zzz/api/zzz/index";
  public readonly zzzBatteryUrl = "https://sg-public-api.hoyolab.com/event/game_record_zzz/api/zzz/note";
  public readonly deadlyAssaultUrl = "https://sg-public-api.hoyolab.com/event/game_record_zzz/api/zzz/mem_detail";
  public readonly shiyuUrl = "https://sg-public-api.hoyolab.com/event/game_record_zzz/api/zzz/challenge";
  public readonly hollowUrl = "https://sg-public-api.hoyolab.com/event/game_record_zzz/api/zzz/abyss_abstract";

  public readonly zzzCalendarUrl = 'https://game8.co/api/calendars/59.json'
  // I'm not happy about using this URL, but there's no official ZZZ calendar API endpoint.

  // GI
  public readonly giInfoUrl = "https://sg-public-api.hoyolab.com/event/game_record/genshin/api/index";
  public readonly giSpiralUrl = "https://sg-public-api.hoyolab.com/event/game_record/genshin/api/spiralAbyss";
  public readonly giEventCalendarUrl = "https://sg-public-api.hoyolab.com/event/game_record/genshin/api/act_calendar"; // Post???
  public readonly giNotesUrl = 'https://bbs-api-os.hoyolab.com/game_record/genshin/api/dailyNote'

  // HSR
  public readonly starrailInfoUrl = "https://sg-public-api.hoyolab.com/event/game_record/hkrpg/api/index";
  public readonly starrailBatteryUrl = "https://sg-public-api.hoyolab.com/event/game_record/hkrpg/api/note";
  public readonly starrailShiyuUrl = "https://sg-public-api.hoyolab.com/event/game_record/hkrpg/api/challenge";
  public readonly starrailEventUrl = "https://sg-public-api.hoyolab.com/event/game_record/hkrpg/api/get_act_calender";

  [key: string]: any; // Add this line to allow string indexing

  // Nested class recreation (in practice) from an old version of this in python (Commit d587ea4c491d9c776be3eb35162b65f804e66297)
  public readonly zenless: ZenlessManager;
  public readonly starrail: StarrailManager;
  public readonly genshin: GenshinManager;

  // Explained in file
  private cookieManager: CookieManager;

  // I needed it throughout the entire class I think
  private uid: string;

  // Game properties
  public _genshinUid?: string;
  public _genshinRegion?: string;
  public _starrailUid?: string;
  public _starrailRegion?: string;
  public _zenlessUid?: string;
  public _zenlessRegion?: string;

  private isInitialized = false;

  constructor(cookieString: string, uid: string) {
    this.cookieManager = new CookieManager();
    this.cookieManager.setCookies(cookieString);
    this.uid = uid;

    // Initialize managers after base details load
    this.zenless = new ZenlessManager(this);
    this.starrail = new StarrailManager(this);
    this.genshin = new GenshinManager(this);
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await this.getBaseDetails();
    this.isInitialized = true;
  }

  public async getBaseDetails(): Promise<void | null | baseInfo.baseInfo > {
    try {
      const response = await this.makeRequest<baseInfo.baseInfo>(this.userInfoUrl, { uid: this.uid });
      logger.log(`Test: ${JSON.stringify(response?.data, null, 2)}`)
      if (response?.data?.list) {
        response.data.list.forEach((entry: GameRecord) => {
          switch (entry.game_id) {
            case 2: // Genshin
              this._genshinUid = entry.game_role_id;
              this._genshinRegion = entry.region;
              logger.log(this._genshinUid, this._genshinRegion)
              break;
            case 6: // Starrail
              this._starrailUid = entry.game_role_id;
              this._starrailRegion = entry.region;
              logger.log(this._starrailUid, this._starrailRegion)
              break;
            case 8: // Zenless
              this._zenlessUid = entry.game_role_id;
              this._zenlessRegion = entry.region;
              logger.log(this._zenlessUid, this._zenlessRegion)
              break;
          }
        });
      }
      return response;
    } catch (error) {
      logger.error('Failed to get base details:', error);
    }
  }

  public async makeRequest<T = any>(
    endpoint: string,
    params?: Record<string, any>,
    region?: string,
    method: 'GET' | 'POST' = 'GET'  // Add method parameter with GET as default
  ): Promise<T | null> {

    // Check ds.ts for what's going on here/ why I'm doing it.
    const ds = region && CN_REGIONS.includes(region)
      ? generateCnDynamicSecret(params, params, Region.CHINESE)
      : generateDynamicSecret();

    logger.log(`ds= ${ds}`)

    const baseHeaders = {
      Cookie: this.cookieManager.formatForHeader(),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:136.0) Gecko/20100101 Firefox/136.0',
      Referer: 'https://act.hoyolab.com',
      'x-rcp-platform': '4',
      'Accept-language': 'en-US,en;q=0.5',
    };

    // Create DS headers with proper typing
    /*
    Now. See the DS creation in all its idiocy.
    Still don't know why it exists
    */
    const dsHeaders: DSHeaders = {
      'x-rpc-app_version': '2.11.1',
      'x-rpc-client_type': '5',
      ds,
      ...(region && CN_REGIONS.includes(region) ? {} : {
        'x-rpc-language': 'en-us',
        'x-rpc-lang': 'en-us'
      })
    };

    // Combine headers
    const headers = {
      ...baseHeaders,
      ...dsHeaders
    };

    // Generate appropriate DS
    if (region && CN_REGIONS.includes(region)) {
      headers.ds = generateCnDynamicSecret(params, params, Region.CHINESE);
    } else {
      headers.ds = generateDynamicSecret();
    }

    try {
      const config = {
        headers,
        ...(method === 'GET' ? { params } : {}), // Use params for GET
      };

      const response = method === 'GET'
        ? await axios.get(endpoint, config)
        : await axios.post(endpoint, params, config); // Use params as body for POST

      return response.data;
    } catch (error) {
      logger.error(`Request to ${endpoint} failed:`, error);
      return null;
    }
  }

  // Getters for game properties
  get genshinUid(): string | undefined { return this._genshinUid; }
  get genshinRegion(): string | undefined { return this._genshinRegion; }
  get starrailUid(): string | undefined { return this._starrailUid; }
  get starrailRegion(): string | undefined { return this._starrailRegion; }
  get zenlessUid(): string | undefined { return this._zenlessUid; }
  get zenlessRegion(): string | undefined { return this._zenlessRegion; }
}

// Helper/Game Classes
class GenshinManager {
  constructor(private mainApi: HoyoManager) { }

  async getEvents(): Promise<void | null | genshinEvents.genshinEvents> {
    if (!this.mainApi.genshinUid || !this.mainApi.genshinRegion) return;

    const response = await this.mainApi.makeRequest<genshinEvents.genshinEvents>(
      this.mainApi.giEventCalendarUrl,
      {
        server: this.mainApi.genshinRegion,
        role_id: this.mainApi.genshinUid
      },
      this.mainApi.genshinRegion,
      'POST'
    );

    logger.log("\nGenshin Events Response:");
    logger.log(JSON.stringify(response, null, 2))

    return response
  }

  async getInfo(): Promise<void | null | genshinInfo.genshinInfo> {
    if (!this.mainApi.genshinUid || !this.mainApi.genshinRegion) {
      logger.log("No Genshin account found");
      return;
    }

    const data = await this.mainApi.makeRequest<genshinInfo.genshinInfo>(
      this.mainApi.giInfoUrl,
      {
        server: this.mainApi.genshinRegion,
        role_id: this.mainApi.genshinUid,
        avatar_list_type: 0
      },
      this.mainApi.genshinRegion
    );

    logger.log("\nGenshin Info Response:");
    logger.log(JSON.stringify(data, null, 2));

    return data
  }

  async getNotes(): Promise<void | null | genshinNotes.genshinNotes> {
    if (!this.mainApi.genshinUid || !this.mainApi.genshinRegion) return;

    const data = await this.mainApi.makeRequest<genshinNotes.genshinNotes>(
      this.mainApi.giNotesUrl,
      {
        server: this.mainApi.genshinRegion,
        role_id: this.mainApi.genshinUid,
        schedule_type: 1
      },
      this.mainApi.genshinRegion
    );

    logger.log("\nGenshin Notes Response:");
    logger.log(JSON.stringify(data, null, 2));

    return data
  }

  async getSpiralAbyss(scheduleType: number = 1): Promise<void | string> {
    if (!this.mainApi.genshinUid || !this.mainApi.genshinRegion) return;

    const data = await this.mainApi.makeRequest(
      this.mainApi.giSpiralUrl,
      {
        server: this.mainApi.genshinRegion,
        role_id: this.mainApi.genshinUid,
        schedule_type: scheduleType
      },
      this.mainApi.genshinRegion
    );

    logger.log("\nSpiral Abyss Response:");
    logger.log(data);
    return data;
  }
}

class StarrailManager {
  constructor(private mainApi: HoyoManager) { }

  async getEvents(): Promise<null | void | starrailEvents.starrailEvents> {
    if (!this.mainApi.starrailUid || !this.mainApi.starrailRegion) return;

    const response = await this.mainApi.makeRequest(
      this.mainApi.starrailEventUrl,
      {
        server: this.mainApi.starrailRegion,
        role_id: this.mainApi.starrailUid
      },
      this.mainApi.starrailRegion
    );

    logger.log("\nStarrail Events Response:");
    logger.log(JSON.stringify(response.data.act_list, null, 2))

    return response.data.act_list as starrailEvents.starrailEvents
  }

  async getInfo(): Promise<null | void | starrailInfo.starrailInfo> {
    logger.log("Starrail UID:", this.mainApi.starrailUid);
    if (!this.mainApi.starrailUid || !this.mainApi.starrailRegion) {
      logger.log("No Starrail account found");
      return;
    }

    const data = await this.mainApi.makeRequest<starrailInfo.starrailInfo>(
      this.mainApi.starrailInfoUrl,
      {
        server: this.mainApi.starrailRegion,
        role_id: this.mainApi.starrailUid
      },
      this.mainApi.starrailRegion
    );

    logger.log("\nStarrail Info Response:");
    logger.log(JSON.stringify(data, null, 2));

    return data
  }

  async getStamina(): Promise<void | string> {
    if (!this.mainApi.starrailUid || !this.mainApi.starrailRegion) return;

    const data = await this.mainApi.makeRequest(
      this.mainApi.starrailBatteryUrl,
      {
        server: this.mainApi.starrailRegion,
        role_id: this.mainApi.starrailUid
      },
      this.mainApi.starrailRegion
    );

    logger.log("\nStamina Response:");
    logger.log(JSON.stringify(data, null, 2));
    return data;
  }

  async getForgottenHall(needAll: boolean = true, scheduleType: number = 1): Promise<void | string> {
    if (!this.mainApi.starrailUid || !this.mainApi.starrailRegion) return;

    const data = await this.mainApi.makeRequest(
      this.mainApi.starrailShiyuUrl,
      {
        server: this.mainApi.starrailRegion,
        role_id: this.mainApi.starrailUid,
        need_all: needAll.toString(),
        schedule_type: scheduleType
      },
      this.mainApi.starrailRegion
    );

    logger.log("\nForgotten Hall Response:");
    logger.log(data);
    return data
  }
}

class ZenlessManager {
  constructor(private mainApi: HoyoManager) { }

  async getInfo(): Promise<void | null | zenlessInfo.zenlessInfo> {
    logger.log("Zenless UID:", this.mainApi.zenlessUid);
    if (!this.mainApi.zenlessUid || !this.mainApi.zenlessRegion) {
      logger.log("No Zenless account found");
      return;
    }

    const data = await this.mainApi.makeRequest<zenlessInfo.zenlessInfo>(
      this.mainApi.zzzInfoUrl,
      {
        server: this.mainApi.zenlessRegion,
        role_id: this.mainApi.zenlessUid
      },
      this.mainApi.zenlessRegion
    );

    logger.log("\nZenless Info Response:");
    logger.log(JSON.stringify(data, null, 2));

    return data
  }

  async getBattery(): Promise<void | null | zenlessBattery.zenlessBattery> {
    if (!this.mainApi.zenlessUid || !this.mainApi.zenlessRegion) return;

    const data = await this.mainApi.makeRequest<zenlessBattery.zenlessBattery>(
      this.mainApi.zzzBatteryUrl,
      {
        server: this.mainApi.zenlessRegion,
        role_id: this.mainApi.zenlessUid
      },
      this.mainApi.zenlessRegion
    );

    logger.log("\nBattery Info Response:");
    logger.log(JSON.stringify(data, null, 2));
    logger.log(data?.data.energy.progress)
    return data;
  }

  async getDeadlyAssault(scheduleType: number = 1): Promise<void | string> {
    if (!this.mainApi.zenlessUid || !this.mainApi.zenlessRegion) return;

    const data = await this.mainApi.makeRequest(
      this.mainApi.deadlyAssaultUrl,
      {
        region: this.mainApi.zenlessRegion,
        uid: this.mainApi.zenlessUid,
        schedule_type: scheduleType
      },
      this.mainApi.zenlessRegion
    );

    logger.log("\nDeadly Assault Response:");
    logger.log(data);
    return data
  }

  async getHollowZero(): Promise<void | string> {
    if (!this.mainApi.zenlessUid || !this.mainApi.zenlessRegion) return;

    const data = await this.mainApi.makeRequest(
      this.mainApi.hollowUrl,
      {
        server: this.mainApi.zenlessRegion,
        role_id: this.mainApi.zenlessUid
      },
      this.mainApi.zenlessRegion
    );

    logger.log("\nHollow Zero Response:");
    logger.log(data);

    return data;
  }
}