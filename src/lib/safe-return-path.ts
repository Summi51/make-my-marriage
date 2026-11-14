const localOrigin = "https://make-my-marriage.invalid";

export function safeReturnPath(candidate?: string) {
  if (!candidate?.startsWith("/")) return "/account";
  try {
    const url = new URL(candidate, localOrigin);
    if (url.origin !== localOrigin) return "/account";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/account";
  }
}
