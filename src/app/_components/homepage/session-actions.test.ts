import { describe, expect, it } from "vitest";
import {
  homepageActions,
  sessionFromMembership,
  type HomepageSession,
} from "./session-actions";

const states: HomepageSession[] = ["signed-out", "setup", "wedding"];

describe("homepage session actions", () => {
  it("keeps sign in and start planning when signed out", () => {
    expect(homepageActions("signed-out")).toEqual({
      primary: { href: "/signup", label: "Start Planning" },
      secondary: { href: "/login", label: "Sign In" },
    });
  });

  it("continues setup when onboarding is incomplete", () => {
    expect(homepageActions("setup")).toEqual({
      primary: { href: "/account", label: "Continue setup" },
      secondary: null,
    });
  });

  it("opens the wedding overview when a wedding exists", () => {
    expect(homepageActions("wedding")).toEqual({
      primary: { href: "/account", label: "Go to your wedding" },
      secondary: null,
    });
  });

  it("maps membership to the signed-in states", () => {
    expect(sessionFromMembership(false)).toBe("setup");
    expect(sessionFromMembership(true)).toBe("wedding");
    expect(states).toHaveLength(3);
  });
});
