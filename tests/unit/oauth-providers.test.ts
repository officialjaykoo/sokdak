import { describe, expect, it } from "vitest";

import { getOAuthProviderCapabilities } from "@/lib/oauth-providers";

describe("OAuth provider capabilities", () => {
  it("exposes only provider readiness booleans", () => {
    expect(
      getOAuthProviderCapabilities({
        KAKAO_CLIENT_ID: "kakao-id",
        NAVER_CLIENT_ID: "naver-id",
      })
    ).toEqual({ kakao: true, naver: true });
  });

  it("does not mark unconfigured providers as connectable", () => {
    expect(getOAuthProviderCapabilities({})).toEqual({
      kakao: false,
      naver: false,
    });
  });

  it("treats blank credentials as unconfigured", () => {
    expect(
      getOAuthProviderCapabilities({
        KAKAO_CLIENT_ID: "\t",
        NAVER_CLIENT_ID: " ",
      })
    ).toEqual({ kakao: false, naver: false });
  });
});
