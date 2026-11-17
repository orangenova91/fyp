"use client";

import { useTransition, type ReactNode } from "react";

type Props = {
  action: () => Promise<void>;
  /** Asks before running the action when set. */
  confirmMessage?: string;
  children: ReactNode;
  className?: string;
  pendingLabel?: ReactNode;
};

export function ConfirmButton({
  action,
  confirmMessage,
  children,
  className = "btn-danger",
  pendingLabel,
}: Props) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={() => {
        if (!confirmMessage || window.confirm(confirmMessage)) startTransition(() => action());
      }}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
