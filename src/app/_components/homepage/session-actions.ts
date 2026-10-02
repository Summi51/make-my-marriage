export type HomepageSession = "signed-out" | "setup" | "wedding";

export const AUTH_CHANNEL = "mmm-auth";

export function homepageActions(session: HomepageSession) {
  if (session === "wedding") {
    return {
      primary: { href: "/account", label: "Go to your wedding" },
      secondary: null,
    };
  }
  if (session === "setup") {
    return {
      primary: { href: "/account", label: "Continue setup" },
      secondary: null,
    };
  }
  return {
    primary: { href: "/signup", label: "Start Planning" },
    secondary: { href: "/login", label: "Sign In" },
  };
}

export function sessionFromMembership(hasWedding: boolean): HomepageSession {
  return hasWedding ? "wedding" : "setup";
}
