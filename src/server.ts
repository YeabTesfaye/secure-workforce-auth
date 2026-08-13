import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { closeDatabase } from "./infrastructure/database/client.js";
import { closeRedis } from "./infrastructure/redis/client.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`SecureWorkforce Auth Platform listening on port ${env.PORT} (${env.NODE_ENV})`);
  console.log(`API docs: http://localhost:${env.PORT}/docs`);
});

async function shutdown(signal: string) {
  console.log(`\nReceived ${signal}, shutting down gracefully...`);
  server.close(async () => {
    await closeDatabase();
    await closeRedis();
    console.log("Shutdown complete.");
    process.exit(0);
  });
  // Force-exit if graceful shutdown hangs.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
