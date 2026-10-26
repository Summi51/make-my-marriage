import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
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
vi.mock("@/server/email/guest-notification", () => ({
  sendGuestReminderEmail: vi.fn(async () => undefined),
}));

import { sendGuestReminderEmail } from "@/server/email/guest-notification";
import { Wedding } from "@/modules/wedding/models";
import { Event } from "@/modules/events/models";
import { Guest } from "./models";
import { runDueGuestReminders } from "./reminder-jobs";
import { POST as runRemindersRoute } from "@/app/api/internal/jobs/reminders/route";
import { NextRequest } from "next/server";

describe("scheduled guest reminders", () => {
  let server: MongoMemoryReplSet;

  beforeAll(async () => {
    server = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    vi.stubEnv("MONGODB_URI", server.getUri());
    vi.stubEnv("APP_ORIGIN", "https://makemymarriage.com");
    vi.stubEnv("CRON_SECRET", "a".repeat(32));
    await mongoose.connect(server.getUri());
    await Promise.all([Wedding.init(), Event.init(), Guest.init()]);
  });

  beforeEach(async () => {
    vi.mocked(sendGuestReminderEmail).mockClear();
    await Promise.all([
      Wedding.deleteMany({}),
      Event.deleteMany({}),
      Guest.deleteMany({}),
      mongoose.connection
        .collection("guest_reminder_dispatches")
        .deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await server.stop();
  });

  it("emails pending guests before the wedding and accepted guests before an event", async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const wedding = await Wedding.create({
      brideName: "Ayesha",
      groomName: "Zayan",
      weddingDate: "2026-10-13",
      timeZone: "Asia/Kolkata",
      website: { slug: `ayesha-zayan-${ownerId.toString()}` },
      gallery: { tokenHash: `gallery-${ownerId.toString()}` },
      createdByUserId: ownerId,
    });
    const nikah = await Event.create({
      weddingId: wedding._id,
      name: "Nikah",
      startsAt: new Date("2026-10-11T08:30:00.000Z"),
      venueName: "Masjid Hall",
    });
    await Guest.create([
      {
        weddingId: wedding._id,
        name: "Pending Guest",
        email: "pending@example.com",
        phone: "+919800000001",
        rsvpStatus: "PENDING",
        invitationToken: "pending-token",
      },
      {
        weddingId: wedding._id,
        name: "Accepted Guest",
        email: "accepted@example.com",
        phone: "+919800000002",
        rsvpStatus: "ATTENDING",
        invitedEventIds: [nikah._id],
        invitationToken: "accepted-token",
      },
    ]);

    const now = new Date("2026-10-10T06:30:00.000Z");
    const first = await runDueGuestReminders(now);
    const second = await runDueGuestReminders(now);

    expect(first).toMatchObject({ emailed: 2, whatsappReady: 2 });
    expect(second).toMatchObject({ emailed: 0, whatsappReady: 0, skipped: 4 });
    expect(sendGuestReminderEmail).toHaveBeenCalledTimes(2);
    expect(vi.mocked(sendGuestReminderEmail).mock.calls[0][0]).toMatchObject({
      to: "pending@example.com",
      kind: "rsvp",
    });
    expect(vi.mocked(sendGuestReminderEmail).mock.calls[1][0]).toMatchObject({
      to: "accepted@example.com",
      kind: "event",
      occasionName: "Nikah",
    });
  });

  it("rejects a job request without the scheduler secret", async () => {
    const response = await runRemindersRoute(
      new NextRequest("http://localhost:3000/api/internal/jobs/reminders", {
        method: "POST",
      }),
    );
    expect(response.status).toBe(401);
  });
});
