import { expect, test } from "@playwright/test";

import { dismissLanguagePrompt, seedLocaleCookie } from "./helpers/auth";

test.describe("public browsing", () => {
  test.beforeEach(async ({ page }) => {
    await seedLocaleCookie(page);
  });

  test("guest feed uses the default home view", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await dismissLanguagePrompt();
    await expect(
      page.getByRole("heading", { name: "속닥속닥", level: 1 })
    ).toBeVisible();
    await expect(page.getByTestId("feed-composer")).toBeVisible();
  });
  test("guest navigation excludes private shortcuts", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await dismissLanguagePrompt();

    await expect
      .poll(() =>
        page.locator("header nav a").evaluateAll((links) =>
          links.map((link) => link.getAttribute("href"))
        )
      )
      .toEqual(["/"]);

    const sideHrefs = await page.locator("aside nav a").evaluateAll((links) =>
      links.map((link) => link.getAttribute("href"))
    );
    expect(sideHrefs.slice(1)).toEqual([
      "/?sort=popular",
      "/",
      "/submit",
      "/login",
    ]);

    const header = page.getByTestId("site-header");
    await expect(
      header.getByRole("link", { name: /로그인/i })
    ).toHaveCount(1);
    await header.getByRole("button", { name: /^메뉴$/ }).click();
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitem", { name: /로그인/i })).toHaveCount(1);
    await page.keyboard.press("Escape");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await dismissLanguagePrompt();
    const mobileHrefs = await page
      .locator("nav.safe-pb-nav a")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    expect(mobileHrefs).toEqual(["/", "/?sort=popular"]);
  });
  test("guest submit routes redirect before rendering a form", async ({ page }) => {
    await page.goto("/submit?type=image", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login\?next=%2Fsubmit%3Ftype%3Dimage/);
  });
  test("session transport errors stay neutral instead of showing guest CTA", async ({
    page,
  }) => {
    await page.route("**/i/api*", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "text/plain",
        body: "forced session transport failure",
      });
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await dismissLanguagePrompt();

    const header = page.getByTestId("site-header");
    await expect(header.getByRole("button", { name: /^메뉴$/ })).toBeVisible();
    await expect(
      header.getByRole("link", { name: /로그인/i })
    ).toHaveCount(0);
  });

  test("removed product routes are not served", async ({ page }) => {
    for (const path of ["/communities", "/questions", "/marketplace", "/businesses"]) {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBe(404);
    }
  });

  test("search page is reachable", async ({ page }) => {
    await page.goto("/search?q=sokdak", { waitUntil: "domcontentloaded" });
    await dismissLanguagePrompt();
    await expect(
      page.locator('main form[role="search"] input[type="search"]')
    ).toBeVisible();
  });

  test("login redirect preserves next for settings", async ({ page }) => {
    await page.goto("/settings", { waitUntil: "domcontentloaded" });
    await dismissLanguagePrompt();
    await expect(page).toHaveURL(/\/login/);
    expect(page.url()).toContain("next=");
  });
  test("guest messages preserve contact intent through login", async ({
    page,
  }) => {
    await page.goto("/messages?to=bob", { waitUntil: "domcontentloaded" });
    const loginUrl = new URL(page.url());
    expect(loginUrl.pathname).toBe("/login");
    expect(loginUrl.searchParams.get("next")).toBe("/messages?to=bob");
    await expect(
      page.getByRole("heading", { name: /속닥속닥 계속하기/i })
    ).toBeVisible();
  });
});
