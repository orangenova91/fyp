import Link from "next/link";
import { DueBadge, StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import {
  listAnnouncements,
  listAssignments,
  listAssignmentsForStudent,
  listStudents,
  listStudentsForAssignment,
  type Assignment,
  type User,
} from "@/lib/data";
import { dDay, formatDateTime } from "@/lib/format";
import { getProgress, type Progress, type ProgressStatus } from "@/lib/progress";

export default async function DashboardPage() {
  const user = await requireUser();
  return (
    <div className="space-y-8">
      {user.role === "professor" ? <ProfessorDashboard /> : <StudentDashboard student={user} />}
      <RecentAnnouncements />
    </div>
  );
}

async function ProfessorDashboard() {
  const now = new Date();
  const [assignments, students] = await Promise.all([listAssignments(), listStudents()]);

  const rows = await Promise.all(
    assignments.map(async (assignment) => {
      const targets = await listStudentsForAssignment(assignment.id);
      const statuses = new Map(
        await Promise.all(
          targets.map(async (s) => [s.id, await getProgress(assignment, s.id, now)] as const),
        ),
      );
      const count = (...kinds: ProgressStatus[]) =>
        [...statuses.values()].filter((p) => kinds.includes(p.status)).length;
      return {
        assignment,
        targets,
        statuses,
        submitted: count("submitted", "revision_requested", "approved"),
        awaitingReview: count("submitted"),
        unread: count("unread"),
        allStudents: targets.length === students.length,
      };
    }),
  );

  const matrix = rows.slice(0, 6).reverse();

  return (
    <>
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">과제 현황</h1>
          <Link href="/assignments/new" className="btn-primary">
            + 새 과제
          </Link>
        </div>

        {students.length === 0 && (
          <p className="card mb-4 text-sm text-slate-600">
            아직 등록된 학생이 없습니다.{" "}
            <Link href="/students" className="link">
              학생 관리
            </Link>
            에서 학생 계정을 먼저 만들어 주세요.
          </p>
        )}

        {rows.length === 0 ? (
          <p className="card text-sm text-slate-500">등록된 과제가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">과제</th>
                  <th className="px-4 py-2 font-medium">마감</th>
                  <th className="px-4 py-2 font-medium">대상</th>
                  <th className="px-4 py-2 font-medium">제출</th>
                  <th className="px-4 py-2 font-medium">검토 대기</th>
                  <th className="px-4 py-2 font-medium">미확인</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const pastDue = new Date(row.assignment.due_at) < now;
                  return (
                    <tr key={row.assignment.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link href={`/assignments/${row.assignment.id}`} className="font-medium link">
                          {row.assignment.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        <DueBadge label={dDay(row.assignment.due_at, now)} pastDue={pastDue} />{" "}
                        {formatDateTime(row.assignment.due_at)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {row.allStudents ? "전체" : `${row.targets.length}명`}
                      </td>
                      <td className="px-4 py-3">
                        {row.submitted}/{row.targets.length}
                      </td>
                      <td className="px-4 py-3">
                        {row.awaitingReview > 0 ? (
                          <span className="font-semibold text-indigo-600">{row.awaitingReview}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.unread}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {matrix.length > 0 && students.length > 0 && (
        <section>
          <h2 className="mb-1 text-lg font-semibold">학생별 진행 현황</h2>
          <p className="mb-3 text-sm text-slate-500">최근 과제 {matrix.length}개 기준</p>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">학생</th>
                  {matrix.map((row) => (
                    <th key={row.assignment.id} className="max-w-40 px-3 py-2 font-medium">
                      <Link href={`/assignments/${row.assignment.id}`} className="line-clamp-2 hover:underline">
                        {row.assignment.title}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => (
                  <tr key={student.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{student.name}</div>
                      {student.project_title && (
                        <div className="text-xs text-slate-500">{student.project_title}</div>
                      )}
                    </td>
                    {matrix.map((row) => {
                      const progress = row.statuses.get(student.id);
                      return (
                        <td key={row.assignment.id} className="px-3 py-3">
                          {progress ? (
                            <Link href={`/assignments/${row.assignment.id}/students/${student.id}`}>
                              <StatusBadge status={progress.status} late={progress.late} />
                            </Link>
                          ) : (
                            <span className="text-xs text-slate-300">대상 아님</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

async function StudentDashboard({ student }: { student: User }) {
  const now = new Date();
  const items = await Promise.all(
    (await listAssignmentsForStudent(student.id)).map(async (assignment) => ({
      assignment,
      progress: await getProgress(assignment, student.id, now),
    })),
  );
  const todo = items
    .filter(({ progress }) =>
      ["unread", "read", "overdue", "revision_requested"].includes(progress.status),
    )
    .sort((a, b) => a.assignment.due_at.localeCompare(b.assignment.due_at));
  const done = items.filter(({ progress }) => ["submitted", "approved"].includes(progress.status));

  return (
    <>
      <section>
        <h1 className="text-2xl font-bold">{student.name}님의 과제</h1>
        <p className="mt-1 text-sm text-slate-500">
          {student.project_title ? `프로젝트: ${student.project_title}` : "프로젝트 주제가 아직 등록되지 않았습니다."}
        </p>
      </section>

      <AssignmentCards title="해야 할 과제" items={todo} now={now} empty="할 일이 없습니다. 👏" />
      <AssignmentCards title="제출한 과제" items={done} now={now} empty="아직 제출한 과제가 없습니다." />
    </>
  );
}

function AssignmentCards({
  title,
  items,
  now,
  empty,
}: {
  title: string;
  items: { assignment: Assignment; progress: Progress }[];
  now: Date;
  empty: string;
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">
        {title} <span className="text-sm font-normal text-slate-400">{items.length}</span>
      </h2>
      {items.length === 0 ? (
        <p className="card text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map(({ assignment, progress }) => (
            <li key={assignment.id}>
              <Link
                href={`/assignments/${assignment.id}`}
                className="card block transition hover:border-indigo-300"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <StatusBadge status={progress.status} late={progress.late} />
                  <DueBadge
                    label={dDay(assignment.due_at, now)}
                    pastDue={new Date(assignment.due_at) < now}
                  />
                </div>
                <p className="font-medium">{assignment.title}</p>
                <p className="mt-1 text-xs text-slate-500">마감 {formatDateTime(assignment.due_at)}</p>
                {progress.commentCount > 0 && (
                  <p className="mt-2 text-xs text-indigo-600">💬 피드백 {progress.commentCount}개</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

async function RecentAnnouncements() {
  const announcements = await listAnnouncements(3);
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">최근 공지</h2>
        <Link href="/announcements" className="text-sm link">
          전체 보기
        </Link>
      </div>
      {announcements.length === 0 ? (
        <p className="card text-sm text-slate-500">공지사항이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {announcements.map((a) => (
            <li key={a.id} className="card py-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{a.title}</span>
                <span className="text-xs text-slate-400">{formatDateTime(a.created_at)}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm whitespace-pre-wrap text-slate-600">{a.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
