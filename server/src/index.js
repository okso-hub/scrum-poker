import express from 'express';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../../public')));

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log(`HTTP server listening on http://localhost:${PORT}`);
});

// WebSocket: mount separate paths for /player and /admin
const wssPlayer = new WebSocketServer({ server, path: '/player' });
const wssAdmin = new WebSocketServer({ server, path: '/admin' });

wssPlayer.on('connection', (ws) => {
  console.log('Player connected');
  ws.on('message', (message) => {
    // Broadcast to admin
    wssAdmin.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });
});

wssAdmin.on('connection', (ws) => {
  console.log('Admin connected');
  ws.on('message', (message) => {
    // Broadcast to all players
    wssPlayer.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });
});

export default server;
