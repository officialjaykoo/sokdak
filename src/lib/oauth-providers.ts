export const OAUTH_PROVIDER_IDS = ["kakao", "naver"] as const;

export type OAuthProviderId = (typeof OAUTH_PROVIDER_IDS)[number];

export type OAuthProviderEnv = {
  KAKAO_CLIENT_ID?: string | null;
  KAKAO_CLIENT_SECRET?: string | null;
  NAVER_CLIENT_ID?: string | null;
  NAVER_CLIENT_SECRET?: string | null;
};

export type OAuthProviderCapabilities = Record<OAuthProviderId, boolean>;

/**
 * Keep this predicate aligned with the provider objects built in auth.ts.
 * Only booleans cross the server/client boundary; credentials never do.
 */
function configured(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function getOAuthProviderCapabilities(
  env: OAuthProviderEnv
): OAuthProviderCapabilities {
  return {
    kakao: configured(env.KAKAO_CLIENT_ID),
    naver: configured(env.NAVER_CLIENT_ID),
  };
}
