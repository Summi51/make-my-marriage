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
  GET as listGuestsRoute,
  POST as createGuestRoute,
} from "@/app/api/guests/route";
import {
  GET as getGuestRoute,
  PATCH as updateGuestRoute,
  DELETE as deleteGuestRoute,
} from "@/app/api/guests/[guestId]/route";
import { GET as getInvitationLinkRoute } from "@/app/api/guests/[guestId]/invitation-link/route";
import { GET as getRsvpSummaryRoute } from "@/app/api/guests/rsvp-summary/route";
import { POST as sendInvitationRoute } from "@/app/api/guests/[guestId]/send-invitation/route";
import { POST as sendReminderRoute } from "@/app/api/guests/[guestId]/send-reminder/route";
import { POST as batchSendRemindersRoute } from "@/app/api/guests/send-reminders/route";
import { GET as getPublicInvitationRoute } from "@/app/api/public/invitations/[token]/route";
import { POST as submitPublicRsvpRoute } from "@/app/api/public/invitations/[token]/rsvp/route";
import { User } from "@/modules/auth/models";
import { Wedding, WeddingMembership } from "@/modules/wedding/models";
import { Event } from "@/modules/events/models";
import { Guest } from "./models";

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

describe("guests API, invitation link, and RSVP use-cases", () => {
  let server: MongoMemoryReplSet;

  beforeAll(async () => {
    server = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    vi.stubEnv("MONGODB_URI", server.getUri());
    vi.stubEnv("APP_ORIGIN", origin);
    vi.stubEnv("MEMBER_INVITATION_SECRET", "a".repeat(32));
    await mongoose.connect(server.getUri());
    await Promise.all([
      User.init(),
      Wedding.init(),
      WeddingMembership.init(),
      Event.init(),
      Guest.init(),
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await server.stop();
    vi.unstubAllEnvs();
  });

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Wedding.deleteMany({}),
      WeddingMembership.deleteMany({}),
      Event.deleteMany({}),
      Guest.deleteMany({}),
    ]);
  });

  it("creates, retrieves, updates, links, and RSVPs guests with family option", async () => {
    // 1. Sign up user
    const signupRes = await signup(
      authRequest("signup", {
        name: "Samreen Inayat",
        email: "samreen@example.com",
        password: "Password123!",
      }),
    );
    expect(signupRes.status).toBe(201);
    const cookie = cookieOf(signupRes);

    // 2. Create wedding
    const weddingRes = await createWeddingRoute(
      apiRequest("POST", "/api/wedding", cookie, {
        brideName: "Sara",
        groomName: "Nabeel",
        weddingDate: "2026-11-20",
        location: {
          city: "Mumbai",
          country: "India",
          address: "The Royal Ballroom, Mumbai",
        },
      }),
    );
    expect(weddingRes.status).toBe(201);

    // 3. Create an event
    const eventRes = await createEventRoute(
      apiRequest("POST", "/api/events", cookie, {
        name: "Nikah Ceremony & Feast",
        startsAt: "2026-11-20T11:00:00Z",
        venueName: "The Grand Hall",
      }),
    );
    expect(eventRes.status).toBe(201);
    const { data: eventData } = await eventRes.json();
    const eventId = eventData.id;

    // 4. Create a guest with isFamily = true and maximum party size 4
    const guestRes = await createGuestRoute(
      apiRequest("POST", "/api/guests", cookie, {
        name: "Adil Bhai & family",
        email: "adil@example.com",
        phone: "+91 98765 43210",
        maxGuests: 4,
        isFamily: true,
        invitedEventIds: [eventId],
        notes: "Close family friends",
      }),
    );
    expect(guestRes.status).toBe(201);
    const { data: guestData } = await guestRes.json();
    expect(guestData.name).toBe("Adil Bhai & family");
    expect(guestData.isFamily).toBe(true);
    expect(guestData.maxGuests).toBe(4);
    expect(guestData.rsvpStatus).toBe("PENDING");
    const guestId = guestData.id;

    // 5. Get guest and list guests
    const getRes = await getGuestRoute(
      apiRequest("GET", `/api/guests/${guestId}`, cookie),
      { params: Promise.resolve({ guestId }) },
    );
    expect(getRes.status).toBe(200);
    const { data: fetchedGuest } = await getRes.json();
    expect(fetchedGuest.id).toBe(guestId);

    const listRes = await listGuestsRoute(
      apiRequest("GET", "/api/guests", cookie),
    );
    expect(listRes.status).toBe(200);
    const listJson = await listRes.json();
    expect(listJson.pagination.total).toBe(1);
    expect(listJson.data[0].id).toBe(guestId);

    // 6. Get invitation link
    const linkRes = await getInvitationLinkRoute(
      apiRequest("GET", `/api/guests/${guestId}/invitation-link`, cookie),
      { params: Promise.resolve({ guestId }) },
    );
    expect(linkRes.status).toBe(200);
    const { data: linkData } = await linkRes.json();
    expect(linkData.url).toContain("/invite/");
    expect(linkData.token).toBeDefined();
    const token = linkData.token;

    // 7. Resolve public invitation without auth
    const publicReq = new NextRequest(
      `${origin}/api/public/invitations/${token}`,
    );
    const publicRes = await getPublicInvitationRoute(publicReq, {
      params: Promise.resolve({ token }),
    });
    expect(publicRes.status).toBe(200);
    const { data: publicData } = await publicRes.json();
    expect(publicData.guest.name).toBe("Adil Bhai & family");
    expect(publicData.guest.maxGuests).toBe(4);
    expect(publicData.guest.isFamily).toBe(true);
    expect(publicData.events.length).toBe(1);
    expect(publicData.events[0].name).toBe("Nikah Ceremony & Feast");

    // 8. Submit public RSVP (Attending • 3 people)
    const rsvpReq = new NextRequest(
      `${origin}/api/public/invitations/${token}/rsvp`,
      {
        method: "POST",
        headers: { origin, "content-type": "application/json" },
        body: JSON.stringify({
          status: "ATTENDING",
          attendingCount: 3,
        }),
      },
    );
    const rsvpRes = await submitPublicRsvpRoute(rsvpReq, {
      params: Promise.resolve({ token }),
    });
    expect(rsvpRes.status).toBe(200);
    const { data: rsvpResult } = await rsvpRes.json();
    expect(rsvpResult.status).toBe("ATTENDING");
    expect(rsvpResult.attendingCount).toBe(3);

    // 9. Check RSVP summary
    const summaryRes = await getRsvpSummaryRoute(
      apiRequest("GET", "/api/guests/rsvp-summary", cookie),
    );
    expect(summaryRes.status).toBe(200);
    const { data: summaryData } = await summaryRes.json();
    expect(summaryData.totalGuests).toBe(1);
    expect(summaryData.attendingInvitations).toBe(1);
    expect(summaryData.totalPeopleAttending).toBe(3);

    // 9b. RSVP fields are server-owned and must be rejected by the CRUD route.
    const rsvpPatch = await updateGuestRoute(
      apiRequest("PATCH", `/api/guests/${guestId}`, cookie, {
        rsvpStatus: "NOT_ATTENDING",
      }),
      { params: Promise.resolve({ guestId }) },
    );
    expect(rsvpPatch.status).toBe(400);

    // 9c. Attendance above the maximum party size is rejected.
    const overCapacityReq = new NextRequest(
      `${origin}/api/public/invitations/${token}/rsvp`,
      {
        method: "POST",
        headers: { origin, "content-type": "application/json" },
        body: JSON.stringify({ status: "ATTENDING", attendingCount: 9 }),
      },
    );
    const overCapacityRes = await submitPublicRsvpRoute(overCapacityReq, {
      params: Promise.resolve({ token }),
    });
    expect(overCapacityRes.status).toBe(400);
    expect((await overCapacityRes.json()).error.code).toBe(
      "PARTY_SIZE_CHANGED",
    );

    // 10. Update guest (notes)
    const updateRes = await updateGuestRoute(
      apiRequest("PATCH", `/api/guests/${guestId}`, cookie, {
        notes: "Updated family note",
      }),
      { params: Promise.resolve({ guestId }) },
    );
    expect(updateRes.status).toBe(200);
    const { data: updatedGuest } = await updateRes.json();
    expect(updatedGuest.notes).toBe("Updated family note");

    // Archiving a celebration must not block a later phone edit that resubmits
    // the guest's existing links.
    await Event.updateOne(
      { _id: new mongoose.Types.ObjectId(eventId) },
      { $set: { archivedAt: new Date() } },
    );
    const phoneAfterArchive = await updateGuestRoute(
      apiRequest("PATCH", `/api/guests/${guestId}`, cookie, {
        phone: "+918730400057",
        invitedEventIds: [eventId],
      }),
      { params: Promise.resolve({ guestId }) },
    );
    expect(phoneAfterArchive.status).toBe(200);
    expect((await phoneAfterArchive.json()).data.phone).toBe("+918730400057");

    // 11. Delete guest
    const deleteRes = await deleteGuestRoute(
      apiRequest("DELETE", `/api/guests/${guestId}`, cookie),
      { params: Promise.resolve({ guestId }) },
    );
    expect(deleteRes.status).toBe(200);

    // 12. Public link is now 404
    const publicAfterDel = await getPublicInvitationRoute(publicReq, {
      params: Promise.resolve({ token }),
    });
    expect(publicAfterDel.status).toBe(404);
  });

  it("guards RSVP capacity, declining responses, and cross-wedding access", async () => {
    const ownerSignup = await signup(
      authRequest("signup", {
        name: "Capacity Owner",
        email: "capacity-owner@example.com",
        password: "Password123!",
      }),
    );
    const cookie = cookieOf(ownerSignup);
    await createWeddingRoute(
      apiRequest("POST", "/api/wedding", cookie, {
        brideName: "Ayesha",
        groomName: "Bilal",
        weddingDate: "2027-01-01",
        timeZone: "Asia/Kolkata",
      }),
    );

    const created = await createGuestRoute(
      apiRequest("POST", "/api/guests", cookie, {
        name: "Capacity Guest",
        maxGuests: 2,
      }),
    );
    const guestId = (await created.json()).data.id;
    const { token } = (
      await (
        await getInvitationLinkRoute(
          apiRequest("GET", `/api/guests/${guestId}/invitation-link`, cookie),
          { params: Promise.resolve({ guestId }) },
        )
      ).json()
    ).data;

    const rsvp = (body: unknown) =>
      submitPublicRsvpRoute(
        new NextRequest(`${origin}/api/public/invitations/${token}/rsvp`, {
          method: "POST",
          headers: { origin, "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
        { params: Promise.resolve({ token }) },
      );

    // Attendance above the party size is rejected before anything is written.
    expect(
      (await rsvp({ status: "ATTENDING", attendingCount: 3 })).status,
    ).toBe(400);

    // A guest may decline, and the count is forced to zero.
    const decline = await rsvp({ status: "NOT_ATTENDING", attendingCount: 0 });
    expect(decline.status).toBe(200);
    expect((await decline.json()).data).toMatchObject({
      status: "NOT_ATTENDING",
      attendingCount: 0,
    });

    // Then confirm attendance, which also bumps the document version.
    expect(
      (await rsvp({ status: "ATTENDING", attendingCount: 2 })).status,
    ).toBe(200);

    // The party size cannot drop below the recorded attendance.
    const shrink = await updateGuestRoute(
      apiRequest("PATCH", `/api/guests/${guestId}`, cookie, { maxGuests: 1 }),
      { params: Promise.resolve({ guestId }) },
    );
    expect(shrink.status).toBe(400);

    // Another wedding cannot reach this guest.
    const otherSignup = await signup(
      authRequest("signup", {
        name: "Other Owner",
        email: "other-owner@example.com",
        password: "Password123!",
      }),
    );
    const otherCookie = cookieOf(otherSignup);
    await createWeddingRoute(
      apiRequest("POST", "/api/wedding", otherCookie, {
        brideName: "Hina",
        groomName: "Omar",
        weddingDate: "2027-03-03",
        timeZone: "Asia/Kolkata",
      }),
    );
    const crossWedding = await getGuestRoute(
      apiRequest("GET", `/api/guests/${guestId}`, otherCookie),
      { params: Promise.resolve({ guestId }) },
    );
    expect(crossWedding.status).toBe(404);
  });

  it("tracks invitation delivery, reminders, and filters", async () => {
    // 1. Sign up user & create wedding
    const signupRes = await signup(
      authRequest("signup", {
        name: "Sara Planner",
        email: "sara-planner@example.com",
        password: "Password123!",
      }),
    );
    const cookie = cookieOf(signupRes);
    await createWeddingRoute(
      apiRequest("POST", "/api/wedding", cookie, {
        brideName: "Sara",
        groomName: "Neel",
        weddingDate: "2026-10-24",
        timeZone: "Asia/Kolkata",
      }),
    );

    // 2. Create 2 guests
    const g1Res = await createGuestRoute(
      apiRequest("POST", "/api/guests", cookie, {
        name: "Guest One",
        phone: "+919876543210",
        maxGuests: 2,
      }),
    );
    const { data: guest1 } = await g1Res.json();

    const g2Res = await createGuestRoute(
      apiRequest("POST", "/api/guests", cookie, {
        name: "Guest Two",
        email: "two@example.com",
        maxGuests: 4,
      }),
    );
    const { data: guest2 } = await g2Res.json();

    // 3. Check initial summary: 2 unsent, 0 sent
    const summary1Res = await getRsvpSummaryRoute(
      apiRequest("GET", "/api/guests/rsvp-summary", cookie),
    );
    const { data: s1 } = await summary1Res.json();
    expect(s1.totalGuests).toBe(2);
    expect(s1.totalCapacity).toBe(6);
    expect(s1.unsentInvitations).toBe(2);
    expect(s1.sentInvitations).toBe(0);

    // 4. Mark guest1 invitation sent
    const send1Res = await sendInvitationRoute(
      apiRequest("POST", `/api/guests/${guest1.id}/send-invitation`, cookie),
      { params: Promise.resolve({ guestId: guest1.id }) },
    );
    expect(send1Res.status).toBe(200);
    const { data: updatedG1 } = await send1Res.json();
    expect(updatedG1.invitationSentAt).not.toBeNull();

    // 5. Filter by UNSENT: should only return guest2
    const unsentListRes = await listGuestsRoute(
      apiRequest("GET", "/api/guests?invitationStatus=UNSENT", cookie),
    );
    const { data: unsentGuests } = await unsentListRes.json();
    expect(unsentGuests.length).toBe(1);
    expect(unsentGuests[0].id).toBe(guest2.id);

    // 6. Filter by SENT: should only return guest1
    const sentListRes = await listGuestsRoute(
      apiRequest("GET", "/api/guests?invitationStatus=SENT", cookie),
    );
    const { data: sentGuests } = await sentListRes.json();
    expect(sentGuests.length).toBe(1);
    expect(sentGuests[0].id).toBe(guest1.id);
    expect(sentGuests[0].invitationToken).toBeUndefined();

    // 7. Opening a chat is not a sent reminder, so it must not start the
    // 24-hour email cooldown.
    const rem1Res = await sendReminderRoute(
      apiRequest("POST", `/api/guests/${guest1.id}/send-reminder`, cookie),
      { params: Promise.resolve({ guestId: guest1.id }) },
    );
    expect(rem1Res.status).toBe(200);
    const { data: remG1 } = await rem1Res.json();
    expect(remG1.reminderCount).toBe(0);
    expect(remG1.lastReminderSentAt).toBeNull();

    // 8. A batch call without email delivery records nothing.
    const batchRes = await batchSendRemindersRoute(
      apiRequest("POST", "/api/guests/send-reminders", cookie),
    );
    expect(batchRes.status).toBe(200);
    const { data: batchResult } = await batchRes.json();
    expect(batchResult.sentCount).toBe(0);
    expect(batchResult.skippedRecent).toBe(0);
    expect(batchResult.emailsSent).toBe(0);
    expect(batchResult.emailsFailed).toBe(0);
    expect(batchResult.emailError).toBeNull();
  });
});
