import { vi, describe, it, beforeEach, afterEach, expect } from "vitest";

vi.mock("../../src/middleware/index.js", () => ({
  requireAdminAccess: (_req: any, _res: any, next: any) => next(),
  asyncHandler: (fn: any) => fn,
}));

import request from "supertest";
import express, { Express } from "express";
import router from "../../src/routes/index.js";

import { roomService, gameService } from "../../src/services/index.js";
import * as wsUtils from "../../src/utils/ws.js";

describe("Room API", () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(router);
    vi.clearAllMocks();
  });

  describe("POST /room/:roomId/items", () => {
    it("calls setItems and returns success", async () => {
      const spy = vi.spyOn(roomService, "setItems").mockImplementation(() => {});
      const res = await request(app)
        .post("/room/123/items")
        .send({ items: ["A", "B", "C"] })
        .expect(200);

      expect(res.body).toEqual({ success: true });
      expect(spy).toHaveBeenCalledWith(123, ["A", "B", "C"]);
    });
  });

  describe("POST /room/:roomId/start", () => {
    it("starts voting, broadcasts event, and returns success", async () => {
      const fakeEvt = {
        event: "reveal-item",
        item: "A",
        options: [1, 2, 3],
        totalPlayers: 0,
        allPlayers: [],
      };
      vi.spyOn(gameService, "startVoting").mockReturnValue(fakeEvt);
      const bc = vi.spyOn(wsUtils, "broadcast").mockImplementation(() => {});

      await request(app).post("/room/456/start").expect(200).expect({ success: true });

      expect(gameService.startVoting).toHaveBeenCalledWith(456);
      expect(bc).toHaveBeenCalledWith(456, fakeEvt);
    });
  });

  describe("POST /room/:roomId/reveal", () => {
    it("reveals votes, broadcasts, and returns gameEvent", async () => {
      const fakeEvent = {
        event: "cards-revealed",
        results: {
          votes: {},
          summary: {},
          average: 0,
          totalVotes: 0,
          participants: [],
        },
        isLastItem: false,
      };
      vi.spyOn(gameService, "revealVotes").mockReturnValue(fakeEvent);
      const bc = vi.spyOn(wsUtils, "broadcast").mockImplementation(() => {});

      await request(app).post("/room/123/reveal").expect(200).expect({ success: true, gameEvent: fakeEvent });

      expect(gameService.revealVotes).toHaveBeenCalledWith(123);
      expect(bc).toHaveBeenCalledWith(123, fakeEvent);
    });
  });

  describe("POST /room/:roomId/repeat", () => {
    it("repeats voting, broadcasts, and returns item", async () => {
      const fakeEvent = {
        event: "reveal-item",
        item: "A",
        options: [1, 2, 3],
        totalPlayers: 0,
        allPlayers: [],
      };
      vi.spyOn(gameService, "repeatVoting").mockReturnValue(fakeEvent);
      const bc = vi.spyOn(wsUtils, "broadcast").mockImplementation(() => {});

      await request(app).post("/room/321/repeat").expect(200).expect({ success: true, item: "A" });

      expect(gameService.repeatVoting).toHaveBeenCalledWith(321);
      expect(bc).toHaveBeenCalledWith(321, fakeEvent);
    });
  });

  describe("POST /room/:roomId/next", () => {
    it("advances to next item, broadcasts, and returns item", async () => {
      const fakeEvent = {
        event: "reveal-item",
        item: "B",
        options: [1, 2, 3],
        totalPlayers: 0,
        allPlayers: [],
      };
      vi.spyOn(gameService, "nextItem").mockReturnValue(fakeEvent);
      const bc = vi.spyOn(wsUtils, "broadcast").mockImplementation(() => {});

      await request(app).post("/room/555/next").expect(200).expect({ success: true, item: "B" });

      expect(gameService.nextItem).toHaveBeenCalledWith(555);
      expect(bc).toHaveBeenCalledWith(555, fakeEvent);
    });
  });

  describe("POST /room/:roomId/summary", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("shows summary, broadcasts, schedules delete, and returns gameEvent", async () => {
      const fakeSummary = {
        event: "show-summary",
        summary: {
          items: [],
          totalAverage: 0,
          totalTasks: 0,
        },
      };
      vi.spyOn(gameService, "showSummary").mockReturnValue(fakeSummary);
      const bc = vi.spyOn(wsUtils, "broadcast").mockImplementation(() => {});
      const del = vi.spyOn(roomService, "deleteRoom").mockImplementation(() => {});

      await request(app).post("/room/999/summary").expect(200).expect({
        success: true,
        gameEvent: fakeSummary,
      });

      // fast-forward the 5s delay
      vi.advanceTimersByTime(5_000);
      expect(del).toHaveBeenCalledWith(999);
    });
  });

  describe("POST /room/:roomId/ban", () => {
    it("bans a user, disconnects them, broadcasts, and returns success", async () => {
      const fakeUser = { name: "bob", ip: "2.2.2.2" };
      vi.spyOn(roomService, "banUser").mockReturnValue(fakeUser);
      const disc = vi.spyOn(wsUtils, "disconnectUser").mockImplementation(() => {});
      const bc = vi.spyOn(wsUtils, "broadcast").mockImplementation(() => {});

      await request(app).post("/room/789/ban").send({ name: "bob" }).expect(200).expect({ success: true });

      expect(roomService.banUser).toHaveBeenCalledWith(789, "bob");
      expect(disc).toHaveBeenCalledWith(789, "bob");
      expect(bc).toHaveBeenCalledWith(789, {
        event: "user-banned",
        user: "bob",
      });
    });
  });
});
