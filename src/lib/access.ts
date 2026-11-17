import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getCurrentUser, requireUser } from "./auth";
import {
  getAssignment,
  getClass,
  getEnrollment,
  isAssignedTo,
  type Assignment,
  type ClassDetail,
  type User,
} from "./data";

/** Parses a route segment into a database id; anything malformed becomes 0, which matches no row. */
export function parseId(segment: string) {
  return /^[1-9]\d{0,8}$/.test(segment) ? Number(segment) : 0;
}

export type ClassAccess = { user: User; cls: ClassDetail; isProfessor: boolean };

/**
 * The class is visible only to the professor who owns it and to approved students.
 * Returns null otherwise, so server actions can reply with an error instead of a 404.
 */
export const getClassAccess = cache(async (classId: number): Promise<ClassAccess | null> => {
  const user = await getCurrentUser();
  if (!user || !Number.isInteger(classId)) return null;
  const cls = await getClass(classId);
  if (!cls) return null;
  if (user.role === "professor") {
    return cls.professor_id === user.id ? { user, cls, isProfessor: true } : null;
  }
  const enrollment = await getEnrollment(classId, user.id);
  return enrollment?.status === "approved" ? { user, cls, isProfessor: false } : null;
});

export const getAssignmentAccess = cache(
  async (assignmentId: number): Promise<(ClassAccess & { assignment: Assignment }) | null> => {
    if (!Number.isInteger(assignmentId)) return null;
    const assignment = await getAssignment(assignmentId);
    if (!assignment) return null;
    const access = await getClassAccess(assignment.class_id);
    if (!access) return null;
    if (!access.isProfessor && !(await isAssignedTo(assignment.id, access.user.id))) return null;
    return { ...access, assignment };
  },
);

export async function requireClassAccess(classId: number) {
  await requireUser();
  const access = await getClassAccess(classId);
  if (!access) notFound();
  return access;
}

export async function requireClassProfessor(classId: number) {
  const access = await requireClassAccess(classId);
  if (!access.isProfessor) notFound();
  return access;
}

/** Also checks that the assignment belongs to the class in the URL. */
export async function requireAssignmentAccess(classId: number, assignmentId: number) {
  await requireUser();
  const access = await getAssignmentAccess(assignmentId);
  if (!access || access.cls.id !== classId) notFound();
  return access;
}
