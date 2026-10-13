import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
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
import { POST as createWeddingRoute } from "@/app/api/wedding/route";
import {
  GET as listEventsRoute,
  POST as createEventRoute,
} from "@/app/api/events/route";
import { DELETE as archiveEventRoute } from "@/app/api/events/[eventId]/route";
import { POST as restoreEventRoute } from "@/app/api/events/[eventId]/restore/route";
import { User } from "@/modules/auth/models";
import { Wedding, WeddingMembership } from "@/modules/wedding/models";
import { Event } from "./models";

const origin = "http://localhost:3000";

function authRequest(path: string, body: unknown) {
  return new NextRequest(`${origin}/api/auth/${path}`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function apiRequest(
  method: string,
  path: string,
  cookie: string,
  body?: unknown,
) {
  return new NextRequest(`${origin}${path}`, {
    method,
    headers: { origin, "content-type": "application/json", cookie },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

const cookieOf = (response: Response) =>
  response.headers.get("set-cookie")!.split(";")[0];

describe("event archive and restore", () => {
  let server: MongoMemoryReplSet;

  beforeAll(async () => {
    server = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    vi.stubEnv("MONGODB_URI", server.getUri());
    vi.stubEnv("APP_ORIGIN", origin);
    await mongoose.connect(server.getUri());
    await Promise.all([
      User.init(),
      Wedding.init(),
      WeddingMembership.init(),
      Event.init(),
    ]);
  }, 60000);

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Wedding.deleteMany({}),
      WeddingMembership.deleteMany({}),
      Event.deleteMany({}),
      mongoose.connection.collection("auth_rate_limits").deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    delete (globalThis as { mongooseConnection?: unknown }).mongooseConnection;
    await server?.stop();
    vi.unstubAllEnvs();
  });

  it("hides an archived event, then returns the same record to the itinerary", async () => {
    const signupRes = await signup(
      authRequest("signup", {
        name: "Saman Inayat",
        email: "events@example.com",
        password: "secure wedding password 123",
      }),
    );
    const cookie = cookieOf(signupRes);
    const weddingRes = await createWeddingRoute(
      apiRequest("POST", "/api/wedding", cookie, {
        brideName: "Saman",
        groomName: "Zaid",
        weddingDate: "2026-11-20",
        timeZone: "Asia/Kolkata",
      }),
    );
    expect(weddingRes.status).toBe(201);

    const created = await createEventRoute(
      apiRequest("POST", "/api/events", cookie, {
        name: "Mehendi",
        type: "MEHENDI",
        startsAt: "2026-11-18T10:00:00.000Z",
      }),
    );
    expect(created.status).toBe(201);
    const eventId = (await created.json()).data.id as string;

    const archived = await archiveEventRoute(
      apiRequest("DELETE", `/api/events/${eventId}`, cookie),
      { params: Promise.resolve({ eventId }) },
    );
    expect(archived.status).toBe(200);

    const hidden = await listEventsRoute(
      apiRequest("GET", "/api/events", cookie),
    );
    expect((await hidden.json()).data).toEqual([]);

    const restored = await restoreEventRoute(
      apiRequest("POST", `/api/events/${eventId}/restore`, cookie),
      { params: Promise.resolve({ eventId }) },
    );
    expect(restored.status).toBe(200);
    expect((await restored.json()).data).toMatchObject({
      id: eventId,
      archivedAt: null,
    });

    const visible = await listEventsRoute(
      apiRequest("GET", "/api/events", cookie),
    );
    expect(
      (await visible.json()).data.map((event: { id: string }) => event.id),
    ).toEqual([eventId]);

    const again = await restoreEventRoute(
      apiRequest("POST", `/api/events/${eventId}/restore`, cookie),
      { params: Promise.resolve({ eventId }) },
    );
    expect(again.status).toBe(404);
  });
});
