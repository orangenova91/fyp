"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getClassAccess } from "@/lib/access";
import { requireProfessor, requireStudent } from "@/lib/auth";
import {
  countRecentCodeFailures,
  createClass,
  deleteClassCascade,
  findClassByJoinCode,
  findUserById,
  getClass,
  getEnrollment,
  joinWithCode,
  normalizeJoinCode,
  recordCodeFailure,
  regenerateJoinCode,
  requestEnrollment,
  setEnrollmentStatus,
  updateClass,
  updatePasswordHash,
} from "@/lib/data";
import { removeStoredFiles } from "@/lib/files";
import { MIN_PASSWORD_LENGTH, text, type FormState } from "@/lib/forms";

const MAX_CODE_FAILURES = 10;
const CODE_FAILURE_WINDOW_MINUTES = 15;

async function requireOwnedClass(classId: number) {
  const access = await getClassAccess(classId);
  if (!access?.isProfessor) throw new Error("수업을 찾을 수 없습니다.");
  return access;
}

function classFields(formData: FormData) {
  return {
    name: text(formData, "name"),
    term: text(formData, "term"),
    description: text(formData, "description"),
  };
}

export async function createClassAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const professor = await requireProfessor();
  const fields = classFields(formData);
  if (!fields.name) return { error: "수업 이름을 입력해 주세요." };
  const id = await createClass({ professorId: professor.id, ...fields });
  revalidatePath("/", "layout");
  redirect(`/classes/${id}`);
}

export async function updateClassAction(
  classId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwnedClass(classId);
  const fields = classFields(formData);
  if (!fields.name) return { error: "수업 이름을 입력해 주세요." };
  await updateClass(classId, fields);
  revalidatePath("/", "layout");
  return { success: "수업 정보를 저장했습니다." };
}

export async function regenerateCodeAction(classId: number) {
  await requireOwnedClass(classId);
  await regenerateJoinCode(classId);
  revalidatePath("/", "layout");
}

export async function deleteClassAction(classId: number) {
  await requireOwnedClass(classId);
  await removeStoredFiles(await deleteClassCascade(classId));
  revalidatePath("/", "layout");
  redirect("/classes");
}

export async function joinByCodeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const student = await requireStudent();
  const code = normalizeJoinCode(text(formData, "code"));
  if (code.length !== 8) return { error: "8자리 수업 코드를 입력해 주세요. (예: ABCD-2345)" };
  if ((await countRecentCodeFailures(student.id, CODE_FAILURE_WINDOW_MINUTES)) >= MAX_CODE_FAILURES) {
    return { error: `코드 입력 실패가 너무 많습니다. ${CODE_FAILURE_WINDOW_MINUTES}분 후 다시 시도해 주세요.` };
  }
  const cls = await findClassByJoinCode(code);
  if (!cls) {
    await recordCodeFailure(student.id);
    return { error: "수업 코드가 올바르지 않습니다. 교수님께 받은 코드를 다시 확인해 주세요." };
  }
  await joinWithCode(cls.id, student.id);
  revalidatePath("/", "layout");
  redirect(`/classes/${cls.id}`);
}

export async function requestJoinAction(classId: number) {
  const student = await requireStudent();
  if (!(await getClass(classId))) throw new Error("수업을 찾을 수 없습니다.");
  await requestEnrollment(classId, student.id);
  revalidatePath("/", "layout");
}

export async function setMemberStatusAction(
  classId: number,
  studentId: number,
  status: "approved" | "rejected",
) {
  await requireOwnedClass(classId);
  if (status !== "approved" && status !== "rejected") throw new Error("잘못된 요청입니다.");
  if (!(await getEnrollment(classId, studentId))) throw new Error("학생을 찾을 수 없습니다.");
  await setEnrollmentStatus(classId, studentId, status);
  revalidatePath("/", "layout");
}

export async function resetMemberPasswordAction(
  classId: number,
  studentId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOwnedClass(classId);
  const enrollment = await getEnrollment(classId, studentId);
  const student = await findUserById(studentId);
  if (enrollment?.status !== "approved" || !student) {
    return { error: "이 수업에 참여 중인 학생만 비밀번호를 재설정할 수 있습니다." };
  }
  const password = text(formData, "password");
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.` };
  }
  await updatePasswordHash(studentId, await bcrypt.hash(password, 10));
  return { success: `${student.name} 학생의 비밀번호를 재설정했습니다. 새 비밀번호를 학생에게 전달해 주세요.` };
}
