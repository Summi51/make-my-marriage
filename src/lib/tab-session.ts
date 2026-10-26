export const TAB_QUERY = "tab";
export const TAB_HEADER = "x-mmm-tab";
const tabName = /^mmm-tab-([a-f0-9]{32})$/;

export function currentTabId() {
  if (typeof window === "undefined") return null;
  const match = tabName.exec(window.name);
  if (match) return match[1];
  const id = crypto.randomUUID().replaceAll("-", "");
  window.name = `mmm-tab-${id}`;
  return id;
}

export function tabPath(path: string, id = currentTabId()) {
  if (!id || !path.startsWith("/") || path.startsWith("//")) return path;
  const url = new URL(path, "https://make-my-marriage.invalid");
  url.searchParams.set(TAB_QUERY, id);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function tabFetch(input: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const id = currentTabId();
  if (id) headers.set(TAB_HEADER, id);
  return fetch(input, { ...init, headers, credentials: "same-origin" });
}
