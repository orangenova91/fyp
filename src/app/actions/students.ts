"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireProfessor } from "@/lib/auth";
import {
  createUser,
  deleteStudentCascade,
  findUserById,
  findUserWithPasswordByEmail,
  updatePasswordHash,
  updateStudentProfile,
} from "@/lib/data";
import { removeStoredFiles } from "@/lib/files";
import { isEmail, MIN_PASSWORD_LENGTH, text, type FormState } from "@/lib/forms";

export async function createStudent(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireProfessor();
  const name = text(formData, "name");
  const email = text(formData, "email");
  const password = text(formData, "password");
  const projectTitle = text(formData, "projectTitle") || null;

  if (!name) return { error: "이름을 입력해 주세요." };
  if (!isEmail(email)) return { error: "올바른 이메일을 입력해 주세요." };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `초기 비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.` };
  }
  if (await findUserWithPasswordByEmail(email)) return { error: "이미 등록된 이메일입니다." };

  await createUser({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    role: "student",
    projectTitle,
  });
  revalidatePath("/", "layout");
  return { success: `${name} 학생을 등록했습니다. 초기 비밀번호를 학생에게 전달해 주세요.` };
}

async function requireStudentTarget(studentId: number) {
  await requireProfessor();
  const student = await findUserById(studentId);
  if (!student || student.role !== "student") throw new Error("학생을 찾을 수 없습니다.");
  return student;
}

export async function updateStudent(
  studentId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireStudentTarget(studentId);
  const name = text(formData, "name");
  if (!name) return { error: "이름을 입력해 주세요." };
  await updateStudentProfile(studentId, name, text(formData, "projectTitle") || null);
  revalidatePath("/", "layout");
  return { success: "저장했습니다." };
}

export async function resetStudentPassword(
  studentId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const student = await requireStudentTarget(studentId);
  const password = text(formData, "password");
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.` };
  }
  await updatePasswordHash(studentId, await bcrypt.hash(password, 10));
  return { success: `${student.name} 학생의 비밀번호를 재설정했습니다.` };
}

export async function deleteStudent(studentId: number) {
  await requireStudentTarget(studentId);
  await removeStoredFiles(await deleteStudentCascade(studentId));
  revalidatePath("/", "layout");
}
