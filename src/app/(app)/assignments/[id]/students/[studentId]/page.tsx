import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedbackThread } from "@/components/feedback-thread";
import { StatusBadge } from "@/components/status-badge";
import { SubmissionHistory } from "@/components/submission-history";
import { requireProfessor } from "@/lib/auth";
import { findUserById, getAssignment, isAssignedTo, listSubmissions } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { getProgress } from "@/lib/progress";

export default async function StudentSubmissionPage({
  params,
}: PageProps<"/assignments/[id]/students/[studentId]">) {
  await requireProfessor();
  const { id, studentId } = await params;
  const [assignment, student] = await Promise.all([
    getAssignment(Number(id)),
    findUserById(Number(studentId)),
  ]);
  if (!assignment || !student || student.role !== "student") notFound();
  if (!(await isAssignedTo(assignment.id, student.id))) notFound();

  const [progress, submissions] = await Promise.all([
    getProgress(assignment, student.id),
    listSubmissions(assignment.id, student.id),
  ]);

  return (
    <div className="space-y-6">
      <Link href={`/assignments/${assignment.id}`} className="text-sm text-slate-500 hover:underline">
        ← {assignment.title}
      </Link>

      <header className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{student.name}</h1>
          <p className="text-sm text-slate-500">
            {student.project_title ?? "프로젝트 주제 미등록"} · {student.email}
          </p>
        </div>
        <div className="text-right text-sm text-slate-500">
          <StatusBadge status={progress.status} late={progress.late} />
          <p className="mt-1">
            과제 확인: {progress.viewedAt ? formatDateTime(progress.viewedAt) : "아직 안 읽음"}
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 text-lg font-semibold">제출 기록</h2>
          <SubmissionHistory submissions={submissions} dueAt={assignment.due_at} />
        </section>
        <section className="card">
          <h2 className="mb-3 text-lg font-semibold">피드백</h2>
          <FeedbackThread assignmentId={assignment.id} studentId={student.id} viewerRole="professor" />
        </section>
      </div>
    </div>
  );
}
