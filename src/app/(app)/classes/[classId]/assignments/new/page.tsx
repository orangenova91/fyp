import Link from "next/link";
import { createAssignmentAction } from "@/app/actions/assignments";
import { AssignmentForm } from "@/components/assignment-form";
import { parseId, requireClassProfessor } from "@/lib/access";
import { listApprovedStudents } from "@/lib/data";

export default async function NewAssignmentPage({ params }: PageProps<"/classes/[classId]/assignments/new">) {
  const { cls } = await requireClassProfessor(parseId((await params).classId));
  return (
    <div className="space-y-4">
      <Link href={`/classes/${cls.id}/assignments`} className="text-sm text-slate-500 hover:underline">
        ← 과제
      </Link>
      <h2 className="text-xl font-bold">새 과제 등록</h2>
      <AssignmentForm
        action={createAssignmentAction.bind(null, cls.id)}
        students={await listApprovedStudents(cls.id)}
        submitLabel="과제 게시"
      />
    </div>
  );
}
