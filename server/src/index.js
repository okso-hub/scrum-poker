import express from 'express';
import path from 'path';
import WebSocket, { WebSocketServer } from 'ws';
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
  rooms.set(roomId, { admin: { name, ip }, users: [], items: [], itemHistory: [] });
  console.log(`Room created: ${roomId} by admin ${name} (${ip})`);
  res.json({ roomId });
});

// Start servers
const server = app.listen(PORT, () => console.log(`HTTP on http://localhost:${PORT}`));
const wss = new WebSocketServer({ server, path: '/ws' });

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
  
  // Reset votes when starting new voting round
  room.votes = {};
  
  const event = { 
  event: 'start', 
  item: first, 
  options: [1,2,3,5,8,13,21],
  totalPlayers: room.users.length + 1,
  allPlayers: [room.admin.name, ...room.users.map(u => u.name)]
};
  console.log(`Starting room ${roomId} with item ${first}`);
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN && c.roomId === roomId) c.send(JSON.stringify(event));
  });
  res.json({ success: true });
});

/**
 * POST /room/:roomId/vote - Player submits vote
 */
app.post('/room/:roomId/vote', (req, res) => {
  const { roomId } = req.params;
  const { vote, playerName } = req.body;
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  
  if (!playerName) return res.status(400).json({ error: 'Player name is required' });
  if (!vote) return res.status(400).json({ error: 'Vote is required' });
  
  // Verify player exists in room
  const roomPlayers = [room.admin.name, ...room.users.map(u => u.name)];
  if (!roomPlayers.includes(playerName)) {
    return res.status(403).json({ error: 'Player not found in room' });
  }
  
  // Initialize votes if needed
  if (!room.votes) room.votes = {};
  
  // Store the vote
  room.votes[playerName] = vote;
  console.log(`Vote from ${playerName} in ${roomId}: ${vote}`);
  console.log(`Current votes in room ${roomId}:`, room.votes);
  
  // Send vote status update to all participants
  const voteCount = Object.keys(room.votes).length;
  const totalPlayers = room.users.length + 1; // +1 for admin
  const votedPlayers = Object.keys(room.votes);
  const allPlayers = [room.admin.name, ...room.users.map(u => u.name)];
  
  const updateData = { 
    event: 'vote-status-update', 
    voteCount, 
    totalPlayers,
    votedPlayers,
    allPlayers
  };
  
  console.log(`Sending vote status update to room ${roomId}:`, updateData);
  
  let sentCount = 0;
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN && c.roomId === roomId) {
      c.send(JSON.stringify(updateData));
      sentCount++;
    }
  });
  
  console.log(`Vote status update sent to ${sentCount} clients in room ${roomId}`);
  
  res.json({ success: true });
});

/**
 * POST /room/:roomId/reveal - Admin reveals all votes and shows results
 */
app.post('/room/:roomId/reveal', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.admin.ip !== req.ip) return res.status(403).json({ error: 'Only admin can reveal votes' });
  
  const votes = room.votes || {};
  if (Object.keys(votes).length === 0) {
    return res.status(400).json({ error: 'No votes to reveal' });
  }
  
  // Calculate statistics
  const results = calculateVoteResults(votes);
  
  console.log(`Admin revealed votes for room ${roomId}:`, results);
  
  // Save to history
  const currentItem = room.items[0];
  if (currentItem) {
    if (!room.itemHistory) room.itemHistory = [];
    room.itemHistory.push({
      item: currentItem,
      average: results.average,
      votes: results.votes,
      summary: results.summary
    });
  }
  
  // Check if this is the last item
  const isLastItem = room.items.length <= 1;
  
  // Send results to all participants via WebSocket
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN && c.roomId === roomId) {
      c.send(JSON.stringify({ 
        event: 'cards-revealed', 
        results,
        isLastItem
      }));
    }
  });
  
  res.json({ success: true, results, isLastItem });
});

/**
 * POST /room/:roomId/next - Admin starts next item
 */
app.post('/room/:roomId/next', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.admin.ip !== req.ip) return res.status(403).json({ error: 'Only admin can start next item' });
  
  // Remove first item and get next
  if (room.items.length > 1) {
    room.items.shift(); // Remove current item
    const nextItem = room.items[0];
    room.votes = {}; // Reset votes
    
    const event = { 
  event: 'start', 
  item: nextItem, 
  options: [1,2,3,5,8,13,21],
  totalPlayers: room.users.length + 1,
  allPlayers: [room.admin.name, ...room.users.map(u => u.name)]
};
    console.log(`Next item started for room ${roomId}: ${nextItem}`);
    
    wss.clients.forEach(c => {
      if (c.readyState === WebSocket.OPEN && c.roomId === roomId) {
        c.send(JSON.stringify(event));
      }
    });
    
    res.json({ success: true, item: nextItem });
  } else {
    res.status(400).json({ error: 'No more items' });
  }
});

/**
 * POST /room/:roomId/repeat - Admin repeats current voting
 */
app.post('/room/:roomId/repeat', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.admin.ip !== req.ip) return res.status(403).json({ error: 'Only admin can repeat voting' });
  
  const currentItem = room.items[0];
  if (!currentItem) return res.status(400).json({ error: 'No current item' });
  
  room.votes = {}; // Reset votes
  
  const event = { 
  event: 'start', 
  item: currentItem, 
  options: [1,2,3,5,8,13,21],
  totalPlayers: room.users.length + 1,
  allPlayers: [room.admin.name, ...room.users.map(u => u.name)]
};
  console.log(`Repeat voting for room ${roomId}: ${currentItem}`);
  
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN && c.roomId === roomId) {
      c.send(JSON.stringify(event));
    }
  });
  
  res.json({ success: true, item: currentItem });
});

/**
 * POST /room/:roomId/summary - Admin shows final summary
 */
app.post('/room/:roomId/summary', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.admin.ip !== req.ip) return res.status(403).json({ error: 'Only admin can show summary' });
  
  const itemHistory = room.itemHistory || [];
  const totalAverage = itemHistory.length > 0 
    ? parseFloat((itemHistory.reduce((sum, item) => sum + item.average, 0) / itemHistory.length).toFixed(2))
    : 0;
  
  const summary = {
    items: itemHistory,
    totalAverage,
    totalTasks: itemHistory.length
  };
  
  console.log(`Summary requested for room ${roomId}:`, summary);
  
  // Send summary to all participants
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN && c.roomId === roomId) {
      c.send(JSON.stringify({ 
        event: 'show-summary', 
        summary 
      }));
    }
  });
  
  res.json({ success: true, summary });
});

/**
 * Helper function to calculate vote statistics
 */
function calculateVoteResults(votes) {
  const results = {
    votes,                    // { "PlayerName": "3", "AdminName": "5" }
    summary: {},              // { "1": 2, "3": 1, "5": 1 }
    average: 0,               // 2.5
    totalVotes: 0,            // 4
    participants: []          // ["PlayerName", "AdminName"]
  };
  
  const voteValues = Object.values(votes);
  const voteEntries = Object.entries(votes);
  
  results.totalVotes = voteEntries.length;
  results.participants = Object.keys(votes);
  
  // Count occurrences of each vote value
  voteValues.forEach(vote => {
    results.summary[vote] = (results.summary[vote] || 0) + 1;
  });
  
  // Calculate average (only for numeric votes)
  const numericVotes = voteValues
    .map(vote => parseFloat(vote))
    .filter(vote => !isNaN(vote));
  
  if (numericVotes.length > 0) {
    const sum = numericVotes.reduce((acc, val) => acc + val, 0);
    results.average = parseFloat((sum / numericVotes.length).toFixed(2));
  }
  
  return results;
}

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

/**
 * GET /room/:roomId/vote-status
 * Returns current vote status for polling
 */
app.get('/room/:roomId/vote-status', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  
  const voteCount = Object.keys(room.votes || {}).length;
  const totalPlayers = room.users.length + 1; // +1 for admin
  const votedPlayers = Object.keys(room.votes || {});
  const allPlayers = [room.admin.name, ...room.users.map(u => u.name)];
  
  res.json({
    voteCount,
    totalPlayers,
    votedPlayers,
    allPlayers
  });
});

wss.on('connection', (ws, req) => {
  console.log(`WS connected: ${req.socket.remoteAddress}`);
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', data => {
    const msg = data.toString();
    if (!ws.roomId) {
      // Handle initial connection message
      try {
        const parsed = JSON.parse(msg);
        if (parsed.roomId) {
          ws.roomId = parsed.roomId;
          ws.role = parsed.role;
          ws.playerName = parsed.payload?.name;
          console.log(`Assigned ws: ${ws.playerName} (${ws.role}) to room ${ws.roomId}`);
        }
      } catch {
        ws.roomId = msg;
        console.log(`Assigned ws to room ${ws.roomId}`);
      }
      return;
    }
    
    let parsed;
    try { parsed = JSON.parse(msg); } catch { return; }
    
    // Handle vote messages
    if (parsed.type === 'vote') {
      const room = rooms.get(ws.roomId);
      if (room && ws.playerName) {
        if (!room.votes) room.votes = {};
        room.votes[ws.playerName] = parsed.value;
        console.log(`Vote via WS from ${ws.playerName} in ${ws.roomId}: ${parsed.value}`);
      }
      return;
    }
    
    // Handle legacy messages
    if (parsed.role && parsed.payload !== undefined) {
      console.log(`Received from ${parsed.role}@${ws.roomId}:`, parsed.payload);
      wss.clients.forEach(c => {
        if (c !== ws && c.readyState === WebSocket.OPEN && c.roomId === ws.roomId) {
          c.send(JSON.stringify({ from: parsed.role, payload: parsed.payload }));
        }
      });
    }
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
