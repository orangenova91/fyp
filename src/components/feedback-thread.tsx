import { postComment } from "@/app/actions/submissions";
import { StatefulForm } from "@/components/stateful-form";
import { listComments, type Role } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

export async function FeedbackThread({
  assignmentId,
  studentId,
  viewerRole,
}: {
  assignmentId: number;
  studentId: number;
  viewerRole: Role;
}) {
  const comments = await listComments(assignmentId, studentId);
  const isProfessor = viewerRole === "professor";

  return (
    <div className="space-y-4">
      {comments.length === 0 ? (
        <p className="text-sm text-slate-500">
          {isProfessor ? "아직 남긴 피드백이 없습니다." : "아직 받은 피드백이 없습니다."}
        </p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => {
            const fromProfessor = comment.author_role === "professor";
            return (
              <li
                key={comment.id}
                className={`rounded-md p-3 text-sm ${
                  fromProfessor ? "border border-indigo-100 bg-indigo-50" : "border border-slate-200 bg-white"
                }`}
              >
                <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{comment.author_name}</span>
                  {fromProfessor && <span className="text-indigo-600">교수</span>}
                  <span>{formatDateTime(comment.created_at)}</span>
                </div>
                <p className="whitespace-pre-wrap">{comment.body}</p>
              </li>
            );
          })}
        </ul>
      )}

      <StatefulForm
        action={postComment.bind(null, assignmentId, studentId)}
        submitLabel={isProfessor ? "피드백 등록" : "답글 등록"}
        pendingLabel="등록 중…"
        resetOnSuccess
        className="space-y-3"
      >
        <textarea
          name="body"
          rows={4}
          className="input"
          placeholder={isProfessor ? "피드백을 입력하세요." : "질문이나 답변을 남겨 주세요."}
        />
        {isProfessor && (
          <fieldset className="flex flex-wrap gap-4 text-sm">
            <legend className="sr-only">검토 결과</legend>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="review" value="" defaultChecked /> 코멘트만
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="review" value="revision_requested" /> 재제출 요청
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="review" value="approved" /> 피드백 완료
            </label>
          </fieldset>
        )}
      </StatefulForm>
    </div>
  );
}
