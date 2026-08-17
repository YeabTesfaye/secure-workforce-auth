import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, closeDatabase } from "./client.js";

async function main() {
  console.log("Running database migrations...");
  await migrate(db, { migrationsFolder: "./db/migrations" });
  console.log("Migrations complete.");
  await closeDatabase();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
