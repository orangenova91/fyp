import { FileList } from "@/components/file-list";
import { listFilesForOwners, type Submission } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

export async function SubmissionHistory({
  submissions,
  dueAt,
}: {
  submissions: readonly Submission[];
  dueAt: string;
}) {
  if (submissions.length === 0) {
    return <p className="text-sm text-slate-500">아직 제출 기록이 없습니다.</p>;
  }
  const filesBySubmission = await listFilesForOwners(
    "submission",
    submissions.map((s) => s.id),
  );
  return (
    <ol className="space-y-3">
      {submissions.map((submission, index) => (
        <li
          key={submission.id}
          className={`rounded-md border p-4 ${index === 0 ? "border-indigo-200 bg-indigo-50/40" : "border-slate-200"}`}
        >
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold">v{submission.version}</span>
            {index === 0 && (
              <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-xs text-indigo-700">최신</span>
            )}
            <span className="text-slate-500">{formatDateTime(submission.created_at)}</span>
            {submission.created_at > dueAt && (
              <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-700">마감 후 제출</span>
            )}
          </div>
          {submission.content && (
            <p className="mb-2 text-sm whitespace-pre-wrap text-slate-800">{submission.content}</p>
          )}
          {submission.link_url && (
            <p className="mb-2 text-sm">
              🔗{" "}
              <a href={submission.link_url} target="_blank" rel="noreferrer" className="link break-all">
                {submission.link_url}
              </a>
            </p>
          )}
          <FileList files={filesBySubmission.get(submission.id) ?? []} />
        </li>
      ))}
    </ol>
  );
}
