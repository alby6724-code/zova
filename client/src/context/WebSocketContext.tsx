import React, { createContext, useContext, useEffect, useState } from 'react';

interface ToastMessage {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'success' | 'warning' | 'alert';
}

interface WebSocketContextType {
  connected: boolean;
  toasts: ToastMessage[];
  lastMessage: { type: string; payload: any } | null;
  dismissToast: (id: string) => void;
  sendWsMessage: (type: string, payload: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [lastMessage, setLastMessage] = useState<{ type: string; payload: any } | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          if (data.type === 'NEW_LISTING') {
            addToast({
              id: `tst-${Date.now()}`,
              title: 'New Listing Posted',
              description: `${data.payload.title} (${data.payload.category}) - ₹ ${data.payload.price.toLocaleString()}`,
              type: 'success',
            });
          } else if (data.type === 'LISTING_UPDATED') {
            addToast({
              id: `tst-${Date.now()}`,
              title: 'Listing Status Updated',
              description: `Listing ${data.payload.title} status changed to ${data.payload.status}`,
              type: 'warning',
            });
          }
        } catch (e) {
          // ignore non-json messages
        }
      };

      ws.onerror = () => {
        setConnected(false);
      };

      ws.onclose = () => {
        setConnected(false);
      };

      setSocket(ws);
    } catch (e) {
      // Offline fallback
    }

    return () => {
      if (ws) {
        try {
          ws.close();
        } catch {}
      }
    };
  }, []);

  const addToast = (toast: ToastMessage) => {
    setToasts((prev) => [toast, ...prev].slice(0, 5));
    setTimeout(() => {
      dismissToast(toast.id);
    }, 6000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const sendWsMessage = (type: string, payload: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type, payload }));
    }
  };

  return (
    <WebSocketContext.Provider value={{ connected, toasts, lastMessage, dismissToast, sendWsMessage }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-xl border backdrop-blur-md flex items-start gap-3 transition-all animate-slide-in ${
              toast.type === 'success'
                ? 'bg-emerald-900/90 text-white border-emerald-500/50'
                : toast.type === 'warning'
                ? 'bg-amber-900/90 text-white border-amber-500/50'
                : 'bg-slate-900/90 text-white border-slate-700'
            }`}
          >
            <div className="flex-1">
              <p className="font-semibold text-sm">{toast.title}</p>
              <p className="text-xs text-slate-200 mt-0.5">{toast.description}</p>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-slate-400 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
