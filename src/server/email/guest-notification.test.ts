import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  sendGuestInvitationEmail,
  sendGuestReminderEmail,
} from "./guest-notification";

const invitationInput = {
  to: "guest@example.com",
  guestName: "Zaid Bhai & Family",
  coupleName: "Sara & Neel",
  weddingDate: "2026-10-24",
  venue: "Grand Ballroom, Mumbai",
  events: [
    {
      name: "Sangeet & Qawwali Night",
      startsAt: "2026-10-23T19:30:00.000Z",
      venueName: "Courtyard Garden",
    },
    {
      name: "Nikah Ceremony & Feast",
      startsAt: "2026-10-24T13:00:00.000Z",
      venueName: "Heritage Hall",
    },
  ],
  inviteUrl: "https://makemymarriage.com/invite/tok_123",
  isFamily: true,
  maxGuests: 4,
};

const reminderInput = {
  to: "guest@example.com",
  guestName: "Zaid Bhai",
  coupleName: "Sara & Neel",
  weddingDate: "2026-10-24",
  venue: "Grand Ballroom, Mumbai",
  inviteUrl: "https://makemymarriage.com/invite/tok_123",
  isFamily: false,
};

describe("Volanea guest invitation and reminder email delivery", () => {
  beforeEach(() => {
    vi.stubEnv("VOLANEA_API_KEY", "sk_test_guest-test-key");
    vi.stubEnv("VOLANEA_FROM", "Make My Marriage <invite@example.com>");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("delivers personalized guest wedding invitation via Volanea API", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        success: true,
        data: {
          messages: [{ id: "email-guest-inv-1", status: "queued" }],
          testMode: false,
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await sendGuestInvitationEmail(invitationInput);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.volanea.com/v1/send");
    expect(options.headers).toMatchObject({
      Authorization: "Bearer sk_test_guest-test-key",
    });

    const body = JSON.parse(String(options.body));
    expect(body).toMatchObject({
      from: "invite@example.com",
      fromName: "Make My Marriage",
      to: "guest@example.com",
      subject: "Wedding invitation from Sara & Neel",
    });

    expect(body.text).toContain("Assalamu alaikum Zaid Bhai & Family");
    expect(body.text).toContain("Sara & Neel");
    expect(body.text).toContain("https://makemymarriage.com/invite/tok_123");
    expect(body.text).toContain("Sangeet & Qawwali Night");
    expect(body.html).toContain("Zaid Bhai &amp; Family");
    expect(body.html).toContain("Sara &amp; Neel");
    expect(body.html).toContain(
      'href="https://makemymarriage.com/invite/tok_123"',
    );
  });

  it("delivers RSVP reminder email via Volanea API", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        success: true,
        data: {
          messages: [{ id: "email-guest-rem-1", status: "queued" }],
          testMode: false,
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await sendGuestReminderEmail(reminderInput);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.volanea.com/v1/send");

    const body = JSON.parse(String(options.body));
    expect(body).toMatchObject({
      from: "invite@example.com",
      fromName: "Make My Marriage",
      to: "guest@example.com",
      subject: "A gentle reminder to reply — Sara & Neel",
    });

    expect(body.text).toContain("Assalamu alaikum Zaid Bhai");
    expect(body.text).toContain("we have not yet received your reply");
    expect(body.html).toContain("RSVP Reminder");
    expect(body.html).toContain(
      'href="https://makemymarriage.com/invite/tok_123"',
    );
  });

  it("identifies domain verification errors properly", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { error: { code: "domain_not_verified" } },
          { status: 403 },
        ),
      ),
    );

    await expect(
      sendGuestInvitationEmail(invitationInput),
    ).rejects.toMatchObject({
      reason: "DOMAIN_NOT_VERIFIED",
    });
  });

  it("rejects test mode responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          success: true,
          data: {
            messages: [{ id: "email-1", status: "queued" }],
            testMode: true,
          },
        }),
      ),
    );

    await expect(sendGuestReminderEmail(reminderInput)).rejects.toMatchObject({
      reason: "TEST_MODE",
    });
  });
});
