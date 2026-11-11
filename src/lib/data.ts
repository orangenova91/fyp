import "server-only";
import { sql } from "./db";

export type Role = "professor" | "student";

export type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  project_title: string | null;
};

export type Assignment = {
  id: number;
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

export type Review = { status: ReviewStatus; updated_at: string };

export type Announcement = {
  id: number;
  title: string;
  body: string;
  author_name: string;
  created_at: string;
};

type NewFile = Omit<FileRecord, "id" | "created_at" | "owner_id">;

const userColumns = sql`id, name, email, role, project_title`;

// Users

export async function countUsers(): Promise<number> {
  const [row] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM users`;
  return row.n;
}

export async function findUserById(id: number) {
  const [user] = await sql<User[]>`SELECT ${userColumns} FROM users WHERE id = ${id}`;
  return user;
}

export async function findUserWithPasswordByEmail(email: string) {
  const [user] = await sql<(User & { password_hash: string })[]>`
    SELECT ${userColumns}, password_hash FROM users WHERE lower(email) = lower(${email})`;
  return user;
}

export async function getPasswordHash(userId: number) {
  const [row] = await sql<{ password_hash: string }[]>`
    SELECT password_hash FROM users WHERE id = ${userId}`;
  return row?.password_hash;
}

export function listStudents() {
  return sql<User[]>`SELECT ${userColumns} FROM users WHERE role = 'student' ORDER BY name`;
}

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
    RETURNING id`;
  return row.id;
}

/** Creates the first account only if the database has no users yet. */
export async function createFirstProfessor(input: { name: string; email: string; passwordHash: string }) {
  return sql.begin(async (tx) => {
    await tx`LOCK TABLE users IN EXCLUSIVE MODE`;
    const [{ n }] = await tx<{ n: number }[]>`SELECT count(*)::int AS n FROM users`;
    if (n > 0) return null;
    const [row] = await tx<{ id: number }[]>`
      INSERT INTO users (name, email, password_hash, role)
      VALUES (${input.name}, ${input.email}, ${input.passwordHash}, 'professor')
      RETURNING id`;
    return row.id;
  });
}

export async function updatePasswordHash(userId: number, passwordHash: string) {
  await sql`UPDATE users SET password_hash = ${passwordHash} WHERE id = ${userId}`;
}

export async function updateStudentProfile(userId: number, name: string, projectTitle: string | null) {
  await sql`
    UPDATE users SET name = ${name}, project_title = ${projectTitle}
    WHERE id = ${userId} AND role = 'student'`;
}

/** Deletes the student and their submission file records; returns the removed files. */
export async function deleteStudentCascade(studentId: number) {
  return sql.begin(async (tx) => {
    const files = await tx<FileRecord[]>`
      DELETE FROM files
      WHERE owner_type = 'submission'
        AND owner_id IN (SELECT id FROM submissions WHERE student_id = ${studentId})
      RETURNING *`;
    await tx`DELETE FROM users WHERE id = ${studentId} AND role = 'student'`;
    return [...files];
  });
}

// Assignments

export function listAssignments() {
  return sql<Assignment[]>`SELECT * FROM assignments ORDER BY due_at DESC`;
}

export function listAssignmentsForStudent(studentId: number) {
  return sql<Assignment[]>`
    SELECT a.* FROM assignments a
    WHERE NOT EXISTS (SELECT 1 FROM assignment_targets t WHERE t.assignment_id = a.id)
       OR EXISTS (SELECT 1 FROM assignment_targets t WHERE t.assignment_id = a.id AND t.student_id = ${studentId})
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

export async function isAssignedTo(assignmentId: number, studentId: number) {
  const targets = await getAssignmentTargetIds(assignmentId);
  return targets.length === 0 || targets.includes(studentId);
}

export async function listStudentsForAssignment(assignmentId: number) {
  const [targets, students] = await Promise.all([
    getAssignmentTargetIds(assignmentId),
    listStudents(),
  ]);
  return targets.length === 0 ? [...students] : students.filter((s) => targets.includes(s.id));
}

type AssignmentInput = { title: string; description: string; dueAt: string };

export async function createAssignmentWithTargets(
  input: AssignmentInput & { createdBy: number },
  studentIds: number[],
  files: NewFile[],
) {
  return sql.begin(async (tx) => {
    const [{ id }] = await tx<{ id: number }[]>`
      INSERT INTO assignments (title, description, due_at, created_by)
      VALUES (${input.title}, ${input.description}, ${input.dueAt}, ${input.createdBy})
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

/** Everything needed to compute one student's status on one assignment, in a single query. */
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

export function listAnnouncements(limit = 50) {
  return sql<Announcement[]>`
    SELECT a.id, a.title, a.body, u.name AS author_name, a.created_at
    FROM announcements a JOIN users u ON u.id = a.author_id
    ORDER BY a.created_at DESC LIMIT ${limit}`;
}

export async function createAnnouncement(title: string, body: string, authorId: number) {
  await sql`INSERT INTO announcements (title, body, author_id) VALUES (${title}, ${body}, ${authorId})`;
}

export async function deleteAnnouncement(id: number) {
  await sql`DELETE FROM announcements WHERE id = ${id}`;
}
