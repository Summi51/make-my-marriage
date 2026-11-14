import { describe, expect, it } from "vitest";
import { safeReturnPath } from "./safe-return-path";

describe("safeReturnPath", () => {
  it("keeps same-origin invitation routes and query strings", () => {
    expect(safeReturnPath("/member-invitations/token?source=email")).toBe(
      "/member-invitations/token?source=email",
    );
  });

  it("rejects network paths, backslash variants, and external URLs", () => {
    for (const value of [
      "//evil.example/path",
      "/\\evil.example/path",
      "https://evil.example/path",
      "javascript:alert(1)",
    ]) {
      expect(safeReturnPath(value)).toBe("/account");
    }
  });
});
