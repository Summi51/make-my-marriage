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
import { POST as createEventRoute } from "@/app/api/events/route";
import {
  GET as listTasksRoute,
  POST as createTaskRoute,
} from "@/app/api/tasks/route";
import {
  GET as getTaskRoute,
  PATCH as updateTaskRoute,
  DELETE as deleteTaskRoute,
} from "@/app/api/tasks/[taskId]/route";
import { User } from "@/modules/auth/models";
import { Wedding, WeddingMembership } from "@/modules/wedding/models";
import { Event } from "@/modules/events/models";
import { Task } from "./models";

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

describe("tasks API and domain use-cases", () => {
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
      Task.init(),
    ]);
  }, 60000);

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Wedding.deleteMany({}),
      WeddingMembership.deleteMany({}),
      Event.deleteMany({}),
      Task.deleteMany({}),
      mongoose.connection.collection("auth_rate_limits").deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    delete (globalThis as { mongooseConnection?: unknown }).mongooseConnection;
    await server?.stop();
    vi.unstubAllEnvs();
  });

  async function setupWedding(email = "test@example.com") {
    const signupRes = await signup(
      authRequest("signup", {
        name: "Saman Inayat",
        email,
        password: "secure wedding password 123",
      }),
    );
    expect(signupRes.status).toBe(201);
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

    return { cookie };
  }

  it("creates, lists, updates, and deletes tasks with member and event associations", async () => {
    const { cookie } = await setupWedding();

    // 1. Create an event
    const eventRes = await createEventRoute(
      apiRequest("POST", "/api/events", cookie, {
        name: "Sangeet & Qawwali Night",
        startsAt: "2026-11-15T18:00:00.000Z",
      }),
    );
    expect(eventRes.status).toBe(201);
    const event = (await eventRes.json()).data;

    // 2. Create a task
    const taskRes = await createTaskRoute(
      apiRequest("POST", "/api/tasks", cookie, {
        title: "Finalise the Sangeet playlist",
        description: "Review track selections with DJ",
        eventId: event.id,
        dueDate: "2026-11-15T00:00:00.000Z",
        priority: "HIGH",
        status: "TODO",
      }),
    );
    expect(taskRes.status).toBe(201);
    const createdTask = (await taskRes.json()).data;
    expect(createdTask.title).toBe("Finalise the Sangeet playlist");
    expect(createdTask.event?.name).toBe("Sangeet & Qawwali Night");
    expect(createdTask.priority).toBe("HIGH");
    expect(createdTask.status).toBe("TODO");
    expect(createdTask.completedAt).toBeNull();

    // 3. List tasks
    const listRes = await listTasksRoute(
      apiRequest("GET", "/api/tasks", cookie),
    );
    expect(listRes.status).toBe(200);
    const listData = await listRes.json();
    expect(listData.data).toHaveLength(1);
    expect(listData.counts.all).toBe(1);
    expect(listData.counts.completed).toBe(0);

    // 4. Update task to COMPLETED
    const patchRes = await updateTaskRoute(
      apiRequest("PATCH", `/api/tasks/${createdTask.id}`, cookie, {
        status: "COMPLETED",
      }),
      { params: Promise.resolve({ taskId: createdTask.id }) },
    );
    expect(patchRes.status).toBe(200);
    const updatedTask = (await patchRes.json()).data;
    expect(updatedTask.status).toBe("COMPLETED");
    expect(updatedTask.completedAt).not.toBeNull();

    // 5. Get task by ID
    const getRes = await getTaskRoute(
      apiRequest("GET", `/api/tasks/${createdTask.id}`, cookie),
      { params: Promise.resolve({ taskId: createdTask.id }) },
    );
    expect(getRes.status).toBe(200);
    const fetchedTask = (await getRes.json()).data;
    expect(fetchedTask.status).toBe("COMPLETED");

    // 6. Delete task
    const deleteRes = await deleteTaskRoute(
      apiRequest("DELETE", `/api/tasks/${createdTask.id}`, cookie),
      { params: Promise.resolve({ taskId: createdTask.id }) },
    );
    expect(deleteRes.status).toBe(200);

    // 7. Verify task is deleted
    const getAfterDeleteRes = await getTaskRoute(
      apiRequest("GET", `/api/tasks/${createdTask.id}`, cookie),
      { params: Promise.resolve({ taskId: createdTask.id }) },
    );
    expect(getAfterDeleteRes.status).toBe(404);
  });

  it("rejects malformed member and event ids instead of failing server-side", async () => {
    const { cookie } = await setupWedding();

    const badEvent = await createTaskRoute(
      apiRequest("POST", "/api/tasks", cookie, {
        title: "Check the venue list",
        eventId: "not-an-object-id",
      }),
    );
    expect(badEvent.status).toBe(400);
    expect((await badEvent.json()).error.code).toBe("VALIDATION_ERROR");

    const badMember = await createTaskRoute(
      apiRequest("POST", "/api/tasks", cookie, {
        title: "Check the venue list",
        assignedMembershipId: "nope",
      }),
    );
    expect(badMember.status).toBe(400);

    const badEventQuery = await listTasksRoute(
      apiRequest("GET", "/api/tasks?eventId=not-an-id", cookie),
    );
    expect(badEventQuery.status).toBe(400);

    const badMemberQuery = await listTasksRoute(
      apiRequest("GET", "/api/tasks?assignedMembershipId=nope", cookie),
    );
    expect(badMemberQuery.status).toBe(400);

    // An empty id clears the association instead of failing validation.
    const cleared = await createTaskRoute(
      apiRequest("POST", "/api/tasks", cookie, {
        title: "Confirm the caterer",
        assignedMembershipId: "",
        eventId: "",
      }),
    );
    expect(cleared.status).toBe(201);
    const clearedTask = (await cleared.json()).data;
    expect(clearedTask.assignee).toBeNull();
    expect(clearedTask.event).toBeNull();

    // "none" still selects general wedding tasks.
    const generalOnly = await listTasksRoute(
      apiRequest("GET", "/api/tasks?eventId=none", cookie),
    );
    expect(generalOnly.status).toBe(200);
    expect((await generalOnly.json()).data).toHaveLength(1);
  });
});
