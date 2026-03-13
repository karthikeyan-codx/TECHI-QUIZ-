const WS_BASE =
  import.meta.env.VITE_WS_URL ||
  (window.location.protocol === "https:"
    ? `wss://${window.location.hostname}:8000`
    : `ws://${window.location.hostname}:8000`);

export function createAdminWebSocket(roomCode, handlers) {
  const ws = new WebSocket(`${WS_BASE}/ws/admin/${roomCode}`);

  ws.onopen = () => handlers.onOpen?.();
  ws.onclose = (e) => handlers.onClose?.(e);
  ws.onerror = (e) => handlers.onError?.(e);
  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      handlers.onMessage?.(data);
    } catch {
      // ignore malformed messages
    }
  };

  const send = (action, payload = {}) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action, ...payload }));
    }
  };

  return { ws, send };
}

export function createPlayerWebSocket(roomCode, playerId, handlers) {
  const ws = new WebSocket(`${WS_BASE}/ws/player/${roomCode}/${playerId}`);

  ws.onopen = () => handlers.onOpen?.();
  ws.onclose = (e) => handlers.onClose?.(e);
  ws.onerror = (e) => handlers.onError?.(e);
  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      handlers.onMessage?.(data);
    } catch {
      // ignore
    }
  };

  const send = (action, payload = {}) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action, ...payload }));
    }
  };

  return { ws, send };
}
