import "@/styles/globals.scss";

import { LanguageProvider } from "@/components/language-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Skeleton } from "@/components/skeleton";
import { LANGS, getLanguage } from "@/lib/i18n";
import { getServiceConfig } from "@/lib/service-url";
import { getAllowedLanguages } from "@/lib/zitadel";
import * as Tooltip from "@radix-ui/react-tooltip";
import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { headers } from "next/headers";
import React, { Suspense } from "react";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

export async function generateMetadata(): Promise<Metadata> {
  return { title: "MatjerHub SSO" };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const _headers = await headers();
  const { serviceConfig } = getServiceConfig(_headers);

  let languages = LANGS;
  try {
    const settings = await getAllowedLanguages({ serviceConfig });
    if (settings.allowedLanguages?.length) {
      languages = settings.allowedLanguages
        .filter((code) => LANGS.find((l) => l.code === code))
        .map((code) => getLanguage(code));
    }
  } catch (e) {
    console.error("Failed to load supported languages", e);
  }

  return (
    <html
      className={`${plusJakartaSans.variable} ${inter.variable} font-body bg-matjerhub-background text-matjerhub-foreground light`}
      suppressHydrationWarning
    >
      <head />
      <body>
        <Tooltip.Provider>
          <Suspense
            fallback={
              <div className="bg-matjerhub-background relative flex min-h-screen flex-col">
                <div className="m-auto w-full max-w-[440px] p-8">
                  <Skeleton>
                    <div className="h-40"></div>
                  </Skeleton>
                </div>
              </div>
            }
          >
            <LanguageProvider>
              <div className="bg-matjerhub-background relative flex min-h-screen flex-col">
                {children}
                <footer className="border-matjerhub-border mt-auto flex justify-center border-t py-6">
                  <LanguageSwitcher languages={languages} />
                </footer>
              </div>
            </LanguageProvider>
          </Suspense>
        </Tooltip.Provider>
      </body>
    </html>
  );
}
