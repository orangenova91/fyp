import Link from "next/link";
import { createAssignmentAction } from "@/app/actions/assignments";
import { AssignmentForm } from "@/components/assignment-form";
import { requireProfessor } from "@/lib/auth";
import { listStudents } from "@/lib/data";

export default async function NewAssignmentPage() {
  await requireProfessor();
  return (
    <div className="space-y-4">
      <Link href="/dashboard" className="text-sm text-slate-500 hover:underline">
        ← 대시보드
      </Link>
      <h1 className="text-2xl font-bold">새 과제 등록</h1>
      <AssignmentForm action={createAssignmentAction} students={await listStudents()} submitLabel="과제 게시" />
    </div>
  );
}
