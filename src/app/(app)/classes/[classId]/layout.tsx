import Link from "next/link";
import { NavLink } from "@/components/nav-link";
import { parseId, requireClassAccess } from "@/lib/access";

export default async function ClassLayout({ children, params }: LayoutProps<"/classes/[classId]">) {
  const { cls, isProfessor } = await requireClassAccess(parseId((await params).classId));
  const base = `/classes/${cls.id}`;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/classes" className="mb-3 inline-block text-xs text-slate-500 hover:text-slate-900">
          ← 내 수업
        </Link>
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-sky-500 px-6 py-8 text-white shadow-sm">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 85% 20%, white 0, transparent 40%), radial-gradient(circle at 10% 90%, white 0, transparent 35%)",
            }}
          />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{cls.name}</h1>
              <p className="mt-1 text-sm text-indigo-100">
                {[cls.term, `${cls.professor_name} 교수`].filter(Boolean).join(" · ")}
              </p>
            </div>
            {isProfessor && (
              <Link
                href={`${base}/settings`}
                className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/25"
              >
                설정
              </Link>
            )}
          </div>
        </div>
        <nav className="-mb-px mt-1 flex flex-wrap gap-1 border-b border-slate-200">
          <NavLink href={base} exact variant="tab">
            게시판
          </NavLink>
          <NavLink href={`${base}/assignments`} variant="tab">
            과제
          </NavLink>
          {isProfessor && (
            <NavLink href={`${base}/members`} variant="tab">
              구성원
            </NavLink>
          )}
          {isProfessor && (
            <NavLink href={`${base}/settings`} variant="tab">
              설정
            </NavLink>
          )}
        </nav>
      </div>
      {children}
    </div>
  );
}
