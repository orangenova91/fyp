"use client";

import { useActionState, useRef, startTransition, type ReactNode } from "react";
import type { FormState } from "@/lib/forms";

type Props = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  children: ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  resetOnSuccess?: boolean;
  className?: string;
};

/**
 * Submits through onSubmit instead of the `action` prop so React does not
 * clear the fields when the server returns a validation error.
 */
export function StatefulForm({
  action,
  children,
  submitLabel,
  pendingLabel = "처리 중…",
  resetOnSuccess = false,
  className = "space-y-4",
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(async (prev: FormState, data: FormData) => {
    const next = await action(prev, data);
    if (next?.success && resetOnSuccess) formRef.current?.reset();
    return next;
  }, undefined);

  return (
    <form
      ref={formRef}
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => formAction(data));
      }}
    >
      {children}
      {state?.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.success}
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}
