import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { initWebSocket } from "./utils/ws.js";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

// nur für testing
app.set("trust proxy", true);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "../../public")));

// Routes
app.use(routes);

// Start HTTP + WS servers
const server = app.listen(PORT, () => console.log(`HTTP on http://localhost:${PORT}`));
const wss = initWebSocket(server);

// Error handling middleware (must be last)
app.use(errorHandler);

process.on("SIGTERM", () => {
  server.close();
});

export default server;
