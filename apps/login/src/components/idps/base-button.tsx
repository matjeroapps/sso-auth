"use client";

import { APPEARANCE_STYLES, getThemeConfig } from "@/lib/theme";
import { clsx } from "clsx";
import { Loader2Icon } from "lucide-react";
import { ButtonHTMLAttributes, DetailedHTMLProps, forwardRef } from "react";
import { useFormStatus } from "react-dom";

export type SignInWithIdentityProviderProps = DetailedHTMLProps<
  ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
> & {
  name?: string;
  e2e?: string;
};

// Helper function to get default IDP button appearance from centralized theme system
function _getDefaultIdpButtonAppearance(): string {
  const themeConfig = getThemeConfig();
  const appearance = APPEARANCE_STYLES[themeConfig.appearance];
  return appearance?.["idp-button"] || "border border-divider-light dark:border-divider-dark"; // Fallback to basic border
}

export const BaseButton = forwardRef<HTMLButtonElement, SignInWithIdentityProviderProps>(function BaseButton(props, ref) {
  const formStatus = useFormStatus();

  return (
    <button
      {...props}
      type="submit"
      ref={ref}
      disabled={formStatus.pending}
      className={clsx(
        "flex h-12 flex-1 cursor-pointer flex-row items-center px-4 text-sm font-medium transition-colors outline-none",
        "bg-matjerhub-surface text-matjerhub-foreground border-matjerhub-border rounded-xl border",
        "hover:bg-matjerhub-surface-muted focus:border-matjerhub-primary focus:ring-matjerhub-primary/20 focus:ring-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        props.className,
      )}
    >
      <div className="flex flex-1 items-center justify-center gap-4">
        <div className="flex flex-row items-center">{props.children}</div>
        {formStatus.pending && <Loader2Icon className="ml-2 h-4 w-4 animate-spin" />}
      </div>
    </button>
  );
});
