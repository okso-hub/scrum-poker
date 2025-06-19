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
// Serve static files
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
  rooms.set(roomId, { admin, users: [], items: [] });
  console.log(`Room created: ${roomId} by admin ${name} (${ip})`);
  res.json({ roomId });
});

/**
 * POST /join
 * Joins an existing room, avoids duplicate joins by IP
 * Body: { name: string, roomId: string }
 */
app.post('/join', (req, res) => {
  const { name, roomId } = req.body;
  if (!name || !roomId) return res.status(400).json({ error: 'Name and roomId are required' });
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const ip = req.ip;
  const already = room.users.some(u => u.ip === ip);
  if (!already) {
    /** @type {User} */
    const user = { name, ip };
    room.users.push(user);
    console.log(`User ${name} (${ip}) joined room ${roomId}`);
    // Notify existing ws clients in this room
    wss.clients.forEach(client => {
      if (client.readyState === client.OPEN && client.roomId === roomId) {
        client.send(JSON.stringify({ event: 'user-joined', name }));
      }
    });
  } else {
    console.log(`User ${name} (${ip}) already in room ${roomId}`);
  }
  res.json({ success: true });
});

/**
 * GET /is-admin
 * Checks if current user is admin of the given room
 * Query: roomId
 */
app.get('/is-admin', (req, res) => {
  const { roomId } = req.query;
  if (!roomId) return res.status(400).json({ error: 'roomId is required' });
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const isAdmin = room.admin.ip === req.ip;
  console.log(`is-admin check for ${req.ip} in ${roomId}: ${isAdmin}`);
  res.json({ isAdmin });
});

/**
 * POST /room/:roomId/items
 * Admin-only: set items list for room
 * Body: { items: string[] }
 */
app.post('/room/:roomId/items', (req, res) => {
  const { roomId } = req.params;
  const { items } = req.body;
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.admin.ip !== req.ip) return res.status(403).json({ error: 'Forbidden' });
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Items must be an array of strings' });
  room.items = items;
  console.log(`Items set for room ${roomId}: ${items.join(', ')}`);
  res.json({ success: true });
});

/**
 * POST /room/:roomId/start
 * Admin-only: start voting, sends first item with options to clients
 */
app.post('/room/:roomId/start', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.admin.ip !== req.ip) return res.status(403).json({ error: 'Forbidden' });
  const first = room.items[0];
  if (!first) return res.status(400).json({ error: 'No items to start' });
  const event = { event: 'start', item: first, options: [1,2,3,4,5] };
  console.log(`Starting room ${roomId} with item ${first}`);
  wss.clients.forEach(client => {
    if (client.readyState === client.OPEN && client.roomId === roomId) {
      client.send(JSON.stringify(event));
    }
  });
  res.json({ success: true });
});

// Start HTTP server and WebSocket server
const server = app.listen(PORT, () => console.log(`HTTP server on http://localhost:${PORT}`));
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  console.log(`WebSocket connected: ${req.socket.remoteAddress}`);
  ws.on('message', data => {
    let msg;
    try { msg = JSON.parse(data); } catch(e) { return; }
    const { roomId, role, payload } = msg;
    const room = rooms.get(roomId);
    if (!room) return;
    if (!ws.roomId) ws.roomId = roomId;
    console.log(`Received from ${role}@${ws.roomId}:`, payload);
    wss.clients.forEach(client => {
      if (client !== ws && client.readyState === client.OPEN && client.roomId === roomId) {
        client.send(JSON.stringify({ from: role, payload }));
      }
    });
  });
  ws.on('close', () => console.log(`WebSocket closed: ${ws.roomId}`));
});

export default server;
