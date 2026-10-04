"use client";

import { CheckCircleIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";
import { clsx } from "clsx";
import { ChangeEvent, DetailedHTMLProps, forwardRef, InputHTMLAttributes, ReactNode, useState } from "react";

export type TextInputProps = DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> & {
  label: string;
  suffix?: string;
  placeholder?: string;
  defaultValue?: string;
  error?: string | ReactNode;
  success?: string | ReactNode;
  disabled?: boolean;
  onChange?: (value: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (value: ChangeEvent<HTMLInputElement>) => void;
  roundness?: string;
};

const styles = (error: boolean, disabled: boolean, roundnessClasses: string = "rounded-xl") =>
  clsx(
    {
      "h-12 mb-[2px] px-4 bg-matjerhub-surface transition-colors duration-200 grow w-full": true,
      "border border-matjerhub-border hover:border-matjerhub-muted-foreground focus:border-matjerhub-primary": true,
      "focus:outline-none focus:ring-2 focus:ring-matjerhub-primary/20 text-base text-matjerhub-foreground placeholder:text-matjerhub-muted-foreground": true,
      "border-matjerhub-error hover:border-matjerhub-error focus:border-matjerhub-error focus:ring-matjerhub-error/20":
        error,
      "pointer-events-none opacity-50 cursor-not-allowed": disabled,
    },
    roundnessClasses,
  );

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      label,
      placeholder,
      defaultValue,
      suffix,
      required = false,
      error,
      disabled,
      success,
      onChange,
      onBlur,
      roundness = "rounded-xl",
      type = "text",
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <label className="text-matjerhub-foreground relative flex flex-col space-y-1.5 text-sm font-medium">
        <span className={clsx("leading-none", error && "text-matjerhub-error")}>
          {label} {required && "*"}
        </span>
        <div className="relative flex items-center">
          <input
            suppressHydrationWarning
            ref={ref}
            type={inputType}
            className={clsx(styles(!!error, !!disabled, roundness), props.className)}
            defaultValue={defaultValue}
            required={required}
            disabled={disabled}
            placeholder={placeholder}
            autoComplete={props.autoComplete ?? "off"}
            onChange={(e) => onChange && onChange(e)}
            onBlur={(e) => onBlur && onBlur(e)}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              className="text-matjerhub-muted-foreground hover:text-matjerhub-foreground absolute right-3 focus:outline-none"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
              ) : (
                <EyeIcon className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          )}

          {suffix && !isPassword && (
            <span
              className={clsx(
                "bg-matjerhub-surface text-matjerhub-muted-foreground absolute right-3 px-2",
                roundness.split(" ")[0],
              )}
            >
              @{suffix}
            </span>
          )}
        </div>

        <div className="text-matjerhub-error flex min-h-[20px] flex-row items-center text-sm">
          <span>{error ? error : " "}</span>
        </div>

        {success && (
          <div className="text-matjerhub-success mt-1 flex flex-row items-center text-sm">
            <CheckCircleIcon className="mr-1 h-4 w-4" />
            <span>{success}</span>
          </div>
        )}
      </label>
    );
  },
);
