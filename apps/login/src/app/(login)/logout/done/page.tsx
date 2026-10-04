import { DynamicTheme } from "@/components/dynamic-theme";
import { Translated } from "@/components/translated";
import { getServiceConfig } from "@/lib/service-url";
import { getBrandingSettings } from "@/lib/zitadel";
import { headers } from "next/headers";

export default async function Page(props: { searchParams: Promise<any> }) {
  const searchParams = await props.searchParams;

  const _headers = await headers();
  const { serviceConfig } = getServiceConfig(_headers);

  const { organization } = searchParams;

  const branding = await getBrandingSettings({ serviceConfig, organization });

  return (
    <DynamicTheme branding={branding}>
      <div className="mb-6 flex flex-col items-center space-y-2 text-center">
        <h1 className="font-heading text-matjerhub-foreground text-3xl font-bold tracking-tight">
          <Translated i18nKey="success.title" namespace="logout" />
        </h1>
        <p className="font-body text-matjerhub-muted-foreground text-base">
          <Translated i18nKey="success.description" namespace="logout" />
        </p>
      </div>
      <div className="w-full"></div>
    </DynamicTheme>
  );
}
