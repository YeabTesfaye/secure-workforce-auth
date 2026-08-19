import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { closeDatabase } from "./infrastructure/database/client.js";
import { closeRedis } from "./infrastructure/redis/client.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`SecureWorkforce Auth Platform listening on port ${env.PORT} (${env.NODE_ENV})`);
  console.log(`API docs: http://localhost:${env.PORT}/docs`);
});

// Track active connections for graceful draining
let isShuttingDown = false;

async function shutdown(signal: string) {
  if (isShuttingDown) return; // Prevent double-shutdown from SIGTERM + SIGINT
  isShuttingDown = true;

  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // 1. Stop accepting new connections
  server.close(async (err) => {
    if (err) {
      console.error("Error closing HTTP server:", err);
    }

    // 2. Close database and Redis connections
    try {
      await Promise.all([
        closeDatabase().catch((e: Error) => console.error("Error closing database:", e.message)),
        closeRedis().catch((e: Error) => console.error("Error closing Redis:", e.message)),
      ]);
      console.log("Database and Redis connections closed.");
    } catch (err) {
      console.error("Error during infrastructure shutdown:", err);
    }

    console.log("Shutdown complete.");
    process.exit(0);
  });

  // Force-kill if graceful shutdown takes too long (e.g., stuck transactions)
  const forceExitTimer = setTimeout(() => {
    console.error("Forced shutdown after timeout — some connections may not have closed cleanly.");
    process.exit(1);
  }, 15_000);
  forceExitTimer.unref();
}

// Handle termination signals
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

// Handle unhandled rejections — log and continue (don't crash the server
// for a single failed promise, but do make it visible)
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Handle uncaught exceptions — these are more serious; log and exit
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  void shutdown("UNCAUGHT_EXCEPTION");
});
