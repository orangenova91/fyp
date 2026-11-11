"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  createFirstProfessor,
  findUserWithPasswordByEmail,
  getPasswordHash,
  updatePasswordHash,
} from "@/lib/data";
import { isEmail, MIN_PASSWORD_LENGTH, text, type FormState } from "@/lib/forms";
import { createSession, destroySession } from "@/lib/session";

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = text(formData, "email");
  const password = text(formData, "password");
  const user = email ? await findUserWithPasswordByEmail(email) : undefined;
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }
  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function setupProfessor(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = text(formData, "name");
  const email = text(formData, "email");
  const password = text(formData, "password");
  if (!name) return { error: "이름을 입력해 주세요." };
  if (!isEmail(email)) return { error: "올바른 이메일을 입력해 주세요." };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.` };
  }

  const id = await createFirstProfessor({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 10),
  });
  if (id === null) redirect("/login");
  await createSession(id);
  redirect("/dashboard");
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const current = text(formData, "current");
  const next = text(formData, "next");
  const confirm = text(formData, "confirm");

  const hash = await getPasswordHash(user.id);
  if (!hash || !(await bcrypt.compare(current, hash))) {
    return { error: "현재 비밀번호가 올바르지 않습니다." };
  }
  if (next.length < MIN_PASSWORD_LENGTH) {
    return { error: `새 비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.` };
  }
  if (next !== confirm) return { error: "새 비밀번호 확인이 일치하지 않습니다." };

  await updatePasswordHash(user.id, await bcrypt.hash(next, 10));
  return { success: "비밀번호가 변경되었습니다." };
}
