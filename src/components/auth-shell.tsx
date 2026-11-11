import type { ReactNode } from "react";

export function AuthShell({ title, description, children }: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <p className="mb-2 text-center text-sm font-semibold text-indigo-600">Capstone Hub</p>
        <h1 className="text-center text-2xl font-bold">{title}</h1>
        <p className="mt-2 mb-8 text-center text-sm text-slate-500">{description}</p>
        <div className="card">{children}</div>
      </div>
    </main>
  );
}
