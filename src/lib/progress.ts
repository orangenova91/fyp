import "server-only";
import { getProgressRow, type Assignment, type Submission } from "./data";

export type ProgressStatus =
  | "unread"
  | "read"
  | "overdue"
  | "submitted"
  | "revision_requested"
  | "approved";

export type Progress = {
  status: ProgressStatus;
  viewedAt: string | null;
  latest: Submission | null;
  late: boolean;
  commentCount: number;
};

export async function getProgress(
  assignment: Assignment,
  studentId: number,
  now = new Date(),
): Promise<Progress> {
  const row = await getProgressRow(assignment.id, studentId);
  const { latest } = row;
  const pastDue = new Date(assignment.due_at) < now;

  let status: ProgressStatus;
  if (latest) {
    const reviewIsCurrent =
      row.review_updated_at !== null && row.review_updated_at >= latest.created_at;
    status = row.review_status && reviewIsCurrent ? row.review_status : "submitted";
  } else if (pastDue) {
    status = "overdue";
  } else {
    status = row.viewed_at ? "read" : "unread";
  }

  return {
    status,
    viewedAt: row.viewed_at,
    latest,
    late: row.first_submitted_at !== null && row.first_submitted_at > assignment.due_at,
    commentCount: row.comment_count,
  };
}
