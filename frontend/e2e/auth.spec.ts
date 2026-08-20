import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

// Demo credentials seeded in the database
const DEMO_USER = {
  email: "alice@acme.com",
  password: "DemoPassword123!",
  name: "Alice",
};

test.describe("Authentication flow", () => {
  test("landing page loads without auth", async ({ page }) => {
    await page.goto(BASE_URL);

    // Should see the landing page hero
    await expect(page.locator("text=SecureWorkforce")).toBeVisible();
    await expect(page.locator("text=Production-grade")).toBeVisible();

    // Should see CTA buttons
    await expect(page.locator("text=Get started")).toBeVisible();
    await expect(page.locator("text=Sign in")).toBeVisible();
  });

  test("login with demo account redirects to dashboard", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Click the demo account card for Alice
    await page.click(`text=${DEMO_USER.email}`);

    // Password field should be auto-filled
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toHaveValue(DEMO_USER.password);

    // Click sign in button
    await page.click('button:has-text("Sign in")');

    // Should redirect to dashboard
    await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10_000 });

    // Should see dashboard content
    await expect(page.locator("text=Welcome")).toBeVisible();
  });

  test("login with email/password redirects to dashboard", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Fill in credentials manually
    await page.fill('input[type="email"]', DEMO_USER.email);
    await page.fill('input[type="password"]', DEMO_USER.password);

    await page.click('button:has-text("Sign in")');

    // Should redirect to dashboard
    await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10_000 });
    await expect(page.locator("text=Welcome")).toBeVisible();
  });

  test("wrong password shows error", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    await page.fill('input[type="email"]', DEMO_USER.email);
    await page.fill('input[type="password"]', "WrongPassword123!");

    await page.click('button:has-text("Sign in")');

    // Should show error (not redirect)
    await expect(page.locator("text=Invalid")).toBeVisible({ timeout: 5_000 });
    expect(page.url()).toContain("/login");
  });

  test("logout returns to login page", async ({ page }) => {
    // Log in first
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', DEMO_USER.email);
    await page.fill('input[type="password"]', DEMO_USER.password);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10_000 });

    // Click logout button in nav
    await page.click('button[title="Log out"]');

    // Should redirect to login
    await page.waitForURL(`${BASE_URL}/login`, { timeout: 5_000 });
  });

  test("logged-in user cannot visit login page", async ({ page }) => {
    // Log in first
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', DEMO_USER.email);
    await page.fill('input[type="password"]', DEMO_USER.password);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10_000 });

    // Try to visit login page — should redirect to dashboard
    await page.goto(`${BASE_URL}/login`);
    await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 5_000 });
  });
});

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    // Log in
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', DEMO_USER.email);
    await page.fill('input[type="password"]', DEMO_USER.password);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10_000 });
  });

  test("can navigate to members page", async ({ page }) => {
    await page.click('a[href="/members"]');
    await expect(page.locator("text=Members")).toBeVisible();
  });

  test("can navigate to projects page", async ({ page }) => {
    await page.click('a[href="/projects"]');
    await expect(page.locator("text=Projects")).toBeVisible();
  });

  test("can navigate to sessions page", async ({ page }) => {
    await page.click('a[href="/sessions"]');
    await expect(page.locator("text=Sessions")).toBeVisible();
  });

  test("can navigate to audit logs page", async ({ page }) => {
    await page.click('a[href="/audit-logs"]');
    await expect(page.locator("text=Audit Logs")).toBeVisible();
  });
});

test.describe("Password flow", () => {
  test("forgot password page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/forgot-password`);

    await expect(page.locator("text=Forgot your password?")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("change password page requires auth", async ({ page }) => {
    await page.goto(`${BASE_URL}/change-password`);

    // Should redirect to login since not authenticated
    await page.waitForURL(`${BASE_URL}/login`, { timeout: 5_000 });
  });
});

test.describe("Registration page", () => {
  test("register page loads for unauthenticated users", async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    await expect(page.locator("text=Create account")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
