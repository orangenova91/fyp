import "server-only";
import { randomInt } from "node:crypto";
import { sql } from "./db";

export type Role = "professor" | "student";

export type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  project_title: string | null;
};

export type ClassDetail = {
  id: number;
  professor_id: number;
  professor_name: string;
  name: string;
  term: string;
  description: string;
  join_code: string;
  created_at: string;
};

export type ProfessorClassCard = ClassDetail & { approved_count: number; pending_count: number };

/** What students see in the class list. Deliberately excludes the join code. */
export type StudentClassCard = {
  id: number;
  name: string;
  term: string;
  description: string;
  professor_name: string;
  approved_count: number;
  my_status: EnrollmentStatus | null;
};

export type EnrollmentStatus = "pending" | "approved" | "rejected";

export type Enrollment = {
  class_id: number;
  student_id: number;
  status: EnrollmentStatus;
  joined_via: "code" | "request";
  requested_at: string;
  decided_at: string | null;
};

export type Member = User & Omit<Enrollment, "class_id" | "student_id">;

export type Assignment = {
  id: number;
  class_id: number;
  title: string;
  description: string;
  due_at: string;
  created_by: number;
  created_at: string;
  updated_at: string;
};

export type Submission = {
  id: number;
  assignment_id: number;
  student_id: number;
  version: number;
  content: string;
  link_url: string | null;
  created_at: string;
};

export type FileRecord = {
  id: number;
  owner_type: "assignment" | "submission";
  owner_id: number;
  original_name: string;
  stored_name: string;
  size: number;
  mime_type: string;
  created_at: string;
};

export type Comment = {
  id: number;
  author_id: number;
  author_name: string;
  author_role: Role;
  body: string;
  created_at: string;
};

export type ReviewStatus = "approved" | "revision_requested";

export type Announcement = {
  id: number;
  title: string;
  body: string;
  author_name: string;
  created_at: string;
};

type NewFile = Omit<FileRecord, "id" | "created_at" | "owner_id">;

const userColumns = () => sql`id, name, email, role, project_title`;

// Users

export async function findUserById(id: number) {
  const [user] = await sql<User[]>`SELECT ${userColumns()} FROM users WHERE id = ${id}`;
  return user;
}

export async function findUserWithPasswordByEmail(email: string) {
  const [user] = await sql<(User & { password_hash: string })[]>`
    SELECT ${userColumns()}, password_hash FROM users WHERE lower(email) = lower(${email})`;
  return user;
}

export async function getPasswordHash(userId: number) {
  const [row] = await sql<{ password_hash: string }[]>`
    SELECT password_hash FROM users WHERE id = ${userId}`;
  return row?.password_hash;
}

/** Returns null when the email is already registered. */
export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  projectTitle?: string | null;
}) {
  const [row] = await sql<{ id: number }[]>`
    INSERT INTO users (name, email, password_hash, role, project_title)
    VALUES (${input.name}, ${input.email}, ${input.passwordHash}, ${input.role}, ${input.projectTitle ?? null})
    ON CONFLICT DO NOTHING
    RETURNING id`;
  return row?.id ?? null;
}

export async function updatePasswordHash(userId: number, passwordHash: string) {
  await sql`UPDATE users SET password_hash = ${passwordHash} WHERE id = ${userId}`;
}

export async function updateProfile(userId: number, name: string, projectTitle: string | null) {
  await sql`UPDATE users SET name = ${name}, project_title = ${projectTitle} WHERE id = ${userId}`;
}

/**
 * Deletes the account with everything that cascades from it. Refuses (returns null) while the
 * user still owns classes; the row lock stops a class from being created concurrently.
 * Returns the file records whose blobs must be removed from Storage.
 */
export async function deleteUserCascade(userId: number) {
  return sql.begin(async (tx) => {
    await tx`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
    const [{ n }] = await tx<{ n: number }[]>`
      SELECT count(*)::int AS n FROM classes WHERE professor_id = ${userId}`;
    if (n > 0) return null;
    const files = await tx<FileRecord[]>`
      DELETE FROM files
      WHERE owner_type = 'submission'
        AND owner_id IN (SELECT s.id FROM submissions s WHERE s.student_id = ${userId})
      RETURNING *`;
    await tx`DELETE FROM users WHERE id = ${userId}`;
    return [...files];
  });
}

// Classes

const JOIN_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateJoinCode() {
  return Array.from({ length: 8 }, () => JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)]).join("");
}

/** Accepts codes typed with dashes, spaces or lowercase. */
export function normalizeJoinCode(input: string) {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatJoinCode(code: string) {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

async function withFreshJoinCode<T>(write: (code: string) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await write(generateJoinCode());
    } catch (error) {
      if (!isUniqueViolation(error) || attempt >= 4) throw error;
    }
  }
}

const classColumns = () => sql`
  c.id, c.professor_id, u.name AS professor_name, c.name, c.term, c.description, c.join_code, c.created_at`;

export async function getClass(id: number) {
  const [cls] = await sql<ClassDetail[]>`
    SELECT ${classColumns()} FROM classes c JOIN users u ON u.id = c.professor_id WHERE c.id = ${id}`;
  return cls;
}

export async function findClassByJoinCode(code: string) {
  const [cls] = await sql<ClassDetail[]>`
    SELECT ${classColumns()} FROM classes c JOIN users u ON u.id = c.professor_id
    WHERE c.join_code = ${code}`;
  return cls;
}

export function listClassesForProfessor(professorId: number) {
  return sql<ProfessorClassCard[]>`
    SELECT ${classColumns()},
      (SELECT count(*)::int FROM enrollments e WHERE e.class_id = c.id AND e.status = 'approved') AS approved_count,
      (SELECT count(*)::int FROM enrollments e WHERE e.class_id = c.id AND e.status = 'pending') AS pending_count
    FROM classes c JOIN users u ON u.id = c.professor_id
    WHERE c.professor_id = ${professorId}
    ORDER BY c.created_at DESC`;
}

export function listClassesForStudent(studentId: number) {
  return sql<StudentClassCard[]>`
    SELECT c.id, c.name, c.term, c.description, u.name AS professor_name,
      (SELECT count(*)::int FROM enrollments e WHERE e.class_id = c.id AND e.status = 'approved') AS approved_count,
      mine.status AS my_status
    FROM classes c
    JOIN users u ON u.id = c.professor_id
    LEFT JOIN enrollments mine ON mine.class_id = c.id AND mine.student_id = ${studentId}
    ORDER BY c.created_at DESC`;
}

export async function createClass(input: {
  professorId: number;
  name: string;
  term: string;
  description: string;
}) {
  return withFreshJoinCode(async (code) => {
    const [row] = await sql<{ id: number }[]>`
      INSERT INTO classes (professor_id, name, term, description, join_code)
      VALUES (${input.professorId}, ${input.name}, ${input.term}, ${input.description}, ${code})
      RETURNING id`;
    return row.id;
  });
}

export async function updateClass(id: number, input: { name: string; term: string; description: string }) {
  await sql`
    UPDATE classes SET name = ${input.name}, term = ${input.term}, description = ${input.description}
    WHERE id = ${id}`;
}

export async function regenerateJoinCode(id: number) {
  await withFreshJoinCode((code) => sql`UPDATE classes SET join_code = ${code} WHERE id = ${id}`);
}

/** Deletes the class with everything in it; returns the file records whose blobs must be removed. */
export async function deleteClassCascade(id: number) {
  return sql.begin(async (tx) => {
    const files = await tx<FileRecord[]>`
      DELETE FROM files
      WHERE (owner_type = 'assignment'
             AND owner_id IN (SELECT a.id FROM assignments a WHERE a.class_id = ${id}))
         OR (owner_type = 'submission'
             AND owner_id IN (SELECT s.id FROM submissions s
                              JOIN assignments a ON a.id = s.assignment_id
                              WHERE a.class_id = ${id}))
      RETURNING *`;
    await tx`DELETE FROM classes WHERE id = ${id}`;
    return [...files];
  });
}

// Enrollments

export async function getEnrollment(classId: number, studentId: number) {
  const [enrollment] = await sql<Enrollment[]>`
    SELECT * FROM enrollments WHERE class_id = ${classId} AND student_id = ${studentId}`;
  return enrollment;
}

/** Creates a pending request; never overrides an existing enrollment (including a rejection). */
export async function requestEnrollment(classId: number, studentId: number) {
  await sql`
    INSERT INTO enrollments (class_id, student_id, status, joined_via)
    VALUES (${classId}, ${studentId}, 'pending', 'request')
    ON CONFLICT DO NOTHING`;
}

export async function joinWithCode(classId: number, studentId: number) {
  await sql`
    INSERT INTO enrollments (class_id, student_id, status, joined_via, decided_at)
    VALUES (${classId}, ${studentId}, 'approved', 'code', now())
    ON CONFLICT (class_id, student_id) DO UPDATE
    SET status = 'approved', joined_via = 'code', decided_at = now()
    WHERE enrollments.status <> 'approved'`;
}

export async function setEnrollmentStatus(classId: number, studentId: number, status: EnrollmentStatus) {
  await sql`
    UPDATE enrollments SET status = ${status}, decided_at = now()
    WHERE class_id = ${classId} AND student_id = ${studentId}`;
}

export function listMembers(classId: number) {
  return sql<Member[]>`
    SELECT u.id, u.name, u.email, u.role, u.project_title,
           e.status, e.joined_via, e.requested_at, e.decided_at
    FROM enrollments e JOIN users u ON u.id = e.student_id
    WHERE e.class_id = ${classId}
    ORDER BY u.name`;
}

export function listApprovedStudents(classId: number) {
  return sql<User[]>`
    SELECT u.id, u.name, u.email, u.role, u.project_title
    FROM enrollments e JOIN users u ON u.id = e.student_id
    WHERE e.class_id = ${classId} AND e.status = 'approved'
    ORDER BY u.name`;
}

export async function countRecentCodeFailures(studentId: number, withinMinutes: number) {
  const [row] = await sql<{ n: number }[]>`
    SELECT count(*)::int AS n FROM join_code_failures
    WHERE student_id = ${studentId}
      AND attempted_at > now() - make_interval(mins => ${withinMinutes})`;
  return row.n;
}

export async function recordCodeFailure(studentId: number) {
  await sql`INSERT INTO join_code_failures (student_id) VALUES (${studentId})`;
}

// Assignments

export function listAssignments(classId: number) {
  return sql<Assignment[]>`SELECT * FROM assignments WHERE class_id = ${classId} ORDER BY due_at DESC`;
}

export function listAssignmentsForStudent(classId: number, studentId: number) {
  return sql<Assignment[]>`
    SELECT a.* FROM assignments a
    WHERE a.class_id = ${classId}
      AND (NOT EXISTS (SELECT 1 FROM assignment_targets t WHERE t.assignment_id = a.id)
           OR EXISTS (SELECT 1 FROM assignment_targets t
                      WHERE t.assignment_id = a.id AND t.student_id = ${studentId}))
    ORDER BY a.due_at DESC`;
}

export async function getAssignment(id: number) {
  const [assignment] = await sql<Assignment[]>`SELECT * FROM assignments WHERE id = ${id}`;
  return assignment;
}

export async function getAssignmentTargetIds(assignmentId: number): Promise<number[]> {
  const rows = await sql<{ student_id: number }[]>`
    SELECT student_id FROM assignment_targets WHERE assignment_id = ${assignmentId}`;
  return rows.map((row) => row.student_id);
}

/** True when the student is approved in the assignment's class and is one of its targets. */
export async function isAssignedTo(assignmentId: number, studentId: number) {
  const [row] = await sql<{ ok: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM assignments a
      JOIN enrollments e ON e.class_id = a.class_id AND e.student_id = ${studentId} AND e.status = 'approved'
      WHERE a.id = ${assignmentId}
        AND (NOT EXISTS (SELECT 1 FROM assignment_targets t WHERE t.assignment_id = a.id)
             OR EXISTS (SELECT 1 FROM assignment_targets t
                        WHERE t.assignment_id = a.id AND t.student_id = ${studentId}))
    ) AS ok`;
  return row.ok;
}

export async function listStudentsForAssignment(assignment: Assignment) {
  const [targets, students] = await Promise.all([
    getAssignmentTargetIds(assignment.id),
    listApprovedStudents(assignment.class_id),
  ]);
  return targets.length === 0 ? [...students] : students.filter((s) => targets.includes(s.id));
}

type AssignmentInput = { title: string; description: string; dueAt: string };

export async function createAssignmentWithTargets(
  input: AssignmentInput & { classId: number; createdBy: number },
  studentIds: number[],
  files: NewFile[],
) {
  return sql.begin(async (tx) => {
    const [{ id }] = await tx<{ id: number }[]>`
      INSERT INTO assignments (class_id, title, description, due_at, created_by)
      VALUES (${input.classId}, ${input.title}, ${input.description}, ${input.dueAt}, ${input.createdBy})
      RETURNING id`;
    for (const studentId of studentIds) {
      await tx`INSERT INTO assignment_targets (assignment_id, student_id) VALUES (${id}, ${studentId})`;
    }
    for (const file of files) {
      await tx`INSERT INTO files ${tx({ ...file, owner_id: id })}`;
    }
    return id;
  });
}

export async function updateAssignmentWithTargets(
  id: number,
  input: AssignmentInput,
  studentIds: number[],
  files: NewFile[],
) {
  await sql.begin(async (tx) => {
    await tx`
      UPDATE assignments
      SET title = ${input.title}, description = ${input.description}, due_at = ${input.dueAt},
          updated_at = now()
      WHERE id = ${id}`;
    await tx`DELETE FROM assignment_targets WHERE assignment_id = ${id}`;
    for (const studentId of studentIds) {
      await tx`INSERT INTO assignment_targets (assignment_id, student_id) VALUES (${id}, ${studentId})`;
    }
    for (const file of files) {
      await tx`INSERT INTO files ${tx({ ...file, owner_id: id })}`;
    }
  });
}

/** Deletes the assignment and every file record attached to it or its submissions. */
export async function deleteAssignmentCascade(id: number) {
  return sql.begin(async (tx) => {
    const files = await tx<FileRecord[]>`
      DELETE FROM files
      WHERE (owner_type = 'assignment' AND owner_id = ${id})
         OR (owner_type = 'submission'
             AND owner_id IN (SELECT s.id FROM submissions s WHERE s.assignment_id = ${id}))
      RETURNING *`;
    await tx`DELETE FROM assignments WHERE id = ${id}`;
    return [...files];
  });
}

// Views

export async function markViewed(assignmentId: number, studentId: number) {
  await sql`
    INSERT INTO assignment_views (assignment_id, student_id) VALUES (${assignmentId}, ${studentId})
    ON CONFLICT DO NOTHING`;
}

// Submissions

export function listSubmissions(assignmentId: number, studentId: number) {
  return sql<Submission[]>`
    SELECT * FROM submissions
    WHERE assignment_id = ${assignmentId} AND student_id = ${studentId}
    ORDER BY version DESC`;
}

export async function getSubmission(id: number) {
  const [submission] = await sql<Submission[]>`SELECT * FROM submissions WHERE id = ${id}`;
  return submission;
}

export async function createSubmission(
  input: { assignmentId: number; studentId: number; content: string; linkUrl: string | null },
  files: NewFile[],
) {
  return sql.begin(async (tx) => {
    // Serializes concurrent submissions from the same student so versions stay unique.
    await tx`SELECT pg_advisory_xact_lock(${input.assignmentId}, ${input.studentId})`;
    const [{ id }] = await tx<{ id: number }[]>`
      INSERT INTO submissions (assignment_id, student_id, version, content, link_url)
      SELECT ${input.assignmentId}, ${input.studentId}, COALESCE(MAX(version), 0) + 1,
             ${input.content}, ${input.linkUrl}
      FROM submissions
      WHERE assignment_id = ${input.assignmentId} AND student_id = ${input.studentId}
      RETURNING id`;
    for (const file of files) {
      await tx`INSERT INTO files ${tx({ ...file, owner_id: id })}`;
    }
    return id;
  });
}

// Files

export function listFiles(ownerType: FileRecord["owner_type"], ownerId: number) {
  return sql<FileRecord[]>`
    SELECT * FROM files WHERE owner_type = ${ownerType} AND owner_id = ${ownerId} ORDER BY id`;
}

export async function listFilesForOwners(ownerType: FileRecord["owner_type"], ownerIds: number[]) {
  if (ownerIds.length === 0) return new Map<number, FileRecord[]>();
  const rows = await sql<FileRecord[]>`
    SELECT * FROM files WHERE owner_type = ${ownerType} AND owner_id IN ${sql(ownerIds)} ORDER BY id`;
  const byOwner = new Map<number, FileRecord[]>();
  for (const row of rows) byOwner.set(row.owner_id, [...(byOwner.get(row.owner_id) ?? []), row]);
  return byOwner;
}

export async function getFile(id: number) {
  const [file] = await sql<FileRecord[]>`SELECT * FROM files WHERE id = ${id}`;
  return file;
}

export async function deleteFileRecord(id: number) {
  await sql`DELETE FROM files WHERE id = ${id}`;
}

// Feedback

export function listComments(assignmentId: number, studentId: number) {
  return sql<Comment[]>`
    SELECT c.id, c.author_id, u.name AS author_name, u.role AS author_role, c.body, c.created_at
    FROM comments c JOIN users u ON u.id = c.author_id
    WHERE c.assignment_id = ${assignmentId} AND c.student_id = ${studentId}
    ORDER BY c.created_at`;
}

export async function addComment(input: {
  assignmentId: number;
  studentId: number;
  authorId: number;
  body: string;
}) {
  await sql`
    INSERT INTO comments (assignment_id, student_id, author_id, body)
    VALUES (${input.assignmentId}, ${input.studentId}, ${input.authorId}, ${input.body})`;
}

export async function setReview(assignmentId: number, studentId: number, status: ReviewStatus) {
  await sql`
    INSERT INTO reviews (assignment_id, student_id, status) VALUES (${assignmentId}, ${studentId}, ${status})
    ON CONFLICT (assignment_id, student_id)
    DO UPDATE SET status = excluded.status, updated_at = now()`;
}

/** Everything needed to compute one student's status on one assignment. */
export async function getProgressRow(assignmentId: number, studentId: number) {
  const [row] = await sql<
    {
      viewed_at: string | null;
      first_submitted_at: string | null;
      review_status: ReviewStatus | null;
      review_updated_at: string | null;
      comment_count: number;
    }[]
  >`
    SELECT
      (SELECT viewed_at FROM assignment_views
        WHERE assignment_id = ${assignmentId} AND student_id = ${studentId}) AS viewed_at,
      (SELECT min(created_at) FROM submissions
        WHERE assignment_id = ${assignmentId} AND student_id = ${studentId}) AS first_submitted_at,
      (SELECT status FROM reviews
        WHERE assignment_id = ${assignmentId} AND student_id = ${studentId}) AS review_status,
      (SELECT updated_at FROM reviews
        WHERE assignment_id = ${assignmentId} AND student_id = ${studentId}) AS review_updated_at,
      (SELECT count(*)::int FROM comments
        WHERE assignment_id = ${assignmentId} AND student_id = ${studentId}) AS comment_count`;
  const [latest] = await sql<Submission[]>`
    SELECT * FROM submissions
    WHERE assignment_id = ${assignmentId} AND student_id = ${studentId}
    ORDER BY version DESC LIMIT 1`;
  return { ...row, latest: latest ?? null };
}

// Announcements

export function listAnnouncements(classId: number, limit = 50) {
  return sql<Announcement[]>`
    SELECT a.id, a.title, a.body, u.name AS author_name, a.created_at
    FROM announcements a JOIN users u ON u.id = a.author_id
    WHERE a.class_id = ${classId}
    ORDER BY a.created_at DESC LIMIT ${limit}`;
}

export async function createAnnouncement(classId: number, title: string, body: string, authorId: number) {
  await sql`
    INSERT INTO announcements (class_id, title, body, author_id)
    VALUES (${classId}, ${title}, ${body}, ${authorId})`;
}

export async function deleteAnnouncement(classId: number, id: number) {
  await sql`DELETE FROM announcements WHERE id = ${id} AND class_id = ${classId}`;
}
