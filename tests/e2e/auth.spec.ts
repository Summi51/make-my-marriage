import { test, expect } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { MongoClient, ObjectId } from "mongodb";
import { createHmac, randomBytes } from "node:crypto";

let database: MongoMemoryReplSet;
const invitationSecret =
  "isolated-browser-invitation-secret-at-least-32-characters";
let app: ChildProcess;
let logs = "";
test.beforeAll(async () => {
  database = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  app = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--port", "3100"],
    {
      env: {
        ...process.env,
        MONGODB_URI: database.getUri(),
        APP_ORIGIN: "http://localhost:3100",
        MEMBER_INVITATION_SECRET: invitationSecret,
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

test("gallery preserves event selection, paginates, refreshes, downloads ZIP and deletes", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(page).toHaveURL(/tab=/);
  const tab = await page.evaluate(() => window.name.replace("mmm-tab-", ""));
  const headers = { Origin: "http://localhost:3100", "x-mmm-tab": tab };
  const email = "gallery-browser@example.com";
  const signup = await page.request.post("/api/auth/signup", {
    headers,
    data: {
      name: "Gallery Tester",
      email,
      password: "isolated gallery password",
    },
  });
  expect(signup.ok()).toBeTruthy();
  const client = await MongoClient.connect(database.getUri());
  const weddingId = new ObjectId();
  const firstEvent = new ObjectId();
  const secondEvent = new ObjectId();
  try {
    const db = client.db();
    const user = await db
      .collection("users")
      .findOne({ emailNormalized: email });
    expect(user).toBeTruthy();
    await db.collection("weddings").insertOne({
      _id: weddingId,
      brideName: "Gallery",
      groomName: "Tester",
      weddingDate: "2027-01-01",
      timeZone: "Asia/Kolkata",
      location: {},
      website: { slug: "gallery-browser" },
      gallery: { tokenHash: "gallery-browser" },
      deletedAt: null,
      createdByUserId: user!._id,
    });
    await db.collection("wedding_memberships").insertOne({
      weddingId,
      userId: user!._id,
      role: "ADMIN",
      status: "ACTIVE",
      joinedAt: new Date(),
    });
    for (const [id, name] of [
      [firstEvent, "Morning Sangeet"],
      [secondEvent, "Evening Sangeet"],
    ] as const) {
      await db.collection("events").insertOne({
        _id: id,
        weddingId,
        name,
        type: "SANGEET",
        startsAt: new Date("2027-01-01"),
        archivedAt: null,
      });
    }
  } finally {
    await client.close();
  }
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRZkAAAAASUVORK5CYII=",
    "base64",
  );
  let photos = [firstEvent, secondEvent].map((eventId, index) => ({
    id: new ObjectId().toString(),
    eventId: String(eventId),
    originalFilename: `photo-${index}.png`,
    url: "/gallery-test-image",
    sizeBytes: png.length,
    createdAt: new Date().toISOString(),
  }));
  let uploadEvent: string | null = null;
  await page.route("**/gallery-test-image", (route) =>
    route.fulfill({ contentType: "image/png", body: png }),
  );
  await page.route("**/gallery-test-upload", (route) =>
    route.fulfill({ status: 200 }),
  );
  await page.route("**/api/photos**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith("/upload-url")) {
      uploadEvent = request.postDataJSON().eventId;
      return route.fulfill({
        json: {
          data: {
            uploadUrl: "http://localhost:3100/gallery-test-upload",
            objectKey: "staging-test",
          },
        },
      });
    }
    if (url.pathname.endsWith("/download"))
      return route.fulfill({
        json: { data: { url: "http://localhost:3100/gallery-test-image" } },
      });
    if (request.method() === "DELETE") {
      photos = photos.filter((photo) => !url.pathname.endsWith(photo.id));
      return route.fulfill({ json: { data: { success: true } } });
    }
    if (request.method() === "POST") {
      expect(request.postDataJSON().eventId).toBe(uploadEvent);
      photos.push({
        ...photos[0],
        id: new ObjectId().toString(),
        eventId: uploadEvent!,
        originalFilename: "uploaded.png",
      });
      return route.fulfill({ status: 201, json: { data: {} } });
    }
    const eventId = url.searchParams.get("eventId");
    const visible = photos.filter((photo) =>
      eventId ? photo.eventId === eventId : true,
    );
    const offset = Number(url.searchParams.get("cursor") || 0);
    return route.fulfill({
      json: {
        data: visible.slice(offset, offset + 1),
        pagination: {
          nextCursor: offset + 1 < visible.length ? String(offset + 1) : null,
          total: visible.length,
        },
      },
    });
  });
  await page.goto(`/account/wedding/gallery?tab=${tab}`);
  await page
    .getByRole("button", { name: "Load more photos", exact: true })
    .click();
  await expect(page.getByText("2 Items")).toBeVisible();
  await page
    .getByRole("button", { name: "Evening Sangeet", exact: true })
    .click();
  await expect(page.getByText("1 Items")).toBeVisible();
  await page
    .getByRole("button", { name: "+ Upload photos", exact: true })
    .click();
  await page.locator("select").selectOption(String(secondEvent));
  await page.locator('input[type="file"]').setInputFiles({
    name: "uploaded.png",
    mimeType: "image/png",
    buffer: png,
  });
  await page
    .getByRole("button", { name: "Upload 1 photo", exact: true })
    .click();
  await expect(page.getByText("2 Items")).toBeVisible();
  expect(uploadEvent).toBe(String(secondEvent));
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Zip", exact: true }).click();
  const download = await downloadPromise;
  const { readFile } = await import("node:fs/promises");
  const { unzipSync } = await import("fflate");
  const archive = unzipSync(await readFile((await download.path())!));
  expect(Object.keys(archive)).toHaveLength(2);
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Delete uploaded", exact: true })
    .click();
  await expect(page.getByText("1 Items")).toBeVisible();
  photos = [];
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.getByText("Your memories begin here")).toBeVisible();
});

for (const role of ["ADMIN", "MANAGER"] as const) {
  test(`${role} invitation preserves signup/login context and joins the wedding`, async ({
    page,
    browser,
  }) => {
    const email = `${role.toLowerCase()}-invite@example.com`;
    const token = randomBytes(32).toString("base64url");
    const path = `/member-invitations/${token}`;
    const client = await MongoClient.connect(database.getUri());
    try {
      const db = client.db();
      const weddingId = new ObjectId();
      await db.collection("weddings").insertOne({
        _id: weddingId,
        brideName: "Saman",
        groomName: "Hasan",
        weddingDate: "2027-01-01",
        timeZone: "Asia/Kolkata",
        location: { formattedAddress: "Lucknow" },
        website: { slug: `saman-hasan-${role.toLowerCase()}` },
        gallery: { tokenHash: `isolated-gallery-${role}` },
        deletedAt: null,
        createdByUserId: new ObjectId(),
      });
      await db.collection("wedding_member_invitations").insertOne({
        weddingId,
        email,
        emailNormalized: email,
        role,
        status: "PENDING",
        tokenHash: createHmac("sha256", invitationSecret)
          .update(token)
          .digest("hex"),
        invitedByUserId: new ObjectId(),
        expiresAt: new Date(Date.now() + 86400000),
      });
    } finally {
      await client.close();
    }
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "Saman & Hasan" }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Create account", exact: true })
      .click();
    await expect(page.getByLabel("Email address")).toHaveValue(email);
    await page.getByRole("link", { name: "Sign in", exact: true }).click();
    await expect(page.getByLabel("Email address")).toHaveValue(email);
    await page
      .getByRole("link", { name: "Create an account", exact: true })
      .click();
    await page.getByLabel("Your name").fill(`${role} Invitee`);
    await page
      .getByLabel("Password", { exact: true })
      .fill("isolated wedding test password");
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Accept invitation" }),
    ).toBeVisible();
    // A registered invitee should now be offered login, not signup.
    await page.request.post("/api/auth/logout", {
      headers: {
        Origin: "http://localhost:3100",
        "x-mmm-tab": await page.evaluate(() =>
          window.name.replace("mmm-tab-", ""),
        ),
      },
    });
    await page.reload();
    await page.getByRole("link", { name: "Sign in", exact: true }).click();
    await expect(page.getByLabel("Email address")).toHaveValue(email);
    await page
      .getByLabel("Password", { exact: true })
      .fill("isolated wedding test password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.getByRole("button", { name: "Accept invitation" }).click();
    await expect(
      page.getByRole("heading", { name: "You’re part of the celebration" }),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/invitation-${role.toLowerCase()}.png`,
    });
    await page.getByRole("link", { name: "Go to your wedding" }).click();
    await expect(
      page.getByRole("heading", { name: "Saman & Hasan" }),
    ).toBeVisible();
    const tabHeader = {
      "x-mmm-tab": await page.evaluate(() =>
        window.name.replace("mmm-tab-", ""),
      ),
    };
    const me = await page.request.get("/api/auth/me", { headers: tabHeader });
    const joined = (await me.json()).data;
    expect(joined.membership.role).toBe(role);
    const owner = await browser.newContext();
    try {
      const ownerSignup = await owner.request.post(
        "http://localhost:3100/api/auth/signup",
        {
          headers: { Origin: "http://localhost:3100" },
          data: {
            name: "Simran",
            email: `owner-${role.toLowerCase()}@example.com`,
            password: "isolated owner test password",
          },
        },
      );
      expect(ownerSignup.status()).toBe(201);
      const ownerMe = await owner.request.get(
        "http://localhost:3100/api/auth/me",
      );
      const ownerId = (await ownerMe.json()).data.user.id;
      const seed = await MongoClient.connect(database.getUri());
      try {
        await seed
          .db()
          .collection("wedding_memberships")
          .insertOne({
            weddingId: new ObjectId(joined.wedding.id),
            userId: new ObjectId(ownerId),
            role: "ADMIN",
            joinedAt: new Date(),
          });
      } finally {
        await seed.close();
      }
      const ownerPage = await owner.newPage();
      await ownerPage.goto("http://localhost:3100/login");
      await ownerPage
        .getByLabel("Email address")
        .fill(`owner-${role.toLowerCase()}@example.com`);
      await ownerPage
        .getByLabel("Password", { exact: true })
        .fill("isolated owner test password");
      await ownerPage
        .getByRole("button", { name: "Sign in", exact: true })
        .click();
      await expect(ownerPage).toHaveURL(/\/account\?tab=/);
      await ownerPage.goto(`http://localhost:3100${path}`);
      const preserved = await owner.request.get(
        "http://localhost:3100/api/auth/me",
      );
      expect((await preserved.json()).data.user.id).toBe(ownerId);
      await ownerPage.goto("http://localhost:3100/account/wedding/members");
      for (const targetRole of ["MANAGER", "ADMIN"] as const) {
        const row = ownerPage
          .locator("div")
          .filter({ has: ownerPage.getByText(email, { exact: true }) })
          .filter({
            has: ownerPage.getByRole("button", {
              name: "Change role",
              exact: true,
            }),
          })
          .last();
        await row.getByRole("button", { name: "Change role" }).click();
        await ownerPage
          .getByRole("combobox", { name: "Wedding role", exact: true })
          .selectOption(targetRole);
        await ownerPage.getByRole("button", { name: "Save role" }).click();
        await expect(
          ownerPage.getByRole("dialog", { name: "Change wedding role" }),
        ).not.toBeVisible();
        await page.bringToFront();
        await page.evaluate(() => window.dispatchEvent(new Event("focus")));
        await expect(page.locator("header")).toContainText(
          targetRole === "ADMIN" ? "Admin" : "Manager",
        );
        const permissions = await page.request.get("/api/members/invitations", {
          headers: tabHeader,
        });
        expect(permissions.status()).toBe(targetRole === "ADMIN" ? 200 : 403);
      }
      const row = ownerPage
        .locator("div")
        .filter({ has: ownerPage.getByText(email, { exact: true }) })
        .filter({
          has: ownerPage.getByRole("button", {
            name: "Remove member",
            exact: true,
          }),
        })
        .last();
      await row.getByRole("button", { name: "Remove member" }).click();
      await ownerPage
        .getByRole("dialog")
        .getByRole("button", { name: "Remove member", exact: true })
        .click();
      await expect(
        ownerPage.getByText(email, { exact: true }),
      ).not.toBeVisible();
      await page.bringToFront();
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await expect(
        page.getByRole("heading", { name: "Let’s bring your wedding to life" }),
      ).toBeVisible();
      expect(
        (
          await page.request.get("/api/wedding", { headers: tabHeader })
        ).status(),
      ).toBe(404);
      await expect(
        ownerPage.getByRole("button", { name: "Change role" }),
      ).toBeDisabled();
      await expect(
        ownerPage.getByRole("button", { name: "Leave wedding" }),
      ).toBeDisabled();
    } finally {
      await owner.close();
    }
  });
}
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
  await expect(page).toHaveURL(/\/signup\?tab=/);
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
  await expect(page).toHaveURL(/\/account\?tab=/);
  await expect(
    page.getByRole("heading", { name: "Let’s bring your wedding to life" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Let’s bring your wedding to life" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?tab=/);
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=.*tab=/);
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
  await expect(page).toHaveURL(/\/account\?tab=/);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/signup");
  await expect(page).toHaveURL(/\/signup\?tab=/);
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

test("different accounts remain signed in independently across tabs and invitation opening", async ({
  page,
  context,
}) => {
  await page.goto("/signup");
  await page.getByLabel("Your name").fill("Hina");
  await page.getByLabel("Email address").fill("hina-tabs@example.com");
  await page
    .getByLabel("Password", { exact: true })
    .fill("isolated Hina test password");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/account\?tab=/);
  const hinaTab = await page.evaluate(() =>
    window.name.replace("mmm-tab-", ""),
  );
  const hinaMe = await page.request.get("/api/auth/me", {
    headers: { "x-mmm-tab": hinaTab },
  });
  const hinaId = (await hinaMe.json()).data.user.id;
  const token = randomBytes(32).toString("base64url");
  const weddingId = new ObjectId();
  const client = await MongoClient.connect(database.getUri());
  try {
    const db = client.db();
    await db.collection("weddings").insertOne({
      _id: weddingId,
      brideName: "Saman",
      groomName: "Hasan",
      weddingDate: "2027-03-27",
      timeZone: "Asia/Kolkata",
      location: { formattedAddress: "Lucknow" },
      website: { slug: "saman-hasan-tabs" },
      gallery: { tokenHash: "tabs-gallery" },
      deletedAt: null,
      createdByUserId: new ObjectId(hinaId),
    });
    await db.collection("wedding_memberships").insertOne({
      weddingId,
      userId: new ObjectId(hinaId),
      role: "ADMIN",
      joinedAt: new Date(),
    });
    await db.collection("wedding_member_invitations").insertOne({
      weddingId,
      email: "weel-tabs@example.com",
      emailNormalized: "weel-tabs@example.com",
      role: "MANAGER",
      status: "PENDING",
      tokenHash: createHmac("sha256", invitationSecret)
        .update(token)
        .digest("hex"),
      invitedByUserId: new ObjectId(hinaId),
      expiresAt: new Date(Date.now() + 86400000),
    });
  } finally {
    await client.close();
  }
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Saman & Hasan" }),
  ).toBeVisible();
  const weel = await context.newPage();
  await weel.goto(`/member-invitations/${token}`);
  await expect(
    weel.getByRole("heading", { name: "Saman & Hasan" }),
  ).toBeVisible();
  await expect(
    weel.getByRole("link", { name: "Create account", exact: true }),
  ).toBeVisible();
  await weel.getByRole("link", { name: "Create account", exact: true }).click();
  await expect(weel.getByLabel("Email address")).toHaveValue(
    "weel-tabs@example.com",
  );
  await weel.getByLabel("Your name").fill("Weel");
  await weel
    .getByLabel("Password", { exact: true })
    .fill("isolated Weel test password");
  await weel
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await weel.getByRole("button", { name: "Accept invitation" }).click();
  await expect(
    weel.getByRole("heading", { name: "You’re part of the celebration" }),
  ).toBeVisible();
  await weel.getByRole("link", { name: "Go to your wedding" }).click();
  await expect(
    weel.getByRole("heading", { name: "Saman & Hasan" }),
  ).toBeVisible();
  const weelTab = await weel.evaluate(() =>
    window.name.replace("mmm-tab-", ""),
  );
  expect(weelTab).not.toBe(hinaTab);
  await page.reload();
  await weel.reload();
  const hinaAfter = await page.request.get("/api/auth/me", {
    headers: { "x-mmm-tab": hinaTab },
  });
  const weelAfter = await weel.request.get("/api/auth/me", {
    headers: { "x-mmm-tab": weelTab },
  });
  expect((await hinaAfter.json()).data.user.email).toBe(
    "hina-tabs@example.com",
  );
  expect((await weelAfter.json()).data.user.email).toBe(
    "weel-tabs@example.com",
  );
  await weel.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(weel).toHaveURL(/\/login\?tab=/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Saman & Hasan" }),
  ).toBeVisible();
});

test("bride invites a signed-in groom as Admin without replacing either Chrome tab", async ({
  page,
  context,
}) => {
  const brideEmail = "saman-bride-admin@example.com";
  const groomEmail = "hasan-groom-admin@example.com";
  const password = "isolated couple admin test password";
  await page.goto("/signup");
  await page.getByLabel("Your name").fill("Saman");
  await page.getByLabel("Email address").fill(brideEmail);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/account\?tab=/);
  const brideTab = await page.evaluate(() =>
    window.name.replace("mmm-tab-", ""),
  );
  const brideMe = await page.request.get("/api/auth/me", {
    headers: { "x-mmm-tab": brideTab },
  });
  const brideId = (await brideMe.json()).data.user.id;

  const groom = await context.newPage();
  await groom.goto("/signup");
  await groom.getByLabel("Your name").fill("Hasan");
  await groom.getByLabel("Email address").fill(groomEmail);
  await groom.getByLabel("Password", { exact: true }).fill(password);
  await groom
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(groom).toHaveURL(/\/account\?tab=/);
  const groomTab = await groom.evaluate(() =>
    window.name.replace("mmm-tab-", ""),
  );
  expect(groomTab).not.toBe(brideTab);

  const weddingId = new ObjectId();
  const token = randomBytes(32).toString("base64url");
  const client = await MongoClient.connect(database.getUri());
  try {
    const db = client.db();
    await db.collection("weddings").insertOne({
      _id: weddingId,
      brideName: "Saman",
      groomName: "Hasan",
      weddingDate: "2027-03-27",
      timeZone: "Asia/Kolkata",
      location: { formattedAddress: "Lucknow" },
      website: { slug: "saman-hasan-couple-admin" },
      gallery: { tokenHash: "couple-admin-gallery" },
      deletedAt: null,
      createdByUserId: new ObjectId(brideId),
    });
    await db.collection("wedding_memberships").insertOne({
      weddingId,
      userId: new ObjectId(brideId),
      role: "ADMIN",
      joinedAt: new Date(),
    });
    await db.collection("wedding_member_invitations").insertOne({
      weddingId,
      email: groomEmail,
      emailNormalized: groomEmail,
      role: "ADMIN",
      status: "PENDING",
      tokenHash: createHmac("sha256", invitationSecret)
        .update(token)
        .digest("hex"),
      invitedByUserId: new ObjectId(brideId),
      expiresAt: new Date(Date.now() + 86400000),
    });
  } finally {
    await client.close();
  }

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Saman & Hasan" }),
  ).toBeVisible();
  await groom.goto(`/member-invitations/${token}`);
  await expect(
    groom.getByRole("heading", { name: "Saman & Hasan" }),
  ).toBeVisible();
  await expect(groom.getByText("27 March 2027")).toBeVisible();
  await expect(
    groom.getByRole("button", { name: "Accept invitation" }),
  ).toBeVisible();
  await groom.getByRole("button", { name: "Accept invitation" }).click();
  await expect(
    groom.getByRole("heading", { name: "You’re part of the celebration" }),
  ).toBeVisible();
  await groom.getByRole("link", { name: "Go to your wedding" }).click();
  await expect(
    groom.getByRole("heading", { name: "Saman & Hasan" }),
  ).toBeVisible();
  const groomMe = await groom.request.get("/api/auth/me", {
    headers: { "x-mmm-tab": groomTab },
  });
  expect((await groomMe.json()).data).toMatchObject({
    user: { email: groomEmail },
    membership: { role: "ADMIN" },
  });
  await groom.goto("/account/wedding/members");
  await expect(
    groom.getByRole("button", { name: "Invite member" }),
  ).toBeVisible();
  await page.goto("/account/wedding/members");
  await expect(page.getByText(groomEmail, { exact: true })).toBeVisible();
  const brideAfter = await page.request.get("/api/auth/me", {
    headers: { "x-mmm-tab": brideTab },
  });
  expect((await brideAfter.json()).data).toMatchObject({
    user: { email: brideEmail },
    membership: { role: "ADMIN" },
  });
});
