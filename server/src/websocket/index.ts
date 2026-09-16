import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';

interface ClientConnection {
  ws: WebSocket;
  userId?: string;
}

let wss: WebSocketServer | null = null;
const clients = new Set<ClientConnection>();

export const initWebSocket = (server?: HttpServer) => {
  if (!server || process.env.VERCEL || process.env.DISABLE_WS === 'true') {
    return null;
  }
  try {
    wss = new WebSocketServer({ server, path: '/ws' });
  } catch (err) {
    console.warn('WebSocket server initialization skipped:', err);
    return null;
  }

  wss.on('connection', (ws: WebSocket) => {
    const client: ClientConnection = { ws };
    clients.add(client);

    ws.send(JSON.stringify({ type: 'CONNECTED', message: 'Real-time WebSocket stream active' }));

    ws.on('message', (message: string) => {
      try {
        const parsed = JSON.parse(message.toString());
        if (parsed.type === 'IDENTIFY' && parsed.userId) {
          client.userId = parsed.userId;
        } else if (parsed.type === 'CHAT_MESSAGE') {
          // Broadcast to other clients
          broadcast({
            type: 'NEW_CHAT_MESSAGE',
            payload: parsed.payload,
          });
        }
      } catch (err) {
        console.error('Error handling WS message:', err);
      }
    });

    ws.on('close', () => {
      clients.delete(client);
    });

    ws.on('error', (err) => {
      console.error('WebSocket client error:', err);
      clients.delete(client);
    });
  });

  return wss;
};

export const broadcast = (event: { type: string; payload: any }) => {
  const data = JSON.stringify(event);
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  });
};
