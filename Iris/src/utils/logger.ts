const isDebugMode = process.env.DEBUG_MODE === 'true' || global.DEBUG_MODE;
const disabledServices = new Set((process.env.DISABLED_CLASS_LOGS || '').split(',').map(s => s.trim()).filter(Boolean));

function getCallerPath(): string {
  const stack = new Error().stack;
  if (!stack) return 'unknown';
  // console.log("[DEBUG]", stack)
  
  const lines = stack.split('\n');
  for (let i = 4; i < lines.length; i++) { // Start from line 3 to skip logger internals
    const line = lines[i];
    
    // Extract class/method names from patterns like "DiscordRPC.handleMessage" or "SpotifyService.play"
    const classMatch = line.match(/at (\w+)\./);
    if (classMatch) {
      return classMatch[1]; // Return just the class name like "DiscordRPC"
    }
    
    // Also try to extract from function names
    const funcMatch = line.match(/at (\w+) \(/);
    if (funcMatch) {
      return funcMatch[1]; // Return function name
    }
  }
  
  return 'unknown';
}

function shouldLog(): boolean {
  if (!isDebugMode) return false;
  const caller = getCallerPath();
  
  // console.log(`[DEBUG] Caller: "${caller}"`);
  // console.log(`[DEBUG] Disabled services:`, Array.from(disabledServices));
  
  // Check if caller matches any disabled service
  for (const disabled of disabledServices) {
    if (caller.includes(disabled.replace('/', '')) || disabled.includes(caller)) {
      // console.log(`[DEBUG] Blocked: ${caller} matches ${disabled}`);
      return false;
    }
  }
  
  // console.log(`[DEBUG] Allowing: ${caller}`);
  return true;
}


export const logger = {
  log: (...args: any[]) => {
    if (shouldLog()) console.log(...args);
  },
  error: (...args: any[]) => {
    if (shouldLog()) console.error(...args);
  },
  warn: (...args: any[]) => {
    if (shouldLog()) console.warn(...args);
  }
};
