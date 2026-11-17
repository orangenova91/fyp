// Fills an empty database with demo accounts, classes and assignments: `npm run seed:demo`
import { randomInt } from "node:crypto";
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
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const joinCode = () => Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");

const joinCodes: string[] = [];
await sql.begin(async (tx) => {
  const insertUser = async (name: string, email: string, role: string, project: string | null) => {
    const [row] = await tx<{ id: number }[]>`
      INSERT INTO users (name, email, password_hash, role, project_title)
      VALUES (${name}, ${email}, ${hash}, ${role}, ${project}) RETURNING id`;
    return row.id;
  };
  const insertClass = async (professor: number, name: string, term: string, description: string) => {
    const [row] = await tx<{ id: number; join_code: string }[]>`
      INSERT INTO classes (professor_id, name, term, description, join_code, created_at)
      VALUES (${professor}, ${name}, ${term}, ${description}, ${joinCode()}, ${iso(-30)})
      RETURNING id, join_code`;
    return row;
  };
  const enroll = (classId: number, studentId: number, status: "approved" | "pending", via: "code" | "request") =>
    tx`INSERT INTO enrollments (class_id, student_id, status, joined_via, requested_at, decided_at)
       VALUES (${classId}, ${studentId}, ${status}, ${via}, ${iso(-25)}, ${status === "pending" ? null : iso(-25)})`;
  const insertAssignment = async (title: string, description: string, dueDays: number, createdDays: number) => {
    const [row] = await tx<{ id: number }[]>`
      INSERT INTO assignments (class_id, title, description, due_at, created_by, created_at)
      VALUES (${classA.id}, ${title}, ${description}, ${iso(dueDays)}, ${professorId}, ${iso(createdDays)})
      RETURNING id`;
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
  const professor2Id = await insertUser("박교수", "prof2@demo.ac.kr", "professor", null);
  const student6 = await insertUser("윤시우", "student6@demo.ac.kr", "student", "드론 영상 기반 균열 탐지");

  const classA = await insertClass(
    professorId,
    "캡스톤 디자인 (김교수 연구실)",
    "2026-2학기",
    "졸업 캡스톤 프로젝트의 단계별 과제를 제출하고 피드백을 받는 수업입니다.",
  );
  const classB = await insertClass(professor2Id, "졸업 프로젝트 세미나", "2026-2학기", "박교수 연구실 졸업 프로젝트");
  for (const [i, studentId] of students.slice(0, 4).entries()) {
    await enroll(classA.id, studentId, "approved", i % 2 === 0 ? "code" : "request");
  }
  await enroll(classA.id, students[4], "approved", "code");
  await enroll(classA.id, student6, "pending", "request");
  await enroll(classB.id, student6, "approved", "code");
  await enroll(classB.id, students[0], "pending", "request");
  joinCodes.push(classA.join_code, classB.join_code);

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

  await tx`INSERT INTO announcements (class_id, title, body, author_id, created_at) VALUES (
    ${classA.id}, '중간발표 일정 안내',
    ${"중간발표는 3주 뒤 금요일 오후 2시, 공학관 301호에서 진행합니다.\n발표 순서는 추후 공지하겠습니다."},
    ${professorId}, ${iso(-1)})`;
  await tx`INSERT INTO announcements (class_id, title, body, author_id, created_at) VALUES (
    ${classB.id}, '첫 미팅 안내', '다음 주 화요일 오전 10시 연구실에서 첫 미팅을 합니다.', ${professor2Id}, ${iso(-2)})`;
});
await sql.end();

console.log("데모 데이터를 만들었습니다. 비밀번호는 모두", PASSWORD);
console.log(`  교수: prof@demo.ac.kr (수업 코드 ${joinCodes[0]}), prof2@demo.ac.kr (수업 코드 ${joinCodes[1]})`);
console.log("  학생: student1@demo.ac.kr ~ student6@demo.ac.kr (승인 대기 신청 2건 포함)");
