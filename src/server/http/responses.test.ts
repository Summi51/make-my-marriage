import { describe, expect, it } from "vitest";

import { ok } from "./responses";

describe("ok", () => {
  it("wraps successful response data", async () => {
    const response = ok({ status: "healthy" });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: { status: "healthy" },
    });
  });
});
