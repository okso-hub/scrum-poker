import express, { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { v4 as uuidv4 } from "uuid";
import { IncomingMessage } from "http";
import { initWebSocket, broadcast, disconnectUser } from "./utils/ws.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

// TypeScript Interfaces
interface User {
  name: string;
  ip: string;
}

interface Admin {
  name: string;
  ip: string;
}

interface VoteResults {
  votes: Record<string, string>;
  summary: Record<string, number>;
  average: number;
  totalVotes: number;
  participants: string[];
}

interface ItemHistory {
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

interface Room {
  admin: Admin;
  users: User[];
  items: string[];
  itemHistory: ItemHistory[];
  votes?: Record<string, string>;
  status: RoomStatus;
  bannedIps: string[];
}

type CustomWebSocket = WebSocket & {
  roomId?: string;
  role?: string;
  playerName?: string;
  isAlive?: boolean;
};

interface Summary {
  items: ItemHistory[];
  totalAverage: number;
  totalTasks: number;
}

// Global state
const rooms = new Map<string, Room>();

// nur für testing
app.set("trust proxy", true);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "../../public")));

// Start HTTP + WS servers
const server = app.listen(PORT, () => console.log(`HTTP on http://localhost:${PORT}`));
const wss = initWebSocket(server);

/**
 * POST /create
 */
app.post("/create", (req: Request, res: Response) => {
  const { name }: { name?: string } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });

  const ip = req.ip || "unknown";
  const roomId = uuidv4();

  rooms.set(roomId, {
    admin: { name, ip },
    users: [],
    items: [],
    itemHistory: [],
    status: RoomStatus.SETUP,
    bannedIps: [],
  });

  console.log(`Room created: ${roomId} by admin ${name} (${ip})`);
  res.json({ roomId });
});

/**
 * POST /join
 */
app.post("/join", (req: Request, res: Response) => {
  const { name, roomId }: { name?: string; roomId?: string } = req.body;
  if (!name || !roomId) return res.status(400).json({ error: "Name and roomId are required" });

  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });

  const ip = req.ip || "unknown";

  // Build minimal state for client
  const roomState = {
    status: room.status,
    currentItem: room.items[0] || null,
  };

  // Admin rejoin
  if (room.admin.ip === ip) {
    console.log(`Admin ${room.admin.name} (${ip}) rejoined room ${roomId}`);
    broadcast(roomId, { event: "user-joined", rejoin: true, user: name });
    return res.json({ success: true, isAdmin: true, name: room.admin.name, roomState });
  }

  // Player join/rejoin
  const existing = room.users.find((u) => u.ip === ip);
  if (!existing) {
    room.users.push({ name, ip });
    console.log(`User ${name} (${ip}) joined room ${roomId}`);
    broadcast(roomId, { event: "user-joined", rejoin: false, user: name });
    return res.json({ success: true, isAdmin: false, name, roomState });
  } else {
    console.log(`User ${existing.name} (${ip}) rejoined room ${roomId}`);
    broadcast(roomId, { event: "user-joined", rejoin: true, user: name });
    return res.json({ success: true, isAdmin: false, name: existing.name, roomState });
  }
});

/**
 * GET /is-admin
 */
app.get("/is-admin", (req: Request, res: Response) => {
  const { roomId } = req.query;
  if (!roomId || typeof roomId !== "string") {
    return res.status(400).json({ error: "roomId is required" });
  }
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });
  const isAdmin = room.admin.ip === (req.ip || "unknown");
  console.log(`is-admin: ${req.ip} in ${roomId} = ${isAdmin}`);
  res.json({ isAdmin });
});

/**
 * GET /room/:roomId/items
 */
app.get("/room/:roomId/items", (req: Request, res: Response) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });
  res.json({ items: room.items });
});

/**
 * Admin-only: set items
 */
app.post("/room/:roomId/items", (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { items }: { items?: string[] } = req.body;
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (room.admin.ip !== (req.ip || "unknown")) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: "Items must be an array" });
  }

  room.items = items;
  // → SETUP → ITEMS_SUBMITTED
  room.status = RoomStatus.ITEMS_SUBMITTED;

  console.log(`Items set for room ${roomId}: ${items}`);
  res.json({ success: true });
});

/**
 * Admin-only: start voting
 */
app.post("/room/:roomId/start", (req: Request, res: Response) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (room.admin.ip !== (req.ip || "unknown")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const first = room.items[0];
  if (!first) return res.status(400).json({ error: "No items to start" });

  room.votes = {};

  const event = {
    event: "start",
    item: first,
    options: [1, 2, 3, 5, 8, 13, 21],
    totalPlayers: room.users.length + 1,
    allPlayers: [room.admin.name, ...room.users.map((u) => u.name)],
  };

  console.log(`Starting room ${roomId} with item ${first}`);
  broadcast(roomId, event);

  // → ITEMS_SUBMITTED → VOTING
  room.status = RoomStatus.VOTING;

  res.json({ success: true });
});

/**
 * POST /room/:roomId/vote
 */
app.post("/room/:roomId/vote", (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { vote, playerName }: { vote?: string; playerName?: string } = req.body;
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (!playerName) return res.status(400).json({ error: "Player name is required" });
  if (!vote) return res.status(400).json({ error: "Vote is required" });

  const players = [room.admin.name, ...room.users.map((u) => u.name)];
  if (!players.includes(playerName)) {
    return res.status(403).json({ error: "Player not in room" });
  }

  if (!room.votes) room.votes = {};
  room.votes[playerName] = vote;
  console.log(`Vote from ${playerName} in ${roomId}: ${vote}`);

  const voteCount = Object.keys(room.votes).length;
  const totalPlayers = players.length;
  const votedPlayers = Object.keys(room.votes);

  //generelle frage code review: immer daten wie allUsers mitschicken oder nicht
  const updateData = {
    event: "vote-status-update",
    voteCount,
    totalPlayers,
    votedPlayers,
    allPlayers: players,
  };

  broadcast(roomId, updateData);

  res.json({ success: true });
});

/**
 * Admin-only: reveal votes
 */
app.post("/room/:roomId/reveal", (req: Request, res: Response) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (room.admin.ip !== (req.ip || "unknown")) {
    return res.status(403).json({ error: "Only admin can reveal votes" });
  }

  const votes = room.votes || {};
  if (Object.keys(votes).length === 0) {
    return res.status(400).json({ error: "No votes to reveal" });
  }

  const results = calculateVoteResults(votes);

  // save history
  const current = room.items[0];
  if (current) {
    room.itemHistory.push({
      item: current,
      average: results.average,
      votes: results.votes,
      summary: results.summary,
    });
  }

  const isLast = room.items.length <= 1;

  broadcast(roomId, { event: "cards-revealed", results, isLastItem: isLast });

  // → VOTING → REVEALING
  room.status = RoomStatus.REVEALING;

  res.json({ success: true, results, isLastItem: isLast });
});

/**
 * POST /room/:roomId/repeat — Admin repeats current voting
 */
app.post("/room/:roomId/repeat", (req: Request, res: Response) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (room.admin.ip !== (req.ip || "unknown")) {
    return res.status(403).json({ error: "Only admin can repeat voting" });
  }

  const current = room.items[0];
  if (!current) {
    return res.status(400).json({ error: "No current item to repeat" });
  }

  // reset votes
  room.votes = {};

  // send the same “start” event back to everybody
  const event = {
    event: "start",
    item: current,
    options: [1, 2, 3, 5, 8, 13, 21],
    totalPlayers: room.users.length + 1,
    allPlayers: [room.admin.name, ...room.users.map((u) => u.name)],
  };

  broadcast(roomId, event);

  // move back into VOTING state
  room.status = RoomStatus.VOTING;

  res.json({ success: true, item: current });
});

/**
 * Admin-only: next item
 */
app.post("/room/:roomId/next", (req: Request, res: Response) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (room.admin.ip !== (req.ip || "unknown")) {
    return res.status(403).json({ error: "Only admin can start next item" });
  }

  if (room.items.length > 1) {
    room.items.shift();
    const next = room.items[0];
    room.votes = {};

    const event = {
      event: "start",
      item: next,
      options: [1, 2, 3, 5, 8, 13, 21],
      totalPlayers: room.users.length + 1,
      allPlayers: [room.admin.name, ...room.users.map((u) => u.name)],
    };

    console.log(`Next item started for room ${roomId}: ${next}`);

    broadcast(roomId, event);

    // → REVEALING → VOTING
    room.status = RoomStatus.VOTING;

    return res.json({ success: true, item: next });
  } else {
    return res.status(400).json({ error: "No more items" });
  }
});

/**
 * Admin-only: show summary
 */
app.post("/room/:roomId/summary", (req: Request, res: Response) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (room.admin.ip !== (req.ip || "unknown")) {
    return res.status(403).json({ error: "Only admin can show summary" });
  }

  const history = room.itemHistory;
  const totalAvg = history.length > 0 ? parseFloat((history.reduce((sum, i) => sum + i.average, 0) / history.length).toFixed(2)) : 0;

  const summary: Summary = {
    items: history,
    totalAverage: totalAvg,
    totalTasks: history.length,
  };

  broadcast(roomId, { event: "show-summary", summary });

  // → REVEALING → COMPLETED
  room.status = RoomStatus.COMPLETED;

  res.json({ success: true, summary });
});

/**
 * GET /room/:roomId/participants
 */
app.get("/room/:roomId/participants", (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });

  const participants = [room.admin.name, ...room.users.map((u) => u.name)];
  res.json({ participants });
});

/**
 * GET /room/:roomId/vote-status
 */
app.get("/room/:roomId/vote-status", (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });

  const votes = room.votes || {};
  res.json({
    voteCount: Object.keys(votes).length,
    totalPlayers: room.users.length + 1,
    votedPlayers: Object.keys(votes),
    allPlayers: [room.admin.name, ...room.users.map((u) => u.name)],
  });
});

/**
 * GET /room/:roomId/status
 */
app.get("/room/:roomId/status", (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });

  res.json({
    status: room.status,
    currentItem: room.items[0] || null,
    itemsRemaining: room.items.length,
    votesCount: Object.keys(room.votes || {}).length,
    totalPlayers: room.users.length + 1,
    completedItems: room.itemHistory.length,
  });
});

// Ban-Endpoint nach Umbau
app.post("/room/:roomId/ban", (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { userName }: { userName?: string } = req.body;
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }
  // Nur der Admin darf bannen
  if (room.admin.ip !== req.ip) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (!userName) {
    return res.status(400).json({ error: "userName is required" });
  }

  // Admin darf sich nicht selber bannen
  if (userName === room.admin.name) {
    return res.status(400).json({ error: "Cannot ban the admin" });
  }

  // Finde User im Raum
  const user = room.users.find((u) => u.name === userName);
  if (!user) {
    return res.status(404).json({ error: "User not in room" });
  }

  // Ban-IP speichern
  room.bannedIps.push(user.ip);

  disconnectUser(roomId, userName);

  // Broadcast an alle anderen Clients
  broadcast(roomId, {
    event: "user-banned",
    user: userName,
  });

  return res.json({ success: true });
});

// Unban (optional)
app.delete("/room/:roomId/ban/:ip", (req, res) => {
  const { roomId, ip } = req.params;
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (room.admin.ip !== req.ip) return res.status(403).json({ error: "Forbidden" });
  room.bannedIps = room.bannedIps.filter((x) => x !== ip);
  res.json({ success: true });
});

process.on("SIGTERM", () => {
  server.close();
});

export default server;

/**
 * Helper: calculate vote statistics
 */
function calculateVoteResults(votes: Record<string, string>): VoteResults {
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
