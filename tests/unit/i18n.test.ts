import { describe, expect, it } from "vitest";

import {
  detectLocaleFromAcceptLanguage,
  detectLocaleFromCountry,
  LOCALES,
  resolveLocale,
} from "@/lib/i18n/config";
import { localizeErrorMessage } from "@/lib/i18n/errors";

describe("request locale detection", () => {
  it("supports the two UI locales", () => {
    expect(LOCALES).toEqual(["ko", "en"]);
  });

  it.each([
    ["ko-KR,ko;q=0.9,en;q=0.8", "ko"],
    ["en-US,en;q=0.9", "en"],
    ["zh-CN,ja;q=0.9", null],
    [null, null],
  ])("detects the best browser locale from %s", (header, expected) => {
    expect(detectLocaleFromAcceptLanguage(header)).toBe(expected);
  });

  it.each([
    ["kr", "ko"],
    ["VN", null],
    ["US", null],
  ])("uses Cloudflare country %s as a fallback", (country, expected) => {
    expect(detectLocaleFromCountry(country)).toBe(expected);
  });

  it("keeps explicit choices ahead of automatic detection", () => {
    expect(
      resolveLocale({
        cookieLocale: "en",
        preferredLanguage: "ko",
        acceptLanguage: "en",
        countryCode: "KR",
      })
    ).toBe("en");
    expect(
      resolveLocale({
        preferredLanguage: "en",
        acceptLanguage: "ko",
        countryCode: "KR",
      })
    ).toBe("en");
    expect(
      resolveLocale({ acceptLanguage: "en", countryCode: "KR" })
    ).toBe("en");
    expect(resolveLocale({ countryCode: "KR" })).toBe("ko");
    expect(resolveLocale({ countryCode: "XX" })).toBe("ko");
  });

  it("explains Kakao auth errors in the selected UI language", () => {
    expect(localizeErrorMessage("KOE004", "ko")).toContain(
      "카카오 로그인"
    );
    expect(localizeErrorMessage("KOE004", "en")).toContain(
      "Kakao Login is not enabled"
    );
    expect(localizeErrorMessage("KOE205", "ko")).toContain(
      "닉네임과 프로필 사진"
    );
    expect(localizeErrorMessage("KOE205", "en")).toContain(
      "nickname and profile image"
    );
  });
  it("keeps DM request failures actionable in Korean and English", () => {
    expect(
      localizeErrorMessage("This user isn't accepting chat requests", "ko")
    ).toBe("이 사용자는 대화 요청을 받지 않습니다");
    expect(
      localizeErrorMessage("A chat request is already pending", "ko")
    ).toBe("대화 요청이 이미 처리 대기 중입니다");
    expect(localizeErrorMessage("Chat already exists", "en")).toBe(
      "Chat already exists"
    );
    expect(
      localizeErrorMessage("You're doing that too often. Try again later.", "ko")
    ).toBe("요청이 너무 많습니다. 나중에 다시 시도해 주세요.");
    expect(localizeErrorMessage("You can't message this user", "en")).toBe(
      "You can't message this user"
    );
  });

});
