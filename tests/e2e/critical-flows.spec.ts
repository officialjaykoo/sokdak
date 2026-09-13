import { expect, test, type Page } from "@playwright/test";

import {
  loginAsSeedUser,
  waitForHydration,
  warmBotGuard,
} from "./helpers/auth";

const BOB_POST = "/post/e9Ee0Ff1Gg2";
const BOB_POST_TITLE = "사이드 프로젝트의 에러 버짓";
const ALICE_POST = "/post/o7Oo8Pp9Qq0";
const ALICE_POST_TITLE = "속닥 속삭임: 오늘의 커밋";


async function currentUsername(page: Page) {
  const response = await page.evaluate(async () => {
    const result = await fetch("/api/me/settings");
    return (await result.json()) as {
      settings?: { username?: string | null };
    };
  });
  const username = response.settings?.username;
  if (!username) throw new Error("The seeded E2E user has no username");
  return username;
}

test.describe("critical browser flows", () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-desktop",
      "Critical flows run on chromium-desktop only"
    );
  });

  test("popular feed renders the canonical public stream", async ({ page }) => {
    await loginAsSeedUser(page, "alice");
    await page.goto("/?sort=popular", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\?sort=popular/);
    await expect(
      page.locator('tbody tr a[href^="/post/"]').first()
    ).toBeVisible({ timeout: 30_000 });
  });

  test("Alice saves Bob's post and opens the saved list", async ({ page }) => {
    await loginAsSeedUser(page, "alice", BOB_POST);
    await waitForHydration(page);

    try {
      const post = page.locator("article").filter({ hasText: BOB_POST_TITLE }).first();
      const openMenu = () =>
        post.getByRole("button", { name: /글 옵션/i }).click();
      await openMenu();
      const removeFromSaved = page.getByRole("menuitem", { name: /^저장 취소$/ });
      if (await removeFromSaved.isVisible().catch(() => false)) {
        await removeFromSaved.click();
        await page.reload({ waitUntil: "domcontentloaded" });
        await waitForHydration(page);
        await openMenu();
      }
      const savePost = page.getByRole("menuitem", { name: /^글 저장$/ });
      await expect(savePost).toBeVisible();
      await savePost.click();
      await expect(page.getByRole("status")).toContainText("글을 저장했습니다.", {
        timeout: 30_000,
      });
      await page.goto("/saved", { waitUntil: "domcontentloaded" });
      await expect(page.getByText(BOB_POST_TITLE, { exact: true })).toBeVisible();
    } finally {
      await page.goto(BOB_POST, { waitUntil: "domcontentloaded" });
      await waitForHydration(page);
      const post = page.locator("article").filter({ hasText: BOB_POST_TITLE }).first();
      await post.getByRole("button", { name: /글 옵션/i }).click();
      const removeFromSaved = page.getByRole("menuitem", { name: /^저장 취소$/ });
      if (await removeFromSaved.isVisible().catch(() => false)) {
        await removeFromSaved.click();
        await expect(page.getByRole("status")).toContainText("저장을 취소했습니다.", {
          timeout: 30_000,
        });
      }
    }
  });

  test("Alice mutes Bob's anonymous author but can still read his post", async ({
    page,
  }) => {
    await loginAsSeedUser(page, "alice", BOB_POST);
    await waitForHydration(page);

    try {
      await page.goto("/settings?section=privacy", {
        waitUntil: "domcontentloaded",
      });
      const bobMutedRow = page.locator("li", {
        has: page.getByRole("button", { name: /^뮤트 해제$/ }),
        hasText: "@bob",
      });
      if (await bobMutedRow.count()) {
        await bobMutedRow
          .getByRole("button", { name: /^뮤트 해제$/ })
          .click();
      }

      await page.goto(BOB_POST, { waitUntil: "domcontentloaded" });
      await waitForHydration(page);
      await page.getByRole("button", { name: /글 옵션/i }).click();
      await page.getByRole("menuitem", { name: /뮤트$/ }).click();
      await expect(page.getByRole("status")).toContainText("뮤트됨", {
        timeout: 30_000,
      });

      await page.goto("/?sort=popular", { waitUntil: "domcontentloaded" });
      await expect(page.getByText(BOB_POST_TITLE, { exact: true })).toHaveCount(0);

      await page.goto(BOB_POST, { waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("link", { name: BOB_POST_TITLE })
      ).toBeVisible();
    } finally {
      await page.goto("/settings?section=privacy", {
        waitUntil: "domcontentloaded",
      });
      const cleanupRow = page.locator("li", {
        has: page.getByRole("button", { name: /^뮤트 해제$/ }),
        hasText: "@bob",
      });
      if (await cleanupRow.count()) {
        await cleanupRow
          .getByRole("button", { name: /^뮤트 해제$/ })
          .click();
      }
    }
  });

  test("blocking preserves public reads and denies bilateral actions", async ({
    browser,
  }) => {
    const aliceContext = await browser.newContext();
    const bobContext = await browser.newContext();
    const alice = await aliceContext.newPage();
    const bob = await bobContext.newPage();

    try {
      await loginAsSeedUser(alice, "alice");
      const alicePostPath = ALICE_POST;

      await alice.goto("/settings?section=privacy", {
        waitUntil: "domcontentloaded",
      });
      const bobBlockedRow = alice.locator("li", {
        has: alice.getByRole("button", { name: /^차단 해제$/ }),
        hasText: "@bob",
      });
      if (await bobBlockedRow.count()) {
        await bobBlockedRow
          .getByRole("button", { name: /^차단 해제$/ })
          .click();
      }

      await alice.goto(BOB_POST, { waitUntil: "domcontentloaded" });
      await waitForHydration(alice);
      await alice.getByRole("button", { name: /글 옵션/i }).click();
      await alice.getByRole("menuitem", { name: /차단$/ }).click();
      await expect(alice.getByRole("status")).toContainText("차단됨", {
        timeout: 15_000,
      });
      await alice.goto("/settings?section=privacy", {
        waitUntil: "domcontentloaded",
      });
      await expect(
        alice.locator("li", {
          has: alice.getByRole("button", { name: /^차단 해제$/ }),
          hasText: "@bob",
        })
      ).toBeVisible({ timeout: 30_000 });
      await alice.goto(BOB_POST, { waitUntil: "domcontentloaded" });
      await waitForHydration(alice);

      await expect(
        alice.getByRole("link", { name: BOB_POST_TITLE })
      ).toBeVisible({ timeout: 30_000 });
      const like = alice.getByRole("button", { name: /^좋아요/ }).first();
      await like.evaluate(
        () =>
          new Promise<void>((resolve) => {
            requestAnimationFrame(() => resolve());
          })
      );
      await like.click();
      // The server rejects the like on a blocked author — the optimistic
      // "true" frame may be skipped entirely, so assert the rejection.
      await expect(
        alice.locator('[role="alert"]').first()
      ).toBeVisible({ timeout: 15_000 });
      await expect(like).toHaveAttribute("aria-pressed", "false", {
        timeout: 15_000,
      });
      const blockedComment = `blocked comment ${Date.now()}`;
      await alice.getByLabel(/^댓글$/).fill(blockedComment);
      await alice.getByRole("button", { name: /^댓글$/ }).click();
      await expect(alice.locator('p[role="alert"]').first()).toBeVisible({
        timeout: 15_000,
      });
      await loginAsSeedUser(bob, "bob", alicePostPath);
      await waitForHydration(bob);
      await expect(
        bob.getByRole("link", { name: ALICE_POST_TITLE })
      ).toBeVisible({ timeout: 30_000 });
      const aliceUsername = await currentUsername(alice);
      await bob.goto(`/messages?to=${encodeURIComponent(aliceUsername)}`, {
        waitUntil: "domcontentloaded",
      });
      await bob.waitForLoadState("networkidle");
      await warmBotGuard(bob);
      const blockedRequest = `blocked request ${Date.now()}`;
      await bob
        .getByPlaceholder(/^인사를 보내세요/i)
        .fill(blockedRequest);
      const sendButton = bob.getByRole("button", { name: /^보내기$/ });
      await expect(sendButton).toBeEnabled({ timeout: 15_000 });
      await sendButton.click();
      await expect(
        bob.locator('[role="alert"]').first()
      ).toBeVisible({ timeout: 15_000 });
    } finally {
      try {
        await alice.goto("/settings?section=privacy", {
          waitUntil: "domcontentloaded",
        });
        const cleanupBlock = alice.locator("li", {
          has: alice.getByRole("button", { name: /^차단 해제$/ }),
          hasText: "@bob",
        });
        if (await cleanupBlock.count()) {
          await cleanupBlock
            .getByRole("button", { name: /^차단 해제$/ })
            .click();
        }
      } catch {
        // Preserve the original assertion if cleanup cannot reach the profile.
      }
      await aliceContext.close();
      await bobContext.close();
    }
  });

  test("DM request and reply arrive through the rendered WebSocket path", async ({
    browser,
  }) => {
    test.skip(
      !process.env.PLAYWRIGHT_BASE_URL,
      "Requires a deployed worker with the ChatRoom Durable Object binding"
    );
    const aliceContext = await browser.newContext();
    const bobContext = await browser.newContext();
    const alice = await aliceContext.newPage();
    const bob = await bobContext.newPage();
    const socketUrls: string[] = [];

    try {
      await loginAsSeedUser(alice, "alice", "/messages");
      const aliceUsername = await currentUsername(alice);
      await loginAsSeedUser(bob, "bob", "/messages");
      await bob.getByRole("button", { name: /^새 메시지$/ }).click();
      const opener = `Realtime opener ${Date.now()}`;
      await bob.getByPlaceholder(/^사용자 이름$/).fill(aliceUsername);
      await bob.getByPlaceholder(/^인사를 보내세요/i).fill(opener);
      await bob.getByRole("button", { name: /^보내기$/ }).click();

      await alice.reload({ waitUntil: "domcontentloaded" });
      await expect(alice.getByText(opener, { exact: true })).toBeVisible({
        timeout: 30_000,
      });
      const accept = alice.getByRole("button", { name: /^수락$/ });
      if (await accept.isVisible().catch(() => false)) {
        await accept.click();
      } else {
        await alice
          .getByRole("button", { name: /@bob/i })
          .first()
          .click();
      }
      await expect(alice).toHaveURL(/\/messages\?room=/, {
        timeout: 30_000,
      });
      const roomId = new URL(alice.url()).searchParams.get("room");
      if (!roomId) throw new Error("Accepted DM did not expose a room id");

      alice.on("websocket", (socket) => socketUrls.push(socket.url()));
      await alice.reload({ waitUntil: "domcontentloaded" });
      await expect
        .poll(() => socketUrls.some((url) => url.includes("/api/messages/realtime")), {
          timeout: 30_000,
        })
        .toBe(true);

      await bob.goto(`/messages?room=${encodeURIComponent(roomId)}`, {
        waitUntil: "domcontentloaded",
      });
      const reply = `Realtime reply ${Date.now()}`;
      await bob.getByPlaceholder(/^메시지를 작성하세요/i).fill(reply);
      await bob.getByRole("button", { name: /^보내기$/ }).click();
      await expect(bob.getByText(reply, { exact: true })).toBeVisible({
        timeout: 30_000,
      });
      await expect(alice.getByText(reply, { exact: true })).toBeVisible({
        timeout: 30_000,
      });
    } finally {
      await aliceContext.close();
      await bobContext.close();
    }
  });
});
