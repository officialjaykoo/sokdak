import { describe, expect, it } from "vitest";

import {
  isNavSectionActive,
  navSectionForPath,
} from "@/lib/navigation";

describe("consumer navigation mapping", () => {
  it.each([
    ["/", "home"],
    ["/messages", "messages"],
    ["/messages/room-1", "messages"],
    ["/notifications", "notifications"],
    ["/settings", "settings"],
    ["/u/jay", "profile"],
  ] as const)("maps %s to %s", (pathname, section) => {
    expect(navSectionForPath(pathname)).toBe(section);
  });

  it("keeps the canonical home route active", () => {
    expect(isNavSectionActive("/", "home")).toBe(true);
    expect(navSectionForPath("/")).toBe("home");
    expect(isNavSectionActive("/messages", "home")).toBe(false);
  });

  it("marks detail and nested consumer routes in the same section", () => {
    expect(isNavSectionActive("/messages/room-1", "messages")).toBe(true);
    expect(isNavSectionActive("/u/jay", "profile")).toBe(true);
    expect(isNavSectionActive("/u/jay/posts", "profile")).toBe(true);
  });

  it("leaves removed product routes unmapped", () => {
    for (const pathname of [
      "/communities",
      "/r/viet",
      "/questions/123",
      "/marketplace/saved",
      "/businesses/example/edit",
    ]) {
      expect(navSectionForPath(pathname)).toBeNull();
    }
  });
});
