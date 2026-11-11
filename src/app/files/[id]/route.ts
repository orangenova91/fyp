import { getCurrentUser } from "@/lib/auth";
import { getFile, getSubmission, isAssignedTo, type FileRecord, type User } from "@/lib/data";
import { downloadStoredFile } from "@/lib/files";

async function canRead(user: User, file: FileRecord) {
  if (user.role === "professor") return true;
  if (file.owner_type === "assignment") return isAssignedTo(file.owner_id, user.id);
  return (await getSubmission(file.owner_id))?.student_id === user.id;
}

export async function GET(_request: Request, ctx: RouteContext<"/files/[id]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const file = await getFile(Number((await ctx.params).id));
  if (!file || !(await canRead(user, file))) return new Response("Not found", { status: 404 });

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
