import express from 'express';
import path from 'path';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

// In-memory store for rooms
// Key: roomId, Value: { admin: User, users: User[], items: string[] }
const rooms = new Map();

// Middleware to parse JSON bodies
app.use(express.json());
// Serve static files from public
app.use(express.static(path.join(__dirname, '../../public')));

/**
 * User object
 * @typedef {{ name: string; ip: string }} User
 */

/**
 * POST /create
 * Creates a new room and returns its ID
 * Body: { name: string }
 */
app.post('/create', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const ip = req.ip;
  /** @type {User} */
  const admin = { name, ip };
  const roomId = uuidv4();

  rooms.set(roomId, {
    admin,
    users: [],
    items: []
  });

  res.json({ roomId });
});

/**
 * POST /join
 * Joins an existing room
 * Body: { name: string, roomId: string }
 */
app.post('/join', (req, res) => {
  const { name, roomId } = req.body;
  if (!name || !roomId) return res.status(400).json({ error: 'Name and roomId are required' });

  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const ip = req.ip;
  /** @type {User} */
  const user = { name, ip };
  room.users.push(user);

  res.json({ success: true });
});

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log(`HTTP server listening on http://localhost:${PORT}`);
});

// WebSocket server on /ws
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  // Expect clients to send initial message with roomId and role
  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }
    const { roomId, role, payload } = msg;
    const room = rooms.get(roomId);
    if (!room) return;

    // Attach ws to room if first message
    if (!ws.roomId) ws.roomId = roomId;

    // Broadcast payload to all clients in the same room
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === client.OPEN && client.roomId === roomId) {
        client.send(JSON.stringify({ from: role, payload }));
      }
    });
  });
});

export default server;
