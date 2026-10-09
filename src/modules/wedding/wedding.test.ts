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
import {
  POST as createWeddingRoute,
  PATCH as updateWeddingRoute,
  GET as getWeddingRoute,
} from "@/app/api/wedding/route";
import { GET as listMembersRoute } from "@/app/api/members/route";
import {
  PATCH as updateMemberRoute,
  DELETE as removeMemberRoute,
} from "@/app/api/members/[membershipId]/route";
import { User } from "@/modules/auth/models";
import { Wedding, WeddingMembership } from "./models";

const origin = "http://localhost:3000";
const wedding = {
  brideName: "Meher Fatima",
  groomName: "Zayan Malik",
  weddingDate: "2027-12-18",
  timeZone: "Asia/Karachi",
  location: { formattedAddress: "Karachi, Pakistan" },
};

function authRequest(path: string, body: unknown) {
  return new NextRequest(`${origin}/api/auth/${path}`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
function weddingRequest(
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

describe("wedding API", () => {
  let server: MongoMemoryReplSet;
  beforeAll(async () => {
    server = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    vi.stubEnv("MONGODB_URI", server.getUri());
    vi.stubEnv("APP_ORIGIN", origin);
    await mongoose.connect(server.getUri());
    await Promise.all([User.init(), Wedding.init(), WeddingMembership.init()]);
  }, 60000);
  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Wedding.deleteMany({}),
      WeddingMembership.deleteMany({}),
      mongoose.connection.collection("auth_rate_limits").deleteMany({}),
    ]);
  });
  afterAll(async () => {
    await mongoose.disconnect();
    delete (globalThis as { mongooseConnection?: unknown }).mongooseConnection;
    await server?.stop();
    vi.unstubAllEnvs();
  });

  async function signUp(email: string) {
    const response = await signup(
      authRequest("signup", {
        name: "Ayesha Qureshi",
        email,
        password: "family walima passphrase",
      }),
    );
    expect(response.status).toBe(201);
    return cookieOf(response);
  }

  it("creates one Admin wedding and preserves its address when names and date change", async () => {
    const cookie = await signUp("ayesha@example.com");
    const created = await createWeddingRoute(
      weddingRequest("POST", "/api/wedding", cookie, {
        ...wedding,
        title: "Meher & Zayan",
        description: "A family Walima.",
      }),
    );
    expect(created.status).toBe(201);
    const body = await created.json();
    expect(body.data.website.slug).toBe("meher-fatima-zayan-malik-18122027");
    expect(body.data.gallery.tokenHash).toBeUndefined();
    expect(await Wedding.countDocuments()).toBe(1);
    expect(await WeddingMembership.findOne()).toMatchObject({ role: "ADMIN" });

    const again = await createWeddingRoute(
      weddingRequest("POST", "/api/wedding", cookie, wedding),
    );
    expect(again.status).toBe(409);
    expect(await Wedding.countDocuments()).toBe(1);

    const updated = await updateWeddingRoute(
      weddingRequest("PATCH", "/api/wedding", cookie, {
        brideName: "Simran",
        groomName: "Aman",
        weddingDate: "2028-01-10",
        location: { city: "Karachi" },
      }),
    );
    expect(updated.status).toBe(200);
    const saved = await Wedding.findOne().lean();
    expect(saved?.brideName).toBe("Simran");
    expect(saved?.groomName).toBe("Aman");
    expect(saved?.weddingDate).toBe("2028-01-10");
    expect(saved?.website?.slug).toBe(body.data.website.slug);
    expect(saved?.location?.formattedAddress).toBe("Karachi, Pakistan");
    expect(saved?.location?.city).toBe("Karachi");

    const cleared = await updateWeddingRoute(
      weddingRequest("PATCH", "/api/wedding", cookie, {
        title: "",
        description: null,
        location: { formattedAddress: "" },
      }),
    );
    expect(cleared.status).toBe(200);
    const afterClear = await Wedding.findOne().lean();
    expect(afterClear?.title).toBeNull();
    expect(afterClear?.description).toBeNull();
    expect(afterClear?.location?.formattedAddress).toBeNull();
    expect(afterClear?.website?.slug).toBe(body.data.website.slug);
    expect(afterClear?.gallery?.tokenHash).toBe(saved?.gallery?.tokenHash);
  });

  it("rejects an impossible date, an empty update, and an oversized body", async () => {
    const cookie = await signUp("date@example.com");
    const invalid = await createWeddingRoute(
      weddingRequest("POST", "/api/wedding", cookie, {
        ...wedding,
        weddingDate: "2027-02-31",
      }),
    );
    expect(invalid.status).toBe(400);
    expect(await Wedding.countDocuments()).toBe(0);

    await createWeddingRoute(
      weddingRequest("POST", "/api/wedding", cookie, wedding),
    );
    const empty = await updateWeddingRoute(
      weddingRequest("PATCH", "/api/wedding", cookie, { location: {} }),
    );
    expect(empty.status).toBe(400);

    const huge = weddingRequest("POST", "/api/wedding", cookie, {
      note: "x".repeat(9000),
    });
    expect((await createWeddingRoute(huge)).status).toBe(400);
  });

  it("keeps the last Admin and hides another wedding's member", async () => {
    const owner = await signUp("owner@example.com");
    await createWeddingRoute(
      weddingRequest("POST", "/api/wedding", owner, wedding),
    );
    const members = await listMembersRoute(
      weddingRequest("GET", "/api/members", owner),
    );
    const membershipId = (await members.json()).data[0].membershipId;

    const demoted = await updateMemberRoute(
      weddingRequest("PATCH", `/api/members/${membershipId}`, owner, {
        role: "MANAGER",
      }),
      { params: Promise.resolve({ membershipId }) },
    );
    expect(demoted.status).toBe(409);
    const removed = await removeMemberRoute(
      weddingRequest("DELETE", `/api/members/${membershipId}`, owner),
      { params: Promise.resolve({ membershipId }) },
    );
    expect(removed.status).toBe(409);
    expect(await WeddingMembership.countDocuments({ role: "ADMIN" })).toBe(1);

    const malformed = await updateMemberRoute(
      weddingRequest("PATCH", "/api/members/not-an-id", owner, {
        role: "MANAGER",
      }),
      { params: Promise.resolve({ membershipId: "not-an-id" }) },
    );
    expect(malformed.status).toBe(400);

    const other = await signUp("other@example.com");
    await createWeddingRoute(
      weddingRequest("POST", "/api/wedding", other, {
        ...wedding,
        brideName: "Hania",
        groomName: "Bilal",
      }),
    );
    const cross = await getWeddingRoute(
      weddingRequest("GET", "/api/wedding", other),
    );
    expect((await cross.json()).data.brideName).toBe("Hania");
    const foreign = await removeMemberRoute(
      weddingRequest("DELETE", `/api/members/${membershipId}`, other),
      { params: Promise.resolve({ membershipId }) },
    );
    expect(foreign.status).toBe(404);
    expect(await WeddingMembership.countDocuments()).toBe(2);
  });

  it.each(["remove", "demote"])(
    "cannot %s both Admins at the same time",
    async (operation) => {
      const owner = await signUp("first-admin@example.com");
      await createWeddingRoute(
        weddingRequest("POST", "/api/wedding", owner, wedding),
      );
      const weddingId = (await Wedding.findOne())!._id;
      const second = await User.create({
        name: "Second Admin",
        email: "second-admin@example.com",
        emailNormalized: "second-admin@example.com",
        passwordHash: "not-used",
      });
      const extra = await WeddingMembership.create({
        userId: second._id,
        weddingId,
        role: "ADMIN",
        joinedAt: new Date(),
      });
      const members = await WeddingMembership.find({ role: "ADMIN" });
      const responses = await Promise.all(
        members.map((member) =>
          operation === "demote"
            ? updateMemberRoute(
                weddingRequest("PATCH", `/api/members/${member._id}`, owner, {
                  role: "MANAGER",
                }),
                {
                  params: Promise.resolve({ membershipId: String(member._id) }),
                },
              )
            : removeMemberRoute(
                weddingRequest("DELETE", `/api/members/${member._id}`, owner),
                {
                  params: Promise.resolve({ membershipId: String(member._id) }),
                },
              ),
        ),
      );
      expect(responses.map((response) => response.status).sort()).toEqual([
        operation === "demote" ? 200 : 204,
        409,
      ]);
      expect(await WeddingMembership.countDocuments({ role: "ADMIN" })).toBe(1);
      expect(String(extra._id)).toBeTruthy();
    },
  );
});
