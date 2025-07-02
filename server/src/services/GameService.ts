import { Room, RoomStatus, VoteResults, ItemHistory, Summary, BadRequestError, GameEvent } from "../types/index.js";
import { RoomService } from "./RoomService.js";

export class GameService {
  private readonly VOTING_OPTIONS = [1, 2, 3, 5, 8, 13, 21];

  constructor(private roomService: RoomService) {}

  /**
   * Starts voting for the first item in the room
   * Admin validation should be done by middleware before calling this
   */
  startVoting(roomId: string): GameEvent {
    const room = this.roomService.getRoom(roomId);

    const first = room.items[0];
    if (!first) {
      throw new BadRequestError("No items to start");
    }

    room.votes = {};
    room.status = RoomStatus.VOTING;

    console.log(`Starting room ${roomId} with item ${first}`);

    return this.createStartEvent(room, first);
  }

  /**
   * Records a vote from a player
   */
  vote(roomId: string, playerName: string, vote: string): { event: GameEvent; room: Room } {
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

    const players = this.roomService.getAllPlayers(room);
    const voteCount = Object.keys(room.votes).length;
    const votedPlayers = Object.keys(room.votes);

    const updateEvent: GameEvent = {
      event: "vote-status-update",
      voteCount,
      totalPlayers: players.length,
      votedPlayers,
      allPlayers: players,
    };

    return { event: updateEvent, room };
  }

  /**
   * Reveals votes and calculates results
   * Admin validation should be done by middleware before calling this
   */
  revealVotes(roomId: string): { results: VoteResults; isLastItem: boolean; event: GameEvent } {
    const room = this.roomService.getRoom(roomId);

    const votes = room.votes || {};
    if (Object.keys(votes).length === 0) {
      throw new BadRequestError("No votes to reveal");
    }

    const results = this.calculateVoteResults(votes);

    // Save to history
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

    const event: GameEvent = {
      event: "cards-revealed",
      results,
      isLastItem,
    };

    return { results, isLastItem, event };
  }

  /**
   * Repeats the current voting round
   * Admin validation should be done by middleware before calling this
   */
  repeatVoting(roomId: string): GameEvent {
    const room = this.roomService.getRoom(roomId);

    const current = room.items[0];
    if (!current) {
      throw new BadRequestError("No current item to repeat");
    }

    room.votes = {};
    room.status = RoomStatus.VOTING;

    return this.createStartEvent(room, current);
  }

  /**
   * Moves to the next item
   * Admin validation should be done by middleware before calling this
   */
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

    return this.createStartEvent(room, next);
  }

  /**
   * Shows the final summary
   * Admin validation should be done by middleware before calling this
   */
  showSummary(roomId: string): { summary: Summary; event: GameEvent } {
    const room = this.roomService.getRoom(roomId);

    const history = room.itemHistory;
    const totalAvg = history.length > 0 ? parseFloat((history.reduce((sum, i) => sum + i.average, 0) / history.length).toFixed(2)) : 0;

    const summary: Summary = {
      items: history,
      totalAverage: totalAvg,
      totalTasks: history.length,
    };

    room.status = RoomStatus.COMPLETED;

    const event: GameEvent = {
      event: "show-summary",
      summary,
    };

    return { summary, event };
  }

  /**
   * Gets current vote status
   */
  getVoteStatus(roomId: string) {
    const room = this.roomService.getRoom(roomId);
    const votes = room.votes || {};
    const players = this.roomService.getAllPlayers(room);

    return {
      voteCount: Object.keys(votes).length,
      totalPlayers: players.length,
      votedPlayers: Object.keys(votes),
      allPlayers: players,
    };
  }

  /**
   * Creates a start event for voting
   */
  private createStartEvent(room: Room, item: string): GameEvent {
    const players = this.roomService.getAllPlayers(room);

    return {
      event: "start",
      item,
      options: this.VOTING_OPTIONS,
      totalPlayers: players.length,
      allPlayers: players,
    };
  }

  /**
   * Calculates vote statistics
   */
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
