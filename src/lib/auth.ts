import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { findUserById, type User } from "./data";
import { getSessionUserId } from "./session";

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return (await findUserById(userId)) ?? null;
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireProfessor(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "professor") redirect("/dashboard");
  return user;
}

export async function requireStudent(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "student") redirect("/dashboard");
  return user;
}
