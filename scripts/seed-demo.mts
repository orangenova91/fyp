// Fills an empty database with demo accounts and assignments: `npm run seed:demo`
import bcrypt from "bcryptjs";
import postgres from "postgres";

const PASSWORD = "demo1234";
if (!process.env.DATABASE_URL) {
  console.error(".env.local에 DATABASE_URL을 넣어 주세요.");
  process.exit(1);
}
const sql = postgres(process.env.DATABASE_URL, { prepare: false });

const [{ n }] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM users`;
if (n > 0) {
  console.error("데이터베이스에 이미 사용자가 있어 데모 데이터를 넣지 않았습니다.");
  await sql.end();
  process.exit(1);
}

const hash = bcrypt.hashSync(PASSWORD, 10);
const day = 86_400_000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * day).toISOString();

await sql.begin(async (tx) => {
  const insertUser = async (name: string, email: string, role: string, project: string | null) => {
    const [row] = await tx<{ id: number }[]>`
      INSERT INTO users (name, email, password_hash, role, project_title)
      VALUES (${name}, ${email}, ${hash}, ${role}, ${project}) RETURNING id`;
    return row.id;
  };
  const insertAssignment = async (title: string, description: string, dueDays: number, createdDays: number) => {
    const [row] = await tx<{ id: number }[]>`
      INSERT INTO assignments (title, description, due_at, created_by, created_at)
      VALUES (${title}, ${description}, ${iso(dueDays)}, ${professorId}, ${iso(createdDays)}) RETURNING id`;
    return row.id;
  };
  const submit = (assignmentId: number, studentId: number, content: string, link: string | null, days: number) =>
    tx`INSERT INTO submissions (assignment_id, student_id, version, content, link_url, created_at)
       VALUES (${assignmentId}, ${studentId}, 1, ${content}, ${link}, ${iso(days)})`;
  const view = (assignmentId: number, studentId: number, days: number) =>
    tx`INSERT INTO assignment_views (assignment_id, student_id, viewed_at)
       VALUES (${assignmentId}, ${studentId}, ${iso(days)}) ON CONFLICT DO NOTHING`;
  const feedback = async (assignmentId: number, studentId: number, body: string, status: string) => {
    await tx`INSERT INTO comments (assignment_id, student_id, author_id, body, created_at)
             VALUES (${assignmentId}, ${studentId}, ${professorId}, ${body}, ${iso(-8)})`;
    await tx`INSERT INTO reviews (assignment_id, student_id, status, updated_at)
             VALUES (${assignmentId}, ${studentId}, ${status}, ${iso(-8)})`;
  };

  const professorId = await insertUser("김교수", "prof@demo.ac.kr", "professor", null);
  const students: number[] = [];
  for (const [name, email, project] of [
    ["이서준", "student1@demo.ac.kr", "LLM 기반 강의 요약 서비스"],
    ["박지민", "student2@demo.ac.kr", "스마트팜 IoT 모니터링"],
    ["최유나", "student3@demo.ac.kr", "중고거래 사기 탐지 모델"],
    ["정하늘", "student4@demo.ac.kr", "캠퍼스 실내 내비게이션 앱"],
    ["한도윤", "student5@demo.ac.kr", "음성 감정 인식 상담 챗봇"],
  ]) {
    students.push(await insertUser(name, email, "student", project));
  }

  const proposal = await insertAssignment(
    "1단계: 프로젝트 제안서",
    "프로젝트 배경, 목표, 주요 기능, 개발 일정을 2~3페이지로 정리해 PDF로 제출하세요.",
    -10,
    -20,
  );
  const requirements = await insertAssignment(
    "2단계: 요구사항 명세서",
    "기능/비기능 요구사항과 유스케이스 다이어그램을 포함해 주세요.\nGitHub 저장소 링크도 함께 제출합니다.",
    3,
    -4,
  );
  await insertAssignment(
    "3단계: 중간발표 자료",
    "발표 10분 분량의 슬라이드를 제출하세요. 데모 영상이 있으면 링크로 첨부해 주세요.",
    14,
    -1,
  );

  for (const [i, studentId] of students.entries()) {
    await view(proposal, studentId, -19);
    if (i === 4) continue;
    await submit(proposal, studentId, "제안서 제출합니다.", "https://github.com/example/capstone", i === 3 ? -9 : -12);
  }
  await feedback(proposal, students[0], "주제 좋습니다. 데이터 수집 방법을 조금 더 구체화해 주세요.", "approved");
  await feedback(proposal, students[1], "일정이 너무 촉박합니다. 기능 범위를 줄여서 다시 제출해 주세요.", "revision_requested");

  await view(requirements, students[0], -3);
  await view(requirements, students[2], -2);
  await submit(requirements, students[0], "초안입니다. 유스케이스는 보완 중입니다.", null, -1);

  await tx`INSERT INTO announcements (title, body, author_id, created_at) VALUES (
    '중간발표 일정 안내',
    ${"중간발표는 3주 뒤 금요일 오후 2시, 공학관 301호에서 진행합니다.\n발표 순서는 추후 공지하겠습니다."},
    ${professorId}, ${iso(-1)})`;
});
await sql.end();

console.log("데모 데이터를 만들었습니다. 비밀번호는 모두", PASSWORD);
console.log("  교수: prof@demo.ac.kr");
console.log("  학생: student1@demo.ac.kr ~ student5@demo.ac.kr");
