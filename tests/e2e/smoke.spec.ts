import { expect, test } from "@playwright/test";

import { dismissLanguagePrompt, seedLocaleCookie } from "./helpers/auth";

test.describe("cross-platform smoke", () => {
  test.beforeEach(async ({ page }) => {
    await seedLocaleCookie(page);
  });

  test("home feed renders brand and posts region", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await dismissLanguagePrompt();
    await expect(
      page.getByRole("heading", { name: "속닥속닥", level: 1 })
    ).toBeVisible();
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByTestId("feed-composer")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /로그인|홈/i }).first()
    ).toBeVisible();
  });

  test("auth pages offer social continuation on narrow viewports", async ({
    page,
  }) => {
    for (const path of ["/login", "/signup"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await dismissLanguagePrompt();
      await expect(
        page.getByRole("heading", { name: /속닥속닥 계속하기/i })
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Kakao" })).toBeVisible();
      await expect(
        page.getByText(/이메일이나 비밀번호가 필요하지 않습니다/i)
      ).toBeVisible();
      await expect(
        page.locator(
          'input:not([form="_red_trap"]):not([name="cf-turnstile-response"])'
        )
      ).toHaveCount(0);
    }
  });
  test("signup compatibility redirect preserves a safe next path", async ({
    page,
  }) => {
    await page.goto("/signup?next=%2Fmessages", {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(/\/login\?next=%2Fmessages$/);
    await expect(
      page.getByRole("heading", { name: /속닥속닥 계속하기/i })
    ).toBeVisible();

    await page.goto("/signup?next=https%3A%2F%2Fevil.example", {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(/\/login$/);
  });

  test("anonymous login remains available without a session", async ({
    page,
  }) => {
    await page.goto("/login?next=%2Fmessages", {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(/\/login\?next=%2Fmessages$/);
    await expect(
      page.getByRole("heading", { name: /속닥속닥 계속하기/i })
    ).toBeVisible();
  });
  test("guest opens login with one click", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const login = page.getByRole("banner").getByRole("link", {
      name: /로그인/i,
    });
    await expect(login).toBeVisible({ timeout: 30_000 });
    await login.click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("heading", { name: /속닥속닥 계속하기/i })
    ).toBeVisible();
  });

  test("guest opens login with one click after a stale API token", async ({
    page,
  }) => {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
    const sessionCookieName = baseURL.startsWith("https://")
      ? "__Secure-better-auth.session_token"
      : "better-auth.session_token";
    await page.context().addCookies([
      { name: sessionCookieName, value: "stale", url: baseURL, httpOnly: true },
      { name: "red_atk", value: "stale", url: baseURL },
      { name: "red_qn", value: "stale", url: baseURL },
      { name: "red_qv", value: "stale", url: baseURL },
      { name: "red_sec", value: "stale", url: baseURL, httpOnly: true },
    ]);
    await page.goto("/", { waitUntil: "commit" });
    await page.locator('header a[href="/login"]').first().waitFor({
      state: "visible",
      timeout: 30_000,
    });
    await page.locator('header a[href="/login"]').first().click({
      timeout: 10_000,
    });
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("heading", { name: /속닥속닥 계속하기/i })
    ).toBeVisible();
  });


  test("layout does not overflow horizontally", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await dismissLanguagePrompt();
    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollbarGutter: getComputedStyle(document.documentElement).scrollbarGutter,
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
    expect(metrics.scrollbarGutter).toBe("stable");
  });
  test("mobile chrome remains visible during scroll", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await dismissLanguagePrompt();

    const header = page.getByTestId("site-header");
    const mobileNav = page.getByTestId("mobile-nav");
    await expect(header).toBeVisible();
    await expect(mobileNav).toBeVisible();

    const before = await page.evaluate(() => ({
      headerTop: document.querySelector('[data-testid="site-header"]')?.getBoundingClientRect().top,
      navBottom: document.querySelector('[data-testid="mobile-nav"]')?.getBoundingClientRect().bottom,
    }));
    await page.evaluate(() => window.scrollTo({ top: 900, behavior: "instant" }));
    await page.waitForTimeout(100);
    await expect(header).toBeVisible();
    await expect(mobileNav).toBeVisible();
    const after = await page.evaluate(() => ({
      headerTop: document.querySelector('[data-testid="site-header"]')?.getBoundingClientRect().top,
      navBottom: document.querySelector('[data-testid="mobile-nav"]')?.getBoundingClientRect().bottom,
    }));

    expect(after.headerTop).toBe(before.headerTop);
    expect(after.navBottom).toBe(before.navBottom);
  });

  test("service worker endpoint registers in the browser", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await dismissLanguagePrompt();
    const response = await page.request.get("/sw.js");
    expect(response.ok()).toBe(true);
    expect(await response.text()).toContain("showNotification");

    const workerState = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return null;
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      await registration.update();
      const readyRegistration = await navigator.serviceWorker.ready;
      const state = readyRegistration.active?.state ?? null;
      const registeredScope = registration.scope;
      await registration.unregister();
      return { scope: registeredScope, state };
    });
    expect(workerState?.scope ? new URL(workerState.scope).pathname : null).toBe(
      "/"
    );
    expect(workerState?.state).toBe("activated");
  });

  test("post detail and profile routes resolve from feed links", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await dismissLanguagePrompt();
    const postLink = page.locator('a[href^="/post/"]').first();
    if ((await postLink.count()) === 0) {
      test.skip();
      return;
    }
    const href = await postLink.getAttribute("href");
    expect(href).toBeTruthy();
    await page.goto(href!, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/post\//);
    await expect(page.getByRole("heading", { name: /댓글/i })).toBeVisible();
  });
});
