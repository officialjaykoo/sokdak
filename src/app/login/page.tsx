import { SocialAuthPage } from "@/components/auth/social-auth-form";

import { redirect } from "next/navigation";

import { getSafeAuthNext } from "@/lib/auth-redirect";
import { getEnv } from "@/lib/db";
import { getOAuthProviderCapabilities } from "@/lib/oauth-providers";
import { getSession } from "@/lib/session";

type AuthPageProps = {
  searchParams: Promise<{
    next?: string | string[] | undefined;
  }>;
};

export default async function LoginPage({ searchParams }: AuthPageProps) {
  const session = await getSession();
  if (session?.user) {
    const { next } = await searchParams;
    redirect(getSafeAuthNext(next));
  }

  const env = await getEnv();
  return (
    <SocialAuthPage providers={getOAuthProviderCapabilities(env)} />
  );
}
