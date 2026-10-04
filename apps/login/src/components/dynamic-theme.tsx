"use client";

import { BrandingSettings } from "@zitadel/proto/zitadel/settings/v2/branding_settings_pb";
import React, { Children, ReactNode } from "react";
import { Card } from "./card";

export function DynamicTheme({
  children,
}: {
  children: ReactNode | ((isSideBySide: boolean) => ReactNode);
  branding?: BrandingSettings;
}) {
  // Resolve children immediately
  const actualChildren: ReactNode = React.useMemo(() => {
    if (typeof children === "function") {
      return (children as (isSideBySide: boolean) => ReactNode)(false);
    }
    return children;
  }, [children]);

  const childArray = Children.toArray(actualChildren);
  const titleContent = childArray[0] || null;
  const formContent = childArray[1] || null;
  const hasMultipleChildren = childArray.length > 1;

  return (
    <div className="flex w-full flex-1 flex-col">
      {/* Brand Header */}
      <header className="border-matjerhub-border bg-matjerhub-surface flex h-16 shrink-0 items-center border-b px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <span className="font-heading text-matjerhub-primary text-xl font-bold">MatjerHub</span>
          <span className="font-heading text-matjerhub-muted-foreground text-xl">SSO</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex w-full flex-1 flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-[440px]">
          <Card>
            <div className="flex flex-col space-y-8">
              {hasMultipleChildren ? (
                <>
                  {/* Title and description - center aligned */}
                  <div className="flex w-full flex-col items-center space-y-4 text-center">{titleContent}</div>

                  {/* Form content */}
                  <div className="w-full">{formContent}</div>
                </>
              ) : (
                // Single child
                <div className="w-full">{actualChildren}</div>
              )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
