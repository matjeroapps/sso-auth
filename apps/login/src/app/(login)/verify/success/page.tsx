import { DynamicTheme } from "@/components/dynamic-theme";
import { Translated } from "@/components/translated";
import { VerifySuccessContinue } from "@/components/verify-success-continue";
import { getServiceConfig } from "@/lib/service-url";
import { loadMostRecentSession } from "@/lib/session";
import { getBrandingSettings, getUserByID } from "@/lib/zitadel";
import { HumanUser, User } from "@zitadel/proto/zitadel/user/v2/user_pb";
import { headers } from "next/headers";

export default async function Page(props: { searchParams: Promise<any> }) {
  const searchParams = await props.searchParams;

  const _headers = await headers();
  const { serviceConfig } = getServiceConfig(_headers);

  const { loginName, organization, userId, requestId } = searchParams;

  const branding = await getBrandingSettings({ serviceConfig, organization });

  const sessionFactors = await loadMostRecentSession({ serviceConfig, sessionParams: { loginName, organization } });

  const id = userId ?? sessionFactors?.factors?.user?.id;

  if (!id) {
    throw Error("Failed to get user id");
  }

  const userResponse = await getUserByID({ serviceConfig, userId: id });

  let user: User | undefined;
  let _human: HumanUser | undefined;

  if (userResponse) {
    user = userResponse.user;
    if (user?.type.case === "human") {
      _human = user.type.value as HumanUser;
    }
  }

  // Build continue URL to re-enter the login flow with requestId preserved
  let continueUrl: string | undefined;
  if (requestId) {
    const params = new URLSearchParams();
    if (loginName || user?.preferredLoginName) {
      params.set("loginName", loginName ?? user?.preferredLoginName ?? "");
    }
    if (organization) {
      params.set("organization", organization);
    }
    params.set("requestId", requestId);
    continueUrl = `/loginname?${params}`;
  }

  return (
    <DynamicTheme branding={branding}>
      <div className="mb-6 flex flex-col items-center space-y-2 text-center">
        <h1 className="font-heading text-matjerhub-foreground text-3xl font-bold tracking-tight">
          <Translated i18nKey="successTitle" namespace="verify" />
        </h1>
        <p className="font-body text-matjerhub-muted-foreground text-base">
          <Translated i18nKey="successDescription" namespace="verify" />
        </p>
        <div className="flex items-center gap-2 pt-2">
          <p className="font-body text-matjerhub-muted-foreground text-base font-medium">
            {loginName ?? sessionFactors?.factors?.user?.loginName ?? user?.preferredLoginName}
          </p>
        </div>
      </div>
      <div className="w-full">{continueUrl && <VerifySuccessContinue continueUrl={continueUrl} />}</div>
    </DynamicTheme>
  );
}
