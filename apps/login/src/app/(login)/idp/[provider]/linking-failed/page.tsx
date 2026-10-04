import { DynamicTheme } from "@/components/dynamic-theme";
import { Translated } from "@/components/translated";
import { getServiceConfig } from "@/lib/service-url";
import { getBrandingSettings } from "@/lib/zitadel";
import { headers } from "next/headers";

/**
 * Linking failed page - shown when IDP linking fails
 */
export default async function LinkingFailedPage(props: {
  searchParams: Promise<Record<string | number | symbol, string | undefined>>;
  params: Promise<{ provider: string }>;
}) {
  const searchParams = await props.searchParams;
  const { organization, error } = searchParams;

  const _headers = await headers();
  const { serviceConfig } = getServiceConfig(_headers);

  const branding = await getBrandingSettings({ serviceConfig, organization });

  return (
    <DynamicTheme branding={branding}>
      <div className="mb-6 flex flex-col items-center space-y-2 text-center">
        <h1 className="font-heading text-matjerhub-foreground text-3xl font-bold tracking-tight">
          <Translated i18nKey="title" namespace="idp" />
        </h1>
        <p className="font-body text-matjerhub-muted-foreground text-base">
          <Translated i18nKey="errors.linkingFailed" namespace="idp" />
        </p>
        {error && <p className="text-matjerhub-danger text-sm font-medium">{error}</p>}
      </div>
    </DynamicTheme>
  );
}
