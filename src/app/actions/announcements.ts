"use server";

import { revalidatePath } from "next/cache";
import { getClassAccess } from "@/lib/access";
import { createAnnouncement, deleteAnnouncement } from "@/lib/data";
import { text, type FormState } from "@/lib/forms";

async function requireOwnedClass(classId: number) {
  const access = await getClassAccess(classId);
  if (!access?.isProfessor) throw new Error("수업을 찾을 수 없습니다.");
  return access;
}

export async function createAnnouncementAction(
  classId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user } = await requireOwnedClass(classId);
  const title = text(formData, "title");
  const body = text(formData, "body");
  if (!title || !body) return { error: "제목과 내용을 모두 입력해 주세요." };
  await createAnnouncement(classId, title, body, user.id);
  revalidatePath("/", "layout");
  return { success: "공지를 등록했습니다." };
}

export async function deleteAnnouncementAction(classId: number, id: number) {
  await requireOwnedClass(classId);
  await deleteAnnouncement(classId, id);
  revalidatePath("/", "layout");
}
