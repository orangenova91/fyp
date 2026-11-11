import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { NavLink } from "@/components/nav-link";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const isProfessor = user.role === "professor";

  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-3">
          <Link href="/dashboard" className="mr-4 font-bold text-indigo-600">
            Capstone Hub
          </Link>
          <nav className="flex flex-wrap gap-1">
            <NavLink href="/dashboard">대시보드</NavLink>
            <NavLink href="/announcements">공지사항</NavLink>
            {isProfessor && <NavLink href="/students">학생 관리</NavLink>}
            <NavLink href="/account">내 계정</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-slate-600">
              {user.name}
              <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                {isProfessor ? "교수" : "학생"}
              </span>
            </span>
            <form action={logout}>
              <button type="submit" className="text-slate-500 hover:text-slate-900">
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
