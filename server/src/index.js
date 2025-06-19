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
const rooms = new Map();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public')));

/**
 * POST /create
 */
app.post('/create', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const ip = req.ip;
  const roomId = uuidv4();
  rooms.set(roomId, { admin: { name, ip }, users: [], items: [] });
  console.log(`Room created: ${roomId} by admin ${name} (${ip})`);
  res.json({ roomId });
});

/**
 * POST /join
 */
app.post('/join', (req, res) => {
  const { name, roomId } = req.body;
  if (!name || !roomId) return res.status(400).json({ error: 'Name and roomId are required' });
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const ip = req.ip;
  const exists = room.users.some(u => u.ip === ip);
  if (!exists) {
    room.users.push({ name, ip });
    console.log(`User ${name} (${ip}) joined room ${roomId}`);
    // notify others via WS
    wss.clients.forEach(c => {
      if (c.readyState === WebSocket.OPEN && c.roomId === roomId) {
        c.send(JSON.stringify({ event: 'user-joined', name }));
      }
    });
  } else {
    console.log(`User ${name} (${ip}) already in room ${roomId}`);
  }
  res.json({ success: true });
});

/**
 * GET /is-admin
 */
app.get('/is-admin', (req, res) => {
  const { roomId } = req.query;
  if (!roomId) return res.status(400).json({ error: 'roomId is required' });
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const isAdmin = room.admin.ip === req.ip;
  console.log(`is-admin: ${req.ip} in ${roomId} = ${isAdmin}`);
  res.json({ isAdmin });
});

/**
 * Admin-only: set items
 */
app.post('/room/:roomId/items', (req, res) => {
  const { roomId } = req.params;
  const { items } = req.body;
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.admin.ip !== req.ip) return res.status(403).json({ error: 'Forbidden' });
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Items must be an array' });
  room.items = items;
  console.log(`Items set for room ${roomId}: ${items}`);
  res.json({ success: true });
});

/**
 * Admin-only: start voting
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
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN && c.roomId === roomId) c.send(JSON.stringify(event));
  });
  res.json({ success: true });
});


/**
 * GET /room/:roomId/participants
 * Returns list of participants (admin + users)
 */
app.get('/room/:roomId/participants', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  // Build participants list (names only)
  const participants = [
    room.admin.name,
    ...room.users.map(u => u.name)
  ];
  console.log(`Participants for room ${roomId}:`, participants);
  res.json({ participants });
});

// Start servers
const server = app.listen(PORT, () => console.log(`HTTP on http://localhost:${PORT}`));
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  console.log(`WS connected: ${req.socket.remoteAddress}`);
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', data => {
    const msg = data.toString();
    if (!ws.roomId) {
      ws.roomId = msg;
      console.log(`Assigned ws to room ${ws.roomId}`);
      return;
    }
    let parsed;
    try { parsed = JSON.parse(msg); } catch { return; }
    const { role, payload } = parsed;
    console.log(`Received from ${role}@${ws.roomId}:`, payload);
    wss.clients.forEach(c => {
      if (c !== ws && c.readyState === WebSocket.OPEN && c.roomId === ws.roomId) {
        c.send(JSON.stringify({ from: role, payload }));
      }
    });
  });

  ws.on('close', () => console.log(`WS closed for room ${ws.roomId}`));
});

// Ping/pong to keep alive
const interval = setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

process.on('SIGTERM', () => { clearInterval(interval); server.close(); });

export default server;
