import { APIError, betterAuth } from "better-auth";
import { setSessionCookie } from "better-auth/cookies";
import { createAuthEndpoint } from "@better-auth/core/api";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";

import {
  mapOAuthEmail,
  mapOAuthProfile,
} from "@/lib/oauth-identity";
import { createTemporaryUsername } from "@/lib/username";
import { generateBase62Id, generateUserId } from "@/lib/id";
import {
  createAvatarSeed,
  encodeGeneratedAvatar,
  normalizeOAuthAvatarImage,
} from "@/lib/avatar";
import {
  getOAuthProviderCapabilities,
  OAUTH_PROVIDER_IDS,
} from "@/lib/oauth-providers";
export type AppUserRole = "user" | "moderator" | "admin";
export type AppUserStatus = "active" | "banned" | "shadowbanned";
type AuthEnv = {
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  SOKDAK_AUTH_ORIGINS?: string;
  KAKAO_CLIENT_ID?: string;
  KAKAO_CLIENT_SECRET?: string;
  RATE_LIMIT_ENABLED?: boolean;
};

function configuredOrigins(baseURL: string, extraOrigins?: string): string[] {
  return [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3100",
    "http://127.0.0.1:3100",
    new URL(baseURL).origin,
    ...(extraOrigins?.split(",").map((origin) => origin.trim()).filter(Boolean) ??
      []),
  ].filter((origin, index, origins) => origins.indexOf(origin) === index);
}
function userFieldString(
  user: Record<string, unknown>,
  field: string
): string | null {
  const value = user[field];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function e2eSessionPlugin() {
  return {
    id: "e2e-session",
    endpoints: {
      e2eSession: createAuthEndpoint(
        "/e2e-session",
        { method: "POST" },
        async (ctx) => {
          const requestedUsername =
            typeof ctx.body === "object" &&
            ctx.body !== null &&
            "username" in ctx.body &&
            typeof ctx.body.username === "string"
              ? ctx.body.username
              : null;
          const email =
            requestedUsername === null || requestedUsername === "alice"
              ? "alice@example.local"
              : requestedUsername === "bob"
                ? "bob@example.local"
                : null;
          if (!email) {
            throw APIError.from("BAD_REQUEST", {
              code: "E2E_USER_NOT_ALLOWED",
              message: "E2E user is not allowlisted",
            });
          }

          const user = (await ctx.context.internalAdapter.findUserByEmail(email))
            ?.user;
          if (!user) {
            throw APIError.from("NOT_FOUND", {
              code: "E2E_USER_NOT_FOUND",
              message: "E2E user not found",
            });
          }

          const session = await ctx.context.internalAdapter.createSession(user.id);
          await setSessionCookie(ctx, { session, user });
          return ctx.json({ success: true });
        }
      ),
    },
  };
}


function createAuthFromDb(db: D1Database, env: AuthEnv) {
  const kysely = new Kysely({
    dialect: new D1Dialect({ database: db }),
  });
  const baseURL = env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const configuredProviders = getOAuthProviderCapabilities(env);
  const kakaoEnabled = configuredProviders.kakao;
  const trustedProviders = OAUTH_PROVIDER_IDS.filter(
    (provider) => configuredProviders[provider]
  );
  return betterAuth({
    database: {
      db: kysely,
      type: "sqlite",
      // Better Auth default column names are camelCase (emailVerified, createdAt, …)
      transaction: false,
    },
    advanced: {
      database: {
        generateId: ({ model, size }) =>
          model === "user" ? generateUserId() : generateBase62Id(size ?? 32),
      },
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL,
    trustedOrigins: configuredOrigins(baseURL, env.SOKDAK_AUTH_ORIGINS),
    // Logical path only — browser never hits /api/auth directly; POST /i/api tunnels it.
    basePath: "/api/auth",
    socialProviders: {
      ...(kakaoEnabled
        ? {
            kakao: {
              clientId: env.KAKAO_CLIENT_ID!,
              clientSecret: env.KAKAO_CLIENT_SECRET,
              // Email is optional; only request profile data from Kakao.
              disableDefaultScope: true,
              scope: ["profile_image", "profile_nickname"],
              mapProfileToUser: (profile) => {
                const kakaoProfile = (
                  profile.kakao_account?.profile ?? profile.properties ?? {}
                ) as {
                  nickname?: unknown;
                  username?: unknown;
                  profile_image_url?: unknown;
                };
                const profileWithName = profile as typeof profile & {
                  name?: unknown;
                };
                const nickname =
                  kakaoProfile.nickname ?? profileWithName.name ?? undefined;
                const image = normalizeOAuthAvatarImage(
                  kakaoProfile.profile_image_url
                );
                return {
                  ...mapOAuthProfile({
                    providerId: "kakao",
                    accountId: String(profile.id),
                    name: nickname,
                    providerUsername: kakaoProfile.username,
                  }),
                  ...mapOAuthEmail({
                    providerId: "kakao",
                    accountId: String(profile.id),
                    email: profile.kakao_account?.email,
                    emailVerified:
                      profile.kakao_account?.is_email_valid === true &&
                      profile.kakao_account?.is_email_verified === true,
                  }),
                  ...(image ? { image } : {}),
                };
              },
            },
          }
        : {}),
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders,
        disableImplicitLinking: true,
        allowDifferentEmails: true,
        allowUnlinkingAll: false,
        updateUserInfoOnLink: false,
      },
    },
    emailAndPassword: {
      enabled: false,
    },
    disabledPaths: [
      "/sign-in/email",
      "/sign-up/email",
      "/change-password",
      "/set-password",
      "/request-password-reset",
      "/reset-password",
      "/verify-password",
      "/update-user",
    ],
    session: {
      expiresIn: 60 * 60 * 24 * 14,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
        version: async (_session, cachedUser) => {
          const row = await db
            .prepare(
              `SELECT username, usernameChangedAt
               FROM "user" WHERE id = ?`
            )
            .bind(cachedUser.id)
            .first<{
              username: string | null;
              usernameChangedAt: string | null;
            }>();
          return `${row?.username ?? ""}:${row?.usernameChangedAt ?? ""}`;
        },
      },
    },
    user: {
      additionalFields: {
        username: {
          type: "string",
          required: false,
          input: false,
          returned: true,
        },
        contactEmail: {
          type: "string",
          required: false,
          input: true,
          returned: false,
        },
        onboardingComplete: {
          type: "boolean",
          defaultValue: false,
          required: false,
          input: false,
        },
        onboardingUsernameCandidate: {
          type: "string",
          required: false,
          input: true,
          returned: false,
        },
        role: {
          type: "string",
          defaultValue: "user",
          required: false,
          input: false,
        },
        status: {
          type: "string",
          defaultValue: "active",
          required: false,
          input: false,
        },
        bio: {
          type: "string",
          required: false,
        },
        preferredLanguage: {
          type: "string",
          defaultValue: "unknown",
          required: false,
          input: false,
        },
        theme: {
          type: "string",
          defaultValue: "system",
          required: false,
          input: false,
        },
        bannerKey: {
          type: "string",
          required: false,
          input: false,
        },
        allowDms: {
          type: "string",
          defaultValue: "anyone",
          required: false,
          input: false,
        },
      },
    },
    plugins: [
      ...(process.env.E2E_BOT_BYPASS === "1" ? [e2eSessionPlugin()] : []),
    ],
    rateLimit: {
      enabled: env.RATE_LIMIT_ENABLED ?? true,
      window: 60,
      max: 40,
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const currentUsername = userFieldString(
              user as Record<string, unknown>,
              "username"
            );
            const assignedUsername =
              currentUsername ?? (await createTemporaryUsername(db));
            const normalizedImage = normalizeOAuthAvatarImage(user.image);

            return {
              data: {
                ...user,
                username: assignedUsername,
                image:
                  normalizedImage ?? encodeGeneratedAvatar(createAvatarSeed()),
              },
            };
          },
        },
      },
    account: {
      delete: {
        before: async (account, context) => {
          const path = context?.path;
          if (
            path &&
            path !== "/unlink-account" &&
            path !== "/api/auth/unlink-account"
          ) {
            return;
          }
          if (account.providerId === "credential") return;

          const result = await db
            .prepare(
              `SELECT COUNT(*) AS count
               FROM account
               WHERE userId = ? AND providerId <> 'credential'`
            )
            .bind(account.userId)
            .first<{ count: number | string }>();
          if (Number(result?.count ?? 0) <= 1) {
            throw APIError.from("BAD_REQUEST", {
              code: "LAST_SOCIAL_ACCOUNT",
              message: "At least one social account must remain connected",
            });
          }
        },
      },
    },
    },
  });
}

export type Auth = ReturnType<typeof createAuthFromDb>;

let authSingleton: Auth | null = null;

/** Request-scoped auth instance bound to the current D1 database. */
export async function getAuth(): Promise<Auth> {
  const { env } = await getCloudflareContext({ async: true });

  if (!authSingleton) {
    authSingleton = createAuthFromDb(env.DB, {
      BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: env.BETTER_AUTH_URL,
      SOKDAK_AUTH_ORIGINS: env.SOKDAK_AUTH_ORIGINS,
      KAKAO_CLIENT_ID: env.KAKAO_CLIENT_ID,
      KAKAO_CLIENT_SECRET: env.KAKAO_CLIENT_SECRET,
      RATE_LIMIT_ENABLED:
        process.env.E2E_BOT_BYPASS === "1" ? false : undefined,
    });
  }

  return authSingleton;
}

/** Test/helper factory that does not rely on OpenNext context. */
export function createAuth(db: D1Database, env: AuthEnv = {}) {
  return createAuthFromDb(db, {
    BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET ?? "dev-secret-must-be-at-least-32-chars!!",
    BETTER_AUTH_URL: env.BETTER_AUTH_URL ?? "http://localhost:3000",
    SOKDAK_AUTH_ORIGINS: env.SOKDAK_AUTH_ORIGINS,
    KAKAO_CLIENT_ID: env.KAKAO_CLIENT_ID,
    KAKAO_CLIENT_SECRET: env.KAKAO_CLIENT_SECRET,
    RATE_LIMIT_ENABLED: false,
  });
}
