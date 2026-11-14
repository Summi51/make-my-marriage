import { describe, expect, it } from "vitest";
import { isPrivateLinkPath } from "./zealoop-bubble";

describe("site chat bubble", () => {
  it("stays off pages whose address contains a private link", () => {
    expect(isPrivateLinkPath("/invite/secret-token")).toBe(true);
    expect(isPrivateLinkPath("/gallery/secret-token")).toBe(true);
    expect(isPrivateLinkPath("/member-invitations/secret-token")).toBe(true);
  });

  it("shows on the public site and the signed-in workspace", () => {
    expect(isPrivateLinkPath("/")).toBe(false);
    expect(isPrivateLinkPath("/help")).toBe(false);
    expect(isPrivateLinkPath("/login")).toBe(false);
    expect(isPrivateLinkPath("/account/wedding/vendors")).toBe(false);
    expect(isPrivateLinkPath("/w/aisha-and-rahul")).toBe(false);
  });
});
