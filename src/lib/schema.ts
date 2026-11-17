export const STORAGE_BUCKET = "uploads";

// Every table has RLS enabled with no policies: the app connects as the table
// owner (which bypasses RLS), while Supabase's public Data API sees nothing.
// Statements are idempotent so `npm run db:setup` also migrates older databases.
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('professor', 'student')),
  project_title text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower ON users (lower(email));

CREATE TABLE IF NOT EXISTS classes (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  professor_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  term text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  join_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS classes_professor ON classes (professor_id);

-- 'rejected' covers both declined requests and students removed from the class;
-- they can only come back with the class code.
CREATE TABLE IF NOT EXISTS enrollments (
  class_id integer NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  joined_via text NOT NULL CHECK (joined_via IN ('code', 'request')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  PRIMARY KEY (class_id, student_id)
);
CREATE INDEX IF NOT EXISTS enrollments_student ON enrollments (student_id);

-- Wrong class-code attempts, used to slow down guessing.
CREATE TABLE IF NOT EXISTS join_code_failures (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS join_code_failures_student ON join_code_failures (student_id, attempted_at);

CREATE TABLE IF NOT EXISTS assignments (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  class_id integer NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  due_at timestamptz NOT NULL,
  created_by integer NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS class_id integer NOT NULL REFERENCES classes(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS assignments_class ON assignments (class_id);

-- No rows for an assignment means it targets every approved student in the class.
CREATE TABLE IF NOT EXISTS assignment_targets (
  assignment_id integer NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (assignment_id, student_id)
);

CREATE TABLE IF NOT EXISTS assignment_views (
  assignment_id integer NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (assignment_id, student_id)
);

CREATE TABLE IF NOT EXISTS submissions (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  assignment_id integer NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version integer NOT NULL,
  content text NOT NULL DEFAULT '',
  link_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, student_id, version)
);

CREATE TABLE IF NOT EXISTS files (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_type text NOT NULL CHECK (owner_type IN ('assignment', 'submission')),
  owner_id integer NOT NULL,
  original_name text NOT NULL,
  stored_name text NOT NULL UNIQUE,
  size integer NOT NULL,
  mime_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS files_owner ON files (owner_type, owner_id);

-- Feedback thread between the professor and one student on one assignment.
CREATE TABLE IF NOT EXISTS comments (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  assignment_id integer NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- A review only applies while no newer submission exists (compared by timestamp).
CREATE TABLE IF NOT EXISTS reviews (
  assignment_id integer NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('approved', 'revision_requested')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (assignment_id, student_id)
);

CREATE TABLE IF NOT EXISTS announcements (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  class_id integer NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  author_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS class_id integer NOT NULL REFERENCES classes(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS announcements_class ON announcements (class_id);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE join_code_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
`;
