import Link from "next/link";
import { deleteAnnouncementAction } from "@/app/actions/announcements";
import { ConfirmButton } from "@/components/confirm-button";
import { CreateAnnouncementModal } from "@/components/create-announcement-modal";
import { DueBadge } from "@/components/status-badge";
import { JoinCode } from "@/components/join-code";
import { parseId, requireClassAccess } from "@/lib/access";
import {
  formatJoinCode,
  listAnnouncements,
  listAssignments,
  listAssignmentsForStudent,
  type Assignment,
  type ClassDetail,
} from "@/lib/data";
import { dDay, formatDateTime } from "@/lib/format";

export default async function ClassBoardPage({ params }: PageProps<"/classes/[classId]">) {
  const { user, cls, isProfessor } = await requireClassAccess(parseId((await params).classId));
  const base = `/classes/${cls.id}`;
  const [announcements, upcoming] = await Promise.all([
    listAnnouncements(cls.id),
    upcomingAssignments(cls, user.id, isProfessor),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        {isProfessor && (
          <section className="card space-y-2 py-4">
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">수업 코드</p>
            <JoinCode code={formatJoinCode(cls.join_code)} large />
            <p className="text-xs text-slate-500">학생에게 이 코드를 알려 주세요.</p>
          </section>
        )}
        <section className="card space-y-3 py-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">곧 마감되는 과제</h2>
            <Link href={`${base}/assignments`} className="text-xs link">
              모두 보기
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-500">기한이 곧 돌아오는 과제가 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((assignment) => {
                const pastDue = new Date(assignment.due_at) < new Date();
                return (
                  <li key={assignment.id}>
                    <Link
                      href={`${base}/assignments/${assignment.id}`}
                      className="block rounded-md hover:bg-slate-50"
                    >
                      <p className="text-sm font-medium text-slate-800">{assignment.title}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                        <DueBadge label={dDay(assignment.due_at)} pastDue={pastDue} />
                        {formatDateTime(assignment.due_at)}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </aside>

      <div className="space-y-4">
        {isProfessor && (
          <div className="card flex flex-wrap items-center justify-between gap-3 py-3">
            <p className="text-sm text-slate-500">수업 소식을 게시판에 올려 보세요.</p>
            <CreateAnnouncementModal classId={cls.id} />
          </div>
        )}

        {announcements.length === 0 ? (
          <p className="card text-sm text-slate-500">아직 공지사항이 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {announcements.map((a) => (
              <li key={a.id} className="card">
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold">{a.title}</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {a.author_name} · {formatDateTime(a.created_at)}
                    </p>
                  </div>
                  {isProfessor && (
                    <ConfirmButton
                      action={deleteAnnouncementAction.bind(null, cls.id, a.id)}
                      confirmMessage="이 공지를 삭제할까요?"
                      className="text-xs text-red-500 hover:underline"
                    >
                      삭제
                    </ConfirmButton>
                  )}
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700">{a.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

async function upcomingAssignments(cls: ClassDetail, userId: number, isProfessor: boolean) {
  const now = Date.now();
  const horizon = now + 14 * 86_400_000;
  const list: Assignment[] = isProfessor
    ? await listAssignments(cls.id)
    : await listAssignmentsForStudent(cls.id, userId);
  return list
    .filter((a) => {
      const due = new Date(a.due_at).getTime();
      return due >= now - 86_400_000 && due <= horizon;
    })
    .sort((a, b) => a.due_at.localeCompare(b.due_at))
    .slice(0, 5);
}
