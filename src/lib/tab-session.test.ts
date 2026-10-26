import { describe, expect, it } from "vitest";
import { tabPath } from "./tab-session";

describe("tab return paths", () => {
  it("keeps the session query before a fragment in server redirects", () => {
    expect(tabPath("/account#main", "current-tab")).toBe(
      "/account?tab=current-tab#main",
    );
  });

  it("replaces a stale tab without losing other query parameters", () => {
    expect(tabPath("/account?tab=old&view=members#main", "current-tab")).toBe(
      "/account?tab=current-tab&view=members#main",
    );
  });
});
