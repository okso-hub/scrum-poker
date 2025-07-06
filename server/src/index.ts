import express from "express";
import path from "path";
import { initWebSocket } from "./utils/ws.js";
import router from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";

// Ensure HOST is a string, PORT a number
const HOST = process.env.HOST || "localhost";
const PORT = parseInt(process.env.PORT ?? "3000", 10);

const app = express();

// 1) Compute your public directory based on the working-dir
const publicDir = path.resolve(process.cwd(), "public");
console.log("🗂️  Serving static files from:", publicDir);

// 2) Middleware
app.set("trust proxy", true);
app.use(express.json());
app.use(express.static(publicDir));

// 3) Your API routes
app.use(router);

// 5) Error handler
app.use(errorHandler);

// 6) Start HTTP + WebSocket
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 HTTP on http://${HOST}:${PORT}`);
});
initWebSocket(server);

// 7) Graceful shutdown
process.on("SIGTERM", () => server.close());

export default server;
