import { describe, expect, it } from "vitest";
import { HELP_ANSWERS, STARTER_QUESTIONS } from "./help-answers";

describe("help page questions", () => {
  it("keeps every starter question in the written FAQ list", () => {
    for (const question of STARTER_QUESTIONS) {
      const match = HELP_ANSWERS.find((item) => item.question === question);
      expect(match?.answer.length).toBeGreaterThan(20);
    }
  });

  it("states that recording an expense does not send money", () => {
    expect(
      HELP_ANSWERS.find(
        (item) => item.question === "Does recording an expense send money?",
      )?.answer,
    ).toMatch(/does not make a payment/i);
  });
});
