export type HelpAnswer = {
  question: string;
  answer: string;
};

export const HELP_ANSWERS: HelpAnswer[] = [
  {
    question: "What can I keep in one wedding workspace?",
    answer:
      "Your ceremonies, tasks, guest list, RSVPs, vendors, expenses, website, livestream and photo gallery. Family you invite can plan from the same wedding instead of chasing updates across chats.",
  },
  {
    question: "Who should be a member, and who stays a guest?",
    answer:
      "Invite only the people helping you plan. Guests receive their own invitation and RSVP link. They do not need a planning account, and they cannot see your tasks, expenses or vendor notes.",
  },
  {
    question: "How do I publish the wedding website?",
    answer:
      "Open Wedding Website, choose a theme, add your story and review every page. Publish when it looks right, then share that live link. Your private planning workspace stays separate.",
  },
  {
    question: "How do guests add their photos?",
    answer:
      "Share the private gallery link or the printed Guest QR. Guests can view and add photos without creating an account, once you turn those options on. Keep that link for invited guests.",
  },
  {
    question: "How do I keep track of what we have already paid?",
    answer:
      "Open Expenses and record each amount with its category, including an advance, a part payment or the full amount. The total stays in rupees so your family can see what has already been paid.",
  },
  {
    question: "How do I reach a vendor from the workspace?",
    answer:
      "Save the vendor in My Vendors with a phone number and, if you have one, a Google Meet or WhatsApp meeting link. The buttons open that number or link. You still confirm the booking directly with the vendor.",
  },
  {
    question: "Can family abroad watch the ceremonies?",
    answer:
      "Yes. Open Livestream, paste your YouTube link and turn the stream on. Then publish Wedding Website and share that page. Make My Marriage shows the stream you set up. It does not turn on your camera.",
  },
  {
    question: "What if a family invitation was sent to the wrong email?",
    answer:
      "Ask an Admin to open Wedding Members, revoke the invitation sent to the wrong email, then send a new one to the correct email. The recipient signs in with that same email and accepts. The old link stays usable until it is revoked or it expires.",
  },
];

export const CHAT_QUESTIONS = [
  "How do I add Mehendi, Baraat and Walima?",
  "How do we split planning tasks across the family?",
  "Where do I see who has replied to the invitation?",
  "How do I change the website theme before publishing?",
  "Can guests upload photos from the QR card?",
  "How do I record a vendor advance?",
] as const;
