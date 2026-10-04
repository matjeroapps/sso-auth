import { DynamicTheme } from "@/components/dynamic-theme";
import { SignInWithIdp } from "@/components/sign-in-with-idp";
import { getServiceConfig } from "@/lib/service-url";
import { getActiveIdentityProviders, getBrandingSettings } from "@/lib/zitadel";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("idp");
  return { title: t("title") };
}

export default async function Page(props: { searchParams: Promise<Record<string | number | symbol, string | undefined>> }) {
  const searchParams = await props.searchParams;

  const requestId = searchParams?.requestId;
  const organization = searchParams?.organization;

  const _headers = await headers();
  const { serviceConfig } = getServiceConfig(_headers);

  const identityProviders = await getActiveIdentityProviders({ serviceConfig, orgId: organization }).then((resp) => {
    return resp.identityProviders;
  });

  const branding = await getBrandingSettings({ serviceConfig, organization });

  return (
    <DynamicTheme branding={branding}>
      <div className="mb-6 flex flex-col items-center space-y-2 text-center">
        <h1 className="font-heading text-matjerhub-foreground text-3xl font-bold tracking-tight">Join an organization</h1>
        <p className="font-body text-matjerhub-muted-foreground text-base">Sign in with your organization's provider</p>
      </div>

      <div className="w-full">
        {!!identityProviders?.length && (
          <SignInWithIdp
            identityProviders={identityProviders}
            requestId={requestId}
            organization={organization}
            postErrorRedirectUrl="/idp"
            showLabel={false}
          ></SignInWithIdp>
        )}
      </div>
    </DynamicTheme>
  );
}
