import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { NextRequest } from "next/server";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
vi.mock("server-only", () => ({}));
import { POST as signup } from "@/app/api/auth/signup/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as me } from "@/app/api/auth/me/route";
import { User, Session } from "./models";
import { tokenHash } from "@/server/auth/sessions";
import { consumeLimit } from "@/server/auth/rate-limit";

const account = {
  name: "Saman",
  email: "Saman@example.com",
  password: "our wedding planning passphrase",
};
function request(
  path: string,
  body?: unknown,
  cookie?: string,
  origin = "http://localhost:3000",
) {
  return new NextRequest(`http://localhost:3000/api/auth/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      origin,
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
const cookieOf = (response: Response) =>
  response.headers.get("set-cookie")!.split(";")[0];

describe("authentication API", () => {
  let server: MongoMemoryServer;
  beforeAll(async () => {
    server = await MongoMemoryServer.create();
    vi.stubEnv("MONGODB_URI", server.getUri());
    vi.stubEnv("APP_ORIGIN", "http://localhost:3000");
    await mongoose.connect(server.getUri());
    await Promise.all([User.init(), Session.init()]);
  });
  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Session.deleteMany({}),
      mongoose.connection.collection("auth_rate_limits").deleteMany({}),
    ]);
  });
  afterAll(async () => {
    await mongoose.disconnect();
    delete (globalThis as { mongooseConnection?: unknown }).mongooseConnection;
    await server?.stop();
    vi.unstubAllEnvs();
  });

  it("signs up, restores a safe user from the cookie, logs out and logs back in", async () => {
    const response = await signup(request("signup", account));
    expect(response.status).toBe(201);
    const result = await response.json();
    expect(result.data).toMatchObject({
      user: { name: "Saman", email: "saman@example.com" },
      hasWedding: false,
    });
    expect(JSON.stringify(result)).not.toContain("password");
    const cookie = cookieOf(response);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
    const user = await User.findOne().select("+passwordHash");
    expect(user!.passwordHash).toMatch(/^\$argon2id\$/);
    expect(user!.emailNormalized).toBe("saman@example.com");
    const session = await Session.findOne();
    expect(session!.tokenHash).toBe(tokenHash(cookie.split("=")[1]));
    expect(session!.tokenHash).not.toBe(cookie.split("=")[1]);
    const current = await me(request("me", undefined, cookie));
    expect(current.status).toBe(200);
    expect(await current.json()).toEqual({
      data: { user: result.data.user, membership: null, wedding: null },
    });
    const signedOut = await logout(request("logout", {}, cookie));
    expect(signedOut.status).toBe(200);
    expect(await signedOut.json()).toEqual({ success: true });
    expect(signedOut.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(signedOut.headers.get("set-cookie")?.toLowerCase()).toContain(
      "expires=thu, 01 jan 1970",
    );
    expect((await me(request("me", undefined, cookie))).status).toBe(401);
    expect(
      (
        await login(
          request("login", {
            email: " SAMAN@example.com ",
            password: account.password,
          }),
        )
      ).status,
    ).toBe(200);
  });

  it("enforces normalized email uniqueness, including concurrent signup", async () => {
    const responses = await Promise.all([
      signup(request("signup", account)),
      signup(request("signup", { ...account, email: "saman@example.com" })),
    ]);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await User.countDocuments()).toBe(1);
  });

  it("uses the same failure for absent accounts and incorrect passwords", async () => {
    await signup(request("signup", account));
    const wrong = await login(
      request("login", {
        email: account.email,
        password: "incorrect password",
      }),
    );
    const absent = await login(
      request("login", {
        email: "other@example.com",
        password: "incorrect password",
      }),
    );
    expect(wrong.status).toBe(401);
    expect(await wrong.json()).toEqual(await absent.json());
  });

  it("rejects expired sessions before TTL cleanup", async () => {
    const response = await signup(request("signup", account));
    await Session.updateMany({}, { expiresAt: new Date(Date.now() - 1000) });
    expect(
      (await me(request("me", undefined, cookieOf(response)))).status,
    ).toBe(401);
    expect((await me(request("me"))).status).toBe(401);
    expect(
      (await me(request("me", undefined, "mmm_session=invalid"))).status,
    ).toBe(401);
  });

  it("rejects foreign origins, malformed JSON, short passwords and oversized bodies", async () => {
    expect(
      (
        await signup(
          request("signup", account, undefined, "https://foreign.example"),
        )
      ).status,
    ).toBe(403);
    const shortPassword = await signup(
      request("signup", { ...account, password: "short" }),
    );
    expect(shortPassword.status).toBe(400);
    expect((await shortPassword.json()).error.message).toBe(
      "Use at least 12 characters.",
    );
    const longPassword = await login(
      request("login", {
        email: account.email,
        password: "x".repeat(129),
      }),
    );
    expect(longPassword.status).toBe(400);
    expect((await longPassword.json()).error.message).toBe(
      "Use no more than 128 characters.",
    );
    const malformed = new NextRequest("http://localhost:3000/api/auth/signup", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "content-type": "application/json",
      },
      body: "{",
    });
    expect((await signup(malformed)).status).toBe(400);
    expect(
      (await signup(request("signup", { ...account, name: "x".repeat(9000) })))
        .status,
    ).toBe(400);
    expect(await User.countDocuments()).toBe(0);
  });

  it("limits repeated login attempts and returns retry timing", async () => {
    for (let i = 0; i < 10; i++)
      await consumeLimit("email:login:saman@example.com", 10);
    const response = await login(
      request("login", { email: account.email, password: account.password }),
    );
    expect(response.status).toBe(429);
    expect(Number(response.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("keeps rate-limit increments atomic across concurrent requests", async () => {
    const outcomes = await Promise.allSettled(
      Array.from({ length: 12 }, () => consumeLimit("concurrent", 5, 1800000)),
    );
    expect(outcomes.filter((r) => r.status === "fulfilled")).toHaveLength(5);
    await expect(
      consumeLimit("concurrent", 5, 2700000),
    ).resolves.toBeUndefined();
  });
});
