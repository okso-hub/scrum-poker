import { WebSocketServer, WebSocket, RawData } from "ws";
import { IncomingMessage } from "http";

export interface CustomWebSocket extends WebSocket {
  roomId?: string;
  role?: string;
  playerName?: string;
  isAlive?: boolean;
}

export let wss: WebSocketServer;

export function initWebSocket(server: any, path = "/ws") {
  wss = new WebSocketServer({ server, path });

  // Keep-alive
  setInterval(() => {
    wss.clients.forEach((ws: CustomWebSocket) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("connection", (ws: CustomWebSocket, req: IncomingMessage) => {
    ws.isAlive = true;
    ws.on("pong", () => (ws.isAlive = true));

    ws.on("message", (data) => {
      handleMessage(data, ws);
    });
    ws.on("close", () => {
      /* optional cleanup */
    });
  });

  return wss;
}

export function broadcast(roomId: string, payload: any) {
  console.log(`Broadcasting to room ${roomId}:`, payload);
  wss.clients.forEach((client: CustomWebSocket) => {
    if (client.readyState === WebSocket.OPEN && client.roomId === roomId) {
      //console.log(`Sending to ${client.playerName || "unknown client"} in room ${roomId}`);
      client.send(JSON.stringify(payload));
    }
  });
}

export function disconnectUser(roomId: string, playerName: string): void {
  wss.clients.forEach((client: CustomWebSocket) => {
    if (client.readyState === WebSocket.OPEN && client.roomId === roomId && client.playerName === playerName) {
      client.send(JSON.stringify({ event: "banned-by-admin" }));
      client.terminate();
    }
  });
}

function handleMessage(data: RawData, ws: CustomWebSocket) {
  const msg = data.toString();
  if (!ws.roomId) {
    // Handle initial connection message
    try {
      const parsed = JSON.parse(msg);
      if (parsed.roomId) {
        ws.roomId = parsed.roomId;
        ws.role = parsed.role;
        ws.playerName = parsed.payload?.name;
        // console.log(`Assigned ws: ${ws.playerName} (${ws.role}) to room ${ws.roomId}`);
      }
    } catch {
      ws.roomId = msg;
      //   console.log(`Assigned ws to room ${ws.roomId}`);
    }
    return;
  }
}
