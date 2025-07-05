// tests/gameService.spec.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { GameService } from "../../src/services/GameService.js";
import { RoomService } from "../../src/services/RoomService.js";
import { RoomStatus, BadRequestError } from "../../src/types/index.js";

describe("GameService", () => {
  let mockRoomService: Partial<RoomService>;
  let svc: GameService;
  let fakeRoom: any;
  let participants: string[];

  beforeEach(() => {
    // reset fake room & participants
    fakeRoom = {
      items: ["T1", "T2", "T3"],
      votes: {},
      itemHistory: [],
      status: RoomStatus.SETUP,
    };
    participants = ["alice", "bob", "cj"];

    // mock out RoomService
    mockRoomService = {
      getRoom: vi.fn(() => fakeRoom),
      getParticipants: vi.fn(() => participants),
      validatePlayerInRoom: vi.fn(),
    };
    svc = new GameService(mockRoomService as RoomService);
  });

  describe("startVoting", () => {
    it("throws if no items", () => {
      fakeRoom.items = [];
      expect(() => svc.startVoting("r1")).toThrow(BadRequestError);
    });

    it("sets status to VOTING and returns correct event", () => {
      const evt = svc.startVoting("r1");
      expect(fakeRoom.status).toBe(RoomStatus.VOTING);
      expect(evt).toEqual({
        event: "reveal-item",
        item: "T1",
        options: [1, 2, 3, 5, 8, 13, 21],
        totalPlayers: 3,
        allPlayers: participants,
      });
      expect(mockRoomService.getParticipants).toHaveBeenCalledWith("r1");
    });
  });

  describe("vote", () => {
    it("throws if missing playerName or vote", () => {
      expect(() => svc.vote("r1", "", "5")).toThrow(BadRequestError);
      expect(() => svc.vote("r1", "alice", "")).toThrow(BadRequestError);
    });

    it("records a vote and returns vote-status-update", () => {
      const evt = svc.vote("r1", "bob", "8");
      expect(mockRoomService.validatePlayerInRoom).toHaveBeenCalledWith(fakeRoom, "bob");
      expect(fakeRoom.votes).toMatchObject({ bob: "8" });

      expect(evt).toEqual({
        event: "vote-status-update",
        voteCount: 1,
        totalPlayers: 3,
        votedPlayers: ["bob"],
        allPlayers: participants,
      });
    });
  });

  describe("isVoteComplete", () => {
    it("false when votes < players", () => {
      fakeRoom.votes = { alice: "1" };
      expect(svc.isVoteComplete("r1")).toBe(false);
    });
    it("true when votes === players", () => {
      fakeRoom.votes = { alice: "1", bob: "2", cj: "3" };
      expect(svc.isVoteComplete("r1")).toBe(true);
    });
  });

  describe("revealVotes", () => {
    it("throws if no votes", () => {
      fakeRoom.votes = {};
      expect(() => svc.revealVotes("r1")).toThrow(BadRequestError);
    });

    it("calculates results, appends history and returns cards-revealed", () => {
      // cast some votes
      fakeRoom.votes = { alice: "3", bob: "5", cj: "3" };

      const evt = svc.revealVotes("r1");
      expect(fakeRoom.status).toBe(RoomStatus.REVEALING);

      // history was pushed
      expect(fakeRoom.itemHistory).toHaveLength(1);
      const hist = fakeRoom.itemHistory[0];
      expect(hist.item).toBe("T1");
      expect(hist.average).toBeCloseTo((3 + 5 + 3) / 3, 2);
      expect(hist.votes).toMatchObject({ alice: "3", bob: "5", cj: "3" });

      // event payload
      expect(evt.event).toBe("cards-revealed");
      expect(evt.results).toMatchObject({
        votes: fakeRoom.votes,
        totalVotes: 3,
      });
      expect(typeof evt.isLastItem).toBe("boolean");
    });
  });

  describe("repeatVoting", () => {
    it("throws if no current item", () => {
      fakeRoom.items = [];
      expect(() => svc.repeatVoting("r1")).toThrow(BadRequestError);
    });

    it("clears votes, sets VOTING, and returns start event", () => {
      // pre‐populate votes
      fakeRoom.votes = { alice: "1" };
      const evt = svc.repeatVoting("r1");
      expect(fakeRoom.votes).toEqual({});
      expect(fakeRoom.status).toBe(RoomStatus.VOTING);
      expect(evt.event).toBe("reveal-item");
      expect(evt.item).toBe("T1");
    });
  });

  describe("nextItem", () => {
    it("throws if only one item left", () => {
      fakeRoom.items = ["only"];
      expect(() => svc.nextItem("r1")).toThrow(BadRequestError);
    });

    it("shifts items, clears votes, sets VOTING and returns start event", () => {
      const oldFirst = fakeRoom.items[0];
      const evt = svc.nextItem("r1");
      expect(fakeRoom.items[0]).not.toBe(oldFirst);
      expect(fakeRoom.votes).toEqual({});
      expect(fakeRoom.status).toBe(RoomStatus.VOTING);
      expect(evt.event).toBe("reveal-item");
      expect(evt.item).toBe("T2");
    });
  });

  describe("showSummary", () => {
    it("computes totalAverage and returns show-summary", () => {
      // seed history
      fakeRoom.itemHistory = [
        { item: "T1", average: 3, votes: {}, summary: {} },
        { item: "T2", average: 5, votes: {}, summary: {} },
      ];
      const evt = svc.showSummary("r1");

      expect(evt.event).toBe("show-summary");
      expect(evt.summary).toMatchObject({
        totalTasks: 2,
        totalAverage: 4.0,
      });
      expect(fakeRoom.status).toBe(RoomStatus.COMPLETED);
    });
  });

  describe("getVoteStatus", () => {
    it("returns correct vote status object", () => {
      fakeRoom.votes = { alice: "2", bob: "8" };
      const status = svc.getVoteStatus("r1");
      expect(status).toEqual({
        voteCount: 2,
        totalPlayers: 3,
        votedPlayers: ["alice", "bob"],
        allPlayers: participants,
      });
    });
  });
});
