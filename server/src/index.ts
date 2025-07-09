import express from "express";
import path from "path";
import fs from'fs';
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

// 3) Override just dashboard.html when CI=true
app.get("/dashboard.html", async (req, res, next) => {
  try {
    const filePath = path.join(publicDir, "dashboard.html")
    let html = await fs.promises.readFile(filePath, "utf-8")

    if (process.env.CI_PIPELINE === "true") {
      // replace any backend-url="..." with your CI backend URL
      const ciUrl = "http://localhost:3000"  // or pull from CI_BACKEND_URL env var
      html = html.replace(
        /backend-url="[^"]*"/,
        `backend-url="${ciUrl}"`
      )
    }

    res.type("html").send(html)
  } catch (err) {
    next(err)
  }
})

// 4) Everything else via static
app.use(express.static(publicDir))

// 5) Your API routes
app.use(router);

// 6) Error handler
app.use(errorHandler);

// 7) Start HTTP + WebSocket
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 HTTP on http://${HOST}:${PORT}`);
});
initWebSocket(server);

// 8) Graceful shutdown
process.on("SIGTERM", () => server.close());

export default server;
