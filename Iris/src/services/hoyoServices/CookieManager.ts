/*
Hyperiya again!
This time, we are going to make a cookie manager. 
We will be using the cookie string to get the essential cookies and format them for the header.
*/

export class CookieManager {
  private cookieData: Record<string, string> = {};

  setCookies(cookieString: string): void {
    this.cookieData = this.parseCookieString(cookieString);
  }

  private parseCookieString(cookieString: string): Record<string, string> {
    return cookieString.split(';').reduce((acc, pair) => {
      const [key, value] = pair.trim().split('=', 2);
      if (key) acc[key] = value || '';
      return acc;
    }, {} as Record<string, string>);
  }

  getEssentialCookies(): Record<string, string> {
    const essentialKeys = [
      "cookie_token_v2",
      "account_mid_v2",
      "account_id_v2",
      "ltoken_v2",
      "ltmid_v2",
      "ltuid_v2",
    ];
    return essentialKeys.reduce((acc, key) => {
      if (this.cookieData[key]) acc[key] = this.cookieData[key];
      return acc;
    }, {} as Record<string, string>);
  }

  formatForHeader(): string {
    return Object.entries(this.getEssentialCookies())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }
}
