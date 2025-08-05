import { DSGenerator } from './dsTypes.ts';
import { Region, Game, DSHeaders } from './types.ts';
import nodeCrypto from 'crypto';

const CN_TIMEZONE = 8 * 60 * 60 * 1000; // UTC+8 in milliseconds

/*
I'm BAAAACKKK
Dynamic signatures. We need this for HSR for some reason.
I don't know how it works, but it does.
I'm not sure if it's needed for other games, but I'm not going to bother with it.
*/

export const DS_SALT = {
  [Region.OVERSEAS]: "6s25p5ox5y14umn1p61aqyyvbvvl3lrt",
  [Region.CHINESE]: "xV8v4Qu54lUKrEYFZkJhB8cuOh9Asafs",
  app_login: "IZPgfb0dRPtBeLuFkdDznSZ6f4wWt6y2",
  cn_signin: "LyD1rXqMv2GJhnwdvCBjFOKGiKuLY3aO",
  cn_passport: "JwYDpKvLj6MrMqqYU6jTKF17KNO2PXoS",
};


let dsGenerator: DSGenerator | null = null;

// Borrowed from TukanDev (https://github.com/TukanDev/qingyi/) 
export function generateDynamicSecret(salt: string = DS_SALT[Region.OVERSEAS]): string {

  const t = Math.floor(Date.now() / 1000);
  const r = nodeCrypto.randomBytes(6).toString('hex').slice(0, 6);
  const message = `salt=${salt}&t=${t}&r=${r}`;
  const hash = nodeCrypto.createHash('md5').update(message).digest('hex');
  return `${t},${r},${hash}`;
}

// https://github.com/TukanDev/qingyi/
export function generateCnDynamicSecret(
  body: any = null,
  query: Record<string, any> | null = null,
  salt: string = DS_SALT[Region.CHINESE]
): string {
  const t = Math.floor(Date.now() / 1000);
  const r = Math.floor(100001 + Math.random() * 100000);
  const b = body ? JSON.stringify(body) : "";
  const q = query ? Object.entries(query)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&") : "";

  const message = `salt=${salt}&t=${t}&r=${r}&b=${b}&q=${q}`;
  const hash = nodeCrypto.createHash('md5').update(message).digest('hex');
  return `${t},${r},${hash}`;
}

export function getDsHeaders(region: Region, data?: any, params?: Record<string, any>, lang?: string): DSHeaders {
  if (region === Region.OVERSEAS) {
    return {
      "x-rpc-app_version": "1.5.0",
      "x-rpc-client_type": "5",
      "x-rpc-language": lang,
      "x-rpc-lang": lang,
      ds: generateDynamicSecret(),
    };
  }
  return {
    "x-rpc-app_version": "2.11.1",
    "x-rpc-client_type": "5",
    ds: generateCnDynamicSecret(data, params),
  };
}