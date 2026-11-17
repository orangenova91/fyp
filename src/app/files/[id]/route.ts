import { getAssignmentAccess, parseId } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { getFile, getSubmission, type FileRecord } from "@/lib/data";
import { downloadStoredFile } from "@/lib/files";

/** Assignment files: the class professor and assigned students. Submissions: the professor and their author. */
async function canRead(file: FileRecord) {
  if (file.owner_type === "assignment") return (await getAssignmentAccess(file.owner_id)) !== null;
  const submission = await getSubmission(file.owner_id);
  if (!submission) return false;
  const access = await getAssignmentAccess(submission.assignment_id);
  return access !== null && (access.isProfessor || submission.student_id === access.user.id);
}

export async function GET(_request: Request, ctx: RouteContext<"/files/[id]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const file = await getFile(parseId((await ctx.params).id));
  if (!file || !(await canRead(file))) return new Response("Not found", { status: 404 });

  const body = await downloadStoredFile(file.stored_name);
  if (!body) return new Response("Not found", { status: 404 });

  return new Response(body.stream(), {
    headers: {
      "Content-Type": file.mime_type,
      "Content-Length": String(file.size),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.original_name)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
