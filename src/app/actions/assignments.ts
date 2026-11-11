"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfessor } from "@/lib/auth";
import {
  createAssignmentWithTargets,
  deleteAssignmentCascade,
  deleteFileRecord,
  getAssignment,
  getFile,
  listStudents,
  updateAssignmentWithTargets,
} from "@/lib/data";
import { pickUploads, removeStoredFiles, uploadFiles, uploadsTooLarge, withUploads } from "@/lib/files";
import { text, type FormState } from "@/lib/forms";
import { parseLocalDateTime } from "@/lib/format";

async function readAssignmentForm(formData: FormData) {
  const title = text(formData, "title");
  const description = text(formData, "description");
  const dueAt = parseLocalDateTime(text(formData, "dueAt"));
  const audience = text(formData, "audience");
  const studentIds = new Set((await listStudents()).map((s) => s.id));
  const targets = formData
    .getAll("targets")
    .map(Number)
    .filter((id) => studentIds.has(id));
  const files = pickUploads(formData);

  if (!title) return { error: "제목을 입력해 주세요." } as const;
  if (!dueAt) return { error: "마감일을 입력해 주세요." } as const;
  if (audience === "selected" && targets.length === 0) {
    return { error: "과제를 받을 학생을 한 명 이상 선택해 주세요." } as const;
  }
  if (uploadsTooLarge(files)) return { error: "첨부파일은 합계 25MB 이하로 올려 주세요." } as const;

  return {
    values: { title, description, dueAt },
    targets: audience === "selected" ? targets : [],
    files,
  } as const;
}

export async function createAssignmentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const professor = await requireProfessor();
  const parsed = await readAssignmentForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const uploaded = await uploadFiles(parsed.files, "assignment");
  const id = await withUploads(uploaded, () =>
    createAssignmentWithTargets({ ...parsed.values, createdBy: professor.id }, parsed.targets, uploaded),
  );
  revalidatePath("/", "layout");
  redirect(`/assignments/${id}`);
}

export async function updateAssignmentAction(
  assignmentId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireProfessor();
  if (!(await getAssignment(assignmentId))) return { error: "과제를 찾을 수 없습니다." };
  const parsed = await readAssignmentForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const uploaded = await uploadFiles(parsed.files, "assignment");
  await withUploads(uploaded, () =>
    updateAssignmentWithTargets(assignmentId, parsed.values, parsed.targets, uploaded),
  );
  revalidatePath("/", "layout");
  redirect(`/assignments/${assignmentId}`);
}

export async function deleteAssignmentAction(assignmentId: number) {
  await requireProfessor();
  await removeStoredFiles(await deleteAssignmentCascade(assignmentId));
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function deleteAssignmentFileAction(assignmentId: number, fileId: number) {
  await requireProfessor();
  const file = await getFile(fileId);
  if (!file || file.owner_type !== "assignment" || file.owner_id !== assignmentId) return;
  await deleteFileRecord(fileId);
  await removeStoredFiles([file]);
  revalidatePath("/", "layout");
}
