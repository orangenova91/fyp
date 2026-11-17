import { redirect } from "next/navigation";
import { parseId, requireClassAccess } from "@/lib/access";

/** Announcements now live on the class board; keep this route as a redirect. */
export default async function AnnouncementsRedirectPage({
  params,
}: PageProps<"/classes/[classId]/announcements">) {
  const { cls } = await requireClassAccess(parseId((await params).classId));
  redirect(`/classes/${cls.id}`);
}
