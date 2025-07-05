import { RoomStatus, VoteResults, Summary, BadRequestError, GameEvent } from "../types/index.js";
import { RoomService } from "./RoomService.js";

export class GameService {
  private readonly VOTING_OPTIONS = [1, 2, 3, 5, 8, 13, 21];

  constructor(private readonly roomService: RoomService) {}

  startVoting(roomId: string): GameEvent {
    const room = this.roomService.getRoom(roomId);

    const first = room.items[0];
    if (!first) {
      throw new BadRequestError("No items to start");
    }

    room.status = RoomStatus.VOTING;

    console.log(`Starting room ${roomId} with item ${first}`);

    const participants = this.roomService.getParticipants(roomId);

    return {
      event: "reveal-item",
      item: first,
      options: this.VOTING_OPTIONS,
      totalPlayers: participants.length,
      allPlayers: participants,
    };
  }

  vote(roomId: string, playerName: string, vote: string): GameEvent {
    if (!playerName) {
      throw new BadRequestError("Player name is required");
    }
    if (!vote) {
      throw new BadRequestError("Vote is required");
    }

    const room = this.roomService.getRoom(roomId);
    this.roomService.validatePlayerInRoom(room, playerName);

    if (!room.votes) room.votes = {};
    room.votes[playerName] = vote;

    console.log(`Vote from ${playerName} in ${roomId}: ${vote}`);

    const players = this.roomService.getParticipants(roomId);
    const voteCount = Object.keys(room.votes).length;
    const votedPlayers = Object.keys(room.votes);

    return {
      event: "vote-status-update",
      voteCount,
      totalPlayers: players.length,
      votedPlayers,
      allPlayers: players,
    };
  }

  revealVotes(roomId: string): GameEvent {
    const room = this.roomService.getRoom(roomId);

    const votes = room.votes || {};
    if (Object.keys(votes).length === 0) {
      throw new BadRequestError("No votes to reveal");
    }

    const results = this.calculateVoteResults(votes);

    const current = room.items[0];
    if (current) {
      room.itemHistory.push({
        item: current,
        average: results.average,
        votes: results.votes,
        summary: results.summary,
      });
    }

    const isLastItem = room.items.length <= 1;
    room.status = RoomStatus.REVEALING;

    return {
      event: "cards-revealed",
      results,
      isLastItem,
    };
  }

  isVoteComplete(roomId: string): boolean {
    const room = this.roomService.getRoom(roomId);
    const votes = room.votes || {};
    const players = this.roomService.getParticipants(roomId);

    return Object.keys(votes).length === players.length;
  }

  repeatVoting(roomId: string): GameEvent {
    const room = this.roomService.getRoom(roomId);

    const current = room.items[0];
    if (!current) {
      throw new BadRequestError("No current item to repeat");
    }

    room.votes = {};
    room.status = RoomStatus.VOTING;

    const participants = this.roomService.getParticipants(roomId);

    room.itemHistory = room.itemHistory.filter((entry) => entry.item !== current);

    // console.log(`itemHistory after repeat:`, room.itemHistory);

    return {
      event: "reveal-item",
      item: current,
      options: this.VOTING_OPTIONS,
      totalPlayers: participants.length,
      allPlayers: participants,
    };
  }

  nextItem(roomId: string): GameEvent {
    const room = this.roomService.getRoom(roomId);

    if (room.items.length <= 1) {
      throw new BadRequestError("No more items");
    }

    room.items.shift();
    const next = room.items[0];
    room.votes = {};
    room.status = RoomStatus.VOTING;

    console.log(`Next item started for room ${roomId}: ${next}`);

    const participants = this.roomService.getParticipants(roomId);

    return {
      event: "reveal-item",
      item: next,
      options: this.VOTING_OPTIONS,
      totalPlayers: participants.length,
      allPlayers: participants,
    };
  }

  showSummary(roomId: string): GameEvent {
    const room = this.roomService.getRoom(roomId);

    const history = room.itemHistory;
    const totalAvg = history.length > 0 ? parseFloat((history.reduce((sum, i) => sum + i.average, 0) / history.length).toFixed(2)) : 0;

    const summary: Summary = {
      items: history,
      totalAverage: totalAvg,
      totalTasks: history.length,
    };

    room.status = RoomStatus.COMPLETED;

    return {
      event: "show-summary",
      summary,
    };
  }

  getVoteStatus(roomId: string) {
    const room = this.roomService.getRoom(roomId);
    const votes = room.votes || {};
    const players = this.roomService.getParticipants(roomId);

    return {
      voteCount: Object.keys(votes).length,
      totalPlayers: players.length,
      votedPlayers: Object.keys(votes),
      allPlayers: players,
    };
  }

  private calculateVoteResults(votes: Record<string, string>): VoteResults {
    const summary: Record<string, number> = {};
    const values = Object.values(votes)
      .map((v) => parseFloat(v))
      .filter((n) => !isNaN(n));

    Object.values(votes).forEach((v) => {
      summary[v] = (summary[v] || 0) + 1;
    });

    const avg = values.length ? parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)) : 0;

    return {
      votes,
      summary,
      average: avg,
      totalVotes: Object.keys(votes).length,
      participants: Object.keys(votes),
    };
  }
}
