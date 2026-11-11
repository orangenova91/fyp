import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteAssignmentAction } from "@/app/actions/assignments";
import { markViewedAction, submitWork } from "@/app/actions/submissions";
import { ConfirmButton } from "@/components/confirm-button";
import { FeedbackThread } from "@/components/feedback-thread";
import { FileList } from "@/components/file-list";
import { MarkViewed } from "@/components/mark-viewed";
import { StatefulForm } from "@/components/stateful-form";
import { DueBadge, StatusBadge } from "@/components/status-badge";
import { SubmissionHistory } from "@/components/submission-history";
import { requireUser } from "@/lib/auth";
import {
  getAssignment,
  isAssignedTo,
  listFiles,
  listStudents,
  listStudentsForAssignment,
  listSubmissions,
  type Assignment,
  type User,
} from "@/lib/data";
import { dDay, formatDateTime } from "@/lib/format";
import { getProgress } from "@/lib/progress";

export default async function AssignmentPage({ params }: PageProps<"/assignments/[id]">) {
  const user = await requireUser();
  const assignment = await getAssignment(Number((await params).id));
  if (!assignment) notFound();
  if (user.role === "student" && !(await isAssignedTo(assignment.id, user.id))) notFound();

  const now = new Date();
  const files = await listFiles("assignment", assignment.id);
  const pastDue = new Date(assignment.due_at) < now;

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="text-sm text-slate-500 hover:underline">
        ← 대시보드
      </Link>

      <article className="card">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{assignment.title}</h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
              <DueBadge label={dDay(assignment.due_at, now)} pastDue={pastDue} />
              마감 {formatDateTime(assignment.due_at)}
            </p>
          </div>
          {user.role === "professor" && (
            <div className="flex gap-2">
              <Link href={`/assignments/${assignment.id}/edit`} className="btn-secondary">
                수정
              </Link>
              <ConfirmButton
                action={deleteAssignmentAction.bind(null, assignment.id)}
                confirmMessage="과제를 삭제하면 학생 제출물과 피드백도 모두 삭제됩니다. 계속할까요?"
              >
                삭제
              </ConfirmButton>
            </div>
          )}
        </div>
        {assignment.description ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-800">
            {assignment.description}
          </p>
        ) : (
          <p className="text-sm text-slate-400">과제 설명이 없습니다.</p>
        )}
        <div className="mt-4">
          <FileList files={files} />
        </div>
      </article>

      {user.role === "professor" ? (
        <ProfessorSubmissionTable assignment={assignment} now={now} />
      ) : (
        <StudentWorkspace assignment={assignment} student={user} now={now} />
      )}
    </div>
  );
}

async function ProfessorSubmissionTable({ assignment, now }: { assignment: Assignment; now: Date }) {
  const [students, allStudents] = await Promise.all([
    listStudentsForAssignment(assignment.id),
    listStudents(),
  ]);
  const everyone = students.length === allStudents.length;
  const progresses = await Promise.all(students.map((s) => getProgress(assignment, s.id, now)));

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">
        제출 현황{" "}
        <span className="text-sm font-normal text-slate-500">
          {everyone ? "전체 학생" : `선택 학생 ${students.length}명`}
        </span>
      </h2>
      {students.length === 0 ? (
        <p className="card text-sm text-slate-500">대상 학생이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">학생</th>
                <th className="px-4 py-2 font-medium">상태</th>
                <th className="px-4 py-2 font-medium">확인 시각</th>
                <th className="px-4 py-2 font-medium">최근 제출</th>
                <th className="px-4 py-2 font-medium">피드백</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((student, index) => {
                const progress = progresses[index];
                return (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{student.name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={progress.status} late={progress.late} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {progress.viewedAt ? formatDateTime(progress.viewedAt) : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {progress.latest
                        ? `v${progress.latest.version} · ${formatDateTime(progress.latest.created_at)}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{progress.commentCount}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/assignments/${assignment.id}/students/${student.id}`}
                        className="btn-secondary py-1"
                      >
                        {progress.status === "submitted" ? "검토하기" : "보기"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

async function StudentWorkspace({ assignment, student, now }: { assignment: Assignment; student: User; now: Date }) {
  const [progress, submissions] = await Promise.all([
    getProgress(assignment, student.id, now),
    listSubmissions(assignment.id, student.id),
  ]);

  return (
    <>
      <MarkViewed action={markViewedAction.bind(null, assignment.id)} />

      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{submissions.length > 0 ? "다시 제출하기" : "제출하기"}</h2>
          <StatusBadge status={progress.status} late={progress.late} />
        </div>
        {progress.status === "revision_requested" && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            교수님이 재제출을 요청했습니다. 아래 피드백을 확인하고 다시 제출해 주세요.
          </p>
        )}
        {submissions.length > 0 && (
          <p className="text-sm text-slate-500">
            다시 제출하면 새 버전으로 저장되며, 이전 제출물도 기록에 남습니다.
          </p>
        )}
        <StatefulForm
          action={submitWork.bind(null, assignment.id)}
          submitLabel="제출"
          pendingLabel="업로드 중…"
          resetOnSuccess
        >
          <div>
            <label htmlFor="content" className="label">설명</label>
            <textarea
              id="content"
              name="content"
              rows={5}
              className="input"
              placeholder="이번 제출에서 한 일, 변경 사항, 질문 등을 적어 주세요."
            />
          </div>
          <div>
            <label htmlFor="linkUrl" className="label">링크 (GitHub, Notion, Google Docs 등)</label>
            <input id="linkUrl" name="linkUrl" type="url" className="input" placeholder="https://" />
          </div>
          <div>
            <label htmlFor="files" className="label">
              파일 <span className="font-normal text-slate-400">(합계 25MB 이하)</span>
            </label>
            <input id="files" name="files" type="file" multiple className="text-sm" />
          </div>
        </StatefulForm>
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-semibold">피드백</h2>
        <FeedbackThread assignmentId={assignment.id} studentId={student.id} viewerRole="student" />
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-semibold">내 제출 기록</h2>
        <SubmissionHistory submissions={submissions} dueAt={assignment.due_at} />
      </section>
    </>
  );
}
