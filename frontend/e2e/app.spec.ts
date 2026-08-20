import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const DEMO_USER = {
  email: "alice@acme.com",
  password: "DemoPassword123!",
};

async function loginAsAlice(page: import("@playwright/test").Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', DEMO_USER.email);
  await page.fill('input[type="password"]', DEMO_USER.password);
  await page.click('button:has-text("Sign in")');
  await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10_000 });
}

test.describe("Project management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAlice(page);
  });

  test("can view projects list", async ({ page }) => {
    await page.click('a[href="/projects"]');
    await expect(page.locator("text=Projects")).toBeVisible();
    // Should see existing seeded projects or an empty state
    await expect(
      page.locator("text=No projects yet").or(page.locator('[class*="rounded-xl"]').first())
    ).toBeVisible({ timeout: 10_000 });
  });

  test("can create a new project", async ({ page }) => {
    await page.click('a[href="/projects"]');
    await page.waitForLoadState("networkidle");

    // Click new project button
    await page.click('button:has-text("New project")');

    // Fill in project name
    const projectName = `E2E Test Project ${Date.now()}`;
    await page.fill('input[placeholder="Project name"]', projectName);

    // Submit
    await page.click('button:has-text("Create")');

    // Should see the new project in the list
    await expect(page.locator(`text=${projectName}`)).toBeVisible({ timeout: 10_000 });
  });

  test("can edit a project name", async ({ page }) => {
    await page.click('a[href="/projects"]');
    await page.waitForLoadState("networkidle");

    // Hover over the first project card to reveal edit button
    const firstCard = page.locator('[class*="rounded-xl"]').filter({ hasText: /Acme|Project/ }).first();
    await firstCard.hover();

    // Click the edit (pencil) button
    await firstCard.locator('button[title="Edit name"]').click();

    // Clear and type new name
    const input = firstCard.locator('input[type="text"]');
    await input.clear();
    await input.fill("Renamed Project");

    // Save
    await firstCard.locator('button:has-text("Save")').click();

    // Should see the renamed project
    await expect(page.locator("text=Renamed Project")).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Member management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAlice(page);
  });

  test("can view members list", async ({ page }) => {
    await page.click('a[href="/members"]');
    await expect(page.locator("text=Members")).toBeVisible();
    // Should see seeded members
    await expect(page.locator("text=alice@acme.com").or(page.locator("text=No members yet"))).toBeVisible({ timeout: 10_000 });
  });

  test("can search members", async ({ page }) => {
    await page.click('a[href="/members"]');
    await page.waitForLoadState("networkidle");

    // Wait for members to load
    await expect(page.locator('input[placeholder="Search members..."]')).toBeVisible({ timeout: 10_000 });

    // Type in search
    await page.fill('input[placeholder="Search members..."]', "alice");

    // Should filter to show only Alice
    await expect(page.locator("text=alice@acme.com")).toBeVisible();
  });
});

test.describe("Theme toggle", () => {
  test("can toggle dark/light mode", async ({ page }) => {
    await page.goto(BASE_URL);

    // Find and click the theme toggle button
    const toggle = page.locator('button[aria-label="Toggle theme"]');
    await expect(toggle).toBeVisible();

    // Get initial html class
    const initialClass = await page.locator("html").getAttribute("class");

    // Click toggle
    await toggle.click();

    // Class should change
    const newClass = await page.locator("html").getAttribute("class");
    expect(newClass).not.toBe(initialClass);
  });
});
