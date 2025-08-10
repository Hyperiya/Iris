const isDebugMode = () => {
  try {
    return (window as any).dev?.enabled || process.env.NODE_ENV === 'development';
  } catch {
    return false;
  }
};

export const logger = {
  log: (...args: any[]) => {
    if (isDebugMode()) console.log(...args);
  },
  error: (...args: any[]) => {
    if (isDebugMode()) console.error(...args);
  },
  warn: (...args: any[]) => {
    if (isDebugMode()) console.warn(...args);
  }
};
