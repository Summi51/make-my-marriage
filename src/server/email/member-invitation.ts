import "server-only";

type InvitationEmail = {
  to: string;
  inviterName: string;
  coupleName: string;
  weddingDate: string;
  role: "ADMIN" | "MANAGER";
  acceptUrl: string;
  accountExists: boolean;
  expiresAt: Date;
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

function longDate(value: string | Date) {
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
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function invitationEntryUrl(
  acceptUrl: string,
  accountExists: boolean,
  email?: string,
) {
  const accept = new URL(acceptUrl);
  const next = `${accept.pathname}${accept.search}`;
  const params = new URLSearchParams({ next });
  if (email) params.set("email", email);
  return `${accept.origin}/${accountExists ? "login" : "signup"}?${params}`;
}

function invitationContent(input: InvitationEmail) {
  const role = input.role === "ADMIN" ? "Admin" : "Manager";
  const article = input.role === "ADMIN" ? "an" : "a";
  const weddingDate = longDate(input.weddingDate);
  const expires = longDate(input.expiresAt);
  const entryUrl = input.acceptUrl;
  const entryLabel = "Open invitation";
  const entryHint =
    "Open your invitation below. Sign in or create an account using the invited email, then accept to join the wedding workspace.";
  const text = `${input.inviterName} invited you to help plan ${input.coupleName} as ${article} ${role}.\n\nWedding date: ${weddingDate}\nYour role: ${role}\nInvited email: ${input.to}\n\n${entryHint}\n${entryLabel}: ${entryUrl}\n\nThis invitation expires ${expires}. If you weren't expecting this invitation, you can ignore this email.`;
  const inviter = escapeHtml(input.inviterName);
  const couple = escapeHtml(input.coupleName);
  const email = escapeHtml(input.to);
  const url = escapeHtml(entryUrl);
  const html = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#faf8f5;color:#1e1a1f;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#faf8f5;">
      <tr><td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background:#ffffff;border:1px solid #ebe5df;border-radius:16px;">
          <tr><td style="padding:28px 36px;border-bottom:1px solid #eee7df;">
            <p style="margin:0;color:#5c1a33;font-family:Georgia,'Times New Roman',serif;font-size:25px;line-height:1.2;">Make My Marriage</p>
            <p style="margin:7px 0 0;color:#9a435e;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">Wedding member invitation</p>
          </td></tr>
          <tr><td style="padding:38px 36px 34px;">
            <p style="margin:0 0 14px;color:#9a435e;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">A personal invitation</p>
            <h1 style="margin:0 0 10px;color:#1e1a1f;font-family:Georgia,'Times New Roman',serif;font-size:34px;font-weight:normal;line-height:1.2;">${couple}</h1>
            <p style="margin:0 0 22px;color:#635559;font-size:15px;line-height:1.6;">${escapeHtml(weddingDate)}</p>
            <p style="margin:0 0 24px;color:#635559;font-size:15px;line-height:1.7;">${inviter} invited you to help plan this wedding as ${article} ${role}. ${escapeHtml(entryHint)}</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 28px;background:#faf8f5;border:1px solid #ebe5df;border-radius:12px;">
              <tr><td style="padding:8px 20px 16px;">
                <p style="margin:14px 0 0;color:#8a8082;font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Invited email</p>
                <p style="margin:4px 0 0;color:#1e1a1f;font-size:15px;">${email}</p>
                <p style="margin:14px 0 0;color:#8a8082;font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Assigned role</p>
                <p style="margin:4px 0 0;color:#5c1a33;font-size:15px;font-weight:bold;">${role}</p>
                <p style="margin:14px 0 0;color:#8a8082;font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Invitation expires</p>
                <p style="margin:4px 0 0;color:#1e1a1f;font-size:15px;">${escapeHtml(expires)}</p>
              </td></tr>
            </table>
            <p style="margin:0 0 8px;color:#756a6d;font-size:14px;line-height:1.6;">Your personal invitation link:</p>
            <p style="margin:0;overflow-wrap:anywhere;word-break:break-all;font-size:12px;line-height:1.6;"><a href="${url}" style="color:#5c1a33;text-decoration:underline;">${url}</a></p>
          </td></tr>
          <tr><td style="padding:22px 36px;border-top:1px solid #eee7df;color:#8a8082;font-size:12px;line-height:1.6;">If you weren't expecting this invitation, you can safely ignore this email.</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
  return { text, html, entryUrl };
}

export class InvitationEmailError extends Error {
  constructor(
    message: string,
    readonly reason:
      | "DOMAIN_NOT_VERIFIED"
      | "TEST_MODE"
      | "DELIVERY_FAILED" = "DELIVERY_FAILED",
  ) {
    super(message);
  }
}

export async function sendMemberInvitationEmail(input: InvitationEmail) {
  const apiKey = process.env.VOLANEA_API_KEY;
  const from = process.env.VOLANEA_FROM;
  if (!apiKey || !from)
    throw new InvitationEmailError(
      "Invitation email delivery is not configured.",
    );
  // Console environment values can retain the quotes used in .env examples.
  const sender = from
    .trim()
    .replace(/^(["'])(.*)\1$/, "$2")
    .trim();
  const namedSender = sender.match(/^\s*(.*?)\s*<([^<>]+)>\s*$/);
  const fromEmail = namedSender ? namedSender[2].trim() : sender;
  const fromName = namedSender?.[1].trim();
  const { text, html } = invitationContent(input);
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
      to: input.to,
      subject: `Join ${input.coupleName} on Make My Marriage`,
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
    throw new InvitationEmailError("Invalid email delivery response.");
  }
  if (response.ok && result.data?.testMode === true)
    throw new InvitationEmailError("Volanea is in test mode.", "TEST_MODE");
  if (response.ok && result.data?.messages?.some((message) => message.id))
    return;
  if (
    result.error?.code === "domain_not_verified" ||
    result.error?.code === "sender_not_verified" ||
    result.error?.details?.some((detail) =>
      ["domain_not_verified", "sender_not_verified"].includes(
        detail.code ?? "",
      ),
    )
  )
    throw new InvitationEmailError(
      "Volanea sender domain is not verified.",
      "DOMAIN_NOT_VERIFIED",
    );
  throw new InvitationEmailError("Invitation email delivery failed.");
}
