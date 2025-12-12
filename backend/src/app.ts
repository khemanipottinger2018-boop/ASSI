import express from "express";
import http from "http";
import cors from "cors";
import { redisService } from "./infra/redis/redis.service";
import { createSocketServer } from "./infra/socket/socket-server";


const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ---------------- STARTUP ----------------
async function bootstrap() {
  await redisService.connect();
  console.log("🔵 Redis connected");

  await createSocketServer(server);
  console.log("🟢 Socket.IO initialized");
}

bootstrap().catch((err) => {
  console.error("❌ Startup failed", err);
  process.exit(1);
});

// ---------------- ROUTES ----------------

// Health check
app.get("/health", async (req, res) => {
  try {
    const ping = await redisService.ping();
    res.json({
      status: "ok",
      redis: ping,
      timestamp: Date.now(),
    });
  } catch (err) {
    res.status(500).json({ status: "error", error: err });
  }
});

// Redis test
app.get("/redis-test", async (req, res) => {
  try {
    await redisService.client.set("test-key", "hello world");
    const value = await redisService.client.get("test-key");

    res.json({
      test: value,
      redisStatus: "working",
    });
  } catch (err) {
    res.status(500).json({ status: "error", error: err });
  }
});

// Root
app.get("/", (req, res) => {
  res.send("ASSI backend is running.");
});

export default server;
