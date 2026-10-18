export type HelpAnswer = {
  question: string;
  answer: string;
  terms: string[];
};

export const HELP_ANSWERS: HelpAnswer[] = [
  {
    question: "Where should I start?",
    answer:
      "Create your account, then set up your wedding names, date, location and timezone. If someone has invited you to their wedding workspace, accept that invitation instead. Our How it works page explains the complete journey.",
    terms: ["start", "setup", "create", "begin"],
  },
  {
    question: "How do I organise ceremonies and tasks?",
    answer:
      "Use Events for your ceremonies and Tasks for planning work. Keep each ceremony's details up to date so your team can coordinate from the same workspace.",
    terms: ["event", "events", "ceremony", "ceremonies", "task", "tasks"],
  },
  {
    question: "How are guest invitations different from member invitations?",
    answer:
      "Wedding Members gives trusted people access to planning tools. Invitations & RSVP is for your wedding guests and their responses. Do not invite every guest as a workspace member.",
    terms: ["rsvp", "invitation", "invitations", "response", "responses"],
  },
  {
    question: "How do I publish my wedding website?",
    answer:
      "Open Wedding Website, prepare the content and review it before publishing. Share the published link from your deployed site. Your private planning workspace is separate from the public wedding website.",
    terms: ["website", "publish", "publishing", "theme", "themes"],
  },
  {
    question: "Does Livestream broadcast my camera?",
    answer:
      "No. Livestream displays a supported stream you configure. You must arrange the broadcast with the streaming provider and check its viewing permissions before sharing it with guests.",
    terms: ["livestream", "stream", "broadcast", "youtube"],
  },
  {
    question: "Can the assistant see my wedding data?",
    answer:
      "The free FAQ finder uses written product answers in your browser. Optional Zealoop AI help is a separate service and receives messages you send to it. Neither this FAQ finder nor our help integration retrieves your private wedding records. Never send passwords, bank details or private invitation links.",
    terms: ["assistant", "privacy", "private", "zealoop", "data", "bot"],
  },
  {
    question: "Can I remove the last Admin?",
    answer:
      "Every wedding must keep an Admin. Make another trusted member an Admin before removing, demoting or leaving as the final Admin. Only Admins manage member roles and invitations.",
    terms: ["last", "remove", "leave", "demote", "roles"],
  },
  {
    question: "What should I do if an invitation has expired?",
    answer:
      "Ask the wedding Admin for a fresh invitation. For an email mismatch, use the account matching the invited email. Do not share the invitation token with the help assistant.",
    terms: ["expired", "expire", "mismatch", "revoked"],
  },
  {
    question: "Does saving a vendor make a booking?",
    answer:
      "No. My Vendors keeps your planning contacts together. Contact the vendor separately to confirm availability, pricing, bookings and payment terms. Discover Vendors is a starting point for research, not a booking guarantee.",
    terms: ["booking", "book", "vendors", "discover", "contact"],
  },
  {
    question: "How do I invite family members?",
    answer:
      "An Admin can use Wedding Members to invite someone as an Admin or Manager. The recipient signs in with the invited email and accepts the invitation.",
    terms: ["invite", "family", "member", "admin", "manager"],
  },
  {
    question: "Do guests need an account for photos?",
    answer:
      "No. Guests use the private gallery link or Guest QR. The organiser must enable album viewing and guest uploads. Do not post private links publicly.",
    terms: ["guest", "photo", "gallery", "qr", "account", "upload"],
  },
  {
    question: "Does recording an expense send money?",
    answer:
      "No. Expenses record amounts already paid, including advances and part payments. Recording an expense does not make a payment or confirm a bank transfer. Shagun and vendor checkout are not currently available here.",
    terms: ["expense", "payment", "money", "shagun", "vendor", "razorpay"],
  },
  {
    question: "Can I share a localhost link?",
    answer:
      "A localhost link works only on your own device. Open the deployed website before copying guest links or downloading QR cards.",
    terms: ["localhost", "share", "link", "deploy"],
  },
  {
    question: "How do audio or video calls work?",
    answer:
      "Open My Vendors and paste a free meeting link, such as a Google Meet or WhatsApp link you already created. The meeting button only opens that link. Make My Marriage does not place, host, or charge for the call. The phone button uses the vendor's saved phone number.",
    terms: ["call", "audio", "video", "meeting", "whatsapp", "phone"],
  },
];

export const STARTER_QUESTIONS = [
  "Do guests need an account for photos?",
  "Does recording an expense send money?",
  "How do audio or video calls work?",
  "How do I invite family members?",
  "How do I publish my wedding website?",
  "Can the assistant see my wedding data?",
] as const;
