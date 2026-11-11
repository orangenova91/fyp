import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { countUsers } from "@/lib/data";

export default async function Home() {
  await connection();
  if ((await countUsers()) === 0) redirect("/setup");
  redirect((await getCurrentUser()) ? "/dashboard" : "/login");
}
