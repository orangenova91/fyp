import { createAnnouncementAction, deleteAnnouncementAction } from "@/app/actions/announcements";
import { ConfirmButton } from "@/components/confirm-button";
import { StatefulForm } from "@/components/stateful-form";
import { requireUser } from "@/lib/auth";
import { listAnnouncements } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

export default async function AnnouncementsPage() {
  const user = await requireUser();
  const isProfessor = user.role === "professor";
  const announcements = await listAnnouncements();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">공지사항</h1>

      {isProfessor && (
        <section className="card">
          <h2 className="mb-3 text-lg font-semibold">새 공지</h2>
          <StatefulForm action={createAnnouncementAction} submitLabel="공지 등록" resetOnSuccess>
            <input name="title" required className="input" placeholder="제목 (예: 11/18 중간발표 일정 안내)" />
            <textarea name="body" required rows={5} className="input" placeholder="내용" />
          </StatefulForm>
        </section>
      )}

      {announcements.length === 0 ? (
        <p className="card text-sm text-slate-500">공지사항이 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {announcements.map((a) => (
            <li key={a.id} className="card">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold">{a.title}</h2>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>
                    {a.author_name} · {formatDateTime(a.created_at)}
                  </span>
                  {isProfessor && (
                    <ConfirmButton
                      action={deleteAnnouncementAction.bind(null, a.id)}
                      confirmMessage="이 공지를 삭제할까요?"
                      className="text-red-500 hover:underline"
                    >
                      삭제
                    </ConfirmButton>
                  )}
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap text-slate-700">{a.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
