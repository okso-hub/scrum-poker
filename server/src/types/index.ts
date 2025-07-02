// Server Types
export interface User {
  name: string;
  ip: string;
}

export interface Admin {
  name: string;
  ip: string;
}

export interface VoteResults {
  votes: Record<string, string>;
  summary: Record<string, number>;
  average: number;
  totalVotes: number;
  participants: string[];
}

export interface ItemHistory {
  item: string;
  average: number;
  votes: Record<string, string>;
  summary: Record<string, number>;
}

export enum RoomStatus {
  SETUP = "setup", // No items submitted yet
  ITEMS_SUBMITTED = "items_submitted", // Admin has entered items
  VOTING = "voting", // A round is in progress
  REVEALING = "revealing", // Votes have been revealed
  COMPLETED = "completed", // All items done, summary shown
}

export interface Room {
  admin: Admin;
  users: User[];
  items: string[];
  itemHistory: ItemHistory[];
  votes?: Record<string, string>;
  status: RoomStatus;
  bannedIps: string[];
}

export type CustomWebSocket = WebSocket & {
  roomId?: string;
  role?: string;
  playerName?: string;
  isAlive?: boolean;
};

export interface Summary {
  items: ItemHistory[];
  totalAverage: number;
  totalTasks: number;
}

export interface GameEvent {
  event: string;
  item?: string;
  options?: number[];
  totalPlayers?: number;
  allPlayers?: string[];
  results?: VoteResults;
  isLastItem?: boolean;
  summary?: Summary;
  voteCount?: number;
  votedPlayers?: string[];
}

// Error Classes
export class AppError extends Error {
  constructor(message: string, public statusCode: number = 500, public code?: string) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(message, 403, "FORBIDDEN");
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = "Bad request") {
    super(message, 400, "BAD_REQUEST");
  }
}
