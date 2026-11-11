import { StatefulForm } from "@/components/stateful-form";
import type { Assignment, User } from "@/lib/data";
import type { FormState } from "@/lib/forms";
import { toLocalDateTimeInput } from "@/lib/format";

type Props = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  students: User[];
  assignment?: Assignment;
  targetIds?: number[];
  submitLabel: string;
};

export function AssignmentForm({ action, students, assignment, targetIds = [], submitLabel }: Props) {
  const selectedOnly = targetIds.length > 0;
  return (
    <StatefulForm action={action} submitLabel={submitLabel} pendingLabel="저장 중…" className="card space-y-5">
      <div>
        <label htmlFor="title" className="label">제목</label>
        <input
          id="title"
          name="title"
          required
          defaultValue={assignment?.title}
          className="input"
          placeholder="예: 3주차 - 요구사항 명세서 제출"
        />
      </div>

      <div>
        <label htmlFor="dueAt" className="label">마감일시 (한국 시간)</label>
        <input
          id="dueAt"
          name="dueAt"
          type="datetime-local"
          required
          defaultValue={assignment ? toLocalDateTimeInput(assignment.due_at) : undefined}
          className="input max-w-xs"
        />
      </div>

      <div>
        <label htmlFor="description" className="label">과제 내용</label>
        <textarea
          id="description"
          name="description"
          rows={10}
          defaultValue={assignment?.description}
          className="input font-mono"
          placeholder="과제 설명, 제출 형식, 평가 기준 등을 적어 주세요."
        />
      </div>

      <fieldset>
        <legend className="label">대상 학생</legend>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="audience" value="all" defaultChecked={!selectedOnly} />
            전체 학생 (이후 추가되는 학생 포함)
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="audience" value="selected" defaultChecked={selectedOnly} />
            선택한 학생만
          </label>
          {students.length > 0 ? (
            <div className="ml-6 grid gap-1 sm:grid-cols-3">
              {students.map((student) => (
                <label key={student.id} className="flex items-center gap-2 text-slate-700">
                  <input
                    type="checkbox"
                    name="targets"
                    value={student.id}
                    defaultChecked={targetIds.includes(student.id)}
                  />
                  {student.name}
                </label>
              ))}
            </div>
          ) : (
            <p className="ml-6 text-slate-400">등록된 학생이 없습니다.</p>
          )}
        </div>
      </fieldset>

      <div>
        <label htmlFor="files" className="label">
          {assignment ? "첨부파일 추가" : "첨부파일"} <span className="font-normal text-slate-400">(합계 25MB 이하)</span>
        </label>
        <input id="files" name="files" type="file" multiple className="text-sm" />
      </div>
    </StatefulForm>
  );
}
