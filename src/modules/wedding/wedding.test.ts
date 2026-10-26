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
import {
  GET as getWebsiteRoute,
  PATCH as updateWebsiteRoute,
} from "@/app/api/wedding/website/route";
import { GET as getPublicWeddingRoute } from "@/app/api/public/weddings/[slug]/route";
import {
  GET as getLivestreamRoute,
  PATCH as updateLivestreamRoute,
} from "@/app/api/wedding/livestream/route";
import { User } from "@/modules/auth/models";
import { Wedding, WeddingMembership } from "./models";
import { Event } from "@/modules/events/models";
import {
  gallerySharing,
  guestGallery,
  guestGalleryInfo,
  updateGallerySharing,
} from "@/modules/photos/guest-gallery";

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
  it("keeps guest QR stable, encrypted and isolated, and supports pausing", async () => {
    vi.stubEnv(
      "MEMBER_INVITATION_SECRET",
      "guest-gallery-test-secret-at-least-32-characters",
    );
    const owner = await signUp("qr-owner@example.com");
    const created = await createWeddingRoute(
      weddingRequest("POST", "/api/wedding", owner, wedding),
    );
    const id = (await created.json()).data.id;
    const [first, second] = await Promise.all([
      gallerySharing(id),
      gallerySharing(id),
    ]);
    expect(first.path).toBe(second.path);
    const token = first.path.split("/").pop()!;
    const stored = await Wedding.findById(id).lean();
    expect(stored?.gallery?.tokenHash).not.toBe(token);
    expect(stored?.gallery?.encryptedToken).not.toContain(token);
    expect(String((await guestGallery(token))._id)).toBe(id);
    expect(await guestGalleryInfo(token)).not.toHaveProperty("gallery");
    await expect(guestGallery("wrong-token")).rejects.toMatchObject({
      status: 404,
    });
    await updateGallerySharing(id, {
      isEnabled: true,
      guestUploadsEnabled: false,
    });
    await expect(guestGallery(token, true)).rejects.toMatchObject({
      status: 403,
    });
    expect((await guestGalleryInfo(token)).guestUploadsEnabled).toBe(false);
    await updateGallerySharing(id, {
      isEnabled: false,
      guestUploadsEnabled: false,
    });
    await expect(guestGallery(token)).rejects.toMatchObject({ status: 404 });
    await updateGallerySharing(id, {
      isEnabled: true,
      guestUploadsEnabled: true,
    });
    expect((await gallerySharing(id)).path).toBe(first.path);
  });
  it("creates one recoverable guest link for an older wedding without a token", async () => {
    vi.stubEnv(
      "MEMBER_INVITATION_SECRET",
      "guest-gallery-test-secret-at-least-32-characters",
    );
    const owner = await signUp("legacy-qr@example.com");
    const created = await createWeddingRoute(
      weddingRequest("POST", "/api/wedding", owner, wedding),
    );
    const id = (await created.json()).data.id;
    await Wedding.updateOne(
      { _id: id },
      { $unset: { "gallery.encryptedToken": "" } },
    );
    const [first, second] = await Promise.all([
      gallerySharing(id),
      gallerySharing(id),
    ]);
    expect(first.path).toBe(second.path);
    expect(first.path).toMatch(/^\/gallery\/[A-Za-z0-9_-]{32}$/);
    const token = first.path.split("/").pop()!;
    expect(String((await guestGallery(token))._id)).toBe(id);
  });
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

  it("manages wedding website settings and public website access", async () => {
    const owner = await signUp("website-test@example.com");
    await createWeddingRoute(
      weddingRequest("POST", "/api/wedding", owner, {
        ...wedding,
        brideName: "Saman",
        groomName: "Hasan",
      }),
    );
    const createdRes = await getWeddingRoute(
      weddingRequest("GET", "/api/wedding", owner),
    );
    const slug = (await createdRes.json()).data.website.slug;
    expect(slug).toBeTruthy();

    // 1. Initial website settings
    const initialSiteRes = await getWebsiteRoute(
      weddingRequest("GET", "/api/wedding/website", owner),
    );
    expect(initialSiteRes.status).toBe(200);
    const initialSite = (await initialSiteRes.json()).data;
    expect(initialSite.theme).toBe("CLASSIC");
    expect(initialSite.isPublished).toBe(false);
    expect(initialSite.slug).toBe(slug);

    // 2. Public route returns 404 while unpublished
    const publicDraftRes = await getPublicWeddingRoute(
      new NextRequest(`${origin}/api/public/weddings/${slug}`, {
        method: "GET",
      }),
      { params: Promise.resolve({ slug }) },
    );
    expect(publicDraftRes.status).toBe(404);

    // 3. Publish and update theme & welcome message
    const updateSiteRes = await updateWebsiteRoute(
      weddingRequest("PATCH", "/api/wedding/website", owner, {
        theme: "MODERN",
        welcomeMessage: "Welcome to our celebration!",
        isPublished: true,
      }),
    );
    expect(updateSiteRes.status).toBe(200);
    const updatedSite = (await updateSiteRes.json()).data;
    expect(updatedSite.theme).toBe("MODERN");
    expect(updatedSite.isPublished).toBe(true);
    expect(updatedSite.welcomeMessage).toBe("Welcome to our celebration!");

    // 4. Create an event to verify public itinerary inclusion
    const dbWedding = await Wedding.findOne({ "website.slug": slug });
    await Event.create({
      weddingId: dbWedding!._id,
      name: "Nikah Ceremony",
      type: "CEREMONY",
      startsAt: new Date("2027-12-18T10:00:00Z"),
      venueName: "Grand Mosque & Banquet",
      address: "Karachi, Pakistan",
    });

    // 5. Public route succeeds once published
    const publicLiveRes = await getPublicWeddingRoute(
      new NextRequest(`${origin}/api/public/weddings/${slug}`, {
        method: "GET",
      }),
      { params: Promise.resolve({ slug }) },
    );
    expect(publicLiveRes.status).toBe(200);
    const publicData = (await publicLiveRes.json()).data;
    expect(publicData.brideName).toBe("Saman");
    expect(publicData.groomName).toBe("Hasan");
    expect(publicData.theme).toBe("MODERN");
    expect(publicData.welcomeMessage).toBe("Welcome to our celebration!");
    expect(publicData.events.length).toBe(1);
    expect(publicData.events[0].name).toBe("Nikah Ceremony");
    expect(publicLiveRes.headers.get("cache-control")).toBe("no-store");
    expect(publicData).not.toHaveProperty("createdByUserId");
    expect(publicData.gallery).not.toHaveProperty("tokenHash");
    for (const input of [
      { theme: "INVALID" },
      { welcomeMessage: "x".repeat(1501) },
      { slug: "changed" },
      {},
    ]) {
      const invalid = await updateWebsiteRoute(
        weddingRequest("PATCH", "/api/wedding/website", owner, input),
      );
      expect(invalid.status).toBe(400);
    }
    const anonymous = await getWebsiteRoute(
      weddingRequest("GET", "/api/wedding/website", ""),
    );
    expect(anonymous.status).toBe(401);
    await updateWebsiteRoute(
      weddingRequest("PATCH", "/api/wedding/website", owner, {
        isPublished: false,
      }),
    );
    const hidden = await getPublicWeddingRoute(
      new NextRequest(`${origin}/api/public/weddings/${slug}`),
      { params: Promise.resolve({ slug }) },
    );
    expect(hidden.status).toBe(404);
    const settings = await getWebsiteRoute(
      weddingRequest("GET", "/api/wedding/website", owner),
    );
    expect((await settings.json()).data.slug).toBe(slug);
  });

  it("saves a YouTube livestream and hides it until the website is published", async () => {
    const owner = await signUp("stream-test@example.com");
    await createWeddingRoute(
      weddingRequest("POST", "/api/wedding", owner, {
        ...wedding,
        brideName: "Aisha",
        groomName: "Omar",
      }),
    );
    const created = await getWeddingRoute(
      weddingRequest("GET", "/api/wedding", owner),
    );
    const slug = (await created.json()).data.website.slug;
    const initial = await getLivestreamRoute(
      weddingRequest("GET", "/api/wedding/livestream", owner),
    );
    expect(initial.status).toBe(200);
    expect((await initial.json()).data).toMatchObject({
      youtubeUrl: null,
      isEnabled: false,
      videoId: null,
    });

    const invalid = await updateLivestreamRoute(
      weddingRequest("PATCH", "/api/wedding/livestream", owner, {
        youtubeUrl: "https://example.com/watch?v=dQw4w9WgXcQ",
        isEnabled: true,
      }),
    );
    expect(invalid.status).toBe(400);
    const missing = await updateLivestreamRoute(
      weddingRequest("PATCH", "/api/wedding/livestream", owner, {
        isEnabled: true,
      }),
    );
    expect(missing.status).toBe(400);

    const saved = await updateLivestreamRoute(
      weddingRequest("PATCH", "/api/wedding/livestream", owner, {
        youtubeUrl: "https://youtu.be/dQw4w9WgXcQ",
        isEnabled: true,
      }),
    );
    expect(saved.status).toBe(200);
    expect((await saved.json()).data.videoId).toBe("dQw4w9WgXcQ");

    await updateWebsiteRoute(
      weddingRequest("PATCH", "/api/wedding/website", owner, {
        isPublished: true,
      }),
    );
    const live = await getPublicWeddingRoute(
      new NextRequest(`${origin}/api/public/weddings/${slug}`),
      { params: Promise.resolve({ slug }) },
    );
    const liveBody = (await live.json()).data;
    expect(liveBody.livestream).toEqual({
      enabled: true,
      youtubeUrl: "https://youtu.be/dQw4w9WgXcQ",
      videoId: "dQw4w9WgXcQ",
    });
    expect(liveBody).not.toHaveProperty("livestream.token");

    const removed = await updateLivestreamRoute(
      weddingRequest("PATCH", "/api/wedding/livestream", owner, {
        youtubeUrl: null,
        isEnabled: false,
      }),
    );
    expect(removed.status).toBe(200);
    const after = await getPublicWeddingRoute(
      new NextRequest(`${origin}/api/public/weddings/${slug}`),
      { params: Promise.resolve({ slug }) },
    );
    expect((await after.json()).data.livestream.enabled).toBe(false);
    const anonymous = await getLivestreamRoute(
      weddingRequest("GET", "/api/wedding/livestream", ""),
    );
    expect(anonymous.status).toBe(401);
  });
});
