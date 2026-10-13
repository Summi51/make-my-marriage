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
  GET as listExpensesRoute,
  POST as createExpenseRoute,
} from "@/app/api/expenses/route";
import { GET as getSummaryRoute } from "@/app/api/expenses/summary/route";
import {
  GET as getExpenseRoute,
  PATCH as updateExpenseRoute,
  DELETE as deleteExpenseRoute,
} from "@/app/api/expenses/[expenseId]/route";
import { User } from "@/modules/auth/models";
import { Wedding, WeddingMembership } from "@/modules/wedding/models";
import { Event } from "@/modules/events/models";
import { Expense } from "./models";

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

describe("expenses API and domain use-cases", () => {
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
      Expense.init(),
    ]);
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (server) {
      await server.stop();
    }
  });

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Wedding.deleteMany({}),
      WeddingMembership.deleteMany({}),
      Event.deleteMany({}),
      Expense.deleteMany({}),
    ]);
  });

  it("creates, reads, updates, summarizes, and deletes expenses scoped to wedding", async () => {
    // 1. Setup user & wedding
    const sessionRes = await signup(
      authRequest("signup", {
        name: "Samreen Inayat",
        email: "samreen@example.com",
        password: "Password123!",
      }),
    );
    const sessionCookie = cookieOf(sessionRes);

    const weddingRes = await createWeddingRoute(
      apiRequest("POST", "/api/wedding", sessionCookie, {
        brideName: "Saman",
        groomName: "Hasan",
        weddingDate: "2027-02-14",
        timeZone: "Asia/Kolkata",
      }),
    );
    expect(weddingRes.status).toBe(201);

    // 2. Create ceremony event
    const eventRes = await createEventRoute(
      apiRequest("POST", "/api/events", sessionCookie, {
        name: "Nikah Ceremony",
        type: "NIKAH",
        startsAt: "2027-02-14T11:00:00.000Z",
      }),
    );
    const eventJson = await eventRes.json();
    const eventId = eventJson.data.id;

    // 3. Create expense linked to ceremony
    const createRes = await createExpenseRoute(
      apiRequest("POST", "/api/expenses", sessionCookie, {
        title: "Photographer 1st Advance",
        amountPaise: 5000000, // ₹50,000
        currency: "INR",
        expenseDate: "2027-02-10",
        category: "PHOTOGRAPHY",
        paymentKind: "ADVANCE",
        eventId,
        notes: "Studio Adnan Advance",
      }),
    );
    expect(createRes.status).toBe(201);
    const createJson = await createRes.json();
    expect(createJson.data.title).toBe("Photographer 1st Advance");
    expect(createJson.data.amountRupees).toBe(50000);
    expect(createJson.data.paymentKind).toBe("ADVANCE");
    expect(createJson.data.event?.name).toBe("Nikah Ceremony");
    const expenseId = createJson.data.id;

    // 4. Create second expense (Catering)
    await createExpenseRoute(
      apiRequest("POST", "/api/expenses", sessionCookie, {
        title: "Catering Deposit",
        amountPaise: 10000000, // ₹1,00,000
        currency: "INR",
        expenseDate: "2027-02-11",
        category: "CATERING",
        notes: "Royal Feasts",
      }),
    );

    // 5. List expenses
    const listRes = await listExpensesRoute(
      apiRequest("GET", "/api/expenses", sessionCookie),
    );
    expect(listRes.status).toBe(200);
    const listJson = await listRes.json();
    expect(listJson.data.length).toBe(2);
    expect(listJson.pagination.total).toBe(2);

    // 6. Filter by category
    const filterRes = await listExpensesRoute(
      apiRequest("GET", "/api/expenses?category=PHOTOGRAPHY", sessionCookie),
    );
    const filterJson = await filterRes.json();
    expect(filterJson.data.length).toBe(1);
    expect(filterJson.data[0].category).toBe("PHOTOGRAPHY");

    // 7. Get summary
    const summaryRes = await getSummaryRoute(
      apiRequest("GET", "/api/expenses/summary", sessionCookie),
    );
    expect(summaryRes.status).toBe(200);
    const summaryJson = await summaryRes.json();
    expect(summaryJson.data.totalExpenseRupees).toBe(150000);
    expect(summaryJson.data.totalTransactions).toBe(2);
    expect(summaryJson.data.advanceRupees).toBe(50000);
    expect(summaryJson.data.advanceCount).toBe(1);
    expect(summaryJson.data.byCategory.length).toBe(2);

    // 8. Update expense
    const updateRes = await updateExpenseRoute(
      apiRequest("PATCH", `/api/expenses/${expenseId}`, sessionCookie, {
        amountPaise: 6000000, // Updated to ₹60,000
        paymentKind: "PARTIAL",
        notes: "Updated advance receipt #4892",
      }),
      { params: Promise.resolve({ expenseId }) },
    );
    expect(updateRes.status).toBe(200);
    const updateJson = await updateRes.json();
    expect(updateJson.data.amountRupees).toBe(60000);
    expect(updateJson.data.paymentKind).toBe("PARTIAL");

    // 9. Get single expense
    const getRes = await getExpenseRoute(
      apiRequest("GET", `/api/expenses/${expenseId}`, sessionCookie),
      { params: Promise.resolve({ expenseId }) },
    );
    expect(getRes.status).toBe(200);
    const getJson = await getRes.json();
    expect(getJson.data.id).toBe(expenseId);
    expect(getJson.data.paymentKind).toBe("PARTIAL");

    const afterUpdateList = await listExpensesRoute(
      apiRequest("GET", "/api/expenses?paymentKind=PARTIAL", sessionCookie),
    );
    const afterUpdateJson = await afterUpdateList.json();
    expect(
      afterUpdateJson.data.map((expense: { id: string }) => expense.id),
    ).toEqual([expenseId]);

    // 10. Delete expense
    const deleteRes = await deleteExpenseRoute(
      apiRequest("DELETE", `/api/expenses/${expenseId}`, sessionCookie),
      { params: Promise.resolve({ expenseId }) },
    );
    expect(deleteRes.status).toBe(204);

    // Verify deletion
    const afterDeleteRes = await listExpensesRoute(
      apiRequest("GET", "/api/expenses", sessionCookie),
    );
    const afterDeleteJson = await afterDeleteRes.json();
    expect(afterDeleteJson.data.length).toBe(1);
  });

  it("rejects an impossible date, an oversized amount, and another wedding's event", async () => {
    const sessionRes = await signup(
      authRequest("signup", {
        name: "Ayesha Khan",
        email: "ayesha@example.com",
        password: "Password123!",
      }),
    );
    const sessionCookie = cookieOf(sessionRes);
    const weddingRes = await createWeddingRoute(
      apiRequest("POST", "/api/wedding", sessionCookie, {
        brideName: "Ayesha",
        groomName: "Omar",
        weddingDate: "2027-03-01",
        timeZone: "Asia/Kolkata",
      }),
    );
    expect(weddingRes.status).toBe(201);

    const badDate = await createExpenseRoute(
      apiRequest("POST", "/api/expenses", sessionCookie, {
        title: "Venue hold",
        amountPaise: 100,
        expenseDate: "2027-02-31",
        category: "VENUE",
      }),
    );
    expect(badDate.status).toBe(400);

    const tooLarge = await createExpenseRoute(
      apiRequest("POST", "/api/expenses", sessionCookie, {
        title: "Venue hold",
        amountPaise: 100_000_000_001,
        expenseDate: "2027-02-10",
        category: "VENUE",
      }),
    );
    expect(tooLarge.status).toBe(400);

    const otherWedding = await Wedding.create({
      brideName: "Other",
      groomName: "Wedding",
      weddingDate: "2027-04-01",
      timeZone: "Asia/Kolkata",
      website: { slug: "other-wedding" },
      gallery: { tokenHash: "other-wedding-token" },
      createdByUserId: new mongoose.Types.ObjectId(),
    });
    const foreignEvent = await Event.create({
      weddingId: otherWedding._id,
      name: "Other ceremony",
      startsAt: new Date("2027-04-01T11:00:00.000Z"),
    });
    const foreign = await createExpenseRoute(
      apiRequest("POST", "/api/expenses", sessionCookie, {
        title: "Venue hold",
        amountPaise: 100,
        expenseDate: "2027-02-10",
        category: "VENUE",
        eventId: String(foreignEvent._id),
      }),
    );
    expect(foreign.status).toBe(404);

    const saved = await createExpenseRoute(
      apiRequest("POST", "/api/expenses", sessionCookie, {
        title: "Venue hold",
        amountPaise: 250050,
        expenseDate: "2027-02-10",
        category: "VENUE",
      }),
    );
    expect(saved.status).toBe(201);
    const savedJson = await saved.json();
    expect(savedJson.data.expenseDate).toBe("2027-02-10");
    expect(savedJson.data.amountRupees).toBe(2500.5);
  });
});
