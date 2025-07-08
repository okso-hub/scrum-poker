import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createServer, Server as HttpServer } from "http";
import WebSocket, { WebSocketServer } from "ws";
import * as wsModule from "../../src/utils/ws.js";
import type { CustomWebSocket } from "../../src/types/index.js";

describe("WebSocket utils", () => {
  let httpServer: HttpServer;
  let wss: WebSocketServer;
  let url: string;

  // Start HTTP+WSS before each test
  beforeEach(async () => {
    httpServer = createServer();
    wss = wsModule.initWebSocket(httpServer as any, "/ws-test");

    // Wait for the server to bind to a random port
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => resolve());
    });

    const addr = httpServer.address() as { port: number };
    url = `ws://127.0.0.1:${addr.port}/ws-test`;

    // Clear out any leftover clients
    wss.clients.clear();
  });

  // Clean up after all tests so Vitest can exit
  afterEach(() => {
    wss.close();
    httpServer.close();
  });

  describe("broadcast & disconnectUser (this is more a unit test)", () => {
    let fake1: CustomWebSocket, fake2: CustomWebSocket;

    beforeEach(() => {
      // Inject two fake clients into the live WSS instance
      wss.clients.clear();
      fake1 = {
        readyState: WebSocket.OPEN,
        roomId: 1,
        playerName: "alice",
        send: vi.fn(),
        terminate: vi.fn(),
      } as any;
      fake2 = {
        readyState: WebSocket.OPEN,
        roomId: 2,
        playerName: "bob",
        send: vi.fn(),
        terminate: vi.fn(),
      } as any;

      wss.clients.add(fake1);
      wss.clients.add(fake2);
    });

    it("broadcast() only hits matching OPEN clients", () => {
      wsModule.broadcast(1, { foo: "bar" });
      expect(fake1.send).toHaveBeenCalledWith(JSON.stringify({ foo: "bar" }));
      expect(fake2.send).not.toHaveBeenCalled();
    });

    it("disconnectUser() messages+terminates only the named client", () => {
      fake2.roomId = 1;
      wsModule.disconnectUser(1, "alice");
      expect(fake1.send).toHaveBeenCalledWith(
        JSON.stringify({ event: "banned-by-admin" })
      );
      expect(fake1.terminate).toHaveBeenCalled();
      expect(fake2.send).not.toHaveBeenCalled();
    });
  });

  describe("handleMessage (via real WS)", () => {
    it("assigns roomId, role, playerName from JSON", async () => {
      const client = new WebSocket(url);
      await new Promise((r) => client.once("open", r));

      client.send(
        JSON.stringify({
          roomId: 42,
          role: "player",
          payload: { name: "charlie" },
        })
      );

      // wait a tick for the server to process
      await new Promise((r) => setTimeout(r, 50));

      const [serverSide] = Array.from(wss.clients) as CustomWebSocket[];
      expect(serverSide.roomId).toBe(42);
      expect(serverSide.role).toBe("player");
      expect(serverSide.playerName).toBe("charlie");

      client.close();
    });

    it("does not reassign if roomId already set", async () => {
      const client = new WebSocket(url);
      await new Promise((r) => client.once("open", r));

      // first message sets it
      client.send(JSON.stringify({ roomId: 1 }));
      await new Promise((r) => setTimeout(r, 50));

      const [serverSide] = Array.from(wss.clients) as CustomWebSocket[];
      expect(serverSide.roomId).toBe(1);

      // second message should be ignored
      client.send(JSON.stringify({ roomId: 2, role: "x", payload: { name: "y" } }));
      await new Promise((r) => setTimeout(r, 50));

      expect(serverSide.roomId).toBe(1);
      expect(serverSide.role).toBeUndefined();
      expect(serverSide.playerName).toBeUndefined();

      client.close();
    });
  });
});
