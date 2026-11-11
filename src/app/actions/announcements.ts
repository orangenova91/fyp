"use server";

import { revalidatePath } from "next/cache";
import { requireProfessor } from "@/lib/auth";
import { createAnnouncement, deleteAnnouncement } from "@/lib/data";
import { text, type FormState } from "@/lib/forms";

export async function createAnnouncementAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const professor = await requireProfessor();
  const title = text(formData, "title");
  const body = text(formData, "body");
  if (!title || !body) return { error: "제목과 내용을 모두 입력해 주세요." };
  await createAnnouncement(title, body, professor.id);
  revalidatePath("/", "layout");
  return { success: "공지를 등록했습니다." };
}

export async function deleteAnnouncementAction(id: number) {
  await requireProfessor();
  await deleteAnnouncement(id);
  revalidatePath("/", "layout");
}
