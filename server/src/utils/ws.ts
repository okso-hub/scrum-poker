import { WebSocketServer, WebSocket, RawData } from "ws";
import { IncomingMessage } from "http";

export type CustomWebSocket = WebSocket & {
  roomId?: string;
  role?: string;
  playerName?: string;
  isAlive?: boolean;
};

let wss: WebSocketServer;

/**
 * Initialisiert den WebSocketServer und legt die Connection-/Ping-Handler an.
 * Muss nach HTTP-Server-Startup aufgerufen werden.
 */
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

    ws.on("message", handleMessage);
    ws.on("close", () => {
      /* optional cleanup */
    });
  });

  return wss;
}

/**
 * Broadcast helper: sendet `payload` an alle Clients im `roomId`.
 */
export function broadcast(roomId: string, payload: any) {
  console.log(`Broadcasting to room ${roomId}:`, payload);
  wss.clients.forEach((client: CustomWebSocket) => {
    if (client.readyState === WebSocket.OPEN && client.roomId === roomId) {
      client.send(JSON.stringify(payload));
    }
  });
}

/**
 * Trennt gezielt den Client mit `playerName` im `roomId`, z.B. beim Bannen.
 * Sendet vorher ein `banned-by-admin`-Event.
 */
export function disconnectUser(roomId: string, playerName: string): void {
  wss.clients.forEach((client: CustomWebSocket) => {
    if (client.readyState === WebSocket.OPEN && client.roomId === roomId && client.playerName === playerName) {
      client.send(JSON.stringify({ event: "banned-by-admin" }));
      client.terminate();
    }
  });
}

/**
 * Beispiel eines Message-Handlers; kann in util/ws.ts bleiben
 * oder in eine eigene Datei ausgelagert werden. Eigentlich rufen wir aber nur API endpoints auf,
 * die dann Broadcasts an alle Clients im Raum machen.
 */
function handleMessage(data: RawData, ws: CustomWebSocket) {
  let msg: any;
  try {
    msg = JSON.parse(data.toString());
  } catch {
    return;
  }
}
