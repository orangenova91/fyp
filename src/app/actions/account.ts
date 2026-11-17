"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { deleteUserCascade, getPasswordHash, updateProfile } from "@/lib/data";
import { removeStoredFiles } from "@/lib/files";
import { DELETE_ACCOUNT_PHRASE, text, type FormState } from "@/lib/forms";
import { destroySession } from "@/lib/session";

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = text(formData, "name");
  if (!name) return { error: "이름을 입력해 주세요." };
  const projectTitle = user.role === "student" ? text(formData, "projectTitle") || null : null;
  await updateProfile(user.id, name, projectTitle);
  revalidatePath("/", "layout");
  return { success: "저장했습니다." };
}

export async function deleteAccountAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const hash = await getPasswordHash(user.id);
  if (!hash || !(await bcrypt.compare(text(formData, "password"), hash))) {
    return { error: "비밀번호가 올바르지 않습니다." };
  }
  if (text(formData, "confirmPhrase") !== DELETE_ACCOUNT_PHRASE) {
    return { error: `확인 문구로 '${DELETE_ACCOUNT_PHRASE}'를 정확히 입력해 주세요.` };
  }

  const files = await deleteUserCascade(user.id);
  if (files === null) {
    return { error: "개설한 수업이 남아 있습니다. 각 수업의 '수업 설정'에서 수업을 먼저 삭제해 주세요." };
  }
  // The account is already gone; a Storage hiccup should not block signing out.
  await removeStoredFiles(files).catch(() => {});
  await destroySession();
  redirect("/login?deleted=1");
}
