import { clsx } from "clsx";
import { ButtonHTMLAttributes, DetailedHTMLProps, forwardRef } from "react";

export enum ButtonSizes {
  Small = "Small",
  Large = "Large",
}

export enum ButtonVariants {
  Primary = "Primary",
  Secondary = "Secondary",
  Destructive = "Destructive",
}

export enum ButtonColors {
  Neutral = "Neutral",
  Primary = "Primary",
  Warn = "Warn",
}

export type ButtonProps = DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & {
  size?: ButtonSizes;
  variant?: ButtonVariants;
  color?: ButtonColors;
  roundness?: string;
};

export const getButtonClasses = (
  size: ButtonSizes,
  variant: ButtonVariants,
  color: ButtonColors,
  roundnessClasses: string = "rounded-full",
) =>
  clsx(
    {
      "box-border inline-flex items-center justify-center font-medium focus:outline-none focus:ring-2 focus:ring-matjerhub-primary/30 transition-colors duration-200": true,
      "disabled:opacity-50 disabled:cursor-not-allowed": true,
      "bg-matjerhub-primary text-matjerhub-surface hover:bg-matjerhub-primary-hover active:bg-matjerhub-primary-active":
        variant === ButtonVariants.Primary && color !== ButtonColors.Warn,
      "bg-matjerhub-error text-matjerhub-surface hover:opacity-90":
        variant === ButtonVariants.Primary && color === ButtonColors.Warn,
      "bg-matjerhub-surface text-matjerhub-foreground border border-matjerhub-border hover:bg-matjerhub-surface-muted focus:bg-matjerhub-surface-muted":
        variant === ButtonVariants.Secondary,
      "border border-matjerhub-error text-matjerhub-error hover:bg-matjerhub-error/10 focus:bg-matjerhub-error/10":
        color === ButtonColors.Warn && variant !== ButtonVariants.Primary,
      "px-8 h-12 text-base": size === ButtonSizes.Large,
      "px-4 h-12 text-sm": size === ButtonSizes.Small,
    },
    roundnessClasses,
  );

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = "",
      variant = ButtonVariants.Primary,
      size = ButtonSizes.Small,
      color = ButtonColors.Primary,
      roundness = "rounded-full",
      ...props
    },
    ref,
  ) => {
    return (
      <button
        type="button"
        ref={ref}
        className={clsx(getButtonClasses(size, variant, color, roundness), className)}
        {...props}
      >
        {children}
      </button>
    );
  },
);
