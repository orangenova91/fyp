"use client";

import { useTransition, type ReactNode } from "react";

type Props = {
  action: () => Promise<void>;
  confirmMessage: string;
  children: ReactNode;
  className?: string;
};

export function ConfirmButton({ action, confirmMessage, children, className = "btn-danger" }: Props) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={() => {
        if (window.confirm(confirmMessage)) startTransition(() => action());
      }}
    >
      {children}
    </button>
  );
}
