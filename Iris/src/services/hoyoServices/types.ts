/*
Useful types when working with hoyo services
*/

export enum Region {
  OVERSEAS = "os",
  CHINESE = "cn"
}

export enum Game {
  GENSHIN = "genshin",
  HONKAI = "honkai3rd",
  STARRAIL = "hkrpg",
  ZZZ = "nap",
  TOT = "tot"
}

export type DSHeaders = {
  "x-rpc-app_version": string;
  "x-rpc-client_type": string;
  "x-rpc-language"?: string;
  "x-rpc-lang"?: string;
  ds: string;
};

export interface GameRecord {
  game_id: number;
  game_role_id: string;
  region: string;
  // Add other properties as needed
}

