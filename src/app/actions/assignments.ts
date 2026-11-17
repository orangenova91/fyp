"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAssignmentAccess, getClassAccess } from "@/lib/access";
import {
  createAssignmentWithTargets,
  deleteAssignmentCascade,
  deleteFileRecord,
  getFile,
  listApprovedStudents,
  updateAssignmentWithTargets,
} from "@/lib/data";
import { pickUploads, removeStoredFiles, uploadFiles, uploadsTooLarge, withUploads } from "@/lib/files";
import { text, type FormState } from "@/lib/forms";
import { parseLocalDateTime } from "@/lib/format";

async function requireOwnedAssignment(assignmentId: number) {
  const access = await getAssignmentAccess(assignmentId);
  if (!access?.isProfessor) throw new Error("과제를 찾을 수 없습니다.");
  return access;
}

async function readAssignmentForm(classId: number, formData: FormData) {
  const title = text(formData, "title");
  const description = text(formData, "description");
  const dueAt = parseLocalDateTime(text(formData, "dueAt"));
  const audience = text(formData, "audience");
  const studentIds = new Set((await listApprovedStudents(classId)).map((s) => s.id));
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
  classId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const access = await getClassAccess(classId);
  if (!access?.isProfessor) return { error: "수업을 찾을 수 없습니다." };
  const parsed = await readAssignmentForm(classId, formData);
  if ("error" in parsed) return { error: parsed.error };

  const uploaded = await uploadFiles(parsed.files, "assignment");
  const id = await withUploads(uploaded, () =>
    createAssignmentWithTargets(
      { ...parsed.values, classId, createdBy: access.user.id },
      parsed.targets,
      uploaded,
    ),
  );
  revalidatePath("/", "layout");
  redirect(`/classes/${classId}/assignments/${id}`);
}

export async function updateAssignmentAction(
  assignmentId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const access = await getAssignmentAccess(assignmentId);
  if (!access?.isProfessor) return { error: "과제를 찾을 수 없습니다." };
  const classId = access.cls.id;
  const parsed = await readAssignmentForm(classId, formData);
  if ("error" in parsed) return { error: parsed.error };

  const uploaded = await uploadFiles(parsed.files, "assignment");
  await withUploads(uploaded, () =>
    updateAssignmentWithTargets(assignmentId, parsed.values, parsed.targets, uploaded),
  );
  revalidatePath("/", "layout");
  redirect(`/classes/${classId}/assignments/${assignmentId}`);
}

export async function deleteAssignmentAction(assignmentId: number) {
  const { cls } = await requireOwnedAssignment(assignmentId);
  await removeStoredFiles(await deleteAssignmentCascade(assignmentId));
  revalidatePath("/", "layout");
  redirect(`/classes/${cls.id}/assignments`);
}

export async function deleteAssignmentFileAction(assignmentId: number, fileId: number) {
  await requireOwnedAssignment(assignmentId);
  const file = await getFile(fileId);
  if (!file || file.owner_type !== "assignment" || file.owner_id !== assignmentId) return;
  await deleteFileRecord(fileId);
  await removeStoredFiles([file]);
  revalidatePath("/", "layout");
}
