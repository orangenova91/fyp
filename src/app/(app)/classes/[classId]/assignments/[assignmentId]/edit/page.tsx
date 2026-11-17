import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deleteAssignmentFileAction,
  updateAssignmentAction,
} from "@/app/actions/assignments";
import { AssignmentForm } from "@/components/assignment-form";
import { ConfirmButton } from "@/components/confirm-button";
import { FileList } from "@/components/file-list";
import { parseId, requireAssignmentAccess } from "@/lib/access";
import { getAssignmentTargetIds, listApprovedStudents, listFiles } from "@/lib/data";

export default async function EditAssignmentPage({
  params,
}: PageProps<"/classes/[classId]/assignments/[assignmentId]/edit">) {
  const { classId, assignmentId } = await params;
  const { assignment, isProfessor } = await requireAssignmentAccess(parseId(classId), parseId(assignmentId));
  if (!isProfessor) notFound();
  const id = assignment.id;
  const [files, students, targetIds] = await Promise.all([
    listFiles("assignment", id),
    listApprovedStudents(assignment.class_id),
    getAssignmentTargetIds(id),
  ]);

  return (
    <div className="space-y-4">
      <Link href={`/classes/${assignment.class_id}/assignments/${id}`} className="text-sm text-slate-500 hover:underline">
        ← 과제로 돌아가기
      </Link>
      <h2 className="text-xl font-bold">과제 수정</h2>

      {files.length > 0 && (
        <section className="card">
          <h2 className="mb-2 text-sm font-medium text-slate-700">현재 첨부파일</h2>
          <FileList
            files={files}
            renderAction={(file) => (
              <ConfirmButton
                action={deleteAssignmentFileAction.bind(null, id, file.id)}
                confirmMessage={`'${file.original_name}' 파일을 삭제할까요?`}
                className="text-xs text-red-500 hover:underline"
              >
                삭제
              </ConfirmButton>
            )}
          />
        </section>
      )}

      <AssignmentForm
        action={updateAssignmentAction.bind(null, id)}
        students={students}
        assignment={assignment}
        targetIds={targetIds}
        submitLabel="저장"
      />
    </div>
  );
}
