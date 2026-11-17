"use client";

import { useState } from "react";

export function JoinCode({ code, large = false }: { code: string; large?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="inline-flex items-center gap-2">
      <code
        data-testid="join-code"
        className={`rounded-md bg-indigo-50 font-mono font-semibold tracking-widest text-indigo-700 ${
          large ? "px-3 py-1.5 text-xl" : "px-2 py-0.5 text-sm"
        }`}
      >
        {code}
      </code>
      <button
        type="button"
        className="text-xs text-slate-500 hover:text-slate-900"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
          } catch {
            return;
          }
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? "복사됨" : "복사"}
      </button>
    </span>
  );
}
