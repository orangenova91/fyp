import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  await connection();
  redirect((await getCurrentUser()) ? "/classes" : "/login");
}
