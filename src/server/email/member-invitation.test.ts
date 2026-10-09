import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  invitationEntryUrl,
  sendMemberInvitationEmail,
} from "./member-invitation";

const input = {
  to: "manager@example.com",
  inviterName: "Ayesha",
  coupleName: "Saman & Hasan",
  weddingDate: "2026-10-01",
  role: "MANAGER" as const,
  acceptUrl: "https://example.com/member-invitations/token",
  accountExists: false,
  expiresAt: new Date("2027-12-31T00:00:00.000Z"),
};

describe("Volanea member invitation delivery", () => {
  beforeEach(() => {
    vi.stubEnv("VOLANEA_API_KEY", "sk_test_local-test-key");
    vi.stubEnv("VOLANEA_FROM", "Make My Marriage <invites@example.com>");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends the invitation to Volanea with the expected request", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        success: true,
        data: {
          messages: [{ id: "email-1", status: "queued" }],
          testMode: false,
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await sendMemberInvitationEmail(input);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.volanea.com/v1/send");
    expect(options.headers).toMatchObject({
      Authorization: "Bearer sk_test_local-test-key",
    });
    const body = JSON.parse(String(options.body));
    expect(body).toMatchObject({
      from: "invites@example.com",
      fromName: "Make My Marriage",
      to: "manager@example.com",
      subject: "Join Saman & Hasan on Make My Marriage",
    });
    expect(body).not.toHaveProperty("entryUrl");
    const signupUrl = invitationEntryUrl(input.acceptUrl, false, input.to);
    expect(signupUrl).toBe(
      "https://example.com/signup?next=%2Fmember-invitations%2Ftoken&email=manager%40example.com",
    );
    expect(body.text).toContain("Saman & Hasan");
    expect(body.text).toContain("1 October 2026");
    expect(body.text).toContain("Open invitation");
    expect(body.text).toContain(input.acceptUrl);
    expect(body.html).toContain("Saman &amp; Hasan");
    expect(body.html).toContain(`href="${input.acceptUrl}"`);
    expect(body.html).toContain("Assigned role");
    expect(body.html).not.toContain("/signup?");
  });

  it("keeps the invitation landing link for registered members too", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        data: { messages: [{ id: "email-3" }], testMode: false },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await sendMemberInvitationEmail({ ...input, accountExists: true });

    const [, options] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const body = JSON.parse(String(options.body));
    const loginUrl = invitationEntryUrl(input.acceptUrl, true, input.to);
    expect(loginUrl).toBe(
      "https://example.com/login?next=%2Fmember-invitations%2Ftoken&email=manager%40example.com",
    );
    expect(body.html).toContain(`href="${input.acceptUrl}"`);
    expect(body.html).not.toContain("/login?");
    expect(body.html).toContain("Sign in");
    expect(body.html).not.toContain("/signup?");
  });

  it("accepts a named sender quoted in a hosting environment variable", async () => {
    vi.stubEnv("VOLANEA_FROM", '"Make My Marriage <invites@example.com>"');
    const fetchMock = vi.fn(async () =>
      Response.json({ data: { messages: [{ id: "quoted-sender" }] } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await sendMemberInvitationEmail(input);
    const [, options] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(JSON.parse(String(options.body))).toMatchObject({
      from: "invites@example.com",
      fromName: "Make My Marriage",
    });
  });

  it("renders the Admin role and escapes names in HTML", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        data: {
          messages: [{ id: "email-2", status: "queued" }],
          testMode: false,
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await sendMemberInvitationEmail({
      ...input,
      role: "ADMIN",
      inviterName: "Ayesha <script>alert(1)</script>",
      coupleName: "Meher & Zayan",
    });

    const [, options] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const body = JSON.parse(String(options.body));
    expect(body.text).toContain("as an Admin");
    expect(body.html).toContain("Assigned role");
    expect(body.html).toContain(">Admin</p>");
    expect(body.html).toContain("Ayesha &lt;script&gt;");
    expect(body.html).not.toContain("<script>");
  });

  it("does not report a test-mode response as a sent invitation", async () => {
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

    await expect(sendMemberInvitationEmail(input)).rejects.toMatchObject({
      reason: "TEST_MODE",
    });
  });

  it("identifies a domain verification failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { error: { code: "domain_not_verified" } },
          { status: 403 },
        ),
      ),
    );

    await expect(sendMemberInvitationEmail(input)).rejects.toMatchObject({
      reason: "DOMAIN_NOT_VERIFIED",
    });
  });

  it("does not treat a skipped recipient as a delivered invitation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          success: true,
          data: {
            messages: [{ skipped: "suppressed" }],
            testMode: false,
          },
        }),
      ),
    );

    await expect(sendMemberInvitationEmail(input)).rejects.toMatchObject({
      reason: "DELIVERY_FAILED",
    });
  });
});
