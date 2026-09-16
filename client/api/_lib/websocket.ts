// Graceful WebSocket stub for serverless environments (Vercel)
export const broadcast = (_event: { type: string; payload: any }): void => {
  // Gracefully ignored in serverless runtime
};

export const initWebSocket = (_server?: any): null => {
  return null;
};
