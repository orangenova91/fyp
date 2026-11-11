import type { ProgressStatus } from "@/lib/progress";

const STYLES: Record<ProgressStatus, { label: string; className: string }> = {
  unread: { label: "미확인", className: "bg-slate-100 text-slate-600" },
  read: { label: "확인함", className: "bg-sky-100 text-sky-700" },
  overdue: { label: "미제출", className: "bg-red-100 text-red-700" },
  submitted: { label: "제출함", className: "bg-indigo-100 text-indigo-700" },
  revision_requested: { label: "재제출 요청", className: "bg-amber-100 text-amber-800" },
  approved: { label: "피드백 완료", className: "bg-emerald-100 text-emerald-700" },
};

export function StatusBadge({ status, late = false }: { status: ProgressStatus; late?: boolean }) {
  const style = STYLES[status];
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.className}`}>
        {style.label}
      </span>
      {late && (
        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
          지각
        </span>
      )}
    </span>
  );
}

export function DueBadge({ label, pastDue }: { label: string; pastDue: boolean }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 font-mono text-xs font-semibold ${
        pastDue ? "bg-slate-100 text-slate-500" : "bg-rose-50 text-rose-600"
      }`}
    >
      {label}
    </span>
  );
}
