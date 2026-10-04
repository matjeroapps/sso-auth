import { ExclamationTriangleIcon, InformationCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { clsx } from "clsx";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  type?: AlertType;
};

export enum AlertType {
  ALERT,
  INFO,
  ERROR,
}

const yellow = "border-matjerhub-warning/20 bg-matjerhub-warning/10 text-matjerhub-warning";
const red = "border-matjerhub-error/20 bg-matjerhub-error/10 text-matjerhub-error";
const neutral = "border-matjerhub-border bg-matjerhub-muted-foreground/5 text-matjerhub-foreground";

export function Alert({ children, type = AlertType.ALERT }: Props) {
  return (
    <div
      className={clsx("flex flex-row items-start rounded-xl border p-3", {
        [yellow]: type === AlertType.ALERT,
        [neutral]: type === AlertType.INFO,
        [red]: type === AlertType.ERROR,
      })}
    >
      {type === AlertType.ALERT && <ExclamationTriangleIcon className="mt-0.5 mr-3 h-5 w-5 flex-shrink-0" />}
      {type === AlertType.INFO && <InformationCircleIcon className="mt-0.5 mr-3 h-5 w-5 flex-shrink-0" />}
      {type === AlertType.ERROR && <XCircleIcon className="mt-0.5 mr-3 h-5 w-5 flex-shrink-0" />}
      <span className="w-full text-sm leading-relaxed">{children}</span>
    </div>
  );
}
