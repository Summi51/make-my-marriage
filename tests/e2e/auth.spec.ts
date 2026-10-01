import { test, expect } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { MongoMemoryServer } from "mongodb-memory-server";

let database: MongoMemoryServer;
let app: ChildProcess;
let logs = "";
test.beforeAll(async () => {
  database = await MongoMemoryServer.create();
  app = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--port", "3100"],
    {
      env: {
        ...process.env,
        MONGODB_URI: database.getUri(),
        APP_ORIGIN: "http://localhost:3100",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  app.stdout?.on("data", (chunk) => {
    logs += chunk;
  });
  app.stderr?.on("data", (chunk) => {
    logs += chunk;
  });
  await expect
    .poll(
      async () => {
        if (app.exitCode !== null) throw new Error(logs);
        try {
          return (await fetch("http://localhost:3100/api/health")).status;
        } catch {
          return 0;
        }
      },
      { timeout: 30000 },
    )
    .toBe(200);
});
test.afterAll(async () => {
  if (app && app.exitCode === null) {
    const exited = new Promise((resolve) => app.once("exit", resolve));
    app.kill("SIGTERM");
    await exited;
  }
  await database?.stop();
});

test("signup, refresh, logout and login through the browser", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: "Start Planning for Free" })
    .first()
    .click();
  await expect(page).toHaveURL(/\/signup$/);
  await page.screenshot({
    path: "test-results/signup-desktop.png",
    fullPage: true,
  });
  await page.getByLabel("Your name").fill("Saman Test");
  await page.getByLabel("Email address").fill("browser-test@example.com");
  await page
    .getByLabel("Password", { exact: true })
    .fill("a joyful wedding passphrase");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(
    page.getByRole("heading", { name: "Welcome, Saman Test." }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("Your account is ready.")).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login$/);
  await page.screenshot({
    path: "test-results/login-desktop.png",
    fullPage: true,
  });
  await page.getByLabel("Email address").fill("BROWSER-TEST@example.com");
  await page.getByLabel("Password", { exact: true }).fill("wrong password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("form", { name: "Sign in" }).getByRole("alert"),
  ).toHaveText("Invalid email or password.");
  await page
    .getByLabel("Password", { exact: true })
    .fill("a joyful wedding passphrase");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/signup");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    375,
  );
  await page.screenshot({
    path: "test-results/signup-mobile.png",
    fullPage: true,
  });
  await page.getByLabel("Your name").fill("Another Name");
  await page.getByLabel("Email address").fill("browser-test@example.com");
  await page
    .getByLabel("Password", { exact: true })
    .fill("a joyful wedding passphrase");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByRole("form", { name: "Create account" }).getByRole("alert"),
  ).toContainText("already exists");
});
