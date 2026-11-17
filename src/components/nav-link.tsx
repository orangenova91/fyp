"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  children,
  exact = false,
  variant = "pill",
}: {
  href: string;
  children: string;
  exact?: boolean;
  variant?: "pill" | "tab";
}) {
  const pathname = usePathname();
  const active = pathname === href || (!exact && pathname.startsWith(`${href}/`));

  if (variant === "tab") {
    return (
      <Link
        href={href}
        className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium ${
          active
            ? "border-indigo-600 text-indigo-700"
            : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"
        }`}
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 text-sm font-medium ${
        active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </Link>
  );
}
