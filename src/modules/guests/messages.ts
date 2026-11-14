export type GuestMessageKind = "invite" | "rsvp-reminder" | "event-reminder";

export type GuestMessageEvent = {
  name: string;
  when?: string | null;
  venueName?: string | null;
};

export type GuestMessageInput = {
  kind: GuestMessageKind;
  guestName: string;
  coupleName: string;
  dateLabel?: string | null;
  venue?: string | null;
  events?: GuestMessageEvent[];
  inviteUrl: string;
  isFamily?: boolean;
  occasionName?: string | null;
  // Member-chosen RSVP reminder. "final" is the deadline wording. Anything else
  // stays the gentle reminder, including the daily job which does not pick one.
  tone?: "gentle" | "final";
};

function party(isFamily?: boolean) {
  return isFamily ? "you and your family" : "you";
}

function eventLines(events: GuestMessageEvent[] | undefined) {
  if (!events?.length) return "";
  return (
    "\n\nCelebrations:\n" +
    events
      .map((event) => {
        const when = event.when ? ` — ${event.when}` : "";
        const venue = event.venueName ? `, ${event.venueName}` : "";
        return `• ${event.name}${when}${venue}`;
      })
      .join("\n")
  );
}

export function buildGuestMessage(input: GuestMessageInput) {
  const guest = input.guestName.trim() || "dear guest";
  const couple = input.coupleName.trim() || "the couple";
  const date = input.dateLabel?.trim() || "the wedding celebrations";
  const venue = input.venue?.trim();
  const place = venue ? `\nVenue: ${venue}` : "";
  const who = party(input.isFamily);
  const events = eventLines(input.events);

  if (input.kind === "event-reminder") {
    const occasion = input.occasionName?.trim() || "the wedding celebration";
    return `Assalamu alaikum ${guest},

${couple} are looking forward to welcoming ${who} for ${occasion}.

When: ${date}${place}

Kindly arrive a little early so you can be seated before the programme begins. Your invitation is here:
${input.inviteUrl}

May Allah bless this gathering.
${couple} & families`;
  }

  if (input.kind === "rsvp-reminder") {
    if (input.tone === "final") {
      return `Assalamu alaikum ${guest},

This is a final RSVP reminder from ${couple}. Catering and venue arrangements lock in a few days, and we still need your reply so the headcount can be finalised.

Wedding date: ${date}${place}${events}

Please confirm today whether ${who} can attend:
${input.inviteUrl}

JazakAllah khair.
${couple} & families`;
    }
    return `Assalamu alaikum ${guest},

This is a gentle reminder from ${couple}. We are completing seating and arrangements for the nikah and walima, and we have not yet received your reply.

Wedding date: ${date}${place}${events}

Please let us know whether ${who} will be able to join us:
${input.inviteUrl}

JazakAllah khair.
${couple} & families`;
  }

  return `Assalamu alaikum ${guest},

With the blessings of Allah, and with the happiness of our families, ${couple} request the honour of ${who} at their nikah and wedding celebrations.

Wedding date: ${date}${place}${events}

Please open your invitation to see the programme and confirm your attendance:
${input.inviteUrl}

Your presence would mean a great deal to us.
${couple} & families`;
}
