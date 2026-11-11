export const STORAGE_BUCKET = "uploads";

// Every table has RLS enabled with no policies: the app connects as the table
// owner (which bypasses RLS), while Supabase's public Data API sees nothing.
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

CREATE TABLE IF NOT EXISTS assignments (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  due_at timestamptz NOT NULL,
  created_by integer NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- No rows for an assignment means it targets every student.
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
  title text NOT NULL,
  body text NOT NULL,
  author_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
`;
