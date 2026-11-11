import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deleteAssignmentFileAction,
  updateAssignmentAction,
} from "@/app/actions/assignments";
import { AssignmentForm } from "@/components/assignment-form";
import { ConfirmButton } from "@/components/confirm-button";
import { FileList } from "@/components/file-list";
import { requireProfessor } from "@/lib/auth";
import { getAssignment, getAssignmentTargetIds, listFiles, listStudents } from "@/lib/data";

export default async function EditAssignmentPage({ params }: PageProps<"/assignments/[id]/edit">) {
  await requireProfessor();
  const id = Number((await params).id);
  const [assignment, files, students, targetIds] = await Promise.all([
    getAssignment(id),
    listFiles("assignment", id),
    listStudents(),
    getAssignmentTargetIds(id),
  ]);
  if (!assignment) notFound();

  return (
    <div className="space-y-4">
      <Link href={`/assignments/${id}`} className="text-sm text-slate-500 hover:underline">
        ← 과제로 돌아가기
      </Link>
      <h1 className="text-2xl font-bold">과제 수정</h1>

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
