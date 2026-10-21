import { describe, expect, it } from "vitest";
import { CHAT_QUESTIONS, HELP_ANSWERS } from "./help-answers";

describe("help page questions", () => {
  it("keeps chat prompts separate from the written answers", () => {
    const written = new Set(HELP_ANSWERS.map((item) => item.question));
    for (const question of CHAT_QUESTIONS) {
      expect(written.has(question)).toBe(false);
    }
    expect(CHAT_QUESTIONS.length).toBeGreaterThan(3);
  });

  it("explains that expenses record money already paid", () => {
    expect(
      HELP_ANSWERS.find((item) => item.question.includes("already paid"))
        ?.answer,
    ).toMatch(/already been paid/i);
  });

  it("sends livestream setup to the Livestream screen", () => {
    expect(
      HELP_ANSWERS.find((item) =>
        item.question.includes("watch the ceremonies"),
      )?.answer,
    ).toMatch(/Open Livestream/);
  });

  it("tells an Admin to revoke a member invitation sent to the wrong email", () => {
    expect(
      HELP_ANSWERS.find((item) => item.question.includes("wrong email"))
        ?.answer,
    ).toMatch(/revoke the invitation/);
  });
});
