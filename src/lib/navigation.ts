export type ConsumerNavSection =
  | "home"
  | "messages"
  | "notifications"
  | "profile"
  | "settings";

export function navSectionForPath(
  pathname: string
): ConsumerNavSection | null {
  if (pathname === "/") return "home";
  if (pathname === "/messages" || pathname.startsWith("/messages/")) {
    return "messages";
  }
  if (pathname === "/notifications") return "notifications";
  if (pathname === "/settings") return "settings";
  if (pathname === "/u" || pathname.startsWith("/u/")) return "profile";
  return null;
}

export function isNavSectionActive(
  pathname: string,
  section: ConsumerNavSection
): boolean {
  return navSectionForPath(pathname) === section;
}
