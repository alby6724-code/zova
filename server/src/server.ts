import http from 'http';
import { createApp } from './app.js';
import { initWebSocket } from './websocket/index.js';
import { config } from './config/index.js';

const app = createApp();
const server = http.createServer(app);

// Initialize WebSocket server on same HTTP port
initWebSocket(server);

if (!process.env.VERCEL) {
  server.listen(config.port, () => {
    console.log(`====================================================`);
    console.log(`🚀 ZOVA Backend Server running on port ${config.port}`);
    console.log(`🌐 API Base URL: http://localhost:${config.port}/api`);
    console.log(`⚡ WebSocket URL: ws://localhost:${config.port}/ws`);
    console.log(`🛡️  Security Headers & Rate Limiting: ACTIVE`);
    console.log(`====================================================`);
  });

  const handleShutdown = () => {
    console.log('Shutting down server gracefully...');
    server.close(() => {
      console.log('Server terminated successfully.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', handleShutdown);
  process.on('SIGINT', handleShutdown);
}

export default app;
export { app, server };
