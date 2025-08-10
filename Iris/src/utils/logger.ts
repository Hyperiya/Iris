const isDebugMode = process.env.DEBUG_MODE === 'true' || global.DEBUG_MODE;

export const logger = {
  log: (...args: any[]) => {
    if (isDebugMode) console.log(...args);
  },
  error: (...args: any[]) => {
    if (isDebugMode) console.error(...args);
  },
  warn: (...args: any[]) => {
    if (isDebugMode) console.warn(...args);
  }
};
