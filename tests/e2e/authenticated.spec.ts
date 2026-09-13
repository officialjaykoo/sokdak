import { expect, test } from "@playwright/test";

import {
  disguiseAutomation,
  expectSignedIn,
  loginAsAlice,
  seedLocaleCookie,
  waitForHydration,
  warmBotGuard,
} from "./helpers/auth";

test.describe("authenticated flows", () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-desktop",
      "Auth flows run on chromium-desktop only"
    );
    await seedLocaleCookie(page);
  });

  test("account can post, comment, like, hide, open settings", async ({
    page,
  }) => {
    await disguiseAutomation(page);
    await loginAsAlice(page);
    await expectSignedIn(page);
    await expect(
      page.getByRole("heading", { name: "속닥속닥", level: 1 })
    ).toBeVisible();

    // Create post
    await page.goto("/submit", { waitUntil: "domcontentloaded" });
    await warmBotGuard(page);
    await waitForHydration(page);
    await expect(
      page.getByRole("heading", { name: /글 작성/i }).first()
    ).toBeVisible({
      timeout: 30_000,
    });

    const title = `E2E post ${Date.now()}`;
    await page.getByPlaceholder("흥미로운 제목").fill(title);
    await page
      .getByPlaceholder("내용을 더 작성해 주세요…")
      .fill("Created by Playwright e2e.");
    await page.getByRole("button", { name: /^게시$/ }).click();
    await expect(page).toHaveURL(/\/post\//, { timeout: 45_000 });
    await expect(page.getByRole("link", { name: title })).toBeVisible();

    // Comment + like
    await warmBotGuard(page);
    const commentBody = `E2E comment ${Date.now()}`;
    await page.getByLabel(/^댓글$/).fill(commentBody);
    await page.getByRole("button", { name: /^댓글$/ }).click();
    await expect(
      page.getByRole("listitem").filter({ hasText: commentBody })
    ).toBeVisible({ timeout: 30_000 });

    const likeButton = page.getByRole("button", { name: /^좋아요$/ }).first();
    await likeButton.click();
    await expect(likeButton).toHaveAttribute("aria-pressed", "true", {
      timeout: 15_000,
    });

    // Hide via overflow (success toast is cleared by router.refresh)
    await page.getByRole("button", { name: /글 옵션/i }).click();
    await page.getByRole("menuitem", { name: /관심 없음/i }).click();
    await expect(
      page.getByRole("menuitem", { name: /관심 없음/i })
    ).toBeHidden({ timeout: 15_000 });

    // Settings
    await page.goto("/settings", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/settings/);
    await expect(
      page.getByRole("heading", { name: /설정/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });
  test("profile and settings preserve callback errors and mobile keyboard UX", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAlice(page);

    await page.goto(
      "/settings?section=account&error=KOE004&error_description=secret-leak",
      { waitUntil: "domcontentloaded" }
    );
    await waitForHydration(page);
    await expect(page.locator('p[role="alert"]')).toContainText(/카카오 로그인/i);
    await expect(page).toHaveURL(/\/settings\?section=account$/);

    await page.goto("/settings?section=profile", {
      waitUntil: "domcontentloaded",
    });
    await waitForHydration(page);
    await expect(
      page.getByRole("textbox", { name: /사용자 이름/i })
    ).toBeVisible();
    const username = page.getByRole("textbox", {
      name: /사용자 이름/i,
    });
    await username.fill("alice_keyboard");
    const save = page.getByRole("button", { name: /프로필 저장/i });
    await save.click();

    const dialog = page.getByRole("dialog");
    const cancel = dialog.getByRole("button", { name: /취소/i });
    const confirm = dialog.getByRole("button", { name: /변경 및 저장/i });
    await expect(dialog).toBeVisible();
    await expect(cancel).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(confirm).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(cancel).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(save).toBeFocused();

    await page.goto("/u/alice?tab=posts", {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByRole("link", { name: "글", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "글", exact: true })
    ).toHaveAttribute("href", "/u/alice?tab=posts");
    const layout = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width);
  });

  test("composer shortcuts preserve post type", async ({ page }) => {
    await disguiseAutomation(page);
    await loginAsAlice(page);
    await expectSignedIn(page);

    await page.goto("/", { waitUntil: "domcontentloaded" });
    const composer = page.getByTestId("feed-composer");
    await expect(
      composer.getByRole("link", { name: /이미지/i })
    ).toHaveAttribute("href", "/submit?type=image");
    await expect(
      composer.getByRole("link", { name: /링크/i })
    ).toHaveAttribute("href", "/submit?type=link");

    await page.goto("/submit?type=image", { waitUntil: "domcontentloaded" });
    await waitForHydration(page);
    await expect(page.getByRole("tab", { name: /이미지/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );

    await page.goto("/submit?type=link", { waitUntil: "domcontentloaded" });
    await waitForHydration(page);
    await expect(page.getByRole("tab", { name: /링크/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  test("post detail renders the body exactly once", async ({ page }) => {
    await disguiseAutomation(page);
    await loginAsAlice(page);
    await expectSignedIn(page);

    await page.goto("/submit?type=text", { waitUntil: "domcontentloaded" });
    await waitForHydration(page);
    await warmBotGuard(page);

    const title = `Detail body ${Date.now()}`;
    const body = `Unique detail body ${Date.now()}`;
    await page.getByPlaceholder("흥미로운 제목").fill(title);
    await page.getByPlaceholder("내용을 더 작성해 주세요…").fill(body);
    await page.getByRole("button", { name: /^게시$/ }).click();

    await expect(page).toHaveURL(/\/post\//, { timeout: 45_000 });
    await expect(page.getByText(body, { exact: true })).toHaveCount(1);
  });
  test("desktop header keeps navigation action order", async ({ page }) => {
    await disguiseAutomation(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await loginAsAlice(page);
    await expectSignedIn(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("button", { name: /계정 메뉴/i })
    ).toBeVisible({ timeout: 20_000 });
    const links = await page.evaluate(() => {
      const expected = [
        "/",
        "/submit",
        "/messages",
        "/notifications",
      ];
      const primary = [...document.querySelectorAll("header nav a")].map(
        (link) => {
          const rect = link.getBoundingClientRect();
          return { href: link.getAttribute("href"), left: rect.left };
        }
      );
      const visible = (href: string) => {
        const link = [...document.querySelectorAll("header a")].find((item) => {
          if (item.getAttribute("href") !== href) return false;
          const rect = item.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
        if (!link) return null;
        const rect = link.getBoundingClientRect();
        return { href, left: rect.left };
      };
      return {
        primary,
        actions: expected.slice(1).map(visible),
      };
    });
    const expected = [
      "/",
      "/submit",
      "/messages",
      "/notifications",
    ];

    expect(links.primary.map(({ href }) => href)).toEqual(expected.slice(0, 1));
    expect(links.actions).not.toContain(null);
    expect(links.actions.map((link) => link?.href)).toEqual(expected.slice(1));
    const ordered = [
      ...links.primary.map(({ left }) => left),
      ...links.actions.map((link) => link?.left ?? Number.POSITIVE_INFINITY),
    ];
    expect(ordered).toEqual([...ordered].sort((a, b) => a - b));
  });

  test("mobile chrome follows scroll direction and account menu", async ({
    page,
  }) => {
    await disguiseAutomation(page);
    await loginAsAlice(page);
    await expectSignedIn(page);
    await page.setViewportSize({ width: 390, height: 844 });

    const header = page.getByRole("banner");
    const mobileNav = page.locator("nav.safe-pb-nav");
    const menu = header.getByRole("button", { name: /계정 메뉴/i });
    const logo = header.getByRole("link", { name: /속닥속닥 홈/i });
    const create = header.getByRole("link", { name: /^글쓰기$/ });
    const search = header.getByRole("link", { name: /^검색$/ });
    const messages = header.getByRole("link", { name: /^메시지$/ });

    await expect(menu).toBeVisible();
    await expect(logo).toBeVisible();
    await expect(create).toBeVisible();
    await expect(search).toBeVisible();
    await expect(messages).toBeVisible();
    await expect(
      menu.locator("svg.lucide-circle-user-round")
    ).toBeHidden();
    await expect(mobileNav.getByRole("link")).toHaveCount(4);

    const positions = await Promise.all(
      [menu, logo, create, search, messages].map(async (locator) => {
        const box = await locator.boundingBox();
        return box?.x ?? -1;
      })
    );
    expect(positions[0]).toBeLessThan(positions[1]);
    expect(positions[1]).toBeLessThan(positions[2]);
    expect(positions[2]).toBeLessThan(positions[3]);
    expect(positions[3]).toBeLessThan(positions[4]);

    await menu.click();
    const accountMenu = page.getByRole("menu");
    await expect(accountMenu).toBeVisible();
    await expect(accountMenu).toContainText("@alice");
    await page.keyboard.press("Escape");

    await page.evaluate(() => window.scrollTo(0, 800));
    await expect(header).toHaveClass(/-translate-y-full/);
    await expect(mobileNav).toHaveClass(/translate-y-full/);

    await page.evaluate(() => window.scrollTo(0, 500));
    await expect(header).not.toHaveClass(/-translate-y-full/);
    await expect(mobileNav).not.toHaveClass(/translate-y-full/);
  });
  test("authenticated login and signup routes honor safe next paths", async ({
    page,
  }) => {
    await disguiseAutomation(page);
    await loginAsAlice(page);
    await expectSignedIn(page);

    await page.goto("/login?next=%2Fmessages", {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(/\/messages$/);

    await page.goto("/signup?next=%2Fmessages", {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(/\/messages$/);
  });

  test("logout clears auth and API security contexts", async ({ page }) => {
    await disguiseAutomation(page);
    await loginAsAlice(page);
    await expectSignedIn(page);

    const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
    const guardNames = ["red_atk", "red_sec", "red_qn", "red_qv"];
    const beforeLogout = await page.context().cookies(baseURL);
    const beforeGuard = Object.fromEntries(
      beforeLogout
        .filter((cookie) => guardNames.includes(cookie.name))
        .map((cookie) => [cookie.name, cookie.value])
    );
    const beforeLocale = beforeLogout.find(
      (cookie) => cookie.name === "sokdak_lang"
    )?.value;
    const expiredGuardResponse = page.waitForResponse(
      async (response) => {
        if (
          response.request().method() !== "POST" ||
          !response.url().includes("/i/api")
        ) {
          return false;
        }
        const setCookie = (await response.allHeaders())["set-cookie"] ?? "";
        return guardNames.every(
          (name) =>
            setCookie.includes(`${name}=;`) &&
            setCookie.includes("Max-Age=0")
        );
      },
      { timeout: 45_000 }
    );

    const header = page.getByTestId("site-header");
    await header.getByRole("button", { name: /계정 메뉴/i }).click();
    const menu = page.getByRole("menu");
    await expect(menu).toContainText("@alice");
    await expect(menu.getByRole("menuitem", { name: /로그아웃/i })).toHaveCount(
      1
    );
    await menu.getByRole("menuitem", { name: /로그아웃/i }).click();

    const logoutResponse = await expiredGuardResponse;
    const logoutSetCookie = (await logoutResponse.allHeaders())["set-cookie"] ?? "";
    const logoutSetCookieLines = logoutSetCookie.split(/\r?\n/);
    expect(
      logoutSetCookieLines.some(
        (line) => line.startsWith("red_sec=;") && line.includes("HttpOnly")
      )
    ).toBe(true);
    expect(
      logoutSetCookieLines.some(
        (line) => line.includes("session_token=;") && line.includes("Max-Age=0")
      )
    ).toBe(true);

    await expect(page).toHaveURL(/\/$/, { timeout: 45_000 });
    await expect(
      header.getByRole("link", { name: /로그인/i })
    ).toHaveCount(1, { timeout: 45_000 });
    await expect(header.getByRole("link", { name: /메시지/i })).toHaveCount(0);
    await expect(header.getByRole("link", { name: /알림/i })).toHaveCount(0);
    await expect(header.getByAltText("@alice")).toHaveCount(0);

    const afterLogout = await page.context().cookies(baseURL);
    const afterGuard = Object.fromEntries(
      afterLogout
        .filter((cookie) => guardNames.includes(cookie.name))
        .map((cookie) => [cookie.name, cookie.value])
    );
    for (const name of guardNames) {
      if (beforeGuard[name]) expect(afterGuard[name]).not.toBe(beforeGuard[name]);
    }
    expect(
      afterLogout.find((cookie) => cookie.name === "sokdak_lang")?.value
    ).toBe(beforeLocale);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(header.getByRole("link", { name: /로그인/i })).toHaveCount(1);
    const sessionResponse = await page.request.get("/api/auth/get-session");
    expect(sessionResponse.ok()).toBe(true);
    expect(await sessionResponse.json()).toBeNull();

    const protectedResponse = await page.request.get("/api/messages");
    expect(protectedResponse.status()).toBe(401);
  });
  test("logout then login succeeds with one click", async ({ page }) => {
    await disguiseAutomation(page);
    await loginAsAlice(page);
    await expectSignedIn(page);

    const header = page.getByTestId("site-header");
    await header.getByRole("button", { name: /계정 메뉴/i }).click();
    await page.getByRole("menuitem", { name: /로그아웃/i }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 45_000 });

    await header.getByRole("link", { name: /로그인/i }).click();
    await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: /속닥속닥 계속하기/i })
    ).toBeVisible();
    await expect(page.getByText("문제가 발생했습니다")).toHaveCount(0);
  });


  test("logout removes private messages UI before returning home", async ({
    page,
  }) => {
    await disguiseAutomation(page);
    await loginAsAlice(page, "/messages");
    await expectSignedIn(page);
    await expect(page.getByTestId("messages-page")).toBeVisible();

    await page
      .getByTestId("site-header")
      .getByRole("button", { name: /계정 메뉴/i })
      .click();
    await page.getByRole("menuitem", { name: /로그아웃/i }).click();

    await expect(page).toHaveURL(/\/$/, { timeout: 45_000 });
    await expect(page.getByTestId("messages-page")).toHaveCount(0);
    await expect(
      page.getByTestId("site-header").getByRole("link", { name: /메시지/i })
    ).toHaveCount(0);
  });

  test("logout failure keeps authenticated UI and shows a retryable error", async ({
    page,
  }) => {
    await disguiseAutomation(page);
    await loginAsAlice(page);
    await expectSignedIn(page);

    const header = page.getByTestId("site-header");
    await header.getByRole("button", { name: /계정 메뉴/i }).click();
    await page.route("**/i/api*", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "text/plain",
        body: "forced logout failure",
      });
    });

    await page.getByRole("menuitem", { name: /로그아웃/i }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
    await expect(header.getByRole("button", { name: /계정 메뉴/i })).toBeVisible();
    await expect(header.getByRole("alert")).toContainText(/로그아웃하지 못했습니다/i);
    await page.unroute("**/i/api*");
  });

  test("logout propagates to another tab through the Better Auth store", async ({
    page,
  }) => {
    await disguiseAutomation(page);
    await loginAsAlice(page);
    await expectSignedIn(page);

    const otherTab = await page.context().newPage();
    try {
      await otherTab.goto("/", { waitUntil: "domcontentloaded" });
      await expectSignedIn(otherTab);

      await page
        .getByTestId("site-header")
        .getByRole("button", { name: /계정 메뉴/i })
        .click();
      await page.getByRole("menuitem", { name: /로그아웃/i }).click();
      await expect(page).toHaveURL(/\/$/, { timeout: 45_000 });

      await otherTab.bringToFront();
      await expect(
        otherTab.getByRole("link", { name: /로그인/i })
      ).toHaveCount(1, { timeout: 30_000 });
      await expect(
        otherTab.getByRole("button", { name: /계정 메뉴/i })
      ).toHaveCount(0);
    } finally {
      await otherTab.close();
    }
  });
});
