"use server";

import { createSessionAndUpdateCookie, createSessionForIdpAndUpdateCookie } from "@/lib/server/cookie";
import {
  addHumanUser,
  addIDPLink,
  getAuthRequest,
  getLoginSettings,
  getUserByID,
  listAuthenticationMethodTypes,
} from "@/lib/zitadel";
import { Code, ConnectError, Duration, create } from "@zitadel/client";
import { AddUserGrantRequestSchema, ManagementService } from "@zitadel/proto/zitadel/management_pb";
import { Factors } from "@zitadel/proto/zitadel/session/v2/session_pb";
import { Checks, ChecksJson, ChecksSchema } from "@zitadel/proto/zitadel/session/v2/session_service_pb";
import crypto from "crypto";
import { getTranslations } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { completeFlowOrGetUrl } from "../client";
import { getOrSetFingerprintId } from "../fingerprint";
import { createLogger } from "../logger";
import { createServiceForHost } from "../service";
import { getServiceConfig } from "../service-url";
import { checkEmailVerification, checkMFAFactors } from "../verify-helper";

const logger = createLogger("register");

const MAX_SESSION_RETRIES = 3;
const RETRY_DELAYS_MS = [500, 1000, 2000];

type RegistrationGrant = {
  projectId: string;
  roleKey: string;
  clientId: string;
};

function firstConfigured(...values: Array<string | undefined>): string {
  return values.find((value) => !!value?.trim())?.trim() ?? "";
}

/**
 * Resolve the role a self-registered user should receive from the OIDC
 * application that initiated the flow. Registration is intentionally
 * client-scoped: a merchant registration can receive `seller_owner`, while a
 * supplier registration can receive `supplier_owner`; no role is inferred
 * from user-controlled form fields.
 */
async function resolveRegistrationGrant(
  serviceConfig: Parameters<typeof getAuthRequest>[0]["serviceConfig"],
  requestId: string | undefined,
): Promise<RegistrationGrant | undefined> {
  if (!requestId?.startsWith("oidc_")) {
    return undefined;
  }

  const { authRequest } = await getAuthRequest({
    serviceConfig,
    authRequestId: requestId.slice("oidc_".length),
  });
  const clientId = authRequest?.clientId;
  if (!clientId) {
    return undefined;
  }

  const mappings = [
    {
      clientId: firstConfigured(process.env.MATJERHUB_SELLER_CLIENT_ID, process.env.ZITADEL_SELLER_CLIENT_ID),
      projectId: firstConfigured(process.env.MATJERHUB_SELLER_PROJECT_ID, process.env.ZITADEL_SELLER_PROJECT_ID),
      roleKey: firstConfigured(process.env.MATJERHUB_SELLER_REGISTRATION_ROLE, "seller_owner"),
    },
    {
      clientId: firstConfigured(process.env.MATJERHUB_SUPPLIER_CLIENT_ID, process.env.ZITADEL_SUPPLIER_CLIENT_ID),
      projectId: firstConfigured(process.env.MATJERHUB_SUPPLIER_PROJECT_ID, process.env.ZITADEL_SUPPLIER_PROJECT_ID),
      roleKey: firstConfigured(process.env.MATJERHUB_SUPPLIER_REGISTRATION_ROLE, "supplier_owner"),
    },
  ];

  const mapping = mappings.find((candidate) => candidate.clientId && candidate.clientId === clientId);
  if (!mapping?.projectId || !mapping.roleKey) {
    return undefined;
  }

  return {
    clientId,
    projectId: mapping.projectId,
    roleKey: mapping.roleKey,
  };
}

async function ensureRegistrationGrant(
  serviceConfig: Parameters<typeof getAuthRequest>[0]["serviceConfig"],
  userId: string,
  requestId: string | undefined,
): Promise<void> {
  const grant = await resolveRegistrationGrant(serviceConfig, requestId);
  if (!grant) {
    return;
  }

  const managementService = await createServiceForHost(ManagementService, serviceConfig);
  await managementService.addUserGrant(
    create(AddUserGrantRequestSchema, {
      userId,
      projectId: grant.projectId,
      roleKeys: [grant.roleKey],
    }),
    {},
  );

  logger.info("Assigned registration role for OIDC client", {
    userId,
    clientId: grant.clientId,
    roleKey: grant.roleKey,
  });
}

/**
 * After user creation, backend projections (users, login_names) may not be updated yet.
 * This helper retries createSessionAndUpdateCookie on NotFound errors with increasing delays.
 */
async function createSessionWithRetry(command: { checks: Checks; requestId: string | undefined; lifetime?: Duration }) {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_SESSION_RETRIES; attempt++) {
    try {
      return await createSessionAndUpdateCookie(command);
    } catch (error) {
      lastError = error;
      const isNotFound = error instanceof ConnectError && error.code === Code.NotFound;
      const isLastAttempt = attempt + 1 >= MAX_SESSION_RETRIES;
      if (!isNotFound || isLastAttempt) {
        throw error;
      }
      const delay = RETRY_DELAYS_MS[attempt] ?? 2000;
      logger.warn(
        `Session creation failed with NotFound (attempt ${attempt + 1}/${MAX_SESSION_RETRIES}), retrying in ${delay}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

type RegisterUserCommand = {
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  organization: string;
  requestId?: string;
};

export type RegisterUserResponse = {
  userId: string;
  sessionId: string;
  factors: Factors | undefined;
};
export async function registerUser(
  command: RegisterUserCommand,
): Promise<{ error: string } | { redirect: string } | { samlData: { url: string; fields: Record<string, string> } }> {
  const t = await getTranslations("register");
  const _headers = await headers();
  const { serviceConfig } = getServiceConfig(_headers);

  const loginSettings = await getLoginSettings({ serviceConfig, organization: command.organization });

  if (!loginSettings) {
    return { error: t("errors.couldNotGetLoginSettings") };
  }

  if (!loginSettings.allowRegister) {
    return { error: t("errors.registerNotAllowed") };
  }

  if (command.password && !loginSettings.allowLocalAuthentication) {
    return { error: t("errors.localAuthenticationNotAllowed") };
  }

  const addResponse = await addHumanUser({
    serviceConfig,
    email: command.email,
    firstName: command.firstName,
    lastName: command.lastName,
    password: command.password ? command.password : undefined,
    organization: command.organization,
  }).catch((error) => {
    logger.error("Failed to create user", { error });
    return null;
  });

  if (!addResponse) {
    return { error: t("errors.couldNotCreateUser") };
  }

  // The login UI creates users through the UserService API, so it does not
  // automatically execute the native registration post-creation action. Add a
  // scoped project role before completing the OIDC callback when the request
  // came from a configured MatjerHub portal. Failures are logged and allowed
  // to reach the callback, where they are rendered as an actionable access
  // message instead of an opaque "unknown error".
  try {
    await ensureRegistrationGrant(serviceConfig, addResponse.userId, command.requestId);
  } catch (error) {
    logger.error("Failed to assign registration project role", {
      userId: addResponse.userId,
      requestId: command.requestId,
      error,
    });
  }

  let checkPayload: any = {
    user: { search: { case: "userId", value: addResponse.userId } },
  };

  if (command.password) {
    checkPayload = {
      ...checkPayload,
      password: { password: command.password },
    } as ChecksJson;
  }

  const checks = create(ChecksSchema, checkPayload);

  const result = await createSessionWithRetry({
    checks,
    requestId: command.requestId,
    lifetime: command.password ? loginSettings?.passwordCheckLifetime : undefined,
  }).catch((error) => {
    logger.error("Failed to create session after user creation", { error });
    return null;
  });

  const session = result?.session;

  if (!session || !session.factors?.user) {
    return { error: t("errors.couldNotCreateSession") };
  }

  if (!command.password) {
    const params = new URLSearchParams({
      loginName: session.factors.user.loginName,
      organization: session.factors.user.organizationId,
    });

    if (command.requestId) {
      params.append("requestId", command.requestId);
    }

    // Set verification cookie for users registering with passkey (no password)
    // This allows them to proceed with passkey registration without additional verification
    const cookiesList = await cookies();
    const userAgentId = await getOrSetFingerprintId();

    const verificationCheck = crypto.createHash("sha256").update(`${session.factors.user.id}:${userAgentId}`).digest("hex");

    await cookiesList.set({
      name: "verificationCheck",
      value: verificationCheck,
      httpOnly: true,
      path: "/",
      maxAge: 300, // 5 minutes
    });

    return { redirect: "/passkey/set?" + params };
  } else {
    const userResponse = await getUserByID({ serviceConfig, userId: session?.factors?.user?.id }).catch((error) => {
      logger.error("Failed to get user after session creation", { error });
      return null;
    });

    if (!userResponse?.user) {
      return { error: t("errors.userNotFound") };
    }

    const humanUser = userResponse.user.type.case === "human" ? userResponse.user.type.value : undefined;

    const emailVerificationCheck = await checkEmailVerification(
      session,
      humanUser,
      session.factors.user.organizationId,
      command.requestId,
    );

    if (emailVerificationCheck?.redirect) {
      return emailVerificationCheck;
    }

    return completeFlowOrGetUrl(
      command.requestId && session.id
        ? {
            sessionId: session.id,
            requestId: command.requestId,
            organization: session.factors.user.organizationId,
          }
        : {
            loginName: session.factors.user.loginName,
            organization: session.factors.user.organizationId,
          },
      loginSettings?.defaultRedirectUri,
    );
  }
}

type RegisterUserAndLinkToIDPommand = {
  email: string;
  firstName: string;
  lastName: string;
  organization: string;
  requestId?: string;
  idpIntent: {
    idpIntentId: string;
    idpIntentToken: string;
  };
  idpUserId: string;
  idpId: string;
  idpUserName: string;
};

export type registerUserAndLinkToIDPResponse = {
  userId: string;
  sessionId: string;
  factors: Factors | undefined;
};
export async function registerUserAndLinkToIDP(
  command: RegisterUserAndLinkToIDPommand,
): Promise<{ error: string } | { redirect: string } | { samlData: { url: string; fields: Record<string, string> } }> {
  const t = await getTranslations("register");

  const _headers = await headers();
  const { serviceConfig } = getServiceConfig(_headers);

  const loginSettings = await getLoginSettings({ serviceConfig, organization: command.organization });

  if (!loginSettings) {
    return { error: t("errors.couldNotGetLoginSettings") };
  }

  if (!loginSettings.allowRegister) {
    return { error: t("errors.registerNotAllowed") };
  }

  const addUserResponse = await addHumanUser({
    serviceConfig,
    email: command.email,
    firstName: command.firstName,
    lastName: command.lastName,
    organization: command.organization,
  });

  const idpLink = await addIDPLink({
    serviceConfig,
    idp: {
      id: command.idpId,
      userId: command.idpUserId,
      userName: command.idpUserName,
    },
    userId: addUserResponse.userId,
  });

  if (!idpLink) {
    return { error: t("errors.couldNotLinkIDP") };
  }

  try {
    await ensureRegistrationGrant(serviceConfig, addUserResponse.userId, command.requestId);
  } catch (error) {
    logger.error("Failed to assign registration project role after IDP registration", {
      userId: addUserResponse.userId,
      requestId: command.requestId,
      error,
    });
  }

  const session = await createSessionForIdpAndUpdateCookie({
    requestId: command.requestId,
    userId: addUserResponse.userId, // the user we just created
    idpIntent: command.idpIntent,
    lifetime: loginSettings?.externalLoginCheckLifetime,
  });

  if (!session || !session.factors?.user) {
    return { error: t("errors.couldNotCreateSession") };
  }

  // const userResponse = await getUserByID({
  //   serviceConfig.baseUrl,
  //   userId: session?.factors?.user?.id,
  // });

  // if (!userResponse.user) {
  //   return { error: "User not found in the system" };
  // }

  // const humanUser = userResponse.user.type.case === "human" ? userResponse.user.type.value : undefined;

  // check to see if user was verified
  // const emailVerificationCheck = checkEmailVerification(session, humanUser, command.organization, command.requestId);

  // if (emailVerificationCheck?.redirect) {
  //   return emailVerificationCheck;
  // }

  // check if user has MFA methods
  let authMethods;
  if (session.factors?.user?.id) {
    const response = await listAuthenticationMethodTypes({ serviceConfig, userId: session.factors.user.id });
    if (response.authMethodTypes && response.authMethodTypes.length) {
      authMethods = response.authMethodTypes;
    }
  }

  // Always check MFA factors, even if no auth methods are configured
  // This ensures that force MFA settings are respected
  const mfaFactorCheck = await checkMFAFactors(
    serviceConfig,
    session,
    loginSettings,
    authMethods || [], // Pass empty array if no auth methods
    command.organization,
    command.requestId,
  );

  if (mfaFactorCheck?.redirect) {
    return mfaFactorCheck;
  }

  return completeFlowOrGetUrl(
    command.requestId && session.id
      ? {
          sessionId: session.id,
          requestId: command.requestId,
          organization: session.factors.user.organizationId,
        }
      : {
          loginName: session.factors.user.loginName,
          organization: session.factors.user.organizationId,
        },
    loginSettings?.defaultRedirectUri,
  );
}
