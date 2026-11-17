"use server";

import { revalidatePath } from "next/cache";
import { getAssignmentAccess } from "@/lib/access";
import {
  addComment,
  createSubmission,
  isAssignedTo,
  markViewed,
  setReview,
  type ReviewStatus,
} from "@/lib/data";
import { pickUploads, uploadFiles, uploadsTooLarge, withUploads } from "@/lib/files";
import { isHttpUrl, text, type FormState } from "@/lib/forms";

export async function submitWork(
  assignmentId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const access = await getAssignmentAccess(assignmentId);
  if (!access || access.isProfessor) return { error: "제출할 수 없는 과제입니다." };
  const student = access.user;

  const content = text(formData, "content");
  const linkUrl = text(formData, "linkUrl") || null;
  const files = pickUploads(formData);

  if (!content && !linkUrl && files.length === 0) {
    return { error: "설명, 링크, 파일 중 하나 이상을 입력해 주세요." };
  }
  if (linkUrl && !isHttpUrl(linkUrl)) {
    return { error: "링크는 http:// 또는 https:// 로 시작해야 합니다." };
  }
  if (uploadsTooLarge(files)) return { error: "첨부파일은 합계 25MB 이하로 올려 주세요." };

  const uploaded = await uploadFiles(files, "submission");
  await withUploads(uploaded, () =>
    createSubmission({ assignmentId, studentId: student.id, content, linkUrl }, uploaded),
  );
  revalidatePath("/", "layout");
  return { success: "제출되었습니다." };
}

export async function postComment(
  assignmentId: number,
  studentId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const access = await getAssignmentAccess(assignmentId);
  if (!access) return { error: "대상을 찾을 수 없습니다." };
  const { user } = access;
  if (!access.isProfessor && user.id !== studentId) return { error: "권한이 없습니다." };
  if (access.isProfessor && !(await isAssignedTo(assignmentId, studentId))) {
    return { error: "대상을 찾을 수 없습니다." };
  }

  const body = text(formData, "body");
  const review = text(formData, "review");
  if (!body && !review) return { error: "내용을 입력해 주세요." };

  if (body) await addComment({ assignmentId, studentId, authorId: user.id, body });
  if (access.isProfessor && (review === "approved" || review === "revision_requested")) {
    await setReview(assignmentId, studentId, review satisfies ReviewStatus);
  }
  revalidatePath("/", "layout");
  return { success: "등록했습니다." };
}

export async function markViewedAction(assignmentId: number) {
  const access = await getAssignmentAccess(assignmentId);
  if (access && !access.isProfessor) await markViewed(assignmentId, access.user.id);
}
