import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { db } from "../../src/infrastructure/database/client.js";
import { auditLogs } from "../../db/schema/index.js";
import { eq } from "drizzle-orm";

const app = createApp();

describe("brute-force protection and account lockout (security)", () => {
  it("locks the account after LOGIN_FAILURE_THRESHOLD consecutive failures", async () => {
    const email = "bruteforce@example.com";
    await request(app).post("/auth/register").send({ email, password: "CorrectHorseBattery9!" });

    const threshold = Number(process.env.LOGIN_FAILURE_THRESHOLD ?? 5);

    for (let i = 0; i < threshold; i++) {
      const res = await request(app).post("/auth/login").send({ email, password: "WrongPassword!" });
      expect(res.status).toBe(401);
    }

    // The next attempt, even with the CORRECT password, must be locked out.
    const lockedRes = await request(app).post("/auth/login").send({ email, password: "CorrectHorseBattery9!" });
    expect(lockedRes.status).toBe(423);

    const events = await db.select().from(auditLogs).where(eq(auditLogs.event, "ACCOUNT_LOCKED"));
    expect(events.length).toBeGreaterThanOrEqual(1);
  });

  it("does not lock the account after a successful login resets the counter", async () => {
    const email = "resetcounter@example.com";
    await request(app).post("/auth/register").send({ email, password: "CorrectHorseBattery9!" });

    await request(app).post("/auth/login").send({ email, password: "WrongPassword!" });
    await request(app).post("/auth/login").send({ email, password: "WrongPassword!" });

    const goodLogin = await request(app).post("/auth/login").send({ email, password: "CorrectHorseBattery9!" });
    expect(goodLogin.status).toBe(200);

    // Counter should be cleared; a few more bad guesses shouldn't lock yet.
    const afterReset = await request(app).post("/auth/login").send({ email, password: "WrongPassword!" });
    expect(afterReset.status).toBe(401);
  });
});
