import "server-only";
import { buildGuestMessage } from "@/modules/guests/messages";

export type GuestInvitationEmailInput = {
  to: string;
  guestName: string;
  coupleName: string;
  weddingDate?: string | Date | null;
  venue?: string | null;
  events?: Array<{
    name: string;
    startsAt?: string | null;
    venueName?: string | null;
  }>;
  inviteUrl: string;
  isFamily?: boolean;
  maxGuests?: number;
};

export type GuestReminderEmailInput = {
  to: string;
  guestName: string;
  coupleName: string;
  weddingDate?: string | Date | null;
  venue?: string | null;
  inviteUrl: string;
  isFamily?: boolean;
  maxGuests?: number;
  kind?: "rsvp" | "event";
  occasionName?: string | null;
  timeZone?: string | null;
  subject?: string;
  tone?: "gentle" | "final";
  events?: Array<{
    name: string;
    startsAt?: string | null;
    venueName?: string | null;
  }>;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function formatEventWhen(value?: string | null, timeZone = "Asia/Kolkata") {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h12",
    timeZone,
  }).format(date);
}

function messageEvents(
  events: GuestInvitationEmailInput["events"],
  timeZone?: string | null,
) {
  return (events ?? []).map((event) => ({
    name: event.name,
    when: formatEventWhen(event.startsAt, timeZone || "Asia/Kolkata"),
    venueName: event.venueName,
  }));
}

function formatDate(value?: string | Date | null) {
  if (!value) return "Celebration Dates to be Announced";
  const date =
    value instanceof Date
      ? value
      : new Date(
          Date.UTC(
            Number(value.slice(0, 4)),
            Number(value.slice(5, 7)) - 1,
            Number(value.slice(8, 10)),
          ),
        );
  if (isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export class GuestEmailError extends Error {
  constructor(
    message: string,
    readonly reason:
      | "DOMAIN_NOT_VERIFIED"
      | "TEST_MODE"
      | "DELIVERY_FAILED"
      | "CONFIG_MISSING" = "DELIVERY_FAILED",
  ) {
    super(message);
  }
}

function renderInvitationEmailContent(input: GuestInvitationEmailInput) {
  const couple = escapeHtml(input.coupleName);
  const guest = escapeHtml(input.guestName);
  const formattedDate = escapeHtml(formatDate(input.weddingDate));
  const venue = escapeHtml(input.venue || "Royal Celebration Venue");
  const url = escapeHtml(input.inviteUrl);

  const text = buildGuestMessage({
    kind: "invite",
    guestName: input.guestName,
    coupleName: input.coupleName,
    dateLabel: formatDate(input.weddingDate),
    venue: input.venue,
    events: messageEvents(input.events),
    inviteUrl: input.inviteUrl,
    isFamily: input.isFamily,
  });

  const htmlEvents = input.events?.length
    ? `<tr><td style="padding:16px 24px;background:#fdfcf9;border:1px solid #eee7df;border-radius:12px;margin-bottom:24px;">
        <p style="margin:0 0 10px;font-size:11px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:#8d6b4f;">Ceremony Highlights</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          ${input.events
            .map(
              (e) => `<tr>
                <td style="padding:6px 0;font-size:13px;color:#1e1a1f;font-weight:600;">${escapeHtml(e.name)}</td>
                <td align="right" style="padding:6px 0;font-size:12px;color:#7a7269;">${e.venueName ? escapeHtml(e.venueName) : ""}</td>
              </tr>`,
            )
            .join("")}
        </table>
      </td></tr>`
    : "";

  const html = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#faf8f5;color:#1e1a1f;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#faf8f5;">
      <tr><td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background:#ffffff;border:1px solid #ebe5df;border-radius:20px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.04);">
          <!-- Header Brand Banner -->
          <tr><td style="padding:28px 36px;border-bottom:1px solid #eee7df;background:#ffffff;text-align:center;">
            <p style="margin:0;color:#5c1a33;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:normal;letter-spacing:1px;">Make My Marriage</p>
            <p style="margin:6px 0 0;color:#9a435e;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">Wedding Invitation</p>
          </td></tr>

          <!-- Main Body -->
          <tr><td style="padding:36px 36px 28px;text-align:center;">
            <div style="display:inline-block;margin-bottom:16px;background:#6d213c;color:#d4af37;width:48px;height:48px;line-height:48px;border-radius:50%;font-size:22px;box-shadow:0 4px 10px rgba(109,33,60,0.25);">
              ❦
            </div>
            <p style="margin:0 0 10px;color:#8d6b4f;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">You Are Cordially Invited</p>
            <h1 style="margin:0 0 14px;color:#1e1a1f;font-family:Georgia,'Times New Roman',serif;font-size:36px;font-weight:normal;line-height:1.2;">${couple}</h1>
            <p style="margin:0 0 24px;color:#635559;font-size:15px;line-height:1.7;">
              Assalamu alaikum <strong>${guest}</strong>. With the blessings of Allah, and with the happiness of our families, we request the honour of ${input.isFamily ? `you and your family (a party of up to ${input.maxGuests || 1})` : "your company"} at our nikah and wedding celebrations.
            </p>

            <!-- Date & Venue Card -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;background:#faf7f4;border:1px solid #e8e2d9;border-radius:14px;">
              <tr><td style="padding:20px;text-align:center;">
                <p style="margin:0 0 6px;color:#6d213c;font-size:11px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;">Date &amp; Location</p>
                <p style="margin:0 0 6px;color:#1e1a1f;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:bold;">${formattedDate}</p>
                <p style="margin:0;color:#7a7269;font-size:14px;">${venue}</p>
              </td></tr>
            </table>

            <!-- Events if any -->
            ${htmlEvents}

            <!-- CTA Button -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:28px 0 20px;">
              <tr><td align="center">
                <a href="${url}" target="_blank" style="display:inline-block;background:#6d213c;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:14px 36px;border-radius:10px;box-shadow:0 3px 12px rgba(109,33,60,0.3);letter-spacing:0.5px;">
                  View Invitation &amp; RSVP &rarr;
                </a>
              </td></tr>
            </table>

            <p style="margin:16px 0 0;color:#8a8082;font-size:12px;line-height:1.6;">
              Please tap the button above to view ceremony schedules, directions, and confirm your attendance.
            </p>
          </td></tr>

          <!-- Footer -->
          <tr><td style="padding:20px 36px;border-top:1px solid #eee7df;background:#faf8f5;text-align:center;color:#8a8082;font-size:12px;line-height:1.6;">
            Personalized link: <a href="${url}" style="color:#6d213c;text-decoration:underline;">${url}</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return { text, html };
}

function renderReminderEmailContent(input: GuestReminderEmailInput) {
  const couple = escapeHtml(input.coupleName);
  const guest = escapeHtml(input.guestName);
  const formattedDate = escapeHtml(formatDate(input.weddingDate));
  const url = escapeHtml(input.inviteUrl);

  const isEvent = input.kind === "event";
  const isFinal = !isEvent && input.tone === "final";
  const text = buildGuestMessage({
    kind: isEvent ? "event-reminder" : "rsvp-reminder",
    guestName: input.guestName,
    coupleName: input.coupleName,
    dateLabel: formatDate(input.weddingDate),
    venue: input.venue,
    events: messageEvents(input.events, input.timeZone),
    inviteUrl: input.inviteUrl,
    isFamily: input.isFamily,
    occasionName: input.occasionName,
    tone: input.tone,
  });

  const html = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#faf8f5;color:#1e1a1f;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#faf8f5;">
      <tr><td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background:#ffffff;border:1px solid #ebe5df;border-radius:20px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.04);">
          <!-- Header Brand Banner -->
          <tr><td style="padding:28px 36px;border-bottom:1px solid #eee7df;background:#ffffff;text-align:center;">
            <p style="margin:0;color:#5c1a33;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:normal;letter-spacing:1px;">Make My Marriage</p>
            <p style="margin:6px 0 0;color:#b54708;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">${isEvent ? "Celebration Reminder" : isFinal ? "Final RSVP Reminder" : "RSVP Reminder"}</p>
          </td></tr>

          <!-- Main Body -->
          <tr><td style="padding:36px 36px 28px;text-align:center;">
            <div style="display:inline-block;margin-bottom:16px;background:#fffaeb;border:1px solid #fedf89;color:#b54708;width:52px;height:52px;line-height:52px;border-radius:50%;font-size:24px;">
              🔔
            </div>
            <p style="margin:0 0 10px;color:#8d6b4f;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">${isEvent ? "A note before the celebration" : isFinal ? "A final request" : "A gentle request"}</p>
            <h1 style="margin:0 0 14px;color:#1e1a1f;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:normal;line-height:1.2;">${couple}</h1>
            <p style="margin:0 0 20px;color:#635559;font-size:15px;line-height:1.7;">
              Assalamu alaikum <strong>${guest}</strong>.<br/>
              ${
                isEvent
                  ? `We are looking forward to welcoming you for <strong>${escapeHtml(input.occasionName || "the wedding celebration")}</strong> on <strong>${formattedDate}</strong>.`
                  : isFinal
                    ? `Catering and venue arrangements for <strong>${formattedDate}</strong> lock in a few days, and we still need your reply so the headcount can be finalised.`
                    : `We are completing seating and arrangements for the nikah and walima on <strong>${formattedDate}</strong>, and we have not yet received your reply.`
              }
            </p>

            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;background:#faf7f4;border:1px solid #e8e2d9;border-radius:14px;">
              <tr><td style="padding:18px 24px;text-align:center;">
                <p style="margin:0;color:#7a7269;font-size:13.5px;line-height:1.6;">
                  ${
                    isEvent
                      ? "Kindly arrive a little early so you can be seated before the programme begins. May Allah bless this gathering."
                      : isFinal
                        ? `Please confirm today whether ${input.isFamily ? "you and your family" : "you"} can attend, so the headcount can be closed.`
                        : `Kindly let us know whether ${input.isFamily ? "you and your family" : "you"} will be able to join us, so we can reserve your place at the walima.`
                  }
                </p>
              </td></tr>
            </table>

            <!-- CTA Button -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0 16px;">
              <tr><td align="center">
                <a href="${url}" target="_blank" style="display:inline-block;background:#6d213c;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:14px 36px;border-radius:10px;box-shadow:0 3px 12px rgba(109,33,60,0.3);letter-spacing:0.5px;">
                  ${isEvent ? "Open your invitation" : isFinal ? "Confirm today" : "Confirm your attendance"} &rarr;
                </a>
              </td></tr>
            </table>

            <p style="margin:16px 0 0;color:#8a8082;font-size:12px;line-height:1.6;">
              ${isEvent ? "Your invitation has the venue and programme." : isFinal ? "A reply today keeps your place. JazakAllah khair." : "A reply takes less than a minute. JazakAllah khair."}
            </p>
          </td></tr>

          <!-- Footer -->
          <tr><td style="padding:20px 36px;border-top:1px solid #eee7df;background:#faf8f5;text-align:center;color:#8a8082;font-size:12px;line-height:1.6;">
            Personalized link: <a href="${url}" style="color:#6d213c;text-decoration:underline;">${url}</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return { text, html };
}

async function sendVolaneaEmail(
  to: string,
  subject: string,
  text: string,
  html: string,
) {
  const apiKey = process.env.VOLANEA_API_KEY;
  const from = process.env.VOLANEA_FROM;
  if (!apiKey || !from) {
    throw new GuestEmailError(
      "Wedding email is not set up yet.",
      "CONFIG_MISSING",
    );
  }

  const sender = from
    .trim()
    .replace(/^(["'])(.*)\1$/, "$2")
    .trim();
  const namedSender = sender.match(/^\s*(.*?)\s*<([^<>]+)>\s*$/);
  const fromEmail = namedSender ? namedSender[2].trim() : sender;
  const fromName = namedSender?.[1].trim();

  const response = await fetch("https://api.volanea.com/v1/send", {
    method: "POST",
    signal: AbortSignal.timeout(30_000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      ...(fromName ? { fromName } : {}),
      to,
      subject,
      text,
      html,
    }),
  });

  let result: {
    data?: {
      testMode?: boolean;
      messages?: { id?: string; status?: string; skipped?: string }[];
    };
    error?: { code?: string; details?: { code?: string }[] };
  };

  try {
    result = await response.json();
  } catch {
    throw new GuestEmailError(
      "The email service returned an unexpected response.",
    );
  }

  if (response.ok && result.data?.testMode === true) {
    throw new GuestEmailError(
      "Wedding email is still in test mode.",
      "TEST_MODE",
    );
  }

  if (response.ok && result.data?.messages?.some((m) => m.id)) {
    return;
  }

  if (
    result.error?.code === "domain_not_verified" ||
    result.error?.code === "sender_not_verified" ||
    result.error?.details?.some((detail) =>
      ["domain_not_verified", "sender_not_verified"].includes(
        detail.code ?? "",
      ),
    )
  ) {
    throw new GuestEmailError(
      "The wedding email sender is not verified yet.",
      "DOMAIN_NOT_VERIFIED",
    );
  }

  throw new GuestEmailError("Guest email delivery failed.");
}

export async function sendGuestInvitationEmail(
  input: GuestInvitationEmailInput,
) {
  const { text, html } = renderInvitationEmailContent(input);
  const subject = `Wedding invitation from ${input.coupleName}`;
  await sendVolaneaEmail(input.to, subject, text, html);
}

export async function sendGuestReminderEmail(input: GuestReminderEmailInput) {
  const { text, html } = renderReminderEmailContent(input);
  const subject =
    input.subject?.trim() ||
    (input.kind === "event"
      ? `A reminder before ${input.occasionName || "the celebration"} — ${input.coupleName}`
      : input.tone === "final"
        ? `A final reminder to reply — ${input.coupleName}`
        : `A gentle reminder to reply — ${input.coupleName}`);
  await sendVolaneaEmail(input.to, subject, text, html);
}
